/**
 * Rate Limiting Management API
 * 
 * API routes for managing and monitoring rate limits.
 * 
 * @version 1.10.0
 */

import type { Request, Response, RequestHandler } from 'express'
import type { 
  IStorageAdapter, 
  RateLimitLayer, 
  RateLimitStatus,
  RateLimitAdjustment,
  RateLimitStats
} from '../types'
import { MultiLayerMiddleware } from '../middleware/multi-layer'
import { TokenBucket } from '../algorithms/token-bucket'
import { SlidingWindow } from '../algorithms/sliding-window'

/**
 * Management API configuration
 */
export interface ManagementApiConfig {
  /** Storage adapter */
  storage: IStorageAdapter
  /** Multi-layer middleware instance */
  middleware: MultiLayerMiddleware
  /** API key for authentication */
  apiKey?: string
  /** Enable read-only mode */
  readOnly?: boolean
}

/**
 * Create management API routes
 */
export function createManagementApi(config: ManagementApiConfig): {
  getStatus: RequestHandler
  getStats: RequestHandler
  adjust: RequestHandler
  reset: RequestHandler
  listKeys: RequestHandler
  getHealth: RequestHandler
  router: RequestHandler
} {
  const { storage, middleware, apiKey, readOnly = false } = config
  const tokenBucket = new TokenBucket(storage)
  const slidingWindow = new SlidingWindow(storage)

  /**
   * Authentication middleware
   */
  const authenticate: RequestHandler = (req, res, next) => {
    if (!apiKey) {
      return next()
    }

    const providedKey = req.headers['x-api-key'] ?? req.query['apiKey']
    
    if (providedKey !== apiKey) {
      return res.status(401).json({
        error: {
          type: 'UNAUTHORIZED',
          message: 'Invalid or missing API key'
        }
      })
    }

    next()
  }

  /**
   * GET /status/:layer/:identifier
   * Get rate limit status for a specific key
   */
  const getStatus: RequestHandler = async (req, res) => {
    try {
      const { layer, identifier } = req.params
      const layerStr = Array.isArray(layer) ? layer[0] : layer

      if (!layerStr || !isValidLayer(layerStr)) {
        return res.status(400).json({
          error: {
            type: 'INVALID_LAYER',
            message: `Invalid layer: ${layerStr}. Must be one of: global, ip, api-key, user`
          }
        })
      }

      const key = `${layerStr}:${identifier}`
      const status = await getKeyStatus(key, layerStr, storage)

      res.json({
        success: true,
        data: status
      })
    } catch (error) {
      res.status(500).json({
        error: {
          type: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * GET /stats
   * Get overall rate limiting statistics
   */
  const getStats: RequestHandler = async (_req, res) => {
    try {
      const stats = await getOverallStats(storage)
      
      res.json({
        success: true,
        data: stats
      })
    } catch (error) {
      res.status(500).json({
        error: {
          type: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * POST /adjust
   * Adjust rate limit for a key
   */
  const adjust: RequestHandler = async (req, res) => {
    if (readOnly) {
      return res.status(403).json({
        error: {
          type: 'READ_ONLY',
          message: 'Management API is in read-only mode'
        }
      })
    }

    try {
      const adjustment = req.body as RateLimitAdjustment

      if (!isValidLayer(adjustment.layer)) {
        return res.status(400).json({
          error: {
            type: 'INVALID_LAYER',
            message: `Invalid layer: ${adjustment.layer}`
          }
        })
      }

      const key = `${adjustment.layer}:${adjustment.key}`

      // Reset count if requested
      if (adjustment.resetCount) {
        await storage.delete(key)
      }

      // Add tokens if requested
      if (adjustment.addTokens && adjustment.addTokens > 0) {
        await tokenBucket.addTokens(key, adjustment.addTokens, adjustment.newLimit ?? 100)
      }

      res.json({
        success: true,
        message: 'Rate limit adjusted successfully'
      })
    } catch (error) {
      res.status(500).json({
        error: {
          type: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * POST /reset/:layer/:identifier
   * Reset rate limit for a specific key
   */
  const reset: RequestHandler = async (req, res) => {
    if (readOnly) {
      return res.status(403).json({
        error: {
          type: 'READ_ONLY',
          message: 'Management API is in read-only mode'
        }
      })
    }

    try {
      const { layer, identifier } = req.params
      const layerStr = Array.isArray(layer) ? layer[0] : layer

      if (!layerStr || !isValidLayer(layerStr)) {
        return res.status(400).json({
          error: {
            type: 'INVALID_LAYER',
            message: `Invalid layer: ${layerStr}`
          }
        })
      }

      const key = `${layerStr}:${identifier}`
      const deleted = await storage.delete(key)

      res.json({
        success: true,
        message: deleted ? 'Rate limit reset successfully' : 'Key not found',
        data: { key, deleted }
      })
    } catch (error) {
      res.status(500).json({
        error: {
          type: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * GET /keys
   * List all rate limit keys (paginated)
   */
  const listKeys: RequestHandler = async (req, res) => {
    try {
      const pattern = (req.query.pattern as string) ?? '*'
      const cursor = parseInt((req.query.cursor as string) ?? '0', 10)
      const count = Math.min(parseInt((req.query.count as string) ?? '100', 10), 1000)

      // Use SCAN for pagination
      const keys = await scanKeys(storage, pattern, count)

      res.json({
        success: true,
        data: {
          keys,
          count: keys.length,
          cursor: cursor + keys.length
        }
      })
    } catch (error) {
      res.status(500).json({
        error: {
          type: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
  }

  /**
   * GET /health
   * Health check for rate limiting service
   */
  const getHealth: RequestHandler = async (_req, res) => {
    try {
      const connected = await storage.isConnected()
      const type = storage.getType()

      res.json({
        success: true,
        data: {
          status: connected ? 'healthy' : 'unhealthy',
          storage: {
            type,
            connected
          },
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      })
    }
  }

  /**
   * Combined router
   */
  const router: RequestHandler = (req, res, next) => {
    const path = req.path

    // Apply authentication
    authenticate(req, res, (authErr) => {
      if (authErr) return next(authErr)

      // Route to appropriate handler
      if (path === '/health') {
        return getHealth(req, res, next)
      }
      if (path === '/stats') {
        return getStats(req, res, next)
      }
      if (path === '/adjust') {
        return adjust(req, res, next)
      }
      if (path === '/keys') {
        return listKeys(req, res, next)
      }
      if (path.startsWith('/reset/')) {
        return reset(req, res, next)
      }
      if (path.startsWith('/status/')) {
        return getStatus(req, res, next)
      }

      next()
    })
  }

  return {
    getStatus,
    getStats,
    adjust,
    reset,
    listKeys,
    getHealth,
    router
  }
}

/**
 * Get status for a specific key
 */
async function getKeyStatus(
  key: string,
  layer: RateLimitLayer,
  storage: IStorageAdapter
): Promise<RateLimitStatus> {
  // Try to get token bucket state first
  const bucketData = await storage.get(key)
  
  if (bucketData) {
    try {
      const state = JSON.parse(bucketData)
      return {
        key,
        layer,
        currentCount: state.tokens ?? 0,
        limit: state.capacity ?? 100,
        remaining: Math.floor(state.tokens ?? 0),
        resetTime: Date.now() + 60000,
        algorithm: 'token-bucket',
        storage: storage.getType()
      }
    } catch {
      // Not JSON, might be a simple counter
    }
  }

  // Try sliding window
  const count = await storage.zcard(key)
  
  return {
    key,
    layer,
    currentCount: count,
    limit: 100,
    remaining: Math.max(0, 100 - count),
    resetTime: Date.now() + 60000,
    algorithm: 'sliding-window',
    storage: storage.getType()
  }
}

/**
 * Get overall statistics
 */
async function getOverallStats(storage: IStorageAdapter): Promise<RateLimitStats> {
  // This would be implemented with actual metrics collection
  // For now, return placeholder data
  const connected = await storage.isConnected()

  return {
    totalRequests: 0,
    allowedRequests: 0,
    rejectedRequests: 0,
    rejectionRate: 0,
    byLayer: {
      global: { allowed: 0, rejected: 0 },
      ip: { allowed: 0, rejected: 0 },
      'api-key': { allowed: 0, rejected: 0 },
      user: { allowed: 0, rejected: 0 }
    },
    byAlgorithm: {
      'token-bucket': { allowed: 0, rejected: 0 },
      'sliding-window': { allowed: 0, rejected: 0 },
      'fixed-window': { allowed: 0, rejected: 0 },
      'leaky-bucket': { allowed: 0, rejected: 0 }
    },
    avgLatencyMs: 0,
    p99LatencyMs: 0,
    // Additional info
    storage: {
      type: storage.getType(),
      connected
    }
  } as RateLimitStats & { storage: { type: string; connected: boolean } }
}

/**
 * Scan keys with pattern
 */
async function scanKeys(
  storage: IStorageAdapter,
  pattern: string,
  count: number
): Promise<string[]> {
  // For memory adapter, we'd need to implement key scanning
  // For Redis, we use SCAN command
  try {
    if (storage.getType() === 'redis' || storage.getType() === 'redis-cluster') {
      const result = await storage.eval(
        `local cursor = '0'
         local keys = {}
         repeat
           local r = redis.call('SCAN', cursor, 'MATCH', ARGV[1], 'COUNT', ARGV[2])
           cursor = r[1]
           for i = 1, #r[2] do
             table.insert(keys, r[2][i])
             if #keys >= ARGV[2] then
               break
             end
           end
         until cursor == '0' or #keys >= ARGV[2]
         return keys`,
        [],
        [pattern, count]
      )
      return result as string[]
    }

    // Memory adapter - return empty for now
    return []
  } catch {
    return []
  }
}

/**
 * Check if layer is valid
 */
function isValidLayer(layer: string): layer is RateLimitLayer {
  return ['global', 'ip', 'api-key', 'user'].includes(layer)
}

/**
 * Mount management API on Express app
 */
export function mountManagementApi(
  app: {
    get: (path: string, handler: RequestHandler) => void
    post: (path: string, handler: RequestHandler) => void
  },
  config: ManagementApiConfig,
  basePath = '/api/rate-limit'
): void {
  const api = createManagementApi(config)

  app.get(`${basePath}/health`, api.getHealth)
  app.get(`${basePath}/stats`, api.getStats)
  app.get(`${basePath}/keys`, api.listKeys)
  app.get(`${basePath}/status/:layer/:identifier`, api.getStatus)
  app.post(`${basePath}/adjust`, api.adjust)
  app.post(`${basePath}/reset/:layer/:identifier`, api.reset)
}

export default createManagementApi
