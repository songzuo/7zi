/**
 * Data Import API Route Tests
 *
 * 测试数据导入 API 端点：
 * - POST /api/data/import (导入)
 * - GET /api/data/import (历史)
 */

import { POST, GET } from '../route'
import { NextRequest } from 'next/server'

// Mock auth middleware
vi.mock('@/middleware/auth.middleware', () => ({
  authMiddleware: vi.fn(() => new Response(null, { status: 200 })),
}))

describe('Data Import API - POST /api/data/import', () => {
  it('应该成功导入 JSON 数据', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/import', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [
          { id: '1', name: 'Test 1' },
          { id: '2', name: 'Test 2' },
        ],
        format: 'json',
        options: {
          skipDuplicates: true,
          validate: true,
        },
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.imported).toBe(2)
    expect(data.data.failed).toBe(0)
  })

  it('应该验证导入数据格式', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/import', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: 'invalid format',
        format: 'json',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该拒绝空数据', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/import', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [],
        format: 'json',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.type).toBe('BAD_REQUEST')
  })

  it('应该支持 CSV 格式', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/import', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [
          { id: '1', name: 'Test 1' },
          { id: '2', name: 'Test 2' },
        ],
        format: 'csv',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.format).toBe('csv')
  })

  it('应该拒绝无效的格式参数', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/import', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [{ id: '1' }],
        format: 'invalid',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该处理导入延迟', async () => {
    const startTime = Date.now()
    const request = new NextRequest('http://localhost:3000/api/data/import', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [{ id: '1', name: 'Test' }],
        format: 'json',
      }),
    })

    const response = await POST(request)
    const endTime = Date.now()

    expect(response.status).toBe(200)
    expect(endTime - startTime).toBeGreaterThanOrEqual(500) // 模拟500ms延迟
  })
})

describe('Data Import API - GET /api/data/import', () => {
  it('应该返回导入历史', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/import?page=1&limit=10', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.imports).toBeDefined()
    expect(data.data.total).toBeDefined()
  })

  it('应该验证分页参数', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/import?page=0', {
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
    const request = new NextRequest('http://localhost:3000/api/data/import?limit=101', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该支持默认分页参数', async () => {
    const request = new NextRequest('http://localhost:3000/api/data/import', {
      headers: {
        'x-user-id': 'user-1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.page).toBe(1)
    expect(data.data.limit).toBe(20)
  })
})
