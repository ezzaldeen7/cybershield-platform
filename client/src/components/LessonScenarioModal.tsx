import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Trophy,
  ExternalLink,
  Lock,
  AlertCircle,
  ArrowRight,
  Clock3,
  Terminal,
  Smartphone,
  Globe,
  Mail,
  HardDrive,
  Wifi,
  Radio,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface LessonScenarioModalProps {
  lesson: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
  onOpenLesson?: (lesson: any) => void;
}

export function LessonScenarioModal({
  lesson,
  isOpen,
  onClose,
  onOpenAuth,
  onOpenLesson,
}: LessonScenarioModalProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // State Management: reset on open, close, or retry
  const [currentStepNumber, setCurrentStepNumber] = useState<number>(1);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [previousResponses, setPreviousResponses] = useState<
    Array<{ stepNumber: number; optionId: number }>
  >([]);
  const [intermediateStepResult, setIntermediateStepResult] = useState<any | null>(null);
  const [finalResult, setFinalResult] = useState<any | null>(null);
  const [decisionHistory, setDecisionHistory] = useState<
    Array<{ stepNumber: number; option: any; result: any }>
  >([]);

  // Query sanitized scenario (public)
  const scenarioQuery = trpc.scenario.getByLessonId.useQuery(
    { lessonId: lesson?.id },
    { enabled: !!lesson && isOpen }
  );

  // Mutation to submit decision (protected)
  const decideMutation = trpc.scenario.decide.useMutation({
    onSuccess: (res) => {
      const scenarioData = scenarioQuery.data;
      const stepObj = scenarioData?.steps.find((s) => s.stepNumber === currentStepNumber);
      const chosenOpt = stepObj?.options.find((o) => o.id === selectedOptionId);

      // Record step into local review history
      setDecisionHistory((prev) => [
        ...prev,
        {
          stepNumber: currentStepNumber,
          option: chosenOpt,
          result: res,
        },
      ]);

      if (res.isFinished) {
        // Final outcome reached (Path A, or Path B/C final step)
        setFinalResult(res);
        utils.scenario.getProgress.invalidate();
        utils.learning.getLessonsWithProgress.invalidate();
        utils.learning.overview.invalidate();

        if (res.finalSummary?.passed) {
          toast.success(
            `تهانينا! تم احتواء التهديد واجتياز المحاكاة بنسبة ${res.finalSummary.scorePercentage}%`
          );
        } else {
          toast.error(
            `انتهت المحاكاة بنسبة ${res.finalSummary?.scorePercentage || 0}% — لم يتم تحقيق نسبة الاجتياز (70%)`
          );
        }
      } else if (res.nextStepNumber) {
        // Multi-step branch: Step 1 unsafe choice leads to containment in Step 2
        setIntermediateStepResult(res);
      }
    },
    onError: (err) => {
      toast.error(err.message || "فشل تقييم القرار الأمني");
    },
  });

  // State reset function
  const handleReset = () => {
    setCurrentStepNumber(1);
    setSelectedOptionId(null);
    setPreviousResponses([]);
    setIntermediateStepResult(null);
    setFinalResult(null);
    setDecisionHistory([]);
    decideMutation.reset();
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Move from Step 1 to Step 2
  const handleProceedToStep2 = () => {
    if (selectedOptionId !== null) {
      setPreviousResponses([{ stepNumber: 1, optionId: selectedOptionId }]);
    }
    setCurrentStepNumber(2);
    setSelectedOptionId(null);
    setIntermediateStepResult(null);
  };

  // Submit decision
  const handleSubmitDecision = () => {
    // Condition 4: Guest cannot call decide; prompt auth cleanly without failing mutation
    if (!isAuthenticated) {
      toast.info("يرجى تسجيل الدخول أولاً لتسجيل قرارات المحاكاة وحفظ نقاط الوعي", {
        action: onOpenAuth
          ? {
              label: "تسجيل الدخول",
              onClick: onOpenAuth,
            }
          : undefined,
      });
      if (onOpenAuth) onOpenAuth();
      return;
    }

    const scenarioData = scenarioQuery.data;
    if (!scenarioData || selectedOptionId === null) {
      toast.warning("يرجى اختيار أحد القرارات الأمنية للمتابعة");
      return;
    }

    decideMutation.mutate({
      scenarioId: scenarioData.id,
      stepNumber: currentStepNumber,
      optionId: selectedOptionId,
      previousResponses: previousResponses.length > 0 ? previousResponses : undefined,
    });
  };

  if (!isOpen || !lesson) return null;

  const scenarioData = scenarioQuery.data;
  const currentStep = scenarioData?.steps.find((s) => s.stepNumber === currentStepNumber);

  // Helper icon by threat type
  const renderThreatIcon = (type?: string) => {
    switch (type) {
      case "phishing_sms":
        return <Smartphone className="text-amber-400" size={20} />;
      case "safe_links":
        return <Globe className="text-cyan-400" size={20} />;
      case "credential_theft":
        return <Lock className="text-purple-400" size={20} />;
      case "malware_attachment":
        return <Mail className="text-rose-400" size={20} />;
      case "ransomware_backup":
        return <HardDrive className="text-red-400" size={20} />;
      case "wifi_mitm":
        return <Wifi className="text-yellow-400" size={20} />;
      case "incident_breach":
        return <Radio className="text-blue-400" size={20} />;
      default:
        return <ShieldAlert className="text-amber-400" size={20} />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d1829] border-white/15 text-white p-0 gap-0">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-[#101e33] sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
                {renderThreatIcon(scenarioData?.threatType)}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-400/20 text-amber-300 border-amber-400/30 text-[10px] py-0.5">
                    محاكاة تفاعلية
                  </Badge>
                  <span className="text-[11px] text-slate-400">الوحدة {lesson.order}</span>
                </div>
                <DialogTitle className="text-lg font-black text-white mt-1">
                  {scenarioData?.titleAr || lesson.titleAr}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  اختبر سرعة استجابتك وقراراتك الأمنية للتعامل مع هذا التهديد في بيئة معزولة
                </DialogDescription>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleClose}
              className="h-8 w-8 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </Button>
          </div>

          {/* Guest notice banner */}
          {!isAuthenticated && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              <span className="flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0 text-amber-400" />
                أنت تشاهد المحاكاة بوضع الزائر. لتسجيل قراراتك وحصد نقاط الوعي يرجى تسجيل الدخول.
              </span>
              {onOpenAuth && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenAuth}
                  className="h-7 text-xs border-amber-400/40 text-amber-300 hover:bg-amber-400/20 font-bold"
                >
                  تسجيل الدخول
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {scenarioQuery.isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
              <p className="text-sm">جارٍ تهيئة بيئة المحاكاة التفاعلية...</p>
            </div>
          ) : scenarioQuery.isError || !scenarioData ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <AlertCircle size={32} className="mx-auto text-rose-400" />
              <p className="text-sm">لم يتم العثور على محاكاة تفاعلية مرتبطة بهذا الدرس حالياً.</p>
              <Button size="sm" variant="outline" onClick={handleClose} className="mt-2 text-xs">
                إغلاق
              </Button>
            </div>
          ) : finalResult ? (
            /* ========================================================================= */
            /* 1. Final Outcome View (Score, Passed/Failed, Points, History)            */
            /* ========================================================================= */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div
                className={`rounded-2xl border p-6 text-center ${
                  finalResult.finalSummary?.passed
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-rose-500/30 bg-rose-500/10"
                }`}
              >
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                    finalResult.finalSummary?.passed
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {finalResult.finalSummary?.passed ? <Trophy size={32} /> : <AlertTriangle size={32} />}
                </div>

                <h3 className="mt-4 text-2xl font-black text-white">
                  {finalResult.finalSummary?.passed ? "تم احتواء التهديد بنجاح!" : "فشل في احتواء التهديد"}
                </h3>

                <p className="mt-1 text-sm font-semibold">
                  {finalResult.finalSummary?.passed ? (
                    <span className="text-emerald-300">
                      نسبة الأداء الأمني: {finalResult.finalSummary?.scorePercentage}% (اجتياز معتمد)
                    </span>
                  ) : (
                    <span className="text-rose-300">
                      نسبة الأداء الأمني: {finalResult.finalSummary?.scorePercentage}% (الحد الأدنى 70%)
                    </span>
                  )}
                </p>

                {/* Risk Delta Indicator */}
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs py-1 px-3 ${
                      finalResult.finalSummary?.totalRiskDelta === 0
                        ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                        : "border-amber-500/30 text-amber-300 bg-amber-500/10"
                    }`}
                  >
                    معدل التعرض للمخاطر: +{finalResult.finalSummary?.totalRiskDelta} نقطة مخاطرة
                  </Badge>
                </div>

                {/* Points & Weakness Info */}
                <div className="mt-4 inline-block rounded-xl border border-white/10 bg-[#0a1424] px-4 py-3 text-xs w-full max-w-lg">
                  {finalResult.finalSummary?.isFirstPass ? (
                    <p className="font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                      <Sparkles size={16} />
                      + 5 نقاط وعي أمني تم منحها لحسابك لاجتيازك هذا السيناريو للمرة الأولى!
                    </p>
                  ) : finalResult.finalSummary?.passed ? (
                    <p className="text-slate-300">
                      تم تسجيل المحاولة بنجاح (لم تُمنح نقاط إضافية لمنع تضخيم النقاط بالاجتياز المتكرر).
                    </p>
                  ) : (
                    <p className="text-amber-300 flex items-center justify-center gap-1.5 font-medium">
                      <AlertCircle size={14} />
                      تم رصد وتوثيق ثغرة أمنية في سجل الوعي لتوجيه التوصيات والدروس المقترحة.
                    </p>
                  )}
                </div>
              </div>

              {/* Step by step review audit */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <FileText size={16} className="text-cyan-400" />
                  سجل القرارات والتحليل الأمني المفصل:
                </h4>

                {decisionHistory.map((h, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-4 space-y-3 ${
                      h.result.isCorrect
                        ? "border-emerald-500/30 bg-[#0e212b]"
                        : "border-rose-500/30 bg-[#24141c]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-cyan-300">
                          الخطوة {h.stepNumber}:
                        </span>
                        <p className="text-xs font-bold text-white mt-0.5">
                          {h.option?.labelAr || `الخيار رقم ${h.option?.id}`}
                        </p>
                      </div>
                      <Badge
                        className={`text-[10px] shrink-0 ${
                          h.result.isCorrect
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        }`}
                      >
                        {h.result.isCorrect ? "قرار سليم (+0)" : `قرار عالي المخاطر (+${h.result.riskScoreDelta})`}
                      </Badge>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-[#081120] p-3 text-xs leading-6 text-slate-300">
                      <span className="font-bold text-cyan-200">التحليل الأمني المعتمد: </span>
                      {h.result.explanationAr || h.result.feedbackAr}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="gap-1.5 border-white/15 text-slate-200 hover:bg-white/10 text-xs font-semibold"
                >
                  <RotateCcw size={14} />
                  إعادة المحاكاة
                </Button>

                <div className="flex items-center gap-2">
                  {finalResult.finalSummary?.recommendedLessonId && onOpenLesson && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleClose();
                        onOpenLesson({ id: finalResult.finalSummary.recommendedLessonId });
                      }}
                      className="gap-1.5 border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 text-xs font-semibold"
                    >
                      <ExternalLink size={13} />
                      مراجعة الدرس الموصى به
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={handleClose}
                    className="bg-cyan-400 text-[#081120] hover:bg-cyan-300 font-bold text-xs"
                  >
                    إغلاق المحاكاة
                  </Button>
                </div>
              </div>
            </div>
          ) : intermediateStepResult ? (
            /* ========================================================================= */
            /* 2. Intermediate Feedback (Step 1 breach requires containment in Step 2)  */
            /* ========================================================================= */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <AlertTriangle size={22} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      تحذير: القرار السابق أدى إلى تصاعد التهديد!
                    </h3>
                    <p className="text-xs text-rose-300 mt-0.5">
                      الإجراء الذي اخترته لم يكن كافياً أو فتح ثغرة للمهاجم، وبدأت تداعيات أمنية فورية.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0a1424] p-4 text-xs leading-6 text-slate-200">
                  <p className="font-bold text-amber-300 mb-1">التحليل الأمني لما حدث:</p>
                  {intermediateStepResult.feedbackAr}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="gap-1.5 border-white/15 text-slate-300 hover:bg-white/10 text-xs"
                >
                  <RotateCcw size={14} />
                  إلغاء وإعادة المحاولة
                </Button>

                <Button
                  onClick={handleProceedToStep2}
                  className="bg-amber-400 text-[#081120] hover:bg-amber-300 font-bold text-xs gap-1.5"
                >
                  الانتقال لخطوة الاحتواء والتعافي (الخطوة 2)
                  <ArrowRight size={14} className="rotate-180" />
                </Button>
              </div>
            </div>
          ) : currentStep ? (
            /* ========================================================================= */
            /* 3. Decision Active Step View (Step 1 or Step 2)                           */
            /* ========================================================================= */
            <div className="space-y-6">
              {/* Step indicator */}
              <div className="flex items-center justify-between">
                <Badge className="bg-cyan-400/10 text-cyan-300 border-cyan-400/20 text-xs">
                  الخطوة {currentStep.stepNumber} من {scenarioData.steps.length}
                </Badge>
                <span className="text-xs text-slate-400">
                  {currentStep.stepNumber === 1
                    ? "الاستجابة الأولية للتهديد"
                    : "إجراءات الاحتواء والتعافي"}
                </span>
              </div>

              {/* Situation & Threat Context Box */}
              <div className="rounded-2xl border border-white/15 bg-[#101e33] p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <Terminal size={15} />
                  الموقف الأمني والبيئة المحاكاة:
                </div>

                <p className="text-sm font-semibold text-white leading-7">
                  {currentStep.situationAr}
                </p>

                {currentStep.contextData && (
                  <div className="rounded-lg border border-white/5 bg-[#081120] p-3 text-[11px] text-slate-400 flex flex-wrap items-center gap-4">
                    {Object.entries(currentStep.contextData).map(([key, val]) => (
                      <div key={key} className="flex items-center gap-1">
                        <span className="font-mono text-slate-500">{key}:</span>
                        <span className="text-slate-300 font-medium">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Options selection - Zero Answer / Risk Leakage */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  اختر الإجراء الأمني الذي ستتخذه:
                </h4>

                <div className="space-y-2.5">
                  {currentStep.options.map((opt, idx) => {
                    const isSelected = selectedOptionId === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedOptionId(opt.id)}
                        className={`group flex items-start gap-3.5 rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? "border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/5 ring-1 ring-amber-400/30"
                            : "border-white/10 bg-[#0f1d33] hover:border-white/25 hover:bg-[#13243f]"
                        }`}
                      >
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors mt-0.5 ${
                            isSelected
                              ? "bg-amber-400 text-[#081120]"
                              : "border border-white/20 text-slate-400 group-hover:border-white/40"
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </div>

                        <div className="flex-1 space-y-1">
                          <p
                            className={`text-xs font-bold leading-6 ${
                              isSelected ? "text-white" : "text-slate-200"
                            }`}
                          >
                            {opt.labelAr}
                          </p>
                          {opt.labelEn && (
                            <p className="text-[11px] text-slate-500 font-medium dir-ltr text-right">
                              {opt.labelEn}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer Submit Button */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  إلغاء
                </Button>

                <Button
                  onClick={handleSubmitDecision}
                  disabled={selectedOptionId === null || decideMutation.isPending}
                  className="bg-amber-400 text-[#081120] hover:bg-amber-300 font-bold text-xs gap-1.5 px-6"
                >
                  {decideMutation.isPending ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#081120] border-t-transparent" />
                      جارٍ تقييم القرار أمنياً...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      تأكيد القرار الأمني
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
