/**
 * @fileoverview 智能体钱包类型定义
 * @description Agent Wallet Types - 智能体间价值交换系统
 *
 * 功能:
 * - 钱包余额管理
 * - 智能体间转账
 * - 交易历史记录
 */

// ============================================================================
// 钱包核心类型
// ============================================================================

/**
 * 交易类型
 */
export type TransactionType = 'deposit' | 'withdraw' | 'transfer' | 'reward' | 'penalty'

/**
 * 交易状态
 */
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

/**
 * 钱包配置
 */
export interface WalletConfig {
  /** 最小转账金额 */
  minTransferAmount: number
  /** 最大转账金额 */
  maxTransferAmount: number
  /** 转账手续费率 (0-1) */
  transferFeeRate: number
  /** 是否启用负余额 */
  allowNegativeBalance: boolean
  /** 货币符号 */
  currencySymbol: string
  /** 货币名称 */
  currencyName: string
}

/**
 * 钱包信息
 */
export interface AgentWallet {
  /** 钱包地址/ID */
  id: string
  /** 智能体ID */
  agentId: string
  /** 智能体名称 */
  agentName: string
  /** 当前余额 */
  balance: number
  /** 冻结余额 */
  frozenBalance: number
  /** 累计收入 */
  totalIncome: number
  /** 累计支出 */
  totalExpense: number
  /** 钱包状态 */
  status: 'active' | 'frozen' | 'closed'
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/**
 * 交易记录
 */
export interface Transaction {
  /** 交易ID */
  id: string
  /** 交易类型 */
  type: TransactionType
  /** 发送方钱包ID */
  fromWalletId: string
  /** 发送方智能体名称 */
  fromAgentName: string
  /** 接收方钱包ID */
  toWalletId: string
  /** 接收方智能体名称 */
  toAgentName: string
  /** 交易金额 */
  amount: number
  /** 手续费 */
  fee: number
  /** 交易后发送方余额 */
  fromBalanceAfter: number
  /** 交易后接收方余额 */
  toBalanceAfter: number
  /** 交易状态 */
  status: TransactionStatus
  /** 交易备注 */
  memo?: string
  /** 创建时间 */
  createdAt: string
  /** 完成时间 */
  completedAt?: string
}

/**
 * 转账请求
 */
export interface TransferRequest {
  /** 接收方智能体ID */
  toAgentId: string
  /** 转账金额 */
  amount: number
  /** 转账备注 */
  memo?: string
}

/**
 * 转账结果
 */
export interface TransferResult {
  success: boolean
  transaction?: Transaction
  error?: string
}

// ============================================================================
// 默认配置
// ============================================================================

/**
 * 默认钱包配置
 */
export const DEFAULT_WALLET_CONFIG: WalletConfig = {
  minTransferAmount: 1,
  maxTransferAmount: 1000000,
  transferFeeRate: 0.001, // 0.1%
  allowNegativeBalance: false,
  currencySymbol: '🪙',
  currencyName: 'Agent Coin',
}

/**
 * 交易类型配置
 */
export const TRANSACTION_TYPE_CONFIG: Record<
  TransactionType,
  { icon: string; label: string; color: string }
> = {
  deposit: {
    icon: '📥',
    label: '存入',
    color: 'text-green-600 dark:text-green-400',
  },
  withdraw: {
    icon: '📤',
    label: '提取',
    color: 'text-red-600 dark:text-red-400',
  },
  transfer: {
    icon: '🔄',
    label: '转账',
    color: 'text-blue-600 dark:text-blue-400',
  },
  reward: {
    icon: '🎁',
    label: '奖励',
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  penalty: {
    icon: '⚠️',
    label: '惩罚',
    color: 'text-orange-600 dark:text-orange-400',
  },
}

/**
 * 交易状态配置
 */
export const TRANSACTION_STATUS_CONFIG: Record<
  TransactionStatus,
  { icon: string; label: string; color: string }
> = {
  pending: {
    icon: '⏳',
    label: '处理中',
    color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
  },
  completed: {
    icon: '✅',
    label: '已完成',
    color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
  },
  failed: {
    icon: '❌',
    label: '失败',
    color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
  },
  cancelled: {
    icon: '🚫',
    label: '已取消',
    color: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30',
  },
}
