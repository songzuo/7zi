/**
 * Database Performance Logger
 * Logs performance metrics for database queries
 */

import { DatabaseConnection } from '@/lib/db'
import { logger } from '../logger'

export interface QueryMetrics {
  query: string
  timestamp: number
  duration: number
  success: boolean
  error?: string
  rowCount?: number
  paramsCount?: number
}

// Store query metrics in memory
const queryMetrics: QueryMetrics[] = []
const MAX_METRICS = 2000

/**
 * Add query metric
 */
function addQueryMetric(metric: QueryMetrics) {
  queryMetrics.push(metric)

  // Limit store size
  if (queryMetrics.length > MAX_METRICS) {
    queryMetrics.shift()
  }
}

/**
 * Get all query metrics
 */
export function getQueryMetrics(): QueryMetrics[] {
  return [...queryMetrics]
}

/**
 * Get query metrics summary
 */
export function getQueryMetricsSummary() {
  const summary = {
    total: queryMetrics.length,
    avgDuration: 0,
    minDuration: Infinity,
    maxDuration: 0,
    successRate: 0,
    slowQueries: [] as QueryMetrics[],
    errorQueries: [] as QueryMetrics[],
    byOperation: {} as Record<string, { count: number; avgDuration: number; errorRate: number }>,
    recentErrors: [] as QueryMetrics[],
  }

  if (queryMetrics.length === 0) {
    return summary
  }

  let totalDuration = 0
  let successCount = 0

  queryMetrics.forEach(metric => {
    totalDuration += metric.duration
    summary.minDuration = Math.min(summary.minDuration, metric.duration)
    summary.maxDuration = Math.max(summary.maxDuration, metric.duration)
    if (metric.success) successCount++

    // Track slow queries (> 100ms)
    if (metric.duration > 100) {
      summary.slowQueries.push(metric)
    }

    // Track error queries
    if (!metric.success) {
      summary.errorQueries.push(metric)
    }

    // Extract operation type (SELECT, INSERT, UPDATE, DELETE, etc.)
    const operation = metric.query.trim().split(/\s+/)[0].toUpperCase()
    if (!summary.byOperation[operation]) {
      summary.byOperation[operation] = { count: 0, avgDuration: 0, errorRate: 0 }
    }
    summary.byOperation[operation].count++
    summary.byOperation[operation].avgDuration += metric.duration
    if (!metric.success) summary.byOperation[operation].errorRate++
  })

  summary.avgDuration = totalDuration / queryMetrics.length
  summary.successRate = (successCount / queryMetrics.length) * 100

  // Calculate averages and error rates per operation
  Object.entries(summary.byOperation).forEach(([op, data]) => {
    summary.byOperation[op].avgDuration = data.avgDuration / data.count
    summary.byOperation[op].errorRate = (data.errorRate / data.count) * 100
  })

  // Sort slow queries by duration
  summary.slowQueries.sort((a, b) => b.duration - a.duration)
  summary.slowQueries = summary.slowQueries.slice(0, 20) // Top 20

  // Sort error queries by timestamp (most recent)
  summary.errorQueries.sort((a, b) => b.timestamp - a.timestamp)
  summary.errorQueries = summary.errorQueries.slice(0, 20) // Top 20

  return summary
}

/**
 * Clear query metrics
 */
export function clearQueryMetrics() {
  queryMetrics.length = 0
}

/**
 * Get recent query metrics (last N minutes)
 */
export function getRecentQueryMetrics(minutes: number = 5): QueryMetrics[] {
  const cutoff = Date.now() - minutes * 60 * 1000
  return queryMetrics.filter(m => m.timestamp > cutoff)
}

/**
 * Wrap database connection with performance logging
 */
