import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import {
  users,
  weaknesses,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";

describe("Phase 4 - Batch 2: Weakness & Recommendations Lifecycle with Strict User Isolation", () => {
  let studentA: User;
  let studentB: User;
  let callerStudentA: ReturnType<typeof appRouter.createCaller>;
  let callerStudentB: ReturnType<typeof appRouter.createCaller>;
  let callerGuest: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create Student A
    const emailA = `student_weak_a_${Date.now()}_${Math.random().toString(36).slice(2)}@cybershield.sa`;
    const [createdA] = await db
      .insert(users)
      .values({
        name: "طالب أ (نقاط الضعف)",
        email: emailA,
        passwordHash: "securePassWeakA123#",
        role: "user",
        isActive: true,
      })
      .returning();
    studentA = createdA;

    // Create Student B
    const emailB = `student_weak_b_${Date.now()}_${Math.random().toString(36).slice(2)}@cybershield.sa`;
    const [createdB] = await db
      .insert(users)
      .values({
        name: "طالب ب (نقاط الضعف)",
        email: emailB,
        passwordHash: "securePassWeakB123#",
        role: "user",
        isActive: true,
      })
      .returning();
    studentB = createdB;

    // Caller for Student A
    const ctxA: TrpcContext = {
      user: studentA,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerStudentA = appRouter.createCaller(ctxA);

    // Caller for Student B
    const ctxB: TrpcContext = {
      user: studentB,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerStudentB = appRouter.createCaller(ctxB);

    // Guest Caller
    const ctxGuest: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerGuest = appRouter.createCaller(ctxGuest);
  });

  // ---------------------------------------------------------------------------
  // 1. Guest access is rejected with UNAUTHORIZED
  // ---------------------------------------------------------------------------
  it("1. rejects guest access to all recommendation procedures with UNAUTHORIZED", async () => {
    // getUserRecommendations
    try {
      await callerGuest.recommendation.getUserRecommendations();
      expect.unreachable("Should have thrown UNAUTHORIZED");
    } catch (err: any) {
      expect(err).toBeInstanceOf(TRPCError);
      expect(err.code).toBe("UNAUTHORIZED");
    }

    // getUserWeaknesses
    try {
      await callerGuest.recommendation.getUserWeaknesses();
      expect.unreachable("Should have thrown UNAUTHORIZED");
    } catch (err: any) {
      expect(err).toBeInstanceOf(TRPCError);
      expect(err.code).toBe("UNAUTHORIZED");
    }

    // resolveWeakness
    try {
      await callerGuest.recommendation.resolveWeakness({ weaknessId: 1 });
      expect.unreachable("Should have thrown UNAUTHORIZED");
    } catch (err: any) {
      expect(err).toBeInstanceOf(TRPCError);
      expect(err.code).toBe("UNAUTHORIZED");
    }
  });

  // ---------------------------------------------------------------------------
  // 2. New user starts with empty weaknesses and default recommendations
  // ---------------------------------------------------------------------------
  it("2. returns empty weaknesses and default reinforcement recommendations for new user", async () => {
    const weaknessesList = await callerStudentA.recommendation.getUserWeaknesses();
    expect(weaknessesList).toEqual([]);

    const recs = await callerStudentA.recommendation.getUserRecommendations();
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some((r) => r.targetSlugOrId === "how-to-detect-phishing")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 3. Detecting weakness dynamically adapts personalized recommendations
  // ---------------------------------------------------------------------------
  it("3. dynamically tailors personalized recommendations based on active unresolved weaknesses", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Insert active weakness for Student A in "phishing"
    const [wPhishing] = await db
      .insert(weaknesses)
      .values({
        userId: studentA.id,
        category: "phishing",
        severity: "high",
        detectedFrom: "assessment",
        details: "ضعف في كشف رسائل التصيد والانتحال البنكي",
        resolved: false,
      })
      .returning();

    // Insert active weakness for Student A in "urls"
    const [wUrls] = await db
      .insert(weaknesses)
      .values({
        userId: studentA.id,
        category: "urls",
        severity: "medium",
        detectedFrom: "quiz",
        details: "خطأ في فحص النطاق الأساسي للرابط",
        resolved: false,
      })
      .returning();

    // Query weaknesses
    const userWeaknesses = await callerStudentA.recommendation.getUserWeaknesses();
    expect(userWeaknesses.length).toBe(2);
    expect(userWeaknesses.some((w) => w.id === wPhishing.id)).toBe(true);
    expect(userWeaknesses.some((w) => w.id === wUrls.id)).toBe(true);

    // Query recommendations: must specifically recommend lessons for phishing and urls
    const recs = await callerStudentA.recommendation.getUserRecommendations();
    expect(recs.length).toBeGreaterThanOrEqual(2);
    expect(recs.some((r) => r.targetSlugOrId === "how-to-detect-phishing")).toBe(true);
    expect(recs.some((r) => r.targetSlugOrId === "safe-link-inspection")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4. Resolving a weakness updates its status and adjusts recommendations
  // ---------------------------------------------------------------------------
  it("4. marks weakness resolved=true without deleting, and excludes it from recommendation drivers", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const activeBefore = await callerStudentA.recommendation.getUserWeaknesses({ includeResolved: false });
    const phishingWeakness = activeBefore.find((w) => w.category === "phishing")!;
    expect(phishingWeakness).toBeDefined();

    // Student A resolves phishing weakness
    const resolvedResult = await callerStudentA.recommendation.resolveWeakness({
      weaknessId: phishingWeakness.id,
    });

    expect(resolvedResult.id).toBe(phishingWeakness.id);
    expect(resolvedResult.resolved).toBe(true);

    // Verify in DB that it is marked resolved=true and NOT deleted
    const [inDb] = await db
      .select()
      .from(weaknesses)
      .where(eq(weaknesses.id, phishingWeakness.id));
    expect(inDb).toBeDefined();
    // Semantics verification: ONLY resolved is modified; all other fields are strictly preserved
    expect(inDb.resolved).toBe(true);
    expect(inDb.userId).toBe(studentA.id);
    expect(inDb.category).toBe(phishingWeakness.category);
    expect(inDb.severity).toBe(phishingWeakness.severity);
    expect(inDb.detectedFrom).toBe(phishingWeakness.detectedFrom);
    expect(inDb.details).toBe(phishingWeakness.details);
    expect(new Date(inDb.createdAt).getTime()).toBe(new Date(phishingWeakness.createdAt).getTime());

    // Recommendations now driven only by remaining 'urls' weakness (phishing excluded)
    const recs = await callerStudentA.recommendation.getUserRecommendations();
    expect(recs.some((r) => r.targetSlugOrId === "safe-link-inspection")).toBe(true);
    expect(recs.some((r) => r.targetSlugOrId === "how-to-detect-phishing" && r.reasonAr.includes("التحديات المسجلة"))).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 4b. Explicit verification of includeResolved parameter
  // ---------------------------------------------------------------------------
  it("4b. strictly enforces includeResolved semantics: default/false returns unresolved only, true returns both", async () => {
    // 1. Default (no argument) -> ONLY unresolved
    const defaultList = await callerStudentA.recommendation.getUserWeaknesses();
    expect(defaultList.length).toBeGreaterThan(0);
    expect(defaultList.every((w) => w.resolved === false)).toBe(true);

    // 2. Explicit includeResolved: false -> ONLY unresolved
    const falseList = await callerStudentA.recommendation.getUserWeaknesses({ includeResolved: false });
    expect(falseList.length).toBe(defaultList.length);
    expect(falseList.every((w) => w.resolved === false)).toBe(true);

    // 3. Explicit includeResolved: true -> BOTH unresolved and resolved
    const trueList = await callerStudentA.recommendation.getUserWeaknesses({ includeResolved: true });
    expect(trueList.length).toBeGreaterThan(falseList.length);
    expect(trueList.some((w) => w.resolved === true)).toBe(true);
    expect(trueList.some((w) => w.resolved === false)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 5. Strict User Isolation: User A cannot see or modify User B's weaknesses
  // ---------------------------------------------------------------------------
  it("5. strictly enforces User Isolation: User A cannot view or resolve User B's weaknesses", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Insert weakness for Student B
    const [weaknessB] = await db
      .insert(weaknesses)
      .values({
        userId: studentB.id,
        category: "passwords",
        severity: "high",
        detectedFrom: "scenario",
        details: "سقوط في هجوم إرهاق المصادقة الثنائية MFA Fatigue",
        resolved: false,
      })
      .returning();

    // Student A calls getUserWeaknesses: must NOT include Student B's weakness
    const weaknessesA = await callerStudentA.recommendation.getUserWeaknesses({ includeResolved: true });
    expect(weaknessesA.some((w) => w.id === weaknessB.id)).toBe(false);
    expect(weaknessesA.every((w) => w.userId === studentA.id)).toBe(true);

    // Student B calls getUserWeaknesses: sees only their own weakness
    const weaknessesB = await callerStudentB.recommendation.getUserWeaknesses({ includeResolved: true });
    expect(weaknessesB.some((w) => w.id === weaknessB.id)).toBe(true);
    expect(weaknessesB.every((w) => w.userId === studentB.id)).toBe(true);

    // Student A attempts to resolve Student B's weakness -> MUST FAIL with NOT_FOUND
    try {
      await callerStudentA.recommendation.resolveWeakness({
        weaknessId: weaknessB.id,
      });
      expect.unreachable("Student A should not be able to resolve Student B's weakness");
    } catch (err: any) {
      expect(err).toBeInstanceOf(TRPCError);
      expect(err.code).toBe("NOT_FOUND");
    }

    // Verify Student B's weakness is STILL unresolved in DB
    const [checkB] = await db
      .select()
      .from(weaknesses)
      .where(eq(weaknesses.id, weaknessB.id));
    expect(checkB.resolved).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 5b. Strict Cross-User Recommendation Isolation
  // ---------------------------------------------------------------------------
  it("5b. strictly enforces cross-user recommendation isolation: User B recommendations never leak from User A", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create a fresh isolated user C who has NO weaknesses
    const emailC = `student_clean_${Date.now()}_${Math.random().toString(36).slice(2)}@cybershield.sa`;
    const [cleanUserC] = await db
      .insert(users)
      .values({
        name: "طالب نظيف بدون نقاط ضعف",
        email: emailC,
        passwordHash: "securePassClean123#",
        role: "user",
        isActive: true,
      })
      .returning();

    const ctxC: TrpcContext = {
      user: cleanUserC,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    const callerC = appRouter.createCaller(ctxC);

    // Insert a distinct category weakness for Student A: 'incident'
    await db.insert(weaknesses).values({
      userId: studentA.id,
      category: "incident",
      severity: "high",
      detectedFrom: "assessment",
      details: "تأخر في إبلاغ فريق الاستجابة للحوادث",
      resolved: false,
    });

    // Student A recommendations must include 'incident-reporting-response'
    const recsA = await callerStudentA.recommendation.getUserRecommendations();
    expect(recsA.some((r) => r.targetSlugOrId === "incident-reporting-response")).toBe(true);

    // User C (clean user with no weaknesses) MUST NOT have 'incident-reporting-response'
    // User C receives ONLY default reinforcement recommendations
    const recsC = await callerC.recommendation.getUserRecommendations();
    expect(recsC.some((r) => r.targetSlugOrId === "incident-reporting-response")).toBe(false);
    expect(recsC.length).toBe(2);
    expect(recsC.map((r) => r.targetSlugOrId)).toEqual([
      "how-to-detect-phishing",
      "safe-link-inspection",
    ]);

    // Student B (only has password weakness) MUST NOT have 'incident-reporting-response'
    const recsB = await callerStudentB.recommendation.getUserRecommendations();
    expect(recsB.some((r) => r.targetSlugOrId === "incident-reporting-response")).toBe(false);
    expect(recsB.some((r) => r.targetSlugOrId === "account-protection-mfa")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 6. Non-existent weakness ID returns NOT_FOUND
  // ---------------------------------------------------------------------------
  it("6. rejects resolveWeakness with NOT_FOUND for non-existent ID", async () => {
    try {
      await callerStudentA.recommendation.resolveWeakness({ weaknessId: 999999 });
      expect.unreachable("Should throw NOT_FOUND for non-existent ID");
    } catch (err: any) {
      expect(err).toBeInstanceOf(TRPCError);
      expect(err.code).toBe("NOT_FOUND");
    }
  });

  // ---------------------------------------------------------------------------
  // 7. Resolving an already resolved weakness is idempotent
  // ---------------------------------------------------------------------------
  it("7. resolving an already resolved weakness succeeds idempotently", async () => {
    const all = await callerStudentA.recommendation.getUserWeaknesses({ includeResolved: true });
    const resolvedWeakness = all.find((w) => w.resolved === true)!;
    expect(resolvedWeakness).toBeDefined();

    // Re-resolve
    const result = await callerStudentA.recommendation.resolveWeakness({
      weaknessId: resolvedWeakness.id,
    });
    expect(result.id).toBe(resolvedWeakness.id);
    expect(result.resolved).toBe(true);
  });
});
