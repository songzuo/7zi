/**
 * Web Vitals Monitoring
 * Web Vitals 核心指标监控 (LCP, FID, CLS, INP)
 */

import { onCLS, onFCP, onLCP, onTTFB, onINP, Metric } from 'web-vitals';
import { monitor } from '../monitoring';

/**
 * Web Vitals 指标类型
 */
export interface WebVitalsMetrics {
  // Core Web Vitals
  LCP?: number; // Largest Contentful Paint - 最大内容绘制
  CLS?: number; // Cumulative Layout Shift - 累积布局偏移
  INP?: number; // Interaction to Next Paint - 交互到下一次绘制的延迟 (replaces FID)

  // Other Web Vitals
  FCP?: number; // First Contentful Paint - 首次内容绘制
  TTFB?: number; // Time to First Byte - 首字节时间
}

/**
 * Web Vitals 配置
 */
export interface WebVitalsConfig {
  enabled: boolean;
  reportThresholds: {
    LCP: number; // 2500ms - good
    CLS: number; // 0.1 - good
    INP: number; // 200ms - good
  };
  trackAllMetrics: boolean; // 是否追踪所有指标
  sendToAnalytics?: (metric: Metric) => void;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: WebVitalsConfig = {
  enabled: true,
  reportThresholds: {
    LCP: 2500,
    CLS: 0.1,
    INP: 200,
  },
  trackAllMetrics: true,
};

/**
 * 获取指标评级
 */
function getRating(value: number, threshold: number, metricName: string): 'good' | 'needs-improvement' | 'poor' {
  if (metricName === 'CLS') {
    // CLS is on a different scale
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  // For other metrics (in ms)
  if (value <= threshold) return 'good';
  if (value <= threshold * 1.5) return 'needs-improvement';
  return 'poor';
}

/**
 * 保存 Web Vitals 指标到监控
 */
async function saveMetric(name: string, value: number, metric: Metric): Promise<void> {
  // 保存原始指标
  await monitor.trackCustomMetric(name, value, metric.rating === 'good' ? 'good' : 'ms', {
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
  });

  // 如果指标不达标，记录警告
  if (metric.rating !== 'good') {
    const displayValue = name === 'CLS' ? value.toFixed(3) : value.toFixed(0);
    const threshold = name === 'CLS' ? DEFAULT_CONFIG.reportThresholds.CLS : undefined;

    await monitor.trackError(
      'WebVitalsWarning',
      `${name} is ${metric.rating}: ${displayValue}ms`,
      undefined,
      {
        metric: name,
        value,
        rating: metric.rating,
        threshold,
      }
    );
  }
}

/**
 * Web Vitals 监控类
 */
export class WebVitalsMonitor {
  private config: WebVitalsConfig;
  private metrics: WebVitalsMetrics = {};
  private isInitialized = false;

  constructor(config: Partial<WebVitalsConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 初始化 Web Vitals 监控
   */
  init(): void {
    if (this.isInitialized || !this.config.enabled || typeof window === 'undefined') {
      return;
    }

    // Core Web Vitals
    onLCP((metric) => this.handleMetric('LCP', metric));
    onCLS((metric) => this.handleMetric('CLS', metric));
    onINP((metric) => this.handleMetric('INP', metric));

    // Other Web Vitals (if enabled)
    if (this.config.trackAllMetrics) {
      onFCP((metric) => this.handleMetric('FCP', metric));
      onTTFB((metric) => this.handleMetric('TTFB', metric));
    }

    this.isInitialized = true;
  }

  /**
   * 处理指标
   */
  private handleMetric(name: keyof WebVitalsMetrics, metric: Metric): void {
    this.metrics[name] = metric.value;

    const threshold = (this.config.reportThresholds as Record<string, number | undefined>)[name];
    if (threshold) {
      const rating = getRating(metric.value, threshold, name);
      metric.rating = rating;
    }

    // 保存到监控
    saveMetric(name, metric.value, metric);

    // 调用自定义分析函数
    if (this.config.sendToAnalytics) {
      this.config.sendToAnalytics(metric);
    }

    // 控制台输出 (仅开发环境)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${name}:`, {
        value: metric.value.toFixed(name === 'CLS' ? 3 : 0),
        rating: metric.rating,
        delta: metric.delta.toFixed(0),
      });
    }
  }

  /**
   * 获取所有指标
   */
  getMetrics(): WebVitalsMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取单个指标
   */
  getMetric(name: keyof WebVitalsMetrics): number | undefined {
    return this.metrics[name];
  }

  /**
   * 检查指标是否达标
   */
  isMetricGood(name: keyof WebVitalsMetrics): boolean {
    const value = this.metrics[name];
    const threshold = (this.config.reportThresholds as Record<string, number | undefined>)[name];
    if (!value || threshold === undefined) return false;
    return getRating(value, threshold, name) === 'good';
  }

  /**
   * 获取整体评分
   */
  getOverallScore(): {
    good: number;
    needsImprovement: number;
    poor: number;
  } {
    const scores = { good: 0, needsImprovement: 0, poor: 0 };

    for (const key of ['LCP', 'CLS', 'INP'] as const) {
      if (this.isMetricGood(key)) {
        scores.good++;
      } else {
        const value = this.metrics[key];
        const threshold = this.config.reportThresholds[key];
        if (value && threshold) {
          const rating = getRating(value, threshold, key);
          if (rating === 'needs-improvement') {
            scores.needsImprovement++;
          } else {
            scores.poor++;
          }
        }
      }
    }

    return scores;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<WebVitalsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 重置指标
   */
  reset(): void {
    this.metrics = {};
  }
}

// 默认实例
export const webVitalsMonitor = new WebVitalsMonitor();

/**
 * 初始化 Web Vitals 监控 (便捷函数)
 */
export function initWebVitalsMonitoring(config?: Partial<WebVitalsConfig>): WebVitalsMonitor {
  if (config) {
    webVitalsMonitor.updateConfig(config);
  }
  webVitalsMonitor.init();
  return webVitalsMonitor;
}

/**
 * 获取 Web Vitals 分数 (0-100)
 */
export function calculateWebVitalsScore(metrics: WebVitalsMetrics): number {
  const scores: number[] = [];

  if (metrics.LCP) {
    // LCP: good ≤ 2500ms, poor ≥ 4000ms
    const score = Math.max(0, Math.min(100, 100 - ((metrics.LCP - 2500) / 1500) * 100));
    scores.push(score);
  }

  if (metrics.CLS) {
    // CLS: good ≤ 0.1, poor ≥ 0.25
    const score = Math.max(0, Math.min(100, 100 - ((metrics.CLS - 0.1) / 0.15) * 100));
    scores.push(score);
  }

  if (metrics.INP) {
    // INP: good ≤ 200ms, poor ≥ 500ms
    const score = Math.max(0, Math.min(100, 100 - ((metrics.INP - 200) / 300) * 100));
    scores.push(score);
  }

  return scores.length > 0
    ? scores.reduce((sum, score) => sum + score, 0) / scores.length
    : 0;
}
