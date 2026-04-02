/**
 * N+1 Query Detection and Prevention
 * N+1 查询检测和预防工具
 *
 * Features:
 * - Automatic N+1 query detection
 * - Query pattern analysis
 * - Optimization suggestions
 * - Batch query generation
 * - Eager loading helpers
 */

import { getDatabaseAsync } from './index'
import { logger } from '../logger'

export interface QueryPattern {
  /** Query SQL */
  sql: string
  /** Execution count in a single request */
  count: number
  /** Total execution time */
  totalTime: number
  /** Detected pattern type */
  patternType: 'select' | 'insert' | 'update' | 'delete' | 'unknown'
  /** Table name */
  tableName?: string
  /** Where clause pattern */
  whereClause?: string
  /** Pattern key for grouping */
  patternKey?: string
}

export interface NPlus1Detection {
  /** Whether N+1 detected */
  detected: boolean
  /** Patterns found */
  patterns: QueryPattern[]
  /** Optimization suggestions */
  suggestions: string[]
  /** Severity: low, medium, high */
  severity: 'low' | 'medium' | 'high'
}

export interface BatchQueryOption {
  /** SQL query */
  sql: string
  /** Parameter arrays (one set per query) */
  params: unknown[][]
}

/**
 * N+1 Query Detector Class
 */
class NPlus1Detector {
  private queryHistory: Map<string, QueryPattern> = new Map()
  private currentRequestId: string | null = null
  private requestQueries: Map<string, QueryPattern[]> = new Map()
  private enabled = true

  /**
   * Start tracking a request
   */
  startRequest(requestId: string): void {
    this.currentRequestId = requestId
    this.requestQueries.set(requestId, [])
  }

  /**
   * End tracking a request and analyze
   */
  endRequest(requestId: string): NPlus1Detection {
    const queries = this.requestQueries.get(requestId) || []
    this.requestQueries.delete(requestId)

    return this.analyzeQueries(queries)
  }

  /**
   * Record a query execution
   */
  recordQuery(requestId: string, sql: string, executionTime: number): void {
    if (!this.enabled) {
      return
    }

    let queries = this.requestQueries.get(requestId)
    if (!queries) {
      queries = []
      this.requestQueries.set(requestId, queries)
    }

    // Find or create pattern
    const patternKey = this.getPatternKey(sql)
    const pattern = queries.find(q => q.patternKey === patternKey)

    if (!pattern) {
      const newPattern: QueryPattern = {
        sql: this.sanitizeQuery(sql),
        count: 1,
        totalTime: executionTime,
        patternType: this.detectQueryType(sql),
        tableName: this.extractTableName(sql),
        whereClause: this.extractWhereClause(sql),
        patternKey,
      }

      queries.push(newPattern)
    } else {
      pattern.count++
      pattern.totalTime += executionTime
    }
  }

  /**
   * Enable/disable detection
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Check if detection is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Generate batch query for N+1 optimization
   */
  generateBatchQuery(sql: string, params: unknown[]): BatchQueryOption {
    const queryType = this.detectQueryType(sql)

    if (queryType === 'select' && params.length > 1) {
      // Convert WHERE id = ? to WHERE id IN (?,?,?)
      const inClause = sql.replace(
        /WHERE\s+\w+\s*=\s*\?/i,
        `WHERE id IN (${params.map(() => '?').join(',')})`
      )
      return {
        sql: inClause,
        params: params.map(p => [p]),
      }
    } else if (queryType === 'insert') {
      // Batch insert: INSERT INTO table (a,b) VALUES (?,?),(?,?)
      const valuesClause = params.map(() => '(?,?)').join(',')
      return {
        sql: sql.replace(/VALUES\s*\([^)]+\)/i, `VALUES ${valuesClause}`),
        params: params as unknown[][],
      }
    } else if (queryType === 'update') {
      // Batch update: UPDATE table SET x = ? WHERE id IN (?,?,?)
      const inClause = sql.replace(
        /WHERE\s+\w+\s*=\s*\?/i,
        `WHERE id IN (${params.map(() => '?').join(',')})`
      )
      return {
        sql: inClause,
        params: params.map(p => [p]),
      }
    }

