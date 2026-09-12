import { getDb } from "../db";
import { analyzerLogs } from "../../drizzle/schema";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export type FindingIndicator = {
  titleAr: string;
  detailAr: string;
  weight: number;
  severity: "low" | "medium" | "high" | "critical";
};

export type AnalysisResult = {
  riskScore: number;
  riskLevel: RiskLevel;
  labelAr: string;
  summaryAr: string;
  findings: FindingIndicator[];
  recommendedActionAr: string;
  relatedLessonSlug: string;
};

/**
 * Calculate Risk Level and Label from numeric risk score
 */
export function getRiskLevelFromScore(score: number): { level: RiskLevel; labelAr: string } {
  if (score >= 75) return { level: "critical", labelAr: "مخاطر حرجة عالية جداً" };
  if (score >= 50) return { level: "high", labelAr: "مؤشرات خطر مرتفعة" };
  if (score >= 20) return { level: "medium", labelAr: "يحتاج تحقق وحذر إضافي" };
  return { level: "low", labelAr: "مؤشرات تركيبية منخفضة" };
}

/**
 * Safe Static URL Risk Analyzer (Zero network execution)
 */
export async function analyzeUrlStatic(rawUrl: string, userId?: number): Promise<AnalysisResult> {
  const urlText = rawUrl.trim();
  if (!urlText) {
    return {
      riskScore: 0,
      riskLevel: "low",
      labelAr: "بانتظار الإدخال",
      summaryAr: "أدخل رابطاً تدريبياً لفحص المؤشرات التركيبية دون فتحه أو الاتصال بالشبكة.",
      findings: [],
      recommendedActionAr: "أدخل رابطاً للتحليل",
      relatedLessonSlug: "safe-link-inspection",
    };
  }

  const findings: FindingIndicator[] = [];
  let parsedUrl: URL | null = null;

  try {
    parsedUrl = new URL(urlText.includes("://") ? urlText : `https://${urlText}`);
  } catch {
    findings.push({
      titleAr: "بنية الرابط غير مكتملة أو مشوهة",
      detailAr: "تعذر تحليل المكونات الأساسية للرابط بشكل قياسي. تحقق من صحة النص قبل استخدامه.",
      weight: 15,
      severity: "medium",
    });
  }

  const lower = urlText.toLowerCase();

  // 1. Protocol check
  if (parsedUrl && parsedUrl.protocol !== "https:") {
    findings.push({
      titleAr: "الاتصال غير مشفر (HTTP بدل HTTPS)",
      detailAr: "الرابط يستخدم بروتوكول HTTP غير المشفر، مما يحرم الاتصال من طبقة حماية النقل SSL/TLS.",
      weight: 25,
      severity: "high",
    });
  }

  // 2. Direct IP check
  if (parsedUrl && /^(\d{1,3}\.){3}\d{1,3}$/.test(parsedUrl.hostname)) {
    findings.push({
      titleAr: "استخدام عنوان IP مباشر بدل اسم النطاق",
      detailAr: "استخدام عنوان IP صريح يخفي اسم الشركة أو الجهة المسجلة، وهو أسلوب شائع في خوادم الهجوم المؤقتة.",
      weight: 25,
      severity: "high",
    });
  }

  // 3. Punycode check (IDN Homograph attack)
  if (parsedUrl && parsedUrl.hostname.includes("xn--")) {
    findings.push({
      titleAr: "نطاق بترميز دولي (Punycode xn--)",
      detailAr: "وجود xn-- قد يُستخدم لاستبدال الحروف باللغة اللاتينية بحروف متشابهة من أبجديات أخرى للتضليل (Homograph Attack).",
      weight: 20,
      severity: "high",
    });
  }

  // 4. Excessive Subdomains
  if (parsedUrl && parsedUrl.hostname.split(".").length > 3) {
    findings.push({
      titleAr: "عدد كبير من النطاقات الفرعية",
      detailAr: "كثرة النطاقات الفرعية تُستخدم في الغالب لتمويه اسم النطاق المسجل الحقيقي وجعل المستخدم يقرأ الكلمة الأولى فقط.",
      weight: 18,
      severity: "medium",
    });
  }

  // 5. URL Shorteners
  if (/bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|is\.gd|buff\.ly/i.test(lower)) {
    findings.push({
      titleAr: "رابط مختصر يخفي الوجهة النهائية",
      detailAr: "الروابط المختصرة تخفي اسم النطاق الأصلي؛ لا تفتح الرابط حتى تتأكد من المصدر أو فك الاختصار.",
      weight: 20,
      severity: "medium",
    });
  }

  // 6. Suspicious Credential / Action Keywords
  if (/login|verify|secure|update|password|bank|wallet|account|gift|claim|bonus|free|prize/i.test(lower)) {
    findings.push({
      titleAr: "كلمات جذب أو طلب إجراء حساس في مسار الرابط",
      detailAr: "وجود كلمات مرتبطة بتسجيل الدخول، التحقق، أو الهدايا في المسار يستدعي التحقق المستقل من الجهة.",
      weight: 15,
      severity: "medium",
    });
  }

  // 7. Embedded Credentials / At symbol (@)
  if (urlText.includes("@")) {
    findings.push({
      titleAr: "وجود رمز @ في الرابط",
      detailAr: "رمز @ في الروابط يمكن أن يُستخدم لتوجيه المتصفح إلى الوجهة المكتوبة بعد الرمز وتجاهل ما قبله.",
      weight: 25,
      severity: "high",
    });
  }

  const rawScore = findings.reduce((sum, item) => sum + item.weight, 0);
  const riskScore = Math.min(98, Math.max(5, rawScore > 0 ? rawScore : 5));
  const { level: riskLevel, labelAr } = getRiskLevelFromScore(riskScore);

  const summaryAr =
    riskScore >= 50
      ? "التحليل التركيبي رصد مؤشرات خطر مرتفعة في بنية هذا الرابط. يُنصح بعدم فتحه نهائياً والتحقق عبر وسيلة اتصال مستقلة."
      : riskScore >= 20
      ? "الرابط يحتوي على بعض المؤشرات التي تستدعي الحذر. تحقّق من اسم النطاق والجهة الرسمية قبل التفاعل."
      : "لم تظهر مؤشرات تركيبية مشبوهة واضحة في النص. تذكّر أن هذه ليست شهادة أمان قطعية، وكن حذراً دائمًا.";

  const recommendedActionAr =
    riskScore >= 50
      ? "تجنب فتح الرابط تماماً ولا تدخل أي بيانات شخصية أو بنكية."
      : "تحقق من اسم النطاق المسجل الحقيقي ومن القناة الرسمية المستقلة للجهة.";

  // DB Logging
  const db = await getDb();
  if (db) {
    try {
      await db.insert(analyzerLogs).values({
        userId: userId || null,
        type: "url",
        inputSnippet: urlText.slice(0, 200),
        riskScore,
        riskLevel,
        findingsJson: JSON.stringify(findings),
      });
    } catch (err) {
      console.warn("[Analyzer] DB log insertion fallback:", err);
    }
  }

  return {
    riskScore,
    riskLevel,
    labelAr,
    summaryAr,
    findings,
    recommendedActionAr,
    relatedLessonSlug: "safe-link-inspection",
  };
}

