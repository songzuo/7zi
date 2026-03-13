import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";

// 创建 i18n 中间件
const i18nMiddleware = createMiddleware(routing);

/**
 * 安全头部配置
 */
const securityHeaders = {
  // 防止 Clickjacking
  'X-Frame-Options': 'DENY',
  // 防止 XSS 攻击
  'X-XSS-Protection': '1; mode=block',
  // 防止 MIME 类型 sniffing
  'X-Content-Type-Options': 'nosniff',
  // 引用者策略
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // 权限策略
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // 内容安全策略
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://plausible.io",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' blob: data: https:",
    "connect-src 'self' https://plausible.io https://umami.7zi.studio",
    "frame-src 'none'",
  ].join('; '),
};

/**
 * 不需要安全头部的路径
 */
const skipPaths = [
  '/api/health',
  '/api/health/ready',
  '/api/health/live',
  '/api/health/detailed',
];

/**
 * 组合中间件
 * 同时处理 i18n 和安全头部
 */
export default function middleware(request: NextRequest) {
  // 首先执行 i18n 中间件
  const response = i18nMiddleware(request);
  
  // 检查是否需要添加安全头部
  const pathname = request.nextUrl.pathname;
  const shouldSkipSecurity = skipPaths.some(path => pathname.startsWith(path));
  
  if (!shouldSkipSecurity) {
    // 添加安全头部
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }
  
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"]
};
