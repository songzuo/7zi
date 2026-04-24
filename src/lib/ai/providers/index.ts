/**
 * AI Providers 索引
 * 多模型智能路由 - Provider 实现
 */

export { BaseProvider } from './BaseProvider'
export type { AIResponse, AIChunk, ProviderConfig } from './BaseProvider'

export { OpenAIProvider } from './OpenAIProvider'
export { AnthropicProvider } from './AnthropicProvider'
export { GeminiProvider } from './GeminiProvider'
export { DeepSeekProvider } from './DeepSeekProvider'
export { ZhipuProvider } from './ZhipuProvider'
export { SiliconFlowProvider } from './SiliconFlowProvider'

import { ModelConfig, ModelCapability } from '../routing/types'
import { BaseProvider, ProviderConfig } from './BaseProvider'
import { OpenAIProvider } from './OpenAIProvider'
import { AnthropicProvider } from './AnthropicProvider'
import { GeminiProvider } from './GeminiProvider'
import { DeepSeekProvider } from './DeepSeekProvider'
import { ZhipuProvider } from './ZhipuProvider'
import { SiliconFlowProvider } from './SiliconFlowProvider'

/**
 * Provider 工厂
 */
export class ProviderFactory {
  private static providers: Map<string, BaseProvider> = new Map()

  /**
   * 创建 Provider
   */
  static create(
    model: ModelConfig,
    config: ProviderConfig = {}
  ): BaseProvider {
    const cacheKey = `${model.provider}:${model.id}`

    // 检查缓存
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!
    }

    // 根据提供商创建实例
    let provider: BaseProvider

    switch (model.provider) {
      case 'openai':
        provider = new OpenAIProvider(model, config)
        break
      case 'anthropic':
        provider = new AnthropicProvider(model, config)
        break
      case 'google':
        provider = new GeminiProvider(model, config)
        break
      case 'deepseek':
        provider = new DeepSeekProvider(model, config)
        break
      case 'zhipu':
        provider = new ZhipuProvider(model, config)
        break
      case 'siliconflow':
        provider = new SiliconFlowProvider(model, config)
        break
      default:
        throw new Error(`Unknown provider: ${model.provider}`)
    }

    // 缓存
    this.providers.set(cacheKey, provider)

    return provider
  }

  /**
   * 获取缓存的 Provider
   */
  static get(modelId: string, provider: string): BaseProvider | undefined {
    const cacheKey = `${provider}:${modelId}`
    return this.providers.get(cacheKey)
  }

  /**
   * 清除缓存
   */
  static clear(): void {
    this.providers.clear()
  }
}
