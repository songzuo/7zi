/**
 * 智能路由引擎
 * 基于任务类型自动选择最优模型，支持成本优化、降级策略、请求队列和并发控制
 */

import {
  ModelConfig,
  RouteRequest,
  RouteDecision,
  RoutingStrategy,
  TaskType,
  TaskComplexity,
  ModelCapability,
  ModelPriority,
  RouterConfig,
  RoutingStats,
  QueueItem,
  RoutingVisualization,
} from './types'
import { ModelRegistry, modelRegistry } from './model-registry'

/**
 * 默认路由器配置
 */
const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  defaultStrategy: RoutingStrategy.BALANCED,
  defaultModelId: 'gpt-4o',
  concurrency: {
    maxConcurrent: 10,
    maxQueueSize: 100,
    queueTimeout: 30000,
  },
  enableCache: true,
  cacheTTL: 300000, // 5 分钟
  cacheSimilarityThreshold: 0.95,
  enableFallback: true,
  maxFallbackAttempts: 3,
  fallbackDelayMs: 1000,
  enableCostOptimization: true,
  dailyBudgetLimit: 10000, // 100 元
  enableMetrics: true,
  metricsInterval: 60000,
}

/**
 * 缓存条目
 */
interface CacheEntry {
  decision: RouteDecision
  createdAt: number
  expiresAt: number
  requestHash: string
}

/**
 * 智能路由引擎类
 */
export class ModelRouter {
  private registry: ModelRegistry
  private config: RouterConfig
  private stats: RoutingStats
  private cache: Map<string, CacheEntry>
  private queue: QueueItem[]
  private activeRequests: number
  private dailyCost: number
  private lastCostReset: number

