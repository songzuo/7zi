/**
 * 智能体类型定义（合并版本）
 * Agent Type Definitions - Merged from agent/ and agents/
 */

// ============================================================================
// 基础枚举
// ============================================================================

/**
 * 智能体状态
 */
export enum AgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

/**
 * 智能体类型
 */
export enum AgentType {
  ASSISTANT = 'assistant',
  WORKER = 'worker',
  SUPERVISOR = 'supervisor',
  SPECIALIST = 'specialist',
}

/**
 * 智能体角色
 */
export enum AgentRole {
  DIRECTOR = 'director', // 主管
  EXPERT = 'expert', // 智能体世界专家
  CONSULTANT = 'consultant', // 咨询师
  ARCHITECT = 'architect', // 架构师
  EXECUTOR = 'executor', // Executor
  ADMIN = 'admin', // 系统管理员
  TESTER = 'tester', // 测试员
  DESIGNER = 'designer', // 设计师
  MARKETER = 'marketer', // 推广专员
  SALES = 'sales', // 销售客服
  FINANCE = 'finance', // 财务
  MEDIA = 'media', // 媒体
}

/**
 * 智能体提供商
 */
export enum AgentProvider {
  MINIMAX = 'minimax',
  BAILIAN = 'bailian',
  VOLCENGINE = 'volcengine',
  SELF_CLAUDE = 'self-claude',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  CUSTOM = 'custom',
}

/**
 * 交易类型
 */
export enum TransactionType {
  DEPOSIT = 'deposit', // 充值
  WITHDRAW = 'withdraw', // 提现
  TASK_REWARD = 'task_reward', // 任务奖励
  TASK_PAYMENT = 'task_payment', // 任务支付
  API_USAGE = 'api_usage', // API 使用费
  TRANSFER_IN = 'transfer_in', // 转入
  TRANSFER_OUT = 'transfer_out', // 转出
  REFUND = 'refund', // 退款
  BONUS = 'bonus', // 奖励
  PENALTY = 'penalty', // 罚款
  TRANSFER = 'transfer', // 转账
  REWARD = 'reward', // 奖励
  CONSUME = 'consume', // 消费
}

/**
 * 钱包状态
 */
export enum WalletStatus {
  ACTIVE = 'active',
  FROZEN = 'frozen',
  CLOSED = 'closed',
}

/**
 * 交易状态
 */
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 数据类型
 */
export enum DataType {
  TASKS = 'tasks',
  USERS = 'users',
  REPORTS = 'reports',
  METRICS = 'metrics',
  ACTIVITIES = 'activities',
  NOTIFICATIONS = 'notifications',
  FILES = 'files',
  TAGS = 'tags',
}

/**
 * 数据操作
 */
export enum DataAction {
  READ = 'read',
  WRITE = 'write',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
}

/**
 * 钱包操作
 */
export enum WalletOperation {
  BALANCE = 'balance',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  TRANSFER = 'transfer',
  HISTORY = 'history',
}

// ============================================================================
// 智能体相关
// ============================================================================

/**
 * 智能体实体
 */
export interface Agent {
  id: string
  name: string
  description?: string
  type: AgentType
  provider: AgentProvider
  model?: string
  apiKey: string // API 密钥 (哈希存储)
  apiKeyPlain?: string // 明文 API 密钥 (仅创建时返回)
  webhookUrl?: string
  status: AgentStatus
  role?: AgentRole
  permissions: string[]
  metadata: AgentMetadata
  createdAt: Date
  updatedAt: Date
  lastActiveAt?: Date
}

/**
 * 智能体元数据
 */
export interface AgentMetadata {
  model?: string // 使用的模型
  maxTokens?: number // 最大 token 数
  temperature?: number // 温度参数
  description?: string // 描述
  tags?: string[] // 标签
  capabilities?: string[] // 能力列表
  config?: Record<string, unknown> // 自定义配置
}

/**
 * 智能体认证令牌
 */
export interface AgentToken {
  id: string
  agentId: string
  token: string // JWT token
  refreshToken: string
  expiresAt: Date
  refreshExpiresAt: Date
  scopes: string[]
  createdAt: Date
  lastUsedAt?: Date
}

// ============================================================================
// 请求/响应类型
// ============================================================================

/**
 * 智能体认证请求
 */
export interface AgentAuthRequest {
  agentId: string
  apiKey: string
  scopes?: string[]
}

/**
 * 智能体注册请求
 */
export interface AgentRegisterRequest {
  name: string
  type?: AgentType
  role?: AgentRole
  provider?: AgentProvider
  permissions?: string[]
  metadata?: AgentMetadata
}

/**
 * 智能体认证响应
 */
export interface AgentAuthResponse {
  success: boolean
  token?: string
  refreshToken?: string
  expiresAt?: Date
  agent?: Omit<Agent, 'apiKey'>
  error?: string
}

/**
 * 令牌刷新请求
 */
export interface TokenRefreshRequest {
  refreshToken: string
}

/**
 * 智能体数据访问记录
 */
export interface AgentDataAccess {
  id: string
  agentId: string
  resourceType: string
  resourceId: string
  action: 'read' | 'write' | 'delete'
  timestamp: Date
  metadata?: Record<string, unknown>
}

/**
 * 智能体数据访问请求
 */
export interface AgentDataRequest {
  dataType: DataType
  action: DataAction
  filters?: Record<string, unknown>
  pagination?: {
    page: number
    limit: number
  }
}

/**
 * API 访问令牌（简化版）
 */
export interface ApiAgentToken {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: 'Bearer'
}

/**
 * 创建智能体请求
 */
export interface CreateAgentRequest {
  name: string
  description?: string
  type: AgentType
  provider: AgentProvider
  model?: string
  webhookUrl?: string
  role?: AgentRole
  permissions?: string[]
  metadata?: AgentMetadata
}

/**
 * 更新智能体请求
 */
export interface UpdateAgentRequest {
  name?: string
  description?: string
  type?: AgentType
  provider?: AgentProvider
  model?: string
  webhookUrl?: string
  status?: AgentStatus
  permissions?: string[]
  metadata?: AgentMetadata
}

/**
 * 钱包操作请求
 */
export interface WalletOperationRequest {
  operation: WalletOperation
  amount?: number
  targetAgentId?: string // 转账目标
  description?: string
  reference?: string
}

// ============================================================================
// 钱包相关
// ============================================================================

/**
 * 智能体钱包
 */
export interface AgentWallet {
  id: string
  agentId: string
  balance: number // 余额 (单位: 分)
  currency: string // 货币类型
  frozenBalance?: number // 冻结余额
  status?: WalletStatus
  createdAt: Date
  updatedAt: Date
}

/**
 * 钱包交易记录
 */
export interface WalletTransaction {
  id: string
  walletId: string
  type: TransactionType
  amount: number // 金额 (单位: 分)
  balance?: number // 交易后余额
  currency?: string
  status?: TransactionStatus
  fromWalletId?: string
  toWalletId?: string
  description: string
  reference?: string // 关联 ID (任务 ID、订单 ID 等)
  metadata?: Record<string, unknown>
  createdAt: Date
  completedAt?: Date
}

// ============================================================================
// API 响应包装
// ============================================================================

/**
 * API 响应包装
 */
export interface AgentApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: {
    timestamp: string
    requestId: string
  }
}

/**
 * API 响应包装（简化版）
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * 分页请求
 */
export interface PaginationRequest {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
