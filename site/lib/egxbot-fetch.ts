import { nameForTicker, normalizeTicker } from '@/lib/egx-directory';

export type EgxBotHeroData = {
  egx30: {
    price: number;
    changePercent: number;
  } | null;
  gainer: {
    code: string;
    changePercent: number;
  } | null;
  asOf: string;
};

const EGXBOT_BASE_URL = 'https://egxbot.com';

/**
 * Parses EGXBot's `/live/hero` JSON response safely.
 */
export function parseEgxBotHeroPayload(body: unknown): EgxBotHeroData | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  let egx30: EgxBotHeroData['egx30'] = null;
  if (typeof b.egx30 === 'object' && b.egx30 !== null) {
    const e = b.egx30 as Record<string, unknown>;
    if (typeof e.price === 'number' && Number.isFinite(e.price) && e.price > 0) {
      const changePercent =
        typeof e.change_pct === 'number' && Number.isFinite(e.change_pct)
          ? e.change_pct / 100
          : 0;
      egx30 = { price: e.price, changePercent };
    }
  }

  let gainer: EgxBotHeroData['gainer'] = null;
  if (typeof b.gainer === 'object' && b.gainer !== null) {
    const g = b.gainer as Record<string, unknown>;
    if (typeof g.code === 'string' && g.code.trim() !== '') {
      const changePercent =
        typeof g.change_pct === 'number' && Number.isFinite(g.change_pct)
          ? g.change_pct / 100
          : 0;
      gainer = { code: normalizeTicker(g.code), changePercent };
    }
  }

  if (egx30 === null && gainer === null) return null;

  return {
    egx30,
    gainer,
    asOf: new Date().toISOString(),
  };
}

/**
 * Fetches the live EGX30 index and top gainer from EGXBot's hero endpoint.
 */
export async function fetchEgxBotLiveHero(): Promise<EgxBotHeroData | null> {
  try {
    const res = await fetch(`${EGXBOT_BASE_URL}/live/hero`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const body = await res.json();
    return parseEgxBotHeroPayload(body);
  } catch {
    return null;
  }
}
