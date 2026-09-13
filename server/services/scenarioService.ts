import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  scenarios,
  scenarioSteps,
  scenarioOptions,
  scenarioAttempts,
  weaknesses,
  awarenessScores,
  lessons,
} from "../../drizzle/schema";

export type Scenario = typeof scenarios.$inferSelect;
export type ScenarioStep = typeof scenarioSteps.$inferSelect;
export type ScenarioOption = typeof scenarioOptions.$inferSelect;
export type ScenarioAttempt = typeof scenarioAttempts.$inferSelect;

/**
 * Deterministic Application-Level Mapping:
 * Maps Real Lesson IDs (1, 2, 3, 4, 6, 7, 8) and Lesson Slugs to Scenarios (1..7).
 * Grounded in actual curriculum design; independent of row order assumptions.
 */
export const LESSON_SCENARIO_MAPPING: Record<
  number,
  { scenarioId: number; slug: string; threatType: string }
> = {
  1: { scenarioId: 1, slug: "how-to-detect-phishing", threatType: "phishing_sms" },
  2: { scenarioId: 2, slug: "safe-link-inspection", threatType: "safe_links" },
  3: { scenarioId: 3, slug: "account-protection-mfa", threatType: "credential_theft" },
  4: { scenarioId: 4, slug: "attachments-malware-awareness", threatType: "malware_attachment" },
  6: { scenarioId: 5, slug: "data-protection-backup", threatType: "ransomware_backup" },
  7: { scenarioId: 6, slug: "public-wifi-network-security", threatType: "wifi_mitm" },
  8: { scenarioId: 7, slug: "incident-reporting-response", threatType: "incident_breach" },
};

/**
 * 7 Interactive Cybersecurity Scenarios with Multi-step Decision Branching
 */
