import { eq, and, sql, desc, asc } from "drizzle-orm";
import { getDb } from "../db";
import { lessons, lessonCategories, lessonTags, Lesson, InsertLesson } from "../../drizzle/schema";

/**
 * Fallback static categories for offline/degraded mode
 */
export const DEFAULT_CATEGORIES = [
  { id: 1, name: "Phishing & Social Engineering", nameAr: "التصيد والهندسة الاجتماعية", slug: "phishing", description: "اكتشاف وتجنب محاولات الخداع الرقمي والتصيد", createdAt: new Date() },
  { id: 2, name: "Safe Browsing & Link Analysis", nameAr: "التصفح الآمن وتحليل الروابط", slug: "safe-browsing", description: "فحص الروابط والنطاقات والمكونات التركيبية للمواقع", createdAt: new Date() },
  { id: 3, name: "Account & Password Security", nameAr: "حماية الحسابات وكلمات المرور", slug: "account-security", description: "كلمات المرور القوية والمصادقة متعددة العوامل MFA", createdAt: new Date() },
  { id: 4, name: "Attachments & Malware", nameAr: "المرفقات والبرمجيات الخبيثة", slug: "malware-attachments", description: "التعامل الآمن مع المرفقات والملفات المشبوهة", createdAt: new Date() },
];

/**
 * Fallback static lessons for offline/degraded mode
 */
