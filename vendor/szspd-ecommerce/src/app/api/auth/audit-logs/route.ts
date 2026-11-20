/**
 * Audit Logs API Route
 * GET /api/auth/audit-logs - Query audit logs (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { queryAuditLogs, getAuditStats, exportAuditLogs, AuditEventType, AuditSeverity, AuditLogEntry } from '@/lib/auth/audit-logger'
import { verify } from '@/lib/auth/jwt'
import { hasPermission } from '@/lib/auth/service'

/**
 * Response types
 */
interface AuditLogsResponse {
  logs: AuditLogEntry[]
  total: number
  stats?: AuditStats
}

interface AuditStats {
  totalEvents: number
  byType: Record<string, number>
  bySeverity: Record<string, number>
  successRate: number
  topFailedEvents: { eventType: string; count: number }[]
}

interface AuditLogsErrorResponse {
  error: string
}

/**
 * GET /api/auth/audit-logs
 * Query audit logs (requires admin permission)
 * 
 * Headers:
 *   Authorization: Bearer <token>
 * 
 * Query params:
 *   userId: string (optional)
 *   agentId: string (optional)
 *   eventTypes: string (comma-separated, optional)
 *   severity: string (comma-separated, optional)
 *   result: 'success' | 'failure' (optional)
 *   startDate: ISO date string (optional)
 *   endDate: ISO date string (optional)
 *   limit: number (default: 100)
 *   offset: number (default: 0)
 *   stats: 'true' to include statistics
 *   export: 'json' | 'csv' to export data
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<AuditLogsErrorResponse>(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    // Verify JWT
    const result = await verify(token)

    if (!result.valid || !result.payload) {
      return NextResponse.json<AuditLogsErrorResponse>(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    const { payload } = result

    // Check admin permission
    const permissions = payload.permissions || []
    const hasAdminAccess = 
      permissions.includes('access:audit_log') ||
      permissions.includes('admin:*') ||
      permissions.includes('*:*') ||
      payload.role === 'admin'

    if (!hasAdminAccess) {
      return NextResponse.json<AuditLogsErrorResponse>(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const params = request.nextUrl.searchParams
    const userId = params.get('userId') || undefined
    const agentId = params.get('agentId') || undefined
    const eventTypesStr = params.get('eventTypes')
    const severityStr = params.get('severity')
    const resultFilter = params.get('result') as 'success' | 'failure' | null
    const startDateStr = params.get('startDate')
    const endDateStr = params.get('endDate')
    const limit = parseInt(params.get('limit') || '100', 10)
    const offset = parseInt(params.get('offset') || '0', 10)
    const includeStats = params.get('stats') === 'true'
    const exportFormat = params.get('export') as 'json' | 'csv' | null

    // Parse event types
    const eventTypes = eventTypesStr 
      ? eventTypesStr.split(',').map(e => e.trim() as AuditEventType)
      : undefined

    // Parse severity
    const severity = severityStr
      ? severityStr.split(',').map(s => s.trim() as AuditSeverity)
      : undefined

    // Parse dates
    const startDate = startDateStr ? new Date(startDateStr) : undefined
    const endDate = endDateStr ? new Date(endDateStr) : undefined

    // Handle export
    if (exportFormat) {
      const exportedData = await exportAuditLogs({
        format: exportFormat,
        startDate,
        endDate,
        userId,
        agentId,
      })

      return new NextResponse(exportedData, {
        headers: {
          'Content-Type': exportFormat === 'json' 
            ? 'application/json' 
            : 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs.${exportFormat}"`,
        },
      })
    }

    // Query logs
    const logs = await queryAuditLogs({
      userId,
      agentId,
      eventTypes,
      severity,
      result: resultFilter || undefined,
      startDate,
      endDate,
      limit,
      offset,
    })

    // Get stats if requested
    const stats = includeStats 
      ? await getAuditStats({ startDate, endDate, userId, agentId })
      : undefined

    return NextResponse.json<AuditLogsResponse>({
      logs,
      total: logs.length,
      stats,
    })
  } catch (error) {
    console.error('Audit logs endpoint error:', error)

    return NextResponse.json<AuditLogsErrorResponse>(
      { error: 'Failed to retrieve audit logs' },
      { status: 500 }
    )
  }
}
