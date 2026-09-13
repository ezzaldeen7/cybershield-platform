import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import {
  users,
  awarenessScores,
  quizAttempts,
  userProgress,
  assessmentAttempts,
  scenarioAttempts,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

describe("Phase 4 — Batch 3: Quizzes Hub & Learner Overview Integration Suite", () => {
  let userA: User;
  let userB: User;
  let callerA: ReturnType<typeof appRouter.createCaller>;
  let callerB: ReturnType<typeof appRouter.createCaller>;
  let callerGuest: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create User A
    const [createdA] = await db
      .insert(users)
      .values({
        name: "طالب مركز الاختبارات أ",
        email: `quiz_hub_a_${Date.now()}@cybershield.sa`,
        passwordHash: "securePass123#",
        role: "user",
        isActive: true,
      })
      .returning();
    userA = createdA;

    // Create User B (for user isolation verification)
    const [createdB] = await db
      .insert(users)
      .values({
        name: "طالب مركز الاختبارات ب",
        email: `quiz_hub_b_${Date.now()}@cybershield.sa`,
        passwordHash: "securePass123#",
        role: "user",
        isActive: true,
      })
      .returning();
    userB = createdB;

    // Initialize awareness score for User A
    await db.insert(awarenessScores).values({
      userId: userA.id,
      initialScore: 40,
      currentScore: 40,
      improvementDelta: 0,
    });

    // Initialize awareness score for User B
    await db.insert(awarenessScores).values({
      userId: userB.id,
      initialScore: 35,
      currentScore: 35,
      improvementDelta: 0,
    });

    const ctxA: TrpcContext = {
      user: userA,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerA = appRouter.createCaller(ctxA);

    const ctxB: TrpcContext = {
      user: userB,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerB = appRouter.createCaller(ctxB);

    const ctxGuest: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerGuest = appRouter.createCaller(ctxGuest);
  });

  it("1. Quizzes Hub displays exactly all 7 official quizzes with correct Quiz -> Lesson mapping", async () => {
    const quizzes = await callerA.quiz.getProgress();

    expect(quizzes).toBeDefined();
    expect(quizzes.length).toBe(7);

    // Verify exact sequence of quiz IDs 1 through 7
    const quizIds = quizzes.map((q) => q.quizId);
    expect(quizIds).toEqual([1, 2, 3, 4, 5, 6, 7]);

    // Verify exact Lesson IDs mapped to each quiz
    // Quiz 1 -> 1, Quiz 2 -> 2, Quiz 3 -> 3, Quiz 4 -> 4, Quiz 5 -> 6, Quiz 6 -> 7, Quiz 7 -> 8
    const expectedMappings = [
      { quizId: 1, lessonId: 1, slug: "how-to-detect-phishing" },
      { quizId: 2, lessonId: 2, slug: "safe-link-inspection" },
      { quizId: 3, lessonId: 3, slug: "account-protection-mfa" },
      { quizId: 4, lessonId: 4, slug: "attachments-malware-awareness" },
      { quizId: 5, lessonId: 6, slug: "data-protection-backup" },
      { quizId: 6, lessonId: 7, slug: "public-wifi-network-security" },
      { quizId: 7, lessonId: 8, slug: "incident-reporting-response" },
    ];

    for (const mapping of expectedMappings) {
      const q = quizzes.find((item) => item.quizId === mapping.quizId);
      expect(q).toBeDefined();
      expect(q!.lessonId).toBe(mapping.lessonId);
      expect(q!.lessonSlug).toBe(mapping.slug);
      expect(q!.lessonTitleAr.length).toBeGreaterThan(5);
      expect(q!.passScorePercentage).toBe(70);
    }
  });

  it("2. retrieves 5 sanitized questions for each of the 7 quizzes with ZERO leakage", async () => {
    for (let quizId = 1; quizId <= 7; quizId++) {
      const questions = await callerGuest.quiz.getQuestions({ quizId });
      expect(questions.length).toBe(5);

      for (const q of questions) {
        expect(q.quizId).toBe(quizId);
        expect(q.questionAr.length).toBeGreaterThan(0);
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options.length).toBe(4);

        // Crucial security check: answers & explanations MUST NOT leak before submission
        expect((q as any).correctOptionIndex).toBeUndefined();
        expect((q as any).explanationAr).toBeUndefined();
      }
    }
  });

  it("3. correctly computes bestScore and attemptsCount from DB across multiple retakes", async () => {
    const quizId = 5; // Quiz 5 -> Lesson 6 (Data Protection & Ransomware)

    // Attempt 1: Fail with 40% (2 correct out of 5)
    // Q9: 1, Q10: 1, Q27: 1, Q28: 1, Q29: 1
    const sub1 = await callerA.quiz.submit({
      quizId,
      answers: [
        { questionId: 9, selectedOptionIndex: 1 }, // correct
        { questionId: 10, selectedOptionIndex: 1 }, // correct
        { questionId: 27, selectedOptionIndex: 0 }, // wrong
        { questionId: 28, selectedOptionIndex: 0 }, // wrong
        { questionId: 29, selectedOptionIndex: 0 }, // wrong
      ],
    });
    expect(sub1.scorePercentage).toBe(40);
    expect(sub1.passed).toBe(false);

    let progress = await callerA.quiz.getProgress();
    let q5 = progress.find((p) => p.quizId === 5);
    expect(q5?.hasAttempted).toBe(true);
    expect(q5?.isPassed).toBe(false);
    expect(q5?.bestScore).toBe(40);
    expect(q5?.attemptsCount).toBe(1);

    // Attempt 2: Pass with 80% (4 correct out of 5)
    const sub2 = await callerA.quiz.submit({
      quizId,
      answers: [
        { questionId: 9, selectedOptionIndex: 1 }, // correct
        { questionId: 10, selectedOptionIndex: 1 }, // correct
        { questionId: 27, selectedOptionIndex: 1 }, // correct
        { questionId: 28, selectedOptionIndex: 1 }, // correct
        { questionId: 29, selectedOptionIndex: 0 }, // wrong
      ],
    });
    expect(sub2.scorePercentage).toBe(80);
    expect(sub2.passed).toBe(true);

    progress = await callerA.quiz.getProgress();
    q5 = progress.find((p) => p.quizId === 5);
    expect(q5?.hasAttempted).toBe(true);
    expect(q5?.isPassed).toBe(true);
    expect(q5?.bestScore).toBe(80);
    expect(q5?.attemptsCount).toBe(2);

    // Attempt 3: Retake with lower score 60% -> bestScore remains 80%, isPassed remains true
    const sub3 = await callerA.quiz.submit({
      quizId,
      answers: [
        { questionId: 9, selectedOptionIndex: 1 }, // correct
        { questionId: 10, selectedOptionIndex: 1 }, // correct
        { questionId: 27, selectedOptionIndex: 1 }, // correct
        { questionId: 28, selectedOptionIndex: 0 }, // wrong
        { questionId: 29, selectedOptionIndex: 0 }, // wrong
      ],
    });
    expect(sub3.scorePercentage).toBe(60);
    expect(sub3.passed).toBe(false);

    progress = await callerA.quiz.getProgress();
    q5 = progress.find((p) => p.quizId === 5);
    expect(q5?.hasAttempted).toBe(true);
    expect(q5?.isPassed).toBe(true);
    expect(q5?.bestScore).toBe(80); // Preserves highest score!
    expect(q5?.attemptsCount).toBe(3);
  });

  it("4. validates passScorePercentage = 70% boundary logic", async () => {
    const quizId = 6; // Quiz 6 -> Lesson 7 (Public Wi-Fi)

    // 3/5 = 60% -> FAIL (< 70%)
    const failRes = await callerA.quiz.submit({
      quizId,
      answers: [
        { questionId: 11, selectedOptionIndex: 1 }, // correct
        { questionId: 12, selectedOptionIndex: 1 }, // correct
        { questionId: 30, selectedOptionIndex: 1 }, // correct
        { questionId: 31, selectedOptionIndex: 0 }, // wrong
        { questionId: 32, selectedOptionIndex: 0 }, // wrong
      ],
    });
    expect(failRes.scorePercentage).toBe(60);
    expect(failRes.passed).toBe(false);

    // 4/5 = 80% -> PASS (>= 70%)
    const passRes = await callerA.quiz.submit({
      quizId,
      answers: [
        { questionId: 11, selectedOptionIndex: 1 }, // correct
        { questionId: 12, selectedOptionIndex: 1 }, // correct
        { questionId: 30, selectedOptionIndex: 1 }, // correct
        { questionId: 31, selectedOptionIndex: 2 }, // correct
        { questionId: 32, selectedOptionIndex: 0 }, // wrong
      ],
    });
    expect(passRes.scorePercentage).toBe(80);
    expect(passRes.passed).toBe(true);
  });

  it("5. verifies Learner Overview returns totalLessons: 7, totalQuizzes: 7, totalScenarios: 7 and accurate counts", async () => {
    // Complete lesson 1 for User A
    await callerA.learning.completeLesson({ lessonId: 1 });

    const overview = await callerA.learning.overview();

    // Verify official totals (strictly 7, NEVER 4 or 8)
    expect(overview.totalLessons).toBe(7);
    expect(overview.totalQuizzes).toBe(7);
    expect(overview.totalScenarios).toBe(7);

    // Completed lessons count
    expect(overview.completedCount).toBeGreaterThanOrEqual(1);
    expect(overview.completedLessonsCount).toBeGreaterThanOrEqual(1);

    // Passed quizzes count (User A passed Quiz 5 and Quiz 6 in earlier steps)
    expect(overview.passedQuizzesCount).toBeGreaterThanOrEqual(2);

    // Verify assessment lifecycle fields
    expect(overview).toHaveProperty("hasCompletedPreAssessment");
    expect(overview).toHaveProperty("preAssessmentScore");
    expect(overview).toHaveProperty("hasCompletedPostAssessment");
    expect(overview).toHaveProperty("postAssessmentScore");
    expect(overview).toHaveProperty("canTakePostAssessment");
  });

  it("6. verifies that retaking lessons or quizzes does NOT inflate Overview counts", async () => {
    const overviewBefore = await callerA.learning.overview();
    const lessonsBefore = overviewBefore.completedLessonsCount;
    const quizzesBefore = overviewBefore.passedQuizzesCount;

    // Retake and complete lesson 1 again
    await callerA.learning.completeLesson({ lessonId: 1 });
    await callerA.learning.completeLesson({ lessonId: 1 });

    // Retake and pass Quiz 5 again (100%)
    await callerA.quiz.submit({
      quizId: 5,
      answers: [
        { questionId: 9, selectedOptionIndex: 1 },
        { questionId: 10, selectedOptionIndex: 1 },
        { questionId: 27, selectedOptionIndex: 1 },
        { questionId: 28, selectedOptionIndex: 1 },
        { questionId: 29, selectedOptionIndex: 1 },
      ],
    });

    const overviewAfter = await callerA.learning.overview();
    expect(overviewAfter.completedLessonsCount).toBe(lessonsBefore);
    expect(overviewAfter.passedQuizzesCount).toBe(quizzesBefore);
  });

  it("7. strictly enforces User Isolation between User A and User B", async () => {
    // User B has not attempted any quiz or lesson
    const progressB = await callerB.quiz.getProgress();
    expect(progressB.length).toBe(7);
    for (const item of progressB) {
      expect(item.hasAttempted).toBe(false);
      expect(item.isPassed).toBe(false);
      expect(item.bestScore).toBe(0);
      expect(item.attemptsCount).toBe(0);
    }

    const overviewB = await callerB.learning.overview();
    expect(overviewB.completedCount).toBe(0);
    expect(overviewB.completedLessonsCount).toBe(0);
    expect(overviewB.passedQuizzesCount).toBe(0);
    expect(overviewB.passedScenariosCount).toBe(0);
    expect(overviewB.totalLessons).toBe(7);
    expect(overviewB.totalQuizzes).toBe(7);
    expect(overviewB.totalScenarios).toBe(7);

    // User A's progress remains intact and separate
    const progressA = await callerA.quiz.getProgress();
    const q5A = progressA.find((q) => q.quizId === 5);
    expect(q5A?.isPassed).toBe(true);
    expect(q5A?.bestScore).toBe(100);
    expect(q5A?.attemptsCount).toBe(4);
  });
});
