/**
 * Webhook 事件系统类型定义
 * 7zi-frontend v1.12.2
 */

// ==================== 事件类型 ====================

/**
 * 支持的 Webhook 事件类型
 */
export type WebhookEventType =
  // 工作流事件
  | 'workflow.started'
  | 'workflow.completed'
  | 'workflow.failed'
  | 'workflow.paused'
  | 'workflow.resumed'
  | 'workflow.cancelled'
  // 节点执行事件
  | 'workflow.node.executed'
  | 'workflow.node.started'
  | 'workflow.node.completed'
  | 'workflow.node.failed'
  // 告警事件
  | 'alert.triggered'
  | 'alert.resolved'
  | 'alert.escalated'
  // 监控事件
  | 'monitoring.threshold.exceeded'
  | 'monitoring.service.down'
  // 自定义事件
  | 'custom.event';

/**
 * 事件类型的中文描述映射
 */
export const WEBHOOK_EVENT_TYPE_LABELS: Record<WebhookEventType, string> = {
  // 工作流事件
  'workflow.started': '工作流启动',
  'workflow.completed': '工作流完成',
  'workflow.failed': '工作流失败',
  'workflow.paused': '工作流暂停',
  'workflow.resumed': '工作流恢复',
  'workflow.cancelled': '工作流取消',
  // 节点执行事件
  'workflow.node.executed': '节点执行',
  'workflow.node.started': '节点开始',
  'workflow.node.completed': '节点完成',
  'workflow.node.failed': '节点失败',
  // 告警事件
  'alert.triggered': '告警触发',
  'alert.resolved': '告警解决',
  'alert.escalated': '告警升级',
  // 监控事件
  'monitoring.threshold.exceeded': '阈值超过',
  'monitoring.service.down': '服务宕机',
  // 自定义事件
  'custom.event': '自定义事件',
};

// ==================== 事件数据结构 ====================

/**
 * Webhook 事件基础接口
 */
export interface WebhookEventBase {
  /** 事件唯一 ID */
  id: string;
  /** 事件类型 */
  type: WebhookEventType;
  /** 事件发生时间 (ISO 8601) */
  timestamp: string;
  /** 事件来源 */
  source: string;
  /** 租户 ID (可选) */
  tenantId?: string;
  /** 用户 ID (可选) */
  userId?: string;
}

/**
 * 工作流相关事件数据
 */
