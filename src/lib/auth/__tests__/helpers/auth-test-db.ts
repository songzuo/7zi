/**
 * Test-only helper: provides a **real** in-memory SQLite database for the
 * `src/lib/auth` test files.
 *
 * Why this exists
 * ---------------
 * The global test setup (`src/test/vi-mocks.ts`) replaces `src/lib/db` with a
 * hand written, *simplified* SQL executor. That executor only understands a
 * couple of hard-coded WHERE shapes (`workflow_id = ?`) and does not implement
 * generic `WHERE`, `IN (...)` or literal `OFFSET` handling. Production code in
 * `src/lib/auth` (audit-logger / token-blacklist / enhanced-permissions) uses
 * all of those, so the mock silently returned **all rows regardless of the
 * filter**, which made 11 pre-existing tests fail for the wrong reason.
 *
 * Instead of weakening those tests, the auth suites opt into a real
 * `better-sqlite3` in-memory database. Each test file gets its own database
 * instance (created by the `vi.mock` factory), so there is no cross-file or
 * cross-test state pollution either.
 */

import Database from 'better-sqlite3'
import type { DatabaseConnection, DatabaseResult, DatabaseStatement } from '@/lib/db/connection'

type SqlParams = unknown[]

function createConnection(): DatabaseConnection {
  const db = new Database(':memory:')

  const prepare = (sql: string): DatabaseStatement => {
    const stmt = db.prepare(sql)
    return {
      run: (...params: SqlParams): DatabaseResult => {
        const result = stmt.run(...(params as never[]))
        return {
          changes: result.changes,
          lastInsertRowid: Number(result.lastInsertRowid),
        }
      },
      get: (...params: SqlParams) => (stmt.get(...(params as never[])) as Record<string, unknown>) ?? null,
      all: (...params: SqlParams) => stmt.all(...(params as never[])) as Record<string, unknown>[],
    }
  }

  const connection: DatabaseConnection = {
    query: (sql: string, params?: unknown[]) => {
      const rows = db.prepare(sql).all(...((params ?? []) as never[]))
      return Array.isArray(rows) ? rows : []
    },
    queryRows: <T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] => {
      const rows = db.prepare(sql).all(...((params ?? []) as never[]))
      return (Array.isArray(rows) ? rows : []) as T[]
    },
    get: <T = Record<string, unknown>>(sql: string, params?: unknown[]): T | null => {
      const row = db.prepare(sql).get(...((params ?? []) as never[]))
      return (row as T | undefined) ?? null
    },
    exec: (sql: string): DatabaseResult => {
      db.exec(sql)
      return { changes: 0 }
    },
    prepare,
    pragma: (name: string, options?: { simple: boolean }) => db.pragma(name, options),
    getConnection: () => db,
    batch: async (statements: Array<{ sql: string; params?: unknown[] }>) => {
      const results: DatabaseResult[] = []
      const transaction = db.transaction((items: Array<{ sql: string; params?: unknown[] }>) => {
        for (const item of items) {
          const info = db.prepare(item.sql).run(...((item.params ?? []) as never[]))
          results.push({ changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid) })
        }
      })
      transaction(statements)
      return results
    },
    beginTransaction: () => db.exec('BEGIN'),
    commit: () => db.exec('COMMIT'),
    rollback: () => db.exec('ROLLBACK'),
    isInTransaction: () => db.inTransaction,
  }

  return connection
}

/**
 * Build the mocked `src/lib/db` module for a single auth test file.
 * The returned object only implements the surface that `src/lib/auth` uses.
 */
export function createAuthTestDbModule(): Record<string, unknown> {
  const connection = createConnection()

  return {
    db: connection,
    getDatabase: () => connection,
    getDatabaseAsync: async () => connection,
    closeDatabase: () => {
      /* the in-memory database lives for the lifetime of the test file */
    },
    getDatabaseStats: () => ({}),
    vacuumDatabase: async () => ({}),
    analyzeDatabase: async () => ({}),
    getDatabaseSize: async () => 0,
    migrate: async () => ({}),
    optimizeDatabase: async () => ({}),
    getDatabaseHealth: async () => ({}),
    default: {
      getDatabase: () => connection,
      getDatabaseAsync: async () => connection,
      closeDatabase: () => {
        /* no-op */
      },
    },
  }
}
