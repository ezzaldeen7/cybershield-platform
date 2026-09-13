import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AuthModal } from "@/components/AuthModal";
import { AssessmentModal } from "@/components/AssessmentModal";
import { LearningPathView } from "@/components/LearningPathView";
import { QuizzesHubView } from "@/components/QuizzesHubView";
import { AdminDashboardView } from "@/components/AdminDashboardView";
import { InstructorDashboardView } from "@/components/InstructorDashboardView";
import { WeaknessRecommendationsView } from "@/components/WeaknessRecommendationsView";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  CircleHelp,
  ClipboardCheck,
  GraduationCap,
  Clock3,
  EyeOff,
  FileWarning,
  LayoutDashboard,
  Link2,
  LockKeyhole,
  LogIn,
  LogOut,
  MailWarning,
  Menu,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Section = "overview" | "analyzer" | "lessons" | "quiz" | "admin" | "instructor";
type AnalyzerMode = "link" | "message";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [active, setActive] = useState<Section>("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [assessmentModalOpen, setAssessmentModalOpen] = useState(false);
  const [assessmentType, setAssessmentType] = useState<"initial" | "final">("initial");

  const handleOpenAssessment = (type: "initial" | "final") => {
    setAssessmentType(type);
    setAssessmentModalOpen(true);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#081120] text-slate-100">
      <div className="flex min-h-screen">
        <div className={`${mobileMenu ? "fixed inset-0 z-40 flex" : "hidden"} lg:relative lg:flex`}>
          <div className="absolute inset-0 bg-black/60 lg:hidden" onClick={() => setMobileMenu(false)} />
          <div className="relative z-10 h-full">
            <Sidebar active={active} setActive={setActive} onClose={() => setMobileMenu(false)} userRole={user?.role} />
          </div>
        </div>
        <main className="min-w-0 flex-1 bg-[radial-gradient(circle_at_85%_0%,rgba(14,116,144,.16),transparent_32%),#081120]">
          <header className="flex h-[76px] items-center justify-between border-b border-white/10 px-5 lg:px-10">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-white/10 hover:text-white lg:hidden" onClick={() => setMobileMenu(true)}>
                <Menu size={20} />
              </Button>
              <div className="hidden h-9 w-px bg-white/10 sm:block" />
              <div>
                <p className="text-xs text-slate-500">منصة CyberShield Awareness الأكاديمية</p>
                <p className="mt-1 text-sm font-bold text-slate-200">رحلتك نحو وعي رقمي وأمان سيبراني أقوى</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <div className="hidden text-left sm:block">
                    <p className="text-xs text-slate-400">مرحبًا بك ({user?.role === "admin" ? "أدمن النظام" : user?.role === "instructor" ? "مدرس" : "متعلم"})</p>
                    <p className="text-sm font-bold text-white">{user?.name || user?.email || "مستخدم المنصة"}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-400/10 text-sm font-black text-cyan-200">
                    {(user?.name || user?.email || "م").slice(0, 1).toUpperCase()}
                  </div>
                  <Button variant="ghost" size="icon" title="تسجيل الخروج" className="text-slate-400 hover:bg-white/10 hover:text-white" onClick={() => logout()}>
                    <LogOut size={17} />
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setAuthModalOpen(true)} className="gap-2 bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300">
                  <LogIn size={16} />
                  {loading ? "جارٍ التحميل" : "تسجيل الدخول / حساب جديد"}
                </Button>
              )}
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] p-5 lg:p-10">
            {active === "overview" && (
              <Overview
                setActive={setActive}
                onOpenAssessment={handleOpenAssessment}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            )}
            {active === "analyzer" && <AnalyzerView />}
            {active === "lessons" && (
              <LessonsView
                onOpenAuth={() => setAuthModalOpen(true)}
                onNavigateToQuiz={() => setActive("quiz")}
              />
            )}
            {active === "quiz" && (
              <QuizzesHubView
                onNavigateToLesson={() => setActive("lessons")}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            )}
            {active === "admin" && <AdminView />}
            {active === "instructor" && <InstructorDashboardView />}
          </div>
        </main>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <AssessmentModal
        isOpen={assessmentModalOpen}
        onClose={() => setAssessmentModalOpen(false)}
        type={assessmentType}
        onOpenAuth={() => {
          setAssessmentModalOpen(false);
          setAuthModalOpen(true);
        }}
      />
    </div>
  );
}

