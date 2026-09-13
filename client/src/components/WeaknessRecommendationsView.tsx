import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ArrowLeft,
  ShieldCheck,
  Check,
  Info,
  Target,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface WeaknessRecommendationsViewProps {
  setActive: (section: "overview" | "analyzer" | "lessons" | "quiz" | "admin") => void;
}

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  phishing: { label: "التصيد والهندسة الاجتماعية", color: "border-rose-400/30 bg-rose-400/10 text-rose-300" },
  urls: { label: "فحص الروابط والنطاقات", color: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  passwords: { label: "أمان الحسابات وكلمات المرور", color: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300" },
  malware: { label: "البرمجيات الخبيثة والمرفقات", color: "border-red-400/30 bg-red-400/10 text-red-300" },
  attachments: { label: "البرمجيات الخبيثة والمرفقات", color: "border-red-400/30 bg-red-400/10 text-red-300" },
  ransomware: { label: "برامج الفدية والنسخ الاحتياطي", color: "border-purple-400/30 bg-purple-400/10 text-purple-300" },
  protection: { label: "حماية البيانات والنسخ الاحتياطي", color: "border-purple-400/30 bg-purple-400/10 text-purple-300" },
  wifi: { label: "أمان الشبكات العامة", color: "border-blue-400/30 bg-blue-400/10 text-blue-300" },
  network: { label: "أمان الشبكات العامة", color: "border-blue-400/30 bg-blue-400/10 text-blue-300" },
  incident: { label: "إجراءات الاستجابة والإبلاغ", color: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  response: { label: "إجراءات الاستجابة والإبلاغ", color: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
};

const SOURCE_MAP: Record<string, string> = {
  assessment: "تقييم الوعي",
  quiz: "اختبار الوحدة",
  scenario: "محاكاة السيناريو",
};

export function WeaknessRecommendationsView({ setActive }: WeaknessRecommendationsViewProps) {
  const [filter, setFilter] = useState<"active" | "resolved" | "all">("active");
  const utils = trpc.useUtils();

  const weaknessesQuery = trpc.recommendation.getUserWeaknesses.useQuery({ includeResolved: true });
  const recommendationsQuery = trpc.recommendation.getUserRecommendations.useQuery();

  const resolveMutation = trpc.recommendation.resolveWeakness.useMutation({
    onSuccess: () => {
      utils.recommendation.getUserWeaknesses.invalidate();
      utils.recommendation.getUserRecommendations.invalidate();
      toast.success("تم تأكيد مراجعة نقطة الضعف بنجاح.");
    },
    onError: (err) => {
      toast.error(err.message || "تعذر تحديث حالة نقطة الضعف.");
    },
  });

  const allWeaknesses = weaknessesQuery.data || [];
  const activeWeaknesses = allWeaknesses.filter((w) => !w.resolved);
  const resolvedWeaknesses = allWeaknesses.filter((w) => w.resolved);

  const displayedWeaknesses =
    filter === "active"
      ? activeWeaknesses
      : filter === "resolved"
      ? resolvedWeaknesses
      : allWeaknesses;

  const recommendations = recommendationsQuery.data || [];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Target className="text-cyan-400" size={22} />
            سجل التحديات والتوصيات المخصصة
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            نقاط الضعف التي تم رصدها أثناء التقييمات والاختبارات، مع توصيات موجهة لدعم مسارك التعليمي.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={activeWeaknesses.length > 0 ? "border-amber-400/40 bg-amber-400/10 text-amber-300" : "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"}
          >
            {activeWeaknesses.length > 0
              ? `${activeWeaknesses.length} نقاط نشطة قيد المراجعة`
              : "لا توجد نقاط ضعف نشطة"}
          </Badge>
          {resolvedWeaknesses.length > 0 && (
            <Badge variant="outline" className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              {resolvedWeaknesses.length} تمت مراجعتها
            </Badge>
          )}
        </div>
      </div>

      {/* Recommendations Cards Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Sparkles className="text-amber-400" size={16} />
          التوصيات التعليمية الذكية المقترحة لك
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="border-white/10 bg-[#101a2d] hover:border-cyan-400/30 transition-all">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge className="border-cyan-300/20 bg-cyan-400/10 text-cyan-300 text-[11px]">
                      {rec.priority === "high" ? "أولوية مرتفعة" : "أولوية متوسطة"}
                    </Badge>
                    <span className="text-[11px] text-slate-400">وحدة تدريبية</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{rec.titleAr}</h4>
                  <p className="text-xs text-slate-300 leading-5">{rec.reasonAr}</p>
                </div>
                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => setActive("lessons")}
                    size="sm"
                    className="gap-1.5 text-xs bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300"
                  >
                    <BookOpen size={14} />
                    الانتقال للمحتوى التعليمي
                    <ArrowLeft size={13} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Weaknesses Management Card */}
      <Card className="border-white/10 bg-[#101a2d]">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
              <AlertCircle size={18} className="text-rose-400" />
              قائمة نقاط الضعف المسجلة
            </CardTitle>
            <div className="flex items-center gap-1.5 bg-[#0a1424] p-1 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => setFilter("active")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  filter === "active"
                    ? "bg-amber-400/20 text-amber-300 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                النشطة ({activeWeaknesses.length})
              </button>
              <button
                onClick={() => setFilter("resolved")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  filter === "resolved"
                    ? "bg-emerald-400/20 text-emerald-300 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                تمت مراجعتها ({resolvedWeaknesses.length})
              </button>
              <button
                onClick={() => setFilter("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  filter === "all"
                    ? "bg-cyan-400/20 text-cyan-300 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                الكل ({allWeaknesses.length})
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Informational Guidance Alert */}
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-950/20 p-3.5 flex items-start gap-3">
            <Info size={18} className="text-cyan-400 shrink-0 mt-0.5" />
            <p className="text-xs leading-5 text-slate-300">
              <span className="font-bold text-cyan-200">تنويه إرشادي: </span>
              تأكيد مراجعة نقطة الضعف يعني إقرارك بالاطلاع ومراجعة المفاهيم الأمنية المرتبطة بها، ولا يُعد بديلاً عن الممارسة الميدانية المستمرة.
            </p>
          </div>

          {displayedWeaknesses.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-[#0a1424] p-8 text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <ShieldCheck size={24} />
              </div>
              <p className="text-sm font-bold text-white">
                {filter === "active"
                  ? "سجلك نظيف! لا توجد نقاط ضعف نشطة قيد المراجعة حالياً."
                  : filter === "resolved"
                  ? "لم تقم بتأكيد مراجعة أي نقاط ضعف بعد."
                  : "لا توجد أي نقاط ضعف مسجلة في ملفك التدريبي."}
              </p>
              <p className="text-xs text-slate-400">
                استمر في خوض الدروس والاختبارات للحفاظ على وعيك الأمني بأعلى جاهزية.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedWeaknesses.map((w) => {
                const catInfo = CATEGORY_MAP[w.category] || {
                  label: w.category,
                  color: "border-white/20 bg-white/5 text-slate-300",
                };
                const sourceLabel = SOURCE_MAP[w.detectedFrom] || w.detectedFrom;

                return (
                  <div
                    key={w.id}
                    className={`rounded-xl border p-4 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      w.resolved
                        ? "border-white/5 bg-[#0a1424]/60 opacity-80"
                        : "border-white/10 bg-[#0a1424] hover:border-white/20"
                    }`}
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={`text-[11px] ${catInfo.color}`}>
                          {catInfo.label}
                        </Badge>
                        <Badge variant="outline" className="border-white/10 bg-white/5 text-slate-400 text-[11px]">
                          المصدر: {sourceLabel}
                        </Badge>
                        {w.severity === "high" && (
                          <Badge className="border-rose-400/30 bg-rose-400/10 text-rose-300 text-[10px]">
                            أولوية عالية
                          </Badge>
                        )}
                        {w.resolved ? (
                          <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[10px] gap-1">
                            <CheckCircle2 size={11} />
                            تمت المراجعة
                          </Badge>
                        ) : (
                          <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-300 text-[10px]">
                            قيد المعالجة
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 font-medium">
                        {w.details || "نقطة ضعف مسجلة أثناء التدريب الأمني"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!w.resolved ? (
                        <Button
                          onClick={() => resolveMutation.mutate({ weaknessId: w.id })}
                          disabled={resolveMutation.isPending}
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200"
                        >
                          <Check size={14} />
                          {resolveMutation.isPending ? "جارٍ التأكيد..." : "تأكيد المراجعة"}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <CheckCircle2 size={13} className="text-emerald-400" />
                          تم الاطلاع
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
