/**
 * 智能体通信类型定义
 * Agent Communication Types
 */

/**
 * 消息类型
 */
export enum MessageType {
  // 任务相关
  TASK_ASSIGN = 'task_assign', // 任务分配
  TASK_ACCEPT = 'task_accept', // 任务接受
  TASK_REJECT = 'task_reject', // 任务拒绝
  TASK_COMPLETE = 'task_complete', // 任务完成
  TASK_FAIL = 'task_fail', // 任务失败
  TASK_QUERY = 'task_query', // 任务查询
  TASK_UPDATE = 'task_update', // 任务更新

  // 协作相关
  COLLAB_REQUEST = 'collab_request', // 协作请求
  COLLAB_ACCEPT = 'collab_accept', // 协作接受
  COLLAB_REJECT = 'collab_reject', // 协作拒绝
  COLLAB_SYNC = 'collab_sync', // 协作同步

  // 数据相关
  DATA_REQUEST = 'data_request', // 数据请求
  DATA_RESPONSE = 'data_response', // 数据响应
  DATA_PUSH = 'data_push', // 数据推送

  // 通知相关
  NOTIFY_INFO = 'notify_info', // 信息通知
  NOTIFY_WARNING = 'notify_warning', // 警告通知
  NOTIFY_ERROR = 'notify_error', // 错误通知
  NOTIFY_SUCCESS = 'notify_success', // 成功通知

  // 系统相关
  HEARTBEAT = 'heartbeat', // 心跳
  HEARTBEAT_ACK = 'heartbeat_ack', // 心跳确认
  STATUS_UPDATE = 'status_update', // 状态更新
  CAPABILITY_QUERY = 'capability_query', // 能力查询
  CAPABILITY_RESPONSE = 'capability_response', // 能力响应

  // 会议相关
  MEETING_INVITE = 'meeting_invite', // 会议邀请
  MEETING_ACCEPT = 'meeting_accept', // 会议接受
  MEETING_REJECT = 'meeting_reject', // 会议拒绝
  MEETING_START = 'meeting_start', // 会议开始
  MEETING_END = 'meeting_end', // 会议结束
  MEETING_MESSAGE = 'meeting_message', // 会议消息

  // 投票相关
  VOTE_START = 'vote_start', // 投票开始
  VOTE_CAST = 'vote_cast', // 投票
  VOTE_RESULT = 'vote_result', // 投票结果

  // 自定义
  CUSTOM = 'custom', // 自定义消息
}

/**
 * 消息优先级
 */
export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * 消息状态
 */
export enum MessageStatus {
  PENDING = 'pending', // 待发送
  SENT = 'sent', // 已发送
  DELIVERED = 'delivered', // 已送达
  READ = 'read', // 已读
  FAILED = 'failed', // 发送失败
  EXPIRED = 'expired', // 已过期
}

/**
 * 通信协议版本
 */
export const PROTOCOL_VERSION = '1.0.0'

/**
 * 智能体消息信封
 */
export interface AgentMessageEnvelope {
  // 协议信息
  version: string // 协议版本
  messageId: string // 消息唯一 ID
  timestamp: Date // 时间戳

  // 发送方信息
  from: AgentEndpoint // 发送方

  // 接收方信息
  to: AgentEndpoint | AgentEndpoint[] // 接收方（单个或多个）

  // 消息内容
  type: MessageType // 消息类型
  priority: MessagePriority // 优先级
  ttl?: number // 生存时间（秒）
  correlationId?: string // 关联 ID（用于请求-响应模式）
  replyTo?: string // 回复地址

  // 消息体
  payload: unknown // 消息负载

  // 元数据
  metadata?: MessageMetadata
}

/**
 * 智能体端点
 */
export interface AgentEndpoint {
  agentId: string // 智能体 ID
  role?: string // 角色
  name?: string // 名称
  sessionId?: string // 会话 ID
}

/**
 * 消息元数据
 */
export interface MessageMetadata {
  traceId?: string // 追踪 ID
  spanId?: string // Span ID
  tags?: Record<string, string> // 标签
  retryCount?: number // 重试次数
  maxRetries?: number // 最大重试次数
  source?: string // 来源系统
  [key: string]: unknown // 其他元数据
}

/**
 * 消息投递确认
 */
