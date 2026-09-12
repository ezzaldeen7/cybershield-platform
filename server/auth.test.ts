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
    expect(isStrongPassword("short").valid).toBe(false);
    expect(isStrongPassword("123456").valid).toBe(true);
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
});
