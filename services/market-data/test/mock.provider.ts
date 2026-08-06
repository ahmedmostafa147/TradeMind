import { Quote, Candle } from '../src/market-data/entities/quote.entity';
import {
  MarketDataProvider,
  ProviderHealth,
} from '../src/market-data/interfaces/market-data-provider.interface';

/**
 * A provider you can break on purpose.
 *
 * Every failover test needs a source that fails when told to and recovers when
 * told to, which no real provider can be made to do reliably. This is also the
 * proof that the interface is implementable by something other than an HTTP
 * client — if a new provider needed more than these methods, this would not
 * compile.
 */
export class MockProvider implements MarketDataProvider {
  healthy = true;
  failGetPrice = false;
  latencyMs = 10;
  connectCalls = 0;
  disconnectCalls = 0;
  subscribeCalls: string[] = [];
  priceCalls = 0;

  onQuote?: (quote: Quote) => void;

  constructor(
    readonly name: string,
    readonly priority: number,
    readonly supportsStreaming = false,
    private readonly price = 100,
  ) {}

  async connect(): Promise<void> {
    this.connectCalls += 1;
  }

  async disconnect(): Promise<void> {
    this.disconnectCalls += 1;
  }

  private quote(symbol: string): Quote {
    return {
      symbol: symbol.toUpperCase(),
      price: this.price,
      previousClose: this.price - 1,
      change: 1,
      changePercent: 1 / (this.price - 1),
      volume: 1000,
      asOf: new Date('2026-08-06T12:00:00Z'),
      source: this.name,
      stale: false,
    };
  }

  async getPrice(symbol: string): Promise<Quote> {
    this.priceCalls += 1;
    if (this.failGetPrice) throw new Error(`${this.name} is down`);
    return this.quote(symbol);
  }

  async getPrices(symbols: string[]): Promise<Quote[]> {
    this.priceCalls += 1;
    if (this.failGetPrice) throw new Error(`${this.name} is down`);
    return symbols.map((s) => this.quote(s));
  }

  async getHistory(_symbol: string, days: number): Promise<Candle[]> {
    if (this.failGetPrice) throw new Error(`${this.name} is down`);
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.UTC(2026, 7, i + 1)),
      open: null,
      high: null,
      low: null,
      close: this.price + i,
      volume: null,
    }));
  }

  async subscribe(symbol: string): Promise<void> {
    this.subscribeCalls.push(symbol);
  }

  async unsubscribe(): Promise<void> {}

  async health(): Promise<ProviderHealth> {
    return {
      name: this.name,
      healthy: this.healthy,
      latencyMs: this.latencyMs,
      consecutiveFailures: this.healthy ? 0 : 99,
      lastCheckedAt: new Date(),
      lastError: this.healthy ? null : 'forced down',
    };
  }

  /** Simulates a push from a streaming source. */
  emit(symbol: string): void {
    this.onQuote?.(this.quote(symbol));
  }
}
