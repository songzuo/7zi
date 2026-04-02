/**
 * Notification Detail API Route Tests
 *
 * 测试通知详情 API 端点：
 * - GET /api/notifications/[id]
 * - PATCH /api/notifications/[id]
 * - DELETE /api/notifications/[id]
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PATCH, DELETE } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies - must use same paths as in the actual route file
vi.mock('@/lib/services/notification', () => ({
  notificationService: {
    getNotifications: vi.fn(() => []),
    markAsRead: vi.fn(),
    deleteNotification: vi.fn(),
  },
}))

vi.mock('@/lib/auth/api-auth', () => ({
  authenticateJWT: vi.fn(async req => ({
    authenticated: true,
    userId: 'user-1',
    role: 'user',
  })),
}))

// Import mocked modules after vi.mock calls
import { notificationService } from '@/lib/services/notification'
import { authenticateJWT } from '@/lib/auth/api-auth'

describe('Notification Detail API - GET /api/notifications/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      role: 'user',
    })
  })

  it('应该返回指定的通知', async () => {
    vi.mocked(notificationService.getNotifications).mockReturnValue([
      { id: 'notif-1', userId: 'user-1', title: 'Test', read: false } as any,
    ])

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'GET',
    })

    const response = await GET(request, { params: { id: 'notif-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeDefined()
  })

  it('应该拒绝未认证的请求', async () => {
    vi.mocked(authenticateJWT).mockResolvedValueOnce({ authenticated: false })

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'GET',
    })

    const response = await GET(request, { params: { id: 'notif-1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('应该拒绝访问他人的通知', async () => {
    vi.mocked(notificationService.getNotifications).mockReturnValue([
      { id: 'notif-1', userId: 'user-2', title: 'Test', read: false } as any,
    ])

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'GET',
    })

    const response = await GET(request, { params: { id: 'notif-1' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
  })

  it('管理员可以访问所有通知', async () => {
    vi.mocked(authenticateJWT).mockResolvedValueOnce({
      authenticated: true,
      userId: 'admin-1',
      role: 'admin',
    })

    vi.mocked(notificationService.getNotifications).mockReturnValue([
      { id: 'notif-1', userId: 'user-2', title: 'Test', read: false } as any,
    ])

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'GET',
    })

    const response = await GET(request, { params: { id: 'notif-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('应该返回404如果通知不存在', async () => {
    vi.mocked(notificationService.getNotifications).mockReturnValue([])

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'GET',
    })

    const response = await GET(request, { params: { id: 'notif-1' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
  })
})

describe('Notification Detail API - PATCH /api/notifications/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      role: 'user',
    })
  })

  it('应该标记通知为已读', async () => {
    vi.mocked(notificationService.getNotifications).mockReturnValue([
      { id: 'notif-1', userId: 'user-1', title: 'Test', read: false } as any,
    ])

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'PATCH',
      body: JSON.stringify({ read: true }),
    })

    const response = await PATCH(request, { params: { id: 'notif-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(notificationService.markAsRead).toHaveBeenCalledWith('notif-1')
  })

  it('应该拒绝未认证的请求', async () => {
    vi.mocked(authenticateJWT).mockResolvedValueOnce({ authenticated: false })

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'PATCH',
      body: JSON.stringify({ read: true }),
    })

    const response = await PATCH(request, { params: { id: 'notif-1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
  })

  it('应该拒绝修改他人的通知', async () => {
    vi.mocked(notificationService.getNotifications).mockReturnValue([
      { id: 'notif-1', userId: 'user-2', title: 'Test', read: false } as any,
    ])

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'PATCH',
      body: JSON.stringify({ read: true }),
    })

    const response = await PATCH(request, { params: { id: 'notif-1' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
  })
})

describe('Notification Detail API - DELETE /api/notifications/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      role: 'user',
    })
  })

  it('应该删除指定的通知', async () => {
    vi.mocked(notificationService.getNotifications).mockReturnValue([
      { id: 'notif-1', userId: 'user-1', title: 'Test', read: false } as any,
    ])

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: { id: 'notif-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(notificationService.deleteNotification).toHaveBeenCalledWith('notif-1')
  })

  it('应该拒绝未认证的请求', async () => {
    vi.mocked(authenticateJWT).mockResolvedValueOnce({ authenticated: false })

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: { id: 'notif-1' } })
    const data = await response.json()

    expect(response.status).toBe(401)
  })

  it('应该拒绝删除他人的通知', async () => {
    vi.mocked(notificationService.getNotifications).mockReturnValue([
      { id: 'notif-1', userId: 'user-2', title: 'Test', read: false } as any,
    ])

    const request = new NextRequest('http://localhost:3000/api/notifications/notif-1', {
      method: 'DELETE',
    })

    const response = await DELETE(request, { params: { id: 'notif-1' } })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
  })
})
