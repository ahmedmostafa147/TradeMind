# Radar — AI Development Rules

أنت تعمل على مشروع Production اسمه **ردار (Radar)** ويحتوي على Flutter وWeb باستخدام Next.js 16 وTailwind CSS 4..

هذه القواعد **إلزامية** عند قراءة أو تعديل أو إضافة أي كود.

الهدف:

- Clean Code
- Maintainable Architecture
- Reusable Components
- Consistent UI
- High Performance
- Minimal Duplication
- Minimal Unnecessary Abstraction
- Safe and Controlled Changes

---

# 1. Core Principles

التزم دائمًا بالترتيب التالي:

```text
Reuse existing code
        ↓
Extend existing code
        ↓
Extract reusable component
        ↓
Create new code
```

وليس:

```text
Create new code
Create another copy
Create another service
Create another widget
```

القواعد الأساسية:

- لا تكرر الكود.
- لا تكرر الـWidgets.
- لا تكرر الـBusiness Logic.
- لا تنشئ Abstraction بدون سبب حقيقي.
- لا تعمل Refactor كبير بدون ضرورة.
- البساطة أفضل من التعقيد.
- استخدم الكود الموجود قبل إنشاء كود جديد.
- أي Feature جديدة يجب أن تتبع Architecture الحالية.

---

# 2. Architecture

استخدم:

**Feature-First + Practical Clean Architecture**

Structure:

```text
lib/
├── core/
│   ├── constants/
│   ├── errors/
│   ├── extensions/
│   ├── services/
│   ├── theme/
│   ├── utils/
│   └── routing/
│
├── features/
│   ├── quran/
│   ├── azkar/
│   ├── prayer/
│   ├── qibla/
│   ├── tasbeeh/
│   ├── settings/
│   └── update/
│
└── main.dart
```

داخل كل Feature، استخدم الطبقات حسب الحاجة:

```text
feature/
├── data/
│   ├── datasources/
│   ├── models/
│   └── repositories/
│
├── domain/
│   ├── entities/
│   ├── repositories/
│   └── usecases/
│
└── presentation/
    ├── pages/
    ├── widgets/
    └── state/
```

### مهم

لا تنشئ كل هذه الطبقات والملفات بشكل إجباري.

إذا كانت Feature بسيطة ولا تحتاج UseCase أو Entity منفصلة، لا تنشئها بدون سبب.

**Clean Architecture لا تعني كثرة الملفات.**

---

# 3. State Management

## Default: Cubit

استخدم **Cubit كحل State Management الافتراضي** في المشروع.

أمثلة:

```text
PrayerCubit
QuranCubit
AzkarCubit
TasbeehCubit
SettingsCubit
UpdateCubit
```

### استخدم BLoC فقط عندما يكون هناك سبب واضح

استخدم BLoC عندما تكون Feature:

- Event-driven بشكل واضح.
- تحتوي على عدد كبير من Events.
- تحتاج Debounce/Throttle.
- تحتاج Cancellation.
- تحتوي على Concurrency معقدة.
- تحتاج تتبع Events بشكل واضح.
- تحتوي على Workflow معقد يعتمد على ترتيب الأحداث.

مثال مناسب لـBLoC:

```text
SearchChanged
SearchSubmitted
SearchCancelled
ResultsLoaded
SearchFailed
```

### ممنوع

لا تستخدم:

- Provider
- Riverpod
- GetX
- MobX
- أي State Management آخر

إلا إذا كان هناك سبب معماري واضح وتم توثيقه.

لا تستخدم أكثر من State Management solution لنفس المشكلة بدون ضرورة.

---

# 4. Widget Reusability

**Create Once → Reuse Everywhere**

قبل إنشاء Widget جديد:

1. ابحث عن Widget مشابه.
2. إذا كان موجودًا، أعد استخدامه.
3. إذا كان يحتاج اختلافات بسيطة، اجعله configurable باستخدام parameters.
4. إذا كان نفس الـUI يتكرر، استخرجه إلى reusable Widget.

مثال:

بدل تكرار:

```dart
Container(
  padding: const EdgeInsets.all(16),
  ...
)
```

في عدة أماكن، أنشئ Component مشترك:

