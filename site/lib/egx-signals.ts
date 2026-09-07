/**
 * «إشارات» — the quantitative screen for one EGX session.
 *
 * MIRROR OF lib/features/market/models/egx_signals.dart. The documents are
 * written by the analysis notebook into `egxSignals/{YYYY-MM-DD}` and read by
 * both clients, so the two decoders must accept exactly the same shape. Change
 * a field name here and you have to change it there in the same commit.
 *
 * Both clients are read-only on this collection, and so is everything else:
 * firestore.rules denies every client write. The only writer holds a service
 * account, which bypasses rules.
 *
 * WHAT THE NUMBERS ARE, AND WHAT THEY ARE NOT
 * Every probability was MEASURED, not modelled. For each candidate the
 * notebook finds days in that stock's own history when it looked as it looks
 * now, drops overlapping cases so one move is never counted twice, then walks
 * each case forward and asks which came first — the target or the stop. A
 * `probability` of 34 means thirty-four of a hundred comparable past setups
 * reached the target before the stop, over the horizon. It is not a forecast,
 * and the UI must never render it as one.
 *
 * `probabilityLow`/`probabilityHigh` are the 95% Wilson interval, and they are
 * wide — often twenty points — because the sample has a hard ceiling: three
 * years of daily data, de-overlapped at a ten-session horizon, allows at most
 * seventy-two independent cases before any filtering. Rendering the point
 * estimate without the interval overstates what is known.
 *
 * PARSING IS SEPARATE FROM FETCHING, the same split market-flows.ts makes:
 * everything below is pure — a plain object in, typed data out, no network —
 * so it is testable without Firestore.
 */

export type MarketState = {
  score: number;
  environment: string;
  up: number;
  down: number;
  breadthPct: number;
  /** Total turnover, EGP. */
  totalValue: number;
  pctAboveEma50: number;
};

export type Candidate = {
  rank: number;
  symbol: string;
  name: string;
  industry: string;
  close: number;
  changePct: number;
  score: number;
  rsi: number;
  /** Enter only above this; below it the setup has not triggered. */
  entry: number;
  stop: number;
  stopPct: number;
  /** Where the stop came from — «EMA50», «قاع شهر». */
  stopBasis: string;
  target1: number;
  target1Pct: number;
  target1Basis: string;
  /**
   * True when reaching the first target means printing a new 52-week high —
   * materially harder than an interior level, and invisible unless said.
   */
  target1IsYearHigh: boolean;
  target2: number;
  target2Pct: number;
  riskReward: number;
  /**
   * Null when the stock's history holds too few comparable cases. Render that
   * as «غير كافٍ», never as zero: a missing measurement and a measured zero
   * are different claims.
   */
  probability: number | null;
  probabilityLow: number | null;
  probabilityHigh: number | null;
  /** How much of `probability` is available in the very first session. */
  probabilityTomorrow: number | null;
  /** Median sessions to target among the cases that reached it. */
  medianDays: number | null;
  expectedValue: number | null;
  /** Expectancy recomputed with the hit rate at the low end of the interval. */
  expectedValueLow: number | null;
  /** `expectedValueLow > 0` — whether the data can rule out a losing trade. */
  survivesStress: boolean;
  cases: number;
  /** A label for sample size, not for conviction. */
  confidence: string;
};

export type NextSession = {
  rank: number;
  symbol: string;
  name: string;
  close: number;
  target: number;
  targetPct: number;
  basis: string;
  stop: number;
  stopPct: number;
  riskReward: number;
  probability: number;
  probabilityLow: number;
  probabilityHigh: number;
  expectedValue: number;
  /**
   * After a round trip. On a one-session horizon the edge is measured in tenths
   * of a percent while commission is fixed, so this is the number that decides
   * — and it is usually negative.
   */
  expectedValueNet: number;
  paysCosts: boolean;
  cases: number;
};

export type InvestmentPick = {
  rank: number;
  symbol: string;
  name: string;
  industry: string;
  close: number;
  technicalGrade: number;
  /** Null when the company publishes nothing to grade. */
  fundamentalGrade: number | null;
  /**
   * Share of the fundamental checks that had data. A strong grade over three
   * fields is not a strong grade over ten — show this beside the grade.
   */
  fundamentalCoverage: number;
  fundamentalLabel: string;
  pe: number | null;
  roe: number | null;
  debtToEquity: number | null;
  dividendYield: number | null;
  upRate: number;
  medianReturn: number;
  /** The middle half of outcomes — the honest spread around the median. */
  p25: number;
  p75: number;
  /**
   * Worst dip endured DURING the holding period, before any recovery. The most
   * important number here: a return you sell out of halfway is not received.
   */
  medianDrawdown: number;
  worstDrawdown: number;
  cases: number;
  horizon: number;
  /** Consecutive runs on the list — recorded rather than asserted. */
  streak: number;
};

