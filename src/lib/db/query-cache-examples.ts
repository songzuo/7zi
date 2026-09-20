/**
 * Database Query Cache Layer - Usage Examples
 *
 * This file demonstrates how to use the query cache layer
 * to optimize database query performance.
 */

import { getQueryCache, QueryCacheKeys, CachedQuery, type WarmupConfig } from './query-cache-layer'
import { getDatabaseAsync } from './index'

// ============================================
// Example 1: Basic Cache Usage
// ============================================

async function example1_basicUsage() {
  const cache = getQueryCache()

  // Get or set pattern
  const agent = await cache.getOrSet(
    QueryCacheKeys.agent('agent-123'),
    async () => {
      const db = await getDatabaseAsync()
      const stmt = db.prepare('SELECT * FROM agents WHERE id = ?')
      return stmt.get('agent-123')
    },
    5 * 60 * 1000 // 5 minutes TTL
  )

  console.log('Agent:', agent)
}

// ============================================
// Example 2: Using Decorator
// ============================================

class AgentService {
  @CachedQuery('agent:by-id', 5 * 60 * 1000)
  async getAgentById(agentId: string) {
    const db = await getDatabaseAsync()
    const stmt = db.prepare('SELECT * FROM agents WHERE id = ?')
    return stmt.get(agentId)
  }

  @CachedQuery('agents:active', 3 * 60 * 1000)
  async getActiveAgents() {
    const db = await getDatabaseAsync()
    const stmt = db.prepare('SELECT * FROM agents WHERE status = ?')
    return stmt.all('active')
  }

  @CachedQuery('agent:stats', 10 * 60 * 1000)
  async getAgentStats() {
    const db = await getDatabaseAsync()
    const stmt = db.prepare(`
      SELECT status, COUNT(*) as count
      FROM agents
      GROUP BY status
    `)
    return stmt.all()
  }
}

async function example2_decoratorUsage() {
  const service = new AgentService()

  // First call - executes query and caches result
  const agent1 = await service.getAgentById('agent-123')

  // Second call - returns cached result
  const agent2 = await service.getAgentById('agent-123')

  console.log('Same agent?', agent1 === agent2) // true (cached)
}

// ============================================
// Example 3: Cache Invalidation
// ============================================

async function example3_cacheInvalidation() {
  const cache = getQueryCache()

  // Add invalidation rule
  cache.addInvalidationRule({
    pattern: 'agent:*',
    tables: ['agents'],
  })

  cache.addInvalidationRule({
    pattern: 'wallet:*',
    tables: ['wallets', 'transactions'],
  })

  // When data changes, invalidate cache
  async function updateAgent(agentId: string, updates: Record<string, unknown>) {
    const db = await getDatabaseAsync()
    const stmt = db.prepare('UPDATE agents SET ... WHERE id = ?')
    stmt.run(...Object.values(updates), agentId)

    // Invalidate related cache entries
    await cache.invalidateByTable('agents')
  }

  await updateAgent('agent-123', { name: 'Updated Name' })
}

// ============================================
// Example 4: Cache Statistics
// ============================================

async function example4_cacheStatistics() {
  const cache = getQueryCache()

  // Perform some queries
  await cache.getOrSet('test:key', async () => ({ data: 'test' }))
  await cache.getOrSet('test:key', async () => ({ data: 'test' })) // Cache hit

  // Get statistics
  const stats = cache.getStats()

  console.log('Cache Statistics:', {
    l1: {
      hitRate: `${(stats.l1.hitRate * 100).toFixed(2)}%`,
      entries: stats.l1.entries,
      totalSize: `${(stats.l1.totalSize / 1024 / 1024).toFixed(2)} MB`,
    },
    l2: {
      hitRate: `${(stats.l2.hitRate * 100).toFixed(2)}%`,
      entries: stats.l2.entries,
    },
    overall: {
      hitRate: `${(stats.overall.hitRate * 100).toFixed(2)}%`,
      avgResponseTime: `${stats.overall.avgResponseTime.toFixed(2)} ms`,
    },
  })
}

// ============================================
// Example 5: Cache Warmup
// ============================================

