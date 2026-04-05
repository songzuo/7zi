/**
 * AI Chat Types - Type definitions for AI Assistant feature
 * v1.12.x
 */

import type { User } from '@/stores'

// ============================================
// Message Types
// ============================================

export type MessageRole = 'user' | 'assistant' | 'system'

export interface AIMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  /** 是否正在流式传输 */
  isStreaming?: boolean
  /** 错误信息 */
  error?: string
  /** 关联的建议ID */
  suggestionId?: string
  /** 消息元数据 */
  metadata?: Record<string, unknown>
}

export interface MessageGroup {
  id: string
  messages: AIMessage[]
  timestamp: number
}

// ============================================
// Conversation Types
// ============================================

export interface AIConversation {
  id: string
  title: string
  messages: AIMessage[]
  createdAt: number
  updatedAt: number
  /** 对话状态 */
  status: 'active' | 'archived'
  /** 上下文token计数 */
  tokenCount?: number
  /** 标签 */
  tags?: string[]
}

export interface ConversationContext {
  conversationId: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  /** 历史消息限制 */
  historyLimit?: number
}

// ============================================
// Suggestion Types
// ============================================

export type SuggestionCategory = 'general' | 'workflow' | 'data' | 'code' | 'debug'

export interface AISuggestion {
  id: string
  text: string
  description?: string
  category: SuggestionCategory
  icon?: string
  /** 是否已执行 */
  executed?: boolean
  /** 执行结果 */
  result?: string
  /** 优先级 */
  priority?: 'high' | 'medium' | 'low'
  /** 关联的上下文 */
  context?: string[]
}

export interface SuggestionRequest {
  /** 当前用户输入 */
  userInput: string
  /** 对话历史 */
  conversationHistory: AIMessage[]
  /** 上下文类型 */
  contextType?: 'workflow' | 'data' | 'general'
  /** 建议数量 */
  limit?: number
}

export interface SuggestionResponse {
  suggestions: AISuggestion[]
  generatedAt: number
}

// ============================================
// API Request/Response Types
// ============================================

export interface SendMessageRequest {
  content: string
  conversationId?: string
  context?: ConversationContext
  stream?: boolean
}

export interface SendMessageResponse {
  message: AIMessage
  conversationId: string
  usage?: AIUsage
}

export interface AIUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

// ============================================
// Stream Types
// ============================================

export interface StreamChunk {
  id: string
  delta: string
  done: boolean
  error?: string
}

export interface StreamStats {
  totalChunks: number
  totalCharacters: number
  duration: number
  chunksPerSecond: number
}

// ============================================
// UI State Types
// ============================================

export type ChatStatus = 'idle' | 'typing' | 'streaming' | 'error'

export interface AIChatState {
  /** 当前对话 */
  currentConversation: AIConversation | null
  /** 对话列表 */
  conversations: AIConversation[]
  /** 消息列表（当前对话） */
  messages: AIMessage[]
  /** 状态 */
  status: ChatStatus
  /** 建议 */
  suggestions: AISuggestion[]
  /** 加载状态 */
  isLoading: boolean
  /** 流式传输统计 */
  streamStats: StreamStats | null
}

export interface AIChatActions {
  /** 发送消息 */
  sendMessage: (content: string) => Promise<void>
  /** 流式发送消息 */
  sendMessageStream: (content: string) => Promise<void>
  /** 创建新对话 */
  createConversation: (title?: string) => void
  /** 选择对话 */
  selectConversation: (id: string) => void
  /** 删除对话 */
  deleteConversation: (id: string) => void
  /** 清除当前对话 */
  clearCurrentConversation: () => void
  /** 更新系统提示 */
  updateSystemPrompt: (prompt: string) => void
  /** 获取建议 */
  fetchSuggestions: (request: SuggestionRequest) => Promise<void>
  /** 执行建议 */
  executeSuggestion: (suggestionId: string) => Promise<void>
  /** 停止生成 */
  stopGeneration: () => void
  /** 重试消息 */
  retryMessage: (messageId: string) => Promise<void>
  /** 复制消息 */
  copyMessage: (messageId: string) => void
  /** 展开/收起建议面板 */
  toggleSuggestions: (show?: boolean) => void
}

export type AIChatStore = AIChatState & AIChatActions

// ============================================
// Component Props Types
// ============================================

export interface ChatMessageProps {
  message: AIMessage
  onCopy?: (content: string) => void
  onRetry?: () => void
  onSuggestionClick?: (suggestion: AISuggestion) => void
  showActions?: boolean
}

export interface SuggestionPanelProps {
  suggestions: AISuggestion[]
  isLoading: boolean
  onSuggestionClick: (suggestion: AISuggestion) => void
  onRefresh?: () => void
  onClose?: () => void
}

export interface ChatInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  onStop?: () => void
  disabled?: boolean
  isStreaming?: boolean
  placeholder?: string
}

export interface ChatWindowProps {
  className?: string
  /** 是否显示侧边栏 */
  showSidebar?: boolean
  /** 是否显示建议面板 */
  showSuggestions?: boolean
  /** 是否最小化 */
  minimized?: boolean
}

// ============================================
// Error Types
// ============================================

export class AIChatError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message)
    this.name = 'AIChatError'
  }
}

// ============================================
// Constants
// ============================================

export const MAX_CONTEXT_MESSAGES = 50
export const MAX_TOKEN_WARNING = 0.8
export const DEFAULT_TEMPERATURE = 0.7
export const DEFAULT_MAX_TOKENS = 2048

export const AI_SUGGESTION_ICONS: Record<SuggestionCategory, string> = {
  general: '💬',
  workflow: '⚡',
  data: '📊',
  code: '🔧',
  debug: '🐛',
}

export const DEFAULT_SYSTEM_PROMPT = `你是一个专业的AI助手，名字是 7zi助手。

你的职责：
1. 帮助用户解决工作流程相关问题
2. 提供代码编写和调试帮助
3. 数据分析和可视化建议
4. 回答各类技术问题

请保持回答：
- 简洁明了
- 技术准确
- 友好专业
- 适当使用代码块和格式

当前版本: 1.12.x`
