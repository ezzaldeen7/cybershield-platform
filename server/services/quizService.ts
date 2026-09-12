import { eq, and, sql } from "drizzle-orm";
import { getDb } from "../db";
import { quizzes, quizQuestions, quizAttempts, weaknesses } from "../../drizzle/schema";
export type QuizQuestion = typeof quizQuestions.$inferSelect;

export const DEFAULT_QUIZ_QUESTIONS = [
  {
    id: 1,
    quizId: 1,
    questionEn: "Urgent message requests verification code to avoid account suspension. What is safest action?",
    questionAr: "وصلتك رسالة عاجلة تطلب رمز التحقق بحجة إيقاف الحساب. ما التصرف الأكثر أمانًا؟",
    optionsJson: JSON.stringify([
      "إرسال الرمز بسرعة قبل إيقاف الحساب",
      "فتح الرابط من الرسالة للتحقق",
      "التواصل مع الجهة من قناة رسمية مستقلة",
      "إعادة إرسال الرسالة لزميل",
    ]),
    correctOptionIndex: 2,
    explanationAr: "الجهة الموثوقة لا تطلب رمز التحقق عبر رسالة غير متوقعة. استخدم موقعها أو رقمها الرسمي بشكل مستقل.",
    difficulty: "medium" as const,
    order: 1,
  },
  {
    id: 2,
    quizId: 1,
    questionEn: "What reveals the true domain in a URL?",
    questionAr: "ما الذي يكشف النطاق الحقيقي في الرابط؟",
    optionsJson: JSON.stringify([
      "الشعار الظاهر في الصفحة",
      "الجزء الأخير قبل أول شرطة مائلة في البنية الأساسية",
      "اسم النطاق المسجل المكتوب قبل امتداد (.com/.sa) مباشرة",
      "لون زر تسجيل الدخول",
    ]),
    correctOptionIndex: 2,
    explanationAr: "اقرأ اسم النطاق من اليمين إلى اليسار قبل أول شرطة مائلة فردية، ولا تكتفِ باسم الجهة أو الشعار الظاهر.",
    difficulty: "medium" as const,
    order: 2,
  },
  {
    id: 3,
    quizId: 1,
    questionEn: "Why shouldn't you reuse the same password?",
    questionAr: "لماذا لا ينبغي إعادة استخدام كلمة المرور نفسها في أكثر من موقع؟",
    optionsJson: JSON.stringify([
      "لأنها تصبح أقصر تلقائياً",
      "لأن تسربها من خدمة واحدة قد يفتح باقي حساباتك للمهاجمين",
      "لأنها تمنع المصادقة متعددة العوامل",
      "لأنها لا تعمل على الهواتف الذكية",
    ]),
    correctOptionIndex: 1,
    explanationAr: "كلمة المرور الفريدة تحد من أثر التسرب وتمنع انتقال المهاجم من حساب إلى آخر (Credential Stuffing).",
    difficulty: "medium" as const,
    order: 3,
  },
  {
    id: 4,
    quizId: 1,
    questionEn: "What does the safe analyzer do in this platform?",
    questionAr: "ماذا يفعل محلل الروابط الآمن في هذه المنصة؟",
    optionsJson: JSON.stringify([
      "يفتح الرابط ويتصفح الصفحة تلقائياً",
      "يرسل الرابط إلى سيرفر خارجي مجهول",
      "يفحص النص والبنية التركيبية دون زيارة الوجهة نهائياً",
      "يضمن أن الرابط آمن 100% بشكل قطعي",
    ]),
    correctOptionIndex: 2,
    explanationAr: "التحليل محلي وتعليمي عالي الأمان. يعرض مؤشرات البنية النصية ولا يصدر حكماً قطعيًا أو يفتح الرابط.",
    difficulty: "medium" as const,
    order: 4,
  },
];

export async function getQuizQuestionsList(quizId: number = 1) {
  const db = await getDb();
  if (!db) return DEFAULT_QUIZ_QUESTIONS;

  try {
    const list = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(quizQuestions.order);
    return list.length > 0 ? list : DEFAULT_QUIZ_QUESTIONS;
  } catch {
    return DEFAULT_QUIZ_QUESTIONS;
  }
}

export async function submitQuizAnswers(params: {
  userId: number;
  quizId: number;
  answers: Array<{ questionId: number; selectedOptionIndex: number }>;
}): Promise<{
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  passed: boolean;
  results: Array<{ questionId: number; isCorrect: boolean; explanationAr: string }>;
}> {
  const { userId, quizId, answers } = params;
  const questions = await getQuizQuestionsList(quizId);

  let correctCount = 0;
  const results: Array<{ questionId: number; isCorrect: boolean; explanationAr: string }> = [];

  for (const q of questions) {
    const userAns = answers.find((a) => a.questionId === q.id);
    const isCorrect = userAns ? userAns.selectedOptionIndex === q.correctOptionIndex : false;
    if (isCorrect) correctCount++;

    results.push({
      questionId: q.id,
      isCorrect,
      explanationAr: q.explanationAr || "تحقق من المفاهيم الأساسية للدرس",
    });

    // Record weakness if user failed question
    if (!isCorrect) {
      const db = await getDb();
      if (db) {
        try {
          await db.insert(weaknesses).values({
            userId,
            category: q.questionAr.includes("رابط") ? "urls" : q.questionAr.includes("كلمة") ? "passwords" : "phishing",
            severity: "medium",
            detectedFrom: "quiz",
            details: `خطأ في إجابة السؤال: ${q.questionAr.slice(0, 50)}...`,
          });
        } catch (err) {
          console.warn("[QuizService] Weakness recording fallback:", err);
        }
      }
    }
  }

  const totalQuestions = questions.length;
  const scorePercentage = Math.round((correctCount / Math.max(1, totalQuestions)) * 100);
  const passed = scorePercentage >= 70;

  const db = await getDb();
  if (db) {
    try {
      await db.insert(quizAttempts).values({
        userId,
        quizId,
        totalQuestions,
        correctAnswers: correctCount,
        scorePercentage,
        passed,
        answersJson: JSON.stringify(answers),
      });
    } catch (err) {
      console.warn("[QuizService] Attempt insertion fallback:", err);
    }
  }

  return {
    totalQuestions,
    correctAnswers: correctCount,
    scorePercentage,
    passed,
    results,
  };
}
