/**
 * API 安全中间件
 * 统一处理认证、CSRF 保护、安全头等
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAuthMiddleware } from './auth';
import { createCsrfMiddleware, addCsrfHeaders } from './csrf';
import { setSecurityHeaders } from './middleware';

// ============================================
// 安全中间件配置
// ============================================

export interface SecurityConfig {
  /** 需要认证 */
  auth?: boolean;
  /** 需要的角色 */
  roles?: Array<'admin' | 'user' | 'service'>;
  /** 需要的权限 */
  permissions?: string[];
  /** CSRF 保护 */
  csrf?: boolean;
  /** 安全响应头 */
  headers?: boolean;
}

const defaultConfig: SecurityConfig = {
  auth: false,
  csrf: true,
  headers: true,
};

// ============================================
// 统一安全中间件
// ============================================

/**
 * 创建统一的安全中间件
 */
export function createSecurityMiddleware(config: SecurityConfig = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (request: NextRequest): Promise<NextResponse | null> => {
    // 1. 认证检查
    if (finalConfig.auth) {
      const authMiddleware = createAuthMiddleware({
        roles: finalConfig.roles,
        permissions: finalConfig.permissions,
      });
      
      const authResult = await authMiddleware(request);
      if (authResult) {
        return authResult;
      }
    }

    // 2. CSRF 保护检查
    if (finalConfig.csrf) {
      const csrfMiddleware = createCsrfMiddleware();
      const csrfResult = await csrfMiddleware(request);
      if (csrfResult) {
        return csrfResult;
      }
    }

    return null;
  };
}

// ============================================
// API 处理器包装器
// ============================================

/**
 * 包装 API 处理器，自动应用安全中间件
 */
export function withSecurity<T extends NextResponse>(
  handler: (request: NextRequest) => Promise<T>,
  config: SecurityConfig = {}
) {
  const middleware = createSecurityMiddleware(config);

  return async (request: NextRequest): Promise<T | NextResponse> => {
    // 运行安全中间件
    const securityResult = await middleware(request);
    if (securityResult) {
      return securityResult as T;
    }

    // 执行处理器
    const response = await handler(request);

    // 添加安全头
    if (config.headers !== false) {
      setSecurityHeaders(response);
      addCsrfHeaders(response);
    }

    return response;
  };
}

// ============================================
// 预定义的安全配置
// ============================================

/**
 * 公开端点 (仅需 CSRF 保护和安全头)
 */
export const publicSecurity = createSecurityMiddleware({
  auth: false,
  csrf: true,
  headers: true,
});

/**
 * 认证端点 (需要登录)
 */
export const authSecurity = createSecurityMiddleware({
  auth: true,
  csrf: true,
  headers: true,
});

/**
 * 管理员端点 (需要管理员权限)
 */
export const adminSecurity = createSecurityMiddleware({
  auth: true,
  roles: ['admin'],
  csrf: true,
  headers: true,
});

/**
 * 服务端点 (仅服务间通信)
 */
export const serviceSecurity = createSecurityMiddleware({
  auth: true,
  roles: ['service'],
  csrf: false, // 服务间调用通常不需要 CSRF
  headers: true,
});

// ============================================
// 辅助函数
// ============================================

/**
 * 检查请求是否通过安全验证
 * 用于在处理器内部进行额外的安全检查
 */
export async function validateSecurity(
  request: NextRequest,
  config: SecurityConfig = {}
): Promise<{ valid: boolean; error?: NextResponse }> {
  const middleware = createSecurityMiddleware(config);
  const result = await middleware(request);

  if (result) {
    return { valid: false, error: result };
  }

  return { valid: true };
}

/**
 * 获取请求的用户信息
 */
export function getRequestUser(request: NextRequest) {
  return {
    id: request.headers.get('x-user-id'),
    email: request.headers.get('x-user-email'),
    role: request.headers.get('x-user-role'),
  };
}
