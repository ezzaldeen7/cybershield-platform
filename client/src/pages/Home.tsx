import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AuthModal } from "@/components/AuthModal";
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

type Section = "overview" | "analyzer" | "lessons" | "quiz" | "admin";
type AnalyzerMode = "link" | "message";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [active, setActive] = useState<Section>("overview");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

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
            {active === "overview" && <Overview setActive={setActive} />}
            {active === "analyzer" && <AnalyzerView />}
            {active === "lessons" && <LessonsView />}
            {active === "quiz" && <QuizView />}
            {active === "admin" && <AdminView />}
          </div>
        </main>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
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

function Overview({ setActive }: { setActive: (section: Section) => void }) {
  const overviewQuery = trpc.learning.overview.useQuery();
  const data = overviewQuery.data || {
    completedCount: 2,
    totalLessons: 4,
    progressPercentage: 50,
    currentAwarenessScore: 65,
    initialAwarenessScore: 40,
    improvementDelta: 25,
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
            دروس قصيرة dinamic، تمارين مغلقة، واختبارات مع محركات تحليل ذكية تعتمد البيانات الحقيقية من السيرفر.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button onClick={() => setActive("analyzer")} className="gap-2 bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300">
              <ScanSearch size={17} />
              ابدأ التحليل الآمن
              <ArrowLeft size={16} />
            </Button>
            <Button onClick={() => setActive("quiz")} variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              اختبر معرفتك
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Target} label="درجة الوعي الأمني" value={`${data.currentAwarenessScore}%`} note={`الدرجة الأولية: ${data.initialAwarenessScore}%`} accent="cyan" />
        <StatCard icon={Activity} label="الدروس المكتملة" value={`${data.completedCount} / ${data.totalLessons}`} note="مستمر بالتقدم" accent="violet" />
        <StatCard icon={Trophy} label="نسبة الإنجاز العامة" value={`${data.progressPercentage}%`} note="من المسار التعليمي" accent="amber" />
        <StatCard icon={ShieldAlert} label="نسبة التحسن (Delta)" value={`+${data.improvementDelta}%`} note="مقارنة بالتقييم الأولي" accent="emerald" />
      </section>
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

function LessonsView() {
  const lessonsQuery = trpc.content.list.useQuery({});
  const lessonsList = lessonsQuery.data?.items || [];
  const completeMutation = trpc.learning.completeLesson.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل إكمال الدرس وتحديث درجات الوعي في السيرفر!");
    },
  });

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <BookOpen size={23} />
        </div>
        <div>
          <p className="text-xs font-bold tracking-wide text-cyan-300">المحتوى التعليمي الديناميكي</p>
          <h1 className="mt-1 text-3xl font-black text-white">مسار التوعية الأكاديمي</h1>
          <p className="mt-2 text-sm text-slate-400">دروس تفاعلية محملة مباشرة من قاعدة البيانات.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {lessonsList.map((lesson) => (
          <Card key={lesson.id} className="group border-white/10 bg-[#101a2d] text-white">
            <CardContent className="flex gap-5 p-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                <BookOpen size={25} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-white/10 text-[10px] text-slate-400">
                    {lesson.difficulty}
                  </Badge>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock3 size={12} />
                    {lesson.durationMinutes} دقائق
                  </span>
                </div>
                <h2 className="mt-3 text-base font-black">{lesson.titleAr}</h2>
                <p className="mt-2 text-xs leading-6 text-slate-400">{lesson.summaryAr}</p>
                <Button
                  onClick={() => completeMutation.mutate({ lessonId: lesson.id })}
                  disabled={completeMutation.isPending}
                  variant="ghost"
                  className="mt-3 -mr-3 gap-1 px-3 text-xs text-cyan-300 hover:bg-cyan-300/10 hover:text-cyan-200"
                >
                  تسجيل إكمال الدرس <Check size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QuizView() {
  const quizQuery = trpc.quiz.getQuestions.useQuery({});
  const submitMutation = trpc.quiz.submit.useMutation();

  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Array<{ questionId: number; selectedOptionIndex: number }>>([]);

  const questions = quizQuery.data || [];
  const currentQuestion = questions[quizIndex];

  const handleSelectOption = (index: number) => {
    if (!currentQuestion || selectedAnswer !== null) return;
    setSelectedAnswer(index);
    setUserAnswers((prev) => [...prev, { questionId: currentQuestion.id, selectedOptionIndex: index }]);
  };

  const handleNext = () => {
    if (quizIndex < questions.length - 1) {
      setQuizIndex(quizIndex + 1);
      setSelectedAnswer(null);
    } else {
      submitMutation.mutate({ quizId: 1, answers: userAnswers });
    }
  };

  const result = submitMutation.data;

  if (result) {
    return (
      <div className="mx-auto max-w-2xl animate-in fade-in duration-500">
        <Card className="border-cyan-300/20 bg-[#101a2d] text-center text-white">
          <CardContent className="p-8 sm:p-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-400/10 text-amber-300">
              <Trophy size={38} />
            </div>
            <p className="mt-6 text-xs font-bold text-cyan-300">نتيجة الاختبار المسجلة بالسيرفر</p>
            <h1 className="mt-2 text-3xl font-black">
              {result.correctAnswers} / {result.totalQuestions} ({result.scorePercentage}%)
            </h1>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-400">
              {result.passed ? "ممتاز! لديك أساس جيد لاكتشاف مؤشرات الخطر." : "راجع الدروس الموصى بها ثم أعد الاختبار لترسيخ المفاهيم."}
            </p>
            <Button
              onClick={() => {
                submitMutation.reset();
                setQuizIndex(0);
                setSelectedAnswer(null);
                setUserAnswers([]);
              }}
              className="mt-8 gap-2 bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300"
            >
              إعادة الاختبار
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentQuestion) return <div className="p-10 text-center text-slate-400">جارٍ تحميل أسئلة الاختبار...</div>;

  const options: string[] = JSON.parse(currentQuestion.optionsJson || "[]");

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <ClipboardCheck size={23} />
        </div>
        <div>
          <p className="text-xs font-bold tracking-wide text-cyan-300">اختبر فهمك الأمني</p>
          <h1 className="mt-1 text-3xl font-black text-white">محرك الاختبارات التفاعلي</h1>
        </div>
      </div>

      <Card className="mx-auto max-w-3xl border-white/10 bg-[#101a2d] text-white">
        <CardContent className="p-6 sm:p-9">
          <div className="mb-8 flex items-center justify-between text-xs">
            <span className="font-bold text-cyan-300">
              السؤال {quizIndex + 1} من {questions.length}
            </span>
          </div>

          <h2 className="text-xl font-black leading-9 text-white">{currentQuestion.questionAr}</h2>

          <div className="mt-7 space-y-3">
            {options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleSelectOption(i)}
                className={`flex w-full items-center gap-3 rounded-xl border p-4 text-right text-sm transition ${
                  selectedAnswer === i ? "border-cyan-400/50 bg-cyan-400/10" : "border-white/10 bg-[#0a1424] text-slate-300 hover:border-cyan-300/30"
                }`}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-current/20 text-xs font-bold">{i + 1}</span>
                <span>{opt}</span>
              </button>
            ))}
          </div>

          {selectedAnswer !== null && (
            <div className="mt-6 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-4 text-xs leading-6 text-slate-300">
              <span className="font-bold text-cyan-200">الشرح الأمني: </span>
              {currentQuestion.explanationAr}
            </div>
          )}

          <div className="mt-8 flex justify-end">
            {selectedAnswer !== null && (
              <Button onClick={handleNext} className="gap-2 bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300">
                {quizIndex === questions.length - 1 ? "إرسال الاختبار للسيرفر" : "السؤال التالي"}
                <ChevronLeft size={16} />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminView() {
  const statsQuery = trpc.admin.stats.useQuery();
  const usersQuery = trpc.admin.usersList.useQuery({});
  const auditQuery = trpc.admin.auditLogs.useQuery({});
  const utils = trpc.useUtils();

  const roleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث دور المستخدم بنجاح");
      utils.admin.usersList.invalidate();
    },
  });

  const stats = statsQuery.data || {
    totalUsers: 1,
    publishedLessons: 4,
    quizAttempts: 0,
    avgAwarenessScore: 70,
    securityEventsCount: 0,
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
          <ShieldAlert size={23} />
        </div>
        <div>
          <p className="text-xs font-bold tracking-wide text-cyan-300">لوحة الإدارة والتحكم (Admin Dashboard)</p>
          <h1 className="mt-1 text-3xl font-black text-white">مراقبة النظام والمستخدمين والأنشطة الأمنية</h1>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="إجمالي المستخدمين المسجلين" value={String(stats.totalUsers)} note="حسابات محققة" accent="cyan" />
        <StatCard icon={BookOpen} label="الدروس التعليمية المنشورة" value={String(stats.publishedLessons)} note="متاحة للمتعلمين" accent="violet" />
        <StatCard icon={ClipboardCheck} label="محاولات الاختبارات" value={String(stats.quizAttempts)} note="تم تقييمها بالسيرفر" accent="amber" />
        <StatCard icon={ShieldCheck} label="متوسط الوعي العام" value={`${stats.avgAwarenessScore}%`} note="حسب إحصائيات النظام" accent="emerald" />
      </div>

      <Card className="border-white/10 bg-[#101a2d] text-white">
        <CardHeader>
          <CardTitle className="text-base font-bold">إدارة المستخدمين والأدوار (User & RBAC Management)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(usersQuery.data || []).map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0a1424] p-4 text-xs">
                <div>
                  <p className="font-bold text-slate-100">{u.name || "مستخدم"}</p>
                  <p className="mt-1 text-slate-400">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-cyan-300/30 bg-cyan-400/10 text-cyan-200">
                    الدور الحالي: {u.role}
                  </Badge>

                  {u.role !== "admin" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => roleMutation.mutate({ userId: u.id, role: "admin" })}
                      className="border-white/15 text-xs hover:bg-white/10"
                    >
                      ترقية إلى Admin
                    </Button>
                  )}
                  {u.role !== "instructor" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => roleMutation.mutate({ userId: u.id, role: "instructor" })}
                      className="border-white/15 text-xs hover:bg-white/10"
                    >
                      ترقية إلى Instructor
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