export const DEFAULT_LESSONS: Lesson[] = [
  {
    id: 1,
    title: "How to Detect Phishing Messages",
    titleAr: "كيف تكتشف رسائل التصيد والاحتيال؟",
    slug: "how-to-detect-phishing",
    summary: "Learn to identify urgency, impersonation, and suspicious requests.",
    summaryAr: "تعلّم قراءة الرسائل بعيدًا عن الاستعجال والمظهر المقنع واكتشاف أساليب الضغط النفسي.",
    content: "Phishing emails often create artificial urgency, demand sensitive credentials, or threaten account suspension. Always verify the sender identity via an independent official channel before clicking any link or sharing information.",
    contentAr: "رسائل التصيد الاحتيالي تسعى دائمًا لخلق حالة استعجال مصطنعة أو تهديد بإيقاف الحساب لحث المستخدم على الانصياع السريع. القاعدة الأساسية: لا تستجب لأي طلب يتضمن رموز تحقق أو بيانات سرية، وتحقق من الجهة عبر موقعها أو رقمها الرسمي المستقل.",
    categoryId: 1,
    difficulty: "beginner",
    durationMinutes: 6,
    status: "published",
    learningObjectivesJson: JSON.stringify(["التعرف على مؤشرات الاستعجال والتهديد", "تمييز طلبات البيانات الحساسة", "التحقق عبر القنوات الرسمية المستقلة"]),
    order: 1,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    title: "Read Before You Click: Safe Link Inspection",
    titleAr: "اقرأ الرابط قبل أن تنقر: التحليل التركيبي للروابط",
    slug: "safe-link-inspection",
    summary: "Understand protocols, domain structures, and obfuscation techniques.",
    summaryAr: "افهم البروتوكول والنطاق الفعلي والرموز غير المعتادة التي قد تخفي الوجهة الحقيقية للرابط.",
    content: "Always check the domain name from right to left before the first single slash. Be careful with excessive subdomains, shorteners, IP addresses instead of domain names, and non-HTTPS protocols.",
    contentAr: "انظر دائمًا إلى اسم النطاق الفعلي المكتوب مباشرة قبل امتداد الموقع والشرطة المائلة الأولى. احذر من الروابط المختصرة، العناوين المعتمدة على IP مباشر، الكلمات البراقة المخدوعة، والبروتوكول غير المشفر HTTP.",
    categoryId: 2,
    difficulty: "beginner",
    durationMinutes: 5,
    status: "published",
    learningObjectivesJson: JSON.stringify(["قراءة النطاق الحقيقي للرابط", "اكتشاف الروابط المختصرة والنطاقات التمويهية", "استخدام التحليل التركيبي بدون مخاطرة"]),
    order: 2,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    title: "Account Protection & MFA Mastery",
    titleAr: "حماية الحسابات والمصادقة متعددة العوامل",
    slug: "account-protection-mfa",
    summary: "Implement unique strong passwords and multi-factor authentication.",
    summaryAr: "طبّق كلمات مرور فريدة وقوية وتفعيل المصادقة متعددة العوامل لضمان سلامة حساباتك.",
    content: "Never reuse the same password across multiple services. Enable MFA (TOTP / Authenticator Apps) so that even if a password leaks, attackers cannot bypass the second security factor.",
    contentAr: "إعادة استخدام كلمة المرور نفسها ينقل الخطر من خدمة لأخرى عند حدوث تسريب بيانات. تفعيل المصادقة متعددة العوامل (MFA) يضمن وجود طبقة دفاعية ثانية تمنع وصول المهاجمين حتى لو حصلوا على كلمة المرور.",
    categoryId: 3,
    difficulty: "intermediate",
    durationMinutes: 7,
    status: "published",
    learningObjectivesJson: JSON.stringify(["إنشاء كلمات مرور فريدة وقوية", "تفعيل تطبيقات المصادقة MFA", "الحذر من مشاركة رموز OTP"]),
    order: 3,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    title: "Attachments & Malware Awareness",
    titleAr: "المرفقات والبرمجيات الخبيثة",
    slug: "attachments-malware-awareness",
    summary: "Identify dangerous email attachments and executable macros.",
    summaryAr: "تعرّف على علامات المرفقات غير المتوقعة وكيفية تجنب تشغيل الملفات أو الماكرو الخبيث.",
    content: "Do not open unexpected file attachments, especially zip archives, executable files (.exe, .scr), or office documents asking to enable macros. Scan all downloads with reliable security tools.",
    contentAr: "تجنب فتح أي مرفقات غير متوقعة أو ملفات مضغوطة مجهولة المصدر. احذر من مستندات Office التي تطلب تفعيل الماكرو (Enable Macros) أو تشغيل سكريبتات، وأكّد مصدر الملف دائماً قبل الفتح.",
    categoryId: 4,
    difficulty: "intermediate",
    durationMinutes: 4,
    status: "published",
    learningObjectivesJson: JSON.stringify(["فحص امتداد المرفقات المشبوهة", "تعطيل الماكرو التلقائي في المستندات", "التحقق من هوية المرسل قبل الفتح"]),
    order: 4,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Generate slug from title
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Seed initial categories if empty
 */
export async function seedInitialCategories(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    const count = await db.select({ count: sql<number>`count(*)` }).from(lessonCategories);
    if (Number(count[0]?.count || 0) > 0) return;

    for (const cat of DEFAULT_CATEGORIES) {
      await db.insert(lessonCategories).values({
        name: cat.name,
        nameAr: cat.nameAr,
        slug: cat.slug,
        description: cat.description,
      });
    }
  } catch (error) {
    console.warn("[CMS] Category seed skipped or db unavailable");
  }
}

/**
 * Seed initial lessons if empty
 */
export async function seedInitialLessons(adminUserId?: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await seedInitialCategories();

    const count = await db.select({ count: sql<number>`count(*)` }).from(lessons);
    if (Number(count[0]?.count || 0) > 0) return;

    for (const item of DEFAULT_LESSONS) {
      await db.insert(lessons).values({
        title: item.title,
        titleAr: item.titleAr,
        slug: item.slug,
        summary: item.summary,
        summaryAr: item.summaryAr,
        content: item.content,
        contentAr: item.contentAr,
        categoryId: item.categoryId,
        difficulty: item.difficulty,
        durationMinutes: item.durationMinutes,
        status: item.status,
        learningObjectivesJson: item.learningObjectivesJson,
        order: item.order,
        createdBy: adminUserId || null,
      });
    }
  } catch (error) {
    console.warn("[CMS] Lesson seed skipped or db unavailable");
  }
}

/**
 * Get all categories
 */
