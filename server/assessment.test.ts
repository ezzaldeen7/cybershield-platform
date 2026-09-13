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
  lessons,
  quizzes,
  scenarios,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import {
  OFFICIAL_LESSON_IDS,
  OFFICIAL_QUIZ_IDS,
  OFFICIAL_SCENARIO_IDS,
} from "./services/assessmentService";

describe("Phase 4 - Batch 1: Assessment Lifecycle & Baseline Onboarding", () => {
  let studentA: User;
  let callerStudentA: ReturnType<typeof appRouter.createCaller>;
  let callerGuest: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Create student A
    const emailA = `student_assess_${Date.now()}@cybershield.sa`;
    const [createdA] = await db
      .insert(users)
      .values({
        name: "طالب التقييم القبلي والبعدي",
        email: emailA,
        passwordHash: "securePassAssess123#",
        role: "user",
        isActive: true,
      })
      .returning();
    studentA = createdA;

    // Authenticated caller for student A
    const ctxStudentA: TrpcContext = {
      user: studentA,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerStudentA = appRouter.createCaller(ctxStudentA);

    // Guest caller
    const ctxGuest: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerGuest = appRouter.createCaller(ctxGuest);
  });

  // ---------------------------------------------------------------------------
  // 1. Guest -> assessment.getStatus and submit rejected with UNAUTHORIZED
  // ---------------------------------------------------------------------------
  it("1. rejects guest calls to assessment.getStatus and assessment.submit with UNAUTHORIZED", async () => {
    await expect(callerGuest.assessment.getStatus()).rejects.toThrow();

    try {
      await callerGuest.assessment.getStatus();
      expect.unreachable("Should have thrown TRPCError");
    } catch (err: any) {
      expect(err).toBeInstanceOf(TRPCError);
      expect(err.code).toBe("UNAUTHORIZED");
    }

    try {
      await callerGuest.assessment.submit({
        type: "initial",
        answers: [{ questionId: 1, selectedOptionIndex: 1 }],
      });
      expect.unreachable("Should have thrown TRPCError");
    } catch (err: any) {
      expect(err).toBeInstanceOf(TRPCError);
      expect(err.code).toBe("UNAUTHORIZED");
    }
  });

  // ---------------------------------------------------------------------------
  // 2. New user -> hasCompletedPreAssessment = false, canTakePostAssessment = false
  // ---------------------------------------------------------------------------
  it("2. returns uncompleted pre-assessment and locked post-assessment for new user", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const emailNew = `student_new_${Date.now()}@cybershield.sa`;
    const [newUser] = await db
      .insert(users)
      .values({
        name: "طالب جديد",
        email: emailNew,
        passwordHash: "securePass123#",
        role: "user",
        isActive: true,
      })
      .returning();

    const ctxNew: TrpcContext = {
      user: newUser,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    const callerNew = appRouter.createCaller(ctxNew);

    const status = await callerNew.assessment.getStatus();
    expect(status.hasCompletedPreAssessment).toBe(false);
    expect(status.canTakePostAssessment).toBe(false);
    expect(status.hasCompletedPostAssessment).toBe(false);
    expect(status.initialScore).toBeNull();
    expect(status.finalScore).toBeNull();
    expect(status.completedLessonsCount).toBe(0);
    expect(status.passedQuizzesCount).toBe(0);
    expect(status.passedScenariosCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 3. User with Pre score = 0 -> still hasCompletedPreAssessment = true if attempt exists
  // ---------------------------------------------------------------------------
  it("3. recognizes pre-assessment completion even if user scored 0% (attempt-based, not score > 0)", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const emailZero = `student_zero_${Date.now()}@cybershield.sa`;
    const [zeroUser] = await db
      .insert(users)
      .values({
        name: "طالب بدرجة صفر",
        email: emailZero,
        passwordHash: "securePass123#",
        role: "user",
        isActive: true,
      })
      .returning();

    // Insert pre-assessment attempt with score 0
    await db.insert(assessmentAttempts).values({
      userId: zeroUser.id,
      assessmentId: 1,
      assessmentType: "pre",
      scorePercentage: 0,
      totalQuestions: 3,
      correctAnswers: 0,
    });

    // Insert awareness score with initialScore = 0
    await db.insert(awarenessScores).values({
      userId: zeroUser.id,
      initialScore: 0,
      currentScore: 0,
      improvementDelta: 0,
    });

    const ctxZero: TrpcContext = {
      user: zeroUser,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    const callerZero = appRouter.createCaller(ctxZero);

    const status = await callerZero.assessment.getStatus();
    expect(status.hasCompletedPreAssessment).toBe(true);
    expect(status.initialScore).toBe(0);
    expect(status.preAssessmentScore).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // 3b. Non-pre attempt with assessmentId = 1 does NOT count as Pre-assessment
  // ---------------------------------------------------------------------------
  it("3b. ensures a non-pre attempt (e.g. post) with assessmentId=1 does NOT count as pre-assessment", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const emailNonPre = `student_nonpre_${Date.now()}@cybershield.sa`;
    const [nonPreUser] = await db
      .insert(users)
      .values({
        name: "طالب بمحاولة ليست قبلية",
        email: emailNonPre,
        passwordHash: "securePass123#",
        role: "user",
        isActive: true,
      })
      .returning();

    // Insert attempt with assessmentType = "post" even if assessmentId is 1
    await db.insert(assessmentAttempts).values({
      userId: nonPreUser.id,
      assessmentId: 1,
      assessmentType: "post",
      scorePercentage: 80,
      totalQuestions: 3,
      correctAnswers: 2,
    });

    const ctxNonPre: TrpcContext = {
      user: nonPreUser,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    const callerNonPre = appRouter.createCaller(ctxNonPre);

    const status = await callerNonPre.assessment.getStatus();
    // MUST BE FALSE! Because assessmentType is "post", not "pre"!
    expect(status.hasCompletedPreAssessment).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 4. Pre-assessment submission -> records attempt, weakness, and establishes initialScore
  // ---------------------------------------------------------------------------
  it("4. records pre-assessment attempt and establishes baseline initialScore on first completion", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Answers: Q1 correct (index 1), Q2 correct (index 1), Q3 incorrect (index 0 instead of 1)
    // Score: 2/3 = 67%
    const res = await callerStudentA.assessment.submit({
      type: "initial",
      answers: [
        { questionId: 1, selectedOptionIndex: 1 },
        { questionId: 2, selectedOptionIndex: 1 },
        { questionId: 3, selectedOptionIndex: 0 },
      ],
    });

    expect(res.scorePercentage).toBe(67);
    expect(res.initialScore).toBe(67);
    expect(res.isFirstPreAssessment).toBe(true);
    expect(res.results.length).toBe(3);
    expect(res.results[0].isCorrect).toBe(true);
    expect(res.results[1].isCorrect).toBe(true);
    expect(res.results[2].isCorrect).toBe(false);

    // Verify DB awarenessScores record
    const [scoreRow] = await db
      .select()
      .from(awarenessScores)
      .where(eq(awarenessScores.userId, studentA.id));
    expect(scoreRow).toBeDefined();
    expect(scoreRow.initialScore).toBe(67);

    // Verify DB assessmentAttempts record
    const attempts = await db
      .select()
      .from(assessmentAttempts)
      .where(eq(assessmentAttempts.userId, studentA.id));
    expect(attempts.length).toBe(1);
    expect(attempts[0].assessmentType).toBe("pre");
    expect(attempts[0].scorePercentage).toBe(67);

    // Verify weakness logged for Q3
    const userWeaknesses = await db
      .select()
      .from(weaknesses)
      .where(eq(weaknesses.userId, studentA.id));
    expect(userWeaknesses.length).toBeGreaterThanOrEqual(1);
    expect(userWeaknesses.some((w) => w.category === "passwords")).toBe(true);

    // Status query confirms
    const status = await callerStudentA.assessment.getStatus();
    expect(status.hasCompletedPreAssessment).toBe(true);
    expect(status.initialScore).toBe(67);
  });

  // ---------------------------------------------------------------------------
  // 5. Pre-assessment re-attempt -> does NOT alter initialScore (Baseline Immutability)
  // ---------------------------------------------------------------------------
  it("5. strictly enforces baseline immutability: re-taking pre-assessment does not change initialScore", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Student A retakes pre-assessment with 100% (all 3 correct)
    const res = await callerStudentA.assessment.submit({
      type: "initial",
      answers: [
        { questionId: 1, selectedOptionIndex: 1 },
        { questionId: 2, selectedOptionIndex: 1 },
        { questionId: 3, selectedOptionIndex: 1 },
      ],
    });

    expect(res.scorePercentage).toBe(100);
    // initialScore MUST REMAIN 67 from the first baseline establishment!
    expect(res.initialScore).toBe(67);
    expect(res.isFirstPreAssessment).toBe(false);

    // Verify DB awarenessScores has NOT changed initialScore
    const [scoreRow] = await db
      .select()
      .from(awarenessScores)
      .where(eq(awarenessScores.userId, studentA.id));
    expect(scoreRow.initialScore).toBe(67);

    // Status query confirms initialScore is still 67
    const status = await callerStudentA.assessment.getStatus();
    expect(status.initialScore).toBe(67);
  });

  // ---------------------------------------------------------------------------
  // 6. Post-assessment before prerequisites -> rejected server-side with PRECONDITION_FAILED
  // ---------------------------------------------------------------------------
  it("6. rejects post-assessment submission with PRECONDITION_FAILED if prerequisites are incomplete", async () => {
    try {
      await callerStudentA.assessment.submit({
        type: "final",
        answers: [
          { questionId: 1, selectedOptionIndex: 1 },
          { questionId: 2, selectedOptionIndex: 1 },
          { questionId: 3, selectedOptionIndex: 1 },
        ],
      });
      expect.unreachable("Should have thrown PRECONDITION_FAILED TRPCError");
    } catch (err: any) {
      expect(err).toBeInstanceOf(TRPCError);
      expect(err.code).toBe("PRECONDITION_FAILED");
    }
  });

  // ---------------------------------------------------------------------------
  // 7. Completing 7 distinct lessons, quizzes, scenarios -> canTakePostAssessment = true
  // ---------------------------------------------------------------------------
  it("7. strictly enforces official 7/7 curriculum intersection: duplicates and partial completions do not unlock gate", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Official curriculum IDs verification
    expect(OFFICIAL_LESSON_IDS).toEqual([1, 2, 3, 4, 6, 7, 8]);
    expect(OFFICIAL_QUIZ_IDS).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(OFFICIAL_SCENARIO_IDS).toEqual([1, 2, 3, 4, 5, 6, 7]);

    // 1. Partial lessons: Complete 6 out of 7 official lessons ([1, 2, 3, 4, 6, 7])
    for (const lId of [1, 2, 3, 4, 6, 7]) {
      await db.insert(userProgress).values({
        userId: studentA.id,
        lessonId: lId,
        status: "completed",
      });
    }

    // Duplicate official lesson 1 multiple times -> must NOT increment count
    for (let i = 0; i < 3; i++) {
      await db.insert(userProgress).values({
        userId: studentA.id,
        lessonId: 1,
        status: "completed",
      });
    }

    let status = await callerStudentA.assessment.getStatus();
    expect(status.completedLessonsCount).toBe(6);
    expect(status.canTakePostAssessment).toBe(false);

    // Complete the 7th official lesson (lesson 8)
    await db.insert(userProgress).values({
      userId: studentA.id,
      lessonId: 8,
      status: "completed",
    });

    status = await callerStudentA.assessment.getStatus();
    expect(status.completedLessonsCount).toBe(7);
    expect(status.canTakePostAssessment).toBe(false);

    // 2. Partial quizzes: Complete 6 out of 7 official quizzes ([1, 2, 3, 4, 5, 6])
    for (const qId of [1, 2, 3, 4, 5, 6]) {
      await db.insert(quizAttempts).values({
        userId: studentA.id,
        quizId: qId,
        scorePercentage: 80,
        totalQuestions: 5,
        correctAnswers: 4,
        passed: true,
        answersJson: JSON.stringify([]),
      });
    }

    // Duplicate official quiz 1 multiple times -> must NOT increment count
    for (let i = 0; i < 3; i++) {
      await db.insert(quizAttempts).values({
        userId: studentA.id,
        quizId: 1,
        scorePercentage: 100,
        totalQuestions: 5,
        correctAnswers: 5,
        passed: true,
        answersJson: JSON.stringify([]),
      });
    }

    status = await callerStudentA.assessment.getStatus();
    expect(status.passedQuizzesCount).toBe(6);
    expect(status.canTakePostAssessment).toBe(false);

    // Complete the 7th official quiz (quiz 7)
    await db.insert(quizAttempts).values({
      userId: studentA.id,
      quizId: 7,
      scorePercentage: 80,
      totalQuestions: 5,
      correctAnswers: 4,
      passed: true,
      answersJson: JSON.stringify([]),
    });

    status = await callerStudentA.assessment.getStatus();
    expect(status.passedQuizzesCount).toBe(7);
    expect(status.canTakePostAssessment).toBe(false);

    // 3. Partial scenarios: Complete 6 out of 7 official scenarios ([1, 2, 3, 4, 5, 6])
    for (const scId of [1, 2, 3, 4, 5, 6]) {
      await db.insert(scenarioAttempts).values({
        userId: studentA.id,
        scenarioId: scId,
        passed: true,
        finalAction: "report_and_block",
        scorePercentage: 100,
        totalRiskDelta: 0,
      });
    }

    // Duplicate official scenario 1 multiple times -> must NOT increment count
    for (let i = 0; i < 3; i++) {
      await db.insert(scenarioAttempts).values({
        userId: studentA.id,
        scenarioId: 1,
        passed: true,
        finalAction: "report_and_block",
        scorePercentage: 100,
        totalRiskDelta: 0,
      });
    }

    status = await callerStudentA.assessment.getStatus();
    expect(status.passedScenariosCount).toBe(6);
    expect(status.canTakePostAssessment).toBe(false);

    // Complete the 7th official scenario (scenario 7)
    await db.insert(scenarioAttempts).values({
      userId: studentA.id,
      scenarioId: 7,
      passed: true,
      finalAction: "report_and_block",
      scorePercentage: 100,
      totalRiskDelta: 0,
    });

    // 4. Now all official 7/7 lessons, 7/7 quizzes, and 7/7 scenarios are complete -> UNLOCKS!
    status = await callerStudentA.assessment.getStatus();
    expect(status.completedLessonsCount).toBe(7);
    expect(status.passedQuizzesCount).toBe(7);
    expect(status.passedScenariosCount).toBe(7);
    expect(status.postAssessmentPrerequisites.completedLessonsCount).toBe(7);
    expect(status.postAssessmentPrerequisites.passedQuizzesCount).toBe(7);
    expect(status.postAssessmentPrerequisites.passedScenariosCount).toBe(7);
    expect(status.canTakePostAssessment).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 8 & 9. Post-assessment submission -> records finalScore and calculates improvementDelta
  // ---------------------------------------------------------------------------
  it("8 & 9. accepts post-assessment, records finalScore and accurately computes improvementDelta", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Student A submits post-assessment with 100%
    const res = await callerStudentA.assessment.submit({
      type: "final",
      answers: [
        { questionId: 1, selectedOptionIndex: 1 },
        { questionId: 2, selectedOptionIndex: 1 },
        { questionId: 3, selectedOptionIndex: 1 },
      ],
    });

    expect(res.scorePercentage).toBe(100);
    expect(res.finalScore).toBe(100);
    expect(res.initialScore).toBe(67);
    // Delta: 100 - 67 = 33
    expect(res.improvementDelta).toBe(33);

    // Verify DB awarenessScores
    const [scoreRow] = await db
      .select()
      .from(awarenessScores)
      .where(eq(awarenessScores.userId, studentA.id));
    expect(scoreRow.initialScore).toBe(67);
    expect(scoreRow.finalScore).toBe(100);
    expect(scoreRow.improvementDelta).toBe(33);

    // Status query
    const status = await callerStudentA.assessment.getStatus();
    expect(status.hasCompletedPostAssessment).toBe(true);
    expect(status.finalScore).toBe(100);
    expect(status.postAssessmentScore).toBe(100);
    expect(status.improvementDelta).toBe(33);
  });

  // ---------------------------------------------------------------------------
  // 10. Zero answer/explanation leakage in assessment.getQuestions
  // ---------------------------------------------------------------------------
  it("10. strictly sanitizes assessment.getQuestions to ensure zero answer or explanation leakage", async () => {
    for (const type of ["initial", "final"] as const) {
      const questions = await callerGuest.assessment.getQuestions({ type });
      expect(questions.length).toBeGreaterThanOrEqual(3);

      for (const q of questions) {
        expect(q.id).toBeDefined();
        expect(q.category).toBeDefined();
        expect(q.questionAr).toBeDefined();
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.options.length).toBeGreaterThanOrEqual(2);

        // Zero leakage verification: forbidden fields must NOT exist
        expect((q as any).correctOptionIndex).toBeUndefined();
        expect((q as any).explanationAr).toBeUndefined();
        expect((q as any).optionsJson).toBeUndefined();
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 11. User isolation -> user A cannot access or alter user B's assessment data
  // ---------------------------------------------------------------------------
  it("11. strictly maintains user isolation between different users' assessments", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const emailB = `student_b_${Date.now()}@cybershield.sa`;
    const [userB] = await db
      .insert(users)
      .values({
        name: "طالب ب المنعزل",
        email: emailB,
        passwordHash: "securePassB123#",
        role: "user",
        isActive: true,
      })
      .returning();

    const ctxB: TrpcContext = {
      user: userB,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    const callerB = appRouter.createCaller(ctxB);

    // User B status is independent
    const statusB = await callerB.assessment.getStatus();
    expect(statusB.hasCompletedPreAssessment).toBe(false);
    expect(statusB.initialScore).toBeNull();
    expect(statusB.completedLessonsCount).toBe(0);

    // User B submits pre-assessment with score 33% (1/3)
    const resB = await callerB.assessment.submit({
      type: "initial",
      answers: [
        { questionId: 1, selectedOptionIndex: 1 },
        { questionId: 2, selectedOptionIndex: 0 },
        { questionId: 3, selectedOptionIndex: 0 },
      ],
    });
    expect(resB.initialScore).toBe(33);

    // Verify student A's data was completely untouched
    const statusA = await callerStudentA.assessment.getStatus();
    expect(statusA.initialScore).toBe(67);
    expect(statusA.finalScore).toBe(100);
    expect(statusA.improvementDelta).toBe(33);
  });
});