```dart
AtharCard(
  child: ...
)
```

### لكن

لا تستخرج كل:

```text
Text
Container
Padding
Row
Icon
```

إلى ملف منفصل بدون سبب.

يجب أن يكون للـWidget مسؤولية واضحة أو قيمة إعادة استخدام حقيقية.

---

# 5. DRY — Don't Repeat Yourself

قبل كتابة أي Logic اسأل:

> هل هذا الـLogic موجود بالفعل؟

إذا نعم:

- استخدمه.
- أو حسّنه ليصبح reusable.
- أو استخرج الجزء المشترك.

ممنوع Copy/Paste للـBusiness Logic.

لا تكرر:

- Validation
- Formatting
- API handling
- Calculations
- Permission logic
- Storage logic
- Navigation rules

---

# 6. Single Responsibility

كل class / Widget / Service يجب أن يكون له **مسؤولية واضحة**.

تجنب:

```text
God Widget
God Cubit
God Service
God Repository
```

إذا أصبح class مسؤولًا عن أشياء كثيرة غير مترابطة، افحص إمكانية تقسيمه.

لكن لا تقسّم الكود بشكل مصطنع فقط لتقليل عدد الأسطر.

---

# 7. Page / Widget Size

عدد الأسطر ليس قاعدة مطلقة، لكنه Warning Signal.

الإرشادات:

```text
< 200 lines
→ غالبًا طبيعي

200–300
→ راجع المسؤوليات

300–500
→ غالبًا يحتاج تقسيم

> 500
→ يجب مراجعة التصميم والبحث عن Refactoring
```

لا تقسّم Widget فقط للوصول إلى عدد أسطر أقل.

**المسؤوليات أهم من عدد الأسطر.**

---

# 8. UI Rules

الـUI مسؤول عن:

- Rendering
- User Interaction
- Listening to State

لا تضع داخل Widget:

- API calls
- Database operations
- Business Logic
- Complex calculations
- Storage operations

التدفق:

```text
UI
 ↓
Cubit / BLoC
 ↓
UseCase (if needed)
 ↓
Repository
 ↓
DataSource
 ↓
API / Local Storage
```

---

# 9. Data Access

ممنوع أن تتعامل الـUI مباشرة مع:

- API
- Firebase
- Database
- SharedPreferences
- Files
- External services

استخدم abstraction مناسب حسب حجم الـFeature.

---

# 10. Models & Entities

استخدم:

```text
Models
Entities
```

عندما يكون الفصل مفيدًا.

لا تنشئ:

```text
Model
Entity
Mapper
Repository
UseCase
Interface
```

لمجرد اتباع Template.

إذا كانت Feature بسيطة، استخدم أبسط Architecture مناسبة.

---

# 11. Dependency Injection

لا تنشئ Services وRepositories بشكل عشوائي داخل Widgets.

استخدم نظام Dependency Injection الموجود في المشروع.

قبل إضافة DI solution جديدة:

- افحص الموجود.
- استخدمه.
- لا تضف Package جديدة بدون سبب.

---

# 12. Async Operations

ممنوع تنفيذ عمليات Async ثقيلة داخل:

```dart
build()
```

لا تعمل API calls من `build()`.

تعامل مع:

```text
Loading
Success
Error
Empty
```

بشكل واضح.

يجب منع:

- Duplicate requests
- Race conditions
- Unnecessary requests

---

# 13. Error Handling

ممنوع:

```dart
catch (_) {}
```

بدون سبب.

لا تخفي الأخطاء.

تعامل مع:

- Network errors
- API errors
- Parsing errors
- Permission errors
- Storage errors

بشكل واضح.

التطبيق يجب ألا ينهار بسبب خطأ يمكن التعامل معه.

---

# 14. Null Safety

استخدم Dart Null Safety بشكل صحيح.

لا تستخدم:

```dart
!
```

فقط لإسكات Compiler.

إذا كان Null ممكنًا، تعامل معه بشكل واضح وآمن.

تجنب:

```dart
dynamic
```

إلا عند وجود ضرورة حقيقية.

---

# 15. Performance

استخدم:

```dart
const
```

حيثما يكون مناسبًا.

تجنب:

- Unnecessary rebuilds
- Heavy work داخل `build`
- Unnecessary object creation
- Large synchronous operations
- Unnecessary API calls

استخدم:

```text
ListView.builder
GridView.builder
```

عند التعامل مع Lists كبيرة.

افحص Rebuilds عندما يكون الأداء مهمًا.

---

# 16. Theme & Design System

استخدم Theme الموجود في المشروع.

لا تنشئ ألوانًا أو TextStyles جديدة إذا كان هناك Style مناسب بالفعل.

قبل إنشاء:

```text
Color
TextStyle
Button
Card
Input
Dialog
```

ابحث عن الموجود.

إذا كان Component يستخدم في أكثر من مكان، اجعله reusable.

الهدف:

**UI Consistency**

---

# 17. Constants

لا تكرر Constants المهمة في عدة ملفات.

استخدم:

```text
constants/
```

عندما يكون الـConstant مشتركًا فعلًا.

لكن لا تحول كل String وNumber في المشروع إلى Constant بدون داعٍ.

---

# 18. Naming

استخدم أسماء واضحة تصف المسؤولية.

تجنب:

```text
Helper
Manager
Data
Thing
Temp
NewWidget
Widget2
Test
```

استخدم:

```text
PrayerTimesRepository
QuranPageHeader
UpdateChecker
AzkarCounter
```

---

# 19. Packages

قبل إضافة Package:

1. ابحث عن Package موجودة تؤدي نفس الوظيفة.
2. تحقق هل Flutter/Dart يستطيع حل المشكلة بدون Package.
3. إذا كانت Package ضرورية، استخدم Package موثوقة.
4. لا تضف Package لحل مشكلة بسيطة يمكن حلها بسهولة داخل المشروع.

لا تغير Package أو Architecture بدون سبب واضح.

---

# 20. Security & Privacy

ممنوع وضع:

- API keys
- Secrets
- Passwords
- Private credentials

داخل Source Code.

لا تسجل بيانات حساسة في Logs.

احترم Privacy الخاصة بالمستخدم.

---

# 21. Navigation

استخدم نظام Navigation الموجود في المشروع.

لا تنشئ نظام Navigation جديد داخل Feature.

لا تضع Navigation logic معقد داخل Widgets.

استخدمة مكتبة gorouter هى افضل 

إذا كان Navigation behavior مشتركًا، ضعه في المكان المناسب بدل تكراره.

---

# 22. Existing Code First

قبل تنفيذ أي Task:

ابحث أولًا عن:

```text
Existing Widgets
Existing Cubits
Existing BLoCs
Existing Services
Existing Repositories
Existing Utils
Existing Components
Existing Theme
Existing Navigation
Existing API clients
```

**لا تفترض أن المطلوب غير موجود.**

---

# 23. Bug Fix Rules

عند إصلاح Bug:

```text
Understand
 ↓
Find root cause
 ↓
Make minimal change
 ↓
Test
```

ممنوع:

- إعادة كتابة Feature كاملة.
- تغيير Architecture.
- تغيير State Management.
- إضافة Packages كثيرة.

إلا إذا كان ذلك ضروريًا فعلًا لحل المشكلة.

---

# 24. Refactoring Rules

Refactor فقط عندما:

- يوجد تكرار واضح.
- المسؤوليات مختلطة.
- الكود يصعب اختباره.
- هناك مشكلة Maintainability حقيقية.

لا تعمل Refactor لمجرد أن هناك طريقة مختلفة لكتابة الكود.

**Existing working code should not be rewritten without a reason.**

---

# 25. Comments

لا تكتب Comments تشرح الكود الواضح.

اكتب Comment عندما يكون هناك:

- قرار معماري مهم.
- Workaround.
- Behavior غير بديهي.
- سبب تقني غير واضح.

يفضل أن يكون الكود نفسه واضحًا بدل الاعتماد على Comments.

---

# 26. Testing

بعد أي تغيير مهم:

```bash
flutter analyze
```

وشغّل الاختبارات المناسبة.

اختبر على الأقل:

- Existing behavior
- New behavior
- Error cases
- Edge cases

لا تعتبر المهمة مكتملة لمجرد أن التطبيق يعمل Compile.

