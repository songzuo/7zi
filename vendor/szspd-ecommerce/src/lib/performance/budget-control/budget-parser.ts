/**
 * Budget Parser
 * Parses and validates budget.json configuration files
 */

import type { BudgetConfig, Budget, TimingBudget } from './budget-checker'

// ========================================
// Types
// ========================================

export interface BudgetParseResult {
  success: boolean
  config: BudgetConfig | null
  errors: string[]
  warnings: string[]
}

export interface BudgetValidationError {
  path: string
  message: string
  line?: number
  column?: number
}

// ========================================
// Constants
// ========================================

/**
 * Valid metric types for budget configuration
 */
export const VALID_METRICS = ['LCP', 'FID', 'CLS', 'TBT', 'TTFB', 'FCP'] as const

/**
 * Default tolerance values for each metric
 */
export const DEFAULT_TOLERANCES: Record<string, number> = {
  LCP: 0.1, // 10%
  FID: 0.15, // 15%
  CLS: 0.2, // 20%
  TBT: 0.15, // 15%
  TTFB: 0.2, // 20%
  FCP: 0.15, // 15%
}

/**
 * Recommended budget values based on Core Web Vitals
 */
export const RECOMMENDED_BUDGETS: Record<string, number> = {
  LCP: 2500, // Good: <2.5s
  FID: 100, // Good: <100ms
  CLS: 0.1, // Good: <0.1
  TBT: 300, // Recommended: <300ms
  TTFB: 800, // Good: <800ms
  FCP: 1800, // Good: <1.8s
}

// ========================================
// Budget Parser Class
// ========================================

export class BudgetParser {
  private strict: boolean

  constructor(options: { strict?: boolean } = {}) {
    this.strict = options.strict ?? false
  }