export async function getCategories() {
  const db = await getDb();
  if (!db) return DEFAULT_CATEGORIES;

  try {
    await seedInitialCategories();
    const result = await db.select().from(lessonCategories).orderBy(asc(lessonCategories.nameAr));
    return result.length > 0 ? result : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

/**
 * List lessons with filtering, search, and pagination
 */
export async function listLessons(params: {
  userRole?: string;
  categoryId?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  status?: "draft" | "published" | "archived";
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 10));
  const offset = (page - 1) * limit;

  const db = await getDb();
  if (!db) {
    let filtered = DEFAULT_LESSONS;
    if (!params.userRole || (params.userRole !== "instructor" && params.userRole !== "admin")) {
      filtered = filtered.filter((l) => l.status === "published");
    } else if (params.status) {
      filtered = filtered.filter((l) => l.status === params.status);
    }
    if (params.categoryId) {
      filtered = filtered.filter((l) => l.categoryId === params.categoryId);
    }
    if (params.difficulty) {
      filtered = filtered.filter((l) => l.difficulty === params.difficulty);
    }
    if (params.search && params.search.trim()) {
      const term = params.search.trim().toLowerCase();
      filtered = filtered.filter((l) => l.titleAr.toLowerCase().includes(term) || l.title.toLowerCase().includes(term));
    }
    const total = filtered.length;
    const items = filtered.slice(offset, offset + limit);
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  try {
    await seedInitialLessons();

    const conditions: any[] = [];

    // Security Filter: Regular users ONLY see published lessons!
    if (!params.userRole || (params.userRole !== "instructor" && params.userRole !== "admin")) {
      conditions.push(eq(lessons.status, "published"));
    } else if (params.status) {
      conditions.push(eq(lessons.status, params.status));
    }

    if (params.categoryId) {
      conditions.push(eq(lessons.categoryId, params.categoryId));
    }

    if (params.difficulty) {
      conditions.push(eq(lessons.difficulty, params.difficulty));
    }

    if (params.search && params.search.trim()) {
      const term = `%${params.search.trim()}%`;
      conditions.push(sql`(${lessons.titleAr} LIKE ${term} OR ${lessons.title} LIKE ${term} OR ${lessons.summaryAr} LIKE ${term})`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const countResult = await db.select({ count: sql<number>`count(*)` }).from(lessons).where(whereClause);
    const total = Number(countResult[0]?.count || 0);

    const items = await db
      .select()
      .from(lessons)
      .where(whereClause)
      .orderBy(asc(lessons.order), desc(lessons.createdAt))
      .limit(limit)
      .offset(offset);

    if (items.length === 0 && !params.search && !params.categoryId && !params.difficulty) {
      const filtered = DEFAULT_LESSONS.filter((l) => l.status === "published");
      return { items: filtered, total: filtered.length, page: 1, totalPages: 1 };
    }

    return {
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    const filtered = DEFAULT_LESSONS.filter((l) => l.status === "published");
    return { items: filtered, total: filtered.length, page: 1, totalPages: 1 };
  }
}

/**
 * Get lesson details by ID or Slug
 */
export async function getLessonByIdOrSlug(identifier: string | number, userRole?: string): Promise<Lesson | null> {
  const db = await getDb();
  if (!db) {
    const found = DEFAULT_LESSONS.find((l) => l.id === Number(identifier) || l.slug === String(identifier));
    if (!found) return null;
    if (found.status !== "published" && userRole !== "instructor" && userRole !== "admin") return null;
    return found;
  }

  try {
    let lesson: Lesson | undefined;
    if (typeof identifier === "number" || !isNaN(Number(identifier))) {
      const res = await db.select().from(lessons).where(eq(lessons.id, Number(identifier))).limit(1);
      lesson = res[0];
    } else {
      const res = await db.select().from(lessons).where(eq(lessons.slug, identifier)).limit(1);
      lesson = res[0];
    }

    if (!lesson) {
      const fallback = DEFAULT_LESSONS.find((l) => l.id === Number(identifier) || l.slug === String(identifier));
      if (!fallback) return null;
      if (fallback.status !== "published" && userRole !== "instructor" && userRole !== "admin") return null;
      return fallback;
    }

    // Authorization check: if draft/archived, require instructor/admin
    if (lesson.status !== "published" && userRole !== "instructor" && userRole !== "admin") {
      return null;
    }

    return lesson;
  } catch {
    const fallback = DEFAULT_LESSONS.find((l) => l.id === Number(identifier) || l.slug === String(identifier));
    if (!fallback) return null;
    if (fallback.status !== "published" && userRole !== "instructor" && userRole !== "admin") return null;
    return fallback;
  }
}

/**
 * Create a new lesson (Instructor/Admin)
 */
export async function createLesson(params: {
  title: string;
  titleAr: string;
  summary?: string;
  summaryAr?: string;
  content: string;
  contentAr: string;
  categoryId?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  durationMinutes?: number;
  status?: "draft" | "published" | "archived";
  learningObjectives?: string[];
  tags?: string[];
  createdBy: number;
}): Promise<Lesson> {
  const baseSlug = slugify(params.title || params.titleAr);
  let slug = baseSlug || `lesson-${Date.now()}`;

  const insertData: InsertLesson = {
    title: params.title.trim(),
    titleAr: params.titleAr.trim(),
    slug,
    summary: params.summary?.trim() || null,
    summaryAr: params.summaryAr?.trim() || null,
    content: params.content.trim(),
    contentAr: params.contentAr.trim(),
    categoryId: params.categoryId || null,
    difficulty: params.difficulty || "beginner",
    durationMinutes: params.durationMinutes || 5,
    status: params.status || "published",
    learningObjectivesJson: params.learningObjectives ? JSON.stringify(params.learningObjectives) : null,
    createdBy: params.createdBy,
  };

  const db = await getDb();
  if (!db) {
    const created: Lesson = {
      ...insertData,
      id: DEFAULT_LESSONS.length + 10,
      summary: insertData.summary || null,
      summaryAr: insertData.summaryAr || null,
      categoryId: insertData.categoryId || null,
      difficulty: insertData.difficulty || "beginner",
      durationMinutes: insertData.durationMinutes || 5,
      status: insertData.status || "published",
      learningObjectivesJson: insertData.learningObjectivesJson || null,
      order: 99,
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return created;
  }

  try {
    const existing = await db.select().from(lessons).where(eq(lessons.slug, slug)).limit(1);
    if (existing.length > 0) {
      slug = `${slug}-${Date.now()}`;
      insertData.slug = slug;
    }

    await db.insert(lessons).values(insertData);

    const createdList = await db.select().from(lessons).where(eq(lessons.slug, slug)).limit(1);
    const createdLesson = createdList[0];

    if (params.tags && params.tags.length > 0) {
      for (const tag of params.tags) {
        if (tag.trim()) {
          await db.insert(lessonTags).values({
            lessonId: createdLesson.id,
            tag: tag.trim().toLowerCase(),
          });
        }
      }
    }

    return createdLesson;
  } catch (error) {
    const created: Lesson = {
      ...insertData,
      id: DEFAULT_LESSONS.length + 10,
      summary: insertData.summary || null,
      summaryAr: insertData.summaryAr || null,
      categoryId: insertData.categoryId || null,
      difficulty: insertData.difficulty || "beginner",
      durationMinutes: insertData.durationMinutes || 5,
      status: insertData.status || "published",
      learningObjectivesJson: insertData.learningObjectivesJson || null,
      order: 99,
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return created;
  }
}

/**
 * Update existing lesson (Instructor/Admin)
 */
export async function updateLesson(
  id: number,
  params: Partial<{
    title: string;
    titleAr: string;
    summary: string;
    summaryAr: string;
    content: string;
    contentAr: string;
    categoryId: number;
    difficulty: "beginner" | "intermediate" | "advanced";
    durationMinutes: number;
    status: "draft" | "published" | "archived";
    learningObjectives: string[];
  }>
): Promise<Lesson> {
  const db = await getDb();
  if (!db) {
    const existing = DEFAULT_LESSONS.find((l) => l.id === id);
    if (!existing) throw new Error("الدرس غير موجود");
    const updated = { ...existing, ...params } as Lesson;
    return updated;
  }

  const existingList = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  if (existingList.length === 0) throw new Error("الدرس غير موجود");

  const updateSet: Record<string, any> = {};

  if (params.title !== undefined) updateSet.title = params.title.trim();
  if (params.titleAr !== undefined) updateSet.titleAr = params.titleAr.trim();
  if (params.summary !== undefined) updateSet.summary = params.summary.trim();
  if (params.summaryAr !== undefined) updateSet.summaryAr = params.summaryAr.trim();
  if (params.content !== undefined) updateSet.content = params.content.trim();
  if (params.contentAr !== undefined) updateSet.contentAr = params.contentAr.trim();
  if (params.categoryId !== undefined) updateSet.categoryId = params.categoryId;
  if (params.difficulty !== undefined) updateSet.difficulty = params.difficulty;
  if (params.durationMinutes !== undefined) updateSet.durationMinutes = params.durationMinutes;
  if (params.status !== undefined) updateSet.status = params.status;
  if (params.learningObjectives !== undefined) updateSet.learningObjectivesJson = JSON.stringify(params.learningObjectives);

  await db.update(lessons).set(updateSet).where(eq(lessons.id, id));

  const updatedList = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
  return updatedList[0];
}

/**
 * Delete / Archive lesson
 */
export async function deleteLesson(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return true;

  try {
    await db.update(lessons).set({ status: "archived" }).where(eq(lessons.id, id));
    return true;
  } catch {
    return false;
  }
}