---

# 27. Git & Scope

لا تعدل ملفات غير مرتبطة بالمهمة.

لا تعمل:

```text
Unrelated refactoring
Formatting entire project
Renaming unrelated files
Changing unrelated UI
```

راجع التغييرات قبل إنهاء المهمة.

يفضل أن يكون:

```bash
git diff
```

واضحًا ومحدودًا بالمهمة.

---

# 28. AI Workflow

قبل أي Task:

```text
1. Understand the request
2. Inspect existing architecture
3. Search for reusable code
4. Identify affected files
5. Plan the smallest correct solution
6. Implement
7. Run flutter analyze
8. Run relevant tests
9. Review the diff
10. Report what changed
```

لا تبدأ بالكتابة مباشرة قبل فهم الكود الموجود.

---

# 29. Decision Rules

عندما يكون هناك أكثر من حل، استخدم الترتيب التالي:

```text
Simple
   >
Maintainable
   >
Reusable
   >
Extensible
```

ولا تختار الحل الأكثر تعقيدًا لمجرد أنه أكثر "Enterprise".

الأولوية:

```text
Correctness
↓
Maintainability
↓
Readability
↓
Performance
↓
Abstraction
```

---

# 30. Golden Rules

هذه القواعد أهم من أي Pattern:

### Rule 1

**Reuse before creating.**

### Rule 2

**Do not duplicate UI or business logic.**

### Rule 3

**Cubit is the default State Management solution.**

### Rule 4

**Use BLoC only when event complexity justifies it.**

### Rule 5

**Do not over-engineer.**

### Rule 6

**Do not create abstractions without a real reason.**

### Rule 7

**Keep Widgets focused and reusable.**

### Rule 8

**Keep Pages preferably below 300 lines; investigate anything above 500 lines.**

### Rule 9

**Do not put business logic in UI.**

### Rule 10

**Reuse the existing architecture before introducing a new one.**

### Rule 11

**Minimal change is preferred over large refactoring.**

### Rule 12

**Every change must preserve existing functionality unless the task explicitly requires changing it.**

---

# Final Principle

عند كتابة أي كود في ردار، اسأل دائمًا:

> **هل يوجد شيء موجود بالفعل يمكنني استخدامه؟**

ثم:

> **هل هذا الكود مسؤول عن شيء واحد واضح؟**

ثم:

> **هل أستطيع إعادة استخدامه؟**

ثم:

> **هل هذا الحل أبسط حل صحيح؟**

إذا كانت الإجابة نعم، نفذ.

إذا كانت الإجابة لا، ابحث عن طريقة أفضل قبل كتابة الكود.


---

# 31. Web Stack

جزء الـWeb في ردار يجب أن يستخدم:

```text
Next.js 16
React
TypeScript
Tailwind CSS 4
```

هذه التقنيات هي الـdefault stack للموقع.

ممنوع إدخال Framework أو CSS framework بديل لنفس المسؤولية بدون سبب معماري واضح وتوثيق السبب.

---

# 32. Next.js Architecture

استخدم:

**Next.js 16 + App Router**

Structure مبدئي:

```text
app/
├── (marketing)/
├── (dashboard)/
├── api/
├── components/
├── lib/
├── hooks/
├── services/
├── types/
└── ...
```

لكن لا تنشئ كل المجلدات بشكل إجباري.

استخدم Feature-First أو تقسيم منطقي عندما يكون المشروع أو الـFeature كبيرًا.

الأولوية:

```text
Simple
>
Clear
>
Maintainable
>
Reusable
```

لا تحول مشروع Next.js إلى Architecture معقدة بدون حاجة.

---

# 33. Server Components First

في Next.js 16:

**Server Components هي الـdefault.**

لا تستخدم:

```tsx
"use client"
```

إلا عندما تحتاج فعلًا إلى:

- useState
- useEffect
- Browser APIs
- Event handlers
- Client-only libraries
- Interactive UI
- Client-side state

قبل إضافة `"use client"` اسأل:

> هل يمكن تنفيذ هذا الجزء كـServer Component؟

إذا نعم، اتركه Server Component.

