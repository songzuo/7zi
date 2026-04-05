/**
 * 审计日志 API - 导出
 * GET /api/audit/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuditLogger } from '@/lib/audit/audit-logger';
import type { AuditLogExportOptions, AuditAction, AuditStatus } from '@/lib/audit/types';

/**
 * GET /api/audit/export
 * 导出审计日志
 *
 * Query Parameters:
 * - format: json|csv (required) - 导出格式
 * - startTime: ISO date string (required) - 开始时间
 * - endTime: ISO date string (required) - 结束时间
 * - userId: string (optional)
 * - action: CREATE|READ|UPDATE|DELETE|LOGIN|LOGOUT|EXPORT|ADMIN (optional)
 * - resource: string (optional)
 * - resourceId: string (optional)
 * - status: success|failure (optional)
 * - ipAddress: string (optional)
 * - maxRecords: number (optional, default: 10000)
 */
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;

    // 获取必需参数
    const format = params.get('format') as 'json' | 'csv';
    const startTimeStr = params.get('startTime');
    const endTimeStr = params.get('endTime');

    if (!format || !['json', 'csv'].includes(format)) {
      return NextResponse.json(
        { error: 'Format must be json or csv' },
        { status: 400 }
      );
    }

    if (!startTimeStr || !endTimeStr) {
      return NextResponse.json(
        { error: 'startTime and endTime are required' },
        { status: 400 }
      );
    }

    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use ISO 8601 format.' },
        { status: 400 }
      );
    }

    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'startTime must be before endTime' },
        { status: 400 }
      );
    }

    // 检查时间范围是否超过90天
    const daysDiff = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > 90) {
      return NextResponse.json(
        { error: 'Date range cannot exceed 90 days' },
        { status: 400 }
      );
    }

    // 构建导出选项
    const options: AuditLogExportOptions = {
      format,
      startTime,
      endTime,
      userId: params.get('userId') || undefined,
      action: params.get('action') as AuditAction | undefined,
      resource: params.get('resource') || undefined,
      resourceId: params.get('resourceId') || undefined,
      status: params.get('status') as AuditStatus | undefined,
      ipAddress: params.get('ipAddress') || undefined,
      maxRecords: parseInt(params.get('maxRecords') || '10000', 10),
    };

    // 验证maxRecords
    if (options.maxRecords && options.maxRecords > 100000) {
      return NextResponse.json(
        { error: 'maxRecords cannot exceed 100000' },
        { status: 400 }
      );
    }

    // 导出日志
    const auditLogger = getAuditLogger();
    const data = await auditLogger.export(options);

    // 根据格式返回
    const contentType = format === 'json' ? 'application/json' : 'text/csv';
    const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Audit logs export error:', error);
    return NextResponse.json(
      { error: 'Failed to export audit logs' },
      { status: 500 }
    );
  }
}
