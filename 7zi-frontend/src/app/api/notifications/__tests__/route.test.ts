/**
 * Notifications API Route Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock notification service
vi.mock('@/lib/services/notification', () => ({
  notificationService: {
    notify: vi.fn(),
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
  },
  NotificationType: {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
  },
  NotificationPriority: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
  },
}))

// Mock CSRF middleware to bypass token validation in tests
vi.mock('@/lib/middleware/csrf', () => ({
  withCSRF: (handler: Function) => handler, // Bypass CSRF validation
  generateCSRFToken: vi.fn(),
  getCSRFToken: vi.fn(),
  requiresCSRFProtection: vi.fn(() => false),
  extractCSRFToken: vi.fn(() => ({})),
}))

// Mock auth - must be done before importing route
vi.mock('@/lib/auth/api-auth', () => ({
  authenticateJWT: vi.fn(),
}))

// Mock the hot data cache to avoid cross-test pollution
vi.mock('@/lib/cache', () => ({
  createHotDataCache: vi.fn(() => ({
    get: vi.fn(() => null), // Always return null (cache miss) in tests
    set: vi.fn(),
    delete: vi.fn(),
    deleteByUser: vi.fn(),
    clear: vi.fn(),
  })),
  CachePresets: {
    SHORT: { ttl: 5000, maxSize: 100 },
    MEDIUM: { ttl: 30000, maxSize: 500 },
    LONG: { ttl: 300000, maxSize: 1000 },
  },
}))

// Import mocked modules after vi.mock calls
import { GET, POST } from '../route'
import { notificationService } from '@/lib/services/notification'
import { authenticateJWT } from '@/lib/auth/api-auth'
import { NotificationType, NotificationPriority } from '@/lib/services/notification'

describe('Notifications API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-123',
      role: 'user',
    })
  })

  describe('GET /api/notifications', () => {
    it('should get notifications with no filters', async () => {
      const mockNotifications: any[] = [
        {
          id: '1',
          title: 'Test 1',
          type: 'info',
          priority: 'medium',
          message: 'Test message 1',
          read: false,
          createdAt: Date.now(),
        },
        {
          id: '2',
          title: 'Test 2',
          type: 'success',
          priority: 'high',
          message: 'Test message 2',
          read: false,
          createdAt: Date.now(),
        },
      ]
      vi.mocked(notificationService.getNotifications).mockReturnValue(mockNotifications)
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(5)

      const url = new URL('http://localhost/api/notifications')
      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(notificationService.getNotifications).toHaveBeenCalledWith({ userId: 'user-123' })
      expect(notificationService.getUnreadCount).toHaveBeenCalledWith({ userId: 'user-123' })
      expect(data.success).toBe(true)
      expect(data.data.notifications).toEqual(mockNotifications)
      expect(data.data.meta).toEqual({
        count: 2,
        unreadCount: 5,
      })
    })

    it('should get notifications with type filter', async () => {
      const mockNotifications: any[] = [
        {
          id: '1',
          title: 'Test',
          type: 'error',
          priority: 'medium',
          message: 'Test',
          read: false,
          createdAt: Date.now(),
        },
      ]
      vi.mocked(notificationService.getNotifications).mockReturnValue(mockNotifications)
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0)

      const url = new URL('http://localhost/api/notifications?type=error')
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'user-123',
        type: NotificationType.ERROR,
      })
    })

    it('should get notifications with priority filter', async () => {
      vi.mocked(notificationService.getNotifications).mockReturnValue([])
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0)

      const url = new URL('http://localhost/api/notifications?priority=high')
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'user-123',
        priority: NotificationPriority.HIGH,
      })
    })

    it('should get notifications with userId filter', async () => {
      vi.mocked(authenticateJWT).mockResolvedValueOnce({
        authenticated: true,
        userId: 'admin-1',
        role: 'admin',
      })

      vi.mocked(notificationService.getNotifications).mockReturnValue([])
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0)

      const url = new URL('http://localhost/api/notifications?userId=user-123')
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'user-123',
      })
    })

    it('should get notifications with teamId filter', async () => {
      vi.mocked(notificationService.getNotifications).mockReturnValue([])
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0)

      const url = new URL('http://localhost/api/notifications?teamId=team-123')
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'user-123',
        teamId: 'team-123',
      })
    })

    it('should get notifications with taskId filter', async () => {
      vi.mocked(notificationService.getNotifications).mockReturnValue([])
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0)

      const url = new URL('http://localhost/api/notifications?taskId=task-123')
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'user-123',
        taskId: 'task-123',
      })
    })

    it('should get notifications with read filter', async () => {
      vi.mocked(notificationService.getNotifications).mockReturnValue([])
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0)

      const url = new URL('http://localhost/api/notifications?read=true')
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'user-123',
        read: true,
      })
    })

    it('should get notifications with since filter', async () => {
      vi.mocked(notificationService.getNotifications).mockReturnValue([])
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0)

      const url = new URL('http://localhost/api/notifications?since=1234567890')
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'user-123',
        since: 1234567890,
      })
    })

    it('should respect limit parameter', async () => {
      const mockNotifications = Array(60)
        .fill(null)
        .map((_, i) => ({
          id: String(i),
          title: `Test ${i}`,
          type: 'info' as const,
          priority: 'medium' as const,
          message: `Test message ${i}`,
          read: false,
          createdAt: Date.now(),
        }))
      vi.mocked(notificationService.getNotifications).mockReturnValue(mockNotifications)
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(60)

      const url = new URL('http://localhost/api/notifications?limit=10')
      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.meta.count).toBe(10)
      expect(data.data.notifications.length).toBe(10)
    })

    it('should use default limit of 50', async () => {
      const mockNotifications = Array(60)
        .fill(null)
        .map((_, i) => ({
          id: String(i),
          title: `Test ${i}`,
          type: 'info' as const,
          priority: 'medium' as const,
          message: `Test message ${i}`,
          read: false,
          createdAt: Date.now(),
        }))
      vi.mocked(notificationService.getNotifications).mockReturnValue(mockNotifications)
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(60)

      const url = new URL('http://localhost/api/notifications')
      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.meta.count).toBe(50)
      expect(data.data.notifications.length).toBe(50)
    })

    it('should handle errors', async () => {
      vi.mocked(notificationService.getNotifications).mockImplementation(() => {
        throw new Error('Service error')
      })

      const url = new URL('http://localhost/api/notifications')
      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle combined filters', async () => {
      vi.mocked(notificationService.getNotifications).mockReturnValue([])
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0)

      const url = new URL('http://localhost/api/notifications?type=info&priority=high&read=false')
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'user-123',
        type: NotificationType.INFO,
        priority: NotificationPriority.HIGH,
        read: false,
      })
    })
  })

  describe('POST /api/notifications', () => {
    it('should create notification with required fields', async () => {
      vi.mocked(notificationService.notify).mockResolvedValue('notif-123')

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
          message: 'Test message',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(notificationService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: 'Test',
          message: 'Test message',
        })
      )
    })

    it('should create notification with all fields', async () => {
      vi.mocked(notificationService.notify).mockResolvedValue('notif-123')

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
          message: 'Test message',
          type: 'warning',
          priority: 'high',
          userId: 'user-123',
          teamId: 'team-123',
          taskId: 'task-123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(notificationService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.WARNING,
          priority: NotificationPriority.HIGH,
          title: 'Test',
          message: 'Test message',
          userId: 'user-123',
          teamId: 'team-123',
          taskId: 'task-123',
        })
      )
    })

    it('should return validation error when title is missing', async () => {
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          message: 'Test message',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('title and message are required')
    })

    it('should return validation error when message is missing', async () => {
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('title and message are required')
    })

    it('should return validation error when both title and message are missing', async () => {
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('title and message are required')
    })

    it('should handle errors during notification creation', async () => {
      vi.mocked(notificationService.notify).mockRejectedValue(new Error('Creation failed'))

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
          message: 'Test message',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(authenticateJWT).mockResolvedValueOnce({
        authenticated: false,
        error: 'No JWT token provided',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
          message: 'Test message',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('UNAUTHORIZED')
    })

    it('should return validation error for empty title and message strings', async () => {
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: '',
          message: '',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('title and message are required')
    })

    it('should create notification with expiresAt', async () => {
      vi.mocked(notificationService.notify).mockResolvedValue('notif-123')

      const expiresAt = new Date('2025-12-31T23:59:59Z').toISOString()
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
          message: 'Test message',
          expiresAt,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(notificationService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test',
          message: 'Test message',
          expiresAt,
        })
      )
    })
  })

  describe('Authentication edge cases', () => {
    it('GET should return 401 when user is not authenticated', async () => {
      vi.mocked(authenticateJWT).mockResolvedValueOnce({
        authenticated: false,
        error: 'Invalid or expired JWT token',
      })

      const url = new URL('http://localhost/api/notifications')
      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.type).toBe('UNAUTHORIZED')
    })

    it('non-admin user should only see their own notifications regardless of userId filter', async () => {
      // Regular user trying to access another user's notifications
      vi.mocked(notificationService.getNotifications).mockReturnValue([])
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0)

      const url = new URL('http://localhost/api/notifications?userId=other-user-456')
      const request = new NextRequest(url)
      const response = await GET(request)

      expect(response.status).toBe(200)
      // Should filter by the authenticated user's ID, not the requested userId
      expect(notificationService.getNotifications).toHaveBeenCalledWith({
        userId: 'user-123', // The authenticated user's ID, not 'other-user-456'
      })
    })

    it('should return empty notifications list gracefully', async () => {
      // Reset mock to return empty array
      vi.mocked(notificationService.getNotifications).mockReturnValue([])
      vi.mocked(notificationService.getUnreadCount).mockReturnValue(0)

      const url = new URL('http://localhost/api/notifications')
      const request = new NextRequest(url)
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.notifications).toEqual([])
      expect(data.data.meta.count).toBe(0)
      expect(data.data.meta.unreadCount).toBe(0)
    })
  })
})
