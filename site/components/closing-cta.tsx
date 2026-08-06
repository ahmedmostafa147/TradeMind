import Link from 'next/link';

import { DownloadButton } from '@/components/download-button';

/**
 * The page's last frame.
 *
 * It is the one place the inverse surface earns its keep: after eight sections
 * on the paper canvas, a charcoal block is a full stop. The hero used to be
 * followed by one too, which is why this one had no impact left to make — two
 * inversions twelve hundred pixels apart cancel each other out.
 *
 * The brand colour appears as a FILL on the button and nowhere else here.
 * `inverse-surface` flips with the theme — charcoal in light, cream in dark —
 * so lime ink inside it reads 1.01:1 for anyone on a dark device.
 */
export function ClosingCta() {
  return (
    <section className="border-b border-border-default">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-20">
        <div className="rounded-lg bg-inverse-surface px-6 py-16 text-center text-on-inverse-surface lg:px-16 lg:py-20">
          <h2 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            السوق بيسيب أثر كل يوم. وانت كمان.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed opacity-80">
            الفرق بعد سنة إن عندك الاتنين مكتوبين: مين كان بيشتري في كل جلسة،
            وانت كنت بتعمل إيه وقتها. ابدأ من النهاردة — الجلسة اللي مش هتشوفها
            دلوقتي والصفقة اللي مش هتسجّلها هما بالظبط اللي مش هتفتكرهم بعد
            شهرين.
          </p>

          {/* The page used to end on a chip that says «قريبًا» and does
              nothing — a closing call to action with nothing to call. The
              account actions work today, so they close it and the store button
              stays as the status note it is. */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/dashboard#signup"
              className="inline-flex items-center justify-center rounded-md bg-brand px-7 py-3.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
            >
              ابدأ تجربتك المجانية
            </Link>
            <DownloadButton variant="inverse" />
          </div>

          <p className="mt-6 text-xs opacity-60">
            14 يوم تجربة من غير بطاقة · دفتر مجاني للأبد · من غير إعلانات
          </p>
        </div>
      </div>
    </section>
  );
}
