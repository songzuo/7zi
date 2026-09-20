// src/app/api/shop/orders/lookup/route.ts
// GET /api/shop/orders/lookup?email=xxx —— 按邮箱找回最近订单号（No-password 登录辅助）
// 安全：只返回 order_no / created_at / total_amount / currency（不含地址、电话等敏感字段）；
//       内存限流（同邮箱 10 分钟 5 次），防批量枚举。
import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByEmail } from '@/lib/shop-db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const lookupLimits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const win = now - 10 * 60 * 1000;
  const hits = (lookupLimits.get(key) || []).filter((t) => t > win);
  if (hits.length >= 5) {
    lookupLimits.set(key, hits);
    return true;
  }
  hits.push(now);
  lookupLimits.set(key, hits);
  return false;
}

export async function GET(request: NextRequest) {
  const email = (request.nextUrl.searchParams.get('email') || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: '邮箱格式不正确' }, { status: 400 });
  }
  if (rateLimited(email)) {
    return NextResponse.json(
      { success: false, error: '尝试过于频繁，请稍后再试', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  const orders = getOrdersByEmail(email);
  // 只返回最近 5 单的订单号级信息（敏感字段一律不带）
  const recent = orders
    .slice(-5)
    .reverse()
    .map((o) => ({
      order_no: o.order_no,
      created_at: o.created_at,
      total_amount: o.total_amount,
      currency: o.currency || 'USD',
    }));

  return NextResponse.json({
    success: true,
    email,
    count: recent.length,
    orders: recent,
  });
}
