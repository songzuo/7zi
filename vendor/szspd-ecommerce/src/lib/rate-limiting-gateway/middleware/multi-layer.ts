/**
 * Multi-Layer Rate Limiting Middleware
 * 
 * Enterprise-grade multi-layer rate limiting for API Gateway.
 * Supports Global, IP, API Key, and User layers with configurable algorithms.
 * 
 * @version 1.10.0
 */

import type {
  MultiLayerRateLimitConfig,
  RateLimitContext,
  RateLimitResult,
  RateLimitHeaders,
  RateLimitLayer,
  IStorageAdapter,
  TokenBucketConfig,
  SlidingWindowConfig
} from '../types'
import { TokenBucket, MemoryTokenBucket } from '../algorithms/token-bucket'
import { SlidingWindow, MemorySlidingWindow } from '../algorithms/sliding-window'

/**
 * Layer check result
 */
export interface LayerResult {
  layer: RateLimitLayer
  result: RateLimitResult
  key: string
  duration: number
}

/**
 * Multi-layer middleware result
 */
export interface MultiLayerResult {
  allowed: boolean
  results: LayerResult[]
  headers: RateLimitHeaders
  limitedBy?: {
    layer: RateLimitLayer
    result: RateLimitResult
  }
}

/**
 * Metrics collector interface
 */
export interface IMetricsCollector {
  recordCheck(layer: RateLimitLayer, allowed: boolean, duration: number): void
  recordError(layer: RateLimitLayer, error: Error): void
}

/**
 * Default multi-layer configuration
 */
export const DEFAULT_CONFIG: MultiLayerRateLimitConfig = {
  ip: {
    enabled: true,
    algorithm: 'sliding-window',
    windowMs: 60000,
    maxRequests: 100
  },
  user: {
    enabled: true,
    algorithm: 'sliding-window',
    windowMs: 60000,
    maxRequests: 200
  },
  apiKey: {
    enabled: false,
    algorithm: 'token-bucket',
    defaultTier: 'free',
    tiers: {
      free: { name: 'free', rate: 2, burst: 10, dailyLimit: 1000 },
      basic: { name: 'basic', rate: 10, burst: 30, dailyLimit: 10000 },
      pro: { name: 'pro', rate: 50, burst: 150, dailyLimit: 100000 },
      enterprise: { name: 'enterprise', rate: 200, burst: 500, dailyLimit: 1000000 }
    }
  },
  global: {
    enabled: true,
    algorithm: 'token-bucket',
    rate: 1000,
    burst: 2000
  },
  failOpen: true
}

/**
 * Multi-Layer Rate Limiting Middleware
 */
export class MultiLayerMiddleware {
  private config: MultiLayerRateLimitConfig
  private storage: IStorageAdapter
  private tokenBucket: TokenBucket
  private slidingWindow: SlidingWindow
  private memoryTokenBucket: MemoryTokenBucket
  private memorySlidingWindow: MemorySlidingWindow
  private metrics?: IMetricsCollector

  constructor(
    storage: IStorageAdapter,
    config: Partial<MultiLayerRateLimitConfig> = {},
    metrics?: IMetricsCollector
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.storage = storage
    this.tokenBucket = new TokenBucket(storage)
    this.slidingWindow = new SlidingWindow(storage)
    this.memoryTokenBucket = new MemoryTokenBucket()
    this.memorySlidingWindow = new MemorySlidingWindow()
    this.metrics = metrics
  }

  /**
   * Check rate limit across all layers
   */
  async check(context: RateLimitContext): Promise<MultiLayerResult> {
    const results: LayerResult[] = []
    let limitedBy: { layer: RateLimitLayer; result: RateLimitResult } | undefined

    // Layer 1: Global rate limit (applies to all requests)
    if (this.config.global.enabled) {
      const layerResult = await this.checkGlobal(context)
      results.push(layerResult)
      
      if (!layerResult.result.allowed) {
        limitedBy = { layer: 'global', result: layerResult.result }
      }
    }

    // Layer 2: IP rate limit (only if not already limited)
    if (!limitedBy && this.config.ip.enabled) {
      const layerResult = await this.checkIp(context)
      results.push(layerResult)
      
      // Check whitelist/blacklist
      if (this.config.ip.whitelist?.includes(context.ip)) {
        // Whitelisted - skip rate limit
        layerResult.result.allowed = true
      } else if (this.config.ip.blacklist?.includes(context.ip)) {
        // Blacklisted - always deny
        layerResult.result.allowed = false
        layerResult.result.remaining = 0
        limitedBy = { layer: 'ip', result: layerResult.result }
      } else if (!layerResult.result.allowed) {
        limitedBy = { layer: 'ip', result: layerResult.result }
      }
    }

    // Layer 3: API Key rate limit (only if not already limited)
    if (!limitedBy && this.config.apiKey.enabled && context.apiKey) {
      const layerResult = await this.checkApiKey(context)
      results.push(layerResult)
      
      // Check whitelist
      if (this.config.apiKey.whitelist?.includes(context.apiKey)) {
        layerResult.result.allowed = true
      } else if (!layerResult.result.allowed) {
        limitedBy = { layer: 'api-key', result: layerResult.result }
      }
    }

    // Layer 4: User rate limit (only if not already limited)
    if (!limitedBy && this.config.user.enabled && context.userId) {
      const layerResult = await this.checkUser(context)
      results.push(layerResult)
      
      // Check whitelist
      if (this.config.user.whitelist?.includes(context.userId)) {
        layerResult.result.allowed = true
      } else if (!layerResult.result.allowed) {
        limitedBy = { layer: 'user', result: layerResult.result }
      }
    }

    // Build response headers
    const headers = this.buildHeaders(results, limitedBy)

    return {
      allowed: !limitedBy,
      results,
      headers,
      limitedBy
    }
  }

