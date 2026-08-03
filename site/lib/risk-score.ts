/**
 * A faithful port of lib/core/calc/risk_score.dart.
 *
 * How well a trade was PREPARED, 0–100 in five 20-point components. This is
 * discipline, not outcome: a losing trade that followed every rule scores 100,
 * and a winning trade taken on a whim scores 20. That is the point — it
 * measures the process the journal exists to enforce.
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
  hasScreenshots: boolean;
  value: number;
  grade: RiskGrade;
};

/**
 * Minimum characters of reasoning for the component to count.
 *
 * The spec says "> 20 chars" — strictly greater, measured after trimming so
 * trailing whitespace cannot buy a point.
 */
export const MIN_REASON_LENGTH = 20;

export const SCORE_COMPONENTS: {
  key: keyof Omit<RiskScore, 'value' | 'grade'>;
  label: string;
}[] = [
  { key: 'checklistComplete', label: 'تشيك ليست مكتملة' },
  { key: 'riskWithinLimit', label: 'المخاطرة داخل الحد المسموح' },
  { key: 'hasStop', label: 'استوب محدد وتحت سعر الدخول' },
  { key: 'hasDetailedReason', label: 'سبب مكتوب ومفصّل' },
  { key: 'hasScreenshots', label: 'صورة من الشارت مرفقة' },
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
  const hasScreenshots = trade.screenshotPaths.length > 0;

  const value =
    (checklistComplete ? 20 : 0) +
    (riskWithinLimit ? 20 : 0) +
    (hasStop ? 20 : 0) +
    (hasDetailedReason ? 20 : 0) +
    (hasScreenshots ? 20 : 0);

  // Thresholds land on the 20-point grid the formula actually produces:
  // 100 ممتاز, 80 جيد, 60 متوسط, 40 and below ضعيف.
  const grade: RiskGrade =
    value >= 100 ? 'excellent' : value >= 80 ? 'good' : value >= 60 ? 'average' : 'poor';

  return {
    checklistComplete,
    riskWithinLimit,
    hasStop,
    hasDetailedReason,
    hasScreenshots,
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
