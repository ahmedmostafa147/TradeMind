import { DownloadButton } from '@/components/download-button';

export function ClosingCta() {
  return (
    <section className="border-b border-border-default bg-surface-low">
      <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:py-24">
        <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          بعد سنة، مش هيفرق إنك فاكر صفقة أو اتنين.
        </h2>
        <p className="mt-5 text-lg text-fg-muted">
          اللي هيفرق إن عندك تاريخ كامل يوريك اتطورت إزاي. ابدأ تسجّل من
          النهاردة — الصفقة اللي مش هتسجّلها دلوقتي هي بالظبط اللي مش هتفتكرها
          بعد شهرين.
        </p>
        <div className="mt-8 flex justify-center">
          <DownloadButton />
        </div>
      </div>
    </section>
  );
}
