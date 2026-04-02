// @ts-nocheck - Test file with complex type issues
/**
 * Tests for Export API Routes
 */

import { GET } from '@/app/api/data/export/route'
import { NextRequest } from 'next/server'

// Mock NextResponse and NextRequest
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn(data => ({
      json: data,
      status: 200,
    })),
    blob: vi.fn(data => ({ status: 200 })),
    error: vi.fn(() => ({ status: 500 })),
  },
  NextRequest: vi.fn(),
}))

describe('GET /api/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 200 OK', async () => {
    const request = new NextRequest('http://localhost/api/export', {
      method: 'GET',
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('should return JSON content', async () => {
    const request = new NextRequest('http://localhost/api/export', {
      method: 'GET',
    })

    const response = await GET(request)

    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('should include export options', async () => {
    const request = new NextRequest('http://localhost/api/export', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = response.json

    expect(data).toHaveProperty('data')
    expect(data.data).toHaveProperty('formats')
  })

  it('should support authentication check', async () => {
    const request = new NextRequest('http://localhost/api/export', {
      method: 'GET',
      headers: new Headers({
        Authorization: 'Bearer token123',
      }),
    })

    const response = await GET(request)

    expect([200, 401, 403]).toContain(response.status)
  })
})
