import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  GraduationCap,
  BookOpen,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Filter,
  Save,
  X,
  ShieldAlert,
  ClipboardCheck,
  HelpCircle,
  ListPlus,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function InstructorDashboardView() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<"lessons" | "quizzes">("lessons");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all");

  // Lesson Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);

  // Lesson Form Fields
  const [formTitleAr, setFormTitleAr] = useState("");
  const [formTitleEn, setFormTitleEn] = useState("");
  const [formSummaryAr, setFormSummaryAr] = useState("");
  const [formContentAr, setFormContentAr] = useState("");
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formDuration, setFormDuration] = useState<number>(5);
  const [formCategoryId, setFormCategoryId] = useState<number | undefined>(undefined);
  const [formDifficulty, setFormDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [formStatus, setFormStatus] = useState<"published" | "draft">("draft");

  // Quiz Modal State
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [quizModalMode, setQuizModalMode] = useState<"create" | "edit">("create");
  const [editingQuizId, setEditingQuizId] = useState<number | null>(null);
  const [quizTitleAr, setQuizTitleAr] = useState("");
  const [quizTitleEn, setQuizTitleEn] = useState("");
  const [quizLessonId, setQuizLessonId] = useState<number | undefined>(undefined);
  const [quizPassScore, setQuizPassScore] = useState<number>(70);
  const [quizStatus, setQuizStatus] = useState<"draft" | "published">("draft");

  // Questions Manager State
  const [questionManagerOpen, setQuestionManagerOpen] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<number | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [qTextAr, setQTextAr] = useState("");
  const [qTextEn, setQTextEn] = useState("");
  const [qOption0, setQOption0] = useState("");
  const [qOption1, setQOption1] = useState("");
  const [qOption2, setQOption2] = useState("");
  const [qOption3, setQOption3] = useState("");
  const [qCorrectIndex, setQCorrectIndex] = useState<number>(0);
  const [qExplanation, setQExplanation] = useState("");
  const [qDifficulty, setQDifficulty] = useState<"beginner" | "intermediate" | "advanced" | "medium">("medium");

  // RBAC Guard
  const isAuthorized = isAuthenticated && (user?.role === "instructor" || user?.role === "admin");

  // Queries
  const lessonsQuery = trpc.content.list.useQuery(
    {
      search: search.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      mineOnly: user?.role === "instructor" ? true : undefined,
      limit: 50,
    },
    { enabled: isAuthorized }
  );

  const quizzesQuery = trpc.quiz.list.useQuery(
    {
      mineOnly: user?.role === "instructor" ? true : undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search.trim() || undefined,
    },
    { enabled: isAuthorized }
  );

  const manageQuizQuery = trpc.quiz.getManageQuiz.useQuery(
    { quizId: selectedQuizId! },
    { enabled: isAuthorized && !!selectedQuizId && questionManagerOpen }
  );

  const categoriesQuery = trpc.content.categories.useQuery(undefined, {
    enabled: isAuthorized,
  });

  // Lesson Mutations
  const createMutation = trpc.content.create.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إنشاء الدرس "${data.titleAr}" بنجاح!`);
      utils.content.list.invalidate();
      utils.learning.getLessonsWithProgress.invalidate();
      setModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إنشاء الدرس");
    },
  });

  const updateMutation = trpc.content.update.useMutation({
    onSuccess: (data) => {
      toast.success(`تم تحديث الدرس "${data.titleAr}" بنجاح!`);
      utils.content.list.invalidate();
      utils.learning.getLessonsWithProgress.invalidate();
      setModalOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تحديث الدرس");
    },
  });

  const deleteMutation = trpc.content.delete.useMutation({
    onSuccess: () => {
      toast.success("تم حذف/أرشفة الدرس بنجاح");
      utils.content.list.invalidate();
      utils.learning.getLessonsWithProgress.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "تعذر حذف الدرس");
    },
  });

  // Quiz Mutations
  const createQuizMutation = trpc.quiz.create.useMutation({
    onSuccess: (data) => {
      toast.success(`تم إنشاء الاختبار "${data.titleAr}" بنجاح كمسودة!`);
      utils.quiz.list.invalidate();
      setQuizModalOpen(false);
      resetQuizForm();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إنشاء الاختبار");
    },
  });

  const updateQuizMutation = trpc.quiz.update.useMutation({
    onSuccess: (data) => {
      toast.success(`تم تحديث الاختبار "${data.titleAr}" بنجاح!`);
      utils.quiz.list.invalidate();
      setQuizModalOpen(false);
      resetQuizForm();
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء تحديث الاختبار");
    },
  });

  const archiveQuizMutation = trpc.quiz.archive.useMutation({
    onSuccess: () => {
      toast.success("تم أرشفة الاختبار بنجاح");
      utils.quiz.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "تعذر أرشفة الاختبار");
    },
  });

  const addQuestionMutation = trpc.quiz.addQuestion.useMutation({
    onSuccess: () => {
      toast.success("تم إضافة السؤال بنجاح!");
      utils.quiz.getManageQuiz.invalidate();
      utils.quiz.list.invalidate();
      resetQuestionForm();
      setIsAddingQuestion(false);
    },
    onError: (err) => {
      toast.error(err.message || "حدث خطأ أثناء إضافة السؤال");
    },
  });

  const deleteQuestionMutation = trpc.quiz.deleteQuestion.useMutation({
    onSuccess: () => {
      toast.success("تم حذف السؤال بنجاح");
      utils.quiz.getManageQuiz.invalidate();
      utils.quiz.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "تعذر حذف السؤال");
    },
  });

  const resetForm = () => {
    setFormTitleAr("");
    setFormTitleEn("");
    setFormSummaryAr("");
    setFormContentAr("");
    setFormOrder(1);
    setFormDuration(5);
    setFormCategoryId(undefined);
    setFormDifficulty("beginner");
    setFormStatus("draft");
    setEditingId(null);
  };

  const resetQuizForm = () => {
    setQuizTitleAr("");
    setQuizTitleEn("");
    setQuizLessonId(undefined);
    setQuizPassScore(70);
    setQuizStatus("draft");
    setEditingQuizId(null);
  };

  const resetQuestionForm = () => {
    setQTextAr("");
    setQTextEn("");
    setQOption0("");
    setQOption1("");
    setQOption2("");
    setQOption3("");
    setQCorrectIndex(0);
    setQExplanation("");
    setQDifficulty("medium");
  };

  const handleOpenCreate = () => {
    resetForm();
    setModalMode("create");
    setModalOpen(true);
  };

  const handleOpenEdit = (lesson: any) => {
    setEditingId(lesson.id);
    setFormTitleAr(lesson.titleAr || "");
    setFormTitleEn(lesson.title || "");
    setFormSummaryAr(lesson.summaryAr || "");
    setFormContentAr(lesson.contentAr || "");
    setFormOrder(lesson.order ?? 1);
    setFormDuration(lesson.durationMinutes ?? 5);
    setFormCategoryId(lesson.categoryId || undefined);
    setFormDifficulty(lesson.difficulty || "beginner");
    setFormStatus(lesson.status === "draft" ? "draft" : "published");
    setModalMode("edit");
    setModalOpen(true);
  };

  const handleOpenCreateQuiz = () => {
    resetQuizForm();
    setQuizModalMode("create");
    setQuizModalOpen(true);
  };

  const handleOpenEditQuiz = (qz: any) => {
    setEditingQuizId(qz.id);
    setQuizTitleAr(qz.titleAr || "");
    setQuizTitleEn(qz.titleEn || "");
    setQuizLessonId(qz.lessonId || undefined);
    setQuizPassScore(qz.passScorePercentage || 70);
    setQuizStatus(qz.status === "published" ? "published" : "draft");
    setQuizModalMode("edit");
    setQuizModalOpen(true);
  };

  const handleOpenQuestions = (quizId: number) => {
    setSelectedQuizId(quizId);
    resetQuestionForm();
    setIsAddingQuestion(false);
    setQuestionManagerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formTitleAr.trim()) {
      toast.error("عنوان الدرس بالعربية مطلوب");
      return;
    }
    if (!formContentAr.trim() || formContentAr.trim().length < 10) {
      toast.error("محتوى الدرس بالعربية مطلوب ويجب أن يحتوي على 10 أحرف على الأقل");
      return;
    }

    const titleEn = formTitleEn.trim() || formTitleAr.trim();

    if (modalMode === "create") {
      createMutation.mutate({
        titleAr: formTitleAr.trim(),
        title: titleEn,
        summaryAr: formSummaryAr.trim() || undefined,
        summary: formSummaryAr.trim() || undefined,
        contentAr: formContentAr.trim(),
        content: formContentAr.trim(),
        order: formOrder,
        durationMinutes: formDuration,
        categoryId: formCategoryId,
        difficulty: formDifficulty,
        status: formStatus,
      });
    } else if (modalMode === "edit" && editingId) {
      updateMutation.mutate({
        id: editingId,
        titleAr: formTitleAr.trim(),
        title: titleEn,
        summaryAr: formSummaryAr.trim() || undefined,
        summary: formSummaryAr.trim() || undefined,
        contentAr: formContentAr.trim(),
        content: formContentAr.trim(),
        order: formOrder,
        durationMinutes: formDuration,
        categoryId: formCategoryId,
        difficulty: formDifficulty,
        status: formStatus,
      });
    }
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!quizTitleAr.trim()) {
      toast.error("عنوان الاختبار بالعربية مطلوب");
      return;
    }

    if (quizModalMode === "create") {
      createQuizMutation.mutate({
        titleAr: quizTitleAr.trim(),
        titleEn: quizTitleEn.trim() || undefined,
        lessonId: quizLessonId,
        passScorePercentage: quizPassScore,
        status: quizStatus,
      });
    } else if (quizModalMode === "edit" && editingQuizId) {
      updateQuizMutation.mutate({
        id: editingQuizId,
        titleAr: quizTitleAr.trim(),
        titleEn: quizTitleEn.trim() || undefined,
        lessonId: quizLessonId,
        passScorePercentage: quizPassScore,
        status: quizStatus,
      });
    }
  };

  const handleAddQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuizId) return;

    if (!qTextAr.trim() || qTextAr.trim().length < 5) {
      toast.error("نص السؤال بالعربية مطلوب ويجب أن لا يقل عن 5 أحرف");
      return;
    }
    if (!qOption0.trim() || !qOption1.trim()) {
      toast.error("يجب إدخال خيارين على الأقل");
      return;
    }
    if (!qExplanation.trim() || qExplanation.trim().length < 5) {
      toast.error("التفسير والشرح التعليمي للإجابة مطلوب");
      return;
    }

    const options = [qOption0.trim(), qOption1.trim()];
    if (qOption2.trim()) options.push(qOption2.trim());
    if (qOption3.trim()) options.push(qOption3.trim());

    if (qCorrectIndex >= options.length) {
      toast.error("الرجاء اختيار خيار إجابة صحيح ضمن الخيارات المدخلة");
      return;
    }

    addQuestionMutation.mutate({
      quizId: selectedQuizId,
      questionAr: qTextAr.trim(),
      questionEn: qTextEn.trim() || undefined,
      options,
      correctOptionIndex: qCorrectIndex,
      explanationAr: qExplanation.trim(),
      difficulty: qDifficulty,
    });
  };

  const handleDelete = (id: number, title: string) => {
    if (confirm(`هل أنت متأكد من حذف/أرشفة الدرس "${title}"؟`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleArchiveQuiz = (id: number, title: string) => {
    if (confirm(`هل أنت متأكد من أرشفة الاختبار "${title}"؟`)) {
      archiveQuizMutation.mutate({ id });
    }
  };

  // RBAC Guard
  if (!isAuthorized) {
    return (
      <Card className="border-rose-500/30 bg-rose-950/20 p-8 text-center text-white" dir="rtl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/20 text-rose-400 mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-black text-white">غير مصرح بالوصول (403 Forbidden)</h2>
        <p className="mt-2 text-xs text-slate-300 max-w-md mx-auto leading-6">
          لوحة تحكم المدرّس مخصصة حصرياً للمحاضرين ومسؤولي التوعية المعتمدين وإدارة المنصة. حسابك الحالي لا يمتلك صلاحيات إدارة المحتوى.
        </p>
      </Card>
    );
  }

  const lessons = lessonsQuery.data?.items || [];
  const totalLessons = lessonsQuery.data?.total || 0;
  const categories = categoriesQuery.data || [];
  const quizzes = quizzesQuery.data || [];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
              <GraduationCap size={20} />
            </span>
            <h1 className="text-2xl font-black text-white">لوحة تحكم المدرّس</h1>
            <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 text-xs mr-2">
              إدارة المحتوى التعليمي والاختبارات
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            إدارة وإنشاء وتعديل الدروس والوحدات التوعوية والاختبارات المخصصة في المنظومة.
          </p>
        </div>

        {activeTab === "lessons" ? (
          <Button
            onClick={handleOpenCreate}
            className="gap-2 bg-cyan-400 text-[#081120] hover:bg-cyan-300 font-bold text-xs shadow-lg shadow-cyan-400/10"
          >
            <Plus size={16} />
            إنشاء درس جديد
          </Button>
        ) : (
          <Button
            onClick={handleOpenCreateQuiz}
            className="gap-2 bg-cyan-400 text-[#081120] hover:bg-cyan-300 font-bold text-xs shadow-lg shadow-cyan-400/10"
          >
            <Plus size={16} />
            إنشاء اختبار جديد
          </Button>
        )}
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab("lessons")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "lessons"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <BookOpen size={16} />
          إدارة الدروس ({totalLessons})
        </button>
        <button
          onClick={() => setActiveTab("quizzes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === "quizzes"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/30"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <ClipboardCheck size={16} />
          إدارة الاختبارات ({quizzes.length})
        </button>
      </div>

      {/* ===================== TAB 1: LESSONS ===================== */}
      {activeTab === "lessons" && (
        <div className="space-y-6">
          {/* Metrics Row */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-white/10 bg-[#101a2d] text-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">إجمالي دروسي</p>
                  <p className="text-2xl font-black mt-1">{totalLessons}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  <BookOpen size={20} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#101a2d] text-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">الدروس المنشورة</p>
                  <p className="text-2xl font-black mt-1 text-emerald-300">
                    {lessons.filter((l) => l.status === "published").length}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 size={20} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#101a2d] text-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">المسودات</p>
                  <p className="text-2xl font-black mt-1 text-amber-300">
                    {lessons.filter((l) => l.status === "draft").length}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                  <Layers size={20} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#101a2d] p-3 rounded-xl border border-white/10">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute right-3 top-3 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في عناويني..."
                className="border-white/10 bg-[#0a1424] pr-9 text-xs text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#0a1424] p-1 rounded-lg border border-white/10 text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  statusFilter === "all" ? "bg-cyan-400/20 text-cyan-300 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setStatusFilter("published")}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  statusFilter === "published" ? "bg-emerald-400/20 text-emerald-300 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                المنشورة
              </button>
              <button
                onClick={() => setStatusFilter("draft")}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  statusFilter === "draft" ? "bg-amber-400/20 text-amber-300 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                المسودات
              </button>
              <button
                onClick={() => setStatusFilter("archived")}
                className={`px-3 py-1.5 rounded-md font-medium transition ${
                  statusFilter === "archived" ? "bg-rose-400/20 text-rose-300 font-bold" : "text-slate-400 hover:text-white"
                }`}
              >
                المؤرشفة
              </button>
            </div>
          </div>

          {/* Lessons List */}
          {lessonsQuery.isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <p className="text-xs">جارٍ تحميل قائمة الدروس...</p>
            </div>
          ) : lessons.length === 0 ? (
            <Card className="border-white/10 bg-[#101a2d] p-10 text-center text-white">
              <p className="text-sm font-bold">لم تقم بإنشاء أي دروس بعد، أو لا توجد دروس مطابقة.</p>
              <p className="text-xs text-slate-400 mt-1">
                يمكنك الضغط على زر "إنشاء درس جديد" لإضافة أول درس إلى مسارك.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {lessons.map((lesson) => (
                <Card
                  key={lesson.id}
                  className="border-white/10 bg-[#101a2d] text-white hover:border-white/20 transition"
                >
                  <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center justify-center rounded-lg bg-cyan-400/10 px-2 py-0.5 text-[11px] font-black text-cyan-300 border border-cyan-400/20">
                          الوحدة {lesson.order ?? "—"}
                        </span>

                        {lesson.status === "published" ? (
                          <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[10px] gap-1">
                            <CheckCircle2 size={11} />
                            منشور
                          </Badge>
                        ) : lesson.status === "draft" ? (
                          <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-300 text-[10px]">
                            مسودة
                          </Badge>
                        ) : (
                          <Badge className="border-rose-400/30 bg-rose-400/10 text-rose-300 text-[10px]">
                            مؤرشف
                          </Badge>
                        )}

                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock size={12} />
                          {lesson.durationMinutes ?? 5} دقائق
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white leading-6">
                        {lesson.titleAr}
                      </h3>
                      {lesson.title && (
                        <p className="text-[11px] text-slate-500 font-medium dir-ltr text-right">
                          {lesson.title}
                        </p>
                      )}
                      {lesson.summaryAr && (
                        <p className="text-xs text-slate-300 line-clamp-2 mt-1">
                          {lesson.summaryAr}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(lesson)}
                        className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10 font-bold text-xs gap-1.5 h-8"
                      >
                        <Edit size={13} />
                        تعديل
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(lesson.id, lesson.titleAr)}
                        disabled={deleteMutation.isPending}
                        className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-xs gap-1.5 h-8"
                      >
                        <Trash2 size={13} />
                        أرشفة
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: QUIZZES ===================== */}
      {activeTab === "quizzes" && (
        <div className="space-y-6">
          {/* Quiz Metrics */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-white/10 bg-[#101a2d] text-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">إجمالي اختباراتي</p>
                  <p className="text-2xl font-black mt-1">{quizzes.length}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  <ClipboardCheck size={20} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#101a2d] text-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">الاختبارات المنشورة</p>
                  <p className="text-2xl font-black mt-1 text-emerald-300">
                    {quizzes.filter((q) => q.status === "published").length}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 size={20} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-[#101a2d] text-white">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">المسودات</p>
                  <p className="text-2xl font-black mt-1 text-amber-300">
                    {quizzes.filter((q) => q.status === "draft").length}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                  <Layers size={20} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quizzes List */}
          {quizzesQuery.isLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              <p className="text-xs">جارٍ تحميل قائمة الاختبارات...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <Card className="border-white/10 bg-[#101a2d] p-10 text-center text-white">
              <p className="text-sm font-bold">لم تقم بإنشاء أي اختبارات بعد.</p>
              <p className="text-xs text-slate-400 mt-1">
                اضغط على زر "إنشاء اختبار جديد" أعلاه لإنشاء اختبار وربطه بدرسك.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {quizzes.map((qz) => (
                <Card
                  key={qz.id}
                  className="border-white/10 bg-[#101a2d] text-white hover:border-white/20 transition"
                >
                  <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {qz.status === "published" ? (
                          <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[10px] gap-1">
                            <CheckCircle2 size={11} />
                            منشور
                          </Badge>
                        ) : qz.status === "draft" ? (
                          <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-300 text-[10px]">
                            مسودة
                          </Badge>
                        ) : (
                          <Badge className="border-rose-400/30 bg-rose-400/10 text-rose-300 text-[10px]">
                            مؤرشف
                          </Badge>
                        )}

                        <span className="text-[11px] text-slate-400">
                          درجة النجاح: {qz.passScorePercentage}%
                        </span>

                        <span className="text-[11px] text-cyan-300 font-bold bg-cyan-400/10 px-2 py-0.5 rounded-md border border-cyan-400/20">
                          {qz.questionsCount} أسئلة
                        </span>

                        {qz.lessonTitleAr && (
                          <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                            الدرس المرتبط: {qz.lessonTitleAr}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white leading-6">
                        {qz.titleAr}
                      </h3>
                      {qz.titleEn && (
                        <p className="text-[11px] text-slate-500 font-medium dir-ltr text-right">
                          {qz.titleEn}
                        </p>
                      )}
                    </div>

                    {/* Quiz Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenQuestions(qz.id)}
                        className="border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10 font-bold text-xs gap-1.5 h-8"
                      >
                        <ListPlus size={13} />
                        إدارة الأسئلة ({qz.questionsCount})
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditQuiz(qz)}
                        className="border-white/20 text-slate-300 hover:bg-white/10 font-bold text-xs gap-1.5 h-8"
                      >
                        <Edit size={13} />
                        تعديل
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleArchiveQuiz(qz.id, qz.titleAr)}
                        disabled={archiveQuizMutation.isPending}
                        className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 font-bold text-xs gap-1.5 h-8"
                      >
                        <Trash2 size={13} />
                        أرشفة
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== MODAL: CREATE/EDIT LESSON ===================== */}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && setModalOpen(false)}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-2xl overflow-y-auto border-white/10 bg-[#0f172a] p-6 text-white sm:p-7" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
              <BookOpen size={20} className="text-cyan-400" />
              {modalMode === "create" ? "إنشاء درس توعوي جديد" : "تعديل بيانات الدرس"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              أدخل البيانات الأساسية للدرس. المحتوى سيبدأ كمسودة افتراضياً.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">عنوان الدرس (بالعربية) *</Label>
                <Input
                  value={formTitleAr}
                  onChange={(e) => setFormTitleAr(e.target.value)}
                  placeholder="مثلاً: كشف روابط التصيد الاحتيالي"
                  className="border-white/10 bg-[#1e293b] text-xs text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">عنوان الدرس (بالإنجليزية)</Label>
                <Input
                  value={formTitleEn}
                  onChange={(e) => setFormTitleEn(e.target.value)}
                  placeholder="e.g. Phishing Link Inspection"
                  className="border-white/10 bg-[#1e293b] text-xs text-white dir-ltr text-right"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">ترتيب الدرس (الوحدة)</Label>
                <Input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(parseInt(e.target.value) || 1)}
                  className="border-white/10 bg-[#1e293b] text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">المدة التقديرية (بالدقائق)</Label>
                <Input
                  type="number"
                  value={formDuration}
                  onChange={(e) => setFormDuration(parseInt(e.target.value) || 5)}
                  className="border-white/10 bg-[#1e293b] text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">مستوى الصعوبة</Label>
                <select
                  value={formDifficulty}
                  onChange={(e) => setFormDifficulty(e.target.value as any)}
                  className="w-full h-9 rounded-md border border-white/10 bg-[#1e293b] px-3 text-xs text-white"
                >
                  <option value="beginner">مبتدئ (Beginner)</option>
                  <option value="intermediate">متوسط (Intermediate)</option>
                  <option value="advanced">متقدم (Advanced)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">وصف أو ملخص الدرس</Label>
              <Input
                value={formSummaryAr}
                onChange={(e) => setFormSummaryAr(e.target.value)}
                placeholder="ملخص يوضح أهداف الدرس وما سيتعلمه الطالب..."
                className="border-white/10 bg-[#1e293b] text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">محتوى الدرس التوعوي *</Label>
              <Textarea
                rows={7}
                value={formContentAr}
                onChange={(e) => setFormContentAr(e.target.value)}
                placeholder="اكتب المحتوى التوعوي والشروحات والتوجيهات الأمنية هنا..."
                className="border-white/10 bg-[#1e293b] text-xs text-white leading-relaxed"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">حالة النشر</Label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="lessonStatus"
                    value="draft"
                    checked={formStatus === "draft"}
                    onChange={() => setFormStatus("draft")}
                    className="accent-cyan-400"
                  />
                  <span>مسودة (Draft) — غير مرئي للمتعلمين</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="lessonStatus"
                    value="published"
                    checked={formStatus === "published"}
                    onChange={() => setFormStatus("published")}
                    className="accent-cyan-400"
                  />
                  <span>منشور (Published) — يظهر في مسار التعلم</span>
                </label>
              </div>
            </div>

            <DialogFooter className="mt-6 flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-white/10 text-slate-300 hover:bg-white/5 text-xs"
              >
                إلغاء
              </Button>

              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-cyan-400 text-[#081120] hover:bg-cyan-300 font-bold text-xs gap-1.5"
              >
                <Save size={14} />
                {modalMode === "create" ? "إنشاء الدرس" : "حفظ التعديلات"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================== MODAL: CREATE/EDIT QUIZ ===================== */}
      <Dialog open={quizModalOpen} onOpenChange={(open) => !open && setQuizModalOpen(false)}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-xl overflow-y-auto border-white/10 bg-[#0f172a] p-6 text-white sm:p-7" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
              <ClipboardCheck size={20} className="text-cyan-400" />
              {quizModalMode === "create" ? "إنشاء اختبار جديد" : "تعديل بيانات الاختبار"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              حدد عنوان الاختبار ونسبة النجاح والدرس المرتبط. يبدأ الاختبار كمسودة افتراضياً.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuizSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">عنوان الاختبار (بالعربية) *</Label>
              <Input
                value={quizTitleAr}
                onChange={(e) => setQuizTitleAr(e.target.value)}
                placeholder="مثلاً: اختبار كشف التهديدات السحابية"
                className="border-white/10 bg-[#1e293b] text-xs text-white"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">عنوان الاختبار (بالإنجليزية)</Label>
              <Input
                value={quizTitleEn}
                onChange={(e) => setQuizTitleEn(e.target.value)}
                placeholder="e.g. Cloud Security Quiz"
                className="border-white/10 bg-[#1e293b] text-xs text-white dir-ltr text-right"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">ربط الاختبار بدرس معين</Label>
                <select
                  value={quizLessonId ?? ""}
                  onChange={(e) => setQuizLessonId(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full h-9 rounded-md border border-white/10 bg-[#1e293b] px-3 text-xs text-white"
                >
                  <option value="">بدون درس مرتبط (اختبار مستقل)</option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.titleAr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">نسبة درجة النجاح (%)</Label>
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={quizPassScore}
                  onChange={(e) => setQuizPassScore(parseInt(e.target.value) || 70)}
                  className="border-white/10 bg-[#1e293b] text-xs text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-300">حالة الاختبار</Label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="quizStatus"
                    value="draft"
                    checked={quizStatus === "draft"}
                    onChange={() => setQuizStatus("draft")}
                    className="accent-cyan-400"
                  />
                  <span>مسودة (Draft) — غير متاح للطلاب</span>
                </label>

                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="quizStatus"
                    value="published"
                    checked={quizStatus === "published"}
                    onChange={() => setQuizStatus("published")}
                    className="accent-cyan-400"
                  />
                  <span>منشور (Published) — متاح للحل والتقييم</span>
                </label>
              </div>
            </div>

            <DialogFooter className="mt-6 flex-row gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuizModalOpen(false)}
                className="border-white/10 text-slate-300 hover:bg-white/5 text-xs"
              >
                إلغاء
              </Button>

              <Button
                type="submit"
                disabled={createQuizMutation.isPending || updateQuizMutation.isPending}
                className="bg-cyan-400 text-[#081120] hover:bg-cyan-300 font-bold text-xs gap-1.5"
              >
                <Save size={14} />
                {quizModalMode === "create" ? "إنشاء الاختبار" : "حفظ التعديلات"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===================== MODAL: QUESTIONS MANAGER ===================== */}
      <Dialog open={questionManagerOpen} onOpenChange={(open) => !open && setQuestionManagerOpen(false)}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto border-white/10 bg-[#0f172a] p-6 text-white sm:p-7" dir="rtl">
          <DialogHeader className="text-right">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-black text-white flex items-center gap-2">
                <HelpCircle size={20} className="text-cyan-400" />
                إدارة أسئلة الاختبار: {manageQuizQuery.data?.quiz.titleAr}
              </DialogTitle>
              <Button
                size="sm"
                onClick={() => setIsAddingQuestion(!isAddingQuestion)}
                className="bg-cyan-400 text-[#081120] hover:bg-cyan-300 font-bold text-xs gap-1"
              >
                <Plus size={14} />
                {isAddingQuestion ? "إلغاء إضافة سؤال" : "إضافة سؤال جديد"}
              </Button>
            </div>
            <DialogDescription className="text-xs text-slate-400 mt-1">
              الأسئلة من نوع اختيار من متعدد (Multiple Choice) مع خيار تحديد الإجابة الصحيحة والتفسير التعليمي.
            </DialogDescription>
          </DialogHeader>

          {/* Add Question Form */}
          {isAddingQuestion && (
            <form onSubmit={handleAddQuestionSubmit} className="space-y-4 mt-4 p-4 rounded-xl border border-cyan-400/30 bg-cyan-950/20">
              <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <ListPlus size={15} />
                نموذج إضافة سؤال اختيار من متعدد
              </h4>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">نص السؤال (بالعربية) *</Label>
                <Input
                  value={qTextAr}
                  onChange={(e) => setQTextAr(e.target.value)}
                  placeholder="مثلاً: ما هو الإجراء الصحيح عند استلام بريد يطلب كلمة المرور؟"
                  className="border-white/10 bg-[#1e293b] text-xs text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-300">خيارات الإجابة (اختر الإجابة الصحيحة عبر النقطة) *</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2 bg-[#1e293b] p-2 rounded-lg border border-white/10">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={qCorrectIndex === 0}
                      onChange={() => setQCorrectIndex(0)}
                      className="accent-cyan-400"
                    />
                    <Input
                      value={qOption0}
                      onChange={(e) => setQOption0(e.target.value)}
                      placeholder="الخيار الأول (مطلوب)"
                      className="border-none bg-transparent text-xs text-white h-7 focus-visible:ring-0"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-[#1e293b] p-2 rounded-lg border border-white/10">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={qCorrectIndex === 1}
                      onChange={() => setQCorrectIndex(1)}
                      className="accent-cyan-400"
                    />
                    <Input
                      value={qOption1}
                      onChange={(e) => setQOption1(e.target.value)}
                      placeholder="الخيار الثاني (مطلوب)"
                      className="border-none bg-transparent text-xs text-white h-7 focus-visible:ring-0"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-[#1e293b] p-2 rounded-lg border border-white/10">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={qCorrectIndex === 2}
                      onChange={() => setQCorrectIndex(2)}
                      className="accent-cyan-400"
                    />
                    <Input
                      value={qOption2}
                      onChange={(e) => setQOption2(e.target.value)}
                      placeholder="الخيار الثالث (اختياري)"
                      className="border-none bg-transparent text-xs text-white h-7 focus-visible:ring-0"
                    />
                  </div>

                  <div className="flex items-center gap-2 bg-[#1e293b] p-2 rounded-lg border border-white/10">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={qCorrectIndex === 3}
                      onChange={() => setQCorrectIndex(3)}
                      className="accent-cyan-400"
                    />
                    <Input
                      value={qOption3}
                      onChange={(e) => setQOption3(e.target.value)}
                      placeholder="الخيار الرابع (اختياري)"
                      className="border-none bg-transparent text-xs text-white h-7 focus-visible:ring-0"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300">التفسير والشرح التعليمي للإجابة *</Label>
                <Input
                  value={qExplanation}
                  onChange={(e) => setQExplanation(e.target.value)}
                  placeholder="يشرح للطالب سبب صحة الإجابة وكيفية تجنب الخطر التوعوي..."
                  className="border-white/10 bg-[#1e293b] text-xs text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingQuestion(false)}
                  className="text-xs"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={addQuestionMutation.isPending}
                  className="bg-cyan-400 text-[#081120] font-bold text-xs"
                >
                  حفظ السؤال في الاختبار
                </Button>
              </div>
            </form>
          )}

          {/* Existing Questions List */}
          <div className="space-y-3 mt-4">
            <h4 className="text-xs font-bold text-slate-300">الأسئلة المسجلة في هذا الاختبار:</h4>

            {manageQuizQuery.isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">جارٍ جلب الأسئلة...</div>
            ) : manageQuizQuery.data?.questions.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-white/10 rounded-xl">
                لا توجد أسئلة مسجلة حتى الآن. اضغط على "إضافة سؤال جديد" للبدء.
              </div>
            ) : (
              manageQuizQuery.data?.questions.map((q, idx) => (
                <div key={q.id} className="p-4 rounded-xl border border-white/10 bg-[#1e293b]/60 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400/20 text-cyan-300 text-[10px]">
                        {idx + 1}
                      </span>
                      {q.questionAr}
                    </span>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("هل أنت متأكد من حذف هذا السؤال؟")) {
                          deleteQuestionMutation.mutate({ questionId: q.id });
                        }
                      }}
                      className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-7 px-2"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>

                  {/* Options Display */}
                  <div className="grid gap-1.5 sm:grid-cols-2 pt-1">
                    {q.options.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className={`text-[11px] p-2 rounded-lg flex items-center gap-2 ${
                          oIdx === q.correctOptionIndex
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                            : "bg-[#0f172a] text-slate-400"
                        }`}
                      >
                        {oIdx === q.correctOptionIndex ? (
                          <Check size={13} className="text-emerald-400 shrink-0" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-600 shrink-0" />
                        )}
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>

                  {q.explanationAr && (
                    <p className="text-[11px] text-cyan-300/80 bg-cyan-950/30 p-2 rounded-lg border border-cyan-400/10 mt-2">
                      💡 <strong>التفسير:</strong> {q.explanationAr}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