export const SEVEN_SCENARIOS = [
  // =========================================================================
  // Scenario 1 (Lesson ID = 1 | Phishing SMS)
  // =========================================================================
  {
    id: 1,
    lessonId: 1,
    title: "Suspicious Bank Suspension SMS",
    titleAr: "رسالة إيقاف حساب بنكي عاجلة ومطالبة برمز OTP",
    threatType: "phishing_sms",
    difficulty: "beginner" as const,
    descriptionAr: "وصلتك رسالة نصية عاجلة تزعم أن حسابك البنكي سيتوقف خلال ساعة واحدة ما لم تدخل على الرابط المرفق وتؤكد بياناتك فوراً.",
    steps: [
      {
        stepNumber: 1,
        situationAr: "وصلتك رسالة SMS من رقم غير معتاد: 'عزيزي العميل، تم تجميد بطاقتك الائتمانية لأسباب أمنية. لتجنب الرسوم وإعادة التنشيط اضغط فوراً: http://sa-bank.secure-auth.cc/verify'. ما هو قرارك الأمني الأولي؟",
        contextData: { channel: "sms", sender: "Unknown (+966500000000)", urgency: "high", simulationType: "phone_sms" },
        options: [
          {
            id: 101,
            labelAr: "النقر على الرابط وتأكيد البيانات بسرعة تجنباً لإيقاف الحساب",
            labelEn: "Click link and confirm credentials",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 25,
            feedbackAr: "خطأ عالي الخطر! الرسائل التي تهدد بالإيقاف الفوري هي أسلوب تصيد احتيالي كلاسيكي لسلبك وقت التفكير الهادئ.",
            nextStepNumber: 2,
            recommendedLessonId: 1,
          },
          {
            id: 102,
            labelAr: "تجاهل الرابط والاتصال فوراً بالبنك عبر الرقم الرسمي المطبوع خلف البطاقة",
            labelEn: "Ignore link and call bank via official number on card",
            actionType: "report",
            isCorrect: true,
            riskScoreDelta: 0,
            feedbackAr: "إجراء صحيح ومثالي! التحقق المستقل من الرقم الرسمي المطبوع خلف بطاقتك هو الطريقة الآمنة المعتمدة.",
            nextStepNumber: null,
            recommendedLessonId: 1,
          },
          {
            id: 103,
            labelAr: "حذف الرسالة دون فتح الرابط أو إبلاغ أحد",
            labelEn: "Delete message without reporting",
            actionType: "ignore",
            isCorrect: true,
            riskScoreDelta: 5,
            feedbackAr: "تصرف آمن يمنع الضرر المباشر، ولكن الأفضل إبلاغ البنك على رقم مكافحة الاحتيال (330330) لحماية الآخرين.",
            nextStepNumber: null,
            recommendedLessonId: 1,
          },
        ],
      },
      {
        stepNumber: 2,
        situationAr: "فتحت الرابط، فظهرت صفحة تطابق تصميم مصرفك تماماً وتطلب إدخال رقم بطاقة الصراف، والرمز السري PIN، بالإضافة لرمز التحقق OTP الذي وصلك لتوه على هاتفك. كيف تتصرف الآن؟",
        contextData: { channel: "web", domain: "sa-bank.secure-auth.cc", simulationType: "fake_bank_page" },
        options: [
          {
            id: 104,
            labelAr: "إدخال رمز التحقق OTP والرقم السري لإتمام التوثيق بسرعة",
            labelEn: "Enter OTP and PIN",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 35,
            feedbackAr: "كارثي! إدخال رمز التحقق OTP والرقم السري يمنح المهاجم السيطرة اللحظية لسحب أموالك فوراً.",
            nextStepNumber: null,
            recommendedLessonId: 1,
          },
          {
            id: 105,
            labelAr: "إغلاق الصفحة فوراً والاتصال بهاتف طوارئ البنك لإيقاف البطاقة والعمليات",
            labelEn: "Close page immediately and call fraud department to freeze card",
            actionType: "isolate",
            isCorrect: true,
            riskScoreDelta: 10,
            feedbackAr: "احتواء ممتاز للضرر! التدارك الفوري والاتصال بطوارئ البنك يسبق المهاجم ويجمد الحساب قبل تنفيذ أي حوالة.",
            nextStepNumber: null,
            recommendedLessonId: 1,
          },
          {
            id: 106,
            labelAr: "مسح سجل تصفح الإنترنت فقط وإغلاق المتصفح",
            labelEn: "Clear browser history only",
            actionType: "ignore",
            isCorrect: false,
            riskScoreDelta: 20,
            feedbackAr: "إجراء شكلي غير مجدٍ! مسح السجل لا يلغي البيانات إذا تم إرسالها ولا يحمي الحساب.",
            nextStepNumber: null,
            recommendedLessonId: 1,
          },
        ],
      },
    ],
  },

  // =========================================================================
  // Scenario 2 (Lesson ID = 2 | Safe Link Inspection)
  // =========================================================================
  {
    id: 2,
    lessonId: 2,
    title: "Obfuscated Link with Lookalike Subdomain",
    titleAr: "رابط ترويجي خادع يستغل النطاقات الفرعية التمويهية",
    threatType: "safe_links",
    difficulty: "beginner" as const,
    descriptionAr: "وصلك بريد إلكتروني يزعم تقديم مكافأة ولاء ويطلب النقر على رابط يحتوي اسم شركتك كجزء من العنوان.",
    steps: [
      {
        stepNumber: 1,
        situationAr: "يحتوي البريد على زر باسم 'استلم مكافأتك'. عند تحريك المؤشر فوق الرابط يظهر العنوان التالي: 'https://mycompany.com.rewards-portal.online/claim'. ما هو تحليلك الأمني للرابط؟",
        contextData: { channel: "email", url: "https://mycompany.com.rewards-portal.online/claim", simulationType: "link_inspection" },
        options: [
          {
            id: 201,
            labelAr: "النقر على الرابط لأن عنوانه يبدأ بـ https://mycompany.com",
            labelEn: "Click link because it begins with mycompany.com",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 30,
            feedbackAr: "خطأ فادح! النطاق الحقيقي هو rewards-portal.online وليس mycompany.com الذي وُضع كنطاق فرعي مضلل.",
            nextStepNumber: 2,
            recommendedLessonId: 2,
          },
          {
            id: 202,
            labelAr: "تفكيك الرابط: قراءة النطاق الأساسي قبل أول شرطة مائلة ورفض فتحه",
            labelEn: "Deconstruct URL: inspect root domain before slash and reject",
            actionType: "verify",
            isCorrect: true,
            riskScoreDelta: 0,
            feedbackAr: "تحليل تركيبي متميز! النطاق الحقيقي يقرأ من اليمين لليسار قبل أول شرطة مائلة مفردة.",
            nextStepNumber: null,
            recommendedLessonId: 2,
          },
          {
            id: 203,
            labelAr: "إعادة توجيه الرسالة لقائمة البريد العامة للزملاء لمعرفة آرائهم",
            labelEn: "Forward link to all-company email list",
            actionType: "ignore",
            isCorrect: false,
            riskScoreDelta: 15,
            feedbackAr: "تصرف خاطئ! إعادة توجيه الروابط الخبيثة قد يدفع زملاء آخرين للنقر عليها والوقوع في الفخ.",
            nextStepNumber: null,
            recommendedLessonId: 2,
          },
        ],
      },
      {
        stepNumber: 2,
        situationAr: "فتحت الرابط، فظهر تحذير أحمر من المتصفح: 'شهادة الأمان غير صالحة ولا تتطابق مع اسم الموقع (SSL Certificate Mismatch)'. ماذا تفعل؟",
        contextData: { channel: "browser", simulationType: "cert_error" },
        options: [
          {
            id: 204,
            labelAr: "الضغط على 'متابعة إلى الموقع غير الآمن (غير مستحسن)' للوصول للمكافأة",
            labelEn: "Click 'Proceed to unsafe site'",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 35,
            feedbackAr: "تجاوز خطر للغاية! تحذيرات عدم تطابق الشهادة تعني يقيناً أن الخادم غير موثوق أو يخضع لاعتراض.",
            nextStepNumber: null,
            recommendedLessonId: 2,
          },
          {
            id: 205,
            labelAr: "إغلاق التبويب فوراً وتقديم بلاغ لفريق الأمن السيبراني بحظر النطاق الخبيث",
            labelEn: "Close tab immediately and report malicious domain to SOC",
            actionType: "report",
            isCorrect: true,
            riskScoreDelta: 10,
            feedbackAr: "احتواء فعال! إغلاق التبويب وإبلاغ الأمن يمنع تضرر بقية الموظفين بحظر النطاق على جدار الحماية.",
            nextStepNumber: null,
            recommendedLessonId: 2,
          },
          {
            id: 206,
            labelAr: "فتح نفس الرابط من الهاتف الشخصي بافتراض أن الهواتف لا تتأثر",
            labelEn: "Open on personal phone assuming mobile is immune",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 20,
            feedbackAr: "معلومة مغلوطة! هجمات سرقة بيانات الاعتماد تعمل بنفس الفعالية على الهواتف الذكية.",
            nextStepNumber: null,
            recommendedLessonId: 2,
          },
        ],
      },
    ],
  },

  // =========================================================================
  // Scenario 3 (Lesson ID = 3 | Account & MFA Security)
  // =========================================================================
  {
    id: 3,
    lessonId: 3,
    title: "MFA Fatigue & Credential Stuffing Attack",
    titleAr: "هجوم إرهاق المصادقة متعددة العوامل (MFA Fatigue)",
    threatType: "credential_theft",
    difficulty: "intermediate" as const,
    descriptionAr: "في تمام الساعة 2:30 فجراً، يهتز هاتفك بصورة متكررة ومتتابعة بطلبات موافقة لتسجيل الدخول إلى بريدك المهني.",
    steps: [
      {
        stepNumber: 1,
        situationAr: "تتلقى أكثر من 15 إشعار موافقة متتالياً من تطبيق المصادقة Microsoft Authenticator تطلب تأكيد تسجيل الدخول من دولة أخرى. كيف تتعامل مع الإزعاج؟",
        contextData: { channel: "app", appName: "Microsoft Authenticator", location: "Unknown IP (Overseas)", simulationType: "mfa_push" },
        options: [
          {
            id: 301,
            labelAr: "الضغط على 'موافق' (Approve) لإيقاف الإشعارات والعودة للنوم",
            labelEn: "Click 'Approve' to stop notification buzzing",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 40,
            feedbackAr: "خطر حرج! هذا هو هجوم إرهاق المصادقة (MFA Fatigue)، والموافقة تمنح المهاجم حق الدخول المباشر لحسابك.",
            nextStepNumber: 2,
            recommendedLessonId: 3,
          },
          {
            id: 302,
            labelAr: "الضغط على 'رفض' (Deny)، ووضع علامة 'لم أطلب هذا'، ثم تغيير كلمة المرور فوراً من جهاز نظيف",
            labelEn: "Click 'Deny', mark 'I did not request this', and change password immediately",
            actionType: "verify",
            isCorrect: true,
            riskScoreDelta: 0,
            feedbackAr: "استجابة نموذجية! الرفض يمنع الدخول، وتغيير كلمة المرور يقطع استغلال بياناتك المسربة.",
            nextStepNumber: null,
            recommendedLessonId: 3,
          },
          {
            id: 303,
            labelAr: "تفعيل وضع الصامت على الهاتف وتجاهل الإشعارات",
            labelEn: "Put phone on silent and ignore",
            actionType: "ignore",
            isCorrect: false,
            riskScoreDelta: 20,
            feedbackAr: "تجاهل مقلق! الإشعارات تدل على أن كلمة مرورك مخترقة بالفعل والمهاجم يواصل المحاولة.",
            nextStepNumber: null,
            recommendedLessonId: 3,
          },
        ],
      },
      {
        stepNumber: 2,
        situationAr: "وافقت بالخطأ على الإشعار، ثم استيقظت صباحاً لتجد بريداً يؤكد تسجيل جهاز جديد على حسابك في منتصف الليل. ما خطوتك العاجلة؟",
        contextData: { channel: "email_alert", actionRequired: "immediate_containment", simulationType: "breach_alert" },
        options: [
          {
            id: 304,
            labelAr: "تسجيل الدخول فوراً، إنهاء جميع الجلسات النشطة، إبلاغ فريق أمن المعلومات، وإعادة تعيين كلمة المرور",
            labelEn: "Terminate all active sessions, notify IT security, and reset credentials",
            actionType: "isolate",
            isCorrect: true,
            riskScoreDelta: 15,
            feedbackAr: "إجراء احتواء سليم! إنهاء الجلسات (Revoke Sessions) يطرد المخترق ويوقف استغلال التوكن المسروق.",
            nextStepNumber: null,
            recommendedLessonId: 3,
          },
          {
            id: 305,
            labelAr: "الانتظار حتى نهاية الأسبوع لمعرفة ما إذا كان حسابك سيتعرض لأي مشكلة",
            labelEn: "Wait until weekend to observe",
            actionType: "ignore",
            isCorrect: false,
            riskScoreDelta: 40,
            feedbackAr: "تأخر غير مقبول! بضع ساعات تكفي المهاجم لتسريب كامل البريد والتحرك أفقياً بالشبكة.",
            nextStepNumber: null,
            recommendedLessonId: 3,
          },
          {
            id: 306,
            labelAr: "إعادة تشغيل الهاتف المحمول فقط",
            labelEn: "Reboot phone only",
            actionType: "ignore",
            isCorrect: false,
            riskScoreDelta: 25,
            feedbackAr: "لا علاقة لإعادة تشغيل الهاتف بالجلسة السحابية المخترقة على خوادم البريد.",
            nextStepNumber: null,
            recommendedLessonId: 3,
          },
        ],
      },
    ],
  },

  // =========================================================================
  // Scenario 4 (Lesson ID = 4 | Safe Attachments & Malware)
  // =========================================================================
  {
    id: 4,
    lessonId: 4,
    title: "Double Extension & Malicious Macro Attachment",
    titleAr: "مرفق فاتورة برمجية خبيثة بامتداد مزدوج ومطالبة ماكرو",
    threatType: "malware_attachment",
    difficulty: "intermediate" as const,
    descriptionAr: "وصلتك رسالة بريد إلكتروني من مورد معتاد تحوي ملفاً باسم 'Payment_Receipt_Q3.pdf.exe' وتطلب تمكين وحدات الماكرو.",
    steps: [
      {
        stepNumber: 1,
        situationAr: "تدّعي الرسالة أن الفاتورة معتمدة وتطلب فتح الملف. لاحظت أن نهاية الاسم هي '.pdf.exe'. كيف تتصرف مع هذا المرفق؟",
        contextData: { channel: "email", attachmentName: "Payment_Receipt_Q3.pdf.exe", simulationType: "file_attachment" },
        options: [
          {
            id: 401,
            labelAr: "التحقق من الامتداد: الامتداد الفعلي هو .exe القابل للتنفيذ؛ رفض الفتح وحذف الرسالة",
            labelEn: "Check extension: actual extension is .exe; reject and isolate",
            actionType: "isolate",
            isCorrect: true,
            riskScoreDelta: 0,
            feedbackAr: "فطنة أمنية رفيعة! خدعة الامتداد المزدوج (Double Extension) هي أسلوب كلاسيكي لتشغيل برمجيات خبيثة.",
            nextStepNumber: null,
            recommendedLessonId: 4,
          },
          {
            id: 402,
            labelAr: "النقر المزدوج على الملف لفتحه وقراءة الفاتورة",
            labelEn: "Double click to open file",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 40,
            feedbackAr: "خطر حرج! فتح ملف .exe يبدأ فوراً بتثبيت برمجية تجسس أو حصان طروادة على جهازك.",
            nextStepNumber: 2,
            recommendedLessonId: 4,
          },
          {
            id: 403,
            labelAr: "إعادة تسمية الملف يدوياً بحذف .exe ثم فتحه",
            labelEn: "Rename file by removing .exe and open",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 25,
            feedbackAr: "خطأ تقني! إعادة التسمية لا تغير البنية التنفيذية للملف الخبيث ولا تحمي النظام.",
            nextStepNumber: 2,
            recommendedLessonId: 4,
          },
        ],
      },
      {
        stepNumber: 2,
        situationAr: "نقرت على الملف بالخطأ، وفجأة ظهرت شاشة موجه الأوامر (CMD) لثوانٍ ثم اختفت، وظهر تنبيه من مضاد الفيروسات برصد سكريبت PowerShell مريب. كيف تستجيب فوراً؟",
        contextData: { channel: "system_alert", simulationType: "malware_execution" },
        options: [
          {
            id: 404,
            labelAr: "فصل كابل الشبكة فوراً وإيقاف الواي فاي، وإبلاغ فريق الاستجابة للحوادث (SOC)",
            labelEn: "Unplug network cable immediately, disable Wi-Fi, and alert SOC",
            actionType: "isolate",
            isCorrect: true,
            riskScoreDelta: 10,
            feedbackAr: "استجابة ممتازة! عزل الجهاز عن الشبكة يمنع البرمجية من سحب البيانات أو الاتصال بخادم التحكم (C2).",
            nextStepNumber: null,
            recommendedLessonId: 4,
          },
          {
            id: 405,
            labelAr: "إغلاق تنبيه مضاد الفيروسات والاستمرار في تصفح البريد بشكل طبيعي",
            labelEn: "Dismiss antivirus alert and continue working",
            actionType: "ignore",
            isCorrect: false,
            riskScoreDelta: 45,
            feedbackAr: "إهمال جسيم! استمرار عمل الجهاز المصاب على الشبكة يعرض الخوادم المحيطة للانتشار الأفقي.",
            nextStepNumber: null,
            recommendedLessonId: 4,
          },
          {
            id: 406,
            labelAr: "محاولة البحث عن الملف وحذفه إلى سلة المهملات",
            labelEn: "Search for file and delete to recycle bin",
            actionType: "ignore",
            isCorrect: false,
            riskScoreDelta: 25,
            feedbackAr: "حذف الملف المصدر لا ينهي العمليات الخبيثة التي تم حقنها بالفعل في ذاكرة النظام (RAM).",
            nextStepNumber: null,
            recommendedLessonId: 4,
          },
        ],
      },
    ],
  },

  // =========================================================================
  // Scenario 5 (Lesson ID = 6 | Data Protection & Ransomware)
  // =========================================================================
  {
    id: 5,
    lessonId: 6,
    title: "Ransomware Outbreak & Offline Backup Recovery",
    titleAr: "هجوم برامج الفدية (Ransomware) والتعافي من النسخ المعزولة",
    threatType: "ransomware_backup",
    difficulty: "intermediate" as const,
    descriptionAr: "شاشة جهاز العمل تتحول فجأة للون الأسود مع رسالة فدية بالعملات الرقمية، وبدأت الملفات تأخذ الامتداد '.locked'.",
    steps: [
      {
        stepNumber: 1,
        situationAr: "ظهرت رسالة الفدية تطالب بـ 2 بيتكوين لفك التشفير خلال 24 ساعة. ما هو التصرف الفوري الأول؟",
        contextData: { channel: "desktop_screen", threat: "Ransomware.LockBit", simulationType: "ransomware_screen" },
        options: [
          {
            id: 501,
            labelAr: "فصل كابل الشبكة وإيقاف الواي فاي فوراً لمنع انتشار التشفير إلى مجلدات الشبكة المشتركة",
            labelEn: "Unplug network cable and disable Wi-Fi immediately",
            actionType: "isolate",
            isCorrect: true,
            riskScoreDelta: 0,
            feedbackAr: "تصرف طارئ مثالي! العزل اللحظي يمنع فيروس الفدية من التوسع وتشفير خوادم النسخ ومجلدات الزملاء.",
            nextStepNumber: null,
            recommendedLessonId: 6,
          },
          {
            id: 502,
            labelAr: "توصيل القرص الصلب الخارجي للنسخ الاحتياطي بالجهاز المصاب لفحص سلامة الملفات",
            labelEn: "Plug backup external hard drive into infected machine to check files",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 50,
            feedbackAr: "كارثي تماماً! توصيل وسيط النسخ بجهاز مصاب يؤدي لتشفير النسخة الاحتياطية أيضاً وتدمير خط الرجوع.",
            nextStepNumber: 2,
            recommendedLessonId: 6,
          },
          {
            id: 503,
            labelAr: "مراسلة عنوان البريد المذكور في الرسالة للتفاوض على سعر الفدية",
            labelEn: "Email attacker to negotiate ransom price",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 40,
            feedbackAr: "دفع أو التفاوض على الفدية يمول الجريمة المنظمة ولا يضمن الحصول على مفتاح فك التشفير إطلاقاً.",
            nextStepNumber: 2,
            recommendedLessonId: 6,
          },
        ],
      },
      {
        stepNumber: 2,
        situationAr: "تم عزل الجهاز بنجاح. ما هي خطة التعافي واسترجاع البيانات المعتمدة؟",
        contextData: { channel: "recovery_plan", simulationType: "disaster_recovery" },
        options: [
          {
            id: 504,
            labelAr: "إعادة تهيئة الجهاز بالكامل (Reimage)، واستعادة البيانات من نسخة 3-2-1 المعزولة وغير القابلة للتعديل (Immutable)",
            labelEn: "Wipe machine clean and restore from immutable offline 3-2-1 backup",
            actionType: "verify",
            isCorrect: true,
            riskScoreDelta: 10,
            feedbackAr: "تطبيق معتمد لمعايير المرونة السيبرانية! النسخ المعزولة غير المتصلة (Air-Gapped) هي صمام الأمان الوحيد.",
            nextStepNumber: null,
            recommendedLessonId: 6,
          },
          {
            id: 505,
            labelAr: "دفع الفدية المطلوبة عبر وسيط مالي لاستعادة الملفات المشفرة",
            labelEn: "Pay ransom via cryptocurrency broker",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 45,
            feedbackAr: "أكثر من 50% من الضحايا الذين يدفعون الفدية لا يسترجعون بياناتهم أو يتم استهدافهم مجدداً.",
            nextStepNumber: null,
            recommendedLessonId: 6,
          },
          {
            id: 506,
            labelAr: "محاولة فك التشفير ببرامج مجانية غير معروفة من الإنترنت",
            labelEn: "Download random free decrypter tools from internet",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 20,
            feedbackAr: "أدوات فك التشفير غير الموثوقة قد تكون برمجيات خبيثة ثانية تضاعف الضرر.",
            nextStepNumber: null,
            recommendedLessonId: 6,
          },
        ],
      },
    ],
  },

  // =========================================================================
  // Scenario 6 (Lesson ID = 7 | Public Wi-Fi & Network Security)
  // =========================================================================
  {
    id: 6,
    lessonId: 7,
    title: "Public Cafe Open Wi-Fi & Evil Twin Access Point",
    titleAr: "شبكة واي فاي مقهى مجانية والتوأم الشرير (Evil Twin)",
    threatType: "wifi_mitm",
    difficulty: "beginner" as const,
    descriptionAr: "في صالة انتظار المطار، تظهر شبكتان مفتوحتان بنفس الاسم تقريباً: 'Airport_Free_WiFi' و 'Airport_Free_WiFi_FAST'.",
    steps: [
      {
        stepNumber: 1,
        situationAr: "تحتاج لمراجعة بريدك وإتمام تحويل بنكي عاجل قبل إقلاع الطائرة. كيف تؤمن اتصالك بالإنترنت؟",
        contextData: { channel: "network_selector", availableNetworks: ["Airport_Free_WiFi", "Airport_Free_WiFi_FAST"], simulationType: "wifi_selection" },
        options: [
          {
            id: 601,
            labelAr: "تفعيل باقة بيانات الهاتف المحمول (نقطة اتصال شخصية Hotspot) أو تشغيل VPN موثوق مشفر قبل التصفح",
            labelEn: "Use cellular hotspot or enable trustworthy VPN",
            actionType: "verify",
            isCorrect: true,
            riskScoreDelta: 0,
            feedbackAr: "قرار أمني سليم 100%! استخدام بيانات الهاتف أو تشفير كامل الحزم عبر VPN يحميك تماماً من التنصت.",
            nextStepNumber: null,
            recommendedLessonId: 7,
          },
          {
            id: 602,
            labelAr: "الاتصال بالشبكة المفتوحة 'FAST' وإدخال بيانات الحساب البنكي مباشرة",
            labelEn: "Connect to open 'FAST' Wi-Fi and log in to bank",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 35,
            feedbackAr: "خطر جسيم! هذه الشبكة قد تكون نقطة وصول خبيثة (Evil Twin) تسجل كل البيانات غير المشفرة.",
            nextStepNumber: 2,
            recommendedLessonId: 7,
          },
          {
            id: 603,
            labelAr: "الاتصال بالشبكة المفتوحة مع تفعيل وضع التصفح المتخفي (Incognito Mode) فقط",
            labelEn: "Connect to open Wi-Fi using Incognito mode only",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 25,
            feedbackAr: "مفهوم خاطئ شائع! وضع التصفح المتخفي يحذف السجل محلياً فقط ولا يشفر أي حزم بيانات تمر بالهواء.",
            nextStepNumber: 2,
            recommendedLessonId: 7,
          },
        ],
      },
      {
        stepNumber: 2,
        situationAr: "أثناء محاولة فتح البنك عبر الواي فاي العام، ظهرت نافذة تطالبك بتثبيت شهادة رقمية جديدة للتمكن من متابعة التصفح. ما هو قرارك؟",
        contextData: { channel: "browser_prompt", simulationType: "ssl_strip" },
        options: [
          {
            id: 604,
            labelAr: "قطع الاتصال بالشبكة فوراً، وإيقاف الواي فاي، وتغيير كلمة المرور من شبكة خلوية آمنة",
            labelEn: "Disconnect immediately, turn off Wi-Fi, and change password via cellular data",
            actionType: "isolate",
            isCorrect: true,
            riskScoreDelta: 10,
            feedbackAr: "احتواء طارئ منقذ! طلب تثبيت شهادات على شبكات عامة هو محاولة صريحة لفك تشفير HTTPS واعتراض بياناتك (SSL Stripping / MitM).",
            nextStepNumber: null,
            recommendedLessonId: 7,
          },
          {
            id: 605,
            labelAr: "الموافقة على تثبيت الشهادة لإنهاء العملية بسرعة",
            labelEn: "Install certificate to proceed",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 45,
            feedbackAr: "كارثي! تثبيت شهادة جذرية مجهولة يمنح المهاجم القدرة على قراءة جميع اتصالاتك المشفرة بوضوح.",
            nextStepNumber: null,
            recommendedLessonId: 7,
          },
          {
            id: 606,
            labelAr: "إغلاق المتصفح وإعادة فتحه على نفس الشبكة",
            labelEn: "Reopen browser on same network",
            actionType: "ignore",
            isCorrect: false,
            riskScoreDelta: 30,
            feedbackAr: "إعادة فتح المتصفح لا تحميك إذا كانت نقطة الوصول ذاتها مخترقة ومصممة للاعتراض.",
            nextStepNumber: null,
            recommendedLessonId: 7,
          },
        ],
      },
    ],
  },

  // =========================================================================
  // Scenario 7 (Lesson ID = 8 | Incident Response & Digital Forensics)
  // =========================================================================
  {
    id: 7,
    lessonId: 8,
    title: "Live Breach Indicators & RAM Evidence Preservation",
    titleAr: "مؤشرات اختراق حية والحفاظ على الأدلة الرقمية بالذاكرة",
    threatType: "incident_breach",
    difficulty: "intermediate" as const,
    descriptionAr: "تلاحظ فتح شاشات طرفية فجأة، وظهور اتصالات شبكية صادرة غير معتادة إلى عناوين IP خارجية مجهولة.",
    steps: [
      {
        stepNumber: 1,
        situationAr: "أثناء عملك على الجهاز، رصدت نوافذ أوامر تومض وتختفي، مع إشعار بجدار الحماية عن نقل بيانات مكثف. ما هو بروتوكول الاستجابة الفوري المعتمد؟",
        contextData: { channel: "os_monitor", anomaly: "Suspicious Outbound Traffic", simulationType: "incident_triage" },
        options: [
          {
            id: 701,
            labelAr: "فصل كابل الشبكة وإيقاف الاتصال، مع إبقاء الجهاز قيد التشغيل للحفاظ على الأدلة في ذاكرة RAM، وإبلاغ الـ SOC فوراً",
            labelEn: "Disconnect network, keep PC running to preserve RAM evidence, and notify SOC",
            actionType: "isolate",
            isCorrect: true,
            riskScoreDelta: 0,
            feedbackAr: "تطبيق احترافي لبروتوكول الاستجابة للحوادث! عزل الشبكة يحصر التهديد، وإبقاء الجهاز يعمل يحفظ الأدلة المتطايرة (Volatile RAM).",
            nextStepNumber: null,
            recommendedLessonId: 8,
          },
          {
            id: 702,
            labelAr: "الضغط المطول على زر الطاقة وإيقاف تشغيل الحاسوب فوراً",
            labelEn: "Force power off machine immediately",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 25,
            feedbackAr: "خطأ جنائي رقمي! إيقاف التشغيل الفجائي يمسح الذاكرة العشوائية RAM التي تحوي مفاتيح التشفير والعمليات الجارية للمهاجم.",
            nextStepNumber: 2,
            recommendedLessonId: 8,
          },
          {
            id: 703,
            labelAr: "حذف الملفات الحديثة ومحاولة إخفاء الأمر تجنباً للمساءلة",
            labelEn: "Delete recent files and conceal the incident",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 40,
            feedbackAr: "مخالفة جسيمة! إتلاف الأدلة أو التكتم يمنح المهاجم فرصة التمدد ويهدد بيئة العمل بالكامل.",
            nextStepNumber: 2,
            recommendedLessonId: 8,
          },
        ],
      },
      {
        stepNumber: 2,
        situationAr: "طلب منك فريق الأمن السيبراني تقديم تفاصيل الحادثة بعد أن تم إيقاف الجهاز ومسح جزء من الأدلة. كيف تسهم في التحقيق الجنائي؟",
        contextData: { channel: "investigation_form", simulationType: "forensic_reporting" },
        options: [
          {
            id: 704,
            labelAr: "تدوين جدول زمني دقيق بجميع الأعراض والتطبيقات والتوقيتات التي لوحظت للمساعدة في تتبع نقطة الدخول",
            labelEn: "Provide detailed timeline of observed symptoms and timestamps",
            actionType: "verify",
            isCorrect: true,
            riskScoreDelta: 10,
            feedbackAr: "تعاون أمني سليم! التوثيق الزمني الدقيق يساعد المحققين في مطابقة السجلات وتحديد الثغرة المستغلة.",
            nextStepNumber: null,
            recommendedLessonId: 8,
          },
          {
            id: 705,
            labelAr: "إنكار ملاحظة أي شيء والادعاء بأن الجهاز انطفأ بمفرده",
            labelEn: "Deny observing anything and claim device shut down spontaneously",
            actionType: "ignore",
            isCorrect: false,
            riskScoreDelta: 45,
            feedbackAr: "التضليل يعطل عمليات الاستجابة ويمنع إغلاق الثغرة التي قد تخترق أجهزة أخرى.",
            nextStepNumber: null,
            recommendedLessonId: 8,
          },
          {
            id: 706,
            labelAr: "تثبيت برنامج تنظيف مجاني وتجربته قبل وصول الفريق",
            labelEn: "Install free registry cleaner before team arrives",
            actionType: "click",
            isCorrect: false,
            riskScoreDelta: 25,
            feedbackAr: "التلاعب ببيئة النظام قبل انتهاء التحقيق الجنائي يشوه السجلات والأدلة الرقمية.",
            nextStepNumber: null,
            recommendedLessonId: 8,
          },
        ],
      },
    ],
  },
];

