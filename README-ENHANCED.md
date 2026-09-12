# 🛡️ منصة درع الوعي السيبراني - النسخة المحسّنة

الحماية من الجرائم الإلكترونية - منصة توعية تفاعلية عربية آمنة

## ✨ الميزات

### 🎓 التعليم والتوعية
- 📚 دروس توعوية شاملة باللغة العربية
- 🎯 محتوى تفاعلي وسهل الفهم
- ✅ اختبارات تفاعلية مع تصحيح فوري
- 📊 تتبع التقدم الشخصي

### 🔒 الأمان المتقدم
- 🔐 تشفير AES-256-GCM للبيانات الحساسة
- 🚫 Rate limiting شامل لمنع الهجمات
- 📝 Audit logging كامل للأمان
- ✔️ التحقق من المدخلات الشامل
- 🛡️ رؤوس أمان HTTP
- 🔑 OAuth 2.0 مع CSRF protection

### 🛠️ أدوات عملية
- 🔗 محلل روابط آمن محلي
- 💬 محلل رسائل إلكترونية
- ⚡ معالجة سريعة بدون مخاطر

### 📱 التوافقية
- 📱 واجهة متجاوبة (Desktop/Tablet/Mobile)
- 🌐 دعم العربية كاملة
- ⚡ أداء سريع جداً

---

## 🚀 البدء السريع

### المتطلبات
- Node.js 18+
- pnpm (مدير الحزم)
- MySQL أو SQLite (قاعدة بيانات)

### التثبيت

```bash
# 1. استنساخ المشروع
git clone <repository-url>
cd cybercrime-awareness-platform

# 2. تثبيت المكتبات
pnpm install

# 3. إنشاء ملف .env
cp .env.example .env
# عدّل متغيرات البيئة:
# - DATABASE_URL
# - ENCRYPTION_KEY (اجعلها آمنة!)
# - OAUTH_CLIENT_ID و OAUTH_CLIENT_SECRET

# 4. إعداد قاعدة البيانات
pnpm run db:push

# 5. تشغيل التطبيق
pnpm run dev
```

### الوصول
- **التطبيق**: http://localhost:5173
- **Admin Dashboard**: http://localhost:5173/admin (بعد تسجيل دخول admin)

---

## 📋 المتطلبات الأمنية المطبقة

### SR-1: تشفير البيانات الحساسة ✅
```
الملف: server/_core/encryption.ts
- AES-256-GCM للبيانات المتبقية
- Encryption للـ email و name
- Decryption عند الحاجة
```

### SR-2: مصادقة آمنة ✅
```
الملف: server/_core/oauth.ts
- OAuth 2.0
- CSRF protection with nonce
- HTTP-only cookies
- Secure session management
```

### SR-3: التحكم في الوصول ✅
```
- Role-based access control (RBAC)
- Roles: user, instructor, admin
- Authorization checks في كل endpoint
- Principle of least privilege
```

### SR-4: تسجيل الأحداث الأمنية ✅
```
الملف: server/_core/logging.ts
- Audit logging لجميع العمليات
- Security events logging
- Log retention (90+ أيام)
- Admin dashboard للسجلات
```

### SR-5: معالجة محدودة الطلبات ✅
```
الملف: server/_core/rateLimit.ts
- 5 محاولات دخول في 15 دقيقة
- 100 طلب API في الساعة
- 20 تحليل في 5 دقائق
- Adaptive rate limiting
```

### SR-6: التحقق من المدخلات ✅
```
الملف: server/_core/validation.ts
- Zod schema validation
- SQL injection detection
- XSS detection
- Command injection detection
- Input sanitization
```

### SR-7: رؤوس الأمان ✅
```
الملف: server/_core/middleware.ts
- HSTS (31536000 seconds)
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy
```

### SR-8: إدارة الجلسات الآمنة ✅
```
- Session timeout: 30 دقيقة
- Idle timeout: 15 دقيقة
- HttpOnly cookies
- Secure flag
- SameSite protection
```

---

## 🏗️ البنية المشروع

```
cybercrime-awareness-platform/
├── client/                      # React Frontend
│   ├── src/
│   │   ├── pages/              # الصفحات الرئيسية
│   │   ├── components/         # المكونات
│   │   ├── hooks/              # React hooks
│   │   └── utils/              # الدوال المساعدة
│   └── index.html
│
├── server/                      # Express Backend
│   ├── _core/
│   │   ├── encryption.ts       # 🔐 تشفير البيانات
│   │   ├── logging.ts          # 📝 تسجيل الأحداث
│   │   ├── rateLimit.ts        # ⏱️ محدد الطلبات
│   │   ├── validation.ts       # ✔️ التحقق من المدخلات
│   │   ├── middleware.ts       # 🛡️ middleware الأمان
│   │   ├── oauth.ts            # 🔑 OAuth
│   │   ├── trpc.ts             # API routing
│   │   └── cookies.ts          # إدارة الـ cookies
│   ├── routers/                # tRPC routers
│   └── index.ts                # نقطة الدخول
│
├── drizzle/
│   ├── schema.ts               # قاعدة البيانات الأصلية
│   └── schema-enhanced.ts      # 📊 قاعدة البيانات المحسّنة
│
├── shared/                      # كود مشترك
│
├── THEORETICAL_PART_AR.md      # 📚 الجزء النظري
├── README-ENHANCED.md          # هذا الملف
└── package.json                # المكتبات والـ scripts
```

---

## 🔧 النصوص المتاحة (Scripts)

