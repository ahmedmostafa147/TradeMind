import type { Metadata } from 'next';

import { LegalPage } from '@/components/legal-page';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'حذف الحساب والبيانات',
  description:
    'إزاي تمسح حساب رادار وكل البيانات المرتبطة بيه — من داخل التطبيق أو بطلب عن طريق البريد.',
  alternates: { canonical: '/delete' },
};

/**
 * Google Play requires a publicly reachable account-deletion URL for any app
 * that lets users create an account, and it must be reachable WITHOUT
 * installing the app or signing in. The privacy policy already promised this
 * page existed; until now it did not.
 *
 * The site has no backend of its own, so the web route is a prepared mailto
 * rather than a form. That is a deliberate trade: a form would need somewhere
 * to receive it, and a form that silently drops requests is worse than an email
 * that visibly opens.
 */
const subject = 'طلب حذف حساب رادار';
const body = [
  'أرجو حذف حسابي وكل البيانات المرتبطة بيه في رادار.',
  '',
  'البريد المسجّل بالحساب: (اكتبه هنا لو مختلف عن اللي باعت الرسالة)',
].join('\n');

const mailto = `mailto:${site.contactEmail}?subject=${encodeURIComponent(
  subject
)}&body=${encodeURIComponent(body)}`;

export default function DeleteAccountPage() {
  return (
    <LegalPage title="حذف الحساب والبيانات">
      <p>
        تقدر تمسح حسابك في {site.name} وكل البيانات المرتبطة بيه في أي وقت.
        {site.playStoreUrl
          ? ' فيه طريقتين، والأولى أسرع وفورية.'
          : ' فيه طريقتين، وواحدة بس منهم متاحة دلوقتي.'}
      </p>

      {/* Reads the same flag every download call-to-action reads, so this page
          corrects itself the moment the listing goes live instead of needing to
          be remembered.

          WHY IT MATTERS HERE MORE THAN ANYWHERE ELSE. This page is a Play
          requirement and it must be accurate for the people reading it now —
          and right now that is web users only, for whom the "fast, instant"
          route is the one route that does not exist. Sending them to a settings
          tab inside an app they cannot install is the worst possible answer to
          "how do I delete my data". */}
      {!site.playStoreUrl && (
        <div className="callout">
          <strong>دلوقتي:</strong> تطبيق الأندرويد لسه مانزلش على Google Play،
          فلو حسابك اتعمل من الموقع الطريقة المتاحة ليك هي{' '}
          <strong>الطلب بالبريد</strong> اللي تحت. الطريقة اللي جوه التطبيق
          هتشتغل أول ما التطبيق ينزل.
        </div>
      )}

      <h2>الطريقة الأولى — من داخل التطبيق (فورية)</h2>
      <ol className="!ps-0 space-y-3">
        {[
          'افتح التطبيق وسجّل دخول بالحساب اللي عايز تمسحه.',
          'روح على تبويب «الإعدادات».',
          'اختار «حذف الحساب نهائيًا» وأكّد.',
        ].map((step, index) => (
          <li key={step} className="flex gap-3">
            <span className="num grid size-6 shrink-0 place-items-center rounded-full border border-border-default text-xs font-bold text-fg">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <p>
        ده بيمسح حسابك وكل صفقاتك المحفوظة على السيرفر فورًا ونهائيًا، وبيخيّرك
        لو عايز تمسح كمان النسخة المحفوظة على تليفونك.
      </p>

      <h2>الطريقة التانية — بطلب عن طريق البريد</h2>
      <p>
        لو مش قادر توصل للتطبيق — مسحته، أو غيّرت التليفون — ابعتلنا من{' '}
        <strong>نفس البريد المسجّل بالحساب</strong>:
      </p>

      <p>
        <a
          href={mailto}
          className="!no-underline inline-flex items-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold !text-on-brand transition-colors hover:opacity-90"
        >
          افتح رسالة طلب الحذف
        </a>
      </p>

      <p>
        أو ابعت يدويًا على{' '}
        <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a> بعنوان
        «{subject}». بنرد وبننفّذ خلال <span className="num">٣٠</span> يوم كحد
        أقصى.
      </p>

      <h2>إيه اللي بيتمسح بالظبط</h2>
      <ul>
        <li>
          <strong>بيتمسح نهائيًا:</strong> حساب الدخول (البريد والاسم المعروض)،
          وكل الصفقات وقوائم المراقبة المحفوظة على السيرفر تحت حسابك.
        </li>
        <li>
          <strong>مبيتمسحش تلقائيًا:</strong> النسخة الموجودة على جهازك انت. دي
          بتتمسح لما تمسح التطبيق، أو تختار مسحها وقت حذف الحساب.
        </li>
      </ul>
      <p>
        البيانات بتختفي من قاعدة البيانات على طول، ومن النسخ الاحتياطية
        التشغيلية خلال <span className="num">٣٠</span> يوم. مفيش مدة احتفاظ بعد
        كده.
      </p>

      {/* «صدّره» used to lead this sentence, and there is no export — not in
          the app, not on the web, nowhere in the repo. Telling somebody to use
          a feature that does not exist, in the last line before an irreversible
          action, is the one place a hopeful verb costs real data. */}
      <div className="callout">
        <strong>تنبيه:</strong> حذف الحساب لا يمكن التراجع عنه، ولسه مفيش خاصية
        تصدير. لو عايز تحتفظ بسجل صفقاتك، خد لقطات شاشة أو انقل الأرقام المهمة
        بنفسك قبل ما تمسح.
      </div>
    </LegalPage>
  );
}
