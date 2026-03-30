/**
 * Performance Budget Types
 * 性能预算类型定义
 */

export interface BudgetThreshold {
  metric: string;
  budget: number;
  tolerance: number; // 容差百分比 (0-1)
  unit: string;
}

export interface PageBudget {
  path: string;
  timings: BudgetThreshold[];
  resources?: {
    js?: number; // bytes
    css?: number;
    images?: number;
    total?: number;
  };
}

export interface BudgetViolation {
  metric: string;
  budget: number;
  actual: number;
  threshold: number;
  percentOver: number;
  severity: 'minor' | 'major' | 'critical';
}

export interface BudgetCheckResult {
  passed: boolean;
  violations: BudgetViolation[];
  score: number; // 0-100
  checkedAt: number;
}

export interface PerformanceBudgetConfig {
  enabled: boolean;
  budgets: PageBudget[];
  checkOnBuild: boolean;
  failOnViolation: boolean;
  warningThreshold: number; // 警告阈值百分比
  errorThreshold: number; // 错误阈值百分比
}

export const DEFAULT_BUDGET_CONFIG: PerformanceBudgetConfig = {
  enabled: true,
  budgets: [
    {
      path: '/',
      timings: [
        { metric: 'LCP', budget: 2500, tolerance: 0.1, unit: 'ms' },
        { metric: 'FID', budget: 100, tolerance: 0.15, unit: 'ms' },
        { metric: 'CLS', budget: 0.1, tolerance: 0.2, unit: 'score' },
        { metric: 'TTFB', budget: 600, tolerance: 0.1, unit: 'ms' },
        { metric: 'FCP', budget: 1800, tolerance: 0.1, unit: 'ms' },
      ],
      resources: {
        js: 500 * 1024, // 500KB
        css: 100 * 1024, // 100KB
        images: 1024 * 1024, // 1MB
        total: 2 * 1024 * 1024, // 2MB
      },
    },
    {
      path: '/dashboard',
      timings: [
        { metric: 'LCP', budget: 3000, tolerance: 0.15, unit: 'ms' },
        { metric: 'FID', budget: 150, tolerance: 0.15, unit: 'ms' },
      ],
      resources: {
        js: 800 * 1024,
        css: 150 * 1024,
        total: 2.5 * 1024 * 1024,
      },
    },
  ],
  checkOnBuild: true,
  failOnViolation: false,
  warningThreshold: 0.9, // 90%
  errorThreshold: 1.1, // 110%
};