لا تجعل Page كاملة Client Component لمجرد أن جزءًا صغيرًا منها يحتاج interaction.

افصل الـInteractive Component واجعله Client Component فقط عند الحاجة.

---

# 34. Client Components

عند استخدام Client Components:

- اجعلها صغيرة ومحددة المسؤولية.
- لا تضع Business Logic كبير داخلها.
- لا تنقل بيانات أكثر من اللازم من Server إلى Client.
- تجنب جعل الـparent component بالكامل Client Component بسبب child واحد.
- لا تستخدم Client State عندما يمكن حل المشكلة على Server.

التدفق المفضل:

```text
Server Component
      ↓
Data / Server Logic
      ↓
Client Component عند الحاجة
      ↓
User Interaction
```

---

# 35. Data Fetching

اجعل Data Fetching في المكان الأنسب للمسؤولية.

الأولوية:

```text
Server
>
Client
```

عندما لا تحتاج البيانات إلى Browser APIs أو تفاعل مباشر، اجلبها على Server.

ممنوع عمل:

```text
useEffect()
→ fetch()
```

كحل افتراضي لكل Data Fetching.

قبل كتابة Client-side fetch اسأل:

- هل يمكن جلب البيانات على Server؟
- هل البيانات تحتاج تحديثًا لحظيًا؟
- هل تحتاج User Interaction؟
- هل هناك Cache مناسب؟
- هل يمكن استخدام Server Action أو Route Handler؟

---

# 36. Caching & Revalidation

لا تفترض أن كل Request يجب أن يكون Dynamic.

حدد بوضوح طبيعة البيانات:

```text
Static
Dynamic
Revalidated
Client-updated
```

استخدم Caching وRevalidation عندما تكون مناسبة.

لا تضف:

```text
no-store
```

أو تمنع caching بشكل عام بدون سبب.

ولا تعتمد على caching بدون فهم أثره على صحة بيانات Radar.

البيانات المالية أو بيانات الصفقات التي يجب أن تكون حديثة يجب التعامل معها بحذر، ولا يجوز عرض بيانات قديمة بسبب Cache غير مقصود.

---

# 37. Server Actions

استخدم Server Actions عندما تكون مناسبة لعمليات Mutation مثل:

```text
Create
Update
Delete
Save
Submit
```

لكن:

- لا تستخدم Server Action لكل شيء.
- لا تضع Business Logic ضخم داخل Action.
- تحقق من المدخلات على Server.
- لا تثق في البيانات القادمة من Client.
- تعامل مع Authentication وAuthorization قبل تنفيذ العملية.

يفضل أن يكون التدفق:

```text
Client
 ↓
Server Action
 ↓
Validation
 ↓
Business Logic
 ↓
Repository / Data Access
 ↓
Database / External Service
```

---

# 38. Route Handlers

استخدم Route Handlers عندما تحتاج HTTP endpoint فعلي.

مثل:

```text
GET
POST
PUT
PATCH
DELETE
```

لا تنشئ Route Handler فقط كطبقة إضافية بين Server Component وDatabase بدون سبب.

إذا كان Server Component يستطيع الوصول إلى البيانات مباشرة بطريقة آمنة ومناسبة، لا تعمل:

```text
Server Component
 ↓
/api/...
 ↓
Database
```

بدون حاجة.

تجنب الـunnecessary internal API calls.

---

# 39. API & External Services

لا تضع:

- API Keys
- Secrets
- Private Credentials
- Database Credentials

داخل Client Components.

أي Secret يجب أن يبقى Server-side.

استخدم Environment Variables بالطريقة المناسبة.

لا تستخدم:

```text
NEXT_PUBLIC_
```

لأي Secret.

`NEXT_PUBLIC_` مخصص للقيم التي يمكن أن تظهر للـClient.

---

# 40. Validation

كل Input قادم من المستخدم يجب اعتباره غير موثوق.

تحقق من:

```text
Forms
Query Params
Route Params
Request Body
Server Actions
API Requests
Uploaded Files
```

Validation يجب أن تتم على Server عندما تكون البيانات ستؤثر على:

- Database
- Authentication
- Authorization
- Financial calculations
- User data
- External APIs

Client-side validation لتحسين تجربة المستخدم فقط، وليست Security boundary.

