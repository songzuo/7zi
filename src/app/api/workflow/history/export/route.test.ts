/**
 * Workflow History Export API Tests
 *
 * Covers:
 * - POST /api/workflow/history/export  (CSV / JSON / 非法 format 400 / 服务异常 500 / 非法 JSON 体)
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
  logger: { auth: vi.fn(),
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
  })
}

function createRawRequest(rawBody: string): NextRequest {
  return new NextRequest(new URL('/api/workflow/history/export', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody,
  })
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

  it('should use an empty filter when filter is explicitly null', async () => {
    const request = createRequest({ format: 'json', filter: null })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockHistoryService.exportToJSON).toHaveBeenCalledWith({})
  })

  it('should forward every supported filter field untouched', async () => {
    const filter = {
      workflowId: 'wf_1',
      operation: 'update',
      userId: 'user_1',
      success: false,
      startTime: '2026-01-01T00:00:00.000Z',
      endTime: '2026-12-31T00:00:00.000Z',
      relatedVersionId: 'ver_1',
      relatedInstanceId: 'inst_1',
      relatedNodeId: 'node_1',
    }
    const request = createRequest({ format: 'csv', filter })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockHistoryService.exportToCSV).toHaveBeenCalledTimes(1)
    expect(mockHistoryService.exportToCSV).toHaveBeenCalledWith(filter)
  })

  it('should only call the CSV exporter when format is csv', async () => {
    const request = createRequest({ format: 'csv' })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockHistoryService.exportToCSV).toHaveBeenCalledTimes(1)
    expect(mockHistoryService.exportToJSON).not.toHaveBeenCalled()
  })

  it('should only call the JSON exporter when format is json', async () => {
    const request = createRequest({ format: 'json' })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(mockHistoryService.exportToJSON).toHaveBeenCalledTimes(1)
    expect(mockHistoryService.exportToCSV).not.toHaveBeenCalled()
  })

  it('should return an empty CSV body and a zero record count for an empty export', async () => {
    mockHistoryService.exportToCSV.mockResolvedValue({
      csv: '',
      filename: 'workflow_history_empty.csv',
      recordCount: 0,
    })
    const request = createRequest({ format: 'csv' })

    const response = await POST(request)
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Record-Count')).toBe('0')
    expect(response.headers.get('Content-Disposition')).toBe(
      'attachment; filename="workflow_history_empty.csv"'
    )
    expect(text).toBe('')
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

  it('should return 400 for a format with different casing', async () => {
    const request = createRequest({ format: 'CSV' })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('VALIDATION_ERROR')
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

  it('should return 500 when the CSV export service throws', async () => {
    mockHistoryService.exportToCSV.mockRejectedValue(new Error('csv export failed'))

    const request = createRequest({ format: 'csv' })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('INTERNAL_ERROR')
    expect(data.error.message).toBe('csv export failed')
  })

  it('should stringify non-Error rejections into the 500 payload', async () => {
    mockHistoryService.exportToJSON.mockRejectedValue('boom')

    const request = createRequest({ format: 'json' })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('INTERNAL_ERROR')
    expect(data.error.message).toBe('boom')
  })

  // KNOWN DEFECT (see T134 report D1): the route does not guard `request.json()`
  // against a malformed body, so a SyntaxError surfaces as a 500 INTERNAL_ERROR
  // instead of a 400 VALIDATION_ERROR. This test pins the CURRENT behaviour so
  // that a future fix to 400 will be a visible, intentional change.
  it('should surface a malformed JSON body as a structured 500 error without invoking the exporter', async () => {
    const request = createRawRequest('{not-json')

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('INTERNAL_ERROR')
    expect(typeof data.error.message).toBe('string')
    expect(mockHistoryService.exportToCSV).not.toHaveBeenCalled()
    expect(mockHistoryService.exportToJSON).not.toHaveBeenCalled()
  })

  // KNOWN DEFECT (see T134 report D2): the route dereferences `body.format`
  // without checking that the parsed body is a non-null object. A literal
  // `null` body throws a TypeError, which is reported as a 500 INTERNAL_ERROR
  // instead of a 400 VALIDATION_ERROR.
  it('should surface a null JSON body as a structured 500 error without invoking the exporter', async () => {
    const request = createRawRequest('null')

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('INTERNAL_ERROR')
    expect(mockHistoryService.exportToCSV).not.toHaveBeenCalled()
    expect(mockHistoryService.exportToJSON).not.toHaveBeenCalled()
  })
})
