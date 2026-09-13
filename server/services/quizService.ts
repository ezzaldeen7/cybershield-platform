import { eq, and, sql, desc } from "drizzle-orm";
import { getDb } from "../db";
import { quizzes, quizQuestions, quizAttempts, weaknesses, awarenessScores, lessons } from "../../drizzle/schema";

export type Quiz = typeof quizzes.$inferSelect;
export type QuizQuestion = typeof quizQuestions.$inferSelect;
export type QuizAttempt = typeof quizAttempts.$inferSelect;

/**
 * 7 Educational Lesson Quizzes Definitions
 */
export const SEVEN_LESSON_QUIZZES = [
  { id: 1, lessonId: 1, titleAr: "اختبار الوحدة 1: كشف رسائل التصيد والاحتيال", titleEn: "Quiz 1: Phishing Detection", passScorePercentage: 70 },
  { id: 2, lessonId: 2, titleAr: "اختبار الوحدة 2: فحص وتحليل الروابط المشبوهة", titleEn: "Quiz 2: Safe Link Inspection", passScorePercentage: 70 },
  { id: 3, lessonId: 3, titleAr: "اختبار الوحدة 3: حماية الحسابات والمصادقة متعددة العوامل", titleEn: "Quiz 3: Account & MFA Security", passScorePercentage: 70 },
  { id: 4, lessonId: 4, titleAr: "اختبار الوحدة 4: التعامل الآمن مع المرفقات والبرمجيات الخبيثة", titleEn: "Quiz 4: Safe Attachments & Malware", passScorePercentage: 70 },
  { id: 5, lessonId: 6, titleAr: "اختبار الوحدة 5: حماية البيانات والنسخ الاحتياطي ومكافحة برامج الفدية", titleEn: "Quiz 5: Data Protection & Ransomware", passScorePercentage: 70 },
  { id: 6, lessonId: 7, titleAr: "اختبار الوحدة 6: الامان في الشبكات العامة والواي فاي", titleEn: "Quiz 6: Public Wi-Fi Security", passScorePercentage: 70 },
  { id: 7, lessonId: 8, titleAr: "اختبار الوحدة 7: اجراءات الاستجابة والابلاغ عند التعرض لاختراق", titleEn: "Quiz 7: Incident Response & Reporting", passScorePercentage: 70 },
];

/**
 * 35 Multiple-Choice Questions (5 Questions per Lesson Quiz)
 * Possible scores per quiz: 0%, 20%, 40%, 60%, 80%, 100%
 * Pass threshold >= 70% => requires 4/5 correct (80%) in practice.
 */
