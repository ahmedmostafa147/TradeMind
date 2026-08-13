import { NextResponse } from 'next/server';

import { fetchEgxBotLiveHero } from '@/lib/egxbot-fetch';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET() {
  const heroData = await fetchEgxBotLiveHero();

  if (heroData === null) {
    return NextResponse.json(
      { ok: false, reason: 'فشل جلب المؤشرات الحية من المصدر' },
      { status: 502 }
    );
  }

  return NextResponse.json(
    { ok: true, data: heroData },
    {
      headers: {
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}
