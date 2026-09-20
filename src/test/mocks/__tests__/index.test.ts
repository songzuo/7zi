/**
 * Test Mock Verification
 * @description Quick tests to verify all mock objects work correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createMockSocket,
  triggerSocketEvent,
  getEmittedEvents,
  createMockUser,
  createMockAuthContextValue,
  createMockFetch,
  createMockResponse,
} from '@/test/mocks'
import { UserRole } from '@/lib/auth/types'

describe('Test Mocks Verification', () => {
  describe('Socket Mock', () => {
    it('should create a mock socket', () => {
      const socket = createMockSocket()

      expect(socket).toBeDefined()
      expect(socket.connected).toBe(false)
      expect(socket.on).toBeInstanceOf(Function)
      expect(socket.emit).toBeInstanceOf(Function)
    })

    it('should emit and receive events', () => {
      const socket = createMockSocket()
      const callback = vi.fn()

      socket.on('test-event', callback)
      triggerSocketEvent(socket, 'test-event', { data: 'test' })

      expect(callback).toHaveBeenCalledWith({ data: 'test' })
    })

    it('should track emitted events', () => {
      const socket = createMockSocket()

      socket.emit('emit-event', { value: 123 })

      const events = getEmittedEvents(socket)
      expect(events).toHaveLength(1)
      expect(events[0].event).toBe('emit-event')
    })
  })

  describe('Auth Mock', () => {
    it('should create a mock user', () => {
      const user = createMockUser()

      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.email).toBeDefined()
      expect(user.name).toBeDefined()
    })

    it('should create a mock user with overrides', () => {
      const user = createMockUser({
        name: 'Custom User',
        role: UserRole.ADMIN,
      })

      expect(user.name).toBe('Custom User')
      expect(user.role).toBe(UserRole.ADMIN)
    })

    it('should create mock auth context value', () => {
      const user = createMockUser()
      const authContext = createMockAuthContextValue({ user })

      expect(authContext.user).toBe(user)
      expect(authContext.isAuthenticated).toBe(true)
      expect(authContext.hasPermission).toBeInstanceOf(Function)
    })
  })

  describe('Fetch Mock', () => {
    it('should create a mock response', () => {
      const response = createMockResponse({ success: true })

      expect(response.ok).toBe(true)
      expect(response.status).toBe(200)
    })

    it('should create mock fetch and handle requests', async () => {
      const mockFetch = createMockFetch()
      mockFetch.__mockResponse('/api/test', { data: 'test' })

      const response = await mockFetch('http://localhost:3000/api/test')
      const data = await response.json()

      expect(data).toEqual({ data: 'test' })
    })

    it('should handle callbacks for dynamic responses', async () => {
      const mockFetch = createMockFetch()

      mockFetch.__mockResponseCallback('/api/dynamic', req => {
        return { method: req.method, url: req.url }
      })

      const response = await mockFetch('http://localhost:3000/api/dynamic', {
        method: 'POST',
      })
      const data = await response.json()

      expect(data.method).toBe('POST')
    })

    it('should track fetch calls', async () => {
      const mockFetch = createMockFetch()
      mockFetch.__mockResponse('/api/test', { success: true })

      await mockFetch('http://localhost:3000/api/test')

      const calls = mockFetch.__getMockedCalls()
      expect(calls).toHaveLength(1)
      expect(calls[0].url).toBe('http://localhost:3000/api/test')
    })
  })

  describe('Integration', () => {
    it('should work together in a test scenario', async () => {
      const socket = createMockSocket()
      const user = createMockUser()
      const mockFetch = createMockFetch()

      // Mock auth API
      mockFetch.__mockResponse('/api/auth/login', {
        user,
        token: 'mock-token',
      })

      // Login request
      const response = await mockFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: user.email, password: 'test' }),
      })

      const data = await response.json()
      expect(data.user).toEqual(user)

      // Emit socket event
      socket.emit('user-joined', { userId: user.id, userName: user.name })

      const events = getEmittedEvents(socket)
      expect(events[0].event).toBe('user-joined')
    })
  })
})
