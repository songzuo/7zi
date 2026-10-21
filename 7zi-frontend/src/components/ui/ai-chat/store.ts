/**
 * AI Chat Store - Zustand 状态管理
 * v1.12.x
 */

import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type {
  AIChatStore,
  AIConversation,
  AIMessage,
  AISuggestion,
  SuggestionRequest,
  ConversationContext,
  ChatStatus,
  StreamStats,
} from './types'
import {
  aiClient,
  AIAuthError,
} from './client'
import { logger } from '@/lib/logger'

// ============================================
// 初始状态
// ============================================

interface InitialState {
  currentConversation: AIConversation | null
  conversations: AIConversation[]
  messages: AIMessage[]
  status: ChatStatus
  suggestions: AISuggestion[]
  isLoading: boolean
  streamStats: StreamStats | null
  showSuggestions: boolean
  systemPrompt: string
  streamController: AbortController | null
}

// ============================================
// 常量
// ============================================

const MAX_MESSAGES_IN_STORE = 100
const DEFAULT_SYSTEM_PROMPT = `你是一个专业的AI助手，名字是 7zi助手。

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

// ============================================
// Store
// ============================================

export const useAIChatStore = create<AIChatStore & {
  // 内部状态
  _state: InitialState
  // 内部操作
  _setStatus: (status: ChatStatus) => void
  _setLoading: (loading: boolean) => void
  _addMessage: (message: AIMessage) => void
  _updateStreamingMessage: (messageId: string, delta: string) => void
  _setStreamStats: (stats: StreamStats | null) => void
  _setShowSuggestions: (show: boolean) => void
  _setSystemPrompt: (prompt: string) => void
  _setStreamController: (controller: AbortController | null) => void
}>((set, get) => ({
  // ============================================
  // 初始状态
  // ============================================

  _state: {
    currentConversation: null,
    conversations: [],
    messages: [],
    status: 'idle',
    suggestions: [],
    isLoading: false,
    streamStats: null,
    showSuggestions: true,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    streamController: null,
  },

  // ============================================
  // Getters (从 _state 派生)
  // ============================================

  get currentConversation() {
    return get()._state.currentConversation
  },
  get conversations() {
    return get()._state.conversations
  },
  get messages() {
    return get()._state.messages
  },
  get status() {
    return get()._state.status
  },
  get suggestions() {
    return get()._state.suggestions
  },
  get isLoading() {
    return get()._state.isLoading
  },
  get streamStats() {
    return get()._state.streamStats
  },

  // ============================================
  // 内部 setters
  // ============================================

  _setStatus: (status) =>
    set((state) => ({ _state: { ...state._state, status } })),

  _setLoading: (isLoading) =>
    set((state) => ({ _state: { ...state._state, isLoading } })),

  _addMessage: (message) =>
    set((state) => {
      const messages = [...state._state.messages, message]
      // 限制消息数量
      const trimmedMessages =
        messages.length > MAX_MESSAGES_IN_STORE
          ? messages.slice(-MAX_MESSAGES_IN_STORE)
          : messages
      return { _state: { ...state._state, messages: trimmedMessages } }
    }),

  _updateStreamingMessage: (messageId, delta) =>
    set((state) => {
      const messages = state._state.messages.map((m) =>
        m.id === messageId
          ? { ...m, content: m.content + delta }
          : m
      )
      return { _state: { ...state._state, messages } }
    }),

  _setStreamStats: (streamStats) =>
    set((state) => ({ _state: { ...state._state, streamStats } })),

  _setShowSuggestions: (showSuggestions) =>
    set((state) => ({ _state: { ...state._state, showSuggestions } })),

  _setSystemPrompt: (systemPrompt) =>
    set((state) => ({ _state: { ...state._state, systemPrompt } })),

  _setStreamController: (streamController) =>
    set((state) => ({ _state: { ...state._state, streamController } })),

  // ============================================
  // Actions
  // ============================================

  /**
   * 发送消息（非流式）
   */
  sendMessage: async (content: string) => {
    const { _state } = get()
    const { currentConversation, systemPrompt } = _state

    // 创建用户消息
    const userMessage: AIMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    get()._addMessage(userMessage)
    get()._setStatus('typing')
    get()._setLoading(true)

    try {
      const response = await aiClient.sendMessage({
        content,
        conversationId: currentConversation?.id,
        context: {
          conversationId: currentConversation?.id || uuidv4(),
          systemPrompt,
        },
        stream: false,
      })

      // 添加助手消息
      const assistantMessage: AIMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response.message.content,
        timestamp: Date.now(),
      }

      get()._addMessage(assistantMessage)
      get()._setStatus('idle')
    } catch (error) {
      logger.error('[AIChat] sendMessage error:', error instanceof Error ? error : undefined)
      get()._setStatus('error')

      // 添加错误消息
      const errorMessage: AIMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        error: error instanceof AIAuthError
          ? '请先登录后再使用 AI 助手'
          : error instanceof Error
            ? error.message
            : '发送消息失败，请重试',
      }
      get()._addMessage(errorMessage)
    } finally {
      get()._setLoading(false)
    }
  },

  /**
   * 发送消息（流式）
   */
  sendMessageStream: async (content: string) => {
    const { _state } = get()
    const { currentConversation, systemPrompt } = _state

    // 创建用户消息
    const userMessage: AIMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    get()._addMessage(userMessage)

    // 创建助手消息占位符
    const assistantMessageId = uuidv4()
    const assistantMessage: AIMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }
    get()._addMessage(assistantMessage)

    get()._setStatus('streaming')
    get()._setLoading(true)

    const startTime = Date.now()
    let totalChunks = 0
    let totalCharacters = 0

    // 创建 abort controller
    const controller = new AbortController()
    get()._setStreamController(controller)

    try {
      await new Promise<void>((resolve, reject) => {
        aiClient.sendMessageStream(
          {
            content,
            conversationId: currentConversation?.id,
            context: {
              conversationId: currentConversation?.id || uuidv4(),
              systemPrompt,
            },
            stream: true,
          },
          (chunk) => {
            if (chunk.error) {
              reject(new Error(chunk.error))
              return
            }
            get()._updateStreamingMessage(assistantMessageId, chunk.delta)
            totalChunks++
            totalCharacters += chunk.delta.length

            // 更新流统计
            const duration = (Date.now() - startTime) / 1000
            get()._setStreamStats({
              totalChunks,
              totalCharacters,
              duration,
              chunksPerSecond: duration > 0 ? totalChunks / duration : 0,
            })
          },
          (usage) => {
            resolve()
          },
          (error) => {
            reject(error)
          }
        )
      })
    } catch (error) {
      logger.error('[AIChat] sendMessageStream error:', error instanceof Error ? error : undefined)
      get()._updateStreamingMessage(
        assistantMessageId,
        `\n\n[错误: ${error instanceof Error ? error.message : '流式响应失败'}]`
      )
      get()._setStatus('error')
    } finally {
      // 标记流式消息完成
      set((state) => {
        const messages = state._state.messages.map((m) =>
          m.id === assistantMessageId ? { ...m, isStreaming: false } : m
        )
        return {
          _state: { ...state._state, messages },
        }
      })
      get()._setStatus('idle')
      get()._setLoading(false)
      get()._setStreamController(null)
    }
  },

  /**
   * 创建新对话
   */
  createConversation: (title?: string) => {
    const newConversation: AIConversation = {
      id: uuidv4(),
      title: title || `新对话 ${new Date().toLocaleString()}`,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active',
    }

    set((state) => ({
      _state: {
        ...state._state,
        currentConversation: newConversation,
        conversations: [newConversation, ...state._state.conversations],
        messages: [],
        status: 'idle',
      },
    }))
  },

  /**
   * 选择对话
   */
  selectConversation: async (id: string) => {
    const { _state } = get()
    const conversation = _state.conversations.find((c) => c.id === id)

    if (!conversation) {
      logger.warn('[AIChat] Conversation not found', { id })
      return
    }

    get()._setLoading(true)
    try {
      // 获取完整对话
      const fullConversation = await aiClient.getConversation(id)
      set((state) => ({
        _state: {
          ...state._state,
          currentConversation: fullConversation,
          messages: fullConversation.messages,
        },
      }))
    } catch (error) {
      logger.error('[AIChat] selectConversation error:', error instanceof Error ? error : undefined)
      // 使用本地缓存
      set((state) => ({
        _state: {
          ...state._state,
          currentConversation: conversation,
          messages: conversation.messages,
        },
      }))
    } finally {
      get()._setLoading(false)
    }
  },

  /**
   * 删除对话
   */
  deleteConversation: async (id: string) => {
    const { _state } = get()

    try {
      await aiClient.deleteConversation(id)
    } catch (error) {
      logger.error('[AIChat] deleteConversation error:', error instanceof Error ? error : undefined)
    }

    // 从本地状态移除
    const conversations = _state.conversations.filter((c) => c.id !== id)
    const isDeletingCurrent = _state.currentConversation?.id === id

    set((state) => ({
      _state: {
        ...state._state,
        conversations,
        currentConversation: isDeletingCurrent ? null : state._state.currentConversation,
        messages: isDeletingCurrent ? [] : state._state.messages,
      },
    }))
  },

  /**
   * 清除当前对话
   */
  clearCurrentConversation: () => {
    const { _state } = get()
    if (!_state.currentConversation) return

    const clearedConversation: AIConversation = {
      ..._state.currentConversation,
      messages: [],
      updatedAt: Date.now(),
    }

    set((state) => ({
      _state: {
        ...state._state,
        currentConversation: clearedConversation,
        messages: [],
        conversations: state._state.conversations.map((c) =>
          c.id === clearedConversation.id ? clearedConversation : c
        ),
      },
    }))
  },

  /**
   * 更新系统提示
   */
  updateSystemPrompt: (prompt: string) => {
    get()._setSystemPrompt(prompt)
  },

  /**
   * 获取建议
   */
  fetchSuggestions: async (request: SuggestionRequest) => {
    get()._setLoading(true)
    try {
      const response = await aiClient.getSuggestions(request)
      set((state) => ({
        _state: { ...state._state, suggestions: response.suggestions },
      }))
    } catch (error) {
      logger.error('[AIChat] fetchSuggestions error:', error instanceof Error ? error : undefined)
      set((state) => ({
        _state: { ...state._state, suggestions: [] },
      }))
    } finally {
      get()._setLoading(false)
    }
  },

  /**
   * 执行建议
   */
  executeSuggestion: async (suggestionId: string) => {
    const { _state } = get()
    const suggestion = _state.suggestions.find((s) => s.id === suggestionId)

    if (!suggestion) {
      logger.warn('[AIChat] Suggestion not found', { suggestionId })
      return
    }

    // 标记为已执行
    set((state) => ({
      _state: {
        ...state._state,
        suggestions: state._state.suggestions.map((s) =>
          s.id === suggestionId ? { ...s, executed: true } : s
        ),
      },
    }))

    // 将建议文本作为消息发送
    if (suggestion.text) {
      await get().sendMessageStream(suggestion.text)
    }
  },

  /**
   * 停止生成
   */
  stopGeneration: () => {
    const { _state } = get()
    if (_state.streamController) {
      _state.streamController.abort()
      get()._setStreamController(null)
    }
    get()._setStatus('idle')
  },

  /**
   * 重试消息
   */
  retryMessage: async (messageId: string) => {
    const { _state } = get()
    const messageIndex = _state.messages.findIndex((m) => m.id === messageId)

    if (messageIndex === -1) return

    // 找到上一条用户消息
    const userMessage = _state.messages
      .slice(0, messageIndex)
      .reverse()
      .find((m) => m.role === 'user')

    if (!userMessage) return

    // 删除从该消息开始的所有消息
    const messages = _state.messages.slice(0, messageIndex)
    set((state) => ({ _state: { ...state._state, messages } }))

    // 重新发送
    await get().sendMessageStream(userMessage.content)
  },

  /**
   * 复制消息
   */
  copyMessage: (messageId: string) => {
    const { _state } = get()
    const message = _state.messages.find((m) => m.id === messageId)

    if (message) {
      navigator.clipboard.writeText(message.content)
    }
  },

  /**
   * 展开/收起建议面板
   */
  toggleSuggestions: (show?: boolean) => {
    const { _state } = get()
    const newShow = show !== undefined ? show : !_state.showSuggestions
    get()._setShowSuggestions(newShow)
  },
}))

// ============================================
// 辅助 hooks
// ============================================

/**
 * 获取当前消息列表
 */
export function useAIMessages(): AIMessage[] {
  return useAIChatStore((state) => state._state.messages)
}

/**
 * 获取当前状态
 */
export function useAIStatus(): ChatStatus {
  return useAIChatStore((state) => state._state.status)
}

/**
 * 获取流式传输统计
 */
export function useStreamStats(): StreamStats | null {
  return useAIChatStore((state) => state._state.streamStats)
}

/**
 * 是否显示建议面板
 */
export function useShowSuggestions(): boolean {
  return useAIChatStore((state) => state._state.showSuggestions)
}
