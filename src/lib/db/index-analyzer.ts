/**
 * Index Usage Analyzer
 * 索引使用情况分析器
 *
 * 用于检查数据库索引是否被有效使用
 */

import Database from 'better-sqlite3'
import { getDatabaseAsync } from './index'
import { logger } from '../logger'

export interface IndexInfo {
  /** 表名 */
  tableName: string
  /** 索引名 */
  indexName: string
  /** 索引列 */
  columns: string[]
  /** 是否唯一索引 */
  isUnique: boolean
  /** 是否主键 */
  isPrimary: boolean
  /** 使用次数（SQLite 不直接支持，基于查询模式推断） */
  estimatedUsage: number
}

export interface IndexUsageReport {
  /** 所有索引信息 */
  indexes: IndexInfo[]
  /** 未使用的索引（潜在） */
  unusedIndexes: IndexInfo[]
  /** 缺失的索引（建议添加） */
  missingIndexes: Array<{
    tableName: string
    columns: string[]
    reason: string
    createSql: string
  }>
  /** 重复的索引 */
  duplicateIndexes: Array<{
    tableName: string
    indexes: string[]
    reason: string
  }>
}

/**
 * 获取数据库所有索引信息
 */
export async function getAllIndexes(): Promise<IndexInfo[]> {
  const db = await getDatabaseAsync()

  const stmt = db.prepare(`
    SELECT
      tbl_name as tableName,
      name as indexName,
      sql as indexSql
    FROM sqlite_master
    WHERE type = 'index'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY tbl_name, name
  `)

  const rows = stmt.all() as Array<{
    tableName: string
    indexName: string
    indexSql?: string
  }>

  // INTEGER PRIMARY KEY 在 SQLite 里不建普通索引（它是表的 rowid 别名），
  // 但 UNIQUE/PRIMARY KEY 约束会生成 sqlite_autoindex_* —— 那些被上面的
  // `name NOT LIKE 'sqlite_%'` 过滤掉了。
  // 结果是：主键信息完全查不到，isPrimary 永远为 false。
  // 这里单独查表结构，把每个表的主键列补成一条 PRIMARY 索引。
  const primaryKeyStmt = db.prepare(`
    SELECT
      tbl_name as tableName,
      name as indexName,
      sql as indexSql
    FROM sqlite_master
    WHERE type = 'table'
    AND sql LIKE '%PRIMARY KEY%'
  `)
  const tableRows = primaryKeyStmt.all() as Array<{
    tableName: string
    indexName: string
    indexSql?: string
  }>

  const primaryKeyRows = tableRows.map((t) => {
    const pkCols = parsePrimaryKeyColumns(t.indexSql)
    return {
      tableName: t.tableName,
      indexName: 'PRIMARY',
      indexSql: `PRIMARY KEY (${pkCols.join(', ')})`,
    }
  })

  const allRows = [...rows, ...primaryKeyRows]

  const indexes: IndexInfo[] = []

  for (const row of allRows) {
    // 解析索引列
    const columns = parseIndexColumns(row.indexSql)

    // indexSql 可能是 undefined（sqlite_master 里隐式索引的 sql 为 NULL），
    // indexName 也可能缺失 —— 一律用可选链兜住，不能直接 .toLowerCase()。
    const indexName = row.indexName ?? ''
    const indexSql = row.indexSql ?? ''

    // 检查是否是主键索引
    const isPrimary =
      indexName === 'PRIMARY' ||
      indexName.toLowerCase().startsWith('pk_') ||
      indexName.toLowerCase().includes('primary') ||
      indexSql.toLowerCase().includes('primary key')

    // 检查是否是唯一索引
    const isUnique =
      indexName.toLowerCase().includes('unique') ||
      indexSql.toLowerCase().includes('unique')

    indexes.push({
      tableName: row.tableName,
      indexName: row.indexName,
      columns,
      isUnique,
      isPrimary,
      estimatedUsage: 0, // 将在分析时填充
    })
  }

  return indexes
}

/**
 * 解析索引 SQL 中的列名
 */
/**
 * 从建表语句里解析主键列
 */
function parsePrimaryKeyColumns(sql?: string): string[] {
  if (!sql) return []

  // 表级约束：PRIMARY KEY (a, b)
  const tableLevel = sql.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i)
  if (tableLevel) {
    return tableLevel[1]
      .split(',')
      .map(col => col.trim().replace(/".*?"/g, '').replace(/'.*?'/g, ''))
      .filter(col => col.length > 0)
  }

  // 列级约束：id INTEGER PRIMARY KEY AUTOINCREMENT
  const columnLevel = sql.match(
    /["'`]?(\w+)["'`]?\s+[A-Za-z]+(?:\s*\(\d+\))?\s+PRIMARY\s+KEY/i
  )
  if (columnLevel) return [columnLevel[1]]

  return []
}