```bash
pnpm run dev              # تشغيل التطبيق في وضع التطوير
pnpm run build            # بناء الإنتاج
pnpm run preview          # معاينة الإنتاج محليًا
pnpm run check            # فحص TypeScript
pnpm test                 # تشغيل الاختبارات
pnpm run test:ui          # معاينة الاختبارات
pnpm run db:push          # إعادة تعيين قاعدة البيانات
pnpm run security-audit   # فحص الأمان (npm audit)
```

---

## 🧪 الاختبارات الأمنية

### اختبارات محلية

```bash
# 1. فحص الـ dependencies
pnpm audit

# 2. فحص TypeScript
pnpm run check

# 3. تشغيل اختبارات الوحدة
pnpm test

# 4. فحص الكود للثغرات الواضحة
pnpm run lint
```

### اختبارات متقدمة

#### OWASP ZAP (Automated Scanning)
```bash
# تثبيت ZAP (أول مرة)
docker pull owasp/zap2docker-stable

# تشغيل الفحص
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:5173 \
  -r /mnt/zap-report.html
```

#### اختبار يدوي للثغرات
```
1. SQL Injection في البحث
2. XSS في المدخلات
3. CSRF في الأشكال
4. Rate Limiting على API
5. Authorization bypass
```

---

## 📦 البيانات المشفرة

### ما يتم تشفيره
- ✅ `email` - باستخدام AES-256-GCM
- ✅ `name` - باستخدام AES-256-GCM
- ✅ البيانات الحساسة الأخرى

### ما لا يتم تشفيره
- ⏹️ `userId` - مؤشر فقط
- ⏹️ `role` - للتحكم في الوصول
- ⏹️ `timestamps` - معلومات غير حساسة

---

## 🔐 متغيرات البيئة المطلوبة

```bash
# قاعدة البيانات
DATABASE_URL="mysql://user:password@localhost/dbname"

# التشفير (اجعلها قوية جداً!)
ENCRYPTION_KEY="base64-encoded-32-bytes"
# اجعلها: node -e "console.log(crypto.randomBytes(32).toString('base64'))"

# OAuth
OAUTH_CLIENT_ID="your-client-id"
OAUTH_CLIENT_SECRET="your-client-secret"
OAUTH_REDIRECT_URI="http://localhost:5173/api/oauth/callback"

# الخادم
NODE_ENV="development" # أو "production"
PORT=3000
```

---

## 📊 Threat Model (STRIDE)

### 1️⃣ Spoofing (انتحال)
- ✅ **التحكم**: OAuth + nonce-based CSRF

### 2️⃣ Tampering (التزيير)
- ✅ **التحكم**: AES-256-GCM encryption

### 3️⃣ Repudiation (الإنكار)
- ✅ **التحكم**: Comprehensive audit logging

### 4️⃣ Information Disclosure (تسرب)
- ✅ **التحكم**: Encryption + Access control

### 5️⃣ Denial of Service
- ✅ **التحكم**: Rate limiting

### 6️⃣ Elevation of Privilege
- ✅ **التحكم**: RBAC + Authorization checks

---

## 🎯 مصفوفة الاختبار الأمني

| الاختبار | النوع | الحالة | ملاحظات |
|--------|------|--------|--------|
| SQL Injection | Security | ✅ ناجح | تم الفحص بـ SQLMap |
| XSS | Security | ✅ ناجح | تم الفحص يدويًا + ZAP |
| CSRF | Security | ✅ ناجح | OAuth + SameSite |
| Auth Flow | Integration | ✅ ناجح | OAuth معتمد من جهة ثالثة |
| Rate Limit | Security | ✅ ناجح | معايير مختبرة |
| Encryption | Unit | ✅ ناجح | AES-256-GCM |
| Logging | Unit | ✅ ناجح | جميع الأحداث مسجلة |
| Headers | Security | ✅ ناجح | جميع الرؤوس موجودة |

---

## 🚨 المشاكل الأمنية المعروفة

### لا توجد مشاكل حرجة معروفة

جميع الثغرات المعروفة تم إصلاحها:
- ✅ تشفير البيانات
- ✅ Rate limiting
- ✅ Input validation
- ✅ Security logging
- ✅ Secure headers

---

## 📈 الخطة المستقبلية

### قريبة المدى (1-2 شهر)
- [ ] توسع المحتوى التعليمي
- [ ] ميزات متقدمة للتحليل
- [ ] تحسينات الأداء

### متوسطة المدى (3-6 أشهر)
- [ ] كشف ذكي للتهديدات (AI-based)
- [ ] تكامل مع أنظمة التعليم
- [ ] نسخة mobile native

### طويلة المدى (6+ أشهر)
- [ ] نشر في المؤسسات
- [ ] البحث والدراسة
- [ ] أكاديمية شاملة

---

## 👥 الفريق

| الدور | الاسم |
|------|------|
| مشرف أكاديمي | أ. عفاف أحمد |
| قائدة الفريق | - |
| Developers | مجموعة 2 |

---

## 📞 الدعم والتواصل

### للمشاكل التقنية
- 📧 البريد الإلكتروني: support@example.com
- 🐛 Issues: GitHub Issues
- 💬 Chat: Slack/Teams

### للأسئلة الأمنية
- 🔒 Security: security@example.com
- 📋 Bug Bounty: bounty.example.com

---

## 📄 الترخيص

هذا المشروع مرخص تحت MIT License.

---

## 🙏 شكر وتقدير

شكر خاص لجميع المساهمين والمشرفين الأكاديميين الذين ساعدوا في إنجاز هذا المشروع.

---

**آخر تحديث**: سبتمبر 2024  
**الإصدار**: 2.0 (محسّن مع الأمان الكامل)

