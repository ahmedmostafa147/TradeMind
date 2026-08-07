import Link from 'next/link';

import { disclaimer, site } from '@/lib/site';

/**
 * «تنويه» plus the three documents, for the signed-in surfaces.
 *
 * IT LIVES IN «الإعدادات», NOT UNDER EVERY TAB. It used to sit in the (app)
 * layout, so it was pinned below قرار اليوم, صفقاتي, السوق and the calculator
 * alike — on a phone that meant scrolling past a legal paragraph to reach the
 * end of an empty daily screen. The app keeps this material in الإعدادات, and
 * this follows it there.
 *
 * The sentence itself is unchanged and still stated outright, as RELEASE.md
 * requires — and it also still appears on every marketing page through
 * SiteFooter, which is the surface a Play reviewer reads.
 *
 * The links are repeated here rather than imported from SiteFooter for the
 * original reason: that footer is a sales page — tagline, install offer,
 * copyright — and a journal does not need any of it.
 */
const legalLinks = [
  { href: '/privacy', label: 'سياسة الخصوصية' },
  { href: '/terms', label: 'شروط الاستخدام' },
  { href: '/delete', label: 'حذف الحساب' },
];

export function LegalNotice() {
  return (
    <section className="rounded-lg border border-border-default bg-surface-low p-4 sm:p-5">
      <p className="max-w-3xl text-xs leading-relaxed text-fg-subtle">
        <strong className="font-semibold text-fg-muted">تنويه: </strong>
        {disclaimer}
      </p>

      <nav aria-label="روابط قانونية" className="mt-4">
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {legalLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-xs text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <a
              href={`mailto:${site.contactEmail}`}
              className="text-xs text-fg-muted underline-offset-4 transition-colors hover:text-fg hover:underline"
            >
              تواصل معنا
            </a>
          </li>
        </ul>
      </nav>
    </section>
  );
}