async function example5_cacheWarmup() {
  const cache = getQueryCache()

  const warmupConfig: WarmupConfig = {
    queries: [
      {
        key: QueryCacheKeys.agentStats(),
        query: async () => {
          const db = await getDatabaseAsync()
          const stmt = db.prepare(`
            SELECT status, COUNT(*) as count
            FROM agents
            GROUP BY status
          `)
          return stmt.all()
        },
        priority: 10, // High priority
      },
      {
        key: QueryCacheKeys.agentsList({ status: 'active' }),
        query: async () => {
          const db = await getDatabaseAsync()
          const stmt = db.prepare(`
            SELECT * FROM agents
            WHERE status = ?
            LIMIT 20
          `)
          return stmt.all('active')
        },
        priority: 8,
      },
      {
        key: QueryCacheKeys.agentsList({ status: 'inactive' }),
        query: async () => {
          const db = await getDatabaseAsync()
          const stmt = db.prepare(`
            SELECT * FROM agents
            WHERE status = ?
            LIMIT 20
          `)
          return stmt.all('inactive')
        },
        priority: 5,
      },
    ],
    batchSize: 10,
    concurrency: 5,
  }

  await cache.warmup(warmupConfig)
}

// ============================================
// Example 6: Custom Cache Keys
// ============================================

async function example6_customKeys() {
  const cache = getQueryCache()

  // Custom cache key with parameters
  const key = QueryCacheKeys.custom('search', {
    query: 'test',
    filters: { status: 'active' },
    limit: 10,
  })

  const results = await cache.getOrSet(
    key,
    async () => {
      const db = await getDatabaseAsync()
      const stmt = db.prepare(`
        SELECT * FROM agents
        WHERE name LIKE ?
        AND status = ?
        LIMIT ?
      `)
      return stmt.all('%test%', 'active', 10)
    },
    2 * 60 * 1000 // 2 minutes TTL
  )

  console.log('Search results:', results)
}

// ============================================
// Example 7: Manual Cache Management
// ============================================

async function example7_manualManagement() {
  const cache = getQueryCache()

  // Manually set cache
  await cache.set('manual:key', { data: 'cached' }, 60 * 1000)

  // Manually get cache
  const value = await cache.get('manual:key')
  console.log('Cached value:', value)

  // Manually delete cache
  await cache.delete('manual:key')

  // Clear all cache
  await cache.clear()

  // Clean expired entries
  const cleaned = await cache.cleanExpired()
  console.log('Cleaned entries:', cleaned)
}

// ============================================
// Example 8: Advanced Configuration
// ============================================

async function example8_advancedConfig() {
  // Create cache with custom configuration
  const cache = getQueryCache({
    l1MaxSize: 2000,
    l1DefaultTTL: 10 * 60 * 1000, // 10 minutes
    l1MaxMemoryMB: 100,
    l2Enabled: true,
    l2DefaultTTL: 30 * 60 * 1000, // 30 minutes
    l2KeyPrefix: 'myapp:db:query',
    enableMonitoring: true,
    monitoringInterval: 30 * 1000, // 30 seconds
    warmupEnabled: true,
    warmupOnStartup: true,
  })

  // Use the cache
  const stats = cache.getStats()
  console.log('Cache stats:', stats)
}

// ============================================
// Example 9: Error Handling
// ============================================

async function example9_errorHandling() {
  const cache = getQueryCache()

  try {
    const result = await cache.getOrSet(
      'test:key',
      async () => {
        // This might throw an error
        throw new Error('Database error')
      }
    )
  } catch (error) {
    console.error('Query failed:', error)

    // Cache is not updated on error
    const cached = await cache.get('test:key')
    console.log('Cached value (should be null):', cached)
  }
}

// ============================================
// Example 10: Performance Comparison
// ============================================

async function example10_performanceComparison() {
  const cache = getQueryCache()

  // Without cache
  const start1 = Date.now()
  for (let i = 0; i < 100; i++) {
    const db = await getDatabaseAsync()
    const stmt = db.prepare('SELECT * FROM agents LIMIT 10')
    stmt.all()
  }
  const timeWithoutCache = Date.now() - start1

  // With cache
  const start2 = Date.now()
  for (let i = 0; i < 100; i++) {
    await cache.getOrSet(
      'agents:all',
      async () => {
        const db = await getDatabaseAsync()
        const stmt = db.prepare('SELECT * FROM agents LIMIT 10')
        return stmt.all()
      }
    )
  }
  const timeWithCache = Date.now() - start2

  console.log('Performance comparison:', {
    withoutCache: `${timeWithoutCache} ms`,
    withCache: `${timeWithCache} ms`,
    improvement: `${((timeWithoutCache - timeWithCache) / timeWithoutCache * 100).toFixed(2)}%`,
  })
}

// ============================================
// Export Examples
// ============================================

export {
  example1_basicUsage,
  example2_decoratorUsage,
  example3_cacheInvalidation,
  example4_cacheStatistics,
  example5_cacheWarmup,
  example6_customKeys,
  example7_manualManagement,
  example8_advancedConfig,
  example9_errorHandling,
  example10_performanceComparison,
  AgentService,
}