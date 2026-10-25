/**
 * Workflow History Export API Tests
 *
 * Covers:
 * - POST /api/workflow/history/export  (CSV / JSON / 非法 format 400)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { mockHistoryService } = vi.hoisted(() => ({
  mockHistoryService: {
    exportToCSV: vi.fn(),
    exportToJSON: vi.fn(),
  },
}))

vi.mock('@/lib/workflow/history', () => ({
  workflowHistoryService: mockHistoryService,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

import { POST } from './route'

function createRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('/api/workflow/history/export', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  } as any)
}

const csvPayload = 'Timestamp,Workflow ID\n2026-01-01T00:00:00.000Z,wf_1\n'
const jsonPayload = JSON.stringify({
  exportedAt: '2026-01-01T00:00:00.000Z',
  totalRecords: 1,
  entries: [{ id: 'hist_1', workflowId: 'wf_1', operation: 'update' }],
  summary: { byOperation: { update: 1 }, byUser: { user_1: 1 }, successRate: 100, avgDuration: 12 },
})

describe('POST /api/workflow/history/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHistoryService.exportToCSV.mockResolvedValue({
      csv: csvPayload,
      filename: 'workflow_history_2026-01-01.csv',
      recordCount: 1,
    })
    mockHistoryService.exportToJSON.mockResolvedValue({
      json: jsonPayload,
      filename: 'workflow_history_2026-01-01.json',
      recordCount: 1,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should export as CSV with the download headers', async () => {
    const request = createRequest({ format: 'csv', filter: { workflowId: 'wf_1' } })

    const response = await POST(request)
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/csv')
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="workflow_history_2026-01-01.csv"'
    )
    expect(response.headers.get('X-Record-Count')).toBe('1')
    expect(text).toBe(csvPayload)
    expect(mockHistoryService.exportToCSV).toHaveBeenCalledWith({ workflowId: 'wf_1' })
  })

  it('should export as JSON by default', async () => {
    const request = createRequest({ filter: { workflowId: 'wf_1' } })

    const response = await POST(request)
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="workflow_history_2026-01-01.json"'
    )
    expect(response.headers.get('X-Record-Count')).toBe('1')
    expect(JSON.parse(text).totalRecords).toBe(1)
    expect(mockHistoryService.exportToJSON).toHaveBeenCalledWith({ workflowId: 'wf_1' })
  })

  it('should use an empty filter when none is provided', async () => {
    const request = createRequest({ format: 'json' })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockHistoryService.exportToJSON).toHaveBeenCalledWith({})
  })

  it('should return 400 for an unsupported format', async () => {
    const request = createRequest({ format: 'xml' })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('Format must be "csv" or "json"')
    expect(mockHistoryService.exportToCSV).not.toHaveBeenCalled()
    expect(mockHistoryService.exportToJSON).not.toHaveBeenCalled()
  })

  it('should return 500 when the export service throws', async () => {
    mockHistoryService.exportToJSON.mockRejectedValue(new Error('export failed'))

    const request = createRequest({ format: 'json' })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('INTERNAL_ERROR')
    expect(data.error.message).toBe('export failed')
  })
})
