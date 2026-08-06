import {
  extractArray,
  mapCandle,
  mapQuote,
} from '../src/market-data/providers/egx-api.provider';
import {
  parseCandles,
  parseChart,
} from '../src/market-data/providers/fallback.provider';
import {
  isMeaningfulChange,
  normalizeSymbol,
  Quote,
} from '../src/market-data/entities/quote.entity';
import { backoffDelay } from '../src/common/http';

describe('normalizeSymbol', () => {
  it('strips the exchange suffix and normalises case', () => {
    expect(normalizeSymbol(' comi.ca ')).toBe('COMI');
    expect(normalizeSymbol('COMI')).toBe('COMI');
    expect(normalizeSymbol('tmgh.EG')).toBe('TMGH');
  });

  it('leaves a symbol that merely contains those letters alone', () => {
    expect(normalizeSymbol('CAIRO')).toBe('CAIRO');
  });
});

describe('mapQuote', () => {
  it('reads the documented shape', () => {
    const quote = mapQuote(
      { symbol: 'COMI', price: 78.4, previousClose: 77.2, volume: 1000 },
      null,
      'egxapi',
    );
    expect(quote?.symbol).toBe('COMI');
    expect(quote?.price).toBe(78.4);
    expect(quote?.change).toBeCloseTo(1.2);
    expect(quote?.changePercent).toBeCloseTo(1.2 / 77.2);
  });

  it('accepts the aliases a real API is likely to use', () => {
    const quote = mapQuote(
      { ticker: 'TMGH', last: 44.1, prevClose: 43.0 },
      null,
      'egxapi',
    );
    expect(quote?.symbol).toBe('TMGH');
    expect(quote?.price).toBe(44.1);
  });

  it('unwraps an envelope', () => {
    const quote = mapQuote({ data: { symbol: 'SWDY', c: 12.3 } }, null, 'x');
    expect(quote?.price).toBe(12.3);
  });

  it('normalises a percentage into a fraction', () => {
    // Upstreams disagree about units; the rest of the system must never have
    // to ask which one it got.
    const asPercent = mapQuote(
      { symbol: 'A', price: 10, changePercent: 4.14 },
      null,
      'x',
    );
    expect(asPercent?.changePercent).toBeCloseTo(0.0414);

    const asFraction = mapQuote(
      { symbol: 'A', price: 10, changePercent: 0.0414 },
      null,
      'x',
    );
    expect(asFraction?.changePercent).toBeCloseTo(0.0414);
  });

  it('parses a price sent as a string with separators', () => {
    const quote = mapQuote({ symbol: 'A', price: '1,234.5' }, null, 'x');
    expect(quote?.price).toBe(1234.5);
  });

  it('refuses a zero or negative price instead of passing it on', () => {
    // A 0 becomes a 100% loss on somebody's position — the single most
    // expensive way for this service to be wrong.
    expect(mapQuote({ symbol: 'A', price: 0 }, null, 'x')).toBeNull();
    expect(mapQuote({ symbol: 'A', price: -3 }, null, 'x')).toBeNull();
  });

  it('refuses a row with no price at all', () => {
    expect(mapQuote({ symbol: 'A' }, null, 'x')).toBeNull();
  });

  it('falls back to the requested symbol when the row omits one', () => {
    const quote = mapQuote({ price: 10 }, 'COMI', 'x');
    expect(quote?.symbol).toBe('COMI');
  });

  it('reads seconds and milliseconds epochs alike', () => {
    const seconds = mapQuote(
      { symbol: 'A', price: 10, timestamp: 1_780_000_000 },
      null,
      'x',
    );
    const millis = mapQuote(
      { symbol: 'A', price: 10, timestamp: 1_780_000_000_000 },
      null,
      'x',
    );
    expect(seconds?.asOf.getTime()).toBe(millis?.asOf.getTime());
  });
});

describe('extractArray', () => {
  it('unwraps the common envelopes and a bare array', () => {
    expect(extractArray([1, 2])).toEqual([1, 2]);
    expect(extractArray({ data: [1] })).toEqual([1]);
    expect(extractArray({ quotes: [2] })).toEqual([2]);
    expect(extractArray({ nothing: 1 })).toEqual([]);
    expect(extractArray(null)).toEqual([]);
  });
});