  /**
   * Check global rate limit
   */
  private async checkGlobal(context: RateLimitContext): Promise<LayerResult> {
    const start = Date.now()
    const config = this.config.global
    const key = 'global'

    try {
      let result: RateLimitResult

      if (config.algorithm === 'token-bucket') {
        result = await this.tokenBucket.check({
          key,
          capacity: config.burst,
          refillRate: config.rate
        })
      } else {
        // Fallback to sliding window for global
        result = await this.slidingWindow.check({
          key,
          limit: config.rate,
          windowSeconds: 1
        })
      }

      const duration = Date.now() - start
      this.metrics?.recordCheck('global', result.allowed, duration)

      return { layer: 'global', result, key, duration }
    } catch (error) {
      const duration = Date.now() - start
      this.metrics?.recordError('global', error instanceof Error ? error : new Error(String(error)))

      // Fail open if configured
      if (this.config.failOpen) {
        return {
          layer: 'global',
          result: this.createFallbackResult(),
          key,
          duration
        }
      }

      throw error
    }
  }

  /**
   * Check IP rate limit
   */
  private async checkIp(context: RateLimitContext): Promise<LayerResult> {
    const start = Date.now()
    const config = this.config.ip
    const key = `ip:${context.ip}`

    try {
      let result: RateLimitResult

      if (config.algorithm === 'token-bucket') {
        result = await this.tokenBucket.check({
          key,
          capacity: config.maxRequests,
          refillRate: config.maxRequests / (config.windowMs / 1000)
        })
      } else {
        result = await this.slidingWindow.check({
          key,
          limit: config.maxRequests,
          windowSeconds: config.windowMs / 1000
        })
      }

      const duration = Date.now() - start
      this.metrics?.recordCheck('ip', result.allowed, duration)

      return { layer: 'ip', result, key, duration }
    } catch (error) {
      const duration = Date.now() - start
      this.metrics?.recordError('ip', error instanceof Error ? error : new Error(String(error)))

      if (this.config.failOpen) {
        return {
          layer: 'ip',
          result: this.createFallbackResult(),
          key,
          duration
        }
      }

      throw error
    }
  }

  /**
   * Check API Key rate limit
   */
  private async checkApiKey(context: RateLimitContext): Promise<LayerResult> {
    const start = Date.now()
    const config = this.config.apiKey
    const tier = context.apiKeyTier ?? config.defaultTier
    const tierConfig = config.tiers[tier] ?? config.tiers[config.defaultTier]
    const key = `apikey:${context.apiKey}`

    try {
      let result: RateLimitResult

      if (config.algorithm === 'token-bucket') {
        result = await this.tokenBucket.check({
          key,
          capacity: tierConfig.burst,
          refillRate: tierConfig.rate
        })
      } else {
        result = await this.slidingWindow.check({
          key,
          limit: tierConfig.burst,
          windowSeconds: 60
        })
      }

      const duration = Date.now() - start
      this.metrics?.recordCheck('api-key', result.allowed, duration)

      return { layer: 'api-key', result, key, duration }
    } catch (error) {
      const duration = Date.now() - start
      this.metrics?.recordError('api-key', error instanceof Error ? error : new Error(String(error)))

      if (this.config.failOpen) {
        return {
          layer: 'api-key',
          result: this.createFallbackResult(),
          key,
          duration
        }
      }

      throw error
    }
  }

