/**
 * Performance Budget Checker
 * 性能预算检查器
 */

import {
  BudgetViolation,
  BudgetCheckResult,
  PerformanceBudgetConfig,
  PageBudget,
  DEFAULT_BUDGET_CONFIG,
} from './types'

export interface PerformanceMetrics {
  LCP?: number
  FID?: number
  CLS?: number
  TTFB?: number
  FCP?: number
  INP?: number
  [key: string]: number | undefined
}

export interface ResourceMetrics {
  js: number
  css: number
  images: number
  total: number
}

export class BudgetChecker {
  private config: PerformanceBudgetConfig

  constructor(config: Partial<PerformanceBudgetConfig> = {}) {
    this.config = { ...DEFAULT_BUDGET_CONFIG, ...config }
  }

  /**
   * Check budget for a page
   * 检查页面预算
   */
  checkBudget(
    page: string,
    metrics: PerformanceMetrics,
    resources?: ResourceMetrics
  ): BudgetCheckResult {
    const budget = this.getBudgetForPage(page)
    const violations: BudgetViolation[] = []

    // 检查时间预算
    if (budget.timings) {
      for (const timing of budget.timings) {
        const actual = metrics[timing.metric]
        if (actual !== undefined) {
          const violation = this.checkTimingBudget(timing, actual)
          if (violation) {
            violations.push(violation)
          }
        }
      }
    }

    // 检查资源预算
    if (resources && budget.resources) {
      const resourceViolations = this.checkResourceBudgets(budget.resources, resources)
      violations.push(...resourceViolations)
    }

    // 计算分数
    const score = this.calculateScore(violations, budget)

    return {
      passed: violations.length === 0,
      violations,
      score,
      checkedAt: Date.now(),
    }
  }

  /**
   * Check timing budget
   * 检查时间预算
   */
  private checkTimingBudget(
    timing: { metric: string; budget: number; tolerance: number; unit: string },
    actual: number
  ): BudgetViolation | null {
    const threshold = timing.budget * (1 + timing.tolerance)
    const percentOver = ((actual - threshold) / threshold) * 100

    if (actual > threshold) {
      let severity: 'minor' | 'major' | 'critical' = 'minor'
      if (percentOver > 50) {
        severity = 'critical'
      } else if (percentOver > 20) {
        severity = 'major'
      }

      return {
        metric: timing.metric,
        budget: timing.budget,
        actual,
        threshold,
        percentOver,
        severity,
      }
    }

    return null
  }

  /**
   * Check resource budgets
   * 检查资源预算
   */
  private checkResourceBudgets(
    budgetResources: NonNullable<PageBudget['resources']>,
    actualResources: ResourceMetrics
  ): BudgetViolation[] {
    const violations: BudgetViolation[] = []

    const checkResource = (
      type: keyof NonNullable<PageBudget['resources']>,
      budget?: number,
      actual?: number
    ) => {
      if (budget !== undefined && actual !== undefined) {
        const threshold = budget * 1.1 // 10% 容差
        const percentOver = ((actual - threshold) / threshold) * 100

        if (actual > threshold) {
          let severity: 'minor' | 'major' | 'critical' = 'minor'
          if (percentOver > 100) {
            severity = 'critical'
          } else if (percentOver > 50) {
            severity = 'major'
          }

          violations.push({
            metric: `Resource:${type}`,
            budget,
            actual,
            threshold,
            percentOver,
            severity,
          })
        }
      }
    }

    checkResource('js', budgetResources.js, actualResources.js)
    checkResource('css', budgetResources.css, actualResources.css)
    checkResource('images', budgetResources.images, actualResources.images)
    checkResource('total', budgetResources.total, actualResources.total)

    return violations
  }

  /**
   * Get budget for a page
   * 获取页面预算
   */
  getBudgetForPage(page: string): PageBudget {
    // 首先尝试精确匹配
    const exactMatch = this.config.budgets.find(b => b.path === page)
    if (exactMatch) {
      return exactMatch
    }

    // 尝试通配符匹配
    const wildcardMatch = this.config.budgets.find(b => {
      if (b.path.endsWith('*')) {
        const prefix = b.path.slice(0, -1)
        return page.startsWith(prefix)
      }
      return false
    })

    if (wildcardMatch) {
      // Copy and set the actual page path
      return { ...wildcardMatch, path: page }
    }

    // 返回默认预算（创建一个包含请求路径的新对象）
    const defaultBudget = this.config.budgets.find(b => b.path === '/')
    if (defaultBudget) {
      return { ...defaultBudget, path: page }
    }

    // 如果连 / 都没有配置，返回硬编码的默认值
    return {
      path: page,
      timings: [
        { metric: 'LCP', budget: 2500, tolerance: 0.1, unit: 'ms' },
        { metric: 'FID', budget: 100, tolerance: 0.15, unit: 'ms' },
        { metric: 'CLS', budget: 0.1, tolerance: 0.2, unit: 'score' },
      ],
    }
  }

  /**
   * Calculate budget score
   * 计算预算分数
   */
  private calculateScore(violations: BudgetViolation[], budget: PageBudget): number {
    if (violations.length === 0) {
      return 100
    }

    // 基于违规的严重程度扣分
    let deductions = 0
    for (const violation of violations) {
      switch (violation.severity) {
        case 'critical':
          deductions += 30
          break
        case 'major':
          deductions += 15
          break
        case 'minor':
          deductions += 5
          break
      }
    }

    // 确保分数在 0-100 之间
    return Math.max(0, 100 - deductions)
  }

  /**
   * Check all budgets
   * 检查所有预算
   */
  checkAllBudgets(
    pages: Array<{ path: string; metrics: PerformanceMetrics; resources?: ResourceMetrics }>
  ): Map<string, BudgetCheckResult> {
    const results = new Map<string, BudgetCheckResult>()

    for (const page of pages) {
      const result = this.checkBudget(page.path, page.metrics, page.resources)
      results.set(page.path, result)
    }

    return results
  }

  /**
   * Get budget summary
   * 获取预算摘要
   */
  getBudgetSummary(): {
    totalPages: number
    totalMetrics: number
    budgets: PageBudget[]
  } {
    const totalMetrics = this.config.budgets.reduce((sum, b) => sum + b.timings.length, 0)

    return {
      totalPages: this.config.budgets.length,
      totalMetrics,
      budgets: this.config.budgets,
    }
  }

  /**
   * Add budget for a page
   * 添加页面预算
   */
  addBudget(budget: PageBudget): void {
    // 检查是否已存在
    const existingIndex = this.config.budgets.findIndex(b => b.path === budget.path)
    if (existingIndex >= 0) {
      this.config.budgets[existingIndex] = budget
    } else {
      this.config.budgets.push(budget)
    }
  }

  /**
   * Remove budget for a page
   * 移除页面预算
   */
  removeBudget(path: string): boolean {
    const index = this.config.budgets.findIndex(b => b.path === path)
    if (index >= 0) {
      this.config.budgets.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Update configuration
   * 更新配置
   */
  updateConfig(partialConfig: Partial<PerformanceBudgetConfig>): void {
    this.config = { ...this.config, ...partialConfig }
  }

  /**
   * Export budget config
   * 导出预算配置
   */
  exportConfig(): PerformanceBudgetConfig {
    return { ...this.config }
  }

  /**
   * Import budget config
   * 导入预算配置
   */
  importConfig(config: PerformanceBudgetConfig): void {
    this.config = { ...config }
  }
}

// Export singleton instance
export const budgetChecker = new BudgetChecker()
