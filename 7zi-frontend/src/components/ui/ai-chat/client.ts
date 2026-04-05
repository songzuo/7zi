/**
 * AI API Client - 与后端 AI API 集成
 * 支持流式响应和上下文管理
 * v1.12.x
 */

import {
  type AIMessage,
  type AIConversation,
  type SendMessageRequest,
  type SendMessageResponse,
  type StreamChunk,
  type SuggestionRequest,
  type SuggestionResponse,
  type AIUsage,
  AIChatError,
} from '@/components/ui/ai-chat/types'
import { logger } from '@/lib/logger'

// ============================================
// API 配置
// ============================================

const AI_API_BASE = '/api/ai'

class AIAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AIAuthError'
  }
}

class AINetworkError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'AINetworkError'
  }
}

// ============================================
// 辅助函数
// ============================================

function createError(message: string, code?: string, status?: number): AIChatError {
  const error = new AIChatError(message, code, status)
  return error
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    throw new AIAuthError('请先登录后再使用 AI 助手')
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw createError(errorData.message || '请求失败', errorData.code, response.status)
  }
  return response.json()
}

// ============================================
// AI API 客户端
// ============================================

export const aiClient = {
  /**
   * 发送消息（非流式）
   */
  sendMessage: async (request: SendMessageRequest): Promise<SendMessageResponse> => {
    const response = await fetch(`${AI_API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'include',
    })
    return handleResponse<SendMessageResponse>(response)
  },

  /**
   * 发送消息（流式）
   * @param request - 消息请求
   * @param onChunk - 每个数据块的回调
   * @param onComplete - 完成时的回调
   * @param onError - 错误回调
   * @returns abort controller
   */
  sendMessageStream: (
    request: SendMessageRequest,
    onChunk: (chunk: StreamChunk) => void,
    onComplete?: (usage?: AIUsage) => void,
    onError?: (error: Error) => void
  ): AbortController => {
    const controller = new AbortController()

    fetch(`${AI_API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true }),
      signal: controller.signal,
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'Stream request failed' }))
          throw createError(errorData.message, errorData.code, response.status)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw createError('无法读取响应流')
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let usage: AIUsage | undefined

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') {
                  onComplete?.(usage)
                  return
                }
                try {
                  const chunk = JSON.parse(data) as StreamChunk
                  // 检查是否有 usage 信息
                  if ('usage' in chunk && chunk.usage) {
                    usage = chunk.usage as AIUsage
                  }
                  onChunk(chunk)
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
          onComplete?.(usage)
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            // 请求被取消，不当作错误处理
            return
          }
          onError?.(error as Error)
        }
      })
      .catch((error) => {
        if ((error as Error).name === 'AbortError') {
          return
        }
        onError?.(error as Error)
      })

    return controller
  },

  /**
   * 获取建议
   */
  getSuggestions: async (request: SuggestionRequest): Promise<SuggestionResponse> => {
    const response = await fetch(`${AI_API_BASE}/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      credentials: 'include',
    })
    return handleResponse<SuggestionResponse>(response)
  },

  /**
   * 获取对话历史
   */
  getConversations: async (params?: {
    status?: 'active' | 'archived'
    limit?: number
    offset?: number
  }): Promise<{ conversations: AIConversation[]; total: number }> => {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.set('status', params.status)
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.offset) queryParams.set('offset', params.offset.toString())

    const queryString = queryParams.toString()
    const response = await fetch(`${AI_API_BASE}/conversations${queryString ? `?${queryString}` : ''}`, {
      credentials: 'include',
    })
    return handleResponse(response)
  },

  /**
   * 获取单个对话
   */
  getConversation: async (conversationId: string): Promise<AIConversation> => {
    const response = await fetch(`${AI_API_BASE}/conversations/${conversationId}`, {
      credentials: 'include',
    })
    return handleResponse<AIConversation>(response)
  },

  /**
   * 删除对话
   */
  deleteConversation: async (conversationId: string): Promise<void> => {
    const response = await fetch(`${AI_API_BASE}/conversations/${conversationId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!response.ok) {
      throw createError('删除对话失败', undefined, response.status)
    }
  },

  /**
   * 更新对话标题
   */
  updateConversationTitle: async (
    conversationId: string,
    title: string
  ): Promise<AIConversation> => {
    const response = await fetch(`${AI_API_BASE}/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
      credentials: 'include',
    })
    return handleResponse<AIConversation>(response)
  },

  /**
   * 归档对话
   */
  archiveConversation: async (conversationId: string): Promise<AIConversation> => {
    const response = await fetch(`${AI_API_BASE}/conversations/${conversationId}/archive`, {
      method: 'POST',
      credentials: 'include',
    })
    return handleResponse<AIConversation>(response)
  },
}

// ============================================
// Hook 导出
// ============================================

export { AIAuthError, AINetworkError }
