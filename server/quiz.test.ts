import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { users, awarenessScores, quizAttempts, quizzes, quizQuestions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

describe("Sub-phase 2: Quiz Engine & Grading Lifecycle", () => {
  let testStudent: User;
  let callerStudent: ReturnType<typeof appRouter.createCaller>;
  let callerGuest: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Create test student
    const studentEmail = `student_quiz_${Date.now()}@cybershield.sa`;
    const [created] = await db.insert(users).values({
      name: "طالب الاختبارات",
      email: studentEmail,
      passwordHash: "securePass123#",
      role: "user",
      isActive: true,
    }).returning();

    testStudent = created;

    // Create initial awareness score baseline
    await db.insert(awarenessScores).values({
      userId: testStudent.id,
      initialScore: 40,
      currentScore: 40,
      improvementDelta: 0,
    });

    const ctxStudent: TrpcContext = {
      user: testStudent,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerStudent = appRouter.createCaller(ctxStudent);

    const ctxGuest: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerGuest = appRouter.createCaller(ctxGuest);
  });

  it("1. retrieves quiz and sanitized questions by lessonId (no answer leakage)", async () => {
    const result = await callerGuest.quiz.getByLessonId({ lessonId: 1 });
    expect(result.quiz).toBeDefined();
    expect(result.quiz.titleAr).toContain("كشف رسائل التصيد");
    expect(result.questions.length).toBeGreaterThanOrEqual(2);

    // Verify security: correctOptionIndex and explanationAr are NOT leaked to the client before submission
    for (const q of result.questions) {
      expect((q as any).correctOptionIndex).toBeUndefined();
      expect((q as any).explanationAr).toBeUndefined();
      expect(Array.isArray((q as any).options)).toBe(true);
      expect((q as any).options.length).toBe(4);
    }
  });

  it("2. grades correct answers, passes quiz (100%), and stores attempt in quiz_attempts", async () => {
    const db = await getDb();
    const quiz1 = await callerGuest.quiz.getByLessonId({ lessonId: 1 });
    const quizId = quiz1.quiz.id;

    // From service definition: Q1 correct is 2, Q2 correct is 1
    const submission = await callerStudent.quiz.submit({
      quizId,
      answers: [
        { questionId: 1, selectedOptionIndex: 2 },
        { questionId: 2, selectedOptionIndex: 1 },
      ],
    });

    expect(submission.passed).toBe(true);
    expect(submission.scorePercentage).toBe(100);
    expect(submission.correctAnswers).toBe(2);
    expect(submission.isFirstPass).toBe(true);
    expect(submission.results.length).toBe(2);
    expect(submission.results.every((r) => r.isCorrect)).toBe(true);
    expect(submission.results[0].explanationAr).toBeDefined();

    // Verify record in quiz_attempts table
    const [attemptRecord] = await db!
      .select()
      .from(quizAttempts)
      .where(and(eq(quizAttempts.userId, testStudent.id), eq(quizAttempts.quizId, quizId)))
      .orderBy(quizAttempts.id);

    expect(attemptRecord).toBeDefined();
    expect(attemptRecord.passed).toBe(true);
    expect(attemptRecord.scorePercentage).toBe(100);
    expect(attemptRecord.correctAnswers).toBe(2);
  });

  it("3. prevents duplicate score inflation on retaking a passed quiz", async () => {
    const db = await getDb();
    const quizId = 1;

    // Check awareness score before retake
    const [scoreBefore] = await db!.select().from(awarenessScores).where(eq(awarenessScores.userId, testStudent.id)).limit(1);
    const scoreValBefore = scoreBefore.currentScore;

    // Retake the same quiz and pass it again
    const secondSubmission = await callerStudent.quiz.submit({
      quizId,
      answers: [
        { questionId: 1, selectedOptionIndex: 2 },
        { questionId: 2, selectedOptionIndex: 1 },
      ],
    });

    expect(secondSubmission.passed).toBe(true);
    expect(secondSubmission.isFirstPass).toBe(false); // Must be false!

    // Check awareness score after retake: MUST NOT increase!
    const [scoreAfter] = await db!.select().from(awarenessScores).where(eq(awarenessScores.userId, testStudent.id)).limit(1);
    expect(scoreAfter.currentScore).toBe(scoreValBefore);
    expect(scoreAfter.initialScore).toBe(40); // Initial baseline strictly unchanged!

    // However, the attempt count should now be 2
    const attempts = await db!.select().from(quizAttempts).where(and(eq(quizAttempts.userId, testStudent.id), eq(quizAttempts.quizId, quizId)));
    expect(attempts.length).toBe(2);
  });

  it("4. grades wrong answers, marks as failed (0%), and returns educational explanations", async () => {
    const quizId = 2; // Quiz for Lesson 2

    const failSubmission = await callerStudent.quiz.submit({
      quizId,
      answers: [
        { questionId: 3, selectedOptionIndex: 0 }, // wrong
        { questionId: 4, selectedOptionIndex: 0 }, // wrong
      ],
    });

    expect(failSubmission.passed).toBe(false);
    expect(failSubmission.scorePercentage).toBe(0);
    expect(failSubmission.correctAnswers).toBe(0);
    expect(failSubmission.isFirstPass).toBe(false);
    expect(failSubmission.results.every((r) => !r.isCorrect)).toBe(true);
    expect(failSubmission.results[0].explanationAr.length).toBeGreaterThan(10);
  });

  it("5. tracks user quiz progress across all 7 lessons", async () => {
    const progressList = await callerStudent.quiz.getProgress();
    expect(progressList.length).toBe(7);

    // Quiz 1 was passed
    const q1 = progressList.find((p) => p.quizId === 1);
    expect(q1?.hasAttempted).toBe(true);
    expect(q1?.isPassed).toBe(true);
    expect(q1?.bestScore).toBe(100);

    // Quiz 2 was attempted but failed
    const q2 = progressList.find((p) => p.quizId === 2);
    expect(q2?.hasAttempted).toBe(true);
    expect(q2?.isPassed).toBe(false);

    // Quiz 3 has not been attempted yet
    const q3 = progressList.find((p) => p.quizId === 3);
    expect(q3?.hasAttempted).toBe(false);
    expect(q3?.isPassed).toBe(false);
  });

  it("6. rejects unauthenticated submission with UNAUTHORIZED", async () => {
    await expect(
      callerGuest.quiz.submit({
        quizId: 1,
        answers: [{ questionId: 1, selectedOptionIndex: 2 }],
      })
    ).rejects.toThrow();
  });
});
