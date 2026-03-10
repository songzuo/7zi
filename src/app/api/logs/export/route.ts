/**
 * 日志导出接口
 * GET /api/logs/export - 导出日志数据
 * 支持格式: JSON (默认), CSV
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDbTransport } from '@/lib/logger/database-transport';
import { verifyToken, extractToken } from '@/lib/security/auth';
import { apiLogger } from '@/lib/logger';
import type { LogLevel, LogCategory, LogQuery } from '@/lib/logger/types';

// ============================================
// Types
// ============================================

export type ExportFormat = 'json' | 'csv';

export interface LogsExportQuery {
  startDate?: string;
  endDate?: string;
  level?: LogLevel;
  levels?: LogLevel[];
  category?: LogCategory;
  categories?: LogCategory[];
  search?: string;
  userId?: string;
  requestId?: string;
  route?: string;
  limit?: number;
  format?: ExportFormat;
}

// ============================================
// Helper Functions
// ============================================

/**
 * 将日志数据转换为 CSV 格式
 */
function convertToCSV(logs: Array<Record<string, unknown>>): string {
  if (logs.length === 0) {
    return '';
  }

  // 定义 CSV 列顺序
  const columns = ['id', 'timestamp', 'level', 'category', 'message', 'userId', 'requestId', 'route'];
  
  // CSV 头部
  const header = columns.join(',');
  
  // CSV 行数据
  const rows = logs.map(log => {
    return columns.map(col => {
      const value = log[col];
      if (value === undefined || value === null) {
        return '';
      }
      // 处理包含逗号、引号或换行的值
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * 获取导出文件名
 */
function getExportFilename(format: ExportFormat): string {
  const date = new Date().toISOString().split('T')[0];
  return `logs-export-${date}.${format}`;
}

/**
 * 设置响应头用于文件下载
 */
function setDownloadHeaders(response: NextResponse, filename: string, format: ExportFormat): NextResponse {
  const contentType = format === 'csv' ? 'text/csv' : 'application/json';
  
  response.headers.set('Content-Type', `${contentType}; charset=utf-8`);
  response.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

// ============================================
// GET /api/logs/export - 导出日志
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 可选：认证检查
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
    const format = (searchParams.get('format') as ExportFormat) || 'json';
    
    // 验证导出格式
    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid format',
          message: 'Format must be "json" or "csv"',
        },
        { status: 400 }
      );
    }

    // 解析日志级别参数
    const levelParam = searchParams.get('level');
    const levelsParam = searchParams.get('levels');
    
    let levels: LogLevel[] | undefined;
    if (levelsParam) {
      levels = levelsParam.split(',').filter(Boolean) as LogLevel[];
    } else if (levelParam) {
      levels = [levelParam as LogLevel];
    }

    // 解析分类参数
    const categoryParam = searchParams.get('category');
    const categoriesParam = searchParams.get('categories');
    
    let categories: LogCategory[] | undefined;
    if (categoriesParam) {
      categories = categoriesParam.split(',').filter(Boolean) as LogCategory[];
    } else if (categoryParam) {
      categories = [categoryParam as LogCategory];
    }

    // 解析日期参数
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // 验证日期格式
    if (startDate && isNaN(Date.parse(startDate))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid startDate format',
          message: 'startDate must be a valid ISO 8601 date string',
        },
        { status: 400 }
      );
    }

    if (endDate && isNaN(Date.parse(endDate))) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid endDate format',
          message: 'endDate must be a valid ISO 8601 date string',
        },
        { status: 400 }
      );
    }

    // 解析限制参数
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 10000) : 1000;

    // 验证 limit
    if (limitParam && (isNaN(limit) || limit < 1)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid limit parameter',
          message: 'limit must be a positive integer',
        },
        { status: 400 }
      );
    }

    // 构建查询
    const query: LogQuery = {
      startTime: startDate,
      endTime: endDate,
      levels,
      categories,
      search: searchParams.get('search') || undefined,
      userId: searchParams.get('userId') || undefined,
      requestId: searchParams.get('requestId') || undefined,
      route: searchParams.get('route') || undefined,
      page: 1,
      limit,
      orderBy: 'timestamp',
      order: 'desc',
    };

    // 查询日志
    const dbTransport = getDbTransport();
    const result = dbTransport.query(query);

    // 根据格式返回数据
    if (format === 'csv') {
      const csvContent = convertToCSV(result.logs as Array<Record<string, unknown>>);
      const filename = getExportFilename('csv');
      
      const response = new NextResponse(csvContent, { status: 200 });
      return setDownloadHeaders(response, filename, 'csv');
    }

    // JSON 格式 - 默认
    const exportData = {
      exportedAt: new Date().toISOString(),
      format: 'json',
      totalRecords: result.total,
      filters: {
        startDate,
        endDate,
        levels,
        categories,
        search: query.search,
        userId: query.userId,
        requestId: query.requestId,
        route: query.route,
      },
      logs: result.logs,
    };

    const filename = getExportFilename('json');
    const response = new NextResponse(JSON.stringify(exportData, null, 2), { status: 200 });
    return setDownloadHeaders(response, filename, 'json');

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