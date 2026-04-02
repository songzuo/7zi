/**
 * Anti-Crawler Middleware for API Routes
 *
 * Features:
 * - User-Agent detection and validation
 * - Request frequency analysis (suspicious patterns)
 * - Bot signature detection
 * - IP reputation tracking
 * - Configurable bot policies (allow/block/monitor)
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// ============================================
// Types
// ============================================

export interface CrawlerDetectionConfig {
  // User-Agent validation
  checkUserAgent?: boolean
  blockUnknownBots?: boolean
  allowedBots?: string[]
  blockedBots?: string[]

  // Request frequency analysis
  checkFrequency?: boolean
  maxRequestsPerMinute?: number
  maxRequestsPerSecond?: number
  suspiciousThreshold?: number

  // IP reputation
  checkIpReputation?: boolean
  blacklist?: string[]
  whitelist?: string[]

  // Action mode
  mode: 'block' | 'monitor' | 'passive'
}

export interface CrawlerDetectionResult {
  isCrawler: boolean
  isSuspicious: boolean
  reason?: string
  userAgent?: string
  botType?: 'known' | 'suspicious' | 'unknown'
}

export interface FrequencyTracker {
  count: number
  firstSeen: number
  lastSeen: number
  alerts: number
}

// ============================================
// Constants
// ============================================

// Known legitimate bot user agents (regex patterns)
const KNOWN_BOT_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i, // Yahoo
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /applebot/i,
  /ia_archiver/i, // Alexa
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
]

// Suspicious bot user agents (common scraper patterns)
const SUSPICIOUS_BOT_PATTERNS = [
  /scrapy/i,
  /curl/i,
  /wget/i,
  /python-requests/i,
  /go-http-client/i,
  /java/i,
  /postman/i,
  /insomnia/i,
  /httpie/i,
  /httputil/i,
  /node-fetch/i,
  /axios/i,
]

// Default configuration
const DEFAULT_CONFIG: CrawlerDetectionConfig = {
  checkUserAgent: true,
  blockUnknownBots: false,
  checkFrequency: true,
  maxRequestsPerMinute: 60,
  maxRequestsPerSecond: 5,
  suspiciousThreshold: 3,
  checkIpReputation: true,
  mode: 'block',
}

// In-memory store for frequency tracking
const frequencyStore = new Map<string, FrequencyTracker>()

// ============================================
// Utility Functions
// ============================================

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  return 'unknown'
}

/**
 * Detect if a user agent is a bot
 */
function detectBot(userAgent: string): {
  isBot: boolean
  botType: 'known' | 'suspicious' | 'unknown'
  confidence: number
} {
  const ua = userAgent.toLowerCase()

  // Check known legitimate bots
  for (const pattern of KNOWN_BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, botType: 'known', confidence: 0.9 }
    }
  }

  // Check suspicious bots/scrapers
  for (const pattern of SUSPICIOUS_BOT_PATTERNS) {
    if (pattern.test(userAgent)) {
      return { isBot: true, botType: 'suspicious', confidence: 0.8 }
    }
  }

  // Check for missing or empty user agent
  if (!userAgent || userAgent.length < 10) {
    return { isBot: true, botType: 'suspicious', confidence: 0.6 }
  }

  // Check for bot-like characteristics
  const botIndicators = [/bot/i, /spider/i, /crawl/i, /scraper/i, /harvest/i]

  for (const pattern of botIndicators) {
    if (pattern.test(userAgent)) {
      return { isBot: true, botType: 'unknown', confidence: 0.5 }
    }
  }

  return { isBot: false, botType: 'unknown', confidence: 0 }
}

/**
 * Analyze request frequency for suspicious patterns
 */
