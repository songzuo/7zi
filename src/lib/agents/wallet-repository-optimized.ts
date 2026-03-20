/**
 * 优化的钱包数据仓库
 * Optimized Wallet Repository with caching and N+1 query fixes
 */

import { getDatabaseAsync } from '../db';
import {
  AgentWallet,
  WalletTransaction,
  TransactionType,
  TransactionStatus,
} from './types';
import { cachedQuery, CacheKeyGenerator, CacheInvalidator } from '../db/cache';
import {
  createTransaction as _createTransaction,
  updateTransactionStatus as _updateTransactionStatus,
} from './wallet-repository';

/**
 * 生成唯一ID
 */
function generateId(prefix: string = 'wallet'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 初始化钱包表
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
    CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_type_status ON wallet_transactions(wallet_id, type, status);
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
 * 根据智能体 ID 获取钱包 - with caching
 */
export async function getWalletByAgentId(agentId: string): Promise<AgentWallet | null> {
  return cachedQuery(
    CacheKeyGenerator.walletKey(agentId),
    async () => {
      const db = await getDatabaseAsync();
      await initializeWalletTables();

      const stmt = db.prepare('SELECT * FROM agent_wallets WHERE agent_id = ?');
      const row = stmt.get(agentId) as Record<string, unknown> | undefined;

      if (!row) return null;

      return mapRowToWallet(row);
    },
    5 * 60 * 1000 // 5分钟缓存
  );
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
 * 创建钱包 - with cache invalidation
 */
export async function createWallet(agentId: string, currency: string = 'CNY'): Promise<AgentWallet> {
  const db = await getDatabaseAsync();
  await initializeWalletTables();

  const id = generateId('wallet');
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO agent_wallets (id, agent_id, balance, currency, frozen_balance, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, agentId, 0, currency, 0, now, now);

  const wallet = {
    id,
    agentId,
    balance: 0,
    currency,
    frozenBalance: 0,
    createdAt: new Date(now),
    updatedAt: new Date(now),
  };

  // 失效相关缓存
  CacheInvalidator.invalidateAgent(agentId);

  return wallet;
}

/**
 * 获取钱包余额
 */
export async function getWalletBalance(agentId: string): Promise<{ balance: number; frozen: number; available: number }> {
  const wallet = await getWalletByAgentId(agentId);
  if (!wallet) {
    return { balance: 0, frozen: 0, available: 0 };
  }
  return {
    balance: wallet.balance,
    frozen: wallet.frozenBalance,
    available: wallet.balance - wallet.frozenBalance,
  };
}

/**
 * 获取交易记录 - with caching
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
  const cacheKey = CacheKeyGenerator.walletTransactionsKey(agentId, options);

  return cachedQuery(
    cacheKey,
    async () => {
      const wallet = await getWalletByAgentId(agentId);
      if (!wallet) return [];

      const db = await getDatabaseAsync();

      let sql = 'SELECT * FROM wallet_transactions WHERE wallet_id = ?';
      const params: (string | number)[] = [wallet.id];

      if (options?.type) {
        sql += ' AND type = ?';
        params.push(options.type);
      }
      if (options?.status) {
        sql += ' AND status = ?';
        params.push(options.status);
      }
      if (options?.startDate) {
        sql += ' AND created_at >= ?';
        params.push(options.startDate.toISOString());
      }
      if (options?.endDate) {
        sql += ' AND created_at <= ?';
        params.push(options.endDate.toISOString());
      }

      sql += ' ORDER BY created_at DESC';

      if (options?.limit) {
        sql += ' LIMIT ?';
        params.push(options.limit);
      }
      if (options?.offset) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }

      const stmt = db.prepare(sql);
      const rows = stmt.all(...params) as unknown as Record<string, unknown>[];

      return rows.map(mapRowToTransaction);
    },
    2 * 60 * 1000 // 2分钟缓存
  );
}

/**
 * 获取钱包统计 - with caching
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
  return cachedQuery(
    CacheKeyGenerator.walletStatsKey(agentId),
    async () => {
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

      // Single query for transaction statistics using GROUP BY
      const stmt = db.prepare(`
        SELECT type, SUM(amount) as total_amount, COUNT(*) as count
        FROM wallet_transactions
        WHERE wallet_id = ? AND status = 'completed'
        GROUP BY type
      `);
      
      const rows = stmt.all(wallet.id) as Array<{ type: string; total_amount: number; count: number }>;
      
      const typeStats = rows.reduce(
        (acc, { type, total_amount, count }) => ({
          ...acc,
          [type]: { total: total_amount, count }
        }),
        {} as Record<string, { total: number; count: number }>
      );

      // Calculate transaction count from all transactions
      const countStmt = db.prepare(`
        SELECT COUNT(*) as count
        FROM wallet_transactions
        WHERE wallet_id = ?
      `);
      const countRow = countStmt.get(wallet.id) as { count: number };

      return {
        balance: wallet.balance,
        frozen: wallet.frozenBalance,
        available: wallet.balance - wallet.frozenBalance,
        totalDeposits: typeStats[TransactionType.DEPOSIT]?.total || 0,
        totalWithdrawals: typeStats[TransactionType.WITHDRAW]?.total || 0,
        totalConsumed: typeStats[TransactionType.CONSUME]?.total || 0,
        totalRewards: typeStats[TransactionType.REWARD]?.total || 0,
        transactionCount: countRow.count,
      };
    },
    5 * 60 * 1000 // 5分钟缓存
  );
}

/**
 * 获取钱包及其最近交易 - 优化N+1查询（单次查询）
 */
export async function getWalletWithRecentTransactions(
  agentId: string,
  recentCount: number = 10
): Promise<{
  wallet: AgentWallet | null;
  recentTransactions: WalletTransaction[];
}> {
  const db = await getDatabaseAsync();
  await initializeWalletTables();

  const wallet = await getWalletByAgentId(agentId);
  if (!wallet) {
    return { wallet: null, recentTransactions: [] };
  }

  // 获取最近的交易
  const stmt = db.prepare(`
    SELECT * FROM wallet_transactions
    WHERE wallet_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);
  const rows = stmt.all(wallet.id, recentCount) as unknown as Record<string, unknown>[];

  const recentTransactions = rows.map(mapRowToTransaction);

  return { wallet, recentTransactions };
}

/**
 * 获取多个钱包 - 优化N+1查询
 */
export async function getWalletsByAgentIds(agentIds: string[]): Promise<Map<string, AgentWallet>> {
  if (agentIds.length === 0) return new Map();

  // 尝试从缓存获取
  const wallets = new Map<string, AgentWallet>();
  const uncachedIds: string[] = [];

  for (const agentId of agentIds) {
    const cachedWallet = await getWalletByAgentId(agentId);
    if (cachedWallet) {
      wallets.set(agentId, cachedWallet);
    } else {
      uncachedIds.push(agentId);
    }
  }

  // 批量查询未缓存的钱包
  if (uncachedIds.length > 0) {
    const db = await getDatabaseAsync();
    const placeholders = uncachedIds.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT * FROM agent_wallets WHERE agent_id IN (${placeholders})`);
    const rows = stmt.all(...uncachedIds) as unknown as Record<string, unknown>[];

    for (const row of rows) {
      const wallet = mapRowToWallet(row);
      wallets.set(wallet.agentId, wallet);
    }
  }

  return wallets;
}

/**
 * 更新钱包余额 - with cache invalidation
 */
async function updateWalletBalance(walletId: string, delta: number): Promise<void> {
  const db = await getDatabaseAsync();

  const stmt = db.prepare(`
    UPDATE agent_wallets 
    SET balance = balance + ?, updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(delta, new Date().toISOString(), walletId);

  if ((result.changes ?? 0) > 0) {
    // 获取agent_id以失效缓存
    const walletStmt = db.prepare('SELECT agent_id FROM agent_wallets WHERE id = ?');
    const walletRow = walletStmt.get(walletId) as { agent_id: string } | undefined;

    if (walletRow) {
      CacheInvalidator.invalidateWalletTransactions(walletRow.agent_id);
      CacheInvalidator.invalidateAgent(walletRow.agent_id);
    }
  }
}

/**
 * 存款 - with cache invalidation
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

  const transaction = await _createTransaction(wallet.id, TransactionType.DEPOSIT, amount, wallet.currency, {
    description: description || '存款',
    metadata,
    status: TransactionStatus.PENDING,
  });

  try {
    await updateWalletBalance(wallet.id, amount);
    await _updateTransactionStatus(transaction.id, TransactionStatus.COMPLETED, new Date());

    // 失效缓存
    CacheInvalidator.invalidateWalletTransactions(agentId);
    CacheInvalidator.invalidateAgent(agentId);

    return { ...transaction, status: TransactionStatus.COMPLETED, completedAt: new Date() };
  } catch (error) {
    await _updateTransactionStatus(transaction.id, TransactionStatus.FAILED);
    throw error;
  }
}

/**
 * 提款 - with cache invalidation
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

  const available = wallet.balance - wallet.frozenBalance;
  if (available < amount) {
    throw new Error('Insufficient balance');
  }

  const transaction = await _createTransaction(wallet.id, TransactionType.WITHDRAW, amount, wallet.currency, {
    description: description || '提款',
    metadata,
    status: TransactionStatus.PENDING,
  });

  try {
    await updateWalletBalance(wallet.id, -amount);
    await _updateTransactionStatus(transaction.id, TransactionStatus.COMPLETED, new Date());

    // 失效缓存
    CacheInvalidator.invalidateWalletTransactions(agentId);
    CacheInvalidator.invalidateAgent(agentId);

    return { ...transaction, status: TransactionStatus.COMPLETED, completedAt: new Date() };
  } catch (error) {
    await _updateTransactionStatus(transaction.id, TransactionStatus.FAILED);
    throw error;
  }
}

/**
 * 转账 - with cache invalidation
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

  const available = fromWallet.balance - fromWallet.frozenBalance;
  if (available < amount) {
    throw new Error('Insufficient balance');
  }

  const toWallet = await getOrCreateWallet(toAgentId, fromWallet.currency);

  // 创建转出交易
  const fromTransaction = await _createTransaction(
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
  const toTransaction = await _createTransaction(toWallet.id, TransactionType.TRANSFER, amount, toWallet.currency, {
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
    await _updateTransactionStatus(fromTransaction.id, TransactionStatus.COMPLETED, new Date());
    await _updateTransactionStatus(toTransaction.id, TransactionStatus.COMPLETED, new Date());

    // 失效缓存
    CacheInvalidator.invalidateWalletTransactions(fromAgentId);
    CacheInvalidator.invalidateWalletTransactions(toAgentId);
    CacheInvalidator.invalidateAgent(fromAgentId);
    CacheInvalidator.invalidateAgent(toAgentId);

    return {
      fromTransaction: { ...fromTransaction, status: TransactionStatus.COMPLETED, completedAt: new Date() },
      toTransaction: { ...toTransaction, status: TransactionStatus.COMPLETED, completedAt: new Date() },
    };
  } catch (error) {
    await _updateTransactionStatus(fromTransaction.id, TransactionStatus.FAILED);
    await _updateTransactionStatus(toTransaction.id, TransactionStatus.FAILED);
    throw error;
  }
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
    description: row.description as string | undefined,
    metadata: JSON.parse(row.metadata as string || '{}'),
    createdAt: new Date(row.created_at as string),
    completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
  };
}

// Export helper functions from original repository
export {
  createTransaction,
  updateTransactionStatus,
  freezeBalance,
  unfreezeBalance,
  getWalletById,
  consume,
  reward,
  refund,
} from './wallet-repository';

// Re-export types
export * from './types';
