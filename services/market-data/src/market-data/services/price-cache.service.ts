import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { normalizeSymbol, Quote } from '../entities/quote.entity';
import { MetricsService } from './metrics.service';

const KEY_PREFIX = 'radar:quote:';

/**
 * The last known price for every symbol, so a total outage degrades instead of
 * failing.
 *
 * **REDIS IS NOT ALLOWED TO BECOME A SINGLE POINT OF FAILURE.** This cache
 * exists to survive the failure of every provider; a cache that takes the
 * service down when IT fails would have inverted its own purpose. So every
 * Redis call is wrapped, a connection error downgrades to an in-process map,
 * and the service keeps answering — with one fewer safety net and a warning in
 * the log, which is the correct amount of drama.
 *
 * The memory tier is bounded and holds only the tracked symbols in practice;
 * it is a life raft, not a second cache tier.
 */
@Injectable()
export class PriceCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriceCacheService.name);

  private redis: Redis | null = null;
  private redisUsable = false;

  /** The raft. Bounded so a symbol storm cannot exhaust the heap. */
  private readonly memory = new Map<string, Quote>();
  private static readonly MEMORY_LIMIT = 500;

  constructor(
    @Inject(ConfigService) private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('redisUrl', '');
    if (url === '') {
      this.logger.warn('REDIS_URL is empty — caching in memory only');
      return;
    }

    this.redis = new Redis(url, {
      lazyConnect: true,
      // Bounded, because an unbounded retry queue turns a Redis outage into a
      // growing backlog of commands that will all fail anyway.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 500, 10_000),
    });

    this.redis.on('error', (error) => {
      if (this.redisUsable) {
        this.logger.error(`redis unavailable — ${error.message}`);
      }
      this.redisUsable = false;
    });
    this.redis.on('ready', () => {
      this.redisUsable = true;
      this.logger.log('redis connected');
    });

    try {
      await this.redis.connect();
    } catch (error) {
      this.logger.error(
        `redis connect failed, continuing in memory — ${describe(error)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit().catch(() => undefined);
  }

  get healthy(): boolean {
    return this.redisUsable;
  }

  async set(quote: Quote): Promise<void> {
    const symbol = normalizeSymbol(quote.symbol);
    this.writeMemory(symbol, quote);

    if (!this.redisUsable || this.redis === null) return;
    const ttl = this.config.get<number>('cacheTtlSeconds', 86_400);
    try {
      await this.redis.set(
        KEY_PREFIX + symbol,
        JSON.stringify({ ...quote, asOf: quote.asOf.toISOString() }),
        'EX',
        ttl,
      );
    } catch (error) {
      this.logger.warn(`redis set failed for ${symbol} — ${describe(error)}`);
    }
  }

  async setMany(quotes: Quote[]): Promise<void> {
    await Promise.all(quotes.map((quote) => this.set(quote)));
  }

  /**
   * The last price we ever saw, marked `stale`.
   *
   * ALWAYS marked, even when it was written a second ago: the caller asked the
   * cache because the providers could not answer, and a quote that does not
   * say it came from a cache will be rendered as if it came from the market.
   */
  async get(symbol: string): Promise<Quote | null> {
    const clean = normalizeSymbol(symbol);

    if (this.redisUsable && this.redis !== null) {
      try {
        const raw = await this.redis.get(KEY_PREFIX + clean);
        if (raw !== null) {
          const quote = revive(raw);
          if (quote !== null) {
            this.metrics.recordCacheHit();
            return { ...quote, source: 'cache', stale: true };
          }
        }
      } catch (error) {
        this.logger.warn(`redis get failed for ${clean} — ${describe(error)}`);
      }
    }

    const fromMemory = this.memory.get(clean);
    if (fromMemory !== undefined) {
      this.metrics.recordCacheHit();
      return { ...fromMemory, source: 'cache', stale: true };
    }

    this.metrics.recordCacheMiss();
    return null;
  }

  async getMany(symbols: string[]): Promise<Quote[]> {
    const found = await Promise.all(symbols.map((s) => this.get(s)));
    return found.filter((q): q is Quote => q !== null);
  }

  private writeMemory(symbol: string, quote: Quote): void {
    if (
      this.memory.size >= PriceCacheService.MEMORY_LIMIT &&
      !this.memory.has(symbol)
    ) {
      // Oldest insertion wins the eviction — Map preserves insertion order,
      // which is good enough for a raft that normally holds ten symbols.
      const oldest = this.memory.keys().next().value;
      if (oldest !== undefined) this.memory.delete(oldest);
    }
    this.memory.set(symbol, quote);
  }
}

function revive(raw: string): Quote | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const asOf = new Date(String(parsed.asOf));
    if (Number.isNaN(asOf.getTime())) return null;
    if (typeof parsed.price !== 'number' || parsed.price <= 0) return null;
    return {
      symbol: String(parsed.symbol),
      price: parsed.price,
      previousClose: numberOrNull(parsed.previousClose),
      change: numberOrNull(parsed.change),
      changePercent: numberOrNull(parsed.changePercent),
      volume: numberOrNull(parsed.volume),
      asOf,
      source: String(parsed.source ?? 'cache'),
      stale: true,
    };
  } catch {
    return null;
  }
}

const numberOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const describe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
