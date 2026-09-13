import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import {
  ShieldAlert,
  Users,
  BookOpen,
  ClipboardCheck,
  ShieldCheck,
  ScanSearch,
  AlertTriangle,
  FileText,
  UserCheck,
  Lock,
  Globe,
  Monitor,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function renderDetails(rawJson: string | null | undefined) {
  if (!rawJson || rawJson.trim() === "") return <span className="text-slate-500 text-xs">—</span>;
  try {
    const parsed = JSON.parse(rawJson);
    if (typeof parsed !== "object" || parsed === null) {
      return <span className="text-slate-400 text-xs">{String(rawJson)}</span>;
    }
    const entries = Object.entries(parsed);
    if (entries.length === 0) return <span className="text-slate-500 text-xs">—</span>;
    return (
      <div className="flex flex-wrap gap-1 text-[11px]">
        {entries.map(([k, v]) => (
          <span key={k} className="rounded bg-black/40 px-1.5 py-0.5 border border-white/5 text-slate-300 font-mono">
            <span className="text-cyan-300 font-semibold">{k}:</span> {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </span>
        ))}
      </div>
    );
  } catch {
    return <span className="text-slate-400 text-xs">{String(rawJson).slice(0, 80)}</span>;
  }
}

export function AdminDashboardView() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [auditSeverity, setAuditSeverity] = useState<"info" | "warning" | "critical" | undefined>(undefined);
  const [securitySeverity, setSecuritySeverity] = useState<"info" | "warning" | "critical" | undefined>(undefined);

  // Queries
  const statsQuery = trpc.admin.stats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const usersQuery = trpc.admin.usersList.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const auditQuery = trpc.admin.auditLogs.useQuery(
    auditSeverity ? { limit: 50, severity: auditSeverity } : { limit: 50 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const securityEventsQuery = trpc.admin.securityEvents.useQuery(
    securitySeverity ? { limit: 50, severity: securitySeverity } : { limit: 50 },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  const roleMutation = trpc.admin.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث دور المستخدم بنجاح وتسجيل العملية في سجل التدقيق.");
      utils.admin.usersList.invalidate();
      utils.admin.auditLogs.invalidate();
      utils.admin.stats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "تعذر تحديث دور المستخدم.");
    },
  });

  // Access Control Guard
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-2xl animate-in fade-in duration-300 pt-10">
        <Card className="border-rose-500/30 bg-gradient-to-b from-rose-950/40 via-[#101a2d] to-[#101a2d] p-8 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <Lock size={32} />
          </div>
          <h2 className="mt-4 text-2xl font-black text-white">غير مصرح بالوصول (Access Denied)</h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-6 max-w-md mx-auto">
            لوحة الإدارة والتدقيق مخصصة فقط لمديري النظام (Administrators). جميع سجلات العمليات وعناوين IP والأحداث الأمنية محمية ومقيدة بصلاحيات RBAC الإدارية.
          </p>
        </Card>
      </div>
    );
  }

  const stats = statsQuery.data || {
    totalUsers: 1,
    publishedLessons: 7,
    quizAttempts: 0,
    avgAwarenessScore: 70,
    analyzerRequests: 0,
    securityEventsCount: 0,
  };

  const auditLogsList = auditQuery.data || [];
  const securityEventsList = securityEventsQuery.data || [];
  const usersList = usersQuery.data || [];

  return (
    <div className="space-y-7 animate-in fade-in duration-500">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/10 text-cyan-300">
            <ShieldAlert size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge className="border-cyan-400/30 bg-cyan-400/10 text-cyan-300 text-[11px]">
                نظام التحكم والمراقبة الإداري (RBAC Enforced)
              </Badge>
              <Badge className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-[11px]">
                المسؤول: {user?.name || "مدير النظام"}
              </Badge>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">لوحة الإدارة والتدقيق الأمني</h1>
            <p className="text-xs text-slate-400 mt-1">
              مراقبة أنشطة المنصة، سجلات التدقيق (Audit Logs)، التهديدات والأحداث الأمنية، وإدارة المستخدمين.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            utils.admin.stats.invalidate();
            utils.admin.auditLogs.invalidate();
            utils.admin.securityEvents.invalidate();
            utils.admin.usersList.invalidate();
            toast.info("تم تحديث البيانات الإدارية.");
          }}
          className="gap-2 border-white/15 bg-white/5 text-xs text-slate-300 hover:bg-white/10"
        >
          <RefreshCw size={14} />
          تحديث السجلات
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="border-white/10 bg-[#101a2d] text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                <Users size={18} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">إجمالي المستخدمين</span>
                <span className="text-xl font-black">{stats.totalUsers}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#101a2d] text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                <BookOpen size={18} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">الدروس المنشورة</span>
                <span className="text-xl font-black">{stats.publishedLessons} / 7</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#101a2d] text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
                <ClipboardCheck size={18} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">محاولات الاختبارات</span>
                <span className="text-xl font-black">{stats.quizAttempts}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#101a2d] text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                <ShieldCheck size={18} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">متوسط الوعي العام</span>
                <span className="text-xl font-black">{stats.avgAwarenessScore}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#101a2d] text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
                <ScanSearch size={18} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">فحوصات المحلل</span>
                <span className="text-xl font-black">{stats.analyzerRequests}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-[#101a2d] text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-400/10 text-rose-300">
                <AlertTriangle size={18} />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">الأحداث الأمنية</span>
                <span className="text-xl font-black">{stats.securityEventsCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Container */}
      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="bg-[#0a1424] border border-white/10 p-1 rounded-xl">
          <TabsTrigger value="audit" className="gap-2 text-xs">
            <FileText size={14} />
            سجلات التدقيق (Audit Logs)
            <Badge variant="outline" className="border-white/15 text-[10px]">
              {auditLogsList.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 text-xs">
            <AlertTriangle size={14} />
            الأحداث الأمنية (Security Events)
            <Badge variant="outline" className="border-white/15 text-[10px]">
              {securityEventsList.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2 text-xs">
            <UserCheck size={14} />
            إدارة المستخدمين والصلاحيات (RBAC)
            <Badge variant="outline" className="border-white/15 text-[10px]">
              {usersList.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ---------------- TAB 1: AUDIT LOGS ---------------- */}
        <TabsContent value="audit" className="space-y-4 mt-4">
          <Card className="border-white/10 bg-[#101a2d] text-white">
            <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText size={18} className="text-cyan-400" />
                  سجل تدقيق العمليات (Audit Trail)
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  سجل مفصل للعمليات وتغيير الأدوار وتسجيل الدخول وأنشطة المنصة المحمية.
                </p>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px] ml-1">تصفية الخطورة:</span>
                <Button
                  size="sm"
                  variant={auditSeverity === undefined ? "default" : "outline"}
                  onClick={() => setAuditSeverity(undefined)}
                  className="h-7 text-xs px-2.5"
                >
                  الكل
                </Button>
                <Button
                  size="sm"
                  variant={auditSeverity === "info" ? "default" : "outline"}
                  onClick={() => setAuditSeverity("info")}
                  className="h-7 text-xs px-2.5"
                >
                  معلومات (Info)
                </Button>
                <Button
                  size="sm"
                  variant={auditSeverity === "warning" ? "default" : "outline"}
                  onClick={() => setAuditSeverity("warning")}
                  className="h-7 text-xs px-2.5"
                >
                  تحذير (Warning)
                </Button>
                <Button
                  size="sm"
                  variant={auditSeverity === "critical" ? "default" : "outline"}
                  onClick={() => setAuditSeverity("critical")}
                  className="h-7 text-xs px-2.5"
                >
                  حرج (Critical)
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {auditLogsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  لا توجد سجلات تدقيق مسجلة حالياً ضمن هذا التصنيف.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {auditLogsList.map((log) => {
                    const sevColor =
                      log.severity === "critical"
                        ? "border-rose-400/40 bg-rose-400/10 text-rose-300"
                        : log.severity === "warning"
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                        : "border-cyan-400/40 bg-cyan-400/10 text-cyan-300";

                    const sevLabel =
                      log.severity === "critical"
                        ? "حرج (Critical)"
                        : log.severity === "warning"
                        ? "تحذير (Warning)"
                        : "معلومات (Info)";

                    return (
                      <div
                        key={log.id}
                        className="rounded-xl border border-white/8 bg-[#0a1424] p-3.5 text-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-cyan-300 font-bold">#{log.id}</span>
                            <Badge className={"text-[10px] font-bold " + sevColor}>
                              {sevLabel}
                            </Badge>
                            <span className="font-bold text-white font-mono">{log.action}</span>
                            <Badge variant="outline" className="border-white/10 text-[10px] text-slate-300">
                              {log.eventType}
                            </Badge>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(log.timestamp).toLocaleString("ar-SA")}
                          </span>
                        </div>

                        {/* Admin Sensitive Context (IP & User Agent) */}
                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1 border-t border-white/5">
                          <span>
                            المستخدم:{" "}
                            <span className="text-slate-200 font-semibold">
                              {log.userId ? "مستخدم #" + log.userId : "نظام / غير مسجل"}
                            </span>
                          </span>
                          {log.ipAddress && (
                            <span className="flex items-center gap-1 font-mono">
                              <Globe size={12} className="text-cyan-400" />
                              IP: {log.ipAddress}
                            </span>
                          )}
                          {log.userAgent && (
                            <span className="flex items-center gap-1 font-mono line-clamp-1 max-w-xs" title={log.userAgent}>
                              <Monitor size={12} className="text-slate-400" />
                              {log.userAgent.slice(0, 45)}...
                            </span>
                          )}
                        </div>

                        {/* Safe Details Rendering */}
                        {log.detailsJson && (
                          <div className="pt-1">
                            {renderDetails(log.detailsJson)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- TAB 2: SECURITY EVENTS ---------------- */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <Card className="border-white/10 bg-[#101a2d] text-white">
            <CardHeader className="pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <AlertTriangle size={18} className="text-amber-400" />
                  الأحداث والتنبيهات الأمنية (Security Events)
                </CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  رصد التهديدات ومحاولات الهجوم والمحاولات المشبوهة المسجلة في السيرفر.
                </p>
              </div>

              {/* Severity Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px] ml-1">تصفية الخطورة:</span>
                <Button
                  size="sm"
                  variant={securitySeverity === undefined ? "default" : "outline"}
                  onClick={() => setSecuritySeverity(undefined)}
                  className="h-7 text-xs px-2.5"
                >
                  الكل
                </Button>
                <Button
                  size="sm"
                  variant={securitySeverity === "info" ? "default" : "outline"}
                  onClick={() => setSecuritySeverity("info")}
                  className="h-7 text-xs px-2.5"
                >
                  معلومات (Info)
                </Button>
                <Button
                  size="sm"
                  variant={securitySeverity === "warning" ? "default" : "outline"}
                  onClick={() => setSecuritySeverity("warning")}
                  className="h-7 text-xs px-2.5"
                >
                  تحذير (Warning)
                </Button>
                <Button
                  size="sm"
                  variant={securitySeverity === "critical" ? "default" : "outline"}
                  onClick={() => setSecuritySeverity("critical")}
                  className="h-7 text-xs px-2.5"
                >
                  حرج (Critical)
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {securityEventsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  لم يتم تسجيل أي أحداث أمنية مشبوهة حتى الآن.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {securityEventsList.map((evt) => {
                    const sevColor =
                      evt.severity === "critical"
                        ? "border-rose-400/40 bg-rose-400/10 text-rose-300"
                        : evt.severity === "warning"
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                        : "border-cyan-400/40 bg-cyan-400/10 text-cyan-300";

                    const sevLabel =
                      evt.severity === "critical"
                        ? "حرج (Critical)"
                        : evt.severity === "warning"
                        ? "تحذير (Warning)"
                        : "معلومات (Info)";

                    return (
                      <div
                        key={evt.id}
                        className="rounded-xl border border-white/8 bg-[#0a1424] p-3.5 text-xs space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-amber-300 font-bold">#{evt.id}</span>
                            <Badge className={"text-[10px] font-bold " + sevColor}>
                              {sevLabel}
                            </Badge>
                            <span className="font-bold text-white font-mono">{evt.eventType}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(evt.timestamp).toLocaleString("ar-SA")}
                          </span>
                        </div>

                        {evt.ipAddress && (
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono pt-1 border-t border-white/5">
                            <Globe size={12} className="text-cyan-400" />
                            عنوان IP المصدر: <span className="text-slate-200">{evt.ipAddress}</span>
                          </div>
                        )}

                        {/* Safe Details Rendering */}
                        {evt.detailsJson && (
                          <div className="pt-1">
                            {renderDetails(evt.detailsJson)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- TAB 3: USERS & RBAC ---------------- */}
        <TabsContent value="users" className="space-y-4 mt-4">
          <Card className="border-white/10 bg-[#101a2d] text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck size={18} className="text-emerald-400" />
                إدارة المستخدمين والأدوار (User & Role Management)
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                قائمة الحسابات المسجلة مع إمكانية تعديل أدوار RBAC بصلاحيات فورية تسجل في سجل التدقيق.
              </p>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {usersList.map((u) => {
                  const roleBadge =
                    u.role === "admin"
                      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                      : u.role === "instructor"
                      ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                      : "border-slate-400/40 bg-slate-400/10 text-slate-300";

                  return (
                    <div
                      key={u.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#0a1424] p-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-100 text-sm">{u.name || "مستخدم"}</p>
                          <Badge className={"text-[10px] font-bold " + roleBadge}>
                            {u.role}
                          </Badge>
                          <span className="text-[11px] text-slate-500 font-mono">
                            ({u.loginMethod || "local"})
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs font-mono">{u.email}</p>
                        <span className="text-[11px] text-slate-500 block">
                          تاريخ التسجيل: {new Date(u.createdAt).toLocaleDateString("ar-SA")}
                        </span>
                      </div>

                      {/* RBAC Action Controls */}
                      <div className="flex items-center gap-2">
                        {u.role !== "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => roleMutation.mutate({ userId: u.id, role: "admin" })}
                            disabled={roleMutation.isPending}
                            className="border-white/15 text-xs hover:bg-cyan-500/20 text-cyan-200"
                          >
                            ترقية إلى Admin
                          </Button>
                        )}
                        {u.role !== "instructor" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => roleMutation.mutate({ userId: u.id, role: "instructor" })}
                            disabled={roleMutation.isPending}
                            className="border-white/15 text-xs hover:bg-amber-500/20 text-amber-200"
                          >
                            ترقية إلى Instructor
                          </Button>
                        )}
                        {u.role !== "user" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => roleMutation.mutate({ userId: u.id, role: "user" })}
                            disabled={roleMutation.isPending}
                            className="border-white/15 text-xs hover:bg-white/10 text-slate-300"
                          >
                            تخفيض إلى User
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}