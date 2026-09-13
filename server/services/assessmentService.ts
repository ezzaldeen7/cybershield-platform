import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import {
  awarenessScores,
  assessmentAttempts,
  weaknesses,
  userProgress,
  quizAttempts,
  scenarioAttempts,
} from "../../drizzle/schema";

export const INITIAL_ASSESSMENT_QUESTIONS = [
  {
    id: 1,
    category: "phishing",
    questionAr: "وصلتك رسالة تدعي أنها من المصرف ومحتواها حثك على النقر لإلغاء غرامة. ما انطباعك الأولي؟",
    optionsJson: JSON.stringify([
      "رسالة موثوقة لأنها تذكر اسم المصرف",
      "رسالة مشبوهة تستخدم الاستعجال والضغط للتحايل",
      "رسالة رسمية يجب تنفيذ ما فيها فوراً",
    ]),
    correctOptionIndex: 1,
    explanationAr: "استخدام الضغط واستعراض الغرامات من أهم مؤشرات التصيد الاحتيالي.",
  },
  {
    id: 2,
    category: "urls",
    questionAr: "أي من العناوين التالية يعتبر نطاقاً رسمياً صحيحاً لمنصة حكومية سعودية؟",
    optionsJson: JSON.stringify([
      "http://mygov-portal-sa.com/login",
      "https://portal.mygov.gov.sa/services",
      "http://192.168.1.1/mygov",
    ]),
    correctOptionIndex: 1,
    explanationAr: "النطاقات الرسمية الحكومية تنتهي عادة بـ .gov.sa وتستخدم اتصالات مشفرة HTTPS.",
  },
  {
    id: 3,
    category: "passwords",
    questionAr: "ما هو الخيار الأكثر أماناً لإدارة كلمات المرور لـ 15 حساباً مختلفاً؟",
    optionsJson: JSON.stringify([
      "حفظ كلمة مرور واحدة سهلة لجميع الحسابات",
      "استخدام كلمات مرور فريدة وقوية مع مدير كلمات مرور موثوق ومفعل بـ MFA",
      "كتابة كافة كلمات المرور في ملصق ورقي بجوار الشاشة",
    ]),
    correctOptionIndex: 1,
    explanationAr: "استخدام كلمات مرور فريدة يمنع تسرب باقي الحسابات عند حدوث تسريب في أحد المواقع.",
  },
];

export interface SanitizedAssessmentQuestion {
  id: number;
  category: string;
  questionAr: string;
  options: string[];
}

/**
 * Get assessment questions.
 * When sanitize is true (default), strips correctOptionIndex and explanationAr
 * to strictly ensure zero answer leakage before submission.
 */
export async function getAssessmentQuestions(
  type?: "initial" | "final",
  sanitize?: true
): Promise<SanitizedAssessmentQuestion[]>;
export async function getAssessmentQuestions(
  type: "initial" | "final",
  sanitize: false
): Promise<typeof INITIAL_ASSESSMENT_QUESTIONS>;
export async function getAssessmentQuestions(
  type: "initial" | "final" = "initial",
  sanitize: boolean = true
): Promise<SanitizedAssessmentQuestion[] | typeof INITIAL_ASSESSMENT_QUESTIONS> {
  if (sanitize) {
    return INITIAL_ASSESSMENT_QUESTIONS.map((q) => {
      let options: string[] = [];
      try {
        options = JSON.parse(q.optionsJson);
      } catch {
        options = [];
      }
      return {
        id: q.id,
        category: q.category,
        questionAr: q.questionAr,
        options,
      };
    });
  }
  return INITIAL_ASSESSMENT_QUESTIONS;
}

export const OFFICIAL_LESSON_IDS = [1, 2, 3, 4, 6, 7, 8] as const;
export const OFFICIAL_QUIZ_IDS = [1, 2, 3, 4, 5, 6, 7] as const;
export const OFFICIAL_SCENARIO_IDS = [1, 2, 3, 4, 5, 6, 7] as const;

export interface UserAssessmentStatus {
  hasCompletedPreAssessment: boolean;
  initialScore: number | null;
  preAssessmentScore: number | null;
  canTakePostAssessment: boolean;
  completedLessonsCount: number;
  passedQuizzesCount: number;
  passedScenariosCount: number;
  postAssessmentPrerequisites: {
    preAssessmentDone: boolean;
    completedLessonsCount: number; // Max 7 distinct official
    passedQuizzesCount: number;    // Max 7 distinct official
    passedScenariosCount: number;  // Max 7 distinct official
  };
  hasCompletedPostAssessment: boolean;
  finalScore: number | null;
  postAssessmentScore: number | null;
  improvementDelta: number;
}