function parseIndexColumns(sql?: string): string[] {
  if (!sql) return []

  const match = sql.match(/ON\s+\w+\s*\(([^)]+)\)/i)
  if (!match) return []

  const columnsStr = match[1]
  const columns = columnsStr
    .split(',')
    .map(col => col.trim().replace(/".*?"/g, '').replace(/'.*?'/g, ''))
    // 去掉排序方向修饰符：`created_at DESC` -> `created_at`。
    // 之前只过滤掉整列就是 ASC/DESC 的情况，`created_at DESC` 这种带后缀的
    // 会原样留在数组里 —— 于是调用方拿到 'created_at DESC' 而不是 'created_at'。
    .map(col => col.replace(/\s+(ASC|DESC)\s*$/i, '').trim())
    .filter(col => col.length > 0)

  return columns
}

/**
 * 分析索引使用情况
 */
export async function analyzeIndexUsage(): Promise<IndexUsageReport> {
  const db = await getDatabaseAsync()

  // 获取所有索引
  const indexes = await getAllIndexes()

  // 获取所有表
  const tablesStmt = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
  `)

  const tables = tablesStmt.all() as Array<{ name: string }>

  // 分析每个表的索引使用情况
  const unusedIndexes: IndexInfo[] = []
  const missingIndexes: Array<{
    tableName: string
    columns: string[]
    reason: string
    createSql: string
  }> = []
  const duplicateIndexes: Array<{
    tableName: string
    indexes: string[]
    reason: string
  }> = []

  // 检查缺失的索引（基于常见查询模式）
  for (const table of tables) {
    const tableIndexes = indexes.filter(idx => idx.tableName === table.name)

    // 检查外键是否已索引
    const connection = db.getConnection?.()
    if (!connection) continue

    const foreignKeys = getForeignKeys(connection as unknown as Database.Database, table.name)
    for (const fk of foreignKeys) {
      const hasIndex = tableIndexes.some(idx => idx.columns.includes(fk.from))
      if (!hasIndex) {
        missingIndexes.push({
          tableName: table.name,
          columns: [fk.from],
          reason: `Foreign key column ${fk.from} not indexed`,
          createSql: `CREATE INDEX idx_${table.name}_${fk.from} ON ${table.name} (${fk.from});`,
        })
      }
    }

    // 检查大表是否有合适的索引
    const rowCount = getTableRowCount(connection as unknown as Database.Database, table.name)
    if (rowCount > 1000) {
      // 检查是否有状态字段索引
      const statusColumns = ['status', 'type', 'created_at']
      for (const col of statusColumns) {
        const hasIndex = tableIndexes.some(idx => idx.columns.includes(col))
        if (!hasIndex && hasColumn(connection as unknown as Database.Database, table.name, col)) {
          missingIndexes.push({
            tableName: table.name,
            columns: [col],
            reason: `Large table (${rowCount} rows) missing index on ${col}`,
            createSql: `CREATE INDEX idx_${table.name}_${col} ON ${table.name} (${col});`,
          })
        }
      }
    }
  }

  // 检查重复的索引
  const indexesByTable = new Map<string, IndexInfo[]>()
  for (const idx of indexes) {
    if (!indexesByTable.has(idx.tableName)) {
      indexesByTable.set(idx.tableName, [])
    }
    indexesByTable.get(idx.tableName)!.push(idx)
  }

  for (const [tableName, tableIndexes] of indexesByTable.entries()) {
    // 检查完全重复的索引
    for (let i = 0; i < tableIndexes.length; i++) {
      const idx1 = tableIndexes[i]
      for (let j = i + 1; j < tableIndexes.length; j++) {
        const idx2 = tableIndexes[j]

        if (idx1.columns.join(',') === idx2.columns.join(',')) {
          duplicateIndexes.push({
            tableName,
            indexes: [idx1.indexName, idx2.indexName],
            reason: `Both indexes cover same columns: ${idx1.columns.join(', ')}`,
          })
        }
      }

      // 检查前缀索引（如果有复合索引，单列索引可能是冗余的）
      if (idx1.columns.length > 1) {
        const prefixIndex = tableIndexes.find(
          idx => idx !== idx1 && idx.columns.length === 1 && idx1.columns[0] === idx.columns[0]
        )

        if (prefixIndex) {
          duplicateIndexes.push({
            tableName,
            indexes: [prefixIndex.indexName, idx1.indexName],
            reason: `Single-column index on ${prefixIndex.columns[0]} is covered by composite index ${idx1.indexName}`,
          })
        }
      }
    }
  }

  return {
    indexes,
    unusedIndexes,
    missingIndexes,
    duplicateIndexes,
  }
}

/**
 * 获取表的外键
 */
function getForeignKeys(
  db: Database.Database,
  tableName: string
): Array<{ from: string; to: string; refTable: string; refColumn: string }> {
  const stmt = db.prepare(`PRAGMA foreign_key_list(${tableName})`)
  const rows = stmt.all() as Array<{ from: string; to: string; table: string }>

  return rows.map(row => ({
    from: row.from,
    to: row.to,
    refTable: row.table,
    refColumn: row.to,
  }))
}

/**
 * 获取表的行数
 */
function getTableRowCount(db: Database.Database, tableName: string): number {
  const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
  const row = stmt.get() as { count: number }
  return row.count || 0
}

/**
 * 检查表是否有某列
 */
function hasColumn(db: Database.Database, tableName: string, columnName: string): boolean {
  const stmt = db.prepare(`PRAGMA table_info(${tableName})`)
  const rows = stmt.all() as Array<{ name: string }>

  return rows.some(row => row.name === columnName)
}

/**
 * 生成索引优化建议
 */
export function generateIndexOptimizationSuggestions(report: IndexUsageReport): string[] {
  const suggestions: string[] = []

  if (report.missingIndexes.length > 0) {
    suggestions.push(`\n📌 建议添加的索引 (${report.missingIndexes.length}):`)
    for (const missing of report.missingIndexes.slice(0, 10)) {
      suggestions.push(`  - 表 ${missing.tableName}: ${missing.columns.join(', ')}`)
      suggestions.push(`    原因: ${missing.reason}`)
      suggestions.push(`    SQL: ${missing.createSql}`)
    }

    if (report.missingIndexes.length > 10) {
      suggestions.push(`  ... 还有 ${report.missingIndexes.length - 10} 个建议`)
    }
  }

  if (report.duplicateIndexes.length > 0) {
    suggestions.push(`\n⚠️ 发现重复的索引 (${report.duplicateIndexes.length}):`)
    for (const dup of report.duplicateIndexes) {
      suggestions.push(`  - 表 ${dup.tableName}: ${dup.indexes.join(', ')}`)
      suggestions.push(`    原因: ${dup.reason}`)
      suggestions.push(`    建议: 考虑删除其中一个以减少存储开销`)
    }
  }

  if (report.missingIndexes.length === 0 && report.duplicateIndexes.length === 0) {
    suggestions.push('✅ 未发现索引优化问题')
  }

  return suggestions
}

/**
 * 创建索引优化报告
 */
export async function createIndexReport(): Promise<string> {
  const report = await analyzeIndexUsage()
  const suggestions = generateIndexOptimizationSuggestions(report)

  let reportText = '=== 数据库索引分析报告 ===\n\n'
  reportText += `生成时间: ${new Date().toISOString()}\n\n`

  reportText += `索引总数: ${report.indexes.length}\n`
  reportText += `建议添加的索引: ${report.missingIndexes.length}\n`
  reportText += `发现重复的索引: ${report.duplicateIndexes.length}\n\n`

  // 按表列出索引
  const indexesByTable = new Map<string, IndexInfo[]>()
  for (const idx of report.indexes) {
    if (!indexesByTable.has(idx.tableName)) {
      indexesByTable.set(idx.tableName, [])
    }
    indexesByTable.get(idx.tableName)!.push(idx)
  }

  reportText += '现有索引:\n'
  for (const [tableName, tableIndexes] of indexesByTable.entries()) {
    reportText += `\n表 ${tableName}:\n`
    for (const idx of tableIndexes) {
      const type = idx.isPrimary ? 'PK' : idx.isUnique ? 'UNIQUE' : 'INDEX'
      reportText += `  [${type}] ${idx.indexName} (${idx.columns.join(', ')})\n`
    }
  }

  reportText += '\n优化建议:\n'
  reportText += suggestions.join('\n')

  return reportText
}

export default {
  getAllIndexes,
  analyzeIndexUsage,
  generateIndexOptimizationSuggestions,
  createIndexReport,
}
