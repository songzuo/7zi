/**
 * PATCH 3: 批量查询优化 - 钱包交易记录
 *
 * 文件: src/lib/agents/wallet-repository.ts
 * 问题: 获取多个钱包的交易时需要 N 次查询
 * 优化: 使用 UNION ALL 或 IN 子句批量查询，减少到 1 次查询
 */

import { getDatabaseAsync } from '../db'
import { buildWhereQuery } from '../db/query-builder'
import { generateId as generateIdUtil } from '../utils'
import {
  AgentWallet,
  WalletTransaction,
  TransactionType,
  TransactionStatus,
  WalletOperationRequest,
} from './types'

/**
 * 批量交易查询选项
 */
export interface BatchTransactionOptions {
  limit?: number
  offset?: number
  status?: TransactionStatus
  type?: TransactionType
  startDate?: Date
  endDate?: Date
}

/**
 * 初始化钱包表 - Optimized with better indexes
 */
export async function initializeWalletTables(): Promise<void> {
  const db = await getDatabaseAsync()

  const schema = `
    -- 智能体钱包表
    CREATE TABLE IF NOT EXISTS agent_wallets (
      id TEXT PRIMARY KEY,
      agent_id TEXT UNIQUE NOT NULL,
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'CNY',
      frozen_balance REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    -- 钱包交易记录表
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      wallet_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'CNY',
      status TEXT NOT NULL DEFAULT 'pending',
      from_wallet_id TEXT,
      to_wallet_id TEXT,
      description TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (wallet_id) REFERENCES agent_wallets(id) ON DELETE CASCADE
    );

    -- Optimized indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_agent_wallets_agent_id ON agent_wallets(agent_id);

    -- Transaction indexes
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

    -- Composite indexes for common query patterns
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_status ON wallet_transactions(wallet_id, status);
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_created ON wallet_transactions(wallet_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type_status ON wallet_transactions(type, status);
  `

  try {
    db.exec(schema)
  } catch (error) {
    if (!(error instanceof Error && error.message.includes('already exists'))) {
      throw error
    }
  }
}

/**
 * 为智能体创建钱包
 */
