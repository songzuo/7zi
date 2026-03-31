/**
 * Budget Config
 * Load and manage budget configuration with default values and file loading support
 */

import type { BudgetConfig, Budget, TimingBudget, PerformanceMetrics } from './budget-checker';
import { BudgetParser } from './budget-parser';

// ========================================
// Types
// ========================================

interface BudgetConfigOptions {
  /** Path to budget.json file */
  configPath?: string;
  /** Enable/disable config loading from file */
  enableFileLoading?: boolean;
  /** Custom default budgets */
  defaultBudgets?: BudgetConfig;
  /** Cache loaded config for specified duration (ms) */
  cacheDuration?: number;
}

interface BudgetConfigWithMetadata extends BudgetConfig {
  _meta?: {
    loadedAt: number;
    source: 'default' | 'file' | 'custom';
    path?: string;
  };
}

// ========================================
// Constants
// ========================================

/**
 * Default budget configuration based on Core Web Vitals
 */
const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
  budgets: [
    {
      path: '/',
      timings: [
        {
          metric: 'LCP',
          budget: 2500,
          tolerance: 0.1, // 10%
        },
        {
          metric: 'FID',
          budget: 100,
          tolerance: 0.15, // 15%
        },
        {
          metric: 'CLS',
          budget: 0.1,
          tolerance: 0.2, // 20%
        },
        {
          metric: 'TTFB',
          budget: 800,
          tolerance: 0.2, // 20%
        },
        {
          metric: 'FCP',
          budget: 1800,
          tolerance: 0.15, // 15%
        },
      ],
    },
    {
      path: '/dashboard',
      timings: [
        {
          metric: 'LCP',
          budget: 3000,
          tolerance: 0.15, // 15%
        },
        {
          metric: 'TBT',
          budget: 300,
          tolerance: 0.2, // 20%
        },
        {
          metric: 'CLS',
          budget: 0.1,
          tolerance: 0.2, // 20%
        },
      ],
    },
    {
      path: '/tasks',
      timings: [
        {
          metric: 'LCP',
          budget: 2500,
          tolerance: 0.1, // 10%
        },
        {
          metric: 'TBT',
          budget: 200,
          tolerance: 0.15, // 15%
        },
        {
          metric: 'CLS',
          budget: 0.1,
          tolerance: 0.15, // 15%
        },
      ],
    },
  ],
};

/**
 * Default performance budget thresholds
 */
export const DEFAULT_THRESHOLDS: Record<
  'LCP' | 'FID' | 'CLS' | 'TBT' | 'TTFB' | 'FCP',
  { budget: number; tolerance: number; description: string }
> = {
  LCP: {
    budget: 2500,
    tolerance: 0.1,
    description: 'Largest Contentful Paint should be under 2.5s',
  },
  FID: {
    budget: 100,
    tolerance: 0.15,
    description: 'First Input Delay should be under 100ms',
  },
  CLS: {
    budget: 0.1,
    tolerance: 0.2,
    description: 'Cumulative Layout Shift should be under 0.1',
  },
  TBT: {
    budget: 300,
    tolerance: 0.2,
    description: 'Total Blocking Time should be under 300ms',
  },
  TTFB: {
    budget: 800,
    tolerance: 0.2,
    description: 'Time to First Byte should be under 800ms',
  },
  FCP: {
    budget: 1800,
    tolerance: 0.15,
    description: 'First Contentful Paint should be under 1.8s',
  },
};

// ========================================
// Budget Config Manager Class
// ========================================

export class BudgetConfigManager {
  private options: BudgetConfigOptions;
  private cachedConfig: BudgetConfigWithMetadata | null = null;
  private cacheExpiresAt: number = 0;
  private parser: BudgetParser;

  constructor(options: BudgetConfigOptions = {}) {
    this.options = {
      configPath: '/budget.json',
      enableFileLoading: true,
      cacheDuration: 60000, // 1 minute default
      ...options,
    };
    this.parser = new BudgetParser();
  }

