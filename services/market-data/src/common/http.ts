/**
 * The one place a request to an upstream is made.
 *
 * Timeouts, retries and backoff live here rather than in each provider, because
 * a provider that forgets its timeout does not fail — it hangs, and a hung
 * provider never trips the failure threshold that would have failed it over.
 */

export class UpstreamError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    /** True for the failures worth trying again: timeouts, 5xx, 429. */
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'UpstreamError';
  }
}

export interface RequestOptions {
  timeoutMs: number;
  maxRetries: number;
  baseDelayMs: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Exponential backoff WITH JITTER.
 *
 * Without the random component every client retries on the same schedule, so a
 * provider coming back from an outage is hit by the whole fleet at once and
 * goes down again. The jitter is the difference between a recovery and a
 * thundering herd.
 */
export function backoffDelay(attempt: number, baseMs: number): number {
  const exponential = baseMs * 2 ** attempt;
  return Math.round(exponential * (0.5 + Math.random() * 0.5));
}

function classify(status: number): boolean {
  // 429 and 5xx are the upstream saying "later", which is worth honouring.
  // A 4xx that is not 429 means the request itself is wrong, and repeating an
  // invalid request is just spending the rate limit twice.
  return status === 429 || status >= 500;
}

export async function fetchJson<T>(
  url: string,
  options: RequestOptions,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    if (attempt > 0) {
      await sleep(backoffDelay(attempt - 1, options.baseDelayMs));
    }

    const timeout = AbortSignal.timeout(options.timeoutMs);
    const signal =
      options.signal === undefined
        ? timeout
        : AbortSignal.any([timeout, options.signal]);

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json', ...options.headers },
        signal,
      });

      if (!response.ok) {
        const retryable = classify(response.status);
        const error = new UpstreamError(
          `HTTP ${response.status} from ${new URL(url).host}`,
          response.status,
          retryable,
        );
        if (!retryable) throw error;
        lastError = error;
        continue;
      }

      return (await response.json()) as T;
    } catch (error) {
      // A non-retryable UpstreamError is a verdict, not an attempt. Anything
      // else — abort, DNS, socket — is worth another go.
      if (error instanceof UpstreamError && !error.retryable) throw error;
      lastError = error;
    }
  }

  const reason =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new UpstreamError(
    `${reason} (after ${options.maxRetries + 1} attempts)`,
    undefined,
    true,
  );
}
