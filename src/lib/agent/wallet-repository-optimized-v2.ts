/**
 * 智能体钱包数据仓库 - 优化版本 v2
 * Agent Wallet Repository - Database operations for agent wallets (Optimized v2)
 *
 * 优化点:
 * 1. 使用统一的查询构建器减少重复代码
 * 2. 使用 utils.ts 中的 generateId 替代本地实现
 * 3. 简化查询构建逻辑
 * 4. 保持向后兼容性
 */

import { getDatabaseAsync } from '../db';
import { buildWhereQuery } from '../db/query-builder';
import { generateId as generateIdUtil } from '../utils';
import {
  AgentWallet,
  WalletTransaction,
  TransactionType,
  TransactionStatus,
  WalletOperationRequest,
} from './types';

/**
 * 初始化钱包表 - Optimized with better indexes
 */
export async function initializeWalletTables(): Promise<void> {
  const db = await getDatabaseAsync();

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
  `;

  try {
    db.exec(schema);
  } catch (error) {
    if (!(error instanceof Error && error.message.includes('already exists'))) {
      throw error;
    }
  }
}

/**
 * 为智能体创建钱包
 */
export async function createWallet(agentId: string, currency: string = 'CNY'): Promise<AgentWallet> {
  const db = await getDatabaseAsync();
  await initializeWalletTables();

  const id = generateIdUtil('wallet');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO agent_wallets (id, agent_id, balance, currency, frozen_balance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, agentId, 0, currency, 0, now, now);

  return {
    id,
    agentId,
    balance: 0,
    currency,
    frozenBalance: 0,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };
}

/**
 * 根据智能体 ID 获取钱包
 */
export async function getWalletByAgentId(agentId: string): Promise<AgentWallet | null> {
  const db = await getDatabaseAsync();
  await initializeWalletTables();

  const stmt = db.prepare('SELECT * FROM agent_wallets WHERE agent_id = ?');
  const row = stmt.get(agentId) as Record<string, unknown> | undefined;

  if (!row) return null;

  return mapRowToWallet(row);
}

/**
 * 根据钱包 ID 获取钱包
 */
export async function getWalletById(id: string): Promise<AgentWallet | null> {
  const db = await getDatabaseAsync();
  await initializeWalletTables();

  const stmt = db.prepare('SELECT * FROM agent_wallets WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;

  if (!row) return null;

  return mapRowToWallet(row);
}

/**
 * 获取或创建钱包
 */
export async function getOrCreateWallet(agentId: string, currency: string = 'CNY'): Promise<AgentWallet> {
  const wallet = await getWalletByAgentId(agentId);
  if (wallet) return wallet;
  return createWallet(agentId, currency);
}

/**
 * 获取钱包余额
 */
export async function getWalletBalance(agentId: string): Promise<{ balance: number; frozen: number; available: number }> {
  const wallet = await getWalletByAgentId(agentId);
  if (!wallet) {
    return { balance: 0, frozen: 0, available: 0 };
  }
  const frozen = wallet.frozenBalance ?? 0;
  return {
    balance: wallet.balance,
    frozen,
    available: wallet.balance - frozen,
  };
}

/**
 * 创建交易记录
 */
async function createTransaction(
  walletId: string,
  type: TransactionType,
  amount: number,
  currency: string,
  options?: {
    fromWalletId?: string;
    toWalletId?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    status?: TransactionStatus;
  }
): Promise<WalletTransaction> {
  const db = await getDatabaseAsync();
  await initializeWalletTables();

  const id = generateIdUtil('tx');
  const now = new Date();

  const stmt = db.prepare(`
    INSERT INTO wallet_transactions (
      id, wallet_id, type, amount, currency, status, from_wallet_id, to_wallet_id, description, metadata, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    walletId,
    type,
    amount,
    currency,
    options?.status || TransactionStatus.PENDING,
    options?.fromWalletId || null,
    options?.toWalletId || null,
    options?.description || null,
    JSON.stringify(options?.metadata || {}),
    now.toISOString()
  );

  return {
    id,
    walletId,
    type,
    amount,
    currency,
    status: options?.status || TransactionStatus.PENDING,
    fromWalletId: options?.fromWalletId,
    toWalletId: options?.toWalletId,
    description: options?.description || '',
    metadata: options?.metadata || {},
    createdAt: now,
  };
}

/**
 * 更新钱包余额
 */
