import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  BookOpen,
  Trophy,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  LogIn,
  Check,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface QuizzesHubViewProps {
  onNavigateToLesson?: (lessonId: number) => void;
  onOpenAuth?: () => void;
}

export function QuizzesHubView({ onNavigateToLesson, onOpenAuth }: QuizzesHubViewProps) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // Progress of all 7 quizzes from DB
  const progressQuery = trpc.quiz.getProgress.useQuery(undefined, {
    staleTime: 5000,
  });

  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Array<{ questionId: number; selectedOptionIndex: number }>>([]);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);

  // Load questions for the selected quiz
  const questionsQuery = trpc.quiz.getQuestions.useQuery(
    { quizId: selectedQuizId || 1 },
    { enabled: !!selectedQuizId }
  );

  const submitMutation = trpc.quiz.submit.useMutation({
    onSuccess: (data) => {
      setSubmissionResult(data);
      utils.quiz.getProgress.invalidate();
      utils.learning.overview.invalidate();
      utils.assessment.getStatus.invalidate();
      if (data.passed) {
        toast.success(`تهانينا! اجتزت الاختبار بنسبة ${data.scorePercentage}%`);
      } else {
        toast.error(`حصلت على ${data.scorePercentage}%، لم تحقق نسبة الاجتياز (70%)`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "فشل إرسال إجابات الاختبار");
    },
  });

  const quizzes = progressQuery.data || [];
  const passedQuizzesCount = quizzes.filter((q) => q.isPassed).length;
  const attemptedQuizzesCount = quizzes.filter((q) => q.hasAttempted).length;
  const overallQuizPercentage = Math.round((passedQuizzesCount / 7) * 100);

  const handleStartQuiz = (quizId: number) => {
    setSelectedQuizId(quizId);
    setQuizIndex(0);
    setSelectedOption(null);
    setUserAnswers([]);
    setSubmissionResult(null);
    submitMutation.reset();
  };

  const handleBackToHub = () => {
    setSelectedQuizId(null);
    setQuizIndex(0);
    setSelectedOption(null);
    setUserAnswers([]);
    setSubmissionResult(null);
    submitMutation.reset();
  };

  const currentQuestions = questionsQuery.data || [];
  const currentQ = currentQuestions[quizIndex];
  const activeQuizMeta = quizzes.find((q) => q.quizId === selectedQuizId);

  const handleSelectOption = (index: number) => {
    if (!currentQ || submissionResult) return;
    setSelectedOption(index);
  };

  const handleNextOrSubmit = () => {
    if (selectedOption === null || !currentQ || !selectedQuizId) return;

    const newAnswers = [...userAnswers, { questionId: currentQ.id, selectedOptionIndex: selectedOption }];
    setUserAnswers(newAnswers);

    if (quizIndex < currentQuestions.length - 1) {
      setQuizIndex(quizIndex + 1);
      setSelectedOption(null);
    } else {
      if (!isAuthenticated && onOpenAuth) {
        toast.warning("يرجى تسجيل الدخول لحفظ نتيجة الاختبار ونقاط الوعي الأمني.");
        onOpenAuth();
        return;
      }
      submitMutation.mutate({
        quizId: selectedQuizId,
        answers: newAnswers,
      });
    }
  };

  const handleRetakeCurrentQuiz = () => {
    setQuizIndex(0);
    setSelectedOption(null);
    setUserAnswers([]);
    setSubmissionResult(null);
    submitMutation.reset();
  };

  // -------------------------------------------------------------
  // VIEW 1: ACTIVE QUIZ RUNNER (or Results)
  // -------------------------------------------------------------
  if (selectedQuizId !== null) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 animate-in fade-in duration-300">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <Button
            onClick={handleBackToHub}
            variant="ghost"
            className="gap-2 text-slate-300 hover:text-white"
          >
            <ArrowRight size={18} />
            العودة لمركز الاختبارات
          </Button>
          <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
            الوحدة {selectedQuizId} من 7
          </Badge>
        </div>

        {/* SUB-VIEW 1A: Exam Results */}
        {submissionResult ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            <Card className="border-cyan-300/20 bg-[#101a2d] text-center text-white">
              <CardContent className="p-8 sm:p-10">
                <div
                  className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                    submissionResult.passed ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-400/15 text-amber-300"
                  }`}
                >
                  <Trophy size={40} />
                </div>
                <p className="mt-6 text-xs font-bold text-cyan-300">نتيجة الاختبار المسجلة بالسيرفر</p>
                <h1 className="mt-2 text-3xl font-black">
                  {submissionResult.correctAnswers} / {submissionResult.totalQuestions} ({submissionResult.scorePercentage}%)
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">
                  {submissionResult.passed
                    ? "تهانينا! لقد حققت نسبة الاجتياز المطلوبة (70% أو أكثر) وأثبتّ استيعابك للمفاهيم الأمنية في هذا الدرس."
                    : "لم تحقق نسبة الاجتياز المطلوبة (70%). ننصحك بمراجعة محتوى الدرس ثم إعادة الاختبار في أي وقت."}
                </p>
                {submissionResult.isFirstPass && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-bold text-emerald-300">
                    <Sparkles size={16} />
                    + 5 نقاط وعي أمني أضيفت إلى رصيدك لاجتيازك هذا الاختبار للمرة الأولى!
                  </div>
                )}
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <Button
                    onClick={handleRetakeCurrentQuiz}
                    variant="outline"
                    className="gap-2 border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    <RotateCcw size={16} />
                    إعادة هذا الاختبار
                  </Button>
                  <Button
                    onClick={handleBackToHub}
                    className="gap-2 bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300"
                  >
                    <ClipboardCheck size={16} />
                    متابعة بقية الاختبارات
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Academic Explanations Review */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen size={18} className="text-cyan-400" />
                المراجعة الأكاديمية والشرح التعليمي لكل سؤال:
              </h3>
              {submissionResult.results.map((r: any, idx: number) => (
                <Card
                  key={r.questionId}
                  className={`border p-5 text-white ${
                    r.isCorrect ? "border-emerald-500/30 bg-[#0c1e28]" : "border-rose-500/30 bg-[#22131a]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-cyan-300">سؤال {idx + 1}: </span>
                      <p className="mt-1 text-sm font-semibold leading-6">{r.questionAr}</p>
                    </div>
                    <span
                      className={`shrink-0 flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
                        r.isCorrect ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {r.isCorrect ? (
                        <>
                          <Check size={14} />
                          إجابة صحيحة
                        </>
                      ) : (
                        <>
                          <X size={14} />
                          إجابة غير صحيحة
                        </>
                      )}
                    </span>
                  </div>
                  <div className="mt-3 rounded-lg border border-white/10 bg-[#081120] p-3 text-xs leading-6 text-slate-300">
                    <span className="font-bold text-cyan-200">الشرح التعليمي: </span>
                    {r.explanationAr}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : questionsQuery.isLoading ? (
          <Card className="border-white/10 bg-[#101a2d] p-12 text-center text-slate-400">
            جارٍ تحميل أسئلة الاختبار من السيرفر...
          </Card>
        ) : !currentQ ? (
          <Card className="border-white/10 bg-[#101a2d] p-12 text-center text-slate-400">
            لم يتم العثور على أسئلة لهذا الاختبار.
          </Card>
        ) : (
          /* SUB-VIEW 1B: Question Step */
          <Card className="border-white/10 bg-[#101a2d] text-white">
            <CardContent className="p-6 sm:p-9">
              {/* Question Header & Progress Bar */}
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-cyan-300">
                    السؤال {quizIndex + 1} من {currentQuestions.length}
                  </span>
                  <span className="text-slate-400">
                    نسبة الإنجاز: {Math.round(((quizIndex + 1) / currentQuestions.length) * 100)}%
                  </span>
                </div>
                <Progress value={((quizIndex + 1) / currentQuestions.length) * 100} className="h-2 bg-white/10" />
              </div>

              {activeQuizMeta && (
                <p className="text-xs text-slate-400 mb-2">{activeQuizMeta.titleAr}</p>
              )}

              <h2 className="text-lg sm:text-xl font-black leading-8 text-white">{currentQ.questionAr}</h2>

              {/* Options */}
              <div className="mt-7 space-y-3">
                {currentQ.options?.map((opt: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => handleSelectOption(i)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-right text-sm transition ${
                      selectedOption === i
                        ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-200 font-bold"
                        : "border-white/10 bg-[#0a1424] text-slate-300 hover:border-cyan-300/30"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold ${
                        selectedOption === i
                          ? "border-cyan-400 bg-cyan-400/20 text-cyan-300"
                          : "border-white/20 text-slate-400"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex items-center justify-between pt-4 border-t border-white/10">
                <Button
                  onClick={handleBackToHub}
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-400 hover:text-white"
                >
                  إلغاء والعودة
                </Button>
                <Button
                  onClick={handleNextOrSubmit}
                  disabled={selectedOption === null || submitMutation.isPending}
                  className="gap-2 bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300 disabled:opacity-40"
                >
                  {submitMutation.isPending
                    ? "جارٍ التقييم بالسيرفر..."
                    : quizIndex === currentQuestions.length - 1
                    ? "إرسال الاختبار والتقييم النهائي"
                    : "السؤال التالي"}
                  <ChevronLeft size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: QUIZZES HUB OVERVIEW (All 7 Quizzes)
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Banner */}
      <section className="relative overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[linear-gradient(110deg,rgba(12,44,69,.95),rgba(12,27,49,.9))] p-7 shadow-2xl shadow-cyan-950/30 lg:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/20 text-cyan-300">
                <ClipboardCheck size={22} />
              </span>
              <Badge className="border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                المنهج التوعوي المتكامل • 7 اختبارات
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">مركز الاختبارات المعرفية التفاعلية</h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-6">
              يحتوي المنهج على 7 اختبارات رسمية تقيس استيعابك الأمني في كل وحدة. يتكون كل اختبار من 5 أسئلة، والحد الأدنى لاجتياز أي اختبار هو 70% (4 من 5 إجابات صحيحة).
            </p>
          </div>

          {/* Progress Card */}
          <div className="w-full md:w-64 shrink-0 rounded-2xl border border-white/10 bg-[#081120]/80 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">الاختبارات المجتازة</span>
              <span className="font-bold text-emerald-400">{passedQuizzesCount} / 7</span>
            </div>
            <Progress value={overallQuizPercentage} className="h-2 bg-white/10" />
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>نسبة الإنجاز: {overallQuizPercentage}%</span>
              <span>{7 - passedQuizzesCount} متبقية</span>
            </div>
          </div>
        </div>
      </section>

      {/* Guest Notice */}
      {!isAuthenticated && (
        <Card className="border-amber-400/20 bg-amber-950/20 text-white">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={20} className="text-amber-400 shrink-0" />
              <p className="text-xs text-slate-300">
                أنت تتصفح الاختبارات كضيف. يرجى تسجيل الدخول ليتم حفظ محاولاتك وأفضل درجاتك واحتساب نقاط الوعي الأمني.
              </p>
            </div>
            {onOpenAuth && (
              <Button
                onClick={onOpenAuth}
                size="sm"
                className="shrink-0 gap-2 bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300 text-xs"
              >
                <LogIn size={14} />
                تسجيل الدخول
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 7 Quizzes Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {quizzes.map((qz) => {
          return (
            <Card
              key={qz.quizId}
              className={`flex flex-col justify-between border transition hover:border-cyan-400/30 ${
                qz.isPassed
                  ? "border-emerald-500/30 bg-[#0c1a24]"
                  : qz.hasAttempted
                  ? "border-amber-500/30 bg-[#161a24]"
                  : "border-white/10 bg-[#101a2d]"
              } text-white`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="border-white/15 text-slate-400 text-xs">
                    الوحدة {qz.quizId}
                  </Badge>
                  {qz.isPassed ? (
                    <Badge className="border-emerald-400/40 bg-emerald-400/10 text-emerald-300 gap-1 text-xs">
                      <CheckCircle2 size={12} />
                      مجتاز ({qz.bestScore}%)
                    </Badge>
                  ) : qz.hasAttempted ? (
                    <Badge className="border-amber-400/40 bg-amber-400/10 text-amber-300 gap-1 text-xs">
                      <AlertCircle size={12} />
                      لم يجتز ({qz.bestScore}%)
                    </Badge>
                  ) : (
                    <Badge className="border-white/15 bg-white/5 text-slate-400 gap-1 text-xs">
                      <Clock size={12} />
                      لم يُختبر بعد
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base font-bold text-white leading-6 mt-2">
                  {qz.titleAr}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* Linked Lesson */}
                <div className="rounded-xl border border-white/5 bg-black/20 p-3 text-xs space-y-1">
                  <span className="text-[11px] text-slate-400">الدرس المرتبط:</span>
                  <p className="font-semibold text-cyan-200 line-clamp-1">{qz.lessonTitleAr}</p>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white/5 p-2 text-center">
                    <span className="text-[10px] text-slate-400 block">أفضل نتيجة</span>
                    <span className={`font-bold text-sm ${qz.isPassed ? "text-emerald-300" : qz.hasAttempted ? "text-amber-300" : "text-slate-400"}`}>
                      {qz.hasAttempted ? `${qz.bestScore}%` : "—"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white/5 p-2 text-center">
                    <span className="text-[10px] text-slate-400 block">المحاولات</span>
                    <span className="font-bold text-sm text-slate-200">
                      {qz.attemptsCount}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    onClick={() => handleStartQuiz(qz.quizId)}
                    className={`w-full gap-2 font-bold text-xs ${
                      qz.isPassed
                        ? "border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                        : qz.hasAttempted
                        ? "bg-gradient-to-r from-amber-400 to-amber-500 text-[#081120] hover:from-amber-300 hover:to-amber-400"
                        : "bg-cyan-400 text-[#081120] hover:bg-cyan-300"
                    }`}
                  >
                    <ClipboardCheck size={15} />
                    {qz.isPassed ? "إعادة الاختبار للتحسين" : qz.hasAttempted ? "إعادة المحاولة الآن" : "بدء الاختبار الآن"}
                  </Button>

                  {onNavigateToLesson && (
                    <Button
                      onClick={() => onNavigateToLesson(qz.lessonId)}
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-400 hover:text-cyan-300 gap-1.5"
                    >
                      <BookOpen size={13} />
                      مراجعة محتوى الدرس
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
