import Link from 'next/link';

import { DownloadButton } from '@/components/download-button';
import { CheckIcon } from '@/components/icons';
import { StockChart } from '@/components/stock-chart';
import { TradeCardMock, type TradeMock } from '@/components/trade-card-mock';

/** Declared here so the chart takes a plain number rather than the card's nullable field. */
const heroTakeProfit = 88.0;

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
  takeProfitPrice: heroTakeProfit,
  quantity: 300,
  exitPrice: 86.2,
};

/**
 * The closes behind the chart. Index 3 is the entry and index 17 the exit, so
 * both markers land on the trade's own prices rather than near them.
 *
 * The dip at index 5 (75.90) matters: it is the trade going against the
 * position without touching the stop at 74.50, which is the entire reason a
 * stop is placed before the entry instead of decided in the moment.
 */
const closes = [
  76.1, 75.4, 76.8, 78.4, 77.2, 75.9, 76.6, 78.1, 79.5, 80.2, 79.1, 81.4, 82.9,
  82.1, 83.6, 85.0, 84.4, 86.2,
];

const promises = ['مجاني بالكامل', 'بياناتك محفوظة ليك', 'من غير إعلانات'];

export function Hero() {
  return (
    <section className="border-b border-border-default">
      <div className="mx-auto max-w-3xl px-5 pt-16 text-center lg:pt-24">
        <p className="text-sm font-semibold text-brand-ink">
          البورصة المصرية
        </p>

        {/* The two halves as one sentence, in the owner's own words.
            The headline used to be «فاكر اشتريت السهم ده ليه؟» — a good line,
            and still the opening of the journal section below, but it sold only
            the half that every trade journal sells. What a visitor cannot get
            elsewhere is the market half, and it was nowhere on this page. */}
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          السوق ماشي فين، ودفترك ماشي فين.
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-fg-muted">
          كل جلسة، رادار بيوريك مين كان بيشتري ومين كان بيبيع فعلًا — مؤسسات ولا
          أفراد، مصريين ولا أجانب. وعلى الناحية التانية بيمسك دفترك: كل صفقة
          بسببها وحجمها المحسوب قبل ما تشتري، وأداءك رايح على فين.
        </p>

        {/* The two account actions lead, because they are the two things on
            this page that actually work today: the web journal is live and the
            Play listing is not. DownloadButton renders itself as «قريبًا» while
            site.playStoreUrl is null, so it sits third deliberately. */}
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard#signup"
            className="inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90"
          >
            ابدأ مجانًا
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-md border border-border-strong px-6 py-3 text-sm font-semibold transition-colors hover:bg-surface-high"
          >
            سجّل دخولك
          </Link>
          <DownloadButton />
        </div>

        {/* Says what the browser CAN do, not what it is "just as good as".
            The web dashboard writes now — customer-dashboard.tsx has saveTrade,
            the watchlist panel and the timeline editor — so "تابع دفترك" was
            underselling the only surface that actually works today. What it
            still cannot do is the three device-bound features (chart images,
            closing prices, reading a tip from an image), and the FAQ names them
            outright rather than letting someone discover the gap after signing
            up. Claiming full parity here would be the promise the build cannot
            keep; claiming read-only was the opposite mistake. */}
        <p className="mt-5 text-sm text-fg-muted">
          مش مستني التطبيق — الموقع شغّال دلوقتي: سجّل صفقاتك وحلّل أداءك من أي
          متصفح.
        </p>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-fg-muted">
          {promises.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              {/* Brand, not win-green. These are product claims, not a
                  profitable trade, and green here would spend the one colour
                  the data surfaces reserve for money. */}
              <span className="text-brand-ink">
                <CheckIcon className="size-3.5 shrink-0" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* One framed block, not two floating visuals: the chart and the row
          below it are the same trade, and separating them into sibling cards
          would ask the reader to work out that they belong together. */}
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-14 lg:pb-24">
        <div className="rounded-lg border border-border-default bg-surface-low p-5 sm:p-7">
          <StockChart
            ticker={heroTrade.ticker}
            closes={closes}
            entryIndex={3}
            exitIndex={17}
            entryPrice={heroTrade.entryPrice}
            stopPrice={heroTrade.stopPrice}
            takeProfitPrice={heroTakeProfit}
          />

          <div className="mt-7 border-t border-border-default pt-7">
            <p className="mb-4 text-center text-xs font-semibold text-fg-muted">
              نفس الصفقة، زي ما بتتسجّل في رادار
            </p>
            {/* Decorative in the accessibility sense: the card repeats
                information the chart's own label already carries, and reading
                five derived figures aloud would be noise rather than content. */}
            <div className="mx-auto max-w-xl" aria-hidden>
              <TradeCardMock
                trade={heroTrade}
                capital={100000}
                maxRiskPercent={0.02}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
