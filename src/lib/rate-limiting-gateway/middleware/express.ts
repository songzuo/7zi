/**
 * Express Middleware for Rate Limiting Gateway
 * 
 * Drop-in Express middleware for multi-layer rate limiting.
 * 
 * @version 1.10.0
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { MultiLayerMiddleware, extractContext } from './multi-layer'
import type { MultiLayerRateLimitConfig, IStorageAdapter, RateLimitContext } from '../types'
import { RedisAdapter } from '../storage/redis-adapter'
import { MemoryAdapter } from '../storage/memory-adapter'

/**
 * Express middleware configuration
 */
export interface ExpressMiddlewareConfig extends Partial<MultiLayerRateLimitConfig> {
  /** Storage adapter (creates default if not provided) */
  storage?: IStorageAdapter
  /** Custom context extractor */
  contextExtractor?: (req: Request) => RateLimitContext
  /** Custom error response handler */
  errorResponse?: (req: Request, res: Response, result: { layer: string; result: unknown }) => void
  /** Skip rate limiting for certain requests */
  skip?: (req: Request) => boolean | Promise<boolean>
  /** Trust proxy headers */
  trustProxy?: boolean
  /** Custom key prefix */
  keyPrefix?: string
}

/**
 * Create Express rate limiting middleware
 */
export function createRateLimitMiddleware(config: ExpressMiddlewareConfig = {}): RequestHandler {
  const {
    storage,
    contextExtractor,
    errorResponse,
    skip,
    trustProxy = true,
    keyPrefix = 'rl:',
    ...rateLimitConfig
  } = config

  // Create storage adapter if not provided
  const adapter = storage ?? createDefaultStorage(keyPrefix)
  
  // Create middleware instance
  const middleware = new MultiLayerMiddleware(adapter, rateLimitConfig)

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if should skip rate limiting
      if (skip) {
        const shouldSkip = await skip(req)
        if (shouldSkip) {
          return next()
        }
      }

      // Extract context
      const context = contextExtractor 
        ? contextExtractor(req) 
        : extractContextFromExpress(req, trustProxy)

      // Check rate limit
      const result = await middleware.check(context)

      // Set response headers
      setHeaders(res, result.headers)

      // If allowed, continue
      if (result.allowed) {
        return next()
      }

      // Rate limited - send error response
      if (errorResponse) {
        return errorResponse(req, res, result.limitedBy!)
      }

      // Default error response
      return res.status(429).json({
        error: {
          type: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
          details: {
            layer: result.limitedBy?.layer,
            limit: result.limitedBy?.result.limit,
            retryAfter: result.limitedBy?.result.retryAfter,
            resetAt: new Date(result.limitedBy?.result.resetTime ?? Date.now()).toISOString()
          }
        }
      })
    } catch (error) {
      // Log error and continue (fail-open)
      console.error('Rate limiting error:', error)
      return next()
    }
  }
}

/**
 * Create conditional rate limiting middleware
 * 
 * Applies different rate limits based on request conditions
 */
export function createConditionalMiddleware(
  conditions: Array<{
    test: (req: Request) => boolean | Promise<boolean>
    config: ExpressMiddlewareConfig
  }>,
  defaultConfig?: ExpressMiddlewareConfig
): RequestHandler {
  const middlewares = conditions.map(({ config }) => createRateLimitMiddleware(config))
  const defaultMiddleware = defaultConfig ? createRateLimitMiddleware(defaultConfig) : null

  return async (req: Request, res: Response, next: NextFunction) => {
    for (let i = 0; i < conditions.length; i++) {
      const matches = await conditions[i].test(req)
      if (matches) {
        return middlewares[i](req, res, next)
      }
    }

    if (defaultMiddleware) {
      return defaultMiddleware(req, res, next)
    }

    next()
  }
}

/**
 * Create route-specific rate limiting middleware
 * 
 * Applies different rate limits for different routes
 */
export function createRouteMiddleware(
  routes: Record<string, ExpressMiddlewareConfig>,
  defaultConfig?: ExpressMiddlewareConfig
): RequestHandler {
  const routeEntries = Object.entries(routes).map(([pattern, config]) => ({
    pattern: new RegExp(pattern),
    middleware: createRateLimitMiddleware(config)
  }))
  const defaultMiddleware = defaultConfig ? createRateLimitMiddleware(defaultConfig) : null

  return async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path

    for (const { pattern, middleware } of routeEntries) {
      if (pattern.test(path)) {
        return middleware(req, res, next)
      }
    }

    if (defaultMiddleware) {
      return defaultMiddleware(req, res, next)
    }

    next()
  }
}

