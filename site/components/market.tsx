import { SectionHeader } from '@/components/section-header';

type InvestorGroup = {
  name: string;
  badge: string;
  institutions: { amount: string; isBuy: boolean };
  individuals: { amount: string; isBuy: boolean };
};

const groups: InvestorGroup[] = [
  {
    name: 'المستثمرون المصريون',
    badge: 'محلّي',
    institutions: { amount: '+66.0M ج.م', isBuy: true },
    individuals: { amount: '-16.5M ج.م', isBuy: false },
  },
  {
    name: 'المستثمرون العرب',
    badge: 'إقليمي',
    institutions: { amount: '+16.7M ج.م', isBuy: true },
    individuals: { amount: '-5.2M ج.م', isBuy: false },
  },
  {
    name: 'المستثمرون الأجانب',
    badge: 'دولي',
    institutions: { amount: '-34.9K ج.م', isBuy: false },
    individuals: { amount: '-61.0M ج.م', isBuy: false },
  },
];

export function Market() {
  return (
    <section id="market" className="border-b border-border-default scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <SectionHeader
          eyebrow="حركة السيولة"
          title="تتبّع اتجاه السيولة ومَن يحرّك السوق"
          lead="نوفر لك دليلاً كاملاً لمعرفة اتجاه السيولة، ومَن يحرّك السوق حالياً في البورصة المصرية، وإلى أين تتجه السيولة بين المؤسسات والأفراد في كل جلسة."
        />

        <div className="mx-auto mt-12 max-w-4xl">
          {/* Header Bar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
            <span className="text-xs font-semibold text-fg-subtle">
              صافي التعاملات حسب الفئة · البورصة المصرية
            </span>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-win">
                <span className="size-2 rounded-full bg-win" /> شراء (تجمُّع سيولة)
              </span>
              <span className="flex items-center gap-1.5 text-loss">
                <span className="size-2 rounded-full bg-loss" /> بيع (خروج سيولة)
              </span>
            </div>
          </div>

          {/* 3 Liquidity Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {groups.map((group) => (
              <div
                key={group.name}
                className="flex flex-col justify-between rounded-xl border border-border-default bg-surface-low p-5 transition-colors hover:border-border-strong"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-fg">{group.name}</h3>
                    <span className="rounded-md border border-border-default bg-surface-high px-2 py-0.5 text-[11px] text-fg-subtle">
                      {group.badge}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {/* Institutions */}
                    <div className="flex items-center justify-between rounded-lg bg-bg/60 px-3 py-2.5">
                      <span className="text-xs font-medium text-fg-muted">المؤسسات</span>
                      <span
                        dir="ltr"
                        className={`text-xs font-bold ${
                          group.institutions.isBuy ? 'text-win' : 'text-loss'
                        }`}
                      >
                        {group.institutions.amount}
                      </span>
                    </div>

                    {/* Individuals */}
                    <div className="flex items-center justify-between rounded-lg bg-bg/60 px-3 py-2.5">
                      <span className="text-xs font-medium text-fg-muted">الأفراد</span>
                      <span
                        dir="ltr"
                        className={`text-xs font-bold ${
                          group.individuals.isBuy ? 'text-win' : 'text-loss'
                        }`}
                      >
                        {group.individuals.amount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Key Insight Box */}
          <div className="mt-5 rounded-xl border border-border-default bg-surface-low p-4 text-center sm:p-5 sm:text-start">
            <p className="text-sm leading-relaxed text-fg-muted">
              💡 <span className="font-semibold text-fg">قراءة حركة السيولة:</span> في هذه الجلسة، قامت{' '}
              <span className="font-bold text-win">المؤسسات المصرية</span> بضخ سيولة شرائية بمبلغ{' '}
              <span dir="ltr" className="font-bold text-win">+66.0M</span>، بينما قام{' '}
              <span className="font-bold text-loss">الأفراد الأجانب</span> بالبيع بمبلغ{' '}
              <span dir="ltr" className="font-bold text-loss">-61.0M</span>. هذا التباين هو الكاشف الحقيقي لاتجاه السوق.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
