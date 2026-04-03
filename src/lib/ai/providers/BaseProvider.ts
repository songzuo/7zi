/**
 * AI Provider 基类
 * 统一的 AI 模型提供者接口
 */

import {
  ModelConfig,
  ModelCapability,
  RouteRequest,
} from '../routing/types'

/**
 * AI 响应
 */
export interface AIResponse {
  content: string
  model: string
  finishReason: 'stop' | 'length' | 'content_filter' | 'error'
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  cost: number // 成本（分）
  latency: number // 延迟（毫秒）
  cached?: boolean
}

/**
 * AI 流式响应块
 */
export interface AIChunk {
  content: string
  delta: string
  model: string
  done: boolean
}

/**
 * Provider 配置
 */
export interface ProviderConfig {
  apiKey?: string
  baseURL?: string
  timeout?: number
  maxRetries?: number
  headers?: Record<string, string>
}

/**
 * AI Provider 基类
 */
export abstract class BaseProvider {
  protected config: ProviderConfig
  protected model: ModelConfig

  constructor(model: ModelConfig, config: ProviderConfig = {}) {
    this.model = model
    this.config = {
      timeout: 60000,
      maxRetries: 3,
      ...config,
    }
  }

  /**
   * 生成文本
   */
  abstract generate(request: RouteRequest): Promise<AIResponse>

  /**
   * 流式生成文本
   */
  abstract *generateStream(request: RouteRequest): Generator<AIChunk>

  /**
   * 检查能力
   */
  hasCapability(capability: ModelCapability): boolean {
    return this.model.capabilities.includes(capability)
  }

  /**
   * 获取模型信息
   */
  getModel(): ModelConfig {
    return this.model
  }

  /**
   * 估算 token 数
   */
  estimateTokens(text: string): number {
    // 粗略估计：1 token ≈ 4 字符
    return Math.ceil(text.length / 4)
  }

  /**
   * 计算成本
   */
  calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCost = (inputTokens / 1000000) * this.model.inputPricePerM
    const outputCost = (outputTokens / 1000000) * this.model.outputPricePerM
    return Math.round(inputCost + outputCost)
  }

  /**
   * HTTP 请求封装
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const maxRetries = this.config.maxRetries || 3
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.timeout
        )

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const error = await this.parseErrorResponse(response)
          throw new Error(
            `HTTP ${response.status}: ${error.message || response.statusText}`
          )
        }

        return response
      } catch (error) {
        lastError = error as Error

        if (attempt < maxRetries) {
          // 指数退避
          const delay = Math.min(1000 * 2 ** attempt, 10000)
          await this.delay(delay)
        }
      }
    }

    throw lastError || new Error('Max retries exceeded')
  }

  /**
   * 解析错误响应
   */
  protected async parseErrorResponse(
    response: Response
  ): Promise<{ message: string; type?: string }> {
    try {
      const data = await response.json()
      return {
        message: data.error?.message || data.message || 'Unknown error',
        type: data.error?.type,
      }
    } catch {
      return { message: response.statusText || 'Unknown error' }
    }
  }

  /**
   * 延迟函数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      // 子类可以实现具体的健康检查逻辑
      return true
    } catch {
      return false
    }
  }
}
