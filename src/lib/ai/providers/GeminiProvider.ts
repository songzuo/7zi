/**
 * Google Gemini Provider
 * 支持 Gemini 2 Pro 和 Gemini 2 Flash
 */

import { BaseProvider, AIResponse, AIChunk, ProviderConfig } from './BaseProvider'
import { ModelConfig, RouteRequest } from '../routing/types'

/**
 * Gemini API 响应格式
 */
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>
      role: string
    }
    finishReason: string
    index: number
  }>
  usageMetadata: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
  modelVersion: string
}

/**
 * Gemini Provider 实现
 */
export class GeminiProvider extends BaseProvider {
  private apiKey: string
  private baseURL: string

  constructor(model: ModelConfig, config: ProviderConfig = {}) {
    super(model, config)
    this.apiKey = config.apiKey || process.env.GOOGLE_API_KEY || ''
    this.baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta'
  }

  /**
   * 生成文本
   */
  async generate(request: RouteRequest): Promise<AIResponse> {
    const startTime = Date.now()

    const response = await this.fetchWithRetry(
      `${this.baseURL}/models/${this.model.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({
          contents: this.buildContents(request),
          generationConfig: {
            maxOutputTokens: request.maxTokens || 8192,
            temperature: request.temperature ?? 0.7,
            topP: request.topP,
          },
          systemInstruction: request.systemPrompt
            ? { parts: [{ text: request.systemPrompt }] }
            : undefined,
        }),
      }
    )

    const data: GeminiResponse = await response.json()
    const latency = Date.now() - startTime

    const content = data.candidates[0]?.content?.parts
      ?.map((part) => part.text)
      .join('') || ''

    return {
      content,
      model: this.model.model,
      finishReason: this.parseFinishReason(data.candidates[0]?.finishReason),
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      cost: this.calculateCost(
        data.usageMetadata?.promptTokenCount || 0,
        data.usageMetadata?.candidatesTokenCount || 0
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
   * 异步流式生成
   */
  async *generateStreamAsync(
    request: RouteRequest
  ): AsyncGenerator<AIChunk> {
    const response = await this.fetchWithRetry(
      `${this.baseURL}/models/${this.model.model}:streamGenerateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: this.buildContents(request),
          generationConfig: {
            maxOutputTokens: request.maxTokens || 8192,
            temperature: request.temperature ?? 0.7,
            topP: request.topP,
          },
          systemInstruction: request.systemPrompt
            ? { parts: [{ text: request.systemPrompt }] }
            : undefined,
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
        if (line.trim()) {
          try {
            const parsed = JSON.parse(line)
            const delta = parsed.candidates?.[0]?.content?.parts?.[0]?.text || ''
            
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
   * 构建内容数组
   */
  private buildContents(request: RouteRequest) {
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []

    // 添加历史消息
    if (request.history) {
      for (const msg of request.history) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        })
      }
    }

    // 添加当前提示
    contents.push({
      role: 'user',
      parts: [{ text: request.prompt }],
    })

    return contents
  }

  /**
   * 解析完成原因
   */
  private parseFinishReason(reason?: string): AIResponse['finishReason'] {
    switch (reason) {
      case 'STOP':
        return 'stop'
      case 'MAX_TOKENS':
        return 'length'
      case 'SAFETY':
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
      const response = await fetch(
        `${this.baseURL}/models?key=${this.apiKey}`
      )
      return response.ok
    } catch {
      return false
    }
  }
}