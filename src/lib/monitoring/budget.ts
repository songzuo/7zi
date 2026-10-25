/**
 * Performance Budget System
 * Define and monitor performance budgets with alerting
 */

// ========================================
// Types
// ========================================

export interface BudgetThreshold {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'score'
  severity: 'warning' | 'critical'
}

export interface BudgetConfig {
  name: string
  description: string
  thresholds: BudgetThreshold[]
  category: 'web-vitals' | 'resources' | 'rendering' | 'custom'
  enabled: boolean
}

export interface BudgetResult {
  budget: BudgetConfig
  passed: boolean
  violations: BudgetViolation[]
  score: number // 0-100
  timestamp: Date
}

export interface BudgetViolation {
  threshold: BudgetThreshold
  actualValue: number
  thresholdValue: number
  violationSeverity: 'warning' | 'critical'
  percentageOver: number
}

export interface BudgetReport {
  results: BudgetResult[]
  overallPassed: boolean
  criticalViolations: BudgetViolation[]
  warningViolations: BudgetViolation[]
  totalScore: number
  summary: string
}

// ========================================
// Default Budgets
// ========================================

export const DEFAULT_BUDGETS: BudgetConfig[] = [
  // Web Vitals
  {
    name: 'Core Web Vitals',
    description: 'Google Core Web Vitals performance thresholds',
    category: 'web-vitals',
    enabled: true,
    thresholds: [
      {
        name: 'LCP',
        value: 2500,
        unit: 'ms',
        severity: 'warning',
      },
      {
        name: 'LCP Critical',
        value: 4000,
        unit: 'ms',
        severity: 'critical',
      },
      {
        name: 'FID',
        value: 100,
        unit: 'ms',
        severity: 'warning',
      },
      {
        name: 'FID Critical',
        value: 300,
        unit: 'ms',
        severity: 'critical',
      },
      {
        name: 'CLS',
        value: 0.1,
        unit: 'score',
        severity: 'warning',
      },
      {
        name: 'CLS Critical',
        value: 0.25,
        unit: 'score',
        severity: 'critical',
      },
      {
        name: 'TTFB',
        value: 600,
        unit: 'ms',
        severity: 'warning',
      },
      {
        name: 'TTFB Critical',
        value: 1000,
        unit: 'ms',
        severity: 'critical',
      },
    ],
  },
  // Resources
  {
    name: 'Resource Limits',
    description: 'Resource size and count budgets',
    category: 'resources',
    enabled: true,
    thresholds: [
      {
        name: 'Total Transfer Size',
        value: 1024 * 1024, // 1MB
        unit: 'bytes',
        severity: 'warning',
      },
      {
        name: 'Total Transfer Size Critical',
        value: 2 * 1024 * 1024, // 2MB
        unit: 'bytes',
        severity: 'critical',
      },
      {
        name: 'Request Count',
        value: 50,
        unit: 'count',
        severity: 'warning',
      },
      {
        name: 'Request Count Critical',
        value: 100,
        unit: 'count',
        severity: 'critical',
      },
      {
        name: 'JavaScript Size',
        value: 250 * 1024, // 250KB
        unit: 'bytes',
        severity: 'warning',
      },
      {
        name: 'JavaScript Size Critical',
        value: 500 * 1024, // 500KB
        unit: 'bytes',
        severity: 'critical',
      },
    ],
  },
  // Rendering
  {
    name: 'Rendering Performance',
    description: 'Rendering and interaction budgets',
    category: 'rendering',
    enabled: true,
    thresholds: [
      {
        name: 'FCP',
        value: 1800,
        unit: 'ms',
        severity: 'warning',
      },
      {
        name: 'FCP Critical',
        value: 3000,
        unit: 'ms',
        severity: 'critical',
      },
      {
        name: 'TTI',
        value: 3800,
        unit: 'ms',
        severity: 'warning',
      },
      {
        name: 'TTI Critical',
        value: 7300,
        unit: 'ms',
        severity: 'critical',
      },
    ],
  },
]