export interface WorkflowEventData {
  /** 工作流 ID */
  workflowId: string;
  /** 工作流名称 */
  workflowName: string;
  /** 工作流版本 */
  workflowVersion?: number;
  /** 执行 ID */
  executionId: string;
  /** 节点 ID (用于节点事件) */
  nodeId?: string;
  /** 节点名称 (用于节点事件) */
  nodeName?: string;
  /** 节点类型 (用于节点事件) */
  nodeType?: string;
  /** 错误信息 (用于失败事件) */
  error?: string;
  /** 错误堆栈 (用于失败事件) */
  errorStack?: string;
  /** 执行时长 (毫秒) */
  duration?: number;
  /** 额外数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 告警相关事件数据
 */
export interface AlertEventData {
  /** 告警 ID */
  alertId: string;
  /** 告警名称 */
  alertName: string;
  /** 告警级别 */
  severity: 'info' | 'warning' | 'error' | 'critical';
  /** 告警消息 */
  message: string;
  /** 触发条件 */
  condition?: string;
  /** 当前值 */
  currentValue?: number;
  /** 阈值 */
  threshold?: number;
  /** 额外数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 监控相关事件数据
 */
export interface MonitoringEventData {
  /** 监控项名称 */
  metricName: string;
  /** 监控项标签 */
  labels?: Record<string, string>;
  /** 当前值 */
  value: number;
  /** 阈值 */
  threshold?: number;
  /** 服务名称 */
  serviceName?: string;
  /** 额外数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 自定义事件数据
 */
export interface CustomEventData {
  /** 事件名称 */
  eventName: string;
  /** 事件数据 */
  data: Record<string, unknown>;
}

/**
 * 完整的 Webhook 事件
 */
export type WebhookEvent =
  | (WebhookEventBase & { type: 'workflow.started' | 'workflow.completed' | 'workflow.paused' | 'workflow.resumed' | 'workflow.cancelled'; data: WorkflowEventData })
  | (WebhookEventBase & { type: 'workflow.failed'; data: WorkflowEventData })
  | (WebhookEventBase & { type: 'workflow.node.executed' | 'workflow.node.started' | 'workflow.node.completed' | 'workflow.node.failed'; data: WorkflowEventData })
  | (WebhookEventBase & { type: 'alert.triggered' | 'alert.resolved' | 'alert.escalated'; data: AlertEventData })
  | (WebhookEventBase & { type: 'monitoring.threshold.exceeded' | 'monitoring.service.down'; data: MonitoringEventData })
  | (WebhookEventBase & { type: 'custom.event'; data: CustomEventData });

// ==================== Webhook 配置 ====================

/**
 * Webhook 配置状态
 */
export type WebhookStatus = 'active' | 'inactive' | 'error';

/**
 * Webhook 订阅配置
 */
export interface WebhookSubscription {
  /** 订阅 ID */
  id: string;
  /** Webhook 名称 */
  name: string;
  /** Webhook 描述 */
  description?: string;
  /** 回调 URL */
  url: string;
  /** 签名密钥 (用于 HMAC-SHA256) */
  secret?: string;
  /** 订阅的事件类型列表 */
  events: WebhookEventType[];
  /** 是否启用 */
  isActive: boolean;
  /** 状态 */
  status: WebhookStatus;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 上次成功时间 */
  lastSuccessAt?: string;
  /** 上次失败时间 */
  lastErrorAt?: string;
  /** 错误消息 */
  lastErrorMessage?: string;
  /** 请求头 (自定义) */
  headers?: Record<string, string>;
  /** 重试次数 */
  retryCount?: number;
  /** 超时时间 (毫秒) */
  timeout?: number;
}

/**
 * 创建 Webhook 订阅的输入
 */
export interface CreateWebhookInput {
  name: string;
  description?: string;
  url: string;
  secret?: string;
  events: WebhookEventType[];
  isActive?: boolean;
  headers?: Record<string, string>;
  retryCount?: number;
  timeout?: number;
}

/**
 * 更新 Webhook 订阅的输入
 */
export interface UpdateWebhookInput {
  name?: string;
  description?: string;
  url?: string;
  secret?: string;
  events?: WebhookEventType[];
  isActive?: boolean;
  headers?: Record<string, string>;
  retryCount?: number;
  timeout?: number;
}

// ==================== 交付记录 ====================

/**
 * Webhook 交付状态
 */
export type DeliveryStatus = 'pending' | 'success' | 'failed' | 'retrying' | 'timeout';

/**
 * Webhook 交付记录
 */
export interface WebhookDelivery {
  /** 交付 ID */
  id: string;
  /** 订阅 ID */
  subscriptionId: string;
  /** 事件 ID */
  eventId: string;
  /** 事件类型 */
  eventType: WebhookEventType;
  /** 目标 URL */
  url: string;
  /** 请求 payload */
  payload: string;
  /** 请求头 */
  headers: Record<string, string>;
  /** HTTP 状态码 */
  statusCode?: number;
  /** 响应 body */
  responseBody?: string;
  /** 交付状态 */
  status: DeliveryStatus;
  /** 尝试次数 */
  attempt: number;
  /** 最大重试次数 */
  maxAttempts: number;
  /** 延迟 (毫秒) */
  delay?: number;
  /** 错误消息 */
  error?: string;
  /** 开始时间 */
  startedAt: string;
  /** 完成时间 */
  completedAt?: string;
  /** 耗时 (毫秒) */
  duration?: number;
}

/**
 * 创建交付记录的输入
 */
export interface CreateDeliveryInput {
  subscriptionId: string;
  eventId: string;
  eventType: WebhookEventType;
  url: string;
  payload: string;
  headers: Record<string, string>;
  attempt: number;
  maxAttempts: number;
}

// ==================== 日志记录 ====================

/**
 * Webhook 日志级别
 */
export type WebhookLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Webhook 日志条目
 */
export interface WebhookLog {
  /** 日志 ID */
  id: string;
  /** 级别 */
  level: WebhookLogLevel;
  /** 消息 */
  message: string;
  /** 上下文 */
  context?: Record<string, unknown>;
  /** 时间戳 */
  timestamp: string;
  /** 订阅 ID (可选) */
  subscriptionId?: string;
  /** 交付 ID (可选) */
  deliveryId?: string;
}

/**
 * 日志过滤选项
 */
export interface WebhookLogFilter {
  subscriptionId?: string;
  deliveryId?: string;
  level?: WebhookLogLevel;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
}

// ==================== 签名验证 ====================

/**
 * 签名验证结果
 */
export interface SignatureValidationResult {
  isValid: boolean;
  expectedSignature?: string;
  actualSignature?: string;
  algorithm?: string;
}

// ==================== 批量操作 ====================

/**
 * 批量更新 Webhook 状态
 */
export interface BatchUpdateWebhookStatus {
  subscriptionIds: string[];
  isActive: boolean;
}

/**
 * 批量删除结果
 */
export interface BatchDeleteResult {
  deleted: string[];
  failed: Array<{ id: string; error: string }>;
}

/**
 * 测试事件结果
 */
export interface TestEventResult {
  success: boolean;
  deliveryId: string;
  subscriptionId: string;
  statusCode?: number;
  responseBody?: string;
  duration: number;
  error?: string;
}
