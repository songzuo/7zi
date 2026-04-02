/**
 * Notification Statistics API Route Tests
 *
 * 测试通知统计 API 端点：
 * - GET /api/notifications/stats
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies - must use same paths as in the actual route file
vi.mock('@/lib/services/notification-enhanced', () => ({
  enhancedNotificationService: {
    getStats: vi.fn(() => ({
      total: 100,
      unread: 20,
      byType: {},
      byPriority: {},
    })),
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
import { enhancedNotificationService } from '@/lib/services/notification-enhanced'
import { authenticateJWT } from '@/lib/auth/api-auth'

describe('Notification Stats API - GET /api/notifications/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      role: 'user',
    })
  })

  it('应该为管理员返回统计信息', async () => {
    vi.mocked(authenticateJWT).mockResolvedValueOnce({
      authenticated: true,
      userId: 'admin-1',
      role: 'admin',
    })

    vi.mocked(enhancedNotificationService.getStats).mockReturnValue({
      totalNotifications: 100,
      unreadNotifications: 20,
      totalUsers: 10,
      totalDeliveries: 50,
      emailEnabled: true,
    } as any)

    const request = new NextRequest('http://localhost:3000/api/notifications/stats', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.total).toBe(100)
    expect(data.data.unread).toBe(20)
  })

  it('应该拒绝未认证的请求', async () => {
    vi.mocked(authenticateJWT).mockResolvedValueOnce({ authenticated: false })

    const request = new NextRequest('http://localhost:3000/api/notifications/stats', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('应该拒绝普通用户访问统计信息', async () => {
    const request = new NextRequest('http://localhost:3000/api/notifications/stats', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Forbidden')
  })

  it('应该按类型分组统计', async () => {
    vi.mocked(authenticateJWT).mockResolvedValueOnce({
      authenticated: true,
      userId: 'admin-1',
      role: 'admin',
    })

    vi.mocked(enhancedNotificationService.getStats).mockReturnValue({
      totalNotifications: 100,
      unreadNotifications: 20,
      totalUsers: 10,
      totalDeliveries: 50,
    } as any)

    const request = new NextRequest('http://localhost:3000/api/notifications/stats', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.total).toBe(100)
  })

  it('应该按优先级分组统计', async () => {
    vi.mocked(authenticateJWT).mockResolvedValueOnce({
      authenticated: true,
      userId: 'admin-1',
      role: 'admin',
    })

    vi.mocked(enhancedNotificationService.getStats).mockReturnValue({
      totalNotifications: 100,
      unreadNotifications: 20,
      totalUsers: 10,
      totalDeliveries: 50,
    } as any)

    const request = new NextRequest('http://localhost:3000/api/notifications/stats', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.total).toBe(100)
    expect(data.data.unread).toBe(20)
  })
})
