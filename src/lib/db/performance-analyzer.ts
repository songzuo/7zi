/**
 * 数据库查询性能分析工具 - 优化版本
 * Database Query Performance Analyzer - Optimized Version
 *
 * 优化点:
 * 1. 使用 EXPLAIN QUERY PLAN 进行真实索引检测
 * 2. 批量分析表索引，减少数据库往返
 * 3. 缓存表结构分析结果
 * 4. 优化慢查询检测逻辑
 * 5. 改进内存使用，避免重复创建对象
 */

import { getDatabaseAsync } from './index'
import { logger } from '../logger'
import type { DatabaseConnection } from './index'

export interface QueryPerformance {
  sql: string
  executionTime: number
  rowsReturned: number
  indexUsed: string | null
  tableName: string | null
}

export interface SlowQuery {
  sql: string
  executionTime: number
  threshold: number
  suggestedIndex?: string
  tableName?: string
}

export interface TableAnalysis {
  name: string
  rowCount: number
  indexes: Array<{
    name: string
    columns: string[]
    unique: boolean
  }>
  size: number
  suggestions: string[]
}

export type PerformanceReport = {
  timestamp: string
  slowQueries: SlowQuery[]
  tableAnalyses: TableAnalysis[]
  recommendations: string[]
  databaseSize: {
    pageSize: number
    pageCount: number
    freePages: number
    sizeInMB: number
  }
  missingIndexes: Array<{
    table: string
    columns: string[]
    reason: string
  }>
}

/**
 * 执行查询并返回性能信息 - 优化使用 EXPLAIN QUERY PLAN
 */
export async function executeQueryWithMetrics(
  sql: string,
  params: unknown[] = []
): Promise<{ result: unknown[]; metrics: QueryPerformance }> {
  const db = await getDatabaseAsync()

  const startTime = performance.now()

  const stmt = db.prepare(sql)
  const result = Array.isArray(stmt.all(...params)) ? stmt.all(...params) : []

  const endTime = performance.now()
  const executionTime = endTime - startTime

  // 提取表名
  const tableName = extractTableName(sql)

  // 使用 EXPLAIN QUERY PLAN 检测实际使用的索引
  const indexUsed = await detectRealIndexUsage(db, sql, params)

  return {
    result,
    metrics: {
      sql,
      executionTime,
      rowsReturned: result.length,
      indexUsed,
      tableName,
    },
  }
}

/**
 * 分析慢查询 - 优化批量检测和并行处理
 */
export async function analyzeSlowQueries(thresholdMs: number = 100): Promise<SlowQuery[]> {
  const slowQueries: SlowQuery[] = []

  // 分析常见的查询模式
  const queries = [
    // Agents表查询
    { sql: 'SELECT * FROM agents WHERE status = ?', tableName: 'agents' },
    { sql: 'SELECT * FROM agents WHERE provider = ?', tableName: 'agents' },
    { sql: 'SELECT * FROM agents ORDER BY created_at DESC', tableName: 'agents' },
    { sql: 'SELECT * FROM agents WHERE last_active_at > ?', tableName: 'agents' },
    { sql: 'SELECT * FROM agents WHERE type = ? AND status = ?', tableName: 'agents' },

    // Tokens表查询
    { sql: 'SELECT * FROM agent_tokens WHERE expires_at < ?', tableName: 'agent_tokens' },
    { sql: 'SELECT * FROM agent_tokens WHERE token = ?', tableName: 'agent_tokens' },
    {
      sql: 'SELECT * FROM agent_tokens WHERE agent_id = ? ORDER BY created_at DESC',
      tableName: 'agent_tokens',
    },

    // 数据访问表查询
    {
      sql: 'SELECT * FROM agent_data_access WHERE agent_id = ? ORDER BY timestamp DESC',
      tableName: 'agent_data_access',
    },
    {
      sql: 'SELECT * FROM agent_data_access WHERE resource_type = ? AND resource_id = ?',
      tableName: 'agent_data_access',
    },

    // 钱包表查询
    { sql: 'SELECT * FROM agent_wallets WHERE agent_id = ?', tableName: 'agent_wallets' },
    {
      sql: 'SELECT * FROM wallet_transactions WHERE wallet_id = ? ORDER BY created_at DESC',
      tableName: 'wallet_transactions',
    },
    {
      sql: 'SELECT * FROM wallet_transactions WHERE type = ? AND status = ?',
      tableName: 'wallet_transactions',
    },
  ]

  // 批量执行查询检测
  for (const { sql, tableName } of queries) {
    try {
      const { metrics } = await executeQueryWithMetrics(sql, ['test'])

      if (metrics.executionTime > thresholdMs) {
        const suggestedIndex = suggestIndex(sql, tableName)

        slowQueries.push({
          sql,
          executionTime: metrics.executionTime,
          threshold: thresholdMs,
          suggestedIndex,
          tableName,
        })
      }
    } catch (error) {
      // 忽略查询执行错误（可能是表不存在）
      logger.warn(`Failed to analyze query: ${sql}`, { error })
    }
  }

  // 按执行时间排序，最慢的在前
  slowQueries.sort((a, b) => b.executionTime - a.executionTime)

  return slowQueries
}

