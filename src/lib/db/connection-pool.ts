/**
 * Enhanced Database Connection Pool Manager
 * 数据库连接池管理器 - 增强版
 *
 * Features:
 * - Real connection pooling with configurable size
 * - Connection health checks
 * - Connection timeout handling
 * - Automatic connection recovery
 * - Pool statistics and monitoring
 * - Load balancing across connections
 */

import Database from 'better-sqlite3'
import { logger } from '../logger'

export interface PoolConfig {
  /** Database path */
  databasePath: string
  /** Maximum number of connections in pool (default: 10) */
  maxConnections: number
  /** Minimum number of connections to maintain (default: 2) */
  minConnections: number
  /** Connection timeout in milliseconds (default: 30000) */
  connectionTimeout: number
  /** Idle connection timeout in milliseconds (default: 300000 = 5 minutes) */
  idleTimeout: number
  /** Health check interval in milliseconds (default: 60000 = 1 minute) */
  healthCheckInterval: number
  /** Maximum connection age in milliseconds (default: 3600000 = 1 hour) */
  maxConnectionAge: number
  /** Whether to enable WAL mode (default: true) */
  enableWAL: boolean
  /** Whether to initialize synchronously (for testing) */
  initializeSync?: boolean
}

export interface PooledConnection {
  /** Connection ID */
  id: string
  /** Database instance */
  db: Database.Database
  /** Last used timestamp */
  lastUsedAt: number
  /** Created at timestamp */
  createdAt: number
  /** Whether connection is currently in use */
  inUse: boolean
  /** Health status */
  healthy: boolean
}

export interface PoolStats {
  totalConnections: number
  activeConnections: number
  idleConnections: number
  waitingRequests: number
  totalAcquires: number
  totalReleases: number
  totalErrors: number
  avgAcquireTime: number
}

export interface HealthCheckResult {
  healthy: boolean
  connections: number
  active: number
  idle: number
  unhealthy: number
  errors: string[]
}

/**
 * Connection Pool Manager Class
 */