/**
 * Extract context from Express request
 */
function extractContextFromExpress(req: Request, trustProxy: boolean): RateLimitContext {
  const headers: Record<string, string> = {}
  
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers[key] = Array.isArray(value) ? value[0] : value
    }
  }

  let ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'

  if (trustProxy) {
    const forwardedFor = req.headers['x-forwarded-for']
    const realIP = req.headers['x-real-ip']
    const cfConnectingIP = req.headers['cf-connecting-ip']

    if (typeof forwardedFor === 'string') {
      ip = forwardedFor.split(',')[0].trim()
    } else if (typeof realIP === 'string') {
      ip = realIP
    } else if (typeof cfConnectingIP === 'string') {
      ip = cfConnectingIP
    }
  }

  // Try to get user info from various auth patterns
  const user = (req as Request & { user?: { id?: string; userId?: string; tier?: string } }).user

  return {
    ip,
    userId: user?.id ?? user?.userId,
    apiKey: headers['x-api-key'],
    apiKeyTier: user?.tier ?? headers['x-api-tier'],
    path: req.path,
    method: req.method,
    headers,
    timestamp: Date.now()
  }
}

/**
 * Set rate limit headers on response
 */
function setHeaders(res: Response, headers: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      res.setHeader(key, value)
    }
  }
}

/**
 * Create default storage adapter
 */
function createDefaultStorage(keyPrefix: string): IStorageAdapter {
  // Try Redis first
  if (process.env.REDIS_URL) {
    return new RedisAdapter({
      url: process.env.REDIS_URL,
      keyPrefix
    })
  }

  // Fall back to memory
  return new MemoryAdapter()
}

/**
 * Rate limit decorator for route handlers
 */
export function rateLimited(config: ExpressMiddlewareConfig = {}) {
  const middleware = createRateLimitMiddleware(config)

  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<RequestHandler>
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
      return new Promise<void>((resolve, reject) => {
        middleware(req, res, async (err) => {
          if (err) {
            reject(err)
            return
          }

          try {
            await originalMethod?.call(this, req, res, next)
            resolve()
          } catch (error) {
            reject(error)
          }
        })
      })
    }

    return descriptor
  }
}

/**
 * Predefined middleware presets
 */
export const presets = {
  /**
   * Strict rate limiting (recommended for authentication endpoints)
   */
  strict: (storage?: IStorageAdapter): ExpressMiddlewareConfig => ({
    storage,
    ip: {
      enabled: true,
      algorithm: 'sliding-window',
      windowMs: 60000,
      maxRequests: 20
    },
    user: {
      enabled: true,
      algorithm: 'sliding-window',
      windowMs: 60000,
      maxRequests: 50
    },
    global: {
      enabled: true,
      algorithm: 'token-bucket',
      rate: 100,
      burst: 200
    }
  }),

  /**
   * Moderate rate limiting (recommended for general API endpoints)
   */
  moderate: (storage?: IStorageAdapter): ExpressMiddlewareConfig => ({
    storage,
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
    global: {
      enabled: true,
      algorithm: 'token-bucket',
      rate: 1000,
      burst: 2000
    }
  }),

  /**
   * Relaxed rate limiting (recommended for read-heavy endpoints)
   */
  relaxed: (storage?: IStorageAdapter): ExpressMiddlewareConfig => ({
    storage,
    ip: {
      enabled: true,
      algorithm: 'sliding-window',
      windowMs: 60000,
      maxRequests: 300
    },
    user: {
      enabled: true,
      algorithm: 'sliding-window',
      windowMs: 60000,
      maxRequests: 500
    },
    global: {
      enabled: true,
      algorithm: 'token-bucket',
      rate: 5000,
      burst: 10000
    }
  }),

  /**
   * API key focused rate limiting (for public APIs)
   */
  apiKeyFocused: (storage?: IStorageAdapter): ExpressMiddlewareConfig => ({
    storage,
    ip: {
      enabled: true,
      algorithm: 'sliding-window',
      windowMs: 60000,
      maxRequests: 60
    },
    apiKey: {
      enabled: true,
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
      rate: 10000,
      burst: 20000
    }
  })
}

export default createRateLimitMiddleware
