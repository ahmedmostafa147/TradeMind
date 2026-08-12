# radar-flows — سحب تداولات المستثمرين آليًا

وركر بايثون بيسحب **تداولات المستثمرين بالجنسية** من البورصة المصرية كل يوم بعد
الجلسة، ويكتبها في `marketFlows/{YYYY-MM-DD}` — نفس المستند اللي الموقع والتطبيق
بيقروه، بنفس الشكل بالحرف.

> ده **بديل الإدخال اليدوي** في `manual-flows-form.tsx`، مش إضافة عليه. الفورم
> اليدوي بيفضل موجود كخطة بديلة لو الوركر فشل يوم — الاتنين بيكتبوا نفس المستند
> بنفس المفتاح، فآخر واحد بيكتب هو اللي بيفضل.

---

## اللي ده بيحله واللي مبيحلوش

| | |
|---|---|
| **الأسعار** | مش من شغل الوركر ده. `/api/quote` بيسحبها آليًا خلاص من Yahoo، والتطبيق والموقع الاتنين بيندهوا عليه |
| **تداولات المستثمرين** | ده الوركر. البورصة المصرية هي **المصدر الوحيد** — مش موجودة على تريدفيو ولا أي مزوّد مجاني |

**ليه متصفح حقيقي ومش `requests`؟** `egx.com.eg` وراه **F5 Shape Bot Defense**.
الرد على أي HTTP client هو 200 فيه `window["bobcmn"]` وكوكي `TSPD_101` — تحدي
JavaScript مشفّر **لازم يتنفّذ** عشان تاخد الكوكي بتاعة الجلسة الحقيقية. ده الغرض
من المنتج ده أصلاً، وعشان كده محاولات المشروع السابقة فشلت بنفس الطريقة من شبكتين
مختلفتين (403 محليًا، و200 بصفحة تحدي من Vercel). مفيش هيدرز ولا كوكيز بتعدّي منه.

**وعشان كده الوركر ده مش بيعيش على Vercel.** Chromium مش بيدخل في serverless
function، ومفيش مكان تسيبه فيه دافي.

---

## البنية

```
worker/
  radar_flows/
    parse.py       نقي — HTML جوّه، بيانات برّه. مرآة site/lib/market-flows.ts
    document.py    نقي — بناء المستند + التحقق من شكله (بديل firestore.rules)
    fetch.py       الشبكة بس — Playwright
    store.py       الكتابة بس — Firestore Admin SDK
    main.py        نقطة الدخول وأكواد الخروج
  tests/           ٥٣ اختبار، كلهم بيشتغلوا من غير متصفح ولا Firebase
  Dockerfile
  requirements.txt
```

الفصل ده مش ترتيب — هو اللي بيخلي **أهم حاجة في الوركر قابلة للاختبار**:
`egx.com.eg` بيرد بتحدي بوت، فـ`fetch.py` مستحيل يتختبر من غير متصفح حقيقي بيوصل
لموقع حقيقي. `parse.py` و`document.py` مفيهمش شبكة ولا اعتماد، فالاختبارات
بتغطّيهم بالكامل.

### ⚠️ الـ Admin SDK بيتخطّى `firestore.rules` تمامًا

كل كاتب تاني في المشروع ده **عميل**: متصفح الأدمن، التليفون. بيتوثّقوا كمستخدم وكل
كتابة بتتفحص مقابل القواعد، اللي بتثبّت شكل مستند `marketFlows` على ٧ حقول بالظبط.

**الـ service account مش مستخدم — هو مالك، والقواعد مبتنطبقش عليه.** يعني وركر فيه
غلطة مطبعية يقدر يحط حقل على مستند كل مستخدم مسجّل بيعرضه، والقاعدة اللي اتكتبت
عشان تمنع ده بالظبط **مش هتشتغل**.

`document.validate()` بيعيد تنفيذ نفس الـ whitelist في بايثون عشان كده. مش
احتياط زيادة — ده **نقل الفحص للمكان الوحيد اللي لسه قادر يعمله**. أي تغيير في
`match /marketFlows` في `firestore.rules` لازم يعدّي على `document.py` في نفس
الكوميت.

---

## التجربة محليًا

```bash
cd worker
python -m pip install -r requirements.txt
python -m playwright install chromium
python -m pytest tests/ -q
```

اسحب جلسة من غير ما تكتب حاجة:

```bash
python -m radar_flows.main --dry-run --show-browser
```

`--show-browser` بيفتح Chromium مرئي — ده أسرع طريقة تشوف بيها التحدي بيحصله إيه
لو السحب فشل.

ولو عندك صفحة محفوظة (احفظها من المتصفح كـ HTML)، تقدر تجرّب الـ parser من غير أي
متصفح:

```bash
python -m radar_flows.main --html sample.html --date 2026-08-11 --dry-run
```

### أكواد الخروج — دي عقد التنبيه

Cloud Scheduler وCloud Run Jobs بيعتبروا أي خروج غير صفر تشغيلة فاشلة، وده اللي
بيظهر في المونيتورينج.

| كود | معناه |
|---|---|
| `0` | اتخزّنت (أو `--dry-run` نجح) |
| `2` | السحب فشل — التحدي ما اتحلّش، أو timeout |
| `3` | السحب نجح والتحليل فشل — تغيير في شكل الصفحة، أو صفحة تحدي جات بـ200 |
| `4` | التحليل نجح والكتابة فشلت — صلاحيات، أو المستند مخالف للشكل |

