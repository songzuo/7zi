// src/app/api/shop/auth/email-login/route.ts
// POST /api/shop/auth/email-login —— 邮箱直接免密登录
// ----------------------------------------------------------------------------
// 架构简化：原「邮箱+订单号」登录需要先找回订单号再填写，环节冗余。
// 改为：只要该邮箱存在订单，输入邮箱即登录（免密）。
// 安全考量（综合分析后的缓解）：
//   · 必须「该邮箱下存在订单」才允许登录（无订单 → 拒绝，防任意邮箱刷号）
//   · 不返回订单号列表（防邮箱枚举泄单）；登录后在我的订单页可见
//   · 已有密码账号的邮箱 → 403 引导密码登录（防冒用，双因子语义保留在密码侧）
//   · 同邮箱 10 分钟 5 次限流；会话 30 天（与 guest 升级一致）
//   · 我的订单 API 不返回地址/电话等 PII，泄露面最小
import { NextRequest, NextResponse } from 'next/server';
import { getOrdersByEmail, attachOrdersToUser } from '@/lib/shop-db';
import { upgradeGuestUser } from '@/lib/auth/service-unified';
import { setAuthCookies } from '@/lib/api/utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

// 简单内存频率限制：同邮箱 10 分钟内最多 5 次登录尝试
const loginLimits = new Map<string, number[]>();
function rateLimited(email: string): boolean {
  const now = Date.now();
  const win = now - 10 * 60 * 1000;
  const hits = (loginLimits.get(email) || []).filter((t) => t > win);
  if (hits.length >= 5) {
    loginLimits.set(email, hits);
    return true;
  }
  hits.push(now);
  loginLimits.set(email, hits);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ success: false, error: '邮箱格式不正确' }, { status: 400 });
    }
    if (rateLimited(email)) {
      return NextResponse.json(
        { success: false, error: '尝试过于频繁，请稍后再试', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    // 前提：该邮箱下必须存在订单（免密登录的资格证明）
    const orders = getOrdersByEmail(email);
    if (orders.length === 0) {
      return NextResponse.json(
        {
          success: false,
          code: 'NO_ORDERS',
          error: '该邮箱未找到订单，请确认下单时使用的邮箱',
        },
        { status: 200 }
      );
    }

    // 建号/登录（复用 guest 升级逻辑：免密标记 + JWT 入库 + 30 天会话）
    const result = await upgradeGuestUser({ email });

    if (result.passwordProtected) {
      // 该邮箱已有密码账号：不自动登录，引导走密码登录（防冒用）
      return NextResponse.json({
        success: false,
        code: 'PASSWORD_ACCOUNT_EXISTS',
        error: '该邮箱已有密码账号，请使用密码登录',
        hasAccount: true,
      });
    }

    // 关联该邮箱全部历史订单（幂等，保证挂到用户账号下）
    attachOrdersToUser(email, result.user.id);

    const response = NextResponse.json({
      success: true,
      created: result.created,
      orderCount: orders.length,
      user: result.user,
      token: result.token,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
    });

    if (result.token && result.refreshToken) {
      setAuthCookies(response, result.token, result.refreshToken, true);
    }

    return response;
  } catch (e: any) {
    console.error('[auth/email-login] 邮箱免密登录失败:', e);
    return NextResponse.json(
      { success: false, error: e?.message || '登录失败，请稍后重试', code: 'INTERNAL' },
      { status: 500 }
    );
  }
}
