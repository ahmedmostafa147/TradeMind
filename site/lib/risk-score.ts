/**
 * A faithful port of lib/core/calc/risk_score.dart.
 *
 * How well a trade was PREPARED, 0–100 in four 25-point components. This is
 * discipline, not outcome: a losing trade that followed every rule scores 100,
 * and a winning trade taken on a whim scores 25. That is the point — it
 * measures the process the journal exists to enforce.
 *
 * IT WAS FIVE COMPONENTS OF 20 AND THE FIFTH WAS UNREACHABLE FROM HERE. See the
 * long note on the Dart original for why «صورة من الشارت مرفقة» is gone: it
 * could only be earned on the phone, so every trade logged in this browser was
 * capped at 80 with no way to raise it, and both surfaces had grown a paragraph
 * apologising for the fact.
 */

import { isChecklistComplete } from '@/lib/checklist';
import { exceedsRiskLimit, safeDiv } from '@/lib/risk-math';
import type { Trade } from '@/lib/trade';

export type RiskGrade = 'excellent' | 'good' | 'average' | 'poor';

export const GRADE_LABELS: Record<RiskGrade, string> = {
  excellent: 'ممتاز',
  good: 'جيد',
  average: 'متوسط',
  poor: 'ضعيف',
};

export type RiskScore = {
  checklistComplete: boolean;
  riskWithinLimit: boolean;
  hasStop: boolean;
  hasDetailedReason: boolean;
  value: number;
  grade: RiskGrade;
};

/**
 * Minimum characters of reasoning for the component to count.
 *
 * The spec says "> 20 chars" — strictly greater, measured after trimming so
 * trailing whitespace cannot buy a point. UNRELATED to POINTS_EACH below, which
 * happened to be the same number until it became 25.
 */
export const MIN_REASON_LENGTH = 20;

/** Points per earned component. Four of them, so a full score is 100. */
export const POINTS_EACH = 25;

export const SCORE_COMPONENTS: {
  key: keyof Omit<RiskScore, 'value' | 'grade'>;
  label: string;
}[] = [
  { key: 'checklistComplete', label: 'تشيك ليست مكتملة' },
  { key: 'riskWithinLimit', label: 'المخاطرة داخل الحد المسموح' },
  { key: 'hasStop', label: 'استوب محدد وتحت سعر الدخول' },
  { key: 'hasDetailedReason', label: 'سبب مكتوب ومفصّل' },
];

export function riskScoreOf(
  trade: Trade,
  capital: number,
  maxRiskPercent: number
): RiskScore {
  const riskEgp = (trade.entryPrice - trade.stopPrice) * trade.quantity;
  const riskPct = safeDiv(riskEgp, capital);

  const checklistComplete = isChecklistComplete(trade.completedChecklistItems);

  // NOT `riskPct <= maxRiskPercent`. Writing the spec's "risk <= limit"
  // literally reintroduces the float bug both epsilons exist to fix: a position
  // sized at precisely the limit by the app's own calculator computes a ratio a
  // few ulps above it, and would silently lose 20 points. exceedsRiskLimit is
  // the single guarded comparison, so this is its negation.
  // A null ratio means capital is unusable — unverifiable, so no credit.
  const riskWithinLimit =
    riskPct !== null && !exceedsRiskLimit(riskPct, maxRiskPercent);

  const hasStop = trade.stopPrice > 0 && trade.stopPrice < trade.entryPrice;
  const hasDetailedReason = trade.reason.trim().length > MIN_REASON_LENGTH;

  const value =
    (checklistComplete ? POINTS_EACH : 0) +
    (riskWithinLimit ? POINTS_EACH : 0) +
    (hasStop ? POINTS_EACH : 0) +
    (hasDetailedReason ? POINTS_EACH : 0);

  // Thresholds land on the 25-point grid the formula actually produces:
  // 100 ممتاز, 75 جيد, 50 متوسط, 25 and below ضعيف.
  const grade: RiskGrade =
    value >= 100 ? 'excellent' : value >= 75 ? 'good' : value >= 50 ? 'average' : 'poor';

  return {
    checklistComplete,
    riskWithinLimit,
    hasStop,
    hasDetailedReason,
    value,
    grade,
  };
}

/**
 * Mean discipline score across the trades that have one, or null.
 *
 * Null rather than 0 for an empty journal, for the same reason every other
 * aggregate here is: a zero would read as "you scored zero".
 */
export function averageRiskScore(
  trades: Trade[],
  capital: number,
  maxRiskPercent: number
): number | null {
  if (trades.length === 0) return null;
  const total = trades.reduce(
    (sum, t) => sum + riskScoreOf(t, capital, maxRiskPercent).value,
    0
  );
  return total / trades.length;
}
