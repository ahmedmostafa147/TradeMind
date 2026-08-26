import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalPage } from '@/components/legal-page';
import { disclaimer, site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'شروط الاستخدام',
  description:
    'شروط استخدام رادار — حدود المسؤولية، طبيعة الأداة، والبيانات المعروضة فيها.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage title="شروط الاستخدام" updatedAt={site.legalUpdatedAt}>
      <p>
        باستخدامك {site.name} — من الموقع أو من تطبيق التليفون — انت موافق على
        الشروط دي. لو مش موافق على أي بند منها، من فضلك متستخدمهوش.
      </p>

      {/* The disclaimer leads rather than closing the page. It is the single
          most consequential clause here, and RELEASE.md requires it stated
          outright so Play does not file the app under its restricted financial
          categories. */}
      <div className="callout">
        <strong>الأهم قبل أي حاجة:</strong> {disclaimer}
      </div>

      <h2>١. طبيعة الخدمة</h2>
      <p>
        {site.name} أداة شخصية لتسجيل الصفقات وحساب حجم المركز ونسبة المخاطرة.
        كل اللي بيعرضه رادار عن دفترك مبني على البيانات اللي انت بنفسك بتدخّلها،
        والإعدادات اللي انت حاططها (رأس المال وأقصى نسبة مخاطرة).
      </p>
      <p>
        رادار <strong>مش</strong> وسيط مالي، ومش مستشار استثماري، ومش مرخّص من
        أي جهة رقابية، ومش متصل بأي حساب تداول. مبيقدرش ينفّذ أمر بيع أو شراء،
        ومبيطّلعش توصيات.
      </p>

      <h2>٢. دقة الحسابات والبيانات</h2>
      <p>
        الحسابات في رادار بتتنفّذ على البيانات اللي انت مدخّلها. أي خطأ في
        سعر الدخول أو الاستوب أو عدد الأسهم بينتج عنه أرقام غلط، ومسؤولية
        مراجعة المدخلات عليك.
      </p>
      <p>
        أسعار الإغلاق بتيجي من مصدر بيانات عام مجاني، وبتتعرض للاسترشاد بس. ممكن
        تتأخر أو تكون ناقصة أو غير متاحة، ومينفعش تُتخذ كأساس وحيد لأي قرار. لو
        السعر مش متاح، رادار بيقول كده صراحةً ومبيعرضش صفر مكانه.
      </p>
      {/* Added when «السوق» shipped. The section covered figures the user types
          and prices we fetch, and said nothing about the third-party market
          data the product now DISPLAYS — which is the one category here we
          neither compute nor control. */}
      <p>
        بيانات تداولات المستثمرين (مين اشترى ومين باع، حسب الجنسية والنوع)
        منشورة من <strong>البورصة المصرية</strong>، وبنعرضها زي ما هي من غير
        تعديل ولا تفسير. ممكن البورصة تعدّلها بعد إقفال الجلسة، وممكن تتأخر أو
        تكون ناقصة. دي بيانات تاريخية عن جلسة عدّت، <strong>مش تحليل ولا
        توقّع ولا توصية</strong>، وإحنا مش مسؤولين عن دقتها ولا عن أي قرار
        اتاخد بناءً عليها.
      </p>

      <h2>٣. مسؤوليتك عن قراراتك</h2>
      <p>
        كل قرارات البيع والشراء بتاعتك مسؤوليتك وحدك. التداول في الأوراق المالية
        فيه مخاطر، وممكن تخسر جزء من رأس مالك أو كله. إحنا مش مسؤولين عن أي خسارة
        مالية — مباشرة أو غير مباشرة — ناتجة عن استخدامك لرادار أو اعتمادك على
        أي رقم فيه.
      </p>

      <h2>٤. حسابك وبياناتك</h2>
      <p>
        رادار بيشتغل بحساب، وانت مسؤول عن الحفاظ على
        بيانات دخولك. طريقة تعاملنا مع بياناتك موضّحة في{' '}
        <Link href="/privacy">سياسة الخصوصية</Link>، وتقدر تمسح حسابك في أي وقت
        من <Link href="/delete">صفحة حذف الحساب</Link>.
      </p>
      <p>
        النسخ الاحتياطي السحابي خدمة مساعدة، مش ضمان. مسؤولية الاحتفاظ بسجلاتك
        المهمة تفضل عليك.
      </p>

      <h2>٥. الاستخدام المقبول</h2>
      <ul>
        <li>رادار للاستخدام الشخصي.</li>
        <li>
          ممنوع محاولة الوصول لبيانات مستخدمين تانيين أو التلاعب بخدمات رادار.
        </li>
        <li>
          ميزة قراءة الصور بتشتغل بمفتاح API بتاعك انت، وانت مسؤول عن الالتزام
          بشروط استخدام الخدمة دي وعن الصور اللي بترفعها عليها.
        </li>
      </ul>

      {/* THIS SECTION DESCRIBED A PRODUCT THAT NO LONGER EXISTS.

          It was written the day plans shipped and it stayed written after they
          were switched off — naming «رادار Pro», listing which four features it
          unlocked, and linking to a `/#pricing` anchor that is not rendered any
          more. It also told the reader to «ابعتلنا من داخل رادار» and pay
          outside, which is precisely the instruction that was stripped out of
          the Android app for Play's sake; the app links to this page from its
          settings, so a reviewer following that link read the removed sentence
          anyway.

          The single source of truth is `EVERYTHING_FREE` in site/lib/subscription.ts
          and `kEverythingFree` in lib/billing/entitlements.dart. WHEN EITHER
          FLIPS BACK, THIS SECTION HAS TO COME BACK IN THE SAME COMMIT — that is
          the whole rule in CLAUDE.md §3, and this section is the proof of what
          happens when it is not followed. The old wording is in git history at
          the commit that replaced it. */}
      <h2>٦. الاشتراك والرسوم</h2>
      <ul>
        <li>
          <strong>رادار مجاني بالكامل دلوقتي.</strong> كل المميزات مفتوحة لكل
          حساب: تسجيل الصفقات ومتابعتها، حاسبات الحجم والمخاطرة والأهداف، بيانات
          السوق وأسعار الأسهم، قراءة التوصيات بالذكاء الاصطناعي، وشاشات الأداء
          والتحليلات.
        </li>
        <li>
          <strong>مفيش باقات مدفوعة، ومفيش بوابة دفع.</strong> مش بنطلب بطاقة،
          ومفيش أي مبلغ بيتسحب منك، ومفيش تجديد تلقائي. أي صفحة أو زرار بيقول
          غير كده يبقى قديم — اللي هنا هو الساري.
        </li>
        <li>
          <strong>صفقاتك بتفضل بتاعتك في كل الأحوال.</strong> ولو رجعنا باقات
          مدفوعة في المستقبل، مفيش أي بيانات هتتمسح ومفيش أي صفقة هتتقفل، ودفترك
          هيفضل مفتوح تكتب فيه وتقراه وتقدر تصدّره.
        </li>
        <li>
          لو قررنا نضيف باقات مدفوعة، هنكتب شروطها هنا وهنعلن قبلها بوقت كافي،
          وهي هتسري على اللي يشترك بعد كده بس.
        </li>
      </ul>

      <h2>٧. توفّر الخدمة والتغييرات</h2>
      <p>
        رادار بيتقدّم «كما هو» من غير أي ضمانات. ممكن نعدّل أو نوقف أي ميزة —
        وخصوصًا الميزات المعتمدة على خدمات خارجية — من غير إشعار مسبق. لو غيّرنا
        حاجة جوهرية في الشروط دي، هنحدّث تاريخ «آخر تحديث» فوق.
      </p>

      <h2>٨. التواصل</h2>
      <p>
        لأي استفسار بخصوص الشروط دي:{' '}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
      </p>
    </LegalPage>
  );
}
