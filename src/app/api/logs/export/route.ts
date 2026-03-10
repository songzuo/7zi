import { NextRequest, NextResponse } from 'next/server';
import { getDbTransport } from '@/lib/logger/database-transport';
import { verifyToken, extractToken } from '@/lib/security/auth';
import { apiLogger } from '@/lib/logger';
import type { LogLevel, LogEntry } from '@/lib/logger/types';

// 验证日期格式是否为 ISO 8601
function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && dateString === date.toISOString().split('T')[0];
}

// 验证日志级别
function isValidLogLevel(level: string): level is LogLevel {
  const validLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'audit'];
  return validLevels.includes(level as LogLevel);
}

// 将日志数据转换为 CSV 格式
function logsToCSV(logs: LogEntry[]): string {
  if (logs.length === 0) {
    return 'timestamp,level,category,message,userId,requestId,route,metadata\n';
  }

  // CSV 头部
  let csv = 'timestamp,level,category,message,userId,requestId,route,metadata\n';
  
  // 转义 CSV 字段中的特殊字符
  const escapeCSV = (value: string | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // 如果包含逗号、引号或换行符，则用双引号包围，并转义内部的双引号
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // 转换每条日志
  for (const log of logs) {
    const metadataStr = log.metadata ? JSON.stringify(log.metadata) : '';
    csv += `${log.timestamp},${escapeCSV(log.level)},${escapeCSV(log.category)},${escapeCSV(log.message)},${escapeCSV(log.userId)},${escapeCSV(log.requestId)},${escapeCSV(log.route)},${escapeCSV(metadataStr)}\n`;
  }
  
  return csv;
}

// ============================================
// GET /api/logs/export - 导出日志
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. 认证检查 - 必须登录才能导出日志
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // 2. 解析和验证查询参数
    const format = searchParams.get('format')?.toLowerCase() || 'json';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const level = searchParams.get('level');

    // 验证格式
    if (format !== 'csv' && format !== 'json') {
      return NextResponse.json(
        { 
          error: 'Invalid format parameter', 
          message: 'Format must be either "csv" or "json"' 
        },
        { status: 400 }
      );
    }

    // 验证日期参数
    if (startDate && !isValidISODate(startDate)) {
      return NextResponse.json(
        { 
          error: 'Invalid startDate parameter', 
          message: 'startDate must be a valid ISO date (YYYY-MM-DD)' 
        },
        { status: 400 }
      );
    }

    if (endDate && !isValidISODate(endDate)) {
      return NextResponse.json(
        { 
          error: 'Invalid endDate parameter', 
          message: 'endDate must be a valid ISO date (YYYY-MM-DD)' 
        },
        { status: 400 }
      );
    }

    // 验证日志级别
    if (level && !isValidLogLevel(level)) {
      return NextResponse.json(
        { 
          error: 'Invalid level parameter', 
          message: 'Level must be one of: debug, info, warn, error, audit' 
        },
        { status: 400 }
      );
    }

    // 3. 构建查询条件
    const query = {
      startTime: startDate ? `${startDate}T00:00:00.000Z` : undefined,
      endTime: endDate ? `${endDate}T23:59:59.999Z` : undefined,
      levels: level ? [level as LogLevel] : undefined,
      // 不限制分页，导出所有匹配的日志
      page: 1,
      limit: 10000, // 设置合理的上限以防止内存溢出
    };

    // 4. 查询日志
    const dbTransport = getDbTransport();
    const result = dbTransport.query(query);

    if (!result || !Array.isArray(result.logs)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to retrieve logs' 
        },
        { status: 500 }
      );
    }

    const logs = result.logs;

    // 5. 根据格式返回响应
    const filename = `logs_${startDate || 'all'}_${endDate || 'now'}.${format}`;
    
    if (format === 'csv') {
      const csvContent = logsToCSV(logs);
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
        status: 200,
      });
    } else {
      // JSON 格式
      const jsonContent = JSON.stringify({ 
        success: true, 
        data: logs,
        count: logs.length,
        exportedAt: new Date().toISOString(),
      }, null, 2);
      
      return new NextResponse(jsonContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
        status: 200,
      });
    }
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