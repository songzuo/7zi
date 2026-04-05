/**
 * AI Dialogue Enhancement System - Core Types
 * AI 对话增强系统 - 核心类型定义
 * v1.13.0
 */

// ============================================
// Dialogue Turn Types
// ============================================

export interface DialogueTurn {
  id: string
  userId: string
  content: string
  timestamp: number
  /** 对话轮次 */
  turnNumber: number
  /** 意图 */
  intent?: string
  /** 意图置信度 */
  intentConfidence?: number
  /** 情感 */
  sentiment?: SentimentResult
  /** 上下文引用 */
  references?: Reference[]
  /** 话题 */
  topic?: string
  /** 元数据 */
  metadata?: Record<string, unknown>
}

export interface DialogueContext {
  /** 对话ID */
  dialogueId: string
  /** 当前话题 */
  currentTopic: string
  /** 话题历史 */
  topicHistory: TopicTransition[]
  /** 对话轮次 */
  turns: DialogueTurn[]
  /** 全局上下文 */
  globalContext: Record<string, unknown>
  /** 用户偏好 */
  userPreferences: UserPreferences
  /** 对话状态 */
  state: DialogueState
}

// ============================================
// Intent Types
// ============================================

export type IntentCategory =
  | 'question'
  | 'request'
  | 'command'
  | 'greeting'
  | 'farewell'
  | 'complaint'
  | 'compliment'
  | 'clarification'
  | 'confirmation'
  | 'negation'
  | 'unknown'

export interface IntentResult {
  /** 意图类别 */
  category: IntentCategory
  /** 置信度 (0-1) */
  confidence: number
  /** 意图详情 */
  details?: {
    /** 子意图 */
    subIntent?: string
    /** 实体 */
    entities?: Entity[]
    /** 关键词 */
    keywords?: string[]
  }
}

export interface Entity {
  type: string
  value: string
  confidence: number
  start: number
  end: number
}

// ============================================
// Sentiment Types
// ============================================

export type SentimentLabel = 'positive' | 'negative' | 'neutral' | 'mixed'

export interface SentimentResult {
  /** 情感标签 */
  label: SentimentLabel
  /** 置信度 (0-1) */
  confidence: number
  /** 情感强度 (-1 到 1) */
  intensity: number
  /** 详细情感 */
  emotions?: EmotionScore[]
}

export interface EmotionScore {
  emotion: string
  score: number
}

// ============================================
// Reference Types
// ============================================

export interface Reference {
  /** 引用类型 */
  type: 'anaphora' | 'cataphora' | 'coreference' | 'ellipsis'
  /** 引用内容 */
  content: string
  /** 引用的轮次ID */
  referencedTurnId?: string
  /** 引用的内容 */
  referencedContent?: string
  /** 置信度 */
  confidence: number
}

// ============================================
// Topic Types
// ============================================

export interface TopicTransition {
  /** 旧话题 */
  fromTopic: string
  /** 新话题 */
  toTopic: string
  /** 转换类型 */
  transitionType: 'gradual' | 'abrupt' | 'return' | 'branch'
  /** 转换时间 */
  timestamp: number
  /** 转换置信度 */
  confidence: number
}

export interface TopicDetectionResult {
  /** 当前话题 */
  topic: string
  /** 置信度 */
  confidence: number
  /** 关键词 */
  keywords: string[]
  /** 是否话题转换 */
  isTransition: boolean
  /** 转换信息 */
  transition?: TopicTransition
}

// ============================================
// Dialogue State Machine Types
// ============================================

export type DialogueState =
  | 'greeting'
  | 'active'
  | 'clarifying'
  | 'resolving'
  | 'closing'
  | 'error'

export interface StateTransition {
  from: DialogueState
  to: DialogueState
  trigger: string
  confidence: number
}

export interface DialogueStateMachine {
  /** 当前状态 */
  currentState: DialogueState
  /** 状态历史 */
  stateHistory: StateTransition[]
  /** 转换规则 */
  transitionRules: TransitionRule[]
}

export interface TransitionRule {
  from: DialogueState
  to: DialogueState
  /** 触发条件 */
  condition: (context: DialogueContext) => boolean
  /** 转换动作 */
  action?: (context: DialogueContext) => void
}

// ============================================
// Response Types
// ============================================

export interface AdaptiveResponse {
  /** 响应内容 */
  content: string
  /** 响应策略 */
  strategy: ResponseStrategy
  /** 情感适配 */
  sentimentAdaptation: SentimentAdaptation
  /** 上下文适配 */
  contextAdaptation: ContextAdaptation
  /** 模板ID */
  templateId?: string
  /** 模板变量 */
  templateVariables?: Record<string, string>
}

export type ResponseStrategy =
  | 'direct'
  | 'empathetic'
  | 'clarifying'
  | 'educational'
  | 'problem-solving'
  | 'conversational'

