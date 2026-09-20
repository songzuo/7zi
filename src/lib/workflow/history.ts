/**
 * Workflow History / Audit Service
 *
 * Provides audit trail and operation history for workflows:
 * - Track all workflow operations (create, update, delete, execute, etc.)
 * - Query by time range, user, operation type
 * - Export audit logs
 * - Support compliance and debugging
 */

import { getDatabaseAsync } from '../db/connection'
import { logger } from '../logger'

// Type definitions
export type OperationType =
  | 'create'
  | 'update'
  | 'delete'
  | 'execute'
  | 'stop'
  | 'pause'
  | 'resume'
  | 'export'
  | 'import'
  | 'version_create'
  | 'version_rollback'
  | 'permission_change'
  | 'settings_update'

export interface WorkflowHistoryEntry {
  id: string
  workflowId: string
  operation: OperationType
  description: string
  userId: string
  userName?: string
  ipAddress?: string
  userAgent?: string

  // Operation details (JSON)
  details: Record<string, unknown>

  // Result
  success: boolean
  errorCode?: string
  errorMessage?: string

  // Timing
  timestamp: string
  duration?: number // in milliseconds

  // Related entities
  relatedVersionId?: string
  relatedInstanceId?: string
  relatedNodeId?: string
}

export interface HistoryQueryFilter {
  workflowId?: string
  operation?: OperationType
  userId?: string
  success?: boolean
  startTime?: string | Date
  endTime?: string | Date
  relatedVersionId?: string
  relatedInstanceId?: string
  relatedNodeId?: string
}

export interface HistoryQueryResult {
  entries: WorkflowHistoryEntry[]
  total: number
  summary: {
    byOperation: Record<OperationType, number>
    byUser: Record<string, number>
    successRate: number
    avgDuration: number
  }
}

/**
 * Generate a unique history entry ID
 */
function generateHistoryId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Workflow History Service
 */
export class WorkflowHistoryService {
  /**
   * Record a workflow operation
   */
  async recordOperation(entry: Omit<WorkflowHistoryEntry, 'id' | 'timestamp'>): Promise<WorkflowHistoryEntry> {
    const db = await getDatabaseAsync()

    const historyEntry: WorkflowHistoryEntry = {
      id: generateHistoryId(),
      timestamp: new Date().toISOString(),
      ...entry,
    }

    db.exec(
      `INSERT INTO workflow_history (
        id, workflow_id, operation, description, user_id, user_name,
        ip_address, user_agent, details, success, error_code, error_message,
        timestamp, duration, related_version_id, related_instance_id, related_node_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        historyEntry.id,
        historyEntry.workflowId,
        historyEntry.operation,
        historyEntry.description,
        historyEntry.userId,
        historyEntry.userName || null,
        historyEntry.ipAddress || null,
        historyEntry.userAgent || null,
        JSON.stringify(historyEntry.details),
        historyEntry.success ? 1 : 0,
        historyEntry.errorCode || null,
        historyEntry.errorMessage || null,
        historyEntry.timestamp,
        historyEntry.duration || null,
        historyEntry.relatedVersionId || null,
        historyEntry.relatedInstanceId || null,
        historyEntry.relatedNodeId || null,
      ]
    )

    logger.debug(`Recorded workflow operation: ${historyEntry.operation}`, {
      category: 'workflow',
      workflowId: historyEntry.workflowId,
      operation: historyEntry.operation,
    })

    return historyEntry
  }

  /**
   * Query history entries with filters
   */
  async queryHistory(
    filter: HistoryQueryFilter = {},
    options: { limit?: number; offset?: number; orderBy?: 'timestamp' | 'duration' } = {}
  ): Promise<HistoryQueryResult> {
    const db = await getDatabaseAsync()
    const limit = options.limit || 100
    const offset = options.offset || 0
    const orderBy = options.orderBy || 'timestamp'

    // Build WHERE clause
    const conditions: string[] = []
    const params: unknown[] = []

    if (filter.workflowId) {
      conditions.push('workflow_id = ?')
      params.push(filter.workflowId)
    }
    if (filter.operation) {
      conditions.push('operation = ?')
      params.push(filter.operation)
    }
    if (filter.userId) {
      conditions.push('user_id = ?')
      params.push(filter.userId)
    }
    if (filter.success !== undefined) {
      conditions.push('success = ?')
      params.push(filter.success ? 1 : 0)
    }
    if (filter.startTime) {
      const startTime = filter.startTime instanceof Date ? filter.startTime.toISOString() : filter.startTime
      conditions.push('timestamp >= ?')
      params.push(startTime)
    }
    if (filter.endTime) {
      const endTime = filter.endTime instanceof Date ? filter.endTime.toISOString() : filter.endTime
      conditions.push('timestamp <= ?')
      params.push(endTime)
    }
    if (filter.relatedVersionId) {
      conditions.push('related_version_id = ?')
      params.push(filter.relatedVersionId)
    }
    if (filter.relatedInstanceId) {
      conditions.push('related_instance_id = ?')
      params.push(filter.relatedInstanceId)
    }
    if (filter.relatedNodeId) {
      conditions.push('related_node_id = ?')
      params.push(filter.relatedNodeId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Get total count
    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM workflow_history ${whereClause}`)
      .get(...params) as Record<string, unknown>
    const total = (countResult?.count as number) || 0

    // Get entries
    const orderClause = `ORDER BY ${orderBy} DESC LIMIT ? OFFSET ?`
    const queryParams = [...params, limit, offset]

    const rows = db
      .prepare(`SELECT * FROM workflow_history ${whereClause} ${orderClause}`)
      .all(...queryParams) as Record<string, unknown>[]

    const entries: WorkflowHistoryEntry[] = rows.map(row => ({
      id: row.id as string,
      workflowId: row.workflow_id as string,
      operation: row.operation as OperationType,
      description: row.description as string,
      userId: row.user_id as string,
      userName: row.user_name as string | undefined,
      ipAddress: row.ip_address as string | undefined,
      userAgent: row.user_agent as string | undefined,
      details: JSON.parse(row.details as string) as Record<string, unknown>,
      success: (row.success as number) === 1,
      errorCode: row.error_code as string | undefined,
      errorMessage: row.error_message as string | undefined,
      timestamp: row.timestamp as string,
      duration: row.duration as number | undefined,
      relatedVersionId: row.related_version_id as string | undefined,
      relatedInstanceId: row.related_instance_id as string | undefined,
      relatedNodeId: row.related_node_id as string | undefined,
    }))

    // Compute summary
    const summary = this.computeSummary(entries)

    return { entries, total, summary }
  }

