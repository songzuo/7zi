/**
 * Tests for User Preferences API Routes
 *
 * 测试用户偏好设置 API 路由的完整功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT } from '../route'

// Mock dependencies
vi.mock('@/lib/db/user-preferences', () => ({
  initializeUserPreferencesTable: vi.fn(),
  getUserPreferences: vi.fn(),
  createUserPreferences: vi.fn(),
  updateUserPreferences: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('GET /api/user/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常请求测试', () => {
    it('应该成功返回用户偏好设置', async () => {
      const { getUserPreferences } = await import('@/lib/db/user-preferences')
      vi.mocked(getUserPreferences).mockResolvedValue({
        user_id: 'user-123',
        locale: 'zh',
        theme: 'dark',
        timezone: 'Asia/Shanghai',
        notifications_enabled: true,
        email_notifications: true,
        sound_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      })

      const request = new NextRequest('http://localhost/api/user/preferences?user_id=user-123', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.user_id).toBe('user-123')
      expect(data.data.locale).toBe('zh')
      expect(data.data.theme).toBe('dark')
    })

    it('当用户偏好不存在时应该返回默认值', async () => {
      const { getUserPreferences } = await import('@/lib/db/user-preferences')
      vi.mocked(getUserPreferences).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/user/preferences?user_id=user-456', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.locale).toBe('zh')
      expect(data.data.theme).toBe('system')
      expect(data.data.notifications_enabled).toBe(true)
      expect(data.data.email_notifications).toBe(true)
      expect(data.data.sound_enabled).toBe(true)
    })
  })

  describe('输入验证测试', () => {
    it('缺少 user_id 参数时应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('user_id is required')
    })

    it('user_id 为空字符串时应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/user/preferences?user_id=', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })
  })

  describe('错误处理测试', () => {
    it('数据库错误时应该返回 500', async () => {
      const { getUserPreferences } = await import('@/lib/db/user-preferences')
      vi.mocked(getUserPreferences).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost/api/user/preferences?user_id=user-123', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Internal server error')
    })

    it('未知错误时应该返回 500', async () => {
      const { getUserPreferences } = await import('@/lib/db/user-preferences')
      vi.mocked(getUserPreferences).mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost/api/user/preferences?user_id=user-123', {
        method: 'GET',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Internal server error')
    })
  })

  describe('边界条件测试', () => {
    it('应该处理特殊字符的 user_id', async () => {
      const { getUserPreferences } = await import('@/lib/db/user-preferences')
      vi.mocked(getUserPreferences).mockResolvedValue(null)

      const request = new NextRequest(
        'http://localhost/api/user/preferences?user_id=user%40test.com',
        {
          method: 'GET',
        }
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('应该处理非常长的 user_id', async () => {
      const { getUserPreferences } = await import('@/lib/db/user-preferences')
      vi.mocked(getUserPreferences).mockResolvedValue(null)

      const longUserId = 'a'.repeat(1000)
      const request = new NextRequest(
        `http://localhost/api/user/preferences?user_id=${longUserId}`,
        {
          method: 'GET',
        }
      )

      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })
})

describe('POST /api/user/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常请求测试', () => {
    it('应该成功创建用户偏好设置', async () => {
      const { getUserPreferences, createUserPreferences } =
        await import('@/lib/db/user-preferences')

      const newPreferences = {
        user_id: 'user-new',
        locale: 'en',
        theme: 'light' as const,
        timezone: 'America/New_York',
        notifications_enabled: false,
        email_notifications: false,
        sound_enabled: false,
      }

      vi.mocked(getUserPreferences).mockResolvedValue(null)
      vi.mocked(createUserPreferences).mockResolvedValue({
        ...newPreferences,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.user_id).toBe('user-new')
      expect(data.data.locale).toBe('en')
      expect(data.data.theme).toBe('light')
    })

    it('应该只创建指定的字段', async () => {
      const { getUserPreferences, createUserPreferences } =
        await import('@/lib/db/user-preferences')

      const partialPreferences = {
        user_id: 'user-partial',
        locale: 'ja',
        theme: 'dark' as const,
      }

      vi.mocked(getUserPreferences).mockResolvedValue(null)
      vi.mocked(createUserPreferences).mockResolvedValue({
        ...partialPreferences,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        notifications_enabled: true,
        email_notifications: true,
        sound_enabled: true,
      })

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partialPreferences),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })
  })

  describe('输入验证测试', () => {
    it('缺少 user_id 应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: 'en',
          theme: 'light',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('user_id is required')
    })

    it('user_id 为空字符串应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: '',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('空请求体应该返回错误', async () => {
      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('无效的 JSON 应该返回错误', async () => {
      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
    })
  })

  describe('错误处理测试', () => {
    it('用户偏好已存在应该返回 409', async () => {
      const { getUserPreferences } = await import('@/lib/db/user-preferences')

      const existingPreferences = {
        user_id: 'user-existing',
        locale: 'zh',
        theme: 'dark',
      }

      vi.mocked(getUserPreferences).mockResolvedValue(existingPreferences as any)

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(existingPreferences),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error).toContain('User preferences already exist')
    })

    it('数据库错误应该返回 500', async () => {
      const { getUserPreferences, createUserPreferences } =
        await import('@/lib/db/user-preferences')

      vi.mocked(getUserPreferences).mockResolvedValue(null)
      vi.mocked(createUserPreferences).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-new',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Internal server error')
    })

    it('未知错误应该返回 500', async () => {
      const { getUserPreferences } = await import('@/lib/db/user-preferences')
      vi.mocked(getUserPreferences).mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-new',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
    })
  })

  describe('边界条件测试', () => {
    it('应该处理非常长的值', async () => {
      const { getUserPreferences, createUserPreferences } =
        await import('@/lib/db/user-preferences')

      const longData = {
        user_id: 'user-long',
        locale: 'a'.repeat(100),
        theme: 'b'.repeat(100) as 'light' | 'dark' | 'system',
      }

      vi.mocked(getUserPreferences).mockResolvedValue(null)
      vi.mocked(createUserPreferences).mockResolvedValue({
        ...longData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        notifications_enabled: true,
        email_notifications: true,
        sound_enabled: true,
      })

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(longData),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('应该处理特殊字符', async () => {
      const { getUserPreferences, createUserPreferences } =
        await import('@/lib/db/user-preferences')

      const specialData = {
        user_id: 'user-special',
        locale: 'zh-CN',
        theme: 'dark' as const,
      }

      vi.mocked(getUserPreferences).mockResolvedValue(null)
      vi.mocked(createUserPreferences).mockResolvedValue({
        ...specialData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        notifications_enabled: true,
        email_notifications: true,
        sound_enabled: true,
      })

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specialData),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })
  })
})

describe('PUT /api/user/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常请求测试', () => {
    it('应该成功更新用户偏好设置', async () => {
      const { getUserPreferences, updateUserPreferences } =
        await import('@/lib/db/user-preferences')

      const existingPreferences = {
        user_id: 'user-123',
        locale: 'zh',
        theme: 'dark' as const,
        notifications_enabled: true,
        email_notifications: true,
        sound_enabled: true,
      }

      const updatedPreferences = {
        ...existingPreferences,
        theme: 'light' as const,
        notifications_enabled: false,
      }

      vi.mocked(getUserPreferences).mockResolvedValue(existingPreferences as any)
      vi.mocked(updateUserPreferences).mockResolvedValue({
        ...updatedPreferences,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      })

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
          theme: 'light',
          notifications_enabled: false,
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.theme).toBe('light')
      expect(data.data.notifications_enabled).toBe(false)
    })

    it('当用户偏好不存在时应该创建新记录', async () => {
      const { getUserPreferences, createUserPreferences } =
        await import('@/lib/db/user-preferences')

      const newPreferences = {
        user_id: 'user-new-put',
        locale: 'fr',
        theme: 'system' as const,
      }

      vi.mocked(getUserPreferences).mockResolvedValue(null)
      vi.mocked(createUserPreferences).mockResolvedValue({
        ...newPreferences,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        notifications_enabled: true,
        email_notifications: true,
        sound_enabled: true,
      })

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
    })

    it('应该只更新指定的字段', async () => {
      const { getUserPreferences, updateUserPreferences } =
        await import('@/lib/db/user-preferences')

      const existingPreferences = {
        user_id: 'user-123',
        locale: 'zh',
        theme: 'dark',
        notifications_enabled: true,
      }

      vi.mocked(getUserPreferences).mockResolvedValue(existingPreferences as any)
      vi.mocked(updateUserPreferences).mockResolvedValue({
        ...existingPreferences,
        theme: 'light',
        updated_at: '2024-01-02T00:00:00Z',
      } as any)

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
          theme: 'light',
        }),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
    })
  })

  describe('输入验证测试', () => {
    it('缺少 user_id 应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: 'light',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('user_id is required')
    })

    it('user_id 为空字符串应该返回 400', async () => {
      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: '',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('空请求体应该返回错误', async () => {
      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('无效的 JSON 应该返回错误', async () => {
      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
    })
  })

  describe('错误处理测试', () => {
    it('数据库错误应该返回 500', async () => {
      const { getUserPreferences, updateUserPreferences } =
        await import('@/lib/db/user-preferences')

      vi.mocked(getUserPreferences).mockResolvedValue({
        user_id: 'user-123',
        locale: 'zh',
      } as any)
      vi.mocked(updateUserPreferences).mockRejectedValue(new Error('Database error'))

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
          theme: 'light',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Internal server error')
    })

    it('未知错误应该返回 500', async () => {
      const { getUserPreferences } = await import('@/lib/db/user-preferences')
      vi.mocked(getUserPreferences).mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(500)
    })
  })

  describe('边界条件测试', () => {
    it('应该处理只更新 user_id 的情况', async () => {
      const { getUserPreferences, createUserPreferences } =
        await import('@/lib/db/user-preferences')

      vi.mocked(getUserPreferences).mockResolvedValue(null)
      vi.mocked(createUserPreferences).mockResolvedValue({
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        locale: 'en',
        theme: 'system',
        notifications_enabled: true,
        email_notifications: true,
        sound_enabled: true,
      })

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: 'user-123',
        }),
      })

      const response = await PUT(request)

      expect(response.status).toBe(201)
    })

    it('应该处理大量字段更新', async () => {
      const { getUserPreferences, updateUserPreferences } =
        await import('@/lib/db/user-preferences')

      const manyFields = {
        user_id: 'user-many',
        locale: 'en',
        theme: 'light' as const,
        timezone: 'America/New_York',
        notifications_enabled: true,
        email_notifications: false,
        sound_enabled: true,
      }

      vi.mocked(getUserPreferences).mockResolvedValue({
        user_id: 'user-many',
        locale: 'zh',
        theme: 'dark',
      } as any)
      vi.mocked(updateUserPreferences).mockResolvedValue({
        ...manyFields,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      })

      const request = new NextRequest('http://localhost/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manyFields),
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
    })
  })
})
