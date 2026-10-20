/**
 * Rooms API Route Tests
 *
 * Tests for /api/rooms endpoints:
 * - POST /api/rooms - Create room
 * - GET /api/rooms/[id] - Get room details
 * - POST /api/rooms/[id]/join - Join room
 * - POST /api/rooms/[id]/leave - Leave room
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/api/rooms/store', () => {
  return {
    roomStore: {
      createRoom: vi.fn((data) => ({
        id: 'room-test-123',
        name: data.name,
        description: data.description,
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        password: data.password,
        inviteCode: 'TESTCODE1',
        members: [{
          id: data.ownerId,
          name: data.ownerName,
          role: 'owner',
          isOnline: true,
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
        }],
        onlineCount: 1,
        memberCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastActivityAt: Date.now(),
      })),
      getRoomById: vi.fn((id) => {
        if (id === 'room-test-123') {
          return {
            id: 'room-test-123',
            name: 'Test Room',
            description: 'A test room',
            ownerId: 'dev-user',
            ownerName: 'Developer',
            inviteCode: 'TESTCODE1',
            members: [{
              id: 'dev-user',
              name: 'Developer',
              role: 'owner',
              isOnline: true,
              joinedAt: Date.now(),
              lastActiveAt: Date.now(),
            }],
            onlineCount: 1,
            memberCount: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastActivityAt: Date.now(),
          }
        }
        if (id === 'room-with-password') {
          return {
            id: 'room-with-password',
            name: 'Private Room',
            description: 'A private room',
            ownerId: 'owner-user',
            ownerName: 'Owner',
            password: 'secret123',
            inviteCode: 'PRIVCODE1',
            members: [{
              id: 'owner-user',
              name: 'Owner',
              role: 'owner',
              isOnline: true,
              joinedAt: Date.now(),
              lastActiveAt: Date.now(),
            }],
            onlineCount: 1,
            memberCount: 1,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastActivityAt: Date.now(),
          }
        }
        if (id === 'room-with-member') {
          return {
            id: 'room-with-member',
            name: 'Room With Member',
            description: 'A room with a member',
            ownerId: 'owner-user',
            ownerName: 'Owner',
            inviteCode: 'MEMBERCODE1',
            members: [
              {
                id: 'owner-user',
                name: 'Owner',
                role: 'owner',
                isOnline: true,
                joinedAt: Date.now(),
                lastActiveAt: Date.now(),
              },
              {
                id: 'member-user',
                name: 'Member',
                role: 'member',
                isOnline: true,
                joinedAt: Date.now(),
                lastActiveAt: Date.now(),
              }
            ],
            onlineCount: 2,
            memberCount: 2,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastActivityAt: Date.now(),
          }
        }
        return null
      }),
      joinRoom: vi.fn((roomId, user, password) => ({
        id: roomId,
        name: 'Test Room',
        inviteCode: 'TESTCODE1',
        members: [{ id: user.id, name: user.name, role: 'member', isOnline: true }],
        onlineCount: 1,
        memberCount: 1,
      })),
      leaveRoom: vi.fn((roomId, userId) => ({
        id: roomId,
        name: 'Test Room',
        members: [],
        onlineCount: 0,
        memberCount: 0,
      })),
      getAllRooms: vi.fn(() => []),
      deleteRoom: vi.fn(() => true),
    },
  }
})

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/lib/api/error-handler', () => ({
  createSuccessResponse: vi.fn((data: any, status?: number) => ({
    status: status || 200,
    json: async () => ({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    }),
  })),
  createErrorResponse: vi.fn((error: any, statusCode?: number) => ({
    status: statusCode || 500,
    json: async () => ({
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message: error?.message || 'An error occurred',
        timestamp: new Date().toISOString(),
      },
    }),
  })),
  createNotFoundError: vi.fn((message: string) => ({
    status: 404,
    json: async () => ({
      success: false,
      error: { type: 'NOT_FOUND', message, timestamp: new Date().toISOString() },
    }),
  })),
  createUnauthorizedError: vi.fn((message: string) => ({
    status: 401,
    json: async () => ({
      success: false,
      error: { type: 'UNAUTHORIZED', message, timestamp: new Date().toISOString() },
    }),
  })),
  createBadRequestError: vi.fn((message: string) => ({
    status: 400,
    json: async () => ({
      success: false,
      error: { type: 'BAD_REQUEST', message, timestamp: new Date().toISOString() },
    }),
  })),
  createForbiddenError: vi.fn((message: string) => ({
    status: 403,
    json: async () => ({
      success: false,
      error: { type: 'FORBIDDEN', message, timestamp: new Date().toISOString() },
    }),
  })),
  withErrorHandling: (handler: Function) => handler,
}))

vi.mock('@/lib/middleware/csrf', () => ({
  withCSRF: (handler: Function) => handler,
}))

vi.mock('@/lib/cache', () => ({
  createHotDataCache: vi.fn(() => ({
    get: vi.fn(() => null),
    set: vi.fn(),
    delete: vi.fn(),
    deleteByEndpoint: vi.fn(),
  })),
  CachePresets: {
    SHORT: 60,
  },
}))

// Helper to create CSRF token
function createCSRFToken(): string {
  const token = 'test-csrf-token'
  const timestamp = Math.floor(Date.now() / 1000)
  return Buffer.from(`${token}:${timestamp}`).toString('base64')
}

describe('Rooms API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================
  // POST /api/rooms - Create Room Tests
  // ==========================================
  describe('POST /api/rooms - Create Room', () => {
    it('should create a room with valid name', async () => {
      const { POST } = await import('@/app/api/rooms/route')
      
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'dev-user',
          'x-user-name': 'Developer',
        },
        body: JSON.stringify({
          name: 'Test Room',
          description: 'A test room',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id')
      expect(data.data).toHaveProperty('name', 'Test Room')
      expect(data.data).toHaveProperty('inviteCode')
    })

    it('should create a private room with password', async () => {
      const { POST } = await import('@/app/api/rooms/route')
      
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'dev-user',
          'x-user-name': 'Developer',
        },
        body: JSON.stringify({
          name: 'Private Room',
          isPrivate: true,
          password: 'secret123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
    })

    it('should reject room creation without name', async () => {
      const { POST } = await import('@/app/api/rooms/route')
      
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'dev-user',
          'x-user-name': 'Developer',
        },
        body: JSON.stringify({
          description: 'No name provided',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should reject room creation with whitespace-only name', async () => {
      // Implementation correctly trims whitespace and validates name is not empty
      const { POST } = await import('@/app/api/rooms/route')
      
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'dev-user',
          'x-user-name': 'Developer',
        },
        body: JSON.stringify({
          name: '   ',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Validation correctly rejects whitespace-only names
      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  // ==========================================
  // GET /api/rooms/[id] - Get Room Details Tests
  // ==========================================
  describe('GET /api/rooms/[id] - Get Room Details', () => {
    it('should return room details for existing room', async () => {
      const { GET } = await import('@/app/api/rooms/[id]/route')
      
      const request = new NextRequest('http://localhost/api/rooms/room-test-123', {
        method: 'GET',
        headers: {
          'x-user-id': 'dev-user',
        },
      })

      const response = await GET(request, { params: Promise.resolve({ id: 'room-test-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('room')
      expect(data.data).toHaveProperty('participants')
      expect(data.data.room).toHaveProperty('id', 'room-test-123')
      expect(data.data.room).toHaveProperty('name', 'Test Room')
      expect(data.data.room).toHaveProperty('inviteCode')
      expect(data.data.room).toHaveProperty('hasPassword', false)
      expect(data.data.room).toHaveProperty('isOwner', true)
    })

    it('should return room with password flag when room has password', async () => {
      const { GET } = await import('@/app/api/rooms/[id]/route')
      
      const request = new NextRequest('http://localhost/api/rooms/room-with-password', {
        method: 'GET',
        headers: {
          'x-user-id': 'some-user',
        },
      })

      const response = await GET(request, { params: Promise.resolve({ id: 'room-with-password' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.room).toHaveProperty('hasPassword', true)
    })

    it('should return 404 for non-existent room', async () => {
      const { GET } = await import('@/app/api/rooms/[id]/route')
      
      const request = new NextRequest('http://localhost/api/rooms/non-existent', {
        method: 'GET',
      })

      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })

    it('should indicate when user is room owner', async () => {
      const { GET } = await import('@/app/api/rooms/[id]/route')
      
      const request = new NextRequest('http://localhost/api/rooms/room-test-123', {
        method: 'GET',
        headers: {
          'x-user-id': 'dev-user',
        },
      })

      const response = await GET(request, { params: Promise.resolve({ id: 'room-test-123' }) })
      const data = await response.json()

      expect(data.data.room).toHaveProperty('isOwner', true)
    })

    it('should indicate when user is not room owner', async () => {
      const { GET } = await import('@/app/api/rooms/[id]/route')
      
      const request = new NextRequest('http://localhost/api/rooms/room-test-123', {
        method: 'GET',
        headers: {
          'x-user-id': 'other-user',
        },
      })

      const response = await GET(request, { params: Promise.resolve({ id: 'room-test-123' }) })
      const data = await response.json()

      expect(data.data.room).toHaveProperty('isOwner', false)
    })
  })

  // ==========================================
  // POST /api/rooms/[id]/join - Join Room Tests
  // ==========================================
  describe('POST /api/rooms/[id]/join - Join Room', () => {
    it('should join an existing room successfully', async () => {
      const { POST } = await import('@/app/api/rooms/[id]/join/route')
      
      const request = new NextRequest('http://localhost/api/rooms/room-test-123/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'new-user',
          'x-user-name': 'New User',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'room-test-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('room')
      expect(data.data.room).toHaveProperty('id', 'room-test-123')
    })

    it('should return 404 when joining non-existent room', async () => {
      const { POST } = await import('@/app/api/rooms/[id]/join/route')
      
      const request = new NextRequest('http://localhost/api/rooms/non-existent/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'some-user',
          'x-user-name': 'Some User',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'non-existent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })

    it('should verify invite code when provided', async () => {
      const { POST } = await import('@/app/api/rooms/[id]/join/route')
      
      const request = new NextRequest('http://localhost/api/rooms/room-test-123/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
        body: JSON.stringify({
          inviteCode: 'WRONGCODE',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'room-test-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should allow joining room with correct invite code', async () => {
      const { POST } = await import('@/app/api/rooms/[id]/join/route')
      
      const request = new NextRequest('http://localhost/api/rooms/room-test-123/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user',
          'x-user-name': 'Test User',
        },
        body: JSON.stringify({
          inviteCode: 'TESTCODE1',
        }),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'room-test-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // ==========================================
  // POST /api/rooms/[id]/leave - Leave Room Tests
  // ==========================================
  describe('POST /api/rooms/[id]/leave - Leave Room', () => {
    it('should return 404 when leaving non-existent room', async () => {
      const { POST } = await import('@/app/api/rooms/[id]/leave/route')
      
      const request = new NextRequest('http://localhost/api/rooms/non-existent/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'some-user',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'non-existent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })

    it('should reject leaving if not a member', async () => {
      const { POST } = await import('@/app/api/rooms/[id]/leave/route')
      
      const request = new NextRequest('http://localhost/api/rooms/room-test-123/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'non-member',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'room-test-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should reject owner from leaving room', async () => {
      const { POST } = await import('@/app/api/rooms/[id]/leave/route')
      
      const request = new NextRequest('http://localhost/api/rooms/room-test-123/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'dev-user',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'room-test-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  // ==========================================
  // GET /api/rooms - List Rooms Tests
  // ==========================================
  describe('GET /api/rooms - List Rooms', () => {
    it('should return rooms list successfully', async () => {
      const { roomStore } = await import('@/lib/api/rooms/store')
      const mockRooms = [
        {
          id: 'room-1',
          name: 'Room One',
          description: 'First room',
          ownerId: 'user-1',
          ownerName: 'User 1',
          inviteCode: 'CODE1',
          members: [],
          memberCount: 1,
          onlineCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivityAt: Date.now(),
        },
        {
          id: 'room-2',
          name: 'Room Two',
          description: 'Second room',
          ownerId: 'user-2',
          ownerName: 'User 2',
          inviteCode: 'CODE2',
          members: [],
          memberCount: 2,
          onlineCount: 2,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivityAt: Date.now(),
        },
      ]
      ;(roomStore.getAllRooms as any).mockReturnValue(mockRooms)

      const { GET } = await import('@/app/api/rooms/route')
      
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'GET',
        headers: {
          'x-user-id': 'user-1',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('rooms')
      expect(Array.isArray(data.data.rooms)).toBe(true)
    })

    it('should filter rooms by search query', async () => {
      const { roomStore } = await import('@/lib/api/rooms/store')
      const mockRooms = [
        {
          id: 'room-1',
          name: 'Gaming Room',
          description: 'Gaming discussion',
          ownerId: 'user-1',
          ownerName: 'User 1',
          inviteCode: 'CODE1',
          members: [],
          memberCount: 1,
          onlineCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivityAt: Date.now(),
        },
        {
          id: 'room-2',
          name: 'Music Room',
          description: 'Music discussion',
          ownerId: 'user-2',
          ownerName: 'User 2',
          inviteCode: 'CODE2',
          members: [],
          memberCount: 2,
          onlineCount: 2,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivityAt: Date.now(),
        },
      ]
      ;(roomStore.getAllRooms as any).mockReturnValue(mockRooms)

      const { GET } = await import('@/app/api/rooms/route')
      
      const request = new NextRequest('http://localhost/api/rooms?search=Gaming', {
        method: 'GET',
        headers: {
          'x-user-id': 'user-1',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.rooms.length).toBe(1)
      expect(data.data.rooms[0].name).toBe('Gaming Room')
    })

    it('should support pagination parameters', async () => {
      const { roomStore } = await import('@/lib/api/rooms/store')
      const mockRooms = Array.from({ length: 25 }, (_, i) => ({
        id: `room-${i}`,
        name: `Room ${i}`,
        description: `Room description ${i}`,
        ownerId: 'user-1',
        ownerName: 'User 1',
        inviteCode: `CODE${i}`,
        members: [],
        memberCount: 1,
        onlineCount: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastActivityAt: Date.now(),
      }))
      ;(roomStore.getAllRooms as any).mockReturnValue(mockRooms)

      const { GET } = await import('@/app/api/rooms/route')
      
      const request = new NextRequest('http://localhost/api/rooms?page=2&limit=10', {
        method: 'GET',
        headers: {
          'x-user-id': 'user-1',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.rooms.length).toBe(10)
    })

    it('should not expose password in room list', async () => {
      const { roomStore } = await import('@/lib/api/rooms/store')
      const mockRooms = [
        {
          id: 'room-1',
          name: 'Private Room',
          description: 'A private room',
          ownerId: 'user-1',
          ownerName: 'User 1',
          password: 'secret123',
          inviteCode: 'CODE1',
          members: [],
          memberCount: 1,
          onlineCount: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          lastActivityAt: Date.now(),
        },
      ]
      ;(roomStore.getAllRooms as any).mockReturnValue(mockRooms)

      const { GET } = await import('@/app/api/rooms/route')
      
      const request = new NextRequest('http://localhost/api/rooms', {
        method: 'GET',
        headers: {
          'x-user-id': 'user-1',
        },
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.rooms[0]).not.toHaveProperty('password')
      expect(data.data.rooms[0]).toHaveProperty('hasPassword', true)
    })
  })

  // ==========================================
  // DELETE /api/rooms/[id] - Delete Room Tests
  // ==========================================
  describe('DELETE /api/rooms/[id] - Delete Room', () => {
    it('should delete room when user is owner', async () => {
      const { DELETE } = await import('@/app/api/rooms/[id]/route')
      
      const request = new NextRequest('http://localhost/api/rooms/room-test-123', {
        method: 'DELETE',
        headers: {
          'x-user-id': 'dev-user',
        },
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'room-test-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('message', 'Room deleted successfully')
    })

    it('should return 404 when deleting non-existent room', async () => {
      const { DELETE } = await import('@/app/api/rooms/[id]/route')
      
      const request = new NextRequest('http://localhost/api/rooms/non-existent', {
        method: 'DELETE',
        headers: {
          'x-user-id': 'some-user',
        },
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'non-existent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
    })

    it('should reject delete when user is not owner', async () => {
      const { DELETE } = await import('@/app/api/rooms/[id]/route')
      
      const request = new NextRequest('http://localhost/api/rooms/room-test-123', {
        method: 'DELETE',
        headers: {
          'x-user-id': 'non-owner-user',
        },
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'room-test-123' }) })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
    })
  })
})
