# Radar — دفتر صفقات البورصة المصرية

تطبيق مجاني بالكامل لتسجيل صفقات البورصة المصرية وفرض انضباط إدارة المخاطر.
قبل كل صفقة بيوريك أقصى كمية أسهم مسموحة حسب قاعدة المخاطرة بتاعتك، وبعد كل
صفقة بيسجّل النتيجة ويعرض تحليل الأداء.

A free, offline-**first** trade journal for retail traders on the Egyptian
Exchange. Arabic RTL UI, Android.

The journal works end to end with no account: trades, the calculator and every
analytic are local and need no network. Four things reach outside the device,
all of them optional and all of them off until the user turns them on — sign-in
and cloud backup (Firebase Auth + Firestore), EGX closing prices, and reading a
recommendation out of an image (Gemini, with the user's own API key).

> Earlier revisions of this file described the app as "100% offline, no
> backend, no accounts, no network calls". That stopped being true once sync,
> auth and market prices landed; the paragraph above is the current shape.

## المستودع فيه حاجتين

| | |
|---|---|
| `lib/`, `android/`, `test/` | تطبيق Flutter |
| `site/` | الموقع العام — صفحة هبوط والصفحات القانونية (Next.js). تفاصيله في [`site/README.md`](site/README.md) |

الموقع مش رفاهية تسويقية: هو اللي بينشر سياسة الخصوصية وصفحة حذف الحساب،
ودول **شرطان إجباريان** لنشر التطبيق على Google Play — شوف `RELEASE.md`.

---

## التشغيل / Running

```bash
flutter pub get
flutter run              # على جهاز أو محاكي Android
```

Build a release APK:

```bash
flutter build apk --release
```

Run the test suite and the analyzer:

```bash
flutter test
flutter analyze
```

**Requires** Flutter 3.44.6 / Dart 3.12.2 or newer. Target platform is Android
only in v1 — the code is platform-agnostic, so adding iOS is
`flutter create --platforms=ios .` with no source changes.

---

## What it does

| الشاشة | الوظيفة |
|---|---|
| **لوحة التحكم** | إحصائيات الأداء + منحنى رأس المال |
| **سجل الصفقات** | كل الصفقات، الأحدث أولاً؛ إضافة وتعديل وحذف |
| **حاسبة الصفقة** | أداة ما قبل الصفقة: بتحسب الكمية المقترحة لحظيًا |
| **الإعدادات** | رأس المال، نسبة المخاطرة القصوى، المظهر، السلوك |

The discipline mechanism: any position whose risk exceeds the configured limit
is flagged red — in the calculator, in the add/edit form while typing, and on
the trade row itself.

Each trade also carries a **status** (مخططة / مفتوحة / مغلقة / ملغاة), tags, a
favourite flag, a pre-save checklist, a dated event timeline, screenshots, and a
0–100 **risk score** measuring how well it was prepared. Tapping a row opens a
read-only detail page; editing is behind the pencil there.

The **الإحصائيات** screen (insights icon on the dashboard) adds expectancy,
profit factor, median R, win/loss streaks, best and worst weekday and month,
average holding period, and per-tag performance.

---

## Package pins

| Package | Version | Why this version |
|---|---|---|
| `flutter_bloc` | `^9.1.1` | Cubits. No codegen. |
| `cloud_firestore` | sdk-pinned | The only store for user data. |
| `shared_preferences` | `^2.5.5` | Device preferences only — theme, onboarding, the Gemini key. |
| `fl_chart` | `^1.2.0` | Equity curve only. |
| `intl` | `0.20.2` | **Pinned exactly.** `flutter_localizations` from the SDK pins intl to 0.20.2; anything higher (including the latest, 0.20.3) fails version solving. |
| `uuid` | `^4.5.1` | Trade ids. |
| `image_picker` | `^1.2.3` | Screenshot attachments, gallery only. |
| `path_provider` | `^2.1.6` | App documents directory for stored images. |
| `flutter_localizations` | sdk | Mandatory — see "Arabic and RTL" below. |

No codegen, no `build_runner`. `SyncCodec` maps records to and from Firestore by
hand, and the website uses the same shape.

---

## Architecture

Feature-first, with a pure calculation core:

```
lib/
  core/
    calc/          ← all business logic, pure Dart, zero Flutter imports
    state/         ← AccountScopedCubit, context reads, loading/failure views
    preferences/   ← SharedPreferences, for device-only values
    formatters.dart
    theme.dart
  settings/  calculator/  trades/  dashboard/  shell/
    <feature>/data/   ← one repository per collection, on Firestore
    <feature>/cubit/  ← one cubit over it
```

**`lib/core/calc/` imports no Flutter, no storage, and no intl.** That is a hard
constraint, and it is what makes every formula in the spec a plain unit test
with no widget binding and no async. It is also what let the whole layer be
compiled to JavaScript and shared with the website — see `tool/gen-calc-js.mjs`.
The calculation functions take `capital` and `maxRiskPercent` as explicit
parameters rather than reading them from storage, which is why editing capital
in Settings recomputes every screen with no extra wiring.

State: one `Cubit` per concern, wired in `main()` and pointed at the signed-in
account by the Firebase auth stream. Data comes from Firestore streams, so every
list has a REAL loading state and a real failure state — `TradesBuilder` and
`WatchlistBuilder` unpack them in one place, because "you have no trades" and
"we could not read your trades" must never look the same. `SettingsGate` is a
gate rather than a builder: capital divides into every position size in the
product, so the app waits once for the risk rule instead of letting the class
defaults stand in for a frame and render a confident wrong number.

---

## Two things worth knowing before you change the code

### 1. The risk comparison and the sizing floor both need epsilons — together

The spec's own acceptance fixture (entry 10.00, stop 9.50) is exact in binary,
because `10.00 - 9.50 = 0.5` is a power of two. Real EGX prices are not:

```
entry 1.10, stop 1.00, capital 10,000, risk 1%
  1.10 - 1.00           = 0.10000000000000009   (not 0.1)
  100.0 / that          = 999.9999999999991     (true answer: 1000)
  floor()               → 999                   ← under-sizes by one share
  then at qty 1000:
  riskPct               = 0.010000000000000009
  riskPct > 0.01        → true                  ← false red flag AT the limit
```

The two are coupled. Fixing only the floor makes the suggested quantity land a
few ulps over the limit, so the app would flag the very position it just
recommended. Both live in `lib/core/calc/risk_math.dart` as `kQtyEpsilon` and
`kRiskEpsilon`, and `exceedsRiskLimit()` is the only place a risk ratio may be
compared — never write `riskPct > maxRiskPercent` inline.

Regression tests for this are in `test/risk_math_test.dart`,
`test/trade_metrics_test.dart`, and `test/sizing_result_test.dart`.

### 2. Number formatting deliberately uses locale `'en'`, not `'ar'`

`NumberFormat('#,##0.00', 'ar')` emits Arabic-Indic digits (٦٬٨٠٠٫٠٠) because
intl's `ar` locale sets `ZERO_DIGIT` to ٠. Switching to `'ar_EG'` does **not**
help — CLDR assigns Egypt the `arab` numbering system too. The spec requires
Western digits, and the number-formatting locale is independent of the UI
locale, so every formatter in `lib/core/formatters.dart` is built against `'en'`
and the `ج.م` suffix is appended as a literal. `formatters_test.dart` asserts
that no output contains a codepoint in `U+0660..U+0669`.

Date formatting avoids `DateFormat` entirely: with an explicit locale it
requires `initializeDateFormatting()` to have been awaited, and without one it
follows `Intl.defaultLocale`. The pattern is purely numeric, so it is built by
hand.

### Arabic and RTL

`flutter_localizations` is not optional. Without `GlobalMaterialLocalizations`,
the first dialog, date picker, or `Dismissible` throws "No MaterialLocalizations
found", and `GlobalWidgetsLocalizations` is what actually establishes
`TextDirection.rtl` app-wide. There are no ARB files and no `gen_l10n` — the app
is single-locale, so Arabic strings are inline literals.

Numeric text is rendered LTR inside the RTL layout (`NumericText`), otherwise a
minus sign lands on the visually wrong end of the number. Numeric input fields
set `textDirection: ltr` for the same reason, and `parseNumber`/`parseInteger`
accept Arabic-Indic digits, which `double.parse` would reject.

---

## Deviations from the spec

Both were agreed before implementation:

1. **Breakeven is a fourth result state, «تعادل».** The spec's literal
   `result = pnl > 0 ? ربح : خسارة` classifies a scratch trade (exit exactly at
   entry) as a loss, which drags down the win rate and pollutes the
   average-loss figure with a zero. Breakeven trades count as closed and stay in
   the win-rate denominator, but are excluded from both averages. The §9
   acceptance fixture is unaffected.

2. **Historical capital is not stored per trade.** Editing capital in Settings
   retroactively changes old trades' risk %. This matches the spec's data model.
   The headline metric, R multiple, is capital-free (`pnl / riskEGP`), so it
   stays meaningful regardless.

Other engineering calls made where the spec was silent are documented at their
definition sites: `avgLossEgp` is signed (negative); `averageR` excludes
zero-risk trades from both numerator and denominator; sort ties break on `id`
because `List.sort` is not stable and date-only values collide constantly;
`exitPrice` and `exitDate` are enforced as both-or-neither.

---

## Out of scope

No broker import, real-time quotes (prices are the daily close, and the UI says
«آخر إغلاق» rather than «السعر الحالي» for exactly that reason), short selling,
multiple portfolios, or multi-currency. CSV export is the natural next addition.

Cloud sync and auth were on this list in v1 and have since shipped — both
optional, both off by default.
