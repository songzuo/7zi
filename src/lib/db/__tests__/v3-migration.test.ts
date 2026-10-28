/**
 * Test v3 migration - Add critical indexes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// 本文件测的是**真实 better-sqlite3 语义**（真建表、真迁移、真索引）。
// 全局 setup（src/test/vi-mocks.ts）把 db/connection 换成了内存假库，
// 而假库的 INSERT 只认 `INSERT INTO <table> (cols) VALUES (?, ?)`，
// 不认 migrations.ts 用的 `INSERT OR REPLACE INTO migrations (key, value, updated_at)
// VALUES ('version', ?, ?)` —— 迁移版本写不进去，getCurrentVersion() 恒为 0。
// 这里必须显式 unmock 才能测到真实实现（同 index.test.ts）。
vi.unmock('@/lib/db/index')
vi.unmock('@/lib/db/connection')
vi.unmock('../index')
vi.unmock('../connection')

import { MIGRATIONS, getCurrentVersion } from '../migrations'
import { getDatabaseAsync } from '../index'

/**
 * better-sqlite3 的 `exec()` **只接受单条语句** —— 传多条会抛
 * "The supplied SQL string contains more than one statement"。
 * 这里把多语句 DDL 拆开逐条执行。
 */
function execAll(db: { exec: (sql: string) => void }, sql: string): void {
  for (const stmt of sql.split(';')) {
    const trimmed = stmt.trim()
    if (trimmed) {
      db.exec(trimmed)
    }
  }
}

// v3 迁移对象（只测 v3，不触发后续版本迁移）
const v3Migration = MIGRATIONS.find((m) => m.version === 3)