export const SEVEN_QUIZ_QUESTIONS = [
  // Quiz 1 - Phishing Detection Q1
  { id: 1, quizId: 1, questionEn: "An urgent SMS threatens bank account suspension in 2 hours and demands entering an OTP code via a link. What is the safest response?", questionAr: "وصلتك رسالة نصية عاجلة تزعم ان حسابك البنكي سيتوقف خلال ساعتين وتطلب ادخال رمز التحقق OTP في رابط مرفق. ما هو التصرف الامني الصحيح؟", optionsJson: JSON.stringify(["ادخال الرمز فورا لتجنب حظر الحساب", "ارسال الرسالة الى الاصدقاء لمعرفة ما اذا وصلهم نفس الشيء", "تجاهل الرابط والاتصال فورا بالبنك عبر رقمه الرسمي المعتمد للتاكد", "الرد على الرسالة بكلمة الغاء"]), correctOptionIndex: 2, explanationAr: "البنوك والجهات الرسمية لا تطلب ادخال رموز التحقق OTP عبر روابط خارجية في رسائل غير متوقعة. القاعدة الذهبية هي التحقق من القنوات الرسمية المستقلة.", difficulty: "beginner", order: 1 },
  // Quiz 1 - Q2
  { id: 2, quizId: 1, questionEn: "What is the primary psychological tactic used by attackers in phishing messages?", questionAr: "ما هو مؤشر الهندسة الاجتماعية الابرز الذي يعتمد عليه المهاجمون في رسائل التصيد الاحتيالي؟", optionsJson: JSON.stringify(["جودة الصور المرفقة في الرسالة", "خلق حالة استعجال وتهديد مصطنعة لدفع الضحية للتصرف دون تفكير", "استخدام نصوص طويلة جدا ومعقدة", "ارسال الرسائل في ايام العطلات فقط"]), correctOptionIndex: 1, explanationAr: "لغة الاستعجال والضغط النفسي هي السلاح الاساسي للمهاجم لسلب الضحية وقت التفكير الهادئ قبل الاستجابة.", difficulty: "beginner", order: 2 },
  // Quiz 1 - Q3 (NEW id=15)
  { id: 15, quizId: 1, questionEn: "You receive an email from support@paypal-secure-accounts.com claiming your account is locked. What is your first suspicion?", questionAr: "وصلتك رسالة بريد من support@paypal-secure-accounts.com تدعي ان حسابك معطل. ما هو اول ما يلفت انتباهك امنيا؟", optionsJson: JSON.stringify(["الرسالة صادرة من PayPal الرسمية لان الاسم مذكور", "النطاق paypal-secure-accounts.com ليس النطاق الرسمي لـ PayPal وهذا مؤشر تصيد واضح", "الرسالة آمنة لانها تحتوي على شعار PayPal", "يجب الضغط على رابط التحقق فورا للحفاظ على الحساب"]), correctOptionIndex: 1, explanationAr: "المهاجمون يسجلون نطاقات مشابهة للعلامات التجارية. النطاق الرسمي الوحيد هو paypal.com وأي نطاق آخر يعد تصيدا.", difficulty: "beginner", order: 3 },
  // Quiz 1 - Q4 (NEW id=16)
  { id: 16, quizId: 1, questionEn: "A colleague sends you a Google Drive link for an urgent document. What should you verify before clicking?", questionAr: "ارسل لك زميل رابط Google Drive لمستند عاجل. ماذا يجب ان تتحقق منه قبل الضغط على الرابط؟", optionsJson: JSON.stringify(["الضغط فورا لان المصدر معروف", "التحقق من هوية المرسل عبر قناة اتصال مستقلة كالهاتف والتاكد انه ارسله فعلا", "فتح الرابط في وضع التصفح الخاص", "اعادة توجيه الرابط لزملاء آخرين اولا"]), correctOptionIndex: 1, explanationAr: "حسابات البريد الالكتروني للزملاء قد تكون مخترقة. التحقق عبر قناة مستقلة يمنع الوقوع في فخ التصيد المستهدف.", difficulty: "intermediate", order: 4 },
  // Quiz 1 - Q5 (NEW id=17)
  { id: 17, quizId: 1, questionEn: "Which of the following is NOT a reliable indicator that an email is legitimate?", questionAr: "ايّ من المؤشرات التالية لا يُعتمد عليه دليلا كافيا على ان الرسالة الالكترونية حقيقية وآمنة؟", optionsJson: JSON.stringify(["احتواء الرسالة على شعار الشركة وتصميمها المعتاد", "وجود توقيع رقمي DKIM صالح يمكن التحقق منه", "ارسال الرسالة من نطاق مطابق تماما للجهة الرسمية", "وجود اسمك الشخصي في بداية الرسالة"]), correctOptionIndex: 0, explanationAr: "الشعارات والتصاميم يمكن نسخها بسهولة تامة. المهاجمون يصممون رسائل مطابقة بصريا للاصل. الاعتماد على المظهر وحده خطا امني شائع.", difficulty: "intermediate", order: 5 },

  // Quiz 2 - Link Inspection Q1
  { id: 3, quizId: 2, questionEn: "In the URL https://bank-saudi.com.account-verify.online/login, what is the actual root domain?", questionAr: "في الرابط التالي: https://bank-saudi.com.account-verify.online/login، ما هو النطاق الاساسي الحقيقي؟", optionsJson: JSON.stringify(["bank-saudi.com", "account-verify.online", "login", "https"]), correctOptionIndex: 1, explanationAr: "النطاق الحقيقي يقرا من اليمين الى اليسار قبل اول شرطة مائلة. هنا account-verify.online هو النطاق الفعلي، بينما bank-saudi.com مجرد نطاق فرعي مضلل.", difficulty: "beginner", order: 1 },
  // Quiz 2 - Q2
  { id: 4, quizId: 2, questionEn: "Why is the padlock icon (HTTPS) alone insufficient to prove that a website is trustworthy?", questionAr: "لماذا لا يكفي وجود علامة القفل وبروتوكول HTTPS للحكم بان الموقع آمن وموثوق؟", optionsJson: JSON.stringify(["لان HTTPS يعمل فقط على اجهزة الكمبيوتر", "لان شهادات SSL اصبحت متاحة مجانا ويمكن للمهاجمين تفعيلها بسهولة على مواقعهم المزيفة", "لان HTTPS يبطئ سرعة التصفح", "لان القفل يظهر فقط في المواقع الحكومية"]), correctOptionIndex: 1, explanationAr: "بروتوكول HTTPS يضمن فقط تشفير البيانات اثناء النقل، لكنه لا يضمن امان او نزاهة الطرف صاحب الموقع.", difficulty: "beginner", order: 2 },
  // Quiz 2 - Q3 (NEW id=18)
  { id: 18, quizId: 2, questionEn: "You receive a shortened URL in a message. What is the safest approach before opening it?", questionAr: "وصلك رابط مختصر من نوع bit.ly عبر رسالة. ما هو الاجراء الامني الصحيح قبل فتحه؟", optionsJson: JSON.stringify(["فتحه مباشرة لان مواقع اختصار الروابط موثوقة دائما", "استخدام خدمة كشف الروابط المختصرة او اضافة + لرابط bit.ly لمعرفة الوجهة الحقيقية قبل الفتح", "ارساله لاصدقاء ليفتحوه اولا", "فتحه من هاتف الجوال لانه اكثر اماناً"]), correctOptionIndex: 1, explanationAr: "الروابط المختصرة تخفي الوجهة الحقيقية وتستخدم كثيرا في حملات التصيد. اضافة + لروابط bit.ly تعرض معلومات الرابط الاصلي قبل الزيارة.", difficulty: "beginner", order: 3 },
  // Quiz 2 - Q4 (NEW id=19)
  { id: 19, quizId: 2, questionEn: "What does hovering over a link (without clicking) reveal that helps detect phishing?", questionAr: "ماذا يظهر تحريك المؤشر فوق رابط دون الضغط عليه، وكيف يساعد في كشف التصيد؟", optionsJson: JSON.stringify(["لا شيء مفيد، الرابط يبدو نفسه دائما", "الوجهة الحقيقية للرابط في شريط الحالة اسفل المتصفح مما يكشف اذا كانت تختلف عن النص المعروض", "سرعة تحميل الصفحة المتوقعة", "عدد زوار الصفحة"]), correctOptionIndex: 1, explanationAr: "نص الرابط المعروض يمكن ان يقول www.bank.com بينما الوجهة الفعلية مختلفة. تحريك الماوس يكشف الوجهة الحقيقية في شريط الحالة.", difficulty: "beginner", order: 4 },
  // Quiz 2 - Q5 (NEW id=20)
  { id: 20, quizId: 2, questionEn: "The URL www.rnicrosoft.com appears in an email. Why might this be dangerous?", questionAr: "يظهر في رسالة الرابط www.rnicrosoft.com. لماذا قد يكون هذا خطيرا؟", optionsJson: JSON.stringify(["لان microsoft لا تمتلك نطاقا رسميا", "لانه يستخدم هجوم التشابه البصري Typosquatting حيث rn تبدو مثل m في بعض الخطوط", "لان جميع روابط microsoft تبدا بـ HTTPS", "لا خطر في ذلك لان الاسم مشابه جدا للاصل"]), correctOptionIndex: 1, explanationAr: "هجوم Typosquatting يعتمد على تشابه بصري بين الاحرف مثل rn و m. الضحية تظن انها على الموقع الاصلي وتدخل بياناتها.", difficulty: "intermediate", order: 5 },

  // Quiz 3 - Account & MFA Q1
  { id: 5, quizId: 3, questionEn: "Why are authenticator apps (TOTP) significantly safer than SMS for Multi-Factor Authentication?", questionAr: "لماذا تعد تطبيقات المصادقة اكثر اماناً من رسائل SMS لتلقي رموز التحقق؟", optionsJson: JSON.stringify(["لان تطبيقات المصادقة اسرع في التثبيت", "لان رسائل SMS معرضة لهجمات تحويل الشريحة SIM Swapping والتنصت الخلوي", "لان التطبيقات لا تتطلب اي كلمة مرور نهائيا", "لان رسائل SMS تستهلك باقة الانترنت"]), correctOptionIndex: 1, explanationAr: "رسائل SMS قابلة للاعتراض عبر هجمات SIM Swapping، بينما تطبيقات TOTP تولد الرموز محليا على جهازك دون ارسالها عبر الهواء.", difficulty: "intermediate", order: 1 },
  // Quiz 3 - Q2
  { id: 6, quizId: 3, questionEn: "What is the best modern password management practice?", questionAr: "ما هي الممارسة الافضل لإدارة كلمات المرور وفق معايير الامان السيبراني الحديثة؟", optionsJson: JSON.stringify(["استخدام كلمة مرور واحدة قوية جدا لجميع الحسابات لسهولة تذكرها", "تغيير كلمة المرور يوميا الى كلمات متتالية مثل Pass1 و Pass2", "استخدام مدير كلمات مرور موثوق لإنشاء وحفظ كلمات فريدة ومعقدة لكل حساب", "حفظ جميع كلمات المرور في ملف نصي على سطح المكتب"]), correctOptionIndex: 2, explanationAr: "مدير كلمات المرور يتيح توليد وحفظ كلمات فريدة وطويلة لكل خدمة، مما يمنع انتقال الخطر عند تسرب احداها.", difficulty: "intermediate", order: 2 },
  // Quiz 3 - Q3 (NEW id=21)
  { id: 21, quizId: 3, questionEn: "What is a Credential Stuffing attack and why is reusing passwords dangerous?", questionAr: "ما هو هجوم حشو بيانات الاعتماد Credential Stuffing ولماذا يجعل اعادة استخدام كلمات المرور خطيرة؟", optionsJson: JSON.stringify(["هجوم يستهدف تسريع تحميل الصفحات", "هجوم يستخدم قوائم بيانات اعتماد مسربة من مواقع اخرى لتجربتها تلقائيا على مواقع مختلفة", "هجوم يستغل ضعف الاتصال بالانترنت", "هجوم يعتمد على تخمين الاسئلة الامنية"]), correctOptionIndex: 1, explanationAr: "عند تسرب بيانات موقع ما، يختبر المهاجمون نفس المعلومات على مئات المواقع تلقائيا. كلمة مرور فريدة لكل موقع تحصر الضرر في الموقع المخترق فقط.", difficulty: "intermediate", order: 3 },
  // Quiz 3 - Q4 (NEW id=22)
  { id: 22, quizId: 3, questionEn: "Your social media account shows a login from an unknown location. What are the first steps you should take?", questionAr: "ظهر في حسابك على التواصل الاجتماعي تسجيل دخول من موقع مجهول. ما اول خطوات يجب اتخاذها؟", optionsJson: JSON.stringify(["حذف الحساب فورا", "تغيير كلمة المرور فورا وانهاء جميع الجلسات النشطة من جهاز آخر نظيف", "ارسال رسالة لجهات الاتصال تخبرهم", "الانتظار لمعرفة ما اذا حدث شيء"]), correctOptionIndex: 1, explanationAr: "تغيير كلمة المرور وانهاء الجلسات يقطع وصول المهاجم فورا. من الضروري تنفيذ ذلك من جهاز نظيف لضمان عدم التقاط كلمة المرور الجديدة.", difficulty: "intermediate", order: 4 },
  // Quiz 3 - Q5 (NEW id=23)
  { id: 23, quizId: 3, questionEn: "What advantage do hardware security keys have over software-based authenticator apps?", questionAr: "ما الميزة الامنية التي تتفوق بها مفاتيح الامان المادية مثل YubiKey على تطبيقات المصادقة البرمجية؟", optionsJson: JSON.stringify(["انها ارخص ثمناً دائما", "تعمل بدون طاقة كهربائية", "غير قابلة للاختراق عن بعد لانها تعمل بمعايير FIDO2 ولا يمكن استنساخها او التصيد عليها", "تتوافق فقط مع اجهزة Windows"]), correctOptionIndex: 2, explanationAr: "مفاتيح FIDO2 تربط المصادقة بالنطاق الاصلي للموقع مما يجعلها محصنة ضد هجمات التصيد حتى لو ادخل المستخدم بياناته في موقع مزيف.", difficulty: "intermediate", order: 5 },

  // Quiz 4 - Attachments & Malware Q1
  { id: 7, quizId: 4, questionEn: "An email contains an attachment named Receipt.pdf.exe. What type of file is this and how dangerous is it?", questionAr: "وصلتك رسالة بريد تحتوي ملفا باسم Receipt.pdf.exe. ما هو نوع هذا الملف وما مدى خطورته؟", optionsJson: JSON.stringify(["ملف مستند PDF آمن للعرض", "ملف مضغوط يحتاج برنامج فك الضغط", "ملف تنفيذي خبيث يستغل خدعة الامتداد المزدوج ويجب عدم فتحه إطلاقا", "صورة من ايصال الشحن"]), correctOptionIndex: 2, explanationAr: "خدعة الامتداد المزدوج تخفي الامتداد الفعلي .exe خلف امتداد مزيف .pdf؛ فتحه يشغل برمجية خبيثة فورا.", difficulty: "intermediate", order: 1 },
  // Quiz 4 - Q2
  { id: 8, quizId: 4, questionEn: "When opening a Word document from an external source, a warning bar requests Enable Macros. What should you do?", questionAr: "عند فتح مستند Word وارد من مصدر غير معروف، ظهر شريط تنبيه يطلب تمكين وحدات الماكرو. ما هو الاجراء السليم؟", optionsJson: JSON.stringify(["النقر على تمكين المحتوى لعرض المستند بوضوح", "رفض تمكين الماكرو واغلاق المستند فورا وفحصه", "ارسال المستند بالبريد الى زميل ليقوم بفتحه", "ايقاف تشغيل مضاد الفيروسات ثم فتحه"]), correctOptionIndex: 1, explanationAr: "وحدات الماكرو في المستندات المكتبية تستخدم لتشغيل سكريبتات ضارة وتحميل برمجيات الفدية بمجرد تفعيلها.", difficulty: "intermediate", order: 2 },
  // Quiz 4 - Q3 (NEW id=24)
  { id: 24, quizId: 4, questionEn: "You find a USB drive in the parking lot of your company. What should you do?", questionAr: "وجدت محرك USB في مواقف السيارات الخاصة بشركتك. ما هو التصرف الامني الصحيح؟", optionsJson: JSON.stringify(["توصيله بجهاز الشركة لمعرفة محتواه واعادته لصاحبه", "تسليمه لفريق تقنية المعلومات او الامن دون توصيله باي جهاز إطلاقا", "توصيله بجهازك الشخصي لانه اقل خطرا", "رميه في سلة المهملات"]), correctOptionIndex: 1, explanationAr: "هجوم USB Drop اسلوب هندسة اجتماعية مجرب؛ المهاجمون يتركون محركات USB خبيثة تثبت برمجيات ضارة تلقائيا عند التوصيل.", difficulty: "beginner", order: 3 },
  // Quiz 4 - Q4 (NEW id=25)
  { id: 25, quizId: 4, questionEn: "Why is it important to keep your operating system and applications updated promptly?", questionAr: "لماذا من الاهمية بمكان تحديث نظام التشغيل والتطبيقات بصورة فورية عند صدور التحديثات؟", optionsJson: JSON.stringify(["لإضافة ميزات جمالية جديدة فقط", "لان التحديثات تسد الثغرات الامنية المعروفة التي تستغلها البرمجيات الخبيثة", "لتحسين سرعة الاتصال بالانترنت", "لان التحديثات تحذف الملفات غير الضرورية"]), correctOptionIndex: 1, explanationAr: "معظم الهجمات الناجحة تستغل ثغرات معروفة ومصلحة في التحديثات. التاخر في التحديث يجعل جهازك هدفا سهلا.", difficulty: "beginner", order: 4 },
  // Quiz 4 - Q5 (NEW id=26)
  { id: 26, quizId: 4, questionEn: "A pop-up claims your computer is infected. Download the security tool now to clean it. What should you do?", questionAr: "ظهرت نافذة منبثقة على موقع ويب تقول: جهازك مصاب! حمّل اداة الامان الآن لتنظيفه. ماذا تفعل؟", optionsJson: JSON.stringify(["تحميل الاداة فورا لحماية جهازك", "الضغط على موافق لاغلاق التنبيه", "اغلاق المتصفح او التبويب كاملا دون الضغط على اي شيء داخل النافذة", "ادخال رقم بطاقة الائتمان لشراء النسخة المدفوعة"]), correctOptionIndex: 2, explanationAr: "هذا النوع من النوافذ يسمى Scareware وهو مزيف تماما ومصمم لإخافتك لتحميل برمجية خبيثة فعلية. اغلق التبويب مباشرة دون الضغط على اي زر.", difficulty: "beginner", order: 5 },

  // Quiz 5 - Data Protection & Ransomware Q1
  { id: 9, quizId: 5, questionEn: "What is the 3-2-1 backup strategy for ransomware resilience?", questionAr: "ما هي قاعدة 3-2-1 المعتمدة في النسخ الاحتياطي ومكافحة برامج الفدية؟", optionsJson: JSON.stringify(["نسخ البيانات 3 مرات يوميا في ساعتين مختلفتين", "الاحتفاظ بـ 3 نسخ من البيانات على وسيطين تخزين مختلفين مع نسخة واحدة معزولة خارج الموقع", "تشفير البيانات بـ 3 مفاتيح في مكانين مختلفين خلال شهر واحد", "تقسيم الملفات الكبيرة الى 3 اجزاء مضغوطة"]), correctOptionIndex: 1, explanationAr: "قاعدة 3-2-1 تضمن وجود 3 نسخ على نوعين مختلفين من وسائط التخزين مع نسخة واحدة معزولة عن الشبكة لمنع تشفيرها عند الهجوم.", difficulty: "intermediate", order: 1 },
  // Quiz 5 - Q2
  { id: 10, quizId: 5, questionEn: "If your computer is infected with Ransomware and your files are encrypted, what is the best course of action?", questionAr: "اذا تعرض جهازك لهجوم برنامج الفدية وتم تشفير الملفات، ما هو التصرف الانسب؟", optionsJson: JSON.stringify(["دفع الفدية المطلوبة فورا عبر العملات الرقمية", "عزل الجهاز عن الشبكة فورا والاستعانة بالنسخ الاحتياطية النظيفة دون دفع الفدية", "نشر اعلان للمساعدة على منصات التواصل الاجتماعي", "اعادة تسمية الملفات المشفرة يدويا"]), correctOptionIndex: 1, explanationAr: "دفع الفدية لا يضمن استرجاع البيانات ويموّل الجريمة؛ الحل هو عزل الجهاز فورا واستعادة البيانات من نسخ احتياطية معزولة وسليمة.", difficulty: "intermediate", order: 2 },
  // Quiz 5 - Q3 (NEW id=27)
  { id: 27, quizId: 5, questionEn: "Why must backup copies be stored offline to be effective against ransomware?", questionAr: "لماذا يجب ان تكون نسخة احتياطية واحدة على الاقل معزولة تماما عن الشبكة لحماية فعالة من برامج الفدية؟", optionsJson: JSON.stringify(["لان الشبكة تبطئ عملية النسخ الاحتياطي", "لان برامج الفدية تمتد عبر الشبكة وتشفر النسخ المتصلة بها ايضا قبل ان تتم الاستجابة", "لتوفير تكاليف الكهرباء", "لان البيانات المحلية اكثر اماناً من السحابية دائما"]), correctOptionIndex: 1, explanationAr: "برامج الفدية الحديثة تبحث عن محركات الشبكة والنسخ المتصلة وتشفرها ايضا. النسخة المعزولة Air-Gapped هي الضمان الوحيد للاستعادة.", difficulty: "intermediate", order: 3 },
  // Quiz 5 - Q4 (NEW id=28)
  { id: 28, quizId: 5, questionEn: "What is the correct way to verify that a backup is actually working and restorable?", questionAr: "ما الطريقة الصحيحة للتحقق من ان النسخة الاحتياطية تعمل فعلا ويمكن استعادتها عند الحاجة؟", optionsJson: JSON.stringify(["الاطمئنان لظهور رسالة تم النسخ بنجاح", "اجراء اختبار استعادة فعلي بصفة دورية والتاكد من سلامة البيانات المستعادة", "حجم ملف النسخة الاحتياطية يكفي كدليل", "التحقق يكفي في اول مرة فقط"]), correctOptionIndex: 1, explanationAr: "النسخة الاحتياطية التي لم تختبر هي مجرد افتراض. الاختبار الدوري للاستعادة هو الضمان الوحيد لسلامتها.", difficulty: "intermediate", order: 4 },
  // Quiz 5 - Q5 (NEW id=29)
  { id: 29, quizId: 5, questionEn: "Encrypting sensitive data before storing it in the cloud provides which security benefit?", questionAr: "تشفير بياناتك الحساسة قبل رفعها الى السحابة يوفر اي ميزة امنية؟", optionsJson: JSON.stringify(["يجعل الملفات اصغر حجما", "يمنع موفر الخدمة السحابية او المهاجم من قراءة بياناتك حتى لو حصل على الملفات", "يسرع سرعة الرفع والتحميل", "يجعل الملفات متاحة للجميع"]), correctOptionIndex: 1, explanationAr: "التشفير من جانب العميل Client-Side Encryption يضمن ان البيانات تصل الى السحابة مشفرة بمفتاح تملكه انت فقط.", difficulty: "intermediate", order: 5 },

  // Quiz 6 - Public Wi-Fi Q1
  { id: 11, quizId: 6, questionEn: "What is the primary cyber threat when connecting to an open unencrypted Wi-Fi in a public cafe?", questionAr: "ما هو الخطر الاكبر عند استخدام شبكة واي فاي مفتوحة بدون تشفير في مقهى عام؟", optionsJson: JSON.stringify(["نفاد بطارية الهاتف بسرعة اكبر", "هجمات الرجل في المنتصف MitM والتنصت على حزم البيانات المنقولة", "بطء تحميل الصور", "ظهور اعلانات اكثر في المتصفح"]), correctOptionIndex: 1, explanationAr: "الشبكات العامة تفتقر للتشفير مما يتيح للمهاجمين على نفس الشبكة اعتراض البيانات غير المشفرة وسرقة الجلسات.", difficulty: "beginner", order: 1 },
  // Quiz 6 - Q2
  { id: 12, quizId: 6, questionEn: "What is the most effective tool to secure your internet traffic when forced to use public Wi-Fi?", questionAr: "ما هي الوسيلة الافضل لحماية اتصالاتك وبياناتك عند الضرورة القصوى للاتصال بشبكة عامة؟", optionsJson: JSON.stringify(["خفض سطوع شاشة الجهاز", "استخدام شبكة خاصة افتراضية موثوقة VPN لتشفير كامل حركة البيانات", "مسح سجل التصفح بعد الانتهاء", "فتح المواقع في وضع التصفح المتخفي Incognito فقط"]), correctOptionIndex: 1, explanationAr: "خدمة الـ VPN تنشئ نفقا مشفرا من جهازك الى الانترنت مما يمنع اي متطفل على الشبكة العامة من اعتراض بياناتك.", difficulty: "beginner", order: 2 },
  // Quiz 6 - Q3 (NEW id=30)
  { id: 30, quizId: 6, questionEn: "What is an Evil Twin Wi-Fi attack and how can you protect yourself?", questionAr: "ما هو هجوم التوام الشرير Evil Twin على الواي فاي وكيف تحمي نفسك منه؟", optionsJson: JSON.stringify(["هجوم يستغل ضعف كلمة مرور الراوتر المنزلي فقط", "انشاء نقطة وصول مزيفة تحمل اسم شبكة حقيقية لخداع المستخدمين للاتصال بها والحماية تكون باستخدام VPN", "هجوم يتطلب معرفة كلمة المرور الحالية للشبكة", "نوع من الفيروسات يصيب الراوتر"]), correctOptionIndex: 1, explanationAr: "المهاجم ينشئ شبكة بنفس اسم الشبكة الشرعية بقوة اشارة اعلى فيتصل الجهاز بها تلقائيا. VPN يشفر حركة البيانات ويحمي من هذا الهجوم.", difficulty: "intermediate", order: 3 },
  // Quiz 6 - Q4 (NEW id=31)
  { id: 31, quizId: 6, questionEn: "Which of the following activities is MOST risky to perform on an open public Wi-Fi?", questionAr: "اي من الانشطة التالية يعد الاخطر عند استخدام شبكة واي فاي عامة مفتوحة؟", optionsJson: JSON.stringify(["مشاهدة فيديو على يوتيوب", "قراءة المقالات العامة على الانترنت", "تسجيل الدخول الى الحساب البنكي او البريد الالكتروني دون VPN", "مزامنة الساعة الرقمية"]), correctOptionIndex: 2, explanationAr: "تسجيل الدخول الى الحسابات الحساسة على شبكة مفتوحة يعرض بيانات الاعتماد لخطر الاختراق. الانشطة العامة التي لا تتطلب تسجيل دخول اقل خطورة.", difficulty: "beginner", order: 4 },
  // Quiz 6 - Q5 (NEW id=32)
  { id: 32, quizId: 6, questionEn: "Does using Incognito mode protect you from network eavesdropping on public Wi-Fi?", questionAr: "هل وضع التصفح المتخفي Incognito يحميك من التنصت على حركة بياناتك في شبكة عامة؟", optionsJson: JSON.stringify(["نعم يخفي كل نشاطك عن الشبكة", "نعم يشفر بياناتك تلقائيا", "لا وضع التصفح المتخفي يمنع حفظ السجل والكوكيز محليا فقط ولا يشفر حركة البيانات عبر الشبكة", "نعم اذا كان المتصفح حديثا"]), correctOptionIndex: 2, explanationAr: "وضع التصفح المتخفي يعمل على مستوى المتصفح فقط ويحذف السجل والكوكيز. لكنه لا يضيف اي تشفير للشبكة فحركة بياناتك لا تزال مرئية للمتنصتين.", difficulty: "beginner", order: 5 },

  // Quiz 7 - Incident Response Q1
  { id: 13, quizId: 7, questionEn: "What is the very first immediate containment step upon suspecting malware or breach on your machine?", questionAr: "ما هي الخطوة الفورية الاولى الواجب اتخاذها عند الاشتباه باختراق جهازك او اصابته ببرمجية خبيثة؟", optionsJson: JSON.stringify(["ايقاف تشغيل الجهاز وفصل الكهرباء فورا", "عزل الجهاز عن الشبكة فورا بفصل كابل الانترنت وايقاف الواي فاي لمنع انتشار التهديد", "مسح جميع الملفات من الجهاز", "فتح برامج اضافية لمعرفة ما اذا كانت تعمل"]), correctOptionIndex: 1, explanationAr: "عزل الجهاز فورا عن الشبكة يمنع المهاجم من التوسع او سحب البيانات مع الحفاظ على الجهاز قيد التشغيل لحفظ الادلة في الذاكرة المؤقتة.", difficulty: "intermediate", order: 1 },
  // Quiz 7 - Q2
  { id: 14, quizId: 7, questionEn: "From where should you change credentials of compromised accounts?", questionAr: "من اين يجب تغيير كلمات مرور الحسابات التي يشتبه في تعرضها للاختراق؟", optionsJson: JSON.stringify(["من نفس الجهاز المشتبه به وباسرع وقت", "من جهاز آخر نظيف وموثوق تماما", "لا داعي لتغييرها اذا كان الحساب يعمل", "عبر الاتصال بالدعم الفني بالهاتف فقط"]), correctOptionIndex: 1, explanationAr: "اذا تم تغيير كلمة المرور من الجهاز المخترق فقد يلتقط المهاجم كلمة المرور الجديدة عبر Keyloggers لذا يجب التغيير من جهاز آمن ونظيف.", difficulty: "intermediate", order: 2 },
  // Quiz 7 - Q3 (NEW id=33)
  { id: 33, quizId: 7, questionEn: "Why should you NOT turn off a compromised device immediately when investigating a breach?", questionAr: "لماذا ينصح بعدم ايقاف تشغيل الجهاز المخترق فورا عند البدء في التحقيق الجنائي الرقمي؟", optionsJson: JSON.stringify(["لان ايقاف التشغيل يصعّب ايجاد الفيروس لاحقا", "لان ذاكرة الوصول العشوائي RAM تحتوي ادلة مهمة كعمليات جارية وجلسات مشفرة تفقد عند الايقاف", "لان الجهاز يحتاج وقتا لإتمام عمليات النسخ الاحتياطي", "لان الايقاف قد يتلف القرص الصلب"]), correctOptionIndex: 1, explanationAr: "ذاكرة RAM تحتوي معلومات حيوية: العمليات الجارية والاتصالات النشطة ومفاتيح التشفير. التحقيق الجنائي يستخرجها اولا قبل الايقاف.", difficulty: "intermediate", order: 3 },
  // Quiz 7 - Q4 (NEW id=34)
  { id: 34, quizId: 7, questionEn: "To which entity should a cybersecurity incident be reported first within an organization?", questionAr: "الى اي جهة يجب الابلاغ عن حادثة امنية سيبرانية اولا داخل المنظمة؟", optionsJson: JSON.stringify(["نشرها على وسائل التواصل الاجتماعي للتوعية", "فريق الامن السيبراني او مسؤول الحوادث الامنية فورا عبر القناة الرسمية المحددة في السياسة", "ارسال بريد الكتروني لجميع الموظفين", "الاتصال بالشرطة قبل الابلاغ الداخلي"]), correctOptionIndex: 1, explanationAr: "الابلاغ الداخلي الفوري لفريق الامن يتيح الاحتواء السريع. الابلاغ الخارجي للجهات الرقابية يأتي بعد ذلك وفق المتطلبات القانونية.", difficulty: "beginner", order: 4 },
  // Quiz 7 - Q5 (NEW id=35)
  { id: 35, quizId: 7, questionEn: "After recovering from a ransomware attack, what is the most important step BEFORE reconnecting restored systems to the network?", questionAr: "بعد التعافي من هجوم برنامج الفدية، ما اهم خطوة يجب اتخاذها قبل اعادة توصيل الانظمة المستعادة بالشبكة؟", optionsJson: JSON.stringify(["اعادة تثبيت نفس البرامج القديمة بسرعة لاستئناف العمل", "فحص جميع الانظمة المستعادة للتاكد من ازالة الثغرة الاصلية وعدم وجود بوابات خلفية Backdoors", "تحديث شعار الشركة على المنصات الرسمية", "ابلاغ العملاء قبل اي خطوة اخرى"]), correctOptionIndex: 1, explanationAr: "اعادة التوصيل دون معالجة السبب الجذري تعني امكانية تكرار الهجوم فورا. يجب ازالة الثغرة المستغلة واي بوابات خلفية زرعها المهاجم قبل الرجوع للانتاج.", difficulty: "intermediate", order: 5 },
];