  constructor(config: Partial<RouterConfig> = {}) {
    this.registry = modelRegistry
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...config }
    this.cache = new Map()
    this.queue = []
    this.activeRequests = 0
    this.dailyCost = 0
    this.lastCostReset = Date.now()

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      fallbacks: 0,
      byModel: new Map(),
      byTaskType: new Map(),
      byStrategy: new Map(),
      avgLatency: 0,
      totalCost: 0,
    }
  }

  /**
   * 核心路由方法
   */
  route(request: RouteRequest): RouteDecision {
    const startTime = Date.now()

    // 1. 重置每日成本计数器
    this.resetDailyCostIfNeeded()

    // 2. 检查缓存
    if (this.config.enableCache) {
      const cached = this.getCached(request)
      if (cached) {
        this.stats.cacheHits++
        return cached
      }
    }

    // 3. 确定路由策略
    const strategy = request.strategy ?? this.config.defaultStrategy

    // 4. 获取候选模型
    const candidates = this.getCandidateModels(request)

    if (candidates.length === 0) {
      // 无可用模型，使用默认模型
      const defaultModel = this.registry.getModel(
        request.preferredModelId ?? this.config.defaultModelId ?? 'gpt-4o'
      )
      if (!defaultModel) {
        throw new Error('No available models for routing')
      }
      return this.createDefaultDecision(defaultModel, request)
    }

    // 5. 选择最佳模型
    const { selected, score, reasons } = this.selectBestModel(
      candidates,
      request,
      strategy
    )

    // 6. 生成备用链
    const fallbacks = this.generateFallbackChain(selected, request)

    // 7. 估算成本和延迟
    const estimatedCost = this.estimateCost(selected, request)
    const estimatedLatency = this.estimateLatency(selected, request)

    // 8. 构建决策
    const decision: RouteDecision = {
      selectedModel: selected,
      fallbackModels: fallbacks,
      reasoning: reasons.join(' | '),
      estimatedCost,
      estimatedLatency,
      confidence: this.calculateConfidence(score, candidates.length),
      strategy,
    }

    // 9. 缓存决策
    if (this.config.enableCache) {
      this.setCached(request, decision)
    }

    // 10. 更新统计
    this.updateStats(decision, Date.now() - startTime)

    return decision
  }

  /**
   * 获取候选模型
   */
  private getCandidateModels(request: RouteRequest): ModelConfig[] {
    let candidates = this.registry.getAvailableModels()

    // 过滤: 能力要求
    if (request.requiredCapabilities?.length) {
      candidates = candidates.filter((m) =>
        request.requiredCapabilities!.every((cap) => m.capabilities.includes(cap))
      )
    }

    // 过滤: 偏好提供商
    if (request.preferredProvider) {
      candidates = candidates.filter((m) => m.provider === request.preferredProvider)
    }

    // 过滤: 预算限制
    if (request.budget !== undefined) {
      candidates = candidates.filter((m) => {
        const cost = this.estimateCost(m, request)
        return cost <= request.budget!
      })
    }

    // 过滤: 避免使用的模型
    if (request.avoidModels?.length) {
      const avoidSet = new Set(request.avoidModels)
      candidates = candidates.filter((m) => !avoidSet.has(m.id))
    }

    // 过滤: 每日预算限制
    if (this.config.dailyBudgetLimit && this.dailyCost >= this.config.dailyBudgetLimit) {
      // 只使用免费模型
      candidates = candidates.filter(
        (m) => m.inputPricePerM === 0 && m.outputPricePerM === 0
      )
    }

    return candidates
  }

  /**
   * 选择最佳模型
   */
  private selectBestModel(
    candidates: ModelConfig[],
    request: RouteRequest,
    strategy: RoutingStrategy
  ): { selected: ModelConfig; score: number; reasons: string[] } {
    const scored = candidates.map((model) => ({
      model,
      ...this.calculateModelScore(model, request, strategy),
    }))

    // 按分数排序
    scored.sort((a, b) => b.score - a.score)

    return {
      selected: scored[0].model,
      score: scored[0].score,
      reasons: scored[0].reasons,
    }
  }

  /**
   * 计算模型评分
   */
  private calculateModelScore(
    model: ModelConfig,
    request: RouteRequest,
    strategy: RoutingStrategy
  ): { score: number; reasons: string[] } {
    const reasons: string[] = []
    let score = 100

    // 1. 策略权重
    switch (strategy) {
      case RoutingStrategy.COST_OPTIMIZED:
        score += this.calculateCostScore(model, request)
        reasons.push(`成本优化评分: ${this.calculateCostScore(model, request).toFixed(1)}`)
        break

      case RoutingStrategy.LATENCY_OPTIMIZED:
        score += this.calculateLatencyScore(model)
        reasons.push(`延迟优化评分: ${this.calculateLatencyScore(model).toFixed(1)}`)
        break

      case RoutingStrategy.QUALITY_OPTIMIZED:
        score += this.calculateQualityScore(model, request)
        reasons.push(`质量优化评分: ${this.calculateQualityScore(model, request).toFixed(1)}`)
        break

      case RoutingStrategy.BALANCED:
        score += this.calculateBalancedScore(model, request)
        reasons.push(`平衡评分: ${this.calculateBalancedScore(model, request).toFixed(1)}`)
        break

      case RoutingStrategy.CUSTOM:
        // 自定义策略时使用平衡评分
        score += this.calculateBalancedScore(model, request)
        break
    }

    // 2. 能力匹配加分
    if (request.requiredCapabilities?.length) {
      const matchCount = request.requiredCapabilities.filter((cap) =>
        model.capabilities.includes(cap)
      ).length
      score += matchCount * 5
      reasons.push(`能力匹配: ${matchCount}/${request.requiredCapabilities.length}`)
    }

    // 3. 任务类型匹配
    if (request.taskType) {
      const taskMatch = this.getTaskModelMatch(request.taskType, model)
      score += taskMatch
      if (taskMatch > 0) {
        reasons.push(`任务类型匹配: +${taskMatch}`)
      }
    }

    // 4. 复杂度匹配
    if (request.complexity) {
      const complexityMatch = this.getComplexityModelMatch(request.complexity, model)
      score += complexityMatch
      reasons.push(`复杂度适配: +${complexityMatch}`)
    }

    // 5. 可靠性加分
    if (model.reliabilityScore) {
      score += model.reliabilityScore * 10
      reasons.push(`可靠性: ${(model.reliabilityScore * 100).toFixed(0)}%`)
    }

    return { score, reasons }
  }

  /**
   * 成本优化评分
   */
  private calculateCostScore(model: ModelConfig, request: RouteRequest): number {
    const estimatedCost = this.estimateCost(model, request)
    const maxBudget = request.budget ?? 1000 // 默认最大 10 元

    // 成本越低分数越高
    return Math.max(0, 30 - (estimatedCost / maxBudget) * 30)
  }

  /**
   * 延迟优化评分
   */
  private calculateLatencyScore(model: ModelConfig): number {
    const latency = model.avgLatencyMs ?? 1500
    // 延迟越低分数越高 (最高 30 分)
    return Math.max(0, 30 - (latency / 100))
  }

  /**
   * 质量优化评分
   */
  private calculateQualityScore(model: ModelConfig, request: RouteRequest): number {
    let score = 0

    // 高优先级模型质量通常更好
    if (model.priority === ModelPriority.CRITICAL) score += 15
    else if (model.priority === ModelPriority.HIGH) score += 10
    else if (model.priority === ModelPriority.NORMAL) score += 5

    // 可靠性评分
    score += (model.reliabilityScore ?? 0.9) * 15

    // 任务匹配
    if (request.taskType) {
      score += this.getTaskModelMatch(request.taskType, model)
    }

    return score
  }

  /**
   * 平衡评分
   */
  private calculateBalancedScore(model: ModelConfig, request: RouteRequest): number {
    const costScore = this.calculateCostScore(model, request)
    const latencyScore = this.calculateLatencyScore(model)
    const qualityScore = this.calculateQualityScore(model, request)

    // 加权平均 (质量 40%, 成本 30%, 延迟 30%)
    return qualityScore * 0.4 + costScore * 0.3 + latencyScore * 0.3
  }

  /**
   * 任务类型与模型匹配
   */
  private getTaskModelMatch(taskType: TaskType, model: ModelConfig): number {
    const taskCapabilityMap: Partial<Record<TaskType, ModelCapability[]>> = {
      [TaskType.CODE_GENERATION]: [ModelCapability.CODE],
      [TaskType.CODE_COMPLETION]: [ModelCapability.CODE],
      [TaskType.CONVERSATION]: [ModelCapability.TEXT],
      [TaskType.ANALYSIS]: [ModelCapability.REASONING],
      [TaskType.REASONING]: [ModelCapability.REASONING],
      [TaskType.MULTIMODAL]: [ModelCapability.MULTIMODAL, ModelCapability.IMAGE],
    }

    const requiredCaps = taskCapabilityMap[taskType] || []
    const matchCount = requiredCaps.filter((cap) => model.capabilities.includes(cap)).length

    return matchCount * 8
  }

  /**
   * 复杂度与模型匹配
   */
  private getComplexityModelMatch(complexity: TaskComplexity, model: ModelConfig): number {
    // 高复杂度需要更强的模型
    if (complexity === TaskComplexity.EXPERT || complexity === TaskComplexity.HIGH) {
      if (model.priority === ModelPriority.CRITICAL || model.priority === ModelPriority.HIGH) {
        return 10
      }
    } else if (complexity === TaskComplexity.LOW) {
      // 低复杂度可以用快速模型
      if (model.priority === ModelPriority.LOW || model.priority === ModelPriority.FALLBACK) {
        return 10
      }
    }
    return 5
  }

  /**
   * 生成备用链
   */
  private generateFallbackChain(
    primary: ModelConfig,
    request: RouteRequest
  ): ModelConfig[] {
    const fallbacks: ModelConfig[] = []
    const attempted = new Set<string>([primary.id])

    // 获取所有可用模型，按优先级排序
    const allModels = this.registry.getAvailableModels().sort((a, b) => a.priority - b.priority)

    for (const model of allModels) {
      if (attempted.has(model.id)) continue

      // 检查能力要求
      if (request.requiredCapabilities?.length) {
        const hasAllCaps = request.requiredCapabilities.every((cap) =>
          model.capabilities.includes(cap)
        )
        if (!hasAllCaps) continue
      }

      // 检查预算
      if (request.budget !== undefined) {
        const cost = this.estimateCost(model, request)
        if (cost > request.budget) continue
      }

      fallbacks.push(model)
      attempted.add(model.id)

      // 最多 5 个备用模型
      if (fallbacks.length >= 5) break
    }

    return fallbacks
  }

  /**
   * 估算成本
   */
  private estimateCost(model: ModelConfig, request: RouteRequest): number {
    const inputTokens = Math.ceil(request.prompt.length / 4)
    const outputTokens = request.maxTokens ?? 1000
    return this.registry.estimateCost(model.id, inputTokens, outputTokens)
  }

  /**
   * 估算延迟
   */
  private estimateLatency(model: ModelConfig, request: RouteRequest): number {
    const baseLatency = model.avgLatencyMs ?? 1500
    const complexityMultiplier = request.complexity
      ? {
          [TaskComplexity.LOW]: 1.0,
          [TaskComplexity.MEDIUM]: 1.5,
          [TaskComplexity.HIGH]: 2.0,
          [TaskComplexity.EXPERT]: 3.0,
        }[request.complexity]
      : 1.0

    return Math.round(baseLatency * complexityMultiplier)
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(score: number, candidateCount: number): number {
    // 分数越高、候选越少，置信度越高
    const scoreFactor = Math.min(1, score / 150)
    const competitionFactor = Math.max(0.6, 1 - candidateCount * 0.05)
    return Math.round(scoreFactor * competitionFactor * 100) / 100
  }

  /**
   * 创建默认决策
   */
  private createDefaultDecision(
    model: ModelConfig,
    request: RouteRequest
  ): RouteDecision {
    return {
      selectedModel: model,
      fallbackModels: [],
      reasoning: '使用默认模型（无其他可用模型）',
      estimatedCost: this.estimateCost(model, request),
      estimatedLatency: this.estimateLatency(model, request),
      confidence: 0.5,
      strategy: request.strategy ?? this.config.defaultStrategy,
    }
  }

  /**
   * 缓存相关方法
   */
  private getCacheKey(request: RouteRequest): string {
    // 简单的缓存键生成
    return `${request.taskType}:${request.prompt.slice(0, 100)}:${request.strategy || ''}`
  }

  private getCached(request: RouteRequest): RouteDecision | null {
    const key = this.getCacheKey(request)
    const entry = this.cache.get(key)

    if (!entry) return null

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.decision
  }

  private setCached(request: RouteRequest, decision: RouteDecision): void {
    const key = this.getCacheKey(request)
    const now = Date.now()

    this.cache.set(key, {
      decision,
      createdAt: now,
      expiresAt: now + this.config.cacheTTL,
      requestHash: key,
    })

    // 清理过期缓存
    this.cleanupCache()
  }

  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * 重置每日成本计数器
   */
  private resetDailyCostIfNeeded(): void {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000

    if (now - this.lastCostReset >= oneDayMs) {
      this.dailyCost = 0
      this.lastCostReset = now
    }
  }

  /**
   * 更新统计
   */
  private updateStats(decision: RouteDecision, latency: number): void {
    this.stats.totalRequests++
    this.stats.successfulRequests++
    this.stats.totalCost += decision.estimatedCost
    this.stats.avgLatency =
      (this.stats.avgLatency * (this.stats.totalRequests - 1) + latency) /
      this.stats.totalRequests

    // 按模型统计
    const modelCount = this.stats.byModel.get(decision.selectedModel.id) || 0
    this.stats.byModel.set(decision.selectedModel.id, modelCount + 1)

    // 按策略统计
    const strategyCount = this.stats.byStrategy.get(decision.strategy) || 0
    this.stats.byStrategy.set(decision.strategy, strategyCount + 1)

    // 更新每日成本
    this.dailyCost += decision.estimatedCost
  }

  /**
   * 获取统计信息
   */
  getStats(): RoutingStats {
    return { ...this.stats }
  }

  /**
   * 获取路由可视化数据
   */
  getVisualization(request: RouteRequest): RoutingVisualization {
    const decision = this.route(request)
    const candidates = this.getCandidateModels(request)

    const candidateDetails = candidates.slice(0, 10).map((model) => {
      const { score, reasons } = this.calculateModelScore(
        model,
        request,
        decision.strategy
      )
      return { model, score, reasons }
    })

    return {
      request,
      decision,
      candidates: candidateDetails,
      timeline: [
        {
          timestamp: Date.now(),
          event: 'route_request',
          details: `Task: ${request.taskType}, Strategy: ${decision.strategy}`,
        },
        {
          timestamp: Date.now(),
          event: 'model_selected',
          details: `Selected: ${decision.selectedModel.displayName}`,
        },
        {
          timestamp: Date.now(),
          event: 'fallback_prepared',
          details: `Fallbacks: ${decision.fallbackModels.length}`,
        },
      ],
    }
  }

  /**
   * 队列管理
   */
  enqueue(request: RouteRequest, priority: number = 0): Promise<RouteDecision> {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.config.concurrency.maxQueueSize) {
        reject(new Error('Queue is full'))
        return
      }

      const item: QueueItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        request,
        priority,
        createdAt: Date.now(),
        callback: resolve,
        errorCallback: reject,
      }

      this.queue.push(item)
      this.queue.sort((a, b) => b.priority - a.priority)

      this.processQueue()
    })
  }

  private processQueue(): void {
    while (
      this.activeRequests < this.config.concurrency.maxConcurrent &&
      this.queue.length > 0
    ) {
      const item = this.queue.shift()
      if (!item) break

      this.activeRequests++

      try {
        const decision = this.route(item.request)
        item.callback(decision)
      } catch (error) {
        item.errorCallback(error as Error)
      } finally {
        this.activeRequests--
      }
    }
  }

  /**
   * 运行时切换模型
   */
  switchModel(modelId: string): boolean {
    const model = this.registry.getModel(modelId)
    if (!model || !model.enabled) {
      return false
    }

    this.config.defaultModelId = modelId
    return true
  }

  /**
   * 设置路由策略
   */
  setStrategy(strategy: RoutingStrategy): void {
    this.config.defaultStrategy = strategy
  }

  /**
   * 获取配置
   */
  getConfig(): RouterConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      fallbacks: 0,
      byModel: new Map(),
      byTaskType: new Map(),
      byStrategy: new Map(),
      avgLatency: 0,
      totalCost: 0,
    }
    this.cache.clear()
    this.dailyCost = 0
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    for (const item of this.queue) {
      item.errorCallback(new Error('Queue cleared'))
    }
    this.queue = []
  }
}

