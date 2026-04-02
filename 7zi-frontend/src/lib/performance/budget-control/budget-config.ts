/**
 * Performance Budget Configuration Parser and Manager
 * 性能预算配置解析器和管理器
 *
 * Provides utilities for:
 * - Loading budget configurations from JSON files
 * - Validating budget configurations
 * - Merging default and custom configurations
 * - Generating budget reports
 */

import { PerformanceBudgetConfig, PageBudget, BudgetThreshold } from './types'

export interface BudgetConfigOptions {
  /**
   * Path to custom budget configuration file
   */
  configPath?: string

  /**
   * Merge with default configuration
   */
  mergeWithDefault?: boolean

  /**
   * Validate configuration on load
   */
  validate?: boolean
}

export interface BudgetValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Budget Configuration Manager
 * 预算配置管理器
 */
export class BudgetConfigManager {
  private config: PerformanceBudgetConfig

  constructor(
    initialConfig?: Partial<PerformanceBudgetConfig>,
    private options: BudgetConfigOptions = {}
  ) {
    this.config = {
      enabled: true,
      budgets: [],
      checkOnBuild: true,
      failOnViolation: false,
      warningThreshold: 0.9,
      errorThreshold: 1.1,
      ...initialConfig,
    }
  }

  /**
   * Load configuration from JSON object
   * 从 JSON 对象加载配置
   */
  loadFromJSON(
    json: Partial<PerformanceBudgetConfig>,
    options?: { mergeWithDefault?: boolean }
  ): BudgetValidationResult {
    const validation = this.validateConfig(json)

    if (!validation.valid) {
      return validation
    }

    const shouldMerge = options?.mergeWithDefault ?? this.options.mergeWithDefault ?? false

    if (shouldMerge) {
      this.config = this.mergeConfigs(this.config, json)
    } else {
      this.config = { ...this.config, ...json }
    }

    return validation
  }

