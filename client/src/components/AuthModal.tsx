import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { LockKeyhole, Mail, User, LogIn, UserPlus } from "lucide-react";

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("تم تسجيل الدخول بنجاح");
      utils.auth.me.invalidate();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "فشل تسجيل الدخول");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء الحساب وتسجيل الدخول بنجاح");
      utils.auth.me.invalidate();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "فشل إنشاء الحساب");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      if (!name.trim()) return toast.error("يرجى إدخال الاسم الكامل");
      registerMutation.mutate({ name, email, password });
    } else {
      loginMutation.mutate({ email, password });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent dir="rtl" className="border-white/10 bg-[#101a2d] text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
            <LockKeyhole className="text-cyan-300" size={22} />
            {isRegister ? "إنشاء حساب جديد في منصة درع الوعي" : "تسجيل الدخول إلى المنصة"}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            {isRegister ? "أدخل بياناتك للانضمام ومتابعة مسارك التدريبي وتجميع الدرجات" : "أدخل البريد الإلكتروني وكلمة المرور لمتابعة تقدمك"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {isRegister && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-300">الاسم الكامل</Label>
              <div className="relative">
                <User className="absolute right-3 top-3 text-slate-500" size={16} />
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: عبد الله محمد"
                  className="border-white/10 bg-[#0a1424] pr-9 text-xs text-white placeholder:text-slate-600"
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-300">البريد الإلكتروني</Label>
            <div className="relative">
              <Mail className="absolute right-3 top-3 text-slate-500" size={16} />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="border-white/10 bg-[#0a1424] pr-9 text-xs text-white placeholder:text-slate-600"
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-300">كلمة المرور</Label>
            <div className="relative">
              <LockKeyhole className="absolute right-3 top-3 text-slate-500" size={16} />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-white/10 bg-[#0a1424] pr-9 text-xs text-white placeholder:text-slate-600"
                dir="ltr"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading} className="mt-6 h-11 w-full gap-2 bg-cyan-400 font-bold text-[#081120] hover:bg-cyan-300">
            {isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
            {isLoading ? "جارٍ المعالجة..." : isRegister ? "إنشاء حساب الآن" : "تسجيل الدخول"}
          </Button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs text-cyan-300 hover:underline"
            >
              {isRegister ? "لديك حساب بالفعل؟ سجل دخولك" : "ليس لديك حساب؟ أنشئ حساباً جديداً"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
