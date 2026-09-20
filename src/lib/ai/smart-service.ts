/**
 * 智能路由 AI 服务
 * 整合路由引擎、Provider 和成本追踪
 */

import { BaseProvider, AIResponse, AIChunk } from './providers/BaseProvider'
import { ProviderFactory } from './providers/index'
import { CostTracker, CostRecord, CostStats } from './cost-tracker'
import {
  ModelRouter,
  RouteRequest,
  RouteDecision,
  RoutingStats,
} from './routing'
import { ModelConfig } from './routing/types'

/**
 * 智能路由 AI 服务配置
 */
export interface SmartAIServiceConfig {
  enableCostTracking?: boolean
  enableCaching?: boolean
  enableFallback?: boolean
  enableMetrics?: boolean
  costTrackerConfig?: {
    maxRecords?: number
    enablePersistence?: boolean
    persistencePath?: string
    dailyBudgetLimit?: number
  }
  routerConfig?: Partial<import('./routing/types').RouterConfig>
}

/**
 * 生成结果
 */
export interface GenerateResult {
  content: string
  model: ModelConfig
  cost: number
  latency: number
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  decision: RouteDecision
  fromCache: boolean
  retries: number
}

/**
 * 流式生成结果
 */
export interface StreamGenerateResult {
  content: string
  model: ModelConfig
  decision: RouteDecision
  retries: number
}

/**
 * 智能路由 AI 服务类
 */
export class SmartRoutingAIService {
  private router: ModelRouter
  private costTracker: CostTracker
  private config: SmartAIServiceConfig

  constructor(config: SmartAIServiceConfig = {}) {
    this.config = {
      enableCostTracking: true,
      enableCaching: true,
      enableFallback: true,
      enableMetrics: true,
      ...config,
    }

    // 创建路由器
    this.router = new ModelRouter(this.config.routerConfig)

    // 创建成本追踪器
    this.costTracker = new CostTracker(this.config.costTrackerConfig)
  }

  /**
   * 生成文本（自动路由）
   */
  async generate(request: RouteRequest): Promise<GenerateResult> {
    // 1. 获取路由决策
    const decision = this.router.route(request)

    // 2. 创建 Provider
    const provider = ProviderFactory.create(decision.selectedModel)

    // 3. 检查预算
    if (this.config.enableCostTracking) {
      const estimatedCost = decision.estimatedCost
      if (!this.costTracker.checkBudget(estimatedCost)) {
        throw new Error(
          `Budget exceeded. Remaining: ${this.costTracker.getRemainingBudget()}分`
        )
      }
    }

    // 4. 执行请求（带降级）
    const { result, model, retries } = await this.executeWithFallback(
      request,
      decision,
      0
    )

    // 5. 记录成本
    if (this.config.enableCostTracking) {
      this.costTracker.record({
        modelId: model.id,
        modelName: model.displayName,
        provider: model.provider,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
        cost: result.cost,
        latency: result.latency,
        taskType: request.taskType,
      })
    }

    return {
      content: result.content,
      model,
      cost: result.cost,
      latency: result.latency,
      usage: result.usage,
      decision,
      fromCache: false,
      retries,
    }
  }

  /**
   * 流式生成文本（自动路由）
   */
  async *generateStream(
    request: RouteRequest
  ): AsyncGenerator<string, { model: ModelConfig; decision: RouteDecision }> {
    // 1. 获取路由决策
    const decision = this.router.route(request)

    // 2. 创建 Provider
    const provider = ProviderFactory.create(decision.selectedModel)

    // 3. 检查预算
    if (this.config.enableCostTracking) {
      const estimatedCost = decision.estimatedCost
      if (!this.costTracker.checkBudget(estimatedCost)) {
        throw new Error(
          `Budget exceeded. Remaining: ${this.costTracker.getRemainingBudget()}分`
        )
      }
    }

    // 4. 流式生成
    let totalTokens = 0
    const totalCost = 0
    const startTime = Date.now()

    try {
      if ('generateStreamAsync' in provider) {
        const stream = await (provider as { generateStreamAsync: (req: unknown) => AsyncIterable<{ content: string }> }).generateStreamAsync(request)
        for await (const chunk of stream) {
          yield chunk.content
          totalTokens += chunk.content.length / 4 // 粗略估计
        }
      } else {
        // 如果不支持流式，回退到普通生成
        const result = await provider.generate(request)
        yield result.content
        totalTokens = result.usage.totalTokens
      }
    } catch (error) {
      // 错误处理
      console.error('Stream generation error:', error)
      throw error
    }

    const latency = Date.now() - startTime

    // 5. 记录成本
    if (this.config.enableCostTracking) {
      this.costTracker.record({
        modelId: decision.selectedModel.id,
        modelName: decision.selectedModel.displayName,
        provider: decision.selectedModel.provider,
        promptTokens: request.prompt.length / 4,
        completionTokens: totalTokens,
        totalTokens: totalTokens + request.prompt.length / 4,
        cost: totalCost || 0,
        latency,
        taskType: request.taskType,
      })
    }

    return {
      model: decision.selectedModel,
      decision,
    }
  }

