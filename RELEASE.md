# النشر على Google Play — Release runbook

كل خطوة هنا لازمة مرة واحدة بس، ما عدا قسم «كل إصدار».

---

## 1. مفتاح التوقيع (مرة واحدة، وميضعش أبدًا)

Google Play بيربط التطبيق بأول مفتاح يشوفه. **لو ضاع المفتاح، مش هتقدر تنزّل
تحديث للتطبيق ده تاني أبدًا** — هتضطر تنشره كتطبيق جديد بـ applicationId تاني
وتسيب كل المستخدمين ورا.

```bash
keytool -genkey -v -keystore android/app/upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

بعدين اعمل `android/key.properties` من `android/key.properties.example` وحط فيه
الباسوورد والـ alias اللي اخترتهم.

الملفين الاتنين (`key.properties` و `*.jks`) متجاهلين في `android/.gitignore`
وسيبهم كده — أي حد معاه الاتنين يقدر ينشر تحديث باسمك.

**اعمل نسخة احتياطية من الـ `.jks` في مكان تاني غير الجهاز ده.**

> لو `key.properties` مش موجود، البناء بيكمّل بمفتاح الـ debug وبيطبع تحذير.
> Play بيرفض الملف ده، فمش هينشر بالغلط — بس التحذير موجود عشان تعرف بدري.

---

## 2. مفتاح Gemini — ⚠️ متحطهوش في البناء

`--dart-define=GEMINI_API_KEY=...` بيحط المفتاح **جوه ملف الـ APK**، وأي حد
يقدر يستخرجه منه ويستهلك حصتك على حسابك.

للنشر العام: **ابني من غير المفتاح خالص.** التطبيق فيه شاشة في الإعدادات
(«مفتاح الذكاء الاصطناعي») المستخدم بيحط مفتاحه بتاعه فيها، وبيتخزن على جهازه.
من غير مفتاح، ميزة الـ AI بتقول إنها مش متظبطة والتطبيق شغال عادي.

لو عايز تشغّلها لكل المستخدمين من غير ما يعملوا حساب Gemini، لازم تحط النداء ورا
سيرفر بتاعك (أو Firebase Cloud Function) والمفتاح يفضل هناك.

---

## 3. قواعد Firestore — لازم قبل النشر

المشروع لو لسه على «test mode»، **أي مستخدم مسجّل يقدر يقرا ويكتب صفقات أي حد
تاني**. الملف `firestore.rules` في جذر المشروع بيقفل ده على صاحب البيانات بس.

```bash
firebase deploy --only firestore:rules
```

اتأكد بعدها من Firebase Console → Firestore → Rules إن اللي منشور هو ده.

---

## 3.5. الموقع — بيوفّر الرابطين اللي Play بيطلبهم

المشروع فيه موقع في `site/` (Next.js، تصدير ثابت). هو اللي بينشر سياسة
الخصوصية وصفحة حذف الحساب، ودول **شرطين إجباريين** للنشر.

```bash
cd site
npm install
NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run build
cd ..
firebase deploy --only hosting
```

استضافة Firebase متظبّطة في `firebase.json` على `site/out` — نفس المشروع اللي
فيه Firestore، فمش محتاج حساب جديد. بعد أول نشر، اربط الدومين من
Firebase Console → Hosting → Add custom domain.

**أو على Vercel** لو أسهل ليك: الإعداد جاهز في `site/vercel.json`. المهم في
إعدادات المشروع تحط **Root Directory = `site`** (وإلا هيدوّر على `package.json`
في الجذر ويلاقي مشروع Flutter)، وتضيف `NEXT_PUBLIC_SITE_URL` في
Environment Variables.

بعد النشر، الرابطين اللي هتحطهم في Play Console:

| | |
|---|---|
| Privacy policy | `https://your-domain.com/privacy/` |
| Account deletion | `https://your-domain.com/delete/` |

الشرطة المايلة في الآخر مقصودة — `trailingSlash: true` في `next.config.ts`،
والرابط من غيرها بيعمل تحويلة زيادة.

