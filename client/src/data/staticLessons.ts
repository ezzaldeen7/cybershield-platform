export interface StaticLesson {
  id: number;
  title: string;
  titleAr: string;
  slug: string;
  summary: string;
  summaryAr: string;
  content: string;
  contentAr: string;
  categoryId: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  durationMinutes: number;
  status: "published";
  learningObjectivesJson: string;
  order: number;
  isCompleted?: boolean;
  completedAt?: Date | null;
}

export const STATIC_FALLBACK_LESSONS: StaticLesson[] = [
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
    isCompleted: false,
    completedAt: null,
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
    isCompleted: false,
    completedAt: null,
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
    isCompleted: false,
    completedAt: null,
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
    isCompleted: false,
    completedAt: null,
  },
  {
    id: 6,
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
    isCompleted: false,
    completedAt: null,
  },
  {
    id: 7,
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
    isCompleted: false,
    completedAt: null,
  },
  {
    id: 8,
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
    isCompleted: false,
    completedAt: null,
  },
];
