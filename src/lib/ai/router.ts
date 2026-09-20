/**
 * 多模型智能路由引擎
 * 根据任务类型、复杂度、成本预算选择最优 AI 模型
 */

import {
  AIModel,
  RouteRequest,
  RouteDecision,
  ComplexityLevel,
  TaskType,
  RouterConfig,
} from './types'
import {
  getEnabledModels,
  getModelById,
  getModelsByProvider,
  getModelsForTaskType,
  getPreferredModelForTaskType,
  estimateModelCost,
} from './models'
import { TaskClassifier, classifyTask } from './classifier'
import { ComplexityEvaluator, evaluateComplexity, quickEvaluateComplexity } from './complexity'
import { SemanticCache, semanticCache, getCachedResponse, setCachedResponse } from './cache'
import { RateLimiter, globalRateLimiter, checkRateLimit } from './rate-limiter'
import { FallbackManager, fallbackManager, getFallbackChain, selectFallback } from './fallback'

/**
 * 默认路由配置
 */
const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  defaultModelId: 'gpt-4o',
  fallbackChain: ['gpt-4o', 'claude-4-sonnet', 'gemini-2-flash', 'deepseek-chat'],
  enableCostOptimization: true,
  enableLatencyOptimization: true,
  enableSemanticCache: true,
  cacheSimilarityThreshold: 0.95,
  rateLimits: {
    'gpt-4.5': { requestsPerMinute: 60, tokensPerMinute: 100000 },
    'gpt-4o': { requestsPerMinute: 100, tokensPerMinute: 200000 },
    'claude-4-opus': { requestsPerMinute: 30, tokensPerMinute: 50000 },
    'claude-4-sonnet': { requestsPerMinute: 60, tokensPerMinute: 100000 },
  },
  budgetLimits: {
    dailyLimit: 10000, // 100 元
    perRequestLimit: 1000, // 10 元
  },
}

/**
 * 多模型智能路由引擎类
 */
export class ModelRouter {
  private config: RouterConfig
  private classifier: TaskClassifier
  private complexityEvaluator: ComplexityEvaluator
  private cache: SemanticCache
  private rateLimiter: RateLimiter
  private fallbackManager: FallbackManager

