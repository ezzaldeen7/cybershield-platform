import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import {
  users,
  lessons,
  quizAttempts,
  analyzerLogs,
  auditLogs,
  securityEvents,
  awarenessScores,
} from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from "../shared/const";

describe("Phase 4 — Batch 4: Admin Audit & Security Dashboard Integration Suite", () => {
  let adminUser: User;
  let normalUser: User;
  let targetUser: User;
  let callerGuest: ReturnType<typeof appRouter.createCaller>;
  let callerNormal: ReturnType<typeof appRouter.createCaller>;
  let callerAdmin: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // 1. Create Admin User
    const [createdAdmin] = await db
      .insert(users)
      .values({
        name: "مدير النظام للاختبارات",
        email: `admin_dash_${Date.now()}@cybershield.sa`,
        passwordHash: "adminSecure123#",
        role: "admin",
        isActive: true,
      })
      .returning();
    adminUser = createdAdmin;

    // 2. Create Normal User
    const [createdNormal] = await db
      .insert(users)
      .values({
        name: "مستخدم عادي للاختبارات",
        email: `user_dash_${Date.now()}@cybershield.sa`,
        passwordHash: "userSecure123#",
        role: "user",
        isActive: true,
      })
      .returning();
    normalUser = createdNormal;

    // 3. Create Target User for role updates
    const [createdTarget] = await db
      .insert(users)
      .values({
        name: "مستخدم مستهدف للترقية",
        email: `target_dash_${Date.now()}@cybershield.sa`,
        passwordHash: "targetSecure123#",
        role: "user",
        isActive: true,
      })
      .returning();
    targetUser = createdTarget;

    // 4. Setup Callers
    const ctxGuest: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerGuest = appRouter.createCaller(ctxGuest);

    const ctxNormal: TrpcContext = {
      user: normalUser,
      req: {
        protocol: "https",
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NormalBrowser/1.0" },
        socket: { remoteAddress: "192.168.1.50" },
      } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerNormal = appRouter.createCaller(ctxNormal);

    const ctxAdmin: TrpcContext = {
      user: adminUser,
      req: {
        protocol: "https",
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AdminSecBrowser/2.0" },
        socket: { remoteAddress: "10.0.0.99" },
      } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerAdmin = appRouter.createCaller(ctxAdmin);
  });

  describe("1. RBAC Rejection for Guests (Unauthenticated)", () => {
    it("rejects guest access to admin.stats with UNAUTHORIZED", async () => {
      await expect(callerGuest.admin.stats()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: UNAUTHED_ERR_MSG,
      });
    });

    it("rejects guest access to admin.auditLogs with UNAUTHORIZED", async () => {
      await expect(callerGuest.admin.auditLogs()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: UNAUTHED_ERR_MSG,
      });
    });

    it("rejects guest access to admin.securityEvents with UNAUTHORIZED", async () => {
      await expect(callerGuest.admin.securityEvents()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: UNAUTHED_ERR_MSG,
      });
    });

    it("rejects guest access to admin.usersList with UNAUTHORIZED", async () => {
      await expect(callerGuest.admin.usersList()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: UNAUTHED_ERR_MSG,
      });
    });

    it("rejects guest access to admin.updateUserRole with UNAUTHORIZED", async () => {
      await expect(
        callerGuest.admin.updateUserRole({ userId: targetUser.id, role: "instructor" })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: UNAUTHED_ERR_MSG,
      });
    });
  });

  describe("2. RBAC Rejection for Normal Users (role: 'user')", () => {
    it("rejects normal user access to admin.stats with FORBIDDEN", async () => {
      await expect(callerNormal.admin.stats()).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: NOT_ADMIN_ERR_MSG,
      });
    });

    it("rejects normal user access to admin.auditLogs with FORBIDDEN", async () => {
      await expect(callerNormal.admin.auditLogs()).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: NOT_ADMIN_ERR_MSG,
      });
    });

    it("rejects normal user access to admin.securityEvents with FORBIDDEN", async () => {
      await expect(callerNormal.admin.securityEvents()).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: NOT_ADMIN_ERR_MSG,
      });
    });

    it("rejects normal user access to admin.usersList with FORBIDDEN", async () => {
      await expect(callerNormal.admin.usersList()).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: NOT_ADMIN_ERR_MSG,
      });
    });

    it("rejects normal user access to admin.updateUserRole with FORBIDDEN", async () => {
      await expect(
        callerNormal.admin.updateUserRole({ userId: targetUser.id, role: "instructor" })
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: NOT_ADMIN_ERR_MSG,
      });
    });
  });

  describe("3. Data Protection & Sensitivity (Zero Leakage to Normal Users)", () => {
    it("ensures normal users cannot leak IP addresses or User-Agent strings via admin endpoints", async () => {
      let leakedData = false;
      try {
        const logs = await callerNormal.admin.auditLogs({ limit: 10 });
        if (logs && logs.length > 0) leakedData = true;
      } catch (err: any) {
        expect(err.code).toBe("FORBIDDEN");
      }
      expect(leakedData).toBe(false);

      try {
        const sec = await callerNormal.admin.securityEvents({ limit: 10 });
        if (sec && sec.length > 0) leakedData = true;
      } catch (err: any) {
        expect(err.code).toBe("FORBIDDEN");
      }
      expect(leakedData).toBe(false);
    });
  });

  describe("4. Admin Access to Analytics & Stats", () => {
    it("returns system stats with publishedLessons = 7 based on official database lessons", async () => {
      const stats = await callerAdmin.admin.stats();
      expect(stats).toBeDefined();
      expect(stats.publishedLessons).toBe(7);
      expect(stats.totalUsers).toBeGreaterThanOrEqual(3);
      expect(typeof stats.avgAwarenessScore).toBe("number");
      expect(typeof stats.quizAttempts).toBe("number");
      expect(typeof stats.analyzerRequests).toBe("number");
      expect(typeof stats.securityEventsCount).toBe("number");
    });

    it("returns users list for admin caller", async () => {
      const usersList = await callerAdmin.admin.usersList({ limit: 50 });
      expect(Array.isArray(usersList)).toBe(true);
      expect(usersList.length).toBeGreaterThanOrEqual(3);

      const foundAdmin = usersList.find((u) => u.id === adminUser.id);
      expect(foundAdmin).toBeDefined();
      expect(foundAdmin?.role).toBe("admin");

      const foundNormal = usersList.find((u) => u.id === normalUser.id);
      expect(foundNormal).toBeDefined();
      expect(foundNormal?.role).toBe("user");
    });
  });

  describe("5. Schema Integrity & Reading of Audit Logs (info | warning | critical)", () => {
    beforeAll(async () => {
      const db = await getDb();
      if (!db) return;

      // Seed audit logs with exact approved schema severities: info, warning, critical
      await db.insert(auditLogs).values([
        {
          userId: adminUser.id,
          action: "TEST_INFO_ACTION",
          eventType: "SYSTEM_CHECK",
          severity: "info",
          detailsJson: JSON.stringify({ component: "healthCheck", status: "ok" }),
          ipAddress: "10.0.0.99",
          userAgent: "AdminSecBrowser/2.0",
        },
        {
          userId: adminUser.id,
          action: "TEST_WARNING_ACTION",
          eventType: "CONFIG_CHANGE",
          severity: "warning",
          detailsJson: JSON.stringify({ setting: "max_attempts", oldValue: 3, newValue: 5 }),
          ipAddress: "10.0.0.99",
          userAgent: "AdminSecBrowser/2.0",
        },
        {
          userId: normalUser.id,
          action: "TEST_CRITICAL_ACTION",
          eventType: "AUTH_BREACH_SUSPECTED",
          severity: "critical",
          detailsJson: JSON.stringify({ reason: "Brute force threshold exceeded" }),
          ipAddress: "192.168.1.50",
          userAgent: "NormalBrowser/1.0",
        },
      ]);
    });

    it("reads audit logs with exact existing schema fields without invented properties", async () => {
      const logs = await callerAdmin.admin.auditLogs({ limit: 10 });
      expect(logs.length).toBeGreaterThanOrEqual(3);

      const testLog = logs.find((l) => l.action === "TEST_INFO_ACTION");
      expect(testLog).toBeDefined();

      // Check exact schema fields
      expect(testLog).toHaveProperty("id");
      expect(testLog).toHaveProperty("userId");
      expect(testLog).toHaveProperty("action");
      expect(testLog).toHaveProperty("eventType");
      expect(testLog).toHaveProperty("severity");
      expect(testLog).toHaveProperty("ipAddress");
      expect(testLog).toHaveProperty("userAgent");
      expect(testLog).toHaveProperty("detailsJson");
      expect(testLog).toHaveProperty("timestamp");

      // Verify no invented fields like riskLevel or actionType
      expect((testLog as any).riskLevel).toBeUndefined();
      expect((testLog as any).actionType).toBeUndefined();

      expect(testLog?.ipAddress).toBe("10.0.0.99");
      expect(testLog?.userAgent).toBe("AdminSecBrowser/2.0");
    });

    it("filters audit logs by valid severities: info, warning, and critical", async () => {
      const criticalLogs = await callerAdmin.admin.auditLogs({ severity: "critical", limit: 50 });
      expect(criticalLogs.length).toBeGreaterThanOrEqual(1);
      expect(criticalLogs.every((l) => l.severity === "critical")).toBe(true);

      const warningLogs = await callerAdmin.admin.auditLogs({ severity: "warning", limit: 50 });
      expect(warningLogs.length).toBeGreaterThanOrEqual(1);
      expect(warningLogs.every((l) => l.severity === "warning")).toBe(true);

      const infoLogs = await callerAdmin.admin.auditLogs({ severity: "info", limit: 50 });
      expect(infoLogs.length).toBeGreaterThanOrEqual(1);
      expect(infoLogs.every((l) => l.severity === "info")).toBe(true);
    });

    it("rejects unapproved severity values (like 'error') via Zod schema validation", async () => {
      await expect(
        callerAdmin.admin.auditLogs({ severity: "error" as any, limit: 50 })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });
  });

  describe("6. Schema Integrity & Reading of Security Events (info | warning | critical)", () => {
    beforeAll(async () => {
      const db = await getDb();
      if (!db) return;

      // Seed security events with exact approved severities: warning, critical
      await db.insert(securityEvents).values([
        {
          eventType: "SUSPICIOUS_LOGIN_ATTEMPT",
          severity: "warning",
          ipAddress: "203.0.113.42",
          detailsJson: JSON.stringify({ attempts: 3, username: "admin" }),
        },
        {
          eventType: "SQLI_PROBE_BLOCKED",
          severity: "critical",
          ipAddress: "198.51.100.77",
          detailsJson: JSON.stringify({ pattern: "UNION SELECT", path: "/api/test" }),
        },
      ]);
    });

    it("reads security events with exact existing schema fields", async () => {
      const events = await callerAdmin.admin.securityEvents({ limit: 10 });
      expect(events.length).toBeGreaterThanOrEqual(2);

      const probeEvent = events.find((e) => e.eventType === "SQLI_PROBE_BLOCKED");
      expect(probeEvent).toBeDefined();

      // Check exact schema fields
      expect(probeEvent).toHaveProperty("id");
      expect(probeEvent).toHaveProperty("eventType");
      expect(probeEvent).toHaveProperty("severity");
      expect(probeEvent).toHaveProperty("ipAddress");
      expect(probeEvent).toHaveProperty("detailsJson");
      expect(probeEvent).toHaveProperty("timestamp");

      // Verify no invented fields
      expect((probeEvent as any).riskLevel).toBeUndefined();
      expect((probeEvent as any).actionType).toBeUndefined();

      expect(probeEvent?.severity).toBe("critical");
      expect(probeEvent?.ipAddress).toBe("198.51.100.77");
    });

    it("filters security events by severity correctly (warning and critical)", async () => {
      const criticalEvents = await callerAdmin.admin.securityEvents({ severity: "critical", limit: 50 });
      expect(criticalEvents.length).toBeGreaterThanOrEqual(1);
      expect(criticalEvents.every((e) => e.severity === "critical")).toBe(true);

      const warningEvents = await callerAdmin.admin.securityEvents({ severity: "warning", limit: 50 });
      expect(warningEvents.length).toBeGreaterThanOrEqual(1);
      expect(warningEvents.every((e) => e.severity === "warning")).toBe(true);
    });

    it("rejects unapproved severity values (like 'error') on securityEvents via Zod schema validation", async () => {
      await expect(
        callerAdmin.admin.securityEvents({ severity: "error" as any, limit: 50 })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    });
  });

  describe("7. Safe & Resilient Handling of detailsJson (Null, Empty, Malformed, Valid)", () => {
    beforeAll(async () => {
      const db = await getDb();
      if (!db) return;

      // Seed records with diverse detailsJson payloads
      await db.insert(auditLogs).values([
        {
          userId: adminUser.id,
          action: "TEST_NULL_DETAILS",
          eventType: "ROBUSTNESS_CHECK",
          severity: "info",
          detailsJson: null,
          ipAddress: "10.0.0.1",
        },
        {
          userId: adminUser.id,
          action: "TEST_EMPTY_DETAILS",
          eventType: "ROBUSTNESS_CHECK",
          severity: "info",
          detailsJson: "",
          ipAddress: "10.0.0.1",
        },
        {
          userId: adminUser.id,
          action: "TEST_MALFORMED_DETAILS",
          eventType: "ROBUSTNESS_CHECK",
          severity: "info",
          detailsJson: "RAW_NON_JSON_STRING_WITHOUT_BRACES",
          ipAddress: "10.0.0.1",
        },
        {
          userId: adminUser.id,
          action: "TEST_VALID_OBJ_DETAILS",
          eventType: "ROBUSTNESS_CHECK",
          severity: "info",
          detailsJson: JSON.stringify({ key1: "value1", numeric: 42, flag: true }),
          ipAddress: "10.0.0.1",
        },
      ]);
    });

    it("queries without crashing when detailsJson is null, empty, malformed, or valid object", async () => {
      const logs = await callerAdmin.admin.auditLogs({ limit: 50 });

      const nullLog = logs.find((l) => l.action === "TEST_NULL_DETAILS");
      expect(nullLog).toBeDefined();
      expect(nullLog?.detailsJson).toBeNull();

      const emptyLog = logs.find((l) => l.action === "TEST_EMPTY_DETAILS");
      expect(emptyLog).toBeDefined();
      expect(emptyLog?.detailsJson).toBe("");

      const malformedLog = logs.find((l) => l.action === "TEST_MALFORMED_DETAILS");
      expect(malformedLog).toBeDefined();
      expect(malformedLog?.detailsJson).toBe("RAW_NON_JSON_STRING_WITHOUT_BRACES");

      const validLog = logs.find((l) => l.action === "TEST_VALID_OBJ_DETAILS");
      expect(validLog).toBeDefined();
      const parsed = JSON.parse(validLog?.detailsJson || "{}");
      expect(parsed.key1).toBe("value1");
      expect(parsed.numeric).toBe(42);
    });
  });

  describe("8. User Role Mutation & RBAC Protection", () => {
    it("prevents an admin from demoting themselves (self-demotion protection)", async () => {
      await expect(
        callerAdmin.admin.updateUserRole({
          userId: adminUser.id,
          role: "user",
        })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: expect.stringContaining("لا يمكن للمسؤول إزالة صلاحيات المشرف عن حسابه الخاص"),
      });
    });

    it("updates target user role and records corresponding warning audit log with IP and User-Agent from context", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verify initial role
      const [initial] = await db.select().from(users).where(eq(users.id, targetUser.id));
      expect(initial.role).toBe("user");

      // Admin updates target user to 'instructor'
      const updateResult = await callerAdmin.admin.updateUserRole({
        userId: targetUser.id,
        role: "instructor",
      });
      expect(updateResult.success).toBe(true);

      // Verify DB role was updated
      const [updated] = await db.select().from(users).where(eq(users.id, targetUser.id));
      expect(updated.role).toBe("instructor");

      // Verify audit log entry was generated with valid schema severity: warning
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.action, "UPDATE_USER_ROLE"))
        .orderBy(desc(auditLogs.timestamp))
        .limit(1);

      expect(logs.length).toBe(1);
      const auditEntry = logs[0];
      expect(auditEntry.userId).toBe(adminUser.id);
      expect(auditEntry.eventType).toBe("ADMIN_ROLE_CHANGE");
      expect(auditEntry.severity).toBe("warning"); // valid enum: warning
      expect(auditEntry.ipAddress).toBe("10.0.0.99");
      expect(auditEntry.userAgent).toBe("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AdminSecBrowser/2.0");

      const parsedDetails = JSON.parse(auditEntry.detailsJson || "{}");
      expect(parsedDetails.targetUserId).toBe(targetUser.id);
      expect(parsedDetails.newRole).toBe("instructor");
    });
  });
});