export interface SentimentAdaptation {
  /** 目标情感 */
  targetSentiment: SentimentLabel
  /** 语气调整 */
  toneAdjustment: 'formal' | 'casual' | 'friendly' | 'professional'
  /** 情感强度调整 */
  intensityAdjustment: number
}

export interface ContextAdaptation {
  /** 上下文相关性 */
  relevanceScore: number
  /** 引用历史 */
  historicalReferences: string[]
  /** 话题一致性 */
  topicConsistency: number
}

// ============================================
// Template Types
// ============================================

export interface DialogueTemplate {
  /** 模板ID */
  id: string
  /** 模板名称 */
  name: string
  /** 模板类别 */
  category: TemplateCategory
  /** 模板内容 */
  content: string
  /** 变量定义 */
  variables: TemplateVariable[]
  /** 适用条件 */
  conditions?: TemplateCondition[]
  /** 优先级 */
  priority: number
  /** 是否启用 */
  enabled: boolean
}

export type TemplateCategory =
  | 'greeting'
  | 'farewell'
  | 'clarification'
  | 'confirmation'
  | 'error'
  | 'success'
  | 'empathy'
  | 'general'

export interface TemplateVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array'
  required: boolean
  defaultValue?: unknown
  description?: string
}

export interface TemplateCondition {
  /** 条件类型 */
  type: 'sentiment' | 'intent' | 'topic' | 'state'
  /** 条件值 */
  value: string | string[]
  /** 操作符 */
  operator: 'equals' | 'contains' | 'matches' | 'in'
}

// ============================================
// User Preferences
// ============================================

export interface UserPreferences {
  /** 偏好的语气 */
  preferredTone: 'formal' | 'casual' | 'friendly' | 'professional'
  /** 偏好的响应长度 */
  preferredLength: 'short' | 'medium' | 'long'
  /** 是否使用表情符号 */
  useEmojis: boolean
  /** 语言偏好 */
  language: string
  /** 自定义偏好 */
  customPreferences?: Record<string, unknown>
}

// ============================================
// Coherence Scoring
// ============================================

export interface CoherenceScore {
  /** 总体连贯性 (0-5) */
  overall: number
  /** 话题连贯性 */
  topicCoherence: number
  /** 意图连贯性 */
  intentCoherence: number
  /** 情感连贯性 */
  sentimentCoherence: number
  /** 引用连贯性 */
  referenceCoherence: number
  /** 详细分析 */
  analysis: CoherenceAnalysis
}

export interface CoherenceAnalysis {
  /** 话题转换次数 */
  topicTransitions: number
  /** 平均话题持续时间 */
  avgTopicDuration: number
  /** 意图一致性 */
  intentConsistency: number
  /** 情感稳定性 */
  sentimentStability: number
  /** 引用准确性 */
  referenceAccuracy: number
}

// ============================================
// Configuration
// ============================================

export interface DialogueEnhancementConfig {
  /** 最大对话轮次 */
  maxTurns: number
  /** 最大上下文长度 */
  maxContextLength: number
  /** 意图识别阈值 */
  intentThreshold: number
  /** 情感分析阈值 */
  sentimentThreshold: number
  /** 话题转换阈值 */
  topicTransitionThreshold: number
  /** 连贯性评分目标 */
  coherenceTarget: number
  /** 是否启用情感分析 */
  enableSentimentAnalysis: boolean
  /** 是否启用话题检测 */
  enableTopicDetection: boolean
  /** 是否启用引用消解 */
  enableReferenceResolution: boolean
  /** 是否启用自适应响应 */
  enableAdaptiveResponse: boolean
  /** 是否启用模板引擎 */
  enableTemplateEngine: boolean
}

export const DEFAULT_CONFIG: DialogueEnhancementConfig = {
  maxTurns: 100,
  maxContextLength: 50,
  intentThreshold: 0.7,
  sentimentThreshold: 0.6,
  topicTransitionThreshold: 0.65,
  coherenceTarget: 4.0,
  enableSentimentAnalysis: true,
  enableTopicDetection: true,
  enableReferenceResolution: true,
  enableAdaptiveResponse: true,
  enableTemplateEngine: true,
}

// ============================================
// Error Types
// ============================================

export class DialogueEnhancementError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'DialogueEnhancementError'
  }
}

export const ERROR_CODES = {
  INVALID_CONTEXT: 'INVALID_CONTEXT',
  INTENT_NOT_DETECTED: 'INTENT_NOT_DETECTED',
  SENTIMENT_ANALYSIS_FAILED: 'SENTIMENT_ANALYSIS_FAILED',
  TOPIC_DETECTION_FAILED: 'TOPIC_DETECTION_FAILED',
  REFERENCE_RESOLUTION_FAILED: 'REFERENCE_RESOLUTION_FAILED',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  STATE_TRANSITION_FAILED: 'STATE_TRANSITION_FAILED',
  COHERENCE_SCORE_LOW: 'COHERENCE_SCORE_LOW',
} as const