    // Default: return original
    return {
      sql,
      params: params.map(p => [p]),
    }
  }

  /**
   * Analyze queries for N+1 patterns
   */
  private analyzeQueries(queries: QueryPattern[]): NPlus1Detection {
    const patterns: QueryPattern[] = []
    const suggestions: string[] = []

    // Group queries by table
    const queriesByTable = new Map<string, QueryPattern[]>()
    for (const query of queries) {
      const table = query.tableName || 'unknown'
      if (!queriesByTable.has(table)) {
        queriesByTable.set(table, [])
      }
      queriesByTable.get(table)!.push(query)
    }

    // Detect N+1 patterns
    let detected = false
    let severity: 'low' | 'medium' | 'high' = 'low'

    // Add all patterns to the result
    for (const query of queries) {
      patterns.push(query)
    }

    // Check for N+1 patterns
    for (const [table, tableQueries] of queriesByTable.entries()) {
      // Check for multiple similar SELECT queries
      const selectQueries = tableQueries.filter(q => q.patternType === 'select')
      const groupedByPattern = new Map<string, QueryPattern[]>()

      for (const query of selectQueries) {
        const pattern = this.getQueryPattern(query)
        if (!groupedByPattern.has(pattern)) {
          groupedByPattern.set(pattern, [])
        }
        groupedByPattern.get(pattern)!.push(query)
      }

      // Analyze each pattern group
      for (const [pattern, patternQueries] of groupedByPattern.entries()) {
        const totalCount = patternQueries.reduce((sum, q) => sum + q.count, 0)

        // Detect N+1 based on total count
        if (totalCount > 2) {
          // Potential N+1 detected
          detected = true
          const totalTime = patternQueries.reduce((sum, q) => sum + q.totalTime, 0)

          // Generate suggestions
          suggestions.push(
            `N+1 query detected on table '${table}': ${patternQueries.length} similar queries`
          )

          if (totalCount > 10) {
            severity = 'high'
          } else if (totalCount >= 5) {
            severity = 'medium'
          }

          // Suggest optimization
          if (
            pattern.includes('WHERE id = ?') ||
            pattern.includes('WHERE user_id = ?') ||
            (pattern.includes('WHERE') && pattern.includes('?'))
          ) {
            suggestions.push(
              `Consider using WHERE id IN (...) to batch ${totalCount} queries into one`
            )
          } else if (pattern.includes('JOIN')) {
            suggestions.push('Consider using a single JOIN query instead of multiple queries')
          } else {
            suggestions.push(
              'Use eager loading or JOIN queries to fetch related data in a single query'
            )
          }
        }
      }
    }

    return {
      detected,
      patterns,
      suggestions,
      severity,
    }
  }

  /**
   * Get pattern key for query
   */
  private getPatternKey(sql: string): string {
    // Normalize query by replacing values with placeholders
    let normalized = sql.trim().toLowerCase()

    // Replace string literals
    normalized = normalized.replace(/'[^']*'/g, '?')

    // Replace numbers
    normalized = normalized.replace(/\b\d+\b/g, '?')

    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim()

    return normalized
  }

  /**
   * Detect query type
   */
  private detectQueryType(sql: string): QueryPattern['patternType'] {
    const trimmed = sql.trim().toLowerCase()
    if (trimmed.startsWith('select')) return 'select'
    if (trimmed.startsWith('insert')) return 'insert'
    if (trimmed.startsWith('update')) return 'update'
    if (trimmed.startsWith('delete')) return 'delete'
    return 'unknown'
  }

  /**
   * Extract table name
   */
  private extractTableName(sql: string): string | undefined {
    const match = sql.match(/FROM\s+(\w+)/i)
    return match ? match[1] : undefined
  }

  /**
   * Extract WHERE clause pattern
   */
  private extractWhereClause(sql: string): string | undefined {
    const match = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|$)/i)
    return match ? this.sanitizeWhere(match[1]) : undefined
  }

  /**
   * Get query pattern for grouping
   */
  private getQueryPattern(query: QueryPattern): string {
    let pattern = query.sql

    // Normalize WHERE clause
    if (query.whereClause) {
      pattern = pattern.replace(query.whereClause, this.sanitizeWhere(query.whereClause))
    }

    return pattern
  }

  /**
   * Sanitize WHERE clause
   */
  private sanitizeWhere(where: string): string {
    return where
      .replace(/'[^']*'/g, '?')
      .replace(/\b\d+\b/g, '?')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Sanitize query for storage
   */
  private sanitizeQuery(sql: string): string {
    return sql.replace(/\s+/g, ' ').trim()
  }
}

/**
 * Eager load related entities
 */
export async function eagerLoad<T, R extends { id: string | number }>(
  items: T[],
  relationKey: keyof T,
  loadFn: (ids: (string | number)[]) => Promise<R[]>
): Promise<T[]> {
  // Extract foreign key values
  const foreignKeys = items
    .map(item => item[relationKey] as string | number | undefined | null)
    .filter((value): value is string | number => value !== undefined && value !== null)

  if (foreignKeys.length === 0) {
    return items
  }

  // Get unique values
  const uniqueKeys = Array.from(new Set(foreignKeys))

  // Load related entities in one query
  const related = await loadFn(uniqueKeys)

  // Create lookup map
  const relatedMap = new Map<R['id'], R>()
  for (const entity of related) {
    relatedMap.set(entity.id, entity)
  }

  // Attach related entities
  return items.map(item => ({
    ...item,
    [relationKey]: relatedMap.get(item[relationKey] as string | number),
  }))
}

// Global detector instance
let detectorInstance: NPlus1Detector | null = null

/**
 * Get or create the global N+1 detector instance
 */
export function getNPlus1Detector(): NPlus1Detector {
  if (!detectorInstance) {
    detectorInstance = new NPlus1Detector()
  }
  return detectorInstance
}

/**
 * Reset the global N+1 detector (for testing)
 */
export function resetNPlus1Detector(): void {
  detectorInstance = null
}

// Removed unused exports: createBatchQuery, executeBatchQuery
// These were never imported anywhere in the codebase
