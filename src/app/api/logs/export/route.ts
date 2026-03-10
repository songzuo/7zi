/**
 * 日志导出接口 - 带认证和授权
 * 实现日志数据的导出功能，支持多种格式
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbTransport } from '@/lib/logger/database-transport';
import { verifyToken, extractToken, isAdmin } from '@/lib/security/auth';
import { createCsrfMiddleware } from '@/lib/security/csrf';
import { apiLogger } from '@/lib/logger';
import type { LogQuery } from '@/lib/logger/types';
import { Readable } from 'stream';

// ============================================
// GET /api/logs/export - 导出日志数据
// ============================================

export async function GET(request: NextRequest) {
  try {
    // 1. CSRF 保护检查 (可选，因为这是GET请求)
    // const csrfMiddleware = createCsrfMiddleware();
    // const csrfResult = await csrfMiddleware(request);
    // if (csrfResult) {
    //   return csrfResult;
    // }

    // 2. 认证检查 - 必须登录才能导出日志
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          code: 'AUTH_REQUIRED',
          message: 'You must be logged in to export logs'
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

    // 4. 授权检查 - 只有管理员可以导出日志
    if (!isAdmin(payload)) {
      return NextResponse.json(
        { 
          error: 'Admin access required', 
          code: 'ADMIN_REQUIRED',
          message: 'Only administrators can export logs',
          userRole: payload.role
        },
        { status: 403 }
      );
    }

    // 5. 解析查询参数
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'json').toLowerCase();
    const fileName = searchParams.get('fileName') || `logs-export-${new Date().toISOString().split('T')[0]}`;

    // 支持的格式
    const supportedFormats = ['json', 'csv'];
    if (!supportedFormats.includes(format)) {
      return NextResponse.json(
        {
          error: 'Unsupported format',
          message: `Supported formats: ${supportedFormats.join(', ')}`,
          requestedFormat: format,
        },
        { status: 400 }
      );
    }

    // 构建查询参数
    const query: LogQuery = {
      startTime: searchParams.get('startTime') || undefined,
      endTime: searchParams.get('endTime') || undefined,
      levels: searchParams.get('levels')?.split(',').filter(Boolean) as any[] | undefined,
      categories: searchParams.get('categories')?.split(',').filter(Boolean) as any[] | undefined,
      search: searchParams.get('search') || undefined,
      userId: searchParams.get('userId') || undefined,
      requestId: searchParams.get('requestId') || undefined,
      route: searchParams.get('route') || undefined,
      // 导出时默认获取所有匹配的日志，不分页
      page: 1,
      limit: 10000, // 设置一个合理的上限
      orderBy: (searchParams.get('orderBy') as 'timestamp' | 'level') || 'timestamp',
      order: (searchParams.get('order') as 'asc' | 'desc') || 'desc',
    };

    // 6. 查询日志数据
    const dbTransport = getDbTransport();
    const result = dbTransport.query(query);

    // 7. 根据格式生成导出数据
    let exportData: string;
    let contentType: string;
    let fileExtension: string;

    switch (format) {
      case 'json':
        exportData = JSON.stringify(result.logs, null, 2);
        contentType = 'application/json';
        fileExtension = 'json';
        break;
      
      case 'csv':
        exportData = convertLogsToCsv(result.logs);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      
      default:
        // 这不应该发生，因为我们已经验证了格式
        return NextResponse.json(
          { error: 'Unexpected error', message: 'Unsupported format' },
          { status: 500 }
        );
    }

    // 8. 记录审计日志
    apiLogger.audit('Logs exported by admin', {
      userId: payload.sub,
      userEmail: payload.email,
      format,
      fileName,
      logCount: result.logs.length,
      filters: {
        startTime: query.startTime,
        endTime: query.endTime,
        levels: query.levels,
        categories: query.categories,
        search: query.search,
      },
    });

    // 9. 返回导出文件
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Content-Disposition', `attachment; filename="${fileName}.${fileExtension}"`);
    headers.set('Content-Length', exportData.length.toString());

    return new NextResponse(exportData, {
      status: 200,
      headers,
    });
  } catch (error) {
    apiLogger.error('Failed to export logs', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================
// 辅助函数：将日志转换为CSV格式
// ============================================

function convertLogsToCsv(logs: any[]): string {
  if (logs.length === 0) {
    return 'id,timestamp,level,category,message,userId,requestId,route,errorName,errorMessage\n';
  }

  // CSV头
  const headers = ['id', 'timestamp', 'level', 'category', 'message', 'userId', 'requestId', 'route', 'errorName', 'errorMessage'];
  let csv = headers.join(',') + '\n';

  // 转义CSV字段（处理逗号、引号、换行符）
  const escapeCsvField = (field: any): string => {
    if (field === null || field === undefined) {
      return '';
    }
    
    const str = String(field);
    
    // 如果包含特殊字符，需要用双引号包围，并转义内部的双引号
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    
    return str;
  };

  // 转换每条日志
  for (const log of logs) {
    const row = [
      escapeCsvField(log.id),
      escapeCsvField(log.timestamp),
      escapeCsvField(log.level),
      escapeCsvField(log.category),
      escapeCsvField(log.message),
      escapeCsvField(log.userId),
      escapeCsvField(log.requestId),
      escapeCsvField(log.route),
      escapeCsvField(log.error?.name),
      escapeCsvField(log.error?.message),
    ];
    csv += row.join(',') + '\n';
  }

  return csv;
}