  /**
   * Validate budget configuration
   * 验证预算配置
   */
  validateConfig(config: Partial<PerformanceBudgetConfig>): BudgetValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Check enabled flag
    if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
      errors.push('enabled must be a boolean')
    }

    // Check budgets array
    if (config.budgets) {
      if (!Array.isArray(config.budgets)) {
        errors.push('budgets must be an array')
      } else {
        for (let i = 0; i < config.budgets.length; i++) {
          const budget = config.budgets[i]
          const budgetErrors = this.validatePageBudget(budget, i)
          errors.push(...budgetErrors.errors)
          warnings.push(...budgetErrors.warnings)
        }
      }
    }

    // Check thresholds
    if (config.warningThreshold !== undefined) {
      if (typeof config.warningThreshold !== 'number' || config.warningThreshold < 0) {
        errors.push('warningThreshold must be a positive number')
      }
    }

    if (config.errorThreshold !== undefined) {
      if (typeof config.errorThreshold !== 'number' || config.errorThreshold < 0) {
        errors.push('errorThreshold must be a positive number')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Validate a single page budget
   * 验证单个页面预算
   */
  private validatePageBudget(
    budget: Partial<PageBudget>,
    index: number
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check path
    if (!budget.path) {
      errors.push(`budgets[${index}]: path is required`)
    } else if (typeof budget.path !== 'string') {
      errors.push(`budgets[${index}]: path must be a string`)
    }

    // Check timings
    if (!budget.timings) {
      warnings.push(`budgets[${index}]: timings not specified, no metrics will be checked`)
    } else if (!Array.isArray(budget.timings)) {
      errors.push(`budgets[${index}]: timings must be an array`)
    } else {
      for (let j = 0; j < budget.timings.length; j++) {
        const timing = budget.timings[j]
        const timingErrors = this.validateTimingThreshold(timing, index, j)
        errors.push(...timingErrors)
      }
    }

    // Check resources
    if (budget.resources) {
      const resourceErrors = this.validateResources(budget.resources, index)
      errors.push(...resourceErrors)
    }

    return { errors, warnings }
  }

  /**
   * Validate a timing threshold
   * 验证时间阈值
   */
  private validateTimingThreshold(
    timing: Partial<BudgetThreshold>,
    budgetIndex: number,
    timingIndex: number
  ): string[] {
    const errors: string[] = []
    const prefix = `budgets[${budgetIndex}].timings[${timingIndex}]`

    if (!timing.metric) {
      errors.push(`${prefix}: metric is required`)
    } else if (typeof timing.metric !== 'string') {
      errors.push(`${prefix}: metric must be a string`)
    }

    if (timing.budget === undefined) {
      errors.push(`${prefix}: budget is required`)
    } else if (typeof timing.budget !== 'number' || timing.budget <= 0) {
      errors.push(`${prefix}: budget must be a positive number`)
    }

    if (timing.tolerance !== undefined) {
      if (typeof timing.tolerance !== 'number' || timing.tolerance < 0 || timing.tolerance > 1) {
        errors.push(`${prefix}: tolerance must be between 0 and 1`)
      }
    }

    if (!timing.unit) {
      errors.push(`${prefix}: unit is required`)
    } else if (typeof timing.unit !== 'string') {
      errors.push(`${prefix}: unit must be a string`)
    }

    return errors
  }

  /**
   * Validate resources configuration
   * 验证资源配置
   */
  private validateResources(
    resources: NonNullable<PageBudget['resources']>,
    budgetIndex: number
  ): string[] {
    const errors: string[] = []
    const prefix = `budgets[${budgetIndex}].resources`

    const validateResource = (name: string, value: unknown) => {
      if (value !== undefined) {
        if (typeof value !== 'number' || value <= 0) {
          errors.push(`${prefix}.${name} must be a positive number`)
        }
      }
    }

    validateResource('js', resources.js)
    validateResource('css', resources.css)
    validateResource('images', resources.images)
    validateResource('total', resources.total)

    return errors
  }

  /**
   * Merge two configurations
   * 合并两个配置
   */
  private mergeConfigs(
    base: PerformanceBudgetConfig,
    override: Partial<PerformanceBudgetConfig>
  ): PerformanceBudgetConfig {
    const merged: PerformanceBudgetConfig = {
      enabled: override.enabled ?? base.enabled,
      budgets: [...base.budgets],
      checkOnBuild: override.checkOnBuild ?? base.checkOnBuild,
      failOnViolation: override.failOnViolation ?? base.failOnViolation,
      warningThreshold: override.warningThreshold ?? base.warningThreshold,
      errorThreshold: override.errorThreshold ?? base.errorThreshold,
    }

    // Merge budgets by path
    if (override.budgets) {
      for (const overrideBudget of override.budgets) {
        const existingIndex = merged.budgets.findIndex(b => b.path === overrideBudget.path)
        if (existingIndex >= 0) {
          // Merge with existing budget
          merged.budgets[existingIndex] = this.mergePageBudgets(
            merged.budgets[existingIndex],
            overrideBudget
          )
        } else {
          // Add new budget
          merged.budgets.push(overrideBudget)
        }
      }
    }

    return merged
  }

  /**
   * Merge two page budgets
   * 合并两个页面预算
   */
  private mergePageBudgets(base: PageBudget, override: Partial<PageBudget>): PageBudget {
    const merged: PageBudget = {
      path: base.path,
      timings: [...base.timings],
      resources: { ...base.resources },
    }

    // Merge timings
    if (override.timings) {
      for (const overrideTiming of override.timings) {
        const existingIndex = merged.timings.findIndex(t => t.metric === overrideTiming.metric)
        if (existingIndex >= 0) {
          merged.timings[existingIndex] = overrideTiming
        } else {
          merged.timings.push(overrideTiming)
        }
      }
    }

    // Merge resources
    if (override.resources) {
      merged.resources = {
        js: override.resources.js ?? merged.resources?.js,
        css: override.resources.css ?? merged.resources?.css,
        images: override.resources.images ?? merged.resources?.images,
        total: override.resources.total ?? merged.resources?.total,
      }
    }

    return merged
  }

  /**
   * Get current configuration
   * 获取当前配置
   */
  getConfig(): PerformanceBudgetConfig {
    return { ...this.config }
  }

  /**
   * Set configuration
   * 设置配置
   */
  setConfig(config: PerformanceBudgetConfig): BudgetValidationResult {
    return this.loadFromJSON(config)
  }

  /**
   * Get budget for a specific page
   * 获取特定页面的预算
   */
  getPageBudget(path: string): PageBudget | undefined {
    return this.config.budgets.find(b => b.path === path)
  }

  /**
   * Add or update page budget
   * 添加或更新页面预算
   */
  setPageBudget(budget: PageBudget): BudgetValidationResult {
    const validation = this.validatePageBudget(budget, this.config.budgets.length)

    if (validation.errors.length === 0) {
      const existingIndex = this.config.budgets.findIndex(b => b.path === budget.path)
      if (existingIndex >= 0) {
        this.config.budgets[existingIndex] = budget
      } else {
        this.config.budgets.push(budget)
      }
    }

    return {
      valid: validation.errors.length === 0,
      errors: validation.errors,
      warnings: validation.warnings,
    }
  }

  /**
   * Remove page budget
   * 移除页面预算
   */
  removePageBudget(path: string): boolean {
    const index = this.config.budgets.findIndex(b => b.path === path)
    if (index >= 0) {
      this.config.budgets.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Get all metrics across all budgets
   * 获取所有预算中的所有指标
   */
  getAllMetrics(): string[] {
    const metrics = new Set<string>()
    for (const budget of this.config.budgets) {
      for (const timing of budget.timings) {
        metrics.add(timing.metric)
      }
    }
    return Array.from(metrics)
  }

  /**
   * Get budget for a specific metric on a page
   * 获取页面上特定指标的预算
   */
  getMetricBudget(path: string, metric: string): BudgetThreshold | undefined {
    const budget = this.getPageBudget(path)
    if (budget) {
      return budget.timings.find(t => t.metric === metric)
    }
    return undefined
  }

  /**
   * Set metric budget for a page
   * 设置页面的指标预算
   */
  setMetricBudget(path: string, threshold: BudgetThreshold): BudgetValidationResult {
    const budget = this.getPageBudget(path)
    if (!budget) {
      return {
        valid: false,
        errors: [`Page budget not found for path: ${path}`],
        warnings: [],
      }
    }

    const timingErrors = this.validateTimingThreshold(
      threshold,
      this.config.budgets.indexOf(budget),
      budget.timings.length
    )

    if (timingErrors.length > 0) {
      return {
        valid: false,
        errors: timingErrors,
        warnings: [],
      }
    }

    const existingIndex = budget.timings.findIndex(t => t.metric === threshold.metric)
    if (existingIndex >= 0) {
      budget.timings[existingIndex] = threshold
    } else {
      budget.timings.push(threshold)
    }

    return {
      valid: true,
      errors: [],
      warnings: [],
    }
  }

  /**
   * Generate budget configuration summary
   * 生成预算配置摘要
   */
  generateSummary(): {
    totalPages: number
    totalMetrics: number
    metricsBreakdown: Record<string, number>
    resourcesConfigured: number
  } {
    const metricsBreakdown: Record<string, number> = {}
    let totalMetrics = 0
    let resourcesConfigured = 0

    for (const budget of this.config.budgets) {
      totalMetrics += budget.timings.length

      for (const timing of budget.timings) {
        metricsBreakdown[timing.metric] = (metricsBreakdown[timing.metric] || 0) + 1
      }

      if (budget.resources) {
        resourcesConfigured++
      }
    }

    return {
      totalPages: this.config.budgets.length,
      totalMetrics,
      metricsBreakdown,
      resourcesConfigured,
    }
  }

  /**
   * Export configuration as JSON string
   * 导出配置为 JSON 字符串
   */
  exportJSON(): string {
    return JSON.stringify(this.config, null, 2)
  }

  /**
   * Import configuration from JSON string
   * 从 JSON 字符串导入配置
   */
  importJSON(jsonString: string): BudgetValidationResult {
    try {
      const config = JSON.parse(jsonString)
      return this.loadFromJSON(config)
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ],
        warnings: [],
      }
    }
  }

  /**
   * Reset to default configuration
   * 重置为默认配置
   */
  reset(): void {
    this.config = {
      enabled: true,
      budgets: [],
      checkOnBuild: true,
      failOnViolation: false,
      warningThreshold: 0.9,
      errorThreshold: 1.1,
    }
  }
}

// Export singleton instance
export const budgetConfigManager = new BudgetConfigManager()
