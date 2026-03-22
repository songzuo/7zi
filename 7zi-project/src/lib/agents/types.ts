/**
 * 智能体相关类型定义
 * Agent Types - For AI Agent Integration
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
 * 智能体类型
 */
export enum AgentType {
  ASSISTANT = 'assistant',
  WORKER = 'worker',
  SUPERVISOR = 'supervisor',
  SPECIALIST = 'specialist',
}

/**
 * 智能体模型提供商
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
 * 智能体角色
 */
export enum AgentRole {
  DIRECTOR = 'director',
  EXECUTOR = 'executor',
  ADMIN = 'admin',
  ARCHITECT = 'architect',
  DESIGNER = 'designer',
  TESTER = 'tester',
  FINANCE = 'finance',
}

/**
 * 智能体主体
 */
export interface Agent {
  id: string;
  name: string;
  description?: string;
  type: AgentType;
  provider: AgentProvider;
  model?: string;
  apiKey?: string; // 加密存储
  webhookUrl?: string;
  status: AgentStatus;
  role?: AgentRole;
  permissions: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;
}

/**
 * 智能体认证令牌
 */
export interface AgentToken {
  id: string;
  agentId: string;
  token: string; // JWT token
  refreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
  scopes: string[];
  createdAt: Date;
  lastUsedAt?: Date;
}

/**
 * 智能体认证请求
 */
export interface AgentAuthRequest {
  agentId: string;
  apiKey: string;
  scopes?: string[];
}

/**
 * 智能体注册请求
 */
export interface AgentRegisterRequest {
  name: string;
  type?: AgentType;
  role?: AgentRole;
  provider?: AgentProvider;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * 智能体认证响应
 */
export interface AgentAuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
  agent?: Omit<Agent, 'apiKey'>;
  error?: string;
}

/**
 * 令牌刷新请求
 */
export interface TokenRefreshRequest {
  refreshToken: string;
}

/**
 * 智能体数据访问记录
 */
export interface AgentDataAccess {
  id: string;
  agentId: string;
  resourceType: string;
  resourceId: string;
  action: 'read' | 'write' | 'delete';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * 智能体钱包
 */
export interface AgentWallet {
  id: string;
  agentId: string;
  balance: number;
  currency: string;
  frozenBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 钱包交易类型
 */
export enum TransactionType {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  TRANSFER = 'transfer',
  REWARD = 'reward',
  CONSUME = 'consume',
  REFUND = 'refund',
}

/**
 * 钱包交易状态
 */
export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * 钱包交易记录
 */
export interface WalletTransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  fromWalletId?: string;
  toWalletId?: string;
  description?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * 创建智能体请求
 */
export interface CreateAgentRequest {
  name: string;
  description?: string;
  type: AgentType;
  provider: AgentProvider;
  model?: string;
  webhookUrl?: string;
  role?: AgentRole;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * 更新智能体请求
 */
export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  type?: AgentType;
  provider?: AgentProvider;
  model?: string;
  webhookUrl?: string;
  status?: AgentStatus;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * 钱包操作请求
 */
export interface WalletOperationRequest {
  agentId: string;
  amount: number;
  type: TransactionType;
  description?: string;
  targetAgentId?: string; // 用于转账
  metadata?: Record<string, unknown>;
}

/**
 * API 响应包装
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 分页请求
 */
export interface PaginationRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
