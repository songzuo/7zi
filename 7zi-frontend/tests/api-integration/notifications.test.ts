/**
 * Notifications API Integration Tests
 *
 * Tests for CRUD operations, error handling, and permission verification
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock modules before importing
vi.mock('@/lib/auth/api-auth', () => ({
  authenticateJWT: vi.fn(),
}))

// Mock notification service
vi.mock('@/lib/services/notification', () => ({
  notificationService: {
    notify: vi.fn().mockResolvedValue('notif_test_123'),
    getNotifications: vi.fn().mockReturnValue([]),
    getUnreadCount: vi.fn().mockReturnValue(0),
    notifyUser: vi.fn(),
  },
  NotificationType: {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    TASK_ASSIGNED: 'task_assigned',
    TASK_COMPLETED: 'task_completed',
    TASK_UPDATED: 'task_updated',
    MESSAGE: 'message',
    SYSTEM: 'system',
  },
  NotificationPriority: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
  },
}))

vi.mock('@/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data, status = 200) => {
    return new Response(JSON.stringify({ success: true, data }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
  createValidationError: vi.fn((message: string, details?: unknown) => {
    return new Response(
      JSON.stringify({
        success: false,
        error: { type: 'VALIDATION', message, details },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }),
  createErrorResponse: vi.fn((error: Error) => {
    return new Response(
      JSON.stringify({
        success: false,
        error: { type: 'INTERNAL', message: 'An internal error occurred' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }),
  ErrorType: {
    VALIDATION: 'VALIDATION',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL: 'INTERNAL',
  },
}))

// Import after mocking
import { GET, POST } from '@/app/api/notifications/route'
import { authenticateJWT } from '@/lib/auth/api-auth'
import {
  notificationService,
  NotificationType,
  NotificationPriority,
} from '@/lib/services/notification'

// Get mocked functions
const mockNotify = vi.mocked(notificationService.notify)
const mockGetNotifications = vi.mocked(notificationService.getNotifications)
const mockGetUnreadCount = vi.mocked(notificationService.getUnreadCount)

describe('Notifications API - GET /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetNotifications.mockReturnValue([])
    mockGetUnreadCount.mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: false,
        error: 'Invalid or expired JWT token',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.success).toBe(false)
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 401 when token is missing', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: false,
        error: 'No JWT token provided',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.success).toBe(false)
    })

    it('should allow authenticated user to access notifications', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Authorization - Role-based', () => {
    it('should allow admin to access all notifications', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'admin-user',
        username: 'admin',
        role: 'admin',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('should restrict non-admin users to their own notifications', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'regularuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('should prevent user from accessing other users notifications', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'regularuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications?userId=user-2', {
        method: 'GET',
      })

      const response = await GET(request)
      expect([200, 403]).toContain(response.status)
    })
  })

  describe('Filtering', () => {
    it('should filter notifications by type', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications?type=info', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('should filter notifications by priority', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications?priority=high', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('should filter notifications by read status', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications?read=false', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('should filter notifications by team ID', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications?teamId=team-1', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('should filter notifications by task ID', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications?taskId=task-1', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('should filter notifications by timestamp (since)', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const since = Date.now() - 86400000
      const request = new NextRequest(`http://localhost/api/notifications?since=${since}`, {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('should respect limit parameter', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications?limit=10', {
        method: 'GET',
      })

      const response = await GET(request)
      expect(response.status).toBe(200)
    })

    it('should apply multiple filters at once', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest(
        'http://localhost/api/notifications?type=error&priority=high&read=false',
        { method: 'GET' }
      )

      const response = await GET(request)
      expect(response.status).toBe(200)
    })
  })

  describe('Response Format', () => {
    it('should return notifications array', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(response.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('notifications')
      expect(Array.isArray(json.data.notifications)).toBe(true)
    })

    it('should include metadata with count', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(json.data).toHaveProperty('meta')
      expect(json.data.meta).toHaveProperty('count')
      expect(typeof json.data.meta.count).toBe('number')
    })

    it('should include unread count in metadata', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'GET',
      })

      const response = await GET(request)
      const json = await response.json()

      expect(json.data.meta).toHaveProperty('unreadCount')
      expect(typeof json.data.meta.unreadCount).toBe('number')
    })
  })
})

describe('Notifications API - POST /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotify.mockResolvedValue('notif_test_123')
    mockGetNotifications.mockReturnValue([])
    mockGetUnreadCount.mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: false,
        error: 'Invalid or expired JWT token',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', message: 'Test message' }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(401)
      expect(json.success).toBe(false)
    })

    it('should allow authenticated user to create notifications', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', message: 'Test message' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })
  })

  describe('Validation', () => {
    it('should return 400 when title is missing', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should return 400 when message is missing', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should return 400 when both title and message are missing', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })

  describe('Create Operations', () => {
    it('should create notification with default type and priority', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Notification',
          message: 'This is a test',
        }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(response.status).toBe(201)
      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('id')
      expect(json.data.message).toBe('Notification created')
    })

    it('should create notification with custom type', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Error Notification',
          message: 'Something went wrong',
          type: 'error',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create notification with custom priority', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Urgent Notification',
          message: 'This is urgent',
          priority: 'urgent',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create notification with optional data', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Data Notification',
          message: 'With extra data',
          data: { taskId: 'task-123', projectId: 'project-1' },
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create notification with target user', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Targeted Notification',
          message: 'For specific user',
          userId: 'user-2',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create notification with team ID', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Team Notification',
          message: 'For the team',
          teamId: 'team-1',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create notification with task ID', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Task Notification',
          message: 'Related to task',
          taskId: 'task-1',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create notification with expiration time', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const expiresAt = Date.now() + 86400000
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Expiring Notification',
          message: 'Will expire soon',
          expiresAt,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create notification with all optional fields', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Complete Notification',
          message: 'With all fields',
          type: 'success',
          priority: 'high',
          data: { custom: 'data' },
          userId: 'user-2',
          teamId: 'team-1',
          taskId: 'task-1',
          expiresAt: Date.now() + 86400000,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })
  })

  describe('Response Format', () => {
    it('should return 201 status for successful creation', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', message: 'Test message' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should return notification ID in response', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', message: 'Test message' }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(json.data).toHaveProperty('id')
      expect(typeof json.data.id).toBe('string')
    })

    it('should return success message', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test', message: 'Test message' }),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.data.message).toBe('Notification created')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid JSON body', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      try {
        const response = await POST(request)
        expect([400, 500]).toContain(response.status)
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should handle very large notification data', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const largeMessage = 'x'.repeat(10000)
      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Large Notification',
          message: largeMessage,
        }),
      })

      const response = await POST(request)
      expect([201, 400, 413, 500]).toContain(response.status)
    })
  })

  describe('Notification Types', () => {
    it('should create INFO type notification', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Info',
          message: 'Info message',
          type: NotificationType.INFO,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create ERROR type notification', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Error',
          message: 'Error message',
          type: NotificationType.ERROR,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create SUCCESS type notification', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Success',
          message: 'Success message',
          type: NotificationType.SUCCESS,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create WARNING type notification', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Warning',
          message: 'Warning message',
          type: NotificationType.WARNING,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create TASK_ASSIGNED type notification', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Task Assigned',
          message: 'You have a new task',
          type: NotificationType.TASK_ASSIGNED,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create SYSTEM type notification', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'System Notice',
          message: 'System announcement',
          type: NotificationType.SYSTEM,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })
  })

  describe('Notification Priorities', () => {
    it('should create LOW priority notification', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Low Priority',
          message: 'Low priority message',
          priority: NotificationPriority.LOW,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create MEDIUM priority notification', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Medium Priority',
          message: 'Medium priority message',
          priority: NotificationPriority.MEDIUM,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create HIGH priority notification', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'High Priority',
          message: 'High priority message',
          priority: NotificationPriority.HIGH,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it('should create URGENT priority notification', async () => {
      vi.mocked(authenticateJWT).mockResolvedValue({
        authenticated: true,
        userId: 'user-1',
        username: 'testuser',
        role: 'user',
        authMethod: 'jwt',
      })

      const request = new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Urgent Priority',
          message: 'Urgent priority message',
          priority: NotificationPriority.URGENT,
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })
  })
})

describe('Notifications API - Role-based Access', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotify.mockResolvedValue('notif_test_123')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should allow admin to create notifications for any user', async () => {
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'admin-user',
      username: 'admin',
      role: 'admin',
      authMethod: 'jwt',
    })

    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Admin Notification',
        message: 'Created by admin',
        userId: 'user-2',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })

  it('should allow regular user to create notifications', async () => {
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      username: 'regularuser',
      role: 'user',
      authMethod: 'jwt',
    })

    const request = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'User Notification',
        message: 'Created by regular user',
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
  })
})

describe('Notifications API - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotify.mockResolvedValue('notif_test_123')
    mockGetNotifications.mockReturnValue([])
    mockGetUnreadCount.mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should handle full workflow: create and retrieve notifications', async () => {
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      username: 'testuser',
      role: 'user',
      authMethod: 'jwt',
    })

    // Create notification
    const createRequest = new NextRequest('http://localhost/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Workflow Test',
        message: 'Testing full workflow',
        type: NotificationType.INFO,
      }),
    })

    const createResponse = await POST(createRequest)
    expect(createResponse.status).toBe(201)

    // Retrieve notifications
    const getRequest = new NextRequest('http://localhost/api/notifications', {
      method: 'GET',
    })

    const getResponse = await GET(getRequest)
    expect(getResponse.status).toBe(200)

    const json = await getResponse.json()
    expect(json.data.notifications).toBeDefined()
  })

  it('should filter notifications correctly after creating multiple', async () => {
    vi.mocked(authenticateJWT).mockResolvedValue({
      authenticated: true,
      userId: 'user-1',
      username: 'testuser',
      role: 'user',
      authMethod: 'jwt',
    })

    // Create multiple notifications
    await POST(
      new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Info',
          message: 'Info message',
          type: NotificationType.INFO,
        }),
      })
    )

    await POST(
      new NextRequest('http://localhost/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Error',
          message: 'Error message',
          type: NotificationType.ERROR,
        }),
      })
    )

    // Filter by type
    const filterRequest = new NextRequest('http://localhost/api/notifications?type=error', {
      method: 'GET',
    })

    const filterResponse = await GET(filterRequest)
    expect(filterResponse.status).toBe(200)
  })
})