export interface MessageAck {
  messageId: string // 原消息 ID
  status: MessageStatus
  timestamp: Date
  error?: {
    code: string
    message: string
  }
}

/**
 * 任务消息负载
 */
export interface TaskPayload {
  taskId: string
  taskType: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  deadline?: Date
  dependencies?: string[]
  parameters?: Record<string, unknown>
  context?: Record<string, unknown>
}

/**
 * 协作消息负载
 */
export interface CollaborationPayload {
  collaborationId: string
  type: 'request' | 'share' | 'sync' | 'handoff'
  resource?: string
  action?: string
  data?: unknown
  permissions?: string[]
}

/**
 * 数据消息负载
 */
export interface DataPayload {
  dataType: string
  action: 'read' | 'write' | 'update' | 'delete' | 'query'
  query?: Record<string, unknown>
  data?: unknown
  pagination?: {
    page: number
    limit: number
    total?: number
  }
}

/**
 * 通知消息负载
 */
export interface NotificationPayload {
  title: string
  content: string
  level: 'info' | 'warning' | 'error' | 'success'
  action?: {
    type: string
    target: string
    label: string
  }
  persistent?: boolean
  expiresAt?: Date
}

/**
 * 心跳消息负载
 */
export interface HeartbeatPayload {
  status: 'active' | 'busy' | 'idle' | 'offline'
  load?: number // 负载 (0-100)
  queueSize?: number // 队列大小
  uptime?: number // 运行时间（秒）
  metrics?: Record<string, number> // 自定义指标
}

/**
 * 能力查询负载
 */
export interface CapabilityPayload {
  capabilities: string[]
  skills?: string[]
  limitations?: string[]
  preferences?: Record<string, unknown>
}

/**
 * 会议消息负载
 */
export interface MeetingPayload {
  meetingId: string
  title: string
  description?: string
  startTime: Date
  endTime?: Date
  participants: AgentEndpoint[]
  agenda?: string[]
  type: 'standup' | 'planning' | 'review' | 'discussion' | 'vote'
}

/**
 * 投票消息负载
 */
export interface VotePayload {
  voteId: string
  topic: string
  description?: string
  options: VoteOption[]
  deadline?: Date
  anonymous?: boolean
  quorum?: number // 最少参与人数
}

/**
 * 投票选项
 */
export interface VoteOption {
  id: string
  label: string
  description?: string
}

/**
 * 投票结果
 */
export interface VoteResult {
  voteId: string
  totalVotes: number
  results: Array<{
    optionId: string
    count: number
    percentage: number
  }>
  winner?: string
  completedAt: Date
}

/**
 * 消息处理器
 */
export type MessageHandler = (message: AgentMessageEnvelope) => Promise<void | AgentMessageEnvelope>

/**
 * 消息过滤器
 */
export type MessageFilter = (message: AgentMessageEnvelope) => boolean | Promise<boolean>

/**
 * 消息转换器
 */
export type MessageTransformer = (
  message: AgentMessageEnvelope
) => AgentMessageEnvelope | Promise<AgentMessageEnvelope>

/**
 * 通信配置
 */
export interface CommunicationConfig {
  // 连接配置
  endpoint: string // 通信端点
  reconnect: boolean // 是否自动重连
  reconnectInterval: number // 重连间隔（毫秒）
  maxReconnectAttempts: number // 最大重连次数

  // 消息配置
  defaultTTL: number // 默认消息 TTL（秒）
  maxMessageSize: number // 最大消息大小（字节）
  ackTimeout: number // 确认超时（毫秒）

  // 心跳配置
  heartbeatInterval: number // 心跳间隔（毫秒）
  heartbeatTimeout: number // 心跳超时（毫秒）

  // 队列配置
  queueSize: number // 消息队列大小
  persistMessages: boolean // 是否持久化消息

  // 安全配置
  encryptMessages: boolean // 是否加密消息
  verifySignatures: boolean // 是否验证签名
}

/**
 * 通信统计
 */
export interface CommunicationStats {
  messagesSent: number
  messagesReceived: number
  messagesFailed: number
  averageLatency: number
  queueSize: number
  lastHeartbeat?: Date
  uptime: number
}

/**
 * 消息订阅
 */
export interface MessageSubscription {
  id: string
  filter: MessageFilter
  handler: MessageHandler
  createdAt: Date
}
