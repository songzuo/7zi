/**
 * Test suite for /api/health/detailed endpoint
 * Tests authentication requirements and error response formats
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

// Mock all dependencies first
vi.mock('@/lib/auth/service')
vi.mock('@/lib/api/error-handler')
vi.mock('@/lib/logger')
vi.mock('@/lib/monitoring')

import { authenticateToken } from '@/lib/auth/service'
import { createUnauthorizedError } from '@/lib/api/error-handler'
import { logger } from '@/lib/logger'
import { detailedHealthCheck, healthResponse } from '@/lib/monitoring'

describe('GET /api/health/detailed', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock implementations
    ;(createUnauthorizedError as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    )
  })

  describe('Authentication Security', () => {
    it('should return 401 when no Authorization header is provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/detailed', {
        method: 'GET',
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(createUnauthorizedError).toHaveBeenCalledWith(
        'Authentication required for detailed health check'
      )
      expect(logger.warn).toHaveBeenCalled()
    })

    it('should return 401 when Authorization header is malformed', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/detailed', {
        method: 'GET',
        headers: {
          Authorization: 'Basic invalid-token',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(createUnauthorizedError).toHaveBeenCalledWith(
        'Authentication required for detailed health check'
      )
      expect(logger.warn).toHaveBeenCalled()
    })

    it('should return 401 when token is too short', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/detailed', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer abc',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(createUnauthorizedError).toHaveBeenCalledWith('Invalid authentication token')
      expect(logger.warn).toHaveBeenCalled()
    })

    it('should return 401 when token is invalid or expired', async () => {
      ;(authenticateToken as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/health/detailed', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-token-1234567890',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(authenticateToken).toHaveBeenCalledWith('invalid-token-1234567890')
      expect(createUnauthorizedError).toHaveBeenCalledWith(
        'Invalid or expired authentication token'
      )
      expect(logger.warn).toHaveBeenCalled()
    })
  })

  describe('Error Response Format', () => {
    it('should return standardized error response format for unauthenticated access', async () => {
      const mockErrorResponse = new Response(
        JSON.stringify({
          success: false,
          error: {
            type: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )

      ;(createUnauthorizedError as ReturnType<typeof vi.fn>).mockResolvedValue(mockErrorResponse)

      const request = new NextRequest('http://localhost:3000/api/health/detailed', {
        method: 'GET',
      })

      const response = await GET(request)
      const body = await response.json()

      expect(response.status).toBe(401)
      expect(body.success).toBe(false)
      expect(body.error).toBeDefined()
      expect(typeof body.error.type).toBe('string')
      expect(typeof body.error.message).toBe('string')
      expect(typeof body.error.timestamp).toBe('string')
    })
  })

  describe('Authorized Access', () => {
    it('should return health data when authentication is valid', async () => {
      const mockAuthResult = {
        context: {
          userId: 'user-123',
          email: 'test@example.com',
        },
      }

      const mockHealthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 3600,
        environment: 'test',
        checks: {
          githubApi: { status: 'ok' },
          emailService: { status: 'ok' },
        },
      }

      ;(authenticateToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthResult)
      ;(detailedHealthCheck as ReturnType<typeof vi.fn>).mockResolvedValue(mockHealthData)
      ;(healthResponse as ReturnType<typeof vi.fn>).mockReturnValue(
        new Response(JSON.stringify(mockHealthData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const request = new NextRequest('http://localhost:3000/api/health/detailed', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token-1234567890',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(authenticateToken).toHaveBeenCalledWith('valid-token-1234567890')
      expect(detailedHealthCheck).toHaveBeenCalled()
      expect(healthResponse).toHaveBeenCalledWith(mockHealthData)
      expect(logger.info).toHaveBeenCalledWith(
        'Successful access to /api/health/detailed',
        expect.objectContaining({
          userId: 'user-123',
        })
      )
    })
  })

  describe('Logging and Audit Trail', () => {
    it('should log authentication failures with client IP', async () => {
      const request = new NextRequest('http://localhost:3000/api/health/detailed', {
        method: 'GET',
        headers: {
          'X-Forwarded-For': '192.168.1.100',
        },
      })

      await GET(request)

      expect(logger.warn).toHaveBeenCalledWith(
        'Unauthorized access attempt to /api/health/detailed',
        expect.objectContaining({
          endpoint: '/api/health/detailed',
          clientIp: '192.168.1.100',
        })
      )
    })

    it('should log successful access with user ID', async () => {
      const mockAuthResult = {
        context: {
          userId: 'user-123',
          email: 'test@example.com',
        },
      }

      const mockHealthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: 3600,
        environment: 'test',
      }

      ;(authenticateToken as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthResult)
      ;(detailedHealthCheck as ReturnType<typeof vi.fn>).mockResolvedValue(mockHealthData)
      ;(healthResponse as ReturnType<typeof vi.fn>).mockReturnValue(
        new Response(JSON.stringify(mockHealthData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const request = new NextRequest('http://localhost:3000/api/health/detailed', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token-1234567890',
          'X-Forwarded-For': '192.168.1.100',
        },
      })

      await GET(request)

      expect(logger.info).toHaveBeenCalledWith(
        'Successful access to /api/health/detailed',
        expect.objectContaining({
          userId: 'user-123',
          clientIp: '192.168.1.100',
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle authentication errors gracefully', async () => {
      ;(authenticateToken as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost:3000/api/health/detailed', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token-1234567890',
        },
      })

      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(logger.error).toHaveBeenCalledWith(
        'Error in /api/health/detailed endpoint',
        expect.objectContaining({
          error: expect.anything(),
        })
      )
    })
  })
})
