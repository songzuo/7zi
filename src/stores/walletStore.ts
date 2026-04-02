/**
 * @fileoverview 智能体钱包状态管理 Store
 * @description Agent Wallet Store - 使用 Zustand 实现
 *
 * 功能:
 * - 钱包余额管理
 * - 智能体间转账
 * - 交易历史记录
 * - 冻结/解冻钱包
 *
 * @example
 * // 在组件中使用
 * const wallet = useWallet();
 * const { transfer, isLoading } = useWalletStore();
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  AgentWallet,
  Transaction,
  TransferRequest,
  TransferResult,
  WalletConfig,
  TransactionType,
  TransactionStatus,
  DEFAULT_WALLET_CONFIG,
} from '../types/wallet'
import { DEFAULT_WALLET_CONFIG as defaultConfig } from '../types/wallet'

// 重新导出类型以供外部使用
export type {
  AgentWallet,
  Transaction,
  TransferRequest,
  TransferResult,
  WalletConfig,
  TransactionType,
  TransactionStatus,
}

// ============================================================================
// 类型定义
// ============================================================================

interface WalletState {
  // 数据
  wallets: Map<string, AgentWallet>
  transactions: Transaction[]
  config: WalletConfig

  // 当前选中的钱包
  currentWalletId: string | null

  // 加载状态
  isLoading: boolean
  error: string | null

  // 操作
  initializeWallets: (agents: Array<{ id: string; name: string; initialBalance?: number }>) => void
  getWallet: (agentId: string) => AgentWallet | undefined
  getCurrentWallet: () => AgentWallet | undefined
  setCurrentWallet: (agentId: string) => void
  transfer: (fromAgentId: string, request: TransferRequest) => Promise<TransferResult>
  deposit: (agentId: string, amount: number, memo?: string) => Promise<TransferResult>
  withdraw: (agentId: string, amount: number, memo?: string) => Promise<TransferResult>
  reward: (agentId: string, amount: number, memo?: string) => Promise<TransferResult>
  penalty: (agentId: string, amount: number, memo?: string) => Promise<TransferResult>
  freezeWallet: (agentId: string) => void
  unfreezeWallet: (agentId: string) => void
  getTransactions: (agentId?: string, limit?: number) => Transaction[]
  updateConfig: (config: Partial<WalletConfig>) => void
  reset: () => void
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 生成交易ID
 */