  /**
   * Check User rate limit
   */
  private async checkUser(context: RateLimitContext): Promise<LayerResult> {
    const start = Date.now()
    const config = this.config.user
    const key = `user:${context.userId}`

    try {
      let result: RateLimitResult

      // Check for tier-specific limits
      let maxRequests = config.maxRequests
      let windowMs = config.windowMs

      if (context.apiKeyTier && config.tiers?.[context.apiKeyTier]) {
        maxRequests = config.tiers[context.apiKeyTier].maxRequests
        windowMs = config.tiers[context.apiKeyTier].windowMs
      }

      if (config.algorithm === 'token-bucket') {
        result = await this.tokenBucket.check({
          key,
          capacity: maxRequests,
          refillRate: maxRequests / (windowMs / 1000)
        })
      } else {
        result = await this.slidingWindow.check({
          key,
          limit: maxRequests,
          windowSeconds: windowMs / 1000
        })
      }

      const duration = Date.now() - start
      this.metrics?.recordCheck('user', result.allowed, duration)

      return { layer: 'user', result, key, duration }
    } catch (error) {
      const duration = Date.now() - start
      this.metrics?.recordError('user', error instanceof Error ? error : new Error(String(error)))

      if (this.config.failOpen) {
        return {
          layer: 'user',
          result: this.createFallbackResult(),
          key,
          duration
        }
      }

      throw error
    }
  }

  /**
   * Build rate limit headers following IETF standard
   */
  private buildHeaders(results: LayerResult[], limitedBy?: { layer: RateLimitLayer; result: RateLimitResult }): RateLimitHeaders {
    // Use the most restrictive layer for headers
    const primaryResult = limitedBy?.result ?? results[results.length - 1]?.result

    if (!primaryResult) {
      return {
        'X-RateLimit-Limit': '0',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date().toISOString()
      }
    }

    const headers: RateLimitHeaders = {
      'X-RateLimit-Limit': primaryResult.limit.toString(),
      'X-RateLimit-Remaining': primaryResult.remaining.toString(),
      'X-RateLimit-Reset': new Date(primaryResult.resetTime).toISOString()
    }

    // Add Retry-After for limited requests
    if (limitedBy && primaryResult.retryAfter > 0) {
      headers['Retry-After'] = primaryResult.retryAfter.toString()
    }

    // Add policy header
    const policy = `${primaryResult.limit};60;${primaryResult.algorithm}`
    headers['X-RateLimit-Policy'] = policy

    // Add layer that triggered the limit
    if (limitedBy) {
      headers['X-RateLimit-Layer'] = limitedBy.layer
    }

    return headers
  }

  /**
   * Create fallback result for fail-open mode
   */
  private createFallbackResult(): RateLimitResult {
    return {
      allowed: true,
      limit: 1000,
      remaining: 999,
      resetTime: Date.now() + 60000,
      retryAfter: 0,
      algorithm: 'sliding-window',
      storage: 'memory'
    }
  }

  /**
   * Get rate limit status for a specific key
   */
  async getStatus(layer: RateLimitLayer, identifier: string): Promise<RateLimitResult | null> {
    const key = `${layer}:${identifier}`

    try {
      const state = await this.slidingWindow.getStatus(key, 60)
      
      return {
        allowed: state.count < 100, // Default limit
        limit: 100,
        remaining: Math.max(0, 100 - state.count),
        resetTime: state.resetTime ?? 0,
        retryAfter: 0,
        currentCount: state.count,
        algorithm: 'sliding-window',
        storage: this.storage.getType()
      }
    } catch {
      return null
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  async reset(layer: RateLimitLayer, identifier: string): Promise<boolean> {
    const key = `${layer}:${identifier}`
    
    try {
      await this.storage.delete(key)
      return true
    } catch {
      return false
    }
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig: Partial<MultiLayerRateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): MultiLayerRateLimitConfig {
    return { ...this.config }
  }
}

/**
 * Extract context from Express-like request
 */
export function extractContext(req: {
  ip?: string
  headers: Record<string, string | string[] | undefined>
  path: string
  method: string
  user?: { id?: string; userId?: string; tier?: string }
}): RateLimitContext {
  const forwardedFor = req.headers['x-forwarded-for']
  const realIP = req.headers['x-real-ip']
  const cfConnectingIP = req.headers['cf-connecting-ip']
  const apiKey = req.headers['x-api-key'] as string | undefined

  let ip = req.ip ?? 'unknown'
  
  if (typeof forwardedFor === 'string') {
    ip = forwardedFor.split(',')[0].trim()
  } else if (typeof realIP === 'string') {
    ip = realIP
  } else if (typeof cfConnectingIP === 'string') {
    ip = cfConnectingIP
  }

  return {
    ip,
    userId: req.user?.id ?? req.user?.userId,
    apiKey: typeof apiKey === 'string' ? apiKey : undefined,
    apiKeyTier: req.user?.tier,
    path: req.path,
    method: req.method,
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([k, v]) => [k, String(v ?? '')])
    ),
    timestamp: Date.now()
  }
}

export default MultiLayerMiddleware
