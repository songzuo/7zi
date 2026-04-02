/**
 * 7zi Agent 经济系统 - 钱包模块
 * @module economy/wallet
 */

import {
  AgentWallet,
  Transaction,
  TransactionType,
  TransactionStatus,
  TransactionMetadata,
  IWalletRepository,
  ITransactionRepository,
} from './types.js'

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
      const aVal = a[orderBy]
      const bVal = b[orderBy]
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

  constructor(walletRepo?: IWalletRepository, transactionRepo?: ITransactionRepository) {
    this.walletRepo = walletRepo || new InMemoryWalletRepository()
    this.transactionRepo = transactionRepo || new InMemoryTransactionRepository()
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
    if (amount <= 0) {
      throw new Error('Amount must be positive')
    }

    const wallet = await this.getWallet(agentId)

    if (wallet.frozen) {
      throw new Error(`Wallet is frozen for agent: ${agentId}`)
    }

    // 创建充值交易
    const transaction = await this.transactionRepo.create({
      walletId: wallet.id,
      type: 'charge',
      amount,
      status: 'completed',
      description: `充值 ${this.formatAmount(amount, wallet.currency)}`,
      metadata,
    })

    // 更新余额
    await this.walletRepo.update(wallet.id, {
      balance: wallet.balance + amount,
    })

    return transaction
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
    if (amount <= 0) {
      throw new Error('Amount must be positive')
    }

    const wallet = await this.getWallet(agentId)

    if (wallet.frozen) {
      throw new Error(`Wallet is frozen for agent: ${agentId}`)
    }

    // 检查余额
    const availableBalance = wallet.balance - wallet.frozenAmount
    if (availableBalance < amount) {
      throw new Error(
        `Insufficient balance. Available: ${this.formatAmount(availableBalance, wallet.currency)}, Required: ${this.formatAmount(amount, wallet.currency)}`
      )
    }

    // 创建支付交易
    const transaction = await this.transactionRepo.create({
      walletId: wallet.id,
      type: 'payment',
      amount: -amount, // 支出为负数
      status: 'completed',
      description,
      metadata,
    })

    // 更新余额
    await this.walletRepo.update(wallet.id, {
      balance: wallet.balance - amount,
    })

    return transaction
  }

  /**
   * 退款
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

    // 默认全额退款
    const refundAmount = amount !== undefined ? amount : Math.abs(originalTx.amount)
    const refundDescription = reason ? `退款: ${reason}` : `退款: ${originalTx.description}`

    // 创建退款交易
    const transaction = await this.transactionRepo.create({
      walletId: wallet.id,
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

    // 更新余额
    await this.walletRepo.update(wallet.id, {
      balance: wallet.balance + refundAmount,
    })

    return transaction
  }

  /**
   * 冻结资金
   */
  async freeze(
    agentId: string,
    amount: number,
    metadata: TransactionMetadata = {}
  ): Promise<Transaction> {
    if (amount <= 0) {
      throw new Error('Amount must be positive')
    }

    const wallet = await this.getWallet(agentId)

    if (wallet.frozen) {
      throw new Error(`Wallet is frozen for agent: ${agentId}`)
    }

    // 检查可用余额
    const availableBalance = wallet.balance - wallet.frozenAmount
    if (availableBalance < amount) {
      throw new Error('Insufficient balance to freeze')
    }

    // 创建冻结交易
    const transaction = await this.transactionRepo.create({
      walletId: wallet.id,
      type: 'freeze',
      amount: 0, // 冻结不改变总余额
      status: 'completed',
      description: `冻结 ${this.formatAmount(amount, wallet.currency)}`,
      metadata,
    })

    // 更新冻结金额
    await this.walletRepo.update(wallet.id, {
      frozenAmount: wallet.frozenAmount + amount,
    })

    return transaction
  }

  /**
   * 解冻资金
   */
  async unfreeze(
    agentId: string,
    amount: number,
    metadata: TransactionMetadata = {}
  ): Promise<Transaction> {
    if (amount <= 0) {
      throw new Error('Amount must be positive')
    }

    const wallet = await this.getWallet(agentId)

    if (wallet.frozenAmount < amount) {
      throw new Error('Insufficient frozen amount to unfreeze')
    }

    // 创建解冻交易
    const transaction = await this.transactionRepo.create({
      walletId: wallet.id,
      type: 'unfreeze',
      amount: 0,
      status: 'completed',
      description: `解冻 ${this.formatAmount(amount, wallet.currency)}`,
      metadata,
    })

    // 更新冻结金额
    await this.walletRepo.update(wallet.id, {
      frozenAmount: wallet.frozenAmount - amount,
    })

    return transaction
  }

  /**
   * 冻结钱包
   */
  async freezeWallet(agentId: string, reason: string): Promise<AgentWallet> {
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
   */
  private generateAddress(agentId: string): string {
    const hash = this.simpleHash(agentId + Date.now())
    // 填充到40位
    const padded = hash.padEnd(40, '0')
    return `0x${padded.substring(0, 40)}`
  }

  /**
   * 简单哈希函数 - 生成足够长的十六进制字符串
   */
  private simpleHash(str: string): string {
    let hash = 0
    let result = ''
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
      // 转换为16位十六进制
      result += Math.abs(hash).toString(16).padStart(8, '0')
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
