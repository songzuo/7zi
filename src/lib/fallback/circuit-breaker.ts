/**
 * Circuit Breaker Pattern Implementation
 *
 * Implements the circuit breaker pattern for API calls to prevent cascading failures
 * and provide graceful degradation when services are unavailable.
 */

export enum CircuitState {
  /** Circuit is closed - requests pass through normally */
  CLOSED = 'CLOSED',
  /** Circuit is open - requests fail immediately */
  OPEN = 'OPEN',
  /** Circuit is half-open - testing if service has recovered */
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit (default: 5) */
  failureThreshold?: number
  /** Number of successes before closing circuit (default: 2) */
  successThreshold?: number
  /** Time in ms before attempting recovery (default: 60000) */
  recoveryTimeout?: number
  /** Percentage of failures to trigger circuit (default: 50) */
  failurePercentageThreshold?: number
  /** Minimum requests before triggering (default: 10) */
  minimumRequests?: number
  /** Timeout for individual requests (default: 30000) */
  requestTimeout?: number
  /** Circuit name for logging */
  name?: string
}

interface CircuitStats {
  /** Total requests */
  total: number
  /** Successful requests */
  successes: number
  /** Failed requests */
  failures: number
  /** Last failure time */
  lastFailureTime?: number
  /** Last success time */
  lastSuccessTime?: number
}

/**
 * Circuit Breaker Class
 *
 * Tracks service health and prevents cascading failures
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   name: 'api-breaker',
 *   failureThreshold: 5,
 *   recoveryTimeout: 60000,
 * });
 *
 * const result = await breaker.execute(async () => {
 *   return await fetch(url);
 * });
 * ```
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private stats: CircuitStats = {
    total: 0,
    successes: 0,
    failures: 0,
  }
  private config: Required<CircuitBreakerConfig>

  constructor(config?: CircuitBreakerConfig) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 2,
      recoveryTimeout: config?.recoveryTimeout ?? 60000,
      failurePercentageThreshold: config?.failurePercentageThreshold ?? 50,
      minimumRequests: config?.minimumRequests ?? 10,
      requestTimeout: config?.requestTimeout ?? 30000,
      name: config?.name ?? 'circuit-breaker',
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - (this.stats.lastFailureTime || 0)
      if (timeSinceLastFailure >= this.config.recoveryTimeout) {
        this.setState(CircuitState.HALF_OPEN)
      }
    }

    return this.state
  }

  /**
   * Get circuit statistics
   */
  getStats(): CircuitStats {
    return { ...this.stats }
  }

  /**
   * Execute a function through the circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.getState()

    // If circuit is open, fail immediately
    if (state === CircuitState.OPEN) {
      const timeSinceLastFailure = Date.now() - (this.stats.lastFailureTime || 0)
      const remainingTime = this.config.recoveryTimeout - timeSinceLastFailure

      throw new CircuitBreakerOpenError(
        `Circuit breaker is open for ${this.config.name}. Retry after ${Math.ceil(remainingTime / 1000)}s`,
        state,
        remainingTime
      )
    }

    try {
      // Execute the function with timeout
      const result = await this.withTimeout(fn, this.config.requestTimeout)

      // Record success
      this.recordSuccess()

      return result
    } catch (error) {
      // Record failure
      this.recordFailure()

      throw error
    }
  }

  /**
   * Execute function without circuit breaker (direct call)
   */
  async executeDirect<T>(fn: () => Promise<T>): Promise<T> {
    return this.withTimeout(fn, this.config.requestTimeout)
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset(): void {
    this.setState(CircuitState.CLOSED)
    this.stats = {
      total: 0,
      successes: 0,
      failures: 0,
    }
  }

  /**
   * Manually open the circuit
   */
  open(): void {
    this.setState(CircuitState.OPEN)
  }

  /**
   * Manually close the circuit
   */
  close(): void {
    this.reset()
  }

  /**
   * Set circuit state
   */
  private setState(state: CircuitState): void {
    if (this.state !== state) {
      this.state = state
    }
  }

  /**
   * Record a successful request
   */
  private recordSuccess(): void {
    this.stats.total++
    this.stats.successes++
    this.stats.lastSuccessTime = Date.now()

    // If in HALF_OPEN, close circuit after enough successes
    if (
      this.state === CircuitState.HALF_OPEN &&
      this.stats.successes >= this.config.successThreshold
    ) {
      this.setState(CircuitState.CLOSED)
      // Reset stats for closed state
      this.stats.successes = 0
      this.stats.failures = 0
    }
  }

  /**
   * Record a failed request
   */
  private recordFailure(): void {
    this.stats.total++
    this.stats.failures++
    this.stats.lastFailureTime = Date.now()

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.setState(CircuitState.OPEN)
    }

    // If in HALF_OPEN, any failure opens circuit again
    if (this.state === CircuitState.HALF_OPEN) {
      this.setState(CircuitState.OPEN)
    }
  }

  /**
   * Determine if circuit should open based on stats
   */
  private shouldOpenCircuit(): boolean {
    // Not enough data
    if (this.stats.total < this.config.minimumRequests) {
      return false
    }

    // Check absolute failure count
    if (this.stats.failures >= this.config.failureThreshold) {
      return true
    }

    // Check failure percentage
    const failurePercentage = (this.stats.failures / this.stats.total) * 100
    return failurePercentage >= this.config.failurePercentageThreshold
  }

  /**
   * Execute function with timeout
   */
  private async withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`))
      }, timeoutMs)
    })

    return Promise.race([fn(), timeoutPromise])
  }

  /**
   * Get health status
   */
  getHealth(): {
    state: CircuitState
    stats: CircuitStats
    isHealthy: boolean
    failureRate: number
  } {
    const state = this.getState()
    const failureRate = this.stats.total > 0 ? (this.stats.failures / this.stats.total) * 100 : 0

    return {
      state,
      stats: { ...this.stats },
      isHealthy: state === CircuitState.CLOSED,
      failureRate,
    }
  }
}

/**
 * Circuit breaker open error
 */
export class CircuitBreakerOpenError extends Error {
  public readonly state: CircuitState
  public readonly retryAfter: number

  constructor(message: string, state: CircuitState, retryAfter: number) {
    super(message)
    this.name = 'CircuitBreakerOpenError'
    this.state = state
    this.retryAfter = retryAfter
  }
}

/**
 * Circuit breaker registry for managing multiple breakers
 */
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry
  private breakers = new Map<string, CircuitBreaker>()

  private constructor() {}

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry()
    }
    return CircuitBreakerRegistry.instance
  }

  /**
   * Get or create a circuit breaker
   */
  getBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.breakers.get(name)

    if (!breaker) {
      breaker = new CircuitBreaker({ ...config, name })
      this.breakers.set(name, breaker)
    }

    return breaker
  }

  /**
   * Remove a circuit breaker
   */
  removeBreaker(name: string): void {
    this.breakers.delete(name)
  }

  /**
   * Get all circuit breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers)
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset())
  }
}

/**
 * Convenience function to get circuit breaker from registry
 */
export function getCircuitBreaker(name: string, config?: CircuitBreakerConfig): CircuitBreaker {
  return CircuitBreakerRegistry.getInstance().getBreaker(name, config)
}

/**
 * HOC to wrap async functions with circuit breaker
 */
export function withCircuitBreaker<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  config?: CircuitBreakerConfig
): T {
  const breaker = getCircuitBreaker(config?.name || fn.name || 'anonymous', config)

  return (async (...args: Parameters<T>) => {
    return breaker.execute(() => fn(...args))
  }) as T
}
