/**
 * Client Performance Monitoring Types
 * 客户端性能监控类型定义
 */

import type { Metric } from 'web-vitals'

export interface WebVitalsMetric {
  id: string
  name: 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB'
  value: number
  delta: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

export interface PerformanceEventData {
  type: 'web-vitals' | 'error' | 'api' | 'custom'
  name: string
  value: number
  timestamp: number
  metadata?: Record<string, unknown>
}

export type PerformanceReporter = (data: PerformanceEventData) => void

export interface ClientMonitoringConfig {
  /**
   * 上报 endpoint
   */
  endpoint?: string
  /**
   * 是否启用调试模式
   */
  debug?: boolean
  /**
   * 是否上报到 Sentry
   */
  reportToSentry?: boolean
  /**
   * 上报前过滤回调
   */
  beforeReport?: (data: PerformanceEventData) => boolean
  /**
   * 自定义 reporter
   */
  reporter?: PerformanceReporter
  /**
   * 采样率 (0-1)
   */
  sampleRate?: number
  /**
   * Core Web Vitals 阈值配置
   */
  thresholds?: {
    lcp?: number // Good: <= 2500ms
    fid?: number // Good: <= 100ms
    cls?: number // Good: <= 0.1
    fcp?: number // Good: <= 1800ms
    ttfb?: number // Good: <= 800ms
    inp?: number // Good: <= 200ms
  }
}

/**
 * Web Vitals 阈值
 */
export interface WebVitalsThresholds {
  lcp: number
  fid: number
  cls: number
  fcp: number
  ttfb: number
  inp: number
}

/**
 * 性能评级
 */
export type PerformanceRating = 'good' | 'needs-improvement' | 'poor'

/**
 * 性能指标
 */
export interface PerformanceMetric {
  name: string
  value: number
  rating: PerformanceRating
  threshold: number
}
