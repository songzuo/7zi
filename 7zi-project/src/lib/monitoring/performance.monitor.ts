/**
 * Enhanced Performance Monitoring System
 * 增强版性能监控系统
 * 
 * 功能：
 * - Core Web Vitals 收集与上报
 * - 自定义性能指标
 * - 告警机制
 * - Sentry 集成
 * - 批量上报
 */

import * as Sentry from '@sentry/nextjs';
import {
  CORE_WEB_VITALS_THRESHOLDS,
  CUSTOM_METRICS_CONFIG,
  ALERT_CONFIG,
  REPORTING_CONFIG,
  getMetricRating,
  shouldReport,
  type MetricRating,
  type AlertLevel,
} from './performance.config';

// ============================================
// 类型定义
// ============================================

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: MetricRating;
  timestamp: number;
  id: string;
  navigationType?: string;
  route?: string;
  metadata?: Record<string, unknown>;
}

export interface CustomMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: 'resource' | 'api' | 'navigation' | 'rendering' | 'memory';
  metadata?: Record<string, unknown>;
}

export interface PerformanceAlert {
  level: AlertLevel;
  metricName: string;
  value: number;
  threshold: number;
  message: string;
  timestamp: number;
  route?: string;
}

type MetricCallback = (metric: PerformanceMetric) => void;
type AlertCallback = (alert: PerformanceAlert) => void;

// ============================================
// 性能指标收集器
// ============================================

class PerformanceCollector {
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private customMetrics: CustomMetric[] = [];
  private callbacks: MetricCallback[] = [];
  private alertCallbacks: AlertCallback[] = [];
  private isInitialized = false;
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMetrics: PerformanceMetric[] = [];

  /**
   * 初始化性能监控
   */
  async init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 初始化 Core Web Vitals 监控
    await this.initWebVitals();
    
    // 初始化自定义指标监控
    this.initCustomMetrics();
    
    // 初始化批量上报
    if (REPORTING_CONFIG.batch.enabled) {
      this.initBatchReporting();
    }