/**
 * Idempotent seeder: Ensures all 7 scenarios, their steps, and options exist in SQLite.
 * Solves the FOREIGN KEY constraint error on scenario_attempts once and for all.
 */
export async function seedInitialScenarios() {
  const db = await getDb();
  if (!db) return;

  try {
    for (const sc of SEVEN_SCENARIOS) {
      const existingSc = await db.select().from(scenarios).where(eq(scenarios.id, sc.id)).limit(1);
      if (existingSc.length === 0) {
        await db.insert(scenarios).values({
          id: sc.id,
          title: sc.title,
          titleAr: sc.titleAr,
          threatType: sc.threatType,
          difficulty: sc.difficulty,
          descriptionAr: sc.descriptionAr,
          status: "published",
        });
      }

      for (const st of sc.steps) {
        const existingStep = await db
          .select()
          .from(scenarioSteps)
          .where(and(eq(scenarioSteps.scenarioId, sc.id), eq(scenarioSteps.stepNumber, st.stepNumber)))
          .limit(1);

        let stepId = existingStep[0]?.id;
        if (!stepId) {
          const [insertedStep] = await db
            .insert(scenarioSteps)
            .values({
              scenarioId: sc.id,
              stepNumber: st.stepNumber,
              situationAr: st.situationAr,
              contextDataJson: JSON.stringify(st.contextData),
            })
            .returning();
          stepId = insertedStep.id;
        }

        for (const opt of st.options) {
          const existingOpt = await db
            .select()
            .from(scenarioOptions)
            .where(eq(scenarioOptions.id, opt.id))
            .limit(1);

          if (existingOpt.length === 0) {
            let validRecLessonId: number | null = null;
            if (opt.recommendedLessonId) {
              const [les] = await db.select().from(lessons).where(eq(lessons.id, opt.recommendedLessonId)).limit(1);
              if (les) validRecLessonId = les.id;
            }
            await db.insert(scenarioOptions).values({
              id: opt.id,
              stepId,
              labelAr: opt.labelAr,
              labelEn: opt.labelEn,
              actionType: opt.actionType,
              isCorrect: opt.isCorrect,
              riskScoreDelta: opt.riskScoreDelta,
              feedbackAr: opt.feedbackAr,
              nextStepNumber: opt.nextStepNumber,
              recommendedLessonId: validRecLessonId,
            });
          } else {
            await db.update(scenarioOptions).set({
              nextStepNumber: opt.nextStepNumber,
              riskScoreDelta: opt.riskScoreDelta,
              isCorrect: opt.isCorrect,
              feedbackAr: opt.feedbackAr,
            }).where(eq(scenarioOptions.id, opt.id));
          }
        }
      }
    }
  } catch (err) {
    console.warn("[ScenarioService] seedInitialScenarios warning:", err);
  }
}

