import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { awarenessScores, assessmentAttempts, weaknesses } from "../../drizzle/schema";

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

export async function getAssessmentQuestions(type: "initial" | "final" = "initial") {
  return INITIAL_ASSESSMENT_QUESTIONS;
}

export async function submitAssessment(params: {
  userId: number;
  type: "initial" | "final";
  answers: Array<{ questionId: number; selectedOptionIndex: number }>;
}): Promise<{
  scorePercentage: number;
  initialScore: number;
  finalScore: number | null;
  improvementDelta: number;
}> {
  const { userId, type, answers } = params;
  const questions = INITIAL_ASSESSMENT_QUESTIONS;

  let correct = 0;
  for (const q of questions) {
    const userAns = answers.find((a) => a.questionId === q.id);
    if (userAns && userAns.selectedOptionIndex === q.correctOptionIndex) {
      correct++;
    } else {
      // Record weakness
      const db = await getDb();
      if (db) {
        try {
          await db.insert(weaknesses).values({
            userId,
            category: q.category,
            severity: "high",
            detectedFrom: "assessment",
            details: `ضعف في تقييم الوعي: ${q.questionAr.slice(0, 40)}...`,
          });
        } catch {}
      }
    }
  }

  const scorePercentage = Math.round((correct / questions.length) * 100);
  const db = await getDb();

  let initialScore = scorePercentage;
  let finalScore: number | null = null;
  let improvementDelta = 0;

  if (db) {
    try {
      const existingRes = await db.select().from(awarenessScores).where(eq(awarenessScores.userId, userId)).limit(1);
      if (existingRes.length > 0) {
        const record = existingRes[0];
        if (type === "initial") {
          initialScore = scorePercentage;
          improvementDelta = record.currentScore - initialScore;
          await db
            .update(awarenessScores)
            .set({ initialScore, currentScore: scorePercentage, improvementDelta })
            .where(eq(awarenessScores.id, record.id));
        } else {
          initialScore = record.initialScore;
          finalScore = scorePercentage;
          improvementDelta = finalScore - initialScore;
          await db
            .update(awarenessScores)
            .set({ finalScore, currentScore: finalScore, improvementDelta })
            .where(eq(awarenessScores.id, record.id));
        }
      } else {
        await db.insert(awarenessScores).values({
          userId,
          initialScore: scorePercentage,
          currentScore: scorePercentage,
          improvementDelta: 0,
        });
      }

      await db.insert(assessmentAttempts).values({
        userId,
        assessmentId: type === "initial" ? 1 : 2,
        scorePercentage,
        categoryScoresJson: JSON.stringify({ overall: scorePercentage }),
      });
    } catch (err) {
      console.warn("[AssessmentService] DB fallback:", err);
    }
  }

  return {
    scorePercentage,
    initialScore,
    finalScore,
    improvementDelta,
  };
}