**متبنيش من غير `NEXT_PUBLIC_SITE_URL`** — من غيره الروابط الأساسية والسايت ماب
وصورة المشاركة كلها بتشاور على `localhost`. البناء بيطبّع تحذير أصفر لو نسيت.

تفاصيل الموقع وفخاخه في `site/README.md`.

---

## 4. حساب Play Console

- **Privacy policy** — إجباري. التطبيق بيجمع إيميل عن طريق Firebase Auth، فلازم
  رابط سياسة خصوصية شغّال على الإنترنت. بعد نشر الموقع، الرابط هو
  `https://your-domain.com/privacy/`.
- **Account deletion URL** — إجباري كمان لأي تطبيق بيعمل حسابات، ولازم يكون
  مفتوح من غير ما المستخدم ينزّل التطبيق أو يسجّل دخول:
  `https://your-domain.com/delete/`.
- **Data safety form** — قول إن التطبيق بيجمع: الإيميل (للحساب)، وبيانات
  الصفقات (للنسخ الاحتياطي). كله متربط بالمستخدم، ومتشفّر أثناء النقل، والمستخدم
  يقدر يمسحه.
- **App content** — التطبيق أداة تسجيل وحساب مخاطر، **مش** نصائح استثمارية.
  اكتب ده صراحةً في الوصف عشان متتصنّفش تحت الفئات المالية المقيّدة.
- **SHA-1 للتوقيع**: بعد أول رفع، Play بيوقّع بمفتاحه هو. لازم تاخد الـ SHA-1
  من Play Console → Setup → App integrity وتضيفه في Firebase Console، وإلا
  **تسجيل الدخول بجوجل هيفشل في النسخة المنشورة بس** وهيشتغل تمام محليًا.

---

## 5. كل إصدار

ارفع الرقم في `pubspec.yaml`:

```yaml
version: 1.0.1+2   # versionName+versionCode — الـ +N لازم يزيد كل مرة
```

Play بيرفض أي رفع بـ versionCode مستخدم قبل كده.

```bash
flutter clean
flutter pub get
flutter analyze
flutter test
flutter build appbundle --release
```

الناتج: `build/app/outputs/bundle/release/app-release.aab` — ده اللي بيترفع،
مش الـ APK.

### قبل ما ترفع

- [ ] `flutter test` كله أخضر
- [ ] `flutter analyze` من غير أخطاء
- [ ] جرّبت الـ release build على تليفون حقيقي — مش الـ debug
- [ ] الـ versionCode أعلى من اللي قبله
- [ ] قواعد Firestore منشورة
- [ ] SHA-1 بتاع Play متضاف في Firebase
- [ ] الموقع منشور، و`/privacy/` و`/delete/` بيفتحوا فعلًا
- [ ] الموقع اتبنى بـ `NEXT_PUBLIC_SITE_URL` مش بالافتراضي

### تجربة نسخة الـ release محليًا

R8 بيشيل كود مش مستخدم، وده أكتر حاجة ممكن تكسر في الـ release من غير ما تظهر
في الـ debug. جرّب الـ APK نفسه قبل الرفع:

```bash
flutter build apk --release
flutter install --release
```

ركّز على: تسجيل الدخول بجوجل، المزامنة، أسعار البورصة، وقراءة الصور بالـ AI —
دي اللي بتعتمد على مكتبات خارجية ممكن R8 يقلّمها.

---

## 6. حاجات مقفولة خلاص

| | |
|---|---|
| `applicationId` | `com.trademind.app` — دايم، متغيّرهوش بعد النشر (الاسم المعروض TradePilot) |
| `targetSdk` / `compileSdk` | 36 (من Flutter) — Play بيطلب 35 كحد أدنى |
| `minSdk` | 24 |
| صلاحيات | `INTERNET` بس |
| التصغير | R8 + shrinkResources شغّالين على الـ release |
| أسماء الملفات في التقارير | متحفوظة، فالـ stack traces في Play Console مقروءة |
