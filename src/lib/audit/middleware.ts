/**
 * 审计日志中间件 - 自动捕获 API 请求
 * @module lib/audit/middleware
 * @version 1.12.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogger } from './audit-logger.js';
import type { AuditAction } from './types.js';

// ============================================================================
// 中间件配置
// ============================================================================

/**
 * 中间件选项
 */
export interface AuditMiddlewareOptions {
  /** 是否启用 */
  enabled?: boolean;
  /** 排除的路径 (支持通配符) */
  excludePaths?: string[];
  /** 需要审计的路径 (如果设置，只有匹配的路径会被审计) */
  includePaths?: string[];
  /** 自定义操作映射 */
  actionMap?: Record<string, AuditAction>;
  /** 是否记录请求体 */
  logRequestBody?: boolean;
  /** 是否记录响应体 */
  logResponseBody?: boolean;
  /** 请求体最大记录大小 (bytes) */
  maxBodySize?: number;
  /** 提取用户ID的函数 */
  extractUserId?: (request: NextRequest) => string | null | Promise<string | null>;
  /** 提取用户名的函数 */
  extractUsername?: (request: NextRequest) => string | null | Promise<string | null>;
}

// ============================================================================
// 中间件实现
// ============================================================================

/**
 * 创建审计日志中间件
 */
export function createAuditMiddleware(options: AuditMiddlewareOptions = {}) {
  const {
    enabled = process.env.AUDIT_LOG_ENABLED !== 'false',
    excludePaths = [
      '/health',
      '/metrics',
      '/api/health',
      '/favicon.ico',
      '/_next',
      '/static',
    ],
    includePaths,
    actionMap = {
      'POST': 'CREATE',
      'GET': 'READ',
      'PUT': 'UPDATE',
      'PATCH': 'UPDATE',
      'DELETE': 'DELETE',
    },
    logRequestBody = false,
    logResponseBody = false,
    maxBodySize = 1024,
    extractUserId,
    extractUsername,
  } = options;

  /**
   * 路径匹配检查
   */
  function shouldAuditPath(pathname: string): boolean {
    // 检查排除路径
    for (const excludePath of excludePaths) {
      if (pathnameMatch(pathname, excludePath)) {
        return false;
      }
    }

    // 如果设置了包含路径，检查是否匹配
    if (includePaths && includePaths.length > 0) {
      for (const includePath of includePaths) {
        if (pathnameMatch(pathname, includePath)) {
          return true;
        }
      }
      return false;
    }

    return true;
  }

  /**
   * 路径匹配函数 (支持通配符)
   */
  function pathnameMatch(pathname: string, pattern: string): boolean {
    // 转换通配符为正则表达式
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(pathname);
  }

  /**
   * 解析路径以获取资源信息
   */
  function parseResource(pathname: string): { resource: string; resourceId?: string } {
    const parts = pathname.split('/').filter(Boolean);

    if (parts.length === 0) {
      return { resource: 'unknown' };
    }

    // 跳过 /api 前缀
    if (parts[0] === 'api') {
      parts.shift();
    }

    if (parts.length === 0) {
      return { resource: 'api' };
    }

    const resource = parts[0];
    const resourceId = parts[1];

    return { resource, resourceId };
  }

  /**
   * 获取IP地址
   */
  function getClientIp(request: NextRequest): string | undefined {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
      return realIp;
    }

    return undefined;
  }

  /**
   * 获取用户代理
   */
  function getUserAgent(request: NextRequest): string | undefined {
    return request.headers.get('user-agent') || undefined;
  }

  /**
   * 截断数据
   */
  function truncateData(data: unknown, maxSize: number): string {
    if (data === null || data === undefined) {
      return '';
    }

    const str = JSON.stringify(data);
    if (str.length <= maxSize) {
      return str;
    }

    return str.substring(0, maxSize) + '...[truncated]';
  }

  /**
   * 中间件处理函数
   */
  return async function auditMiddleware(
    request: NextRequest
  ): Promise<NextResponse | null> {
    // 检查是否启用
    if (!enabled) {
      return null;
    }

    const pathname = request.nextUrl.pathname;

    // 检查是否需要审计
    if (!shouldAuditPath(pathname)) {
      return null;
    }

    const method = request.method;
    const action = actionMap[method] || 'READ';

    // 解析资源信息
    const { resource, resourceId } = parseResource(pathname);

    // 获取客户端信息
    const ipAddress = getClientIp(request);
    const userAgent = getUserAgent(request);

    // 提取用户信息
    const userId = extractUserId ? await extractUserId(request) : null;
    const username = extractUsername ? await extractUsername(request) : null;

    // 如果没有用户ID，跳过审计 (可以根据需求调整)
    if (!userId) {
      return null;
    }

    // 记录请求开始
    const startTime = Date.now();

    // 准备元数据
    const metadata: Record<string, unknown> = {
      method,
      pathname,
    };

    // 记录请求体 (如果启用)
    if (logRequestBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const body = await request.clone().json();
        metadata.requestBody = truncateData(body, maxBodySize);
      } catch (error) {
        // 忽略JSON解析错误
      }
    }

    // 返回null表示不拦截请求，让其他中间件和路由处理
    return null;
  };
}

