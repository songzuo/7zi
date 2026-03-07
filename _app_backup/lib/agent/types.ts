/**
 * 智能体类型定义
 * Agent Type Definitions
 */

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
 * 智能体角色类型
 */
export enum AgentRole {
  DIRECTOR = 'director',           // 主管
  EXPERT = 'expert',               // 智能体世界专家
  CONSULTANT = 'consultant',       // 咨询师
  ARCHITECT = 'architect',         // 架构师
  EXECUTOR = 'executor',           // Executor
  ADMIN = 'admin',                 // 系统管理员
  TESTER = 'tester',               // 测试员
  DESIGNER = 'designer',           // 设计师
  MARKETER = 'marketer',           // 推广专员
  SALES = 'sales',                 // 销售客服
  FINANCE = 'finance',             // 财务
  MEDIA = 'media',                 // 媒体
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
}

/**
 * 智能体实体
 */
export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  provider: AgentProvider;
  status: AgentStatus;
  apiKey: string;                    // API 密钥 (哈希存储)
  apiKeyPlain?: string;              // 明文 API 密钥 (仅创建时返回)
  permissions: string[];             // 权限列表
  metadata: AgentMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
}

/**
 * 智能体元数据
 */
export interface AgentMetadata {
  model?: string;                    // 使用的模型
  maxTokens?: number;                // 最大 token 数
  temperature?: number;              // 温度参数
  description?: string;              // 描述
  tags?: string[];                   // 标签
  capabilities?: string[];           // 能力列表
  config?: Record<string, unknown>;  // 自定义配置
}

/**
 * 智能体钱包
 */
export interface AgentWallet {
  id: string;
  agentId: string;
  balance: number;                   // 余额 (单位: 分)
  currency: string;                  // 货币类型
  status: WalletStatus;
  createdAt: Date;
  updatedAt: Date;
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
 * 钱包交易记录
 */
export interface WalletTransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;                    // 金额 (单位: 分)
  balance: number;                   // 交易后余额
  description: string;
  reference?: string;                // 关联 ID (任务 ID、订单 ID 等)
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * 交易类型
 */
export enum TransactionType {
  DEPOSIT = 'deposit',               // 充值
  WITHDRAW = 'withdraw',             // 提现
  TASK_REWARD = 'task_reward',       // 任务奖励
  TASK_PAYMENT = 'task_payment',     // 任务支付
  API_USAGE = 'api_usage',           // API 使用费
  TRANSFER_IN = 'transfer_in',       // 转入
  TRANSFER_OUT = 'transfer_out',     // 转出
  REFUND = 'refund',                 // 退款
  BONUS = 'bonus',                   // 奖励
  PENALTY = 'penalty',               // 罚款
}

/**
 * API 访问令牌
 */
export interface AgentToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * 智能体认证请求
 */
export interface AgentAuthRequest {
  agentId: string;
  apiKey: string;
}

/**
 * 智能体注册请求
 */
export interface AgentRegisterRequest {
  name: string;
  role: AgentRole;
  provider: AgentProvider;
  permissions?: string[];
  metadata?: AgentMetadata;
}

/**
 * 智能体数据访问请求
 */
export interface AgentDataRequest {
  dataType: DataType;
  action: DataAction;
  filters?: Record<string, unknown>;
  pagination?: {
    page: number;
    limit: number;
  };
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
 * 钱包操作请求
 */
export interface WalletOperationRequest {
  operation: WalletOperation;
  amount?: number;
  targetAgentId?: string;            // 转账目标
  description?: string;
  reference?: string;
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

/**
 * API 响应包装
 */
export interface AgentApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}