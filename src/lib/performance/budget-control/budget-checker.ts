/**
 * Performance Budget Checker
 * Checks performance metrics against defined budgets and reports violations
 */

// ========================================
// Types
// ========================================

/**
 * Budget configuration file format (budget.json)
 */
export interface BudgetConfig {
  budgets: Budget[]
}

/**
 * Performance budget for a specific page/path
 */
export interface Budget {
  /** Route path (e.g., '/', '/dashboard', '/tasks') */
  path: string
  /** Performance timing budgets */
  timings: TimingBudget[]
}

/**
 * Individual metric budget definition
 */
export interface TimingBudget {
  /** Metric type to track */
  metric: 'LCP' | 'FID' | 'CLS' | 'TBT' | 'TTFB' | 'FCP'
  /** Budget threshold in milliseconds (or CLS which is a ratio) */
  budget: number
  /** Tolerance percentage (e.g., 0.1 = 10% over budget is allowed) */
  tolerance: number
}

/**
 * Performance metrics to check against budgets
 */
export interface PerformanceMetrics {
  /** Largest Contentful Paint (ms) */
  LCP?: number
  /** First Input Delay (ms) */
  FID?: number
  /** Cumulative Layout Shift (ratio, 0-1) */
  CLS?: number
  /** Total Blocking Time (ms) */
  TBT?: number
  /** Time to First Byte (ms) */
  TTFB?: number
  /** First Contentful Paint (ms) */
  FCP?: number
}

/**
 * Result of budget check for a single page
 */
export interface BudgetCheckResult {
  /** Overall pass/fail status */
  passed: boolean
  /** List of violations (empty if passed) */
  violations: BudgetViolation[]
  /** Timestamp of check */
  timestamp: number
}

/**
 * Individual budget violation
 */
export interface BudgetViolation {
  /** Metric that violated budget */
  metric: string
  /** Budgeted threshold */
  budget: number
  /** Actual measured value */
  actual: number
  /** Threshold including tolerance */
  threshold: number
  /** Percentage over threshold */
  percentOver: number
  /** Severity based on how far over budget */
  severity: 'warning' | 'critical'
}

/**
 * Budget checker configuration
 */
export interface BudgetCheckerConfig {
  /** Path to budget config file */
  configPath: string
  /** Enable/disable budget checking */
  enabled: boolean
  /** Custom budget loader function */
  loadBudgets?: () => Promise<BudgetConfig | null>
}

// ========================================
// Budget Checker Class
// ========================================

export class BudgetChecker {
  private config: BudgetCheckerConfig
  private budgetConfig: BudgetConfig | null = null
  private lastLoaded: number = 0
  private cacheDuration: number = 60000 // Cache config for 1 minute

  constructor(config: Partial<BudgetCheckerConfig> = {}) {
    this.config = {
      configPath: '/budget.json',
      enabled: true,
      ...config,
    }
  }

  /**
   * Load budget configuration from file or custom loader
   */
  async loadBudgetConfig(forceReload: boolean = false): Promise<BudgetConfig | null> {
    const now = Date.now()

    // Return cached config if available and not forced to reload
    if (!forceReload && this.budgetConfig && now - this.lastLoaded < this.cacheDuration) {
      return this.budgetConfig
    }

    try {
      if (this.config.loadBudgets) {
        // Use custom loader
        this.budgetConfig = await this.config.loadBudgets()
      } else {
        // Load from file (client-side or server-side)
        this.budgetConfig = await this.loadBudgetFromFile(this.config.configPath)
      }

      this.lastLoaded = now
      return this.budgetConfig
    } catch (error) {
      console.error('[BudgetChecker] Failed to load budget config:', error)
      return null
    }
  }

  /**
   * Load budget configuration from a JSON file
   */
  private async loadBudgetFromFile(path: string): Promise<BudgetConfig | null> {
    try {
      // Client-side: fetch from public directory
      if (typeof window !== 'undefined') {
        const response = await fetch(path)
        if (!response.ok) {
          console.warn(`[BudgetChecker] Failed to fetch ${path}: ${response.status}`)
          return null
        }
        return await response.json()
      }

      // Server-side: require the file
      // Note: This assumes the file exists at the given path
      try {
        // @ts-ignore - dynamic import for server-side
        const config = await import(path)
        return config.default || config
      } catch (error) {
        return null
      }
    } catch (error) {
      console.error(`[BudgetChecker] Error loading budget file from ${path}:`, error)
      return null
    }
  }

