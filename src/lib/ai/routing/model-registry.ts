/**
 * 模型注册中心
 * 支持模型动态注册/注销、能力标签、成本和速率限制配置
 */

import {
  ModelConfig,
  ModelRegistration,
  ModelCapability,
  ModelStatus,
  ModelPriority,
  ModelHealthCheck,
} from './types'

/**
 * 模型注册中心类
 */
export class ModelRegistry {
  private models: Map<string, ModelRegistration>
  private healthChecks: Map<string, ModelHealthCheck>

  constructor() {
    this.models = new Map()
    this.healthChecks = new Map()
  }

  /**
   * 注册模型
   */
  register(config: ModelConfig): void {
    const registration: ModelRegistration = {
      config,
      registeredAt: Date.now(),
      lastUpdated: Date.now(),
    }

    this.models.set(config.id, registration)
  }

  /**
   * 批量注册模型
   */
  registerBatch(configs: ModelConfig[]): void {
    for (const config of configs) {
      this.register(config)
    }
  }

  /**
   * 注销模型
   */
  unregister(modelId: string): boolean {
    return this.models.delete(modelId)
  }

  /**
   * 更新模型配置
   */
  update(modelId: string, updates: Partial<ModelConfig>): boolean {
    const registration = this.models.get(modelId)
    if (!registration) {
      return false
    }

    registration.config = { ...registration.config, ...updates }
    registration.lastUpdated = Date.now()
    return true
  }

  /**
   * 获取模型配置
   */
  getModel(modelId: string): ModelConfig | undefined {
    return this.models.get(modelId)?.config
  }

  /**
   * 获取所有模型
   */
  getAllModels(): ModelConfig[] {
    return Array.from(this.models.values()).map((r) => r.config)
  }

  /**
   * 获取启用的模型
   */
  getEnabledModels(): ModelConfig[] {
    return this.getAllModels().filter((m) => m.enabled)
  }

  /**
   * 获取可用模型
   */
  getAvailableModels(): ModelConfig[] {
    return this.getEnabledModels().filter(
      (m) => m.status === ModelStatus.AVAILABLE
    )
  }

  /**
   * 按能力标签筛选模型
   */
  getModelsByCapability(capability: ModelCapability): ModelConfig[] {
    return this.getAvailableModels().filter((m) =>
      m.capabilities.includes(capability)
    )
  }

  /**
   * 按多个能力标签筛选模型（AND 逻辑）
   */
  getModelsByCapabilities(capabilities: ModelCapability[]): ModelConfig[] {
    return this.getAvailableModels().filter((m) =>
      capabilities.every((cap) => m.capabilities.includes(cap))
    )
  }

  /**
   * 按提供商筛选模型
   */
  getModelsByProvider(provider: string): ModelConfig[] {
    return this.getAvailableModels().filter((m) => m.provider === provider)
  }

  /**
   * 按优先级排序模型
   */
  getModelsByPriority(): ModelConfig[] {
    return this.getAvailableModels().sort((a, b) => a.priority - b.priority)
  }

  /**
   * 按成本排序模型（从低到高）
   */
  getModelsByCost(): ModelConfig[] {
    return this.getAvailableModels().sort((a, b) => {
      const avgCostA = (a.inputPricePerM + a.outputPricePerM) / 2
      const avgCostB = (b.inputPricePerM + b.outputPricePerM) / 2
      return avgCostA - avgCostB
    })
  }

  /**
   * 按延迟排序模型（从低到高）
   */
  getModelsByLatency(): ModelConfig[] {
    return this.getAvailableModels().sort((a, b) => {
      const latencyA = a.avgLatencyMs ?? 1500
      const latencyB = b.avgLatencyMs ?? 1500
      return latencyA - latencyB
    })
  }

  /**
   * 按可靠性排序模型（从高到低）
   */
  getModelsByReliability(): ModelConfig[] {
    return this.getAvailableModels().sort((a, b) => {
      const reliabilityA = a.reliabilityScore ?? 0.9
      const reliabilityB = b.reliabilityScore ?? 0.9
      return reliabilityB - reliabilityA
    })
  }