export type MoveStep = {
  pct: number;
  price: number;
  /** Share of sessions where the HIGH reached `pct` — needs a resting order. */
  touch: number;
  /** Share still above `pct` at the close; typically a half to a third. */
  closed: number;
  /** `touch` over the market-wide rate. 1x is the base rate, not a signal. */
  lift: number | null;
};

export type BigMove = {
  rank: number;
  symbol: string;
  name: string;
  industry: string;
  close: number;
  /**
   * This stock's own daily band. EGX is not one number — some names band at
   * 10% and others at 20% — so rungs above it are impossible in one session,
   * not merely rare, and the ladder stops there.
   */
  band: number;
  technicalGrade: number;
  fundamentalGrade: number | null;
  fundamentalCoverage: number;
  fundamentalLabel: string;
  steps: MoveStep[];
  cases: number;
};

export type Performance = {
  trades: number;
  days: number;
  hitRate: number;
  stopRate: number;
  averageReturn: number;
  medianReturn: number;
};

export type EgxSignals = {
  date: string;
  generatedAt: Date | null;
  /**
   * False means every price is the previous close — which the UI has to say
   * out loud, because an entry condition checked against a stale price is not
   * an entry condition.
   */
  marketOpen: boolean;
  market: MarketState;
  candidates: Candidate[];
  nextSession: NextSession[];
  investment: InvestmentPick[];
  bigMoves: BigMove[];
  /**
   * Realised results of previously published candidates. Null until enough
   * have resolved. This is the only honest scorecard the system has, and it
   * should be shown even when it is worse than the historical study suggested.
   */
  performance: Performance | null;
};

/**
 * Firestore hands back a JS number for both ints and doubles, but a
 * hand-written or half-migrated document can carry a string. Anything that is
 * not finite becomes null so a bad value cannot render as `NaN%`.
 */
function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const numOr = (value: unknown, fallback: number): number => num(value) ?? fallback;
const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

/** The notebook writes ISO strings; a Firestore Timestamp has `toDate()`. */
function toDate(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const maybe = value as { toDate?: () => Date } | null;
  if (maybe && typeof maybe.toDate === 'function') {
    try {
      return maybe.toDate();
    } catch {
      return null;
    }
  }
  return null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Decodes a list per record, dropping the ones that fail. One malformed row
 * must never empty a screen — the same rule the Dart decoder follows.
 */
function list<T>(raw: unknown, decode: (item: unknown) => T | null): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const item of raw) {
    const decoded = decode(item);
    if (decoded) out.push(decoded);
  }
  return out;
}

function parseMarket(raw: unknown): MarketState {
  const m = isRecord(raw) ? raw : {};
  return {
    score: numOr(m.score, 0),
    environment: str(m.environment),
    up: numOr(m.up, 0),
    down: numOr(m.down, 0),
    breadthPct: numOr(m.breadthPct, 0),
    totalValue: numOr(m.totalValue, 0),
    pctAboveEma50: numOr(m.pctAboveEma50, 0),
  };
}

export function parseCandidate(raw: unknown): Candidate | null {
  if (!isRecord(raw)) return null;
  const symbol = str(raw.symbol);
  const close = num(raw.close);
  if (!symbol || close === null) return null;
  return {
    rank: numOr(raw.rank, 0),
    symbol,
    name: str(raw.name, symbol),
    industry: str(raw.industry),
    close,
    changePct: numOr(raw.changePct, 0),
    score: numOr(raw.score, 0),
    rsi: numOr(raw.rsi, 0),
    entry: numOr(raw.entry, close),
    stop: numOr(raw.stop, 0),
    stopPct: numOr(raw.stopPct, 0),
    stopBasis: str(raw.stopBasis),
    target1: numOr(raw.target1, 0),
    target1Pct: numOr(raw.target1Pct, 0),
    target1Basis: str(raw.target1Basis),
    target1IsYearHigh: raw.target1IsYearHigh === true,
    target2: numOr(raw.target2, 0),
    target2Pct: numOr(raw.target2Pct, 0),
    riskReward: numOr(raw.riskReward, 0),
    probability: num(raw.probability),
    probabilityLow: num(raw.probabilityLow),
    probabilityHigh: num(raw.probabilityHigh),
    probabilityTomorrow: num(raw.probabilityTomorrow),
    medianDays: num(raw.medianDays),
    expectedValue: num(raw.expectedValue),
    expectedValueLow: num(raw.expectedValueLow),
    survivesStress: raw.survivesStress === true,
    cases: numOr(raw.cases, 0),
    confidence: str(raw.confidence),
  };
}

