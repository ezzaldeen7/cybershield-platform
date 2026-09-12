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
  { id: 5, lessonId: 5, titleAr: "اختبار الوحدة 5: حماية البيانات والنسخ الاحتياطي ومكافحة برامج الفدية", titleEn: "Quiz 5: Data Protection & Ransomware", passScorePercentage: 70 },
  { id: 6, lessonId: 6, titleAr: "اختبار الوحدة 6: الأمان في الشبكات العامة والواي فاي", titleEn: "Quiz 6: Public Wi-Fi Security", passScorePercentage: 70 },
  { id: 7, lessonId: 7, titleAr: "اختبار الوحدة 7: إجراءات الاستجابة والإبلاغ عند التعرض لاختراق", titleEn: "Quiz 7: Incident Response & Reporting", passScorePercentage: 70 },
];

/**
 * 14 Multiple-Choice Questions (2 Questions per Lesson Quiz)
 */
export const SEVEN_QUIZ_QUESTIONS = [
  // Quiz 1 (Lesson 1: Phishing)
  {
    id: 1,
    quizId: 1,
    questionEn: "An urgent SMS threatens bank account suspension in 2 hours and demands entering an OTP code via an attached link. What is the safest response?",
    questionAr: "وصلتك رسالة نصية عاجلة تزعم أن حسابك البنكي سيتوقف خلال ساعتين وتطلب إدخال رمز التحقق OTP المرسل لهاتفك في رابط مرفق. ما هو التصرف الأمني الصحيح؟",
    optionsJson: JSON.stringify([
      "إدخال الرمز فوراً لتجنب حظر الحساب",
      "إرسال الرسالة إلى الأصدقاء لمعرفة ما إذا وصلهم نفس الشيء",
      "تجاهل الرابط والاتصال فوراً بالبنك عبر رقمه الرسمي المعتمد للتأكد",
      "الرد على الرسالة بكلمة 'إلغاء'",
    ]),
    correctOptionIndex: 2,
    explanationAr: "البنوك والجهات الرسمية لا تطلب إدخال رموز التحقق OTP عبر روابط خارجية في رسائل غير متوقعة. القاعدة الذهبية هي التحقق من القنوات الرسمية المستقلة.",
    difficulty: "beginner",
    order: 1,
  },
  {
    id: 2,
    quizId: 1,
    questionEn: "What is the primary psychological tactic used by attackers in phishing messages?",
    questionAr: "ما هو مؤشر الهندسة الاجتماعية الأبرز الذي يعتمد عليه المهاجمون في رسائل التصيد الاحتيالي؟",
    optionsJson: JSON.stringify([
      "جودة الصور المرفقة في الرسالة",
      "خلق حالة استعجال وتهديد مصطنعة لدفع الضحية للتصرف دون تفكير",
      "استخدام نصوص طويلة جداً ومعقدة",
      "إرسال الرسائل في أيام العطلات فقط",
    ]),
    correctOptionIndex: 1,
    explanationAr: "لغة الاستعجال والضغط النفسي (Urgency) هي السلاح الأساسي للمهاجم لسلب الضحية وقت التفكير الهادئ قبل الاستجابة.",
    difficulty: "beginner",
    order: 2,
  },

  // Quiz 2 (Lesson 2: Link Inspection)
  {
    id: 3,
    quizId: 2,
    questionEn: "In the URL https://bank-saudi.com.account-verify.online/login, what is the actual root domain?",
    questionAr: "في الرابط التالي: https://bank-saudi.com.account-verify.online/login، ما هو النطاق الأساسي الحقيقي (Root Domain)؟",
    optionsJson: JSON.stringify([
      "bank-saudi.com",
      "account-verify.online",
      "login",
      "https",
    ]),
    correctOptionIndex: 1,
    explanationAr: "النطاق الحقيقي يقرأ من اليمين إلى اليسار قبل أول شرطة مائلة مفردة (/). هنا account-verify.online هو النطاق الفعلي، بينما bank-saudi.com مجرد نطاق فرعي مضلل.",
    difficulty: "beginner",
    order: 1,
  },
  {
    id: 4,
    quizId: 2,
    questionEn: "Why is the padlock icon (HTTPS) alone insufficient to prove that a website is trustworthy?",
    questionAr: "لماذا لا يكفي وجود علامة القفل وبروتوكول https:// للحكم بأن الموقع آمن وموثوق؟",
    optionsJson: JSON.stringify([
      "لأن HTTPS يعمل فقط على أجهزة الكمبيوتر",
      "لأن شهادات SSL أصبحت متاحة مجاناً ويمكن للمهاجمين تفعيلها بسهولة على مواقعهم المزيفة",
      "لأن HTTPS يبطئ سرعة التصفح",
      "لأن القفل يظهر فقط في المواقع الحكومية",
    ]),
    correctOptionIndex: 1,
    explanationAr: "بروتوكول HTTPS يضمن فقط تشفير البيانات أثناء النقل لمنع التنصت، لكنه لا يضمن أمان أو نزاهة الطرف صاحب الموقع.",
    difficulty: "beginner",
    order: 2,
  },

  // Quiz 3 (Lesson 3: Account & MFA)
  {
    id: 5,
    quizId: 3,
    questionEn: "Why are authenticator apps (TOTP) significantly safer than SMS for Multi-Factor Authentication?",
    questionAr: "لماذا تُعد تطبيقات المصادقة (مثل Google Authenticator) أكثر أماناً من رسائل SMS لتلقي رموز التحقق؟",
    optionsJson: JSON.stringify([
      "لأن تطبيقات المصادقة أسرع في التثبيت",
      "لأن رسائل SMS معرضة لهجمات تحويل الشريحة (SIM Swapping) والتنصت الخلوي",
      "لأن التطبيقات لا تتطلب أي كلمة مرور نهائياً",
      "لأن رسائل SMS تستهلك باقة الإنترنت",
    ]),
    correctOptionIndex: 1,
    explanationAr: "رسائل SMS قابلة للاعتراض عبر هجمات تبديل الشريحة (SIM Swapping)، بينما تطبيقات TOTP تولد الرموز محلياً على جهازك دون إرسالها عبر الهواء.",
    difficulty: "intermediate",
    order: 1,
  },
  {
    id: 6,
    quizId: 3,
    questionEn: "What is the best modern password management practice?",
    questionAr: "ما هي الممارسة الأفضل لإدارة كلمات المرور وفق معايير الأمان السيبراني الحديثة؟",
    optionsJson: JSON.stringify([
      "استخدام كلمة مرور واحدة قوية جداً لجميع الحسابات لسهولة تذكرها",
      "تغيير كلمة المرور يومياً إلى كلمات متتالية مثل Pass1 و Pass2",
      "استخدام مدير كلمات مرور موثوق لإنشاء وحفظ كلمات فريدة ومعقدة لكل حساب",
      "حفظ جميع كلمات المرور في ملف نصي على سطح المكتب",
    ]),
    correctOptionIndex: 2,
    explanationAr: "مدير كلمات المرور (Password Manager) يتيح توليد وحفظ كلمات فريدة وطويلة لكل خدمة، مما يمنع انتقال الخطر عند تسرب إحداها.",
    difficulty: "intermediate",
    order: 2,
  },

  // Quiz 4 (Lesson 4: Attachments & Malware)
  {
    id: 7,
    quizId: 4,
    questionEn: "An email contains an attachment named Receipt.pdf.exe. What type of file is this and how dangerous is it?",
    questionAr: "وصلتك رسالة بريد تحتوي ملفاً باسم Receipt.pdf.exe. ما هو نوع هذا الملف وما مدى خطورته؟",
    optionsJson: JSON.stringify([
      "ملف مستند PDF آمن للعرض",
      "ملف مضغوط يحتاج برنامج فك الضغط",
      "ملف تنفيذي خبيث يستغل خدعة الامتداد المزدوج ويجب عدم فتحه إطلاقاً",
      "صورة من إيصال الشحن",
    ]),
    correctOptionIndex: 2,
    explanationAr: "خدعة الامتداد المزدوج (Double Extension) تُخفي الامتداد الفعلي القابل للتنفيذ .exe خلف امتداد مزيف .pdf؛ فتحه يشغل برمجية خبيثة فوراً.",
    difficulty: "intermediate",
    order: 1,
  },
  {
    id: 8,
    quizId: 4,
    questionEn: "When opening a Word document from an external source, a warning bar requests 'Enable Macros'. What should you do?",
    questionAr: "عند فتح مستند Word وارد من مصدر غير معروف، ظهر شريط تنبيه يطلب 'تمكين وحدات الماكرو' (Enable Macros). ما هو الإجراء السليم؟",
    optionsJson: JSON.stringify([
      "النقر على تمكين المحتوى لعرض المستند بوضوح",
      "رفض تمكين الماكرو وإغلاق المستند فوراً وفحصه",
      "إرسال المستند بالبريد إلى زميل ليقوم بفتحه",
      "إيقاف تشغيل مضاد الفيروسات ثم فتحه",
    ]),
    correctOptionIndex: 1,
    explanationAr: "وحدات الماكرو (VBA Macros) في المستندات المكتبية تُستخدم لتشغيل سكريبتات ضارة وتحميل برمجيات الفدية بمجرد تفعيلها؛ لا تقم بتشغيلها لأي ملف مجهول.",
    difficulty: "intermediate",
    order: 2,
  },

  // Quiz 5 (Lesson 5: Backup & Ransomware)
  {
    id: 9,
    quizId: 5,
    questionEn: "What is the 3-2-1 backup strategy for ransomware resilience?",
    questionAr: "ما هي قاعدة 3-2-1 المعتمدة في النسخ الاحتياطي ومكافحة برامج الفدية؟",
    optionsJson: JSON.stringify([
      "نسخ البيانات 3 مرات يومياً في ساعتين مختلفتين",
      "الاحتفاظ بـ 3 نسخ من البيانات، على وسيطين تخزين مختلفين، مع نسخة واحدة معزولة خارج الموقع (Offline/Offsite)",
      "تشفير البيانات بـ 3 مفاتيح في مكانين مختلفين خلال شهر واحد",
      "تقسيم الملفات الكبيرة إلى 3 أجزاء مضغوطة",
    ]),
    correctOptionIndex: 1,
    explanationAr: "قاعدة 3-2-1 تضمن وجود 3 نسخ، على نوعين مختلفين من وسائط التخزين، مع الاحتفاظ بنسخة واحدة على الأقل معزولة عن الشبكة لمنع تشفيرها عند الهجوم.",
    difficulty: "intermediate",
    order: 1,
  },
  {
    id: 10,
    quizId: 5,
    questionEn: "If your computer is infected with Ransomware and your files are encrypted, what is the best course of action?",
    questionAr: "إذا تعرض جهازك لهجوم برنامج الفدية (Ransomware) وتم تشفير الملفات، ما هو التصرف الأنسب؟",
    optionsJson: JSON.stringify([
      "دفع الفدية المطلوبة فوراً عبر العملات الرقمية",
      "عزل الجهاز عن الشبكة فوراً والاستعانة بالنسخ الاحتياطية النظيفة دون دفع الفدية",
      "نشر إعلان للمساعدة على منصات التواصل الاجتماعي",
      "إعادة تسمية الملفات المشفرة يدوياً",
    ]),
    correctOptionIndex: 1,
    explanationAr: "دفع الفدية لا يضمن استرجاع البيانات ويموّل الجريمة المنظمة؛ الحل هو عزل الجهاز فوراً واستعادة البيانات من نسخ احتياطية معزولة وسليمة مسبقاً.",
    difficulty: "intermediate",
    order: 2,
  },

  // Quiz 6 (Lesson 6: Public Wi-Fi)
  {
    id: 11,
    quizId: 6,
    questionEn: "What is the primary cyber threat when connecting to an open unencrypted Wi-Fi in a public cafe?",
    questionAr: "ما هو الخطر الأكبر عند استخدام شبكة واي فاي مفتوحة بدون تشفير في مقهى عام؟",
    optionsJson: JSON.stringify([
      "نفاد بطارية الهاتف بسرعة أكبر",
      "هجمات الرجل في المنتصف (MitM) والتنصت على حزم البيانات المنقولة",
      "بطء تحميل الصور",
      "ظهور إعلانات أكثر في المتصفح",
    ]),
    correctOptionIndex: 1,
    explanationAr: "الشبكات العامة تفتقر للتشفير بين الأجهزة ونقطة الوصول، مما يتيح للمهاجمين على نفس الشبكة اعتراض البيانات غير المشفرة وسرقة الجلسات.",
    difficulty: "beginner",
    order: 1,
  },
  {
    id: 12,
    quizId: 6,
    questionEn: "What is the most effective tool to secure your internet traffic when forced to use public Wi-Fi?",
    questionAr: "ما هي الوسيلة الأفضل لحماية اتصالاتك وبياناتك عند الضرورة القصوى للاتصال بشبكة عامة؟",
    optionsJson: JSON.stringify([
      "خفض سطوع شاشة الجهاز",
      "استخدام شبكة خاصة افتراضية موثوقة (VPN) لتشفير كامل حركة البيانات",
      "مسح سجل التصفح بعد الانتهاء",
      "فتح المواقع في وضع التصفح المتخفي (Incognito) فقط",
    ]),
    correctOptionIndex: 1,
    explanationAr: "خدمة الـ VPN تقوم بإنشاء نفق مشفر من جهازك إلى الإنترنت، مما يمنع أي متطفل على الشبكة العامة من رؤية أو اعتراض بياناتك.",
    difficulty: "beginner",
    order: 2,
  },

  // Quiz 7 (Lesson 7: Incident Response)
  {
    id: 13,
    quizId: 7,
    questionEn: "What is the very first immediate containment step upon suspecting malware or breach on your machine?",
    questionAr: "ما هي الخطوة الفورية الأولى الواجب اتخاذها عند الاشتباه باختراق جهازك أو إصابته ببرمجية خبيثة؟",
    optionsJson: JSON.stringify([
      "إيقاف تشغيل الجهاز وفصل الكهرباء فوراً",
      "عزل الجهاز عن الشبكة فوراً (فصل كابل الإنترنت وإيقاف الواي فاي) لمنع انتشار التهديد",
      "مسح جميع الملفات من الجهاز",
      "فتح برامج إضافية لمعرفة ما إذا كانت تعمل",
    ]),
    correctOptionIndex: 1,
    explanationAr: "عزل الجهاز فوراً عن الشبكة يمنع المهاجم من التوسع في الشبكة أو سحب البيانات، مع الحفاظ على الجهاز قيد التشغيل لحفظ الأدلة بالذاكرة المؤقتة (RAM).",
    difficulty: "intermediate",
    order: 1,
  },
  {
    id: 14,
    quizId: 7,
    questionEn: "From where should you change credentials of compromised accounts?",
    questionAr: "من أين يجب تغيير كلمات مرور الحسابات التي يُشتبه في تعرضها للاختراق؟",
    optionsJson: JSON.stringify([
      "من نفس الجهاز المشتبه به وبأسرع وقت",
      "من جهاز آخر نظيف وموثوق تماماً",
      "لا داعي لتغييرها إذا كان الحساب يعمل",
      "عبر الاتصال بالدعم الفني بالهاتف فقط",
    ]),
    correctOptionIndex: 1,
    explanationAr: "إذا تم تغيير كلمة المرور من الجهاز المخترق، فقد يلتقط المهاجم كلمة المرور الجديدة عبر برمجيات Keyloggers؛ لذا يجب التغيير من جهاز آمن ونظيف.",
    difficulty: "intermediate",
    order: 2,
  },
];

