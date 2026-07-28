import { DownloadButton } from '@/components/download-button';
import { ArrowDownIcon, CheckIcon } from '@/components/icons';
import { TradeCardMock, type TradeMock } from '@/components/trade-card-mock';

/**
 * A closed winner, shown at the app's own default settings so the risk percent
 * on the card is the one a real user would see.
 *
 * Entry 78.40, stop 74.50, 300 shares → 1,170 EGP at risk on 100,000 capital,
 * which is 1.17%. Exited at 86.20 for +2,340, exactly 2.0R. The numbers are
 * derived by the card, not typed — this object only states the plan.
 */
const heroTrade: TradeMock = {
  ticker: 'COMI',
  entryDate: new Date(2026, 2, 5),
  entryPrice: 78.4,
  stopPrice: 74.5,
  takeProfitPrice: 88.0,
  quantity: 300,
  exitPrice: 86.2,
};

export function Hero() {
  return (
    <section className="border-b border-border-default">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
        <div>
          <p className="text-sm font-semibold text-brand-ink">
            دفتر صفقات البورصة المصرية
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            فاكر اشتريت السهم ده ليه؟
          </h1>

          <p className="mt-6 max-w-xl text-lg text-fg-muted">
            أغلب الخسائر مش سببها صفقة وحشة، سببها إنك مش فاكر ليه دخلت أصلًا.
            TradePilot بيخلّي لكل صفقة سبب مكتوب، وحجم محسوب قبل ما تشتري، وسجل
            ترجعله بعد شهور تعرف منه غلطت فين — وتبطّل تكرّر نفس الغلطة.
          </p>

          {/* The anchor leads, not the store button. Until the listing is live
              the only thing here that actually does something is this link, and
              the filled brand treatment belongs to whatever works. Once
              site.playStoreUrl is set, DownloadButton becomes the filled brand
              button and this should drop back to the outline style. */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#tools"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
            >
              شوف الاتنعشر أداة
              <ArrowDownIcon className="size-4" />
            </a>
            <a
              href="#why"
              className="inline-flex items-center justify-center rounded-md border border-border-strong px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-high"
            >
              المشكلة اللي بيحلّها
            </a>
            <DownloadButton />
          </div>

          <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fg-muted">
            {['شغّال من غير حساب', 'بياناتك على جهازك', 'مجاني بالكامل'].map(
              (item) => (
                <li key={item} className="flex items-center gap-1.5">
                  {/* Brand, not win-green. These are product claims, not a
                      profitable trade, and green here would spend the one
                      colour the data surfaces reserve for money. */}
                  <span className="text-brand-ink">
                    <CheckIcon className="size-3.5 shrink-0" />
                  </span>
                  {item}
                </li>
              )
            )}
          </ul>
        </div>

        {/* Decorative in the accessibility sense: the card repeats information
            the surrounding copy already carries, and reading five derived
            figures aloud would be noise rather than content. */}
        <div className="relative" aria-hidden>
          <TradeCardMock trade={heroTrade} capital={100000} maxRiskPercent={0.02} />
          <p className="mt-3 text-center text-xs text-fg-subtle">
            صف صفقة حقيقي من التطبيق — الأرقام كلها محسوبة من الخطة نفسها
          </p>
        </div>
      </div>
    </section>
  );
}
