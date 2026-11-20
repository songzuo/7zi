/**
 * @fileoverview 测试辅助 - 语义化内存数据库 fake
 * @description 用真实的 better-sqlite3 内存库实现 DatabaseConnection 接口，
 *              让导出的 SQL（WHERE / ORDER BY / LIMIT）真的被 SQLite 执行，
 *              而不是断言 mock 自身。
 */

import Database from 'better-sqlite3'
import type { DatabaseConnection, DatabaseResult, DatabaseStatement } from '@/lib/db'

/** 与 src/app/api/tasks/route.ts 的 ensureTasksTable() 一致的真实表结构 */
export const TASKS_TABLE_DDL = `
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
`

export interface TaskSeedRow {
  id: string
  title: string
  description?: string | null
  priority?: string
  status?: string
  due_date?: string | null
  created_by?: string
  assigned_to?: string | null
  created_at?: string
  updated_at?: string
}

/**
 * 把 DatabaseConnection 接口包装到真实 better-sqlite3 实例上
 */
export function wrapSqlite(raw: Database.Database): DatabaseConnection {
  return {
    query: (sql: string, params?: unknown[]) => {
      if (sql.trim().toLowerCase().startsWith('select')) {
        const stmt = raw.prepare(sql)
        const result = params && params.length > 0 ? stmt.all(...params) : stmt.all()
        return Array.isArray(result) ? result : []
      }
      const stmt = raw.prepare(sql)
      const result = stmt.run(...(params ?? []))
      return { changes: result.changes }
    },
    queryRows: <T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] => {
      const stmt = raw.prepare(sql)
      const result = params && params.length > 0 ? stmt.all(...params) : stmt.all()
      return Array.isArray(result) ? (result as T[]) : []
    },
    get: <T = Record<string, unknown>>(sql: string, params?: unknown[]): T | null => {
      const stmt = raw.prepare(sql)
      const result = params && params.length > 0 ? stmt.get(...params) : stmt.get()
      return (result ?? null) as T | null
    },
    exec: (sql: string, _params?: unknown[]): DatabaseResult => {
      raw.exec(sql)
      return { changes: 0 }
    },
    prepare: (sql: string): DatabaseStatement => {
      const stmt = raw.prepare(sql)
      return {
        run: (...params: unknown[]) => {
          const result = stmt.run(...params)
          return { changes: result.changes }
        },
        get: (...params: unknown[]) => {
          const result = stmt.get(...params)
          return (result ?? null) as Record<string, unknown> | null
        },
        all: (...params: unknown[]) => stmt.all(...params) as Record<string, unknown>[],
      }
    },
    pragma: (name: string, _options?: { simple: boolean }) => raw.pragma(name),
    getConnection: () => raw,
    batch: async (statements: Array<{ sql: string; params?: unknown[] }>) => {
      return statements.map(s => {
        const result = raw.prepare(s.sql).run(...(s.params ?? []))
        return { changes: result.changes }
      })
    },
    paginate: async (sql: string, pagination: unknown, params?: unknown[]) => {
      const stmt = raw.prepare(sql)
      return stmt.all(...(params ?? []))
    },
    beginTransaction: () => {
      raw.exec('BEGIN')
    },
    commit: () => {
      raw.exec('COMMIT')
    },
    rollback: () => {
      raw.exec('ROLLBACK')
    },
    isInTransaction: () => raw.inTransaction,
  }
}

/**
 * 创建一个带 tasks 表和种子数据的内存数据库连接
 */
export function createTaskDatabase(rows: TaskSeedRow[] = []): {
  connection: DatabaseConnection
  raw: Database.Database
} {
  const raw = new Database(':memory:')
  raw.exec(TASKS_TABLE_DDL)

  const insert = raw.prepare(`
    INSERT INTO tasks (
      id, title, description, priority, status, due_date,
      created_by, assigned_to, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  for (const row of rows) {
    insert.run(
      row.id,
      row.title,
      row.description ?? null,
      row.priority ?? 'medium',
      row.status ?? 'pending',
      row.due_date ?? null,
      row.created_by ?? 'user-1',
      row.assigned_to ?? null,
      row.created_at ?? '2026-01-01T00:00:00.000Z',
      row.updated_at ?? '2026-01-01T00:00:00.000Z'
    )
  }

  return { connection: wrapSqlite(raw), raw }
}

/**
 * 创建一个「数据库不可用」的连接：任何 prepare 都抛错（模拟磁盘故障 / 库损坏）
 */
export function createBrokenDatabase(message = 'database is locked'): DatabaseConnection {
  const thrower = (): never => {
    throw new Error(message)
  }
  return {
    query: thrower,
    queryRows: thrower,
    get: thrower,
    exec: thrower,
    prepare: thrower,
    pragma: thrower,
    getConnection: () => undefined,
    batch: async () => {
      throw new Error(message)
    },
    paginate: async () => {
      throw new Error(message)
    },
    beginTransaction: thrower,
    commit: thrower,
    rollback: thrower,
    isInTransaction: () => false,
  }
}
