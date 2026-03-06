import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

/**
 * CSRF Token 生成端点
 * 
 * 安全目的：为表单提供 CSRF 保护
 * 生成随机 token 并存储在 httpOnly cookie 中
 */

export async function GET() {
  try {
    // 生成随机 CSRF token
    const csrfToken = randomBytes(32).toString('hex');
    
    // 设置 cookie（httpOnly 保护，客户端 JS 无法访问）
    const cookieStore = await cookies();
    cookieStore.set('csrf_token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60, // 1 小时有效期
    });

    return NextResponse.json({ csrfToken });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: '生成 CSRF token 失败' },
      { status: 500 }
    );
  }
}