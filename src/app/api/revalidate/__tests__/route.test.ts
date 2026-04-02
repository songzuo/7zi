/**
 * @fileoverview Revalidate API route integration tests
 * @description Tests for /api/revalidate endpoint - cache revalidation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET, POST } from '../route'
import { createMockNextRequest } from '@/test/utils/mock-request'

// Mock environment variables
vi.mock('next/cache', async () => {
  const actual = await vi.importActual<typeof import('next/cache')>('next/cache')
  return {
    ...actual,
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
  }
})

describe('/api/revalidate', () => {
  const originalSecret = process.env.REVALIDATION_SECRET

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-18T08:00:00.000Z'))
    process.env.REVALIDATION_SECRET = 'test-secret'
  })

  afterEach(() => {
    vi.useRealTimers()
    process.env.REVALIDATION_SECRET = originalSecret
    vi.clearAllMocks()
  })

  describe('POST request - revalidate by body', () => {
    it('should revalidate by path with valid secret', async () => {
      const requestBody = {
        path: '/dashboard',
        secret: 'test-secret',
      }

      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Revalidation successful')
      expect(data.path).toBe('/dashboard')
      expect(data.tag).toBeUndefined()
      expect(data.timestamp).toBe('2026-03-18T08:00:00.000Z')
    })

    it('should revalidate by tag with valid secret', async () => {
      const requestBody = {
        tag: 'dashboard',
        secret: 'test-secret',
      }

      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Revalidation successful')
      expect(data.tag).toBe('dashboard')
      expect(data.path).toBeUndefined()
    })

    it('should revalidate by both path and tag', async () => {
      const requestBody = {
        path: '/dashboard',
        tag: 'dashboard',
        secret: 'test-secret',
      }

      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.path).toBe('/dashboard')
      expect(data.tag).toBe('dashboard')
    })

    it('should reject invalid secret', async () => {
      const requestBody = {
        path: '/dashboard',
        secret: 'wrong-secret',
      }

      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe('Invalid secret')
    })

    it('should reject missing secret', async () => {
      const requestBody = {
        path: '/dashboard',
      }

      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe('Invalid secret')
    })

    it('should handle empty body', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {},
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe('Invalid secret')
    })

    it('should return JSON content type', async () => {
      const requestBody = {
        path: '/test',
        secret: 'test-secret',
      }

      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const response = await POST(request)

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('GET request - revalidate by query params', () => {
    it('should revalidate by path with valid secret', async () => {
      const request = createMockNextRequest(
        'http://localhost:3000/api/revalidate?path=/dashboard&secret=test-secret'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Revalidation successful')
      expect(data.path).toBe('/dashboard')
      expect(data.tag).toBeNull()
    })

    it('should revalidate by tag with valid secret', async () => {
      const request = createMockNextRequest(
        'http://localhost:3000/api/revalidate?tag=dashboard&secret=test-secret'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Revalidation successful')
      expect(data.tag).toBe('dashboard')
      expect(data.path).toBeNull()
    })

    it('should revalidate by both path and tag', async () => {
      const request = createMockNextRequest(
        'http://localhost:3000/api/revalidate?path=/home&tag=home&secret=test-secret'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.path).toBe('/home')
      expect(data.tag).toBe('home')
    })

    it('should reject invalid secret', async () => {
      const request = createMockNextRequest(
        'http://localhost:3000/api/revalidate?path=/dashboard&secret=wrong-secret'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe('Invalid secret')
    })

    it('should reject missing secret', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/revalidate?path=/dashboard')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.message).toBe('Invalid secret')
    })

    it('should handle no path or tag parameters', async () => {
      const request = createMockNextRequest(
        'http://localhost:3000/api/revalidate?secret=test-secret'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Revalidation successful')
      expect(data.path).toBeNull()
      expect(data.tag).toBeNull()
    })

    it('should return JSON content type', async () => {
      const request = createMockNextRequest(
        'http://localhost:3000/api/revalidate?path=/test&secret=test-secret'
      )

      const response = await GET(request)

      expect(response.headers.get('content-type')).toContain('application/json')
    })
  })

  describe('edge cases', () => {
    it('should handle special characters in path', async () => {
      const requestBody = {
        path: '/dashboard/with/special-chars-123',
        secret: 'test-secret',
      }

      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.path).toBe('/dashboard/with/special-chars-123')
    })

    it('should handle empty string path', async () => {
      const requestBody = {
        path: '',
        secret: 'test-secret',
      }

      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle empty string tag', async () => {
      const requestBody = {
        tag: '',
        secret: 'test-secret',
      }

      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle malformed JSON', async () => {
      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{invalid json}',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toBe('Revalidation failed')
    })

    it('should handle undefined secret in environment', async () => {
      process.env.REVALIDATION_SECRET = undefined

      const requestBody = {
        path: '/dashboard',
        secret: 'test-secret',
      }

      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should handle both POST and GET consistently', async () => {
      const requestBody = {
        path: '/test',
        secret: 'test-secret',
      }

      const postRequest = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const getRequest = createMockNextRequest(
        'http://localhost:3000/api/revalidate?path=/test&secret=test-secret'
      )

      const postResponse = await POST(postRequest)
      const getResponse = await GET(getRequest)

      const postData = await postResponse.json()
      const getData = await getResponse.json()

      expect(postResponse.status).toBe(getResponse.status)
      expect(postData.message).toBe(getData.message)
      expect(postData.path).toBe(getData.path)
    })
  })

  describe('timestamp', () => {
    it('should return correct timestamp for POST', async () => {
      const requestBody = {
        path: '/dashboard',
        secret: 'test-secret',
      }

      const request = createMockNextRequest('http://localhost:3000/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: requestBody,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data.timestamp).toBe('2026-03-18T08:00:00.000Z')
    })

    it('should return correct timestamp for GET', async () => {
      const request = createMockNextRequest(
        'http://localhost:3000/api/revalidate?path=/dashboard&secret=test-secret'
      )

      const response = await GET(request)
      const data = await response.json()

      expect(data.timestamp).toBe('2026-03-18T08:00:00.000Z')
    })
  })
})
