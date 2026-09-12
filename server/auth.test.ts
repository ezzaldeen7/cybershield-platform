import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { hashPassword, verifyPassword, isStrongPassword } from "./services/authService";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

describe("Password Hashing & Strength Controls", () => {
  it("hashes password and verifies correctly", async () => {
    const rawPass = "CyberShield#2026";
    const hashed = await hashPassword(rawPass);
    expect(hashed).not.toBe(rawPass);
    expect(await verifyPassword(rawPass, hashed)).toBe(true);
    expect(await verifyPassword("WrongPassword123", hashed)).toBe(false);
  });

  it("validates strong passwords correctly", () => {
    expect(isStrongPassword("12345").valid).toBe(false);
    expect(isStrongPassword("123456").valid).toBe(false); // 6 chars is rejected
    expect(isStrongPassword("12345678").valid).toBe(false); // common weak password in blacklist is rejected
    expect(isStrongPassword("Pass#Secure2026").valid).toBe(true); // 8+ chars strong pass is valid
    expect(isStrongPassword("ValidPass123").valid).toBe(true);
  });
});

describe("RBAC Access Controls", () => {
  function createTestContext(user: User | null): { ctx: TrpcContext; clearedCookies: any[] } {
    const clearedCookies: any[] = [];
    const ctx: TrpcContext = {
      user,
      req: {
        protocol: "https",
        headers: {},
        socket: { remoteAddress: "127.0.0.1" },
      } as any,
      res: {
        cookie: () => {},
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as any,
    };
    return { ctx, clearedCookies };
  }

  const normalUser: User = {
    id: 10,
    openId: "user-10",
    email: "user@example.com",
    passwordHash: "hash",
    name: "Regular User",
    loginMethod: "local",
    role: "user",
    mustChangePassword: false,
    isActive: true,
    lastIpAddress: "127.0.0.1",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const instructorUser: User = {
    ...normalUser,
    id: 11,
    email: "instructor@example.com",
    role: "instructor",
  };

  const adminUser: User = {
    ...normalUser,
    id: 12,
    email: "admin@example.com",
    role: "admin",
  };

  it("returns null for unauthenticated user on auth.me", async () => {
    const { ctx } = createTestContext(null);
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });

  it("returns authenticated user info on auth.me", async () => {
    const { ctx } = createTestContext(normalUser);
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toEqual(normalUser);
  });

  it("clears session cookie on logout", async () => {
    const { ctx, clearedCookies } = createTestContext(normalUser);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0].name).toBe(COOKIE_NAME);
  });

  it("enforces RBAC: forbids regular users from accessing admin routes", async () => {
    const { ctx } = createTestContext(normalUser);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("enforces RBAC: allows admin users to access admin routes", async () => {
    const { ctx } = createTestContext(adminUser);
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.admin.stats();
    expect(stats).toHaveProperty("totalUsers");
  });
});

describe("Session Lifecycle & Token Hashing Security", () => {
  it("generates session tokens and stores only SHA-256 hash in database", async () => {
    const crypto = await import("crypto");
    const { createSession, getUserBySessionToken, revokeSession } = await import("./services/authService");
    const { getDb } = await import("./db");
    const { users, sessions } = await import("../drizzle/schema");

    const db = await getDb();
    if (!db) return;

    // Create a temporary test user in SQLite
    const testEmail = `sec_test_${Date.now()}@cybershield.test`;
    const [insertedUser] = await db.insert(users).values({
      email: testEmail,
      name: "Security Test User",
      role: "user",
      mustChangePassword: false,
      isActive: true,
    }).returning();

    // 1. Create session
    const rawToken = await createSession(insertedUser.id, "127.0.0.1", "Vitest-Agent");
    expect(rawToken).toHaveLength(64); // 32 bytes hex = 64 chars

    // 2. Verify tokenHash in SQLite matches SHA-256(rawToken)
    const expectedHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const sessionRows = await db.select().from(sessions);
    const sessionRecord = sessionRows.find((s) => s.userId === insertedUser.id);
    expect(sessionRecord).toBeDefined();
    expect(sessionRecord?.tokenHash).toBe(expectedHash);

    // 3. Verify session authentication succeeds with valid token
    const authenticatedUser = await getUserBySessionToken(rawToken);
    expect(authenticatedUser).not.toBeNull();
    expect(authenticatedUser?.id).toBe(insertedUser.id);

    // 4. Verify logout revokes session
    await revokeSession(rawToken);
    const revokedCheck = await getUserBySessionToken(rawToken);
    expect(revokedCheck).toBeNull();
  });
});