async function updateWalletBalance(walletId: string, delta: number): Promise<void> {
  const db = await getDatabaseAsync();

  const stmt = db.prepare(`
    UPDATE agent_wallets 
    SET balance = balance + ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(delta, new Date().toISOString(), walletId);
}

/**
 * 更新交易状态
 */
async function updateTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  completedAt?: Date
): Promise<void> {
  const db = await getDatabaseAsync();

  const stmt = db.prepare(`
    UPDATE wallet_transactions 
    SET status = ?, completed_at = ?
    WHERE id = ?
  `);

  stmt.run(status, completedAt?.toISOString() || null, transactionId);
}

/**
 * 存款
 */
export async function deposit(
  agentId: string,
  amount: number,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<WalletTransaction> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const wallet = await getOrCreateWallet(agentId);

  const transaction = await createTransaction(wallet.id, TransactionType.DEPOSIT, amount, wallet.currency, {
    description: description || '存款',
    metadata,
    status: TransactionStatus.PENDING,
  });

  try {
    await updateWalletBalance(wallet.id, amount);
    await updateTransactionStatus(transaction.id, TransactionStatus.COMPLETED, new Date());
    return { ...transaction, status: TransactionStatus.COMPLETED, completedAt: new Date() };
  } catch (error) {
    await updateTransactionStatus(transaction.id, TransactionStatus.FAILED);
    throw error;
  }
}

/**
 * 提款
 */
export async function withdraw(
  agentId: string,
  amount: number,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<WalletTransaction> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const wallet = await getWalletByAgentId(agentId);
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const available = wallet.balance - (wallet.frozenBalance ?? 0);
  if (available < amount) {
    throw new Error('Insufficient balance');
  }

  const transaction = await createTransaction(wallet.id, TransactionType.WITHDRAW, amount, wallet.currency, {
    description: description || '提款',
    metadata,
    status: TransactionStatus.PENDING,
  });

  try {
    await updateWalletBalance(wallet.id, -amount);
    await updateTransactionStatus(transaction.id, TransactionStatus.COMPLETED, new Date());
    return { ...transaction, status: TransactionStatus.COMPLETED, completedAt: new Date() };
  } catch (error) {
    await updateTransactionStatus(transaction.id, TransactionStatus.FAILED);
    throw error;
  }
}

/**
 * 转账
 */
export async function transfer(
  fromAgentId: string,
  toAgentId: string,
  amount: number,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<{ fromTransaction: WalletTransaction; toTransaction: WalletTransaction }> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (fromAgentId === toAgentId) {
    throw new Error('Cannot transfer to the same wallet');
  }

  const fromWallet = await getWalletByAgentId(fromAgentId);
  if (!fromWallet) {
    throw new Error('Source wallet not found');
  }

  const available = fromWallet.balance - (fromWallet.frozenBalance ?? 0);
  if (available < amount) {
    throw new Error('Insufficient balance');
  }

  const toWallet = await getOrCreateWallet(toAgentId, fromWallet.currency);

  // 创建转出交易
  const fromTransaction = await createTransaction(
    fromWallet.id,
    TransactionType.TRANSFER,
    amount,
    fromWallet.currency,
    {
      toWalletId: toWallet.id,
      description: description || `转账至 ${toAgentId}`,
      metadata,
      status: TransactionStatus.PENDING,
    }
  );

  // 创建转入交易
  const toTransaction = await createTransaction(toWallet.id, TransactionType.TRANSFER, amount, toWallet.currency, {
    fromWalletId: fromWallet.id,
    description: description || `来自 ${fromAgentId} 的转账`,
    metadata,
    status: TransactionStatus.PENDING,
  });

  try {
    // 执行转账
    await updateWalletBalance(fromWallet.id, -amount);
    await updateWalletBalance(toWallet.id, amount);

    // 更新交易状态
    await updateTransactionStatus(fromTransaction.id, TransactionStatus.COMPLETED, new Date());
    await updateTransactionStatus(toTransaction.id, TransactionStatus.COMPLETED, new Date());

    return {
      fromTransaction: { ...fromTransaction, status: TransactionStatus.COMPLETED, completedAt: new Date() },
      toTransaction: { ...toTransaction, status: TransactionStatus.COMPLETED, completedAt: new Date() },
    };
  } catch (error) {
    await updateTransactionStatus(fromTransaction.id, TransactionStatus.FAILED);
    await updateTransactionStatus(toTransaction.id, TransactionStatus.FAILED);
    throw error;
  }
}

/**
 * 消费
 */
export async function consume(
  agentId: string,
  amount: number,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<WalletTransaction> {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const wallet = await getWalletByAgentId(agentId);
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const available = wallet.balance - (wallet.frozenBalance ?? 0);
  if (available < amount) {
    throw new Error('Insufficient balance');
  }

  const transaction = await createTransaction(wallet.id, TransactionType.CONSUME, amount, wallet.currency, {
    description: description || '消费',
    metadata,
    status: TransactionStatus.PENDING,
  });

  try {
    await updateWalletBalance(wallet.id, -amount);
    await updateTransactionStatus(transaction.id, TransactionStatus.COMPLETED, new Date());
    return { ...transaction, status: TransactionStatus.COMPLETED, completedAt: new Date() };
  } catch (error) {
    await updateTransactionStatus(transaction.id, TransactionStatus.FAILED);
    throw error;
  }
}

/**
 * 奖励
 */
export async function reward(
  agentId: string,
  amount: number,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<WalletTransaction> {
  return deposit(agentId, amount, description || '奖励', { ...metadata, type: 'reward' });
}

/**
 * 退款
 */
export async function refund(
  agentId: string,
  amount: number,
  description?: string,
  metadata?: Record<string, unknown>
): Promise<WalletTransaction> {
  return deposit(agentId, amount, description || '退款', { ...metadata, type: 'refund' });
}

/**
 * 冻结余额
 */
export async function freezeBalance(agentId: string, amount: number): Promise<AgentWallet | null> {
  const db = await getDatabaseAsync();
  await initializeWalletTables();

  const wallet = await getWalletByAgentId(agentId);
  if (!wallet) return null;

  const available = wallet.balance - (wallet.frozenBalance ?? 0);
  if (available < amount) {
    throw new Error('Insufficient available balance');
  }

  const stmt = db.prepare(`
    UPDATE agent_wallets 
    SET frozen_balance = frozen_balance + ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(amount, new Date().toISOString(), wallet.id);

  return getWalletById(wallet.id);
}

/**
 * 解冻余额
 */
export async function unfreezeBalance(agentId: string, amount: number): Promise<AgentWallet | null> {
  const db = await getDatabaseAsync();
  await initializeWalletTables();

  const wallet = await getWalletByAgentId(agentId);
  if (!wallet) return null;

  if ((wallet.frozenBalance ?? 0) < amount) {
    throw new Error('Insufficient frozen balance');
  }

  const stmt = db.prepare(`
    UPDATE agent_wallets 
    SET frozen_balance = frozen_balance - ?, updated_at = ?
    WHERE id = ?
  `);

  stmt.run(amount, new Date().toISOString(), wallet.id);

  return getWalletById(wallet.id);
}

/**
 * 获取交易记录 - 使用查询构建器优化
 *
 * 优化点:
 * 1. 使用统一的 buildWhereQuery 函数
 * 2. 减少重复的条件构建代码
 * 3. 自动处理索引优化
 */
export async function getTransactions(
  agentId: string,
  options?: {
    type?: TransactionType;
    status?: TransactionStatus;
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<WalletTransaction[]> {
  const db = await getDatabaseAsync();
  await initializeWalletTables();

  const wallet = await getWalletByAgentId(agentId);
  if (!wallet) return [];

  // 使用查询构建器 - 自动处理条件、排序和分页
  const { sql, params } = buildWhereQuery(
    'wallet_transactions',
    {
      wallet_id: wallet.id,
      status: options?.status,
      type: options?.type,
    },
    {
      orderBy: 'created_at',
      sortOrder: 'DESC',
      limit: options?.limit,
      offset: options?.offset,
    }
  );

  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as unknown as Record<string, unknown>[];

  // 过滤日期范围 (后处理,因为日期条件比较复杂)
  let transactions = rows.map(mapRowToTransaction);

  if (options?.startDate || options?.endDate) {
    transactions = transactions.filter(tx => {
      if (options.startDate && tx.createdAt < options.startDate) return false;
      if (options.endDate && tx.createdAt > options.endDate) return false;
      return true;
    });
  }

  return transactions;
}

/**
 * 获取钱包统计 - Optimized to avoid N+1 queries
 * 
 * 优化: 将统计和计数查询合并为 1 个查询
 */
export async function getWalletStats(agentId: string): Promise<{
  balance: number;
  frozen: number;
  available: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalConsumed: number;
  totalRewards: number;
  transactionCount: number;
}> {
  const wallet = await getWalletByAgentId(agentId);
  if (!wallet) {
    return {
      balance: 0,
      frozen: 0,
      available: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalConsumed: 0,
      totalRewards: 0,
      transactionCount: 0,
    };
  }

  const db = await getDatabaseAsync();

  // 单次查询获取所有统计信息 - 使用条件聚合
  const stmt = db.prepare(`
    SELECT
      COUNT(*) as transactionCount,
      SUM(CASE WHEN type = ? AND status = 'completed' THEN amount ELSE 0 END) as totalDeposits,
      SUM(CASE WHEN type = ? AND status = 'completed' THEN amount ELSE 0 END) as totalWithdrawals,
      SUM(CASE WHEN type = ? AND status = 'completed' THEN amount ELSE 0 END) as totalConsumed,
      SUM(CASE WHEN type = ? AND status = 'completed' THEN amount ELSE 0 END) as totalRewards
    FROM wallet_transactions
    WHERE wallet_id = ?
  `);

  const row = stmt.get(
    TransactionType.DEPOSIT,
    TransactionType.WITHDRAW,
    TransactionType.CONSUME,
    TransactionType.REWARD,
    wallet.id
  ) as {
    transactionCount: number;
    totalDeposits: number;
    totalWithdrawals: number;
    totalConsumed: number;
    totalRewards: number;
  };

  return {
    balance: wallet.balance,
    frozen: wallet.frozenBalance ?? 0,
    available: wallet.balance - (wallet.frozenBalance ?? 0),
    totalDeposits: row.totalDeposits || 0,
    totalWithdrawals: row.totalWithdrawals || 0,
    totalConsumed: row.totalConsumed || 0,
    totalRewards: row.totalRewards || 0,
    transactionCount: row.transactionCount || 0,
  };
}

/**
 * 映射数据库行到 Wallet 对象
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
  };
}

/**
 * 映射数据库行到 Transaction 对象
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
    description: row.description as string || "",
    metadata: JSON.parse(row.metadata as string || '{}'),
    createdAt: new Date(row.created_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
  };
}