/**
 * Seed quizzes and questions idempotently into SQLite.
 */
export async function seedInitialQuizzes() {
  const db = await getDb();
  if (!db) return;

  try {
    for (const qz of SEVEN_LESSON_QUIZZES) {
      const actualLessonId = qz.lessonId;

      const existing = await db.select().from(quizzes).where(eq(quizzes.id, qz.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(quizzes).values({
          id: qz.id,
          lessonId: actualLessonId,
          titleAr: qz.titleAr,
          titleEn: qz.titleEn,
          passScorePercentage: qz.passScorePercentage,
        });
      } else if (actualLessonId && existing[0].lessonId !== actualLessonId) {
        await db.update(quizzes).set({ lessonId: actualLessonId }).where(eq(quizzes.id, qz.id));
      }
    }

    for (const q of SEVEN_QUIZ_QUESTIONS) {
      const existing = await db.select().from(quizQuestions).where(eq(quizQuestions.id, q.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(quizQuestions).values({
          id: q.id,
          quizId: q.quizId,
          questionAr: q.questionAr,
          questionEn: q.questionEn,
          optionsJson: q.optionsJson,
          correctOptionIndex: q.correctOptionIndex,
          explanationAr: q.explanationAr,
          difficulty: q.difficulty,
          order: q.order,
        });
      }
    }
  } catch (err) {
    console.warn("[QuizService] seedInitialQuizzes warning:", err);
  }
}

/**
 * Get quiz details by lessonId or quizId
 */
export async function getQuizByLessonOrId(params: { lessonId?: number; quizId?: number }) {
  const db = await getDb();
  await seedInitialQuizzes();

  let targetQuiz: Quiz | undefined;
  if (db) {
    if (params.lessonId) {
      const res = await db.select().from(quizzes).where(eq(quizzes.lessonId, params.lessonId)).limit(1);
      targetQuiz = res[0];
      if (!targetQuiz) {
        const [les] = await db.select().from(lessons).where(eq(lessons.id, params.lessonId)).limit(1);
        if (les) {
          const res2 = await db.select().from(quizzes).where(eq(quizzes.id, les.order)).limit(1);
          targetQuiz = res2[0];
        }
      }
    } else if (params.quizId) {
      const res = await db.select().from(quizzes).where(eq(quizzes.id, params.quizId)).limit(1);
      targetQuiz = res[0];
    }
  }

  if (!targetQuiz) {
    targetQuiz = SEVEN_LESSON_QUIZZES.find(
      (q) => (params.lessonId && q.lessonId === params.lessonId) || (params.quizId && q.id === params.quizId)
    ) as any;
  }

  if (!targetQuiz) {
    throw new Error("الاختبار المطلوب غير موجود في النظام");
  }

  return targetQuiz;
}

export interface SanitizedQuizQuestion {
  id: number;
  quizId: number;
  questionAr: string;
  questionEn: string | null;
  options: string[];
  order: number;
  difficulty: string;
}

/**
 * Get quiz questions.
 * When sanitizeForStudent is true, strips correctOptionIndex and explanationAr.
 */
export async function getQuizQuestionsList(quizId: number, sanitizeForStudent: true): Promise<SanitizedQuizQuestion[]>;
export async function getQuizQuestionsList(quizId?: number, sanitizeForStudent?: false): Promise<QuizQuestion[]>;
export async function getQuizQuestionsList(quizId: number = 1, sanitizeForStudent: boolean = false): Promise<SanitizedQuizQuestion[] | QuizQuestion[]> {
  const db = await getDb();
  await seedInitialQuizzes();

  let list: QuizQuestion[] = [];
  if (db) {
    try {
      list = await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId)).orderBy(quizQuestions.order);
    } catch (err) {
      console.warn("[QuizService] DB questions fetch fallback:", err);
    }
  }

  if (list.length === 0) {
    list = SEVEN_QUIZ_QUESTIONS.filter((q) => q.quizId === quizId) as any;
    if (list.length === 0) {
      list = SEVEN_QUIZ_QUESTIONS.filter((q) => q.quizId === 1) as any;
    }
  }

  if (sanitizeForStudent) {
    return list.map((q) => {
      let options: string[] = [];
      try {
        options = JSON.parse(q.optionsJson);
      } catch {
        options = [];
      }
      return {
        id: q.id,
        quizId: q.quizId,
        questionAr: q.questionAr,
        questionEn: q.questionEn,
        options,
        order: q.order,
        difficulty: q.difficulty,
      };
    });
  }

  return list;
}

