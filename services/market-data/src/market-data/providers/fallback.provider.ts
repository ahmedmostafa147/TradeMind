import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { fetchJson, UpstreamError } from '../../common/http';
import { Candle, normalizeSymbol, Quote } from '../entities/quote.entity';
import {
  MarketDataProvider,
  ProviderHealth,
} from '../interfaces/market-data-provider.interface';

/**
 * The second source, for when the primary is down.
 *
 * It ships pointed at Yahoo's unofficial chart endpoint, because that is a
 * source this project already reads and knows the shape of — so the failover
 * path is exercised from day one rather than being an untested branch waiting
 * for its first outage. Set FALLBACK_BASE_URL to swap in the scraper or an
 * internal API without touching anything above this file.
 *
 * TWO THINGS IT IS HONEST ABOUT:
 *   • It serves the LAST DAILY CLOSE, not a live tick. Every quote it produces
 *     carries the candle's own timestamp, so a consumer can see that for
 *     itself instead of being told a close is a trade.
 *   • It is unofficial and undocumented and may stop working without notice.
 *     That is precisely why it is second and not first.
 */
@Injectable()
export class FallbackProvider implements MarketDataProvider {
  readonly name = 'fallback';
  readonly priority = 2;
  readonly supportsStreaming = false;

  private readonly logger = new Logger(FallbackProvider.name);

  private consecutiveFailures = 0;
  private lastLatencyMs: number | null = null;
  private lastCheckedAt: Date | null = null;
  private lastError: string | null = null;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  private get baseUrl(): string {
    const configured = this.config.get<string>('fallback.baseUrl', '');
    return configured === ''
      ? 'https://query1.finance.yahoo.com/v8/finance/chart'
      : configured;
  }

