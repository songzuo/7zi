/**
 * Graceful Degradation Strategies
 *
 * Provides utilities for gracefully degrading features when they fail
 * or when network/system conditions are poor.
 */

import { CircuitBreaker, CircuitBreakerConfig } from './circuit-breaker'

export type DegradationLevel = 'none' | 'partial' | 'minimal'

export interface DegradationStrategy {
  /** Level of degradation */
  level: DegradationLevel
  /** Check if strategy should be applied */
  shouldApply: () => boolean | Promise<boolean>
  /** Fallback implementation */
  fallback: () => void
}

export interface DegradationConfig {
  /** Enable degradation */
  enabled?: boolean
  /** Automatic degradation based on performance */
  autoDegrade?: boolean
  /** Performance threshold (ms) for degradation */
  performanceThreshold?: number
  /** Error threshold for degradation */
  errorThreshold?: number
  /** Circuit breaker config for API calls */
  circuitBreaker?: CircuitBreakerConfig
}

/**
 * Feature flags for degradation
 */
export class FeatureFlags {
  private flags = new Map<string, boolean>()

  /**
   * Set feature flag
   */
  setFlag(feature: string, enabled: boolean): void {
    this.flags.set(feature, enabled)
  }

  /**
   * Get feature flag
   */
  getFlag(feature: string): boolean {
    return this.flags.get(feature) ?? true
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(feature: string): boolean {
    return this.getFlag(feature)
  }

  /**
   * Disable feature
   */
  disable(feature: string): void {
    this.flags.set(feature, false)
  }

  /**
   * Enable feature
   */
  enable(feature: string): void {
    this.flags.set(feature, true)
  }

  /**
   * Set multiple flags
   */
  setFlags(flags: Record<string, boolean>): void {
    Object.entries(flags).forEach(([key, value]) => {
      this.flags.set(key, value)
    })
  }

  /**
   * Get all flags
   */
  getAllFlags(): Record<string, boolean> {
    return Object.fromEntries(this.flags)
  }
}

/**
 * Degradation Manager
 *
 * Manages feature degradation based on conditions
 */
export class DegradationManager {
  private static instance: DegradationManager
  private strategies = new Map<string, DegradationStrategy>()
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private config: Required<DegradationConfig>
  private errorCounts = new Map<string, number>()
  private performanceScores = new Map<string, number>()
  private featureFlags = new FeatureFlags()

  private constructor(config: DegradationConfig = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      autoDegrade: config.autoDegrade ?? true,
      performanceThreshold: config.performanceThreshold ?? 1000,
      errorThreshold: config.errorThreshold ?? 5,
      circuitBreaker: config.circuitBreaker ?? {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        successThreshold: 2,
      },
    }
  }

  static getInstance(config?: DegradationConfig): DegradationManager {
    if (!DegradationManager.instance) {
      DegradationManager.instance = new DegradationManager(config)
    }
    return DegradationManager.instance
  }

  /**
   * Register a degradation strategy
   */
  registerStrategy(feature: string, strategy: DegradationStrategy): void {
    this.strategies.set(feature, strategy)
  }

  /**
   * Apply degradation strategies
   */
  async applyDegradation(): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    for (const [feature, strategy] of this.strategies) {
      const shouldApply = await strategy.shouldApply()

      if (shouldApply && strategy.level !== 'none') {
        strategy.fallback()
        this.featureFlags.disable(feature)
      } else {
        this.featureFlags.enable(feature)
      }
    }
  }

  /**
   * Record error for feature
   */
  recordError(feature: string): void {
    const count = this.errorCounts.get(feature) ?? 0
    this.errorCounts.set(feature, count + 1)

    // Auto-degrade if error threshold reached
    if (this.config.autoDegrade && count >= this.config.errorThreshold) {
      console.warn(`[Degradation] Feature ${feature} error threshold reached, degrading`)
      this.featureFlags.disable(feature)
    }
  }

  /**
   * Record performance for feature
   */
  recordPerformance(feature: string, duration: number): void {
    this.performanceScores.set(feature, duration)

    // Auto-degrade if performance is poor
    if (this.config.autoDegrade && duration > this.config.performanceThreshold) {
      console.warn(`[Degradation] Feature ${feature} performance poor (${duration}ms), degrading`)
      this.featureFlags.disable(feature)
    }
  }

  /**
   * Reset error count for feature
   */
  resetErrorCount(feature: string): void {
    this.errorCounts.delete(feature)
    this.featureFlags.enable(feature)
  }

  /**
   * Check if feature is degraded
   */
  isDegraded(feature: string): boolean {
    return !this.featureFlags.isEnabled(feature)
  }

  /**
   * Get feature flags instance
   */
  getFeatureFlags(): FeatureFlags {
    return this.featureFlags
  }

  /**
   * Get circuit breaker for feature
   */
  getCircuitBreaker(feature: string): CircuitBreaker {
    let breaker = this.circuitBreakers.get(feature)

    if (!breaker) {
      breaker = new CircuitBreaker({
        ...this.config.circuitBreaker,
        name: `degradation-${feature}`,
      })
      this.circuitBreakers.set(feature, breaker)
    }

    return breaker
  }

  /**
   * Get degradation status
   */
  getStatus(): {
    degradedFeatures: string[]
    errorCounts: Record<string, number>
    performanceScores: Record<string, number>
    featureFlags: Record<string, boolean>
  } {
    const degradedFeatures: string[] = []

    this.strategies.forEach((_, feature) => {
      if (this.isDegraded(feature)) {
        degradedFeatures.push(feature)
      }
    })

    return {
      degradedFeatures,
      errorCounts: Object.fromEntries(this.errorCounts),
      performanceScores: Object.fromEntries(this.performanceScores),
      featureFlags: this.featureFlags.getAllFlags(),
    }
  }

  /**
   * Reset all degradation
   */
  reset(): void {
    this.errorCounts.clear()
    this.performanceScores.clear()
    this.featureFlags = new FeatureFlags()
    this.circuitBreakers.forEach(breaker => breaker.reset())
  }
}