---

# 41. Authentication & Authorization

Authentication:

> من هو المستخدم؟

Authorization:

> هل المستخدم مسموح له بتنفيذ العملية؟

لا تخلط بينهما.

كل عملية حساسة يجب أن تتحقق من Authorization على Server.

لا تعتمد على:

```text
Hidden UI
Disabled Button
Client State
```

كوسيلة حماية.

إخفاء زر لا يعني أن العملية محمية.

---

# 42. Financial Calculations

Radar يحتوي على أدوات مرتبطة بإدارة المخاطر والصفقات.

لذلك:

- لا تعتمد على JavaScript floating-point calculations بدون الانتباه للدقة.
- استخدم طريقة مناسبة للدقة المالية حسب نوع الحساب.
- اجعل قواعد الحساب في مكان مركزي وقابل للاختبار.
- لا تكرر معادلات المخاطرة وحجم المركز في أكثر من مكان.
- اختبر Edge Cases.

مثل:

```text
Zero
Negative values
Very large values
Very small values
Missing values
Decimal values
Invalid stop loss
Target below entry
Target equal to entry
```

أي تغيير في Financial Logic يجب أن يكون Minimal ومختبرًا.

---

# 43. TypeScript

استخدم TypeScript بشكل صارم وواضح.

تجنب:

```ts
any
```

إلا عند ضرورة حقيقية ومبررة.

استخدم Types واضحة للـ:

```text
User
Stock
Trade
Position
Risk
Target
Watchlist
Transaction
API Response
```

لا تعتمد على:

```ts
as any
```

لإسكات TypeScript.

إذا كان Type غير صحيح، أصلح السبب بدل إخفائه.

---

# 44. React State

استخدم State في المكان الذي يملك المسؤولية عنه.

قبل إضافة Global State اسأل:

> هل هذه البيانات فعلًا تحتاج أن تكون Global؟

الأولوية:

```text
Local State
>
Parent State
>
Context / Existing State Solution
>
Global State
```

لا تضف State Management library جديدة بدون سبب حقيقي.

لا تستخدم Global State لتخزين بيانات يمكن جلبها أو إدارتها على Server بشكل أفضل.

---

# 45. Components

**Create Once → Reuse Everywhere**

قبل إنشاء Component جديد:

1. ابحث عن Component مشابه.
2. أعد استخدامه إن كان مناسبًا.
3. اجعله configurable إذا كان الاختلاف بسيطًا.
4. استخرج Component مشترك إذا كان UI يتكرر فعلًا.

لكن لا تحول كل:

```text
div
span
button
p
```

إلى Component مستقل بدون قيمة حقيقية.

Component يجب أن يمتلك:

- مسؤولية واضحة
- أو Reusability حقيقية
- أو Behavior معقدًا يستحق العزل

---

# 46. Tailwind CSS 4

استخدم:

**Tailwind CSS 4**

كحل CSS الأساسي في Web.

لا تستخدم CSS عشوائيًا إذا كان يمكن تنفيذ التصميم بشكل واضح باستخدام Tailwind.

استخدم:

```text
Tailwind utilities
CSS variables
Theme tokens
Reusable components
```

حسب الحاجة.

لا تنشئ CSS class مخصصة لمجرد استبدال Utility Class بسيطة.

---

# 47. Tailwind Design System

حافظ على Design System موحد في Radar.

قبل إضافة:

```text
Color
Spacing
Radius
Shadow
Font Size
Typography
Button
Input
Card
Badge
Modal
```

ابحث عن الـDesign Token أو Component الموجود.

لا تستخدم ألوانًا عشوائية مثل:

```text
text-[#123456]
bg-[#abcdef]
```

في كل مكان.

إذا كان اللون جزءًا من الهوية أو Design System، اجعله Token قابلًا لإعادة الاستخدام.

الهدف:

**Consistency**

---

# 48. Responsive Design

أي UI جديد يجب أن يعمل على:

```text
Mobile
Tablet
Desktop
```

لا تفترض أن المستخدم يستخدم Desktop فقط.

ابدأ من التصميم الأبسط ثم وسّعه للشاشات الأكبر.

افحص:

- Overflow
- Long text
- Tables
- Charts
- Forms
- Navigation
- Modals
- Cards
- Empty states

خصوصًا Dashboard الخاص برادار.

---

# 49. Tailwind Class Management

لا تكرر نفس مجموعة الـclasses الطويلة في عشرات الأماكن.

إذا أصبح UI pattern متكررًا، فكر في:

```text
Reusable Component
```

بدل Copy/Paste.

لكن لا تستخدم abstraction مثل:

```text
UniversalComponent
MegaCard
GenericBox
```

بدون مسؤولية واضحة.

---

# 50. Accessibility

أي UI تفاعلي يجب أن يكون قابلًا للاستخدام بشكل مناسب.

اهتم بـ:

```text
Semantic HTML
Labels
Keyboard navigation
Focus states
ARIA عند الحاجة
Color contrast
Button semantics
Form errors
```

لا تستخدم:

```text
<div onClick={...}>
```

بدل Button عندما تكون العملية Button فعلًا.

---

# 51. SEO

صفحات Radar العامة يجب أن تحتوي على Metadata مناسبة.

اهتم بـ:

```text
Title
Description
Open Graph
Canonical URL عند الحاجة
Robots
Sitemap
Structured Data عند الحاجة
```

لا تضع نفس Metadata لكل صفحات الموقع.

Dashboard والصفحات الخاصة بالمستخدم لا يجب التعامل معها كصفحات Marketing عامة.

---

# 52. Loading / Error / Empty States

كل Feature تتعامل مع Data يجب أن تتعامل بوضوح مع:

```text
Loading
Success
Error
Empty
```

لا تعرض:

```text
Blank screen
```

عند فشل البيانات.

استخدم آليات Next.js المناسبة مثل:

```text
loading.tsx
error.tsx
not-found.tsx
```

عندما تكون مناسبة للـroute.

---

# 53. Performance

اهتم بـ:

- Server Components
- Streaming عند الحاجة
- Image optimization
- Lazy loading عند الحاجة
- تقليل Client JavaScript
- تجنب unnecessary re-renders
- تجنب unnecessary requests
- تقليل حجم dependencies
- عدم تحميل مكتبات كبيرة لمجرد استخدام Feature صغيرة

لا تعمل Optimization مبكر بدون قياس.

إذا ظهرت مشكلة Performance:

```text
Measure
 ↓
Identify bottleneck
 ↓
Fix root cause
 ↓
Measure again
```

---

# 54. Charts & Financial UI

Radar يعتمد على البيانات والتحليلات.

عند التعامل مع:

```text
Charts
Tables
Performance Metrics
Stock Data
Trade Data
```

اهتم بـ:

- Correct formatting
- Responsive behavior
- Loading state
- Empty state
- Error state
- Number precision
- Dates
- Currency
- Large datasets

لا تعرض رقمًا ماليًا بطريقة قد توحي بدقة غير موجودة في البيانات.

---

# 55. Database Access

لا تتعامل الـUI مباشرة مع Database.

التدفق:

```text
UI
 ↓
Server Component / Server Action / Route Handler
 ↓
Service / Repository
 ↓
Database
```

استخدم abstraction مناسب عندما تكون هناك قيمة حقيقية.

لا تنشئ Repository وService وUseCase لكل Query بسيطة لمجرد اتباع Pattern.

---

# 56. Security

تعامل مع Security كجزء من Architecture.

اهتم بـ:

```text
Authentication
Authorization
Input Validation
Secrets
Session Security
CSRF حسب آلية التطبيق
Rate Limiting عند الحاجة
Secure Headers
Data Exposure
```

لا ترسل للـClient بيانات لا يحتاجها.

لا تعتمد على Security موجودة في الـUI فقط.

---

# 57. Dependencies

قبل إضافة npm package:

1. هل Next.js أو React أو Tailwind يحل المشكلة بالفعل؟
2. هل توجد Package موجودة في المشروع تؤدي نفس الوظيفة؟
3. هل Package موثوقة؟
4. هل حجمها وتأثيرها على Bundle مقبول؟
5. هل تستحق dependency جديدة؟

لا تضف:

```text
Library
Framework
UI Kit
State Manager
Utility Package
```