class ConnectionPoolManager {
  private connections: Map<string, PooledConnection> = new Map()
  private config: PoolConfig
  private stats: PoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    totalAcquires: 0,
    totalReleases: 0,
    totalErrors: 0,
    avgAcquireTime: 0,
  }
  private healthCheckInterval: NodeJS.Timeout | null = null
  private cleanupInterval: NodeJS.Timeout | null = null
  private acquireTimes: number[] = []
  private maxAcquireTimes = 100

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      databasePath: process.env.DATABASE_PATH || '/tmp/7zi-database.sqlite',
      maxConnections: 10,
      minConnections: 2,
      connectionTimeout: 30000,
      idleTimeout: 300000,
      healthCheckInterval: 60000,
      maxConnectionAge: 3600000,
      enableWAL: true,
      ...config,
    }

    // Start background tasks
    this.startHealthChecks()
    this.startCleanup()

    // Initialize minimum connections
    if (this.config.minConnections > 0) {
      this.initializeMinConnectionsSync()
    }

    logger.info('Connection Pool Manager initialized', {
      category: 'db',
      config: this.config,
    })
  }

  /**
   * Initialize minimum connections synchronously
   */
  private initializeMinConnectionsSync(): void {
    const connectionsNeeded = this.config.minConnections
    for (let i = 0; i < connectionsNeeded; i++) {
      const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      try {
        const db = new Database(this.config.databasePath)

        // Apply performance optimizations
        if (this.config.enableWAL) {
          db.pragma('journal_mode = WAL')
        }
        db.pragma('synchronous = NORMAL')
        db.pragma('cache_size = -64000')
        db.pragma('temp_store = MEMORY')
        db.pragma('mmap_size = 30000000000')

        // Set connection timeout
        db.pragma(`busy_timeout = ${this.config.connectionTimeout}`)

        const connection: PooledConnection = {
          id,
          db,
          lastUsedAt: Date.now(),
          createdAt: Date.now(),
          inUse: false,
          healthy: true,
        }

        this.connections.set(id, connection)
        this.stats.totalConnections++
        this.updateStats()

        logger.debug(`Created initial connection ${id}`, {
          category: 'db',
          total: this.connections.size,
        })
      } catch (error) {
        logger.error(`Failed to create initial connection ${i + 1}/${connectionsNeeded}`, error, {
          category: 'db',
        })
        throw error
      }
    }
  }

  /**
   * Initialize minimum connections (deprecated - use sync version)
   */
  private async initializeMinConnections(): Promise<void> {
    const connectionsNeeded = this.config.minConnections
    for (let i = 0; i < connectionsNeeded; i++) {
      try {
        await this.createConnection()
      } catch (error) {
        logger.error(`Failed to create initial connection ${i + 1}/${connectionsNeeded}`, error, {
          category: 'db',
        })
        throw error
      }
    }
  }

  /**
   * Get a connection from the pool
   */
  async acquire(): Promise<PooledConnection> {
    const startTime = Date.now()

    // Try to get an idle connection
    let connection = this.getIdleConnection()

    // If no idle connection and we can create more, create one
    if (!connection && this.connections.size < this.config.maxConnections) {
      connection = await this.createConnection()
    }

    // If still no connection, wait for one to become available
    if (!connection) {
      this.stats.waitingRequests++
      await this.waitForConnection()
      connection = this.getIdleConnection()
      this.stats.waitingRequests--
    }

    if (!connection) {
      throw new Error('Failed to acquire database connection from pool')
    }

    // Mark as in use
    connection.inUse = true
    connection.lastUsedAt = Date.now()

    this.stats.totalAcquires++
    this.updateStats()

    // Track acquire time
    const acquireTime = Date.now() - startTime
    this.trackAcquireTime(acquireTime)

    return connection
  }

  /**
   * Release a connection back to the pool (by db or id)
   */
  release(dbOrId: Database.Database | string): Promise<void> {
    if (typeof dbOrId === 'string') {
      // Release by connection ID
      const connection = this.connections.get(dbOrId)
      if (connection) {
        connection.inUse = false
        connection.lastUsedAt = Date.now()
        this.stats.totalReleases++
        this.updateStats()
        return Promise.resolve()
      }
      logger.warn('Attempted to release unknown connection by id', { category: 'db', id: dbOrId })
      return Promise.resolve()
    }

    // Release by db instance (original behavior)
    for (const [id, connection] of this.connections.entries()) {
      if (connection.db === dbOrId) {
        connection.inUse = false
        connection.lastUsedAt = Date.now()
        this.stats.totalReleases++
        this.updateStats()
        return Promise.resolve()
      }
    }

    logger.warn('Attempted to release unknown connection', { category: 'db' })
    return Promise.resolve()
  }

  /**
   * Get pool statistics (sync and async for compatibility)
   */
  getStats(): PoolStats
  async getStats(): Promise<PoolStats>
  getStats(): PoolStats | Promise<PoolStats> {
    return { ...this.stats }
  }

  /**
   * Get all connections from the pool
   */
  async getAllConnections(): Promise<PooledConnection[]> {
    return Array.from(this.connections.values())
  }

  /**
   * Perform health check on a specific connection
   */
  async checkHealth(connectionId: string): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      healthy: true,
      connections: this.connections.size,
      active: 0,
      idle: 0,
      unhealthy: 0,
      errors: [],
    }

    const connection = this.connections.get(connectionId)

    if (!connection) {
      result.healthy = false
      result.errors.push(`Connection ${connectionId} not found`)
      return result
    }

    try {
      // Perform a simple query to check health
      connection.db.prepare('SELECT 1').get()
      connection.healthy = true

      if (connection.inUse) {
        result.active++
      } else {
        result.idle++
      }
    } catch (error) {
      connection.healthy = false
      result.unhealthy++
      result.healthy = false
      result.errors.push(
        `Connection ${connectionId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }

    return result
  }

  /**
   * Remove unhealthy connections from the pool
   */
  async cleanupUnhealthy(): Promise<void> {
    const toRemove: string[] = []

    for (const [id, connection] of this.connections.entries()) {
      if (!connection.healthy) {
        toRemove.push(id)
      }
    }

    for (const id of toRemove) {
      const connection = this.connections.get(id)
      if (connection) {
        try {
          connection.db.close()
          this.connections.delete(id)
          logger.debug(`Removed unhealthy connection ${id}`, { category: 'db' })
        } catch (error) {
          logger.error(`Error closing connection ${id}`, error, { category: 'db' })
        }
      }
    }

    this.updateStats()
  }

  /**
   * Cleanup idle connections that have exceeded idle timeout
   */
  async cleanupIdle(): Promise<void> {
    const now = Date.now()
    const toRemove: string[] = []

    for (const [id, connection] of this.connections.entries()) {
      // Remove idle connections that have exceeded idle timeout
      if (!connection.inUse && now - connection.lastUsedAt > this.config.idleTimeout) {
        toRemove.push(id)
      }
    }

    // Don't remove connections below minimum
    if (this.connections.size - toRemove.length < this.config.minConnections) {
      logger.debug('Skipping idle cleanup to maintain minimum connections', {
        category: 'db',
        minConnections: this.config.minConnections,
      })
      return
    }

    for (const id of toRemove) {
      const connection = this.connections.get(id)
      if (connection) {
        try {
          connection.db.close()
          this.connections.delete(id)
          logger.debug(`Removed idle connection ${id}`, { category: 'db' })
        } catch (error) {
          logger.error(`Error closing connection ${id}`, error, { category: 'db' })
        }
      }
    }

    this.updateStats()
  }

  /**
   * Cleanup old connections that have exceeded max age
   */
  async cleanupOld(): Promise<void> {
    const now = Date.now()
    const toRemove: string[] = []

    for (const [id, connection] of this.connections.entries()) {
      // Remove connections that have exceeded max age
      if (now - connection.createdAt > this.config.maxConnectionAge) {
        toRemove.push(id)
      }
    }

    // Don't remove connections below minimum
    if (this.connections.size - toRemove.length < this.config.minConnections) {
      logger.debug('Skipping old cleanup to maintain minimum connections', {
        category: 'db',
        minConnections: this.config.minConnections,
      })
      return
    }

    for (const id of toRemove) {
      const connection = this.connections.get(id)
      if (connection) {
        try {
          connection.db.close()
          this.connections.delete(id)
          logger.debug(`Removed old connection ${id}`, { category: 'db' })
        } catch (error) {
          logger.error(`Error closing connection ${id}`, error, { category: 'db' })
        }
      }
    }

    this.updateStats()
  }

  /**
   * Close all connections and shutdown the pool (alias for shutdown)
   */
  async closeAll(): Promise<void> {
    return this.shutdown()
  }

  /**
   * Perform health check on all connections
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      healthy: true,
      connections: this.connections.size,
      active: 0,
      idle: 0,
      unhealthy: 0,
      errors: [],
    }

    for (const [id, connection] of this.connections.entries()) {
      try {
        // Perform a simple query to check health
        connection.db.prepare('SELECT 1').get()
        connection.healthy = true

        if (connection.inUse) {
          result.active++
        } else {
          result.idle++
        }
      } catch (error) {
        connection.healthy = false
        result.unhealthy++
        result.healthy = false
        result.errors.push(
          `Connection ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )

        // Remove unhealthy connections
        this.connections.delete(id)
        this.stats.totalErrors++
      }
    }

    return result
  }

  /**
   * Close all connections and shutdown the pool
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down connection pool', { category: 'db' })

    // Stop background tasks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }

    // Close all connections
    for (const [id, connection] of this.connections.entries()) {
      try {
        connection.db.close()
      } catch (error) {
        logger.error(`Error closing connection ${id}`, error, { category: 'db' })
      }
    }

    this.connections.clear()
    this.stats.totalConnections = 0
    this.updateStats()

    logger.info('Connection pool shutdown complete', { category: 'db' })
  }

  /**
   * Create a new database connection
   */
  private async createConnection(): Promise<PooledConnection> {
    const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      const db = new Database(this.config.databasePath)

      // Apply performance optimizations
      if (this.config.enableWAL) {
        db.pragma('journal_mode = WAL')
      }
      db.pragma('synchronous = NORMAL')
      db.pragma('cache_size = -64000')
      db.pragma('temp_store = MEMORY')
      db.pragma('mmap_size = 30000000000')

      // Set connection timeout
      db.pragma(`busy_timeout = ${this.config.connectionTimeout}`)

      const connection: PooledConnection = {
        id,
        db,
        lastUsedAt: Date.now(),
        createdAt: Date.now(),
        inUse: false,
        healthy: true,
      }

      this.connections.set(id, connection)
      this.stats.totalConnections++
      this.updateStats()

      logger.debug(`Created new connection ${id}`, { category: 'db', total: this.connections.size })

      return connection
    } catch (error) {
      logger.error('Failed to create database connection', error, { category: 'db' })
      throw error
    }
  }

  /**
   * Get an idle connection from the pool
   */
  private getIdleConnection(): PooledConnection | null {
    let oldestIdle: PooledConnection | null = null

    for (const connection of this.connections.values()) {
      if (!connection.inUse && connection.healthy) {
        if (!oldestIdle || connection.lastUsedAt < oldestIdle.lastUsedAt) {
          oldestIdle = connection
        }
      }
    }

    return oldestIdle
  }

  /**
   * Wait for a connection to become available
   */
  private async waitForConnection(): Promise<void> {
    const startTime = Date.now()
    const maxWait = this.config.connectionTimeout

    while (Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 100))

      const idleConnection = this.getIdleConnection()
      if (idleConnection) {
        return
      }
    }

    throw new Error('Connection timeout')
  }

  /**
   * Update pool statistics
   */
  private updateStats(): void {
    let active = 0
    let idle = 0

    for (const connection of this.connections.values()) {
      if (connection.inUse) {
        active++
      } else {
        idle++
      }
    }

    this.stats.totalConnections = this.connections.size
    this.stats.activeConnections = active
    this.stats.idleConnections = idle
  }

  /**
   * Track acquire time for statistics
   */
  private trackAcquireTime(time: number): void {
    this.acquireTimes.push(time)
    if (this.acquireTimes.length > this.maxAcquireTimes) {
      this.acquireTimes.shift()
    }

    const avg = this.acquireTimes.reduce((sum, t) => sum + t, 0) / this.acquireTimes.length
    this.stats.avgAcquireTime = avg
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      const result = await this.performHealthCheck()

      if (!result.healthy) {
        logger.warn('Connection pool health check failed', {
          category: 'db',
          unhealthy: result.unhealthy,
          errors: result.errors,
        })
      }

      // Ensure minimum connections
      const idleCount = result.idle
      if (idleCount < this.config.minConnections) {
        const needed = this.config.minConnections - idleCount
        logger.info(`Creating ${needed} new connections to maintain minimum pool size`, {
          category: 'db',
        })

        for (let i = 0; i < needed; i++) {
          if (this.connections.size < this.config.maxConnections) {
            try {
              await this.createConnection()
            } catch (error) {
              logger.error('Failed to create minimum connection', error, { category: 'db' })
            }
          }
        }
      }
    }, this.config.healthCheckInterval)
  }

  /**
   * Start periodic cleanup of idle and old connections
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      const toRemove: string[] = []

      for (const [id, connection] of this.connections.entries()) {
        // Remove idle connections that have exceeded idle timeout
        if (!connection.inUse && now - connection.lastUsedAt > this.config.idleTimeout) {
          toRemove.push(id)
          continue
        }

        // Remove connections that have exceeded max age
        if (now - connection.createdAt > this.config.maxConnectionAge) {
          toRemove.push(id)
        }
      }

      // Don't remove connections below minimum
      if (this.connections.size - toRemove.length < this.config.minConnections) {
        logger.debug('Skipping cleanup to maintain minimum connections', {
          category: 'db',
          minConnections: this.config.minConnections,
        })
        return
      }

      // Remove old connections
      for (const id of toRemove) {
        const connection = this.connections.get(id)
        if (connection) {
          try {
            connection.db.close()
            this.connections.delete(id)
            logger.debug(`Removed old connection ${id}`, { category: 'db' })
          } catch (error) {
            logger.error(`Error closing connection ${id}`, error, { category: 'db' })
          }
        }
      }

      this.updateStats()
    }, this.config.idleTimeout)
  }
}

// Global pool instance
let poolInstance: ConnectionPoolManager | null = null

/**
 * Get or create the global connection pool instance
 */
export function getConnectionPool(config?: Partial<PoolConfig>): ConnectionPoolManager {
  if (!poolInstance) {
    poolInstance = new ConnectionPoolManager(config)
  }
  return poolInstance
}

/**
 * Reset the global connection pool (for testing)
 */
export function resetConnectionPool(): void {
  if (poolInstance) {
    poolInstance.shutdown()
    poolInstance = null
  }
}

export default ConnectionPoolManager
