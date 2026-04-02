/**
 * Database Module Tests (Direct better-sqlite3)
 * Tests for database functionality without wrapper
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import Database from 'better-sqlite3'

describe('Database Module (Direct)', () => {
  let db: Database.Database

  beforeAll(() => {
    db = new Database('/tmp/direct-test-db.sqlite')
  })

  afterAll(() => {
    db.close()
  })

  describe('query operations', () => {
    it('should return typed rows', () => {
      const tableName = 'test_query_' + Math.random().toString(36).substring(7)

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, name TEXT)`)
      db.exec(`INSERT INTO ${tableName} (id, name) VALUES (?, ?)`, [1, 'Row 1'])

      const result = db.prepare(`SELECT * FROM ${tableName}`).all()

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('id')
      expect(result[0]).toHaveProperty('name')
    })
  })

  describe('data types', () => {
    it('should handle INTEGER types', () => {
      const tableName = 'test_type_int_' + Math.random().toString(36).substring(7)

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, int_val INTEGER)`)
      const insertStmt = db.prepare(`INSERT INTO ${tableName} (id, int_val) VALUES (?, ?)`)
      const insertResult = insertStmt.run(1, 42)
      console.error('[TEST INT] Insert result:', insertResult)

      const result = db.prepare(`SELECT * FROM ${tableName}`).all() as {
        id: number
        int_val: number
      }[]
      console.error('[TEST INT] Result length:', result.length)
      console.error('[TEST INT] Result:', result)
      expect(result).toHaveLength(1)
      expect(result[0].int_val).toBe(42)
    })

    it('should handle TEXT types', () => {
      const tableName = 'test_type_text_' + Math.random().toString(36).substring(7)

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, text_val TEXT)`)
      db.exec(`INSERT INTO ${tableName} (id, text_val) VALUES (?, ?)`, [1, 'Hello World'])

      const result = db.prepare(`SELECT * FROM ${tableName}`).all() as {
        id: number
        text_val: string
      }[]
      expect(result).toHaveLength(1)
      expect(result[0].text_val).toBe('Hello World')
    })

    it('should handle REAL/float types', () => {
      const tableName = 'test_type_real_' + Math.random().toString(36).substring(7)

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, real_val REAL)`)
      db.exec(`INSERT INTO ${tableName} (id, real_val) VALUES (?, ?)`, [1, 3.14])

      const result = db.prepare(`SELECT * FROM ${tableName}`).all() as {
        id: number
        real_val: number
      }[]
      expect(result).toHaveLength(1)
      expect(result[0].real_val).toBeCloseTo(3.14)
    })

    it('should handle BLOB types', () => {
      const tableName = 'test_type_blob_' + Math.random().toString(36).substring(7)

      db.exec(`CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, blob_val BLOB)`)
      const stmt = db.prepare(`INSERT INTO ${tableName} (id, blob_val) VALUES (?, ?)`)
      const blobData = Buffer.from('blob data')
      stmt.run(1, blobData)

      const result = db.prepare(`SELECT * FROM ${tableName}`).all() as {
        id: number
        blob_val: Buffer
      }[]
      expect(result).toHaveLength(1)
      expect(Buffer.isBuffer(result[0].blob_val) || result[0].blob_val instanceof Uint8Array).toBe(
        true
      )
    })
  })
})
