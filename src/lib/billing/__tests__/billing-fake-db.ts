/**
 * 计费服务测试用的**语义化内存数据库**
 *
 * 为什么不用全局假库（src/test/vi-mocks.ts）：
 *   全局假库对任意 SQL 都返回空结果集，且它的 SQL 解析器只覆盖
 *   `SELECT *` / 简单 INSERT-UPDATE，无法表达 SUM/AVG/GROUP BY，
 *   也没有 DECIMAL 语义 —— 用它测"金额累加是否浮点误差"根本测不出真东西。
 *
 * 这里用 **真实的 better-sqlite3 内存库**（DATABASE_PATH=':memory:'），
 * 建表结构对齐 src/lib/db/migrations/001_multi_tenant.sql，
 * 于是 GROUP BY / SUM / ORDER BY / LIMIT / OFFSET 全部是真实 SQL 语义。
 *
 * 对外暴露一个 DatabaseConnection 兼容对象，billing/service.ts 只用到
 * get / queryRows / exec 三个方法。
 */

import Database from 'better-sqlite3'
import type { DatabaseConnection, DatabaseResult, DatabaseStatement } from '@/lib/db/connection'

/**
 * 表结构 —— 对齐 001_multi_tenant.sql 的 billing 相关表。
 * 注意 plans 的 limits 用 snake_case（真实 seed 就是这样），
 * 由 billing/service.ts 的 normalizeLimits() 负责归一化。
 */
const SCHEMA = `
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  features TEXT,
  limits TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  current_period_start DATETIME,
  current_period_end DATETIME,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usage_records (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit_cost DECIMAL(10,4),
  total_cost DECIMAL(10,2),
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  subscription_id TEXT,
  status TEXT DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CNY',
  due_date DATETIME,
  paid_at DATETIME,
  items TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  invoice_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CNY',
  method TEXT,
  status TEXT,
  transaction_id TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`

export interface FakeDb {
  db: DatabaseConnection
  /** 直接查表（测试用），返回原始行 */
  raw<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[]
  /** 清空所有业务表（每个用例前调用） */
  reset(): void
  close(): void
}

/**
 * 建一个全新的语义化内存库 + 预置的计划种子数据。
 */
export function createFakeDb(): FakeDb {
  const sqlite = new Database(':memory:')
  sqlite.exec(SCHEMA)

  const db: DatabaseConnection = {
    query: (sql: string, params?: unknown[]) => {
      const stmt = sqlite.prepare(sql)
      if (sql.trim().toLowerCase().startsWith('select')) {
        return stmt.all(...(params ?? []))
      }
      const r = stmt.run(...(params ?? []))
      return { changes: r.changes, lastInsertRowid: Number(r.lastInsertRowid) }
    },
    queryRows: <T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] =>
      sqlite.prepare(sql).all(...(params ?? [])) as T[],
    get: <T = Record<string, unknown>>(sql: string, params?: unknown[]): T | null =>
      (sqlite.prepare(sql).get(...(params ?? [])) ?? null) as T | null,
    exec: (sql: string, params?: unknown[]): DatabaseResult => {
      if (!params || params.length === 0) {
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'))
        let changes = 0
        let lastInsertRowid: number | undefined
        for (const stmt of statements) {
          const r = sqlite.prepare(stmt).run()
          changes += r.changes
          if (r.lastInsertRowid !== undefined) lastInsertRowid = Number(r.lastInsertRowid)
        }
        return { changes, lastInsertRowid }
      }
      const r = sqlite.prepare(sql).run(...params)
      return { changes: r.changes, lastInsertRowid: Number(r.lastInsertRowid) }
    },
    prepare: (sql: string): DatabaseStatement => ({
      all: (...params: unknown[]) => sqlite.prepare(sql).all(...params),
      get: (...params: unknown[]) =>
        (sqlite.prepare(sql).get(...params) ?? null) as Record<string, unknown> | null,
      run: (...params: unknown[]) => {
        const r = sqlite.prepare(sql).run(...params)
        return { changes: r.changes, lastInsertRowid: Number(r.lastInsertRowid) }
      },
    }),
    pragma: () => undefined,
    batch: async (statements: Array<{ sql: string; params?: unknown[] }>) =>
      statements.map(s => {
        const r = sqlite.prepare(s.sql).run(...(s.params ?? []))
        return { changes: r.changes, lastInsertRowid: Number(r.lastInsertRowid) }
      }),
    beginTransaction: () => sqlite.exec('BEGIN'),
    commit: () => sqlite.exec('COMMIT'),
    rollback: () => sqlite.exec('ROLLBACK'),
    isInTransaction: () => sqlite.inTransaction,
  }

  return {
    db,
    raw: <T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] =>
      sqlite.prepare(sql).all(...(params ?? [])) as T[],
    reset: () => {
      sqlite.exec('DELETE FROM plans')
      sqlite.exec('DELETE FROM subscriptions')
      sqlite.exec('DELETE FROM usage_records')
      sqlite.exec('DELETE FROM invoices')
      sqlite.exec('DELETE FROM payments')
    },
    close: () => sqlite.close(),
  }
}

/**
 * 计划种子 —— 与 001_multi_tenant.sql 的 INSERT 完全一致（limits 用 snake_case）。
 */
export function seedPlans(fake: FakeDb): void {
  const rows: Array<{
    id: string
    name: string
    type: string
    price_monthly: number
    price_yearly: number
    features: string
    limits: string
  }> = [
    {
      id: 'plan_starter',
      name: 'Starter',
      type: 'subscription',
      price_monthly: 99.0,
      price_yearly: 990.0,
      features: JSON.stringify({ agents: 5, workflows: 10, storage: 10, support: 'email' }),
      limits: JSON.stringify({ ai_calls: 1000, workflow_runs: 100, storage_gb: 10 }),
    },
    {
      id: 'plan_professional',
      name: 'Professional',
      type: 'subscription',
      price_monthly: 299.0,
      price_yearly: 2990.0,
      features: JSON.stringify({ agents: 50, workflows: 100, storage: 100, support: 'priority' }),
      limits: JSON.stringify({ ai_calls: 10000, workflow_runs: 1000, storage_gb: 100 }),
    },
    {
      id: 'plan_enterprise',
      name: 'Enterprise',
      type: 'subscription',
      price_monthly: 999.0,
      price_yearly: 9990.0,
      features: JSON.stringify({
        agents: 'unlimited',
        workflows: 'unlimited',
        storage: 'unlimited',
        support: '24/7',
      }),
      limits: JSON.stringify({
        ai_calls: 'unlimited',
        workflow_runs: 'unlimited',
        storage_gb: 'unlimited',
      }),
    },
  ]

  const insert = fake.db.prepare(
    `INSERT INTO plans (id, name, type, price_monthly, price_yearly, features, limits)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  for (const row of rows) {
    insert.run(
      row.id,
      row.name,
      row.type,
      row.price_monthly,
      row.price_yearly,
      row.features,
      row.limits
    )
  }
}

/**
 * 直接插入一条订阅（绕过 service，用于构造"已存在订阅"的初始状态）。
 */
export function seedSubscription(
  fake: FakeDb,
  row: {
    id: string
    tenantId: string
    planId: string
    status: string
    currentPeriodStart: string
    currentPeriodEnd: string
    cancelAtPeriodEnd?: boolean
  }
): void {
  fake.db
    .prepare(
      `INSERT INTO subscriptions (
         id, tenant_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.id,
      row.tenantId,
      row.planId,
      row.status,
      row.currentPeriodStart,
      row.currentPeriodEnd,
      row.cancelAtPeriodEnd ? 1 : 0
    )
}
