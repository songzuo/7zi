/**
 * 日志查询 API
 * Log Query API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbTransport } from '@/lib/logger/database-transport';
import type { LogQuery, LogLevel, LogCategory } from '@/lib/logger/types';

// ============================================
// GET /api/logs - 查询日志
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

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
    console.error('Failed to query logs:', error);
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
// DELETE /api/logs - 清理旧日志
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    // 验证权限 (需要管理员)
    // TODO: 添加权限检查

    const dbTransport = getDbTransport();
    const deleted = dbTransport.cleanup(days);

    return NextResponse.json({
      success: true,
      data: {
        deleted,
        message: `Deleted ${deleted} log entries older than ${days} days`,
      },
    });
  } catch (error) {
    console.error('Failed to cleanup logs:', error);
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