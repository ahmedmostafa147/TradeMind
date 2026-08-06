# Radar Market Data

خدمة أسعار البورصة المصرية بمصادر متعددة وتحويل تلقائي عند سقوط المصدر.

NestJS · Clean Architecture · Redis · WebSocket · REST · Swagger على `/docs`.

---

## ليه موجودة

`/api/quote` في الموقع بينده Yahoo مباشرة من راوت Next.js واحد. ده شغّال، بس:

- **مصدر واحد.** يقع، الأسعار تختفي.
- **مفيش كاش.** كل طلب بيروح لبرّه.
- **مفيش streaming.** الموقع بيسأل، مفيش حد بيقوله.
- **مفيش قياس.** مفيش رقم يقول المصدر بيرد في قد إيه ولا بيفشل قد إيه.

الخدمة دي بتحل الأربعة، وبتخلي إضافة مصدر جديد **ملف واحد** — مش تعديل في النظام.

---

## البنية

```
src/
  market-data/
    interfaces/   MarketDataProvider — العقد الوحيد اللي أي مصدر بينفّذه
    entities/     Quote · Candle — والقواعد اللي عليهم
    providers/    EgxApiProvider (أساسي) · FallbackProvider (بديل)
    services/     ProviderManager · MarketDataService · PriceCacheService · MetricsService
    controllers/  REST
    gateway/      WebSocket
    scheduler/    PricePoller — الاستطلاع وفحص الصحة
    dto/          تحقّق من المدخلات
  common/         http (timeout + retry + backoff) · ApiKeyGuard
  config/         كل المتغيرات، متحقّق منها عند الإقلاع
```

---

## سلسلة التحويل

```
المصادر السليمة بترتيب priority
        ↓ كلها فشلت
Redis (وبعدها ذاكرة العملية)
        ↓ مفيش نسخة محفوظة
HTTP 503 + رسالة واضحة + سبب فشل كل مصدر
```

**كل سعر بيرجع معاه `source` و`asOf` و`stale`.** السعر اللي جه من الكاش
بيتعلّم `stale: true` **دايمًا** — حتى لو اتكتب من ثانية. اللي بيسأل الكاش
بيسأله لأن المصادر مردّتش، وسعر مش بيقول إنه من كاش هيتعرض كأنه من السوق.

**ومفيش صفر أبدًا.** سعر مش موجود = الرمز غايب من النتيجة، مش موجود بصفر —
الصفر بيتحسب خسارة ١٠٠٪ على مركز سليم.

---

## إضافة مصدر جديد

ملف واحد + سطرين في `market-data.module.ts`:

```ts
@Injectable()
export class ScraperProvider implements MarketDataProvider {
  readonly name = 'scraper';
  readonly priority = 3;          // بعد الأساسي والبديل
  readonly supportsStreaming = false;
  // ... باقي الـ interface
}
```

`ProviderManager` بيرتّب بالـ`priority` ويختار أول واحد سليم. **مفيش أي حاجة فوق
الـproviders بتعرف اسم مصدر.**

---

## Endpoints

| | |
|---|---|
| `GET /market/prices?symbols=COMI,TMGH` | من غير `symbols` بترجّع `TRACKED_SYMBOLS` |
| `GET /market/price/:symbol` | ٥٠٣ لو كل المصادر واقعة ومفيش كاش |
| `GET /market/history/:symbol?days=30` | شموع يومية، الأقدم أولًا. **مفيش كاش هنا** |
| `GET /market/status` | `healthy` \| `degraded` (شغّالة على البديل) \| `down` |
| `GET /market/providers` | كل مصدر وحالته وآخر خطأ |
| `GET /market/metrics` | latency · uptime · failures · cache hit ratio |
| `GET /docs` | Swagger |

### WebSocket

```js
const socket = io('http://localhost:3010/market');
socket.emit('subscribe', { symbols: ['COMI', 'TMGH'] });
socket.on('quote', (q) => console.log(q.symbol, q.price, q.stale));
socket.on('status', (s) => console.log(s.state, s.activeProvider));
```

**بيبعت لما يتغيّر بس.** الاستطلاع بيرجّع نفس الشمعة أغلب الوقت؛ gateway بيبعت
كل استطلاع بيبعت الدفتر كله كل فترة عشان يقول إن مفيش حاجة حصلت.

---

## التشغيل

```bash
cp .env.example .env
npm install
npm run start:dev      # أو npm run build && npm run start:prod
npm test
```

Redis اختياري — من غيره الخدمة بتشتغل بكاش في الذاكرة وبتقول كده في `/market/status`.

---

## حاجات لازم تتعرف قبل ما تعتمد عليها

**١. الـ mapping بتاع EGXAPI مش متحقّق منه.** توثيقهم مكانش موصول وقت الكتابة،
فـ`mapQuote`/`mapCandle` مكتوبين على الشكل اللي بيوصفوه وبيقروا أسماء الحقول
بتسامح (كذا اسم محتمل لكل حقل). **دول الدالتين الوحيدتين اللي محتاجة تتظبط**
لما تعرف الشكل الحقيقي — كل حاجة فوقهم بتتكلم `Quote`.

**٢. مش هتشتغل على Vercel.** WebSocket وscheduler وRedis محتاجين عملية شغّالة
طول الوقت. حطّها على Railway أو Fly أو VPS، وخلي `/api/quote` في الموقع ينده
عليها بدل Yahoo.

**٣. البديل بيرجّع آخر إغلاق يومي مش سعر لحظي.** وده مكتوب في الكود وفي الرد
(`asOf`)، عشان محدش يبيع «أسعار لحظية» وهو بيقدّم إغلاق أمس.

---

## اتصلّح وقت البناء

تلات أخطاء ظهرت لما الخدمة اتشغّلت فعليًا على upstream ميت — مكانش أي واحد فيهم
هيظهر من الـtypecheck أو من الاختبارات لوحدها:

1. **مصدر ميت بيقول إنه سليم.** `getPrices` كان بيبلع أخطاء كل رمز ويرجّع `[]`،
   والخدمة كانت بتحسبها نجاح. دلوقتي صفر نتايج من طلب فيه رموز = فشل.
2. **`GET /market/prices` من غير query كان بيرجّع 400.** `whitelist` بيشيل أي
   حقل من غير validator، و`forbidNonWhitelisted` بيرفضه بعدها.
3. **الفشل كان بيرجّع مصدر ميت للحياة.** `reportFailure` كان بيكتب
   `healthy: consecutiveFailures < threshold` لوحدها، فخطأ واحد على مصدر الـsweep
   لسه معلّمه ميت بيطلّع `1 < 3` ويرجّعه لأول السلسلة.

التلاتة عليهم اختبارات دلوقتي.
