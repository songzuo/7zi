// src/app/api/shop/checkout/upgrade/route.ts
// Guest → 账号 一键升级（免密）：
//   首次访客下单成功后，用「邮箱 + 订单号」验证 → 建号/登录 → 关联历史订单。
//   已有密码账号的邮箱拒绝自动登录（防冒用），提示走密码登录。
import { NextRequest, NextResponse } from 'next/server';
import { verifyOrderOwnership, getOrdersByEmail, attachOrdersToUser } from '@/lib/shop-db';
import { upgradeGuestUser } from '@/lib/auth/service-unified';
import { setAuthCookies } from '@/lib/api/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// 简单内存频率限制：同邮箱 10 分钟内最多 5 次升级尝试（防爆破/刷号）
const upgradeLimits = new Map<string, number[]>();
function rateLimited(email: string): boolean {
  const now = Date.now();
  const win = now - 10 * 60 * 1000;
  const hits = (upgradeLimits.get(email) || []).filter((t) => t > win);
  if (hits.length >= 5) {
    upgradeLimits.set(email, hits);
    return true;
  }
  hits.push(now);
  upgradeLimits.set(email, hits);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const orderNo = String(body?.order_no || '').trim();
    const name = String(body?.name || '').trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: '邮箱格式不正确' }, { status: 400 });
    }
    if (!orderNo) {
      return NextResponse.json({ success: false, error: '缺少订单号' }, { status: 400 });
    }
    if (rateLimited(email)) {
      return NextResponse.json(
        { success: false, error: '尝试过于频繁，请稍后再试', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    // 双因子验证：订单号存在 且 属于该邮箱（防冒用他人订单）
    if (!verifyOrderOwnership(orderNo, email)) {
      return NextResponse.json(
        { success: false, error: '订单信息不匹配，无法创建账号', code: 'ORDER_MISMATCH' },
        { status: 403 }
      );
    }

    const result = await upgradeGuestUser({ email, name });

    if (result.passwordProtected) {
      // 该邮箱已有密码账号：不自动登录，引导走密码登录（防冒用）
      return NextResponse.json({
        success: false,
        code: 'PASSWORD_ACCOUNT_EXISTS',
        error: '该邮箱已有账号，请使用密码登录',
        hasAccount: true,
      });
    }

    // 关联该邮箱全部历史订单（幂等）
    const linked = attachOrdersToUser(email, result.user.id);
    const orders = getOrdersByEmail(email);

    const response = NextResponse.json({
      success: true,
      created: result.created,
      linkedOrders: linked,
      orderCount: orders.length,
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    });

    // 写入登录态 cookie（复用现有 auth 体系）
    if (result.token && result.refreshToken) {
      setAuthCookies(response, result.token, result.refreshToken, true);
    }

    return response;
  } catch (e: any) {
    console.error('[checkout/upgrade] 升级注册失败:', e);
    return NextResponse.json(
      { success: false, error: e?.message || '升级注册失败', code: 'INTERNAL' },
      { status: 500 }
    );
  }
}
