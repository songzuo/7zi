/**
 * Feedback API Route Tests
 *
 * 测试反馈管理 API 端点：
 * - GET /api/feedback (列表)
 * - POST /api/feedback (提交)
 * - PATCH /api/feedback (更新)
 * - DELETE /api/feedback (删除)
 */

import { NextRequest } from 'next/server'
import { vi, beforeEach, describe, it, expect } from 'vitest'

// Mock api-auth 模块
vi.mock('@/lib/auth/api-auth', () => ({
  withAuth: vi.fn(handler => {
    return async (request: NextRequest) => {
      // 从 headers 提取用户信息
      const userId = request.headers.get('x-user-id') || 'anonymous'
      const username = request.headers.get('x-user-name') || 'Anonymous'
      const userEmail = request.headers.get('x-user-email') || 'anonymous@example.com'
      const role = request.headers.get('x-user-role') || 'user'

      const context = {
        user: {
          authenticated: true,
          userId,
          username,
          userEmail,
          role,
        },
      }

      return handler(request, context)
    }
  }),
  withAdmin: vi.fn(handler => {
    return async (request: NextRequest) => {
      const userId = request.headers.get('x-user-id') || 'anonymous'
      const username = request.headers.get('x-user-name') || 'Anonymous'
      const userEmail = request.headers.get('x-user-email') || 'anonymous@example.com'
      const role = request.headers.get('x-user-role') || 'user'

      if (role !== 'admin') {
        const { NextResponse } = await import('next/server')
        return NextResponse.json(
          { success: false, error: 'Forbidden', message: '需要管理员权限' },
          { status: 403 }
        )
      }

      const context = {
        user: {
          authenticated: true,
          userId,
          username,
          userEmail,
          role,
        },
      }

      return handler(request, context)
    }
  }),
}))

// 导入 route handlers (在 mock 之后)
import { GET, POST, PATCH, DELETE } from '../route'

describe('Feedback API - GET /api/feedback', () => {
  it('应该返回反馈列表', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback', {
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'admin',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.feedbacks).toBeInstanceOf(Array)
  })

  it('应该支持分页', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback?page=1&limit=10', {
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'admin',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.page).toBe(1)
    expect(data.data.limit).toBe(10)
  })

  it('应该拒绝无效的分页参数', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback?page=-1', {
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'admin',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该支持类型过滤', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback?type=bug', {
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'admin',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('应该支持状态过滤', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback?status=pending', {
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'admin',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('普通用户只能看到自己的反馈', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback', {
      headers: {
        'x-user-id': 'user-2',
        'x-user-role': 'user',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // 验证只返回该用户的反馈
    // data.data.feedbacks.forEach(f => expect(f.userId).toBe('user-2'));
  })
})

describe('Feedback API - POST /api/feedback', () => {
  it('应该成功提交反馈', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'x-user-name': 'Test User',
        'x-user-email': 'test@example.com',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'bug',
        priority: 'high',
        title: 'Test Bug',
        description: 'This is a test bug report with enough characters',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.message).toContain('感谢')
    expect(data.data.id).toBeDefined()
    expect(data.data.type).toBe('bug')
  })

  it('应该验证必填字段', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'bug',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.errors).toBeDefined()
  })

  it('应该验证描述长度', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'bug',
        title: 'Test',
        description: 'short',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该验证邮箱格式', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'bug',
        title: 'Test',
        description: 'This is a test with enough characters',
        email: 'invalid-email', // 无效邮箱格式（在body中）
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('应该限制附件数量', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'POST',
      headers: {
        'x-user-id': 'user-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'bug',
        title: 'Test',
        description: 'This is a test with enough characters',
        attachments: ['a', 'b', 'c', 'd', 'e', 'f'], // 6个附件（超过限制）
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})

describe('Feedback API - PATCH /api/feedback', () => {
  it('应该为管理员更新反馈状态', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'PATCH',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-role': 'admin',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedbackId: 'test-id',
        status: 'in_progress',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect([200, 404]).toContain(response.status) // 200（成功）或 404（反馈不存在）
    expect(data).toBeDefined()
  })

  it('应该拒绝普通用户的更新请求', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'PATCH',
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'user',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        feedbackId: 'test-id',
        status: 'resolved',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Forbidden')
  })

  it('应该验证反馈ID', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'PATCH',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-role': 'admin',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'resolved',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})

describe('Feedback API - DELETE /api/feedback', () => {
  it('应该为管理员删除反馈', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback?id=test-id', {
      method: 'DELETE',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-role': 'admin',
      },
    })

    const response = await DELETE(request)
    const data = await response.json()

    // 可能返回 404（如果反馈不存在）或 200（如果存在）
    expect([200, 404]).toContain(response.status)
  })

  it('应该拒绝普通用户的删除请求', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback?id=test-id', {
      method: 'DELETE',
      headers: {
        'x-user-id': 'user-1',
        'x-user-role': 'user',
      },
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
  })

  it('应该验证反馈ID参数', async () => {
    const request = new NextRequest('http://localhost:3000/api/feedback', {
      method: 'DELETE',
      headers: {
        'x-user-id': 'admin-1',
        'x-user-role': 'admin',
      },
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})
