/**
 * 7zi Agent 经济系统 - 钱包模块
 * @module economy/wallet
 */

import { KeyedMutex } from './concurrency.js'
import {
  AgentWallet,
  Transaction,
  TransactionType,
  TransactionStatus,
  TransactionMetadata,
  IWalletRepository,
  ITransactionRepository,
} from './types.js'

// ==================== 金额校验工具 ====================

/**
 * 校验金额为「分」单位的正整数
 *
 * 经济系统内部金额一律使用最小单位（分）的整数表示。
 * 任何浮点金额都会引入累积误差（0.1 + 0.2 !== 0.3），因此在入口处一律拒绝。
 */
export function assertCents(amount: number, label = 'Amount'): void {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new Error(`${label} must be a finite number`)
  }
  if (!Number.isInteger(amount)) {
    throw new Error(`${label} must be an integer number of cents`)
  }
  if (amount <= 0) {
    throw new Error(`${label} must be positive`)
  }
}

/**
 * 校验金额为「分」单位的非负整数
 */
export function assertCentsNonNegative(amount: number, label = 'Amount'): void {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    throw new Error(`${label} must be a finite number`)
  }
  if (!Number.isInteger(amount)) {
    throw new Error(`${label} must be an integer number of cents`)
  }
  if (amount < 0) {
    throw new Error(`${label} must not be negative`)
  }
}

// ==================== 存储实现 ====================

/**
 * 内存钱包存储
 */
class InMemoryWalletRepository implements IWalletRepository {
  private wallets: Map<string, AgentWallet> = new Map()
  private agentIndex: Map<string, string> = new Map() // agentId -> walletId
  private addressIndex: Map<string, string> = new Map() // address -> walletId

  async findById(id: string): Promise<AgentWallet | null> {
    return this.wallets.get(id) || null
  }

  async findByAgentId(agentId: string): Promise<AgentWallet | null> {
    const walletId = this.agentIndex.get(agentId)
    if (!walletId) return null
    return this.wallets.get(walletId) || null
  }

  async findByAddress(address: string): Promise<AgentWallet | null> {
    const walletId = this.addressIndex.get(address)
    if (!walletId) return null
    return this.wallets.get(walletId) || null
  }

  async create(data: Omit<AgentWallet, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentWallet> {
    const id = this.generateId()
    const now = new Date()
    const wallet: AgentWallet = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    }

    this.wallets.set(id, wallet)
    this.agentIndex.set(data.agentId, id)
    this.addressIndex.set(data.address, id)

    return wallet
  }

  async update(id: string, updates: Partial<AgentWallet>): Promise<AgentWallet> {
    const wallet = this.wallets.get(id)
    if (!wallet) throw new Error(`Wallet not found: ${id}`)

    const updated = {
      ...wallet,
      ...updates,
      id,
      updatedAt: new Date(),
    }

    this.wallets.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const wallet = this.wallets.get(id)
    if (!wallet) return false

    this.wallets.delete(id)
    this.agentIndex.delete(wallet.agentId)
    this.addressIndex.delete(wallet.address)
    return true
  }

  async findAll(): Promise<AgentWallet[]> {
    return Array.from(this.wallets.values())
  }

