import { ConfigService } from '@nestjs/config';

import { MetricsService } from '../src/market-data/services/metrics.service';
import { ProviderManager } from '../src/market-data/services/provider-manager.service';
import { MockProvider } from './mock.provider';

/** A ConfigService without a module, so these stay unit tests. */
function config(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    activeProvider: '',
    failureThreshold: 3,
    latencyThresholdMs: 5_000,
    ...overrides,
  };
  return {
    get: <T>(key: string, fallback?: T) =>
      (values[key] as T) ?? (fallback as T),
  } as ConfigService;
}

function make(
  providers: MockProvider[],
  overrides: Record<string, unknown> = {},
) {
  const metrics = new MetricsService();
  const manager = new ProviderManager(providers, config(overrides), metrics);
  return { manager, metrics };
}

describe('ProviderManager', () => {
  it('orders the chain by priority, not by registration order', async () => {
    const secondary = new MockProvider('secondary', 2);
    const primary = new MockProvider('primary', 1);
    const { manager } = make([secondary, primary]);

    await manager.checkAll();
    expect(manager.active()?.name).toBe('primary');
  });

  it('fails over to the next provider when the primary goes down', async () => {
    const primary = new MockProvider('primary', 1);
    const fallback = new MockProvider('fallback', 2);
    const { manager } = make([primary, fallback]);

    await manager.checkAll();
    expect(manager.active()?.name).toBe('primary');

    primary.healthy = false;
    await manager.checkAll();
    expect(manager.active()?.name).toBe('fallback');
  });

  it('returns to the primary on its own, with no restart', async () => {
    // The whole point of recomputing "first healthy" every sweep: nothing has
    // to notice the recovery, because the ordering already encodes it.
    const primary = new MockProvider('primary', 1);
    const fallback = new MockProvider('fallback', 2);
    const { manager } = make([primary, fallback]);

    primary.healthy = false;
    await manager.checkAll();
    expect(manager.active()?.name).toBe('fallback');

    primary.healthy = true;
    await manager.checkAll();
    expect(manager.active()?.name).toBe('primary');
  });

  it('probes every provider, not only the active one', async () => {
    // A primary that is never probed while down is a primary that never comes
    // back, so this is the invariant that makes the previous test possible.
    const primary = new MockProvider('primary', 1);
    const fallback = new MockProvider('fallback', 2);
    const primaryHealth = jest.spyOn(primary, 'health');
    const fallbackHealth = jest.spyOn(fallback, 'health');
    const { manager } = make([primary, fallback]);

    await manager.checkAll();
    expect(primaryHealth).toHaveBeenCalled();
    expect(fallbackHealth).toHaveBeenCalled();
  });

  it('treats a provider that answers too slowly as down', async () => {
    const primary = new MockProvider('primary', 1);
    primary.latencyMs = 9_000;
    const fallback = new MockProvider('fallback', 2);
    const { manager } = make([primary, fallback], {
      latencyThresholdMs: 5_000,
    });

    await manager.checkAll();
    expect(manager.active()?.name).toBe('fallback');
  });

  it('demotes on runtime failures without waiting for the next sweep', async () => {
    const primary = new MockProvider('primary', 1);
    const fallback = new MockProvider('fallback', 2);
    const { manager } = make([primary, fallback], { failureThreshold: 2 });

    await manager.checkAll();
    manager.reportFailure('primary', new Error('timeout'));
    expect(manager.active()?.name).toBe('primary');

    manager.reportFailure('primary', new Error('timeout'));
    expect(manager.active()?.name).toBe('fallback');
  });

  it('a single success clears the failure streak', async () => {
    const primary = new MockProvider('primary', 1);
    const fallback = new MockProvider('fallback', 2);
    const { manager } = make([primary, fallback], { failureThreshold: 2 });

    await manager.checkAll();
    manager.reportFailure('primary', new Error('blip'));
    manager.reportSuccess('primary', 20);
    manager.reportFailure('primary', new Error('blip'));

    expect(manager.active()?.name).toBe('primary');
  });

  it('has no active provider when everything is down', async () => {
    const primary = new MockProvider('primary', 1);
    const fallback = new MockProvider('fallback', 2);
    primary.healthy = false;
    fallback.healthy = false;
    const { manager } = make([primary, fallback]);

    await manager.checkAll();
    expect(manager.active()).toBeNull();
    expect(manager.usable()).toHaveLength(0);
  });

  it('survives a provider whose health() throws, against the contract', async () => {
    const primary = new MockProvider('primary', 1);
    jest
      .spyOn(primary, 'health')
      .mockRejectedValue(new Error('health blew up'));
    const fallback = new MockProvider('fallback', 2);
    const { manager } = make([primary, fallback]);

    await expect(manager.checkAll()).resolves.toBeUndefined();
    expect(manager.active()?.name).toBe('fallback');
  });

  it('pins the chain when ACTIVE_PROVIDER names a provider', async () => {
    const primary = new MockProvider('primary', 1);
    const fallback = new MockProvider('fallback', 2);
    const { manager } = make([primary, fallback], {
      activeProvider: 'fallback',
    });

    await manager.checkAll();
    expect(manager.all()).toHaveLength(1);
    expect(manager.active()?.name).toBe('fallback');
  });

  it('ignores an ACTIVE_PROVIDER that matches nothing rather than serving none', async () => {
    const primary = new MockProvider('primary', 1);
    const { manager } = make([primary], { activeProvider: 'typo' });

    await manager.checkAll();
    expect(manager.active()?.name).toBe('primary');
  });

  it('only lets the ACTIVE provider push quotes', async () => {
    // A recovering secondary that reconnects its socket must not interleave
    // its prices with the primary's.
    const primary = new MockProvider('primary', 1, true);
    const fallback = new MockProvider('fallback', 2, true);
    const { manager } = make([primary, fallback]);
    await manager.checkAll();

    const received: string[] = [];
    manager.onQuote = (quote) => received.push(quote.source);

    primary.emit('COMI');
    fallback.emit('COMI');

    expect(received).toEqual(['primary']);
  });

  it('counts a failover in the metrics', async () => {
    const primary = new MockProvider('primary', 1);
    const fallback = new MockProvider('fallback', 2);
    const { manager, metrics } = make([primary, fallback]);

    await manager.checkAll();
    primary.healthy = false;
    await manager.checkAll();

    expect(metrics.snapshot().failover.switches).toBe(1);
    expect(metrics.snapshot().failover.lastSwitch).toBe('primary → fallback');
  });

  it('connects and disconnects every provider with the module lifecycle', async () => {
    const primary = new MockProvider('primary', 1);
    const fallback = new MockProvider('fallback', 2);
    const { manager } = make([primary, fallback]);

    await manager.onModuleInit();
    expect(primary.connectCalls).toBe(1);
    expect(fallback.connectCalls).toBe(1);

    await manager.onModuleDestroy();
    expect(primary.disconnectCalls).toBe(1);
    expect(fallback.disconnectCalls).toBe(1);
  });

  it('a runtime failure never resurrects a provider the sweep marked down', async () => {
    // Found by booting the service: reportFailure wrote
    // `healthy: consecutiveFailures < threshold` on its own, so a single error
    // against a source the sweep had just declared dead produced `1 < 3` and
    // put it straight back at the head of the chain.
    const primary = new MockProvider('primary', 1);
    primary.healthy = false;
    const { manager } = make([primary], { failureThreshold: 3 });

    await manager.checkAll();
    expect(manager.isHealthy('primary')).toBe(false);

    manager.reportFailure('primary', new Error('still down'));
    expect(manager.isHealthy('primary')).toBe(false);
  });

  it('a success still clears the verdict, so recovery works', async () => {
    const primary = new MockProvider('primary', 1);
    primary.healthy = false;
    const { manager } = make([primary]);

    await manager.checkAll();
    manager.reportSuccess('primary', 15);
    expect(manager.isHealthy('primary')).toBe(true);
  });
});
