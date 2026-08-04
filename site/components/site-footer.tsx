import Link from 'next/link';

import { disclaimer, site } from '@/lib/site';

const legalLinks = [
  { href: '/privacy', label: 'سياسة الخصوصية' },
  { href: '/terms', label: 'شروط الاستخدام' },
  { href: '/delete', label: 'حذف الحساب والبيانات' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border-default bg-surface-low">
      <div className="mx-auto max-w-6xl px-5 py-12">
        {/* The disclaimer leads the footer instead of sitting in the fine
            print. RELEASE.md requires it stated outright so Play does not file
            the app under its restricted financial categories, and burying it
            would defeat the reason it is here. */}
        <p className="max-w-3xl rounded-md border border-border-default bg-surface p-4 text-sm text-fg-muted">
          <strong className="font-semibold text-fg">تنويه: </strong>
          {disclaimer}
        </p>

        <div className="mt-8 flex flex-col gap-6 border-t border-border-default pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold">{site.name}</p>
            <p className="mt-1 text-sm text-fg-subtle">{site.tagline}</p>
          </div>

          <nav aria-label="روابط قانونية">
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href={`mailto:${site.contactEmail}`}
                  className="text-sm text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
                >
                  تواصل معنا
                </a>
              </li>
            </ul>
          </nav>
        </div>

        {/* The install instructions live here, in static text, rather than
            behind a button. `beforeinstallprompt` is a Chromium-only event —
            iOS Safari never fires it, and installing there is a Share-sheet
            item no website is allowed to open. A button that could not do
            anything for iPhone users would be worse than a sentence that
            tells them exactly which menu to tap. */}
        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-fg-subtle">
          <strong className="font-semibold text-fg-muted">
            تحب تثبّته كتطبيق؟{' '}
          </strong>
          على أندرويد وويندوز وماك هيظهرلك زرار «ثبّت التطبيق» فوق، أو أيقونة
          تثبيت في شريط عنوان المتصفح. على آيفون وآيباد: من Safari اضغط زرار
          المشاركة ← «أضف إلى الشاشة الرئيسية». في الحالتين بيفتح في نافذته
          لوحده، والصفحات اللي فتحتها قبل كده بتشتغل من غير نت.
        </p>

        <p className="mt-6 text-xs text-fg-subtle">
          © <span className="num">2026</span> {site.name} — جميع الحقوق محفوظة.
        </p>
      </div>
    </footer>
  );
}
