import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { scenarios, scenarioSteps, scenarioOptions, scenarioAttempts, weaknesses } from "../../drizzle/schema";

export const DEFAULT_SCENARIOS = [
  {
    id: 1,
    title: "Suspicious Bank Suspension Message",
    titleAr: "رسالة إيقاف حساب بنكي مشبوهة",
    descriptionAr: "وصلتك رسالة قصيرة تنص على: 'سيتم إيقاف حسابك البنكي اليوم خلال ساعة واحدة. يرجى تأكيد البيانات فوراً عبر الرابط: http://secure-verify.bank-update.test'",
    threatType: "phishing_sms",
    difficulty: "beginner" as const,
    options: [
      {
        id: 101,
        labelAr: "النقر على الرابط وتأكيد البيانات بسرعة تجنباً للإيقاف",
        labelEn: "Click link and confirm credentials",
        actionType: "click",
        isCorrect: false,
        riskScoreDelta: 35,
        explanationAr: "خطأ عالي الخطر! الرسائل التي تهدد بالإيقاف الفوري عبر رابط غير رسمي هي أسلوب تصيد هجومي كلاسيكي لكشف بياناتك.",
        recommendedLessonId: 1,
      },
      {
        labelAr: "الإبلاغ عن الرسالة والتواصل مع البنك من الرقم الرسمي المطبوع خلف البطاقة",
        labelEn: "Report message and contact bank via official number",
        actionType: "report",
        isCorrect: true,
        riskScoreDelta: 0,
        explanationAr: "إجراء صحيح ومثالي! التواصل عبر الرقم المطبوع خلف بطاقتك هو الطريقة الآمنة الوحيدة للتحقق المستقل.",
        recommendedLessonId: 2,
      },
      {
        labelAr: "تجاهل الرسالة وحذفها بدون فتح الرابط",
        labelEn: "Ignore and delete message",
        actionType: "ignore",
        isCorrect: true,
        riskScoreDelta: 5,
        explanationAr: "تصرف آمن يمنع الخطر، ويفضل دائماً الإبلاغ عن المحاولة لتنبيه الجهات المعنية.",
        recommendedLessonId: 1,
      },
    ],
  },
  {
    id: 2,
    title: "Unexpected File Attachment from HR",
    titleAr: "مرفق غير متوقع يدعي أنه سيرة ذاتية أو فاتورة",
    descriptionAr: "وصلتك بريد إلكتروني من عنوان خارجي غير معروف يدعي صاحبه أنه مدير الموارد البشرية ويرفق ملفاً مضغوطاً باسم `Invoice_Urgent_2026.zip` يطلب منك فتحه وتفعيل الماكرو.",
    threatType: "malware_attachment",
    difficulty: "intermediate" as const,
    options: [
      {
        id: 201,
        labelAr: "تحميل الملف المضغوط وتفعيل وحدة الماكرو لرؤية الفاتورة",
        labelEn: "Download attachment and enable macro",
        actionType: "click",
        isCorrect: false,
        riskScoreDelta: 40,
        explanationAr: "خطر حرج للغاية! تفعيل الماكرو في مستندات من مصادر غير معروفة يؤدي إلى تشغيل برمجيات خبيثة وفدية تلقائياً.",
        recommendedLessonId: 4,
      },
      {
        id: 202,
        labelAr: "حذف البريد والإبلاغ لقسم أمن المعلومات في المنشأة",
        labelEn: "Report to security team",
        actionType: "report",
        isCorrect: true,
        riskScoreDelta: 0,
        explanationAr: "ممتاز جداً! المرفقات المفاجئة وخاصة الملفات المضغوطة أو التي تطلب ماكرو تجب عدم فتحها وإبلاغ الأمن السيبراني.",
        recommendedLessonId: 4,
      },
    ],
  },
];

export async function getScenariosList() {
  const db = await getDb();
  if (!db) return DEFAULT_SCENARIOS;

  try {
    const res = await db.select().from(scenarios).where(eq(scenarios.status, "published"));
    return res.length > 0 ? DEFAULT_SCENARIOS : DEFAULT_SCENARIOS;
  } catch {
    return DEFAULT_SCENARIOS;
  }
}

export async function submitScenarioDecision(params: {
  userId: number;
  scenarioId: number;
  optionIndex: number;
}): Promise<{
  isCorrect: boolean;
  riskScoreDelta: number;
  explanationAr: string;
  recommendedLessonId: number | null;
}> {
  const { userId, scenarioId, optionIndex } = params;
  const list = await getScenariosList();
  const scenario = list.find((s) => s.id === scenarioId) || list[0];
  const chosenOption = scenario.options[optionIndex] || scenario.options[0];

  const db = await getDb();
  if (db) {
    try {
      await db.insert(scenarioAttempts).values({
        userId,
        scenarioId,
        passed: chosenOption.isCorrect,
        finalAction: chosenOption.actionType,
        scorePercentage: chosenOption.isCorrect ? 100 : 0,
        feedbackSummary: chosenOption.explanationAr,
      });

      if (!chosenOption.isCorrect) {
        await db.insert(weaknesses).values({
          userId,
          category: scenario.threatType.includes("sms") ? "phishing" : "attachments",
          severity: "high",
          detectedFrom: "scenario",
          details: `خطأ في قرار السيناريو: ${scenario.titleAr}`,
        });
      }
    } catch (err) {
      console.warn("[ScenarioService] Attempt recording fallback:", err);
    }
  }

  return {
    isCorrect: chosenOption.isCorrect,
    riskScoreDelta: chosenOption.riskScoreDelta,
    explanationAr: chosenOption.explanationAr,
    recommendedLessonId: chosenOption.recommendedLessonId || 1,
  };
}
