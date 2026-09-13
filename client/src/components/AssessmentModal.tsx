import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trophy,
  AlertTriangle,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Target,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "initial" | "final";
  onOpenAuth?: () => void;
  onSuccess?: () => void;
}

export function AssessmentModal({
  isOpen,
  onClose,
  type,
  onOpenAuth,
  onSuccess,
}: AssessmentModalProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);

  // Queries
  const questionsQuery = trpc.assessment.getQuestions.useQuery(
    { type },
    { enabled: isOpen }
  );

  const statusQuery = trpc.assessment.getStatus.useQuery(undefined, {
    enabled: isOpen && isAuthenticated,
  });

  const submitMutation = trpc.assessment.submit.useMutation({
    onSuccess: (data) => {
      setSubmissionResult(data);
      utils.assessment.getStatus.invalidate();
      utils.learning.overview.invalidate();
      toast.success(
        type === "initial"
          ? "تم تسجيل تقييمك الأولي وتثبيت رصيد الوعي المبدئي بنجاح!"
          : "تهانينا! تم تسجيل تقييمك البعدي وحساب نسبة التحسن النهائية بنجاح!"
      );
      if (onSuccess) onSuccess();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تسليم التقييم");
    },
  });

  // Reset state when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setCurrentIndex(0);
      setSelectedAnswers({});
      setSubmissionResult(null);
    }
  }, [isOpen]);

  const questions = questionsQuery.data || [];
  const status = statusQuery.data;
  const currentQuestion = questions[currentIndex];

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (submissionResult) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!isAuthenticated) {
      toast.error("يرجى تسجيل الدخول لحفظ نتائج تقييمك");
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (type === "final" && status && !status.canTakePostAssessment) {
      toast.error("لم تستوفِ بعد جميع متطلبات المسار لخوض التقييم البعدي");
      return;
    }

    const answersPayload = questions.map((q) => ({
      questionId: q.id,
      selectedOptionIndex: selectedAnswers[q.id] ?? -1,
    }));

    if (answersPayload.some((a) => a.selectedOptionIndex === -1)) {
      toast.error("يرجى الإجابة على جميع الأسئلة قبل تسليم التقييم");
      return;
    }

    submitMutation.mutate({
      type,
      answers: answersPayload,
    });
  };

  const isInitial = type === "initial";
  const title = isInitial
    ? "تقييم الوعي الأولي (Pre-Assessment)"
    : "التقييم البعدي النهائي (Post-Assessment)";
  const description = isInitial
    ? "3 أسئلة تشخيصية سريعة لتحديد نقطة انطلاقك وبناء خطتك التدريبية وتثبيت درجتك المبدئية."
    : "التقييم الشامل لقياس الكفاءة بعد إتمام متطلبات المسار وإثبات نسبة تحسنك النهائية.";

  const progressPercentage =
    questions.length > 0
      ? Math.round(((currentIndex + 1) / questions.length) * 100)
      : 0;

  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = questions.length > 0 && answeredCount === questions.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] w-[95vw] max-w-2xl overflow-y-auto border-white/10 bg-[#0f172a] p-6 text-white sm:p-8" dir="rtl">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
              {isInitial ? <Target size={22} /> : <Trophy size={22} />}
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-white">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-5 text-slate-400">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Guest Warning */}
        {!isAuthenticated && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Lock size={16} />
              <span>يتطلب تسجيل وتثبيت نتيجة التقييم حساباً مسجلاً في المنصة.</span>
            </div>
            {onOpenAuth && (
              <Button size="sm" onClick={onOpenAuth} className="bg-amber-400 text-black hover:bg-amber-300">
                تسجيل الدخول
              </Button>
            )}
          </div>
        )}

        {/* Post-Assessment Prerequisites Gate Check */}
        {!isInitial && status && !status.canTakePostAssessment && !submissionResult && (
          <div className="mt-5 space-y-4 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-rose-300">
              <AlertTriangle size={18} />
              <span>بوابة التقييم البعدي مغلقة حالياً — المتطلبات غير مكتملة:</span>
            </div>
            <p className="text-xs text-slate-300">
              لضمان قياس أكاديمي دقيق لنسبة التحسن، يجب إتمام جميع محاور مسار التوعية أولاً:
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-black/30 p-2.5">
                <span>1. التقييم الأولي (Pre-Assessment)</span>
                <span className={status.postAssessmentPrerequisites.preAssessmentDone ? "text-emerald-400 font-bold" : "text-slate-500"}>
                  {status.postAssessmentPrerequisites.preAssessmentDone ? "✓ مكتمل" : "لم يكتمل"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-black/30 p-2.5">
                <span>2. إكمال الدروس التعليمية السبعة</span>
                <span className={status.postAssessmentPrerequisites.completedLessonsCount === 7 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                  {status.postAssessmentPrerequisites.completedLessonsCount} / 7 دروس
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-black/30 p-2.5">
                <span>3. اجتياز اختبارات الدروس السبعة (≥70%)</span>
                <span className={status.postAssessmentPrerequisites.passedQuizzesCount === 7 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                  {status.postAssessmentPrerequisites.passedQuizzesCount} / 7 اختبارات
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-black/30 p-2.5">
                <span>4. اجتياز السيناريوهات التفاعلية السبعة</span>
                <span className={status.postAssessmentPrerequisites.passedScenariosCount === 7 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                  {status.postAssessmentPrerequisites.passedScenariosCount} / 7 سيناريوهات
                </span>
              </div>
            </div>
            <Button onClick={onClose} className="w-full bg-white/10 text-white hover:bg-white/20">
              العودة لمسار التوعية لإكمال المتطلبات
            </Button>
          </div>
        )}

        {/* Results View (After Submission) */}
        {submissionResult && (
          <div className="mt-5 space-y-6 animate-in fade-in duration-300">
            <Card className="border-cyan-400/30 bg-[#1e293b]/60 text-center text-white">
              <CardContent className="p-6 sm:p-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                  <Trophy size={32} />
                </div>
                <p className="mt-4 text-xs font-bold text-cyan-300">
                  {isInitial ? "نتيجة التقييم القبلي المعتمدة" : "نتيجة التقييم البعدي والتحسن الأكاديمي"}
                </p>
                <div className="mt-2 text-3xl font-black text-white">
                  {submissionResult.scorePercentage}%
                </div>

                {isInitial ? (
                  <p className="mt-3 text-xs leading-6 text-slate-300">
                    تم تثبيت رصيد وعيك المبدئي (<span className="font-bold text-cyan-200">{submissionResult.initialScore}%</span>) كنقطة انطلاق أساسية غير قابلة للتغيير. ستكسب نقاطاً إضافية أثناء إنجاز المسار!
                  </p>
                ) : (
                  <div className="mt-4 space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-black text-emerald-300">
                      <TrendingUp size={16} />
                      <span>نسبة التحسن الرسمية: +{submissionResult.improvementDelta}%</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      الدرجة الأولية: {submissionResult.initialScore}% ← الدرجة النهائية: {submissionResult.finalScore}%
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Academic Review of Answers */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <ListChecks size={16} className="text-cyan-300" />
                <span>المراجعة الأكاديمية لإجاباتك:</span>
              </div>
              {submissionResult.results?.map((r: any, idx: number) => (
                <div
                  key={r.questionId}
                  className={`rounded-xl border p-4 text-xs ${
                    r.isCorrect
                      ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-100"
                      : "border-rose-500/30 bg-rose-950/20 text-rose-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-white">
                      السؤال {idx + 1}: {r.questionAr}
                    </div>
                    <Badge
                      variant="outline"
                      className={r.isCorrect ? "border-emerald-400/40 text-emerald-300" : "border-rose-400/40 text-rose-300"}
                    >
                      {r.isCorrect ? "إجابة صحيحة" : "إجابة خاطئة"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-slate-300">
                    <span className="font-bold text-cyan-200">الشرح الأمني: </span>
                    {r.explanationAr}
                  </p>
                </div>
              ))}
            </div>

            <Button onClick={onClose} className="w-full bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300">
              إغلاق ومتابعة مسار التعلم
            </Button>
          </div>
        )}

        {/* Assessment Question Taking View */}
        {!submissionResult && (!(!isInitial && status && !status.canTakePostAssessment)) && (
          <div className="mt-4 space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span className="text-cyan-300">
                  السؤال {currentIndex + 1} من {questions.length}
                </span>
                <span>
                  تمت الإجابة: {answeredCount} / {questions.length}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-1.5 bg-white/10" />
            </div>

            {/* Current Question */}
            {currentQuestion ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#1e293b]/40 p-5">
                  <Badge variant="outline" className="mb-3 border-cyan-400/30 text-cyan-300 text-[10px]">
                    مجال: {currentQuestion.category === "phishing" ? "التصيد الاحتيالي" : currentQuestion.category === "urls" ? "فحص الروابط" : "أمان الحسابات"}
                  </Badge>
                  <h3 className="text-base font-bold leading-7 text-white">
                    {currentQuestion.questionAr}
                  </h3>
                </div>

                {/* Options */}
                <div className="space-y-2.5">
                  {currentQuestion.options?.map((opt: string, optIdx: number) => {
                    const isSelected = selectedAnswers[currentQuestion.id] === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, optIdx)}
                        className={`flex w-full items-start gap-3 rounded-xl border p-4 text-right text-xs transition ${
                          isSelected
                            ? "border-cyan-400 bg-cyan-400/10 text-white shadow-lg shadow-cyan-400/5"
                            : "border-white/10 bg-[#1e293b]/30 text-slate-300 hover:border-white/20 hover:bg-[#1e293b]/50"
                        }`}
                      >
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                            isSelected
                              ? "border-cyan-400 bg-cyan-400 text-black"
                              : "border-white/30 text-slate-400"
                          }`}
                        >
                          {optIdx + 1}
                        </div>
                        <span className="leading-5">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                جارٍ تحميل أسئلة التقييم...
              </div>
            )}

            {/* Navigation & Submit */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="gap-1 border-white/10 text-slate-300 hover:bg-white/10"
              >
                <ChevronRight size={16} />
                السابق
              </Button>

              {currentIndex < questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={handleNext}
                  className="gap-1 bg-white/10 text-white hover:bg-white/20"
                >
                  التالي
                  <ChevronLeft size={16} />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!isAllAnswered || submitMutation.isPending}
                  className="gap-2 bg-cyan-400 font-bold text-black hover:bg-cyan-300 disabled:opacity-50"
                >
                  {submitMutation.isPending ? "جارٍ التقييم والاعتماد..." : "اعتماد وتسليم التقييم"}
                  <Sparkles size={15} />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
