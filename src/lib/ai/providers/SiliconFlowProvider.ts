/**
 * SiliconFlow Provider
 * 聚合多模型 API (DeepSeek, Qwen, GLM, Llama 等)
 * 兼容 OpenAI 格式
 */

import { BaseProvider, AIResponse, AIChunk, ProviderConfig } from './BaseProvider'
import { ModelConfig, RouteRequest } from '../routing/types'

/**
 * SiliconFlow API 响应格式 (OpenAI 兼容)
 */
interface SiliconFlowResponse {
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
 * SiliconFlow 流式响应
 */
interface SiliconFlowStreamChoice {
  index: number
  delta: {
    content: string
    role?: string
  }
  finish_reason: string | null
}

/**
 * SiliconFlow Provider 实现
 * 支持模型: DeepSeek, Qwen, GLM, Llama, Yi 等
 */
export class SiliconFlowProvider extends BaseProvider {
  private apiKey: string
  private baseURL: string

  // 支持的模型映射
  static readonly MODEL_MAPPING: Record<string, string> = {
    // DeepSeek 系列
    'deepseek-chat': 'deepseek-ai/DeepSeek-V2-Chat',
    'deepseek-coder': 'deepseek-ai/DeepSeek-Coder-V2-Instruct',
    // Qwen 系列
    'qwen-72b': 'Qwen/Qwen2-72B-Instruct',
    'qwen-7b': 'Qwen/Qwen2-7B-Instruct',
    'qwen-1.5-72b': 'Qwen/Qwen1.5-72B-Chat',
    // GLM 系列
    'glm-4': 'THUDM/glm4-9b-chat',
    'glm-4v': 'THUDM/glm4v-9b-chat',
    // Llama
    'llama-3-70b': 'meta-llama/Meta-Llama-3-70B-Instruct',
    'llama-3-8b': 'meta-llama/Meta-Llama-3-8B-Instruct',
    // Yi
    'yi-34b': '01ai/Yi-34B-Chat',
    'yi-6b': '01ai/Yi-6B-Chat',
  }

  constructor(model: ModelConfig, config: ProviderConfig = {}) {
    super(model, config)
    this.apiKey = config.apiKey || process.env.SILICONFLOW_API_KEY || ''
    this.baseURL = config.baseURL || 'https://api.siliconflow.cn/v1'
  }

  /**
   * 获取实际的模型 ID
   */
  private getModelId(): string {
    const mapped = SiliconFlowProvider.MODEL_MAPPING[this.model.model]
    return mapped || this.model.model
  }

  /**
   * 生成文本
   */
  async generate(request: RouteRequest): Promise<AIResponse> {
    const startTime = Date.now()

    const messages = this.buildMessages(request)
    const modelId = this.getModelId()

    const response = await this.fetchWithRetry(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...this.config.headers,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        stream: false,
      }),
    })

    const data: SiliconFlowResponse = await response.json()
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
   * 流式生成
   */
  async *generateStream(request: RouteRequest): AsyncGenerator<AIChunk> {
    const modelId = this.getModelId()
    const messages = this.buildMessages(request)

    const response = await this.fetchWithRetry(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.7,
        stream: true,
      }),
    })

    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue

          const data = trimmed.slice(6)
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data) as {
              choices: SiliconFlowStreamChoice[]
            }
            const delta = parsed.choices[0]?.delta
            if (delta?.content) {
              yield {
                content: delta.content,
                delta: delta.content,
                model: modelId,
                done: parsed.choices[0]?.finish_reason !== null,
              }
            }
          } catch {
            // Ignore parse errors for malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
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

  /**
   * 计算成本
   */
  protected calculateCost(promptTokens: number, completionTokens: number): number {
    // SiliconFlow 定价 (每百万 tokens)
    // 基础价格，实际按模型收费
    const inputPricePerM = 1.0 // ¥1/1M
    const outputPricePerM = 2.0 // ¥2/1M

    const inputCost = (promptTokens / 1000000) * inputPricePerM
    const outputCost = (completionTokens / 1000000) * outputPricePerM

    // 转换为分
    return Math.round((inputCost + outputCost) * 100)
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }
}