  private generateId(): string {
    return `wallet_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }
}

/**
 * 内存交易存储
 */
class InMemoryTransactionRepository implements ITransactionRepository {
  private transactions: Map<string, Transaction> = new Map()
  private walletIndex: Map<string, Set<string>> = new Map() // walletId -> transactionIds
  private orderIndex: Map<string, Set<string>> = new Map() // orderId -> transactionIds

  async findById(id: string): Promise<Transaction | null> {
    return this.transactions.get(id) || null
  }

  async findByWalletId(
    walletId: string,
    options?: {
      types?: TransactionType[]
      statuses?: TransactionStatus[]
      startDate?: Date
      endDate?: Date
      orderBy?: keyof Transaction
      orderDirection?: 'asc' | 'desc'
      limit?: number
      offset?: number
    }
  ): Promise<Transaction[]> {
    const ids = this.walletIndex.get(walletId)
    if (!ids) return []

    let transactions = Array.from(ids)
      .map(id => this.transactions.get(id)!)
      .filter(t => t !== undefined)

    // Apply filters
    if (options?.types && options.types.length > 0) {
      transactions = transactions.filter(t => options.types!.includes(t.type))
    }
    if (options?.statuses && options.statuses.length > 0) {
      transactions = transactions.filter(t => options.statuses!.includes(t.status))
    }
    if (options?.startDate) {
      transactions = transactions.filter(t => t.createdAt >= options.startDate!)
    }
    if (options?.endDate) {
      transactions = transactions.filter(t => t.createdAt <= options.endDate!)
    }

    // Sort
    const orderBy = options?.orderBy || 'createdAt'
    const direction = options?.orderDirection || 'desc'
    transactions.sort((a, b) => {
      const aVal = a[orderBy] ?? 0
      const bVal = b[orderBy] ?? 0
      return direction === 'asc' ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1
    })

    // Pagination
    if (options?.offset) transactions = transactions.slice(options.offset)
    if (options?.limit) transactions = transactions.slice(0, options.limit)

    return transactions
  }

  async create(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    const id = this.generateId()
    const transaction: Transaction = {
      id,
      ...data,
      createdAt: new Date(),
    }

    this.transactions.set(id, transaction)

    // Index by wallet
    if (!this.walletIndex.has(data.walletId)) {
      this.walletIndex.set(data.walletId, new Set())
    }
    this.walletIndex.get(data.walletId)!.add(id)

    // Index by order
    const orderId = data.metadata.orderId
    if (orderId) {
      if (!this.orderIndex.has(orderId)) {
        this.orderIndex.set(orderId, new Set())
      }
      this.orderIndex.get(orderId)!.add(id)
    }

    return transaction
  }

  async update(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const transaction = this.transactions.get(id)
    if (!transaction) throw new Error(`Transaction not found: ${id}`)

    const updated = { ...transaction, ...updates, id }
    this.transactions.set(id, updated)
    return updated
  }

  async findByOrderId(orderId: string): Promise<Transaction[]> {
    const ids = this.orderIndex.get(orderId)
    if (!ids) return []

    return Array.from(ids)
      .map(id => this.transactions.get(id)!)
      .filter(t => t !== undefined)
  }

  private generateId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }
}

// ==================== 钱包服务 ====================

/**
 * 钱包服务
 */
export class WalletService {
  private walletRepo: IWalletRepository
  private transactionRepo: ITransactionRepository
  private lock: KeyedMutex

  constructor(walletRepo?: IWalletRepository, transactionRepo?: ITransactionRepository) {
    this.walletRepo = walletRepo || new InMemoryWalletRepository()
    this.transactionRepo = transactionRepo || new InMemoryTransactionRepository()
    this.lock = new KeyedMutex()
  }

  /**
   * 创建钱包
   */
  async createWallet(agentId: string, currency: 'CNY' | 'USD' = 'CNY'): Promise<AgentWallet> {
    // 检查是否已存在钱包
    const existing = await this.walletRepo.findByAgentId(agentId)
    if (existing) {
      throw new Error(`Wallet already exists for agent: ${agentId}`)
    }

    // 生成唯一钱包地址
    const address = this.generateAddress(agentId)

    return await this.walletRepo.create({
      agentId,
      address,
      balance: 0,
      currency,
      frozen: false,
      frozenAmount: 0,
    })
  }

  /**
   * 获取钱包
   */
  async getWallet(agentId: string): Promise<AgentWallet> {
    const wallet = await this.walletRepo.findByAgentId(agentId)
    if (!wallet) {
      throw new Error(`Wallet not found for agent: ${agentId}`)
    }
    return wallet
  }

  /**
   * 充值
   */
  async charge(
    agentId: string,
    amount: number,
    metadata: TransactionMetadata = {}
  ): Promise<Transaction> {
    assertCents(amount)

    const wallet = await this.getWallet(agentId)

    if (wallet.frozen) {
      throw new Error(`Wallet is frozen for agent: ${agentId}`)
    }

    // 余额的读-改-写必须在锁内串行，否则并发充值会丢失更新
    return this.lock.run(wallet.id, async () => {
      // 锁内重新读取，避免使用过期的快照余额
      const current = await this.getWallet(agentId)

      if (current.frozen) {
        throw new Error(`Wallet is frozen for agent: ${agentId}`)
      }

      const transaction = await this.transactionRepo.create({
        walletId: current.id,
        type: 'charge',
        amount,
        status: 'completed',
        description: `充值 ${this.formatAmount(amount, current.currency)}`,
        metadata,
      })

      await this.walletRepo.update(current.id, {
        balance: current.balance + amount,
      })

      return transaction
    })
  }

  /**
   * 消费/支付
   */
  async pay(
    agentId: string,
    amount: number,
    description: string,
    metadata: TransactionMetadata = {}
  ): Promise<Transaction> {
    assertCents(amount)

    const wallet = await this.getWallet(agentId)

    if (wallet.frozen) {
      throw new Error(`Wallet is frozen for agent: ${agentId}`)
    }

    // 余额校验与扣款必须原子化，否则并发支付会超扣
    return this.lock.run(wallet.id, async () => {
      const current = await this.getWallet(agentId)

      if (current.frozen) {
        throw new Error(`Wallet is frozen for agent: ${agentId}`)
      }

      // 检查余额（冻结部分不可用）
      const availableBalance = current.balance - current.frozenAmount
      if (availableBalance < amount) {
        throw new Error(
          `Insufficient balance. Available: ${this.formatAmount(availableBalance, current.currency)}, Required: ${this.formatAmount(amount, current.currency)}`
        )
      }

      const transaction = await this.transactionRepo.create({
        walletId: current.id,
        type: 'payment',
        amount: -amount, // 支出为负数
        status: 'completed',
        description,
        metadata,
      })

      await this.walletRepo.update(current.id, {
        balance: current.balance - amount,
      })

      return transaction
    })
  }

  /**
   * 退款
   *
   * 约束：
   * - 只能退款本钱包的、已完成（completed）的支付交易
   * - 退款金额必须是正整数分，且不得超过「原交易金额 - 已退款金额」
   * - 同一笔原交易退款总额用尽后不可再退（幂等 / 防止重复退款刷余额）
   */
  async refund(
    agentId: string,
    originalTransactionId: string,
    amount?: number,
    reason?: string
  ): Promise<Transaction> {
    const wallet = await this.getWallet(agentId)
    const originalTx = await this.transactionRepo.findById(originalTransactionId)

    if (!originalTx) {
      throw new Error(`Original transaction not found: ${originalTransactionId}`)
    }

    if (originalTx.walletId !== wallet.id) {
      throw new Error('Transaction does not belong to this wallet')
    }

    if (originalTx.type !== 'payment') {
      throw new Error('Can only refund payment transactions')
    }

    if (originalTx.status !== 'completed') {
      throw new Error('Can only refund completed payment transactions')
    }

    if (amount !== undefined) {
      assertCents(amount, 'Refund amount')
    }

    // 锁内统计已退款金额，防止并发重复退款把余额刷高
    return this.lock.run(wallet.id, async () => {
      const current = await this.getWallet(agentId)
      const refunds = await this.transactionRepo.findByWalletId(current.id, { types: ['refund'] })
      const alreadyRefunded = refunds
        .filter(r => r.metadata.originalTransactionId === originalTransactionId)
        .reduce((sum, r) => sum + r.amount, 0)

      const refundable = Math.abs(originalTx.amount) - alreadyRefunded
      if (refundable <= 0) {
        throw new Error(`Transaction already fully refunded: ${originalTransactionId}`)
      }

      // 默认全额退款（退剩余可退金额）
      const refundAmount = amount !== undefined ? amount : refundable
      if (refundAmount > refundable) {
        throw new Error(
          `Refund amount exceeds refundable amount. Refundable: ${refundable}, Requested: ${refundAmount}`
        )
      }

      const refundDescription = reason ? `退款: ${reason}` : `退款: ${originalTx.description}`

      const transaction = await this.transactionRepo.create({
        walletId: current.id,
        type: 'refund',
        amount: refundAmount,
        status: 'completed',
        description: refundDescription,
        metadata: {
          ...originalTx.metadata,
          originalTransactionId,
          refundReason: reason,
        },
      })

      await this.walletRepo.update(current.id, {
        balance: current.balance + refundAmount,
      })

      return transaction
    })
  }

  /**
   * 冻结资金
   */
  async freeze(
    agentId: string,
    amount: number,
    metadata: TransactionMetadata = {}
  ): Promise<Transaction> {
    assertCents(amount)

    const wallet = await this.getWallet(agentId)

    if (wallet.frozen) {
      throw new Error(`Wallet is frozen for agent: ${agentId}`)
    }

    return this.lock.run(wallet.id, async () => {
      const current = await this.getWallet(agentId)

      if (current.frozen) {
        throw new Error(`Wallet is frozen for agent: ${agentId}`)
      }

      // 检查可用余额
      const availableBalance = current.balance - current.frozenAmount
      if (availableBalance < amount) {
        throw new Error('Insufficient balance to freeze')
      }

      const transaction = await this.transactionRepo.create({
        walletId: current.id,
        type: 'freeze',
        amount: 0, // 冻结不改变总余额
        status: 'completed',
        description: `冻结 ${this.formatAmount(amount, current.currency)}`,
        metadata,
      })

      await this.walletRepo.update(current.id, {
        frozenAmount: current.frozenAmount + amount,
      })

      return transaction
    })
  }

  /**
   * 解冻资金
   */
  async unfreeze(
    agentId: string,
    amount: number,
    metadata: TransactionMetadata = {}
  ): Promise<Transaction> {
    assertCents(amount)

    const wallet = await this.getWallet(agentId)

    return this.lock.run(wallet.id, async () => {
      const current = await this.getWallet(agentId)

      if (current.frozenAmount < amount) {
        throw new Error('Insufficient frozen amount to unfreeze')
      }

      const transaction = await this.transactionRepo.create({
        walletId: current.id,
        type: 'unfreeze',
        amount: 0,
        status: 'completed',
        description: `解冻 ${this.formatAmount(amount, current.currency)}`,
        metadata,
      })

      await this.walletRepo.update(current.id, {
        frozenAmount: current.frozenAmount - amount,
      })

      return transaction
    })
  }

  /**
   * 冻结钱包
   */
  async freezeWallet(agentId: string, _reason: string): Promise<AgentWallet> {
    const wallet = await this.getWallet(agentId)
    return await this.walletRepo.update(wallet.id, { frozen: true })
  }

  /**
   * 解冻钱包
   */
  async unfreezeWallet(agentId: string): Promise<AgentWallet> {
    const wallet = await this.getWallet(agentId)
    return await this.walletRepo.update(wallet.id, { frozen: false })
  }

  /**
   * 查询交易记录
   */
  async getTransactions(
    agentId: string,
    options?: {
      types?: TransactionType[]
      statuses?: TransactionStatus[]
      startDate?: Date
      endDate?: Date
      limit?: number
      offset?: number
    }
  ): Promise<Transaction[]> {
    const wallet = await this.getWallet(agentId)
    return await this.transactionRepo.findByWalletId(wallet.id, options)
  }

  /**
   * 查询余额
   */
  async getBalance(agentId: string): Promise<{
    total: number
    available: number
    frozen: number
    currency: string
  }> {
    const wallet = await this.getWallet(agentId)
    return {
      total: wallet.balance,
      available: wallet.balance - wallet.frozenAmount,
      frozen: wallet.frozenAmount,
      currency: wallet.currency,
    }
  }

  /**
   * 生成钱包地址
   *
   * 地址必须全局唯一：原实现只对输入的前 5 个字符做哈希，
   * 导致 `agent-a` 与 `agent-b` 这类「前缀相同、后缀不同」的 agent
   * 拿到完全相同的钱包地址，addressIndex 会被后创建的钱包覆盖，
   * 导致 findByAddress 返回错误的钱包。
   *
   * 修复：使用 FNV-1a 多轮哈希覆盖整个输入串，并掺入随机数保证同毫秒内也不碰撞。
   */
  private generateAddress(agentId: string): string {
    const seed = `${agentId}:${Date.now()}:${Math.random().toString(36).substring(2, 12)}`
    const hash = this.simpleHash(seed)
    // 填充到40位
    const padded = hash.padEnd(40, '0')
    return `0x${padded.substring(0, 40)}`
  }

  /**
   * 简单哈希函数 - 生成 40 位十六进制字符串
   *
   * 使用 5 轮独立的 FNV-1a 变体，每轮输出 8 位十六进制，合计 40 位。
   * 每轮都消费整个输入串，因此不存在「只哈希前缀」导致的碰撞。
   */
  private simpleHash(str: string): string {
    const seeds = [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35]
    const multipliers = [0x01000193, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1]

    let result = ''
    for (let round = 0; round < seeds.length; round++) {
      let hash = seeds[round] >>> 0
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = Math.imul(hash ^ (char + round), multipliers[round]) >>> 0
        hash = (hash ^ (hash >>> 13)) >>> 0
      }
      result += hash.toString(16).padStart(8, '0')
    }
    return result
  }

  /**
   * 格式化金额显示
   */
  private formatAmount(amount: number, currency: string): string {
    const value = (amount / 100).toFixed(2)
    return `${value} ${currency}`
  }

  /**
   * 获取存储库（用于测试）
   */
  getWalletRepo(): IWalletRepository {
    return this.walletRepo
  }

  getTransactionRepo(): ITransactionRepository {
    return this.transactionRepo
  }
}

// ==================== 导出 ====================

export { InMemoryWalletRepository, InMemoryTransactionRepository }
