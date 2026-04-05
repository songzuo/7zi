/**
 * Workflow History Service Tests
 *
 * Tests for workflow history/audit trail:
 * - Record workflow operations
 * - Query history entries
 * - Filter by time, user, operation
 * - Export audit logs (CSV, JSON)
 * - Cleanup old history
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { WorkflowHistoryService } from '../history'
import { getDatabaseAsync } from '@/lib/db/connection'

describe('WorkflowHistoryService', () => {
  let service: WorkflowHistoryService

  beforeEach(async () => {
    service = new WorkflowHistoryService()
    
    // Ensure database is initialized and table exists
    const db = await getDatabaseAsync()
    
    // Create table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_history (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        description TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT,
        ip_address TEXT,
        user_agent TEXT,
        details TEXT NOT NULL DEFAULT '{}',
        success INTEGER NOT NULL DEFAULT 1,
        error_code TEXT,
        error_message TEXT,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        duration INTEGER,
        related_version_id TEXT,
        related_instance_id TEXT,
        related_node_id TEXT
      )
    `)
    
    // Clear history table before each test
    db.exec('DELETE FROM workflow_history')
  })

  describe('recordOperation', () => {
    it('should record a simple operation', async () => {
      const entry = await service.recordOperation({
        workflowId: 'wf_test_1',
        operation: 'create',
        description: 'Created workflow',
        userId: 'user_1',
        details: { workflowName: 'Test Workflow' },
        success: true,
      })

      expect(entry).toBeDefined()
      expect(entry.workflowId).toBe('wf_test_1')
      expect(entry.operation).toBe('create')
      expect(entry.userId).toBe('user_1')
      expect(entry.success).toBe(true)
      expect(entry.id).toBeDefined()
      expect(entry.timestamp).toBeDefined()
    })

    it('should record operation with error', async () => {
      const entry = await service.recordOperation({
        workflowId: 'wf_test_2',
        operation: 'execute',
        description: 'Failed to execute workflow',
        userId: 'user_1',
        details: { error: 'Timeout' },
        success: false,
        errorCode: 'TIMEOUT',
        errorMessage: 'Execution timed out after 60s',
        duration: 60000,
      })

      expect(entry.success).toBe(false)
      expect(entry.errorCode).toBe('TIMEOUT')
      expect(entry.errorMessage).toBe('Execution timed out after 60s')
      expect(entry.duration).toBe(60000)
    })

    it('should record operation with related entities', async () => {
      const entry = await service.recordOperation({
        workflowId: 'wf_test_3',
        operation: 'version_create',
        description: 'Created version',
        userId: 'user_1',
        details: { versionNumber: 2 },
        success: true,
        relatedVersionId: 'ver_123',
        relatedInstanceId: 'inst_456',
        relatedNodeId: 'node_789',
      })

      expect(entry.relatedVersionId).toBe('ver_123')
      expect(entry.relatedInstanceId).toBe('inst_456')
      expect(entry.relatedNodeId).toBe('node_789')
    })

    it('should record operation with IP and user agent', async () => {
      const entry = await service.recordOperation({
        workflowId: 'wf_test_4',
        operation: 'update',
        description: 'Updated workflow',
        userId: 'user_1',
        userName: 'John Doe',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        details: { changedFields: ['name', 'description'] },
        success: true,
      })

      expect(entry.userName).toBe('John Doe')
      expect(entry.ipAddress).toBe('192.168.1.100')
      expect(entry.userAgent).toBe('Mozilla/5.0...')
    })
  })

  describe('queryHistory', () => {
    it('should return empty array for no matching entries', async () => {
      const result = await service.queryHistory({ workflowId: 'nonexistent' })

      expect(result.entries).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should filter by workflowId', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_5',
        operation: 'create',
        description: 'Created',
        userId: 'user_1',
        details: {},
        success: true,
      })

      await service.recordOperation({
        workflowId: 'wf_test_5',
        operation: 'update',
        description: 'Updated',
        userId: 'user_1',
        details: {},
        success: true,
      })

      await service.recordOperation({
        workflowId: 'other_wf',
        operation: 'create',
        description: 'Created other',
        userId: 'user_1',
        details: {},
        success: true,
      })

      const result = await service.queryHistory({ workflowId: 'wf_test_5' })

      expect(result.entries).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should filter by operation type', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_6',
        operation: 'create',
        description: 'Created',
        userId: 'user_1',
        details: {},
        success: true,
      })

      await service.recordOperation({
        workflowId: 'wf_test_6',
        operation: 'update',
        description: 'Updated',
        userId: 'user_1',
        details: {},
        success: true,
      })

      await service.recordOperation({
        workflowId: 'wf_test_6',
        operation: 'update',
        description: 'Updated again',
        userId: 'user_1',
        details: {},
        success: true,
      })

      const result = await service.queryHistory({ workflowId: 'wf_test_6', operation: 'update' })

      expect(result.entries).toHaveLength(2)
      expect(result.total).toBe(2)
      result.entries.forEach(e => expect(e.operation).toBe('update'))
    })

    it('should filter by userId', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_7',
        operation: 'create',
        description: 'Created by user1',
        userId: 'user_1',
        details: {},
        success: true,
      })

      await service.recordOperation({
        workflowId: 'wf_test_7',
        operation: 'update',
        description: 'Updated by user2',
        userId: 'user_2',
        details: {},
        success: true,
      })

      const result = await service.queryHistory({ workflowId: 'wf_test_7', userId: 'user_1' })

      expect(result.entries).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.entries[0].userId).toBe('user_1')
    })

    it('should filter by success status', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_8',
        operation: 'execute',
        description: 'Success',
        userId: 'user_1',
        details: {},
        success: true,
      })

      await service.recordOperation({
        workflowId: 'wf_test_8',
        operation: 'execute',
        description: 'Failed',
        userId: 'user_1',
        details: {},
        success: false,
        errorCode: 'ERROR',
      })

      const successResult = await service.queryHistory({ workflowId: 'wf_test_8', success: true })
      const failResult = await service.queryHistory({ workflowId: 'wf_test_8', success: false })

      expect(successResult.entries).toHaveLength(1)
      expect(successResult.entries[0].success).toBe(true)

      expect(failResult.entries).toHaveLength(1)
      expect(failResult.entries[0].success).toBe(false)
    })

    it('should return summary statistics', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_9',
        operation: 'create',
        description: 'Created',
        userId: 'user_1',
        details: {},
        success: true,
      })

      await service.recordOperation({
        workflowId: 'wf_test_9',
        operation: 'execute',
        description: 'Executed',
        userId: 'user_1',
        details: {},
        success: true,
        duration: 1000,
      })

      const result = await service.queryHistory({ workflowId: 'wf_test_9' })

      expect(result.summary.byOperation.create).toBe(1)
      expect(result.summary.byOperation.execute).toBe(1)
      expect(result.summary.byUser['user_1']).toBe(2)
      expect(result.summary.successRate).toBe(1)
      expect(result.summary.avgDuration).toBe(1000)
    })

    it('should support pagination', async () => {
      for (let i = 0; i < 10; i++) {
        await service.recordOperation({
          workflowId: 'wf_test_10',
          operation: 'update',
          description: `Update ${i}`,
          userId: 'user_1',
          details: {},
          success: true,
        })
      }

      const page1 = await service.queryHistory({ workflowId: 'wf_test_10' }, { limit: 5, offset: 0 })
      const page2 = await service.queryHistory({ workflowId: 'wf_test_10' }, { limit: 5, offset: 5 })

      expect(page1.entries).toHaveLength(5)
      expect(page1.total).toBe(10)
      expect(page2.entries).toHaveLength(5)
    })

    it('should filter by time range', async () => {
      const now = new Date()
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Create an entry that we'll timestamp as yesterday
      await service.recordOperation({
        workflowId: 'wf_test_11',
        operation: 'create',
        description: 'Created yesterday',
        userId: 'user_1',
        details: {},
        success: true,
      })

      // Modify timestamp for yesterday
      const db = await getDatabaseAsync()
      db.exec(`UPDATE workflow_history SET timestamp = '${yesterday.toISOString()}' WHERE workflow_id = 'wf_test_11'`)

      // Add an entry for today
      await service.recordOperation({
        workflowId: 'wf_test_11',
        operation: 'update',
        description: 'Updated today',
        userId: 'user_1',
        details: {},
        success: true,
      })

      const result = await service.queryHistory({
        workflowId: 'wf_test_11',
        startTime: yesterday.toISOString(),
        endTime: tomorrow.toISOString(),
      })

      expect(result.entries).toHaveLength(2)
    })
  })

  describe('exportToCSV', () => {
    it('should export to CSV format', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_12',
        operation: 'create',
        description: 'Created workflow',
        userId: 'user_1',
        details: { name: 'Test' },
        success: true,
      })

      const result = await service.exportToCSV({ workflowId: 'wf_test_12' })

      expect(result.csv).toContain('Timestamp,Workflow ID,Operation,Description')
      expect(result.csv).toContain('create')
      expect(result.csv).toContain('wf_test_12')
      expect(result.filename).toMatch(/workflow_history_.*\.csv/)
      expect(result.recordCount).toBe(1)
    })

    it('should return empty CSV for no entries', async () => {
      const result = await service.exportToCSV({ workflowId: 'nonexistent' })

      expect(result.csv).toBe('')
      expect(result.filename).toBe('workflow_history_empty.csv')
      expect(result.recordCount).toBe(0)
    })

    it('should escape CSV values with quotes', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_13',
        operation: 'create',
        description: 'Test with "quotes" and, comma',
        userId: 'user_1',
        details: {},
        success: true,
      })

      const result = await service.exportToCSV({ workflowId: 'wf_test_13' })

      expect(result.csv).toContain('Test with ""quotes"" and, comma')
    })
  })

  describe('exportToJSON', () => {
    it('should export to JSON format', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_14',
        operation: 'create',
        description: 'Created workflow',
        userId: 'user_1',
        details: { name: 'Test' },
        success: true,
      })

      const result = await service.exportToJSON({ workflowId: 'wf_test_14' })

      const data = JSON.parse(result.json)
      expect(data.entries).toHaveLength(1)
      expect(data.entries[0].operation).toBe('create')
      expect(data.summary).toBeDefined()
      expect(data.totalRecords).toBe(1)
      expect(data.exportedAt).toBeDefined()
      expect(result.filename).toMatch(/workflow_history_.*\.json/)
      expect(result.recordCount).toBe(1)
    })

    it('should include summary in export', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_15',
        operation: 'create',
        description: 'Created',
        userId: 'user_1',
        details: {},
        success: true,
      })

      await service.recordOperation({
        workflowId: 'wf_test_15',
        operation: 'update',
        description: 'Updated',
        userId: 'user_1',
        details: {},
        success: true,
      })

      const result = await service.exportToJSON({ workflowId: 'wf_test_15' })
      const data = JSON.parse(result.json)

      expect(data.summary.byOperation.create).toBe(1)
      expect(data.summary.byOperation.update).toBe(1)
    })
  })

  describe('getWorkflowAuditStats', () => {
    it('should return audit statistics', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_16',
        operation: 'create',
        description: 'Created',
        userId: 'user_1',
        details: {},
        success: true,
      })

      await service.recordOperation({
        workflowId: 'wf_test_16',
        operation: 'execute',
        description: 'Executed',
        userId: 'user_1',
        details: {},
        success: false,
        errorCode: 'ERROR',
      })

      await service.recordOperation({
        workflowId: 'wf_test_16',
        operation: 'update',
        description: 'Updated',
        userId: 'user_2',
        details: {},
        success: true,
        duration: 2000,
      })

      const stats = await service.getWorkflowAuditStats('wf_test_16')

      expect(stats.totalOperations).toBe(3)
      expect(stats.operationsByType.create).toBe(1)
      expect(stats.operationsByType.execute).toBe(1)
      expect(stats.operationsByType.update).toBe(1)
      expect(stats.operationsByUser['user_1']).toBe(2)
      expect(stats.operationsByUser['user_2']).toBe(1)
      expect(stats.errorCount).toBe(1)
      expect(stats.avgDuration).toBe(2000)
      expect(stats.recentActivity).toHaveLength(3)
    })
  })

  describe('cleanupOldHistory', () => {
    it('should delete old history entries', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_17',
        operation: 'create',
        description: 'Created',
        userId: 'user_1',
        details: {},
        success: true,
      })

      // Manually set the timestamp to be old
      const db = await getDatabaseAsync()
      const oldDate = new Date()
      oldDate.setFullYear(oldDate.getFullYear() - 1) // 1 year ago
      db.exec(`UPDATE workflow_history SET timestamp = '${oldDate.toISOString()}' WHERE workflow_id = 'wf_test_17'`)

      // Delete entries older than 1 day
      const deleted = await service.cleanupOldHistory(1)

      expect(deleted).toBe(1)

      const result = await service.queryHistory({ workflowId: 'wf_test_17' })
      expect(result.entries).toHaveLength(0)
    })

    it('should keep recent entries', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_18',
        operation: 'create',
        description: 'Created',
        userId: 'user_1',
        details: {},
        success: true,
      })

      // Delete entries older than 365 days
      const deleted = await service.cleanupOldHistory(365)

      expect(deleted).toBe(0)

      const result = await service.queryHistory({ workflowId: 'wf_test_18' })
      expect(result.entries).toHaveLength(1)
    })
  })

  describe('deleteWorkflowHistory', () => {
    it('should delete all history for a workflow', async () => {
      await service.recordOperation({
        workflowId: 'wf_test_19',
        operation: 'create',
        description: 'Created',
        userId: 'user_1',
        details: {},
        success: true,
      })

      await service.recordOperation({
        workflowId: 'wf_test_19',
        operation: 'update',
        description: 'Updated',
        userId: 'user_1',
        details: {},
        success: true,
      })

      await service.recordOperation({
        workflowId: 'other',
        operation: 'create',
        description: 'Created other',
        userId: 'user_1',
        details: {},
        success: true,
      })

      const deleted = await service.deleteWorkflowHistory('wf_test_19')

      expect(deleted).toBe(2)

      const result = await service.queryHistory({ workflowId: 'wf_test_19' })
      expect(result.entries).toHaveLength(0)

      const otherResult = await service.queryHistory({ workflowId: 'other' })
      expect(otherResult.entries).toHaveLength(1)
    })
  })

  describe('recordBatchOperations', () => {
    it('should record multiple operations in a transaction', async () => {
      const entries = [
        {
          workflowId: 'wf_test_20',
          operation: 'create' as const,
          description: 'Created 1',
          userId: 'user_1',
          details: {},
          success: true,
        },
        {
          workflowId: 'wf_test_20',
          operation: 'update' as const,
          description: 'Updated 2',
          userId: 'user_1',
          details: {},
          success: true,
        },
        {
          workflowId: 'wf_test_20',
          operation: 'execute' as const,
          description: 'Executed 3',
          userId: 'user_1',
          details: {},
          success: true,
        },
      ]

      const results = await service.recordBatchOperations(entries)

      expect(results).toHaveLength(3)
      expect(results[0].operation).toBe('create')
      expect(results[1].operation).toBe('update')
      expect(results[2].operation).toBe('execute')

      const query = await service.queryHistory({ workflowId: 'wf_test_20' })
      expect(query.entries).toHaveLength(3)
    })
  })
})
