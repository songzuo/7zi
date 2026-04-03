/**
 * 降级机制
 * 主模型失败时自动切换备用模型
 */

import { AIModel, ModelStatus, RouteRequest } from './types'
import { getModelById, getEnabledModels } from './models'
import { globalRateLimiter } from './rate-limiter'

/**
 * 降级链配置
 */
interface FallbackChainConfig {
  maxRetries: number // 最大重试次数
  retryDelayMs: number // 重试延迟 (毫秒)
  enableCircuitBreaker: boolean // 是否启用熔断器
  errorThreshold: number // 熔断错误阈值
  recoveryTimeMs: number // 恢复时间 (毫秒)
}

const DEFAULT_CONFIG: FallbackChainConfig = {
  maxRetries: 2,
  retryDelayMs: 1000,
  enableCircuitBreaker: true,
  errorThreshold: 3,
  recoveryTimeMs: 60000,
}

/**
 * 熔断器状态
 */
enum CircuitState {
  CLOSED = 'closed', // 正常
  OPEN = 'open', // 熔断
  HALF_OPEN = 'half_open', // 半开
}

/**
 * 熔断器
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private lastFailureTime = 0
  private config: FallbackChainConfig

  constructor(config: FallbackChainConfig) {
    this.config = config
  }

  /**
   * 检查是否允许请求
   */
  isAvailable(): boolean {
    if (!this.config.enableCircuitBreaker) return true

    switch (this.state) {
      case CircuitState.CLOSED:
        return true

      case CircuitState.OPEN:
        // 检查是否应该尝试半开
        if (Date.now() - this.lastFailureTime >= this.config.recoveryTimeMs) {
          this.state = CircuitState.HALF_OPEN
          return true
        }
        return false

      case CircuitState.HALF_OPEN:
        return true
    }
  }

  /**
   * 记录成功
   */
  recordSuccess(): void {
    this.failureCount = 0
    this.state = CircuitState.CLOSED
  }

  /**
   * 记录失败
   */
  recordFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.config.errorThreshold) {
      this.state = CircuitState.OPEN
    }
  }

  /**
   * 获取状态
   */
  getState(): CircuitState {
    return this.state
  }

  /**
   * 重置
   */
  reset(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.lastFailureTime = 0
  }
}

/**
 * 降级管理器类
 */
export class FallbackManager {
  private config: FallbackChainConfig
  private circuitBreakers: Map<string, CircuitBreaker>
  private modelStatuses: Map<string, ModelStatus>

  constructor(config: Partial<FallbackChainConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.circuitBreakers = new Map()
    this.modelStatuses = new Map()
  }

  /**
   * 获取或创建熔断器
   */
  private getCircuitBreaker(modelId: string): CircuitBreaker {
    let breaker = this.circuitBreakers.get(modelId)
    if (!breaker) {
      breaker = new CircuitBreaker(this.config)
      this.circuitBreakers.set(modelId, breaker)
    }
    return breaker
  }

  /**
   * 获取备用模型链
   */
  getFallbackChain(primaryModelId: string): AIModel[] {
    const chain: AIModel[] = []
    const primary = getModelById(primaryModelId)

    if (!primary) {
      // 返回默认模型链
      return getEnabledModels()
    }

    chain.push(primary)

    // 按优先级获取备用模型
    const enabledModels = getEnabledModels()
    for (const model of enabledModels) {
      if (model.id !== primaryModelId && !model.isFallback) {
        chain.push(model)
      }
    }

    // 添加所有备用模型
    for (const model of enabledModels) {
      if (model.isFallback) {
        chain.push(model)
      }
    }

    return chain
  }