function analyzeRequestFrequency(
  ip: string,
  config: CrawlerDetectionConfig
): {
  isSuspicious: boolean
  reason?: string
} {
  const now = Date.now()
  const entry = frequencyStore.get(ip)

  if (!entry) {
    // First request from this IP
    frequencyStore.set(ip, {
      count: 1,
      firstSeen: now,
      lastSeen: now,
      alerts: 0,
    })
    return { isSuspicious: false }
  }

  // Update entry
  const countBefore = entry.count
  entry.count++
  entry.lastSeen = now

  // Calculate time since first request and since last request
  const timeSinceFirst = now - entry.firstSeen
  const timeSinceLast = now - (entry.lastSeen - 100) // Approximate time since last request

  // Check for burst requests (many requests in short time)
  // Use the total count and elapsed time to detect bursts
  if (timeSinceFirst < 1000 && entry.count > (config.maxRequestsPerSecond || 5)) {
    entry.alerts++
    return {
      isSuspicious: true,
      reason: `Burst activity: ${entry.count} requests in ${timeSinceFirst}ms`,
    }
  }

  // Check for sustained high frequency
  const requestsPerMinute = entry.count / (timeSinceFirst / 60000)
  if (requestsPerMinute > (config.maxRequestsPerMinute || 60)) {
    entry.alerts++
    return {
      isSuspicious: true,
      reason: `High frequency: ${requestsPerMinute.toFixed(1)} req/min`,
    }
  }

  // Check for too many alerts
  if (entry.alerts >= (config.suspiciousThreshold || 3)) {
    return {
      isSuspicious: true,
      reason: `Repeated suspicious behavior (${entry.alerts} alerts)`,
    }
  }

  return { isSuspicious: false }
}

/**
 * Check IP against blacklist/whitelist
 */
function checkIpReputation(
  ip: string,
  config: CrawlerDetectionConfig
): {
  isBlocked: boolean
  reason?: string
} {
  // Check whitelist first
  if (config.whitelist && config.whitelist.length > 0) {
    if (config.whitelist.includes(ip)) {
      return { isBlocked: false }
    }
  }

  // Check blacklist
  if (config.blacklist && config.blacklist.length > 0) {
    if (config.blacklist.includes(ip)) {
      return {
        isBlocked: true,
        reason: 'IP is blacklisted',
      }
    }
  }

  // Check for private/internal IPs (usually safe)
  const privateIpPatterns = [
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^127\./,
    /^::1$/,
  ]

  for (const pattern of privateIpPatterns) {
    if (pattern.test(ip)) {
      return { isBlocked: false }
    }
  }

  return { isBlocked: false }
}

/**
 * Clean up old frequency entries
 */
function cleanupFrequencyEntries(): void {
  const now = Date.now()
  const maxAge = 10 * 60 * 1000 // 10 minutes

  const keysToDelete: string[] = []

  for (const [ip, entry] of frequencyStore.entries()) {
    if (now - entry.lastSeen > maxAge) {
      keysToDelete.push(ip)
    }
  }

  for (const key of keysToDelete) {
    frequencyStore.delete(key)
  }

  if (keysToDelete.length > 0) {
    logger.debug(`Cleaned up ${keysToDelete.length} frequency entries`)
  }
}

// ============================================
// Main Middleware Function
// ============================================

/**
 * Anti-crawler detection middleware
 */
