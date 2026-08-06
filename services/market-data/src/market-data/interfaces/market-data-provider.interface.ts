import { Quote, Candle } from '../entities/quote.entity';

/** Injection token — providers are registered as a multi-provider array. */
export const MARKET_DATA_PROVIDERS = Symbol('MARKET_DATA_PROVIDERS');

export interface ProviderHealth {
  name: string;
  healthy: boolean;
  /** Round trip of the last probe, in ms. Null when it never answered. */
  latencyMs: number | null;
  /** Consecutive failures. Reset by the first success. */
  consecutiveFailures: number;
  lastCheckedAt: Date | null;
  lastError: string | null;
}

/**
 * THE ONLY THING A NEW PROVIDER HAS TO IMPLEMENT.
 *
 * Nothing outside `providers/` may know which source a price came from, beyond
 * the `source` label carried on the quote itself. That is what makes adding the
 * scraper — or swapping EGXAPI for a paid feed — a file to add rather than a
 * system to edit: ProviderManager orders whatever it is given, and the service
 * above it asks for "a quote", never for "EGXAPI's quote".
 */
export interface MarketDataProvider {
  /** Stable identifier, used in logs, metrics and the /market/providers view. */
  readonly name: string;

  /**
   * Lower runs first. The chain is ordered by this, so promoting a new source
   * to primary is a config change and not a code change.
   */
  readonly priority: number;

  /**
   * Whether this source can push. False means the poller has to pull it on a
   * timer — which is the difference between a second of latency and a whole
   * polling interval of it, so it is worth knowing rather than assuming.
   */
  readonly supportsStreaming: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;

  /** One symbol. Throws on failure — the manager decides what a failure means. */
  getPrice(symbol: string): Promise<Quote>;

  /**
   * Every symbol asked for, in one call where the upstream allows it.
   *
   * Returns only what it actually got: a symbol with no print today is absent
   * from the result rather than present with a zero, because a caller that sees
   * a price is entitled to assume it is real.
   */
  getPrices(symbols: string[]): Promise<Quote[]>;

  subscribe(symbol: string): Promise<void>;
  unsubscribe(symbol: string): Promise<void>;

  /**
   * Daily candles, newest last. Optional: a source that has no history says so
   * by leaving this undefined rather than by returning an empty array, which
   * would be indistinguishable from "this symbol has never traded".
   */
  getHistory?(symbol: string, days: number): Promise<Candle[]>;

  /**
   * A cheap liveness probe. MUST NOT throw — it returns the verdict, because a
   * health check that throws is one more failure path to handle in the one
   * place that exists to handle failure.
   */
  health(): Promise<ProviderHealth>;

  /**
   * Fired when a streaming source pushes. The manager wires this; providers
   * must tolerate it being unset.
   */
  onQuote?: (quote: Quote) => void;
}