describe('mapCandle', () => {
  it('needs a close and a date, and refuses anything else', () => {
    expect(mapCandle({ close: 10, date: '2026-08-01' })?.close).toBe(10);
    expect(mapCandle({ close: 0, date: '2026-08-01' })).toBeNull();
    expect(mapCandle({ close: 10 })).toBeNull();
  });
});

// ---------------------------------------------------------------------------

const chart = (closes: (number | null)[], stamps: number[]) => ({
  chart: {
    result: [
      {
        timestamp: stamps,
        indicators: { quote: [{ close: closes, volume: closes.map(() => 100) }] },
      },
    ],
  },
});

describe('fallback chart parsing', () => {
  it('takes the last two real closes and derives the change', () => {
    const quote = parseChart(chart([40, 42], [1, 2]), 'ORHD', 'fallback');
    expect(quote?.price).toBe(42);
    expect(quote?.previousClose).toBe(40);
    expect(quote?.change).toBe(2);
    expect(quote?.changePercent).toBeCloseTo(0.05);
  });

  it('skips the trailing nulls the feed pads sessions with', () => {
    // Reading the last element blindly yields no price on any day the exchange
    // has not printed yet.
    const quote = parseChart(chart([40, 42, null], [1, 2, 3]), 'A', 'f');
    expect(quote?.price).toBe(42);
    expect(quote?.asOf.getTime()).toBe(2000);
  });

  it('still answers with a single session, and says the change is unknown', () => {
    const quote = parseChart(chart([40], [1]), 'A', 'f');
    expect(quote?.price).toBe(40);
    expect(quote?.previousClose).toBeNull();
    expect(quote?.change).toBeNull();
  });

  it('returns null rather than zero when nothing has traded', () => {
    expect(parseChart(chart([null, null], [1, 2]), 'A', 'f')).toBeNull();
    expect(parseChart({}, 'A', 'f')).toBeNull();
  });

  it('does not divide by a zero previous close', () => {
    const quote = parseChart(chart([0, 42], [1, 2]), 'A', 'f');
    // The 0 is not a usable close, so it is skipped entirely — there is simply
    // no previous session.
    expect(quote?.changePercent).toBeNull();
  });

  it('reads candles oldest first', () => {
    const candles = parseCandles(chart([40, 41, 42], [1, 2, 3]));
    expect(candles.map((c) => c.close)).toEqual([40, 41, 42]);
  });
});

describe('isMeaningfulChange', () => {
  const base: Quote = {
    symbol: 'COMI',
    price: 78.4,
    previousClose: null,
    change: null,
    changePercent: null,
    volume: null,
    asOf: new Date('2026-08-06T12:00:00Z'),
    source: 'x',
    stale: false,
  };

  it('is true the first time', () => {
    expect(isMeaningfulChange(undefined, base)).toBe(true);
  });

  it('is false for an identical repeat — the poller returns these all day', () => {
    expect(isMeaningfulChange(base, { ...base })).toBe(false);
  });

  it('is true when the price moves', () => {
    expect(isMeaningfulChange(base, { ...base, price: 78.5 })).toBe(true);
  });

  it('is true on a re-print at the same price', () => {
    expect(
      isMeaningfulChange(base, {
        ...base,
        asOf: new Date('2026-08-06T12:00:01Z'),
      }),
    ).toBe(true);
  });
});

describe('backoffDelay', () => {
  it('grows with each attempt', () => {
    const first = backoffDelay(0, 100);
    const third = backoffDelay(2, 100);
    expect(third).toBeGreaterThan(first);
  });

  it('is jittered, so a fleet does not retry in lockstep', () => {
    const samples = new Set(
      Array.from({ length: 40 }, () => backoffDelay(3, 100)),
    );
    expect(samples.size).toBeGreaterThan(1);
  });

  it('never returns less than half the deterministic delay', () => {
    for (let i = 0; i < 50; i += 1) {
      expect(backoffDelay(2, 100)).toBeGreaterThanOrEqual(200);
    }
  });
});