/**
 * Decorator for graceful degradation
 */
export function withDegradation<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: {
    /** Feature name */
    feature: string
    /** Fallback value */
    fallback?: unknown
    /** Degradation level */
    level?: DegradationLevel
    /** Custom fallback function */
    fallbackFn?: () => unknown
  }
): T {
  const manager = DegradationManager.getInstance()

  return (async (...args: Parameters<T>) => {
    const { feature, fallback, fallbackFn, level } = options

    // Check if feature is degraded
    if (manager.isDegraded(feature)) {
      return fallbackFn?.() ?? fallback
    }

    const startTime = Date.now()

    try {
      // Execute through circuit breaker
      const breaker = manager.getCircuitBreaker(feature)
      const result = await breaker.execute(() => fn(...args))

      // Record performance
      const duration = Date.now() - startTime
      manager.recordPerformance(feature, duration)

      return result
    } catch (error) {
      // Record error
      manager.recordError(feature)

      // Apply fallback
      console.warn(`[Degradation] Feature ${feature} failed, using fallback:`, error)
      return fallbackFn?.() ?? fallback
    }
  }) as T
}

/**
 * Network condition detector
 */
export class NetworkCondition {
  private static instance: NetworkCondition
  private isSlow = false
  private isOffline = false
  private lastCheck = 0

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOffline = false
      })
      window.addEventListener('offline', () => {
        this.isOffline = true
      })
    }
  }

  static getInstance(): NetworkCondition {
    if (!NetworkCondition.instance) {
      NetworkCondition.instance = new NetworkCondition()
    }
    return NetworkCondition.instance
  }

  /**
   * Check network conditions
   */
  async check(): Promise<{
    isSlow: boolean
    isOffline: boolean
    effectiveType?: string
    downlink?: number
  }> {
    // Throttle checks
    const now = Date.now()
    if (now - this.lastCheck < 5000) {
      return { isSlow: this.isSlow, isOffline: this.isOffline }
    }
    this.lastCheck = now

    // Check if offline
    this.isOffline = typeof navigator !== 'undefined' && !navigator.onLine

    // Check connection type (if available)
    interface NetworkConnection {
      effectiveType?: string
      downlink?: number
    }

    interface NavigatorWithConnection extends Navigator {
      connection?: NetworkConnection
    }

    const nav = navigator as NavigatorWithConnection
    const connection = nav.connection

    if (connection) {
      this.isSlow =
        connection.effectiveType === 'slow-2g' ||
        connection.effectiveType === '2g' ||
        (connection.downlink !== undefined && connection.downlink < 1)

      return {
        isSlow: this.isSlow,
        isOffline: this.isOffline,
        effectiveType: connection.effectiveType,
        downlink: connection.downlink ?? 0,
      }
    }

    return { isSlow: this.isSlow, isOffline: this.isOffline }
  }

  /**
   * Check if should use degraded version
   */
  async shouldDegrade(): Promise<boolean> {
    const conditions = await this.check()
    return conditions.isOffline || conditions.isSlow
  }
}

/**
 * Convenience function to get degradation manager
 */
export function getDegradationManager(config?: DegradationConfig): DegradationManager {
  return DegradationManager.getInstance(config)
}

/**
 * Convenience function to get network condition detector
 */
export function getNetworkCondition(): NetworkCondition {
  return NetworkCondition.getInstance()
}
