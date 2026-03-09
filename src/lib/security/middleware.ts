/**
 * 安全中间件模块
 * 提供输入验证、速率限制、请求净化等安全功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityLogger } from '@/lib/logger';

// 速率限制配置
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

// 内存存储 (生产环境应使用 Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * 速率限制中间件
 */
export function rateLimit(config: RateLimitConfig) {
  const { windowMs, maxRequests, message = 'Too many requests' } = config;

  return (req: NextRequest): NextResponse | null => {
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';
    const key = `rate-limit:${ip}:${req.nextUrl.pathname}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return null;
    }

    if (record.count >= maxRequests) {
      return NextResponse.json(
        { error: message },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((record.resetTime - now) / 1000)),
          },
        }
      );
    }

    record.count++;
    return null;
  };
}

/**
 * 输入净化 - 移除潜在的恶意字符
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '')
    .trim();
}

/**
 * 递归净化对象
 */
export function sanitizeObject<T>(obj: T): T {
  if (typeof obj === 'string') {
    return sanitizeInput(obj) as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as T;
  }

  if (obj && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // 检查危险键名
      if (key.startsWith('$') || key.includes('__proto__') || key.includes('constructor')) {
        continue;
      }
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * SQL 注入检测
 */
export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE)\b)/i,
    /(--)|(\/\*)|(\*\/)/,
    /(\bOR\b|\bAND\b)\s*['"]?\d+['"]?\s*=\s*['"]?\d+/i,
    /UNION\s+SELECT/i,
    /'\s*(OR|AND)\s*'/i,
  ];

  return sqlPatterns.some((pattern) => pattern.test(input));
}

/**
 * XSS 检测
 */
export function detectXss(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /expression\s*\(/i,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * 安全验证中间件
 */
export function securityMiddleware(req: NextRequest): NextResponse | null {
  const url = req.nextUrl;

  // 1. 路径遍历检测
  if (url.pathname.includes('..') || url.pathname.includes('%2e%2e')) {
    return NextResponse.json(
      { error: 'Invalid path' },
      { status: 400 }
    );
  }

  // 2. 检查 URL 参数
  const searchParams = url.searchParams;
  for (const [key, value] of searchParams.entries()) {
    if (detectSqlInjection(value) || detectXss(value)) {
      securityLogger.warn(`Suspicious parameter detected: ${key}=${value}`);
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }
  }

  return null;
}

/**
 * 安全响应头设置
 */
export function setSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  return response;
}

/**
 * 创建 API 安全中间件
 */
export function createApiSecurityMiddleware() {
  const rateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 分钟
    maxRequests: 100, // 每分钟最多 100 请求
  });

  return (req: NextRequest): NextResponse | null => {
    // 安全检查
    const securityResult = securityMiddleware(req);
    if (securityResult) return securityResult;

    // 速率限制
    const rateLimitResult = rateLimiter(req);
    if (rateLimitResult) return rateLimitResult;

    return null;
  };
}

/**
 * 请求日志记录
 */
export function logRequest(req: NextRequest, _response: NextResponse): void {
  const forwardedFor = req.headers.get('x-forwarded-for');
  const _ip = forwardedFor ? forwardedFor.split(',')[0].trim() : req.headers.get('x-real-ip') || 'unknown';

  // Note: In production, integrate with proper logging system (e.g., winston, pino)
  // via lib/logger or monitoring service
  // const log = {
  //   timestamp: new Date().toISOString(),
  //   method: req.method,
  //   path: req.nextUrl.pathname,
  //   status: response.status,
  //   ip,
  //   userAgent: req.headers.get('user-agent'),
  // };
}

export type { RateLimitConfig };