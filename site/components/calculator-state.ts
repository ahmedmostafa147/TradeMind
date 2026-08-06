import { useMemo, useState } from "react";
import {
  exceedsRiskLimit,
  maxLossPerTrade,
  parseNumber,
  safeDiv,
} from "@/lib/risk-math";

export type InputMode = "price" | "percent";

export function useCalculatorState({
  initialCapital,
  initialRisk,
  blankPrices = false,
}: {
  initialCapital?: number;
  initialRisk?: number;
  blankPrices?: boolean;
}) {
  const [capital, setCapital] = useState(
    initialCapital != null ? String(initialCapital) : "100000",
  );
  const [maxRisk, setMaxRisk] = useState(initialRisk ?? 0.02);
  const [entry, setEntry] = useState(blankPrices ? "" : "78.40");

  const [stopMode, setStopMode] = useState<InputMode>("price");
  const [stopVal, setStopVal] = useState(blankPrices ? "" : "74.50");

  const [targetMode, setTargetMode] = useState<InputMode>("price");
  const [targetVal, setTargetVal] = useState(blankPrices ? "" : "88.00");

  const [override, setOverride] = useState<string | null>(null);

  const res = useMemo(() => {
    const c = parseNumber(capital) ?? 0;
    const e = parseNumber(entry) ?? 0;
    const sRaw = parseNumber(stopVal) ?? 0;
    const tRaw = parseNumber(targetVal) ?? 0;

    if (e <= 0 || c <= 0) {
      return {
        suggested: null,
        qty: null,
        riskEgp: null,
        riskPct: null,
        posVal: null,
        posPct: null,
        profitEgp: null,
        rrRatio: null,
        over: false,
        invStop: false,
        sPrice: null,
        tPrice: null,
      };
    }

    // Determine effective stop price & target price
    const sPrice = stopMode === "percent" ? e * (1 - sRaw / 100) : sRaw;
    const tPrice = targetMode === "percent" ? e * (1 + tRaw / 100) : tRaw;

    const invStop = sPrice >= e && sPrice > 0;
    const riskPerShare = e - sPrice;

    if (riskPerShare <= 0 || invStop) {
      return {
        suggested: null,
        qty: null,
        riskEgp: null,
        riskPct: null,
        posVal: null,
        posPct: null,
        profitEgp: null,
        rrRatio: null,
        over: false,
        invStop,
        sPrice,
        tPrice,
      };
    }

    const budget = maxLossPerTrade(c, maxRisk);
    const suggested = Math.floor(budget / riskPerShare);
    const typed = override === null ? null : parseNumber(override);
    const qty = typed !== null && typed >= 0 ? Math.floor(typed) : suggested;

    if (qty === 0) {
      return {
        suggested,
        qty: 0,
        riskEgp: null,
        riskPct: null,
        posVal: null,
        posPct: null,
        profitEgp: null,
        rrRatio: null,
        over: false,
        invStop: false,
        sPrice,
        tPrice,
      };
    }

    const riskEgp = riskPerShare * qty;
    const riskPct = safeDiv(riskEgp, c);
    const posVal = e * qty;
    const posPct = safeDiv(posVal, c);
    const profitEgp = tPrice > e ? (tPrice - e) * qty : null;
    const rrRatio = tPrice > e ? safeDiv(tPrice - e, riskPerShare) : null;

    return {
      suggested,
      qty,
      riskEgp,
      riskPct,
      posVal,
      posPct,
      profitEgp,
      rrRatio,
      over: riskPct !== null && exceedsRiskLimit(riskPct, maxRisk),
      invStop: false,
      sPrice,
      tPrice,
    };
  }, [
    capital,
    maxRisk,
    entry,
    stopMode,
    stopVal,
    targetMode,
    targetVal,
    override,
  ]);

  const qtyVal =
    override ?? (res.suggested === null ? "" : String(res.suggested));

  return {
    capital,
    setCapital,
    maxRisk,
    setMaxRisk,
    entry,
    setEntry,
    stopMode,
    setStopMode,
    stopVal,
    setStopVal,
    targetMode,
    setTargetMode,
    targetVal,
    setTargetVal,
    setOverride,
    res,
    qtyVal,
  };
}
