/**
 * Message Queue System - Type Definitions
 * 企业级消息队列系统类型定义
 */

// ============================================================================
// 基础类型
// ============================================================================

/**
 * 队列类型
 */
export enum QueueType {
  /** 普通队列 (FIFO) */
  NORMAL = 'normal',
  /** 优先级队列 */
  PRIORITY = 'priority',
  /** 延迟队列 */
  DELAY = 'delay',
  /** 死信队列 */
  DEAD_LETTER = 'dead-letter'
}

/**
 * 消息状态
 */
export enum MessageStatus {
  /** 等待处理 */
  PENDING = 'pending',
  /** 处理中 */
  PROCESSING = 'processing',
  /** 已确认 */
  ACKNOWLEDGED = 'acknowledged',
  /** 已拒绝 */
  REJECTED = 'rejected',
  /** 已重试 */
  RETRYING = 'retrying',
  /** 死信 */
  DEAD_LETTER = 'dead-letter'
}

/**
 * 消费者状态
 */
export enum ConsumerStatus {
  /** 空闲 */
  IDLE = 'idle',
  /** 活跃 */
  ACTIVE = 'active',
  /** 暂停 */
  PAUSED = 'paused',
  /** 错误 */
  ERROR = 'error',
  /** 离线 */
  OFFLINE = 'offline'
}

/**
 * 存储类型
 */
export type StorageType = 'memory' | 'file';

// ============================================================================
// 消息相关类型
// ============================================================================

/**
 * 消息接口
 */