export function withPerformanceLogging(db: DatabaseConnection): DatabaseConnection {
  return {
    query: (sql: string, params?: unknown[]) => {
      const startTime = performance.now()
      const sanitizedSql = sanitizeQuery(sql)
      const paramsCount = params?.length || 0

      try {
        const result = db.query(sql, params)
        const duration = performance.now() - startTime

        // Record metric
        addQueryMetric({
          query: sanitizedSql,
          timestamp: Date.now(),
          duration,
          success: true,
          rowCount: Array.isArray(result) ? result.length : undefined,
          paramsCount,
        })

        // Log slow queries
        if (duration > 100) {
          logger.warn(`Slow query (${duration.toFixed(0)}ms): ${sanitizedSql.substring(0, 100)}`, {
            category: 'db',
            duration,
            sql: sanitizedSql.substring(0, 100),
          })
        }

        return result
      } catch (error) {
        const duration = performance.now() - startTime

        // Record error metric
        addQueryMetric({
          query: sanitizedSql,
          timestamp: Date.now(),
          duration,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          paramsCount,
        })

        logger.error(
          `Query failed (${duration.toFixed(0)}ms): ${sanitizedSql.substring(0, 100)}`,
          error,
          { category: 'db', duration, sql: sanitizedSql.substring(0, 100) }
        )

        throw error
      }
    },

    queryRows: (sql: string, params?: unknown[]) => {
      const startTime = performance.now()
      const sanitizedSql = sanitizeQuery(sql)
      const paramsCount = params?.length || 0

      try {
        const result = db.queryRows(sql, params)
        const duration = performance.now() - startTime

        // Record metric
        addQueryMetric({
          query: sanitizedSql,
          timestamp: Date.now(),
          duration,
          success: true,
          rowCount: Array.isArray(result) ? result.length : 0,
          paramsCount,
        })

        // Log slow queries
        if (duration > 100) {
          logger.warn(
            `Slow queryRows (${duration.toFixed(0)}ms): ${sanitizedSql.substring(0, 100)}`,
            { category: 'db', duration, sql: sanitizedSql.substring(0, 100) }
          )
        }

        return result
      } catch (error) {
        const duration = performance.now() - startTime

        // Record error metric
        addQueryMetric({
          query: sanitizedSql,
          timestamp: Date.now(),
          duration,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          paramsCount,
        })

        logger.error(
          `queryRows failed (${duration.toFixed(0)}ms): ${sanitizedSql.substring(0, 100)}`,
          error,
          { category: 'db', duration, sql: sanitizedSql.substring(0, 100) }
        )

        throw error
      }
    },

    exec: (sql: string, params?: unknown[]) => {
      const startTime = performance.now()
      const sanitizedSql = sanitizeQuery(sql)
      const paramsCount = params?.length || 0

      try {
        const result = db.exec(sql, params)
        const duration = performance.now() - startTime

        addQueryMetric({
          query: sanitizedSql,
          timestamp: Date.now(),
          duration,
          success: true,
          rowCount: result.changes,
          paramsCount,
        })

        if (duration > 100) {
          logger.warn(`Slow exec (${duration.toFixed(0)}ms): ${sanitizedSql.substring(0, 100)}`, {
            category: 'db',
            duration,
            sql: sanitizedSql.substring(0, 100),
          })
        }

        return result
      } catch (error) {
        const duration = performance.now() - startTime

        addQueryMetric({
          query: sanitizedSql,
          timestamp: Date.now(),
          duration,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          paramsCount,
        })

        logger.error(
          `Exec failed (${duration.toFixed(0)}ms): ${sanitizedSql.substring(0, 100)}`,
          error,
          { category: 'db', duration, sql: sanitizedSql.substring(0, 100) }
        )

        throw error
      }
    },

    prepare: (sql: string) => {
      const sanitizedSql = sanitizeQuery(sql)
      const statement = db.prepare(sql)

      return {
        run: (...params: unknown[]) => {
          const startTime = performance.now()
          const paramsCount = params?.length || 0

          try {
            const result = statement.run(...params)
            const duration = performance.now() - startTime

            addQueryMetric({
              query: sanitizedSql,
              timestamp: Date.now(),
              duration,
              success: true,
              rowCount: result.changes,
              paramsCount,
            })

            if (duration > 100) {
              logger.warn(
                `Slow prepared.run (${duration.toFixed(0)}ms): ${sanitizedSql.substring(0, 100)}`,
                { category: 'db', duration, sql: sanitizedSql.substring(0, 100) }
              )
            }

            return result
          } catch (error) {
            const duration = performance.now() - startTime

            addQueryMetric({
              query: sanitizedSql,
              timestamp: Date.now(),
              duration,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              paramsCount,
            })

            throw error
          }
        },

        get: (...params: unknown[]) => {
          const startTime = performance.now()
          const paramsCount = params?.length || 0

          try {
            const result = statement.get(...params)
            const duration = performance.now() - startTime

            addQueryMetric({
              query: sanitizedSql,
              timestamp: Date.now(),
              duration,
              success: true,
              rowCount: result ? 1 : 0,
              paramsCount,
            })

            return result
          } catch (error) {
            const duration = performance.now() - startTime

            addQueryMetric({
              query: sanitizedSql,
              timestamp: Date.now(),
              duration,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              paramsCount,
            })

            throw error
          }
        },

        all: (...params: unknown[]) => {
          const startTime = performance.now()
          const paramsCount = params?.length || 0

          try {
            const result = statement.all(...params)
            const duration = performance.now() - startTime

            addQueryMetric({
              query: sanitizedSql,
              timestamp: Date.now(),
              duration,
              success: true,
              rowCount: Array.isArray(result) ? result.length : 0,
              paramsCount,
            })

            if (duration > 100) {
              logger.warn(
                `Slow prepared.all (${duration.toFixed(0)}ms): ${sanitizedSql.substring(0, 100)}`,
                { category: 'db', duration, sql: sanitizedSql.substring(0, 100) }
              )
            }

            return result
          } catch (error) {
            const duration = performance.now() - startTime

            addQueryMetric({
              query: sanitizedSql,
              timestamp: Date.now(),
              duration,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              paramsCount,
            })

            throw error
          }
        },
      }
    },

    batch: (statements: Array<{ sql: string; params?: unknown[] }>) => {
      const startTime = performance.now()

      try {
        const results = db.batch(statements)
        const duration = performance.now() - startTime

        addQueryMetric({
          query: `BATCH (${statements.length} statements)`,
          timestamp: Date.now(),
          duration,
          success: true,
        })

        if (duration > 100) {
          logger.warn(`Slow batch (${duration.toFixed(0)}ms): ${statements.length} statements`, {
            category: 'db',
            duration,
            statementCount: statements.length,
          })
        }

        return results
      } catch (error) {
        const duration = performance.now() - startTime

        addQueryMetric({
          query: `BATCH (${statements.length} statements)`,
          timestamp: Date.now(),
          duration,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })

        throw error
      }
    },

    getConnection: db.getConnection,

    pragma: (name: string, options?: { simple: boolean }) => {
      return db.pragma(name, options)
    },
  }
}