// ========================================
// Performance Budget Manager
// ========================================

export class PerformanceBudget {
  private budgets: Map<string, BudgetConfig>
  private violationHistory: BudgetViolation[] = []
  private maxHistorySize = 100

  constructor(configs: BudgetConfig[] = DEFAULT_BUDGETS) {
    this.budgets = new Map()
    configs.forEach(config => this.addBudget(config))
  }

  /**
   * Add a budget configuration
   */
  addBudget(config: BudgetConfig): void {
    this.budgets.set(config.name, config)
  }

  /**
   * Remove a budget configuration
   */
  removeBudget(name: string): boolean {
    return this.budgets.delete(name)
  }

  /**
   * Get a budget configuration
   */
  getBudget(name: string): BudgetConfig | undefined {
    return this.budgets.get(name)
  }

  /**
   * Get all budget configurations
   */
  getAllBudgets(): BudgetConfig[] {
    return Array.from(this.budgets.values())
  }

  /**
   * Enable/disable a budget
   */
  setBudgetEnabled(name: string, enabled: boolean): boolean {
    const budget = this.budgets.get(name)
    if (!budget) return false

    budget.enabled = enabled
    return true
  }

  /**
   * Check a single metric against budgets
   */
  checkMetric(
    metricName: string,
    value: number,
    unit: 'ms' | 'bytes' | 'count' | 'score'
  ): BudgetResult[] {
    const results: BudgetResult[] = []

    for (const budget of this.budgets.values()) {
      if (!budget.enabled) continue

      const violations: BudgetViolation[] = []

      for (const threshold of budget.thresholds) {
        // Match if metric name is contained in threshold name OR threshold name in metric name
        // For example: 'LCP' matches 'LCP' and 'LCP Critical'
        const thresholdLower = threshold.name.toLowerCase()
        const metricLower = metricName.toLowerCase()

        const isRelated =
          thresholdLower.includes(metricLower) || metricLower.includes(thresholdLower)

        if (isRelated) {
          if (threshold.unit !== unit) continue

          // For scores (like CLS), lower is better
          // For others (like LCP, size, count), lower is better too
          const isViolation = value > threshold.value

          if (isViolation) {
            violations.push({
              threshold,
              actualValue: value,
              thresholdValue: threshold.value,
              violationSeverity: threshold.severity,
              percentageOver: ((value - threshold.value) / threshold.value) * 100,
            })
          }
        }
      }

      const score = this.calculateScore(violations)

      results.push({
        budget,
        passed: violations.length === 0,
        violations,
        score,
        timestamp: new Date(),
      })
    }

    return results
  }

  /**
   * Check multiple metrics at once
   */
  checkMetrics(
    metrics: Record<string, { value: number; unit: 'ms' | 'bytes' | 'count' | 'score' }>
  ): BudgetReport {
    const results: BudgetResult[] = []

    for (const [metricName, metric] of Object.entries(metrics)) {
      const metricResults = this.checkMetric(metricName, metric.value, metric.unit)
      results.push(...metricResults)
    }

    const criticalViolations = results.flatMap(r =>
      r.violations.filter(v => v.violationSeverity === 'critical')
    )
    const warningViolations = results.flatMap(r =>
      r.violations.filter(v => v.violationSeverity === 'warning')
    )

    // Add to history
    const allViolations = [...criticalViolations, ...warningViolations]
    this.violationHistory.push(...allViolations)
    this.trimHistory()

    const totalScore = this.calculateOverallScore(results)
    const summary = this.generateSummary(results, criticalViolations, warningViolations)

    return {
      results,
      overallPassed: criticalViolations.length === 0,
      criticalViolations,
      warningViolations,
      totalScore,
      summary,
    }
  }

  /**
   * Get violation history
   */
  getViolationHistory(limit = 50): BudgetViolation[] {
    return this.violationHistory.slice(-limit)
  }