/**
 * Submit answers, grade on the server, prevent duplicate score inflation, and record attempt.
 */
export async function submitQuizAnswers(params: {
  userId: number;
  quizId: number;
  answers: Array<{ questionId: number; selectedOptionIndex: number }>;
}): Promise<{
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  passed: boolean;
  isFirstPass: boolean;
  results: Array<{
    questionId: number;
    questionAr: string;
    isCorrect: boolean;
    selectedOptionIndex: number;
    correctOptionIndex: number;
    explanationAr: string;
  }>;
}> {
  const { userId, quizId, answers } = params;
  const db = await getDb();
  await seedInitialQuizzes();

  const questions = await getQuizQuestionsList(quizId, false);
  if (questions.length === 0) {
    throw new Error("لا توجد اسئلة مسجلة لهذا الاختبار");
  }

  let correctCount = 0;
  const results: Array<{
    questionId: number;
    questionAr: string;
    isCorrect: boolean;
    selectedOptionIndex: number;
    correctOptionIndex: number;
    explanationAr: string;
  }> = [];

  for (const q of questions) {
    const userAns = answers.find((a) => a.questionId === q.id);
    const selectedOptionIndex = userAns !== undefined ? userAns.selectedOptionIndex : -1;
    const isCorrect = selectedOptionIndex === q.correctOptionIndex;
    if (isCorrect) correctCount++;

    results.push({
      questionId: q.id,
      questionAr: q.questionAr,
      isCorrect,
      selectedOptionIndex,
      correctOptionIndex: q.correctOptionIndex,
      explanationAr: q.explanationAr || "راجع المفاهيم الامنية في الدرس",
    });

    if (!isCorrect && db) {
      try {
        await db.insert(weaknesses).values({
          userId,
          category: q.questionAr.includes("رابط") ? "urls" : q.questionAr.includes("كلمة") ? "passwords" : "phishing",
          severity: "medium",
          detectedFrom: "quiz",
          details: "خطا في اجابة السؤال: " + q.questionAr.slice(0, 60) + "...",
        });
      } catch (err) {
        // Ignored
      }
    }
  }

  const totalQuestions = questions.length;
  const scorePercentage = Math.round((correctCount / Math.max(1, totalQuestions)) * 100);
  const passed = scorePercentage >= 70;

  let isFirstPass = false;
  if (db && passed) {
    try {
      const previousPasses = await db
        .select()
        .from(quizAttempts)
        .where(and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId), eq(quizAttempts.passed, true)))
        .limit(1);
      isFirstPass = previousPasses.length === 0;
    } catch (err) {
      isFirstPass = true;
    }
  }

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

    if (isFirstPass) {
      try {
        const userScoreRes = await db.select().from(awarenessScores).where(eq(awarenessScores.userId, userId)).limit(1);
        if (userScoreRes.length > 0) {
          const current = userScoreRes[0];
          const newScore = Math.min(100, current.currentScore + 5);
          await db
            .update(awarenessScores)
            .set({ currentScore: newScore, improvementDelta: newScore - current.initialScore })
            .where(eq(awarenessScores.id, current.id));
        }
      } catch (err) {
        console.warn("[QuizService] Awareness score update fallback:", err);
      }
    }
  }

  return { totalQuestions, correctAnswers: correctCount, scorePercentage, passed, isFirstPass, results };
}