/**
 * Get comprehensive assessment lifecycle status for a user.
 * Distinct entity counting ensures repeating the same quiz or scenario never inflates progress.
 */
export async function getUserAssessmentStatus(userId: number): Promise<UserAssessmentStatus> {
  const db = await getDb();
  if (!db) {
    return {
      hasCompletedPreAssessment: false,
      initialScore: null,
      preAssessmentScore: null,
      canTakePostAssessment: false,
      completedLessonsCount: 0,
      passedQuizzesCount: 0,
      passedScenariosCount: 0,
      postAssessmentPrerequisites: {
        preAssessmentDone: false,
        completedLessonsCount: 0,
        passedQuizzesCount: 0,
        passedScenariosCount: 0,
      },
      hasCompletedPostAssessment: false,
      finalScore: null,
      postAssessmentScore: null,
      improvementDelta: 0,
    };
  }

  // 1. Check Pre-Assessment attempts (Strictly attempt-based on assessmentType === 'pre', NOT score === 0)
  const preAttempts = await db
    .select()
    .from(assessmentAttempts)
    .where(
      and(
        eq(assessmentAttempts.userId, userId),
        eq(assessmentAttempts.assessmentType, "pre")
      )
    );

  const hasCompletedPreAssessment = preAttempts.length > 0;

  // 2. Check Awareness Score record
  const [scoreRow] = await db
    .select()
    .from(awarenessScores)
    .where(eq(awarenessScores.userId, userId))
    .limit(1);

  const initialScore = hasCompletedPreAssessment && scoreRow ? scoreRow.initialScore : null;
  const finalScore = scoreRow?.finalScore ?? null;
  const hasCompletedPostAssessment = finalScore !== null;
  const improvementDelta = scoreRow?.improvementDelta ?? 0;

  // 3. Check Distinct Prerequisites against Official Curriculum Lists (Intersection)
  // 3a. Distinct completed lessons intersected with OFFICIAL_LESSON_IDS (Target = 7)
  const completedLessons = await db
    .select({ lessonId: userProgress.lessonId })
    .from(userProgress)
    .where(and(eq(userProgress.userId, userId), eq(userProgress.status, "completed")));
  const completedLessonsSet = new Set(completedLessons.map((l) => l.lessonId));
  const completedLessonsCount = OFFICIAL_LESSON_IDS.filter((id) => completedLessonsSet.has(id)).length;

  // 3b. Distinct passed quizzes intersected with OFFICIAL_QUIZ_IDS (Target = 7)
  const passedQuizzes = await db
    .select({ quizId: quizAttempts.quizId })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.passed, true)));
  const passedQuizzesSet = new Set(passedQuizzes.map((q) => q.quizId));
  const passedQuizzesCount = OFFICIAL_QUIZ_IDS.filter((id) => passedQuizzesSet.has(id)).length;

  // 3c. Distinct passed scenarios intersected with OFFICIAL_SCENARIO_IDS (Target = 7)
  const passedScenarios = await db
    .select({ scenarioId: scenarioAttempts.scenarioId })
    .from(scenarioAttempts)
    .where(and(eq(scenarioAttempts.userId, userId), eq(scenarioAttempts.passed, true)));
  const passedScenariosSet = new Set(passedScenarios.map((s) => s.scenarioId));
  const passedScenariosCount = OFFICIAL_SCENARIO_IDS.filter((id) => passedScenariosSet.has(id)).length;

  // Gating condition: All 4 conditions must be met (all official items completed)
  const canTakePostAssessment =
    hasCompletedPreAssessment &&
    completedLessonsCount === OFFICIAL_LESSON_IDS.length &&
    passedQuizzesCount === OFFICIAL_QUIZ_IDS.length &&
    passedScenariosCount === OFFICIAL_SCENARIO_IDS.length;

  return {
    hasCompletedPreAssessment,
    initialScore,
    preAssessmentScore: initialScore,
    canTakePostAssessment,
    completedLessonsCount,
    passedQuizzesCount,
    passedScenariosCount,
    postAssessmentPrerequisites: {
      preAssessmentDone: hasCompletedPreAssessment,
      completedLessonsCount,
      passedQuizzesCount,
      passedScenariosCount,
    },
    hasCompletedPostAssessment,
    finalScore,
    postAssessmentScore: finalScore,
    improvementDelta,
  };
}

export interface AssessmentSubmissionResult {
  scorePercentage: number;
  initialScore: number;
  finalScore: number | null;
  improvementDelta: number;
  isFirstPreAssessment: boolean;
  results: Array<{
    questionId: number;
    questionAr: string;
    isCorrect: boolean;
    selectedOptionIndex: number;
    correctOptionIndex: number;
    explanationAr: string;
  }>;
}

