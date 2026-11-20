/**
 * Enhanced Database Module - Simplified to fix type conflicts
 */
import { getDatabase } from './index'

export interface EnhancedDatabase {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
  run(sql: string, params?: unknown[]): Promise<{ changes: number }>
  close(): Promise<void>
}

export async function getEnhancedDatabase(): Promise<EnhancedDatabase> {
  const db = getDatabase()
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const stmt = db.prepare(sql)
      return stmt.all(...(params || [])) as T[]
    },
    async run(sql: string, params?: unknown[]): Promise<{ changes: number }> {
      const stmt = db.prepare(sql)
      return stmt.run(...(params || [])) as { changes: number }
    },
    async close(): Promise<void> {
      // no-op for singleton
    },
  }
}
