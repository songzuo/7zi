// src/app/api/shop/currency/route.ts
// GET /api/shop/currency —— 汇率 + 该访客默认货币（IP 国家检测）
import { NextRequest, NextResponse } from 'next/server';
import { getCurrencyRates, defaultCurrencyForIp } from '@/lib/currency-rates';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const [rates, ipInfo] = await Promise.all([
      getCurrencyRates(),
      defaultCurrencyForIp(request.headers),
    ]);

    return NextResponse.json({
      success: true,
      base: 'USD' as const,
      rates: rates.rates,
      defaultCurrency: ipInfo.currency,
      ipCountry: ipInfo.country,
      updatedAt: rates.updatedAt,
      source: rates.source,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        success: false,
        error: e?.message || '获取汇率失败',
        rates: { GHS: 15.2 },
        defaultCurrency: 'USD',
      },
      { status: 500 }
    );
  }
}