  /**
   * Check if budgets are enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Set budget checker enabled state
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
  }

  /**
   * Check performance metrics against budget for a specific page
   */
  async checkBudget(page: string, metrics: PerformanceMetrics): Promise<BudgetCheckResult> {
    if (!this.config.enabled) {
      return {
        passed: true,
        violations: [],
        timestamp: Date.now(),
      }
    }

    // Load budget config
    const config = await this.loadBudgetConfig()
    if (!config) {
      console.warn('[BudgetChecker] No budget config available')
      return {
        passed: true,
        violations: [],
        timestamp: Date.now(),
      }
    }

    // Find matching budget (exact match or wildcard)
    const budget = this.findMatchingBudget(page, config)
    if (!budget) {
      // No budget defined for this page - pass by default
      return {
        passed: true,
        violations: [],
        timestamp: Date.now(),
      }
    }

    // Check each timing budget
    const violations: BudgetViolation[] = []

    for (const timing of budget.timings) {
      const metricValue = metrics[timing.metric]

      // Skip if metric not provided
      if (metricValue === undefined || metricValue === null) {
        continue
      }

      // Calculate threshold with tolerance
      const threshold = timing.budget * (1 + timing.tolerance)

      // Check if violated
      if (metricValue > threshold) {
        const percentOver = ((metricValue - threshold) / threshold) * 100

        violations.push({
          metric: timing.metric,
          budget: timing.budget,
          actual: metricValue,
          threshold,
          percentOver,
          severity: this.calculateSeverity(percentOver),
        })
      }
    }

    return {
      passed: violations.length === 0,
      violations,
      timestamp: Date.now(),
    }
  }

  /**
   * Find the budget that matches a given page path
   * Supports exact match and wildcard patterns
   */
  private findMatchingBudget(page: string, config: BudgetConfig): Budget | null {
    // Normalize the page path (remove trailing slash, ensure leading slash)
    const normalizedPage = page.endsWith('/') && page.length > 1 ? page.slice(0, -1) : page

    // Try exact match first
    const exactMatch = config.budgets.find(b => {
      const normalizedPath =
        b.path.endsWith('/') && b.path.length > 1 ? b.path.slice(0, -1) : b.path
      return normalizedPath === normalizedPage
    })

    if (exactMatch) {
      return exactMatch
    }

    // Try wildcard match (e.g., '/dashboard/*')
    const wildcardMatch = config.budgets.find(b => {
      if (!b.path.includes('*')) return false

      const pattern = b.path.replace(/\*/g, '.*').replace(/\//g, '\\/')

      const regex = new RegExp(`^${pattern}$`)
      return regex.test(normalizedPage)
    })

    if (wildcardMatch) {
      return wildcardMatch
    }

    // Try default budget ('/*' or '*')
    const defaultMatch = config.budgets.find(b => b.path === '/*' || b.path === '*')
    if (defaultMatch) {
      return defaultMatch
    }

    return null
  }

  /**
   * Calculate severity based on how far over budget
   */
  private calculateSeverity(percentOver: number): 'warning' | 'critical' {
    // Critical if more than 50% over budget
    if (percentOver > 50) {
      return 'critical'
    }
    return 'warning'
  }

  /**
   * Get all violations from the last check
   */
  getViolations(): BudgetViolation[] {
    // This method is maintained for API compatibility
    // In the new design, violations are returned with checkBudget()
    return []
  }

  /**
   * Get budget configuration for a specific page
   */
  async getBudgetForPage(page: string): Promise<Budget | null> {
    const config = await this.loadBudgetConfig()
    if (!config) {
      return null
    }

    return this.findMatchingBudget(page, config)
  }

  /**
   * Get all defined budgets
   */
  async getAllBudgets(): Promise<Budget[]> {
    const config = await this.loadBudgetConfig()
    return config?.budgets || []
  }

  /**
   * Clear cached budget configuration
   */
  clearCache(): void {
    this.budgetConfig = null
    this.lastLoaded = 0
  }

  /**
   * Set cache duration
   */
  setCacheDuration(durationMs: number): void {
    this.cacheDuration = durationMs
  }

  /**
   * Validate a budget configuration
   */
  validateBudgetConfig(config: BudgetConfig): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!config.budgets || !Array.isArray(config.budgets)) {
      errors.push('budgets must be an array')
      return { valid: false, errors }
    }