function generateTransactionId(): string {
  return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 格式化日期
 */
function formatDate(): string {
  return new Date().toISOString()
}

// ============================================================================
// Store 实现
// ============================================================================

export const useWalletStore = create<WalletState>()(
  devtools(
    persist(
      (set, get) => ({
        // 初始状态
        wallets: new Map(),
        transactions: [],
        config: defaultConfig,
        currentWalletId: null,
        isLoading: false,
        error: null,

        // 初始化钱包
        initializeWallets: agents => {
          const wallets = new Map<string, AgentWallet>()
          const now = formatDate()

          agents.forEach(agent => {
            const wallet: AgentWallet = {
              id: generateId(),
              agentId: agent.id,
              agentName: agent.name,
              balance: agent.initialBalance ?? 100, // 默认初始余额 100
              frozenBalance: 0,
              totalIncome: agent.initialBalance ?? 100,
              totalExpense: 0,
              status: 'active',
              createdAt: now,
              updatedAt: now,
            }
            wallets.set(agent.id, wallet)
          })

          set({ wallets, currentWalletId: agents[0]?.id ?? null })
        },

        // 获取钱包
        getWallet: agentId => {
          return get().wallets.get(agentId)
        },

        // 获取当前钱包
        getCurrentWallet: () => {
          const { wallets, currentWalletId } = get()
          if (!currentWalletId) return undefined
          return wallets.get(currentWalletId)
        },

        // 设置当前钱包
        setCurrentWallet: agentId => {
          set({ currentWalletId: agentId })
        },

        // 转账
        transfer: async (fromAgentId, request) => {
          const { wallets, config, transactions } = get()

          // 验证发送方钱包
          const fromWallet = wallets.get(fromAgentId)
          if (!fromWallet) {
            return { success: false, error: '发送方钱包不存在' }
          }

          if (fromWallet.status === 'frozen') {
            return { success: false, error: '发送方钱包已被冻结' }
          }

          // 验证接收方钱包
          const toWallet = wallets.get(request.toAgentId)
          if (!toWallet) {
            return { success: false, error: '接收方钱包不存在' }
          }

          if (toWallet.status === 'frozen') {
            return { success: false, error: '接收方钱包已被冻结' }
          }

          // 验证金额
          if (request.amount < config.minTransferAmount) {
            return { success: false, error: `转账金额不能小于 ${config.minTransferAmount}` }
          }

          if (request.amount > config.maxTransferAmount) {
            return { success: false, error: `转账金额不能超过 ${config.maxTransferAmount}` }
          }

          // 计算手续费
          const fee = Math.ceil(request.amount * config.transferFeeRate)
          const totalAmount = request.amount + fee

          // 验证余额
          if (!config.allowNegativeBalance && fromWallet.balance < totalAmount) {
            return { success: false, error: '余额不足' }
          }

          // 创建交易记录
          const transaction: Transaction = {
            id: generateTransactionId(),
            type: 'transfer',
            fromWalletId: fromWallet.id,
            fromAgentName: fromWallet.agentName,
            toWalletId: toWallet.id,
            toAgentName: toWallet.agentName,
            amount: request.amount,
            fee,
            fromBalanceAfter: fromWallet.balance - totalAmount,
            toBalanceAfter: toWallet.balance + request.amount,
            status: 'completed',
            memo: request.memo,
            createdAt: formatDate(),
            completedAt: formatDate(),
          }

          // 更新钱包余额
          const newWallets = new Map(wallets)
          const now = formatDate()

          // 更新发送方
          newWallets.set(fromAgentId, {
            ...fromWallet,
            balance: fromWallet.balance - totalAmount,
            totalExpense: fromWallet.totalExpense + totalAmount,
            updatedAt: now,
          })

          // 更新接收方
          newWallets.set(request.toAgentId, {
            ...toWallet,
            balance: toWallet.balance + request.amount,
            totalIncome: toWallet.totalIncome + request.amount,
            updatedAt: now,
          })

          set({
            wallets: newWallets,
            transactions: [transaction, ...transactions],
            error: null,
          })

          return { success: true, transaction }
        },

        // 存入
        deposit: async (agentId, amount, memo) => {
          const { wallets, transactions } = get()
          const wallet = wallets.get(agentId)

          if (!wallet) {
            return { success: false, error: '钱包不存在' }
          }

          if (wallet.status === 'frozen') {
            return { success: false, error: '钱包已被冻结' }
          }

          const transaction: Transaction = {
            id: generateTransactionId(),
            type: 'deposit',
            fromWalletId: 'system',
            fromAgentName: '系统',
            toWalletId: wallet.id,
            toAgentName: wallet.agentName,
            amount,
            fee: 0,
            fromBalanceAfter: 0,
            toBalanceAfter: wallet.balance + amount,
            status: 'completed',
            memo,
            createdAt: formatDate(),
            completedAt: formatDate(),
          }

          const newWallets = new Map(wallets)
          newWallets.set(agentId, {
            ...wallet,
            balance: wallet.balance + amount,
            totalIncome: wallet.totalIncome + amount,
            updatedAt: formatDate(),
          })

          set({
            wallets: newWallets,
            transactions: [transaction, ...transactions],
          })

          return { success: true, transaction }
        },

        // 提取
        withdraw: async (agentId, amount, memo) => {
          const { wallets, config, transactions } = get()
          const wallet = wallets.get(agentId)

          if (!wallet) {
            return { success: false, error: '钱包不存在' }
          }

          if (wallet.status === 'frozen') {
            return { success: false, error: '钱包已被冻结' }
          }

          if (!config.allowNegativeBalance && wallet.balance < amount) {
            return { success: false, error: '余额不足' }
          }

          const transaction: Transaction = {
            id: generateTransactionId(),
            type: 'withdraw',
            fromWalletId: wallet.id,
            fromAgentName: wallet.agentName,
            toWalletId: 'system',
            toAgentName: '系统',
            amount,
            fee: 0,
            fromBalanceAfter: wallet.balance - amount,
            toBalanceAfter: 0,
            status: 'completed',
            memo,
            createdAt: formatDate(),
            completedAt: formatDate(),
          }

          const newWallets = new Map(wallets)
          newWallets.set(agentId, {
            ...wallet,
            balance: wallet.balance - amount,
            totalExpense: wallet.totalExpense + amount,
            updatedAt: formatDate(),
          })

          set({
            wallets: newWallets,
            transactions: [transaction, ...transactions],
          })

          return { success: true, transaction }
        },

        // 奖励
        reward: async (agentId, amount, memo) => {
          return get().deposit(agentId, amount, memo ?? '完成任务奖励')
        },

        // 惩罚
        penalty: async (agentId, amount, memo) => {
          const { wallets, transactions } = get()
          const wallet = wallets.get(agentId)

          if (!wallet) {
            return { success: false, error: '钱包不存在' }
          }

          const penaltyAmount = Math.min(amount, wallet.balance)

          const transaction: Transaction = {
            id: generateTransactionId(),
            type: 'penalty',
            fromWalletId: wallet.id,
            fromAgentName: wallet.agentName,
            toWalletId: 'system',
            toAgentName: '系统',
            amount: penaltyAmount,
            fee: 0,
            fromBalanceAfter: wallet.balance - penaltyAmount,
            toBalanceAfter: 0,
            status: 'completed',
            memo: memo ?? '任务惩罚',
            createdAt: formatDate(),
            completedAt: formatDate(),
          }

          const newWallets = new Map(wallets)
          newWallets.set(agentId, {
            ...wallet,
            balance: wallet.balance - penaltyAmount,
            totalExpense: wallet.totalExpense + penaltyAmount,
            updatedAt: formatDate(),
          })

          set({
            wallets: newWallets,
            transactions: [transaction, ...transactions],
          })

          return { success: true, transaction }
        },

        // 冻结钱包
        freezeWallet: agentId => {
          const { wallets } = get()
          const wallet = wallets.get(agentId)
          if (!wallet) return

          const newWallets = new Map(wallets)
          newWallets.set(agentId, {
            ...wallet,
            status: 'frozen',
            updatedAt: formatDate(),
          })

          set({ wallets: newWallets })
        },

        // 解冻钱包
        unfreezeWallet: agentId => {
          const { wallets } = get()
          const wallet = wallets.get(agentId)
          if (!wallet) return

          const newWallets = new Map(wallets)
          newWallets.set(agentId, {
            ...wallet,
            status: 'active',
            updatedAt: formatDate(),
          })

          set({ wallets: newWallets })
        },

        // 获取交易记录
        getTransactions: (agentId, limit = 50) => {
          const { transactions, wallets } = get()

          if (!agentId) {
            return transactions.slice(0, limit)
          }

          const wallet = wallets.get(agentId)
          if (!wallet) return []

          return transactions
            .filter(tx => tx.fromWalletId === wallet.id || tx.toWalletId === wallet.id)
            .slice(0, limit)
        },

        // 更新配置
        updateConfig: newConfig => {
          set({ config: { ...get().config, ...newConfig } })
        },

        // 重置
        reset: () => {
          set({
            wallets: new Map(),
            transactions: [],
            config: defaultConfig,
            currentWalletId: null,
            isLoading: false,
            error: null,
          })
        },
      }),
      {
        name: 'agent-wallet-storage',
        // 自定义序列化以处理 Map
        storage: {
          getItem: name => {
            const str = localStorage.getItem(name)
            if (!str) return null
            const data = JSON.parse(str)
            // 将数组转回 Map
            if (data.state?.wallets) {
              data.state.wallets = new Map(data.state.wallets)
            }
            return data
          },
          setItem: (name, value) => {
            // 将 Map 转为数组存储
            const data: { state?: { wallets?: Map<string, unknown> } } = value as {
              state?: { wallets?: Map<string, unknown> }
            }
            const wallets = data.state?.wallets
            if (wallets instanceof Map) {
              data.state!.wallets = Array.from(wallets.entries()) as unknown as Map<string, unknown>
            }
            localStorage.setItem(name, JSON.stringify(data))
          },
          removeItem: name => localStorage.removeItem(name),
        },
      }
    ),
    { name: 'WalletStore' }
  )
)

// ============================================================================
// 便捷 Hooks
// ============================================================================

/**
 * 获取当前钱包余额
 */
export function useWalletBalance(): number {
  const wallet = useWalletStore(state => {
    const { wallets, currentWalletId } = state
    if (!currentWalletId) return null
    return wallets.get(currentWalletId)
  })
  return wallet?.balance ?? 0
}

/**
 * 获取所有钱包列表
 */
export function useWallets(): AgentWallet[] {
  return useWalletStore(state => Array.from(state.wallets.values()))
}

/**
 * 获取交易历史
 */
export function useTransactionHistory(limit = 20): Transaction[] {
  const currentWalletId = useWalletStore(state => state.currentWalletId)
  return useWalletStore(state => state.getTransactions(currentWalletId ?? undefined, limit))
}