export function parseNextSession(raw: unknown): NextSession | null {
  if (!isRecord(raw)) return null;
  const symbol = str(raw.symbol);
  const close = num(raw.close);
  if (!symbol || close === null) return null;
  return {
    rank: numOr(raw.rank, 0),
    symbol,
    name: str(raw.name, symbol),
    close,
    target: numOr(raw.target, 0),
    targetPct: numOr(raw.targetPct, 0),
    basis: str(raw.basis),
    stop: numOr(raw.stop, 0),
    stopPct: numOr(raw.stopPct, 0),
    riskReward: numOr(raw.riskReward, 0),
    probability: numOr(raw.probability, 0),
    probabilityLow: numOr(raw.probabilityLow, 0),
    probabilityHigh: numOr(raw.probabilityHigh, 0),
    expectedValue: numOr(raw.expectedValue, 0),
    expectedValueNet: numOr(raw.expectedValueNet, 0),
    paysCosts: raw.paysCosts === true,
    cases: numOr(raw.cases, 0),
  };
}

export function parseInvestmentPick(raw: unknown): InvestmentPick | null {
  if (!isRecord(raw)) return null;
  const symbol = str(raw.symbol);
  const close = num(raw.close);
  if (!symbol || close === null) return null;
  return {
    rank: numOr(raw.rank, 0),
    symbol,
    name: str(raw.name, symbol),
    industry: str(raw.industry),
    close,
    technicalGrade: numOr(raw.technicalGrade, 0),
    fundamentalGrade: num(raw.fundamentalGrade),
    fundamentalCoverage: numOr(raw.fundamentalCoverage, 0),
    fundamentalLabel: str(raw.fundamentalLabel),
    pe: num(raw.pe),
    roe: num(raw.roe),
    debtToEquity: num(raw.debtToEquity),
    dividendYield: num(raw.dividendYield),
    upRate: numOr(raw.upRate, 0),
    medianReturn: numOr(raw.medianReturn, 0),
    p25: numOr(raw.p25, 0),
    p75: numOr(raw.p75, 0),
    medianDrawdown: numOr(raw.medianDrawdown, 0),
    worstDrawdown: numOr(raw.worstDrawdown, 0),
    cases: numOr(raw.cases, 0),
    horizon: numOr(raw.horizon, 60),
    streak: numOr(raw.streak, 1),
  };
}

export function parseMoveStep(raw: unknown): MoveStep | null {
  if (!isRecord(raw)) return null;
  const pct = num(raw.pct);
  if (pct === null) return null;
  return {
    pct,
    price: numOr(raw.price, 0),
    touch: numOr(raw.touch, 0),
    closed: numOr(raw.closed, 0),
    lift: num(raw.lift),
  };
}

export function parseBigMove(raw: unknown): BigMove | null {
  if (!isRecord(raw)) return null;
  const symbol = str(raw.symbol);
  const close = num(raw.close);
  if (!symbol || close === null) return null;
  return {
    rank: numOr(raw.rank, 0),
    symbol,
    name: str(raw.name, symbol),
    industry: str(raw.industry),
    close,
    band: numOr(raw.band, 0),
    technicalGrade: numOr(raw.technicalGrade, 0),
    fundamentalGrade: num(raw.fundamentalGrade),
    fundamentalCoverage: numOr(raw.fundamentalCoverage, 0),
    fundamentalLabel: str(raw.fundamentalLabel),
    steps: list(raw.steps, parseMoveStep),
    cases: numOr(raw.cases, 0),
  };
}

/**
 * Null until enough published candidates have resolved. Callers show
 * «لم يُقس بعد» rather than zeros — an unmeasured system and a system measured
 * at zero are not the same statement.
 */
export function parsePerformance(raw: unknown): Performance | null {
  if (!isRecord(raw)) return null;
  const trades = num(raw.trades);
  if (trades === null || trades <= 0) return null;
  return {
    trades,
    days: numOr(raw.days, 0),
    hitRate: numOr(raw.hitRate, 0),
    stopRate: numOr(raw.stopRate, 0),
    averageReturn: numOr(raw.averageReturn, 0),
    medianReturn: numOr(raw.medianReturn, 0),
  };
}

/**
 * Returns null only when the document has no usable session date — the one
 * field nothing downstream can work without. Every list decodes per record.
 */
export function parseEgxSignals(raw: unknown): EgxSignals | null {
  if (!isRecord(raw)) return null;
  const date = str(raw.date);
  if (!date) return null;
  return {
    date,
    generatedAt: toDate(raw.generatedAt),
    marketOpen: raw.marketOpen === true,
    market: parseMarket(raw.market),
    candidates: list(raw.candidates, parseCandidate),
    nextSession: list(raw.nextSession, parseNextSession),
    investment: list(raw.investment, parseInvestmentPick),
    bigMoves: list(raw.bigMoves, parseBigMove),
    performance: parsePerformance(raw.performance),
  };
}

/** True when the stock's history holds enough cases to quote a probability. */
export const hasProbability = (c: Candidate): boolean => c.probability !== null;
