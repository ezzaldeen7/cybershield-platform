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
  Filter,
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

interface LearningPathViewProps {
  onOpenAuth?: () => void;
  onNavigateToQuiz?: () => void;
}

export function LearningPathView({ onOpenAuth, onNavigateToQuiz }: LearningPathViewProps) {
  const { user, isAuthenticated } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [activeLessonModal, setActiveLessonModal] = useState<any | null>(null);

  // Queries & Mutations
  const categoriesQuery = trpc.content.categories.useQuery();
  const lessonsQuery = trpc.learning.getLessonsWithProgress.useQuery(
    selectedCategory ? { categoryId: selectedCategory } : undefined
  );
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

  const categories = categoriesQuery.data || [];
  const lessonsData = lessonsQuery.data || {
    lessons: [],
    totalLessons: 7,
    completedCount: 0,
    progressPercentage: 0,
  };

  const { lessons, totalLessons, completedCount, progressPercentage } = lessonsData;

  const handleOpenLesson = (lesson: any) => {
    setActiveLessonModal(lesson);
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
      {lessonsQuery.isLoading ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Card key={i} className="animate-pulse border-white/10 bg-[#101a2d] p-6 h-64" />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        <Card className="border-white/10 bg-[#101a2d] p-10 text-center">
          <p className="text-sm text-slate-400">لا توجد دروس مطابقة للتصنيف المحدد حالياً.</p>
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
                  <p className="text-xs leading-6 text-slate-300 line-clamp-3 mb-4">
                    {lesson.summaryAr}
                  </p>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenLesson(lesson);
                      }}
                      className="h-8 text-xs text-cyan-300 hover:text-cyan-200 hover:bg-cyan-300/10 px-2"
                    >
                      قراءة الدرس <ChevronRight size={14} className="rotate-180 mr-1" />
                    </Button>

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
    </div>
  );
}
