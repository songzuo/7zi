import { NextRequest, NextResponse } from 'next/server'
/**
 * API Route for Data Import
 * Supports CSV and JSON import to database tables
 */

import { z } from 'zod'
import {
  _importData as importData,
  parseCSV,
  parseJSON,
  validateImportOptions,
  createBackup,
  type ImportMode,
  type ImportOptions,
  type ExportResult,
} from '@/lib/data-import-export'
import { logger } from '@/lib/logger'

// ========================================
// Types
// ========================================

export interface ImportExample {
  description: string
  body: {
    format: 'csv' | 'json'
    mode: 'insert' | 'update' | 'upsert' | 'replace'
    data: string | Record<string, unknown>
  }
}

export interface ImportInfoResponse {
  success: boolean
  message: string
  importModes: Record<string, string>
  usage: Record<string, unknown>
  examples: ImportExample[]
}

/**
 * Validation schema for import request
 */
const importRequestSchema = z.object({
  format: z.enum(['csv', 'json']).default('json'),
  mode: z.enum(['insert', 'update', 'upsert', 'replace']).default('upsert'),
  dryRun: z.boolean().default(false),
  skipDuplicates: z.boolean().default(true),
  batchSize: z.number().min(1).max(1000).optional(),
  createBackup: z.boolean().default(true),
  backupName: z.string().optional(),
  data: z.union([z.string(), z.record(z.string(), z.unknown())]), // CSV: string, JSON: Record
})

/**
 * GET /api/data/import - Show import options and usage
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Data import API',
      importModes: {
        insert: 'Insert new records, fail on duplicates',
        update: 'Update existing records, fail if not found',
        upsert: 'Insert or update records (default)',
        replace: 'Clear table and insert all records',
      },
      usage: {
        method: 'POST',
        body: {
          format: 'csv | json (default: json)',
          mode: 'insert | update | upsert | replace (default: upsert)',
          dryRun: false,
          skipDuplicates: true,
          batchSize: 100,
          createBackup: true,
          backupName: 'optional-backup-name',
          data: '... CSV or JSON data ...',
        },
      },
      examples: [
        {
          description: 'Import JSON data with upsert',
          body: {
            format: 'json',
            mode: 'upsert',
            data: {
              format: 'json',
              tables: ['agents'],
              data: {
                agents: [
                  {
                    id: 'agent-1',
                    name: 'Agent 1',
                    type: 'worker',
                    provider: 'openai',
                    status: 'active',
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: '2024-01-01T00:00:00.000Z',
                  },
                ],
              },
              stats: { totalRows: 1, tables: { agents: 1 } },
              exportedAt: '2024-01-01T00:00:00.000Z',
            },
          },
        },
        {
          description: 'Import CSV data with insert mode',
          body: {
            format: 'csv',
            mode: 'insert',
            data: '# Table: agents\n\nid,name,type,provider,status,created_at,updated_at\nagent-1,Agent 1,worker,openai,active,2024-01-01T00:00:00.000Z,2024-01-01T00:00:00.000Z\n',
          },
        },
      ],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('Failed to get import info', error, {
      category: 'data-import',
    })
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

/**
 * POST /api/data/import - Import data
 */
export async function POST(request: NextRequest) {
  let backupName: string | undefined

  try {
    const body = await request.json()

    // Validate request structure
    const validated = importRequestSchema.parse(body)

    // Parse data based on format
    let parsedData: ExportResult

    if (validated.format === 'json') {
      parsedData = parseJSON(validated.data as string)
    } else {
      parsedData = {
        format: 'csv',
        tables: [],
        data: parseCSV(validated.data as string),
        stats: { totalRows: 0, tables: {} },
        exportedAt: new Date().toISOString(),
      }
      parsedData.tables = Object.keys(parsedData.data)
      parsedData.stats.totalRows = Object.values(parsedData.data).reduce(
        (sum: number, rows: unknown) => sum + (Array.isArray(rows) ? rows.length : 0),
        0
      )
      parsedData.stats.tables = Object.fromEntries(
        Object.entries(parsedData.data).map(([table, rows]) => [
          table,
          Array.isArray(rows) ? rows.length : 0,
        ])
      )
    }

    // Validate import options
    const options: ImportOptions = {
      format: validated.format,
      mode: validated.mode as ImportMode,
      dryRun: validated.dryRun,
      skipDuplicates: validated.skipDuplicates,
      batchSize: validated.batchSize,
    }

    const validation = validateImportOptions(options)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid import options',
          details: validation.errors,
        },
        { status: 400 }
      )
    }

    logger.info('Processing data import request', {
      category: 'data-import',
      format: options.format,
      mode: options.mode,
      dryRun: options.dryRun,
      tables: parsedData.tables,
    })

    // Create backup if requested and not a dry run
    if (validated.createBackup && !validated.dryRun) {
      backupName = await createBackup(validated.backupName)
      logger.info(`Created backup before import: ${backupName}`, {
        category: 'data-import',
      })
    }

    // Import data
    const result = await importData(parsedData, options)

    // Return result
    return NextResponse.json({
      success: result.success,
      backup: backupName,
      stats: result.stats,
      errors: result.errors,
      importedAt: result.importedAt,
      message: validated.dryRun
        ? 'Dry run completed. No data was imported.'
        : result.success
          ? 'Data imported successfully'
          : 'Data imported with errors',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    logger.error('Failed to import data', error, {
      category: 'data-import',
      backup: backupName,
    })

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    // Handle CSV/JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse data',
          details: message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
        backup: backupName,
      },
      { status: 500 }
    )
  }
}