لمجرد أنها توفر بضعة أسطر.

---

# 58. File & Folder Rules

لا تنشئ ملفات جديدة لمجرد تقسيم الكود.

قبل إنشاء File:

> هل هناك مكان موجود مناسب لهذا الكود؟

استخدم أسماء تصف المسؤولية.

تجنب:

```text
helper.ts
utils2.ts
newComponent.tsx
temp.ts
manager.ts
common.ts
```

إلا إذا كان الاسم له معنى واضح داخل المشروع.

---

# 59. Web Testing

بعد أي تغيير مهم:

```text
TypeScript check
Lint
Tests
Build
```

واختبر:

- Existing behavior
- New behavior
- Error cases
- Edge cases
- Responsive UI
- Authentication / Authorization عند الحاجة

لا تعتبر Feature مكتملة لمجرد أن الصفحة تظهر.

---

# 60. Web Git & Scope

لا تعدل ملفات غير مرتبطة بالمهمة.

ممنوع:

```text
Unrelated refactoring
Formatting entire project
Changing unrelated UI
Renaming unrelated files
Updating dependencies without reason
```

راجع:

```bash
git diff
```

قبل إنهاء المهمة.

الـdiff يجب أن يكون واضحًا ومحدودًا بالمطلوب.

---

# 61. Full-Stack AI Workflow

قبل أي Task في Radar:

```text
1. Understand the request
2. Identify whether it is Flutter, Web, or Full-Stack
3. Inspect existing architecture
4. Search for reusable code
5. Identify affected files
6. Identify Server/Client boundaries
7. Identify data and security implications
8. Plan the smallest correct solution
9. Implement
10. Run checks
11. Test
12. Review the diff
13. Report what changed
```

لا تبدأ بالكتابة مباشرة قبل فهم الكود الموجود.

---

# 62. Flutter + Next.js Consistency

Flutter وWeb هما أجزاء من Radar، لذلك يجب أن يكون الـProduct behavior متسقًا حتى لو اختلف implementation.

لا يعني ذلك نسخ الكود بين المشروعين.

المطلوب هو توحيد:

```text
Business Rules
Naming
Financial Logic
Validation Rules
User-facing behavior
Data semantics
```

إذا كانت نفس المعادلة أو Business Rule موجودة في Flutter وWeb، يجب التأكد أن النتيجة متطابقة.

لا تجعل كل Platform تطبق Business Rule مختلفة بدون سبب واضح.

---

# 63. Golden Rules — Web

### Rule 13

**Next.js 16 + App Router is the default Web architecture.**

### Rule 14

**Server Components first.**

### Rule 15

**Use Client Components only when client behavior is actually required.**

### Rule 16

**Tailwind CSS 4 is the default styling solution.**

### Rule 17

**Do not expose secrets to the client.**

### Rule 18

**Validate untrusted input on the server.**

### Rule 19

**Authorization must be enforced on the server.**

### Rule 20

**Do not duplicate financial/business logic.**

### Rule 21

**Prefer direct server-side data access over unnecessary internal API calls.**

### Rule 22

**Do not add dependencies without a real reason.**

### Rule 23

**Responsive and accessible UI is required.**

### Rule 24

**Measure performance before optimizing.**

### Rule 25

**Keep the Web and Flutter product behavior consistent.**

---

# Final Radar Principle

عند كتابة أي كود في ردار، اسأل دائمًا:

> **هل يوجد شيء موجود بالفعل يمكنني استخدامه؟**

ثم:

> **هل هذا الكود مسؤول عن شيء واحد واضح؟**

ثم:

> **هل أستطيع إعادة استخدامه؟**

ثم:

> **هل هذه الـBusiness Rule متوافقة مع باقي أجزاء Radar؟**

ثم:

> **هل Server أم Client هو المكان الصحيح لهذا الكود؟**

ثم:

> **هل هذا أبسط حل صحيح؟**

ثم:

> **هل التغيير آمن، قابل للاختبار، ويحافظ على الـexisting behavior؟**

إذا كانت الإجابة نعم، نفذ.

إذا كانت الإجابة لا، ابحث عن طريقة أفضل قبل كتابة الكود.