  private get requestOptions() {
    return {
      timeoutMs: this.config.get<number>('requestTimeoutMs', 8_000),
      maxRetries: this.config.get<number>('maxRetries', 2),
      baseDelayMs: this.config.get<number>('retryBaseDelayMs', 250),
      headers: {
        // Without a browser agent this origin serves an interstitial rather
        // than JSON.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    };
  }

  async connect(): Promise<void> {
    // Stateless HTTP. Nothing to hold open.
  }

  async disconnect(): Promise<void> {
    // Nothing to close.
  }

  async getPrice(symbol: string): Promise<Quote> {
    const clean = normalizeSymbol(symbol);
    const body = await fetchJson<unknown>(
      `${this.baseUrl}/${encodeURIComponent(clean)}.CA?range=5d&interval=1d`,
      this.requestOptions,
    );
    const quote = parseChart(body, clean, this.name);
    if (quote === null) {
      this.recordFailure(new Error(`no candles for ${clean}`));
      throw new UpstreamError(`no usable quote for ${clean}`, undefined, false);
    }
    this.recordSuccess();
    return quote;
  }

  /**
   * Sequential, not Promise.all.
   *
   * This origin rate-limits, and a fan-out of thirty concurrent requests is the
   * fastest way to be blocked by the source you switched to BECAUSE the other
   * one was unavailable. One dead symbol is skipped rather than failing the
   * batch — the whole point of a fallback is partial service.
   */
  async getPrices(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];

    const quotes: Quote[] = [];
    let lastError: unknown;
    for (const symbol of symbols) {
      try {
        quotes.push(await this.getPrice(symbol));
      } catch (error) {
        lastError = error;
        this.logger.debug(
          `${this.name}: skipping ${symbol} — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    // Partial is a success — one dead symbol must not fail the batch. Zero out
    // of everything is not: swallowing that would report this provider as
    // healthy while it is returning nothing at all.
    if (quotes.length === 0) {
      throw lastError instanceof Error
        ? lastError
        : new Error(`${this.name}: no quotes for any of ${symbols.length} symbols`);
    }
    return quotes;
  }

  async getHistory(symbol: string, days: number): Promise<Candle[]> {
    const clean = normalizeSymbol(symbol);
    const range = days <= 5 ? '5d' : days <= 30 ? '1mo' : days <= 180 ? '6mo' : '1y';
    const body = await fetchJson<unknown>(
      `${this.baseUrl}/${encodeURIComponent(clean)}.CA?range=${range}&interval=1d`,
      this.requestOptions,
    );
    this.recordSuccess();
    return parseCandles(body).slice(-days);
  }

  async subscribe(): Promise<void> {
    // Not a streaming source; the poller covers it.
  }

  async unsubscribe(): Promise<void> {
    // Nothing subscribed.
  }

  async health(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      // A real symbol, because an endpoint that answers for nonsense tells us
      // nothing about whether it answers for the data we need.
      await this.getPrice('COMI');
      this.lastLatencyMs = Date.now() - started;
      this.recordSuccess();
    } catch (error) {
      this.lastLatencyMs = Date.now() - started;
      this.recordFailure(error);
    }
    this.lastCheckedAt = new Date();
    return {
      name: this.name,
      healthy: this.consecutiveFailures === 0,
      latencyMs: this.lastLatencyMs,
      consecutiveFailures: this.consecutiveFailures,
      lastCheckedAt: this.lastCheckedAt,
      lastError: this.lastError,
    };
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.lastError = null;
  }

  private recordFailure(error: unknown): void {
    this.consecutiveFailures += 1;
    this.lastError = error instanceof Error ? error.message : String(error);
  }
}

// ---------------------------------------------------------------------------

interface ChartSeries {
  closes: (number | null)[];
  timestamps: number[];
  volumes: (number | null)[];
}

function series(body: unknown): ChartSeries | null {
  if (typeof body !== 'object' || body === null) return null;
  const chart = (body as Record<string, unknown>).chart;
  if (typeof chart !== 'object' || chart === null) return null;
  const results = (chart as Record<string, unknown>).result;
  if (!Array.isArray(results) || results.length === 0) return null;

  const first = results[0] as Record<string, unknown>;
  const timestamps = first.timestamp;
  const indicators = first.indicators as Record<string, unknown> | undefined;
  const blocks = indicators?.quote;
  if (!Array.isArray(timestamps) || !Array.isArray(blocks)) return null;

  const block = blocks[0] as Record<string, unknown> | undefined;
  const closes = block?.close;
  if (!Array.isArray(closes)) return null;

  return {
    closes: closes as (number | null)[],
    timestamps: timestamps as number[],
    volumes: Array.isArray(block?.volume)
      ? (block.volume as (number | null)[])
      : [],
  };
}

/**
 * The last two REAL closes.
 *
 * The series is padded with nulls for sessions that have not printed, so the
 * final element is routinely null — reading it blindly yields no price on any
 * day the exchange has not yet traded.
 */
export function parseChart(
  body: unknown,
  symbol: string,
  source: string,
): Quote | null {
  const data = series(body);
  if (data === null) return null;

  const usable: { close: number; at: number; volume: number | null }[] = [];
  for (let i = data.closes.length - 1; i >= 0; i -= 1) {
    const close = data.closes[i];
    const at = data.timestamps[i];
    if (typeof close !== 'number' || !Number.isFinite(close) || close <= 0) {
      continue;
    }
    if (typeof at !== 'number' || !Number.isFinite(at)) continue;
    const volume = data.volumes[i];
    usable.push({
      close,
      at,
      volume: typeof volume === 'number' && Number.isFinite(volume) ? volume : null,
    });
    if (usable.length === 2) break;
  }
  if (usable.length === 0) return null;

  const [latest, previous] = usable;
  const previousClose = previous?.close ?? null;
  const change = previousClose === null ? null : latest.close - previousClose;
  const changePercent =
    change === null || previousClose === null || previousClose === 0
      ? null
      : change / previousClose;

  return {
    symbol: normalizeSymbol(symbol),
    price: latest.close,
    previousClose,
    change,
    changePercent,
    volume: latest.volume,
    asOf: new Date(latest.at * 1000),
    source,
    stale: false,
  };
}

export function parseCandles(body: unknown): Candle[] {
  const data = series(body);
  if (data === null) return [];

  const candles: Candle[] = [];
  for (let i = 0; i < data.closes.length; i += 1) {
    const close = data.closes[i];
    const at = data.timestamps[i];
    if (typeof close !== 'number' || !Number.isFinite(close) || close <= 0) {
      continue;
    }
    if (typeof at !== 'number' || !Number.isFinite(at)) continue;
    const volume = data.volumes[i];
    candles.push({
      date: new Date(at * 1000),
      open: null,
      high: null,
      low: null,
      close,
      volume:
        typeof volume === 'number' && Number.isFinite(volume) ? volume : null,
    });
  }
  return candles;
}
