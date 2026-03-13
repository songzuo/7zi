/**
 * 客户端错误日志 API
 * 接收并存储前端错误报告
 * 
 * @module api/log-error
 * @description 用于收集前端错误、异常上报的专用端点
 */

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken, extractToken, isAdmin } from '@/lib/security/auth';
import { apiLogger } from '@/lib/logger';

/**
 * 客户端错误日志请求体
 */
interface ClientErrorLog {
  message: string;
  stack?: string;
  componentStack?: string;
  digest?: string;
  timestamp: string;
  url?: string;
  userAgent?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * 验证错误日志请求体
 */
function validateClientErrorLog(body: unknown): ClientErrorLog | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const log = body as Partial<ClientErrorLog>;

  if (!log.message || typeof log.message !== 'string') {
    return null;
  }

  return {
    message: log.message,
    stack: log.stack,
    componentStack: log.componentStack,
    digest: log.digest,
    timestamp: log.timestamp || new Date().toISOString(),
    url: log.url,
    userAgent: log.userAgent,
    additionalInfo: log.additionalInfo,
  };
}

// ============================================
// POST /api/log-error - 记录客户端错误
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // 验证请求体
    const errorLog = validateClientErrorLog(body);
    if (!errorLog) {
      return NextResponse.json(
        {
          error: 'INVALID_PAYLOAD',
          message: '无效的错误日志格式',
        },
        { status: 400 }
      );
    }

    const requestId = uuidv4();

    // 记录到日志系统
    apiLogger.error(`[Client Error] ${errorLog.message}`, {
      requestId,
      type: 'client_error',
      message: errorLog.message,
      stack: errorLog.stack,
      componentStack: errorLog.componentStack,
      digest: errorLog.digest,
      timestamp: errorLog.timestamp,
      url: errorLog.url,
      userAgent: errorLog.userAgent,
      additionalInfo: errorLog.additionalInfo,
    });

    // 返回成功响应
    return NextResponse.json({
      success: true,
      requestId,
      message: '错误已记录',
    });
  } catch (error) {
    apiLogger.error('Failed to process client error log', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: '处理错误日志失败',
      },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/log-error - 获取错误统计 (仅管理员)
// ============================================

export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: '需要管理员权限',
        },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || !isAdmin(payload)) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: '没有权限访问',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 从数据库获取错误日志
    const dbTransport = await import('@/lib/logger/database-transport').then(m => m.getDbTransport());
    
    if (!dbTransport) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: { total: 0, limit, offset },
      });
    }

    const logs = await dbTransport.query({
      categories: ['error', 'client_error'],
      limit,
      offset,
    });

    const total = await dbTransport.count({
      categories: ['error', 'client_error'],
    });

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit,
        offset,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    apiLogger.error('Failed to fetch client error logs', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: '获取错误日志失败',
      },
      { status: 500 }
    );
  }
}
