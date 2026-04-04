/**
 * Web Vitals Database Module
 *
 * Simple SQLite database for storing and querying Core Web Vitals metrics
 * Uses better-sqlite3 for lightweight, serverless database operations
 */

import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync } from 'fs'
import { logger } from '@/lib/logger'

// ============================================
// Type Definitions
// ============================================

export interface WebVitalMetric {
  id?: number
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  route: string
  deviceType: 'mobile' | 'tablet' | 'desktop'
  userAgent?: string
  sessionId?: string
  timestamp: Date
}

// Database row type
interface WebVitalRow {
  id: number
  name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  route: string
  device_type: 'mobile' | 'tablet' | 'desktop'
  user_agent: string
  session_id: string
  timestamp: number
}

// Route aggregation result row
interface RouteAggregationRow {
  route: string
  count: number
}

export interface WebVitalStats {
  name: string
  rating: string
  count: number
  avgValue: number
  minValue: number
  maxValue: number
  p50: number
  p75: number
  p95: number
}

export interface AggregateStats {
  totalRecords: number
  avgScore: number
  metrics: {
    [key: string]: {
      good: number
      needsImprovement: number
      poor: number
      avgValue: number
    }
  }
  byDevice: {
    mobile: number
    tablet: number
    desktop: number
  }
  byRoute: {
    [route: string]: number
  }
}

// ============================================
// Database Manager
// ============================================

