/**
 * OpenAI Provider
 * 支持 GPT-4.5 和 GPT-4o
 */

import { BaseProvider, AIResponse, AIChunk, ProviderConfig } from './BaseProvider'
import { ModelConfig, RouteRequest } from '../routing/types'

/**
 * OpenAI API 响应格式
 */
interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * OpenAI Provider 实现
 */
export class OpenAIProvider extends BaseProvider {
  private apiKey: string
  private baseURL: string

  constructor(model: ModelConfig, config: ProviderConfig = {}) {
    super(model, config)
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || ''
    this.baseURL = config.baseURL || 'https://api.openai.com/v1'
  }

  /**
   * 生成文本
   */
  async generate(request: RouteRequest): Promise<AIResponse> {
    const startTime = Date.now()

    const messages = this.buildMessages(request)
    const response = await this.fetchWithRetry(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...this.config.headers,
      },
      body: JSON.stringify({
        model: this.model.model,
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP,
        stream: false,
      }),
    })

    const data: OpenAIResponse = await response.json()
    const latency = Date.now() - startTime

    return {
      content: data.choices[0]?.message?.content || '',
      model: data.model,
      finishReason: this.parseFinishReason(data.choices[0]?.finish_reason),
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      cost: this.calculateCost(
        data.usage?.prompt_tokens || 0,
        data.usage?.completion_tokens || 0
      ),
      latency,
    }
  }

  /**
   * 流式生成文本
   */
  async *generateStream(request: RouteRequest): AsyncGenerator<AIChunk> {
    // 流式生成需要使用 fetch 的 ReadableStream
    // 这里提供一个简化的实现
    throw new Error('Streaming requires async generator, use generateStreamAsync instead')
  }

  /**
   * 异步流式生成
   */
  async *generateStreamAsync(
    request: RouteRequest
  ): AsyncGenerator<AIChunk> {
    const messages = this.buildMessages(request)

    const response = await this.fetchWithRetry(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model.model,
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        stream: true,
      }),
    })

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Failed to get stream reader')
    }

    const decoder = new TextDecoder()
    let buffer = ''

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
            yield { content: '', delta: '', model: this.model.model, done: true }
            return
          }

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices[0]?.delta?.content || ''
            
            yield {
              content: delta,
              delta,
              model: this.model.model,
              done: false,
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }
  }

  /**
   * 构建消息数组
   */
  private buildMessages(request: RouteRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = []

    // 添加系统提示
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }

    // 添加历史消息
    if (request.history) {
      for (const msg of request.history) {
        messages.push({ role: msg.role, content: msg.content })
      }
    }

    // 添加当前提示
    messages.push({ role: 'user', content: request.prompt })

    return messages
  }

  /**
   * 解析完成原因
   */
  private parseFinishReason(reason?: string): AIResponse['finishReason'] {
    switch (reason) {
      case 'stop':
        return 'stop'
      case 'length':
        return 'length'
      case 'content_filter':
        return 'content_filter'
      default:
        return 'stop'
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      })
      return response.ok
    } catch {
      return false
    }
  }
}