const LESSON_METADATA: Record<number, { titleAr: string; slug: string }> = {
  1: { titleAr: "كيف تكتشف رسائل التصيد والاحتيال؟", slug: "how-to-detect-phishing" },
  2: { titleAr: "اقرأ الرابط قبل أن تنقر: التحليل التركيبي للروابط", slug: "safe-link-inspection" },
  3: { titleAr: "حماية الحسابات والمصادقة متعددة العوامل (MFA)", slug: "account-protection-mfa" },
  4: { titleAr: "التعامل الآمن مع المرفقات والبرمجيات الخبيثة", slug: "attachments-malware-awareness" },
  6: { titleAr: "حماية البيانات والنسخ الاحتياطي ومكافحة برامج الفدية", slug: "data-protection-backup" },
  7: { titleAr: "الأمان في الشبكات العامة والواي فاي المجاني", slug: "public-wifi-network-security" },
  8: { titleAr: "إجراءات الاستجابة والإبلاغ عند التعرض لاختراق", slug: "incident-reporting-response" },
};

/**
 * Get user quiz status across all 7 lessons
 */
export async function getUserQuizzesProgress(userId?: number) {
  const db = await getDb();
  await seedInitialQuizzes();

  const progressList = SEVEN_LESSON_QUIZZES.map((qz) => ({
    quizId: qz.id,
    lessonId: qz.lessonId,
    titleAr: qz.titleAr,
    lessonTitleAr: LESSON_METADATA[qz.lessonId]?.titleAr || "",
    lessonSlug: LESSON_METADATA[qz.lessonId]?.slug || "",
    passScorePercentage: qz.passScorePercentage,
    hasAttempted: false,
    isPassed: false,
    bestScore: 0,
    attemptsCount: 0,
  }));

  if (!userId || !db) {
    return progressList;
  }

  try {
    const userAttempts = await db.select().from(quizAttempts).where(eq(quizAttempts.userId, userId));
    for (const item of progressList) {
      const attempts = userAttempts.filter((a) => a.quizId === item.quizId);
      if (attempts.length > 0) {
        item.hasAttempted = true;
        item.attemptsCount = attempts.length;
        item.bestScore = Math.max(...attempts.map((a) => a.scorePercentage));
        item.isPassed = attempts.some((a) => a.passed || a.scorePercentage >= item.passScorePercentage);
      }
    }
  } catch (err) {
    console.warn("[QuizService] getUserQuizzesProgress fallback:", err);
  }

  return progressList;
}
