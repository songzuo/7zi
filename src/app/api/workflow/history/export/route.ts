/**
 * Workflow History Export API Route
 * POST /api/workflow/history/export - Export audit logs to CSV or JSON
 */

import { NextRequest } from 'next/server'
import { workflowHistoryService } from '@/lib/workflow/history'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
} from '@/lib/api/error-handler'

/**
 * POST /api/workflow/history/export
 * Export audit logs to CSV or JSON
 * Body: { format: 'csv' | 'json', filter: {...} }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const format = body.format || 'json'
    const filter = body.filter || {}

    // Validate format
    if (format !== 'csv' && format !== 'json') {
      return createValidationError('Format must be "csv" or "json"')
    }

    if (format === 'csv') {
      const result = await workflowHistoryService.exportToCSV(filter)

      // Return as CSV file download
      return new Response(result.csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
          'X-Record-Count': result.recordCount.toString(),
        },
      })
    } else {
      const result = await workflowHistoryService.exportToJSON(filter)

      // Return as JSON file download
      return new Response(result.json, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${result.filename}"`,
          'X-Record-Count': result.recordCount.toString(),
        },
      })
    }
  } catch (error) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)))
  }
}
