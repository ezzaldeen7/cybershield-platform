import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { weaknesses, recommendations } from "../../drizzle/schema";
import { DEFAULT_LESSONS } from "./contentService";

export type PersonalizedRecommendation = {
  id: number;
  titleAr: string;
  reasonAr: string;
  priority: "high" | "medium" | "low";
  type: "lesson" | "scenario" | "quiz";
  targetSlugOrId: string | number;
};

export async function getUserPersonalizedRecommendations(userId: number): Promise<PersonalizedRecommendation[]> {
  const db = await getDb();
  if (!db) {
    return [
      {
        id: 1,
        titleAr: "كيف تكتشف رسائل التصيد والاحتيال؟",
        reasonAr: "موصى به لتطوير مهاراتك في التعرف على رسائل الضغط والاستعجال",
        priority: "high",
        type: "lesson",
        targetSlugOrId: "how-to-detect-phishing",
      },
      {
        id: 2,
        titleAr: "اقرأ الرابط قبل أن تنقر",
        reasonAr: "موصى به لتعزيز مهارات التحليل التركيبي للنطاقات المشبوهة",
        priority: "medium",
        type: "lesson",
        targetSlugOrId: "safe-link-inspection",
      },
    ];
  }

  try {
    const userWeaknessList = await db
      .select()
      .from(weaknesses)
      .where(and(eq(weaknesses.userId, userId), eq(weaknesses.resolved, false)))
      .limit(5);

    const recs: PersonalizedRecommendation[] = [];

    if (userWeaknessList.some((w) => w.category === "phishing")) {
      recs.push({
        id: 101,
        titleAr: "كيف تكتشف رسائل التصيد والاحتيال؟",
        reasonAr: "بناءً على نتائج التقييم: ينصح بمراجعة درس التصيد والهندسة الاجتماعية لترسيخ المفاهيم",
        priority: "high",
        type: "lesson",
        targetSlugOrId: "how-to-detect-phishing",
      });
    }

    if (userWeaknessList.some((w) => w.category === "urls")) {
      recs.push({
        id: 102,
        titleAr: "اقرأ الرابط قبل أن تنقر: التحليل التركيبي للروابط",
        reasonAr: "بناءً على أداء الاختبار: موصى به لتقوية فحص النطاقات المستعارة ومكونات HTTPS",
        priority: "high",
        type: "lesson",
        targetSlugOrId: "safe-link-inspection",
      });
    }

    if (userWeaknessList.some((w) => w.category === "passwords")) {
      recs.push({
        id: 103,
        titleAr: "حماية الحسابات والمصادقة متعددة العوامل",
        reasonAr: "توصية أمنية: تفعيل MFA وإنشاء كلمات مرور فريدة لحماية كافة خدماتك",
        priority: "medium",
        type: "lesson",
        targetSlugOrId: "account-protection-mfa",
      });
    }

    if (recs.length === 0) {
      recs.push({
        id: 1,
        titleAr: "كيف تكتشف رسائل التصيد والاحتيال؟",
        reasonAr: "خطوتك التدريبية الأولى الموصى بها في المسار",
        priority: "high",
        type: "lesson",
        targetSlugOrId: "how-to-detect-phishing",
      });
    }

    return recs;
  } catch {
    return [
      {
        id: 1,
        titleAr: "كيف تكتشف رسائل التصيد والاحتيال؟",
        reasonAr: "موصى به لتطوير مهاراتك في التعرف على رسائل الضغط والاستعجال",
        priority: "high",
        type: "lesson",
        targetSlugOrId: "how-to-detect-phishing",
      },
    ];
  }
}
