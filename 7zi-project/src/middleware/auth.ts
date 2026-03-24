/**
 * Authentication Middleware
 * 认证中间件 - 保护敏感 API 端点
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJwtToken } from '@/lib/auth/service';
import logger from '@/lib/logger';

// ============================================================================
// Configuration
// ============================================================================

// 需要认证的 API 路径
export const PROTECTED_PATHS = [
  '/api/backup',
  '/api/export',
  '/api/status',
];

// 公开路径（不需要认证）
export const PUBLIC_PATHS = [
  '/api/health',
  '/api/auth',
  '/api/github',
];

// ============================================================================
// Token Verification
// ============================================================================

/**
 * 从请求中提取 JWT token
 */
function extractToken(request: NextRequest): string | null {
  // 1. 从 Authorization header 中提取
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // 2. 从查询参数中提取
  const tokenParam = request.nextUrl.searchParams.get('token');
  if (tokenParam) {
    return tokenParam;
  }

  // 3. 从 cookie 中提取
  const tokenCookie = request.cookies.get('auth_token');
  if (tokenCookie?.value) {
    return tokenCookie.value;
  }

  return null;
}

// ============================================================================
// Authentication Check
// ============================================================================

/**
 * 验证请求是否已认证
 */
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = extractToken(request);

  if (!token) {
    return false;
  }

  try {
    const userContext = await verifyJwtToken(token);
    return userContext !== null;
  } catch (error) {
    logger.error('Token verification failed', { error });
    return false;
  }
}

/**
 * 验证请求是否已认证，并返回用户信息
 */
export async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean;
  userId?: string;
  error?: string;
}> {
  const token = extractToken(request);

  if (!token) {
    return {
      success: false,
      error: 'No authentication token provided',
    };
  }

  try {
    const userContext = await verifyJwtToken(token);

    if (!userContext || !userContext.userId) {
      return {
        success: false,
        error: 'Invalid authentication token',
      };
    }

    return {
      success: true,
      userId: userContext.userId,
    };
  } catch (error) {
    logger.error('Authentication failed', { error });
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * 创建认证中间件响应
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    { status: 401 }
  );
}

/**
 * 检查路径是否需要认证
 */
export function requiresAuthentication(pathname: string): boolean {
  // 检查是否是受保护的路径
  const isProtected = PROTECTED_PATHS.some(protectedPath =>
    pathname.startsWith(protectedPath)
  );

  // 检查是否是公开路径
  const isPublic = PUBLIC_PATHS.some(publicPath =>
    pathname.startsWith(publicPath)
  );

  return isProtected && !isPublic;
}

/**
 * API 路由认证辅助函数
 * 在 API 路由中直接调用
 */
export async function withAuth(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const auth = await authenticateRequest(request);

  if (!auth.success) {
    return createUnauthorizedResponse(auth.error || 'Unauthorized');
  }

  // 将用户信息添加到请求头中（供后续处理使用）
  const response = await handler();
  response.headers.set('X-User-Id', auth.userId!);

  return response;
}

// ============================================================================
// Rate Limiting Configuration
// ============================================================================

/**
 * 速率限制配置
 */
export const RATE_LIMIT_CONFIG = {
  // WebSocket 连接速率限制
  websocket: {
    maxConnections: 100, // 每分钟最多 100 个新连接
    windowMs: 60 * 1000, // 1 分钟窗口
  },

  // API 请求速率限制
  api: {
    maxRequests: 60, // 每分钟最多 60 个请求
    windowMs: 60 * 1000, // 1 分钟窗口
  },

  // 严格速率限制（针对敏感操作）
  strict: {
    maxRequests: 10, // 每分钟最多 10 个请求
    windowMs: 60 * 1000, // 1 分钟窗口
  },
} as const;

// ============================================================================
// In-Memory Rate Limiting
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * 检查速率限制
 */
export function checkRateLimit(
  identifier: string,
  config: typeof RATE_LIMIT_CONFIG[keyof typeof RATE_LIMIT_CONFIG]
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  // 如果没有记录或已过期，创建新记录
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(identifier, newEntry);

    // 根据配置类型获取最大请求数/连接数
    const maxLimit = 'maxRequests' in config ? config.maxRequests : config.maxConnections;

    return {
      allowed: true,
      remaining: maxLimit - 1,
      resetTime: newEntry.resetTime,
    };
  }

  // 根据配置类型获取最大请求数/连接数
  const maxLimit = 'maxRequests' in config ? config.maxRequests : config.maxConnections;

  // 检查是否超过限制
  if (entry.count >= maxLimit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // 增加计数
  entry.count++;
  return {
    allowed: true,
    remaining: maxLimit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * 获取速率限制标识符
 */
export function getRateLimitIdentifier(request: NextRequest): string {
  // 优先使用用户 ID
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // 使用 IP 地址
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';

  return `ip:${ip}`;
}

/**
 * 速率限制中间件
 */
export async function withRateLimit(
  request: NextRequest,
  config: typeof RATE_LIMIT_CONFIG[keyof typeof RATE_LIMIT_CONFIG]
): Promise<{ allowed: boolean; response?: NextResponse }> {
  const identifier = getRateLimitIdentifier(request);
  const result = checkRateLimit(identifier, config);

  if (!result.allowed) {
    const response = NextResponse.json(
      {
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      },
      { status: 429 }
    );

    const maxLimit = 'maxRequests' in config ? config.maxRequests : config.maxConnections;
    response.headers.set('X-RateLimit-Limit', maxLimit.toString());
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
    response.headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());

    return { allowed: false, response };
  }

  return { allowed: true };
}

// ============================================================================
// Combined Middleware
// ============================================================================

/**
 * 组合认证和速率限制
 */
export async function withAuthAndRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  rateLimitConfig?: typeof RATE_LIMIT_CONFIG[keyof typeof RATE_LIMIT_CONFIG]
): Promise<NextResponse> {
  // 首先检查认证
  const auth = await authenticateRequest(request);
  if (!auth.success) {
    return createUnauthorizedResponse(auth.error || 'Unauthorized');
  }

  // 检查速率限制（如果提供了配置）
  if (rateLimitConfig) {
    const rateLimitResult = await withRateLimit(request, rateLimitConfig);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!;
    }
  }

  // 执行处理函数
  const response = await handler();
  response.headers.set('X-User-Id', auth.userId!);

  return response;
}