  /**
   * Load budget configuration
   * Tries to load from file first, falls back to defaults
   */
  async loadConfig(forceReload: boolean = false): Promise<BudgetConfigWithMetadata> {
    const now = Date.now();

    // Return cached config if available and not expired
    if (!forceReload && this.cachedConfig && now < this.cacheExpiresAt) {
      return this.cachedConfig;
    }

    let config: BudgetConfigWithMetadata;

    // Try loading from file
    if (this.options.enableFileLoading && this.options.configPath) {
      const fileConfig = await this.loadFromFile(this.options.configPath);
      if (fileConfig) {
        config = {
          ...fileConfig,
          _meta: {
            loadedAt: now,
            source: 'file',
            path: this.options.configPath,
          },
        };
      } else {
        config = this.getDefaultConfig(now);
      }
    } else {
      config = this.getDefaultConfig(now);
    }

    // Apply custom defaults override
    if (this.options.defaultBudgets) {
      config = this.mergeWithDefaults(config, this.options.defaultBudgets);
    }

    // Cache the config
    this.cachedConfig = config;
    this.cacheExpiresAt = now + (this.options.cacheDuration || 60000);

    return config;
  }

  /**
   * Load budget configuration from a JSON file
   */
  private async loadFromFile(path: string): Promise<BudgetConfig | null> {
    try {
      // Client-side: fetch from public directory
      if (typeof window !== 'undefined') {
        const response = await fetch(path);
        if (!response.ok) {
          console.warn(`[BudgetConfig] Failed to load ${path}: ${response.status}`);
          return null;
        }
        const jsonString = await response.text();
        const result = this.parser.parse(jsonString);
        if (result.success) {
          return result.config;
        } else {
          console.warn('[BudgetConfig] File validation errors:', result.errors);
          return null;
        }
      }

      // Server-side: read from file system
      if (typeof require === 'function') {
        try {
          const fs = require('fs');
          const jsonString = fs.readFileSync(path, 'utf-8');
          const result = this.parser.parse(jsonString);
          if (result.success) {
            return result.config;
          } else {
            console.warn('[BudgetConfig] File validation errors:', result.errors);
            return null;
          }
        } catch (e) {
          // File doesn't exist or can't be read
          console.warn(`[BudgetConfig] Cannot read file ${path}:`, e);
          return null;
        }
      }

      return null;
    } catch (_error) {
      console.error(`[BudgetConfig] Error loading file ${path}:`, error);
      return null;
    }
  }

  /**
   * Get default budget configuration
   */
  private getDefaultConfig(loadedAt: number = Date.now()): BudgetConfigWithMetadata {
    return {
      ...DEFAULT_BUDGET_CONFIG,
      _meta: {
        loadedAt,
        source: 'default',
      },
    };
  }

  /**
   * Merge config with defaults (defaults take precedence)
   */
  private mergeWithDefaults(
    config: BudgetConfigWithMetadata,
    defaults: BudgetConfig
  ): BudgetConfigWithMetadata {
    // Start with default budgets
    const mergedBudgets = [...defaults.budgets.map(b => ({ ...b }))];

    // Override/add budgets from config
    for (const budget of config.budgets) {
      const existingIndex = mergedBudgets.findIndex((b) => b.path === budget.path);
      if (existingIndex >= 0) {
        // Merge timings for existing budget
        const existing = mergedBudgets[existingIndex];
        const mergedTimings = [...budget.timings];
        for (const defaultTiming of defaults.budgets
          .find((b) => b.path === budget.path)?.timings || []) {
          const existingTiming = mergedTimings.find((t) => t.metric === defaultTiming.metric);
          if (!existingTiming) {
            mergedTimings.push(defaultTiming);
          }
        }
        mergedBudgets[existingIndex] = {
          ...budget,
          timings: mergedTimings,
        };
      } else {
        // Add new budget
        mergedBudgets.push({ ...budget });
      }
    }

    return {
      budgets: mergedBudgets,
      _meta: config._meta,
    };
  }

  /**
   * Get budget for a specific page path
   */
  async getBudgetForPath(path: string): Promise<Budget | null> {
    const config = await this.loadConfig();
    return this.findBudget(path, config);
  }

