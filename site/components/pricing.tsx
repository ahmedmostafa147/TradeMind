"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon } from "@/components/icons";
import { SectionHeader } from "@/components/section-header";

type BillingPeriod = "monthly" | "semiAnnual" | "annual";

const plans: Record<
  BillingPeriod,
  { price: string; periodLabel: string; discount?: string }
> = {
  monthly: { price: "99", periodLabel: "شهرياً" },
  semiAnnual: { price: "499", periodLabel: "كل 6 أشهر", discount: "توفير 16%" },
  annual: {
    price: "799",
    periodLabel: "سنوياً (يعادل 66 ج.م/شهر)",
    discount: "توفير 33%",
  },
};

const proFeatures = [
  "أسعار لحظية متجددة لأسهم البورصة المصرية",
  "تتبّع سيولة صانع السوق (مؤسسات وأفراد)",
  "حاسبة إدارة المخاطرة وحاسبة الأهداف المالية",
  "تحليل وتتبع صفقاتك وتحديد نقاط الخروج والدخول",
  "قراءة التوصيات بالذكاء الاصطناعي (AI OCR)",
  "نسخة سحابية متزامنة على الهاتف والمستعرض",
];

export function Pricing() {
  const [period, setPeriod] = useState<BillingPeriod>("annual");

  return (
    <section
      id="pricing"
      className="border-b border-border-default scroll-mt-20"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
        <SectionHeader
          eyebrow="الاشتراكات والأسعار"
          title="ابدأ بتجربة مجانية 14 يوماً شاملة لكل المميزات"
          lead="احصل على وصول كامل لكافة الأدوات والأسعار اللحظية وسيولة صانع السوق مجاناً لمدة 14 يوماً عند التسجيل، اختر الباقة المناسبة لك لاحقاً."
        />

        {/* Duration Toggle */}
        <div className="mt-10 flex justify-center">
          <div className="flex rounded-xl border border-border-default bg-surface-high p-1 text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={`rounded-lg px-4 py-2 transition-all ${
                period === "monthly"
                  ? "bg-surface text-fg shadow-xs"
                  : "text-fg-muted"
              }`}
            >
              شهري (99 ج.م)
            </button>
            <button
              type="button"
              onClick={() => setPeriod("semiAnnual")}
              className={`rounded-lg px-4 py-2 transition-all ${
                period === "semiAnnual"
                  ? "bg-surface text-fg shadow-xs"
                  : "text-fg-muted"
              }`}
            >
              6 أشهر (499 ج.م)
            </button>
            <button
              type="button"
              onClick={() => setPeriod("annual")}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 transition-all ${
                period === "annual"
                  ? "bg-brand text-on-brand shadow-xs"
                  : "text-fg-muted"
              }`}
            >
              <span>سنوي (799 ج.م)</span>
              <span className="rounded bg-black/20 px-1.5 py-0.5 text-[10px]">
                الأفضل قيمة
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
          {/* Free Card */}
          <div className="flex flex-col justify-between rounded-xl border border-border-default bg-surface p-6 sm:p-8">
            <div>
              <span className="rounded-md bg-surface-high px-2.5 py-1 text-xs font-bold text-fg-subtle">
                Radar Free
              </span>
              <h3 className="mt-4 text-xl font-bold">الباقة المجانية</h3>
              <p className="mt-1 text-xs text-fg-muted">
                تغطية الأساسيات وحاسبة إدارة المخاطرة
              </p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="num text-5xl font-extrabold text-fg">0</span>
                <span className="text-sm font-bold text-fg-muted">
                  ج.م / للأبد
                </span>
              </div>
              <ul className="mt-6 space-y-3 border-t border-border-default pt-5 text-xs text-fg-muted">
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-fg" /> حاسبة حجم الصفقة
                  والمخاطرة
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-fg" /> حاسبة الأهداف
                  الماليّة المستقبلية
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="size-4 text-fg" /> تسجيل ومتابعة الصفقات
                  الأساسية
                </li>
              </ul>
            </div>
            <Link
              href="/dashboard#signup"
              className="mt-8 rounded-lg border border-border-strong py-3 text-center text-xs font-bold transition-colors hover:bg-surface-high"
            >
              ابدأ مجاناً الآن
            </Link>
          </div>

          {/* Pro Card */}
          <div className="relative flex flex-col justify-between rounded-xl border-2 border-brand bg-inverse-surface p-6 text-on-inverse-surface sm:p-8 shadow-lg">
            <div className="absolute -top-3.5 left-6 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-on-brand">
              🎉 14 يوماً تجربة مجانية بدون أية رسوم
            </div>
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-brand px-2.5 py-1 text-xs font-extrabold text-on-brand shadow-xs">
                  Radar Pro
                </span>
                {plans[period].discount && (
                  <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-extrabold text-on-brand shadow-xs">
                    {plans[period].discount}
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-xl font-bold">باقة رادار الاحترافية</h3>
              <p className="mt-1 text-xs opacity-80">
                وصول كامل لجميع الأدوات والأسعار اللحظية
              </p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="num text-5xl font-extrabold">
                  {plans[period].price}
                </span>
                <span className="text-sm font-bold opacity-80">
                  ج.م / {plans[period].periodLabel}
                </span>
              </div>
              <ul className="mt-6 space-y-2.5 border-t border-border-default/40 pt-5 text-xs">
                {proFeatures.map((feat) => (
                  <li key={feat} className="flex items-center gap-2">
                    <CheckIcon className="size-4 shrink-0 text-brand-ink" />{" "}
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
            <Link
              href="/dashboard#signup"
              className="mt-8 rounded-lg bg-brand py-3 text-center text-xs font-bold text-on-brand transition-opacity hover:opacity-90"
            >
              ابدأ تجربتك المجانية (14 يوماً)
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