    // 开发环境显示实时监控
    if (process.env.NODE_ENV === 'development') {
      this.initDevTools();
    }
  }

  /**
   * 初始化 Core Web Vitals
   */
  private async initWebVitals() {
    const webVitals = await import('web-vitals');
    const { onLCP, onCLS, onTTFB, onFCP, onINP } = webVitals;

    const handleMetric = (name: string) => (metric: { value: number; id: string; navigationType?: string }) => {
      const rating = getMetricRating(name, metric.value);
      const perfMetric: PerformanceMetric = {
        name,
        value: metric.value,
        rating,
        timestamp: Date.now(),
        id: metric.id,
        navigationType: metric.navigationType,
        route: window.location.pathname,
      };

      this.recordMetric(perfMetric);
      this.checkAlerts(perfMetric);
      this.notifyCallbacks(perfMetric);
    };

    // 注册所有 Core Web Vitals 监听器
    onLCP(handleMetric('LCP'));
    onCLS(handleMetric('CLS'));
    onTTFB(handleMetric('TTFB'));
    onFCP(handleMetric('FCP'));
    onINP(handleMetric('INP'));
  }

  /**
   * 初始化自定义指标监控
   */
  private initCustomMetrics() {
    // 长任务监控
    this.observeLongTasks();
    
    // 资源加载监控
    this.observeResourceTiming();
    
    // 内存监控
    this.observeMemory();
    
    // 路由切换监控
    this.observeNavigation();
  }

  /**
   * 长任务监控
   */
  private observeLongTasks() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const config = CUSTOM_METRICS_CONFIG.longTasks;
        
        entries.forEach((entry) => {
          if (entry.duration > config.threshold) {
            const metric: CustomMetric = {
              name: 'longTask',
              value: entry.duration,
              unit: 'ms',
              timestamp: Date.now(),
              category: 'rendering',
              metadata: {
                startTime: entry.startTime,
                name: entry.name,
              },
            };
            
            this.recordCustomMetric(metric);
            
            // 检查告警
            if (entry.duration > config.critical.duration) {
              this.triggerAlert({
                level: 'critical',
                metricName: 'longTask',
                value: entry.duration,
                threshold: config.critical.duration,
                message: `Long task detected: ${entry.duration.toFixed(0)}ms`,
                timestamp: Date.now(),
                route: window.location.pathname,
              });
            } else if (entry.duration > config.warning.duration) {
              this.triggerAlert({
                level: 'warning',
                metricName: 'longTask',
                value: entry.duration,
                threshold: config.warning.duration,
                message: `Long task warning: ${entry.duration.toFixed(0)}ms`,
                timestamp: Date.now(),
                route: window.location.pathname,
              });
            }
          }
        });
      });

      observer.observe({ type: 'longtask', buffered: true });
    } catch {
      // Long Task API 不支持
    }
  }

  /**
   * 资源加载监控
   */
  private observeResourceTiming() {
    if (!('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            const resourceType = this.getResourceType(resourceEntry.name);
            const config = CUSTOM_METRICS_CONFIG.resources[`${resourceType}LoadTime` as keyof typeof CUSTOM_METRICS_CONFIG.resources];
            
            if (config) {
              const metric: CustomMetric = {
                name: `${resourceType}Load`,
                value: resourceEntry.duration,
                unit: 'ms',
                timestamp: Date.now(),
                category: 'resource',
                metadata: {
                  url: resourceEntry.name,
                  size: resourceEntry.transferSize,
                  cached: resourceEntry.transferSize === 0,
                },
              };
              
              this.recordCustomMetric(metric);
            }
          }
        });
      });

      observer.observe({ type: 'resource', buffered: true });
    } catch (_e) {
      // Resource Timing API 不支持
    }
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    if (url.match(/\.js($|\?)/)) return 'js';
    if (url.match(/\.css($|\?)/)) return 'css';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)($|\?)/i)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf|eot)($|\?)/i)) return 'font';
    if (url.match(/\/api\//)) return 'api';
    return 'other';
  }

  /**
   * 内存监控
   */
  private observeMemory() {
    if (!('performance' in window) || !('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
      if (!memory) return;

      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      const config = CUSTOM_METRICS_CONFIG.memory.heapSize;

      const metric: CustomMetric = {
        name: 'heapSize',
        value: usedMB,
        unit: 'MB',
        timestamp: Date.now(),
        category: 'memory',
        metadata: {
          total: memory.totalJSHeapSize / (1024 * 1024),
        },
      };

      this.recordCustomMetric(metric);

      // 检查告警
      if (usedMB > config.critical) {
        this.triggerAlert({
          level: 'critical',
          metricName: 'heapSize',
          value: usedMB,
          threshold: config.critical,
          message: `High memory usage: ${usedMB.toFixed(1)}MB`,
          timestamp: Date.now(),
          route: window.location.pathname,
        });
      }
    };

    // 定期检查内存
    setInterval(checkMemory, 30000);
    checkMemory();
  }

  /**
   * 路由切换监控
   */
  private observeNavigation() {
    // 使用 Performance API 监听路由切换
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;

              const metric: CustomMetric = {
                name: 'pageLoad',
                value: navEntry.loadEventEnd - navEntry.startTime,
                unit: 'ms',
                timestamp: Date.now(),
                category: 'navigation',
                metadata: {
                  domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.startTime,
                  type: navEntry.type,
                },
              };

              this.recordCustomMetric(metric);
            }
          });
        });

        observer.observe({ type: 'navigation', buffered: true });
      } catch (_e) {
        // Navigation Timing API 不支持
      }
    }
  }

  /**
   * 记录指标
   */
  private recordMetric(metric: PerformanceMetric) {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    
    this.metrics.get(metric.name)!.push(metric);

    // 添加到待上报队列
    if (shouldReport(REPORTING_CONFIG.sentry.webVitalsSampleRate)) {
      this.pendingMetrics.push(metric);
    }

    // 上报到 Sentry
    this.reportToSentry(metric);
  }

  /**
   * 记录自定义指标
   */
  private recordCustomMetric(metric: CustomMetric) {
    this.customMetrics.push(metric);

    // 限制存储大小
    if (this.customMetrics.length > 100) {
      this.customMetrics.shift();
    }
  }

  /**
   * 检查告警
   */
  private checkAlerts(metric: PerformanceMetric) {
    const thresholds = CORE_WEB_VITALS_THRESHOLDS[metric.name as keyof typeof CORE_WEB_VITALS_THRESHOLDS];
    if (!thresholds) return;

    if (metric.rating === 'poor') {
      this.triggerAlert({
        level: 'critical',
        metricName: metric.name,
        value: metric.value,
        threshold: thresholds.poor,
        message: `Poor ${metric.name}: ${metric.value}${thresholds.unit}`,
        timestamp: Date.now(),
        route: metric.route,
      });
    } else if (metric.rating === 'needs-improvement') {
      this.triggerAlert({
        level: 'warning',
        metricName: metric.name,
        value: metric.value,
        threshold: thresholds.good,
        message: `${metric.name} needs improvement: ${metric.value}${thresholds.unit}`,
        timestamp: Date.now(),
        route: metric.route,
      });
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(alert: PerformanceAlert) {
    // 通知所有告警回调
    this.alertCallbacks.forEach((cb) => cb(alert));

    // 控制台输出 - 仅输出警告和严重级别的告警
    if (ALERT_CONFIG.channels.console.enabled && alert.level !== 'info') {
      const levelConfig = ALERT_CONFIG.levels[alert.level];
      if (alert.level === 'critical') {
        console.error(`${levelConfig.emoji} ${alert.message}`, alert);
      } else if (alert.level === 'warning') {
        console.warn(`${levelConfig.emoji} ${alert.message}`, alert);
      }
    }

    // 发送到 Sentry
    if (ALERT_CONFIG.channels.sentry.enabled && alert.level !== 'info') {
      Sentry.captureMessage(alert.message, {
        level: alert.level === 'critical' ? 'error' : 'warning',
        tags: {
          metric: alert.metricName,
          route: alert.route || 'unknown',
          ...ALERT_CONFIG.channels.sentry.tags,
        },
        extra: {
          value: alert.value,
          threshold: alert.threshold,
        },
      });
    }

    // 发送到 Slack（如果配置）
    if (ALERT_CONFIG.channels.slack.enabled && alert.level === 'critical') {
      this.sendSlackAlert(alert);
    }
  }

  /**
   * 发送 Slack 告警
   */
  private async sendSlackAlert(alert: PerformanceAlert) {
    const webhookUrl = ALERT_CONFIG.channels.slack.webhookUrl;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${ALERT_CONFIG.levels[alert.level].emoji} Performance Alert`,
          attachments: [{
            color: ALERT_CONFIG.levels[alert.level].color,
            fields: [
              { title: 'Metric', value: alert.metricName, short: true },
              { title: 'Value', value: `${alert.value}`, short: true },
              { title: 'Threshold', value: `${alert.threshold}`, short: true },
              { title: 'Route', value: alert.route || 'unknown', short: true },
              { title: 'Message', value: alert.message, short: false },
            ],
          }],
        }),
      });
    } catch (e) {
      console.error('[Performance] Failed to send Slack alert:', e);
    }
  }

  /**
   * 上报到 Sentry
   */
  private reportToSentry(metric: PerformanceMetric) {
    if (!REPORTING_CONFIG.sentry.enabled) return;

    // 添加到 Sentry 的性能指标
    // 使用 setMeasurement API（Sentry v8+）
    try {
      Sentry.setMeasurement?.(
        `web_vitals_${metric.name.toLowerCase()}`,
        metric.value,
        'millisecond'
      );
    } catch {
      // Sentry measurement API 不可用
    }
  }

  /**
   * 初始化批量上报
   */
  private initBatchReporting() {
    const flush = () => {
      if (this.pendingMetrics.length === 0) return;

      // 批量上报到 Sentry
      this.pendingMetrics.forEach((metric) => {
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `${metric.name}: ${metric.value} (${metric.rating})`,
          level: metric.rating === 'poor' ? 'error' : metric.rating === 'needs-improvement' ? 'warning' : 'info',
          data: {
            value: metric.value,
            rating: metric.rating,
            route: metric.route,
          },
        });
      });

      this.pendingMetrics = [];
    };

    // 定期刷新
    this.batchTimer = setInterval(flush, REPORTING_CONFIG.batch.maxWaitMs);

    // 页面卸载时刷新
    window.addEventListener('beforeunload', flush);
  }

  /**
   * 初始化开发者工具
   */
  private initDevTools() {
    // 暴露全局 API
    (window as Window & { __PERF__?: PerformanceCollector }).__PERF__ = this;
  }

  /**
   * 注册指标回调
   */
  onMetric(callback: MetricCallback) {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * 注册告警回调
   */
  onAlert(callback: AlertCallback) {
    this.alertCallbacks.push(callback);
    return () => {
      this.alertCallbacks = this.alertCallbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * 通知所有回调
   */
  private notifyCallbacks(metric: PerformanceMetric) {
    this.callbacks.forEach((cb) => {
      try {
        cb(metric);
      } catch (e) {
        console.error('[Performance] Callback error:', e);
      }
    });
  }

  /**
   * 获取所有指标
   */
  getMetrics(): Map<string, PerformanceMetric[]> {
    return this.metrics;
  }

  /**
   * 获取自定义指标
   */
  getCustomMetrics(): CustomMetric[] {
    return this.customMetrics;
  }

  /**
   * 获取指标摘要
   */
  getSummary(): Record<string, { value: number; rating: MetricRating; count: number }> {
    const summary: Record<string, { value: number; rating: MetricRating; count: number }> = {};

    this.metrics.forEach((metrics, name) => {
      const latest = metrics[metrics.length - 1];
      if (latest) {
        summary[name] = {
          value: latest.value,
          rating: latest.rating,
          count: metrics.length,
        };
      }
    });

    return summary;
  }

  /**
   * 清除所有指标
   */
  clear() {
    this.metrics.clear();
    this.customMetrics = [];
    this.pendingMetrics = [];
  }

  /**
   * 销毁
   */
  destroy() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    this.clear();
    this.callbacks = [];
    this.alertCallbacks = [];
    this.isInitialized = false;
  }
}

// ============================================
// 单例导出
// ============================================

export const performanceCollector = new PerformanceCollector();

// ============================================
// 便捷函数
// ============================================

/**
 * 初始化性能监控
 */
export function initPerformanceMonitoring() {
  return performanceCollector.init();
}

/**
 * 手动记录自定义指标
 */
export function recordCustomMetric(
  name: string,
  value: number,
  category: CustomMetric['category'],
  metadata?: Record<string, unknown>
) {
  const metric: CustomMetric = {
    name,
    value,
    unit: 'ms',
    timestamp: Date.now(),
    category,
    metadata,
  };
  
  performanceCollector['recordCustomMetric'](metric);
}

/**
 * 获取性能摘要
 */
export function getPerformanceSummary() {
  return performanceCollector.getSummary();
}

/**
 * 监听性能指标
 */
export function onPerformanceMetric(callback: MetricCallback) {
  return performanceCollector.onMetric(callback);
}

/**
 * 监听性能告警
 */
export function onPerformanceAlert(callback: AlertCallback) {
  return performanceCollector.onAlert(callback);
}

/**
 * API 性能追踪装饰器
 */
export function trackApiPerformance(apiName: string) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: unknown[]) => Promise<unknown>>
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      const start = performance.now();
      
      try {
        const result = await originalMethod?.apply(this, args);
        const duration = performance.now() - start;
        
        recordCustomMetric(`api.${apiName}`, duration, 'api', {
          success: true,
        });
        
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        
        recordCustomMetric(`api.${apiName}`, duration, 'api', {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        throw error;
      }
    };
    
    return descriptor;
  };
}

/**
 * 组件渲染性能追踪
 */
export function trackRenderPerformance(componentName: string) {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      recordCustomMetric(`render.${componentName}`, duration, 'rendering');
      
      const config = CUSTOM_METRICS_CONFIG.rendering.componentRenderTime;
      if (duration > config.critical) {
        console.warn(`[Performance] Slow render: ${componentName} took ${duration.toFixed(0)}ms`);
      }
    },
  };
}
