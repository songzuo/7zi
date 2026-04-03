/**
 * AI 模型提供商标识
 */
export enum AIModelProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic', // Claude
  GOOGLE = 'google', // Gemini
  DEEPSEEK = 'deepseek',
  ZHIPU = 'zhipu', // GLM
  MINIMAX = 'minimax',
  VOLCENGINE = 'volcengine',
  BAILIAN = 'bailian',
  SELF_CLAUDE = 'self-claude',
}

/**
 * 任务类型分类
 */
export enum TaskType {
  CODE_GENERATION = 'code_generation', // 代码生成
  CODE_COMPLETION = 'code_completion', // 代码补全
  CONVERSATION = 'conversation', // 对话
  ANALYSIS = 'analysis', // 分析
  TRANSLATION = 'translation', // 翻译
  SUMMARIZATION = 'summarization', // 摘要
  CREATIVE_WRITING = 'creative_writing', // 创意写作
  MATH = 'math', // 数学
  REASONING = 'reasoning', // 推理
  QA = 'qa', // 问答
  INSTRUCTION_FOLLOWING = 'instruction_following', // 指令执行
  MULTIMODAL = 'multimodal', // 多模态
}

/**
 * 任务复杂度级别
 */
export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  EXPERT = 'expert',
}

/**
 * AI 模型信息
 */
export interface AIModel {
  id: string
  name: string
  provider: AIModelProvider
  model: string // API 模型名
  displayName: string
  
  // 能力
  maxTokens: number
  supportsStreaming: boolean
  supportsVision: boolean
  supportsFunctionCalling: boolean
  contextWindow: number // 上下文窗口大小
  
  // 成本 (单位: 每百万 token)
  inputPricePerM: number
  outputPricePerM: number
  
  // 特性
  strengths: TaskType[]
  weaknesses?: TaskType[]
  isPreferredFor?: TaskType[]
  
  // 状态
  enabled: boolean
  isFallback: boolean // 是否是备用模型
  priority: number // 优先级 (数字越小越高)
}

/**
 * 模型成本配置
 */
export interface ModelCostConfig {
  provider: AIModelProvider
  model: string
  inputPricePerM: number // 输入价格 (每百万 token)
  outputPricePerM: number // 输出价格 (每百万 token)
  currency: string
}

/**
 * 任务路由请求
 */
export interface RouteRequest {
  taskType?: TaskType
  prompt: string
  maxTokens?: number
  complexity?: ComplexityLevel
  budget?: number // 最大预算 (分)
  preferredProvider?: AIModelProvider
  requiredCapabilities?: string[]
  temperature?: number
  systemPrompt?: string
  history?: MessageContext[]

  // 选项
  requireStreaming?: boolean
  requireVision?: boolean
  requireFunctionCalling?: boolean
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
  selectedModel: AIModel
  fallbackModels: AIModel[]
  reasoning: string
  estimatedCost: number // 预计成本 (分)
  estimatedLatency: number // 预计延迟 (ms)
  confidence: number // 置信度 0-1
}

/**
 * 速率限制配置
 */
export interface RateLimitConfig {
  requestsPerMinute: number
  tokensPerMinute: number
  burstLimit?: number
}

/**
 * 缓存条目
 */
export interface CacheEntry {
  requestHash: string
  response: unknown
  createdAt: number
  expiresAt: number
  tokens: number
}

/**
 * 模型状态
 */
export interface ModelStatus {
  modelId: string
  isAvailable: boolean
  lastChecked: number
  errorCount: number
  avgLatency: number
  rpm: number // 当前 RPM
  tpm: number // 当前 TPM
}

/**
 * 路由策略配置
 */
export interface RouterConfig {
  defaultModelId: string
  fallbackChain: string[] // 备用模型链
  enableCostOptimization: boolean
  enableLatencyOptimization: boolean
  enableSemanticCache: boolean
  cacheSimilarityThreshold: number // 缓存相似度阈值 (0-1)
  rateLimits: Record<string, RateLimitConfig>
  budgetLimits: {
    dailyLimit: number // 每日预算 (分)
    perRequestLimit: number // 单次请求预算 (分)
  }
}