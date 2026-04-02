/**
 * Projects API 路由单元测试
 *
 * 测试 /api/projects 端点的功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  getDatabase: vi.fn(() => {
    const mockDb = {
      prepare: vi.fn(() => ({
        all: vi.fn(() => []),
        get: vi.fn(() => null),
        run: vi.fn(() => ({ lastInsertRowid: 1, changes: 1 })),
      })),
      exec: vi.fn(),
    }
    return mockDb
  }),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/lib/api/error-handler', () => ({
  createErrorResponse: vi.fn((error: any) => {
    return {
      status: 500,
      json: async () => ({
        success: false,
        error: error.message || 'An error occurred',
      }),
    }
  }),
}))

vi.mock('@/lib/api/utils', () => ({
  createSuccessResponse: vi.fn((data: any, status?: number) => {
    return {
      status: status || 200,
      json: async () => ({
        success: true,
        data,
      }),
    }
  }),
}))

describe('Projects API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/projects - List projects', () => {
    it('should return empty list when no projects exist', async () => {
      const { GET } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual([])
      expect(data.message).toContain('GET endpoint')
    })

    it('should handle GET request with query parameters', async () => {
      const { GET } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects?page=1&limit=10')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle GET request without query parameters', async () => {
      const { GET } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle GET request with custom headers', async () => {
      const { GET } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects', {
        headers: {
          'x-user-id': 'user-123',
          authorization: 'Bearer token-123',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return correct content type', async () => {
      const { GET } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects')

      const response = await GET(request)

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('POST /api/projects - Create project', () => {
    it('should create new project successfully', async () => {
      const { POST } = await import('@/app/api/projects/route')
      const requestBody = {
        name: 'Test Project',
        description: 'A test project',
      }

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.message).toContain('POST endpoint')
    })

    it('should handle POST request with minimal data', async () => {
      const { POST } = await import('@/app/api/projects/route')
      const requestBody = {
        name: 'Minimal Project',
      }

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle POST request with complete data', async () => {
      const { POST } = await import('@/app/api/projects/route')
      const requestBody = {
        name: 'Complete Project',
        description: 'A complete project with all fields',
        status: 'active',
        priority: 'high',
        ownerId: 'user-123',
        dueDate: '2024-12-31',
      }

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle POST request with empty body', async () => {
      const { POST } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle POST request without content-type header', async () => {
      const { POST } = await import('@/app/api/projects/route')
      const requestBody = {
        name: 'Test Project',
      }

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle POST request with null body', async () => {
      const { POST } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: null,
      })

      const response = await POST(request)

      // Should handle null body gracefully
      expect([200, 400]).toContain(response.status)
    })

    it('should handle malformed JSON', async () => {
      const { POST } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json{',
      })

      const response = await POST(request)

      // Should handle malformed JSON
      expect([200, 400, 500]).toContain(response.status)
    })

    it('should handle large project description', async () => {
      const { POST } = await import('@/app/api/projects/route')
      const requestBody = {
        name: 'Large Project',
        description: 'A'.repeat(10000), // Very long description
      }

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Edge cases and error handling', () => {
    it('should handle GET request with invalid URL', async () => {
      const { GET } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://invalid-url/api/projects')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle GET request with special characters in query', async () => {
      const { GET } = await import('@/app/api/projects/route')
      const request = new NextRequest(
        'http://localhost/api/projects?search=project%20name&filter=active%20%2B%20completed'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle POST request with Unicode characters', async () => {
      const { POST } = await import('@/app/api/projects/route')
      const requestBody = {
        name: '项目测试 🎉',
        description: '中文描述 with emojis 🚀',
      }

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle POST request with nested objects', async () => {
      const { POST } = await import('@/app/api/projects/route')
      const requestBody = {
        name: 'Complex Project',
        metadata: {
          tags: ['tag1', 'tag2'],
          settings: {
            notifications: true,
            public: false,
          },
        },
      }

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle POST request with array data', async () => {
      const { POST } = await import('@/app/api/projects/route')
      const requestBody = {
        name: 'Project with Tags',
        tags: ['frontend', 'backend', 'database'],
        teamMembers: ['user-1', 'user-2', 'user-3'],
      }

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle concurrent GET requests', async () => {
      const { GET } = await import('@/app/api/projects/route')

      const requests = [
        new NextRequest('http://localhost/api/projects'),
        new NextRequest('http://localhost/api/projects?page=1'),
        new NextRequest('http://localhost/api/projects?page=2'),
      ]

      const responses = await Promise.all(requests.map(r => GET(r)))

      for (const response of responses) {
        const data = await response.json()
        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      }
    })

    it('should handle GET request with numeric ID parameter', async () => {
      const { getProject } = await import('@/app/api/projects/route')
      const context = {
        params: Promise.resolve({ id: '123' }),
      }

      const request = new NextRequest('http://localhost/api/projects/123')

      const response = await getProject(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id', '123')
    })

    it('should handle GET request with string ID parameter', async () => {
      const { getProject } = await import('@/app/api/projects/route')
      const context = {
        params: Promise.resolve({ id: 'project-abc-123' }),
      }

      const request = new NextRequest('http://localhost/api/projects/project-abc-123')

      const response = await getProject(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id', 'project-abc-123')
    })

    it('should handle GET request with special characters in ID', async () => {
      const { getProject } = await import('@/app/api/projects/route')
      const context = {
        params: Promise.resolve({ id: 'project-test-123-456' }),
      }

      const request = new NextRequest('http://localhost/api/projects/project-test-123-456')

      const response = await getProject(request, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('Response format', () => {
    it('should return JSON format for GET', async () => {
      const { GET } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects')

      const response = await GET(request)

      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should return JSON format for POST', async () => {
      const { POST } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test' }),
      })

      const response = await POST(request)

      expect(response.headers.get('content-type')).toContain('application/json')
    })

    it('should include success field in response', async () => {
      const { GET } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('success')
      expect(typeof data.success).toBe('boolean')
    })

    it('should include data field in response', async () => {
      const { GET } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('data')
    })

    it('should include message field in response', async () => {
      const { GET } = await import('@/app/api/projects/route')
      const request = new NextRequest('http://localhost/api/projects')

      const response = await GET(request)
      const data = await response.json()

      expect(data).toHaveProperty('message')
    })
  })
})