/**
 * Seed quizzes and questions idempotently into SQLite
 */
export async function seedInitialQuizzes() {
  const db = await getDb();
  if (!db) return;

  try {
    for (const qz of SEVEN_LESSON_QUIZZES) {
      // Find actual lesson in DB matching this quiz order
      const [les] = await db.select().from(lessons).where(eq(lessons.order, qz.id)).limit(1);
      const actualLessonId = les?.id || null;

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
        // Fallback by lesson order
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
 * When sanitizeForStudent is true, strips correctOptionIndex and explanationAr
 * to prevent client-side answer peeking in network payload.
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
      // Fallback for quizId 1
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

  // 1. Get complete questions with correct answers
  const questions = await getQuizQuestionsList(quizId, false);
  if (questions.length === 0) {
    throw new Error("لا توجد أسئلة مسجلة لهذا الاختبار");
  }

  // 2. Grade each question
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
      explanationAr: q.explanationAr || "راجع المفاهيم الأمنية في الدرس",
    });

    // Record weakness if user failed question
    if (!isCorrect && db) {
      try {
        await db.insert(weaknesses).values({
          userId,
          category: q.questionAr.includes("رابط") ? "urls" : q.questionAr.includes("كلمة") ? "passwords" : "phishing",
          severity: "medium",
          detectedFrom: "quiz",
          details: `خطأ في إجابة السؤال: ${q.questionAr.slice(0, 60)}...`,
        });
      } catch (err) {
        // Ignored in tests if weaknesses has FK or table variations
      }
    }
  }

  const totalQuestions = questions.length;
  const scorePercentage = Math.round((correctCount / Math.max(1, totalQuestions)) * 100);
  const passed = scorePercentage >= 70;

  // 3. Check if user has previously passed this quiz to PREVENT duplicate score inflation
  let isFirstPass = false;
  if (db && passed) {
    try {
      const previousPasses = await db
        .select()
        .from(quizAttempts)
        .where(
          and(
            eq(quizAttempts.userId, userId),
            eq(quizAttempts.quizId, quizId),
            eq(quizAttempts.passed, true)
          )
        )
        .limit(1);

      isFirstPass = previousPasses.length === 0;
    } catch (err) {
      isFirstPass = true;
    }
  }

  // 4. Save attempt in quiz_attempts
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

    // 5. Update user awareness score ONLY on first successful pass
    if (isFirstPass) {
      try {
        const userScoreRes = await db.select().from(awarenessScores).where(eq(awarenessScores.userId, userId)).limit(1);
        if (userScoreRes.length > 0) {
          const current = userScoreRes[0];
          const newScore = Math.min(100, current.currentScore + 5);
          await db
            .update(awarenessScores)
            .set({
              currentScore: newScore,
              improvementDelta: newScore - current.initialScore,
            })
            .where(eq(awarenessScores.id, current.id));
        }
      } catch (err) {
        console.warn("[QuizService] Awareness score update fallback:", err);
      }
    }
  }

  return {
    totalQuestions,
    correctAnswers: correctCount,
    scorePercentage,
    passed,
    isFirstPass,
    results,
  };
}

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
        item.isPassed = attempts.some((a) => a.passed);
      }
    }
  } catch (err) {
    console.warn("[QuizService] getUserQuizzesProgress fallback:", err);
  }

  return progressList;
}