/**
 * Suspicious Message Risk Analyzer
 */
export async function analyzeMessageStatic(rawMessage: string, userId?: number): Promise<AnalysisResult> {
  const messageText = rawMessage.trim();
  if (!messageText) {
    return {
      riskScore: 0,
      riskLevel: "low",
      labelAr: "بانتظار الإدخال",
      summaryAr: "الصق رسالة تدريبية وهمية للتحليل والاستكشاف الأمني دون إرسال محتواها لخارج السيرفر.",
      findings: [],
      recommendedActionAr: "الصق نص الرسالة للتحليل",
      relatedLessonSlug: "how-to-detect-phishing",
    };
  }

  const findings: FindingIndicator[] = [];

  const checks = [
    {
      test: /عاجل|فورًا|خلال ساعة|آخر تحذير|إيقاف الحساب|urgent|immediately|action required|final notice/i,
      titleAr: "لغة استعجال وتهديد بالإيقاف",
      detailAr: "الضغط الزمني والتهديد يقللان من وقت التفكير الهادئ، وهو تكتيك أساسي في الهندسة الاجتماعية.",
      weight: 20,
      severity: "high" as const,
    },
    {
      test: /كلمة المرور|رمز التحقق|رمز الدخول|رمز OTP|password|verification code|pin/i,
      titleAr: "طلب معلومات حساسة أو رموز تحقق",
      detailAr: "الجهات الموثوقة لا تطلب رموز التحقق الشخصية أو كلمات المرور عبر رسائل غير متوقعة.",
      weight: 25,
      severity: "high" as const,
    },
    {
      test: /بطاقة|بنك|دفع|تحويل|جائزة مالية|مكافأة|غرامة|bank|payment|wallet|claim|prize/i,
      titleAr: "موضوع مالي أو مكافأة مفاجئة",
      detailAr: "الإغراءات المالية أو الإشعار بالغرامات المفاجئة من أشهر وسائل استدراج الضحايا.",
      weight: 18,
      severity: "medium" as const,
    },
    {
      test: /https?:\/\/|www\.|رابط|اضغط|click|login|verify/i,
      titleAr: "دعوة مباشرة للنقر أو تسجيل الدخول",
      detailAr: "تجنب فتح الرابط المرفق مباشرة؛ افحصه نصياً أولاً وتحقق من اسم الجهة المستقلة.",
      weight: 15,
      severity: "medium" as const,
    },
    {
      test: /مرفق|فاتورة|سيرة ذاتية|تحميل|attachment|download|zip|exe/i,
      titleAr: "إشارة إلى مرفقات أو تحميل ملفات مفاجئة",
      detailAr: "المرفقات غير المتوقعة قد تحتوي على برمجيات خبيثة أو ماكرو ضار عند الفتح.",
      weight: 18,
      severity: "medium" as const,
    },
    {
      test: /الجامعة|البنك|الدعم الفني|المدير|security team|admin|support/i,
      titleAr: "انتحال شخصية جهة موثوقة محتمل",
      detailAr: "اسم الجهة في نص الرسالة لا يثبت هويتها الفعلية. تحقق عبر وسيلة اتصال مستقلة دائماً.",
      weight: 15,
      severity: "medium" as const,
    },
  ];

  checks.forEach((c) => {
    if (c.test.test(messageText)) {
      findings.push({
        titleAr: c.titleAr,
        detailAr: c.detailAr,
        weight: c.weight,
        severity: c.severity,
      });
    }
  });

  const rawScore = findings.reduce((sum, item) => sum + item.weight, 0);
  const riskScore = Math.min(98, Math.max(5, rawScore > 0 ? rawScore : 5));
  const { level: riskLevel, labelAr } = getRiskLevelFromScore(riskScore);

  const summaryAr =
    riskScore >= 50
      ? "الرسالة تحتوي على عدة مؤشرات هندسة اجتماعية عالية الخطر (استعجال، طلب بيانات حساسة). يُنصح بعدم التفاعل والتواصل مع الجهة من مصدر رسمي."
      : riskScore >= 20
      ? "تم رصد مؤشرات حذر متوسطة. تحقّق من مصدر الرسالة وسبب التطلب قبل إتمام أي إجراء."
      : "لم تظهر مؤشرات احتيال شائعة في النص. كن حذراً دائماً وتأكد من هوية المرسل.";

  const recommendedActionAr =
    riskScore >= 50
      ? "لا ترسل أي رموز تحقق ولا تفتح أي روابط، وأبلغ عن الرسالة للجهة المختصة."
      : "تواصل مع الجهة المستقلة عبر موقعها أو رقمها المعتمد.";

  // DB Logging
  const db = await getDb();
  if (db) {
    try {
      await db.insert(analyzerLogs).values({
        userId: userId || null,
        type: "message",
        inputSnippet: messageText.slice(0, 200),
        riskScore,
        riskLevel,
        findingsJson: JSON.stringify(findings),
      });
    } catch (err) {
      console.warn("[Analyzer] DB log insertion fallback:", err);
    }
  }

  return {
    riskScore,
    riskLevel,
    labelAr,
    summaryAr,
    findings,
    recommendedActionAr,
    relatedLessonSlug: "how-to-detect-phishing",
  };
}