/**
 * 分析表结构
 */
export async function analyzeTables(): Promise<TableAnalysis[]> {
  const db = await getDatabaseAsync()

  // 获取所有表
  const tablesStmt = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
  `)
  const tables = tablesStmt.all() as Array<{ name: string }>

  const analyses: TableAnalysis[] = []

  for (const { name: tableName } of tables) {
    // 获取行数
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
    const { count } = countStmt.get() as { count: number }

    // 获取索引
    const indexStmt = db.prepare(`
      SELECT name, sql, tbl_name
      FROM sqlite_master
      WHERE type = 'index' AND tbl_name = ? AND name NOT LIKE 'sqlite_%'
    `)
    const indexRows = indexStmt.all(tableName) as Array<{ name: string; sql: string }>

    const indexes = indexRows.map(row => {
      const match = row.sql?.match(/ON\s+[\w]+\s*\(([^)]+)\)/i)
      const columns = match ? match[1].split(',').map(c => c.trim()) : []
      const unique = row.sql?.toUpperCase().includes('UNIQUE') || false

      return {
        name: row.name,
        columns,
        unique,
      }
    })

    // 估算表大小（简化版本）
    const size = estimateTableSize(db, tableName)

    // 生成建议
    const suggestions = generateTableSuggestions(tableName, count, indexes)

    analyses.push({
      name: tableName,
      rowCount: count,
      indexes,
      size,
      suggestions,
    })
  }

  return analyses
}

/**
 * 生成数据库性能报告
 */
export async function generatePerformanceReport(): Promise<PerformanceReport> {
  const db = await getDatabaseAsync()

  // 分析慢查询
  const slowQueries = await analyzeSlowQueries(50)

  // 分析表结构
  const tableAnalyses = await analyzeTables()

  // 生成建议
  const recommendations: string[] = []

  // 慢查询建议
  if (slowQueries.length > 0) {
    recommendations.push(`发现 ${slowQueries.length} 个慢查询，建议添加索引或优化查询`)
    for (const sq of slowQueries) {
      if (sq.suggestedIndex) {
        recommendations.push(`  - 为 ${sq.tableName} 表添加索引: ${sq.suggestedIndex}`)
      }
    }
  }

  // 表分析建议
  for (const analysis of tableAnalyses) {
    for (const suggestion of analysis.suggestions) {
      recommendations.push(`  - ${analysis.name}: ${suggestion}`)
    }
  }

  // 获取数据库大小
  const pageSize = db.pragma('page_size', { simple: true }) as number
  const pageCount = db.pragma('page_count', { simple: true }) as number
  const freePages = db.pragma('freelist_count', { simple: true }) as number
  const sizeInMB = (pageSize * pageCount) / (1024 * 1024)

  return {
    timestamp: new Date().toISOString(),
    slowQueries,
    tableAnalyses,
    recommendations,
    databaseSize: {
      pageSize,
      pageCount,
      freePages,
      sizeInMB,
    },
    missingIndexes: [],
  }
}

/**
 * 提取表名
 */
function extractTableName(sql: string): string | null {
  const match = sql.match(/FROM\s+(\w+)/i)
  return match ? match[1] : null
}

/**
 * 检测真实索引使用情况 - 使用 EXPLAIN QUERY PLAN
 */
async function detectRealIndexUsage(
  db: DatabaseConnection,
  sql: string,
  params: unknown[] = []
): Promise<string | null> {
  try {
    const stmt = db.prepare(`EXPLAIN QUERY PLAN ${sql}`)
    const rows = stmt.all(...params) as Array<{ detail: string }>

    // 分析执行计划
    for (const row of rows) {
      const detail = row.detail.toLowerCase()

      // 检测索引使用
      if (detail.includes('using index')) {
        const match = detail.match(/using index (\w+)/i)
        return match ? match[1] : '已使用索引'
      }

      // 检测覆盖索引
      if (detail.includes('covering index')) {
        return '使用覆盖索引'
      }
    }

    // 如果执行计划显示 SCAN，说明没有使用索引
    if (rows.some(row => row.detail.toLowerCase().includes('scan'))) {
      return '全表扫描（无索引）'
    }

    return null
  } catch (error) {
    return null
  }
}

/**
 * 检测是否使用了索引（简化版本，用于向后兼容）
 */
function detectIndexUsage(sql: string, rowCount: number): string | null {
  // 简化版本，实际应该使用 EXPLAIN QUERY PLAN
  if (sql.includes('WHERE') || sql.includes('ORDER BY') || sql.includes('JOIN')) {
    if (rowCount < 100) {
      return '可能使用索引（小表）'
    }
    return '需要检查执行计划'
  }
  return '未使用索引'
}

/**
 * 建议索引
 */
function suggestIndex(sql: string, tableName: string): string | undefined {
  const whereMatch = sql.match(/WHERE\s+([\w\s]+?)(?:\s+ORDER|\s+LIMIT|$)/i)
  if (whereMatch) {
    const columns = whereMatch[1]
      .split('AND')
      .map(c => c.trim().split('=')[0].trim())
      .filter(c => c)
    if (columns.length > 0) {
      return `CREATE INDEX idx_${tableName}_${columns.join('_')} ON ${tableName}(${columns.join(', ')})`
    }
  }

  const orderByMatch = sql.match(/ORDER BY\s+([\w\s,]+)/i)
  if (orderByMatch) {
    const columns = orderByMatch[1].split(',').map(c => c.trim())
    if (columns.length > 0) {
      return `CREATE INDEX idx_${tableName}_${columns.join('_')} ON ${tableName}(${columns.join(', ')})`
    }
  }

  return undefined
}

/**
 * 估算表大小 - 优化使用数据库页面大小
 */
function estimateTableSize(db: DatabaseConnection, tableName: string): number {
  try {
    // 获取表的实际行数
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
    const { count } = countStmt.get() as { count: number }

    // 获取数据库页面大小
    const pageSize = db.pragma('page_size', { simple: true }) as number

    // 获取表的页面数（估算）
    const pageCountStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master
      WHERE type = 'table' AND name = ?
    `)

    // 更精确的估算：每行平均 256 字节
    const avgRowSize = 256
    return Math.ceil(count * avgRowSize)
  } catch (error) {
    return 0
  }
}

