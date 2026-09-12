# دليل النشر والتطوير

## 🚀 نشر الإنتاج

### المتطلبات
- Server مع Node.js
- Database (MySQL أو PostgreSQL)
- SSL Certificate
- Reverse Proxy (Nginx أو Apache)

### خطوات النشر

#### 1. إعداد الخادم
```bash
# تثبيت Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# تثبيت pnpm
npm install -g pnpm

# إنشاء مستخدم التطبيق
sudo useradd -m -s /bin/bash webapp
sudo su - webapp
```

#### 2. استنساخ المشروع
```bash
cd /home/webapp
git clone <repository-url>
cd cybercrime-awareness-platform
```

#### 3. إعداد البيئة
```bash
# نسخ ملف البيئة
cp .env.example .env

# تعديل متغيرات البيئة
nano .env
# تأكد من:
# NODE_ENV=production
# DATABASE_URL (production database)
# ENCRYPTION_KEY (قوية جداً!)
```

#### 4. تثبيت المكتبات وبناء
```bash
pnpm install --prod
pnpm run build
```

#### 5. إعداد قاعدة البيانات
```bash
pnpm run db:push --env production
```

#### 6. تشغيل باستخدام PM2
```bash
# تثبيت PM2
sudo npm install -g pm2

# بدء التطبيق
pm2 start "pnpm run preview" --name "cybersecurity-app"

# حفظ الإعدادات
pm2 save
pm2 startup
```

#### 7. إعداد Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Proxy settings
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

#### 8. إعادة تشغيل الخدمات
```bash
sudo systemctl restart nginx
pm2 restart cybersecurity-app
```

---

## 🔐 نصائح الأمان للإنتاج

### 1. مفاتيح وكلمات مرور قوية
```bash
# توليد ENCRYPTION_KEY قوية
node -e "console.log(crypto.randomBytes(32).toString('base64'))"

# تخزين في .env (لا تضعها في الكود!)
```

### 2. SSL/TLS
```bash
# استخدام Let's Encrypt (مجاني)
sudo certbot certonly --standalone -d yourdomain.com

# تجديد تلقائي
sudo systemctl enable certbot.timer
```

### 3. جدار الحماية
```bash
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### 4. النسخ الاحتياطية
```bash
# نسخة احتياطية يومية للقاعدة
0 2 * * * mysqldump -u user -p password database > /backup/db_$(date +\%Y\%m\%d).sql

# نسخة احتياطية للملفات
0 3 * * * tar -czf /backup/app_$(date +\%Y\%m\%d).tar.gz /home/webapp/app
```

### 5. المراقبة والتنبيهات
```bash
# استخدام Sentry للأخطاء
npm install @sentry/node

# استخدام DataDog أو New Relic للمراقبة
# استخدام Slack للتنبيهات
```

---

## 📊 مراقبة الإنتاج

### السجلات
```bash
# عرض سجلات التطبيق
pm2 logs cybersecurity-app

# عرض الأخطاء
pm2 error cybersecurity-app

# السجلات الأمنية
tail -f /home/webapp/app/logs/security.log
tail -f /home/webapp/app/logs/audit.log
```

### الأداء
```bash
# مراقبة موارد النظام
top
htop

# معلومات PM2
pm2 monit
pm2 status

# فحص المنافذ
netstat -tlnp | grep 3000
```

---

## 🧪 Testing في الإنتاج

### Health Check
```bash
curl -H "User-Agent: HealthCheck" https://yourdomain.com/api/health
# يجب أن ترجع: 200 OK
```

### Uptime Monitoring
```bash
# استخدام UptimeRobot.com (مجاني)
# أو استخدام Pingdom أو StatusCake
```

### Security Scanning
```bash
# فحص شهري
0 0 1 * * docker run -t owasp/zap2docker-stable \
  zap-baseline.py -t https://yourdomain.com \
  -r /reports/zap_$(date +\%Y\%m).html
```

---

## 🔄 التحديثات والصيانة

### تحديث التطبيق
```bash
cd /home/webapp/cybercrime-awareness-platform

# سحب أحدث التغييرات
git pull origin main

# تثبيت التحديثات
pnpm install

# بناء
pnpm run build

# إعادة تشغيل
pm2 restart cybersecurity-app
```

### تحديث المكتبات
```bash
# فحص للمكتبات المتقادمة
pnpm outdated

# تحديث آمن
pnpm update

# فحص الأمان
pnpm audit
```

### صيانة قاعدة البيانات
```bash
# تحسين الجداول
OPTIMIZE TABLE users;
OPTIMIZE TABLE courses;
OPTIMIZE TABLE audit_logs;

# فحص التكامل
CHECK TABLE users;
REPAIR TABLE users;
```

---

## 🆘 استكشاف الأخطاء

### 500 Internal Server Error
```bash
# فحص السجلات
pm2 logs cybersecurity-app

# تحقق من متغيرات البيئة
grep DATABASE_URL .env

# تحقق من اتصال قاعدة البيانات
mysql -u user -p -e "SELECT 1"
```

### High Memory Usage
```bash
# قتل العمليات الثقيلة
kill -9 <pid>

# إعادة تشغيل
pm2 restart cybersecurity-app

# زيادة heap size
NODE_OPTIONS=--max-old-space-size=4096 pm2 start ...
```

### Database Connection Issues
```bash
# فحص الاتصال
mysql -h host -u user -p -e "SELECT 1"

# فحص الإصلاحيات (firewall)
telnet database-server 3306

# إعادة تشغيل MySQL
sudo systemctl restart mysql
```

### SSL Certificate Expired
```bash
# فحص شهادة
openssl s_client -connect yourdomain.com:443

# تجديد
sudo certbot renew
sudo systemctl restart nginx
```

---

## 📋 Checklist للنشر

### قبل النشر
- [ ] جميع الاختبارات تمر
- [ ] لا توجد تحذيرات في npm audit
- [ ] تم فحص الكود بـ linter
- [ ] التوثيق محدّث
- [ ] متغيرات البيئة جاهزة
- [ ] قاعدة البيانات محسّنة

### أثناء النشر
- [ ] نسخة احتياطية من البيانات
- [ ] اختبار الإنتاج
- [ ] التحقق من السجلات
- [ ] اختبار OAuth
- [ ] اختبار التشفير

### بعد النشر
- [ ] مراقبة الأخطاء
- [ ] فحص الأداء
- [ ] التحقق من الأمان
- [ ] اختبار من الكلients
- [ ] توثيق الإصدار الجديد

---

## 📞 الدعم الفني

### المشاكل الشائعة

**المشكلة**: "Cannot find module"
**الحل**: `pnpm install && pnpm run build`

**المشكلة**: "Database connection refused"
**الحل**: `mysql -u user -p -e "SELECT 1"` و `systemctl restart mysql`

**المشكلة**: "Port already in use"
**الحل**: `lsof -i :3000` ثم `kill -9 <pid>`

**المشكلة**: "SSL certificate error"
**الحل**: `certbot renew` و `systemctl restart nginx`

---

**تم إعداد هذا الدليل لضمان نشر آمن واحترافي للإنتاج**

