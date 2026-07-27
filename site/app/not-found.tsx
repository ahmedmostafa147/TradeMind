import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة',
  // A 404 carries no content worth ranking, and indexing one competes with the
  // real pages for the same brand query.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-5 py-24 text-center lg:py-32">
      <p className="num text-sm font-bold text-fg-subtle">404</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        الصفحة دي مش موجودة
      </h1>
      <p className="mt-4 text-fg-muted">
        يمكن الرابط اتغيّر أو فيه حرف ناقص. جرّب ترجع للصفحة الرئيسية.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-colors hover:opacity-90"
      >
        الصفحة الرئيسية
      </Link>
    </div>
  );
}