    for (let i = 0; i < config.budgets.length; i++) {
      const budget = config.budgets[i]

      // Validate path
      if (!budget.path || typeof budget.path !== 'string') {
        errors.push(`budget[${i}].path must be a non-empty string`)
      }

      // Validate timings
      if (!budget.timings || !Array.isArray(budget.timings)) {
        errors.push(`budget[${i}].timings must be an array`)
        continue
      }

      for (let j = 0; j < budget.timings.length; j++) {
        const timing = budget.timings[j]

        // Validate metric
        const validMetrics = ['LCP', 'FID', 'CLS', 'TBT', 'TTFB', 'FCP']
        if (!timing.metric || !validMetrics.includes(timing.metric)) {
          errors.push(
            `budget[${i}].timings[${j}].metric must be one of: ${validMetrics.join(', ')}`
          )
        }

        // Validate budget value
        if (typeof timing.budget !== 'number' || timing.budget <= 0) {
          errors.push(`budget[${i}].timings[${j}].budget must be a positive number`)
        }

        // Validate tolerance
        if (typeof timing.tolerance !== 'number' || timing.tolerance < 0) {
          errors.push(`budget[${i}].timings[${j}].tolerance must be a non-negative number`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Generate a sample budget configuration
   */
  static generateSampleConfig(): BudgetConfig {
    return {
      budgets: [
        {
          path: '/',
          timings: [
            {
              metric: 'LCP',
              budget: 2500,
              tolerance: 0.1,
            },
            {
              metric: 'FID',
              budget: 100,
              tolerance: 0.15,
            },
            {
              metric: 'CLS',
              budget: 0.1,
              tolerance: 0.2,
            },
            {
              metric: 'TTFB',
              budget: 800,
              tolerance: 0.2,
            },
            {
              metric: 'FCP',
              budget: 1800,
              tolerance: 0.15,
            },
          ],
        },
        {
          path: '/dashboard',
          timings: [
            {
              metric: 'LCP',
              budget: 3000,
              tolerance: 0.15,
            },
            {
              metric: 'TBT',
              budget: 300,
              tolerance: 0.2,
            },
          ],
        },
        {
          path: '/tasks',
          timings: [
            {
              metric: 'LCP',
              budget: 2500,
              tolerance: 0.1,
            },
            {
              metric: 'TBT',
              budget: 200,
              tolerance: 0.15,
            },
          ],
        },
      ],
    }
  }
}

// ========================================
// Export singleton instance
// ========================================

export const budgetChecker = new BudgetChecker()

// ========================================
// Utility Functions
// ========================================

/**
 * Check a single metric against a budget
 */
export function checkMetricAgainstBudget(
  metric: 'LCP' | 'FID' | 'CLS' | 'TBT' | 'TTFB' | 'FCP',
  value: number,
  budget: number,
  tolerance: number
): BudgetViolation | null {
  const threshold = budget * (1 + tolerance)

  if (value > threshold) {
    const percentOver = ((value - threshold) / threshold) * 100

    return {
      metric,
      budget,
      actual: value,
      threshold,
      percentOver,
      severity: percentOver > 50 ? 'critical' : 'warning',
    }
  }

  return null
}

/**
 * Format budget violation for display
 */
export function formatBudgetViolation(violation: BudgetViolation): string {
  const { metric, budget, actual, threshold, percentOver, severity } = violation

  const metricUnit = metric === 'CLS' ? '' : 'ms'
  const severityIcon = severity === 'critical' ? '🚨' : '⚠️'

  return `${severityIcon} ${metric}: ${actual.toFixed(1)}${metricUnit} (budget: ${budget}${metricUnit}, threshold: ${threshold.toFixed(1)}${metricUnit}, ${percentOver.toFixed(1)}% over)`
}

/**
 * Get recommended thresholds from Core Web Vitals
 */
export function getCoreWebVitalsThresholds(): Record<
  string,
  { budget: number; tolerance: number }
> {
  return {
    LCP: { budget: 2500, tolerance: 0.0 }, // Good: <2.5s
    FID: { budget: 100, tolerance: 0.0 }, // Good: <100ms
    CLS: { budget: 0.1, tolerance: 0.0 }, // Good: <0.1
    TTFB: { budget: 800, tolerance: 0.0 }, // Good: <800ms
    FCP: { budget: 1800, tolerance: 0.0 }, // Good: <1.8s
    TBT: { budget: 300, tolerance: 0.0 }, // Recommended: <300ms
  }
}

// ========================================
// Exports
// ========================================

export default BudgetChecker