/**
 * Submit assessment answers (pre or post).
 * - Pre-assessment sets and fixes initialScore on the first attempt only (immutable thereafter).
 * - Post-assessment records finalScore and calculates improvementDelta = finalScore - initialScore.
 * - Weaknesses are recorded for incorrect answers.
 */
export async function submitAssessment(params: {
  userId: number;
  type: "initial" | "final";
  answers: Array<{ questionId: number; selectedOptionIndex: number }>;
}): Promise<AssessmentSubmissionResult> {
  const { userId, type, answers } = params;
  const questions = INITIAL_ASSESSMENT_QUESTIONS;
  const db = await getDb();

  let correct = 0;
  const results: AssessmentSubmissionResult["results"] = [];

  for (const q of questions) {
    const userAns = answers.find((a) => a.questionId === q.id);
    const selectedOptionIndex = userAns !== undefined ? userAns.selectedOptionIndex : -1;
    const isCorrect = selectedOptionIndex === q.correctOptionIndex;

    if (isCorrect) {
      correct++;
    } else if (db) {
      // Record weakness for incorrect answer
      try {
        await db.insert(weaknesses).values({
          userId,
          category: q.category,
          severity: "high",
          detectedFrom: "assessment",
          details: `ضعف في تقييم الوعي: ${q.questionAr.slice(0, 40)}...`,
        });
      } catch (err) {
        console.warn("[AssessmentService] Weakness insertion fallback:", err);
      }
    }

    results.push({
      questionId: q.id,
      questionAr: q.questionAr,
      isCorrect,
      selectedOptionIndex,
      correctOptionIndex: q.correctOptionIndex,
      explanationAr: q.explanationAr,
    });
  }

  const scorePercentage = Math.round((correct / questions.length) * 100);

  let initialScore = scorePercentage;
  let finalScore: number | null = null;
  let improvementDelta = 0;
  let isFirstPreAssessment = false;

  if (db) {
    try {
      // Check existing pre-assessment attempts (Strictly assessmentType === 'pre')
      const existingPreAttempts = await db
        .select()
        .from(assessmentAttempts)
        .where(
          and(
            eq(assessmentAttempts.userId, userId),
            eq(assessmentAttempts.assessmentType, "pre")
          )
        );

      isFirstPreAssessment = existingPreAttempts.length === 0;

      const existingScoreRes = await db
        .select()
        .from(awarenessScores)
        .where(eq(awarenessScores.userId, userId))
        .limit(1);

      if (existingScoreRes.length > 0) {
        const record = existingScoreRes[0];

        if (type === "initial") {
          if (isFirstPreAssessment) {
            // First time completing Pre-assessment: establish baseline
            initialScore = scorePercentage;
            // If currentScore has not progressed yet, start it at initialScore
            const currentScore = record.currentScore === 0 ? initialScore : record.currentScore;
            improvementDelta = currentScore - initialScore;

            await db
              .update(awarenessScores)
              .set({ initialScore, currentScore, improvementDelta })
              .where(eq(awarenessScores.id, record.id));
          } else {
            // Re-take of Pre-Assessment: initialScore is STRICTLY IMMUTABLE!
            initialScore = record.initialScore;
            improvementDelta = record.currentScore - initialScore;
          }
        } else {
          // Post-Assessment (Final)
          initialScore = record.initialScore;
          finalScore = scorePercentage;
          improvementDelta = finalScore - initialScore;

          await db
            .update(awarenessScores)
            .set({ finalScore, currentScore: finalScore, improvementDelta })
            .where(eq(awarenessScores.id, record.id));
        }
      } else {
        // No prior awareness score record: create baseline
        await db.insert(awarenessScores).values({
          userId,
          initialScore: scorePercentage,
          currentScore: scorePercentage,
          improvementDelta: 0,
        });
      }

      // Record assessment attempt audit trail
      await db.insert(assessmentAttempts).values({
        userId,
        assessmentType: type === "initial" ? "pre" : "post",
        assessmentId: type === "initial" ? 1 : 2,
        scorePercentage,
        categoryScoresJson: JSON.stringify({ overall: scorePercentage }),
        answersJson: JSON.stringify(answers),
      });
    } catch (err) {
      console.warn("[AssessmentService] DB persistence warning:", err);
    }
  }

  return {
    scorePercentage,
    initialScore,
    finalScore,
    improvementDelta,
    isFirstPreAssessment,
    results,
  };
}
