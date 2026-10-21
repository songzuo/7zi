/**
 * Room API Tests
 *
 * 测试房间 CRUD API，包括名称验证
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/api/rooms/store', () => ({
  roomStore: {
    createRoom: vi.fn().mockReturnValue({
      id: 'test-room-id',
      name: 'Test Room',
      inviteCode: 'TEST123',
      ownerId: 'dev-user',
      ownerName: 'Developer',
      createdAt: Date.now(),
    }),
    getAllRooms: vi.fn().mockReturnValue([]),
  },
}))

vi.mock('@/lib/middleware/csrf', () => ({
  withCSRF: (fn: Function) => fn,
}))

vi.mock('@/lib/cache', () => {
  const CachePresets = {
    SHORT: { ttl: 5000 },
  }
  return {
    createHotDataCache: () => ({
      get: vi.fn().mockReturnValue(null),
      set: vi.fn(),
      deleteByEndpoint: vi.fn(),
    }),
    CachePresets,
  }
})

// Import after mocks
import { POST, GET } from '../route'
import { NextRequest } from 'next/server'

describe('Room API', () => {
  describe('POST /api/rooms - Name Validation', () => {
    const validRequest = {
      name: 'Valid Room Name',
      description: 'A test room',
    }

    /**
     * Test Case: Empty string name
     * Expected: 400 Bad Request
     */
    it('should reject room creation with empty string name', async () => {
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
        body: JSON.stringify({ name: '' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error?.message).toContain('required')
    })

    /**
     * Test Case: Whitespace-only name
     * Expected: 400 Bad Request
     */
    it('should reject room creation with whitespace-only name', async () => {
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
        body: JSON.stringify({ name: '   ' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error?.message).toContain('empty')
    })

    /**
     * Test Case: Tab and newline only
     * Expected: 400 Bad Request
     */
    it('should reject room creation with tab/newline only name', async () => {
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
        body: JSON.stringify({ name: '\t\n  \t' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error?.message).toContain('empty')
    })

    /**
     * Test Case: Valid name with leading/trailing spaces
     * Expected: 201 Created (spaces should be trimmed)
     */
    it('should accept room name with leading/trailing spaces and trim them', async () => {
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
        body: JSON.stringify({ name: '  Valid Room Name  ' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    /**
     * Test Case: Valid name
     * Expected: 201 Created
     */
    it('should create a room with valid name', async () => {
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
        body: JSON.stringify(validRequest),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    /**
     * Test Case: Missing name field
     * Expected: 400 Bad Request
     */
    it('should reject room creation without name field', async () => {
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
        body: JSON.stringify({ description: 'No name provided' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error?.message).toContain('required')
    })

    /**
     * Test Case: Name is null
     * Expected: 400 Bad Request
     */
    it('should reject room creation with null name', async () => {
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
        body: JSON.stringify({ name: null }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/rooms - Successful Creation', () => {
    it('should return room data with id, name, inviteCode, and createdAt', async () => {
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
        body: JSON.stringify({ name: 'Test Room' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data).toHaveProperty('id')
      expect(data.data).toHaveProperty('name')
      expect(data.data).toHaveProperty('inviteCode')
      expect(data.data).toHaveProperty('createdAt')
    })
  })

  describe('GET /api/rooms', () => {
    it('should return room list', async () => {
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'GET',
        headers: {
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(200)
    })
  })
})