export interface IMessage<T = any> {
  /** 消息唯一ID */
  id: string;
  /** 队列名称 */
  queueName: string;
  /** 消息数据 */
  data: T;
  /** 消息状态 */
  status: MessageStatus;
  /** 优先级 (1-10, 10最高) */
  priority?: number;
  /** 延迟执行时间 (毫秒) */
  delay?: number;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间 */
  expiresAt?: number;
  /** 重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 消费者ID */
  consumerId?: string;
  /** 开始处理时间 */
  processingStartedAt?: number;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 消息选项
 */
export interface IMessageOptions {
  /** 优先级 (1-10) */
  priority?: number;
  /** 延迟执行 (毫秒) */
  delay?: number;
  /** 过期时间 (毫秒) */
  ttl?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/**
 * 消息确认结果
 */
export interface IMessageAckResult {
  /** 消息ID */
  messageId: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

// ============================================================================
// 队列相关类型
// ============================================================================

/**
 * 队列配置
 */
export interface IQueueConfig {
  /** 队列名称 */
  name: string;
  /** 队列类型 */
  type: QueueType;
  /** 最大消息数 */
  maxSize?: number;
  /** 消息TTL (毫秒) */
  messageTTL?: number;
  /** 死信队列配置 */
  deadLetterQueue?: {
    /** 是否启用 */
    enabled: boolean;
    /** 死信队列名称 */
    queueName?: string;
    /** 最大重试次数 */
    maxRetries?: number;
  };
  /** 自定义配置 */
  options?: Record<string, any>;
}

/**
 * 队列统计信息
 */
export interface IQueueStats {
  /** 队列名称 */
  name: string;
  /** 队列类型 */
  type: QueueType;
  /** 总消息数 */
  totalMessages: number;
  /** 待处理消息数 */
  pendingMessages: number;
  /** 处理中消息数 */
  processingMessages: number;
  /** 已确认消息数 */
  acknowledgedMessages: number;
  /** 死信消息数 */
  deadLetterMessages: number;
  /** 消费速率 (消息/秒) */
  consumeRate: number;
  /** 生产速率 (消息/秒) */
  produceRate: number;
  /** 平均处理时间 (毫秒) */
  avgProcessingTime: number;
  /** 最后更新时间 */
  lastUpdated: number;
}

// ============================================================================
// 消费者相关类型
// ============================================================================

/**
 * 消费者配置
 */
export interface IConsumerConfig {
  /** 消费者组ID */
  groupId: string;
  /** 并发数 */
  concurrency?: number;
  /** 限流 (消息/秒) */
  rateLimit?: number;
  /** 预取数量 */
  prefetch?: number;
  /** 自动确认 */
  autoAck?: boolean;
  /** 重试策略 */
  retryPolicy?: {
    /** 最大重试次数 */
    maxRetries: number;
    /** 初始退避时间 (毫秒) */
    backoffMs: number;
    /** 退避倍数 */
    backoffMultiplier: number;
  };
  /** 健康检查间隔 (毫秒) */
  healthCheckInterval?: number;
}

/**
 * 消费者统计信息
 */
export interface IConsumerStats {
  /** 消费者ID */
  id: string;
  /** 消费者组ID */
  groupId: string;
  /** 队列名称 */
  queueName: string;
  /** 状态 */
  status: ConsumerStatus;
  /** 已处理消息数 */
  processedMessages: number;
  /** 失败消息数 */
  failedMessages: number;
  /** 当前处理中消息数 */
  processingMessages: number;
  /** 平均处理时间 (毫秒) */
  avgProcessingTime: number;
  /** 最后活跃时间 */
  lastActiveAt: number;
  /** 最后更新时间 */
  lastUpdated: number;
}

/**
 * 消费者处理器
 */
export type IMessageHandler<T = any> = (message: IMessage<T>) => Promise<boolean>;

// ============================================================================
// 事务相关类型
// ============================================================================

/**
 * 事务状态
 */
export enum TransactionStatus {
  /** 活跃 */
  ACTIVE = 'active',
  /** 已提交 */
  COMMITTED = 'committed',
  /** 已回滚 */
  ROLLED_BACK = 'rolled-back'
}

/**
 * 事务接口
 */
export interface ITransaction {
  /** 事务ID */
  id: string;
  /** 状态 */
  status: TransactionStatus;
  /** 开始时间 */
  startedAt: number;
  /** 提交事务 */
  commit(): Promise<void>;
  /** 回滚事务 */
  rollback(): Promise<void>;
  /** 发布消息 */
  publish<T>(queueName: string, data: T, options?: IMessageOptions): Promise<void>;
}

// ============================================================================
// 主题相关类型 (Pub/Sub)
// ============================================================================

/**
 * 主题订阅者
 */
export interface ITopicSubscriber {
  /** 订阅者ID */
  id: string;
  /** 订阅者名称 */
  name: string;
  /** 处理器 */
  handler: IMessageHandler;
  /** 订阅时间 */
  subscribedAt: number;
}

/**
 * 主题统计信息
 */
export interface ITopicStats {
  /** 主题名称 */
  name: string;
  /** 订阅者数量 */
  subscriberCount: number;
  /** 已发布消息数 */
  publishedMessages: number;
  /** 发布速率 (消息/秒) */
  publishRate: number;
  /** 最后更新时间 */
  lastUpdated: number;
}

// ============================================================================
// 存储相关类型
// ============================================================================

/**
 * 存储接口
 */
export interface IStorage {
  /** 初始化存储 */
  initialize(): Promise<void>;
  /** 关闭存储 */
  close(): Promise<void>;
  /** 保存消息 */
  saveMessage(message: IMessage): Promise<void>;
  /** 获取消息 */
  getMessage(messageId: string): Promise<IMessage | null>;
  /** 获取队列消息 */
  getQueueMessages(queueName: string, limit?: number): Promise<IMessage[]>;
  /** 更新消息 */
  updateMessage(message: IMessage): Promise<void>;
  /** 删除消息 */
  deleteMessage(messageId: string): Promise<void>;
  /** 清空队列 */
  clearQueue(queueName: string): Promise<void>;
  /** 获取队列统计 */
  getQueueStats(queueName: string): Promise<IQueueStats>;
}

// ============================================================================
// Broker 相关类型
// ============================================================================

/**
 * Broker 配置
 */
export interface IBrokerConfig {
  /** Broker ID */
  id: string;
  /** Broker 名称 */
  name: string;
  /** Broker 类型 */
  type: 'local' | 'remote';
  /** 连接地址 (远程) */
  url?: string;
  /** 认证信息 */
  auth?: {
    username?: string;
    password?: string;
    token?: string;
  };
  /** 是否启用 */
  enabled: boolean;
}

/**
 * Broker 统计信息
 */
export interface IBrokerStats {
  /** Broker ID */
  id: string;
  /** Broker 名称 */
  name: string;
  /** 状态 */
  status: 'online' | 'offline' | 'error';
  /** 队列数量 */
  queueCount: number;
  /** 主题数量 */
  topicCount: number;
  /** 消费者数量 */
  consumerCount: number;
  /** 总消息数 */
  totalMessages: number;
  /** 最后更新时间 */
  lastUpdated: number;
}

// ============================================================================
// 监控相关类型
// ============================================================================

/**
 * 监控事件类型
 */
export enum MonitorEventType {
  /** 队列统计更新 */
  QUEUE_STATS = 'queue:stats',
  /** 消费者统计更新 */
  CONSUMER_STATS = 'consumer:stats',
  /** 消息发布 */
  MESSAGE_PUBLISHED = 'message:published',
  /** 消息消费 */
  MESSAGE_CONSUMED = 'message:consumed',
  /** 消息失败 */
  MESSAGE_FAILED = 'message:failed',
  /** 消费者状态变化 */
  CONSUMER_STATUS = 'consumer:status',
  /** 队列创建 */
  QUEUE_CREATED = 'queue:created',
  /** 队列删除 */
  QUEUE_DELETED = 'queue:deleted'
}

/**
 * 监控事件
 */
export interface IMonitorEvent {
  /** 事件类型 */
  type: MonitorEventType;
  /** 时间戳 */
  timestamp: number;
  /** 事件数据 */
  data: any;
}

/**
 * 监控事件处理器
 */
export type MonitorEventHandler = (event: IMonitorEvent) => void;

// ============================================================================
// API 相关类型
// ============================================================================

/**
 * REST API 响应
 */
export interface IApiResponse<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * WebSocket 消息
 */
export interface IWSMessage {
  /** 消息类型 */
  type: string;
  /** 数据 */
  data: any;
  /** 时间戳 */
  timestamp: number;
}

// ============================================================================
// 主配置类型
// ============================================================================

/**
 * 消息队列配置
 */
export interface IMessageQueueOptions {
  /** 存储类型 */
  storage: StorageType;
  /** 文件存储路径 */
  storagePath?: string;
  /** 默认重试策略 */
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
  /** 默认死信队列配置 */
  deadLetterQueue?: {
    enabled: boolean;
    queueName: string;
    maxRetries: number;
  };
  /** 监控配置 */
  monitoring?: {
    enabled: boolean;
    intervalMs: number;
  };
  /** API 配置 */
  api?: {
    restEnabled: boolean;
    restPort: number;
    wsEnabled: boolean;
    wsPort: number;
  };
  /** Broker 配置 */
  brokers?: IBrokerConfig[];
}

// ============================================================================
// 错误类型
// ============================================================================

/**
 * 消息队列错误
 */
export class MessageQueueError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MessageQueueError';
  }
}

/**
 * 队列不存在错误
 */
export class QueueNotFoundError extends MessageQueueError {
  constructor(queueName: string) {
    super(`Queue not found: ${queueName}`, 'QUEUE_NOT_FOUND', { queueName });
    this.name = 'QueueNotFoundError';
  }
}

/**
 * 消费者错误
 */
export class ConsumerError extends MessageQueueError {
  constructor(
    message: string,
    public consumerId: string,
    details?: any
  ) {
    super(message, 'CONSUMER_ERROR', { consumerId, ...details });
    this.name = 'ConsumerError';
  }
}

/**
 * 事务错误
 */
export class TransactionError extends MessageQueueError {
  constructor(
    message: string,
    public transactionId: string,
    details?: any
  ) {
    super(message, 'TRANSACTION_ERROR', { transactionId, ...details });
    this.name = 'TransactionError';
  }
}