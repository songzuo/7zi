/**
 * Anthropic (Claude) Provider
 * 支持 Claude 4 Opus 和 Claude 4 Sonnet
 */

import { BaseProvider, AIResponse, ProviderConfig } from './BaseProvider'
import { ModelConfig, RouteRequest } from '../routing/types'

/**
 * Anthropic API 响应格式
 */
interface AnthropicResponse {
  id: string
  type: string
  role: string
  content: Array<{ type: string; text: string }>
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence'
  usage: {
    input_tokens: number
    output_tokens: number
  }
  model: string
}

/**
 * Anthropic Provider 实现
 */
export class AnthropicProvider extends BaseProvider {
  private apiKey: string
  private baseURL: string

  constructor(model: ModelConfig, config: ProviderConfig = {}) {
    super(model, config)
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || ''
    this.baseURL = config.baseURL || 'https://api.anthropic.com'
  }

  /**
   * 生成文本
   */
  async generate(request: RouteRequest): Promise<AIResponse> {
    const startTime = Date.now()

    const messages = this.buildMessages(request)
    const response = await this.fetchWithRetry(
      `${this.baseURL}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          ...this.config.headers,
        },
        body: JSON.stringify({
          model: this.model.model,
          messages,
          max_tokens: request.maxTokens || 4096,
          system: request.systemPrompt,
          temperature: request.temperature ?? 0.7,
          top_p: request.topP,
          stream: false,
        }),
      }
    )

    const data: AnthropicResponse = await response.json()
    const latency = Date.now() - startTime

    const content = data.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('')

    return {
      content,
      model: data.model,
      finishReason: this.parseFinishReason(data.stop_reason),
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens:
          (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      cost: this.calculateCost(
        data.usage?.input_tokens || 0,
        data.usage?.output_tokens || 0
      ),
      latency,
    }
  }

  /**
   * 流式生成文本
   */
  *generateStream(_request: RouteRequest): Generator<never> {
    throw new Error('Streaming requires async generator, use generateStreamAsync instead')
  }

  /**
   * 异步流式生成
   */
  async *generateStreamAsync(
    request: RouteRequest
  ): AsyncGenerator<AIChunk> {
    const messages = this.buildMessages(request)

    const response = await this.fetchWithRetry(
      `${this.baseURL}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model.model,
          messages,
          max_tokens: request.maxTokens || 4096,
          system: request.systemPrompt,
          temperature: request.temperature ?? 0.7,
          stream: true,
        }),
      }
    )

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
            yield {
              content: '',
              delta: '',
              model: this.model.model,
              done: true,
            }
            return
          }

          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta') {
              const delta = parsed.delta?.text || ''
              
              yield {
                content: delta,
                delta,
                model: this.model.model,
                done: false,
              }
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
  private buildMessages(request: RouteRequest) {
    const messages: Array<{ role: string; content: string }> = []

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
  private parseFinishReason(
    reason?: string
  ): AIResponse['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop'
      case 'max_tokens':
        return 'length'
      case 'stop_sequence':
        return 'stop'
      default:
        return 'stop'
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model.model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
        }),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
