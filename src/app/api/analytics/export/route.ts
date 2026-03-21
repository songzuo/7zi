/**
 * Analytics Export API
 * 数据导出 API (CSV/Excel/JSON/PDF)
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  type ExportOptions,
  type ExportFormat,
  type AnalyticsFilters,
  type TimeSeriesDataPoint,
  type AnalyticsResponse
} from '@/lib/types/analytics';
import * as XLSX from 'xlsx';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert data to CSV format
 */
function convertToCSV(
  data: TimeSeriesDataPoint[],
  includeHeaders = true
): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map(obj =>
    headers.map(header => {
      const value = obj[header];
      // Handle special characters in CSV
      const stringValue = String(value ?? '');
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',')
  );

  if (includeHeaders) {
    rows.unshift(headers.join(','));
  }

  return rows.join('\n');
}

/**
 * Convert data to Excel format
 */
function convertToExcel(
  data: TimeSeriesDataPoint[],
  sheetName = 'Analytics Data'
): Buffer {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/**
 * Convert data to JSON format
 */
function convertToJSON(data: TimeSeriesDataPoint[], pretty = true): string {
  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * Get filename with timestamp
 */
function getFilename(
  baseFilename: string,
  format: ExportFormat,
  dateRange?: { start: string; end: string }
): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const extension = format === 'xlsx' ? 'xlsx' : format;
  let filename = `${baseFilename}_${timestamp}.${extension}`;

  if (dateRange) {
    const start = new Date(dateRange.start).toISOString().split('T')[0];
    const end = new Date(dateRange.end).toISOString().split('T')[0];
    filename = `${baseFilename}_${start}_to_${end}.${extension}`;
  }

  return filename;
}

/**
 * Get content type for export format
 */
function getContentType(format: ExportFormat): string {
  const types: Record<ExportFormat, string> = {
    csv: 'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    json: 'application/json',
    pdf: 'application/pdf'
  };
  return types[format] || 'application/octet-stream';
}

// ============================================================================
// API Handler
// ============================================================================

/**
 * POST /api/analytics/export
 * Export analytics data in various formats
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      format = 'csv',
      data,
      filename = 'analytics-export',
      includeHeaders = true,
      filters,
      dateRange
    }: ExportOptions = body;

    // Validate format
    if (!['csv', 'xlsx', 'json'].includes(format)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported export format' },
        { status: 400 }
      );
    }

    // Validate data
    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data to export' },
        { status: 400 }
      );
    }

    let content: string | Buffer;
    let contentType: string;

    // Convert data based on format
    switch (format) {
      case 'csv':
        content = convertToCSV(data as TimeSeriesDataPoint[], includeHeaders);
        contentType = getContentType('csv');
        break;

      case 'xlsx':
        content = convertToExcel(data as TimeSeriesDataPoint[], 'Analytics Data');
        contentType = getContentType('xlsx');
        break;

      case 'json':
        content = convertToJSON(data as TimeSeriesDataPoint[], true);
        contentType = getContentType('json');
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Unsupported export format' },
          { status: 400 }
        );
    }

    // Generate filename
    const finalFilename = getFilename(filename, format as ExportFormat, dateRange);

    // Log export
    logger.info('Analytics data exported', {
      format,
      dataSize: data.length,
      filename: finalFilename,
      filters,
      dateRange
    });

    // Return file as download
    const responseBody = Buffer.isBuffer(content)
      ? new Uint8Array(content)
      : new TextEncoder().encode(content);
    return new NextResponse(responseBody, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${finalFilename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    logger.error('Analytics export API error', { error });
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analytics/export
 * Get export options and supported formats
 */
export async function GET() {
  const response: AnalyticsResponse<{
    formats: ExportFormat[];
    maxRecords: number;
    options: Record<string, string[]>;
  }> = {
    success: true,
    data: {
      formats: ['csv', 'xlsx', 'json'],
      maxRecords: 10000,
      options: {
        includeHeaders: ['true', 'false'],
        timeRange: ['today', 'week', 'month', 'quarter', 'year', 'custom']
      }
    },
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(response);
}
