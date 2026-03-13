/**
 * 认证中间件 - 专门用于 API 路由
 * 提供 JWT 验证、速率限制、错误处理的一体化中间件
 * 
 * @module lib/middleware/auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { authLogger, securityLogger } from '@/lib/logger';
import {
  verifyToken,
  extractToken,
  type User,
  type TokenPayload,
} from '@/lib/security/auth';
import { rateLimit, type RateLimitConfig } from '@/lib/security/middleware';
import { getCsrfTokenFromHeader } from '@/lib/security/csrf';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// 中间件选项
// ============================================

export interface AuthOptions {
  /** 需要的角色 */
  roles?: User['role'][];
  /** 需要的权限 */
  permissions?: string[];
  /** 是否可选认证 (可选时不阻止请求，但会注入用户信息) */
  optional?: boolean;
  /** 是否需要 CSRF 验证 (仅 POST/PUT/DELETE) */
  csrf?: boolean;
  /** 速率限制配置 */
  rateLimit?: RateLimitConfig | false;
  /** 自定义错误消息 */
  messages?: {
    unauthorized?: string;
    forbidden?: string;
    rateLimited?: string;
  };
}

// 默认错误消息
const defaultMessages = {
  unauthorized: 'Authentication required',
  forbidden: 'Insufficient permissions',
  rateLimited: 'Too many requests, please try again later',
};

// ============================================
// 认证中间件
// ============================================

/**
 * 创建认证中间件 - 用于保护 API 路由
 * 
 * @example
 * ```ts
 * // 简单使用 - 仅验证 token
 * export const GET = withAuth(async (req) => { ... });
 * 
 * // 角色验证
 * export const POST = withAuth({ roles: ['admin'] })(async (req) => { ... });
 * 
 * // 权限验证
 * export const PUT = withAuth({ permissions: ['write'] })(async (req) => { ... });
 * 
 * // 所有选项
 * export const DELETE = withAuth({
 *   roles: ['admin'],
 *   permissions: ['delete'],
 *   csrf: true,
 *   rateLimit: { windowMs: 60000, maxRequests: 10 },
 * })(async (req) => { ... });
 * ```
 */
