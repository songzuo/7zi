/**
 * Search API Route Tests
 *
 * 测试搜索 API 端点：
 * - GET /api/search (搜索)
 * - SUGGESTIONS (搜索建议)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, SUGGESTIONS } from '../route'
import { NextRequest } from 'next/server'

// Mock auth middleware
vi.mock('@/middleware/auth.middleware', () => ({
  authMiddleware: vi.fn(() => new Response(null, { status: 200 })),
}))

describe('Search API - GET /api/search', () => {
  it('应该成功执行搜索', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?q=test', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.results).toBeInstanceOf(Array)
    expect(data.data.query).toBeDefined()
    expect(data.data.total).toBeDefined()
  })

  it('应该拒绝空的搜索关键词', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?q=', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该验证分页参数', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?q=test&page=0', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该限制每页结果数量', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?q=test&limit=101', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该支持类型过滤', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?q=test&type=projects', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.filters.type).toBe('projects')
  })

  it('应该拒绝无效的类型参数', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?q=test&type=invalid', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该支持排序方式', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?q=test&sort=date', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.filters.sortBy).toBe('date')
  })

  it('应该拒绝无效的排序参数', async () => {
    const request = new NextRequest('http://localhost:3000/api/search?q=test&sort=invalid', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该清理搜索关键词（防止注入）', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/search?q=<script>alert(1)</script>',
      {
        headers: {
          'x-user-id': 'user-1',
        },
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.query).not.toContain('<script>')
  })

  // Auth middleware tests are covered in auth middleware unit tests
})

describe('Search API - SUGGESTIONS', () => {
  it('应该返回搜索建议', async () => {
    const request = new NextRequest('http://localhost:3000/api/search/suggestions?q=test', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await SUGGESTIONS(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.suggestions).toBeInstanceOf(Array)
    expect(data.data.query).toBeDefined()
  })

  it('应该为空查询返回空建议', async () => {
    const request = new NextRequest('http://localhost:3000/api/search/suggestions?q=', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await SUGGESTIONS(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.suggestions).toEqual([])
  })

  it('应该限制建议文本长度', async () => {
    const longQuery = 'a'.repeat(100)
    const request = new NextRequest(`http://localhost:3000/api/search/suggestions?q=${longQuery}`, {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await SUGGESTIONS(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.query.length).toBeLessThanOrEqual(50)
  })
})