  /**
   * Compute summary statistics for history entries
   */
  private computeSummary(entries: WorkflowHistoryEntry[]): HistoryQueryResult['summary'] {
    const byOperation: Record<OperationType, number> = {} as Record<OperationType, number>
    const byUser: Record<string, number> = {}

    let successCount = 0
    let totalDuration = 0
    let durationCount = 0

    for (const entry of entries) {
      // Count by operation
      byOperation[entry.operation] = (byOperation[entry.operation] || 0) + 1

      // Count by user
      byUser[entry.userId] = (byUser[entry.userId] || 0) + 1

      // Success rate
      if (entry.success) {
        successCount++
      }

      // Duration
      if (entry.duration) {
        totalDuration += entry.duration
        durationCount++
      }
    }

    return {
      byOperation,
      byUser,
      successRate: entries.length > 0 ? successCount / entries.length : 0,
      avgDuration: durationCount > 0 ? totalDuration / durationCount : 0,
    }
  }

  /**
   * Get history for a specific workflow
   */
  async getWorkflowHistory(
    workflowId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<HistoryQueryResult> {
    return this.queryHistory({ workflowId }, options)
  }

  /**
   * Get history for a specific user
   */
  async getUserHistory(
    userId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<HistoryQueryResult> {
    return this.queryHistory({ userId }, options)
  }

  /**
   * Get history by operation type
   */
  async getOperationHistory(
    operation: OperationType,
    options: { limit?: number; offset?: number } = {}
  ): Promise<HistoryQueryResult> {
    return this.queryHistory({ operation }, options)
  }

  /**
   * Get history entries within a time range
   */
  async getHistoryByTimeRange(
    startTime: string | Date,
    endTime: string | Date,
    options: { limit?: number; offset?: number } = {}
  ): Promise<HistoryQueryResult> {
    return this.queryHistory({ startTime, endTime }, options)
  }

  /**
   * Export audit logs to CSV
   */
  async exportToCSV(
    filter: HistoryQueryFilter = {}
  ): Promise<{ csv: string; filename: string; recordCount: number }> {
    const result = await this.queryHistory(filter, { limit: 10000 }) // Limit export size

    if (result.entries.length === 0) {
      return { csv: '', filename: 'workflow_history_empty.csv', recordCount: 0 }
    }

    // CSV header
    const header = [
      'Timestamp',
      'Workflow ID',
      'Operation',
      'Description',
      'User ID',
      'User Name',
      'IP Address',
      'Success',
      'Error Code',
      'Error Message',
      'Duration (ms)',
      'Related Version ID',
      'Related Instance ID',
      'Related Node ID',
    ].join(',')

    // CSV rows
    const rows = result.entries.map(entry => {
      const values = [
        entry.timestamp,
        entry.workflowId,
        entry.operation,
        `"${this.escapeCSV(entry.description)}"`,
        entry.userId,
        `"${this.escapeCSV(entry.userName || '')}"`,
        entry.ipAddress || '',
        entry.success ? 'true' : 'false',
        entry.errorCode || '',
        `"${this.escapeCSV(entry.errorMessage || '')}"`,
        entry.duration || '',
        entry.relatedVersionId || '',
        entry.relatedInstanceId || '',
        entry.relatedNodeId || '',
      ]
      return values.join(',')
    })

    const csv = [header, ...rows].join('\n')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `workflow_history_${timestamp}.csv`

    return { csv, filename, recordCount: result.entries.length }
  }

  /**
   * Escape CSV value
   */
  private escapeCSV(value: string): string {
    return value.replace(/"/g, '""')
  }

  /**
   * Export audit logs to JSON
   */
  async exportToJSON(
    filter: HistoryQueryFilter = {}
  ): Promise<{ json: string; filename: string; recordCount: number }> {
    const result = await this.queryHistory(filter, { limit: 10000 })

    const data = {
      exportedAt: new Date().toISOString(),
      totalRecords: result.total,
      entries: result.entries,
      summary: result.summary,
    }

    const json = JSON.stringify(data, null, 2)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `workflow_history_${timestamp}.json`

    return { json, filename, recordCount: result.entries.length }
  }

  /**
   * Get audit statistics for a workflow
   */
  async getWorkflowAuditStats(workflowId: string): Promise<{
    totalOperations: number
    operationsByType: Record<OperationType, number>
    operationsByUser: Record<string, number>
    recentActivity: WorkflowHistoryEntry[]
    errorCount: number
    avgDuration: number
  }> {
    const result = await this.getWorkflowHistory(workflowId, { limit: 1000 })

    return {
      totalOperations: result.total,
      operationsByType: result.summary.byOperation,
      operationsByUser: result.summary.byUser,
      recentActivity: result.entries.slice(0, 10),
      errorCount: result.entries.filter(e => !e.success).length,
      avgDuration: result.summary.avgDuration,
    }
  }

  /**
   * Delete old history entries
   */
  async cleanupOldHistory(retentionDays: number): Promise<number> {
    const db = await getDatabaseAsync()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // First count the entries to be deleted
    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM workflow_history WHERE timestamp < ?`)
      .get(cutoffDate.toISOString()) as Record<string, unknown> | null
    const deletedCount = (countResult?.count as number) || 0

    // Then delete them
    db.exec(`DELETE FROM workflow_history WHERE timestamp < ?`, [cutoffDate.toISOString()])

    if (deletedCount > 0) {
      logger.info(`Cleaned up ${deletedCount} old history entries`, { category: 'workflow' })
    }

    return deletedCount
  }

  /**
   * Delete all history for a workflow
   */
  async deleteWorkflowHistory(workflowId: string): Promise<number> {
    const db = await getDatabaseAsync()

    // First count the entries to be deleted
    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM workflow_history WHERE workflow_id = ?`)
      .get(workflowId) as Record<string, unknown> | null
    const deletedCount = (countResult?.count as number) || 0

    // Then delete them
    db.exec(`DELETE FROM workflow_history WHERE workflow_id = ?`, [workflowId])

    if (deletedCount > 0) {
      logger.info(`Deleted ${deletedCount} history entries for workflow ${workflowId}`, {
        category: 'workflow',
      })
    }

    return deletedCount
  }

  /**
   * Batch record operations
   */
  async recordBatchOperations(
    entries: Array<Omit<WorkflowHistoryEntry, 'id' | 'timestamp'>>
  ): Promise<WorkflowHistoryEntry[]> {
    const db = await getDatabaseAsync()
    const results: WorkflowHistoryEntry[] = []

    // Use transaction for batch insert
    db.exec('BEGIN TRANSACTION')

    try {
      for (const entry of entries) {
        const result = await this.recordOperation(entry)
        results.push(result)
      }

      db.exec('COMMIT')

      logger.info(`Recorded ${entries.length} batch operations`, { category: 'workflow' })
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }

    return results
  }
}

// Singleton instance
export const workflowHistoryService = new WorkflowHistoryService()
