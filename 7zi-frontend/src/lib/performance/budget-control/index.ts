/**
 * Performance Budget Control - Module Entry Point
 * 性能预算控制 - 模块入口
 */

// Core functionality
export { BudgetChecker, budgetChecker } from './budget-checker'
export { BudgetConfigManager, budgetConfigManager } from './budget-config'
export {
  BudgetAlertManager,
  budgetAlertManager,
  DEFAULT_BUDGET_ALERT_CONFIG,
} from './budget-alerts'

// Types
export type {
  BudgetThreshold,
  PageBudget,
  BudgetViolation,
  BudgetCheckResult,
  PerformanceBudgetConfig,
} from './types'

export type {
  BudgetAlertConfig,
  BudgetConfigOptions,
  BudgetValidationResult,
} from './budget-alerts'

// Default configs
export { DEFAULT_BUDGET_CONFIG } from './types'
