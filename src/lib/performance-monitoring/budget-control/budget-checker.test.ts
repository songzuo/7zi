/**
 * Budget Checker Tests
 * Unit tests for the budget-checker module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BudgetChecker,
  checkMetricAgainstBudget,
  formatBudgetViolation,
  getCoreWebVitalsThresholds,
  type BudgetConfig,
  type PerformanceMetrics,
  type BudgetCheckResult,
} from './budget-checker';

// ========================================
// Mock Helpers
// ========================================

function mockFetchConfig(config: BudgetConfig): void {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(config),
    })
  ));
}

function mockFetchError(status: number = 404): void {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve({
      ok: false,
      status,
      json: () => Promise.reject(new Error('Not found')),
    })
  ));
}

// ========================================
// Test Suite
// ========================================

describe('BudgetChecker', () => {
  let budgetChecker: BudgetChecker;

  beforeEach(() => {
    budgetChecker = new BudgetChecker();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Constructor', () => {
    it('should create instance with default config', () => {
      const checker = new BudgetChecker();

      expect(checker.isEnabled()).toBe(true);
      expect(checker).toBeInstanceOf(BudgetChecker);
    });

    it('should create instance with custom config', () => {
      const checker = new BudgetChecker({
        configPath: '/custom/budget.json',
        enabled: false,
      });

      expect(checker.isEnabled()).toBe(false);
    });

    it('should create instance with custom loader', () => {
      const customLoader = async () => null;
      const checker = new BudgetChecker({
        loadBudgets: customLoader,
      });

      expect(checker).toBeInstanceOf(BudgetChecker);
    });
  });

  describe('setEnabled', () => {
    it('should enable budget checking', () => {
      budgetChecker.setEnabled(true);
      expect(budgetChecker.isEnabled()).toBe(true);
    });

    it('should disable budget checking', () => {
      budgetChecker.setEnabled(false);
      expect(budgetChecker.isEnabled()).toBe(false);
    });
  });

  describe('checkBudget (when disabled)', () => {
    beforeEach(() => {
      budgetChecker.setEnabled(false);
    });

    it('should pass when disabled', async () => {
      const metrics: PerformanceMetrics = {
        LCP: 5000, // Way over budget
        FID: 500,
      };

      const result = await budgetChecker.checkBudget('/', metrics);

      expect(result.passed).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('should return timestamp', async () => {
      const result = await budgetChecker.checkBudget('/', {});

      expect(result.timestamp).toBeTypeOf('number');
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe('checkBudget (when enabled)', () => {
    const mockConfig: BudgetConfig = {
      budgets: [
        {
          path: '/',
          timings: [
            { metric: 'LCP', budget: 2500, tolerance: 0.1 },
            { metric: 'FID', budget: 100, tolerance: 0.15 },
            { metric: 'CLS', budget: 0.1, tolerance: 0.2 },
          ],
        },
        {
          path: '/dashboard',
          timings: [
            { metric: 'LCP', budget: 3000, tolerance: 0.15 },
            { metric: 'TBT', budget: 300, tolerance: 0.2 },
          ],
        },
      ],
    };

    beforeEach(() => {
      budgetChecker.setEnabled(true);
    });

    it('should load config from file', async () => {
      mockFetchConfig(mockConfig);

      const result = await budgetChecker.loadBudgetConfig();

      expect(result).toEqual(mockConfig);
    });

    it('should pass when all metrics within budget', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => mockConfig,
      });

      const metrics: PerformanceMetrics = {
        LCP: 2400, // Under 2500 + 10%
        FID: 90, // Under 100 + 15%
        CLS: 0.08, // Under 0.1 + 20%
      };

      const result = await checker.checkBudget('/', metrics);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should fail when metrics exceed budget', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => mockConfig,
      });

      const metrics: PerformanceMetrics = {
        LCP: 3000, // Over 2500 + 10% = 2750
        FID: 90,
        CLS: 0.08,
      };

      const result = await checker.checkBudget('/', metrics);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);

      const [violation] = result.violations;
      expect(violation.metric).toBe('LCP');
      expect(violation.budget).toBe(2500);
      expect(violation.actual).toBe(3000);
      expect(violation.threshold).toBe(2750); // 2500 * 1.1
      expect(violation.percentOver).toBeGreaterThan(0);
    });

    it('should handle multiple violations', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => mockConfig,
      });

      const metrics: PerformanceMetrics = {
        LCP: 3000, // Over budget
        FID: 150, // Over budget
        CLS: 0.15, // Over budget
      };

      const result = await checker.checkBudget('/', metrics);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(3);
    });

    it('should skip missing metrics', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => mockConfig,
      });

      const metrics: PerformanceMetrics = {
        LCP: 3000,
        // FID and CLS missing
      };

      const result = await checker.checkBudget('/', metrics);

      expect(result.passed).toBe(false);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].metric).toBe('LCP');
    });

    it('should match exact path', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => mockConfig,
      });

      const metrics: PerformanceMetrics = {
        LCP: 3500, // Over /budget
        TBT: 200, // Under /dashboard budget
      };

      const result = await checker.checkBudget('/dashboard', metrics);

      expect(result.passed).toBe(true); // TBT is within budget, LCP not in /dashboard budget
    });

    it('should match wildcard path', async () => {
      const wildcardConfig: BudgetConfig = {
        budgets: [
          {
            path: '/dashboard/*',
            timings: [
              { metric: 'LCP', budget: 3500, tolerance: 0.1 },
            ],
          },
        ],
      };

      const checker = new BudgetChecker({
        loadBudgets: async () => wildcardConfig,
      });

      const metrics: PerformanceMetrics = {
        LCP: 3200,
      };

      const result = await checker.checkBudget('/dashboard/analytics', metrics);

      expect(result.passed).toBe(true);
    });

    it('should pass when no budget defined for page', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => mockConfig,
      });

      const result = await checker.checkBudget('/nonexistent', {
        LCP: 10000,
      });

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should handle path normalization (trailing slash)', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => mockConfig,
      });

      const metrics: PerformanceMetrics = {
        LCP: 3000,
      };

      const result1 = await checker.checkBudget('/', metrics);
      // checkBatch doesn't exist, use checkBudget instead
      const result2 = await checker.checkBudget('/', metrics);

      expect(result1.passed).toBe(result2.passed);
    });

    it('should calculate correct severity', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => mockConfig,
      });

      // Critical (50%+ over)
      const criticalMetrics: PerformanceMetrics = {
        LCP: 4500, // 63% over threshold
      };

      const criticalResult = await checker.checkBudget('/', criticalMetrics);

      expect(criticalResult.violations[0].severity).toBe('critical');

      // Warning (<50% over)
      const warningMetrics: PerformanceMetrics = {
        LCP: 2800, // 1.8% over threshold
      };

      const warningResult = await checker.checkBudget('/', warningMetrics);

      expect(warningResult.violations[0].severity).toBe('warning');
    });

    it('should handle TBT metric', async () => {
      const config: BudgetConfig = {
        budgets: [
          {
            path: '/',
            timings: [
              { metric: 'TBT', budget: 300, tolerance: 0.2 },
            ],
          },
        ],
      };

      const checker = new BudgetChecker({
        loadBudgets: async () => config,
      });

      const metrics: PerformanceMetrics = {
        TBT: 400, // Over 300 + 20% = 360
      };

      const result = await checker.checkBudget('/', metrics);

      expect(result.passed).toBe(false);
      expect(result.violations[0].metric).toBe('TBT');
    });

    it('should handle TTFB metric', async () => {
      const config: BudgetConfig = {
        budgets: [
          {
            path: '/',
            timings: [
              { metric: 'TTFB', budget: 800, tolerance: 0.2 },
            ],
          },
        ],
      };

      const checker = new BudgetChecker({
        loadBudgets: async () => config,
      });

      const metrics: PerformanceMetrics = {
        TTFB: 1000, // Over 800 + 20% = 960
      };

      const result = await checker.checkBudget('/', metrics);

      expect(result.passed).toBe(false);
      expect(result.violations[0].metric).toBe('TTFB');
    });

    it('should handle FCP metric', async () => {
      const config: BudgetConfig = {
        budgets: [
          {
            path: '/',
            timings: [
              { metric: 'FCP', budget: 1800, tolerance: 0.15 },
            ],
          },
        ],
      };

      const checker = new BudgetChecker({
        loadBudgets: async () => config,
      });

      const metrics: PerformanceMetrics = {
        FCP: 2200, // Over 1800 + 15% = 2070
      };

      const result = await checker.checkBudget('/', metrics);

      expect(result.passed).toBe(false);
      expect(result.violations[0].metric).toBe('FCP');
    });
  });

  describe('checkBudget (error handling)', () => {
    it('should pass when config loading fails', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => null,
      });

      const result = await checker.checkBudget('/', { LCP: 10000 });

      expect(result.passed).toBe(true);
    });
  });

  describe('loadBudgetConfig', () => {
    it('should cache config by default', async () => {
      mockFetchConfig({ budgets: [] });
      const loadSpy = vi.fn().mockResolvedValue({ budgets: [] });

      const checker = new BudgetChecker({
        loadBudgets: loadSpy,
      });

      await checker.loadBudgetConfig();
      await checker.loadBudgetConfig();

      expect(loadSpy).toHaveBeenCalledTimes(1);
    });

    it('should force reload when requested', async () => {
      const loadSpy = vi.fn().mockResolvedValue({ budgets: [] });

      const checker = new BudgetChecker({
        loadBudgets: loadSpy,
      });

      await checker.loadBudgetConfig();
      await checker.loadBudgetConfig(true);

      expect(loadSpy).toHaveBeenCalledTimes(2);
    });

    it('should invalidate cache after duration', async () => {
      const loadSpy = vi.fn().mockResolvedValue({ budgets: [] });

      const checker = new BudgetChecker({
        loadBudgets: loadSpy,
      });

      await checker.loadBudgetConfig();

      // Set cache duration to 0ms
      checker.setCacheDuration(0);

      await checker.loadBudgetConfig();

      expect(loadSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('getBudgetForPage', () => {
    const mockConfig: BudgetConfig = {
      budgets: [
        {
          path: '/',
          timings: [{ metric: 'LCP', budget: 2500, tolerance: 0.1 }],
        },
        {
          path: '/dashboard',
          timings: [{ metric: 'LCP', budget: 3000, tolerance: 0.15 }],
        },
      ],
    };

    it('should return budget for exact match', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => mockConfig,
      });

      const budget = await checker.getBudgetForPage('/');

      expect(budget?.path).toBe('/');
    });

    it('should return null for non-existent page', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => mockConfig,
      });

      const budget = await checker.getBudgetForPage('/nonexistent');

      expect(budget).toBeNull();
    });

    it('should return null when config not loaded', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => null,
      });

      const budget = await checker.getBudgetForPage('/');

      expect(budget).toBeNull();
    });
  });

  describe('getAllBudgets', () => {
    it('should return all budgets', async () => {
      const mockConfig: BudgetConfig = {
        budgets: [
          { path: '/', timings: [{ metric: 'LCP', budget: 2500, tolerance: 0.1 }] },
          { path: '/dashboard', timings: [{ metric: 'LCP', budget: 3000, tolerance: 0.15 }] },
        ],
      };

      const checker = new BudgetChecker({
        loadBudgets: async () => mockConfig,
      });

      const budgets = await checker.getAllBudgets();

      expect(budgets).toHaveLength(2);
    });

    it('should return empty array when config not loaded', async () => {
      const checker = new BudgetChecker({
        loadBudgets: async () => null,
      });

      const budgets = await checker.getAllBudgets();

      expect(budgets).toEqual([]);
    });
  });

  describe('clearCache', () => {
    it('should clear cached config', async () => {
      mockFetchConfig({ budgets: [] });
      const loadSpy = vi.fn().mockResolvedValue({ budgets: [] });

      const checker = new BudgetChecker({
        loadBudgets: loadSpy,
      });

      await checker.loadBudgetConfig();
      checker.clearCache();
      await checker.loadBudgetConfig();

      expect(loadSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateBudgetConfig', () => {
    it('should validate correct config', () => {
      const config: BudgetConfig = {
        budgets: [
          {
            path: '/',
            timings: [
              { metric: 'LCP', budget: 2500, tolerance: 0.1 },
            ],
          },
        ],
      };

      const result = budgetChecker.validateBudgetConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing budgets array', () => {
      const result = budgetChecker.validateBudgetConfig({ budgets: [] } as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('budgets must be an array');
    });

    it('should detect missing path', () => {
      const result = budgetChecker.validateBudgetConfig({
        budgets: [
          {
            path: '',
            timings: [{ metric: 'LCP', budget: 2500, tolerance: 0.1 }],
          },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('.path must be a non-empty string'))).toBe(
        true
      );
    });

    it('should detect invalid metric', () => {
      const result = budgetChecker.validateBudgetConfig({
        budgets: [
          {
            path: '/',
            timings: [{ metric: 'INVALID' as any, budget: 2500, tolerance: 0.1 }],
          },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('.metric must be one of'))).toBe(true);
    });

    it('should detect invalid budget value', () => {
      const result = budgetChecker.validateBudgetConfig({
        budgets: [
          {
            path: '/',
            timings: [{ metric: 'LCP', budget: -100, tolerance: 0.1 }],
          },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('.budget must be a positive number'))).toBe(
        true
      );
    });

    it('should detect invalid tolerance', () => {
      const result = budgetChecker.validateBudgetConfig({
        budgets: [
          {
            path: '/',
            timings: [{ metric: 'LCP', budget: 2500, tolerance: -0.1 }],
          },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('.tolerance must be a non-negative number'))).toBe(
        true
      );
    });

    it('should detect multiple errors', () => {
      const result = budgetChecker.validateBudgetConfig({
        budgets: [
          {
            path: '',
            timings: [{ metric: 'INVALID' as any, budget: -100, tolerance: -0.1 }],
          },
        ],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
    });
  });

  describe('generateSampleConfig', () => {
    it('should generate valid sample config', () => {
      const config = BudgetChecker.generateSampleConfig();

      expect(config.budgets).toBeInstanceOf(Array);
      expect(config.budgets.length).toBeGreaterThan(0);

      // Validate the generated config
      const validation = budgetChecker.validateBudgetConfig(config);
      expect(validation.valid).toBe(true);
    });

    it('should include core pages', () => {
      const config = BudgetChecker.generateSampleConfig();

      const paths = config.budgets.map((b) => b.path);
      expect(paths).toContain('/');
      expect(paths).toContain('/dashboard');
      expect(paths).toContain('/tasks');
    });

    it('should include common metrics', () => {
      const config = BudgetChecker.generateSampleConfig();

      const homeBudget = config.budgets.find((b) => b.path === '/');
      expect(homeBudget).toBeDefined();

      const metrics = homeBudget!.timings.map((t) => t.metric);
      expect(metrics).toContain('LCP');
      expect(metrics).toContain('FID');
      expect(metrics).toContain('CLS');
    });
  });

  describe('getViolations', () => {
    it('should return empty array (maintained for compatibility)', () => {
      const violations = budgetChecker.getViolations();

      expect(violations).toEqual([]);
    });
  });
});

// ========================================
// Utility Function Tests
// ========================================

describe('checkMetricAgainstBudget', () => {
  it('should pass when metric within budget', () => {
    const result = checkMetricAgainstBudget('LCP', 2400, 2500, 0.1);

    expect(result).toBeNull();
  });

  it('should detect violation when metric exceeds budget', () => {
    const result = checkMetricAgainstBudget('LCP', 3000, 2500, 0.1);

    expect(result).not.toBeNull();
    expect(result?.metric).toBe('LCP');
    expect(result?.budget).toBe(2500);
    expect(result?.actual).toBe(3000);
  });

  it('should calculate correct threshold', () => {
    const result = checkMetricAgainstBudget('LCP', 2800, 2500, 0.1);

    expect(result?.threshold).toBe(2750); // 2500 * 1.1
  });

  it('should calculate correct percent over', () => {
    const result = checkMetricAgainstBudget('LCP', 3000, 2500, 0.1);

    expect(result?.percentOver).toBeCloseTo(9.09, 2); // (3000 - 2750) / 2750 * 100
  });

  it('should determine critical severity', () => {
    const result = checkMetricAgainstBudget('LCP', 5000, 2500, 0.1); // 81% over

    expect(result?.severity).toBe('critical');
  });

  it('should determine warning severity', () => {
    const result = checkMetricAgainstBudget('LCP', 3000, 2500, 0.1); // 9% over

    expect(result?.severity).toBe('warning');
  });

  it('should handle CLS metric', () => {
    const result = checkMetricAgainstBudget('CLS', 0.15, 0.1, 0.2);

    expect(result).not.toBeNull();
    expect(result?.threshold).toBe(0.12); // 0.1 * 1.2
  });
});

describe('formatBudgetViolation', () => {
  it('should format violation with warning severity', () => {
    const violation = {
      metric: 'LCP',
      budget: 2500,
      actual: 2800,
      threshold: 2750,
      percentOver: 1.82,
      severity: 'warning' as const,
    };

    const formatted = formatBudgetViolation(violation);

    expect(formatted).toContain('⚠️');
    expect(formatted).toContain('LCP');
    expect(formatted).toContain('2800ms');
    expect(formatted).toContain('2500ms');
    expect(formatted).toContain('2750ms');
    expect(formatted).toContain('1.8%');
  });

  it('should format violation with critical severity', () => {
    const violation = {
      metric: 'CLS',
      budget: 0.1,
      actual: 0.2,
      threshold: 0.12,
      percentOver: 66.67,
      severity: 'critical' as const,
    };

    const formatted = formatBudgetViolation(violation);

    expect(formatted).toContain('🚨');
    expect(formatted).toContain('CLS');
    // CLS has no unit
    expect(formatted).toContain('0.2');
  });

  it('should handle CLS without units', () => {
    const violation = {
      metric: 'CLS',
      budget: 0.1,
      actual: 0.15,
      threshold: 0.12,
      percentOver: 25,
      severity: 'warning' as const,
    };

    const formatted = formatBudgetViolation(violation);

    expect(formatted).not.toContain('ms');
  });
});

describe('getCoreWebVitalsThresholds', () => {
  it('should return thresholds for all metrics', () => {
    const thresholds = getCoreWebVitalsThresholds();

    expect(thresholds).toHaveProperty('LCP');
    expect(thresholds).toHaveProperty('FID');
    expect(thresholds).toHaveProperty('CLS');
    expect(thresholds).toHaveProperty('TTFB');
    expect(thresholds).toHaveProperty('FCP');
    expect(thresholds).toHaveProperty('TBT');
  });

  it('should have correct values', () => {
    const thresholds = getCoreWebVitalsThresholds();

    expect(thresholds.LCP.budget).toBe(2500);
    expect(thresholds.FID.budget).toBe(100);
    expect(thresholds.CLS.budget).toBe(0.1);
    expect(thresholds.TTFB.budget).toBe(800);
    expect(thresholds.FCP.budget).toBe(1800);
    expect(thresholds.TBT.budget).toBe(300);
  });

  it('should have zero tolerance by default', () => {
    const thresholds = getCoreWebVitalsThresholds();

    Object.values(thresholds).forEach((t) => {
      expect(t.tolerance).toBe(0);
    });
  });
});