  /**
   * 设置模型状态
   */
  setModelStatus(modelId: string, status: ModelStatus): boolean {
    const model = this.models.get(modelId)
    if (!model) {
      return false
    }

    model.config.status = status
    model.lastUpdated = Date.now()
    return true
  }

  /**
   * 启用/禁用模型
   */
  setModelEnabled(modelId: string, enabled: boolean): boolean {
    const model = this.models.get(modelId)
    if (!model) {
      return false
    }

    model.config.enabled = enabled
    model.lastUpdated = Date.now()
    return true
  }

  /**
   * 更新模型健康检查结果
   */
  updateHealthCheck(healthCheck: ModelHealthCheck): void {
    this.healthChecks.set(healthCheck.modelId, healthCheck)

    // 自动更新模型状态
    const model = this.models.get(healthCheck.modelId)
    if (model) {
      if (!healthCheck.isHealthy) {
        model.config.status = ModelStatus.ERROR
      } else if (model.config.status === ModelStatus.ERROR) {
        model.config.status = ModelStatus.AVAILABLE
      }
      model.lastUpdated = Date.now()
    }
  }

  /**
   * 获取模型健康检查结果
   */
  getHealthCheck(modelId: string): ModelHealthCheck | undefined {
    return this.healthChecks.get(modelId)
  }

  /**
   * 获取所有健康检查结果
   */
  getAllHealthChecks(): ModelHealthCheck[] {
    return Array.from(this.healthChecks.values())
  }

  /**
   * 计算模型预估成本
   */
  estimateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const model = this.getModel(modelId)
    if (!model) {
      throw new Error(`Model ${modelId} not found`)
    }

    const inputCost = (inputTokens / 1000000) * model.inputPricePerM
    const outputCost = (outputTokens / 1000000) * model.outputPricePerM
    return Math.round(inputCost + outputCost)
  }

  /**
   * 检查模型是否满足能力要求
   */
  checkCapabilities(
    modelId: string,
    requiredCapabilities: ModelCapability[]
  ): boolean {
    const model = this.getModel(modelId)
    if (!model) {
      return false
    }

    return requiredCapabilities.every((cap) => model.capabilities.includes(cap))
  }

  /**
   * 检查模型是否在预算内
   */
  checkBudget(
    modelId: string,
    inputTokens: number,
    outputTokens: number,
    budget: number
  ): boolean {
    const cost = this.estimateCost(modelId, inputTokens, outputTokens)
    return cost <= budget
  }

  /**
   * 获取模型统计信息
   */
  getStats(): {
    total: number
    enabled: number
    available: number
    byProvider: Record<string, number>
    byStatus: Record<ModelStatus, number>
  } {
    const models = this.getAllModels()
    const byProvider: Record<string, number> = {}
    const byStatus: Record<ModelStatus, number> = {
      [ModelStatus.AVAILABLE]: 0,
      [ModelStatus.UNAVAILABLE]: 0,
      [ModelStatus.RATE_LIMITED]: 0,
      [ModelStatus.ERROR]: 0,
      [ModelStatus.MAINTENANCE]: 0,
    }

    for (const model of models) {
      byProvider[model.provider] = (byProvider[model.provider] || 0) + 1
      byStatus[model.status]++
    }

    return {
      total: models.length,
      enabled: models.filter((m) => m.enabled).length,
      available: models.filter(
        (m) => m.enabled && m.status === ModelStatus.AVAILABLE
      ).length,
      byProvider,
      byStatus,
    }
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.models.clear()
    this.healthChecks.clear()
  }

  /**
   * 导出配置
   */
  export(): Array<{ config: ModelConfig; registeredAt: number; lastUpdated: number }> {
    return Array.from(this.models.values())
  }

  /**
   * 导入配置
   */
  import(data: Array<{ config: ModelConfig; registeredAt: number; lastUpdated: number }>): void {
    this.clear()
    for (const item of data) {
      this.models.set(item.config.id, {
        config: item.config,
        registeredAt: item.registeredAt,
        lastUpdated: item.lastUpdated,
      })
    }
  }
}

/**
 * 默认模型注册中心实例
 */
export const modelRegistry = new ModelRegistry()

/**
 * 初始化默认模型配置
 */
