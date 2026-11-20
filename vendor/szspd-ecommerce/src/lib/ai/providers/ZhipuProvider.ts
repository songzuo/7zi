/**
 * Zhipu (GLM-4) Provider
 * 支持 GLM-4 和 GLM-4 Flash
 */

import { BaseProvider, AIResponse, AIChunk, ProviderConfig } from './BaseProvider'
import { ModelConfig, RouteRequest } from '../routing/types'

/**
 * Zhipu API 响应格式
 */
interface ZhipuResponse {
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
 * Zhipu Provider 实现
 */
export class ZhipuProvider extends BaseProvider {
  private apiKey: string
  private baseURL: string

  constructor(model: ModelConfig, config: ProviderConfig = {}) {
    super(model, config)
    this.apiKey = config.apiKey || process.env.ZHIPU_API_KEY || ''
    this.baseURL = config.baseURL || 'https://open.bigmodel.cn/api/paas/v4'
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

    const data: ZhipuResponse = await response.json()
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
  async *generateStream(_request: RouteRequest): AsyncGenerator<AIChunk> {
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
