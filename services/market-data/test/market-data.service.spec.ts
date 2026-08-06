import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';

import { Quote } from '../src/market-data/entities/quote.entity';
import { MarketDataService } from '../src/market-data/services/market-data.service';
import { MetricsService } from '../src/market-data/services/metrics.service';
import { PriceCacheService } from '../src/market-data/services/price-cache.service';
import { ProviderManager } from '../src/market-data/services/provider-manager.service';
import { MockProvider } from './mock.provider';

function config(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    activeProvider: '',
    failureThreshold: 3,
    latencyThresholdMs: 5_000,
    redisUrl: '',
    cacheTtlSeconds: 60,
    ...overrides,
  };
  return {
    get: <T>(key: string, fallback?: T) =>
      (values[key] as T) ?? (fallback as T),
  } as ConfigService;
}

async function build(providers: MockProvider[]) {
  const metrics = new MetricsService();
  const manager = new ProviderManager(providers, config(), metrics);
  // No REDIS_URL — the memory tier is what runs, which is exactly the
  // degraded mode worth testing.
  const cache = new PriceCacheService(config(), metrics);
  await cache.onModuleInit();
  const service = new MarketDataService(manager, cache, metrics);
  await manager.checkAll();
  return { service, manager, cache, metrics };
}

describe('MarketDataService', () => {
  it('serves from the primary while it is up', async () => {
    const primary = new MockProvider('primary', 1, false, 100);
    const fallback = new MockProvider('fallback', 2, false, 200);
    const { service } = await build([primary, fallback]);

    const quote = await service.getPrice('COMI');
    expect(quote.source).toBe('primary');
    expect(quote.price).toBe(100);
    expect(quote.stale).toBe(false);
  });

  it('falls through to the next provider when the first throws', async () => {
    const primary = new MockProvider('primary', 1, false, 100);
    const fallback = new MockProvider('fallback', 2, false, 200);
    primary.failGetPrice = true;
    const { service } = await build([primary, fallback]);

    const quote = await service.getPrice('COMI');
    expect(quote.source).toBe('fallback');
    expect(quote.price).toBe(200);
  });

  it('serves the cache when every provider is down, MARKED STALE', async () => {
    const primary = new MockProvider('primary', 1, false, 100);
    const { service } = await build([primary]);

    await service.getPrice('COMI'); // warms the cache
    primary.failGetPrice = true;

    const quote = await service.getPrice('COMI');
    expect(quote.price).toBe(100);
    expect(quote.source).toBe('cache');
    // The flag is the contract: a cached price that does not announce itself
    // gets rendered as a live one.
    expect(quote.stale).toBe(true);
  });

  it('503s when there is no provider and no cached price', async () => {
    const primary = new MockProvider('primary', 1);
    primary.failGetPrice = true;
    const { service } = await build([primary]);

    await expect(service.getPrice('NOPE')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('the 503 body names the providers and why each failed', async () => {
    const primary = new MockProvider('primary', 1);
    primary.failGetPrice = true;
    const { service } = await build([primary]);

    try {
      await service.getPrice('NOPE');
      fail('expected a 503');
    } catch (error) {
      const body = (error as ServiceUnavailableException).getResponse() as {
        providers: { name: string; lastError: string | null }[];
      };
      expect(body.providers[0].name).toBe('primary');
      expect(body.providers[0].lastError).toContain('down');
    }
  });

  it('returns partial results rather than failing a whole batch', async () => {
    const primary = new MockProvider('primary', 1, false, 100);
    jest
      .spyOn(primary, 'getPrices')
      .mockImplementation(async (symbols: string[]) =>
        symbols
          .filter((s) => s !== 'DEAD')
          .map((s) => ({
            symbol: s,
            price: 100,
            previousClose: null,
            change: null,
            changePercent: null,
            volume: null,
            asOf: new Date(),
            source: 'primary',
            stale: false,
          })),
      );
    const { service } = await build([primary]);

    const quotes = await service.getPrices(['COMI', 'DEAD', 'TMGH']);
    expect(quotes.map((q) => q.symbol).sort()).toEqual(['COMI', 'TMGH']);
  });

  it('tops a batch up from the cache for symbols the providers missed', async () => {
    const primary = new MockProvider('primary', 1, false, 100);
    const { service, cache } = await build([primary]);

    const cached: Quote = {
      symbol: 'OLD',
      price: 42,
      previousClose: null,
      change: null,
      changePercent: null,
      volume: null,
      asOf: new Date('2026-08-01T12:00:00Z'),
      source: 'primary',
      stale: false,
    };
    await cache.set(cached);

    jest.spyOn(primary, 'getPrices').mockResolvedValue([]);

    const quotes = await service.getPrices(['OLD']);
    expect(quotes).toHaveLength(1);
    expect(quotes[0].stale).toBe(true);
  });

  it('reports degraded — not healthy — while running on the fallback', async () => {
    const primary = new MockProvider('primary', 1);
    const fallback = new MockProvider('fallback', 2);
    const { service, manager } = await build([primary, fallback]);

    expect(service.status().state).toBe('healthy');

    primary.healthy = false;
    await manager.checkAll();
    expect(service.status().state).toBe('degraded');
    expect(service.status().activeProvider).toBe('fallback');
  });

  it('reports down when nothing is usable', async () => {
    const primary = new MockProvider('primary', 1);
    primary.healthy = false;
    const { service, manager } = await build([primary]);
    await manager.checkAll();

    expect(service.status().state).toBe('down');
  });

  it('refuses history rather than serving a truncated series', async () => {
    // A partial series silently cut to whatever was stored would make every
    // indicator computed from it quietly wrong.
    const primary = new MockProvider('primary', 1);
    primary.failGetPrice = true;
    const { service } = await build([primary]);

    await expect(service.getHistory('COMI', 30)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('does NOT count an all-empty batch as a provider success', async () => {
    // Caught by booting the service against a dead upstream: FallbackProvider
    // swallowed every per-symbol error and returned [], so a provider that was
    // returning nothing at all reported itself perfectly healthy and stayed at
    // the head of the chain.
    const primary = new MockProvider('primary', 1);
    const fallback = new MockProvider('fallback', 2, false, 200);
    jest.spyOn(primary, 'getPrices').mockResolvedValue([]);
    const { service, manager } = await build([primary, fallback]);

    const quotes = await service.getPrices(['COMI']);

    expect(quotes[0].source).toBe('fallback');
    expect(
      manager.status().find((p) => p.name === 'primary')?.consecutiveFailures,
    ).toBe(1);
  });
});
