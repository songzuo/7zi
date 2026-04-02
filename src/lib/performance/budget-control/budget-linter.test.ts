/**
 * Budget Linter Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  BudgetLinter,
  lintBudgets,
  generateSampleBudgetConfig,
  generateSampleMetricsData,
} from './budget-linter'
import type { BudgetConfig, PerformanceMetrics } from './budget-checker'

// ========================================
// Mock Data
// ========================================

const mockBudgetConfig: BudgetConfig = {
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
}

const mockMetricsData: Record<string, PerformanceMetrics> = {
  '/': {
    LCP: 2400, // Pass
    FID: 95, // Pass
    CLS: 0.08, // Pass
  },
  '/dashboard': {
    LCP: 3500, // Violate (3000 * 1.15 = 3450)
    TBT: 280, // Pass (300 * 1.2 = 360)
  },
  '/tasks': {
    LCP: 2800, // No budget defined, should pass
  },
}

// ========================================
// Test Suites
// ========================================

describe('BudgetLinter', () => {
  let linter: BudgetLinter

  beforeEach(() => {
    linter = new BudgetLinter({
      budgetConfig: mockBudgetConfig,
      metricsData: mockMetricsData,
      outputFormat: 'console',
      quiet: true,
    })
  })

  describe('Constructor', () => {
    it('should create instance with options', () => {
      expect(linter).toBeInstanceOf(BudgetLinter)
    })

    it('should apply default options', () => {
      const defaultLinter = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: mockMetricsData,
      })

      expect(defaultLinter).toBeInstanceOf(BudgetLinter)
    })
  })

  describe('lint()', () => {
    it('should run lint check and return result', async () => {
      const result = await linter.lint()

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('totalViolations')
      expect(result).toHaveProperty('pages')
      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('timestamp')
    })

    it('should detect budget violations', async () => {
      const result = await linter.lint()

      expect(result.totalViolations).toBeGreaterThan(0)
    })

    it('should calculate correct summary statistics', async () => {
      const result = await linter.lint()

      expect(result.summary).toHaveProperty('passed')
      expect(result.summary).toHaveProperty('failed')
      expect(result.summary).toHaveProperty('warnings')
      expect(result.summary).toHaveProperty('critical')
      expect(result.summary).toHaveProperty('passRate')
    })

    it('should set success to false if there are critical violations', async () => {
      const linterWithCritical = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: {
          '/': {
            LCP: 5000, // Critical violation
          },
        },
        failOnCritical: true,
        quiet: true,
      })

      const result = await linterWithCritical.lint()

      expect(result.success).toBe(false)
    })

    it('should include suggestions when enabled', async () => {
      const linterWithSuggestions = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: {
          '/': {
            LCP: 3000,
          },
        },
        includeSuggestions: true,
        quiet: true,
      })

      const result = await linterWithSuggestions.lint()
      const violation = result.pages[0]?.violations[0]

      expect(violation?.suggestion).toBeDefined()
      expect(violation?.suggestion).toContain('LCP')
    })

    it('should not include suggestions when disabled', async () => {
      const linterWithoutSuggestions = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: {
          '/': {
            LCP: 3000,
          },
        },
        includeSuggestions: false,
        quiet: true,
      })

      const result = await linterWithoutSuggestions.lint()
      const violation = result.pages[0]?.violations[0]

      expect(violation?.suggestion).toBeUndefined()
    })

    it('should handle pages without defined budgets', async () => {
      const result = await linter.lint()

      const tasksPage = result.pages.find(p => p.path === '/tasks')
      expect(tasksPage).toBeDefined()
      expect(tasksPage?.passed).toBe(true)
    })

    it('should handle empty metrics data', async () => {
      const linterWithEmpty = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: {},
        quiet: true,
      })

      const result = await linterWithEmpty.lint()

      expect(result.pages).toHaveLength(0)
      expect(result.summary.passed).toBe(0)
      expect(result.summary.failed).toBe(0)
    })
  })

  describe('calculateSummary()', () => {
    it('should calculate correct pass/fail counts', async () => {
      const result = await linter.lint()

      expect(result.summary.passed + result.summary.failed).toBe(result.pages.length)
    })

    it('should calculate correct pass rate', async () => {
      const result = await linter.lint()

      const expectedPassRate = (result.summary.passed / result.pages.length) * 100
      expect(result.summary.passRate).toBeCloseTo(expectedPassRate, 1)
    })

    it('should handle all pages passing', async () => {
      const allPassLinter = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: {
          '/': {
            LCP: 2000,
            FID: 80,
            CLS: 0.05,
          },
          '/dashboard': {
            LCP: 2500,
            TBT: 200,
          },
        },
        quiet: true,
      })

      const result = await allPassLinter.lint()

      expect(result.summary.passed).toBe(2)
      expect(result.summary.failed).toBe(0)
      expect(result.summary.warnings).toBe(0)
      expect(result.summary.critical).toBe(0)
      expect(result.summary.passRate).toBe(100)
    })

    it('should handle all pages failing', async () => {
      const allFailLinter = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: {
          '/': {
            LCP: 5000,
          },
          '/dashboard': {
            LCP: 6000,
          },
        },
        quiet: true,
      })

      const result = await allFailLinter.lint()

      expect(result.summary.passed).toBe(0)
      expect(result.summary.failed).toBe(2)
      expect(result.totalViolations).toBeGreaterThan(0)
    })
  })

  describe('shouldBuildFail()', () => {
    it('should not fail by default', async () => {
      const result = await linter.lint()

      expect(linter.shouldBuildFail(result)).toBe(false)
    })

    it('should fail on critical violations when configured', async () => {
      const criticalLinter = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: {
          '/': {
            LCP: 5000, // Critical (>50% over threshold of 2750)
          },
        },
        failOnCritical: true,
        quiet: true,
      })

      const result = await criticalLinter.lint()

      expect(criticalLinter.shouldBuildFail(result)).toBe(true)
    })

    it('should fail on any violations when configured', async () => {
      const anyViolationLinter = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: {
          '/': {
            LCP: 2800, // Minor violation
          },
        },
        failOnAnyViolation: true,
        quiet: true,
      })

      const result = await anyViolationLinter.lint()

      expect(anyViolationLinter.shouldBuildFail(result)).toBe(true)
    })

    it('should not fail when passing with failOnCritical', async () => {
      const passLinter = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: {
          '/': {
            LCP: 2000,
          },
        },
        failOnCritical: true,
        quiet: true,
      })

      const result = await passLinter.lint()

      expect(passLinter.shouldBuildFail(result)).toBe(false)
    })
  })

  describe('Output Formats', () => {
    it('should support console output', async () => {
      const consoleLinter = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: mockMetricsData,
        outputFormat: 'console',
        quiet: true,
      })

      const result = await consoleLinter.lint()

      expect(result).toHaveProperty('pages')
    })

    it('should support json output', async () => {
      const jsonLinter = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: mockMetricsData,
        outputFormat: 'json',
        quiet: true,
      })

      const result = await jsonLinter.lint()

      expect(result).toHaveProperty('pages')
    })

    it('should support markdown output', async () => {
      const mdLinter = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: mockMetricsData,
        outputFormat: 'markdown',
        quiet: true,
      })

      const result = await mdLinter.lint()

      expect(result).toHaveProperty('pages')
    })

    it('should support html output', async () => {
      const htmlLinter = new BudgetLinter({
        budgetConfig: mockBudgetConfig,
        metricsData: mockMetricsData,
        outputFormat: 'html',
        quiet: true,
      })

      const result = await htmlLinter.lint()

      expect(result).toHaveProperty('pages')
    })
  })
})

describe('Utility Functions', () => {
  describe('lintBudgets()', () => {
    it('should create linter and run lint', async () => {
      const result = await lintBudgets(mockBudgetConfig, mockMetricsData)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('pages')
    })

    it('should accept custom options', async () => {
      const result = await lintBudgets(mockBudgetConfig, mockMetricsData, {
        failOnCritical: true,
        quiet: true,
      })

      expect(result).toHaveProperty('success')
    })
  })

  describe('generateSampleBudgetConfig()', () => {
    it('should generate valid budget config', () => {
      const config = generateSampleBudgetConfig()

      expect(config).toHaveProperty('budgets')
      expect(Array.isArray(config.budgets)).toBe(true)
      expect(config.budgets.length).toBeGreaterThan(0)
    })

    it('should include required fields', () => {
      const config = generateSampleBudgetConfig()
      const budget = config.budgets[0]

      expect(budget).toHaveProperty('path')
      expect(budget).toHaveProperty('timings')
      expect(Array.isArray(budget.timings)).toBe(true)

      if (budget.timings[0]) {
        expect(budget.timings[0]).toHaveProperty('metric')
        expect(budget.timings[0]).toHaveProperty('budget')
        expect(budget.timings[0]).toHaveProperty('tolerance')
      }
    })
  })

  describe('generateSampleMetricsData()', () => {
    it('should generate valid metrics data', () => {
      const metrics = generateSampleMetricsData()

      expect(Object.keys(metrics).length).toBeGreaterThan(0)
    })

    it('should include performance metrics', () => {
      const metrics = generateSampleMetricsData()
      const pageMetrics = Object.values(metrics)[0]

      expect(pageMetrics).toBeDefined()
      expect(typeof pageMetrics).toBe('object')
    })
  })
})

describe('Suggestion Templates', () => {
  it('should provide LCP suggestions', async () => {
    const linter = new BudgetLinter({
      budgetConfig: mockBudgetConfig,
      metricsData: {
        '/': {
          LCP: 5000,
        },
      },
      includeSuggestions: true,
      quiet: true,
    })

    const result = await linter.lint()
    const violation = result.pages[0]?.violations[0]

    expect(violation?.suggestion).toBeDefined()
    expect(violation?.suggestion).toContain('LCP')
    expect(violation?.suggestion).toContain('image')
  })

  it('should provide FID suggestions', async () => {
    const linter = new BudgetLinter({
      budgetConfig: mockBudgetConfig,
      metricsData: {
        '/': {
          FID: 200,
        },
      },
      includeSuggestions: true,
      quiet: true,
    })

    const result = await linter.lint()
    const violation = result.pages[0]?.violations[0]

    expect(violation?.suggestion).toBeDefined()
    expect(violation?.suggestion).toContain('FID')
    expect(violation?.suggestion).toContain('JavaScript')
  })

  it('should provide CLS suggestions', async () => {
    const linter = new BudgetLinter({
      budgetConfig: mockBudgetConfig,
      metricsData: {
        '/': {
          CLS: 0.3,
        },
      },
      includeSuggestions: true,
      quiet: true,
    })

    const result = await linter.lint()
    const violation = result.pages[0]?.violations[0]

    expect(violation?.suggestion).toBeDefined()
    expect(violation?.suggestion).toContain('CLS')
    expect(violation?.suggestion).toContain('layout')
  })
})

describe('Edge Cases', () => {
  it('should handle empty budget config', async () => {
    const linter = new BudgetLinter({
      budgetConfig: { budgets: [] },
      metricsData: {}, // No metrics
      quiet: true,
    })

    const result = await linter.lint()

    expect(result.pages).toHaveLength(0)
  })

  it('should handle invalid budget config', async () => {
    const linter = new BudgetLinter({
      budgetConfig: { budgets: [] },
      metricsData: {}, // No metrics
      quiet: true,
    })

    // Should not throw for empty budgets array
    const result = await linter.lint()
    expect(result.pages).toHaveLength(0)
  })

  it('should handle metrics with null values', async () => {
    const linter = new BudgetLinter({
      budgetConfig: mockBudgetConfig,
      metricsData: {
        '/': {
          LCP: null as any,
          FID: null as any,
        },
      },
      quiet: true,
    })

    const result = await linter.lint()

    // Should pass because null values are skipped
    const homePage = result.pages.find(p => p.path === '/')
    expect(homePage?.passed).toBe(true)
  })

  it('should handle metrics with undefined values', async () => {
    const linter = new BudgetLinter({
      budgetConfig: mockBudgetConfig,
      metricsData: {
        '/': {} as PerformanceMetrics,
      },
      quiet: true,
    })

    const result = await linter.lint()

    // Should pass because undefined values are skipped
    const homePage = result.pages.find(p => p.path === '/')
    expect(homePage?.passed).toBe(true)
  })

  it('should handle multiple violations on same page', async () => {
    const linter = new BudgetLinter({
      budgetConfig: mockBudgetConfig,
      metricsData: {
        '/': {
          LCP: 5000,
          FID: 300,
          CLS: 0.5,
        },
      },
      quiet: true,
    })

    const result = await linter.lint()
    const homePage = result.pages.find(p => p.path === '/')

    expect(homePage?.passed).toBe(false)
    expect(homePage?.violations.length).toBe(3)
  })
})