/**
 * Backward compatibility alias for legacy tests
 */
export const DEFAULT_SCENARIOS = SEVEN_SCENARIOS;

/**
 * List scenarios sanitized for public/student view (zero answer/risk leakage)
 */
export async function getScenariosList() {
  const db = await getDb();
  await seedInitialScenarios();

  return SEVEN_SCENARIOS.map((s) => ({
    id: s.id,
    lessonId: s.lessonId,
    title: s.title,
    titleAr: s.titleAr,
    threatType: s.threatType,
    difficulty: s.difficulty,
    descriptionAr: s.descriptionAr,
    stepsCount: s.steps.length,
  }));
}

/**
 * Get detailed scenario by lesson ID or scenario ID (sanitized: no isCorrect, no riskScoreDelta, no feedbackAr)
 */
export async function getScenarioByLessonOrId(params: { lessonId?: number; scenarioId?: number }) {
  await seedInitialScenarios();

  let targetScenario: (typeof SEVEN_SCENARIOS)[0] | undefined = undefined;
  if (params.lessonId !== undefined) {
    const map = LESSON_SCENARIO_MAPPING[params.lessonId];
    if (map) {
      targetScenario = SEVEN_SCENARIOS.find((s) => s.id === map.scenarioId);
    }
  } else if (params.scenarioId !== undefined) {
    targetScenario = SEVEN_SCENARIOS.find((s) => s.id === params.scenarioId);
  }

  if (!targetScenario || (targetScenario as any).status === "unpublished") {
    return null;
  }

  // Strictly sanitize for client view: remove correct answer, risk score delta, and feedback
  return {
    id: targetScenario.id,
    lessonId: targetScenario.lessonId,
    title: targetScenario.title,
    titleAr: targetScenario.titleAr,
    threatType: targetScenario.threatType,
    difficulty: targetScenario.difficulty,
    descriptionAr: targetScenario.descriptionAr,
    steps: targetScenario.steps.map((st) => ({
      stepNumber: st.stepNumber,
      situationAr: st.situationAr,
      contextData: st.contextData,
      options: st.options.map((opt) => ({
        id: opt.id,
        labelAr: opt.labelAr,
        labelEn: opt.labelEn,
        actionType: opt.actionType,
      })),
    })),
  };
}