/**
 * Sanitize query for logging (remove sensitive data)
 */
function sanitizeQuery(sql: string): string {
  // Remove string literals
  let sanitized = sql.replace(/'[^']*'/g, '?')
  // Remove numbers
  sanitized = sanitized.replace(/\b\d+\b/g, '?')
  // Remove extra whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim()
  return sanitized
}

/**
 * Get query performance insights
 */
export function getQueryInsights() {
  const summary = getQueryMetricsSummary()
  const insights: string[] = []

  // Slow queries
  if (summary.slowQueries.length > 0) {
    insights.push(
      `Found ${summary.slowQueries.length} slow queries (>100ms). ` +
        `Average duration: ${summary.avgDuration.toFixed(2)}ms. ` +
        `Max duration: ${summary.maxDuration.toFixed(2)}ms.`
    )
  }

  // Error queries
  if (summary.errorQueries.length > 0) {
    insights.push(
      `Found ${summary.errorQueries.length} failed queries. ` +
        `Error rate: ${(100 - summary.successRate).toFixed(2)}%.`
    )
  }

  // Operation analysis
  const slowOperations = Object.entries(summary.byOperation)
    .filter(([_, data]) => data.avgDuration > 100)
    .map(([op, data]) => `${op} (${data.avgDuration.toFixed(0)}ms)`)

  if (slowOperations.length > 0) {
    insights.push(`Slow operations: ${slowOperations.join(', ')}`)
  }

  // Recommendations
  if (summary.slowQueries.length > 10) {
    insights.push('⚠️ Many slow queries detected. Consider adding indexes or optimizing queries.')
  }

  if (summary.errorQueries.length > 5) {
    insights.push(
      '⚠️ Multiple query failures detected. Check for schema issues or constraint violations.'
    )
  }

  return insights
}

/**
 * Export metrics for external monitoring
 */
export function exportMetrics() {
  return {
    database: getQueryMetricsSummary(),
    timestamp: Date.now(),
  }
}