  /**
   * 执行带降级的请求
   */
  private async executeWithFallback(
    request: RouteRequest,
    decision: RouteDecision,
    attempt: number
  ): Promise<{
    result: AIResponse
    model: ModelConfig
    retries: number
  }> {
    // 选择模型（优先使用主模型，失败后尝试备用）
    const model =
      attempt === 0
        ? decision.selectedModel
        : decision.fallbackModels[attempt - 1]

    if (!model) {
      throw new Error('No available models in fallback chain')
    }

    try {
      const provider = ProviderFactory.create(model)
      const result = await provider.generate(request)
      return { result, model, retries: attempt }
    } catch (error) {
      console.error(`Model ${model.id} failed (attempt ${attempt}):`, error)

      // 尝试下一个备用模型
      if (attempt < decision.fallbackModels.length) {
        await this.delay(1000) // 延迟后重试
        return this.executeWithFallback(request, decision, attempt + 1)
      }

      throw new Error(`All models failed. Last error: ${(error as Error).message}`)
    }
  }

  /**
   * 获取路由统计
   */
  getRoutingStats(): RoutingStats {
    return this.router.getStats()
  }

  /**
   * 获取成本统计
   */
  getCostStats(timeRange?: { start: number; end: number }): CostStats {
    return this.costTracker.getStats(timeRange)
  }

  /**
   * 获取每日成本
   */
  getDailyCost(): number {
    return this.costTracker.getDailyCost()
  }

  /**
   * 获取剩余预算
   */
  getRemainingBudget(): number {
    return this.costTracker.getRemainingBudget()
  }

  /**
   * 获取成本记录
   */
  getCostRecords(limit?: number): CostRecord[] {
    return this.costTracker.getRecords(limit)
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.router.resetStats()
    this.costTracker.clear()
  }

  /**
   * 设置路由策略
   */
  setStrategy(strategy: Parameters<typeof this.router.setStrategy>[0]): void {
    this.router.setStrategy(strategy)
  }

  /**
   * 切换默认模型
   */
  switchModel(modelId: string): boolean {
    return this.router.switchModel(modelId)
  }

  /**
   * 获取路由可视化数据
   */
  getVisualization(request: RouteRequest) {
    return this.router.getVisualization(request)
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    router: boolean
    costTracker: boolean
    models: Array<{ id: string; name: string; healthy: boolean }>
  }> {
    // 路由器健康检查
    const routerHealthy = true

    // 成本追踪器健康检查
    const costTrackerHealthy = true

    // 模型健康检查
    const models: Array<{ id: string; name: string; healthy: boolean }> = []
    // TODO: 实现模型健康检查

    return {
      router: routerHealthy,
      costTracker: costTrackerHealthy,
      models,
    }
  }
}

/**
 * 默认智能路由 AI 服务实例
 */
export const smartAIService = new SmartRoutingAIService()

/**
 * 便捷函数
 */
export async function generateText(
  request: RouteRequest
): Promise<GenerateResult> {
  return smartAIService.generate(request)
}

export async function* generateTextStream(
  request: RouteRequest
) {
  yield* smartAIService.generateStream(request)
}

export function getRoutingStats(): RoutingStats {
  return smartAIService.getRoutingStats()
}

export function getCostStats(): CostStats {
  return smartAIService.getCostStats()
}
