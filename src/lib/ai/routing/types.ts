/**
 * 多模型智能路由系统 - 类型定义
 * v1.10.0
 */

/**
 * 模型能力标签
 */
export enum ModelCapability {
  CODE = 'code', // 代码生成/补全
  TEXT = 'text', // 文本生成/对话
  IMAGE = 'image', // 图像理解/生成
  AUDIO = 'audio', // 音频处理
  REASONING = 'reasoning', // 复杂推理
  MULTIMODAL = 'multimodal', // 多模态
  FUNCTION_CALLING = 'function_calling', // 函数调用
  STREAMING = 'streaming', // 流式输出
}

/**
 * 模型优先级
 */
export enum ModelPriority {
  CRITICAL = 0, // 关键模型（最高优先级）
  HIGH = 1, // 高优先级
  NORMAL = 2, // 普通优先级
  LOW = 3, // 低优先级
  FALLBACK = 4, // 备用模型
}

/**
 * 模型状态
 */
export enum ModelStatus {
  AVAILABLE = 'available', // 可用
  UNAVAILABLE = 'unavailable', // 不可用
  RATE_LIMITED = 'rate_limited', // 速率限制
  ERROR = 'error', // 错误状态
  MAINTENANCE = 'maintenance', // 维护中
}

/**
 * 任务类型
 */
export enum TaskType {
  CODE_GENERATION = 'code_generation',
  CODE_COMPLETION = 'code_completion',
  CONVERSATION = 'conversation',
  ANALYSIS = 'analysis',
  TRANSLATION = 'translation',
  SUMMARIZATION = 'summarization',
  CREATIVE_WRITING = 'creative_writing',
  MATH = 'math',
  REASONING = 'reasoning',
  QA = 'qa',
  INSTRUCTION_FOLLOWING = 'instruction_following',
  MULTIMODAL = 'multimodal',
}

/**
 * 任务复杂度
 */
export enum TaskComplexity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXPERT = 'expert',
}

/**
 * 路由策略
 */
export enum RoutingStrategy {
  COST_OPTIMIZED = 'cost_optimized', // 成本优化
  LATENCY_OPTIMIZED = 'latency_optimized', // 延迟优化
  QUALITY_OPTIMIZED = 'quality_optimized', // 质量优化
  BALANCED = 'balanced', // 平衡策略
  CUSTOM = 'custom', // 自定义策略
}

/**
 * 模型配置
 */
export interface ModelConfig {
  id: string
  name: string
  provider: string
  model: string // API 模型名
  displayName: string

  // 能力标签
  capabilities: ModelCapability[]

  // 性能参数
  maxTokens: number
  contextWindow: number

  // 成本配置 (单位: 每百万 token，分)
  inputPricePerM: number
  outputPricePerM: number

  // 速率限制
  rateLimit?: {
    requestsPerMinute: number
    tokensPerMinute: number
  }

  // 性能指标
  avgLatencyMs?: number // 平均延迟
  reliabilityScore?: number // 可靠性评分 (0-1)

  // 优先级
  priority: ModelPriority

  // 状态
  enabled: boolean
  status: ModelStatus

  // 元数据
  metadata?: Record<string, unknown>
}

/**
 * 模型注册信息
 */
export interface ModelRegistration {
  config: ModelConfig
  registeredAt: number
  lastUpdated: number
}

/**
 * 路由请求
 */
export interface RouteRequest {
  taskType: TaskType
  prompt: string
  complexity?: TaskComplexity
  maxTokens?: number
  budget?: number // 最大预算 (分)

  // 能力要求
  requiredCapabilities?: ModelCapability[]

  // 偏好
  preferredProvider?: string
  preferredModelId?: string
  avoidModels?: string[] // 避免使用的模型

  // 路由策略
  strategy?: RoutingStrategy

  // 上下文
  history?: MessageContext[]
  systemPrompt?: string

  // 其他参数
  temperature?: number
  topP?: number
}

/**
 * 消息上下文
 */
export interface MessageContext {
  role: 'system' | 'user' | 'assistant'
  content: string
  tokens?: number
}

/**
 * 路由决策
 */
export interface RouteDecision {
  selectedModel: ModelConfig
  fallbackModels: ModelConfig[]
  reasoning: string
  estimatedCost: number // 预计成本 (分)
  estimatedLatency: number // 预计延迟 (ms)
  confidence: number // 置信度 (0-1)
  strategy: RoutingStrategy
}

/**
 * 路由统计
 */
export interface RoutingStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  cacheHits: number
  fallbacks: number
  byModel: Map<string, number>
  byTaskType: Map<TaskType, number>
  byStrategy: Map<RoutingStrategy, number>
  avgLatency: number
  totalCost: number
}

/**
 * 请求队列项
 */
export interface QueueItem {
  id: string
  request: RouteRequest
  priority: number
  createdAt: number
  timeout?: number
  callback: (decision: RouteDecision) => void
  errorCallback: (error: Error) => void
}

/**
 * 并发控制配置
 */
export interface ConcurrencyConfig {
  maxConcurrent: number // 最大并发数
  maxQueueSize: number // 最大队列大小
  queueTimeout: number // 队列超时 (ms)
}

/**
 * 路由器配置
 */
export interface RouterConfig {
  // 默认配置
  defaultStrategy: RoutingStrategy
  defaultModelId?: string

  // 并发控制
  concurrency: ConcurrencyConfig

  // 缓存配置
  enableCache: boolean
  cacheTTL: number // 缓存过期时间 (ms)
  cacheSimilarityThreshold: number // 相似度阈值 (0-1)

  // 降级配置
  enableFallback: boolean
  maxFallbackAttempts: number
  fallbackDelayMs: number

  // 成本优化
  enableCostOptimization: boolean
  dailyBudgetLimit?: number // 每日预算限制 (分)

  // 监控
  enableMetrics: boolean
  metricsInterval: number // 指标收集间隔 (ms)
}

/**
 * 模型健康检查结果
 */
export interface ModelHealthCheck {
  modelId: string
  isHealthy: boolean
  latency?: number
  error?: string
  checkedAt: number
}

/**
 * 路由策略可视化数据
 */
export interface RoutingVisualization {
  request: RouteRequest
  decision: RouteDecision
  candidates: Array<{
    model: ModelConfig
    score: number
    reasons: string[]
  }>
  timeline: Array<{
    timestamp: number
    event: string
    details?: string
  }>
}

/**
 * 环境变量配置
 */
export interface EnvConfig {
  // 默认模型
  DEFAULT_MODEL_ID?: string
  DEFAULT_STRATEGY?: RoutingStrategy

  // 成本配置
  DAILY_BUDGET_LIMIT?: number
  ENABLE_COST_OPTIMIZATION?: string

  // 并发配置
  MAX_CONCURRENT_REQUESTS?: number
  MAX_QUEUE_SIZE?: number

  // 缓存配置
  ENABLE_CACHE?: string
  CACHE_TTL?: number

  // 降级配置
  ENABLE_FALLBACK?: string
  MAX_FALLBACK_ATTEMPTS?: number

  // 监控配置
  ENABLE_METRICS?: string
}