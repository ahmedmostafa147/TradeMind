import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

import { Candle, Quote } from '../entities/quote.entity';
import { MetricsService } from './metrics.service';
import { PriceCacheService } from './price-cache.service';
import { ProviderManager } from './provider-manager.service';

/**
 * The failover chain, and the only place it is spelled out:
 *
 *   healthy providers in priority order  →  cache  →  503
 *
 * Callers never learn which source answered except by reading `source` off the
 * quote. That is the point of the whole module: a consumer written against this
 * keeps working when the primary is replaced, when a scraper is added, or when
 * everything is down and the answer is yesterday's close marked `stale`.
 */
@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    private readonly providers: ProviderManager,
    private readonly cache: PriceCacheService,
    private readonly metrics: MetricsService,
  ) {}

  async getPrice(symbol: string): Promise<Quote> {
    for (const provider of this.providers.usable()) {
      const started = Date.now();
      try {
        const quote = await provider.getPrice(symbol);
        this.providers.reportSuccess(provider.name, Date.now() - started);
        // Written back on the way out, so the cache is always the last thing
        // that actually worked rather than a separate refresh path that can
        // drift from what callers were served.
        await this.cache.set(quote);
        return quote;
      } catch (error) {
        this.providers.reportFailure(provider.name, error);
        this.logger.warn(
          `${provider.name}: getPrice(${symbol}) failed — ${describe(error)}`,
        );
      }
    }

    const cached = await this.cache.get(symbol);
    if (cached !== null) {
      this.logger.warn(`serving ${symbol} from cache — every provider is down`);
      return cached;
    }

    throw new ServiceUnavailableException({
      message:
        'مفيش سعر متاح للسهم ده دلوقتي — كل مصادر البيانات مش متاحة ومفيش نسخة محفوظة.',
      symbol,
      providers: this.providers.status().map((p) => ({
        name: p.name,
        healthy: p.healthy,
        lastError: p.lastError,
      })),
    });
  }

  /**
   * Best effort across a list.
   *
   * PARTIAL RESULTS ARE A SUCCESS. Nine prices and one gap is a usable answer;
   * failing the batch because one symbol had no print today would make the
   * endpoint useless on exactly the days it matters. Symbols the providers
   * could not supply are topped up from the cache, individually.
   */
  async getPrices(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];

    const collected = new Map<string, Quote>();

    for (const provider of this.providers.usable()) {
      const missing = symbols.filter((s) => !collected.has(s.toUpperCase()));
      if (missing.length === 0) break;

      const started = Date.now();
      try {
        const quotes = await provider.getPrices(missing);
        if (quotes.length === 0) {
          // NOT a success. A provider that answers "nothing" for every symbol
          // asked has failed as surely as one that threw — and counting it as
          // healthy is how a dead source stays at the head of the chain
          // forever, because the health it reports is the health of a call
          // that returned an empty array without complaining.
          throw new Error(`returned no quotes for ${missing.length} symbols`);
        }
        this.providers.reportSuccess(provider.name, Date.now() - started);
        for (const quote of quotes) collected.set(quote.symbol, quote);
      } catch (error) {
        this.providers.reportFailure(provider.name, error);
        this.logger.warn(
          `${provider.name}: getPrices failed — ${describe(error)}`,
        );
      }
    }

    if (collected.size > 0) {
      await this.cache.setMany([...collected.values()]);
    }

    const stillMissing = symbols.filter((s) => !collected.has(s.toUpperCase()));
    for (const quote of await this.cache.getMany(stillMissing)) {
      collected.set(quote.symbol, quote);
    }

    return [...collected.values()];
  }

  async getHistory(symbol: string, days: number): Promise<Candle[]> {
    for (const provider of this.providers.usable()) {
      if (provider.getHistory === undefined) continue;
      const started = Date.now();
      try {
        const candles = await provider.getHistory(symbol, days);
        this.providers.reportSuccess(provider.name, Date.now() - started);
        if (candles.length > 0) return candles;
      } catch (error) {
        this.providers.reportFailure(provider.name, error);
      }
    }

    // No cache tier for history: a partial series silently truncated to
    // whatever happened to be stored is worse than an honest refusal, because
    // every indicator computed from it would be quietly wrong.
    throw new ServiceUnavailableException({
      message: 'مفيش بيانات تاريخية متاحة للسهم ده دلوقتي.',
      symbol,
    });
  }

  status() {
    const providers = this.providers.status();
    const active = providers.find((p) => p.active) ?? null;
    return {
      // `degraded` rather than a bare boolean: running on the fallback is not
      // healthy and not down, and collapsing the two hides the state an
      // operator most wants to see.
      state:
        active === null
          ? 'down'
          : active.priority === 1
            ? 'healthy'
            : 'degraded',
      activeProvider: active?.name ?? null,
      cacheHealthy: this.cache.healthy,
      providers,
      metrics: this.metrics.snapshot(),
    };
  }
}

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
