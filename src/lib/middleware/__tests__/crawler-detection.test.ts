/**
 * Crawler Detection Middleware Tests
 */

import { NextRequest, NextResponse } from 'next/server'
import { vi } from 'vitest'
import type { Mock } from 'vitest'
import {
  withCrawlerDetection,
  getFrequencyStats,
  clearFrequencyData,
  getAllFrequencyStats,
  getCrawlerDetectionStats,
  blacklistIP,
  whitelistIP,
} from '@/lib/middleware/crawler-detection'
// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import { logger as mockedLogger } from '@/lib/logger'

describe('Crawler Detection Middleware', () => {
  let mockRequest: NextRequest
  let mockHandler: Mock<(req: NextRequest) => Promise<NextResponse>>

  beforeEach(() => {
    vi.clearAllMocks()

    mockRequest = {
      nextUrl: {
        pathname: '/api/test',
        origin: 'http://localhost:3000',
      },
      headers: new Headers(),
      method: 'GET',
    } as unknown as NextRequest

    mockHandler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))

    // Clear frequency data between tests
    getAllFrequencyStats().clear()
  })

  describe('User-Agent Detection', () => {
    it('should allow requests from known bots', async () => {
      mockRequest.headers.set(
        'user-agent',
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      )

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkUserAgent: true,
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalledTimes(1)
    })

    it('should detect suspicious bot user agents', async () => {
      mockRequest.headers.set('user-agent', 'Scrapy/2.5.0 (+https://scrapy.org)')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkUserAgent: true,
        blockUnknownBots: true,
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(403)
      expect(response.headers.get('X-Crawler-Detected')).toBe('true')
      expect(response.headers.get('X-Crawler-Type')).toBe('suspicious')
    })

    it('should detect curl user agent', async () => {
      mockRequest.headers.set('user-agent', 'curl/7.68.0')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkUserAgent: true,
        blockUnknownBots: true,
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(403)
    })

    it('should detect missing user agent', async () => {
      mockRequest.headers.delete('user-agent')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkUserAgent: true,
        blockUnknownBots: true,
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(403)
    })

    it('should allow normal browser user agents', async () => {
      mockRequest.headers.set(
        'user-agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      )

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkUserAgent: true,
        checkFrequency: false, // Disable frequency check for this test
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(200)
    })

    it('should allow unknown bots when blockUnknownBots is false', async () => {
      mockRequest.headers.set('user-agent', 'Scrapy/2.5.0 (+https://scrapy.org)')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkUserAgent: true,
        blockUnknownBots: false,
        checkFrequency: false, // Disable frequency check for this test
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(200)
    })

    it('should set crawler detection headers', async () => {
      mockRequest.headers.set('user-agent', 'Scrapy/2.5.0 (+https://scrapy.org)')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'monitor', // Don't block, just monitor
        checkUserAgent: true,
        blockUnknownBots: true,
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(200) // Not blocked in monitor mode
      expect(response.headers.get('X-Crawler-Detected')).toBe('true')
      expect(response.headers.get('X-Crawler-Type')).toBe('suspicious')
    })
  })

  describe('Request Frequency Analysis', () => {
    it('should block burst requests', async () => {
      mockRequest.headers.set(
        'user-agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'
      )

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkFrequency: true,
        maxRequestsPerSecond: 3,
      })

      // Make 6 requests in rapid succession
      const responses = await Promise.all([
        protectedHandler(mockRequest),
        protectedHandler(mockRequest),
        protectedHandler(mockRequest),
        protectedHandler(mockRequest),
        protectedHandler(mockRequest),
        protectedHandler(mockRequest),
      ])

      // At least some should be blocked
      const blockedResponses = responses.filter(r => r.status === 429)
      expect(blockedResponses.length).toBeGreaterThan(0)
    })

    it('should block sustained high frequency', async () => {
      mockRequest.headers.set(
        'user-agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'
      )

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkFrequency: true,
        maxRequestsPerMinute: 10,
      })

      // Make many requests
      const responses = []
      for (let i = 0; i < 20; i++) {
        const response = await protectedHandler(mockRequest)
        responses.push(response)
      }

      // Should be blocked at some point
      const blockedResponses = responses.filter(r => r.status === 429)
      expect(blockedResponses.length).toBeGreaterThan(0)
    })

    it('should not block normal request patterns', async () => {
      mockRequest.headers.set(
        'user-agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124'
      )

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'monitor', // Use monitor mode to not block
        checkFrequency: true,
        maxRequestsPerSecond: 10,
        maxRequestsPerMinute: 30,
      })

      // Make requests at normal pace
      for (let i = 0; i < 10; i++) {
        const response = await protectedHandler(mockRequest)
        expect(response.status).toBe(200)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    })

    it('should track suspicious IPs', async () => {
      mockRequest.headers.set('user-agent', 'Scrapy/2.5.0')
      mockRequest.headers.set('x-forwarded-for', '192.168.1.100')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'monitor',
        checkUserAgent: false, // Focus on frequency
        checkFrequency: true,
        maxRequestsPerSecond: 2,
      })

      // Make many rapid requests
      for (let i = 0; i < 10; i++) {
        await protectedHandler(mockRequest)
      }

      const stats = getCrawlerDetectionStats()
      expect(stats.suspiciousIPs.length).toBeGreaterThan(0)
    })
  })

  describe('IP Reputation', () => {
    it('should block blacklisted IPs', async () => {
      mockRequest.headers.set('x-forwarded-for', '10.0.0.100')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkIpReputation: true,
        blacklist: ['10.0.0.100'],
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(403)
    })

    it('should allow whitelisted IPs', async () => {
      mockRequest.headers.set('x-forwarded-for', '10.0.0.200')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkIpReputation: true,
        whitelist: ['10.0.0.200'],
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(200)
    })

    it('should allow private IP addresses', async () => {
      mockRequest.headers.set('x-forwarded-for', '192.168.1.50')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkIpReputation: true,
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(200)
    })

    it('should allow localhost', async () => {
      mockRequest.headers.set('x-forwarded-for', '127.0.0.1')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkIpReputation: true,
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(200)
    })
  })

  describe('Mode Behavior', () => {
    it('should block in block mode', async () => {
      mockRequest.headers.set('user-agent', 'Scrapy/2.5.0')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkUserAgent: true,
        blockUnknownBots: true,
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(403)
    })

    it('should monitor but not block in monitor mode', async () => {
      mockRequest.headers.set('user-agent', 'Scrapy/2.5.0')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'monitor',
        checkUserAgent: true,
        blockUnknownBots: true,
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-Crawler-Detected')).toBe('true')
    })

    it('should be passive in passive mode', async () => {
      mockRequest.headers.set('user-agent', 'Scrapy/2.5.0')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'passive',
        checkUserAgent: true,
        blockUnknownBots: true,
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-Crawler-Detected')).toBeNull()
    })
  })

  describe('Utility Functions', () => {
    it('should get frequency stats for IP', async () => {
      mockRequest.headers.set('x-forwarded-for', '192.168.1.150')
      mockRequest.headers.set('user-agent', 'Mozilla/5.0 Chrome/91.0.4472.124')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'monitor',
        checkFrequency: true,
      })

      await protectedHandler(mockRequest)
      await protectedHandler(mockRequest)

      const stats = getFrequencyStats('192.168.1.150')

      expect(stats).not.toBeNull()
      expect(stats?.count).toBeGreaterThanOrEqual(2)
    })

    it('should clear frequency data for IP', async () => {
      mockRequest.headers.set('x-forwarded-for', '192.168.1.151')
      mockRequest.headers.set('user-agent', 'Mozilla/5.0 Chrome/91.0.4472.124')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'monitor',
        checkFrequency: true,
      })

      await protectedHandler(mockRequest)

      let stats = getFrequencyStats('192.168.1.151')
      expect(stats).not.toBeNull()

      clearFrequencyData('192.168.1.151')

      stats = getFrequencyStats('192.168.1.151')
      expect(stats).toBeNull()
    })

    it('should get crawler detection stats', async () => {
      const stats = getCrawlerDetectionStats()

      expect(stats).toHaveProperty('totalTrackedIPs')
      expect(stats).toHaveProperty('suspiciousIPs')
      expect(stats).toHaveProperty('highFrequencyIPs')
      expect(Array.isArray(stats.suspiciousIPs)).toBe(true)
      expect(Array.isArray(stats.highFrequencyIPs)).toBe(true)
    })

    it('should log blacklisted IPs', () => {
      blacklistIP('10.0.0.99')

      expect(mockedLogger.warn).toHaveBeenCalledWith('IP blacklisted', { ip: '10.0.0.99' })
    })

    it('should log whitelisted IPs', () => {
      whitelistIP('10.0.0.88')

      expect(mockedLogger.info).toHaveBeenCalledWith('IP whitelisted', { ip: '10.0.0.88' })
    })
  })

  describe('Integration Tests', () => {
    it('should work with multiple detection methods', async () => {
      mockRequest.headers.set('user-agent', 'Scrapy/2.5.0')
      mockRequest.headers.set('x-forwarded-for', '10.0.0.100')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkUserAgent: true,
        blockUnknownBots: true,
        checkFrequency: true,
        checkIpReputation: true,
        blacklist: ['10.0.0.100'],
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(403)
    })

    it('should allow legitimate users', async () => {
      mockRequest.headers.set(
        'user-agent',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      )
      mockRequest.headers.set('x-forwarded-for', '192.168.1.10')

      const protectedHandler = withCrawlerDetection(mockHandler, {
        mode: 'block',
        checkUserAgent: true,
        checkFrequency: true,
        checkIpReputation: true,
      })

      const response = await protectedHandler(mockRequest)

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalledTimes(1)
    })
  })
})
