/**
 * DeepSeek Provider
 * 支持 DeepSeek Coder 和 DeepSeek Chat
 */

import { BaseProvider, AIResponse, ProviderConfig } from './BaseProvider'
import { ModelConfig, RouteRequest } from '../routing/types'

/**
 * DeepSeek API 响应格式 (与 OpenAI 兼容)
 */
interface DeepSeekResponse {
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
 * DeepSeek Provider 实现
 */
export class DeepSeekProvider extends BaseProvider {
  private apiKey: string
  private baseURL: string

  constructor(model: ModelConfig, config: ProviderConfig = {}) {
    super(model, config)
    this.apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY || ''
    this.baseURL = config.baseURL || 'https://api.deepseek.com/v1'
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
        stream: false,
      }),
    })

    const data: DeepSeekResponse = await response.json()
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
  *generateStream(_request: RouteRequest): Generator<never> {
    throw new Error('Streaming requires async generator, use generateStreamAsync instead')
  }

  /**
   * 构建消息数组
   */
  private buildMessages(request: RouteRequest): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = []

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }

    if (request.history) {
      for (const msg of request.history) {
        messages.push({ role: msg.role, content: msg.content })
      }
    }

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
      default:
        return 'stop'
    }
  }
}