function Sidebar({ active, setActive, onClose, userRole }: { active: Section; setActive: (section: Section) => void; onClose: () => void; userRole?: string }) {
  const items = [
    { id: "overview" as Section, label: "نظرة عامة", icon: LayoutDashboard },
    { id: "analyzer" as Section, label: "المحلل الآمن", icon: ScanSearch },
    { id: "lessons" as Section, label: "مسار التوعية", icon: BookOpen },
    { id: "quiz" as Section, label: "اختبر نفسك", icon: ClipboardCheck },
  ];

  if (userRole === "instructor" || userRole === "admin") {
    items.push({ id: "instructor" as Section, label: "لوحة المدرس", icon: GraduationCap });
  }

  if (userRole === "admin") {
    items.push({ id: "admin" as Section, label: "لوحة الأدمن", icon: ShieldAlert });
  }

  return (
    <aside className="flex h-full w-[270px] shrink-0 flex-col border-l border-white/10 bg-[#101a2d] p-5 text-right">
      <div className="mb-10 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-400 text-[#081120] shadow-[0_0_30px_rgba(34,211,238,.25)]">
          <ShieldCheck size={24} />
        </div>
        <div>
          <div className="text-sm font-black tracking-wide text-white">درع الوعي السيبراني</div>
          <div className="mt-0.5 text-[11px] text-slate-400">CyberShield Platform</div>
        </div>
      </div>
      <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.22em] text-slate-500">مساحتك التعليمية</div>
      <nav className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActive(item.id);
                onClose();
              }}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all ${
                selected ? "bg-cyan-400 text-[#081120] shadow-lg shadow-cyan-400/10" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
              {selected && <ChevronLeft className="mr-auto" size={16} />}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl border border-cyan-300/15 bg-cyan-300/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-cyan-200">
          <Sparkles size={16} />
          <span className="text-xs font-bold">تأكيد الأمان</span>
        </div>
        <p className="text-xs leading-6 text-slate-300">التحليل محلي وتعليمي عالي الأمان بدون زيارة الروابط الخارجية.</p>
      </div>
    </aside>
  );
}