export function withAuth(options: AuthOptions = {}) {
  const {
    roles,
    permissions,
    optional = false,
    csrf = false,
    rateLimit: rateLimitConfig = false,
    messages = {},
  } = options;

  const msg = { ...defaultMessages, ...messages };

  return async function authMiddleware(
    handler: (request: NextRequest, context: { user: TokenPayload }) => Promise<Response>
  ) {
    return async (request: NextRequest) => {
      const requestId = request.headers.get('x-request-id') || uuidv4();
      
      // 1. 速率限制检查
      if (rateLimitConfig) {
        const rateLimitMiddleware = rateLimit(rateLimitConfig);
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
          || request.headers.get('x-real-ip') 
          || 'unknown';
        const rateLimitResult = rateLimitMiddleware(request);
        if (rateLimitResult) {
          securityLogger.warn(`Rate limit exceeded: ${ip}`, { requestId });
          return rateLimitResult;
        }
      }

      // 2. CSRF 验证 (对于非 GET 请求)
      if (csrf && request.method !== 'GET') {
        const csrfValid = getCsrfTokenFromHeader(request);
        if (!csrfValid) {
          authLogger.warn('CSRF token validation failed', { requestId, path: request.nextUrl.pathname });
          return NextResponse.json(
            { error: 'Invalid CSRF token', code: 'CSRF_INVALID' },
            { status: 403 }
          );
        }
      }

      // 3. JWT 验证
      const token = extractToken(request);
      
      if (!token) {
        if (optional) {
          // 可选认证：继续但不注入用户信息
          return handler(request, { user: null as unknown as TokenPayload });
        }
        
        authLogger.warn('No authentication token provided', { 
          requestId, 
          path: request.nextUrl.pathname,
          method: request.method 
        });
        
        return NextResponse.json(
          { error: msg.unauthorized, code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      // 验证 token
      const payload = await verifyToken(token);
      
      if (!payload) {
        authLogger.warn('Invalid or expired token', { 
          requestId, 
          path: request.nextUrl.pathname 
        });
        
        return NextResponse.json(
          { error: 'Invalid or expired token', code: 'AUTH_INVALID' },
          { status: 401 }
        );
      }

      // 4. 角色验证
      if (roles && !roles.includes(payload.role)) {
        authLogger.warn('Insufficient role', { 
          requestId, 
          userId: payload.sub, 
          userRole: payload.role,
          requiredRoles: roles 
        });
        
        return NextResponse.json(
          { error: msg.forbidden, code: 'AUTH_FORBIDDEN' },
          { status: 403 }
        );
      }

      // 5. 权限验证
      if (permissions) {
        const userPermissions = payload.permissions || [];
        const hasPermission = permissions.some(p => userPermissions.includes(p)) || payload.role === 'admin';
        
        if (!hasPermission) {
          authLogger.warn('Insufficient permissions', { 
            requestId, 
            userId: payload.sub, 
            userPermissions,
            requiredPermissions: permissions 
          });
          
          return NextResponse.json(
            { error: msg.forbidden, code: 'AUTH_FORBIDDEN' },
            { status: 403 }
          );
        }
      }

      // 6. 将用户信息注入请求头
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.sub);
      requestHeaders.set('x-user-email', payload.email);
      requestHeaders.set('x-user-role', payload.role);
      requestHeaders.set('x-request-id', requestId);

      // 创建修改后的请求
      const modifiedRequest = new NextRequest(request, {
        headers: requestHeaders,
      });

      // 记录认证成功
      authLogger.debug('Authentication successful', {
        requestId,
        userId: payload.sub,
        role: payload.role,
        path: request.nextUrl.pathname,
      });

      // 7. 调用处理函数
      try {
        return await handler(modifiedRequest, { user: payload });
      } catch (error) {
        // 统一错误处理
        authLogger.error('Handler error', error, { requestId });
        throw error;
      }
    };
  };
}

// ============================================
// 快速认证检查
// ============================================

/**
 * 从请求中获取当前用户 (需要在 withAuth 之后使用)
 * 
 * @example
 * ```ts
 * export const GET = withAuth(async (req, { user }) => {
 *   const currentUser = getCurrentUser(req);
 *   return json({ user: currentUser });
 * });
 * ```
 */
export function getCurrentUser(request: NextRequest): TokenPayload | null {
  const userId = request.headers.get('x-user-id');
  const userEmail = request.headers.get('x-user-email');
  const userRole = request.headers.get('x-user-role') as User['role'] | null;

  if (!userId || !userEmail) {
    return null;
  }

  return {
    sub: userId,
    email: userEmail,
    role: userRole || 'user',
  };
}

// ============================================
// 认证辅助函数
// ============================================

/**
 * 检查用户是否有权限
 */
export function checkPermission(user: TokenPayload, permission: string): boolean {
  if (user.role === 'admin') return true;
  return user.permissions?.includes(permission) ?? false;
}

/**
 * 检查用户是否是管理员
 */
export function checkAdmin(user: TokenPayload): boolean {
  return user.role === 'admin';
}

// ============================================
// 预设中间件
// ============================================

/**
 * 需要管理员角色
 */
export const requireAdmin = withAuth({ roles: ['admin'] });

/**
 * 需要登录 (任何有效用户)
 */
export const requireAuth = withAuth();

/**
 * 可选认证 (用户可能未登录)
 */
export const optionalAuth = withAuth({ optional: true });

/**
 * 速率限制中间件 (通用)
 * 默认: 60秒内 100 次请求
 */
export const withRateLimit = (config?: RateLimitConfig) => 
  withAuth({ rateLimit: config || { windowMs: 60000, maxRequests: 100 } });

/**
 * CSRF 保护中间件
 */
export const withCsrf = withAuth({ csrf: true });

/**
 * 管理员 + 速率限制
 */
export const adminRateLimited = withAuth({ 
  roles: ['admin'], 
  rateLimit: { windowMs: 60000, maxRequests: 200 } 
});

export default withAuth;
