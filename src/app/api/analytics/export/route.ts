/**
 * Analytics Export API
 * 数据导出 API (CSV/Excel/JSON/PDF)
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import {
  type ExportOptions,
  type ExportFormat,
  type AnalyticsFilters,
  type TimeSeriesDataPoint,
  type AnalyticsResponse
} from '@/lib/types/analytics';
import { createErrorResponse, createSuccessResponse, createValidationError } from '@/lib/api/error-handler';

// ExcelJS will be dynamically imported to reduce initial bundle size

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
async function convertToExcel(
  data: TimeSeriesDataPoint[],
  sheetName = 'Analytics Data'
): Promise<Buffer> {
  // Dynamic import of ExcelJS to reduce initial bundle size (~500KB)
  const ExcelJS = (await import(
    /* webpackChunkName: "exceljs" */
    'exceljs'
  )).default;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // Add header row
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Add data rows
    data.forEach((row) => {
      const values = headers.map((header) => row[header] ?? '');
      worksheet.addRow(values);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      const maxLength = Math.max(
        headers[index].length,
        ...data.map((row) => String(row[headers[index]] ?? '').length)
      );
      column.width = Math.min(Math.max(maxLength, 10), 50);
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
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
      return createValidationError('Unsupported export format', { format });
    }

    // Validate data
    if (!data || !Array.isArray(data) || data.length === 0) {
      return createValidationError('No data to export');
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
        content = await convertToExcel(data as TimeSeriesDataPoint[], 'Analytics Data');
        contentType = getContentType('xlsx');
        break;

      case 'json':
        content = convertToJSON(data as TimeSeriesDataPoint[], true);
        contentType = getContentType('json');
        break;

      default:
        return createValidationError('Unsupported export format', { format });
    }

    // Generate filename
    const finalFilename = getFilename(filename, format as ExportFormat, dateRange);

    // Log export
    logger.info('Analytics data exported', {
      format,
      dataSize: data.length,
      filename: finalFilename,
      filters,
      dateRange,
      category: 'analytics'
    });

    // Return file as download
    const responseBody = Buffer.isBuffer(content)
      ? new Uint8Array(content)
      : new TextEncoder().encode(content);
    return new Response(responseBody, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${finalFilename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    logger.error('Analytics export API error', error, { category: 'analytics' });
    return createErrorResponse(error instanceof Error ? error : new Error('Internal server error'));
  }
}

/**
 * GET /api/analytics/export
 * Get export options and supported formats
 */
export async function GET() {
  const response = {
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

  return createSuccessResponse(response.data);
}