  // 统计数据
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    fallbacks: 0,
    byModel: new Map<string, number>(),
    byTaskType: new Map<TaskType, number>(),
  }

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...config }
    this.classifier = new TaskClassifier()
    this.complexityEvaluator = new ComplexityEvaluator()
    this.cache = new SemanticCache({
      similarityThreshold: this.config.cacheSimilarityThreshold,
    })
    this.rateLimiter = new RateLimiter()
    this.fallbackManager = new FallbackManager()
  }

  /**
   * 路由请求 - 核心方法
   */
  route(request: RouteRequest): RouteDecision {
    this.stats.totalRequests++

    // 1. 检查缓存
    if (this.config.enableSemanticCache) {
      const cached = this.cache.get(request.prompt)
      if (cached) {
        this.stats.cacheHits++
        return cached as RouteDecision
      }
    }

    // 2. 分析任务类型 (如果未指定)
    const taskType = request.taskType ?? classifyTask(request.prompt).taskType
    this.stats.byTaskType.set(
      taskType,
      (this.stats.byTaskType.get(taskType) || 0) + 1
    )

    // 3. 评估复杂度 (如果未指定)
    const complexity =
      request.complexity ??
      evaluateComplexity(
        request.prompt,
        request.history,
        request.systemPrompt
      ).level

    // 4. 获取候选模型
    const candidates = this.getCandidateModels(request, taskType)

    // 5. 选择最佳模型
    const selected = this.selectBestModel(
      candidates,
      taskType,
      complexity,
      request
    )

    // 6. 生成备用链
    const fallbacks = this.generateFallbackChain(selected.id, request)

    // 7. 估算成本和延迟
    const estimatedCost = this.estimateCost(selected, request)
    const estimatedLatency = this.estimateLatency(selected, complexity)

    // 8. 构建决策
    const decision: RouteDecision = {
      selectedModel: selected,
      fallbackModels: fallbacks,
      reasoning: this.generateReasoning(selected, taskType, complexity),
      estimatedCost,
      estimatedLatency,
      confidence: this.calculateConfidence(selected, candidates),
    }

    // 9. 缓存决策
    if (this.config.enableSemanticCache) {
      this.cache.set(request.prompt, decision)
    }

    // 10. 更新统计
    this.stats.byModel.set(
      selected.id,
      (this.stats.byModel.get(selected.id) || 0) + 1
    )

    return decision
  }

  /**
   * 获取候选模型
   */
  private getCandidateModels(
    request: RouteRequest,
    taskType: TaskType
  ): AIModel[] {
    let candidates = getEnabledModels()

    // 过滤: 指定提供商
    if (request.preferredProvider) {
      candidates = candidates.filter(
        (m) => m.provider === request.preferredProvider
      )
    }

    // 过滤: 能力要求
    if (request.requireStreaming) {
      candidates = candidates.filter((m) => m.supportsStreaming)
    }
    if (request.requireVision) {
      candidates = candidates.filter((m) => m.supportsVision)
    }
    if (request.requireFunctionCalling) {
      candidates = candidates.filter((m) => m.supportsFunctionCalling)
    }

    // 过滤: 预算限制
    if (request.budget !== undefined && this.config.enableCostOptimization) {
      candidates = candidates.filter((m) => {
        const estimatedCost = estimateModelCost(m, 1000, request.maxTokens || 500)
        return estimatedCost <= request.budget!
      })
    }

    // 过滤: 速率限制
    candidates = candidates.filter((m) => {
      const rateCheck = this.rateLimiter.check(m.id, 1000)
      return rateCheck.allowed
    })

    // 优先: 任务类型匹配
    const taskPreferred = candidates.filter(
      (m) =>
        m.strengths.includes(taskType) ||
        m.isPreferredFor?.includes(taskType)
    )
    if (taskPreferred.length > 0) {
      return taskPreferred.sort((a, b) => a.priority - b.priority)
    }

    return candidates.sort((a, b) => a.priority - b.priority)
  }

  /**
   * 选择最佳模型
   */
  private selectBestModel(
    candidates: AIModel[],
    taskType: TaskType,
    complexity: ComplexityLevel,
    request: RouteRequest
  ): AIModel {
    if (candidates.length === 0) {
      // 使用默认模型
      return getModelById(this.config.defaultModelId)!
    }

    // 评分系统
    const scores = candidates.map((model) => ({
      model,
      score: this.calculateModelScore(model, taskType, complexity, request),
    }))

    // 按分数排序
    scores.sort((a, b) => b.score - a.score)

    return scores[0].model
  }

  /**
   * 计算模型评分
   */
  private calculateModelScore(
    model: AIModel,
    taskType: TaskType,
    complexity: ComplexityLevel,
    request: RouteRequest
  ): number {
    let score = 100

    // 1. 任务类型匹配 (权重 30%)
    if (model.strengths.includes(taskType)) {
      score += 30
    }
    if (model.isPreferredFor?.includes(taskType)) {
      score += 15 // 额外加分
    }

    // 2. 复杂度匹配 (权重 25%)
    switch (complexity) {
      case ComplexityLevel.EXPERT:
      case ComplexityLevel.HIGH:
        // 高复杂度需要更强的模型
        if (model.id.includes('opus') || model.id.includes('4.5')) {
          score += 25
        }
        break
      case ComplexityLevel.MEDIUM:
        // 中等复杂度选择平衡的模型
        if (model.id.includes('sonnet') || model.id.includes('4o')) {
          score += 20
        }
        break
      case ComplexityLevel.LOW:
        // 低复杂度选择快速模型
        if (model.id.includes('flash') || model.id.includes('mini')) {
          score += 25
        }
        break
    }

    // 3. 成本优化 (权重 20%)
    if (this.config.enableCostOptimization && request.budget !== undefined) {
      const estimatedCost = estimateModelCost(
        model,
        1000,
        request.maxTokens || 500
      )
      // 成本越低分数越高
      const costScore = Math.max(0, 20 - (estimatedCost / request.budget) * 20)
      score += costScore
    }

    // 4. 延迟优化 (权重 15%)
    if (this.config.enableLatencyOptimization) {
      // 根据模型类型估算延迟分数
      const latencyScores: Record<string, number> = {
        'gpt-4o': 15,
        'claude-4-sonnet': 14,
        'gemini-2-flash': 18,
        'deepseek-chat': 16,
        'glm-4-flash': 17,
      }
      score += latencyScores[model.id] || 10
    }

    // 5. 优先级 (权重 10%)
    score += Math.max(0, 10 - model.priority * 0.5)

    return score
  }

  /**
   * 生成备用链
   */
  private generateFallbackChain(
    primaryModelId: string,
    request: RouteRequest
  ): AIModel[] {
    const fallbacks: AIModel[] = []
    const attempted = new Set<string>([primaryModelId])

    for (const modelId of this.config.fallbackChain) {
      if (!attempted.has(modelId)) {
        const model = getModelById(modelId)
        if (model && model.enabled) {
          fallbacks.push(model)
          attempted.add(modelId)
        }
      }
    }

    // 添加其他可用模型作为后备
    const allModels = getEnabledModels()
    for (const model of allModels) {
      if (!attempted.has(model.id)) {
        fallbacks.push(model)
        attempted.add(model.id)
      }
    }

    return fallbacks.slice(0, 5) // 最多 5 个备用
  }

  /**
   * 估算成本
   */
  private estimateCost(model: AIModel, request: RouteRequest): number {
    const inputTokens = Math.ceil(request.prompt.length / 4)
    const outputTokens = request.maxTokens || 1000
    return estimateModelCost(model, inputTokens, outputTokens)
  }

  /**
   * 估算延迟
   */
  private estimateLatency(
    model: AIModel,
    complexity: ComplexityLevel
  ): number {
    // 基础延迟 (毫秒)
    const baseLatencies: Record<string, number> = {
      'gpt-4.5': 2000,
      'gpt-4o': 1500,
      'claude-4-opus': 3000,
      'claude-4-sonnet': 1500,
      'gemini-2-pro': 1500,
      'gemini-2-flash': 500,
      'deepseek-coder': 1000,
      'deepseek-chat': 800,
      'glm-4': 1000,
      'glm-4-flash': 300,
    }

    const base = baseLatencies[model.id] || 1500
    const complexityMultiplier = {
      [ComplexityLevel.LOW]: 1.0,
      [ComplexityLevel.MEDIUM]: 1.5,
      [ComplexityLevel.HIGH]: 2.0,
      [ComplexityLevel.EXPERT]: 3.0,
    }

    return Math.round(base * complexityMultiplier[complexity])
  }

  /**
   * 生成决策理由
   */
  private generateReasoning(
    model: AIModel,
    taskType: TaskType,
    complexity: ComplexityLevel
  ): string {
    const reasons: string[] = []

    reasons.push(`选择 ${model.displayName}`)
    reasons.push(`任务类型: ${taskType}`)
    reasons.push(`复杂度: ${complexity}`)

    if (model.isPreferredFor?.includes(taskType)) {
      reasons.push('该模型是此任务类型的首选')
    } else if (model.strengths.includes(taskType)) {
      reasons.push('该模型擅长此任务类型')
    }

    return reasons.join(' | ')
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(
    selected: AIModel,
    candidates: AIModel[]
  ): number {
    if (candidates.length === 0) return 0.5
    if (candidates.length === 1) return 0.9

    // 候选模型越多，竞争越激烈，置信度可能越低
    const competitionFactor = Math.max(0.6, 1 - candidates.length * 0.05)
    return Math.round(competitionFactor * 100) / 100
  }

  /**
   * 执行请求 (带缓存、限流、降级)
   */
  async execute<T>(
    request: RouteRequest,
    executor: (model: AIModel) => Promise<T>
  ): Promise<{ result: T; model: AIModel; fromCache: boolean }> {
    // 1. 检查缓存
    if (this.config.enableSemanticCache) {
      const cached = this.cache.get(request.prompt)
      if (cached) {
        this.stats.cacheHits++
        return {
          result: cached as T,
          model: getModelById(this.config.defaultModelId)!,
          fromCache: true,
        }
      }
    }

    // 2. 获取路由决策
    const decision = this.route(request)

    // 3. 执行带降级的调用
    const { result, model, retries } =
      await this.fallbackManager.executeWithFallback(
        request,
        executor,
        decision.selectedModel.id
      )

    if (retries > 0) {
      this.stats.fallbacks++
    }

    // 4. 缓存结果
    if (this.config.enableSemanticCache) {
      this.cache.set(request.prompt, result)
    }

    return { result, model, fromCache: false }
  }

  /**
   * 获取路由统计
   */
  getStats() {
    return {
      ...this.stats,
      cacheStats: this.cache.getStats(),
    }
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      fallbacks: 0,
      byModel: new Map(),
      byTaskType: new Map(),
    }
    this.cache.clear()
    this.fallbackManager.reset()
    this.rateLimiter.reset()
  }
}

/**
 * 默认路由器实例
 */
export const modelRouter = new ModelRouter()

/**
 * 便捷路由函数
 */
export function routeRequest(request: RouteRequest): RouteDecision {
  return modelRouter.route(request)
}

/**
 * 便捷函数导出 (从各模块导入)
 */
export {
  // 分类器
  TaskClassifier,
  classifyTask,
  
  // 复杂度评估器
  ComplexityEvaluator,
  evaluateComplexity,
  quickEvaluateComplexity,
  
  // 语义缓存
  SemanticCache,
  semanticCache,
  getCachedResponse,
  setCachedResponse,
  
  // 限流
  RateLimiter,
  globalRateLimiter,
  checkRateLimit,
  
  // 降级
  FallbackManager,
  fallbackManager,
  getFallbackChain,
  selectFallback,
  
  // 模型相关
  getEnabledModels,
  getModelById,
  getModelsByProvider,
  getModelsForTaskType,
  getPreferredModelForTaskType,
  estimateModelCost,
}