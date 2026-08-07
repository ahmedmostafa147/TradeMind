import { useMemo, useState } from "react";
import {
  exceedsRiskLimit,
  maxLossPerTrade,
  parseNumber,
  roundToPiastre,
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
    const sRaw = parseNumber(stopVal);
    const tRaw = parseNumber(targetVal);

    /** Neither half of a level exists until BOTH the entry and it are typed. */
    const level = (raw: number | null, mode: InputMode, sign: 1 | -1) => {
      if (raw === null || raw <= 0 || e <= 0) return null;
      // Rounded like the app does, so the price shown back for a percentage is
      // the same number on both surfaces — see roundToPiastre's own comment.
      return mode === "price"
        ? roundToPiastre(raw)
        : roundToPiastre(e * (1 + (sign * raw) / 100));
    };

    const sPrice = level(sRaw, stopMode, -1);
    const tPrice = level(tRaw, targetMode, 1);

    // The counterpart of whatever was typed. Null unless the level is usable,
    // so an inverted stop shows its error rather than a negative percentage.
    const stopPct =
      sPrice === null || sPrice >= e ? null : safeDiv(e - sPrice, e);
    const targetPct =
      tPrice === null || tPrice <= e ? null : safeDiv(tPrice - e, e);

    const empty = {
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
      sPrice,
      tPrice,
      stopPct,
      targetPct,
    };

    if (e <= 0 || c <= 0) return empty;

    // An empty stop is not an inverted one. Written as `sPrice >= e` against a
    // stop that defaulted to the entry price, the warning fired on a blank
    // field the moment an entry price was typed.
    const invStop = sPrice !== null && sPrice >= e;
    const riskPerShare = sPrice === null ? null : e - sPrice;

    if (riskPerShare === null || riskPerShare <= 0 || invStop) {
      return { ...empty, invStop };
    }

    const budget = maxLossPerTrade(c, maxRisk);
    const suggested = Math.floor(budget / riskPerShare);
    const typed = override === null ? null : parseNumber(override);
    const qty = typed !== null && typed >= 0 ? Math.floor(typed) : suggested;

    if (qty === 0) return { ...empty, suggested, qty: 0 };

    const riskEgp = riskPerShare * qty;
    const riskPct = safeDiv(riskEgp, c);
    const posVal = e * qty;
    const posPct = safeDiv(posVal, c);
    const reward = tPrice !== null && tPrice > e ? tPrice - e : null;

    return {
      suggested,
      qty,
      riskEgp,
      riskPct,
      posVal,
      posPct,
      profitEgp: reward === null ? null : reward * qty,
      rrRatio: reward === null ? null : safeDiv(reward, riskPerShare),
      over: riskPct !== null && exceedsRiskLimit(riskPct, maxRisk),
      invStop: false,
      sPrice,
      tPrice,
      stopPct,
      targetPct,
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
