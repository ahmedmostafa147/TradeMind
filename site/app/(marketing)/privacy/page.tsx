import type { Metadata } from 'next';
import Link from 'next/link';

import { LegalPage } from '@/components/legal-page';
import { disclaimer, site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'سياسة الخصوصية',
  description:
    'أي بيانات بيتعامل معاها رادار، وليه، ومع مين بتتشارك — وإزاي تمسح حسابك وبياناتك.',
  alternates: { canonical: '/privacy' },
};

/**
 * THE canonical privacy policy. It began as legal/privacy-policy.html, which
 * was written but never hosted; that file has been deleted rather than left
 * alongside this one, because two copies of a legal document are two copies
 * that drift, and only this one is ever served to anyone.
 *
 * RELEASE.md lists a working privacy-policy URL as a hard prerequisite for the
 * Play listing, so this page is what unblocks it.
 *
 * One deliberate change from that source: the deletion link is now relative
 * («/delete») instead of the hardcoded absolute URL it carried. An absolute
 * link breaks the moment the site moves domain — and it pointed at a page that
 * did not exist, which is worse in a document a Play reviewer reads.
 */
export default function PrivacyPage() {
  return (
    <LegalPage title="سياسة الخصوصية" updatedAt={site.legalUpdatedAt}>
      <p>
        {site.name} أداة لتسجيل صفقات البورصة المصرية وحساب حجم المركز وإدارة
        المخاطرة، ولعرض بيانات التداولات المنشورة من البورصة. بتشتغل من الموقع
        ومن تطبيق التليفون بنفس الحساب. السياسة دي بتوضّح بالظبط أي بيانات
        بيتعامل معاها رادار، وليه، ومع مين بتتشارك.
      </p>

      <div className="callout">
        <strong>الأساس:</strong> رادار بيشتغل بحساب. صفقاتك بتتخزّن على جهازك
        وعلى حسابك انت، وقواعد الأمان على السيرفر بتمنع أي مستخدم تاني من الوصول
        ليها. مفيش إعلانات، مفيش أدوات تتبّع، ومبنبيعش بياناتك.
      </div>

      <h2>١. البيانات اللي بنجمعها</h2>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>البيانات</th>
              <th>إمتى بتتجمع</th>
              <th>ليه</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>البريد الإلكتروني والاسم المعروض</td>
              <td>عند إنشاء الحساب (بالبريد أو بحساب جوجل)</td>
              <td>لإنشاء حسابك وربط بياناتك بيه</td>
            </tr>
            <tr>
              <td>
                بيانات صفقاتك: رمز السهم، أسعار الدخول والخروج ووقف الخسارة
                والهدف، عدد الأسهم، التواريخ، الملاحظات، التصنيفات
              </td>
              <td>مع كل صفقة بتضيفها أو تعدّلها</td>
              <td>
                عشان تسترجع دفترك لو غيّرت أو فقدت جهازك، وتفتحه من المتصفح
              </td>
            </tr>
            <tr>
              <td>
                إعدادات المخاطرة: رأس المال، أقصى نسبة مخاطرة في الصفقة، وحد
                أيام الانتظار
              </td>
              <td>أول ما تغيّرها من التطبيق أو من المتصفح</td>
              <td>
                عشان درجة الانضباط وتحذيرات تجاوز المخاطرة تطلع بنفس الأرقام على
                التليفون وعلى الويب
              </td>
            </tr>
            <tr>
              <td>الصور اللي بترفعها لميزة القراءة الآلية</td>
              <td>وقت استخدام الميزة دي بس</td>
              <td>لاستخراج أسعار التوصية من الصورة</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p>
        رادار <strong>مش</strong> بيجمع: موقعك، جهات اتصالك، رقم تليفونك،
        معرّفات إعلانية، ولا بيتتبّع استخدامك. مفيش إعلانات ومفيش أدوات تتبّع
        تحليلية.
      </p>

      <h2>٢. الصور وميزة القراءة الآلية</h2>
      <p>
        لما تستخدم ميزة قراءة التوصية من صورة، الصورة بتتبعت لخدمة{' '}
        <strong>Google Gemini API</strong> عشان تتقرا وترجّع الأرقام اللي فيها.
        الصورة بتروح للخدمة دي في اللحظة دي بس، وإحنا مش بنخزّنها على أي سيرفر
        بتاعنا. معالجة Google للبيانات دي بتحكمها{' '}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
        >
          سياسة خصوصية Google
        </a>
        .
      </p>
      <p>
        الميزة دي بتشتغل بمفتاح API بتحطه انت بنفسك في إعدادات رادار — على
        التطبيق أو على الموقع. من غير المفتاح ده الميزة بتبقى مقفولة ومفيش أي
        صورة بتخرج من جهازك.{' '}
        <strong>متستخدمش الميزة على صور فيها بيانات حساسة</strong> زي كشوف
        حسابات أو أرقام بطاقات.
      </p>
      <p>
        على الموقع، الصورة بتروح <strong>من متصفحك لـGoogle على طول</strong> —
        مش بتعدّي على أي سيرفر بتاعنا، وإحنا مش بنشوفها ولا بنشوف المفتاح.
      </p>

      <h2>٣. أين تُخزَّن البيانات</h2>
      <ul>
        <li>
          <strong>على تليفونك:</strong> كل صفقاتك وإعداداتك ومفتاح الـ API، في
          تخزين التطبيق الخاص. الصور اللي بترفقها بصفقة بتتنسخ لمجلد التطبيق{' '}
          <strong>ومبتترفعش لأي مكان</strong> — عشان كده مش بتظهر في نسخة
          المتصفح.
        </li>
        <li>
          <strong>على متصفحك:</strong> مفتاح الـ API بس، في تخزين المتصفح
          المحلي. مش بيتحفظ على حسابك ومش بيتزامن، فلو فتحت رادار من جهاز تاني
          هتحتاج تحطّه تاني.
        </li>
        <li>
          <strong>على السحابة:</strong> صفقاتك بتتخزّن في Google Cloud Firestore
          تحت المسار{' '}
          <code className="num">users/&#123;معرّفك&#125;</code>، وإعدادات
          المخاطرة تحت{' '}
          <code className="num">users/&#123;معرّفك&#125;/settings</code>. قواعد
          الأمان بتمنع أي مستخدم تاني من قراءة أو تعديل بياناتك.
        </li>
      </ul>
      <p>
        مفتاح الـ API بتاع ميزة القراءة الآلية <strong>مش</strong> ضمن اللي
        بيترفع — بيفضل على الجهاز اللي اتكتب عليه بس، سواء تليفون أو متصفح.
      </p>
      <p>
        الهوية والتخزين السحابي بيتم عن طريق Firebase من Google. النقل كله مشفّر
        بـ HTTPS.
      </p>

      <h2>٤. بيانات السوق</h2>
      <p>
        رادار بيجيب أسعار الإغلاق من مصدر بيانات عام عشان يحسب ربح أو خسارة
        الصفقات المفتوحة. الطلب بيحتوي على <strong>رمز السهم بس</strong>، ومفيش
        أي بيانات شخصية بتتبعت معاه.
      </p>
      {/* The web cannot call that source from the page — no CORS headers — so
          the request is relayed. Saying so is not optional: it means our server
          sees the caller's IP, which the phone's direct call never exposed. */}
      <p>
        على التطبيق الطلب بيروح من تليفونك للمصدر على طول. على الموقع بيعدّي على
        سيرفر بتاعنا لأن المتصفح مش مسموح له يكلّم المصدر ده مباشرة — يعني
        السيرفر بيشوف عنوان الـ IP بتاعك وقت الطلب، زي أي طلب صفحة. مش بنربطه
        بحسابك ومش بنسجّله.
      </p>
      {/* Added when «السوق» shipped. It is the one data flow here that is not
          about the reader at all, and saying so plainly is the point: nothing
          personal leaves, and nothing personal is needed to fetch it. */}
      <p>
        بيانات تداولات المستثمرين اللي بتظهر في تبويب «السوق» بتيجي من{' '}
        <strong>البورصة المصرية</strong> وبتتخزّن عندنا مرة واحدة لكل جلسة —
        <strong>مش لكل مستخدم</strong>. هي نفسها لكل الناس، ومالهاش أي علاقة
        ببياناتك: مفيش أي حاجة تخصّك بتتبعت وقت جلبها، ومفيش حاجة بتتسجّل عنك
        وانت بتتفرّج عليها.
      </p>

      <h2>٥. مشاركة البيانات</h2>
      <p>
        إحنا <strong>مبنبيعش</strong> بياناتك ومبنشاركهاش لأغراض تسويقية.
        البيانات بتوصل لطرف تالت في حالتين بس، وهما اللي فوق:
      </p>
      <ul>
        <li>
          <strong>Google (Firebase)</strong> — للهوية وتخزين بياناتك.
        </li>
        <li>
          <strong>Google (Gemini API)</strong> — للصور، وقت استخدام ميزة القراءة
          بس.
        </li>
      </ul>
      <p>ممكن نفصح عن البيانات لو القانون ألزمنا بده.</p>

      <h2>٦. حذف حسابك وبياناتك</h2>
      <p>تقدر تمسح حسابك وكل بياناته في أي وقت، بطريقتين:</p>
      <ul>
        <li>
          <strong>من التطبيق:</strong> الإعدادات ← «حذف الحساب نهائيًا». ده
          بيمسح حسابك وكل صفقاتك المحفوظة على السيرفر فورًا ونهائيًا، وبيخيّرك
          لو عايز تمسح كمان النسخة المحفوظة على تليفونك.
        </li>
        <li>
          <strong>من الويب:</strong> ابعت طلب من{' '}
          <Link href="/delete">صفحة حذف الحساب</Link> أو على{' '}
          <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> من نفس
          البريد المسجّل بيه. بنرد وبننفّذ خلال <span className="num">٣٠</span>{' '}
          يوم كحد أقصى.
        </li>
      </ul>
      <p>
        حذف التطبيق من غير حذف الحساب بيمسح البيانات المحلية بس، والنسخة
        السحابية بتفضل موجودة لحد ما تطلب حذفها.
      </p>

      <h2>٧. مدة الاحتفاظ</h2>
      <p>
        بنحتفظ ببياناتك السحابية طول ما حسابك شغّال. أول ما تحذف الحساب، البيانات
        بتتمسح من قاعدة البيانات على طول، وبتختفي من النسخ الاحتياطية التشغيلية
        خلال <span className="num">٣٠</span> يوم.
      </p>

      <h2>٨. الأطفال</h2>
      <p>
        رادار موجّه للبالغين ومش مصمّم لمن هم دون <span className="num">١٨</span>{' '}
        سنة، ومبنجمعش بيانات عن قصد من الفئة دي.
      </p>

      <h2>٩. تغييرات على السياسة</h2>
      <p>
        لو غيّرنا حاجة جوهرية، هنحدّث تاريخ «آخر تحديث» فوق وهننبّه داخل رادار
        قبل ما التغيير يسري.
      </p>

      <h2>١٠. التواصل</h2>
      <p>
        لأي سؤال عن خصوصيتك أو بياناتك:{' '}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
      </p>

      <div className="callout">
        <strong>تنويه مهم:</strong> {disclaimer}
      </div>
    </LegalPage>
  );
}