/**
 * 默认路由器实例
 */
export const modelRouter = new ModelRouter()

/**
 * 便捷函数
 */
export function routeRequest(request: RouteRequest): RouteDecision {
  return modelRouter.route(request)
}

/**
 * 从环境变量初始化配置
 */
export function initFromEnv(): void {
  const envConfig: Partial<RouterConfig> = {}

  if (process.env.DEFAULT_MODEL_ID) {
    envConfig.defaultModelId = process.env.DEFAULT_MODEL_ID
  }

  if (process.env.DEFAULT_STRATEGY) {
    envConfig.defaultStrategy = process.env.DEFAULT_STRATEGY as RoutingStrategy
  }

  if (process.env.DAILY_BUDGET_LIMIT) {
    envConfig.dailyBudgetLimit = parseInt(process.env.DAILY_BUDGET_LIMIT, 10)
  }

  if (process.env.MAX_CONCURRENT_REQUESTS) {
    envConfig.concurrency = {
      ...DEFAULT_ROUTER_CONFIG.concurrency,
      maxConcurrent: parseInt(process.env.MAX_CONCURRENT_REQUESTS, 10),
    }
  }

  if (process.env.ENABLE_COST_OPTIMIZATION === 'false') {
    envConfig.enableCostOptimization = false
  }

  if (process.env.ENABLE_CACHE === 'false') {
    envConfig.enableCache = false
  }

  if (process.env.ENABLE_FALLBACK === 'false') {
    envConfig.enableFallback = false
  }

  modelRouter.updateConfig(envConfig)
}