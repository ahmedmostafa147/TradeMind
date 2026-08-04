import type { Metadata } from 'next';
import Link from 'next/link';

import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: 'مفيش اتصال',
  // Never in search results: it is a fallback shell, and an indexed «مفيش
  // اتصال» page competing with the real ones would be a self-inflicted wound.
  robots: { index: false, follow: false },
};

/**
 * What the service worker serves when a navigation fails and nothing for that
 * URL is in the cache.
 *
 * Deliberately outside the (marketing) group, so it does not pull in the header
 * and footer. It has to render from its own prerendered HTML alone — offline is
 * exactly the moment a missing JS chunk cannot be fetched — and the less this
 * page depends on, the more reliably it appears.
 */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16 text-center">
      <p className="text-sm font-semibold text-brand-ink">{site.name}</p>
      <h1 className="mt-3 text-2xl font-bold">مفيش اتصال بالإنترنت</h1>
      <p className="mt-4 text-sm leading-relaxed text-fg-muted">
        الصفحة دي محتاجة اتصال عشان تجيب صفقاتك من حسابك. أول ما النت يرجع،
        اضغط تحديث.
      </p>
      <p className="mt-2 text-sm leading-relaxed text-fg-subtle">
        الصفحات اللي فتحتها قبل كده هتفضل شغّالة من غير نت.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard/"
          className="rounded-md bg-brand px-6 py-3 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
        >
          جرّب تاني
        </Link>
        <Link
          href="/"
          className="rounded-md border border-border-strong px-6 py-3 text-sm font-semibold transition-colors hover:bg-surface-high"
        >
          الصفحة الرئيسية
        </Link>
      </div>
    </main>
  );
}
