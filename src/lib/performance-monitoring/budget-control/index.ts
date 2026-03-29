/**
 * Performance Budget Control Module
 * Export all budget control components
 */

export {
  BudgetChecker,
  budgetChecker,
  checkMetricAgainstBudget,
  formatBudgetViolation,
  getCoreWebVitalsThresholds,
} from './budget-checker';

export type {
  BudgetConfig,
  Budget,
  TimingBudget,
  PerformanceMetrics,
  BudgetCheckResult,
  BudgetViolation,
  BudgetCheckerConfig,
} from './budget-checker';

export {
  BudgetParser,
  budgetParser,
  VALID_METRICS,
  DEFAULT_TOLERANCES,
  RECOMMENDED_BUDGETS,
} from './budget-parser';

export type {
  BudgetParseResult,
  BudgetValidationError,
} from './budget-parser';
