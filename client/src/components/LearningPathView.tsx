import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Check,
  AlertCircle,
  ExternalLink,
  Target,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Layers,
  ChevronRight,
  ChevronLeft,
  Filter,
  ClipboardCheck,
  Trophy,
  HelpCircle,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { LessonScenarioModal } from "./LessonScenarioModal";
import { STATIC_FALLBACK_LESSONS } from "@/data/staticLessons";

interface LearningPathViewProps {
  onOpenAuth?: () => void;
  onNavigateToQuiz?: () => void;
}

export function LearningPathView({ onOpenAuth, onNavigateToQuiz }: LearningPathViewProps) {
  const { user, isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [activeLessonModal, setActiveLessonModal] = useState<any | null>(null);
  const [activeQuizLesson, setActiveQuizLesson] = useState<any | null>(null);
  const [activeScenarioLesson, setActiveScenarioLesson] = useState<any | null>(null);

  // 7 Real Lessons with Scenarios (Lesson 5 is deleted/excluded)
  const LESSONS_WITH_SCENARIOS = [1, 2, 3, 4, 6, 7, 8];

  // Queries & Mutations
  const categoriesQuery = trpc.content.categories.useQuery();
  const lessonsQuery = trpc.learning.getLessonsWithProgress.useQuery(
    selectedCategory ? { categoryId: selectedCategory } : undefined
  );
  const quizProgressQuery = trpc.quiz.getProgress.useQuery();
  const quizProgress = quizProgressQuery.data || [];

  const scenarioProgressQuery = trpc.scenario.getProgress.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const scenarioProgress = scenarioProgressQuery.data || [];

  const utils = trpc.useUtils();

  const completeMutation = trpc.learning.completeLesson.useMutation({
    onSuccess: (data) => {
      toast.success("تم تسجيل إكمال الدرس بنجاح وتحديث تقدمك التعليمي!");
      utils.learning.getLessonsWithProgress.invalidate();
      utils.learning.overview.invalidate();
      if (activeLessonModal) {
        setActiveLessonModal((prev: any) => (prev ? { ...prev, isCompleted: true } : null));
      }
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تسجيل إكمال الدرس");
    },
  });

  const DEFAULT_FALLBACK_CATEGORIES = [
    { id: 1, nameAr: "التصيد والهندسة الاجتماعية" },
    { id: 2, nameAr: "التصفح الآمن وتحليل الروابط" },
    { id: 3, nameAr: "حماية الحسابات وكلمات المرور" },
    { id: 4, nameAr: "المرفقات والبرمجيات الخبيثة" },
  ];

  const categories = (categoriesQuery.data && categoriesQuery.data.length > 0)
    ? categoriesQuery.data
    : DEFAULT_FALLBACK_CATEGORIES;

  // Seamless Fallback: Ensure 7 official lessons always render immediately
  const serverLessons = lessonsQuery.data?.lessons;
  const baseLessons = (serverLessons && serverLessons.length > 0)
    ? serverLessons
    : STATIC_FALLBACK_LESSONS;

  // Filter lessons by category if active
  const lessons = selectedCategory !== null
    ? baseLessons.filter((l: any) => l.categoryId === selectedCategory)
    : baseLessons;

  const totalLessons = STATIC_FALLBACK_LESSONS.length;
  const completedCount = lessonsQuery.data?.completedCount ?? lessons.filter((l: any) => l.isCompleted).length;
  const progressPercentage = lessonsQuery.data?.progressPercentage ?? (totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0);

  const handleOpenLesson = (lesson: any) => {
    setActiveLessonModal(lesson);
  };

  const handleOpenQuiz = (lesson: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated) {
      toast.info("يرجى تسجيل الدخول أولاً للمشاركة في الاختبار وحفظ نتائجك", {
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
    setActiveQuizLesson(lesson);
  };

  const handleOpenScenario = (lesson: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveScenarioLesson(lesson);
  };

  const handleCompleteLesson = (lessonId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!isAuthenticated) {
      toast.info("يرجى تسجيل الدخول أولاً لحفظ تقدمك في المسار التعليمي", {
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
    completeMutation.mutate({ lessonId });
  };

  // Parse learning objectives JSON safely
  const parseObjectives = (jsonStr?: string | null): string[] => {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/20 shadow-lg shadow-cyan-500/10">
            <BookOpen size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">المنهاج التوعوي الأكاديمي</span>
              <span className="text-slate-600">•</span>
              <span className="text-xs text-slate-400">7 وحدات معرفية معتمدة</span>
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">مسار التوعية والتعلم السيبراني</h1>
            <p className="mt-1.5 text-sm text-slate-400">
              رحلة تدريبية متكاملة تبدأ باكتشاف أساليب التصيد وتنتهي ببروتوكولات الاستجابة السريعة للحوادث.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Progress Banner / Card */}
      <Card className="border-white/10 bg-gradient-to-r from-[#0d1c33] via-[#102444] to-[#0c182c] shadow-xl text-white overflow-hidden relative">
        <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 text-xs font-bold">
                  {completedCount}
                </span>
                <p className="text-sm font-bold text-slate-200">
                  مؤشر التقدم في المسار التعليمي: {completedCount} من {totalLessons} دروس مكتملة
                </p>
              </div>
              <Progress value={progressPercentage} className="h-3 bg-white/10" />
              <p className="text-xs text-slate-400">
                {!isAuthenticated ? (
                  <span className="text-amber-300 flex items-center gap-1">
                    <AlertCircle size={14} />
                    أنت تتصفح المسار كزائر. سجّل دخولك لتسجيل تقدمك وحفظ درجات الوعي.
                  </span>
                ) : completedCount === 0 ? (
                  "ابدأ بقراءة الدرس الأول لتبدأ احتساب تقدمك في المنصة."
                ) : completedCount === totalLessons ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    رائع! لقد أتممت جميع الدروس السبعة بنجاح. أنت الآن مؤهل للمحاكاة والتقييم.
                  </span>
                ) : (
                  `أحسنت! قطعت ${progressPercentage}% من المسار. أكمل بقية الدروس لتأكيد استيعاب المعايير الأمنية.`
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl font-black text-cyan-300">{progressPercentage}%</div>
                <div className="text-[11px] text-slate-400">نسبة الإنجاز</div>
              </div>
              <div className="text-center px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl font-black text-white">{totalLessons - completedCount}</div>
                <div className="text-[11px] text-slate-400">دروس متبقية</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <span className="text-xs font-bold text-slate-400 ml-2 flex items-center gap-1.5">
          <Filter size={14} />
          تصفية التصنيفات:
        </span>
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          className={`h-8 rounded-full text-xs font-semibold ${
            selectedCategory === null
              ? "bg-cyan-400 text-[#081120] hover:bg-cyan-300"
              : "border-white/10 text-slate-300 hover:bg-white/10"
          }`}
        >
          جميع الوحدات ({totalLessons})
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className={`h-8 rounded-full text-xs font-semibold ${
              selectedCategory === cat.id
                ? "bg-cyan-400 text-[#081120] hover:bg-cyan-300"
                : "border-white/10 text-slate-300 hover:bg-white/10"
            }`}
          >
            {cat.nameAr}
          </Button>
        ))}
      </div>

      {/* 4. Lessons Grid */}
      {lessons.length === 0 ? (
        <Card className="border-white/10 bg-[#101a2d] p-10 text-center space-y-4">
          <p className="text-sm text-slate-400">لا توجد دروس مطابقة للتصنيف المحدد حالياً.</p>
          {selectedCategory !== null && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 text-xs"
            >
              عرض جميع الوحدات التعليمية
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => {
            const isCompleted = !!lesson.isCompleted;
            return (
              <Card
                key={lesson.id}
                onClick={() => handleOpenLesson(lesson)}
                className={`group relative flex flex-col justify-between border transition-all duration-300 cursor-pointer overflow-hidden ${
                  isCompleted
                    ? "border-emerald-500/30 bg-[#0f212a] hover:border-emerald-500/60 shadow-lg shadow-emerald-500/5"
                    : "border-white/10 bg-[#101a2d] hover:border-cyan-400/40 hover:bg-[#132038]"
                }`}
              >
                {/* Completion Status Accent */}
                {isCompleted && (
                  <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                )}

                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[11px] font-black tracking-wider ${
                        isCompleted
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20"
                      }`}
                    >
                      الدرس {lesson.order}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock3 size={13} />
                        {lesson.durationMinutes} د
                      </span>
                      {isCompleted ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 border-emerald-500/30 text-[10px] gap-1 py-0.5">
                          <CheckCircle2 size={11} />
                          مكتمل
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px] py-0.5">
                          غير مكتمل
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardTitle className="mt-3 text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {lesson.titleAr}
                  </CardTitle>
                  <p className="text-[11px] font-medium text-slate-500 tracking-wide dir-ltr text-right">
                    {lesson.title}
                  </p>
                </CardHeader>

                <CardContent className="p-5 pt-0 flex-1 flex flex-col justify-between">
                  <p className="text-xs leading-6 text-slate-300 line-clamp-3 mb-3">
                    {lesson.summaryAr}
                  </p>

                  {/* Quiz Status Badge */}
                  {(() => {
                    const quizStatus = quizProgress.find(
                      (q) => q.lessonId === lesson.id || q.quizId === lesson.order
                    );
                    return (
                      <div className="mb-4 flex items-center justify-between rounded-lg bg-black/25 px-3 py-2 text-xs border border-white/5">
                        <span className="text-[11px] text-slate-300 flex items-center gap-1.5 font-medium">
                          <ClipboardCheck size={13} className="text-cyan-400" />
                          اختبار الدرس:
                        </span>
                        {quizStatus?.isPassed ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] py-0.5 gap-1">
                            <CheckCircle2 size={11} />
                            تم الاجتياز ({quizStatus.bestScore}%)
                          </Badge>
                        ) : quizStatus && quizStatus.attemptsCount > 0 ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] py-0.5 gap-1">
                            <AlertCircle size={11} />
                            إعادة مطلوبة ({quizStatus.bestScore}%)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px] py-0.5">
                            متاح الآن
                          </Badge>
                        )}
                      </div>
                    );
                  })()}

                  {/* Scenario Status Badge (for 7 real lessons with scenarios) */}
                  {LESSONS_WITH_SCENARIOS.includes(lesson.id) && (() => {
                    const scProgress = scenarioProgress.find((s) => s.lessonId === lesson.id);
                    return (
                      <div className="mb-4 flex items-center justify-between rounded-lg bg-black/25 px-3 py-2 text-xs border border-white/5">
                        <span className="text-[11px] text-slate-300 flex items-center gap-1.5 font-medium">
                          <ShieldAlert size={13} className="text-amber-400" />
                          المحاكاة التفاعلية:
                        </span>
                        {scProgress?.passed ? (
                          <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] py-0.5 gap-1">
                            <CheckCircle2 size={11} />
                            تم الاجتياز ({scProgress.bestScore}%)
                          </Badge>
                        ) : scProgress && scProgress.attemptsCount > 0 ? (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] py-0.5 gap-1">
                            <AlertCircle size={11} />
                            إعادة مطلوبة ({scProgress.bestScore}%)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-white/10 text-slate-400 text-[10px] py-0.5">
                            متاح الآن
                          </Badge>
                        )}
                      </div>
                    );
                  })()}

                  <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLesson(lesson);
                        }}
                        className="h-8 text-xs text-cyan-300 hover:text-cyan-200 hover:bg-cyan-300/10 px-2.5"
                      >
                        قراءة الدرس <ChevronRight size={14} className="rotate-180 mr-1" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => handleOpenQuiz(lesson, e)}
                        className="h-8 text-xs border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 font-semibold gap-1 px-2.5"
                      >
                        <ClipboardCheck size={13} />
                        اختبار الدرس
                      </Button>

                      {LESSONS_WITH_SCENARIOS.includes(lesson.id) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleOpenScenario(lesson, e)}
                          className="h-8 text-xs border-amber-400/30 text-amber-300 hover:bg-amber-400/10 font-semibold gap-1 px-2.5"
                        >
                          <ShieldAlert size={13} />
                          محاكاة تفاعلية
                        </Button>
                      )}
                    </div>

                    {!isCompleted ? (
                      <Button
                        size="sm"
                        onClick={(e) => handleCompleteLesson(lesson.id, e)}
                        disabled={completeMutation.isPending}
                        className="h-8 text-xs bg-white/10 text-slate-200 hover:bg-cyan-400 hover:text-[#081120] font-semibold gap-1.5"
                      >
                        <Check size={13} />
                        إكمال الدرس
                      </Button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} /> تم الإنجاز
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 5. Lesson Viewer Dialog / Modal */}
      <Dialog open={!!activeLessonModal} onOpenChange={(open) => !open && setActiveLessonModal(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-[#0d1829] border-white/15 text-white p-0 gap-0">
          {activeLessonModal && (
            <div>
              {/* Modal Header */}
              <div className="p-6 border-b border-white/10 bg-[#101e33] sticky top-0 z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-cyan-400/20 text-cyan-300 border-cyan-400/30 text-xs font-bold">
                    الوحدة {activeLessonModal.order} من 7
                  </Badge>
                  <Badge variant="outline" className="border-white/15 text-slate-300 text-xs">
                    {activeLessonModal.difficulty === "beginner" ? "مستوى مبتدئ" : "مستوى متوسط"}
                  </Badge>
                  <span className="text-xs text-slate-400 flex items-center gap-1 mr-auto">
                    <Clock3 size={13} />
                    الوقت المقدر: {activeLessonModal.durationMinutes} دقائق
                  </span>
                </div>
                <DialogTitle className="text-xl font-black text-white mt-1">
                  {activeLessonModal.titleAr}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-1">
                  {activeLessonModal.title}
                </DialogDescription>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Learning Objectives */}
                {parseObjectives(activeLessonModal.learningObjectivesJson).length > 0 && (
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm mb-2.5">
                      <Target size={16} />
                      <span>أهداف التعلم المستهدفة:</span>
                    </div>
                    <ul className="space-y-1.5">
                      {parseObjectives(activeLessonModal.learningObjectivesJson).map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300 leading-5">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Lesson Educational Content */}
                <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-7 space-y-4">
                  {activeLessonModal.contentAr ? (
                    <div className="whitespace-pre-line font-sans">
                      {activeLessonModal.contentAr}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">محتوى الدرس قيد التحديث.</p>
                  )}
                </div>

                {/* Academic Security Advisory */}
                <div className="rounded-xl border border-white/10 bg-[#081120] p-4 flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                    <Sparkles size={15} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">التطبيق العملي المسؤول</p>
                    <p className="text-[11px] leading-5 text-slate-400 mt-0.5">
                      جميع الأمثلة والمؤشرات المعروضة في هذا الدرس مصممة لأغراض التوعية الأكاديمية والتدريب الآمن داخل المنصة.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-white/10 bg-[#101e33] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {activeLessonModal.isCompleted ? (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs gap-1.5 py-1 px-3">
                      <CheckCircle2 size={14} />
                      تم إكمال هذا الدرس بنجاح
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-400/30 text-amber-300 text-xs py-1 px-3">
                      لم يتم تسجيل إكمال الدرس بعد
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveLessonModal(null)}
                    className="border-white/15 text-slate-300 hover:bg-white/10 text-xs"
                  >
                    إغلاق
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const target = activeLessonModal;
                      setActiveLessonModal(null);
                      handleOpenQuiz(target);
                    }}
                    className="border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/15 text-xs font-semibold gap-1.5"
                  >
                    <ClipboardCheck size={14} />
                    اختبار هذا الدرس
                  </Button>

                  {LESSONS_WITH_SCENARIOS.includes(activeLessonModal.id) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const target = activeLessonModal;
                        setActiveLessonModal(null);
                        handleOpenScenario(target);
                      }}
                      className="border-amber-400/40 text-amber-300 hover:bg-amber-400/15 text-xs font-semibold gap-1.5"
                    >
                      <ShieldAlert size={14} />
                      محاكاة تفاعلية
                    </Button>
                  )}

                  {!activeLessonModal.isCompleted && (
                    <Button
                      size="sm"
                      onClick={() => handleCompleteLesson(activeLessonModal.id)}
                      disabled={completeMutation.isPending}
                      className="bg-cyan-400 text-[#081120] hover:bg-cyan-300 font-bold text-xs gap-1.5"
                    >
                      <Check size={14} />
                      {completeMutation.isPending ? "جارٍ الحفظ..." : "تسجيل إكمال الدرس"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 6. Lesson Quiz Interactive Dialog / Modal */}
      <LessonQuizModal
        lesson={activeQuizLesson}
        isOpen={!!activeQuizLesson}
        onClose={() => setActiveQuizLesson(null)}
        onOpenAuth={onOpenAuth}
      />

      {/* 7. Lesson Scenario Interactive Dialog / Modal */}
      <LessonScenarioModal
        lesson={activeScenarioLesson}
        isOpen={!!activeScenarioLesson}
        onClose={() => setActiveScenarioLesson(null)}
        onOpenAuth={onOpenAuth}
        onOpenLesson={(target) => {
          const found = lessons.find((l: any) => l.id === target.id);
          if (found) setActiveLessonModal(found);
        }}
      />
    </div>
  );
}

/**
 * Interactive Quiz Modal for a Specific Lesson
 */
function LessonQuizModal({
  lesson,
  isOpen,
  onClose,
  onOpenAuth,
}: {
  lesson: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth?: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const quizQuery = trpc.quiz.getByLessonId.useQuery(
    { lessonId: lesson?.id },
    { enabled: !!lesson && isOpen }
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);

  const submitMutation = trpc.quiz.submit.useMutation({
    onSuccess: (res) => {
      setSubmissionResult(res);
      utils.quiz.getProgress.invalidate();
      utils.learning.getLessonsWithProgress.invalidate();
      utils.learning.overview.invalidate();
      if (res.passed) {
        toast.success(`تهانينا! اجتزت الاختبار بنسبة ${res.scorePercentage}%`);
      } else {
        toast.error(`حصلت على ${res.scorePercentage}%، لم تحقق نسبة الاجتياز (70%)`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "فشل إرسال إجابات الاختبار");
    },
  });

  const handleReset = () => {
    setCurrentIndex(0);
    setSelectedAnswers({});
    setSubmissionResult(null);
    submitMutation.reset();
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen || !lesson) return null;

  const quizData = quizQuery.data;
  const questions = quizData?.questions || [];
  const currentQ = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentSelection = currentQ ? selectedAnswers[currentQ.id] : undefined;

  const handleSelect = (optionIndex: number) => {
    if (!currentQ || submissionResult) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex,
    }));
  };

  const handleSubmit = () => {
    if (!quizData?.quiz) return;
    if (Object.keys(selectedAnswers).length < questions.length) {
      toast.warning("يرجى الإجابة على جميع الأسئلة قبل إرسال الاختبار");
      return;
    }
    const answersPayload = questions.map((q) => ({
      questionId: q.id,
      selectedOptionIndex: selectedAnswers[q.id] ?? 0,
    }));

    submitMutation.mutate({
      quizId: quizData.quiz.id,
      answers: answersPayload,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0d1829] border-white/15 text-white p-0 gap-0">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-[#101e33] sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/20 text-cyan-300">
                <ClipboardCheck size={18} />
              </span>
              <div>
                <DialogTitle className="text-lg font-black text-white">
                  اختبار: {lesson.titleAr}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-400 mt-0.5">
                  الوحدة {lesson.order} • نسبة الاجتياز المطلوبة 70%
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
        </div>

        {/* Content Area */}
        <div className="p-6">
          {quizQuery.isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <p className="text-sm">جارٍ تحميل أسئلة الاختبار...</p>
            </div>
          ) : !questions.length ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <AlertCircle size={32} className="mx-auto text-amber-400" />
              <p className="text-sm">لم يتم العثور على أسئلة مسجلة لهذا الاختبار حالياً.</p>
            </div>
          ) : submissionResult ? (
            /* Results View */
            <div className="space-y-6">
              <div
                className={`rounded-2xl border p-6 text-center ${
                  submissionResult.passed
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-rose-500/30 bg-rose-500/10"
                }`}
              >
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
                    submissionResult.passed
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {submissionResult.passed ? <Trophy size={32} /> : <AlertCircle size={32} />}
                </div>

                <h3 className="mt-4 text-2xl font-black text-white">
                  {submissionResult.correctAnswers} / {submissionResult.totalQuestions} ({submissionResult.scorePercentage}%)
                </h3>

                <p className="mt-2 text-sm font-semibold">
                  {submissionResult.passed ? (
                    <span className="text-emerald-300">تم اجتياز الاختبار بنجاح! أحسنت صنعاً.</span>
                  ) : (
                    <span className="text-rose-300">لم يتم اجتياز الاختبار (الحد الأدنى 70%). حاول مرة أخرى.</span>
                  )}
                </p>

                {/* Score & Points Anti-inflation Notice */}
                <div className="mt-4 inline-block rounded-xl border border-white/10 bg-[#0a1424] px-4 py-2.5 text-xs">
                  {submissionResult.isFirstPass ? (
                    <p className="font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                      <Sparkles size={14} />
                      + 5 نقاط وعي أمني تم منحها لحسابك لاجتيازك هذا الدرس للمرة الأولى!
                    </p>
                  ) : submissionResult.passed ? (
                    <p className="text-slate-300">
                      تم تسجيل المحاولة بنجاح (لم تُمنح نقاط إضافية لمنع تضخيم النقاط بالاجتياز المتكرر لنفس الدرس).
                    </p>
                  ) : (
                    <p className="text-slate-400">
                      راجع المفاهيم الأساسية في الدرس أدناه ثم اضغط «إعادة الاختبار».
                    </p>
                  )}
                </div>
              </div>

              {/* Per Question Educational Feedback */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-slate-200">المراجعة التفصيلية والتغذية الراجعة الأكاديمية:</h4>
                {submissionResult.results.map((r: any, idx: number) => (
                  <div
                    key={r.questionId}
                    className={`rounded-xl border p-4 space-y-3 ${
                      r.isCorrect
                        ? "border-emerald-500/30 bg-[#0e212b]"
                        : "border-rose-500/30 bg-[#24141c]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-cyan-300">السؤال {idx + 1}:</span>
                        <p className="text-xs font-bold text-white leading-5">{r.questionAr}</p>
                      </div>
                      <Badge
                        className={`shrink-0 text-[10px] ${
                          r.isCorrect
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        }`}
                      >
                        {r.isCorrect ? "صحيحة" : "خاطئة"}
                      </Badge>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-[#081120] p-3 text-xs leading-6 text-slate-300">
                      <span className="font-bold text-cyan-200">الشرح والتحليل الأمني: </span>
                      {r.explanationAr}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="gap-2 border-white/15 text-slate-200 hover:bg-white/10 text-xs font-semibold"
                >
                  <RotateCcw size={14} />
                  إعادة الاختبار
                </Button>
                <Button
                  onClick={handleClose}
                  className="bg-cyan-400 text-[#081120] hover:bg-cyan-300 text-xs font-bold"
                >
                  إغلاق ومتابعة المسار
                </Button>
              </div>
            </div>
          ) : (
            /* Taking Quiz Screen */
            <div className="space-y-6">
              {/* Step indicator */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/10 pb-3">
                <span className="text-cyan-300 font-bold">
                  السؤال {currentIndex + 1} من {questions.length}
                </span>
                <span>
                  تمت الإجابة على {Object.keys(selectedAnswers).length} من {questions.length}
                </span>
              </div>

              {/* Question Text */}
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white leading-7">
                  {currentQ.questionAr}
                </h3>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQ.options.map((opt: string, optIdx: number) => {
                  const isSelected = currentSelection === optIdx;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelect(optIdx)}
                      className={`flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-right text-xs leading-5 transition-all ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-400/15 text-white shadow-lg shadow-cyan-500/10"
                          : "border-white/10 bg-[#101e33] text-slate-300 hover:border-cyan-400/40 hover:bg-[#13243d]"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                          isSelected
                            ? "bg-cyan-400 text-[#081120]"
                            : "border border-white/20 bg-black/20 text-slate-400"
                        }`}
                      >
                        {optIdx + 1}
                      </span>
                      <span className="flex-1">{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => prev - 1)}
                  className="gap-1 border-white/15 text-slate-300 hover:bg-white/10 text-xs"
                >
                  <ChevronRight size={14} />
                  السابق
                </Button>

                <div className="flex items-center gap-2">
                  {!isLastQuestion ? (
                    <Button
                      size="sm"
                      onClick={() => setCurrentIndex((prev) => prev + 1)}
                      disabled={currentSelection === undefined}
                      className="gap-1 bg-cyan-400 text-[#081120] hover:bg-cyan-300 text-xs font-bold"
                    >
                      التالي
                      <ChevronLeft size={14} />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={submitMutation.isPending || currentSelection === undefined}
                      className="gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 text-[#081120] hover:opacity-90 text-xs font-bold shadow-lg shadow-emerald-500/20"
                    >
                      {submitMutation.isPending ? "جارٍ التقييم..." : "إرسال الإجابات والتقييم"}
                      <CheckCircle2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
