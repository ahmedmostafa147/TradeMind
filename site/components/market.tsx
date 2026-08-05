import { SectionHeader } from '@/components/section-header';

/**
 * The half of the product the landing page did not mention at all.
 *
 * Until this section existed the page said «التطبيق» seventy-one times and
 * «السوق» zero — it sold a trade journal, which is the commodity half. Every
 * journal records what you did. What a visitor cannot get from a spreadsheet is
 * what the money did on the same day, and who was moving it.
 *
 * THE FIGURES BELOW ARE REAL AND ARE LABELLED AS AN EXAMPLE.
 * They come from an actual EGX session, which is why they add up: institutions
 * plus individuals equals the total, on every row, because that is how the
 * exchange reports it. Inventing plausible-looking numbers for a screenshot is
 * the easy version and the wrong one — a reader who checks would find them
 * impossible, and the whole claim here is that the numbers are real.
 */

type Row = { label: string; institutions: number; individuals: number };

/** Net position in EGP. Positive is a net buyer. */
const rows: Row[] = [
  { label: 'مصريين', institutions: 66_014_363, individuals: -16_512_837 },
  { label: 'عرب', institutions: 16_705_309, individuals: -5_207_323 },
  { label: 'أجانب', institutions: -34_943, individuals: -60_964_569 },
];

const millions = (value: number) => {
  const m = value / 1_000_000;
  const sign = m > 0 ? '+' : m < 0 ? '−' : '';
  return `${sign}${Math.abs(m).toFixed(1)}م`;
};

export function Market() {
  return (
    <section id="market" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
        <SectionHeader
          eyebrow="السوق"
          title="السعر بيقولك السهم راح فين. مش بيقولك مين وداه."
          lead="البورصة المصرية بتنشر كل جلسة مين اشترى ومين باع، مقسّمين حسب الجنسية وحسب النوع. مؤسسات أجنبية بتشتري وأفراد محليين بيبيعوا — ده سوق مختلف تمامًا عن العكس، عند نفس رقم المؤشر."
        />

        <div className="mx-auto mt-14 max-w-4xl">
          <div className="rounded-lg border border-border-default bg-surface-low p-5 sm:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-bold">صافي التعامل</p>
              <p className="text-xs text-fg-subtle">
                مثال من جلسة حقيقية · بالجنيه
              </p>
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[26rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border-default">
                    <th scope="col" className="py-2 text-start font-semibold">
                      &nbsp;
                    </th>
                    <th scope="col" className="py-2 text-start font-semibold">
                      مؤسسات
                    </th>
                    <th scope="col" className="py-2 text-start font-semibold">
                      أفراد
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-border-default last:border-0"
                    >
                      <th scope="row" className="py-3 text-start font-bold">
                        {row.label}
                      </th>
                      <Cell value={row.institutions} />
                      <Cell value={row.individuals} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-5 border-t border-border-default pt-4 text-sm leading-relaxed text-fg-muted">
              في الجلسة دي المؤسسات المصرية اشترت صافي{' '}
              <span className="num font-semibold text-fg">66</span> مليون، وفي
              نفس الوقت الأفراد الأجانب باعوا صافي{' '}
              <span className="num font-semibold text-fg">61</span> مليون. رقم
              المؤشر لوحده مكانش هيقولك ده.
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-fg-subtle">
            بتتحدّث كل جلسة، ومعاها تاريخ الجلسات السابقة عشان تشوف الاتجاه مش
            يوم واحد.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Win/loss colours, used here for the one reason the palette allows: this is
 * money with a direction. Green is net buying and red is net selling — not
 * "good" and "bad" — and the sign is printed too, so the meaning never rests on
 * colour alone.
 */
function Cell({ value }: { value: number }) {
  return (
    <td
      className={`num py-3 font-bold ${
        value > 0 ? 'text-win' : value < 0 ? 'text-loss' : ''
      }`}
    >
      {millions(value)}
    </td>
  );
}
