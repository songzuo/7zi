/**
 * API Route for Data Export
 * Supports CSV and JSON export from database tables
 */

import { z } from 'zod';
import {
  _exportData as exportData,
  exportToCSV,
  exportToJSON,
  getSupportedTables,
  getExportFileName,
  type ExportFormat,
  type ExportOptions,
} from '@/lib/data-import-export';
import { logger } from '@/lib/logger';

/**
 * Validation schema for export request
 */
const exportRequestSchema = z.object({
  format: z.enum(['csv', 'json']).default('json'),
  tables: z.array(z.string()).min(1),
  filters: z.array(z.object({
    table: z.string(),
    where: z.string().optional(),
    params: z.array(z.any()).optional(),
    limit: z.number().optional(),
  })).optional(),
  includeSchema: z.boolean().default(false),
});

/**
 * GET /api/data/export - Show supported tables and export options
 */
export async function GET(request: NextRequest) {
  try {
    const supportedTables = getSupportedTables();

    return NextResponse.json({
      success: true,
      message: 'Data export API',
      supportedTables,
      usage: {
        method: 'POST',
        body: {
          format: 'csv | json (default: json)',
          tables: ['table1', 'table2'],
          filters: [
            {
              table: 'table1',
              where: 'status = ?',
              params: ['active'],
              limit: 100,
            },
          ],
          includeSchema: false,
        },
      },
    });
  } catch (_error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Failed to get export info', error, {
      category: 'data-export',
    });
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

/**
 * POST /api/data/export - Export data
 */
export async function POST(_request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validated = exportRequestSchema.parse(body);
    const options: ExportOptions = {
      format: validated.format as ExportFormat,
      tables: validated.tables,
      filters: validated.filters,
      includeSchema: validated.includeSchema,
    };

    logger.info('Processing data export request', {
      category: 'data-export',
      format: options.format,
      tables: options.tables,
    });

    // Export data
    const result = await exportData(options);

    // Convert to requested format
    let content: string;
    let contentType: string;
    let filename: string;

    if (options.format === 'csv') {
      content = exportToCSV(result);
      contentType = 'text/csv; charset=utf-8';
      filename = getExportFileName('csv', result.tables);
    } else {
      content = exportToJSON(result);
      contentType = 'application/json; charset=utf-8';
      filename = getExportFileName('json', result.tables);
    }

    // Return as file download
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (_error) {
    const message = error instanceof Error ? error.message : String(error);

    logger.error('Failed to export data', error, {
      category: 'data-export',
    });

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