  /**
   * Parse a budget configuration from JSON string
   */
  parse(jsonString: string): BudgetParseResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Parse JSON
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonString)
    } catch (e) {
      return {
        success: false,
        config: null,
        errors: [`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`],
        warnings: [],
      }
    }

    // Validate structure
    const validation = this.validate(parsed)
    if (!validation.valid) {
      return {
        success: false,
        config: null,
        errors: validation.errors,
        warnings,
      }
    }

    // Apply defaults and normalize
    const config = this.applyDefaults(parsed as BudgetConfig)

    return {
      success: true,
      config,
      errors,
      warnings,
    }
  }

  /**
   * Parse budget configuration from an object
   */
  parseObject(obj: unknown): BudgetParseResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate structure
    const validation = this.validate(obj)
    if (!validation.valid) {
      return {
        success: false,
        config: null,
        errors: validation.errors,
        warnings,
      }
    }

    // Apply defaults and normalize
    const config = this.applyDefaults(obj as BudgetConfig)

    return {
      success: true,
      config,
      errors,
      warnings,
    }
  }

  /**
   * Validate a budget configuration object
   */
  validate(obj: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check if obj is an object
    if (!obj || typeof obj !== 'object') {
      return { valid: false, errors: ['Configuration must be an object'] }
    }

    const config = obj as Record<string, unknown>

    // Check budgets array
    if (!('budgets' in config)) {
      errors.push('Missing required field: budgets')
      return { valid: false, errors }
    }

    if (!Array.isArray(config.budgets)) {
      errors.push('budgets must be an array')
      return { valid: false, errors }
    }

    // Validate each budget
    for (let i = 0; i < config.budgets.length; i++) {
      const budget = config.budgets[i]
      const budgetErrors = this.validateBudget(budget, i)
      errors.push(...budgetErrors)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate a single budget entry
   */
  private validateBudget(budget: unknown, index: number): string[] {
    const errors: string[] = []
    const prefix = `budgets[${index}]`

    if (!budget || typeof budget !== 'object') {
      errors.push(`${prefix} must be an object`)
      return errors
    }

    const b = budget as Record<string, unknown>

    // Validate path
    if (!('path' in b) || typeof b.path !== 'string' || b.path.length === 0) {
      errors.push(`${prefix}.path must be a non-empty string`)
    }

    // Validate timings
    if (!('timings' in b) || !Array.isArray(b.timings)) {
      errors.push(`${prefix}.timings must be an array`)
      return errors
    }

    // Validate each timing
    for (let j = 0; j < b.timings.length; j++) {
      const timing = b.timings[j]
      const timingErrors = this.validateTiming(timing, `${prefix}.timings[${j}]`)
      errors.push(...timingErrors)
    }

    return errors
  }

  /**
   * Validate a single timing entry
   */
  private validateTiming(timing: unknown, path: string): string[] {
    const errors: string[] = []

    if (!timing || typeof timing !== 'object') {
      errors.push(`${path} must be an object`)
      return errors
    }

    const t = timing as Record<string, unknown>

    // Validate metric
    if (!('metric' in t) || typeof t.metric !== 'string') {
      errors.push(`${path}.metric must be a string`)
    } else if (!VALID_METRICS.includes(t.metric as (typeof VALID_METRICS)[number])) {
      errors.push(`${path}.metric must be one of: ${VALID_METRICS.join(', ')} (got: ${t.metric})`)
    }

    // Validate budget
    if (!('budget' in t) || typeof t.budget !== 'number') {
      errors.push(`${path}.budget must be a number`)
    } else if (t.budget <= 0) {
      errors.push(`${path}.budget must be positive (got: ${t.budget})`)
    }

    // Validate tolerance
    if ('tolerance' in t) {
      if (typeof t.tolerance !== 'number') {
        errors.push(`${path}.tolerance must be a number`)
      } else if (t.tolerance < 0) {
        errors.push(`${path}.tolerance must be non-negative (got: ${t.tolerance})`)
      } else if (t.tolerance > 1) {
        // Warning for >100% tolerance (but not error)
        if (this.strict) {
          errors.push(`${path}.tolerance should be between 0 and 1 (got: ${t.tolerance})`)
        }
      }
    }

    return errors
  }

  /**
   * Apply default values to a budget configuration
   */
  private applyDefaults(config: BudgetConfig): BudgetConfig {
    return {
      budgets: config.budgets.map(budget => ({
        path: this.normalizePath(budget.path),
        timings: budget.timings.map(timing => ({
          ...timing,
          tolerance: timing.tolerance ?? DEFAULT_TOLERANCES[timing.metric] ?? 0.1,
        })),
      })),
    }
  }

  /**
   * Normalize a path string
   */
  private normalizePath(path: string): string {
    // Ensure path starts with /
    if (!path.startsWith('/') && !path.startsWith('*')) {
      path = '/' + path
    }

    // Remove trailing slash (except for root)
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1)
    }

    return path
  }

  /**
   * Generate a budget.json content string
   */
  static generateBudgetJson(paths: string[] = ['/'], includeAllMetrics: boolean = true): string {
    const budgets: Budget[] = paths.map(path => ({
      path,
      timings: includeAllMetrics
        ? Object.entries(RECOMMENDED_BUDGETS).map(([metric, budget]) => ({
            metric: metric as TimingBudget['metric'],
            budget,
            tolerance: DEFAULT_TOLERANCES[metric],
          }))
        : [
            {
              metric: 'LCP' as const,
              budget: RECOMMENDED_BUDGETS.LCP,
              tolerance: DEFAULT_TOLERANCES.LCP,
            },
            {
              metric: 'FID' as const,
              budget: RECOMMENDED_BUDGETS.FID,
              tolerance: DEFAULT_TOLERANCES.FID,
            },
            {
              metric: 'CLS' as const,
              budget: RECOMMENDED_BUDGETS.CLS,
              tolerance: DEFAULT_TOLERANCES.CLS,
            },
          ],
    }))

    const config: BudgetConfig = { budgets }
    return JSON.stringify(config, null, 2)
  }

  /**
   * Merge multiple budget configurations
   */
  static mergeConfigs(...configs: BudgetConfig[]): BudgetConfig {
    const merged: BudgetConfig = { budgets: [] }

    for (const config of configs) {
      for (const budget of config.budgets) {
        const existing = merged.budgets.find(b => b.path === budget.path)
        if (existing) {
          // Merge timings for the same path
          for (const timing of budget.timings) {
            const existingTiming = existing.timings.find(t => t.metric === timing.metric)
            if (existingTiming) {
              // Override with new timing
              Object.assign(existingTiming, timing)
            } else {
              existing.timings.push(timing)
            }
          }
        } else {
          merged.budgets.push({ ...budget })
        }
      }
    }

    return merged
  }
}

// ========================================
// Export singleton instance
// ========================================

export const budgetParser = new BudgetParser()

// ========================================
// Exports
// ========================================

export default BudgetParser
