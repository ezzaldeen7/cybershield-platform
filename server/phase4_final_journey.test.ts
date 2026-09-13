import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import {
  users,
  awarenessScores,
  assessmentAttempts,
  userProgress,
  quizAttempts,
  scenarioAttempts,
  weaknesses,
  recommendations,
  auditLogs,
  securityEvents,
} from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from "../shared/const";
import { analyzeUrlStatic, analyzeMessageStatic } from "./services/analyzerService";
import { SEVEN_SCENARIOS } from "./services/scenarioService";

describe("Phase 4 — Batch 5: 10-Station Final Integration Journey & Full Regression Suite", () => {
  let studentUser: User;
  let peerUser: User;
  let adminUser: User;
  let callerStudent: ReturnType<typeof appRouter.createCaller>;
  let callerPeer: ReturnType<typeof appRouter.createCaller>;
  let callerAdmin: ReturnType<typeof appRouter.createCaller>;
  let callerGuest: ReturnType<typeof appRouter.createCaller>;
  let studentInitialScore: number;
  let activeWeaknessId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const timestamp = Date.now();

    // 1. Create Student User
    const [createdStudent] = await db
      .insert(users)
      .values({
        name: "طالب رحلة التخرج النهائية",
        email: `journey_student_${timestamp}@cybershield.sa`,
        passwordHash: "secureJourneyPass123#",
        role: "user",
        isActive: true,
      })
      .returning();
    studentUser = createdStudent;

    // 2. Create Peer User for User Isolation verification
    const [createdPeer] = await db
      .insert(users)
      .values({
        name: "طالب مقارن لعزل البيانات",
        email: `journey_peer_${timestamp}@cybershield.sa`,
        passwordHash: "securePeerPass123#",
        role: "user",
        isActive: true,
      })
      .returning();
    peerUser = createdPeer;

    // 3. Create Admin User
    const [createdAdmin] = await db
      .insert(users)
      .values({
        name: "مشرف التدقيق الأمني للدفعة",
        email: `journey_admin_${timestamp}@cybershield.sa`,
        passwordHash: "adminSecureJourney123#",
        role: "admin",
        isActive: true,
      })
      .returning();
    adminUser = createdAdmin;

    // 4. Setup Callers
    const ctxStudent: TrpcContext = {
      user: studentUser,
      req: {
        protocol: "https",
        headers: { "user-agent": "StudentBrowser/1.0" },
        socket: { remoteAddress: "192.168.1.100" },
      } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerStudent = appRouter.createCaller(ctxStudent);

    const ctxPeer: TrpcContext = {
      user: peerUser,
      req: {
        protocol: "https",
        headers: { "user-agent": "PeerBrowser/1.0" },
        socket: { remoteAddress: "192.168.1.101" },
      } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerPeer = appRouter.createCaller(ctxPeer);

    const ctxAdmin: TrpcContext = {
      user: adminUser,
      req: {
        protocol: "https",
        headers: { "user-agent": "AdminSecBrowser/3.0" },
        socket: { remoteAddress: "10.0.0.1" },
      } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerAdmin = appRouter.createCaller(ctxAdmin);

    const ctxGuest: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerGuest = appRouter.createCaller(ctxGuest);
  });

  // ==========================================================================
  // STATION 1: New User Registration & Pre-Assessment Gate Status
  // ==========================================================================
  describe("Station 1: New User Onboarding & Pre-Assessment Gate Status", () => {
    it("reports hasCompletedPreAssessment=false and canTakePostAssessment=false for new user", async () => {
      const status = await callerStudent.assessment.getStatus();

      expect(status.hasCompletedPreAssessment).toBe(false);
      expect(status.canTakePostAssessment).toBe(false);
      expect(status.hasCompletedPostAssessment).toBe(false);
      expect(status.initialScore).toBeNull();
      expect(status.finalScore).toBeNull();
      expect(status.completedLessonsCount).toBe(0);
      expect(status.passedQuizzesCount).toBe(0);
      expect(status.passedScenariosCount).toBe(0);
    });

    it("strictly blocks final post-assessment submission when prerequisites are not met", async () => {
      await expect(
        callerStudent.assessment.submit({
          type: "final",
          answers: [{ questionId: 1, selectedOptionIndex: 1 }],
        })
      ).rejects.toMatchObject({
        code: "PRECONDITION_FAILED",
        message: expect.stringContaining("لا يمكن خوض التقييم النهائي قبل استيفاء متطلبات المسار"),
      });
    });
  });

  // ==========================================================================
  // STATION 2: Pre-Assessment Execution & Baseline Score Pinning
  // ==========================================================================
  describe("Station 2: Pre-Assessment Execution & Baseline Score Pinning", () => {
    it("submits pre-assessment and pins initialScore in awarenessScores", async () => {
      // Question 1 correct is 1 (we pick 0 -> wrong -> records weakness)
      // Question 2 correct is 1 (we pick 1 -> correct)
      // Question 3 correct is 1 (we pick 0 -> wrong -> records weakness)
      // Correct = 1 / 3 = 33%
      const preResult = await callerStudent.assessment.submit({
        type: "initial",
        answers: [
          { questionId: 1, selectedOptionIndex: 0 },
          { questionId: 2, selectedOptionIndex: 1 },
          { questionId: 3, selectedOptionIndex: 0 },
        ],
      });

      expect(preResult).toBeDefined();
      expect(preResult.scorePercentage).toBe(33);
      studentInitialScore = preResult.scorePercentage;

      // Verify DB record in assessment_attempts with assessmentType: 'pre'
      const db = await getDb();
      const attempts = await db!
        .select()
        .from(assessmentAttempts)
        .where(
          and(
            eq(assessmentAttempts.userId, studentUser.id),
            eq(assessmentAttempts.assessmentType, "pre")
          )
        );
      expect(attempts.length).toBe(1);

      // Verify baseline in awareness_scores
      const [scores] = await db!
        .select()
        .from(awarenessScores)
        .where(eq(awarenessScores.userId, studentUser.id));
      expect(scores).toBeDefined();
      expect(scores.initialScore).toBe(studentInitialScore);
      expect(scores.currentScore).toBe(studentInitialScore);
      expect(scores.improvementDelta).toBe(0);

      // Gate check now reflects pre-assessment completion
      const status = await callerStudent.assessment.getStatus();
      expect(status.hasCompletedPreAssessment).toBe(true);
      expect(status.initialScore).toBe(studentInitialScore);
      expect(status.canTakePostAssessment).toBe(false); // 0/7 lessons, 0/7 quizzes, 0/7 scenarios
    });
  });

  // ==========================================================================
  // STATION 3: Weakness & Recommendation Discovery
  // ==========================================================================
  describe("Station 3: Weakness Discovery & User Isolation", () => {
    it("returns weaknesses recorded from pre-assessment for student user", async () => {
      const userWeaknesses = await callerStudent.recommendation.getUserWeaknesses();
      expect(userWeaknesses.length).toBeGreaterThanOrEqual(1);

      const phishingWeakness = userWeaknesses.find((w) => w.category === "phishing");
      expect(phishingWeakness).toBeDefined();
      expect(phishingWeakness?.resolved).toBe(false);
      activeWeaknessId = phishingWeakness!.id;

      // Seed a recommendation for this weakness
      const db = await getDb();
      await db!.insert(recommendations).values({
        userId: studentUser.id,
        weaknessId: activeWeaknessId,
        titleAr: "مراجعة درس كشف التصيد الاحتيالي",
        reasonAr: "تم رصد خطأ في التعرف على رسائل التصيد الاحتيالي",
        priority: "high",
        type: "lesson",
        targetSlugOrId: "how-to-detect-phishing",
      });

      const recs = await callerStudent.recommendation.getUserRecommendations();
      expect(recs.length).toBeGreaterThanOrEqual(1);
    });

    it("enforces strict user isolation: peer user sees 0 weaknesses", async () => {
      const peerWeaknesses = await callerPeer.recommendation.getUserWeaknesses();
      const peerHasStudentWeakness = peerWeaknesses.some((w) => w.id === activeWeaknessId);
      expect(peerHasStudentWeakness).toBe(false);
    });
  });

  // ==========================================================================
  // STATION 4: Completing all 7 Official Curriculum Lessons
  // ==========================================================================
  describe("Station 4: Completing All 7 Official Curriculum Lessons", () => {
    it("completes all 7 distinct official lessons (1, 2, 3, 4, 6, 7, 8)", async () => {
      const officialLessonIds = [1, 2, 3, 4, 6, 7, 8];

      for (const lessonId of officialLessonIds) {
        await callerStudent.learning.completeLesson({ lessonId });
      }

      // Re-completing lesson 1 to verify distinct count invariant
      await callerStudent.learning.completeLesson({ lessonId: 1 });

      const status = await callerStudent.assessment.getStatus();
      expect(status.completedLessonsCount).toBe(7);
      expect(status.canTakePostAssessment).toBe(false); // Quizzes and scenarios still 0/7
    });
  });

  // ==========================================================================
  // STATION 5: Completing all 7 Official Quizzes
  // ==========================================================================
  describe("Station 5: Completing All 7 Official Quizzes in Hub", () => {
    it("completes and passes all 7 official quizzes with score >= 70%", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Seed passed attempts for quizzes 1..7 for the student
      for (let quizId = 1; quizId <= 7; quizId++) {
        await db.insert(quizAttempts).values({
          userId: studentUser.id,
          quizId,
          totalQuestions: 5,
          correctAnswers: 4,
          scorePercentage: 80,
          passed: true,
          answersJson: JSON.stringify({ q1: 0, q2: 1 }),
        });
      }

      // Seed a redundant attempt for quiz 1 to verify distinct counting
      await db.insert(quizAttempts).values({
        userId: studentUser.id,
        quizId: 1,
        totalQuestions: 5,
        correctAnswers: 5,
        scorePercentage: 100,
        passed: true,
        answersJson: JSON.stringify({ q1: 1, q2: 1 }),
      });

      const status = await callerStudent.assessment.getStatus();
      expect(status.passedQuizzesCount).toBe(7);
      expect(status.canTakePostAssessment).toBe(false); // Scenarios still 0/7
    });
  });

  // ==========================================================================
  // STATION 6: Completing all 7 Scenarios & Earning Awareness Points
  // ==========================================================================
  describe("Station 6: Completing All 7 Scenarios & Points Accounting", () => {
    it("completes all 7 scenarios, checks +5 first-pass points, and verifies initialScore immutability", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Record pre-scenario score
      const [beforeScores] = await db
        .select()
        .from(awarenessScores)
        .where(eq(awarenessScores.userId, studentUser.id));
      const initialScoreBaseline = beforeScores.initialScore;
      const preScenarioScore = beforeScores.currentScore;

      // Complete all 7 scenarios via caller (Path A safe decision -> +5 points each)
      for (const sc of SEVEN_SCENARIOS) {
        const s1 = sc.steps.find((s) => s.stepNumber === 1)!;
        const safeOpt = s1.options.find((o) => o.isCorrect)!;

        const res = await callerStudent.scenario.decide({
          scenarioId: sc.id,
          stepNumber: 1,
          optionId: safeOpt.id,
        });
        expect(res.isCorrect).toBe(true);
        expect(res.finalSummary?.passed).toBe(true);
      }

      // Check awarenessScores update
      const [afterScores] = await db
        .select()
        .from(awarenessScores)
        .where(eq(awarenessScores.userId, studentUser.id));

      // Initial score MUST be immutable
      expect(afterScores.initialScore).toBe(initialScoreBaseline);

      // Current score must have increased by 35 points (7 x 5), capped at 100 max
      expect(afterScores.currentScore).toBe(Math.min(100, preScenarioScore + 35));
      expect(afterScores.improvementDelta).toBe(afterScores.currentScore - initialScoreBaseline);

      // Station 6 milestone: All 4 gates satisfied!
      const status = await callerStudent.assessment.getStatus();
      expect(status.hasCompletedPreAssessment).toBe(true);
      expect(status.completedLessonsCount).toBe(7);
      expect(status.passedQuizzesCount).toBe(7);
      expect(status.passedScenariosCount).toBe(7);
      expect(status.canTakePostAssessment).toBe(true); // GATE UNLOCKED!
    });
  });

  // ==========================================================================
  // STATION 7: Resolving Weakness & Closing Loop
  // ==========================================================================
  describe("Station 7: Weakness Resolution & Lifecycle Semantics", () => {
    it("resolves weakness idempotently without mutating category, details, or userId", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      const [before] = await db.select().from(weaknesses).where(eq(weaknesses.id, activeWeaknessId));
      expect(before.resolved).toBe(false);

      // Student resolves weakness
      const resolvedWeakness = await callerStudent.recommendation.resolveWeakness({
        weaknessId: activeWeaknessId,
      });
      expect(resolvedWeakness.resolved).toBe(true);

      const [after] = await db.select().from(weaknesses).where(eq(weaknesses.id, activeWeaknessId));
      expect(after.resolved).toBe(true);
      expect(after.userId).toBe(before.userId);
      expect(after.category).toBe(before.category);
      expect(after.details).toBe(before.details);

      // Calling getUserWeaknesses without includeResolved hides it
      const activeOnly = await callerStudent.recommendation.getUserWeaknesses();
      expect(activeOnly.some((w) => w.id === activeWeaknessId)).toBe(false);

      // Calling with includeResolved=true displays it with resolved: true
      const allWeaknesses = await callerStudent.recommendation.getUserWeaknesses({
        includeResolved: true,
      });
      const resolvedEntry = allWeaknesses.find((w) => w.id === activeWeaknessId);
      expect(resolvedEntry).toBeDefined();
      expect(resolvedEntry?.resolved).toBe(true);
    });
  });

  // ==========================================================================
  // STATION 8: Post-Assessment Execution & Graduation Delta
  // ==========================================================================
  describe("Station 8: Post-Assessment Execution & Graduation Delta", () => {
    it("submits post-assessment, pins finalScore, and computes accurate improvementDelta", async () => {
      const db = await getDb();
      if (!db) throw new Error("DB unavailable");

      // Submit post assessment with 100% score (all options correct index 1)
      const postResult = await callerStudent.assessment.submit({
        type: "final",
        answers: [
          { questionId: 1, selectedOptionIndex: 1 },
          { questionId: 2, selectedOptionIndex: 1 },
          { questionId: 3, selectedOptionIndex: 1 },
        ],
      });

      expect(postResult).toBeDefined();
      expect(postResult.scorePercentage).toBe(100);

      // Verify updated awarenessScores
      const [finalScores] = await db
        .select()
        .from(awarenessScores)
        .where(eq(awarenessScores.userId, studentUser.id));

      expect(finalScores.initialScore).toBe(studentInitialScore); // strictly preserved
      expect(finalScores.finalScore).toBe(100);
      expect(finalScores.improvementDelta).toBe(100 - studentInitialScore);

      // Post-assessment is now completed
      const status = await callerStudent.assessment.getStatus();
      expect(status.hasCompletedPostAssessment).toBe(true);
      expect(status.finalScore).toBe(100);
      expect(status.improvementDelta).toBe(100 - studentInitialScore);
    });
  });

  // ==========================================================================
  // STATION 9: Admin Audit & Security Verification
  // ==========================================================================
  describe("Station 9: Admin Audit & Security Verification", () => {
    it("allows admin to inspect analytics, audit logs, and security events with exact schema", async () => {
      const stats = await callerAdmin.admin.stats();
      expect(stats.publishedLessons).toBe(7);
      expect(stats.totalUsers).toBeGreaterThanOrEqual(3);

      const logs = await callerAdmin.admin.auditLogs({ limit: 50 });
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThanOrEqual(1);

      // Verify exact schema keys
      const sampleLog = logs[0];
      expect(sampleLog).toHaveProperty("id");
      expect(sampleLog).toHaveProperty("userId");
      expect(sampleLog).toHaveProperty("action");
      expect(sampleLog).toHaveProperty("eventType");
      expect(sampleLog).toHaveProperty("severity");
      expect(sampleLog).toHaveProperty("ipAddress");
      expect(sampleLog).toHaveProperty("userAgent");
      expect(sampleLog).toHaveProperty("detailsJson");
      expect(sampleLog).toHaveProperty("timestamp");

      // Verify no invented keys
      expect((sampleLog as any).riskLevel).toBeUndefined();
      expect((sampleLog as any).actionType).toBeUndefined();
    });

    it("verifies severe RBAC rejection for normal users on admin endpoints", async () => {
      await expect(callerStudent.admin.stats()).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: NOT_ADMIN_ERR_MSG,
      });

      await expect(callerStudent.admin.auditLogs()).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: NOT_ADMIN_ERR_MSG,
      });
    });
  });

  // ==========================================================================
  // STATION 10: Complete System Regression Across Phases 1–4
  // ==========================================================================
  describe("Station 10: Complete System Regression Across Phases 1–4", () => {
    it("Phase 1: Rate limiter & Password hashing integrity", async () => {
      // Calling auth.login with bad password throws expected credential error
      await expect(
        callerGuest.auth.login({
          email: "nonexistent_regression_user@cybershield.sa",
          password: "WrongPassword123#",
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("Phase 2: Static Analyzers produce deterministic evaluations", async () => {
      const urlResult = await analyzeUrlStatic("http://paypal.com.verify-login.xyz/signin");
      expect(urlResult.riskScore).toBeGreaterThan(0);
      expect(["high", "critical"]).toContain(urlResult.riskLevel);

      const msgResult = await analyzeMessageStatic("عاجل! تم إيقاف بطاقتك البنكية. اضغط هنا فوراً للتحديث");
      expect(msgResult.riskScore).toBeGreaterThan(0);
      expect(["high", "critical"]).toContain(msgResult.riskLevel);
    });

    it("Phase 3: Scenario zero-leakage invariant", async () => {
      const scenario = await callerGuest.scenario.getByLessonId({ lessonId: 1 });
      expect(scenario.steps[0].options[0]).not.toHaveProperty("isCorrect");
      expect(scenario.steps[0].options[0]).not.toHaveProperty("riskScoreDelta");
      expect(scenario.steps[0].options[0]).not.toHaveProperty("feedbackAr");
    });

    it("Phase 4: Quiz Hub returns exact 7 quizzes mapped to 7 lessons", async () => {
      const quizzes = await callerStudent.quiz.getProgress();
      expect(quizzes.length).toBe(7);
      expect(quizzes.map((q) => q.quizId)).toEqual([1, 2, 3, 4, 5, 6, 7]);
      expect(quizzes.map((q) => q.lessonId)).toEqual([1, 2, 3, 4, 6, 7, 8]);
    });
  });
});
