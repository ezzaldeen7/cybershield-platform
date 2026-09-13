import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import {
  users,
  awarenessScores,
  scenarioAttempts,
  weaknesses,
} from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import {
  SEVEN_SCENARIOS,
  LESSON_SCENARIO_MAPPING,
} from "./services/scenarioService";

describe("Phase 3: Interactive Cybersecurity Scenarios & Multi-Step Simulator", () => {
  let testStudent: User;
  let callerStudent: ReturnType<typeof appRouter.createCaller>;
  let callerGuest: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // 1. Create a dedicated test student
    const studentEmail = `student_scenario_${Date.now()}@cybershield.sa`;
    const [created] = await db
      .insert(users)
      .values({
        name: "طالب السيناريوهات التفاعلية",
        email: studentEmail,
        passwordHash: "securePassScenario123#",
        role: "user",
        isActive: true,
      })
      .returning();

    testStudent = created;

    // 2. Set baseline awareness score (initialScore = 50, currentScore = 50)
    await db.insert(awarenessScores).values({
      userId: testStudent.id,
      initialScore: 50,
      currentScore: 50,
      improvementDelta: 0,
    });

    // 3. Setup authenticated caller
    const ctxStudent: TrpcContext = {
      user: testStudent,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerStudent = appRouter.createCaller(ctxStudent);

    // 4. Setup guest caller
    const ctxGuest: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    };
    callerGuest = appRouter.createCaller(ctxGuest);
  });

  // ---------------------------------------------------------------------------
  // 1, 2, 3: Structure & Curriculum Mapping
  // ---------------------------------------------------------------------------
  it("1. returns exactly 7 scenarios with valid curriculum mapping for real lessons", async () => {
    const list = await callerGuest.scenario.list();
    expect(list.length).toBe(7);

    // Verify deterministic mapping for real lesson IDs (1, 2, 3, 4, 6, 7, 8)
    const realLessonIds = [1, 2, 3, 4, 6, 7, 8];
    for (const lId of realLessonIds) {
      expect(LESSON_SCENARIO_MAPPING[lId]).toBeDefined();
      expect(LESSON_SCENARIO_MAPPING[lId].scenarioId).toBeGreaterThanOrEqual(1);
      expect(LESSON_SCENARIO_MAPPING[lId].scenarioId).toBeLessThanOrEqual(7);
    }
  });

  it("2 & 3. verifies every scenario has exactly 2 steps and 3 options per step (42 options total)", async () => {
    expect(SEVEN_SCENARIOS.length).toBe(7);

    let totalOptionsCount = 0;
    for (const sc of SEVEN_SCENARIOS) {
      expect(sc.steps.length).toBe(2);
      for (const st of sc.steps) {
        expect(st.options.length).toBe(3);
        totalOptionsCount += st.options.length;
      }
    }
    expect(totalOptionsCount).toBe(42);
  });

  // ---------------------------------------------------------------------------
  // 4: Zero Answer Leakage
  // ---------------------------------------------------------------------------
  it("4. strictly ensures zero answer and risk leakage before submit", async () => {
    const realLessonIds = [1, 2, 3, 4, 6, 7, 8];

    for (const lId of realLessonIds) {
      const scenario = await callerGuest.scenario.getByLessonId({ lessonId: lId });
      expect(scenario).toBeDefined();
      expect(scenario.steps.length).toBe(2);

      for (const st of scenario.steps) {
        // Step level check
        expect((st as any).isCorrect).toBeUndefined();

        for (const opt of st.options) {
          // Option level check: ONLY public metadata allowed
          expect((opt as any).isCorrect).toBeUndefined();
          expect((opt as any).riskScoreDelta).toBeUndefined();
          expect((opt as any).feedbackAr).toBeUndefined();
          expect((opt as any).nextStepNumber).toBeUndefined();

          expect(typeof opt.id).toBe("number");
          expect(typeof opt.labelAr).toBe("string");
          expect(typeof opt.actionType).toBe("string");
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 5: Path A across all 7 scenarios (Step 1 safe -> 100% -> passed=true)
  // ---------------------------------------------------------------------------
  it("5. Path A: Step 1 safe decision terminates with 100% score, 0 risk, and passed=true", async () => {
    for (const sc of SEVEN_SCENARIOS) {
      const s1 = sc.steps.find((s) => s.stepNumber === 1)!;
      const safeOpt = s1.options.find((o) => o.isCorrect)!;

      const res = await callerStudent.scenario.decide({
        scenarioId: sc.id,
        stepNumber: 1,
        optionId: safeOpt.id,
      });

      expect(res.isCorrect).toBe(true);
      expect(res.riskScoreDelta).toBe(0);
      expect(res.isFinished).toBe(true);
      expect(res.finalSummary).toBeDefined();
      expect(res.finalSummary?.scorePercentage).toBe(100);
      expect(res.finalSummary?.totalRiskDelta).toBe(0);
      expect(res.finalSummary?.passed).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // 6: Path B across all 7 scenarios (Step 1 wrong -> Step 2 safe -> 50% -> passed=false)
  // ---------------------------------------------------------------------------
  it("6. Path B: Step 1 wrong -> Step 2 safe terminates with 50% score and passed=false", async () => {
    for (const sc of SEVEN_SCENARIOS) {
      const s1 = sc.steps.find((s) => s.stepNumber === 1)!;
      const s2 = sc.steps.find((s) => s.stepNumber === 2)!;

      const wrongOpt1 = s1.options.find((o) => !o.isCorrect && o.nextStepNumber === 2)!;
      const safeOpt2 = s2.options.find((o) => o.isCorrect)!;

      // Step 1 call
      const res1 = await callerStudent.scenario.decide({
        scenarioId: sc.id,
        stepNumber: 1,
        optionId: wrongOpt1.id,
      });
      expect(res1.isCorrect).toBe(false);
      expect(res1.isFinished).toBe(false);
      expect(res1.nextStepNumber).toBe(2);

      // Step 2 call
      const res2 = await callerStudent.scenario.decide({
        scenarioId: sc.id,
        stepNumber: 2,
        optionId: safeOpt2.id,
        previousResponses: [{ stepNumber: 1, optionId: wrongOpt1.id }],
      });

      expect(res2.isCorrect).toBe(true);
      expect(res2.isFinished).toBe(true);
      expect(res2.finalSummary?.scorePercentage).toBe(50);
      expect(res2.finalSummary?.passed).toBe(false);
      expect(res2.finalSummary?.totalRiskDelta).toBeGreaterThan(0);
    }
  });

  // ---------------------------------------------------------------------------
  // 7: Path C across all 7 scenarios (Step 1 wrong -> Step 2 wrong -> 0% -> passed=false)
  // ---------------------------------------------------------------------------
  it("7. Path C: Step 1 wrong -> Step 2 wrong terminates with 0% score and passed=false", async () => {
    for (const sc of SEVEN_SCENARIOS) {
      const s1 = sc.steps.find((s) => s.stepNumber === 1)!;
      const s2 = sc.steps.find((s) => s.stepNumber === 2)!;

      const wrongOpt1 = s1.options.find((o) => !o.isCorrect && o.nextStepNumber === 2)!;
      const wrongOpt2 = s2.options.find((o) => !o.isCorrect)!;

      const res = await callerStudent.scenario.decide({
        scenarioId: sc.id,
        stepNumber: 2,
        optionId: wrongOpt2.id,
        previousResponses: [{ stepNumber: 1, optionId: wrongOpt1.id }],
      });

      expect(res.isCorrect).toBe(false);
      expect(res.isFinished).toBe(true);
      expect(res.finalSummary?.scorePercentage).toBe(0);
      expect(res.finalSummary?.passed).toBe(false);
      expect(res.finalSummary?.totalRiskDelta).toBeGreaterThan(wrongOpt1.riskScoreDelta);
    }
  });

  // ---------------------------------------------------------------------------
  // 8: Server-Side Grading Authority
  // ---------------------------------------------------------------------------
  it("8. enforces strict server-side grading authority (ignores client attempts to alter scores)", async () => {
    const s1 = SEVEN_SCENARIOS[0].steps[0];
    const wrongOpt = s1.options.find((o) => !o.isCorrect)!;

    const res = await callerStudent.scenario.decide({
      scenarioId: 1,
      stepNumber: 1,
      optionId: wrongOpt.id,
      ...({ scorePercentage: 100, passed: true, totalRiskDelta: 0 } as any),
    });

    // Server evaluates strictly according to definitions
    expect(res.isCorrect).toBe(false);
    expect(res.riskScoreDelta).toBe(wrongOpt.riskScoreDelta);
    expect(res.nextStepNumber).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // 9: Anti-Tampering: Forged / Illegal previousResponses
  // ---------------------------------------------------------------------------
  it("9. anti-tampering: rejects forged previousResponses or transitions not permitted by step 1", async () => {
    // Case 9a: Providing previous responses for Step 1
    await expect(
      callerStudent.scenario.decide({
        scenarioId: 1,
        stepNumber: 1,
        optionId: 101,
        previousResponses: [{ stepNumber: 1, optionId: 101 }],
      })
    ).rejects.toThrow();

    // Case 9b: Calling Step 2 without any previous responses
    await expect(
      callerStudent.scenario.decide({
        scenarioId: 1,
        stepNumber: 2,
        optionId: 105,
      })
    ).rejects.toThrow();

    // Case 9c: Calling Step 2 with out-of-order stepNumber in previousResponses
    await expect(
      callerStudent.scenario.decide({
        scenarioId: 1,
        stepNumber: 2,
        optionId: 105,
        previousResponses: [{ stepNumber: 2, optionId: 101 }],
      })
    ).rejects.toThrow();

    // Case 9d: Transitioning to Step 2 after a safe terminal Step 1 choice (Option 102 has nextStepNumber: null)
    await expect(
      callerStudent.scenario.decide({
        scenarioId: 1,
        stepNumber: 2,
        optionId: 105,
        previousResponses: [{ stepNumber: 1, optionId: 102 }],
      })
    ).rejects.toThrow();
  });

  // ---------------------------------------------------------------------------
  // 10: Cross-Scenario Option Injection
  // ---------------------------------------------------------------------------
  it("10. anti-tampering: rejects option belonging to another scenario", async () => {
    // Scenario 1 with option 201 (which belongs to Scenario 2)
    await expect(
      callerStudent.scenario.decide({
        scenarioId: 1,
        stepNumber: 1,
        optionId: 201,
      })
    ).rejects.toThrow();
  });

  // ---------------------------------------------------------------------------
  // 11: Cross-Step Option Injection
  // ---------------------------------------------------------------------------
  it("11. anti-tampering: rejects option belonging to another step in the same scenario", async () => {
    // Step 1 with option 105 (which belongs to Step 2 of Scenario 1)
    await expect(
      callerStudent.scenario.decide({
        scenarioId: 1,
        stepNumber: 1,
        optionId: 105,
      })
    ).rejects.toThrow();
  });

  // ---------------------------------------------------------------------------
  // 12: Invalid Step Number
  // ---------------------------------------------------------------------------
  it("12. anti-tampering: rejects invalid step number (step 0, step 3, etc.)", async () => {
    await expect(
      callerStudent.scenario.decide({
        scenarioId: 1,
        stepNumber: 0 as any,
        optionId: 101,
      })
    ).rejects.toThrow();

    await expect(
      callerStudent.scenario.decide({
        scenarioId: 1,
        stepNumber: 3,
        optionId: 101,
      })
    ).rejects.toThrow();
  });

  // ---------------------------------------------------------------------------
  // 13: Unauthenticated Submit
  // ---------------------------------------------------------------------------
  it("13. rejects unauthenticated decisions with UNAUTHORIZED", async () => {
    await expect(
      callerGuest.scenario.decide({
        scenarioId: 1,
        stepNumber: 1,
        optionId: 102,
      })
    ).rejects.toThrow();
  });

  // ---------------------------------------------------------------------------
  // 14: Invalid / Unpublished Scenario
  // ---------------------------------------------------------------------------
  it("14. returns NOT_FOUND for invalid or unpublished scenario IDs and lesson IDs", async () => {
    // Unknown lesson ID (999)
    await expect(
      callerGuest.scenario.getByLessonId({ lessonId: 999 })
    ).rejects.toThrow();

    // Deleted lesson ID (5)
    await expect(
      callerGuest.scenario.getByLessonId({ lessonId: 5 })
    ).rejects.toThrow();

    // Unknown scenario ID in decide
    await expect(
      callerStudent.scenario.decide({
        scenarioId: 999,
        stepNumber: 1,
        optionId: 101,
      })
    ).rejects.toThrow();
  });

  // ---------------------------------------------------------------------------
  // 15: Scenario Attempts Persistence
  // ---------------------------------------------------------------------------
  it("15. persists scenario attempt audit record in SQLite database", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const attemptsBefore = await db
      .select()
      .from(scenarioAttempts)
      .where(
        and(
          eq(scenarioAttempts.userId, testStudent.id),
          eq(scenarioAttempts.scenarioId, 1)
        )
      );

    // Submit a complete attempt
    await callerStudent.scenario.decide({
      scenarioId: 1,
      stepNumber: 1,
      optionId: 102,
    });

    const attemptsAfter = await db
      .select()
      .from(scenarioAttempts)
      .where(
        and(
          eq(scenarioAttempts.userId, testStudent.id),
          eq(scenarioAttempts.scenarioId, 1)
        )
      );

    expect(attemptsAfter.length).toBeGreaterThan(attemptsBefore.length);
    const lastAttempt = attemptsAfter[attemptsAfter.length - 1];
    expect(lastAttempt.passed).toBe(true);
    expect(lastAttempt.scorePercentage).toBe(100);
    expect(lastAttempt.totalRiskDelta).toBe(0);
    expect(lastAttempt.detailedResponsesJson).toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // 16 & 17: Weakness Creation & Deduplication
  // ---------------------------------------------------------------------------
  it("16 & 17. creates weakness on failed scenario and deduplicates unresolved weaknesses", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const sc4Title = SEVEN_SCENARIOS.find((s) => s.id === 4)!.titleAr;
    const weaknessDetail = `خطأ في قرار سيناريو: ${sc4Title}`;

    // First failed attempt: Path C (Step 1 wrong 402 -> Step 2 wrong 405)
    await callerStudent.scenario.decide({
      scenarioId: 4,
      stepNumber: 2,
      optionId: 405,
      previousResponses: [{ stepNumber: 1, optionId: 402 }],
    });

    const weaknessesFirst = await db
      .select()
      .from(weaknesses)
      .where(
        and(
          eq(weaknesses.userId, testStudent.id),
          eq(weaknesses.details, weaknessDetail),
          eq(weaknesses.resolved, false)
        )
      );
    expect(weaknessesFirst.length).toBe(1);
    expect(weaknessesFirst[0].category).toBe("attachments");

    // Second failed attempt: Path B (Step 1 wrong 402 -> Step 2 safe 404, score=50% -> passed=false)
    await callerStudent.scenario.decide({
      scenarioId: 4,
      stepNumber: 2,
      optionId: 404,
      previousResponses: [{ stepNumber: 1, optionId: 402 }],
    });

    const weaknessesSecond = await db
      .select()
      .from(weaknesses)
      .where(
        and(
          eq(weaknesses.userId, testStudent.id),
          eq(weaknesses.details, weaknessDetail),
          eq(weaknesses.resolved, false)
        )
      );

    // Strict deduplication: still exactly 1 unresolved weakness!
    expect(weaknessesSecond.length).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 18, 19, 20: Awareness Points (+5 on first pass only, initialScore immutable)
  // ---------------------------------------------------------------------------
  it("18, 19 & 20. awards +5 awareness points on first pass ONLY, prevents inflation on retake, and keeps initialScore strictly immutable", async () => {
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Create a fresh clean student for isolated points testing
    const isolatedEmail = `student_points_${Date.now()}@cybershield.sa`;
    const [freshStudent] = await db
      .insert(users)
      .values({
        name: "طالب قياس النقاط",
        email: isolatedEmail,
        passwordHash: "securePassPoints123#",
        role: "user",
        isActive: true,
      })
      .returning();

    const initialBaseline = 60;
    await db.insert(awarenessScores).values({
      userId: freshStudent.id,
      initialScore: initialBaseline,
      currentScore: initialBaseline,
      improvementDelta: 0,
    });

    const freshCaller = appRouter.createCaller({
      user: freshStudent,
      req: { protocol: "https", headers: {}, socket: { remoteAddress: "127.0.0.1" } } as any,
      res: { cookie: () => {}, clearCookie: () => {} } as any,
    });

    // 1. Take a failing attempt first (Path B: score=50%, passed=false)
    const failRes = await freshCaller.scenario.decide({
      scenarioId: 6,
      stepNumber: 2,
      optionId: 604,
      previousResponses: [{ stepNumber: 1, optionId: 602 }],
    });
    expect(failRes.finalSummary?.passed).toBe(false);

    // Verify score did not change
    let [scoreRow] = await db
      .select()
      .from(awarenessScores)
      .where(eq(awarenessScores.userId, freshStudent.id));
    expect(scoreRow.currentScore).toBe(initialBaseline);
    expect(scoreRow.initialScore).toBe(initialBaseline);

    // 2. First successful pass (Path A: score=100%, passed=true)
    const passRes1 = await freshCaller.scenario.decide({
      scenarioId: 6,
      stepNumber: 1,
      optionId: 601,
    });
    expect(passRes1.finalSummary?.passed).toBe(true);
    expect(passRes1.finalSummary?.isFirstPass).toBe(true);

    // Verify +5 points awarded
    [scoreRow] = await db
      .select()
      .from(awarenessScores)
      .where(eq(awarenessScores.userId, freshStudent.id));
    expect(scoreRow.currentScore).toBe(initialBaseline + 5);
    expect(scoreRow.initialScore).toBe(initialBaseline); // strictly immutable!
    expect(scoreRow.improvementDelta).toBe(5);

    // 3. Retake the same scenario with another pass (Path A again)
    const passRes2 = await freshCaller.scenario.decide({
      scenarioId: 6,
      stepNumber: 1,
      optionId: 601,
    });
    expect(passRes2.finalSummary?.passed).toBe(true);
    expect(passRes2.finalSummary?.isFirstPass).toBe(false); // not first pass!

    // Verify score remains unchanged (+0 additional points)
    [scoreRow] = await db
      .select()
      .from(awarenessScores)
      .where(eq(awarenessScores.userId, freshStudent.id));
    expect(scoreRow.currentScore).toBe(initialBaseline + 5);
    expect(scoreRow.initialScore).toBe(initialBaseline); // strictly immutable!
  });

  // ---------------------------------------------------------------------------
  // 21: totalRiskDelta Remains Independent from passed
  // ---------------------------------------------------------------------------
  it("21. ensures totalRiskDelta is independent from passed evaluation (passed is purely scorePercentage >= 70)", async () => {
    // Scenario 2: Path B has totalRiskDelta = +40 and scorePercentage = 50%
    const resB = await callerStudent.scenario.decide({
      scenarioId: 2,
      stepNumber: 2,
      optionId: 205,
      previousResponses: [{ stepNumber: 1, optionId: 201 }],
    });

    expect(resB.finalSummary?.scorePercentage).toBe(50);
    expect(resB.finalSummary?.passed).toBe(false);
    expect(resB.finalSummary?.totalRiskDelta).toBe(40);

    // Scenario 2: Path A has totalRiskDelta = 0 and scorePercentage = 100%
    const resA = await callerStudent.scenario.decide({
      scenarioId: 2,
      stepNumber: 1,
      optionId: 202,
    });

    expect(resA.finalSummary?.scorePercentage).toBe(100);
    expect(resA.finalSummary?.passed).toBe(true);
    expect(resA.finalSummary?.totalRiskDelta).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Scenario 5: Specific Gate Review 2 Verification
  // ---------------------------------------------------------------------------
  it("Scenario 5 Gate 2 Check: Option 501 finishes directly without forced branch", async () => {
    const res = await callerStudent.scenario.decide({
      scenarioId: 5,
      stepNumber: 1,
      optionId: 501,
    });

    expect(res.isFinished).toBe(true);
    expect(res.nextStepNumber).toBeNull();
    expect(res.riskScoreDelta).toBe(0);
    expect(res.finalSummary?.passed).toBe(true);
    expect(res.finalSummary?.scorePercentage).toBe(100);
  });

  // ---------------------------------------------------------------------------
  // scenario.getProgress
  // ---------------------------------------------------------------------------
  it("retrieves complete progress across all 7 scenarios for the authenticated user", async () => {
    const progress = await callerStudent.scenario.getProgress();
    expect(progress.length).toBe(7);

    for (const item of progress) {
      expect(typeof item.scenarioId).toBe("number");
      expect(typeof item.hasAttempted).toBe("boolean");
      expect(typeof item.passed).toBe("boolean");
      expect(typeof item.bestScore).toBe("number");
      expect(typeof item.attemptsCount).toBe("number");
    }
  });
});