export function withCrawlerDetection(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: Partial<CrawlerDetectionConfig> = {}
) {
  const finalConfig: CrawlerDetectionConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  }

  return async (req: NextRequest): Promise<NextResponse> => {
    const ip = getClientIP(req)
    const userAgent = req.headers.get('user-agent') || ''
    const result: CrawlerDetectionResult = {
      isCrawler: false,
      isSuspicious: false,
      userAgent,
    }

    // Helper to add crawler headers to response
    const addCrawlerHeaders = (response: NextResponse) => {
      // Don't add headers in passive mode
      if (finalConfig.mode === 'passive') {
        return response
      }

      if (result.isCrawler || result.isSuspicious) {
        response.headers.set('X-Crawler-Detected', 'true')
        if (result.botType) {
          response.headers.set('X-Crawler-Type', result.botType)
        }
        if (result.reason) {
          response.headers.set('X-Crawler-Reason', result.reason)
        }
      }
      return response
    }

    // Check IP reputation
    if (finalConfig.checkIpReputation) {
      const ipCheck = checkIpReputation(ip, finalConfig)
      if (ipCheck.isBlocked) {
        logger.warn(`IP blocked by reputation check`, { ip, reason: ipCheck.reason })

        if (finalConfig.mode === 'block') {
          const response = NextResponse.json(
            {
              success: false,
              error: {
                type: 'ACCESS_DENIED',
                message: 'Access denied',
                details: {
                  reason: ipCheck.reason,
                },
              },
            },
            { status: 403 }
          )
          return addCrawlerHeaders(response)
        }
        // In monitor/passive mode, log but don't block
      }
    }

    // Check User-Agent
    if (finalConfig.checkUserAgent) {
      const botDetection = detectBot(userAgent)
      result.isCrawler = botDetection.isBot
      result.botType = botDetection.botType

      if (botDetection.isBot) {
        // Check if it's a known good bot
        if (botDetection.botType === 'known') {
          logger.info(`Known bot detected`, {
            ip,
            userAgent: userAgent.substring(0, 100),
          })
          // Allow known bots to proceed
        } else if (finalConfig.blockUnknownBots && botDetection.botType === 'suspicious') {
          result.isSuspicious = true
          result.reason = 'Suspicious bot detected'

          logger.warn(`Suspicious bot blocked`, {
            ip,
            userAgent: userAgent.substring(0, 100),
            reason: result.reason,
          })

          if (finalConfig.mode === 'block') {
            const response = NextResponse.json(
              {
                success: false,
                error: {
                  type: 'ACCESS_DENIED',
                  message: 'Bot access denied',
                  details: {
                    reason: result.reason,
                  },
                },
              },
              { status: 403 }
            )
            return addCrawlerHeaders(response)
          }
        }
      }
    }

    // Check request frequency (always track, only mark suspicious/block based on mode)
    if (finalConfig.checkFrequency) {
      const freqCheck = analyzeRequestFrequency(ip, finalConfig)

      // Update result based on mode
      if (freqCheck.isSuspicious && finalConfig.mode !== 'passive') {
        result.isSuspicious = result.isSuspicious || true
        result.reason = freqCheck.reason
      }

      // Only block in block mode
      if (freqCheck.isSuspicious && finalConfig.mode === 'block') {
        logger.warn(`Suspicious activity detected`, {
          ip,
          reason: freqCheck.reason,
        })

        const response = NextResponse.json(
          {
            success: false,
            error: {
              type: 'RATE_LIMIT_EXCEEDED',
              message: 'Suspicious activity detected',
              details: {
                reason: freqCheck.reason,
              },
            },
          },
          { status: 429 }
        )
        return addCrawlerHeaders(response)
      }
    }

    // Add crawler detection info to headers (for monitoring)
    const response = await handler(req)

    return addCrawlerHeaders(response)
  }
}

// ============================================
// Periodic Cleanup
// ============================================

let cleanupIntervalId: NodeJS.Timeout | null = null

export function startCrawlerCleanup(intervalMs: number = 5 * 60 * 1000): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId)
  }

  cleanupIntervalId = setInterval(() => {
    cleanupFrequencyEntries()
  }, intervalMs)

  logger.info(`Started crawler detection cleanup (interval: ${intervalMs}ms)`)
}

export function stopCrawlerCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId)
    cleanupIntervalId = null
    logger.info('Stopped crawler detection cleanup')
  }
}

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  startCrawlerCleanup()
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get frequency stats for an IP
 */
export function getFrequencyStats(ip: string): FrequencyTracker | null {
  return frequencyStore.get(ip) || null
}

/**
 * Clear frequency data for an IP
 */
export function clearFrequencyData(ip: string): void {
  frequencyStore.delete(ip)
}

/**
 * Get all frequency stats
 */
export function getAllFrequencyStats(): Map<string, FrequencyTracker> {
  return new Map(frequencyStore)
}

/**
 * Add IP to blacklist
 */
export function blacklistIP(ip: string): void {
  // Note: This would need persistent storage in production
  logger.warn(`IP blacklisted`, { ip })
}

/**
 * Add IP to whitelist
 */
export function whitelistIP(ip: string): void {
  // Note: This would need persistent storage in production
  logger.info(`IP whitelisted`, { ip })
}

/**
 * Get detection statistics
 */
export function getCrawlerDetectionStats(): {
  totalTrackedIPs: number
  suspiciousIPs: string[]
  highFrequencyIPs: string[]
} {
  const suspiciousIPs: string[] = []
  const highFrequencyIPs: string[] = []

  for (const [ip, entry] of frequencyStore.entries()) {
    if (entry.alerts > 0) {
      suspiciousIPs.push(ip)
    }

    const timeSinceFirst = Date.now() - entry.firstSeen
    const requestsPerMinute = entry.count / (timeSinceFirst / 60000)

    if (requestsPerMinute > 30) {
      highFrequencyIPs.push(ip)
    }
  }

  return {
    totalTrackedIPs: frequencyStore.size,
    suspiciousIPs,
    highFrequencyIPs,
  }
}
