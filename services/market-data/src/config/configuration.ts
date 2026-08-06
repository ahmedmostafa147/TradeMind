import * as Joi from 'joi';

/**
 * Every knob, in one place, validated at boot.
 *
 * Joi rather than reading `process.env` at each use site: a service that only
 * discovers a missing REDIS_URL when the first quote arrives has moved a
 * configuration error into production traffic. This fails to start instead.
 */
export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3010),

  // --- providers ---------------------------------------------------------
  EGX_API_KEY: Joi.string().allow('').default(''),
  EGX_BASE_URL: Joi.string().uri().default('https://api.egxapi.com'),
  EGX_WS_URL: Joi.string().uri().allow('').default(''),

  FALLBACK_BASE_URL: Joi.string().uri().allow('').default(''),
  FALLBACK_ENABLED: Joi.boolean().default(true),

  /**
   * Pins the chain to one provider, for an incident or a test. Empty means
   * "use the configured priority order", which is the normal state.
   */
  ACTIVE_PROVIDER: Joi.string().allow('').default(''),

  // --- cache -------------------------------------------------------------
  REDIS_URL: Joi.string().allow('').default('redis://127.0.0.1:6379'),
  /**
   * Long enough to outlive an outage worth surviving, short enough that a
   * price nobody has refreshed for a day is gone rather than served.
   */
  CACHE_TTL_SECONDS: Joi.number().min(1).default(86_400),

  // --- timing ------------------------------------------------------------
  POLL_INTERVAL_MS: Joi.number().min(1000).default(15_000),
  HEALTH_CHECK_INTERVAL_MS: Joi.number().min(5000).default(30_000),
  REQUEST_TIMEOUT_MS: Joi.number().min(500).default(8_000),

  /** Consecutive failures before a provider is taken out of the chain. */
  FAILURE_THRESHOLD: Joi.number().min(1).default(3),
  /** A provider slower than this is treated as down, even when it answers. */
  LATENCY_THRESHOLD_MS: Joi.number().min(100).default(5_000),

  MAX_RETRIES: Joi.number().min(0).default(2),
  RETRY_BASE_DELAY_MS: Joi.number().min(10).default(250),

  // --- what to track -----------------------------------------------------
  /**
   * Comma-separated. The poller only fetches these, because polling "every
   * symbol on the exchange" every fifteen seconds is how a free tier turns
   * into a rate limit.
   */
  TRACKED_SYMBOLS: Joi.string().default(
    'COMI,TMGH,SWDY,EAST,ABUK,HRHO,ETEL,EKHO,ORWE,AMOC',
  ),

  // --- security ----------------------------------------------------------
  CORS_ORIGINS: Joi.string().default('*'),
  RATE_LIMIT_TTL_MS: Joi.number().min(1000).default(60_000),
  RATE_LIMIT_MAX: Joi.number().min(1).default(120),
  /** When set, every REST call must present it as `x-api-key`. */
  SERVICE_API_KEY: Joi.string().allow('').default(''),

  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
    .default('info'),
});

export interface AppConfig {
  nodeEnv: string;
  port: number;
  egx: { apiKey: string; baseUrl: string; wsUrl: string };
  fallback: { baseUrl: string; enabled: boolean };
  activeProvider: string;
  redisUrl: string;
  cacheTtlSeconds: number;
  pollIntervalMs: number;
  healthCheckIntervalMs: number;
  requestTimeoutMs: number;
  failureThreshold: number;
  latencyThresholdMs: number;
  maxRetries: number;
  retryBaseDelayMs: number;
  trackedSymbols: string[];
  corsOrigins: string[];
  rateLimit: { ttlMs: number; max: number };
  serviceApiKey: string;
  logLevel: string;
}

export const configuration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3010),
  egx: {
    apiKey: process.env.EGX_API_KEY ?? '',
    baseUrl: process.env.EGX_BASE_URL ?? 'https://api.egxapi.com',
    wsUrl: process.env.EGX_WS_URL ?? '',
  },
  fallback: {
    baseUrl: process.env.FALLBACK_BASE_URL ?? '',
    enabled: process.env.FALLBACK_ENABLED !== 'false',
  },
  activeProvider: process.env.ACTIVE_PROVIDER ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 86_400),
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 15_000),
  healthCheckIntervalMs: Number(process.env.HEALTH_CHECK_INTERVAL_MS ?? 30_000),
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 8_000),
  failureThreshold: Number(process.env.FAILURE_THRESHOLD ?? 3),
  latencyThresholdMs: Number(process.env.LATENCY_THRESHOLD_MS ?? 5_000),
  maxRetries: Number(process.env.MAX_RETRIES ?? 2),
  retryBaseDelayMs: Number(process.env.RETRY_BASE_DELAY_MS ?? 250),
  trackedSymbols: (process.env.TRACKED_SYMBOLS ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s !== ''),
  corsOrigins: (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s !== ''),
  rateLimit: {
    ttlMs: Number(process.env.RATE_LIMIT_TTL_MS ?? 60_000),
    max: Number(process.env.RATE_LIMIT_MAX ?? 120),
  },
  serviceApiKey: process.env.SERVICE_API_KEY ?? '',
  logLevel: process.env.LOG_LEVEL ?? 'info',
});
