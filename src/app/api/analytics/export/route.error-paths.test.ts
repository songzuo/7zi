/**
 * Analytics Export API - error-path tests (additional coverage)
 *
 * The existing route.test.ts covers the happy paths and the 400 validation
 * branches. This file covers the remaining branches:
 *   - the outer catch block (-> 500) when the Excel conversion blows up
 *   - the JSON body that is a valid JSON but not an object
 *   - the JSON export content type / filename handling
 *   - the GET options endpoint structure
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/logger', () => ({
  logger: { auth: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}))

// ExcelJS is dynamically imported by the route; make the import fail so the
// outer catch block can be exercised without a real workbook.
vi.mock('exceljs', () => {
  throw new Error('exceljs unavailable')
})

import { GET, POST } from './route'

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest(new URL('/api/analytics/export', 'http://localhost'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

const SAMPLE_DATA = [
  {
    timestamp: '2026-01-01T00:00:00.000Z',
    date: 'Jan 1',
    agents: 3,
    users: 5,
    tasks: 7,
    tokens: 100,
    revenue: 50,
    errors: 0,
  },
]

describe('Analytics export - error paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns 500 when the Excel conversion throws', async () => {
    const response = await POST(createPostRequest({ format: 'xlsx', data: SAMPLE_DATA }))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.success).toBe(false)
  })

  it('returns 400 when the JSON body is a bare string', async () => {
    const response = await POST(createPostRequest('"just-a-string"'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('returns 400 when the JSON body is a number', async () => {
    const response = await POST(createPostRequest(42))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('returns 400 when the JSON body is malformed', async () => {
    const response = await POST(createPostRequest('{oops'))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
  })

  it('returns a CSV download with the correct headers', async () => {
    const response = await POST(createPostRequest({ format: 'csv', data: SAMPLE_DATA }))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/csv')
    expect(response.headers.get('Content-Disposition')).toContain('attachment; filename=')
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate')

    const csv = await response.text()
    expect(csv.split('\n')[0]).toContain('timestamp')
    expect(csv).toContain('2026-01-01T00:00:00.000Z')
  })

  it('returns a JSON download with the correct content type', async () => {
    const response = await POST(createPostRequest({ format: 'json', data: SAMPLE_DATA }))

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/json')

    const parsed: unknown = await response.json()
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(1)
  })

  it('derives the filename from the date range when one is supplied', async () => {
    const response = await POST(
      createPostRequest({
        format: 'csv',
        data: SAMPLE_DATA,
        filename: 'report',
        dateRange: { start: '2026-01-01', end: '2026-01-31' },
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Disposition')).toContain('report_2026-01-01_to_2026-01-31.csv')
  })
})

describe('GET /api/analytics/export - options endpoint', () => {
  it('returns the supported formats and limits', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.formats).toEqual(['csv', 'xlsx', 'json'])
    expect(body.data.maxRecords).toBe(10000)
    expect(body.data.options.includeHeaders).toEqual(['true', 'false'])
    expect(body.data.options.timeRange).toContain('custom')
  })
})