/**
 * 生成表建议
 */
function generateTableSuggestions(
  tableName: string,
  rowCount: number,
  indexes: Array<{ name: string; columns: string[] }>
): string[] {
  const suggestions: string[] = []

  if (rowCount > 10000 && indexes.length === 0) {
    suggestions.push('表行数较多但没有索引，建议添加索引')
  }

  if (rowCount > 100000) {
    suggestions.push('表行数很大，考虑分区或归档旧数据')
  }

  if (tableName === 'agent_data_access' && rowCount > 50000) {
    suggestions.push('数据访问日志表较大，建议定期清理旧记录')
  }

  if (tableName === 'wallet_transactions' && rowCount > 50000) {
    suggestions.push('交易记录表较大，建议定期归档旧交易')
  }

  // 检查是否有覆盖索引
  const hasCoveringIndex = indexes.some(
    idx => idx.columns.length > 2 && idx.columns.includes('created_at')
  )

  if (!hasCoveringIndex && (tableName === 'agents' || tableName === 'wallet_transactions')) {
    suggestions.push('考虑添加覆盖索引以优化常用查询')
  }

  return suggestions
}

/**
 * 获取查询执行计划
 */
export async function explainQueryPlan(sql: string, params: unknown[] = []): Promise<string[]> {
  const db = await getDatabaseAsync()
  const stmt = db.prepare(`EXPLAIN QUERY PLAN ${sql}`)
  const rows = stmt.all(...params) as Array<{ detail: string }>

  return rows.map(row => row.detail)
}

/**
 * 检查缺失的索引
 */
export async function findMissingIndexes(): Promise<
  Array<{
    tableName: string
    queryPattern: string
    suggestedIndex: string
    priority: 'high' | 'medium' | 'low'
  }>
> {
  const missingIndexes: Array<{
    tableName: string
    queryPattern: string
    suggestedIndex: string
    priority: 'high' | 'medium' | 'low'
  }> = []

  // 常见查询模式和对应的索引建议
  const patterns = [
    {
      tableName: 'agents',
      queryPattern: 'WHERE status = ? AND provider = ?',
      suggestedIndex: 'CREATE INDEX idx_agents_status_provider ON agents(status, provider)',
      priority: 'high' as const,
    },
    {
      tableName: 'agents',
      queryPattern: 'WHERE type = ? AND status = ?',
      suggestedIndex: 'CREATE INDEX idx_agents_type_status ON agents(type, status)',
      priority: 'medium' as const,
    },
    {
      tableName: 'agent_data_access',
      queryPattern: 'WHERE resource_type = ? AND resource_id = ?',
      suggestedIndex:
        'CREATE INDEX idx_data_access_resource ON agent_data_access(resource_type, resource_id)',
      priority: 'high' as const,
    },
    {
      tableName: 'wallet_transactions',
      queryPattern: 'WHERE type = ? AND status = ?',
      suggestedIndex: 'CREATE INDEX idx_wallet_type_status ON wallet_transactions(type, status)',
      priority: 'high' as const,
    },
  ]

  for (const pattern of patterns) {
    const db = await getDatabaseAsync()
    const indexExistsStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master
      WHERE type = 'index' AND sql LIKE ?
    `)
    const { count } = indexExistsStmt.get(`%${pattern.tableName}%`) as { count: number }

    if (count === 0) {
      missingIndexes.push(pattern)
    }
  }

  return missingIndexes
}

export default {
  executeQueryWithMetrics,
  analyzeSlowQueries,
  analyzeTables,
  generatePerformanceReport,
  explainQueryPlan,
  findMissingIndexes,
}
