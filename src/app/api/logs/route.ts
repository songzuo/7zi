/**
 * 日志管理 API
 * 查询和删除日志，带认证和授权
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbTransport } from '@/lib/logger/database-transport';
import { verifyToken, extractToken, isAdmin } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import { apiLogger } from '@/lib/logger';
import type { LogLevel, LogCategory, LogQuery } from '@/lib/logger/types';
import {
  withErrorHandler,
  validationError,
  authError,
  forbiddenError,
  serverError,
  successResponse,
} from '@/lib/middleware';
import { AppError } from '@/lib/errors';

/**
 * 错误响应格式 (统一)
 * @typedef {Object} ApiErrorResponse
 * @property {string} error - 错误代码
 * @property {string} code - 错误代码
 * @property {string} message - 用户友好的错误消息
 * @property {string} timestamp - 时间戳
 * @property {string} [path] - 请求路径
 * @property {string} [requestId] - 请求ID
 */

// ============================================
// GET /api/logs - 查询日志
// ============================================

export const GET = withErrorHandler(async (request: NextRequest) => {
  // 可选认证检查 (查看日志可能需要登录)
  const token = extractToken(request);
  if (token) {
    const payload = await verifyToken(token);
    if (!payload) {
      return authError('Invalid authentication token', request);
    }
  }

  // 解析查询参数
  const { searchParams } = new URL(request.url);
  const query: LogQuery = {
    startTime: searchParams.get('startTime') || undefined,
    endTime: searchParams.get('endTime') || undefined,
    levels: searchParams.get('levels')?.split(',').filter(Boolean) as LogLevel[] | undefined,
    categories: searchParams.get('categories')?.split(',').filter(Boolean) as LogCategory[] | undefined,
    search: searchParams.get('search') || undefined,
    userId: searchParams.get('userId') || undefined,
    requestId: searchParams.get('requestId') || undefined,
    route: searchParams.get('route') || undefined,
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000),
    orderBy: (searchParams.get('orderBy') as 'timestamp' | 'level') || 'timestamp',
    order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
  };

  // 查询日志
  const dbTransport = getDbTransport();
  const result = dbTransport.query(query);

  return successResponse(result);
});

// ============================================
// DELETE /api/logs - 清理旧日志 (需要管理员权限)
// ============================================

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  // 1. CSRF 保护检查
  const csrfMiddleware = createCsrfMiddleware();
  const csrfResult = await csrfMiddleware(request);
  if (csrfResult) {
    return csrfResult;
  }

  // 2. 认证检查 - 必须登录
  const token = extractToken(request);
  if (!token) {
    return authError('Authentication required', request);
  }

  // 3. 验证 Token
  const payload = await verifyToken(token);
  if (!payload) {
    return authError('Invalid or expired token', request);
  }

  // 4. 授权检查 - 必须是管理员
  if (!isAdmin(payload)) {
    return forbiddenError('Admin access required to delete logs', request);
  }

  // 5. 解析参数
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);

  // 6. 验证参数合理性
  if (isNaN(days) || days < 1 || days > 365) {
    return validationError('Days must be between 1 and 365', 'days', request);
  }

  // 7. 执行删除操作
  const dbTransport = getDbTransport();
  const deleted = dbTransport.cleanup(days);

  // 8. 记录审计日志
  apiLogger.audit('Logs deleted by admin', {
    userId: payload.sub,
    userEmail: payload.email,
    days,
    deletedCount: deleted,
  });

  return successResponse({
    deleted,
    message: `Deleted ${deleted} log entries older than ${days} days`,
    deletedBy: payload.email,
    deletedAt: new Date().toISOString(),
  });
});
