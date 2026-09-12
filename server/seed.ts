import { getDb } from "./db";
import { users, lessonCategories, lessons, quizzes, quizQuestions, scenarios, scenarioSteps, scenarioOptions, assessmentQuestions, awarenessScores } from "../drizzle/schema";
import { hashPassword } from "./services/authService";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function seedDatabase() {
  console.log("[Seed] Starting CyberShield database seeding...");
  const db = await getDb();
  if (!db) {
    console.error("[Seed] Error: Unable to connect to SQLite database.");
    process.exit(1);
  }

  // 1. Admin User Initialization
  const adminEmail = "admin@cybershield.sa";
  const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);

  if (existingAdmin.length === 0) {
    // Generate secure temporary password if not provided in environment
    const tempPassword = process.env.ADMIN_INITIAL_PASSWORD || crypto.randomBytes(8).toString("hex") + "#A1";
    const passwordHash = await hashPassword(tempPassword);

    await db.insert(users).values({
      email: adminEmail,
      name: "مدير النظام (Admin)",
      passwordHash,
      role: "admin",
      mustChangePassword: true,
      loginMethod: "local",
      isActive: true,
    });

    console.log("==========================================================");
    console.log("[Seed] ADMIN ACCOUNT INITIALIZED SUCCESSFULLY:");
    console.log(`[Seed] Email:    ${adminEmail}`);
    console.log(`[Seed] Temp Pass: ${tempPassword}`);
    console.log("[Seed] NOTE: Admin must change this password on first login!");
    console.log("==========================================================");
  } else {
    console.log(`[Seed] Admin account (${adminEmail}) already exists. Skipping.`);
  }

  // 2. Lesson Categories
  const categoriesData = [
    { name: "Phishing & Social Engineering", nameAr: "التصيد والهندسة الاجتماعية", slug: "phishing", description: "اكتشاف وتجنب محاولات التحايل وسرقة الهويات" },
    { name: "Safe Links & Domains", nameAr: "فحص الروابط والنطاقات", slug: "urls", description: "قراءة بنية الروابط وعزل مؤشرات الخطر" },
    { name: "Account Security & Passwords", nameAr: "أمان الحسابات وكلمات المرور", slug: "passwords", description: "المصادقة متعددة العوامل وإدارة الحسابات" },
    { name: "Data Protection & Devices", nameAr: "حماية الأجهزة والبيانات", slug: "protection", description: "النسخ الاحتياطي وحماية الأجهزة من البرمجيات الضارة" },
  ];

  for (const cat of categoriesData) {
    const exists = await db.select().from(lessonCategories).where(eq(lessonCategories.slug, cat.slug)).limit(1);
    if (exists.length === 0) {
      await db.insert(lessonCategories).values(cat);
    }
  }

  // 3. Educational Lessons
  const lessonsData = [
    {
      title: "How to Detect Phishing Messages",
      titleAr: "كيف تكتشف رسائل التصيد والاحتيال؟",
      slug: "how-to-detect-phishing",
      summaryAr: "تعلم قراءة الرسائل غير المعتادة وكشف أساليب الضغط والاستعجال وانتحال الهوية.",
      content: "Phishing content...",
      contentAr: "التصيد الإلكتروني هو محاولة الحصول على معلوماتك الحساسة عبر رسائل مزيفة...",
      difficulty: "beginner",
      durationMinutes: 5,
      order: 1,
    },
    {
      title: "Inspect Links Before Clicking",
      titleAr: "اقرأ الرابط قبل أن تنقر: التحليل التركيبي للروابط",
      slug: "safe-link-inspection",
      summaryAr: "افهم أجزاء الرابط: البروتوكول، النطاق الأساسي، النطاق الفرعي، ومسار الصفحة.",
      content: "Link inspection content...",
      contentAr: "الرابط يحتوي على مكونات تكشف وجهته الحقيقية قبل فتحه...",
      difficulty: "beginner",
      durationMinutes: 6,
      order: 2,
    },
    {
      title: "Account Protection and Multi-Factor Authentication",
      titleAr: "حماية الحسابات والمصادقة متعددة العوامل",
      slug: "account-protection-mfa",
      summaryAr: "لماذا تعد كلمات المرور وحدها غير كافية؟ وكيف تعمل تطبيقات المصادقة الثنائية؟",
      content: "MFA and account protection...",
      contentAr: "المصادقة متعددة العوامل توفر طبقة أمان إضافية حتى لو تسربت كلمة المرور...",
      difficulty: "intermediate",
      durationMinutes: 7,
      order: 3,
    },
    {
      title: "Malware & Safe Attachment Handling",
      titleAr: "الملفات والمرفقات المشبوهة والبرمجيات الخبيثة",
      slug: "malware-safe-attachments",
      summaryAr: "كيف تصل الفيروسات وبرامج الفدية عبر المرفقات؟ وكيف تتعامل معها بأمان؟",
      content: "Safe attachments handling...",
      contentAr: "المرفقات التنفيذية أو التي تطلب تفعيل الماكرو تعد من أخطر نواقل الهجمات...",
      difficulty: "intermediate",
      durationMinutes: 6,
      order: 4,
    },
  ];

  for (const les of lessonsData) {
    const exists = await db.select().from(lessons).where(eq(lessons.slug, les.slug)).limit(1);
    if (exists.length === 0) {
      await db.insert(lessons).values({
        title: les.title,
        titleAr: les.titleAr,
        slug: les.slug,
        summary: les.summaryAr,
        summaryAr: les.summaryAr,
        content: les.content,
        contentAr: les.contentAr,
        difficulty: les.difficulty as any,
        durationMinutes: les.durationMinutes,
        order: les.order,
        status: "published",
      });
    }
  }

  console.log("[Seed] Database seeding completed successfully!");
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Seed] Fatal error:", err);
      process.exit(1);
    });
}