  /**
   * Find budget for a path (supports wildcards)
   */
  private findBudget(path: string, config: BudgetConfig): Budget | null {
    // Normalize path
    const normalizedPath = path.endsWith('/') && path.length > 1
      ? path.slice(0, -1)
      : path;

    // Try exact match first
    const exactMatch = config.budgets.find((b) => {
      const normalizedBudgetPath = b.path.endsWith('/') && b.path.length > 1
        ? b.path.slice(0, -1)
        : b.path;
      return normalizedBudgetPath === normalizedPath;
    });

    if (exactMatch) {
      return exactMatch;
    }

    // Try wildcard match
    const wildcardMatch = config.budgets.find((b) => {
      if (!b.path.includes('*')) return false;

      const pattern = b.path
        .replace(/\*/g, '.*')
        .replace(/\//g, '\\/');

      const regex = new RegExp(`^${pattern}$`);
      return regex.test(normalizedPath);
    });

    if (wildcardMatch) {
      return wildcardMatch;
    }

    // Try default ('/*' or '*')
    const defaultMatch = config.budgets.find((b) => b.path === '/*' || b.path === '*');
    if (defaultMatch) {
      return defaultMatch;
    }

    return null;
  }

  /**
   * Get all budget thresholds for a metric
   */
  async getThresholdsForMetric(metric: keyof typeof DEFAULT_THRESHOLDS): Promise<{
    budget: number;
    tolerance: number;
    description: string;
  } | null> {
    const config = await this.loadConfig();
    const budget = await this.getBudgetForPath('/'); // Use root budget as reference

    if (!budget) {
      return DEFAULT_THRESHOLDS[metric] || null;
    }

    const timing = budget.timings.find((t) => t.metric === metric);
    if (timing) {
      return {
        budget: timing.budget,
        tolerance: timing.tolerance,
        description: DEFAULT_THRESHOLDS[metric]?.description || `${metric} threshold`,
      };
    }

    return DEFAULT_THRESHOLDS[metric] || null;
  }

  /**
   * Get default threshold values
   */
  getDefaultThresholds(): typeof DEFAULT_THRESHOLDS {
    return { ...DEFAULT_THRESHOLDS };
  }

  /**
   * Validate current configuration
   */
  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const config = await this.loadConfig();
    const result = this.parser.parseObject(config);
    return {
      valid: result.success,
      errors: result.errors,
    };
  }

  /**
   * Clear cached configuration
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.cacheExpiresAt = 0;
  }

  /**
   * Set cache duration
   */
  setCacheDuration(durationMs: number): void {
    this.options.cacheDuration = durationMs;
    this.clearCache();
  }

  /**
   * Export configuration as JSON string
   */
  async exportToJson(pretty: boolean = true): Promise<string> {
    const config = await this.loadConfig();
    const exportData: BudgetConfig = {
      budgets: config.budgets,
    };
    return JSON.stringify(exportData, null, pretty ? 2 : 0);
  }

  /**
   * Get configuration metadata
   */
  getMetadata(): { source: string; loadedAt?: number; path?: string } {
    if (!this.cachedConfig || !this.cachedConfig._meta) {
      return { source: 'none' };
    }
    return {
      source: this.cachedConfig._meta.source,
      loadedAt: this.cachedConfig._meta.loadedAt,
      path: this.cachedConfig._meta.path,
    };
  }
}

// ========================================
// Export singleton instance
// ========================================

export const budgetConfig = new BudgetConfigManager();

// ========================================
// Utility Functions
// ========================================

/**
 * Load budget configuration (convenience function)
 */
export async function loadBudgetConfig(
  options?: BudgetConfigOptions
): Promise<BudgetConfigWithMetadata> {
  const manager = new BudgetConfigManager(options);
  return manager.loadConfig();
}

/**
 * Get budget thresholds for a metric (convenience function)
 */
export async function getBudgetThresholds(
  metric: keyof typeof DEFAULT_THRESHOLDS,
  options?: BudgetConfigOptions
): Promise<{ budget: number; tolerance: number; description: string } | null> {
  const manager = new BudgetConfigManager(options);
  return manager.getThresholdsForMetric(metric);
}

/**
 * Check if metrics are within budget (convenience function)
 */
export async function checkMetricsWithinBudget(
  page: string,
  metrics: PerformanceMetrics,
  options?: BudgetConfigOptions
): Promise<{ passed: boolean; violations: Array<{ metric: string; actual: number; budget: number; percentOver: number }> }> {
  const manager = new BudgetConfigManager(options);
  const budget = await manager.getBudgetForPath(page);

  if (!budget) {
    return { passed: true, violations: [] };
  }

  const violations: Array<{
    metric: string;
    actual: number;
    budget: number;
    percentOver: number;
  }> = [];

  for (const timing of budget.timings) {
    const metricValue = metrics[timing.metric];
    if (metricValue === undefined || metricValue === null) {
      continue;
    }

    const threshold = timing.budget * (1 + timing.tolerance);
    if (metricValue > threshold) {
      const percentOver = ((metricValue - threshold) / threshold) * 100;
      violations.push({
        metric: timing.metric,
        actual: metricValue,
        budget: timing.budget,
        percentOver,
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  };
}

// ========================================
// Exports
// ========================================

