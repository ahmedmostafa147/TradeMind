import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

import { MarketDataGateway } from '../gateway/market-data.gateway';
import { MarketDataService } from '../services/market-data.service';
import { PriceCacheService } from '../services/price-cache.service';
import { ProviderManager } from '../services/provider-manager.service';

/**
 * Keeps the cache and the socket fed, and probes the providers.
 *
 * TWO TIMERS, NOT ONE. The health sweep has to keep running while the poll is
 * failing — they are the same interval only by coincidence, and sharing a timer
 * would mean a provider that hangs delays the very check that would have
 * declared it dead.
 *
 * STREAMING WINS WHEN IT IS AVAILABLE. A source that pushes is subscribed to
 * and the poll drops to a slow keep-alive; a source that cannot push is pulled
 * every POLL_INTERVAL_MS. The choice is re-made on every failover, because the
 * primary and the fallback do not have to agree about it.
 */
@Injectable()
export class PricePoller implements OnModuleInit {
  private readonly logger = new Logger(PricePoller.name);

  /** Guards against a slow poll overlapping the next tick. */
  private polling = false;
  private streaming = false;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    private readonly providers: ProviderManager,
    private readonly marketData: MarketDataService,
    private readonly cache: PriceCacheService,
    private readonly gateway: MarketDataGateway,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const pollInterval = this.config.get<number>('pollIntervalMs', 15_000);
    const healthInterval = this.config.get<number>(
      'healthCheckIntervalMs',
      30_000,
    );

    // Streamed quotes go straight out; nothing else has to know they arrived
    // by a different road than the polled ones.
    this.providers.onQuote = (quote) => {
      void this.cache.set(quote);
      this.gateway.publish(quote);
    };

    this.scheduler.addInterval(
      'poll',
      setInterval(() => void this.poll(), pollInterval),
    );
    this.scheduler.addInterval(
      'health',
      setInterval(() => void this.sweep(), healthInterval),
    );

    void this.resubscribe();
    void this.poll();
  }

  private get symbols(): string[] {
    return this.config.get<string[]>('trackedSymbols', []);
  }

  async poll(): Promise<void> {
    // A poll that is still running when the next tick fires means the upstream
    // is slower than the interval. Stacking a second one on top only makes it
    // slower — and doubles the rate-limit spend.
    if (this.polling) {
      this.logger.debug('poll still running, skipping this tick');
      return;
    }
    // While a socket is delivering, polling every fifteen seconds is redundant
    // traffic. The interval keeps firing so that a silent socket is still
    // noticed by the health sweep, but the fetch itself is skipped.
    if (this.streaming) return;
    if (this.symbols.length === 0) return;

    this.polling = true;
    try {
      const quotes = await this.marketData.getPrices(this.symbols);
      this.gateway.publishMany(quotes);
    } catch (error) {
      this.logger.warn(
        `poll failed — ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.polling = false;
    }
  }

  async sweep(): Promise<void> {
    const before = this.providers.active()?.name ?? null;
    await this.providers.checkAll();
    const after = this.providers.active();

    if ((after?.name ?? null) !== before) {
      // The transport can change with the provider, so both are re-decided
      // together rather than left as whatever the previous one wanted.
      await this.resubscribe();
      const status = this.marketData.status();
      this.gateway.publishStatus(status.state, status.activeProvider);
    }
  }

  /** Points the subscriptions at whichever provider is active now. */
  private async resubscribe(): Promise<void> {
    const active = this.providers.active();
    this.streaming = active?.supportsStreaming ?? false;

    if (active === null || !this.streaming) return;

    for (const symbol of this.symbols) {
      try {
        await active.subscribe(symbol);
      } catch (error) {
        this.logger.warn(
          `${active.name}: subscribe(${symbol}) failed — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        // One refused subscription is not a reason to fall back to polling
        // for everything, but a source that refuses them all effectively has.
        this.streaming = false;
        return;
      }
    }
    this.logger.log(`${active.name}: streaming ${this.symbols.length} symbols`);
  }
}