class WebVitalsDatabase {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    this.dbPath = join(process.cwd(), 'data', 'web-vitals.db')
  }

  /**
   * Initialize database connection and create tables
   */
  init() {
    try {
      // Ensure data directory exists
      const dataDir = join(process.cwd(), 'data')
      if (!existsSync(dataDir)) {
        logger.info('[WebVitals DB] Creating data directory')
        // Create directory handled automatically by better-sqlite3
      }

      // Open database
      this.db = new Database(this.dbPath)

      // Create table if not exists
      this.createTable()

      // Create indexes for better query performance
      this.createIndexes()

      logger.info('[WebVitals DB] Database initialized successfully', { path: this.dbPath })
    } catch (error) {
      logger.error(
        '[WebVitals DB] Failed to initialize database:',
        error instanceof Error ? error : new Error(String(error))
      )
      throw error
    }
  }

  /**
   * Create web vitals table
   */
  private createTable() {
    if (!this.db) return

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS web_vitals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value REAL NOT NULL,
        rating TEXT NOT NULL,
        route TEXT NOT NULL,
        device_type TEXT NOT NULL,
        user_agent TEXT,
        session_id TEXT,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `

    this.db.exec(createTableSQL)
  }

  /**
   * Create indexes for better query performance
   */
  private createIndexes() {
    if (!this.db) return

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_name ON web_vitals(name)',
      'CREATE INDEX IF NOT EXISTS idx_route ON web_vitals(route)',
      'CREATE INDEX IF NOT EXISTS idx_timestamp ON web_vitals(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_rating ON web_vitals(rating)',
      'CREATE INDEX IF NOT EXISTS idx_device_type ON web_vitals(device_type)',
      'CREATE INDEX IF NOT EXISTS idx_name_timestamp ON web_vitals(name, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_route_timestamp ON web_vitals(route, timestamp)',
    ]

    indexes.forEach(indexSQL => this.db!.exec(indexSQL))
  }

  /**
   * Insert a single web vital metric
   */
  insert(metric: WebVitalMetric): number {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const insertSQL = `
        INSERT INTO web_vitals (name, value, rating, route, device_type, user_agent, session_id, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `

      const stmt = this.db.prepare(insertSQL)
      const result = stmt.run(
        metric.name,
        metric.value,
        metric.rating,
        metric.route,
        metric.deviceType,
        metric.userAgent || null,
        metric.sessionId || null,
        metric.timestamp.getTime()
      )

      logger.debug('[WebVitals DB] Metric inserted', {
        name: metric.name,
        value: metric.value,
        id: result.lastInsertRowid,
      })

      return result.lastInsertRowid as number
    } catch (error) {
      logger.error(
        '[WebVitals DB] Failed to insert metric:',
        error instanceof Error ? error : new Error(String(error))
      )
      throw error
    }
  }

  /**
   * Insert multiple web vital metrics in a transaction
   */
  insertMany(metrics: WebVitalMetric[]): number {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    if (metrics.length === 0) return 0

    try {
      const insertSQL = `
        INSERT INTO web_vitals (name, value, rating, route, device_type, user_agent, session_id, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `

      const stmt = this.db.prepare(insertSQL)

      const insertMany = this.db.transaction(items => {
        let count = 0
        for (const metric of items) {
          stmt.run(
            metric.name,
            metric.value,
            metric.rating,
            metric.route,
            metric.deviceType,
            metric.userAgent || null,
            metric.sessionId || null,
            metric.timestamp.getTime()
          )
          count++
        }
        return count
      })

      const count = insertMany(metrics)

      logger.info('[WebVitals DB] Bulk insert completed', {
        count,
        metrics: metrics.map(m => m.name),
      })

      return count
    } catch (error) {
      logger.error(
        '[WebVitals DB] Failed to insert many metrics:',
        error instanceof Error ? error : new Error(String(error))
      )
      throw error
    }
  }

  /**
   * Query web vitals with filters
   */
  query(
    options: {
      name?: string
      route?: string
      rating?: string
      deviceType?: string
      startTime?: Date
      endTime?: Date
      limit?: number
      offset?: number
    } = {}
  ): WebVitalMetric[] {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const conditions: string[] = []
      const params: unknown[] = []

      if (options.name) {
        conditions.push('name = ?')
        params.push(options.name)
      }

      if (options.route) {
        conditions.push('route = ?')
        params.push(options.route)
      }

      if (options.rating) {
        conditions.push('rating = ?')
        params.push(options.rating)
      }

      if (options.deviceType) {
        conditions.push('device_type = ?')
        params.push(options.deviceType)
      }

      if (options.startTime) {
        conditions.push('timestamp >= ?')
        params.push(options.startTime.getTime())
      }

      if (options.endTime) {
        conditions.push('timestamp <= ?')
        params.push(options.endTime.getTime())
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const limitClause = options.limit ? `LIMIT ${options.limit}` : ''
      const offsetClause = options.offset ? `OFFSET ${options.offset}` : ''

      const querySQL = `
        SELECT id, name, value, rating, route, device_type, user_agent, session_id, timestamp
        FROM web_vitals
        ${whereClause}
        ORDER BY timestamp DESC
        ${limitClause}
        ${offsetClause}
      `

      const stmt = this.db.prepare(querySQL)
      const rows = stmt.all(...params) as WebVitalRow[]

      return rows.map(row => ({
        id: row.id,
        name: row.name,
        value: row.value,
        rating: row.rating,
        route: row.route,
        deviceType: row.device_type,
        userAgent: row.user_agent,
        sessionId: row.session_id,
        timestamp: new Date(row.timestamp),
      }))
    } catch (error) {
      logger.error(
        '[WebVitals DB] Failed to query metrics:',
        error instanceof Error ? error : new Error(String(error))
      )
      throw error
    }
  }

  /**
   * Get statistics for web vitals
   */
  getStats(
    options: {
      route?: string
      hours?: number
    } = {}
  ): AggregateStats {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const startTime = options.hours
        ? new Date(Date.now() - options.hours * 60 * 60 * 1000)
        : new Date(0)

      const routeFilter = options.route ? 'AND route = ?' : ''

      // Total records
      const totalSQL = `
        SELECT COUNT(*) as count
        FROM web_vitals
        WHERE timestamp >= ? ${routeFilter}
      `
      const totalParams: Array<number | string> = [startTime.getTime()]
      if (options.route) totalParams.push(options.route)

      const totalResult = this.db!.prepare(totalSQL).get(...totalParams) as { count: number }

      // Metrics by name and rating
      const metricsSQL = `
        SELECT
          name,
          rating,
          COUNT(*) as count,
          AVG(value) as avg_value
        FROM web_vitals
        WHERE timestamp >= ? ${routeFilter}
        GROUP BY name, rating
      `

      const metricsResult = this.db!.prepare(metricsSQL).all(...totalParams) as Array<{
        name: string
        rating: 'good' | 'needs-improvement' | 'poor'
        count: number
        avg_value: number
      }>

      const metrics: AggregateStats['metrics'] = {}
      for (const row of metricsResult) {
        if (!metrics[row.name]) {
          metrics[row.name] = {
            good: 0,
            needsImprovement: 0,
            poor: 0,
            avgValue: 0,
          }
        }
        const ratingKey = row.rating === 'needs-improvement' ? 'needsImprovement' : row.rating
        metrics[row.name][ratingKey] = row.count
        metrics[row.name].avgValue = row.avg_value
      }

      // By device type
      const deviceSQL = `
        SELECT
          device_type,
          COUNT(*) as count
        FROM web_vitals
        WHERE timestamp >= ? ${routeFilter}
        GROUP BY device_type
      `

      const deviceResult = this.db!.prepare(deviceSQL).all(...totalParams) as Array<{
        device_type: 'mobile' | 'tablet' | 'desktop'
        count: number
      }>

      const byDevice: AggregateStats['byDevice'] = {
        mobile: 0,
        tablet: 0,
        desktop: 0,
      }

      for (const row of deviceResult) {
        byDevice[row.device_type] = row.count
      }

      // By route
      const routeSQL = `
        SELECT
          route,
          COUNT(*) as count
        FROM web_vitals
        WHERE timestamp >= ? ${routeFilter}
        GROUP BY route
        ORDER BY count DESC
        LIMIT 10
      `

      const routeParams: Array<number | string> = [startTime.getTime()]
      if (options.route) routeParams.push(options.route)

      const routeResult = this.db!.prepare(routeSQL).all(...routeParams) as RouteAggregationRow[]

      const byRoute: AggregateStats['byRoute'] = {}
      for (const row of routeResult) {
        byRoute[row.route] = row.count
      }

      // Calculate average score
      let totalScore = 0
      let scoreCount = 0

      for (const name of Object.keys(metrics)) {
        const metric = metrics[name]
        const totalCount = metric.good + metric.needsImprovement + metric.poor

        if (totalCount > 0) {
          const score = (metric.good * 100 + metric.needsImprovement * 50) / totalCount
          totalScore += score
          scoreCount++
        }
      }

      const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0

      return {
        totalRecords: totalResult.count,
        avgScore,
        metrics,
        byDevice,
        byRoute,
      }
    } catch (error) {
      logger.error(
        '[WebVitals DB] Failed to get stats:',
        error instanceof Error ? error : new Error(String(error))
      )
      throw error
    }
  }

  /**
   * Get percentile statistics for a specific metric
   */
  getPercentiles(
    name: string,
    options: {
      route?: string
      hours?: number
    } = {}
  ): { p50: number; p75: number; p95: number } {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const startTime = options.hours
        ? new Date(Date.now() - options.hours * 60 * 60 * 1000)
        : new Date(0)

      const routeFilter = options.route ? 'AND route = ?' : ''
      const params = [name, startTime.getTime()]
      if (options.route) params.push(options.route)

      const sql = `
        SELECT value
        FROM web_vitals
        WHERE name = ? AND timestamp >= ? ${routeFilter}
        ORDER BY value ASC
      `

      const stmt = this.db!.prepare(sql)
      const rows = stmt.all(...params) as { value: number }[]

      if (rows.length === 0) {
        return { p50: 0, p75: 0, p95: 0 }
      }

      const values = rows.map(r => r.value)

      const getPercentile = (p: number): number => {
        const index = Math.ceil((values.length * p) / 100) - 1
        return values[Math.max(0, index)]
      }

      return {
        p50: getPercentile(50),
        p75: getPercentile(75),
        p95: getPercentile(95),
      }
    } catch (error) {
      logger.error(
        '[WebVitals DB] Failed to get percentiles:',
        error instanceof Error ? error : new Error(String(error))
      )
      throw error
    }
  }

  /**
   * Clean up old records (e.g., older than 90 days)
   */
  cleanup(daysOld: number = 90): number {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000

      const sql = 'DELETE FROM web_vitals WHERE timestamp < ?'
      const stmt = this.db.prepare(sql)
      const result = stmt.run(cutoffTime)

      logger.info('[WebVitals DB] Cleanup completed', {
        deleted: result.changes,
        daysOld,
      })

      return result.changes
    } catch (error) {
      logger.error(
        '[WebVitals DB] Failed to cleanup:',
        error instanceof Error ? error : new Error(String(error))
      )
      throw error
    }
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close()
      this.db = null
      logger.info('[WebVitals DB] Database connection closed')
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let dbInstance: WebVitalsDatabase | null = null

/**
 * Get or create the database instance
 */
export function getWebVitalsDB(): WebVitalsDatabase {
  if (!dbInstance) {
    dbInstance = new WebVitalsDatabase()
    dbInstance.init()
  }
  return dbInstance
}

/**
 * Close the database connection (cleanup)
 */
export function closeWebVitalsDB() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

export default WebVitalsDatabase