export function initializeDefaultModels(): void {
  const defaultModels: ModelConfig[] = [
    // OpenAI GPT-4.5
    {
      id: 'gpt-4.5',
      name: 'GPT-4.5',
      provider: 'openai',
      model: 'gpt-4.5',
      displayName: 'GPT-4.5',
      capabilities: [
        ModelCapability.CODE,
        ModelCapability.TEXT,
        ModelCapability.REASONING,
        ModelCapability.MULTIMODAL,
        ModelCapability.FUNCTION_CALLING,
        ModelCapability.STREAMING,
      ],
      maxTokens: 128000,
      contextWindow: 200000,
      inputPricePerM: 1000, // 10元/百万token = 1000分
      outputPricePerM: 3000,
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 100000,
      },
      avgLatencyMs: 2000,
      reliabilityScore: 0.95,
      priority: ModelPriority.HIGH,
      enabled: true,
      status: ModelStatus.AVAILABLE,
    },
    // OpenAI GPT-4o
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      model: 'gpt-4o',
      displayName: 'GPT-4o',
      capabilities: [
        ModelCapability.CODE,
        ModelCapability.TEXT,
        ModelCapability.IMAGE,
        ModelCapability.MULTIMODAL,
        ModelCapability.FUNCTION_CALLING,
        ModelCapability.STREAMING,
      ],
      maxTokens: 16384,
      contextWindow: 128000,
      inputPricePerM: 250,
      outputPricePerM: 1000,
      rateLimit: {
        requestsPerMinute: 100,
        tokensPerMinute: 200000,
      },
      avgLatencyMs: 1500,
      reliabilityScore: 0.93,
      priority: ModelPriority.NORMAL,
      enabled: true,
      status: ModelStatus.AVAILABLE,
    },
    // Anthropic Claude 4 Opus
    {
      id: 'claude-4-opus',
      name: 'Claude 4 Opus',
      provider: 'anthropic',
      model: 'claude-4-opus-20250514',
      displayName: 'Claude 4 Opus',
      capabilities: [
        ModelCapability.CODE,
        ModelCapability.TEXT,
        ModelCapability.REASONING,
        ModelCapability.MULTIMODAL,
        ModelCapability.FUNCTION_CALLING,
        ModelCapability.STREAMING,
      ],
      maxTokens: 4096,
      contextWindow: 200000,
      inputPricePerM: 1500,
      outputPricePerM: 7500,
      rateLimit: {
        requestsPerMinute: 30,
        tokensPerMinute: 50000,
      },
      avgLatencyMs: 3000,
      reliabilityScore: 0.94,
      priority: ModelPriority.HIGH,
      enabled: true,
      status: ModelStatus.AVAILABLE,
    },
    // Anthropic Claude 4 Sonnet
    {
      id: 'claude-4-sonnet',
      name: 'Claude 4 Sonnet',
      provider: 'anthropic',
      model: 'claude-4-sonnet-20250514',
      displayName: 'Claude 4 Sonnet',
      capabilities: [
        ModelCapability.CODE,
        ModelCapability.TEXT,
        ModelCapability.MULTIMODAL,
        ModelCapability.FUNCTION_CALLING,
        ModelCapability.STREAMING,
      ],
      maxTokens: 4096,
      contextWindow: 200000,
      inputPricePerM: 300,
      outputPricePerM: 1500,
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 100000,
      },
      avgLatencyMs: 1500,
      reliabilityScore: 0.92,
      priority: ModelPriority.NORMAL,
      enabled: true,
      status: ModelStatus.AVAILABLE,
    },
    // Google Gemini 2 Pro
    {
      id: 'gemini-2-pro',
      name: 'Gemini 2 Pro',
      provider: 'google',
      model: 'gemini-2.0-pro',
      displayName: 'Gemini 2 Pro',
      capabilities: [
        ModelCapability.CODE,
        ModelCapability.TEXT,
        ModelCapability.IMAGE,
        ModelCapability.MULTIMODAL,
        ModelCapability.FUNCTION_CALLING,
        ModelCapability.STREAMING,
      ],
      maxTokens: 8192,
      contextWindow: 1000000,
      inputPricePerM: 125,
      outputPricePerM: 500,
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 150000,
      },
      avgLatencyMs: 1500,
      reliabilityScore: 0.90,
      priority: ModelPriority.NORMAL,
      enabled: true,
      status: ModelStatus.AVAILABLE,
    },
    // Google Gemini 2 Flash
    {
      id: 'gemini-2-flash',
      name: 'Gemini 2 Flash',
      provider: 'google',
      model: 'gemini-2.0-flash',
      displayName: 'Gemini 2 Flash',
      capabilities: [
        ModelCapability.TEXT,
        ModelCapability.IMAGE,
        ModelCapability.MULTIMODAL,
        ModelCapability.STREAMING,
      ],
      maxTokens: 8192,
      contextWindow: 1000000,
      inputPricePerM: 0,
      outputPricePerM: 0,
      rateLimit: {
        requestsPerMinute: 120,
        tokensPerMinute: 300000,
      },
      avgLatencyMs: 500,
      reliabilityScore: 0.88,
      priority: ModelPriority.LOW,
      enabled: true,
      status: ModelStatus.AVAILABLE,
    },
    // DeepSeek Coder
    {
      id: 'deepseek-coder',
      name: 'DeepSeek Coder',
      provider: 'deepseek',
      model: 'deepseek-coder',
      displayName: 'DeepSeek Coder',
      capabilities: [
        ModelCapability.CODE,
        ModelCapability.TEXT,
        ModelCapability.STREAMING,
      ],
      maxTokens: 4096,
      contextWindow: 128000,
      inputPricePerM: 14,
      outputPricePerM: 28,
      rateLimit: {
        requestsPerMinute: 120,
        tokensPerMinute: 200000,
      },
      avgLatencyMs: 1000,
      reliabilityScore: 0.85,
      priority: ModelPriority.NORMAL,
      enabled: true,
      status: ModelStatus.AVAILABLE,
    },
    // DeepSeek Chat
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'deepseek',
      model: 'deepseek-chat',
      displayName: 'DeepSeek Chat',
      capabilities: [
        ModelCapability.TEXT,
        ModelCapability.REASONING,
        ModelCapability.STREAMING,
      ],
      maxTokens: 4096,
      contextWindow: 128000,
      inputPricePerM: 7,
      outputPricePerM: 14,
      rateLimit: {
        requestsPerMinute: 120,
        tokensPerMinute: 200000,
      },
      avgLatencyMs: 800,
      reliabilityScore: 0.85,
      priority: ModelPriority.FALLBACK,
      enabled: true,
      status: ModelStatus.AVAILABLE,
    },
    // Zhipu GLM-4
    {
      id: 'glm-4',
      name: 'GLM-4',
      provider: 'zhipu',
      model: 'glm-4',
      displayName: 'GLM-4',
      capabilities: [
        ModelCapability.CODE,
        ModelCapability.TEXT,
        ModelCapability.IMAGE,
        ModelCapability.FUNCTION_CALLING,
        ModelCapability.STREAMING,
      ],
      maxTokens: 4096,
      contextWindow: 128000,
      inputPricePerM: 10,
      outputPricePerM: 10,
      rateLimit: {
        requestsPerMinute: 100,
        tokensPerMinute: 150000,
      },
      avgLatencyMs: 1000,
      reliabilityScore: 0.87,
      priority: ModelPriority.FALLBACK,
      enabled: true,
      status: ModelStatus.AVAILABLE,
    },
    // MiniMax Abab6
    {
      id: 'minimax-abab6',
      name: 'MiniMax Abab6',
      provider: 'minimax',
      model: 'abab6.5s-chat',
      displayName: 'MiniMax Abab6',
      capabilities: [
        ModelCapability.TEXT,
        ModelCapability.IMAGE,
        ModelCapability.STREAMING,
      ],
      maxTokens: 24576,
      contextWindow: 245760,
      inputPricePerM: 12,
      outputPricePerM: 12,
      rateLimit: {
        requestsPerMinute: 100,
        tokensPerMinute: 150000,
      },
      avgLatencyMs: 1200,
      reliabilityScore: 0.86,
      priority: ModelPriority.FALLBACK,
      enabled: true,
      status: ModelStatus.AVAILABLE,
    },
  ]

  modelRegistry.registerBatch(defaultModels)
}

// 初始化默认模型
initializeDefaultModels()