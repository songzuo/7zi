// @ts-nocheck
/**
 * WebSocket Auth Module Unit Tests
 * 
 * Tests for JWT authentication logic in auth.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { AuthenticatedSocket } from './types'

// Import the functions to test
import { generateUserColor } from '../auth'

// Mock the dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/auth/service', () => ({
  verifyJwtToken: vi.fn(),
}))

vi.mock('@/lib/auth/repository', () => ({
  getUserById: vi.fn(),
}))

describe('WebSocket Auth Module', () => {
  describe('generateUserColor', () => {
    it('should return a valid hex color', () => {
      const color = generateUserColor('user-123')
      expect(color).toMatch(/^#[0-9a-f]{6}$/)
    })

    it('should return consistent color for same user ID', () => {
      const color1 = generateUserColor('user-123')
      const color2 = generateUserColor('user-123')
      expect(color1).toBe(color2)
    })

    it('should return different colors for different user IDs', () => {
      const color1 = generateUserColor('user-123')
      const color2 = generateUserColor('user-456')
      expect(color1).not.toBe(color2)
    })

    it('should return colors from the predefined palette', () => {
      const validColors = [
        '#ef4444',
        '#f97316',
        '#f59e0b',
        '#84cc16',
        '#10b981',
        '#06b6d4',
        '#0ea5e9',
        '#3b82f6',
        '#6366f1',
        '#8b5cf6',
        '#d946ef',
        '#ec4899',
        '#f43f5e',
      ]

      // Test multiple user IDs to ensure we get valid colors
      for (let i = 0; i < 20; i++) {
        const color = generateUserColor(`user-${i}`)
        expect(validColors).toContain(color)
      }
    })

    it('should handle empty string user ID', () => {
      const color = generateUserColor('')
      expect(color).toMatch(/^#[0-9a-f]{6}$/)
      expect(color).toBeDefined()
    })

    it('should handle special characters in user ID', () => {
      const color = generateUserColor('user@domain.com')
      expect(color).toMatch(/^#[0-9a-f]{6}$/)
    })

    it('should handle very long user ID', () => {
      const longId = 'a'.repeat(1000)
      const color = generateUserColor(longId)
      expect(color).toMatch(/^#[0-9a-f]{6}$/)
    })

    it('should distribute colors across palette', () => {
      const colorCounts: Record<string, number> = {}
      
      // Generate colors for many users
      for (let i = 0; i < 100; i++) {
        const color = generateUserColor(`user-${i}`)
        colorCounts[color] = (colorCounts[color] || 0) + 1
      }

      // Should use multiple colors (not just one)
      const uniqueColorsUsed = Object.keys(colorCounts).length
      expect(uniqueColorsUsed).toBeGreaterThan(1)
    })
  })

  describe('authenticateSocket middleware', () => {
    // Since authenticateSocket depends on real DB calls, we test the behavior pattern
    // The actual integration tests verify the full flow
    
    it('should be a function that accepts socket and next callback', async () => {
      const { authenticateSocket } = await import('../auth')
      
      const mockSocket = {
        id: 'test-socket-id',
        handshake: {
          auth: {
            token: 'valid-token',
          },
        },
        data: {} as any,
      } as unknown as AuthenticatedSocket

      const next = vi.fn()
      
      // This will call verifyJwtToken which is mocked
      await authenticateSocket(mockSocket, next)
      
      // Next should be called (either with error or without)
      expect(next).toHaveBeenCalled()
    })

    it('should reject when no token is provided', async () => {
      const { authenticateSocket } = await import('../auth')
      
      const mockSocket = {
        id: 'test-socket-id',
        handshake: {
          auth: {},
        },
        data: {},
      } as unknown as AuthenticatedSocket

      const next = vi.fn()
      
      await authenticateSocket(mockSocket, next)
      
      expect(next).toHaveBeenCalledWith(expect.any(Error))
      const errorArg = next.mock.calls[0][0]
      expect(errorArg.message).toBe('No token provided')
    })

    it('should set user data on socket when authentication succeeds', async () => {
      const { verifyJwtToken } = await import('@/lib/auth/service')
      const { getUserById } = await import('@/lib/auth/repository')
      const { authenticateSocket } = await import('../auth')
      
      // Setup mocks
      vi.mocked(verifyJwtToken).mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
        roles: [],
        permissions: [],
        customPermissions: [],
      })

      vi.mocked(getUserById).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        avatar: 'https://example.com/avatar.png',
      })

      const mockSocket = {
        id: 'test-socket-id',
        handshake: {
          auth: {
            token: 'valid-token',
          },
        },
        data: {} as any,
      } as unknown as AuthenticatedSocket

      const next = vi.fn()
      
      await authenticateSocket(mockSocket, next)
      
      expect(next).toHaveBeenCalledWith()
      expect(mockSocket.data.user).toEqual({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        avatar: 'https://example.com/avatar.png',
      })
      expect(mockSocket.data.lastHeartbeat).toBeDefined()
      expect(mockSocket.data.rooms).toBeInstanceOf(Set)
    })

    it('should reject when token is invalid', async () => {
      const { verifyJwtToken } = await import('@/lib/auth/service')
      const { authenticateSocket } = await import('../auth')
      
      vi.mocked(verifyJwtToken).mockResolvedValue(null)

      const mockSocket = {
        id: 'test-socket-id',
        handshake: {
          auth: {
            token: 'invalid-token',
          },
        },
        data: {},
      } as unknown as AuthenticatedSocket

      const next = vi.fn()
      
      await authenticateSocket(mockSocket, next)
      
      expect(next).toHaveBeenCalledWith(expect.any(Error))
      const errorArg = next.mock.calls[0][0]
      expect(errorArg.message).toBe('Invalid token')
    })

    it('should reject when user is not found', async () => {
      const { verifyJwtToken } = await import('@/lib/auth/service')
      const { getUserById } = await import('@/lib/auth/repository')
      const { authenticateSocket } = await import('../auth')
      
      vi.mocked(verifyJwtToken).mockResolvedValue({
        userId: 'nonexistent-user',
        email: 'nonexistent@example.com',
        role: 'user',
        roles: [],
        permissions: [],
        customPermissions: [],
      })

      vi.mocked(getUserById).mockResolvedValue(null)

      const mockSocket = {
        id: 'test-socket-id',
        handshake: {
          auth: {
            token: 'valid-token',
          },
        },
        data: {},
      } as unknown as AuthenticatedSocket

      const next = vi.fn()
      
      await authenticateSocket(mockSocket, next)
      
      expect(next).toHaveBeenCalledWith(expect.any(Error))
      const errorArg = next.mock.calls[0][0]
      expect(errorArg.message).toBe('User not found')
    })

    it('should handle exceptions during authentication', async () => {
      const { verifyJwtToken } = await import('@/lib/auth/service')
      const { authenticateSocket } = await import('../auth')
      
      vi.mocked(verifyJwtToken).mockRejectedValue(new Error('Database error'))

      const mockSocket = {
        id: 'test-socket-id',
        handshake: {
          auth: {
            token: 'valid-token',
          },
        },
        data: {},
      } as unknown as AuthenticatedSocket

      const next = vi.fn()
      
      await authenticateSocket(mockSocket, next)
      
      expect(next).toHaveBeenCalledWith(expect.any(Error))
      const errorArg = next.mock.calls[0][0]
      expect(errorArg.message).toBe('Authentication failed')
    })
  })
})