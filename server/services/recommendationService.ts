import { eq, and, desc } from "drizzle-orm";
import { getDb } from "../db";
import { weaknesses, recommendations } from "../../drizzle/schema";

export type PersonalizedRecommendation = {
  id: number;
  titleAr: string;
  reasonAr: string;
  priority: "high" | "medium" | "low";
  type: "lesson" | "scenario" | "quiz";
  targetSlugOrId: string | number;
};

export interface UserWeaknessItem {
  id: number;
  userId: number;
  category: string;
  severity: string;
  detectedFrom: string;
  details: string | null;
  resolved: boolean;
  createdAt: Date;
}

/**
 * Get recorded weaknesses for a user with strict User Isolation.
 * By default (or when includeResolved = false), returns unresolved weaknesses only.
 * When includeResolved = true, returns both unresolved and resolved weaknesses.
 */
export async function getUserWeaknesses(
  userId: number,
  options: { includeResolved?: boolean } = {}
): Promise<UserWeaknessItem[]> {
  const db = await getDb();
  if (!db) return [];

  const { includeResolved = false } = options;

  try {
    const list = await db
      .select()
      .from(weaknesses)
      .where(
        includeResolved
          ? eq(weaknesses.userId, userId)
          : and(eq(weaknesses.userId, userId), eq(weaknesses.resolved, false))
      )
      .orderBy(desc(weaknesses.createdAt));

    return list.map((w) => ({
      id: w.id,
      userId: w.userId,
      category: w.category,
      severity: w.severity,
      detectedFrom: w.detectedFrom,
      details: w.details,
      resolved: w.resolved,
      createdAt: w.createdAt,
    }));
  } catch (err) {
    console.warn("[RecommendationService] Failed to get user weaknesses:", err);
    return [];
  }
}

/**
 * Mark a weakness as reviewed/resolved by the user.
 * STRICT USER ISOLATION: A user can only resolve their own weaknesses.
 *
 * NOTE: resolved=true represents user acknowledgment and deliberate review,
 * NOT scientific proof that the underlying knowledge gap is completely eliminated.
 */
export async function resolveWeakness(
  userId: number,
  weaknessId: number
): Promise<{ success: boolean; weakness: UserWeaknessItem | null }> {
  const db = await getDb();
  if (!db) return { success: false, weakness: null };

  try {
    // 1. Verify existence and strict user ownership
    const [existing] = await db
      .select()
      .from(weaknesses)
      .where(and(eq(weaknesses.id, weaknessId), eq(weaknesses.userId, userId)))
      .limit(1);

    if (!existing) {
      return { success: false, weakness: null };
    }

    // 2. Mark resolved = true
    await db
      .update(weaknesses)
      .set({ resolved: true })
      .where(and(eq(weaknesses.id, weaknessId), eq(weaknesses.userId, userId)));

    const updatedWeakness: UserWeaknessItem = {
      id: existing.id,
      userId: existing.userId,
      category: existing.category,
      severity: existing.severity,
      detectedFrom: existing.detectedFrom,
      details: existing.details,
      resolved: true,
      createdAt: existing.createdAt,
    };

    return { success: true, weakness: updatedWeakness };
  } catch (err) {
    console.warn("[RecommendationService] Failed to resolve weakness:", err);
    return { success: false, weakness: null };
  }
}

/**
 * Get personalized recommendations dynamically driven by active (unresolved) weaknesses.
 * When a weakness is marked resolved, it is excluded from driving new recommendations.
 */
