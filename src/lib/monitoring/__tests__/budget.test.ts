/**
 * Performance Budget System Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  PerformanceBudget,
  DEFAULT_BUDGETS,
  createDefaultBudget,
  createBudget,
  formatBudgetViolation,
  type BudgetConfig,
  type BudgetThreshold,
  type BudgetViolation,
} from '../budget';

describe('PerformanceBudget', () => {
  let budget: PerformanceBudget;

  beforeEach(() => {
    budget = new PerformanceBudget();
  });

  describe('Constructor and Budget Management', () => {
    it('should initialize with default budgets', () => {
      const allBudgets = budget.getAllBudgets();
      expect(allBudgets.length).toBeGreaterThan(0);
    });

    it('should accept custom budgets', () => {
      const customBudget: BudgetConfig = {
        name: 'Custom Budget',
        description: 'A custom budget',
        category: 'custom',
        enabled: true,
        thresholds: [
          { name: 'Custom Metric', value: 100, unit: 'ms', severity: 'warning' },
        ],
      };

      const customBudgetManager = new PerformanceBudget([customBudget]);
      expect(customBudgetManager.getBudget('Custom Budget')).toBeDefined();
    });

    it('should add budgets correctly', () => {
      const newBudget: BudgetConfig = {
        name: 'Test Budget',
        description: 'Test description',
        category: 'custom',
        enabled: true,
        thresholds: [
          { name: 'Test Metric', value: 50, unit: 'ms', severity: 'warning' },
        ],
      };

      budget.addBudget(newBudget);
      expect(budget.getBudget('Test Budget')).toEqual(newBudget);
    });

    it('should remove budgets correctly', () => {
      budget.addBudget({
        name: 'Removable Budget',
        description: 'To be removed',
        category: 'custom',
        enabled: true,
        thresholds: [],
      });

      const removed = budget.removeBudget('Removable Budget');
      expect(removed).toBe(true);
      expect(budget.getBudget('Removable Budget')).toBeUndefined();
    });

    it('should return false when removing non-existent budget', () => {
      const removed = budget.removeBudget('Non-existent Budget');
      expect(removed).toBe(false);
    });

    it('should enable/disable budgets', () => {
      budget.addBudget({
        name: 'Toggle Budget',
        description: 'To be toggled',
        category: 'custom',
        enabled: true,
        thresholds: [],
      });

      const disabled = budget.setBudgetEnabled('Toggle Budget', false);
      expect(disabled).toBe(true);
      expect(budget.getBudget('Toggle Budget')?.enabled).toBe(false);

      budget.setBudgetEnabled('Toggle Budget', true);
      expect(budget.getBudget('Toggle Budget')?.enabled).toBe(true);
    });

    it('should return false when enabling/disabling non-existent budget', () => {
      const result = budget.setBudgetEnabled('Non-existent Budget', false);
      expect(result).toBe(false);
    });
  });

  describe('Metric Checking', () => {
    it('should check LCP metric and detect warning violation', () => {
      const results = budget.checkMetric('LCP', 3000, 'ms');

      const lcpResult = results.find((r) => r.budget.name === 'Core Web Vitals');
      expect(lcpResult).toBeDefined();
      expect(lcpResult?.passed).toBe(false);
      expect(lcpResult?.violations.length).toBeGreaterThan(0);

      const warningViolation = lcpResult?.violations.find((v) => v.violationSeverity === 'warning');
      expect(warningViolation).toBeDefined();
      expect(warningViolation?.threshold.name).toBe('LCP');
    });

    it('should check LCP metric and detect critical violation', () => {
      const results = budget.checkMetric('LCP', 5000, 'ms');

      const lcpResult = results.find((r) => r.budget.name === 'Core Web Vitals');
      expect(lcpResult?.violations.length).toBe(2);

      const criticalViolation = lcpResult?.violations.find((v) => v.violationSeverity === 'critical');
      expect(criticalViolation).toBeDefined();
    });

    it('should pass when metric is under threshold', () => {
      const results = budget.checkMetric('LCP', 1000, 'ms');

      const lcpResult = results.find((r) => r.budget.name === 'Core Web Vitals');
      expect(lcpResult?.passed).toBe(true);
      expect(lcpResult?.violations.length).toBe(0);
    });

    it('should check FID metric', () => {
      const results = budget.checkMetric('FID', 150, 'ms');

      const fidResult = results.find((r) => r.budget.name === 'Core Web Vitals');
      expect(fidResult?.passed).toBe(false);
      expect(fidResult?.violations.some((v) => v.threshold.name === 'FID')).toBe(true);
    });

    it('should check CLS score (lower is better)', () => {
      const results = budget.checkMetric('CLS', 0.15, 'score');

      const clsResult = results.find((r) => r.budget.name === 'Core Web Vitals');
      expect(clsResult?.passed).toBe(false);
      expect(clsResult?.violations.some((v) => v.threshold.name === 'CLS')).toBe(true);
    });

    it('should check CLS score when within budget', () => {
      const results = budget.checkMetric('CLS', 0.05, 'score');

      const clsResult = results.find((r) => r.budget.name === 'Core Web Vitals');
      expect(clsResult?.passed).toBe(true);
    });

    it('should check TTFB metric', () => {
      const results = budget.checkMetric('TTFB', 800, 'ms');

      const ttfbResult = results.find((r) => r.budget.name === 'Core Web Vitals');
      expect(ttfbResult?.passed).toBe(false);
    });

    it('should skip disabled budgets', () => {
      budget.setBudgetEnabled('Core Web Vitals', false);

      const results = budget.checkMetric('LCP', 5000, 'ms');
      const lcpResult = results.find((r) => r.budget.name === 'Core Web Vitals');

      expect(lcpResult).toBeUndefined();
    });

    it('should skip thresholds with different units', () => {
      const results = budget.checkMetric('LCP', 5000, 'bytes');

      const lcpResult = results.find((r) => r.budget.name === 'Core Web Vitals');
      expect(lcpResult?.violations.length).toBe(0);
    });

    it('should calculate correct percentage over', () => {
      const results = budget.checkMetric('LCP', 3000, 'ms');

      const lcpViolation = results
        .flatMap((r) => r.violations)
        .find((v) => v.threshold.name === 'LCP');

      expect(lcpViolation?.percentageOver).toBeCloseTo(20, 0); // (3000-2500)/2500 * 100 = 20%
    });
  });

  describe('Multiple Metrics Check', () => {
    it('should check multiple metrics at once', () => {
      const report = budget.checkMetrics({
        LCP: { value: 3000, unit: 'ms' },
        FID: { value: 80, unit: 'ms' },
        CLS: { value: 0.05, unit: 'score' },
      });

      expect(report.results.length).toBeGreaterThan(0);
      expect(report.warningViolations.length).toBe(1); // Only LCP warning
      expect(report.criticalViolations.length).toBe(0);
    });

    it('should detect critical violations', () => {
      const report = budget.checkMetrics({
        LCP: { value: 5000, unit: 'ms' },
        FID: { value: 400, unit: 'ms' },
      });

      expect(report.criticalViolations.length).toBeGreaterThan(0);
      expect(report.overallPassed).toBe(false);
    });

    it('should pass when all metrics are under thresholds', () => {
      const report = budget.checkMetrics({
        LCP: { value: 1000, unit: 'ms' },
        FID: { value: 50, unit: 'ms' },
        CLS: { value: 0.05, unit: 'score' },
        TTFB: { value: 200, unit: 'ms' },
      });

      expect(report.overallPassed).toBe(true);
      expect(report.criticalViolations.length).toBe(0);
      expect(report.warningViolations.length).toBe(0);
    });

    it('should calculate overall score', () => {
      const report = budget.checkMetrics({
        LCP: { value: 1000, unit: 'ms' },
        FID: { value: 50, unit: 'ms' },
      });

      expect(report.totalScore).toBe(100);
    });

    it('should generate summary for passed budgets', () => {
      const report = budget.checkMetrics({
        LCP: { value: 1000, unit: 'ms' },
        FID: { value: 50, unit: 'ms' },
      });

      expect(report.summary).toContain('budgets passed');
    });

    it('should generate summary for critical violations', () => {
      const report = budget.checkMetrics({
        LCP: { value: 5000, unit: 'ms' },
      });

      expect(report.summary).toContain('critical violations');
    });

    it('should generate summary for warning violations', () => {
      const report = budget.checkMetrics({
        LCP: { value: 3000, unit: 'ms' },
      });

      expect(report.summary).toContain('warning violations');
    });
  });

  describe('Violation History', () => {
    it('should track violation history', () => {
      budget.checkMetric('LCP', 5000, 'ms');
      budget.checkMetric('FID', 400, 'ms');

      const history = budget.getViolationHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit history size', () => {
      const smallBudget = new PerformanceBudget();

      // Generate many violations
      for (let i = 0; i < 150; i++) {
        smallBudget.checkMetric('LCP', 5000 + i, 'ms');
      }

      const history = smallBudget.getViolationHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });

    it('should clear history', () => {
      budget.checkMetric('LCP', 5000, 'ms');
      budget.clearHistory();

      const history = budget.getViolationHistory();
      expect(history.length).toBe(0);
    });

    it('should get violation frequency', () => {
      budget.checkMetric('LCP', 5000, 'ms');
      budget.checkMetric('LCP', 3000, 'ms');
      budget.checkMetric('FID', 200, 'ms');

      const frequency = budget.getViolationFrequency();
      expect(frequency.size).toBeGreaterThan(0);
      expect(frequency.get('LCP')?.count).toBe(2);
    });

    it('should get most violated budgets', () => {
      budget.checkMetric('LCP', 5000, 'ms');
      budget.checkMetric('LCP', 5000, 'ms');
      budget.checkMetric('LCP', 5000, 'ms');
      budget.checkMetric('FID', 200, 'ms');

      const mostViolated = budget.getMostViolatedBudgets();
      expect(mostViolated.length).toBeGreaterThan(0);
      expect(mostViolated[0].name).toBe('LCP Critical');
    });
  });

  describe('Import/Export', () => {
    it('should export budgets as JSON', () => {
      const json = budget.exportBudgets();
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should import budgets from JSON', () => {
      const original = budget.exportBudgets();
      budget.clearHistory();

      const newBudget = new PerformanceBudget();
      newBudget.importBudgets(original);

      expect(newBudget.getAllBudgets().length).toBeGreaterThan(0);
    });

    it('should throw on invalid JSON import', () => {
      expect(() => budget.importBudgets('invalid json')).toThrow();
    });
  });

  describe('Score Calculation', () => {
    it('should calculate score of 100 for no violations', () => {
      const results = budget.checkMetric('LCP', 1000, 'ms');
      const webVitalsResult = results.find((r) => r.budget.name === 'Core Web Vitals');
      expect(webVitalsResult?.score).toBe(100);
    });

    it('should reduce score for violations', () => {
      const results = budget.checkMetric('LCP', 3000, 'ms');
      const webVitalsResult = results.find((r) => r.budget.name === 'Core Web Vitals');
      expect(webVitalsResult?.score).toBeLessThan(100);
      expect(webVitalsResult?.score).toBeGreaterThan(0);
    });

    it('should heavily penalize critical violations', () => {
      const warningResults = budget.checkMetric('LCP', 3000, 'ms');
      const criticalResults = budget.checkMetric('LCP', 5000, 'ms');

      const warningResult = warningResults.find((r) => r.budget.name === 'Core Web Vitals');
      const criticalResult = criticalResults.find((r) => r.budget.name === 'Core Web Vitals');

      expect(criticalResult?.score).toBeLessThan(warningResult?.score ?? 100);
    });
  });

  describe('Resource Budgets', () => {
    it('should check transfer size', () => {
      const results = budget.checkMetric('Total Transfer Size', 2 * 1024 * 1024, 'bytes');

      const sizeResult = results.find((r) => r.budget.name === 'Resource Limits');
      expect(sizeResult?.passed).toBe(false);
    });

    it('should check request count', () => {
      const results = budget.checkMetric('Request Count', 75, 'count');

      const countResult = results.find((r) => r.budget.name === 'Resource Limits');
      expect(countResult?.passed).toBe(false);
    });

    it('should check JavaScript size', () => {
      const results = budget.checkMetric('JavaScript Size', 400 * 1024, 'bytes');

      const jsResult = results.find((r) => r.budget.name === 'Resource Limits');
      expect(jsResult?.passed).toBe(false);
    });
  });

  describe('Rendering Budgets', () => {
    it('should check FCP', () => {
      const results = budget.checkMetric('FCP', 2500, 'ms');

      const fcpResult = results.find((r) => r.budget.name === 'Rendering Performance');
      expect(fcpResult?.passed).toBe(false);
    });

    it('should check TTI', () => {
      const results = budget.checkMetric('TTI', 5000, 'ms');

      const ttiResult = results.find((r) => r.budget.name === 'Rendering Performance');
      expect(ttiResult?.passed).toBe(false);
    });
  });
});

describe('Helper Functions', () => {
  describe('createDefaultBudget', () => {
    it('should create a budget with default thresholds', () => {
      const budget = createDefaultBudget();
      expect(budget.getAllBudgets().length).toBeGreaterThan(0);
    });
  });

  describe('createBudget', () => {
    it('should create a budget configuration', () => {
      const config = createBudget(
        'Custom Budget',
        'A custom budget for testing',
        'custom',
        [
          { name: 'Custom Metric', value: 100, unit: 'ms' },
          { name: 'Another Metric', value: 50, unit: 'count' },
        ]
      );

      expect(config.name).toBe('Custom Budget');
      expect(config.category).toBe('custom');
      expect(config.enabled).toBe(true);
      expect(config.thresholds.length).toBe(2);
    });
  });

  describe('formatBudgetViolation', () => {
    it('should format violation for display', () => {
      const violation: BudgetViolation = {
        threshold: { name: 'LCP', value: 2500, unit: 'ms', severity: 'warning' },
        actualValue: 3000,
        thresholdValue: 2500,
        violationSeverity: 'warning',
        percentageOver: 20,
      };

      const formatted = formatBudgetViolation(violation);
      expect(formatted).toContain('LCP');
      expect(formatted).toContain('3000 ms');
      expect(formatted).toContain('2500 ms');
      expect(formatted).toMatch(/20\.?0?%/); // Accept 20%, 20.0%, etc.
    });
  });
});

describe('DEFAULT_BUDGETS', () => {
  it('should contain Core Web Vitals', () => {
    const coreWebVitals = DEFAULT_BUDGETS.find((b) => b.name === 'Core Web Vitals');
    expect(coreWebVitals).toBeDefined();
    expect(coreWebVitals?.thresholds.some((t) => t.name === 'LCP')).toBe(true);
    expect(coreWebVitals?.thresholds.some((t) => t.name === 'FID')).toBe(true);
    expect(coreWebVitals?.thresholds.some((t) => t.name === 'CLS')).toBe(true);
    expect(coreWebVitals?.thresholds.some((t) => t.name === 'TTFB')).toBe(true);
  });

  it('should contain Resource Limits', () => {
    const resourceLimits = DEFAULT_BUDGETS.find((b) => b.name === 'Resource Limits');
    expect(resourceLimits).toBeDefined();
    expect(resourceLimits?.thresholds.some((t) => t.name.includes('Transfer Size'))).toBe(true);
    expect(resourceLimits?.thresholds.some((t) => t.name.includes('Request Count'))).toBe(true);
  });

  it('should contain Rendering Performance', () => {
    const rendering = DEFAULT_BUDGETS.find((b) => b.name === 'Rendering Performance');
    expect(rendering).toBeDefined();
    expect(rendering?.thresholds.some((t) => t.name === 'FCP')).toBe(true);
    expect(rendering?.thresholds.some((t) => t.name === 'TTI')).toBe(true);
  });

  it('should have both warning and critical thresholds', () => {
    for (const budget of DEFAULT_BUDGETS) {
      const hasWarning = budget.thresholds.some((t) => t.severity === 'warning');
      const hasCritical = budget.thresholds.some((t) => t.severity === 'critical');
      expect(hasWarning).toBe(true);
      expect(hasCritical).toBe(true);
    }
  });
});

describe('Edge Cases', () => {
  let budget: PerformanceBudget;

  beforeEach(() => {
    budget = new PerformanceBudget();
  });

  it('should handle exact threshold value', () => {
    const results = budget.checkMetric('LCP', 2500, 'ms');

    const lcpResult = results.find((r) => r.budget.name === 'Core Web Vitals');
    const lcpViolation = lcpResult?.violations.find((v) => v.threshold.name === 'LCP');

    expect(lcpViolation).toBeUndefined();
  });

  it('should handle value just over threshold', () => {
    const results = budget.checkMetric('LCP', 2501, 'ms');

    const lcpResult = results.find((r) => r.budget.name === 'Core Web Vitals');
    const lcpViolation = lcpResult?.violations.find((v) => v.threshold.name === 'LCP');

    expect(lcpViolation).toBeDefined();
    expect(lcpViolation?.percentageOver).toBeCloseTo(0.04, 2);
  });

  it('should handle very large values', () => {
    const results = budget.checkMetric('LCP', 100000, 'ms');

    expect(results[0]?.score).toBeLessThan(50);
  });

  it('should handle zero values', () => {
    const results = budget.checkMetric('LCP', 0, 'ms');

    expect(results[0]?.passed).toBe(true);
  });

  it('should handle empty metrics', () => {
    const report = budget.checkMetrics({});

    expect(report.overallPassed).toBe(true);
    expect(report.totalScore).toBe(100);
  });

  it('should handle partial metric names', () => {
    // Testing case-insensitivity and partial matching
    const results = budget.checkMetric('largest contentful paint', 3000, 'ms');

    expect(results.some((r) => r.violations.length > 0)).toBe(true);
  });
});
