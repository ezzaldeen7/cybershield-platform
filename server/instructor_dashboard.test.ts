import { describe, expect, it, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { getDb } from "./db";
import { lessons } from "../drizzle/schema";
import { gt, eq } from "drizzle-orm";
import { OFFICIAL_LESSON_IDS } from "./services/contentService";
import { SEVEN_LESSON_QUIZZES } from "./services/quizService";
import { SEVEN_SCENARIOS } from "./services/scenarioService";

describe("Instructor Dashboard Backend & RBAC / IDOR Authorization Suite", () => {
  afterAll(async () => {
    const db = await getDb();
    if (db) {
      await db.delete(lessons).where(gt(lessons.id, 8));
    }
  });

  function createTestContext(user: User | null): { ctx: TrpcContext } {
    const ctx: TrpcContext = {
      user,
      req: {
        protocol: "https",
        headers: { "user-agent": "Vitest-Test-Runner" },
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
    id: 101,
    openId: "student-101",
    email: "student@cybershield.sa",
    passwordHash: "hash123",
    name: "Regular Student",
    loginMethod: "local",
    role: "user",
    isActive: true,
    lastIpAddress: "127.0.0.1",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const instructorA: User = {
    ...regularUser,
    id: 102,
    openId: "instructor-102",
    email: "instructor_a@cybershield.sa",
    name: "Dr. Instructor A",
    role: "instructor",
  };

  const instructorB: User = {
    ...regularUser,
    id: 104,
    openId: "instructor-104",
    email: "instructor_b@cybershield.sa",
    name: "Dr. Instructor B",
    role: "instructor",
  };

  const adminUser: User = {
    ...regularUser,
    id: 103,
    openId: "admin-103",
    email: "admin@cybershield.sa",
    name: "Platform Admin",
    role: "admin",
  };

  it("1. allows Instructor A to create Lesson A and verifies createdBy is set server-side", async () => {
    const { ctx } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctx);

    const created = await callerA.content.create({
      title: "Zero Trust Architecture",
      titleAr: "معمارية انعدام الثقة Zero Trust",
      summaryAr: "مقدمة شاملة في مبادئ التحقق المستمر.",
      content: "Never trust, always verify.",
      contentAr: "المبدأ الأساسي: لا تثق بأي كيان افتراضياً، وتحقق باستمرار من الهوية والصلاحيات.",
      order: 10,
      durationMinutes: 10,
      difficulty: "intermediate",
    });

    expect(created).toBeDefined();
    expect(created.id).toBeGreaterThan(8);
    expect(created.createdBy).toBe(instructorA.id);
    expect(created.status).toBe("draft"); // defaults to draft
  });

  it("2. allows Instructor A to update and archive their own lesson", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const created = await callerA.content.create({
      title: "Cloud Security Basics",
      titleAr: "أساسيات أمن الحوسبة السحابية",
      content: "Shared responsibility model.",
      contentAr: "نموذج المسؤولية المشتركة في البيئات السحابية.",
      status: "draft",
    });

    // Update own lesson
    const updated = await callerA.content.update({
      id: created.id,
      titleAr: "أساسيات أمن الحوسبة السحابية المحدثة",
      durationMinutes: 8,
    });
    expect(updated.titleAr).toBe("أساسيات أمن الحوسبة السحابية المحدثة");
    expect(updated.durationMinutes).toBe(8);

    // Archive own lesson
    const archived = await callerA.content.archive({ id: created.id });
    expect(archived.success).toBe(true);

    const fetched = await callerA.content.get({ idOrSlug: created.id });
    expect(fetched.status).toBe("archived");
  });

  it("3. strictly blocks Instructor B from updating Lesson A created by Instructor A (IDOR Prevention)", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const lessonA = await callerA.content.create({
      title: "Instructor A Exclusive Lesson",
      titleAr: "درس خاص بالدكتور أ",
      content: "Proprietary course material.",
      contentAr: "محتوى تعليمي خاص بالدكتور أ.",
      status: "draft",
    });

    // Instructor B attempts to update Lesson A
    const { ctx: ctxB } = createTestContext(instructorB);
    const callerB = appRouter.createCaller(ctxB);

    await expect(
      callerB.content.update({
        id: lessonA.id,
        titleAr: "محاولة اختراق وتعديل من دكتور ب",
      })
    ).rejects.toThrowError(/غير مصرح لك بتعديل هذا الدرس/i);
  });

  it("4. strictly blocks Instructor B from archiving/deleting Lesson A (IDOR Prevention)", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const lessonA = await callerA.content.create({
      title: "Instructor A Critical Lesson",
      titleAr: "درس الدكتور أ المهم",
      content: "Critical material.",
      contentAr: "محتوى هام.",
      status: "draft",
    });

    const { ctx: ctxB } = createTestContext(instructorB);
    const callerB = appRouter.createCaller(ctxB);

    await expect(
      callerB.content.archive({ id: lessonA.id })
    ).rejects.toThrowError(/غير مصرح لك بأرشفة هذا الدرس/i);

    await expect(
      callerB.content.delete({ id: lessonA.id })
    ).rejects.toThrowError(/غير مصرح لك بحذف هذا الدرس/i);
  });

  it("5. isolates Instructor B dashboard catalog: Lesson A does not appear in Instructor B's mineOnly query", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const lessonA = await callerA.content.create({
      title: "Instructor A Secret Lesson",
      titleAr: "درس سري للدكتور أ",
      content: "Secret content.",
      contentAr: "محتوى سري.",
      status: "draft",
    });

    const { ctx: ctxB } = createTestContext(instructorB);
    const callerB = appRouter.createCaller(ctxB);

    const bList = await callerB.content.list({ mineOnly: true });
    const found = bList.items.find((item) => item.id === lessonA.id);
    expect(found).toBeUndefined();

    const aList = await callerA.content.list({ mineOnly: true });
    const foundInA = aList.items.find((item) => item.id === lessonA.id);
    expect(foundInA).toBeDefined();
    expect(foundInA?.createdBy).toBe(instructorA.id);
  });

  it("6. strictly prevents instructors from modifying or archiving any official system lessons (1, 2, 3, 4, 6, 7, 8)", async () => {
    const { ctx } = createTestContext(instructorA);
    const caller = appRouter.createCaller(ctx);

    for (const officialId of OFFICIAL_LESSON_IDS) {
      await expect(
        caller.content.update({
          id: officialId,
          titleAr: "محاولة تعديل الدرس الرسمي المعتمد",
        })
      ).rejects.toThrowError(/لا يمكن للمدرس تعديل الدروس الرسمية المعتمدة/i);

      await expect(
        caller.content.archive({ id: officialId })
      ).rejects.toThrowError(/لا يمكن للمدرس أرشفة الدروس الرسمية المعتمدة/i);

      await expect(
        caller.content.delete({ id: officialId })
      ).rejects.toThrowError(/لا يمكن للمدرس حذف أو أرشفة الدروس الرسمية المعتمدة/i);
    }
  });

  it("7. strictly forbids regular users from create/update/archive/delete (FORBIDDEN 403)", async () => {
    const { ctx } = createTestContext(regularUser);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.content.create({
        title: "Unauthorized Student Lesson",
        titleAr: "درس غير مصرح به من طالب",
        content: "Content.",
        contentAr: "محتوى غير مصرح به.",
      })
    ).rejects.toThrowError(/Instructor or Admin access required/i);

    await expect(
      caller.content.update({ id: 1, titleAr: "محاولة اختراق" })
    ).rejects.toThrowError(/Instructor or Admin access required/i);

    await expect(
      caller.content.archive({ id: 1 })
    ).rejects.toThrowError(/Instructor or Admin access required/i);

    await expect(
      caller.content.delete({ id: 1 })
    ).rejects.toThrowError(/Instructor or Admin access required/i);
  });

  it("8. strictly rejects unauthenticated visitors from any instructor mutation (FORBIDDEN 403)", async () => {
    const { ctx } = createTestContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.content.create({
        title: "Guest Lesson",
        titleAr: "درس زائر",
        content: "Guest.",
        contentAr: "محتوى زائر.",
      })
    ).rejects.toThrowError(/Instructor or Admin access required/i);

    await expect(
      caller.content.update({ id: 1, titleAr: "محاولة زائر" })
    ).rejects.toThrowError(/Instructor or Admin access required/i);

    await expect(
      caller.content.delete({ id: 1 })
    ).rejects.toThrowError(/Instructor or Admin access required/i);
  });

  it("9. allows Admin to manage lessons created by Instructor A", async () => {
    const { ctx: ctxA } = createTestContext(instructorA);
    const callerA = appRouter.createCaller(ctxA);

    const lessonA = await callerA.content.create({
      title: "Instructor A Draft For Admin Review",
      titleAr: "مسودة دكتور أ لمراجعة الإدارة",
      content: "Draft content.",
      contentAr: "محتوى مسودة للمراجعة.",
      status: "draft",
    });

    const { ctx: ctxAdmin } = createTestContext(adminUser);
    const callerAdmin = appRouter.createCaller(ctxAdmin);

    // Admin can update
    const updatedByAdmin = await callerAdmin.content.update({
      id: lessonA.id,
      titleAr: "تم الاعتماد من قبل مدير المنصة",
    });
    expect(updatedByAdmin.titleAr).toBe("تم الاعتماد من قبل مدير المنصة");

    // Admin can archive
    const archivedByAdmin = await callerAdmin.content.archive({ id: lessonA.id });
    expect(archivedByAdmin.success).toBe(true);

    const fetched = await callerAdmin.content.get({ idOrSlug: lessonA.id });
    expect(fetched.status).toBe("archived");
  });

  it("10. verifies that soft archiving does not physically delete the record", async () => {
    const { ctx } = createTestContext(instructorA);
    const caller = appRouter.createCaller(ctx);

    const created = await caller.content.create({
      title: "Soft Delete Test Lesson",
      titleAr: "درس فحص الحذف المنطقي",
      content: "Will be archived.",
      contentAr: "سيتم أرشفته منطقياً دون حذفه من قاعدة البيانات.",
      status: "draft",
    });

    await caller.content.delete({ id: created.id });

    // Verify row still exists in DB
    const db = await getDb();
    expect(db).toBeDefined();
    if (db) {
      const records = await db.select().from(lessons).where(eq(lessons.id, created.id));
      expect(records.length).toBe(1);
      expect(records[0].status).toBe("archived");
      expect(records[0].id).toBe(created.id);
    }
  });

  it("11. verifies that official 7 lessons, quiz mapping, and scenario mapping remain unaffected", async () => {
    // Official lessons set
    expect(OFFICIAL_LESSON_IDS.length).toBe(7);
    expect(OFFICIAL_LESSON_IDS).toEqual([1, 2, 3, 4, 6, 7, 8]);

    // Official quizzes set
    expect(SEVEN_LESSON_QUIZZES.length).toBe(7);
    const mappedLessonIds = SEVEN_LESSON_QUIZZES.map((q) => q.lessonId);
    expect(mappedLessonIds).toEqual([1, 2, 3, 4, 6, 7, 8]);

    // Scenarios set
    expect(SEVEN_SCENARIOS.length).toBe(7);
  });
});
