/**
 * Unit tests for Audit Log Manager and API Handlers
 */

import { describe, test, expect, beforeEach } from '@jest/globals'
import { AuditLogManager } from './manager'
import { createAuditAPIHandlers } from './api'
import { AuditLogEntry } from './types'

// Helper to type check response body
interface SuccessResponse<T = unknown> {
  success: true
  data: T
}

interface ErrorResponse {
  success: false
  error: string
}

type ResponseBody<T = unknown> = SuccessResponse<T> | ErrorResponse

function expectSuccess<T>(response: {
  status: number
  body: unknown
}): asserts response is { status: number; body: SuccessResponse<T> } {
  expect(response.status).toBe(200)
  expect((response.body as ResponseBody<T>).success).toBe(true)
}

function expectSuccessStatus<T>(
  expectedStatus: number,
  response: { status: number; body: unknown }
): asserts response is { status: number; body: SuccessResponse<T> } {
  expect(response.status).toBe(expectedStatus)
  const body = response.body as ResponseBody<T>
  expect(body.success).toBe(true)
}

function expectError(response: {
  status: number
  body: unknown
}): asserts response is { status: number; body: ErrorResponse } {
  expect((response.body as ResponseBody).success).toBe(false)
}

function addSampleData(manager: AuditLogManager) {
  manager.log({ userId: 'user-1', action: 'create', resourceType: 'document', status: 'success' })
  manager.log({ userId: 'user-1', action: 'read', resourceType: 'document', status: 'success' })
  manager.log({ userId: 'user-2', action: 'update', resourceType: 'document', status: 'success' })
  manager.log({ userId: 'user-3', action: 'delete', resourceType: 'document', status: 'failure' })
  manager.log({ userId: 'user-1', action: 'create', resourceType: 'user', status: 'success' })
}

describe('AuditLogManager', () => {
  let manager: AuditLogManager

  beforeEach(() => {
    manager = new AuditLogManager()
    addSampleData(manager)
  })

  describe('Log', () => {
    test('should create audit entry with generated id and timestamp', () => {
      const entry = manager.log({
        userId: 'user-1',
        action: 'create',
        resourceType: 'document',
        status: 'success',
      })

      expect(entry.id).toBeDefined()
      expect(entry.timestamp).toBeInstanceOf(Date)
      expect(entry.userId).toBe('user-1')
      expect(entry.action).toBe('create')
    })

    test('should log multiple entries', () => {
      manager.log({ action: 'read', resourceType: 'doc', status: 'success' })
      manager.log({ action: 'update', resourceType: 'doc', status: 'success' })
      manager.log({ action: 'delete', resourceType: 'doc', status: 'success' })

      const result = manager.search({})
      expect(result.total).toBeGreaterThan(3)
    })
  })

  describe('Search', () => {
    test('should search with filters', () => {
      const result = manager.search({ action: 'create' })
      expect(result.total).toBeGreaterThan(0)
    })

    test('should paginate results', () => {
      const result = manager.search({}, { page: 1, pageSize: 10 })
      expect(result.entries.length).toBeLessThanOrEqual(10)
      expect(result.page).toBe(1)
    })

    test('should sort results', () => {
      const result = manager.search({}, { sortBy: 'timestamp', sortOrder: 'desc' })
      expect(result.entries).toBeDefined()
    })
  })

  describe('Export', () => {
    test('should create export job', async () => {
      const job = await manager.createExport({
        format: 'csv',
        filters: {},
        maxRecords: 100,
      })

      expect(job.id).toBeDefined()
      // Status might be pending or completed synchronously depending on implementation
      expect(['pending', 'completed']).toContain(job.status)
    })

    test('should wait for export to complete', async () => {
      const job = await manager.createExport({
        format: 'csv',
        filters: {},
        maxRecords: 100,
      })

      // Wait for completion
      await new Promise(resolve => setTimeout(resolve, 500))

      const status = manager.getExportStatus(job.id)
      expect(status?.status).toBe('completed')
    })
  })

  describe('Stats', () => {
    test('should get statistics', () => {
      const stats = manager.getStats()

      expect(stats.total).toBeGreaterThan(0)
      expect(stats.byStatus).toBeDefined()
      expect(stats.byAction).toBeDefined()
      expect(stats.byResourceType).toBeDefined()
    })

    test('should filter stats by date', () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const stats = manager.getStats({
        startDate: yesterday,
      })

      expect(stats.total).toBeGreaterThan(0)
    })
  })
})

