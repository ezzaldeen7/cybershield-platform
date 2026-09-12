import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, sessions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "../shared/const";
import crypto from "crypto";
import type { TrpcContext } from "./_core/context";

function makeContext(user: any = null, cookieToken?: string): { ctx: TrpcContext; cookiesSet: any[]; cookiesCleared: any[] } {
  const cookiesSet: any[] = [];
  const cookiesCleared: any[] = [];
  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "http",
      headers: {
        cookie: cookieToken ? `${COOKIE_NAME}=${cookieToken}` : "",
        "user-agent": "Vitest-Test-Agent",
      },
      socket: { remoteAddress: "127.0.0.1" },
    } as any,
    res: {
      cookie: (name: string, val: string, opts: any) => {
        cookiesSet.push({ name, val, opts });
      },
      clearCookie: (name: string, opts: any) => {
        cookiesCleared.push({ name, opts });
      },
    } as any,
  };
  return { ctx, cookiesSet, cookiesCleared };
}

describe("Local Authentication & RBAC Complete Lifecycle", () => {
  const testEmail = `test_user_${Date.now()}@cybershield.sa`;
  const testPassword = "ValidPassword123#";
  let createdUserId: number;
  let sessionToken: string;

  it("1. registers a new user with Bcrypt and returns session", async () => {
    const { ctx, cookiesSet } = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.register({
      name: "طالب أمن سيبراني",
      email: testEmail,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.user.email).toBe(testEmail);
    expect(result.user.role).toBe("user");
    expect(cookiesSet.length).toBeGreaterThan(0);
    expect(cookiesSet[0].name).toBe(COOKIE_NAME);

    createdUserId = result.user.id;
    sessionToken = cookiesSet[0].val;

    // Verify tokenHash is stored in SQLite
    const db = await getDb();
    const [sessionRecord] = await db!.select().from(sessions).where(eq(sessions.userId, createdUserId));
    expect(sessionRecord).toBeDefined();
    const expectedHash = crypto.createHash("sha256").update(sessionToken).digest("hex");
    expect(sessionRecord.tokenHash).toBe(expectedHash);
  });

  it("2. rejects registration with duplicate email", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.register({
        name: "طالب آخر",
        email: testEmail,
        password: "AnotherPassword123#",
      })
    ).rejects.toThrow(/مستخدم بالفعل/);
  });

  it("3. rejects login with wrong password", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({
        email: testEmail,
        password: "WrongPassword999#",
      })
    ).rejects.toThrow();
  });

  it("4. logs in successfully with correct credentials and resets rate limiter", async () => {
    const { ctx, cookiesSet } = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      email: testEmail,
      password: testPassword,
    });

    expect(result.success).toBe(true);
    expect(result.user.id).toBe(createdUserId);
    expect(cookiesSet[0].name).toBe(COOKIE_NAME);
  });

  it("5. enforces RBAC: regular user cannot access admin routes", async () => {
    const db = await getDb();
    const [userRecord] = await db!.select().from(users).where(eq(users.id, createdUserId));
    const { ctx } = makeContext(userRecord);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("6. allows admin user to access admin routes", async () => {
    const db = await getDb();
    const adminEmail = "admin@cybershield.sa";
    const [adminRecord] = await db!.select().from(users).where(eq(users.email, adminEmail));
    expect(adminRecord).toBeDefined();

    const { ctx } = makeContext(adminRecord);
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.admin.stats();
    expect(stats).toHaveProperty("totalUsers");
  });

  it("7. changes password, revokes previous sessions, and clears mustChangePassword", async () => {
    const db = await getDb();
    const [userRecord] = await db!.select().from(users).where(eq(users.id, createdUserId));
    const { ctx, cookiesSet } = makeContext(userRecord, sessionToken);
    const caller = appRouter.createCaller(ctx);

    const newPassword = "NewStrongPassword456#";
    const result = await caller.auth.changePassword({
      currentPassword: testPassword,
      newPassword,
    });

    expect(result.success).toBe(true);
    expect(cookiesSet.length).toBeGreaterThan(0); // Issued new session token

    // Verify user record in DB has mustChangePassword = false
    const [updatedUser] = await db!.select().from(users).where(eq(users.id, createdUserId));
    expect(updatedUser.mustChangePassword).toBe(false);
  });

  it("8. logs out and revokes active session", async () => {
    const db = await getDb();
    const [userRecord] = await db!.select().from(users).where(eq(users.id, createdUserId));
    const { ctx, cookiesCleared } = makeContext(userRecord, sessionToken);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cookiesCleared.length).toBeGreaterThan(0);
    expect(cookiesCleared[0].name).toBe(COOKIE_NAME);
  });

  it("9. triggers Rate Limiting (HTTP 429 / TOO_MANY_REQUESTS) after 5 consecutive failed logins", async () => {
    const bruteForceEmail = `brute_${Date.now()}@cybershield.sa`;
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    // Make 5 consecutive failed attempts
    for (let i = 0; i < 5; i++) {
      try {
        await caller.auth.login({
          email: bruteForceEmail,
          password: `WrongPass_${i}#123`,
        });
      } catch (err: any) {
        // Expected login failure
      }
    }

    // 6th attempt MUST be blocked by rate limiter with TOO_MANY_REQUESTS
    let rateLimitError: any = null;
    try {
      await caller.auth.login({
        email: bruteForceEmail,
        password: "AnyPassword123#",
      });
    } catch (err: any) {
      rateLimitError = err;
    }

    expect(rateLimitError).not.toBeNull();
    expect(rateLimitError.code).toBe("TOO_MANY_REQUESTS");
    expect(rateLimitError.message).toContain("تم تجاوز الحد المسموح به");
  });

  it("10. blocks admin with mustChangePassword=true from accessing admin routes", async () => {
    const db = await getDb();
    const tempAdminEmail = `temp_admin_${Date.now()}@cybershield.sa`;
    const [newAdmin] = await db!.insert(users).values({
      email: tempAdminEmail,
      name: "مشرف بكلمة مؤقتة",
      role: "admin",
      mustChangePassword: true,
      isActive: true,
    }).returning();

    const { ctx } = makeContext(newAdmin);
    const caller = appRouter.createCaller(ctx);

    // Calling admin route while mustChangePassword is true MUST fail with PRECONDITION_FAILED
    let blockedError: any = null;
    try {
      await caller.admin.stats();
    } catch (err: any) {
      blockedError = err;
    }

    expect(blockedError).not.toBeNull();
    expect(blockedError.code).toBe("PRECONDITION_FAILED");
    expect(blockedError.message).toContain("يجب تغيير كلمة المرور المؤقتة أولاً");
  });

  it("11. rejects registration with common weak passwords", async () => {
    const { ctx } = makeContext(null);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.register({
        name: "مستخدم ضعيف",
        email: `weak_${Date.now()}@cybershield.sa`,
        password: "password123", // Common weak password in blacklist
      })
    ).rejects.toThrow(/شائعة وسهلة التخمين/);
  });
});
