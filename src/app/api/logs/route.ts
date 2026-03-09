/**
 * 日志删除接口 - 带认证和授权
 * 修复 P0 安全问题：添加管理员权限检查
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbTransport } from '@/lib/logger/database-transport';
import { verifyToken, extractToken, isAdmin } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import { apiLogger } from '@/lib/logger';
import type { LogLevel, LogCategory, LogQuery } from '@/lib/logger/types';

// ============================================
// GET /api/logs - 查询日志
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 可选：添加认证检查 (查看日志可能需要登录)
    const token = extractToken(request);
    if (token) {
      const payload = await verifyToken(token);
      if (!payload) {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
    }

    // 解析查询参数
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

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    apiLogger.error('Failed to query logs', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to query logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE /api/logs - 清理旧日志 (需要管理员权限)
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    // 1. CSRF 保护检查
    const csrfMiddleware = createCsrfMiddleware();
    const csrfResult = await csrfMiddleware(request);
    if (csrfResult) {
      return csrfResult;
    }

    // 2. 认证检查 - 必须登录
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to delete logs'
        },
        { status: 401 }
      );
    }

    // 3. 验证 Token
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { 
          error: 'Invalid or expired token', 
          code: 'AUTH_INVALID',
          message: 'Please log in again'
        },
        { status: 401 }
      );
    }

    // 4. 授权检查 - 必须是管理员
    if (!isAdmin(payload)) {
      return NextResponse.json(
        { 
          error: 'Admin access required', 
          code: 'ADMIN_REQUIRED',
          message: 'Only administrators can delete logs',
          userRole: payload.role
        },
        { status: 403 }
      );
    }

    // 5. 解析参数
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // 6. 验证参数合理性
    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json(
        {
          error: 'Invalid days parameter',
          message: 'Days must be between 1 and 365',
        },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      data: {
        deleted,
        message: `Deleted ${deleted} log entries older than ${days} days`,
        deletedBy: payload.email,
        deletedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    apiLogger.error('Failed to cleanup logs', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to cleanup logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
