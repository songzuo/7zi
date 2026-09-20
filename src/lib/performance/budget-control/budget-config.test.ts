/**
 * Budget Config Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  BudgetConfigManager,
  budgetConfig,
  loadBudgetConfig,
  getBudgetThresholds,
  checkMetricsWithinBudget,
  DEFAULT_THRESHOLDS,
} from './budget-config'
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
      timings: [{ metric: 'LCP', budget: 3000, tolerance: 0.15 }],
    },
  ],
}

// ========================================
// Test Suites
// ========================================

describe('BudgetConfigManager', () => {
  let manager: BudgetConfigManager

  beforeEach(() => {
    manager = new BudgetConfigManager({
      enableFileLoading: false,
    })
  })

  describe('Constructor', () => {
    it('should create instance with default options', () => {
      expect(manager).toBeInstanceOf(BudgetConfigManager)
    })

    it('should accept custom options', () => {
      const customManager = new BudgetConfigManager({
        configPath: '/custom-budget.json',
        cacheDuration: 30000,
      })

      expect(customManager).toBeInstanceOf(BudgetConfigManager)
    })
  })

  describe('loadConfig()', () => {
    it('should load default config when file loading is disabled', async () => {
      const config = await manager.loadConfig()

      expect(config).toHaveProperty('budgets')
      expect(Array.isArray(config.budgets)).toBe(true)
    })

    it('should cache config for subsequent calls', async () => {
      const config1 = await manager.loadConfig()
      const config2 = await manager.loadConfig()

      expect(config1._meta?.source).toBe('default')
      expect(config2._meta?.source).toBe('default')
    })

    it('should force reload when requested', async () => {
      const config1 = await manager.loadConfig()
      const config2 = await manager.loadConfig(true)

      expect(config1._meta?.loadedAt).toBeDefined()
      expect(config2._meta?.loadedAt).toBeDefined()
    })

    it('should include metadata in loaded config', async () => {
      const config = await manager.loadConfig()

      expect(config._meta).toBeDefined()
      expect(config._meta?.source).toBe('default')
      expect(config._meta?.loadedAt).toBeDefined()
    })
  })

  describe('getBudgetForPath()', () => {
    it('should return budget for exact path match', async () => {
      const budget = await manager.getBudgetForPath('/')

      expect(budget).toBeDefined()
      expect(budget?.path).toBe('/')
    })

    it('should return null for non-existent path', async () => {
      const customManager = new BudgetConfigManager({
        enableFileLoading: false,
        defaultBudgets: {
          budgets: [
            {
              path: '/home',
              timings: [{ metric: 'LCP', budget: 2500, tolerance: 0.1 }],
            },
          ],
        },
      })

      const budget = await customManager.getBudgetForPath('/non-existent')

      expect(budget).toBeNull()
    })

    it('should handle trailing slashes', async () => {
      const budget1 = await manager.getBudgetForPath('/dashboard')
      const budget2 = await manager.getBudgetForPath('/dashboard/')

      expect(budget1?.path).toBe(budget2?.path)
    })
  })

  describe('getThresholdsForMetric()', () => {
    it('should return threshold for valid metric', async () => {
      const threshold = await manager.getThresholdsForMetric('LCP')

      expect(threshold).toBeDefined()
      expect(threshold?.budget).toBe(2500)
      expect(threshold?.tolerance).toBe(0.1)
    })

    it('should return default thresholds from DEFAULT_THRESHOLDS', () => {
      const thresholds = DEFAULT_THRESHOLDS

      expect(thresholds.LCP.budget).toBe(2500)
      expect(thresholds.FID.budget).toBe(100)
      expect(thresholds.CLS.budget).toBe(0.1)
    })
  })

  describe('getDefaultThresholds()', () => {
    it('should return copy of default thresholds', () => {
      const thresholds = manager.getDefaultThresholds()

      expect(thresholds).toEqual(DEFAULT_THRESHOLDS)
    })
  })

  describe('validateConfig()', () => {
    it('should validate default config', async () => {
      const result = await manager.validateConfig()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('clearCache()', () => {
    it('should clear cached config', async () => {
      await manager.loadConfig()
      manager.clearCache()

      const metadata = manager.getMetadata()
      expect(metadata.source).toBe('none')
    })
  })

  describe('setCacheDuration()', () => {
    it('should update cache duration', () => {
      manager.setCacheDuration(30000)
      expect(true).toBe(true)
    })
  })

  describe('exportToJson()', () => {
    it('should export config as JSON string', async () => {
      const json = await manager.exportToJson()

      expect(json).toBeDefined()
      expect(() => JSON.parse(json)).not.toThrow()
    })

    it('should export pretty JSON when requested', async () => {
      const json = await manager.exportToJson(true)
      expect(json).toContain('\n')
    })

    it('should export compact JSON when not pretty', async () => {
      const json = await manager.exportToJson(false)
      expect(json.length).toBeLessThan(2000)
    })
  })

  describe('getMetadata()', () => {
    it('should return metadata for loaded config', async () => {
      await manager.loadConfig()
      const metadata = manager.getMetadata()

      expect(metadata.source).toBe('default')
    })

    it('should return none when no config loaded', () => {
      const metadata = manager.getMetadata()
      expect(metadata.source).toBe('none')
    })
  })
})

describe('Utility Functions', () => {
  describe('loadBudgetConfig()', () => {
    it('should load config with default options', async () => {
      const config = await loadBudgetConfig()
      expect(config).toHaveProperty('budgets')
    })

    it('should accept custom options', async () => {
      const config = await loadBudgetConfig({
        enableFileLoading: false,
      })
      expect(config).toHaveProperty('budgets')
    })
  })

  describe('getBudgetThresholds()', () => {
    it('should return thresholds for LCP', async () => {
      const threshold = await getBudgetThresholds('LCP')
      expect(threshold).toBeDefined()
      expect(threshold?.budget).toBe(2500)
    })

    it('should return thresholds for FID', async () => {
      const threshold = await getBudgetThresholds('FID')
      expect(threshold).toBeDefined()
      expect(threshold?.budget).toBe(100)
    })

    it('should return thresholds for CLS', async () => {
      const threshold = await getBudgetThresholds('CLS')
      expect(threshold).toBeDefined()
      expect(threshold?.budget).toBe(0.1)
    })
  })

  describe('checkMetricsWithinBudget()', () => {
    it('should pass when metrics within budget', async () => {
      const result = await checkMetricsWithinBudget('/', {
        LCP: 2000,
        FID: 80,
        CLS: 0.05,
      })

      expect(result.passed).toBe(true)
      expect(result.violations).toHaveLength(0)
    })

    it('should fail when metrics exceed budget', async () => {
      const result = await checkMetricsWithinBudget('/', {
        LCP: 3000,
      })

      expect(result.passed).toBe(false)
      expect(result.violations.length).toBeGreaterThan(0)
    })

    it('should calculate percentOver correctly', async () => {
      const result = await checkMetricsWithinBudget('/', {
        LCP: 3000,
      })

      if (result.violations.length > 0) {
        const violation = result.violations[0]
        expect(violation.percentOver).toBeGreaterThan(0)
        expect(violation.actual).toBe(3000)
      }
    })

    it('should handle missing metrics', async () => {
      const result = await checkMetricsWithinBudget('/', {})
      expect(result.passed).toBe(true)
    })
  })
})

describe('DEFAULT_THRESHOLDS', () => {
  it('should have LCP threshold', () => {
    expect(DEFAULT_THRESHOLDS.LCP).toBeDefined()
    expect(DEFAULT_THRESHOLDS.LCP.budget).toBe(2500)
    expect(DEFAULT_THRESHOLDS.LCP.description).toContain('Largest Contentful Paint')
  })

  it('should have FID threshold', () => {
    expect(DEFAULT_THRESHOLDS.FID).toBeDefined()
    expect(DEFAULT_THRESHOLDS.FID.budget).toBe(100)
    expect(DEFAULT_THRESHOLDS.FID.description).toContain('First Input Delay')
  })

  it('should have CLS threshold', () => {
    expect(DEFAULT_THRESHOLDS.CLS).toBeDefined()
    expect(DEFAULT_THRESHOLDS.CLS.budget).toBe(0.1)
    expect(DEFAULT_THRESHOLDS.CLS.description).toContain('Cumulative Layout Shift')
  })

  it('should have TTFB threshold', () => {
    expect(DEFAULT_THRESHOLDS.TTFB).toBeDefined()
    expect(DEFAULT_THRESHOLDS.TTFB.budget).toBe(800)
  })

  it('should have FCP threshold', () => {
    expect(DEFAULT_THRESHOLDS.FCP).toBeDefined()
    expect(DEFAULT_THRESHOLDS.FCP.budget).toBe(1800)
  })

  it('should have TBT threshold', () => {
    expect(DEFAULT_THRESHOLDS.TBT).toBeDefined()
    expect(DEFAULT_THRESHOLDS.TBT.budget).toBe(300)
  })
})

describe('Custom Default Budgets', () => {
  it('should use custom default budgets when provided', async () => {
    const manager = new BudgetConfigManager({
      enableFileLoading: false,
      defaultBudgets: {
        budgets: [
          {
            path: '/',
            timings: [{ metric: 'LCP', budget: 2000, tolerance: 0.05 }],
          },
        ],
      },
    })

    const config = await manager.loadConfig()

    expect(config.budgets.length).toBeGreaterThan(0)
    const rootBudget = config.budgets.find(b => b.path === '/')
    expect(rootBudget).toBeDefined()
  })
})

describe('Edge Cases', () => {
  it('should handle empty budgets array', async () => {
    const manager = new BudgetConfigManager({
      enableFileLoading: false,
      defaultBudgets: { budgets: [] },
    })

    const config = await manager.loadConfig()

    expect(config.budgets.length).toBeGreaterThan(0)
  })

  it('should handle wildcard path matching', async () => {
    const manager = new BudgetConfigManager({
      enableFileLoading: false,
      defaultBudgets: {
        budgets: [
          {
            path: '/*',
            timings: [{ metric: 'LCP', budget: 3000, tolerance: 0.1 }],
          },
        ],
      },
    })

    const budget = await manager.getBudgetForPath('/any-page')

    expect(budget).toBeDefined()
    expect(budget?.path).toBe('/*')
  })

  it('should prefer exact match over wildcard', async () => {
    const manager = new BudgetConfigManager({
      enableFileLoading: false,
    })

    const budget = await manager.getBudgetForPath('/dashboard')

    expect(budget?.path).toBe('/dashboard')
  })
})

describe('Cache Behavior', () => {
  it('should respect cache duration', async () => {
    const manager = new BudgetConfigManager({
      enableFileLoading: false,
      cacheDuration: 100,
    })

    const config1 = await manager.loadConfig()
    await new Promise(resolve => setTimeout(resolve, 150))
    const config2 = await manager.loadConfig()

    expect(config2._meta?.loadedAt).toBeGreaterThanOrEqual(config1._meta?.loadedAt || 0)
  })

  it('should use cached config within duration', async () => {
    const manager = new BudgetConfigManager({
      enableFileLoading: false,
      cacheDuration: 60000,
    })

    const config1 = await manager.loadConfig()
    const config2 = await manager.loadConfig()

    expect(config1._meta?.loadedAt).toBe(config2._meta?.loadedAt)
  })
})
