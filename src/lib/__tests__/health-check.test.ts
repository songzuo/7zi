/**
 * Health Check Tests
 * Tests for health check logic and API health monitoring
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  basicHealthCheck,
  detailedHealthCheck,
  healthResponse,
  probes,
  type HealthStatus,
} from '@/lib/monitoring/health'
import { getCacheManager } from '@/lib/cache/CacheManager'

// Mock process.uptime
vi.spyOn(process, 'uptime').mockReturnValue(3600)

// Mock fetch
global.fetch = vi.fn()

describe('Health Check Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'test')
    vi.stubEnv('NEXT_PUBLIC_SENTRY_RELEASE', 'v1.0.0')
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    // Clear cache before each test to avoid cached results affecting tests
    getCacheManager().clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('basicHealthCheck', () => {
    it('should return basic health status with all fields', () => {
      const health = basicHealthCheck()

      expect(health.status).toBe('ok')
      expect(health.timestamp).toBeDefined()
      expect(health.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      expect(health.version).toBe('v1.0.0')
      expect(health.uptime).toBe(3600)
      expect(health.environment).toBe('test')
    })

    it('should use unknown for missing version', () => {
      vi.stubEnv('NEXT_PUBLIC_SENTRY_RELEASE', undefined)

      const health = basicHealthCheck()
      expect(health.version).toBe('unknown')
    })

    it('should use unknown for missing environment', () => {
      vi.stubEnv('NODE_ENV', undefined)

      const health = basicHealthCheck()
      expect(health.environment).toBe('unknown')
    })

    it('should return correct uptime from process', () => {
      vi.mocked(process.uptime).mockReturnValue(7200)

      const health = basicHealthCheck()
      expect(health.uptime).toBe(7200)
    })
  })

  describe('detailedHealthCheck', () => {
    it('should return ok status when all services are healthy', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response)

      const health = await detailedHealthCheck()

      expect(health.status).toBe('ok')
      expect(health.checks).toBeDefined()
      expect(health.checks?.githubApi?.status).toBe('ok')
      expect(health.checks?.emailService?.status).toBe('ok')
    })

    it('should return degraded when GitHub API fails', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('GitHub API error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response)

      const health = await detailedHealthCheck()

      expect(health.status).toBe('degraded')
      expect(health.checks?.githubApi?.status).toBe('error')
      expect(health.checks?.emailService?.status).toBe('ok')
    })

    it('should return degraded when email service fails', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response)
        .mockRejectedValueOnce(new Error('Email service error'))

      const health = await detailedHealthCheck()

      expect(health.status).toBe('degraded')
      expect(health.checks?.githubApi?.status).toBe('ok')
      expect(health.checks?.emailService?.status).toBe('error')
    })

    it('should return error when all services fail', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      const health = await detailedHealthCheck()

      expect(health.status).toBe('error')
      expect(health.checks?.githubApi?.status).toBe('error')
      expect(health.checks?.emailService?.status).toBe('error')
    })

    it('should include latency in check results', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
      }

      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response)

      const health = await detailedHealthCheck()

      expect(health.checks?.githubApi?.latency).toBeDefined()
      expect(typeof health.checks?.githubApi?.latency).toBe('number')
      expect(health.checks?.githubApi?.latency).toBeGreaterThanOrEqual(0)
    })

    it('should include error message when service fails', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response)

      const health = await detailedHealthCheck()

      expect(health.checks?.githubApi?.status).toBe('error')
      expect(health.checks?.githubApi?.message).toBe('Connection timeout')
    })

    it('should handle Resend API with 401 status (auth issue but API is reachable)', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
        } as Response)

      const health = await detailedHealthCheck()

      expect(health.status).toBe('ok')
      expect(health.checks?.emailService?.status).toBe('ok')
    })

    it('should skip email check when API key is not configured', async () => {
      vi.stubEnv('RESEND_API_KEY', undefined)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response)

      const health = await detailedHealthCheck()

      expect(health.status).toBe('ok')
      expect(health.checks?.emailService?.status).toBe('ok')
      expect(health.checks?.emailService?.message).toBe('Resend API key not configured')
    })

    it('should handle non-OK status from GitHub API', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response)

      const health = await detailedHealthCheck()

      expect(health.status).toBe('degraded')
      expect(health.checks?.githubApi?.status).toBe('error')
      expect(health.checks?.githubApi?.message).toContain('500')
    })
  })

  describe('healthResponse', () => {
    it('should return 200 for ok status', () => {
      const status: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: 'v1.0.0',
        uptime: 3600,
        environment: 'test',
      }

      const response = healthResponse(status)

      expect(response.status).toBe(200)
    })

    it('should return 200 for degraded status', () => {
      const status: HealthStatus = {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        version: 'v1.0.0',
        uptime: 3600,
        environment: 'test',
      }

      const response = healthResponse(status)

      expect(response.status).toBe(200)
    })

    it('should return 503 for error status', () => {
      const status: HealthStatus = {
        status: 'error',
        timestamp: new Date().toISOString(),
        version: 'v1.0.0',
        uptime: 3600,
        environment: 'test',
      }

      const response = healthResponse(status)

      expect(response.status).toBe(503)
    })

    it('should include checks in response body when provided', async () => {
      const status: HealthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: 'v1.0.0',
        uptime: 3600,
        environment: 'test',
        checks: {
          githubApi: { status: 'ok', latency: 100 },
        },
      }

      const response = healthResponse(status)
      const body = await response.json()

      expect(body).toEqual(status)
    })
  })

  describe('probes', () => {
    describe('liveness', () => {
      it('should return 200 status with alive message', () => {
        const response = probes.liveness()

        expect(response.status).toBe(200)
      })

      it('should include status in response body', async () => {
        const response = probes.liveness()
        const body = await response.json()

        expect(body.status).toBe('alive')
      })
    })

    describe('readiness', () => {
      it('should check detailed health and return 200 when healthy', async () => {
        vi.mocked(fetch).mockResolvedValue({
          ok: true,
          status: 200,
        } as unknown as Response)

        const response = await probes.readiness()

        expect(response.status).toBe(200)
      })

      it('should return 503 when health check fails', async () => {
        vi.mocked(fetch).mockRejectedValue(new Error('Service unavailable'))

        const response = await probes.readiness()

        expect(response.status).toBe(503)
      })
    })

    describe('startup', () => {
      it('should return 200 when globalThis is defined', () => {
        const response = probes.startup()

        expect(response.status).toBe(200)
      })

      it('should include started status in response', async () => {
        const response = probes.startup()
        const body = await response.json()

        expect(body.status).toBe('started')
      })
    })
  })

  describe('Health check edge cases', () => {
    it('should handle concurrent health check calls', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        status: 200,
      } as unknown as Response)

      const [health1, health2, health3] = await Promise.all([
        detailedHealthCheck(),
        detailedHealthCheck(),
        detailedHealthCheck(),
      ])

      expect(health1.status).toBe('ok')
      expect(health2.status).toBe('ok')
      expect(health3.status).toBe('ok')
    })

    it('should handle timeout errors gracefully', async () => {
      const controller = new AbortController()
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'

      vi.mocked(fetch).mockRejectedValueOnce(abortError).mockRejectedValueOnce(abortError)

      const health = await detailedHealthCheck()

      expect(health.status).toBe('error')
      expect(health.checks?.githubApi?.status).toBe('error')
      expect(health.checks?.emailService?.status).toBe('error')
    })

    it('should handle unknown error types', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce('string error')
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response)

      const health = await detailedHealthCheck()

      expect(health.status).toBe('degraded')
      expect(health.checks?.githubApi?.message).toBe('Unknown error')
    })

    it('should handle null error gracefully', async () => {
      vi.mocked(fetch)
        .mockRejectedValueOnce(null as unknown as Error)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        } as Response)

      const health = await detailedHealthCheck()

      expect(health.status).toBe('degraded')
      expect(health.checks?.githubApi?.message).toBe('Unknown error')
    })
  })
})
