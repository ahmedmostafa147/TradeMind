import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';

import { fetchJson, UpstreamError } from '../../common/http';
import {
  Candle,
  normalizeSymbol,
  Quote,
} from '../entities/quote.entity';
import {
  MarketDataProvider,
  ProviderHealth,
} from '../interfaces/market-data-provider.interface';

/**
 * EGXAPI — the primary source.
 *
 * ⚠️ THE RESPONSE MAPPING BELOW IS UNVERIFIED. EGXAPI's documentation was not
 * reachable when this was written, so `mapQuote` and `mapCandle` encode the
 * shape their marketing describes (symbol, last price, previous close, volume,
 * timestamp) and nothing more. THEY ARE THE ONLY TWO FUNCTIONS THAT NEED
 * TOUCHING when the real schema is known — everything above this file talks in
 * `Quote`, which is exactly why the mapping is isolated into a pair of pure
 * functions with their own tests.
 *
 * Field names are read leniently (several plausible aliases per field) rather
 * than strictly, so a near-miss on the guess degrades to a missing optional
 * field instead of a hard failure on every request.
 */
@Injectable()
export class EgxApiProvider implements MarketDataProvider {
  readonly name = 'egxapi';
  readonly priority = 1;

  private readonly logger = new Logger(EgxApiProvider.name);

  private socket: WebSocket | null = null;
  private readonly subscribed = new Set<string>();
  private consecutiveFailures = 0;
  private lastLatencyMs: number | null = null;
  private lastCheckedAt: Date | null = null;
  private lastError: string | null = null;
  private reconnectAttempt = 0;
  private closing = false;

  onQuote?: (quote: Quote) => void;

  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  /** Only when a socket URL is configured — otherwise the poller pulls. */
  get supportsStreaming(): boolean {
    return this.baseWsUrl !== '';
  }

  private get baseUrl(): string {
    return this.config.get<string>('egx.baseUrl', '');
  }

  private get baseWsUrl(): string {
    return this.config.get<string>('egx.wsUrl', '');
  }

  private get headers(): Record<string, string> {
    const key = this.config.get<string>('egx.apiKey', '');
    return key === '' ? {} : { Authorization: `Bearer ${key}` };
  }

  private get requestOptions() {
    return {
      timeoutMs: this.config.get<number>('requestTimeoutMs', 8_000),
      maxRetries: this.config.get<number>('maxRetries', 2),
      baseDelayMs: this.config.get<number>('retryBaseDelayMs', 250),
      headers: this.headers,
    };
  }

  async connect(): Promise<void> {
    this.closing = false;
    if (!this.supportsStreaming) return;
    this.openSocket();
  }

  async disconnect(): Promise<void> {
    this.closing = true;
    this.socket?.close();
    this.socket = null;
  }

  async getPrice(symbol: string): Promise<Quote> {
    const clean = normalizeSymbol(symbol);
    const body = await fetchJson<unknown>(
      `${this.baseUrl}/v1/quotes/${encodeURIComponent(clean)}`,
      this.requestOptions,
    );
    const quote = mapQuote(body, clean, this.name);
    if (quote === null) {
      throw new UpstreamError(`no usable quote for ${clean}`, undefined, false);
    }
    this.recordSuccess();
    return quote;
  }

  async getPrices(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];
    const clean = symbols.map(normalizeSymbol);
    const body = await fetchJson<unknown>(
      `${this.baseUrl}/v1/quotes?symbols=${encodeURIComponent(clean.join(','))}`,
      this.requestOptions,
    );

    const rows = extractArray(body);
    const quotes: Quote[] = [];
    for (const row of rows) {
      // Absent rather than zero-filled: a symbol with no print today is a
      // symbol we have no price for, and saying so is the whole contract.
      const quote = mapQuote(row, null, this.name);
      if (quote !== null) quotes.push(quote);
    }

