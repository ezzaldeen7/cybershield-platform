import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { analyzeUrlStatic, analyzeMessageStatic } from "./services/analyzerService";
import { submitQuizAnswers } from "./services/quizService";
import { submitScenarioDecision } from "./services/scenarioService";
import { submitAssessment } from "./services/assessmentService";
import { getUserPersonalizedRecommendations } from "./services/recommendationService";

describe("Safe Static Risk Analyzers", () => {
  it("detects high risk indicators in suspicious URLs safely without network execution", async () => {
    const res = await analyzeUrlStatic("http://192.168.1.1/login-verify-account-bank-update@secure");
    expect(res.riskScore).toBeGreaterThanOrEqual(50);
    expect(["high", "critical"]).toContain(res.riskLevel);
    expect(res.findings.length).toBeGreaterThan(0);
    expect(res.findings.some((f) => f.titleAr.includes("HTTP"))).toBe(true);
    expect(res.findings.some((f) => f.titleAr.includes("IP"))).toBe(true);
  });

  it("detects social engineering & urgency indicators in suspicious messages", async () => {
    const res = await analyzeMessageStatic("عاجل فورًا: سيتم إيقاف حسابك اليوم. يرجى إرسال رمز التحقق OTP والفيزا لتجنب الغرامة.");
    expect(res.riskScore).toBeGreaterThanOrEqual(50);
    expect(res.riskLevel).toBe("high");
    expect(res.findings.some((f) => f.titleAr.includes("استعجال"))).toBe(true);
    expect(res.findings.some((f) => f.titleAr.includes("حساسة"))).toBe(true);
  });
});

describe("Quiz Engine & Grading", () => {
  it("grades quiz answers correctly and returns explanations", async () => {
    const res = await submitQuizAnswers({
      userId: 1,
      quizId: 1,
      answers: [
        { questionId: 1, selectedOptionIndex: 2 }, // Correct (index 2)
        { questionId: 2, selectedOptionIndex: 1 }, // Correct (index 1)
      ],
    });

    expect(res.totalQuestions).toBeGreaterThan(0);
    expect(res.correctAnswers).toBe(2);
    expect(res.results.length).toBeGreaterThan(0);
  });
});

describe("Interactive Scenarios", () => {
  it("evaluates correct decision in bank suspension scenario", async () => {
    const res = await submitScenarioDecision({
      userId: 1,
      scenarioId: 1,
      optionIndex: 1, // Report via official number
    });

    expect(res.isCorrect).toBe(true);
    expect(res.riskScoreDelta).toBe(0);
    expect(res.explanationAr).toContain("صحيح ومثالي");
  });

  it("evaluates wrong decision and assigns risk delta", async () => {
    const res = await submitScenarioDecision({
      userId: 1,
      scenarioId: 1,
      optionIndex: 0, // Click phishing link
    });

    expect(res.isCorrect).toBe(false);
    expect(res.riskScoreDelta).toBeGreaterThan(0);
  });
});

describe("Initial & Final Assessment Engine", () => {
  it("calculates initial awareness score and improvement delta", async () => {
    const res = await submitAssessment({
      userId: 1,
      type: "initial",
      answers: [
        { questionId: 1, selectedOptionIndex: 1 },
        { questionId: 2, selectedOptionIndex: 1 },
        { questionId: 3, selectedOptionIndex: 1 },
      ],
    });

    expect(res.scorePercentage).toBe(100);
    expect(res.initialScore).toBe(100);
  });
});

describe("Personalized Recommendation Engine", () => {
  it("generates prioritized learning recommendations for user", async () => {
    const recs = await getUserPersonalizedRecommendations(1);
    expect(Array.isArray(recs)).toBe(true);
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].type).toBe("lesson");
  });
});