export async function getUserPersonalizedRecommendations(
  userId: number
): Promise<PersonalizedRecommendation[]> {
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
    // Query active (unresolved) weaknesses only
    const userWeaknessList = await db
      .select()
      .from(weaknesses)
      .where(and(eq(weaknesses.userId, userId), eq(weaknesses.resolved, false)))
      .orderBy(desc(weaknesses.createdAt))
      .limit(10);

    const recs: PersonalizedRecommendation[] = [];
    const addedSlugs = new Set<string>();

    for (const w of userWeaknessList) {
      const cat = w.category.toLowerCase();

      if (cat.includes("phishing") && !addedSlugs.has("how-to-detect-phishing")) {
        addedSlugs.add("how-to-detect-phishing");
        recs.push({
          id: 101,
          titleAr: "كيف تكتشف رسائل التصيد والاحتيال؟",
          reasonAr: "بناءً على التحديات المسجلة: ينصح بمراجعة مؤشرات التصيد والضغط النفسي",
          priority: "high",
          type: "lesson",
          targetSlugOrId: "how-to-detect-phishing",
        });
      } else if (cat.includes("url") && !addedSlugs.has("safe-link-inspection")) {
        addedSlugs.add("safe-link-inspection");
        recs.push({
          id: 102,
          titleAr: "اقرأ الرابط قبل أن تنقر: التحليل التركيبي للروابط",
          reasonAr: "بناءً على التحديات المسجلة: موصى به لتقوية فحص النطاقات المستعارة ومكونات HTTPS",
          priority: "high",
          type: "lesson",
          targetSlugOrId: "safe-link-inspection",
        });
      } else if ((cat.includes("password") || cat.includes("mfa")) && !addedSlugs.has("account-protection-mfa")) {
        addedSlugs.add("account-protection-mfa");
        recs.push({
          id: 103,
          titleAr: "حماية الحسابات والمصادقة متعددة العوامل (MFA)",
          reasonAr: "توصية أمنية: تفعيل تطبيقات المصادقة وتوليد كلمات مرور فريدة",
          priority: "medium",
          type: "lesson",
          targetSlugOrId: "account-protection-mfa",
        });
      } else if ((cat.includes("malware") || cat.includes("attachment")) && !addedSlugs.has("attachments-malware-awareness")) {
        addedSlugs.add("attachments-malware-awareness");
        recs.push({
          id: 104,
          titleAr: "التعامل الآمن مع المرفقات والبرمجيات الخبيثة",
          reasonAr: "بناءً على التحديات المسجلة: تعزيز مهارات فحص الملفات المزدوجة وتعطيل الماكرو",
          priority: "medium",
          type: "lesson",
          targetSlugOrId: "attachments-malware-awareness",
        });
      } else if ((cat.includes("ransomware") || cat.includes("protection")) && !addedSlugs.has("data-protection-backup")) {
        addedSlugs.add("data-protection-backup");
        recs.push({
          id: 105,
          titleAr: "حماية البيانات والنسخ الاحتياطي ومكافحة برامج الفدية",
          reasonAr: "توصية هامة: إتقان استراتيجية النسخ الاحتياطي 3-2-1 وتشفير البيانات",
          priority: "medium",
          type: "lesson",
          targetSlugOrId: "data-protection-backup",
        });
      } else if ((cat.includes("wifi") || cat.includes("network")) && !addedSlugs.has("public-wifi-network-security")) {
        addedSlugs.add("public-wifi-network-security");
        recs.push({
          id: 106,
          titleAr: "الأمان في الشبكات العامة والواي فاي المجاني",
          reasonAr: "بناءً على التحديات المسجلة: الحماية من هجمات التوأم الشرير واستخدام الـ VPN",
          priority: "medium",
          type: "lesson",
          targetSlugOrId: "public-wifi-network-security",
        });
      } else if ((cat.includes("incident") || cat.includes("response")) && !addedSlugs.has("incident-reporting-response")) {
        addedSlugs.add("incident-reporting-response");
        recs.push({
          id: 107,
          titleAr: "إجراءات الاستجابة والإبلاغ عند التعرض لاختراق",
          reasonAr: "بناءً على التحديات المسجلة: تطبيق بروتوكول الساعة الذهبية والعزل السريع",
          priority: "high",
          type: "lesson",
          targetSlugOrId: "incident-reporting-response",
        });
      }
    }

    // If no active weaknesses or all weaknesses resolved: provide default reinforcement recommendations
    if (recs.length === 0) {
      recs.push({
        id: 1,
        titleAr: "كيف تكتشف رسائل التصيد والاحتيال؟",
        reasonAr: "خطوتك التدريبية الأساسية لتعزيز الحماية ضد أحدث أساليب الهندسة الاجتماعية",
        priority: "high",
        type: "lesson",
        targetSlugOrId: "how-to-detect-phishing",
      });
      recs.push({
        id: 2,
        titleAr: "اقرأ الرابط قبل أن تنقر: التحليل التركيبي للروابط",
        reasonAr: "صقل مهاراتك في التحليل البصري والتركيبي للنطاقات قبل النقر",
        priority: "medium",
        type: "lesson",
        targetSlugOrId: "safe-link-inspection",
      });
    }

    return recs;
  } catch (err) {
    console.warn("[RecommendationService] Failed to compute recommendations:", err);
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