**الحاجة الوحيدة اللي ممنوعة تحصل هي خروج بصفر من غير كتابة.** «السوق» بتعرض
مجموعة فاضية وكتابة فاشلة بنفس الشكل، فالفشل الصامت بيبان بالظبط زي سوق هادي.

---

## النشر على Cloud Run Job

**محتاج منك:** service account، وده الحاجة الوحيدة في المشروع كله اللي محتاجة
هوية سيرفر. لحد دلوقتي المشروع متجنّبها عن قصد (شوف التعليق في
`site/app/api/egx-flows/route.ts`)، والوركر ده هو السبب اللي بيستحق كسر القاعدة.

```bash
# 1) حساب خدمة بأقل صلاحية تكفي
gcloud iam service-accounts create radar-flows \
  --display-name="Radar EGX flows worker" \
  --project=trademind-6222c

gcloud projects add-iam-policy-binding trademind-6222c \
  --member="serviceAccount:radar-flows@trademind-6222c.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

```bash
# 2) ابني وارفع الصورة
gcloud builds submit worker \
  --tag=gcr.io/trademind-6222c/radar-flows \
  --project=trademind-6222c
```

```bash
# 3) اعمل الـ Job
gcloud run jobs create radar-flows \
  --image=gcr.io/trademind-6222c/radar-flows \
  --region=europe-west1 \
  --service-account=radar-flows@trademind-6222c.iam.gserviceaccount.com \
  --memory=2Gi \
  --task-timeout=5m \
  --max-retries=2 \
  --project=trademind-6222c
```

`--memory=2Gi` مش مبالغة: Chromium بيقع بـ`SIGTRAP` تحت جيجا واحدة، والانهيار ده
بيظهر كـ timeout غامض مش كـ out-of-memory.

```bash
# 4) جدوّله بعد الجلسة
# البورصة المصرية بتقفل 14:30 بتوقيت القاهرة، الأحد لـ الخميس.
# 16:00 القاهرة بيدي ساعة ونص للبورصة تنشر الأرقام النهائية.
gcloud scheduler jobs create http radar-flows-daily \
  --schedule="0 16 * * 0-4" \
  --time-zone="Africa/Cairo" \
  --location=europe-west1 \
  --uri="https://europe-west1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/trademind-6222c/jobs/radar-flows:run" \
  --http-method=POST \
  --oauth-service-account-email=radar-flows@trademind-6222c.iam.gserviceaccount.com \
  --project=trademind-6222c
```

`0-4` = الأحد لـ الخميس. السبت والجمعة البورصة مقفولة، وتشغيلة يوم مقفول بترجع
كود `3` — يعني تنبيه كذّاب كل أسبوع، وتنبيه بيكدب أسبوعيًا بيتجاهل بعد شهر.

### شغّله بإيدك مرة قبل ما تعتمد على الجدولة

```bash
gcloud run jobs execute radar-flows --region=europe-west1 --wait \
  --project=trademind-6222c
```

الجدولة مش بتقول لك إن السحب نجح — هي بتقول إنها ندهت. أول تشغيلة يدوية هي اللي
بتقول إن Shape بيعدّي من IP بتاع Google Cloud أصلاً، وده **مش مضمون**: منتجات
مكافحة البوتات بتقيّم نطاقات السحابة أعلى في الخطورة من الشبكات المنزلية. لو رجع
كود `2` أو `3` من Cloud Run وهو شغّال محليًا، ده معناه إن الـ IP هو المشكلة مش
الكود — وساعتها الخيارات: VPS بـIP سكني، أو بروكسي سكني، أو ترخيص بيانات من
البورصة.

---

## البدائل لو مشتغلش

مرتّبة بالأرخص:

1. **VPS عادي بـcron** بدل Cloud Run. نفس الصورة، نفس الأمر، وIP مختلف.
2. **بروكسي سكني** جوه نفس الوركر (`playwright.chromium.launch(proxy=…)`).
3. **مزوّد بيانات مدفوع** أو ترخيص من البورصة — الحل الوحيد اللي مش بيعتمد على
   السحب أصلاً، وبيخلي «السوق» ميزة مضمونة تستحق فلوس.
4. **الفورم اليدوي** اللي في لوحة الإدارة، اللي لسه موجود.

---

## لو شكل الصفحة اتغيّر

`parse.py` بيرفض الجلسة كاملة لو أي حاجة مش مفهومة، ومبيخزّنش نصها. اللي بيتغيّر
عادةً:

- **معرّفات الجداول** — `TABLE_IDS` في `parse.py`. لو ASP.NET غيّر شجرة الكنترولز.
- **أسماء الأعمدة** — `_COLUMN_NEEDLES`. **ترتيب الأعمدة بيتقرا من الهيدر ومش
  بيتفرض أبدًا**، وده أهم قرار في الملف كله: `68,319,014 / 129,318,526 /
  60,999,512` — لو قريتهم بالعكس بتقول إن الأجانب اشتروا ٦١ مليون بدل ما باعوا ٦١
  مليون. نفس الأرقام، عكس المعنى، ومفيش حاجة في القيم نفسها تفرّق بينهم.
- **أسماء الجنسيات** — `_LABELS`. و**`foreign` بيتفحص قبل `arab`** لأن
  «Non-Arab Foreigners» جوّاها كلمة `arab`.

وأي تعديل هنا لازم يعدّي على `site/lib/market-flows.ts` كمان — الملفين مرآة
لبعض، ونسخة الويب هي اللي الفورم اليدوي بيستخدمها.
