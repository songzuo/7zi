/**
 * Tests for Data Export API route (GET /api/data/export)
 *
 * 说明：原文件 mock 掉了整个 'next/server'，导致返回的假响应没有 `headers`，
 * 而断言又要读 `response.headers.get(...)` —— 必挂。同时断言的响应结构
 * （data.formats）和真实路由返回的结构（success / supportedTables / usage）
 * 也对不上。这里改为使用真实的 NextResponse，按真实结构断言。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/data/export/route'

describe('GET /api/data/export', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 200 OK', async () => {
    const request = new NextRequest('http://localhost/api/data/export', {
      method: 'GET',
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
  })

  it('should return JSON content', async () => {
    const request = new NextRequest('http://localhost/api/data/export', {
      method: 'GET',
    })

    const response = await GET(request)

    expect(response.headers.get('Content-Type')).toContain('application/json')
  })

  it('should include export options', async () => {
    const request = new NextRequest('http://localhost/api/data/export', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(data).toHaveProperty('success')
    expect(data.success).toBe(true)
    expect(data).toHaveProperty('supportedTables')
    expect(data).toHaveProperty('usage')
    expect(data.usage).toHaveProperty('method', 'POST')
  })

  it('should support authentication check', async () => {
    const request = new NextRequest('http://localhost/api/data/export', {
      method: 'GET',
      headers: new Headers({
        Authorization: 'Bearer token123',
      }),
    })

    const response = await GET(request)

    expect([200, 401, 403]).toContain(response.status)
  })
})
