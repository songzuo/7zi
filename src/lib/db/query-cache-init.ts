/**
 * Query Cache Initialization
 *
 * Initializes the query cache layer with configuration and warmup
 */

import { getQueryCache } from './query-cache-layer'
import { getQueryCacheConfig, CACHE_INVALIDATION_RULES, getWarmupConfig } from './query-cache-config'
import { logger } from '../logger'

let isInitialized = false

/**
 * Initialize the query cache layer
 *
 * This should be called during application startup
 */
export async function initializeQueryCache(): Promise<void> {
  if (isInitialized) {
    logger.warn('[QueryCache] Already initialized')
    return
  }

  try {
    logger.info('[QueryCache] Initializing query cache layer...')

    // Get configuration
    const config = getQueryCacheConfig()
    const cache = getQueryCache(config)

    // Add invalidation rules
    for (const rule of CACHE_INVALIDATION_RULES) {
      cache.addInvalidationRule(rule)
    }

    logger.info(`[QueryCache] Added ${CACHE_INVALIDATION_RULES.length} invalidation rules`)

    // Perform warmup if enabled
    if (config.warmupOnStartup) {
      logger.info('[QueryCache] Starting cache warmup...')
      const warmupConfig = await getWarmupConfig()
      await cache.warmup(warmupConfig)
    }

    isInitialized = true
    logger.info('[QueryCache] Query cache layer initialized successfully')

    // Log initial statistics
    const stats = cache.getStats()
    logger.info('[QueryCache] Initial statistics', {
      category: 'cache',
      data: {
        l1: {
          entries: stats.l1.entries,
          totalSize: `${(stats.l1.totalSize / 1024 / 1024).toFixed(2)} MB`,
        },
        l2: {
          enabled: config.l2Enabled,
          entries: stats.l2.entries,
        },
      },
    })
  } catch (error) {
    logger.error('[QueryCache] Failed to initialize query cache layer', { error })
    throw error
  }
}

/**
 * Shutdown the query cache layer
 *
 * This should be called during application shutdown
 */
export async function shutdownQueryCache(): Promise<void> {
  if (!isInitialized) {
    return
  }

  try {
    logger.info('[QueryCache] Shutting down query cache layer...')

    const cache = getQueryCache()

    // Get final statistics
    const stats = cache.getStats()
    logger.info('[QueryCache] Final statistics', {
      category: 'cache',
      data: {
        l1: {
          hits: stats.l1.hits,
          misses: stats.l1.misses,
          hitRate: `${(stats.l1.hitRate * 100).toFixed(2)}%`,
          evictions: stats.l1.evictions,
        },
        l2: {
          hits: stats.l2.hits,
          misses: stats.l2.misses,
          hitRate: `${(stats.l2.hitRate * 100).toFixed(2)}%`,
        },
        overall: {
          hitRate: `${(stats.overall.hitRate * 100).toFixed(2)}%`,
          avgResponseTime: `${stats.overall.avgResponseTime.toFixed(2)} ms`,
        },
      },
    })

    // Stop monitoring
    cache.stopMonitoring()

    // Clear cache
    await cache.clear()

    isInitialized = false
    logger.info('[QueryCache] Query cache layer shut down successfully')
  } catch (error) {
    logger.error('[QueryCache] Failed to shut down query cache layer', { error })
  }
}

/**
 * Check if query cache is initialized
 */
export function isQueryCacheInitialized(): boolean {
  return isInitialized
}

/**
 * Get cache statistics for health checks
 */
export function getCacheHealth() {
  const cache = getQueryCache()
  const stats = cache.getStats()

  return {
    status: isInitialized ? 'healthy' : 'not_initialized',
    l1: {
      hitRate: stats.l1.hitRate,
      entries: stats.l1.entries,
      memoryUsageMB: stats.l1.totalSize / 1024 / 1024,
    },
    l2: {
      hitRate: stats.l2.hitRate,
      available: stats.l2.errors === 0,
    },
    overall: {
      hitRate: stats.overall.hitRate,
      avgResponseTime: stats.overall.avgResponseTime,
    },
  }
}

// Auto-initialize in production
if (process.env.NODE_ENV === 'production' && process.env.AUTO_INIT_CACHE !== 'false') {
  initializeQueryCache().catch(error => {
    logger.error('[QueryCache] Auto-initialization failed', { error })
  })
}

// Graceful shutdown handlers
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    await shutdownQueryCache()
  })

  process.on('SIGINT', async () => {
    await shutdownQueryCache()
  })

  process.on('SIGTERM', async () => {
    await shutdownQueryCache()
  })
}

export default {
  initializeQueryCache,
  shutdownQueryCache,
  isQueryCacheInitialized,
  getCacheHealth,
}