  /**
   * 选择最佳备用模型
   */
  selectFallback(
    request: RouteRequest,
    attemptedModels: Set<string>
  ): AIModel | null {
    const chain = this.getFallbackChain(request.preferredProvider || '')
    
    for (const model of chain) {
      // 跳过已尝试的模型
      if (attemptedModels.has(model.id)) {
        continue
      }

      // 检查熔断器
      const breaker = this.getCircuitBreaker(model.id)
      if (!breaker.isAvailable()) {
        continue
      }

      // 检查速率限制
      const rateLimit = globalRateLimiter.check(model.id, 1000)
      if (!rateLimit.allowed) {
        continue
      }

      // 检查成本预算
      if (request.budget !== undefined) {
        // 简单估算
        const estimatedCost = model.inputPricePerM * 10 // 假设 10k tokens
        if (estimatedCost > request.budget) {
          continue
        }
      }

      return model
    }

    return null
  }

  /**
   * 记录模型成功
   */
  recordSuccess(modelId: string): void {
    const breaker = this.getCircuitBreaker(modelId)
    breaker.recordSuccess()

    // 更新状态
    const status = this.getOrCreateStatus(modelId)
    status.isAvailable = true
    status.errorCount = 0
    status.lastChecked = Date.now()
  }

  /**
   * 记录模型失败
   */
  recordFailure(modelId: string, error?: Error): void {
    const breaker = this.getCircuitBreaker(modelId)
    breaker.recordFailure()

    // 更新状态
    const status = this.getOrCreateStatus(modelId)
    status.errorCount++
    status.lastChecked = Date.now()

    if (status.errorCount >= this.config.errorThreshold) {
      status.isAvailable = false
    }
  }

  /**
   * 获取或创建模型状态
   */
  private getOrCreateStatus(modelId: string): ModelStatus {
    let status = this.modelStatuses.get(modelId)
    if (!status) {
      status = {
        modelId,
        isAvailable: true,
        lastChecked: Date.now(),
        errorCount: 0,
        avgLatency: 0,
        rpm: 0,
        tpm: 0,
      }
      this.modelStatuses.set(modelId, status)
    }
    return status
  }

  /**
   * 获取模型状态
   */
  getModelStatus(modelId: string): ModelStatus | undefined {
    return this.modelStatuses.get(modelId)
  }

  /**
   * 获取所有模型状态
   */
  getAllModelStatuses(): ModelStatus[] {
    return Array.from(this.modelStatuses.values())
  }

  /**
   * 执行带降级的调用
   */
  async executeWithFallback<T>(
    request: RouteRequest,
    executor: (model: AIModel) => Promise<T>,
    primaryModelId: string
  ): Promise<{ result: T; model: AIModel; retries: number }> {
    const attemptedModels = new Set<string>()
    let retries = 0

    while (true) {
      const model = this.selectFallback(request, attemptedModels)

      if (!model) {
        throw new Error('No available model in fallback chain')
      }

      attemptedModels.add(model.id)

      try {
        const result = await executor(model)
        this.recordSuccess(model.id)
        return { result, model, retries }
      } catch (error) {
        retries++
        this.recordFailure(model.id, error as Error)

        if (retries >= this.config.maxRetries) {
          throw error
        }

        // 等待后重试
        await this.delay(this.config.retryDelayMs)
      }
    }
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 重置所有熔断器
   */
  reset(): void {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset()
    }
    this.modelStatuses.clear()
  }

  /**
   * 重置特定模型熔断器
   */
  resetModel(modelId: string): void {
    const breaker = this.circuitBreakers.get(modelId)
    if (breaker) {
      breaker.reset()
    }

    const status = this.modelStatuses.get(modelId)
    if (status) {
      status.isAvailable = true
      status.errorCount = 0
    }
  }
}

/**
 * 默认降级管理器实例
 */
export const fallbackManager = new FallbackManager()

/**
 * 便捷函数
 */
export function getFallbackChain(modelId: string): AIModel[] {
  return fallbackManager.getFallbackChain(modelId)
}

export function selectFallback(
  request: RouteRequest,
  attempted: Set<string>
): AIModel | null {
  return fallbackManager.selectFallback(request, attempted)
}