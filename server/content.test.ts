import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

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
});