describe('API Handlers', () => {
  let manager: AuditLogManager
  let handlers: ReturnType<typeof createAuditAPIHandlers>

  beforeEach(() => {
    manager = new AuditLogManager()
    addSampleData(manager)
    handlers = createAuditAPIHandlers(manager)
  })

  describe('Search API', () => {
    test('should search with query parameters', async () => {
      const response = await handlers.search({
        query: {
          action: 'create',
          page: '1',
          pageSize: '10',
        },
      })

      expectSuccess(response)
      const body = response.body as SuccessResponse<{ entries: unknown[] }>
      expect(body.data.entries).toBeDefined()
    })

    test('should handle search with date range', async () => {
      const now = new Date().toISOString()
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const response = await handlers.search({
        query: {
          startDate: yesterday,
          endDate: now,
        },
      })

      expectSuccess(response)
    })

    test('should handle search with full text', async () => {
      const response = await handlers.search({
        query: {
          searchText: 'create',
        },
      })

      expectSuccess(response)
    })
  })

  describe('Export API', () => {
    test('should create export job', async () => {
      const response = await handlers.createExport({
        body: {
          format: 'csv',
          filters: {},
        },
      })

      expectSuccessStatus<{ jobId: string; status: string }>(202, response)
      const body = response.body as SuccessResponse<{ jobId: string; status: string }>
      expect(body.data.jobId).toBeDefined()
      expect(body.data.status).toBeDefined()
    })

    test('should reject invalid format', async () => {
      const response = await handlers.createExport({
        body: {
          format: 'invalid',
          filters: {},
        },
      })

      expectError(response)
      expect(response.status).toBe(400)
    })

    test('should reject missing format', async () => {
      const response = await handlers.createExport({
        body: {
          filters: {},
        },
      })

      expectError(response)
      expect(response.status).toBe(400)
    })
  })

  describe('Export Status API', () => {
    test('should get export status', async () => {
      // First create an export
      const createResponse = await handlers.createExport({
        body: { format: 'csv', filters: {} },
      })

      const createBody = createResponse.body as SuccessResponse<{ jobId: string }>
      const jobId = createBody.data.jobId

      // Then get status
      const response = await handlers.getExportStatus({
        params: { jobId },
      })

      expectSuccess(response)
      const body = response.body as SuccessResponse<{ id: string }>
      expect(body.data.id).toBe(jobId)
    })

    test('should handle missing job id', async () => {
      const response = await handlers.getExportStatus({
        params: {},
      })

      expectError(response)
      expect(response.status).toBe(400)
    })

    test('should handle non-existent job', async () => {
      const response = await handlers.getExportStatus({
        params: { jobId: 'non-existent' },
      })

      expectError(response)
      expect(response.status).toBe(404)
    })
  })

  describe('Download API', () => {
    test('should download completed export', async () => {
      // Create and wait for export to complete
      const job = await manager.createExport({
        format: 'csv',
        filters: {},
        maxRecords: 100,
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      const response = await handlers.downloadExport({
        params: { jobId: job.id },
      })

      expect(response.status).toBe(200)
      expect(response.body).toBeDefined()
    })

    test('should handle non-existent job', async () => {
      const response = await handlers.downloadExport({
        params: { jobId: 'non-existent' },
      })

      expect(response.status).toBe(404)
    })
  })

  describe('Stats API', () => {
    test('should get statistics', async () => {
      const response = await handlers.getStats({})

      expectSuccess(response)
      const body = response.body as SuccessResponse<{ total: number }>
      expect(body.data.total).toBeGreaterThan(0)
    })

    test('should filter stats by date', async () => {
      const now = new Date().toISOString()
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const response = await handlers.getStats({
        query: {
          startDate: yesterday,
          endDate: now,
        },
      })

      expectSuccess(response)
    })

    test('should handle missing job id in status endpoint', async () => {
      const response = await handlers.getExportStatus({ params: {} })

      expect(response.status).toBe(400)
    })
  })
})