/**
 * Server-Side Evaluation & Execution:
 * Evaluates decision, computes multi-step path, accumulates riskScoreDelta (isolated),
 * applies weakness deduplication, records attempt, and protects awareness score.
 */
export async function submitScenarioDecision(params: {
  userId: number;
  scenarioId: number;
  stepNumber?: number;
  optionIndex?: number;
  optionId?: number;
  previousResponses?: Array<{ stepNumber: number; optionId: number }>;
}): Promise<{
  stepNumber: number;
  chosenOptionId: number;
  isCorrect: boolean;
  riskScoreDelta: number;
  explanationAr: string;
  feedbackAr: string;
  nextStepNumber: number | null;
  isFinished: boolean;
  recommendedLessonId: number | null;
  finalSummary?: {
    passed: boolean;
    scorePercentage: number;
    totalRiskDelta: number;
    isFirstPass: boolean;
    recommendedLessonId: number | null;
  };
}> {
  const { userId, scenarioId } = params;
  const db = await getDb();
  await seedInitialScenarios();

  // 1. Verify scenario exists and is published
  const scenario = SEVEN_SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario || (scenario as any).status === "unpublished") {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "السيناريو التفاعلي المطلوب غير موجود في النظام أو غير متاح حالياً",
    });
  }

  // 2. Verify step number exists in scenario
  const stepNumber = params.stepNumber ?? 1;
  const currentStep = scenario.steps.find((st) => st.stepNumber === stepNumber);
  if (!currentStep) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `رقم الخطوة (${stepNumber}) غير صالح في هذا السيناريو`,
    });
  }

  // 3. Resolve & Verify Option with strict anti-tampering checks
  let chosenOption: (typeof currentStep.options)[0] | undefined;

  if (params.optionId !== undefined) {
    // Check 1: Did the user submit an option from another step in this scenario?
    const existsInOtherStep = scenario.steps.some(
      (st) => st.stepNumber !== stepNumber && st.options.some((o) => o.id === params.optionId)
    );
    if (existsInOtherStep) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `محاولة غير صالحة: الخيار (${params.optionId}) يتبع لخطوة أخرى داخل السيناريو`,
      });
    }

    // Check 2: Did the user submit an option from another scenario?
    const existsInOtherScenario = SEVEN_SCENARIOS.some(
      (sc) => sc.id !== scenarioId && sc.steps.some((st) => st.options.some((o) => o.id === params.optionId))
    );
    if (existsInOtherScenario) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `محاولة غير صالحة: الخيار (${params.optionId}) يتبع لسيناريو تفاعلي آخر`,
      });
    }

    chosenOption = currentStep.options.find((o) => o.id === params.optionId);
    if (!chosenOption) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `الخيار المحدد (${params.optionId}) غير صالح للخطوة (${stepNumber})`,
      });
    }
  } else if (params.optionIndex !== undefined) {
    // Legacy support for index-based invocations
    chosenOption = currentStep.options[params.optionIndex];
    if (!chosenOption) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `مؤشر الخيار (${params.optionIndex}) غير صالح`,
      });
    }
  } else {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "يجب تحديد معرف الخيار (optionId)",
    });
  }

  // 4. Validate previousResponses integrity & transition rules
  if (stepNumber === 1) {
    if (params.previousResponses && params.previousResponses.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "لا يمكن إرسال خطوات سابقة عند تنفيذ الخطوة الأولى في السيناريو",
      });
    }
  } else if (stepNumber === 2) {
    if (!params.previousResponses || params.previousResponses.length !== 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "الانتقال إلى الخطوة الثانية يتطلب تقديم رد الخطوة الأولى السابقة",
      });
    }

    const prevResp = params.previousResponses[0];
    if (prevResp.stepNumber !== 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "تسلسل الخطوات السابقة غير صحيح",
      });
    }

    const step1 = scenario.steps.find((st) => st.stepNumber === 1)!;
    const prevOption = step1.options.find((o) => o.id === prevResp.optionId);
    if (!prevOption) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `الخيار السابق (${prevResp.optionId}) لا ينتمي للخطوة الأولى في هذا السيناريو`,
      });
    }

    // Check transition: did Step 1 option genuinely allow moving to Step 2?
    if (prevOption.nextStepNumber !== 2) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "محاولة انتقال غير مسموحة: اختيار الخطوة الأولى كان مساراً نهائياً أنهى السيناريو",
      });
    }
  } else {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `رقم الخطوة (${stepNumber}) غير مدعوم في هذا السيناريو`,
    });
  }

  const isStepCorrect = chosenOption.isCorrect;
  const nextStepNumber = chosenOption.nextStepNumber;
  const isFinished = nextStepNumber === null;

  let finalSummary: any = undefined;

  if (isFinished && db) {
    // 1. Gather complete responses history across steps
    const allResponses = [...(params.previousResponses || [])];
    allResponses.push({ stepNumber, optionId: chosenOption.id });

    // Compute total risk delta and score percentage strictly on server
    let totalRisk = 0;
    let correctCount = 0;

    for (const resp of allResponses) {
      const stepObj = scenario.steps.find((s) => s.stepNumber === resp.stepNumber);
      const optObj = stepObj?.options.find((o) => o.id === resp.optionId);
      if (optObj) {
        totalRisk += optObj.riskScoreDelta;
        if (optObj.isCorrect) correctCount++;
      }
    }

    const totalSteps = allResponses.length;
    const scorePercentage = Math.round((correctCount / Math.max(1, totalSteps)) * 100);
    const passed = scorePercentage >= 70;

    // 2. Check for duplicate score inflation on awareness scores
    let isFirstPass = false;
    if (passed) {
      try {
        const previousPasses = await db
          .select()
          .from(scenarioAttempts)
          .where(
            and(
              eq(scenarioAttempts.userId, userId),
              eq(scenarioAttempts.scenarioId, scenarioId),
              eq(scenarioAttempts.passed, true)
            )
          )
          .limit(1);

        isFirstPass = previousPasses.length === 0;
      } catch (err) {
        isFirstPass = true;
      }
    }

    // 3. Save attempt audit trail
    try {
      await db.insert(scenarioAttempts).values({
        userId,
        scenarioId,
        passed,
        finalAction: chosenOption.actionType,
        scorePercentage,
        totalRiskDelta: totalRisk,
        feedbackSummary: chosenOption.feedbackAr,
        detailedResponsesJson: JSON.stringify(allResponses),
      });
    } catch (err) {
      console.warn("[ScenarioService] Attempt insertion warning:", err);
    }

    // 4. Weakness Deduplication Rule:
    // Deduplicate by: userId + category + specific scenario detail + resolved=false
    if (!passed) {
      try {
        const weaknessCategory =
          scenario.threatType.includes("sms") || scenario.threatType.includes("phishing")
            ? "phishing"
            : scenario.threatType.includes("link")
            ? "urls"
            : scenario.threatType.includes("credential")
            ? "passwords"
            : scenario.threatType.includes("attachment")
            ? "attachments"
            : scenario.threatType.includes("ransomware")
            ? "backup"
            : scenario.threatType.includes("wifi")
            ? "network"
            : "incident";

        const weaknessDetail = `خطأ في قرار سيناريو: ${scenario.titleAr}`;

        const existingWeakness = await db
          .select()
          .from(weaknesses)
          .where(
            and(
              eq(weaknesses.userId, userId),
              eq(weaknesses.category, weaknessCategory),
              eq(weaknesses.details, weaknessDetail),
              eq(weaknesses.resolved, false)
            )
          )
          .limit(1);

        if (existingWeakness.length === 0) {
          await db.insert(weaknesses).values({
            userId,
            category: weaknessCategory,
            severity: "high",
            detectedFrom: "scenario",
            details: weaknessDetail,
            resolved: false,
          });
        }
      } catch (err) {
        console.warn("[ScenarioService] Weakness insertion warning:", err);
      }
    }

    // 5. Award +5 Awareness Points on FIRST successful pass ONLY
    // initialScore is STRICTLY IMMUTABLE!
    if (isFirstPass) {
      try {
        const [scoreRow] = await db
          .select()
          .from(awarenessScores)
          .where(eq(awarenessScores.userId, userId))
          .limit(1);

        if (scoreRow) {
          const newScore = Math.min(100, scoreRow.currentScore + 5);
          await db
            .update(awarenessScores)
            .set({
              currentScore: newScore,
              improvementDelta: newScore - scoreRow.initialScore, // initialScore strictly preserved
            })
            .where(eq(awarenessScores.id, scoreRow.id));
        }
      } catch (err) {
        console.warn("[ScenarioService] Awareness score update warning:", err);
      }
    }

    finalSummary = {
      passed,
      scorePercentage,
      totalRiskDelta: totalRisk,
      isFirstPass,
      recommendedLessonId: chosenOption.recommendedLessonId || scenario.lessonId,
    };
  }

  return {
    stepNumber,
    chosenOptionId: chosenOption.id,
    isCorrect: isStepCorrect,
    riskScoreDelta: chosenOption.riskScoreDelta,
    explanationAr: chosenOption.feedbackAr,
    feedbackAr: chosenOption.feedbackAr,
    nextStepNumber,
    isFinished,
    recommendedLessonId: chosenOption.recommendedLessonId || scenario.lessonId,
    finalSummary,
  };
}

