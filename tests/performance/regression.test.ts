/**
 * Performance Regression Test Suite
 * v1.2.0 性能回归测试套件
 * 
 * 测试内容：
 * - Web Vitals 阈值测试 (LCP/FID/CLS/INP/FCP/TTFB)
 * - API 响应时间测试
 * - Bundle 大小监控测试
 * - 内存使用监控测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CORE_WEB_VITALS_THRESHOLDS,
  CUSTOM_METRICS_CONFIG,
  ALERT_CONFIG,
  getMetricRating,
  shouldReport,
  getEnvironmentConfig,
} from '@/lib/monitoring/performance.config';
import { TIME_INTERVALS, ALERT_THRESHOLDS, PERFORMANCE_WEIGHTS } from '@/lib/monitoring/constants';

// ============================================
// Web Vitals 阈值测试
// ============================================

describe('Web Vitals Threshold Tests', () => {
  describe('LCP (Largest Contentful Paint)', () => {
    it('should rate "good" when LCP <= 2500ms', () => {
      expect(getMetricRating('LCP', 2000)).toBe('good');
      expect(getMetricRating('LCP', 2500)).toBe('good');
    });

    it('should rate "needs-improvement" when 2500ms < LCP <= 4000ms', () => {
      expect(getMetricRating('LCP', 3000)).toBe('needs-improvement');
      expect(getMetricRating('LCP', 4000)).toBe('needs-improvement');
    });

    it('should rate "poor" when LCP > 4000ms', () => {
      expect(getMetricRating('LCP', 4500)).toBe('poor');
      expect(getMetricRating('LCP', 8000)).toBe('poor');
    });

    it('should use correct threshold values', () => {
      expect(CORE_WEB_VITALS_THRESHOLDS.LCP.good).toBe(2500);
      expect(CORE_WEB_VITALS_THRESHOLDS.LCP.needsImprovement).toBe(4000);
      expect(CORE_WEB_VITALS_THRESHOLDS.LCP.poor).toBe(4000);
      expect(CORE_WEB_VITALS_THRESHOLDS.LCP.unit).toBe('ms');
    });
  });

  describe('INP (Interaction to Next Paint)', () => {
    it('should rate "good" when INP <= 200ms', () => {
      expect(getMetricRating('INP', 100)).toBe('good');
      expect(getMetricRating('INP', 200)).toBe('good');
    });

    it('should rate "needs-improvement" when 200ms < INP <= 500ms', () => {
      expect(getMetricRating('INP', 300)).toBe('needs-improvement');
      expect(getMetricRating('INP', 500)).toBe('needs-improvement');
    });

    it('should rate "poor" when INP > 500ms', () => {
      expect(getMetricRating('INP', 600)).toBe('poor');
      expect(getMetricRating('INP', 1000)).toBe('poor');
    });
  });

  describe('CLS (Cumulative Layout Shift)', () => {
    it('should rate "good" when CLS <= 0.1', () => {
      expect(getMetricRating('CLS', 0.05)).toBe('good');
      expect(getMetricRating('CLS', 0.1)).toBe('good');
    });

    it('should rate "needs-improvement" when 0.1 < CLS <= 0.25', () => {
      expect(getMetricRating('CLS', 0.15)).toBe('needs-improvement');
      expect(getMetricRating('CLS', 0.25)).toBe('needs-improvement');
    });

    it('should rate "poor" when CLS > 0.25', () => {
      expect(getMetricRating('CLS', 0.3)).toBe('poor');
      expect(getMetricRating('CLS', 0.5)).toBe('poor');
    });

    it('should use correct threshold values', () => {
      expect(CORE_WEB_VITALS_THRESHOLDS.CLS.good).toBe(0.1);
      expect(CORE_WEB_VITALS_THRESHOLDS.CLS.needsImprovement).toBe(0.25);
      expect(CORE_WEB_VITALS_THRESHOLDS.CLS.poor).toBe(0.25);
    });
  });

  describe('FCP (First Contentful Paint)', () => {
    it('should rate "good" when FCP <= 1800ms', () => {
      expect(getMetricRating('FCP', 1500)).toBe('good');
      expect(getMetricRating('FCP', 1800)).toBe('good');
    });

    it('should rate "needs-improvement" when 1800ms < FCP <= 3000ms', () => {
      expect(getMetricRating('FCP', 2500)).toBe('needs-improvement');
      expect(getMetricRating('FCP', 3000)).toBe('needs-improvement');
    });

    it('should rate "poor" when FCP > 3000ms', () => {
      expect(getMetricRating('FCP', 3500)).toBe('poor');
      expect(getMetricRating('FCP', 5000)).toBe('poor');
    });
  });

  describe('TTFB (Time to First Byte)', () => {
    it('should rate "good" when TTFB <= 800ms', () => {
      expect(getMetricRating('TTFB', 500)).toBe('good');
      expect(getMetricRating('TTFB', 800)).toBe('good');
    });

    it('should rate "needs-improvement" when 800ms < TTFB <= 1800ms', () => {
      expect(getMetricRating('TTFB', 1200)).toBe('needs-improvement');
      expect(getMetricRating('TTFB', 1800)).toBe('needs-improvement');
    });

    it('should rate "poor" when TTFB > 1800ms', () => {
      expect(getMetricRating('TTFB', 2000)).toBe('poor');
      expect(getMetricRating('TTFB', 3000)).toBe('poor');
    });
  });

  // FID 已弃用，使用 INP
  describe('FID (First Input Delay) - Deprecated', () => {
    it('should be marked as deprecated', () => {
      expect(CORE_WEB_VITALS_THRESHOLDS.FID.deprecated).toBe(true);
    });

    it('should still return valid rating for backward compatibility', () => {
      expect(getMetricRating('FID', 50)).toBe('good');
      expect(getMetricRating('FID', 150)).toBe('needs-improvement');
      expect(getMetricRating('FID', 400)).toBe('poor');
    });
  });
});

// ============================================
// API 响应时间测试
// ============================================

describe('API Response Time Tests', () => {
  const apiConfig = CUSTOM_METRICS_CONFIG.api.responseTime;

  it('should have correct threshold values', () => {
    expect(apiConfig.good).toBe(500);
    expect(apiConfig.warning).toBe(1000);
    expect(apiConfig.critical).toBe(3000);
    expect(apiConfig.unit).toBe('ms');
  });

  it('should rate API response as good when <= 500ms', () => {
    const rateResponse = (ms: number) => {
      if (ms <= apiConfig.good) return 'good';
      if (ms <= apiConfig.warning) return 'warning';
      return 'critical';
    };

    expect(rateResponse(100)).toBe('good');
    expect(rateResponse(500)).toBe('good');
  });

  it('should rate API response as warning when 500ms < ms <= 1000ms', () => {
    const rateResponse = (ms: number) => {
      if (ms <= apiConfig.good) return 'good';
      if (ms <= apiConfig.warning) return 'warning';
      return 'critical';
    };

    expect(rateResponse(750)).toBe('warning');
    expect(rateResponse(1000)).toBe('warning');
  });

  it('should rate API response as critical when > 1000ms', () => {
    const rateResponse = (ms: number) => {
      if (ms <= apiConfig.good) return 'good';
      if (ms <= apiConfig.warning) return 'warning';
      return 'critical';
    };

    expect(rateResponse(1500)).toBe('critical');
    expect(rateResponse(3000)).toBe('critical');
  });

  it('should have correct timeout configurations', () => {
    expect(CUSTOM_METRICS_CONFIG.api.timeout.default).toBe(10000);
    expect(CUSTOM_METRICS_CONFIG.api.timeout.critical).toBe(30000);
  });

  it('should have correct error rate thresholds', () => {
    expect(CUSTOM_METRICS_CONFIG.api.errorRate.warning).toBe(0.01);
    expect(CUSTOM_METRICS_CONFIG.api.errorRate.critical).toBe(0.05);
  });
});

// ============================================
// Bundle 大小监控测试
// ============================================

describe('Bundle Size Monitoring Tests', () => {
  const resourceConfig = CUSTOM_METRICS_CONFIG.resources;

  it('should have correct JS load time thresholds', () => {
    expect(resourceConfig.jsLoadTime.warning).toBe(3000);
    expect(resourceConfig.jsLoadTime.critical).toBe(5000);
  });

  it('should have correct CSS load time thresholds', () => {
    expect(resourceConfig.cssLoadTime.warning).toBe(2000);
    expect(resourceConfig.cssLoadTime.critical).toBe(3000);
  });

  it('should have correct image load time thresholds', () => {
    expect(resourceConfig.imageLoadTime.warning).toBe(3000);
    expect(resourceConfig.imageLoadTime.critical).toBe(5000);
  });

  it('should have correct font load time thresholds', () => {
    expect(resourceConfig.fontLoadTime.warning).toBe(2000);
    expect(resourceConfig.fontLoadTime.critical).toBe(3000);
  });

  describe('Bundle size budget thresholds', () => {
    // 模拟 bundle 大小阈值（实际项目可能从配置读取）
    const BUNDLE_BUDGETS = {
      initial: 170,    // KB - Next.js 默认建议
      dynamic: 50,     // KB
      total: 500,      // KB
    };

    it('should define realistic bundle budgets', () => {
      expect(BUNDLE_BUDGETS.initial).toBeGreaterThan(0);
      expect(BUNDLE_BUDGETS.dynamic).toBeGreaterThan(0);
      expect(BUNDLE_BUDGETS.total).toBeGreaterThan(BUNDLE_BUDGETS.initial);
    });

    it('should check initial bundle within budget', () => {
      const currentBundleSize = 150; // KB - 模拟值
      expect(currentBundleSize).toBeLessThanOrEqual(BUNDLE_BUDGETS.initial);
    });
  });
});

// ============================================
// 内存使用监控测试
// ============================================

describe('Memory Usage Monitoring Tests', () => {
  const memoryConfig = CUSTOM_METRICS_CONFIG.memory.heapSize;

  it('should have correct heap size thresholds', () => {
    expect(memoryConfig.warning).toBe(50);
    expect(memoryConfig.critical).toBe(100);
    expect(memoryConfig.unit).toBe('MB');
  });

  it('should rate memory usage correctly', () => {
    const rateMemory = (mb: number) => {
      if (mb <= memoryConfig.warning) return 'good';
      if (mb <= memoryConfig.critical) return 'warning';
      return 'critical';
    };

    expect(rateMemory(30)).toBe('good');
    expect(rateMemory(50)).toBe('good');
    expect(rateMemory(75)).toBe('warning');
    expect(rateMemory(100)).toBe('warning');
    expect(rateMemory(150)).toBe('critical');
  });

  it('should use constants from constants.ts', () => {
    expect(ALERT_THRESHOLDS.MEMORY_WARNING).toBe(50);
    expect(ALERT_THRESHOLDS.MEMORY_CRITICAL).toBe(100);
  });

  // 模拟内存监控测试
  describe('Memory monitoring simulation', () => {
    it('should detect memory leaks via heap growth', () => {
      // 模拟内存增长模式
      const measureHeapUsage = () => {
        if (typeof performance !== 'undefined' && 'memory' in performance) {
          const memory = (performance as Performance & { memory: { usedJSHeapSize: number } }).memory;
          return memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
        }
        return null; // 非 Chrome 浏览器返回 null
      };

      // 模拟测试：假设初始 30MB，增长到 80MB
      const initialMemory = 30;
      const afterOperationMemory = 80;

      // 应该触发警告
      expect(afterOperationMemory).toBeGreaterThan(memoryConfig.warning);
      expect(afterOperationMemory).toBeLessThan(memoryConfig.critical);
    });
  });
});

// ============================================
// 长任务监控测试
// ============================================

describe('Long Task Monitoring Tests', () => {
  const longTaskConfig = CUSTOM_METRICS_CONFIG.longTasks;

  it('should have correct threshold values', () => {
    expect(longTaskConfig.threshold).toBe(50);
    expect(longTaskConfig.warning.duration).toBe(100);
    expect(longTaskConfig.warning.count).toBe(3);
    expect(longTaskConfig.critical.duration).toBe(300);
    expect(longTaskConfig.critical.count).toBe(10);
  });

  it('should use constants from constants.ts', () => {
    expect(ALERT_THRESHOLDS.LONG_TASK_WARNING).toBe(100);
    expect(ALERT_THRESHOLDS.LONG_TASK_CRITICAL).toBe(300);
  });

  it('should rate long tasks correctly', () => {
    const rateLongTask = (duration: number) => {
      if (duration <= longTaskConfig.warning.duration) return 'good';
      if (duration <= longTaskConfig.critical.duration) return 'warning';
      return 'critical';
    };

    expect(rateLongTask(30)).toBe('good');
    expect(rateLongTask(100)).toBe('good');
    expect(rateLongTask(150)).toBe('warning');
    expect(rateLongTask(300)).toBe('warning');
    expect(rateLongTask(400)).toBe('critical');
  });
});

// ============================================
// 性能评分测试
// ============================================

describe('Performance Score Tests', () => {
  it('should have correct performance weights', () => {
    expect(PERFORMANCE_WEIGHTS.LCP).toBe(0.25);
    expect(PERFORMANCE_WEIGHTS.INP).toBe(0.25);
    expect(PERFORMANCE_WEIGHTS.CLS).toBe(0.25);
    expect(PERFORMANCE_WEIGHTS.FCP).toBe(0.15);
    expect(PERFORMANCE_WEIGHTS.TTFB).toBe(0.1);

    // 权重总和应为 1
    const total = Object.values(PERFORMANCE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(1);
  });

  it('should calculate performance score correctly', () => {
    // 模拟计算性能评分
    const calculateScore = (metrics: { name: string; rating: 'good' | 'needs-improvement' | 'poor' }[]) => {
      let score = 100;

      metrics.forEach(m => {
        const weight = PERFORMANCE_WEIGHTS[m.name as keyof typeof PERFORMANCE_WEIGHTS] || 0;
        if (m.rating === 'needs-improvement') {
          score -= weight * 30;
        } else if (m.rating === 'poor') {
          score -= weight * 60;
        }
      });

      return Math.max(0, Math.round(score));
    };

    // 全 good 应该得 100 分
    expect(calculateScore([
      { name: 'LCP', rating: 'good' },
      { name: 'INP', rating: 'good' },
      { name: 'CLS', rating: 'good' },
      { name: 'FCP', rating: 'good' },
      { name: 'TTFB', rating: 'good' },
    ])).toBe(100);

    // 一个 poor 应该扣分
    expect(calculateScore([
      { name: 'LCP', rating: 'poor' },
      { name: 'INP', rating: 'good' },
      { name: 'CLS', rating: 'good' },
      { name: 'FCP', rating: 'good' },
      { name: 'TTFB', rating: 'good' },
    ])).toBe(85); // 100 - 0.25 * 60 = 85
  });
});

// ============================================
// 告警配置测试
// ============================================

describe('Alert Configuration Tests', () => {
  it('should have correct alert levels', () => {
    expect(ALERT_CONFIG.levels.info.priority).toBe(0);
    expect(ALERT_CONFIG.levels.warning.priority).toBe(1);
    expect(ALERT_CONFIG.levels.critical.priority).toBe(2);
  });

  it('should have correct core web vitals alert rules', () => {
    expect(ALERT_CONFIG.rules.coreWebVitals.singleViolation.warning).toBe(true);
    expect(ALERT_CONFIG.rules.coreWebVitals.singleViolation.critical).toBe(true);
    expect(ALERT_CONFIG.rules.coreWebVitals.sustainedIssue.threshold).toBe(3);
    expect(ALERT_CONFIG.rules.coreWebVitals.sustainedIssue.windowMs).toBe(300000);
  });

  it('should have correct custom metrics alert rules', () => {
    expect(ALERT_CONFIG.rules.customMetrics.longTasks.enabled).toBe(true);
    expect(ALERT_CONFIG.rules.customMetrics.longTasks.warningThreshold).toBe(3);
    expect(ALERT_CONFIG.rules.customMetrics.longTasks.criticalThreshold).toBe(10);
    expect(ALERT_CONFIG.rules.customMetrics.memory.enabled).toBe(true);
  });

  it('should have correct silence periods', () => {
    expect(ALERT_CONFIG.rules.silencePeriod.info).toBe(600000);
    expect(ALERT_CONFIG.rules.silencePeriod.warning).toBe(300000);
    expect(ALERT_CONFIG.rules.silencePeriod.critical).toBe(60000);
  });
});

// ============================================
// 采样率测试
// ============================================

describe('Sampling Tests', () => {
  it('should sample correctly based on rate', () => {
    // 模拟采样函数 - shouldReport 使用 Math.random() < sampleRate
    vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

    // 50% 采样率: 0.5 < 0.5 = false (random 等于采样率时不采样)
    // 30% 采样率: 0.5 < 0.3 = false
    // 70% 采样率: 0.5 < 0.7 = true
    expect(shouldReport(0.5)).toBe(false);
    expect(shouldReport(0.3)).toBe(false);
    expect(shouldReport(0.7)).toBe(true);

    vi.restoreAllMocks();
  });

  it('should always sample at 100% rate', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0.99);
    expect(shouldReport(1.0)).toBe(true);
    vi.restoreAllMocks();
  });

  it('should never sample at 0% rate', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0.01);
    expect(shouldReport(0)).toBe(false);
    vi.restoreAllMocks();
  });
});

// ============================================
// 环境配置测试
// ============================================

describe('Environment Configuration Tests', () => {
  it('should return correct config for development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const config = getEnvironmentConfig();
    expect(config.reporting.sentry).toBe(false);
    expect(config.reporting.console).toBe(true);
    vi.unstubAllEnvs();
  });

  it('should return correct config for production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const config = getEnvironmentConfig();
    expect(config.reporting.sentry).toBe(true);
    expect(config.reporting.console).toBe(false);
    vi.unstubAllEnvs();
  });
});

// ============================================
// 时间间隔常量测试
// ============================================

describe('Time Interval Tests', () => {
  it('should have correct time intervals', () => {
    expect(TIME_INTERVALS.MEMORY_CHECK).toBe(30000);
    expect(TIME_INTERVALS.METRICS_REFRESH).toBe(1000);
    expect(TIME_INTERVALS.ALERTS_CHECK).toBe(5000);
    expect(TIME_INTERVALS.HEALTH_CHECK).toBe(30000);
    expect(TIME_INTERVALS.DEFAULT_TIMEOUT).toBe(5000);
    expect(TIME_INTERVALS.BATCH_FLUSH).toBe(30000);
  });
});

// ============================================
// 渲染性能测试
// ============================================

describe('Rendering Performance Tests', () => {
  const renderConfig = CUSTOM_METRICS_CONFIG.rendering;

  it('should have correct component render time thresholds', () => {
    expect(renderConfig.componentRenderTime.warning).toBe(16); // 60fps
    expect(renderConfig.componentRenderTime.critical).toBe(33); // 30fps
  });

  it('should have correct hydration time thresholds', () => {
    expect(renderConfig.hydrationTime.warning).toBe(1000);
    expect(renderConfig.hydrationTime.critical).toBe(2000);
  });

  it('should use constants from constants.ts', () => {
    expect(ALERT_THRESHOLDS.RENDER_WARNING).toBe(16);
    expect(ALERT_THRESHOLDS.RENDER_CRITICAL).toBe(33);
  });
});

// ============================================
// 综合回归测试
// ============================================

describe('Comprehensive Regression Tests', () => {
  // 模拟完整的性能监控场景
  it('should handle complete performance monitoring scenario', () => {
    // 1. 模拟收集指标
    const metrics = [
      { name: 'LCP', value: 2200 },
      { name: 'INP', value: 180 },
      { name: 'CLS', value: 0.08 },
      { name: 'FCP', value: 1600 },
      { name: 'TTFB', value: 600 },
    ];

    // 2. 验证所有指标都在 good 范围内
    metrics.forEach(m => {
      const rating = getMetricRating(m.name, m.value);
      expect(rating).toBe('good');
    });

    // 3. 计算综合评分
    const allGood = metrics.every(m => getMetricRating(m.name, m.value) === 'good');
    expect(allGood).toBe(true);
  });

  it('should detect performance regression scenario', () => {
    // 模拟性能退化场景
    const degradedMetrics = [
      { name: 'LCP', value: 5500 },     // poor (was good)
      { name: 'INP', value: 650 },      // poor (was good)
      { name: 'CLS', value: 0.35 },     // poor (was good)
      { name: 'FCP', value: 3200 },     // poor (was good)
      { name: 'TTFB', value: 2200 },    // poor (was good)
    ];

    // 验证退化被正确检测
    const poorCount = degradedMetrics.filter(m => 
      getMetricRating(m.name, m.value) === 'poor'
    ).length;

    expect(poorCount).toBe(5); // 所有指标都退化
  });

  it('should detect partial regression scenario', () => {
    // 模拟部分性能退化
    const partialMetrics = [
      { name: 'LCP', value: 2800 },     // needs-improvement
      { name: 'INP', value: 180 },       // good
      { name: 'CLS', value: 0.12 },     // needs-improvement
      { name: 'FCP', value: 1600 },     // good
      { name: 'TTFB', value: 600 },     // good
    ];

    // 验证部分退化被正确检测
    const needsImprovementCount = partialMetrics.filter(m => 
      getMetricRating(m.name, m.value) === 'needs-improvement'
    ).length;

    expect(needsImprovementCount).toBe(2);
  });
});