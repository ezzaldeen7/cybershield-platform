import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { users, type User } from "../drizzle/schema";
import { getDb } from "./db";

describe("CMS Content Management & RBAC Controls", () => {
  function createTestContext(user: User | null): { ctx: TrpcContext } {
    const ctx: TrpcContext = {
      user,
      req: {
        protocol: "https",
        headers: {},
        socket: { remoteAddress: "127.0.0.1" },
      } as any,
      res: {
        cookie: () => {},
        clearCookie: () => {},
      } as any,
    };
    return { ctx };
  }

  const regularUser: User = {
    id: 20,
    openId: "user-20",
    email: "student@example.com",
    passwordHash: "hash",
    name: "Student User",
    loginMethod: "local",
    role: "user",
    isActive: true,
    lastIpAddress: "127.0.0.1",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const instructorUser: User = {
    ...regularUser,
    id: 21,
    email: "instructor@example.com",
    role: "instructor",
  };

  it("lists initial categories successfully", async () => {
    const { ctx } = createTestContext(null);
    const caller = appRouter.createCaller(ctx);
    const categories = await caller.content.categories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });

  it("lists published lessons for public/unauthenticated users", async () => {
    const { ctx } = createTestContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.content.list({});
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items.every((item) => item.status === "published")).toBe(true);
  });

  it("rejects non-instructor from creating a lesson", async () => {
    const { ctx } = createTestContext(regularUser);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.content.create({
        title: "Test Lesson",
        titleAr: "درس تجريبي",
        content: "Detailed content for testing...",
        contentAr: "محتوى تفصيلي للاختبار...",
      })
    ).rejects.toThrow("Instructor or Admin access required");
  });

  it("lists all 7 educational modules in correct ascending order", async () => {
    const { ctx } = createTestContext(null);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.learning.getLessonsWithProgress();

    expect(result.totalLessons).toBe(7);
    expect(result.lessons.length).toBe(7);
    expect(result.lessons.map((l) => l.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(result.lessons[0].slug).toBe("how-to-detect-phishing");
    expect(result.lessons[6].slug).toBe("incident-reporting-response");
  });

  it("handles Case 1: new user without progress (0% completed)", async () => {
    const newUser: User = {
      ...regularUser,
      id: 991,
      email: "new_student@cybershield.sa",
    };
    const { ctx } = createTestContext(newUser);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.learning.getLessonsWithProgress();
    expect(result.completedCount).toBe(0);
    expect(result.progressPercentage).toBe(0);
    expect(result.lessons.every((l) => l.isCompleted === false)).toBe(true);
  });

  it("handles Case 2: user completing a lesson updates progress", async () => {
    const db = await getDb();
    const [studentUser] = await db!.insert(users).values({
      name: "طالب التقدم",
      email: `progress_${Date.now()}@cybershield.sa`,
      passwordHash: "dummyHash",
      role: "user",
      isActive: true,
    }).returning();

    const { ctx } = createTestContext(studentUser);
    const caller = appRouter.createCaller(ctx);

    // Initial check
    const initial = await caller.learning.getLessonsWithProgress();
    const lesson1Id = initial.lessons[0].id;

    // Complete lesson 1
    const completion = await caller.learning.completeLesson({ lessonId: lesson1Id });
    expect(completion.success).toBe(true);
    expect(completion.completedCount).toBe(1);

    // Verify progress updated
    const after = await caller.learning.getLessonsWithProgress();
    expect(after.completedCount).toBe(1);
    expect(after.progressPercentage).toBe(Math.round((1 / 7) * 100)); // ~14%
    const completedLesson = after.lessons.find((l) => l.id === lesson1Id);
    expect(completedLesson?.isCompleted).toBe(true);
    expect(completedLesson?.completedAt).not.toBeNull();
  });

  it("handles Case 3: user completes all 7 lessons (100% completed)", async () => {
    const db = await getDb();
    const [masterUser] = await db!.insert(users).values({
      name: "طالب متفوق",
      email: `master_${Date.now()}@cybershield.sa`,
      passwordHash: "dummyHash",
      role: "user",
      isActive: true,
    }).returning();

    const { ctx } = createTestContext(masterUser);
    const caller = appRouter.createCaller(ctx);

    const initial = await caller.learning.getLessonsWithProgress();
    for (const l of initial.lessons) {
      await caller.learning.completeLesson({ lessonId: l.id });
    }

    const completedOverview = await caller.learning.getLessonsWithProgress();
    expect(completedOverview.completedCount).toBe(7);
    expect(completedOverview.progressPercentage).toBe(100);
    expect(completedOverview.lessons.every((l) => l.isCompleted === true)).toBe(true);
  });

  it("handles Case 4: unauthenticated user can browse lessons but cannot complete them", async () => {
    const { ctx } = createTestContext(null);
    const caller = appRouter.createCaller(ctx);

    const publicResult = await caller.learning.getLessonsWithProgress();
    expect(publicResult.totalLessons).toBe(7);
    expect(publicResult.completedCount).toBe(0);
    expect(publicResult.lessons.every((l) => l.isCompleted === false)).toBe(true);

    // Attempting to complete a lesson unauthenticated must fail with UNAUTHORIZED
    await expect(caller.learning.completeLesson({ lessonId: 1 })).rejects.toThrow();
  });

  it("handles Case 5: gracefully rejects non-existent or invalid lesson ID", async () => {
    const { ctx } = createTestContext(regularUser);
    const caller = appRouter.createCaller(ctx);

    // Invalid ID in get lesson
    await expect(caller.content.get({ idOrSlug: 999999 })).rejects.toThrow("غير موجود");

    // Invalid ID in complete lesson
    await expect(caller.learning.completeLesson({ lessonId: 999999 })).rejects.toThrow("غير موجود");
  });
});