function Overview({
  setActive,
  onOpenAssessment,
  onOpenAuth,
}: {
  setActive: (section: Section) => void;
  onOpenAssessment: (type: "initial" | "final") => void;
  onOpenAuth: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const overviewQuery = trpc.learning.overview.useQuery(undefined, { enabled: isAuthenticated });
  const statusQuery = trpc.assessment.getStatus.useQuery(undefined, { enabled: isAuthenticated });

  const status = statusQuery.data;
  const data = overviewQuery.data || {
    completedCount: status?.completedLessonsCount ?? 0,
    totalLessons: 7,
    completedLessonsCount: status?.completedLessonsCount ?? 0,
    passedQuizzesCount: status?.passedQuizzesCount ?? 0,
    totalQuizzes: 7,
    passedScenariosCount: status?.passedScenariosCount ?? 0,
    totalScenarios: 7,
    progressPercentage: Math.min(100, Math.round(((status?.completedLessonsCount ?? 0) / 7) * 100)),
    currentAwarenessScore: status?.hasCompletedPreAssessment ? (status?.preAssessmentScore ?? 0) : 0,
    initialAwarenessScore: status?.hasCompletedPreAssessment ? (status?.preAssessmentScore ?? 0) : 0,
    improvementDelta: status?.improvementDelta ?? 0,
    hasCompletedPreAssessment: status?.hasCompletedPreAssessment ?? false,
    preAssessmentScore: status?.preAssessmentScore ?? null,
    hasCompletedPostAssessment: status?.hasCompletedPostAssessment ?? false,
    postAssessmentScore: status?.postAssessmentScore ?? null,
    canTakePostAssessment: status?.canTakePostAssessment ?? false,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="relative overflow-hidden rounded-[28px] border border-cyan-300/15 bg-[linear-gradient(110deg,rgba(12,44,69,.95),rgba(12,27,49,.9))] p-7 shadow-2xl shadow-cyan-950/30 lg:p-10">
        <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <Badge className="mb-5 border-cyan-300/20 bg-cyan-300/10 text-cyan-200 hover:bg-cyan-300/10">
            <Sparkles size={13} className="ml-1" />
            نظام توعية تفاعلي متكامل
          </Badge>
          <h1 className="text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl">
            تعلّم كيف ترى الخطر السيبراني
            <br />
            <span className="text-cyan-300">قبل أن ينال منك.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300">
            دروس قصيرة تفاعلية، سيناريوهات محاكاة واقعية، واختبارات لتقييم الوعي الأمني قبل وبعد المسار التعليمي.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={() => setActive("lessons")} className="gap-2 bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300">
              <BookOpen size={17} />
              مسار التوعية التعليمي
              <ArrowLeft size={16} />
            </Button>
            <Button onClick={() => setActive("analyzer")} variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              <ScanSearch size={16} className="ml-1" />
              المحلل الآمن
            </Button>
          </div>
        </div>
      </section>

      {/* Assessment Lifecycle & Status Cards */}
      {!isAuthenticated && (
        <Card className="border-cyan-400/20 bg-gradient-to-r from-cyan-950/40 via-[#101a2d] to-[#101a2d] text-white">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">سجّل دخولك لبدء التقييم الأولي وتتبع تقدمك</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    التقييم الأولي يحدد خط الأساس لمستواك الأمني، ويقيس نسبة تطورك الحقيقية بعد إتمام المسار.
                  </p>
                </div>
              </div>
              <Button
                onClick={onOpenAuth}
                className="shrink-0 bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300"
              >
                <LogIn size={16} className="ml-2" />
                تسجيل الدخول / إنشاء حساب
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isAuthenticated && !status?.hasCompletedPreAssessment && (
        <Card className="border-amber-400/30 bg-gradient-to-r from-amber-950/30 via-[#101a2d] to-[#101a2d] text-white">
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="border-amber-400/40 bg-amber-400/10 text-amber-300">
                    خطوة تمهيدية إلزامية
                  </Badge>
                  <span className="text-xs text-slate-400">خط الأساس غير محدد بعد</span>
                </div>
                <h2 className="text-xl font-black text-white">التقييم الأولي للوعي السيبراني (Pre-Assessment)</h2>
                <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-6">
                  ابدأ رحلتك بإجراء التقييم الأولي لقياس معرفتك الحالية في الأمن السيبراني. سيتم تثبيت درجتك كخط أساس (Baseline) لا يتغير، لمقارنته بالتقييم النهائي بعد إكمال المسار.
                </p>
              </div>
              <Button
                onClick={() => onOpenAssessment("initial")}
                size="lg"
                className="shrink-0 gap-2 bg-gradient-to-r from-amber-400 to-amber-500 font-bold text-[#081120] hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-500/20"
              >
                <Sparkles size={18} />
                ابدأ التقييم الأولي الآن
                <ArrowLeft size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isAuthenticated && status?.hasCompletedPreAssessment && status?.hasCompletedPostAssessment && (
        <Card className="border-emerald-400/30 bg-gradient-to-r from-emerald-950/40 via-[#101a2d] to-[#101a2d] text-white">
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="border-emerald-400/40 bg-emerald-400/10 text-emerald-300">
                    <CheckCircle2 size={13} className="ml-1" />
                    أكملت المسار والتقييم النهائي بنجاح
                  </Badge>
                </div>
                <h2 className="text-xl font-black text-white">مستوى الوعي النهائي والتحسن المحقق</h2>
                <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-6">
                  تهانينا! لقد أنهيت المسار التدريبي التوعوي وأجريت التقييم البعدي بنجاح. أظهرت النتائج تطورًا ملموسًا في قدرتك على رصد المخاطر السيبرانية والتعامل معها.
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
                  <div className="rounded-lg bg-black/30 px-3 py-1.5 border border-white/10">
                    <span className="text-slate-400">خط الأساس الأولي: </span>
                    <span className="font-bold text-amber-300">{status.preAssessmentScore}%</span>
                  </div>
                  <div className="rounded-lg bg-black/30 px-3 py-1.5 border border-white/10">
                    <span className="text-slate-400">التقييم البعدي النهائي: </span>
                    <span className="font-bold text-emerald-300">{status.postAssessmentScore}%</span>
                  </div>
                  <div className="rounded-lg bg-emerald-400/10 px-3 py-1.5 border border-emerald-400/30 font-bold text-emerald-300">
                    نسبة التحسن: +{status.improvementDelta}%
                  </div>
                </div>
              </div>
              <Button
                onClick={() => onOpenAssessment("final")}
                variant="outline"
                className="shrink-0 gap-2 border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
              >
                <Trophy size={16} />
                مراجعة نتائج التقييم النهائي
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isAuthenticated && status?.hasCompletedPreAssessment && status?.canTakePostAssessment && !status?.hasCompletedPostAssessment && (
        <Card className="border-cyan-400/30 bg-gradient-to-r from-cyan-950/40 via-[#101a2d] to-[#101a2d] text-white">
          <CardContent className="p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="border-cyan-400/40 bg-cyan-400/10 text-cyan-300">
                    <Sparkles size={13} className="ml-1" />
                    جاهز للاختبار النهائي
                  </Badge>
                </div>
                <h2 className="text-xl font-black text-white">التقييم البعدي مفتوح الآن! (Post-Assessment)</h2>
                <p className="max-w-2xl text-xs sm:text-sm text-slate-300 leading-6">
                  أحسنت! لقد أتممت جميع الدروس الـ 7 واجتزت كافة الاختبارات والسيناريوهات التفاعلية بنجاح. أنت الآن مؤهل لخوض التقييم البعدي لقياس التطور النهائي لوعيك السيبراني.
                </p>
              </div>
              <Button
                onClick={() => onOpenAssessment("final")}
                size="lg"
                className="shrink-0 gap-2 bg-gradient-to-r from-cyan-400 to-cyan-500 font-bold text-[#081120] hover:from-cyan-300 hover:to-cyan-400 shadow-lg shadow-cyan-500/20"
              >
                <Trophy size={18} />
                ابدأ التقييم البعدي النهائي
                <ArrowLeft size={16} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isAuthenticated && status?.hasCompletedPreAssessment && !status?.canTakePostAssessment && !status?.hasCompletedPostAssessment && (
        <Card className="border-white/10 bg-[#101a2d] text-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Target size={18} className="text-cyan-400" />
                متطلبات فتح التقييم البعدي النهائي (Post-Assessment Gate)
              </CardTitle>
              <Badge variant="outline" className="border-white/15 text-slate-400 text-xs">
                مرحلة التعلم النشط
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-slate-400 mb-4 leading-5">
              يتطلب التقييم البعدي إكمال كافة عناصر المسار التعليمي لضمان قياس دقيق وموثوق لنسبة التحسن الأمني:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Pre-Assessment */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">التقييم الأولي</p>
                  <p className="text-[11px] text-emerald-300">مكتمل ({status.preAssessmentScore}%)</p>
                </div>
              </div>

              {/* 2. Lessons */}
              <div className={`rounded-xl border p-3.5 flex items-center gap-3 ${
                status.completedLessonsCount >= 7
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-white/10 bg-[#0a1424]"
              }`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  status.completedLessonsCount >= 7
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/5 text-slate-400"
                }`}>
                  {status.completedLessonsCount >= 7 ? <CheckCircle2 size={18} /> : <BookOpen size={18} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">الدروس التعليمية</p>
                  <p className="text-[11px] text-slate-400">
                    {status.completedLessonsCount} / 7 دروس
                  </p>
                </div>
              </div>

              {/* 3. Quizzes */}
              <div className={`rounded-xl border p-3.5 flex items-center gap-3 ${
                status.passedQuizzesCount >= 7
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-white/10 bg-[#0a1424]"
              }`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  status.passedQuizzesCount >= 7
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/5 text-slate-400"
                }`}>
                  {status.passedQuizzesCount >= 7 ? <CheckCircle2 size={18} /> : <ClipboardCheck size={18} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">اختبارات المعرفة</p>
                  <p className="text-[11px] text-slate-400">
                    {status.passedQuizzesCount} / 7 اختبارات
                  </p>
                </div>
              </div>

              {/* 4. Scenarios */}
              <div className={`rounded-xl border p-3.5 flex items-center gap-3 ${
                status.passedScenariosCount >= 7
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-white/10 bg-[#0a1424]"
              }`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  status.passedScenariosCount >= 7
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-white/5 text-slate-400"
                }`}>
                  {status.passedScenariosCount >= 7 ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">السيناريوهات التفاعلية</p>
                  <p className="text-[11px] text-slate-400">
                    {status.passedScenariosCount} / 7 سيناريوهات
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                onClick={() => setActive("lessons")}
                variant="outline"
                size="sm"
                className="gap-2 border-white/15 text-xs text-slate-200 hover:bg-white/10"
              >
                متابعة مسار التوعية الآن
                <ChevronLeft size={14} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Target}
          label="درجة الوعي الأمني"
          value={`${data.currentAwarenessScore}%`}
          note={
            !isAuthenticated
              ? "يتطلب تسجيل الدخول"
              : status?.hasCompletedPreAssessment
              ? `الدرجة الأولية: ${status.preAssessmentScore}%`
              : "التقييم الأولي معلق"
          }
          accent="cyan"
        />
        <StatCard
          icon={Activity}
          label="الدروس المكتملة"
          value={`${data.completedCount} / 7`}
          note="من 7 دروس رسمية"
          accent="violet"
        />
        <StatCard
          icon={ClipboardCheck}
          label="الاختبارات المجتازة"
          value={`${data.passedQuizzesCount ?? status?.passedQuizzesCount ?? 0} / 7`}
          note="نسبة الاجتياز 70%"
          accent="amber"
        />
        <StatCard
          icon={ShieldAlert}
          label="السيناريوهات الناجحة"
          value={`${data.passedScenariosCount ?? status?.passedScenariosCount ?? 0} / 7`}
          note={
            status?.hasCompletedPostAssessment
              ? `تحسن نهائي: +${data.improvementDelta}%`
              : "من 7 سيناريوهات واقعية"
          }
          accent="emerald"
        />
      </section>

      {/* Weaknesses & Recommendations Section */}
      {isAuthenticated && (
        <WeaknessRecommendationsView setActive={setActive} />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, note, accent }: { icon: typeof Target; label: string; value: string; note: string; accent: string }) {
  const colors: Record<string, string> = {
    cyan: "text-cyan-300 bg-cyan-300/10",
    violet: "text-violet-300 bg-violet-300/10",
    amber: "text-amber-300 bg-amber-300/10",
    emerald: "text-emerald-300 bg-emerald-300/10",
  };
  return (
    <Card className="border-white/10 bg-[#101a2d] text-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-black">{value}</p>
            <p className="mt-2 text-[11px] text-slate-500">{note}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors[accent]}`}>
            <Icon size={19} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyzerView() {
  const [mode, setMode] = useState<AnalyzerMode>("link");
  const [input, setInput] = useState("");

  const urlMutation = trpc.analyzer.analyzeUrl.useMutation();
  const messageMutation = trpc.analyzer.analyzeMessage.useMutation();

  const handleAnalyze = () => {
    if (!input.trim()) return toast.error("يرجى إدخال النص المطلوب تحليله");
    if (mode === "link") {
      urlMutation.mutate({ url: input });
    } else {
      messageMutation.mutate({ message: input });
    }
  };

  const activeMutation = mode === "link" ? urlMutation : messageMutation;
  const result = activeMutation.data;

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <ScanSearch size={23} />
        </div>
        <div>
          <p className="text-xs font-bold tracking-wide text-cyan-300">تحليل بدون مخاطرة (Safe Static Analysis)</p>
          <h1 className="mt-1 text-3xl font-black text-white">المحلل الآمن للروابط والرسائل</h1>
          <p className="mt-2 text-sm text-slate-400">افحص المؤشرات النصية والتركيبية دون زيارة الرابط أو الاتصال بمصدر خارجي.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="border-white/10 bg-[#101a2d] text-white">
          <CardContent className="p-5 sm:p-7">
            <div className="mb-6 flex flex-wrap gap-2 rounded-xl bg-[#0a1424] p-1">
              <button
                onClick={() => {
                  setMode("link");
                  urlMutation.reset();
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition ${
                  mode === "link" ? "bg-cyan-400 text-[#081120]" : "text-slate-400 hover:text-white"
                }`}
              >
                <Link2 size={16} />
                تحليل رابط
              </button>
              <button
                onClick={() => {
                  setMode("message");
                  messageMutation.reset();
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold transition ${
                  mode === "message" ? "bg-cyan-400 text-[#081120]" : "text-slate-400 hover:text-white"
                }`}
              >
                <MailWarning size={16} />
                تحليل رسالة
              </button>
            </div>

            <label className="mb-2 block text-sm font-bold text-slate-200">{mode === "link" ? "الرابط التدريبي" : "نص الرسالة التدريبية"}</label>

            {mode === "link" ? (
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="مثال: http://secure-verify.bank-update.test/login"
                className="h-12 border-white/10 bg-[#0a1424] text-left text-sm text-white placeholder:text-slate-600"
                dir="ltr"
              />
            ) : (
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="الصق هنا رسالة وهمية، مثل: تنبيه عاجل سيتم إيقاف حسابك..."
                className="min-h-40 border-white/10 bg-[#0a1424] text-sm leading-7 text-white placeholder:text-slate-600"
              />
            )}

            <Button onClick={handleAnalyze} disabled={activeMutation.isPending} className="mt-6 h-12 w-full gap-2 bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300">
              <ScanSearch size={17} />
              {activeMutation.isPending ? "جارٍ الفحص عبر السيرفر..." : "حلّل المؤشرات الآن"}
            </Button>

            {result && (
              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">خلاصة تقييم الخطر المفسر</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-3xl font-black text-white">
                        {result.riskScore}
                        <span className="text-sm text-slate-500">/100</span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                          result.riskLevel === "high" || result.riskLevel === "critical"
                            ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                            : result.riskLevel === "medium"
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                            : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                        }`}
                      >
                        {result.labelAr}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-4 rounded-xl bg-white/[.03] p-3 text-xs leading-6 text-slate-300">{result.summaryAr}</p>

                <div className="mt-4 space-y-2">
                  {result.findings.map((f, i) => (
                    <div key={i} className="flex gap-3 rounded-xl border border-white/8 bg-[#0a1424] p-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-400/10 text-rose-300">
                        <AlertTriangle size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">{f.titleAr}</p>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">{f.detailAr}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LessonsView({
  onOpenAuth,
  onNavigateToQuiz,
}: {
  onOpenAuth: () => void;
  onNavigateToQuiz: () => void;
}) {
  return <LearningPathView onOpenAuth={onOpenAuth} onNavigateToQuiz={onNavigateToQuiz} />;
}



function AdminView() {
  return <AdminDashboardView />;
}
