/**
 * @fileoverview 导出接口任务数据仓储 - 真实数据库读取
 * @description 从真实 `tasks` 表读取任务，过滤 / 排序 / 分页在 SQL 层真实生效
 * @version 1.0.0
 *
 * 真实表结构（来源：src/app/api/tasks/route.ts 的 ensureTasksTable()，代码为准）：
 *   id            TEXT PRIMARY KEY
 *   title         TEXT NOT NULL
 *   description   TEXT
 *   priority      TEXT NOT NULL DEFAULT 'medium'
 *   status        TEXT NOT NULL DEFAULT 'pending'
 *   due_date      TEXT
 *   created_by    TEXT NOT NULL
 *   assigned_to   TEXT
 *   created_at    TEXT NOT NULL
 *   updated_at    TEXT NOT NULL
 *
 * 注意：真实表**没有** tags / estimatedHours / actualHours 三列，
 * 因此 TaskEntity 与 TASK_FIELDS 同步删掉了这三个字段（不编造假值）。
 */

import { getDatabase } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { FilterCondition, SortOptions } from '@/lib/export/utils/filter-parser'
import type { ExportField } from '@/lib/export/core/exporter'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 任务实体 - 与真实 tasks 表一一对应（camelCase）
 */
export interface TaskEntity extends Record<string, unknown> {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  createdBy: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

/**
 * 数据库行类型（snake_case）
 */
interface TaskRow {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string | null
  created_by: string
  assigned_to: string | null
  created_at: string
  updated_at: string
}

/**
 * 导出结果
 */
export interface TaskFetchResult {
  /** 命中的任务行 */
  rows: TaskEntity[]
  /** 是否发生降级（数据库不可用 / 表不存在且无法自建） */
  degraded: boolean
  /** 降级原因（degraded=true 时有值） */
  reason?: string
  /** 被忽略的非法过滤 / 排序字段 */
  ignoredFields: string[]
}

// ============================================================================
// 字段定义
// ============================================================================

/**
 * 导出字段 - 与 TaskEntity 字段严格对齐（10 个，对应真实表 10 列）
 */
export const TASK_FIELDS: ExportField<TaskEntity>[] = [
  { key: 'id', label: '任务ID', order: 1 },
  { key: 'title', label: '任务标题', order: 2 },
  { key: 'description', label: '任务描述', order: 3 },
  { key: 'status', label: '状态', order: 4 },
  { key: 'priority', label: '优先级', order: 5 },
  { key: 'dueDate', label: '截止日期', order: 6 },
  { key: 'createdBy', label: '创建者', order: 7 },
  { key: 'assignedTo', label: '负责人', order: 8 },
  { key: 'createdAt', label: '创建时间', order: 9 },
  { key: 'updatedAt', label: '更新时间', order: 10 },
]

/**
 * 允许导出 / 过滤 / 排序的字段白名单：camelCase -> 真实列名
 */
export const TASK_COLUMN_MAP: Record<string, string> = {
  id: 'id',
  title: 'title',
  description: 'description',
  status: 'status',
  priority: 'priority',
  dueDate: 'due_date',
  createdBy: 'created_by',
  assignedTo: 'assigned_to',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

/**
 * 合法字段名集合
 */
export const TASK_FIELD_NAMES = new Set(Object.keys(TASK_COLUMN_MAP))

// ============================================================================
// 内部工具
// ============================================================================

/**
 * 把请求里的字段名归一化到 camelCase 白名单。
 * 允许传入 camelCase（dueDate）或数据库列名（due_date）。
 */
export function normalizeFieldName(field: string): string | null {
  if (TASK_FIELD_NAMES.has(field)) return field

  const snakeToCamel = field.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase())
  if (TASK_FIELD_NAMES.has(snakeToCamel)) return snakeToCamel

  return null
}

/**
 * 表结构自建（列与 src/app/api/tasks/route.ts 的 ensureTasksTable() 完全一致）
 *
 * 仅在表不存在时调用 —— CREATE TABLE IF NOT EXISTS 是幂等的。
 *
 * 与 /api/tasks 的唯一差别：不带 FOREIGN KEY (created_by/assigned_to) REFERENCES users(id)。
 * 原因：SQLite 在 prepare() 阶段就会校验外键目标表是否存在，若 users 表尚未建好，
 * 带外键的 tasks 表会导致后续 INSERT 直接报 "no such table: main.users"。
 * 导出接口只读不写，去掉外键声明可保证「先被导出接口建表」时也不影响其它模块写入。
 */
function ensureTasksTable(): void {
  const db = getDatabase()
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      due_date TEXT,
      created_by TEXT NOT NULL,
      assigned_to TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
}

/**
 * 行 -> TaskEntity（snake_case -> camelCase）
 */
export function rowToTaskEntity(row: TaskRow): TaskEntity {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ?? undefined,
    createdBy: row.created_by,
    assignedTo: row.assigned_to ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================================
// WHERE / ORDER BY 构建
// ============================================================================

/**
 * 构建 WHERE 子句。
 *
 * 语义严格对齐 src/lib/export/utils/filter-parser.ts 的 FilterParser（逐操作符核对过）：
 *  - eq    : LOWER(col) = LOWER(?)             —— NULL 行不命中（equals(null,x)=false）
 *  - ne    : (col IS NULL OR LOWER(col) != LOWER(?)) —— NULL 行命中
 *  - gt/gte/lt/lte : 字典序比较（列均为 TEXT，ISO8601 字符串可直接比较）
 *  - like  : LOWER(col) LIKE %v% ESCAPE '\'    —— NULL 行不命中
 *  - notLike : (col IS NULL OR NOT (...))      —— NULL 行命中
 *  - in    : LOWER(col) IN (...)               —— NULL 行不命中
 *  - notIn : (col IS NULL OR NOT (...))        —— NULL 行命中
 *  - between : col BETWEEN ? AND ?
 *  - isNull / isNotNull : col IS NULL / col IS NOT NULL
 *  - startsWith / endsWith : LIKE v% / LIKE %v
 *
 * 与 FilterParser 的两处有意差异（均为更安全 / 更正确）：
 *  1) LIKE 的 % 和 _ 被转义成字面量（FilterParser 是纯字符串 contains，
 *     用户输入的 % 会被当作通配符扩大命中范围）；
 *  2) 过滤字段走白名单映射，非白名单字段直接忽略并上报，
 *     不做字符串拼接进 SQL（FilterParser.escapeIdentifier 只做字符过滤，
 *     无法阻止合法标识符被误用）。
 */
export function buildWhereClause(
  filters: FilterCondition[] | undefined
): { sql: string; params: unknown[]; ignored: string[] } {
  const conditions: string[] = []
  const params: unknown[] = []
  const ignored: string[] = []

  for (const filter of filters ?? []) {
    const field = normalizeFieldName(filter.field)
    if (!field) {
      ignored.push(filter.field)
      continue
    }

    const column = TASK_COLUMN_MAP[field]
    const value = filter.value

    switch (filter.operator) {
      case 'isNull':
        conditions.push(`${column} IS NULL`)
        break
      case 'isNotNull':
        conditions.push(`${column} IS NOT NULL`)
        break
      case 'in':
      case 'notIn': {
        if (!Array.isArray(value) || value.length === 0) {
          ignored.push(filter.field)
          break
        }
        const placeholders = value.map(() => '?').join(', ')
        const clause = `LOWER(${column}) IN (${placeholders})`
        if (filter.operator === 'in') {
          conditions.push(clause)
        } else {
          // FilterParser.notIn 的语义是「不在数组中」→ NULL 行也算「不在」，
          // 所以这里显式把 NULL 行纳入，避免 SQL 三值逻辑把 NULL 行悄悄丢掉。
          conditions.push(`(${column} IS NULL OR NOT (${clause}))`)
        }
        // LOWER(col) 与参数比较 → 参数也必须小写化
        params.push(...value.map(v => String(v).toLowerCase()))
        break
      }
      case 'between': {
        if (!Array.isArray(value) || value.length !== 2) {
          ignored.push(filter.field)
          break
        }
        conditions.push(`${column} BETWEEN ? AND ?`)
        params.push(String(value[0]), String(value[1]))
        break
      }
      default: {
        if (value === null || value === undefined) {
          ignored.push(filter.field)
          break
        }
        const strValue = String(value)
        switch (filter.operator) {
          case 'eq':
            conditions.push(`LOWER(${column}) = LOWER(?)`)
            params.push(strValue.toLowerCase())
            break
          case 'ne':
            // FilterParser.equals 遇到 null 返回 false → ne 为 true，即 NULL 行命中
            conditions.push(`(${column} IS NULL OR LOWER(${column}) != LOWER(?))`)
            params.push(strValue.toLowerCase())
            break
          case 'gt':
            conditions.push(`${column} > ?`)
            params.push(strValue)
            break
          case 'gte':
            conditions.push(`${column} >= ?`)
            params.push(strValue)
            break
          case 'lt':
            conditions.push(`${column} < ?`)
            params.push(strValue)
            break
          case 'lte':
            conditions.push(`${column} <= ?`)
            params.push(strValue)
            break
          case 'like':
          case 'notLike': {
            // FilterParser.like：value 非字符串时恒 false；like → 非命中，notLike → 命中。
            // 因此 NULL 列在 like 下不命中、在 notLike 下命中。
            const likeValue = `%${escapeLike(strValue)}%`.toLowerCase()
            const clause = `LOWER(${column}) LIKE ? ESCAPE '\\'`
            if (filter.operator === 'like') {
              conditions.push(clause)
            } else {
              conditions.push(`(${column} IS NULL OR NOT (${clause}))`)
            }
            params.push(likeValue)
            break
          }
          case 'startsWith': {
            // FilterParser.startsWith：非字符串恒 false → NULL 不命中
            conditions.push(`LOWER(${column}) LIKE ? ESCAPE '\\'`)
            params.push(`${escapeLike(strValue).toLowerCase()}%`)
            break
          }
          case 'endsWith': {
            conditions.push(`LOWER(${column}) LIKE ? ESCAPE '\\'`)
            params.push(`%${escapeLike(strValue).toLowerCase()}`)
            break
          }
          default:
            ignored.push(filter.field)
        }
      }
    }
  }

  return {
    sql: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
    ignored,
  }
}

/**
 * 转义 LIKE 通配符，避免用户输入的 % / _ 变成通配符
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, m => `\\${m}`)
}

/**
 * 构建 ORDER BY 子句。
 * - priority 使用与 /api/tasks 一致的自定义序：low < medium < high < urgent
 * - NULL 行排在最后
 */
export function buildOrderByClause(sort: SortOptions[] | undefined): {
  sql: string
  ignored: string[]
} {
  const parts: string[] = []
  const ignored: string[] = []

  for (const option of sort ?? []) {
    const field = normalizeFieldName(option.field)
    if (!field) {
      ignored.push(option.field)
      continue
    }
    const column = TASK_COLUMN_MAP[field]
    const direction = option.order === 'desc' ? 'DESC' : 'ASC'

    if (field === 'priority') {
      parts.push(
        `CASE ${column} WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 WHEN 'urgent' THEN 4 ELSE 5 END ${direction}`
      )
      continue
    }

    parts.push(`(${column} IS NULL) ASC`)
    parts.push(`${column} ${direction}`)
  }

  return {
    sql: parts.length > 0 ? `ORDER BY ${parts.join(', ')}` : '',
    ignored,
  }
}

// ============================================================================
// 数据读取
// ============================================================================

export interface FetchTasksOptions {
  filters?: FilterCondition[]
  sort?: SortOptions[]
  page?: number
  pageSize?: number
}

/**
 * 从真实数据库读取任务。
 *
 * 任何异常都降级为「空结果 + degraded=true」，绝不抛出 —— 上层据此返回 200 空导出，
 * 不会 500。
 */
export async function fetchTasks(options: FetchTasksOptions = {}): Promise<TaskFetchResult> {
  const ignoredFields: string[] = []

  try {
    const { sql: whereSql, params: whereParams, ignored: ignoredWhere } = buildWhereClause(options.filters)
    ignoredFields.push(...ignoredWhere)

    const { sql: orderSql, ignored: ignoredOrder } = buildOrderByClause(options.sort)
    ignoredFields.push(...ignoredOrder)

    let sql = `SELECT id, title, description, priority, status, due_date, created_by, assigned_to, created_at, updated_at FROM tasks ${whereSql} ${orderSql}`

    const params: unknown[] = [...whereParams]

    if (options.page && options.pageSize) {
      const page = Math.max(1, Math.floor(options.page))
      const pageSize = Math.min(100000, Math.max(1, Math.floor(options.pageSize)))
      sql += ' LIMIT ? OFFSET ?'
      params.push(pageSize, (page - 1) * pageSize)
    }

    const db = getDatabase()

    let rows: Record<string, unknown>[]
    try {
      rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // 表不存在 —— 尝试幂等自建一次再重试
      if (/no such table/i.test(message)) {
        ensureTasksTable()
        rows = db.prepare(sql).all(...params) as Record<string, unknown>[]
      } else {
        throw error
      }
    }

    const entities = rows.map(row => rowToTaskEntity(row as unknown as TaskRow))

    return { rows: entities, degraded: false, ignoredFields }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error('[Export API] 读取 tasks 表失败，已降级为空结果', { error: message })

    return {
      rows: [],
      degraded: true,
      reason: message,
      ignoredFields,
    }
  }
}
