/**
 * Shell for the signed-in surfaces.
 *
 * NO HEADER. There used to be one — wordmark, install offer, theme toggle, and
 * the standalone back control — and it sat directly on top of the dashboard's
 * own header, which already carries the page title, the account and the
 * actions. Two stacked bars on a phone is most of the first screen spent
 * saying the app's name twice.
 *
 * The controls did not go away, they moved INTO the dashboard header where
 * they belong beside the other actions. Only the second bar is gone.
 *
 * AND NO FOOTER. The «تنويه» paragraph and the three legal links used to be
 * pinned here, which put them under every tab — قرار اليوم, صفقاتي, السوق, the
 * calculator — so an empty daily screen on a phone ended in a legal paragraph.
 * They live in «الإعدادات» now ([LegalNotice]), which is where the app keeps
 * them; the sentence is still stated outright on every marketing page through
 * SiteFooter.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
      >
        تخطَّ إلى المحتوى
      </a>

      <main id="main">{children}</main>
    </>
  );
}