export async function createWallet(
  agentId: string,
  currency: string = 'CNY'
): Promise<AgentWallet> {
  const db = await getDatabaseAsync()
  await initializeWalletTables()

  const id = generateIdUtil('wallet')
  const now = new Date().toISOString()

  const stmt = db.prepare(`
    INSERT INTO agent_wallets (id, agent_id, balance, currency, frozen_balance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  stmt.run(id, agentId, 0, currency, 0, now, now)

  return {
    id,
    agentId,
    balance: 0,
    currency,
    frozenBalance: 0,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  }
}

/**
 * 根据智能体 ID 获取钱包
 */
export async function getWalletByAgentId(agentId: string): Promise<AgentWallet | null> {
  const db = await getDatabaseAsync()
  await initializeWalletTables()

  const stmt = db.prepare('SELECT * FROM agent_wallets WHERE agent_id = ?')
  const row = stmt.get(agentId) as Record<string, unknown> | undefined

  if (!row) return null

  return mapRowToWallet(row)
}

/**
 * 根据钱包 ID 获取钱包
 */
export async function getWalletById(id: string): Promise<AgentWallet | null> {
  const db = await getDatabaseAsync()
  await initializeWalletTables()

  const stmt = db.prepare('SELECT * FROM agent_wallets WHERE id = ?')
  const row = stmt.get(id) as Record<string, unknown> | undefined

  if (!row) return null

  return mapRowToWallet(row)
}

/**
 * 获取或创建钱包
 */
export async function getOrCreateWallet(
  agentId: string,
  currency: string = 'CNY'
): Promise<AgentWallet> {
  const wallet = await getWalletByAgentId(agentId)
  if (wallet) return wallet
  return createWallet(agentId, currency)
}

/**
 * 获取钱包余额
 */
export async function getWalletBalance(
  agentId: string
): Promise<{ balance: number; frozen: number; available: number }> {
  const wallet = await getWalletByAgentId(agentId)
  if (!wallet) {
    return { balance: 0, frozen: 0, available: 0 }
  }
  return {
    balance: wallet.balance,
    frozen: wallet.frozenBalance,
    available: wallet.balance - wallet.frozenBalance,
  }
}

/**
 * 获取单个钱包的交易记录
 */
export async function getWalletTransactions(
  walletId: string,
  options?: BatchTransactionOptions
): Promise<WalletTransaction[]> {
  const db = await getDatabaseAsync()
  await initializeWalletTables()

  let sql = 'SELECT * FROM wallet_transactions WHERE wallet_id = ?'
  const params: (string | number)[] = [walletId]

  if (options?.status) {
    sql += ' AND status = ?'
    params.push(options.status)
  }
  if (options?.type) {
    sql += ' AND type = ?'
    params.push(options.type)
  }
  if (options?.startDate) {
    sql += ' AND created_at >= ?'
    params.push(options.startDate.toISOString())
  }
  if (options?.endDate) {
    sql += ' AND created_at <= ?'
    params.push(options.endDate.toISOString())
  }

  sql += ' ORDER BY created_at DESC'

  if (options?.limit) {
    sql += ' LIMIT ?'
    params.push(options.limit)
  }
  if (options?.offset) {
    sql += ' OFFSET ?'
    params.push(options.offset)
  }

  const stmt = db.prepare(sql)
  const rows = stmt.all(...params) as unknown as Record<string, unknown>[]

  return rows.map(mapRowToTransaction)
}

/**
 * 批量获取多个钱包的交易记录 - OPTIMIZED
 *
 * 优化点:
 * 1. 使用 IN 子句批量查询，从 N 次减少到 1 次
 * 2. 结果按钱包 ID 分组，便于使用
 * 3. 支持过滤条件和分页
 *
 * 使用场景: 获取多个智能体的钱包交易历史
 *
 * @param walletIds - 钱包 ID 数组
 * @param options - 查询选项
 * @returns Map<walletId, transactions[]> - 按钱包 ID 分组的交易记录
 *
 * @example
 * // 获取 10 个智能体的钱包交易
 * const agents = await getAllAgents({ limit: 10 });
 * const walletIds = agents.map(a => a.walletId).filter(Boolean);
 * const transactions = await getWalletTransactionsBatch(walletIds, { limit: 5 });
 *
 * // 访问特定钱包的交易
 * const agentTx = transactions.get(walletIds[0]) || [];
 */
export async function getWalletTransactionsBatch(
  walletIds: string[],
  options?: BatchTransactionOptions
): Promise<Map<string, WalletTransaction[]>> {
  if (walletIds.length === 0) {
    return new Map()
  }

  const db = await getDatabaseAsync()
  await initializeWalletTables()

  // 构建批量查询
  const placeholders = walletIds.map(() => '?').join(', ')
  let sql = `
    SELECT * FROM wallet_transactions
    WHERE wallet_id IN (${placeholders})
  `

  const params: (string | number)[] = [...walletIds]

  if (options?.status) {
    sql += ' AND status = ?'
    params.push(options.status)
  }
  if (options?.type) {
    sql += ' AND type = ?'
    params.push(options.type)
  }
  if (options?.startDate) {
    sql += ' AND created_at >= ?'
    params.push(options.startDate.toISOString())
  }
  if (options?.endDate) {
    sql += ' AND created_at <= ?'
    params.push(options.endDate.toISOString())
  }

  sql += ' ORDER BY wallet_id, created_at DESC'

  // 注意: 分页限制适用于每个钱包还是总数？
  // 这里实现为: 每个钱包最多返回 limit 条记录
  // 如果需要全局限制，需要在应用层过滤

  const stmt = db.prepare(sql)
  const rows = stmt.all(...params) as unknown as Record<string, unknown>[]

  // 按钱包 ID 分组
  const result = new Map<string, WalletTransaction[]>()

  // 初始化所有钱包的空数组
  for (const walletId of walletIds) {
    result.set(walletId, [])
  }

  // 按钱包分组交易
  for (const row of rows) {
    const walletId = row.wallet_id as string
    const transactions = result.get(walletId) || []
    transactions.push(mapRowToTransaction(row))
    result.set(walletId, transactions)
  }

  // 应用分页限制（每个钱包）
  if (options?.limit && options.limit > 0) {
    for (const [walletId, transactions] of result.entries()) {
      if (transactions.length > options.limit) {
        result.set(walletId, transactions.slice(0, options.limit))
      }
    }
  }

  return result
}

/**
 * 获取多个钱包的交易记录（聚合版本） - OPTIMIZED
 *
 * 与 getWalletTransactionsBatch 的区别:
 * - getWalletTransactionsBatch: 返回 Map<walletId, transactions[]>，适合按钱包展示
 * - getWalletTransactionsAggregated: 返回扁平数组，适合混合展示
 *
 * @param walletIds - 钱包 ID 数组
 * @param options - 查询选项
 * @returns 所有钱包的交易记录（扁平数组，按时间排序）
 */
export async function getWalletTransactionsAggregated(
  walletIds: string[],
  options?: BatchTransactionOptions
): Promise<{ transactions: WalletTransaction[]; walletMap: Map<string, AgentWallet> }> {
  if (walletIds.length === 0) {
    return { transactions: [], walletMap: new Map() }
  }

  const db = await getDatabaseAsync()
  await initializeWalletTables()

  // 获取钱包信息
  const placeholders = walletIds.map(() => '?').join(', ')
  const walletStmt = db.prepare(`SELECT * FROM agent_wallets WHERE id IN (${placeholders})`)
  const walletRows = walletStmt.all(...walletIds) as unknown as Record<string, unknown>[]
  const walletMap = new Map<string, AgentWallet>()

  for (const row of walletRows) {
    const wallet = mapRowToWallet(row)
    walletMap.set(wallet.id, wallet)
  }

  // 获取交易记录
  let sql = `
    SELECT * FROM wallet_transactions
    WHERE wallet_id IN (${placeholders})
  `

  const params: (string | number)[] = [...walletIds]

  if (options?.status) {
    sql += ' AND status = ?'
    params.push(options.status)
  }
  if (options?.type) {
    sql += ' AND type = ?'
    params.push(options.type)
  }
  if (options?.startDate) {
    sql += ' AND created_at >= ?'
    params.push(options.startDate.toISOString())
  }
  if (options?.endDate) {
    sql += ' AND created_at <= ?'
    params.push(options.endDate.toISOString())
  }

  sql += ' ORDER BY created_at DESC'

  if (options?.limit) {
    sql += ' LIMIT ?'
    params.push(options.limit)
  }
  if (options?.offset) {
    sql += ' OFFSET ?'
    params.push(options.offset)
  }

  const stmt = db.prepare(sql)
  const rows = stmt.all(...params) as unknown as Record<string, unknown>[]

  const transactions = rows.map(mapRowToTransaction)

  return { transactions, walletMap }
}

// ... [其余函数保持不变: createTransaction, updateWalletBalance, etc.] ...

/**
 * Helper: Map database row to AgentWallet object
 */
function mapRowToWallet(row: Record<string, unknown>): AgentWallet {
  return {
    id: row.id as string,
    agentId: row.agent_id as string,
    balance: row.balance as number,
    currency: row.currency as string,
    frozenBalance: row.frozen_balance as number,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Helper: Map database row to WalletTransaction object
 */
function mapRowToTransaction(row: Record<string, unknown>): WalletTransaction {
  return {
    id: row.id as string,
    walletId: row.wallet_id as string,
    type: row.type as TransactionType,
    amount: row.amount as number,
    currency: row.currency as string,
    status: row.status as TransactionStatus,
    fromWalletId: row.from_wallet_id as string | undefined,
    toWalletId: row.to_wallet_id as string | undefined,
    description: row.description as string | undefined,
    metadata: JSON.parse((row.metadata as string) || '{}'),
    createdAt: new Date(row.created_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
  }
}