  /**
   * Clear violation history
   */
  clearHistory(): void {
    this.violationHistory = []
  }

  /**
   * Get violation frequency by metric
   */
  getViolationFrequency(): Map<string, { count: number; critical: number }> {
    const frequency = new Map<string, { count: number; critical: number }>()

    for (const violation of this.violationHistory) {
      const key = violation.threshold.name
      const current = frequency.get(key) ?? { count: 0, critical: 0 }

      current.count++
      if (violation.violationSeverity === 'critical') {
        current.critical++
      }

      frequency.set(key, current)
    }

    return frequency
  }

  /**
   * Get most frequently violated budgets
   */
  getMostViolatedBudgets(limit = 5): Array<{ name: string; count: number; critical: number }> {
    const frequency = this.getViolationFrequency()

    return Array.from(frequency.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  /**
   * Export budgets as JSON
   */
  exportBudgets(): string {
    return JSON.stringify(Array.from(this.budgets.values()), null, 2)
  }

  /**
   * Import budgets from JSON
   */
  importBudgets(json: string): void {
    try {
      const configs = JSON.parse(json) as BudgetConfig[]
      this.budgets.clear()
      configs.forEach(config => this.addBudget(config))
    } catch (error) {
      throw new Error(`Failed to import budgets: ${error}`)
    }
  }

  // ========================================
  // Private Methods
  // ========================================

  private calculateScore(violations: BudgetViolation[]): number {
    if (violations.length === 0) return 100

    let score = 100
    for (const violation of violations) {
      const penalty = violation.violationSeverity === 'critical' ? 30 : 10
      score -= penalty * (violation.percentageOver / 100)
    }

    return Math.max(0, Math.round(score))
  }

  private calculateOverallScore(results: BudgetResult[]): number {
    if (results.length === 0) return 100

    const sum = results.reduce((acc, result) => acc + result.score, 0)
    return Math.round(sum / results.length)
  }

  private trimHistory(): void {
    if (this.violationHistory.length > this.maxHistorySize) {
      this.violationHistory = this.violationHistory.slice(-this.maxHistorySize)
    }
  }

  private generateSummary(
    results: BudgetResult[],
    criticalViolations: BudgetViolation[],
    warningViolations: BudgetViolation[]
  ): string {
    const passedCount = results.filter(r => r.passed).length
    const totalCount = results.length

    if (criticalViolations.length > 0) {
      return `${criticalViolations.length} critical violations detected. Performance budget not met.`
    }

    if (warningViolations.length > 0) {
      return `${warningViolations.length} warning violations detected. Consider optimization.`
    }

    return `${passedCount}/${totalCount} budgets passed. All performance budgets met.`
  }
}

// ========================================
// Helper Functions
// ========================================

/**
 * Create a default performance budget instance
 */
export function createDefaultBudget(): PerformanceBudget {
  return new PerformanceBudget(DEFAULT_BUDGETS)
}

/**
 * Create a custom budget configuration
 */
export function createBudget(
  name: string,
  description: string,
  category: 'web-vitals' | 'resources' | 'rendering' | 'custom',
  thresholds: Omit<BudgetThreshold, 'severity'>[]
): BudgetConfig {
  return {
    name,
    description,
    category,
    enabled: true,
    thresholds: thresholds.map(t => ({
      ...t,
      severity: 'warning',
    })),
  }
}

/**
 * Format budget violation for display
 */
export function formatBudgetViolation(violation: BudgetViolation): string {
  const { threshold, actualValue, thresholdValue, percentageOver } = violation

  const percentStr = Number.isInteger(percentageOver)
    ? `${percentageOver}%`
    : `${percentageOver.toFixed(1)}%`

  return `${threshold.name}: ${actualValue} ${threshold.unit} exceeds threshold of ${thresholdValue} ${threshold.unit} by ${percentStr}`
}
