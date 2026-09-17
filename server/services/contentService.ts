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
 * Fallback static lessons for offline/degraded mode — 7 Educational Modules
 */
export const DEFAULT_LESSONS: Lesson[] = [
  {
    id: 1,
    title: "How to Detect Phishing Messages",
    titleAr: "كيف تكتشف رسائل التصيد والاحتيال؟",
    slug: "how-to-detect-phishing",
    summary: "Identify artificial urgency, emotional manipulation, and fraudulent sender identities.",
    summaryAr: "تعلّم قراءة الرسائل غير المعتادة وكشف أساليب الضغط والاستعجال وانتحال الهويات الموثوقة.",
    content: "Phishing attacks exploit human psychology through social engineering. Attackers fabricate emergency scenarios to induce panic. Always inspect the sender, avoid sharing verification codes, and verify through independent official channels.",
    contentAr: "التصيد الإلكتروني (Phishing) هو هجوم يعتمد على الهندسة الاجتماعية لخداع الضحية ودفعها لمشاركة معلومات سرية أو اتخاذ إجراء ضار.\n\n### 1. مؤشرات الخطر الرئيسية (Red Flags):\n* **لغة الاستعجال والتهديد**: عبارات مثل \"سيتم إيقاف حسابك البنكي خلال 24 ساعة\" أو \"فرصة أخيرة لتحديث بياناتك\". المهاجم يتعمد سلبك وقت التفكير الهادئ.\n* **انتحال هوية الجهات الرسمية**: ادعاء أن الرسالة من البنك، البريد، أو جهة حكومية دون وجود أي إثبات تقني.\n* **طلب بيانات حساسة مباشرة**: تطلب الرسالة إدخال رقم بطاقة الصراف، رمز التحقق (OTP)، أو كلمة المرور على صفحات غير موثوقة.\n* **التحية العامة**: استخدام صيغ مبهمة مثل \"عزيزي العميل\" بدلاً من اسمك المسجل رسمياً.\n\n### 2. القاعدة الذهبية للوقاية:\nلا تتفاعل نهائياً مع الرسائل المشبوهة، ولا تضغط على الروابط أو المرفقات الواردة فيها. تواصل دائماً مع الجهة المعنية عبر رقمها الرسمي أو موقعها المستقل المسجل لديك مسبقاً.",
    categoryId: 1,
    difficulty: "beginner",
    durationMinutes: 6,
    status: "published",
    learningObjectivesJson: JSON.stringify([
      "كشف أساليب الضغط النفسي والاستعجال المصطنع في الرسائل",
      "التحقق من هوية المرسل عبر القنوات الرسمية المستقلة",
      "حماية رموز التحقق المؤقتة (OTP) والبيانات البنكية"
    ]),
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
    summary: "Analyze URL architecture, uncover lookalike domains, and identify obfuscation tactics.",
    summaryAr: "افهم أجزاء الرابط: البروتوكول، النطاق الأساسي، النطاق الفرعي، وكيف تكشف الوجهة الحقيقية قبل فتحها.",
    content: "A link reveals its true destination before you click it. Always verify the root domain before the first slash. Beware of typosquatting, URL shorteners, and direct IP addresses.",
    contentAr: "الرابط ليس مجرد عنوان يُنقر عليه، بل هو بنية تقنية دقيقة تكشف الوجهة الحقيقية لأي صفحة قبل فتحها.\n\n### 1. التشريح الأمني للرابط (URL Anatomy):\n* **البروتوكول**: `https://` يضمن التشفير أثناء النقل، لكنه لا يعني بالضرورة أن الموقع موثوق؛ فالمهاجمون يمتلكون شهادات SSL مجانية اليوم. بينما `http://` مجرد من التشفير وعالي الخطر.\n* **النطاق الأساسي (Domain & TLD)**: هو الجزء الأهم، ويقرأ من اليمين إلى اليسار قبل أول شرطة مائلة مفردة `/`. مثلاً في `https://bank.com.fake-login.site/login`، النطاق الحقيقي هو `fake-login.site` وليس البنك!\n* **النطاقات الفرعية التمويهية (Subdomains)**: يضع المهاجم اسم جهة موثوقة كنطاق فرعي لخداع العين السريعة.\n\n### 2. أساليب الخداع الشائعة:\n* **التشابه البصري والتبديل الحرفي (Typosquatting)**: مثل استبدال حرف `o` بالرقم `0` أو `l` بالرقم `1`.\n* **الروابط المختصرة**: استخدام خدمات الاختصار لإخفاء النطاق النهائي، مما يستوجب فحص الرابط بأدوات التحليل قبل فتحه.\n* **استخدام IP مباشر**: مثل `http://192.168.1.1/update` بدلاً من اسم نطاق رسمي.",
    categoryId: 2,
    difficulty: "beginner",
    durationMinutes: 5,
    status: "published",
    learningObjectivesJson: JSON.stringify([
      "تفكيك الرابط وتحديد النطاق الأساسي الفعلي بدقة",
      "كشف حيل النطاقات الفرعية التمويهية والتلاعب بالحروف",
      "تجنب فتح الروابط مجهولة المصدر دون فحص تركيبي مسبق"
    ]),
    order: 2,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    title: "Account Protection & Multi-Factor Authentication",
    titleAr: "حماية الحسابات والمصادقة متعددة العوامل (MFA)",
    slug: "account-protection-mfa",
    summary: "Establish resilient password strategies and deploy authenticator apps for multi-layer security.",
    summaryAr: "لماذا تعد كلمات المرور وحدها غير كافية؟ وكيف توفر تطبيقات المصادقة الثنائية حماية حتى في حال تسرب كلمة المرور؟",
    content: "Single-factor authentication relies solely on shared secrets. Multi-factor authentication adds independent verification layers: something you know, something you have, and something you are.",
    contentAr: "كلمة المرور وحدها تمثل نقطة فشل وحيدة (Single Point of Failure). إذا تسربت كلمة المرور نتيجة اختراق لخدمة تستخدمها، تصبح جميع حساباتك التي تشارك نفس الكلمة عرضة للاختراق الفوري.\n\n### 1. عوامل المصادقة الثلاثة:\n* **عامل المعرفة (Knowledge)**: ما تعرفه فقط، مثل كلمة المرور أو رمز PIN.\n* **عامل الملكية (Possession)**: ما تملكه، مثل الهاتف، تطبيق المصادقة (Authenticator)، أو مفتاح الأمان المادي (FIDO2 Key).\n* **عامل السمة الحيوية (Inherence)**: ما يميزك حيوياً، كبصمة الإصبع أو مسح الوجه.\n\n### 2. تطبيقات المصادقة (TOTP) مقابل الرسائل النصية (SMS):\n* **تطبيقات المصادقة (Google / Microsoft Authenticator)**: تولد رموزاً مؤقتة تتغير كل 30 ثانية وتعمل بدون اتصال بالإنترنت، وهي أكثر أماناً بكثير.\n* **رسائل SMS**: أقل أماناً بسبب قابلية الشبكات الخلوية لهجمات تحويل الشريحة (SIM Swapping) والتنصت على الشبكات.\n\n### 3. أفضل الممارسات:\n* استخدم كلمة مرور فريدة ومعقدة لكل حساب من خلال مدير كلمات مرور موثوق.\n* فعّل المصادقة الثنائية MFA على بريدك الإلكتروني وحساباتك البنكية والحكومية بشكل إلزامي.",
    categoryId: 3,
    difficulty: "intermediate",
    durationMinutes: 7,
    status: "published",
    learningObjectivesJson: JSON.stringify([
      "فهم عوامل المصادقة الثلاثة وكيفية تكاملها",
      "المقارنة التقنية بين تطبيقات TOTP ورسائل SMS",
      "بناء استراتيجية أمان متينة باستخدام مديري كلمات المرور"
    ]),
    order: 3,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    title: "Safe Attachments & Malware Handling",
    titleAr: "التعامل الآمن مع المرفقات والبرمجيات الخبيثة",
    slug: "attachments-malware-awareness",
    summary: "Spot high-risk file types, disable office macros, and prevent payload execution.",
    summaryAr: "كيف تصل الفيروسات وبرمجيات التجسس عبر البريد؟ وكيف تكشف الملفات القابلة للتنفيذ وهجمات الماكرو؟",
    content: "Email attachments are among the most common threat vectors used to deliver malicious payloads and remote access trojans. Never enable macros and always scan unexpected attachments.",
    contentAr: "تعتبر مرفقات البريد الإلكتروني وتنزيلات الويب من أكثر النواقل شيوعاً لاختراق الأجهزة عبر حقن برمجيات التجسس وأحصنة طروادة (Trojans).\n\n### 1. الامتدادات عالية الخطورة:\n* **الملفات التنفيذية والسكريبتات**: `.exe`, `.bat`, `.vbs`, `.ps1`, `.scr` — هذه الملفات قادرة على تشغيل تعليمات برمجية كاملة فور فتحها دون أي حماية.\n* **الأرشيفات المضغوطة المشبوهة**: `.zip`, `.rar`, `.iso` — يستخدمها المهاجمون لتجاوز فلاتر فحص البريد وتمرير ملفات تنفيذية مخفية بداخلها.\n* **خدعة الامتداد المزدوج**: مثل تسمية الملف `Invoice_2026.pdf.exe` لاستغلال ميزة إخفاء الامتدادات المعروفة في نظام ويندوز.\n\n### 2. مخاطر الماكرو في مستندات Office:\nتستغل الملفات الخبيثة ميزة وحدات الماكرو (VBA Macros) في ملفات Word و Excel لتنزيل برمجيات ضارة بمجرد النقر على \"تمكين المحتوى\" أو \"Enable Content\".\n\n### 3. السلوك الدفاعي الصحيح:\n* لا تقم بتشغيل الماكرو لأي مستند وارد من مصدر خارجي مهما كانت المبررات.\n* افحص المرفقات باستخدام منصات الفحص المعزولة ومضادات الفيروسات المحدثة باستمرار.\n* تأكد من إظهار امتدادات الملفات في إعدادات النظام لكشف الامتدادات الحقيقية.",
    categoryId: 4,
    difficulty: "intermediate",
    durationMinutes: 5,
    status: "published",
    learningObjectivesJson: JSON.stringify([
      "التعرف على امتدادات الملفات الخطرة وخدع الامتداد المزدوج",
      "تعطيل الماكرو التلقائي في مستندات العمل لتفادي البرمجيات الخبيثة",
      "اتباع بروتوكول التحقق قبل فتح أي مرفق بريدي غير متوقع"
    ]),
    order: 4,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 5,
    title: "Data Protection, Backup & Ransomware Defense",
    titleAr: "حماية البيانات والنسخ الاحتياطي ومكافحة برامج الفدية",
    slug: "data-protection-backup",
    summary: "Master the 3-2-1 backup strategy, enforce disk encryption, and neutralize ransomware extortion.",
    summaryAr: "استراتيجيات حماية البيانات الحساسة، تطبيق قاعدة 3-2-1 للنسخ الاحتياطي، ومواجهة هجمات تشفير الفدية.",
    content: "Ransomware encrypts critical data and demands payment for decryption keys. A resilient, disconnected backup strategy is the ultimate defense against extortion.",
    contentAr: "برامج الفدية (Ransomware) هي برمجيات خبيثة تقوم بتشفير كافة ملفات الضحية وقواعد بياناته، وتطلب مبالغ مالية مقابل مفتاح فك التشفير دون أي ضمان لاستعادة البيانات.\n\n### 1. استراتيجية النسخ الاحتياطي الذهبية (قاعدة 3-2-1):\n* **3 نسخ**: الاحتفاظ بثلاث نسخ كاملة من البيانات الهامة (النسخة الأصلية + نسختان احتياطيتان).\n* **2 وسيطين مختلفين**: تخزين النسخ على وسيطين تخزين مختلفين (مثلاً: قرص صلب خارجي وسحابة تخزين مشفرة).\n* **1 نسخة معزولة**: الاحتفاظ بنسخة واحدة على الأقل خارج الموقع ومعزولة تماماً عن الشبكة (Offline / Air-gapped) لمنع وصول برامج الفدية إليها عند إصابة الشبكة.\n\n### 2. تشفير البيانات (Data Encryption):\n* **تشفير الأجهزة والأقراص**: استخدام تقنيات التشفير الكامل للقرص (مثل BitLocker) لحماية البيانات في حال سرقة الجهاز المحمول أو فقدانه.\n* **مبدأ الحد الأدنى للبيانات**: لا تحتفظ ببيانات حساسة أو نسخ غير ضرورية على أجهزة الاستخدام اليومي.",
    categoryId: 4,
    difficulty: "intermediate",
    durationMinutes: 6,
    status: "published",
    learningObjectivesJson: JSON.stringify([
      "فهم آلية هجمات برامج الفدية التشفيرية وسبل احتوائها",
      "تطبيق قاعدة النسخ الاحتياطي 3-2-1 عملياً",
      "تأمين الأجهزة المحمولة عبر التشفير الكامل للأقراص"
    ]),
    order: 5,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 6,
    title: "Public Wi-Fi & Network Security",
    titleAr: "الأمان في الشبكات العامة والواي فاي المجاني",
    slug: "public-wifi-network-security",
    summary: "Defend against Man-in-the-Middle attacks, evil twins, and packet inspection in open networks.",
    summaryAr: "مخاطر الاتصال بنقاط الواي فاي المفتوحة في الأماكن العامة، هجمات التنصت (MitM)، وكيفية حماية الاتصال عبر VPN.",
    content: "Open Wi-Fi networks in cafes, hotels, and airports lack encryption. Adversaries on the same network can intercept traffic, conduct MITM attacks, or spoof captive portals.",
    contentAr: "الشبكات العامة المفتوحة المتوفرة في المقاهي والمطارات والفنادق تفتقر غالباً للتشفير وعزل الأجهزة، مما يجعلها بيئة خصبة لهجمات التنصت واعتراض الاتصالات.\n\n### 1. التهديدات في الشبكات العامة:\n* **هجوم الرجل في المنتصف (Man-in-the-Middle - MitM)**: يقف المهاجم بين جهازك ونقطة الوصول لمراقبة حركة البيانات ونسخ معلومات الجلسات.\n* **شبكات التوأم الشرير (Evil Twin)**: إنشاء نقطة وصول واي فاي خبيثة بنفس اسم شبكة المكان الحقيقية لحث الزوار على الاتصال بها وسرقة بياناتهم.\n* **التنصت على حزم البيانات (Packet Sniffing)**: استغلال عدم التشفير لالتقاط أي بيانات تنتقل بصيغة غير مشفرة.\n\n### 2. تدابير الحماية الصارمة:\n* تجنب تماماً تسجيل الدخول إلى حسابات بنكية أو حساسة أثناء الاتصال بشبكة عامة.\n* استخدم خدمة شبكة خاصة افتراضية (VPN) موثوقة لتشفير النفق بالكامل من جهازك إلى الإنترنت.\n* أوقف ميزة الاتصال التلقائي بشبكات الواي فاي (Auto-Join) وميزة مشاركة الملفات (File Sharing) في إعدادات جهازك.",
    categoryId: 3,
    difficulty: "beginner",
    durationMinutes: 5,
    status: "published",
    learningObjectivesJson: JSON.stringify([
      "التعرف على مخاطر هجمات MitM ونقاط الوصول المزيفة Evil Twin",
      "استخدام شبكات VPN لتشفير الاتصالات في الأماكن العامة",
      "ضبط إعدادات الأجهزة لمنع الاتصال التلقائي بنقاط الواي فاي المفتوحة"
    ]),
    order: 6,
    createdBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 7,
    title: "Incident Response & Reporting",
    titleAr: "إجراءات الاستجابة والإبلاغ عند التعرض لاختراق",
    slug: "incident-reporting-response",
    summary: "Execute golden-hour containment protocols, preserve digital evidence, and engage official incident teams.",
    summaryAr: "ماذا تفعل خلال الدقائق الأولى عند الاشتباه باختراق جهازك؟ خطوات العزل، حماية الحسابات، والإبلاغ المؤسسي والوطني.",
    content: "Incident response requires disciplined action. Speed of containment determines the severity of impact. Isolate the compromised device immediately, change credentials from a known clean device, and report to SOC/CSIRT.",
    contentAr: "التعامل السليم مع الحوادث السيبرانية خلال \"الساعات الذهبية الأولى\" يقلل من حجم الأضرار ويمنع المهاجم من التوسع داخل الشبكة أو تسريب البيانات الحساسة.\n\n### 1. إجراءات الاحتواء الفوري (Immediate Containment):\n* **عزل الجهاز عن الشبكة فوراً**: افصل كابل الشبكة السلكي وأوقف تشغيل الواي فاي والبلوتوث لمنع انتقال الهجوم إلى بقية الأجهزة بالمنزل أو المنظمة.\n* **لا تقم بإعادة تشغيل الجهاز فوراً**: إعادة التشغيل قد تمسح بيانات الذاكرة العشوائية (RAM) التي يحتاجها المحللون الجنائيون لاستخراج أدلة الهجوم والبرمجيات الخبيثة.\n* **تغيير كلمات المرور من جهاز آخر نظيف**: قم بتغيير كلمات مرور الحسابات المخترقة مع تسجيل الخروج من كافة الجلسات النشطة (Sign out of all sessions).\n\n### 2. الإبلاغ والتوثيق (Reporting & Documentation):\n* التقط صوراً لرسائل الخطأ أو طلبات الفدية أو عناوين البريد المشبوهة لتوثيق الأدلة.\n* أبلغ فريق أمن المعلومات الداخلي (SOC / CSIRT) فوراً في بيئة العمل أو الجهات الوطنية المعنية بمكافحة الجرائم المعلوماتية.\n* شارك التفاصيل بشفافية لمساعدة الفرق الفنية على سد الثغرة ومنع تكرارها.",
    categoryId: 1,
    difficulty: "intermediate",
    durationMinutes: 6,
    status: "published",
    learningObjectivesJson: JSON.stringify([
      "تطبيق خطوات العزل السريع للجهاز عند الاشتباه باختراق",
      "الحفاظ على الأدلة الرقمية بالذاكرة دون إتلافها",
      "إجراءات تغيير كلمات المرور وإلغاء الجلسات من بيئة آمنة",
      "الإبلاغ الفعال عبر القنوات الرسمية المتخصصة"
    ]),
    order: 7,
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

    for (const item of DEFAULT_LESSONS) {
      const existing = await db.select().from(lessons).where(eq(lessons.slug, item.slug)).limit(1);
      if (existing.length === 0) {
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
      } else {
        await db
          .update(lessons)
          .set({
            title: item.title,
            titleAr: item.titleAr,
            summary: item.summary,
            summaryAr: item.summaryAr,
            content: item.content,
            contentAr: item.contentAr,
            categoryId: item.categoryId,
            difficulty: item.difficulty,
            durationMinutes: item.durationMinutes,
            learningObjectivesJson: item.learningObjectivesJson,
            order: item.order,
            status: "published",
          })
          .where(eq(lessons.slug, item.slug));
      }
    }
  } catch (error) {
    console.warn("[CMS] Lesson seed skipped or db unavailable", error);
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
export const OFFICIAL_LESSON_IDS = [1, 2, 3, 4, 6, 7, 8] as const;

export async function listLessons(params: {
  userRole?: string;
  categoryId?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  status?: "draft" | "published" | "archived";
  search?: string;
  page?: number;
  limit?: number;
  authorId?: number;
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
    if (params.authorId !== undefined) {
      filtered = filtered.filter((l) => l.createdBy === params.authorId);
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

    if (params.authorId !== undefined) {
      conditions.push(eq(lessons.createdBy, params.authorId));
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
  order?: number;
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
    status: params.status || "draft",
    order: params.order ?? 99,
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
    order: number;
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
  if (params.order !== undefined) updateSet.order = params.order;
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