/**
 * Get user progress across all 7 scenarios
 */
export async function getUserScenariosProgress(userId?: number) {
  const db = await getDb();
  await seedInitialScenarios();

  const progressList = SEVEN_SCENARIOS.map((sc) => ({
    scenarioId: sc.id,
    lessonId: sc.lessonId,
    titleAr: sc.titleAr,
    hasAttempted: false,
    passed: false,
    bestScore: 0,
    minRiskDelta: 0,
    attemptsCount: 0,
  }));

  if (!userId || !db) {
    return progressList;
  }

  try {
    const userAttempts = await db
      .select()
      .from(scenarioAttempts)
      .where(eq(scenarioAttempts.userId, userId));

    for (const item of progressList) {
      const attempts = userAttempts.filter((a) => a.scenarioId === item.scenarioId);
      if (attempts.length > 0) {
        item.hasAttempted = true;
        item.attemptsCount = attempts.length;
        item.passed = attempts.some((a) => a.passed);
        item.bestScore = Math.max(...attempts.map((a) => a.scorePercentage));
        item.minRiskDelta = Math.min(...attempts.map((a) => a.totalRiskDelta));
      }
    }
  } catch (err) {
    console.warn("[ScenarioService] getUserScenariosProgress warning:", err);
  }

  return progressList;
}