    this.recordSuccess();
    return quotes;
  }

  async getHistory(symbol: string, days: number): Promise<Candle[]> {
    const clean = normalizeSymbol(symbol);
    const body = await fetchJson<unknown>(
      `${this.baseUrl}/v1/bars/${encodeURIComponent(clean)}?days=${days}`,
      this.requestOptions,
    );
    const candles = extractArray(body)
      .map(mapCandle)
      .filter((c): c is Candle => c !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    this.recordSuccess();
    return candles;
  }

  async subscribe(symbol: string): Promise<void> {
    const clean = normalizeSymbol(symbol);
    this.subscribed.add(clean);
    this.send({ action: 'subscribe', symbols: [clean] });
  }

  async unsubscribe(symbol: string): Promise<void> {
    const clean = normalizeSymbol(symbol);
    this.subscribed.delete(clean);
    this.send({ action: 'unsubscribe', symbols: [clean] });
  }

  /** Never throws — see the interface. */
  async health(): Promise<ProviderHealth> {
    const started = Date.now();
    try {
      await fetchJson<unknown>(`${this.baseUrl}/v1/health`, {
        ...this.requestOptions,
        // A probe that retries is not a probe: it hides the very latency it
        // exists to measure, and three slow attempts read as one slow one.
        maxRetries: 0,
      });
      this.lastLatencyMs = Date.now() - started;
      this.recordSuccess();
    } catch (error) {
      this.lastLatencyMs = Date.now() - started;
      this.recordFailure(error);
    }
    this.lastCheckedAt = new Date();
    return this.snapshot();
  }

  private snapshot(): ProviderHealth {
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

  // -- streaming ----------------------------------------------------------

  private openSocket(): void {
    const url = this.baseWsUrl;
    if (url === '') return;

    const socket = new WebSocket(url, {
      headers: this.headers,
      handshakeTimeout: this.config.get<number>('requestTimeoutMs', 8_000),
    });
    this.socket = socket;

    socket.on('open', () => {
      this.reconnectAttempt = 0;
      this.logger.log(`${this.name}: socket open`);
      if (this.subscribed.size > 0) {
        // Re-subscribed on every open, not only the first: a reconnect that
        // does not restore its subscriptions is a socket that is up and
        // silent, which looks healthy and delivers nothing.
        this.send({ action: 'subscribe', symbols: [...this.subscribed] });
      }
    });

    socket.on('message', (raw) => {
      try {
        const quote = mapQuote(JSON.parse(raw.toString()), null, this.name);
        if (quote !== null) this.onQuote?.(quote);
      } catch {
        // A frame we cannot read is not a reason to drop the connection.
      }
    });

    socket.on('error', (error) => {
      this.recordFailure(error);
      this.logger.warn(`${this.name}: socket error — ${error.message}`);
    });

    socket.on('close', () => {
      this.socket = null;
      if (this.closing) return;
      const delay = Math.min(30_000, 500 * 2 ** this.reconnectAttempt);
      this.reconnectAttempt += 1;
      this.logger.warn(`${this.name}: socket closed, retrying in ${delay}ms`);
      setTimeout(() => this.openSocket(), delay).unref?.();
    });
  }

  private send(payload: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
    }
  }
}

// ---------------------------------------------------------------------------
// Mapping — the unverified part, kept pure so it can be tested and replaced.
// ---------------------------------------------------------------------------

/** Unwraps `{data: [...]}`, `{quotes: [...]}` and a bare array alike. */
export function extractArray(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (typeof body !== 'object' || body === null) return [];
  for (const key of ['data', 'quotes', 'results', 'bars', 'items']) {
    const value = (body as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function pickNumber(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value.replace(/,/g, ''));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return null;
}

function pickDate(row: Record<string, unknown>, keys: string[]): Date | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      // Seconds or milliseconds — a 10-digit epoch is seconds until ~2286.
      return new Date(value < 1e11 ? value * 1000 : value);
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}

/**
 * One row into a Quote, or null when there is no usable price.
 *
 * NULL RATHER THAN A ZERO-PRICED PLACEHOLDER. A 0 flows into a position's
 * profit as a 100% loss, which is the single most expensive way for this
 * service to be wrong.
 */
export function mapQuote(
  body: unknown,
  fallbackSymbol: string | null,
  source: string,
): Quote | null {
  const rows = Array.isArray(body) ? body : [body];
  const first = rows[0];
  if (typeof first !== 'object' || first === null) return null;

  // A single-quote endpoint may wrap its payload; try the envelope's contents.
  const row = first as Record<string, unknown>;
  const inner = ['data', 'quote', 'result'].map((k) => row[k]).find(
    (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  );
  const source_ = (inner ?? row) as Record<string, unknown>;

  const symbol =
    pickString(source_, ['symbol', 'ticker', 'code', 'sym']) ?? fallbackSymbol;
  if (symbol === null) return null;

  const price = pickNumber(source_, [
    'price',
    'last',
    'lastPrice',
    'close',
    'c',
  ]);
  if (price === null || price <= 0) return null;

  const previousClose = pickNumber(source_, [
    'previousClose',
    'prevClose',
    'previous_close',
    'pc',
  ]);

  let change = pickNumber(source_, ['change', 'chg', 'd']);
  if (change === null && previousClose !== null) {
    change = price - previousClose;
  }

  let changePercent = pickNumber(source_, [
    'changePercent',
    'changePct',
    'percentChange',
    'dp',
  ]);
  // Upstreams disagree about units. A value whose magnitude exceeds 1 is a
  // percentage; below that it is already a fraction. Normalised here so the
  // rest of the system never has to ask.
  if (changePercent !== null && Math.abs(changePercent) > 1) {
    changePercent = changePercent / 100;
  }
  if (changePercent === null && change !== null && previousClose) {
    changePercent = change / previousClose;
  }

  return {
    symbol: normalizeSymbol(symbol),
    price,
    previousClose,
    change,
    changePercent,
    volume: pickNumber(source_, ['volume', 'vol', 'v']),
    asOf:
      pickDate(source_, ['asOf', 'timestamp', 'time', 't', 'updatedAt', 'date']) ??
      new Date(),
    source,
    stale: false,
  };
}

export function mapCandle(row: unknown): Candle | null {
  if (typeof row !== 'object' || row === null) return null;
  const r = row as Record<string, unknown>;
  const close = pickNumber(r, ['close', 'c']);
  const date = pickDate(r, ['date', 'timestamp', 't', 'time']);
  if (close === null || close <= 0 || date === null) return null;
  return {
    date,
    open: pickNumber(r, ['open', 'o']),
    high: pickNumber(r, ['high', 'h']),
    low: pickNumber(r, ['low', 'l']),
    close,
    volume: pickNumber(r, ['volume', 'v']),
  };
}
