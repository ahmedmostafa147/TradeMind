import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Quote } from '../entities/quote.entity';
import {
  MARKET_DATA_PROVIDERS,
  MarketDataProvider,
  ProviderHealth,
} from '../interfaces/market-data-provider.interface';
import { MetricsService } from './metrics.service';

export interface ProviderStatus extends ProviderHealth {
  priority: number;
  supportsStreaming: boolean;
  active: boolean;
}

/**
 * Which source is answering right now, and what happens when it stops.
 *
 * The chain is the providers sorted by `priority`. The active one is the first
 * healthy member of that list, recomputed on every health sweep — which is what
 * makes recovery automatic and free: nothing has to notice that the primary
 * came back, because "first healthy" already means the primary the moment it is
 * healthy again.
 *
 * HEALTH IS PROBED ON EVERY PROVIDER, NOT ONLY THE ACTIVE ONE. Checking just
 * the one in use is the mistake that makes failback impossible: a primary that
 * is never probed while it is down is a primary that never comes back.
 */
@Injectable()
export class ProviderManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProviderManager.name);

  private readonly chain: MarketDataProvider[];
  private readonly healthByName = new Map<string, ProviderHealth>();
  private activeName: string | null = null;

  /** Set by the poller/gateway so a streamed quote has somewhere to go. */
  onQuote?: (quote: Quote) => void;

  constructor(
    @Inject(MARKET_DATA_PROVIDERS) providers: MarketDataProvider[],
    @Inject(ConfigService) private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {
    const pinned = this.config.get<string>('activeProvider', '');
    const enabled = providers.filter(
      (p) => pinned === '' || p.name === pinned,
    );

    // Falls back to the full list rather than to nothing: a typo in
    // ACTIVE_PROVIDER should not silently leave the service with no sources.
    this.chain = (enabled.length > 0 ? enabled : providers).sort(
      (a, b) => a.priority - b.priority,
    );

    if (enabled.length === 0 && pinned !== '') {
      this.logger.warn(
        `ACTIVE_PROVIDER="${pinned}" matches no provider — using the full chain`,
      );
    }

    for (const provider of this.chain) {
      provider.onQuote = (quote) => {
        // Only the active source is allowed to push. A recovering secondary
        // that reconnects its socket must not start interleaving its prices
        // with the primary's.
        if (provider.name === this.activeName) this.onQuote?.(quote);
      };
    }
  }

  async onModuleInit(): Promise<void> {
    for (const provider of this.chain) {
      try {
        await provider.connect();
      } catch (error) {
        this.logger.warn(
          `${provider.name}: connect failed — ${describe(error)}`,
        );
      }
    }
    await this.checkAll();
  }

  async onModuleDestroy(): Promise<void> {
    for (const provider of this.chain) {
      try {
        await provider.disconnect();
      } catch {
        // Shutting down; a provider that will not close cleanly is not worth
        // holding the process open for.
      }
    }
  }

  /** The chain in order, healthy first. Empty when everything is down. */
  usable(): MarketDataProvider[] {
    return this.chain.filter((p) => this.isHealthy(p.name));
  }

  active(): MarketDataProvider | null {
    return this.usable()[0] ?? null;
  }

  all(): MarketDataProvider[] {
    return [...this.chain];
  }

  isHealthy(name: string): boolean {
    const health = this.healthByName.get(name);
    // Unknown counts as healthy: before the first sweep the alternative is
    // refusing to serve anything, and an unprobed provider has not failed.
    if (health === undefined) return true;
    return health.healthy;
  }

  status(): ProviderStatus[] {
    return this.chain.map((provider) => {
      const health = this.healthByName.get(provider.name);
      return {
        name: provider.name,
        healthy: health?.healthy ?? true,
        latencyMs: health?.latencyMs ?? null,
        consecutiveFailures: health?.consecutiveFailures ?? 0,
        lastCheckedAt: health?.lastCheckedAt ?? null,
        lastError: health?.lastError ?? null,
        priority: provider.priority,
        supportsStreaming: provider.supportsStreaming,
        active: provider.name === this.activeName,
      };
    });
  }

  /**
   * Probes every provider and recomputes the active one.
   *
   * A provider is down when it has failed `FAILURE_THRESHOLD` times in a row,
   * OR when it answers but slower than `LATENCY_THRESHOLD_MS` — a source that
   * takes nine seconds to return a price is not serving anybody, and treating
   * "slow" as "up" is how a timeout budget gets spent on a provider that was
   * never going to answer in time.
   */
  async checkAll(): Promise<void> {
    const threshold = this.config.get<number>('failureThreshold', 3);
    const latencyLimit = this.config.get<number>('latencyThresholdMs', 5_000);

    await Promise.all(
      this.chain.map(async (provider) => {
        let health: ProviderHealth;
        try {
          health = await provider.health();
        } catch (error) {
          // The interface says health() must not throw. If one does, that is
          // itself a failure — not a reason to abandon the sweep.
          health = {
            name: provider.name,
            healthy: false,
            latencyMs: null,
            consecutiveFailures: threshold,
            lastCheckedAt: new Date(),
            lastError: describe(error),
          };
        }

        const tooSlow =
          health.latencyMs !== null && health.latencyMs > latencyLimit;
        const failing = health.consecutiveFailures >= threshold;
        const healthy = health.healthy && !tooSlow && !failing;

        if (tooSlow && health.healthy) {
          this.logger.warn(
            `${provider.name}: ${health.latencyMs}ms exceeds ${latencyLimit}ms — marking down`,
          );
        }

        this.healthByName.set(provider.name, { ...health, healthy });
        this.metrics.recordHealth(provider.name, healthy, health.latencyMs);
      }),
    );

    this.reconcileActive();
  }

  /**
   * Records a runtime failure between sweeps.
   *
   * Waiting up to thirty seconds for the next health check while every request
   * fails is thirty seconds of avoidable errors, so a provider that throws
   * during real traffic is demoted immediately and the chain moves on.
   */
  reportFailure(name: string, error: unknown): void {
    const threshold = this.config.get<number>('failureThreshold', 3);
    const current = this.healthByName.get(name);
    const consecutiveFailures = (current?.consecutiveFailures ?? 0) + 1;

    this.healthByName.set(name, {
      name,
      // A FAILURE MUST NEVER MAKE A PROVIDER HEALTHIER. Written as
      // `consecutiveFailures < threshold` alone, this resurrected a provider
      // the sweep had just marked down: one runtime error against a source
      // already known to be dead produced `1 < 3` and put it back in the
      // chain. Only a success — or a passing sweep — may clear the verdict.
      healthy: (current?.healthy ?? true) && consecutiveFailures < threshold,
      latencyMs: current?.latencyMs ?? null,
      consecutiveFailures,
      lastCheckedAt: new Date(),
      lastError: describe(error),
    });

    this.metrics.recordFailure(name);
    this.reconcileActive();
  }

  reportSuccess(name: string, latencyMs: number): void {
    this.healthByName.set(name, {
      name,
      healthy: true,
      latencyMs,
      consecutiveFailures: 0,
      lastCheckedAt: new Date(),
      lastError: null,
    });
    this.metrics.recordLatency(name, latencyMs);
    this.reconcileActive();
  }

  private reconcileActive(): void {
    const next = this.usable()[0]?.name ?? null;
    if (next === this.activeName) return;

    const previous = this.activeName;
    this.activeName = next;

    if (next === null) {
      this.logger.error('every provider is down — serving cache only');
    } else if (previous === null) {
      this.logger.log(`active provider: ${next}`);
    } else {
      // Named explicitly in both directions so the log answers "when did we
      // fail over, and when did we come back" without correlating timestamps.
      const direction =
        this.rank(next) < this.rank(previous) ? 'recovered to' : 'failed over to';
      this.logger.warn(`${direction} ${next} (was ${previous})`);
      this.metrics.recordSwitch(previous, next);
    }
  }

  private rank(name: string): number {
    return this.chain.findIndex((p) => p.name === name);
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
