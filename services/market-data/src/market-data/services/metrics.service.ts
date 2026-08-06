import { Injectable } from '@nestjs/common';

interface ProviderMetrics {
  requests: number;
  failures: number;
  /** Sum and count rather than a list — an unbounded array is a leak. */
  latencySumMs: number;
  latencySamples: number;
  latencyMaxMs: number;
  healthyChecks: number;
  totalChecks: number;
  reconnects: number;
}

const empty = (): ProviderMetrics => ({
  requests: 0,
  failures: 0,
  latencySumMs: 0,
  latencySamples: 0,
  latencyMaxMs: 0,
  healthyChecks: 0,
  totalChecks: 0,
  reconnects: 0,
});

/**
 * Counters, in memory.
 *
 * Deliberately not Prometheus-shaped or persisted: this answers "is the service
 * behaving right now", which is what an operator asks during an incident. Long
 * horizon analysis belongs in whatever scrapes /market/metrics, not in a map
 * that dies with the process.
 *
 * Latency is kept as a running sum and a maximum rather than as samples,
 * because a service that holds every measurement it has ever taken eventually
 * falls over from its own monitoring.
 */
@Injectable()
export class MetricsService {
  private readonly byProvider = new Map<string, ProviderMetrics>();
  private readonly startedAt = new Date();

  private cacheHits = 0;
  private cacheMisses = 0;
  private switches = 0;
  private lastSwitchAt: Date | null = null;
  private lastSwitchReason: string | null = null;
  private requests = 0;

  private of(name: string): ProviderMetrics {
    let metrics = this.byProvider.get(name);
    if (metrics === undefined) {
      metrics = empty();
      this.byProvider.set(name, metrics);
    }
    return metrics;
  }

  recordLatency(name: string, latencyMs: number): void {
    const m = this.of(name);
    m.requests += 1;
    m.latencySumMs += latencyMs;
    m.latencySamples += 1;
    if (latencyMs > m.latencyMaxMs) m.latencyMaxMs = latencyMs;
    this.requests += 1;
  }

  recordFailure(name: string): void {
    const m = this.of(name);
    m.requests += 1;
    m.failures += 1;
    this.requests += 1;
  }

  recordHealth(name: string, healthy: boolean, latencyMs: number | null): void {
    const m = this.of(name);
    m.totalChecks += 1;
    if (healthy) m.healthyChecks += 1;
    if (latencyMs !== null) {
      m.latencySumMs += latencyMs;
      m.latencySamples += 1;
      if (latencyMs > m.latencyMaxMs) m.latencyMaxMs = latencyMs;
    }
  }

  recordReconnect(name: string): void {
    this.of(name).reconnects += 1;
  }

  recordSwitch(from: string, to: string): void {
    this.switches += 1;
    this.lastSwitchAt = new Date();
    this.lastSwitchReason = `${from} → ${to}`;
  }

  recordCacheHit(): void {
    this.cacheHits += 1;
  }

  recordCacheMiss(): void {
    this.cacheMisses += 1;
  }

  snapshot() {
    const uptimeSeconds = Math.round(
      (Date.now() - this.startedAt.getTime()) / 1000,
    );
    const cacheTotal = this.cacheHits + this.cacheMisses;

    return {
      uptimeSeconds,
      startedAt: this.startedAt.toISOString(),
      requests: this.requests,
      requestsPerSecond:
        uptimeSeconds === 0
          ? 0
          : Number((this.requests / uptimeSeconds).toFixed(3)),
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRatio:
          cacheTotal === 0
            ? null
            : Number((this.cacheHits / cacheTotal).toFixed(3)),
      },
      failover: {
        switches: this.switches,
        lastSwitchAt: this.lastSwitchAt?.toISOString() ?? null,
        lastSwitch: this.lastSwitchReason,
      },
      providers: [...this.byProvider.entries()].map(([name, m]) => ({
        name,
        requests: m.requests,
        failures: m.failures,
        failureRatio:
          m.requests === 0 ? null : Number((m.failures / m.requests).toFixed(3)),
        avgLatencyMs:
          m.latencySamples === 0
            ? null
            : Math.round(m.latencySumMs / m.latencySamples),
        maxLatencyMs: m.latencyMaxMs === 0 ? null : m.latencyMaxMs,
        uptimeRatio:
          m.totalChecks === 0
            ? null
            : Number((m.healthyChecks / m.totalChecks).toFixed(3)),
        reconnects: m.reconnects,
      })),
    };
  }
}
