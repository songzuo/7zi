/**
 * Database Query Cache Configuration
 *
 * Centralized configuration for the query cache layer
 */

import type { QueryCacheConfig, WarmupConfig, CacheInvalidationRule } from './query-cache-layer'

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_QUERY_CACHE_CONFIG: QueryCacheConfig = {
  // L1 (Memory) Configuration
  l1MaxSize: 1000,
  l1DefaultTTL: 5 * 60 * 1000, // 5 minutes
  l1MaxMemoryMB: 50,

  // L2 (Redis) Configuration
  l2Enabled: process.env.REDIS_URL !== undefined || process.env.REDIS_HOST !== undefined,
  l2DefaultTTL: 10 * 60 * 1000, // 10 minutes
  l2KeyPrefix: 'db:query',

  // Monitoring Configuration
  enableMonitoring: process.env.NODE_ENV === 'production',
  monitoringInterval: 60 * 1000, // 1 minute

  // Warmup Configuration
  warmupEnabled: process.env.QUERY_CACHE_WARMUP_ENABLED !== 'false',
  warmupOnStartup: process.env.QUERY_CACHE_WARMUP_ON_STARTUP === 'true',
}

// ============================================
// Environment-based Configuration
// ============================================

export function getQueryCacheConfig(): QueryCacheConfig {
  const env = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test' | 'staging'

  const baseConfig = { ...DEFAULT_QUERY_CACHE_CONFIG }

  // Environment-specific overrides
  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        l1MaxSize: 2000,
        l1DefaultTTL: 10 * 60 * 1000, // 10 minutes
        l1MaxMemoryMB: 100,
        l2DefaultTTL: 30 * 60 * 1000, // 30 minutes
        enableMonitoring: true,
      }

    case 'staging':
      return {
        ...baseConfig,
        l1MaxSize: 1500,
        l1DefaultTTL: 8 * 60 * 1000, // 8 minutes
        l1MaxMemoryMB: 75,
        l2DefaultTTL: 20 * 60 * 1000, // 20 minutes
        enableMonitoring: true,
      }

    case 'development':
    default:
      return {
        ...baseConfig,
        l1MaxSize: 500,
        l1DefaultTTL: 2 * 60 * 1000, // 2 minutes
        l1MaxMemoryMB: 25,
        l2Enabled: false, // Disable Redis in development by default
        enableMonitoring: false,
      }
  }
}

// ============================================
// Cache Invalidation Rules
// ============================================

export const CACHE_INVALIDATION_RULES: CacheInvalidationRule[] = [
  // Agent-related caches
  {
    pattern: 'agent:*',
    tables: ['agents'],
  },
  {
    pattern: 'agents:list:*',
    tables: ['agents'],
  },
  {
    pattern: 'stats:agents',
    tables: ['agents'],
  },

  // Wallet-related caches
  {
    pattern: 'wallet:*',
    tables: ['wallets', 'wallet_balances'],
  },
  {
    pattern: 'wallet:transactions:*',
    tables: ['transactions', 'wallet_transactions'],
  },

  // Approval-related caches
  {
    pattern: 'approval:*',
    tables: ['approvals', 'approval_requests'],
  },
  {
    pattern: 'approvals:list:*',
    tables: ['approvals', 'approval_requests'],
  },

  // User-related caches
  {
    pattern: 'user:*',
    tables: ['users', 'user_profiles'],
  },

  // Workflow-related caches
  {
    pattern: 'workflow:*',
    tables: ['workflows', 'workflow_executions', 'workflow_nodes'],
  },

  // Room-related caches
  {
    pattern: 'room:*',
    tables: ['rooms', 'room_participants', 'room_messages'],
  },
]

// ============================================
// Warmup Configuration
// ============================================

export const DEFAULT_WARMUP_CONFIG: WarmupConfig = {
  queries: [],
  batchSize: 10,
  concurrency: 5,
}

export async function getWarmupConfig(): Promise<WarmupConfig> {
  const { getDatabaseAsync } = await import('./connection')

  return {
    queries: [
      // High priority - frequently accessed
      {
        key: 'stats:agents',
        query: async () => {
          const database = await getDatabaseAsync()
          const stmt = database.prepare(`
            SELECT status, COUNT(*) as count
            FROM agents
            GROUP BY status
          `)
          return stmt.all()
        },
        priority: 10,
      },
      {
        key: 'stats:users',
        query: async () => {
          const database = await getDatabaseAsync()
          const stmt = database.prepare(`
            SELECT role, COUNT(*) as count
            FROM users
            GROUP BY role
          `)
          return stmt.all()
        },
        priority: 10,
      },
      {
        key: 'stats:workflows',
        query: async () => {
          const database = await getDatabaseAsync()
          const stmt = database.prepare(`
            SELECT status, COUNT(*) as count
            FROM workflows
            GROUP BY status
          `)
          return stmt.all()
        },
        priority: 10,
      },

      // Medium priority - active data
      {
        key: 'agents:list:active',
        query: async () => {
          const database = await getDatabaseAsync()
          const stmt = database.prepare(`
            SELECT * FROM agents
            WHERE status = 'active'
            ORDER BY created_at DESC
            LIMIT 20
          `)
          return stmt.all()
        },
        priority: 8,
      },
      {
        key: 'workflows:list:active',
        query: async () => {
          const database = await getDatabaseAsync()
          const stmt = database.prepare(`
            SELECT * FROM workflows
            WHERE status = 'active'
            ORDER BY updated_at DESC
            LIMIT 20
          `)
          return stmt.all()
        },
        priority: 8,
      },

      // Lower priority - reference data
      {
        key: 'agents:list:all-statuses',
        query: async () => {
          const database = await getDatabaseAsync()
          const stmt = database.prepare(`
            SELECT DISTINCT status FROM agents
          `)
          return stmt.all()
        },
        priority: 5,
      },
    ],
    batchSize: parseInt(process.env.QUERY_CACHE_WARMUP_BATCH_SIZE || '10', 10),
    concurrency: parseInt(process.env.QUERY_CACHE_WARMUP_CONCURRENCY || '5', 10),
  }
}

// ============================================
// TTL Presets
// ============================================

export const TTL_PRESETS = {
  SHORT: 60 * 1000, // 1 minute
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 15 * 60 * 1000, // 15 minutes
  VERY_LONG: 60 * 60 * 1000, // 1 hour

  // Specific use cases
  FREQUENTLY_ACCESSED: 2 * 60 * 1000, // 2 minutes
  RARELY_CHANGED: 30 * 60 * 1000, // 30 minutes
  REFERENCE_DATA: 60 * 60 * 1000, // 1 hour
  USER_SESSION: 24 * 60 * 60 * 1000, // 24 hours
}

// ============================================
// Export
// ============================================

export default {
  DEFAULT_QUERY_CACHE_CONFIG,
  getQueryCacheConfig,
  CACHE_INVALIDATION_RULES,
  DEFAULT_WARMUP_CONFIG,
  getWarmupConfig,
  TTL_PRESETS,
}