describe('v3 Migration - Critical Indexes', () => {
  beforeEach(async () => {
    // Use in-memory database for tests
    process.env.DATABASE_PATH = ':memory:'

    // :memory: 库在**同一个连接**上跨用例共享，上一个用例插的
    // agent-1 还在 → 这个用例再插一次就撞 UNIQUE constraint。
    // 所以每个用例前把上一轮的数据清掉。
    const db = await getDatabaseAsync()
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
      .all() as Array<{ name: string }>
    // 清数据前先关掉外键检查 —— 否则先删父表会让子表的
    // FOREIGN KEY constraint failed。
    db.exec('PRAGMA foreign_keys = OFF')
    for (const { name } of tables) {
      db.exec(`DELETE FROM "${name}"`)
    }
    db.exec('PRAGMA foreign_keys = ON')
  })

  afterEach(async () => {
    // Clean up environment
    delete process.env.DATABASE_PATH
  })

  describe('v3 migration execution', () => {
    it('should run v3 migration and create all critical indexes', async () => {
      const db = await getDatabaseAsync()

      // Initialize migrations table
      execAll(db, `
        CREATE TABLE IF NOT EXISTS migrations (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `)

      // Create necessary tables for v3 migration
      execAll(db, `
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          provider TEXT,
          type TEXT,
          status TEXT DEFAULT 'active',
          last_active_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agent_tokens (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          token TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS user_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          is_system INTEGER DEFAULT 0,
          permissions TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agent_wallets (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          currency TEXT NOT NULL,
          balance REAL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id TEXT PRIMARY KEY,
          wallet_id TEXT NOT NULL,
          type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          amount REAL NOT NULL,
          -- v3 迁移要建 idx_wallet_transactions_currency_status(currency, status)，
          -- schema 里必须真的有 currency 列，否则建索引时报 "no such column: currency"。
          currency TEXT DEFAULT 'USD',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (wallet_id) REFERENCES agent_wallets(id)
        );

        CREATE TABLE IF NOT EXISTS agent_data_access (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT NOT NULL,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );
      `)

      // Insert test data
      db.prepare(
        `INSERT INTO agents (id, name, provider, type, status, last_active_at) VALUES (?, ?, ?, ?, ?, ?)`
      ).run('agent-1', 'Test Agent', 'openai', 'assistant', 'active', new Date().toISOString())

      db.prepare(
        `INSERT INTO agent_tokens (id, agent_id, token, expires_at) VALUES (?, ?, ?, ?)`
      ).run('token-1', 'agent-1', 'test-token-1', new Date(Date.now() + 86400000).toISOString())

      db.prepare(
        `INSERT INTO user_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`
      ).run('user-token-1', 'user-1', 'user-token', new Date(Date.now() + 86400000).toISOString())

      db.prepare(`INSERT INTO roles (id, name, is_system) VALUES (?, ?, ?)`).run(
        'role-1',
        'admin',
        1
      )

      db.prepare(
        `INSERT INTO agent_wallets (id, agent_id, currency, balance) VALUES (?, ?, ?, ?)`
      ).run('wallet-1', 'agent-1', 'USD', 100.0)

      // 只跑 v3 迁移本身 —— migrate() 会跑**全部** 7 个版本，
      // 而 v6 需要 feedbacks/ratings 表，v3 测试并不该为此建一堆无关表。
      const v3 = v3Migration
      expect(v3).toBeDefined()
      await v3!.up()

      // v3 迁移的真实契约：建 6 个关键索引。
      // （版本号是由 migrate() 统一写入 migrations 表的，不是 v3.up() 的职责。）
      for (const indexName of [
        'idx_agent_tokens_agent_expires',
        'idx_user_tokens_user_expires',
        'idx_roles_name',
        'idx_roles_is_system',
        'idx_agent_wallets_currency',
        'idx_wallet_transactions_currency_status',
      ]) {
        const row = db
          .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name = ?")
          .get(indexName)
        expect(row, `missing index ${indexName}`).toBeDefined()
      }
    })

    it('should create all v3 critical indexes', async () => {
      const db = await getDatabaseAsync()

      // Initialize migrations table
      execAll(db, `
        CREATE TABLE IF NOT EXISTS migrations (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `)

      // Create necessary tables for v3 migration
      execAll(db, `
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          provider TEXT,
          type TEXT,
          status TEXT DEFAULT 'active',
          last_active_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agent_tokens (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          token TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS user_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          is_system INTEGER DEFAULT 0,
          permissions TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agent_wallets (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          currency TEXT NOT NULL,
          balance REAL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id TEXT PRIMARY KEY,
          wallet_id TEXT NOT NULL,
          type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          amount REAL NOT NULL,
          -- v3 迁移要建 idx_wallet_transactions_currency_status(currency, status)，
          -- schema 里必须真的有 currency 列，否则建索引时报 "no such column: currency"。
          currency TEXT DEFAULT 'USD',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (wallet_id) REFERENCES agent_wallets(id)
        );

        CREATE TABLE IF NOT EXISTS agent_data_access (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT NOT NULL,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );
      `)

      // getDatabaseAsync() 返回的是**同一个**内存库实例，schema 跨用例共享；
      // 而 CREATE TABLE IF NOT EXISTS 对已存在的表不会补列。
      // 这里兜底补上 v3 索引需要的 currency 列。
      try {
        db.exec('ALTER TABLE wallet_transactions ADD COLUMN currency TEXT DEFAULT \'USD\'')
      } catch {
        // 列已存在
      }

      // Run migrations
      const v3 = v3Migration
      expect(v3).toBeDefined()
      await v3!.up()

      const expectedIndexes = [
        'idx_agent_tokens_agent_expires',
        'idx_user_tokens_user_expires',
        'idx_roles_name',
        'idx_roles_is_system',
        'idx_agent_wallets_currency',
      ]

      for (const indexName of expectedIndexes) {
        const result = db
          .prepare(
            `
          SELECT name FROM sqlite_master
          WHERE type='index' AND name = ?
        `
          )
          .get(indexName)

        expect(result).toBeDefined()
      }
    })

    it('should preserve v2 indexes after v3 migration', async () => {
      const db = await getDatabaseAsync()

      // Initialize migrations table
      execAll(db, `
        CREATE TABLE IF NOT EXISTS migrations (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `)

      // Create necessary tables
      execAll(db, `
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          provider TEXT,
          type TEXT,
          status TEXT DEFAULT 'active',
          last_active_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agent_tokens (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          token TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS user_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          is_system INTEGER DEFAULT 0,
          permissions TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agent_wallets (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          currency TEXT NOT NULL,
          balance REAL DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );

        CREATE TABLE IF NOT EXISTS wallet_transactions (
          id TEXT PRIMARY KEY,
          wallet_id TEXT NOT NULL,
          type TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          amount REAL NOT NULL,
          -- v3 迁移要建 idx_wallet_transactions_currency_status(currency, status)，
          -- schema 里必须真的有 currency 列，否则建索引时报 "no such column: currency"。
          currency TEXT DEFAULT 'USD',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (wallet_id) REFERENCES agent_wallets(id)
        );

        CREATE TABLE IF NOT EXISTS agent_data_access (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT NOT NULL,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (agent_id) REFERENCES agents(id)
        );
      `)

      // Run migrations
      const v3 = v3Migration
      expect(v3).toBeDefined()
      await v3!.up()

      const v2Indexes = [
        'idx_agents_status_provider',
        'idx_agents_status_type',
        'idx_agents_last_active',
        'idx_agent_tokens_expires',
        'idx_agent_data_access_agent_timestamp',
        'idx_agent_data_access_resource',
        'idx_wallet_transactions_wallet_status',
        'idx_wallet_transactions_wallet_created',
        'idx_wallet_transactions_type_status',
      ]

      for (const indexName of v2Indexes) {
        const result = db
          .prepare(
            `
          SELECT name FROM sqlite_master
          WHERE type='index' AND name = ?
        `
          )
          .get(indexName)

        expect(result).toBeDefined()
      }
    })
  })
})