// ============================================================================
// 审计响应包装器
// ============================================================================

/**
 * 包装NextResponse以记录响应
 */
export function wrapResponseForAudit(
  response: NextResponse,
  auditData: {
    userId: string;
    username?: string;
    action: AuditAction;
    resource: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  },
  options: { logResponseBody?: boolean; maxBodySize?: number } = {}
): NextResponse {
  const { logResponseBody = false, maxBodySize = 1024 } = options;

  // 克隆响应以读取body
  const clonedResponse = response.clone();

  // 异步记录审计日志
  (async () => {
    try {
      const auditLogger = getAuditLogger();

      // 准备最终元数据
      const metadata: Record<string, unknown> = {
        ...auditData.metadata,
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
      };

      // 记录响应体 (如果启用且成功)
      if (logResponseBody && clonedResponse.ok) {
        try {
          const body = await clonedResponse.clone().json();
          metadata.responseBody = JSON.stringify(body).substring(0, maxBodySize);
        } catch (error) {
          // 忽略JSON解析错误
        }
      }

      // 记录审计日志
      await auditLogger.log({
        userId: auditData.userId,
        username: auditData.username,
        action: auditData.action,
        resource: auditData.resource,
        resourceId: auditData.resourceId,
        status: clonedResponse.ok ? 'success' : 'failure',
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
        metadata,
        error: !clonedResponse.ok ? `HTTP ${clonedResponse.status}` : undefined,
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  })();

  return response;
}

// ============================================================================
// 实用函数
// ============================================================================

/**
 * 从JWT token提取用户ID
 */
export function extractUserIdFromToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    // 简单的JWT解析 (不验证签名)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.userId || payload.sub || null;
  } catch (error) {
    return null;
  }
}

/**
 * 从JWT token提取用户名
 */
export function extractUsernameFromToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.username || payload.name || null;
  } catch (error) {
    return null;
  }
}

// ============================================================================
// 预定义的中间件配置
// ============================================================================

/**
 * 默认中间件选项
 */
export const defaultAuditMiddlewareOptions: AuditMiddlewareOptions = {
  enabled: process.env.AUDIT_LOG_ENABLED !== 'false',
  excludePaths: [
    '/health',
    '/metrics',
    '/api/health',
    '/favicon.ico',
    '/_next',
    '/static',
  ],
  extractUserId: extractUserIdFromToken,
  extractUsername: extractUsernameFromToken,
};

/**
 * 创建默认审计中间件
 */
export const auditMiddleware = createAuditMiddleware(defaultAuditMiddlewareOptions);
