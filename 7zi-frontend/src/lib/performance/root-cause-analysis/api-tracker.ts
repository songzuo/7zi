/**
 * API Tracker
 * API 响应追踪器
 */

import { SlowAPICall } from './types'

export interface APIIssue {
  type:
    | 'timeout'
    | 'slow-response'
    | 'rate-limit'
    | 'server-error'
    | 'client-error'
    | 'large-payload'
    | 'connection-error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  endpoint: string
  method: string
  suggestion: string
  details?: Record<string, any>
}

export interface APIStats {
  count: number
  totalDuration: number
  maxDuration: number
  errorCount: number
  avgDuration: number
  successRate: number
}

export interface APITrackerConfig {
  enabled: boolean
  threshold: number // ms
  maxHistorySize: number
  trackPayloadSize: boolean
  trackRequestDetails: boolean
  endpoints: {
    exclude: string[]
    include?: string[]
  }
}

export const DEFAULT_API_TRACKER_CONFIG: APITrackerConfig = {
  enabled: true,
  threshold: 2000, // 2 秒
  maxHistorySize: 1000,
  trackPayloadSize: true,
  trackRequestDetails: true,
  endpoints: {
    exclude: ['/api/health', '/api/metrics'],
  },
}

/**
 * APITracker - API 调用追踪器
 * 追踪慢 API、分析响应模式、识别常见问题
 */
export class APITracker {
  private config: APITrackerConfig
  private slowApis: SlowAPICall[] = []
  private apiStats: Map<string, APIStats> = new Map()

  constructor(config: Partial<APITrackerConfig> = {}) {
    this.config = { ...DEFAULT_API_TRACKER_CONFIG, ...config }
  }

  /**
   * Track an API call
   * 追踪 API 调用
   */
  trackApiCall(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    metadata?: {
      error?: string
      requestSize?: number
      responseSize?: number
      headers?: Record<string, string>
    }
  ): void {
    if (!this.config.enabled) return

    // 检查是否排除的端点
    if (this.shouldExcludeEndpoint(endpoint)) return

    // 检查是否慢 API
    if (duration > this.config.threshold || statusCode >= 400) {
      this.trackSlowApi(endpoint, method, duration, statusCode, metadata)
    }

    // 更新 API 统计
    this.updateAPIStats(endpoint, method, duration, statusCode)
  }

  /**
   * Track a slow API call
   * 追踪慢 API 调用
   */
  private trackSlowApi(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    metadata?: {
      error?: string
      requestSize?: number
      responseSize?: number
      headers?: Record<string, string>
    }
  ): void {
    const slowApi: SlowAPICall = {
      endpoint,
      method: method.toUpperCase(),
      duration,
      statusCode,
      timestamp: Date.now(),
      error: metadata?.error,
    }

    // 添加到历史记录
    this.slowApis.push(slowApi)

    // 限制历史记录大小
    if (this.slowApis.length > this.config.maxHistorySize) {
      this.slowApis.shift()
    }

    // 识别问题
    const issue = this.identifyAPIIssue(slowApi, metadata)
    // Note: Issue is tracked, alert handling should be done at a higher level
  }

  /**
   * Update API statistics
   * 更新 API 统计
   */
  private updateAPIStats(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number
  ): void {
    const key = `${method.toUpperCase()} ${endpoint}`
    const existing = this.apiStats.get(key) || {
      count: 0,
      totalDuration: 0,
      maxDuration: 0,
      errorCount: 0,
      avgDuration: 0,
      successRate: 100,
    }

    existing.count++
    existing.totalDuration += duration
    existing.maxDuration = Math.max(existing.maxDuration, duration)
    if (statusCode >= 400) {
      existing.errorCount++
    }
    existing.avgDuration = existing.totalDuration / existing.count
    existing.successRate = ((existing.count - existing.errorCount) / existing.count) * 100

    this.apiStats.set(key, existing)
  }

  /**
   * Check if endpoint should be excluded
   * 检查端点是否应该被排除
   */
  private shouldExcludeEndpoint(endpoint: string): boolean {
    // 检查排除列表
    for (const exclude of this.config.endpoints.exclude) {
      if (endpoint.includes(exclude)) {
        return true
      }
    }

    // 检查包含列表（如果配置了）
    if (this.config.endpoints.include && this.config.endpoints.include.length > 0) {
      for (const include of this.config.endpoints.include) {
        if (endpoint.includes(include)) {
          return false
        }
      }
      return true
    }

    return false
  }

  /**
   * Identify API issue
   * 识别 API 问题
   */
  identifyAPIIssue(api: SlowAPICall, metadata?: Record<string, any>): APIIssue | null {
    // 1. 服务器错误 (5xx) - 最高优先级
    if (api.statusCode >= 500) {
      return {
        type: 'server-error',
        severity: 'critical',
        endpoint: api.endpoint,
        method: api.method,
        suggestion:
          'Server error detected. Check server logs, review error handling, and implement retry logic with exponential backoff',
        details: { statusCode: api.statusCode, error: api.error },
      }
    }

    // 2. 速率限制 (429) - 在客户端错误之前检查
    if (api.statusCode === 429) {
      return {
        type: 'rate-limit',
        severity: 'high',
        endpoint: api.endpoint,
        method: api.method,
        suggestion:
          'Rate limit exceeded. Implement request throttling, use caching, and respect Retry-After header',
        details: { statusCode: api.statusCode },
      }
    }

    // 3. 客户端错误 (4xx)
    if (api.statusCode >= 400 && api.statusCode < 500) {
      return {
        type: 'client-error',
        severity: 'high',
        endpoint: api.endpoint,
        method: api.method,
        suggestion: `Client error (${api.statusCode}). Review request parameters, authentication, and permissions`,
        details: { statusCode: api.statusCode, error: api.error },
      }
    }

    // 4. 连接错误
    if (api.error && (api.error.includes('ECONNREFUSED') || api.error.includes('ETIMEDOUT'))) {
      return {
        type: 'connection-error',
        severity: 'critical',
        endpoint: api.endpoint,
        method: api.method,
        suggestion:
          'Connection error detected. Check network connectivity, DNS resolution, and firewall rules',
        details: { error: api.error },
      }
    }

    // 5. 超时
    if (api.duration > 10000) {
      return {
        type: 'timeout',
        severity: 'critical',
        endpoint: api.endpoint,
        method: api.method,
        suggestion:
          'API timeout detected. Review timeout settings, implement circuit breaker pattern, and consider async processing',
        details: { duration: api.duration },
      }
    }

    // 6. 慢响应
    if (api.duration > this.config.threshold) {
      return {
        type: 'slow-response',
        severity: api.duration > this.config.threshold * 3 ? 'high' : 'medium',
        endpoint: api.endpoint,
        method: api.method,
        suggestion:
          'Slow API response. Consider implementing caching, optimizing backend queries, or using pagination',
        details: { duration: api.duration, threshold: this.config.threshold },
      }
    }

    // 7. 大负载
    if (
      this.config.trackPayloadSize &&
      metadata?.responseSize &&
      metadata.responseSize > 1024 * 1024
    ) {
      return {
        type: 'large-payload',
        severity: 'medium',
        endpoint: api.endpoint,
        method: api.method,
        suggestion:
          'Large response payload detected. Implement compression, pagination, or field filtering',
        details: { responseSize: metadata.responseSize },
      }
    }

    return null
  }

  /**
   * Identify issues in multiple API calls
   * 识别多个 API 调用的问题
   */
  identifyAPIIssues(apis: SlowAPICall[]): APIIssue[] {
    const issues: APIIssue[] = []

    for (const api of apis) {
      const issue = this.identifyAPIIssue(api)
      if (issue) {
        issues.push(issue)
      }
    }

    // 按严重程度排序
    return issues.sort((a, b) => {
      const severityScore = (s: string) => ({ critical: 4, high: 3, medium: 2, low: 1 })[s] || 0
      return severityScore(b.severity) - severityScore(a.severity)
    })
  }

  /**
   * Get all tracked slow API issues
   * 获取所有追踪到的慢API问题
   */
  getAllIssues(): APIIssue[] {
    return this.identifyAPIIssues(this.slowApis)
  }

  /**
   * Get slow API calls
   * 获取慢 API 调用列表
   */
  getSlowApis(limit?: number): SlowAPICall[] {
    const apis = [...this.slowApis].sort((a, b) => b.duration - a.duration)
    return limit ? apis.slice(0, limit) : apis
  }

  /**
   * Get API statistics
   * 获取 API 统计
   */
  getAPIStats(): Map<string, APIStats> {
    return new Map(this.apiStats)
  }

  /**
   * Get slowest API calls
   * 获取最慢的 API 调用
   */
  getSlowestApis(count: number = 10): SlowAPICall[] {
    return [...this.slowApis].sort((a, b) => b.duration - a.duration).slice(0, count)
  }

  /**
   * Get API calls by status code
   * 按状态码获取 API 调用
   */
  getAPIsByStatus(): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const api of this.slowApis) {
      const statusClass = `${api.statusCode}`
      counts[statusClass] = (counts[statusClass] || 0) + 1
    }
    return counts
  }

  /**
   * Get API calls by endpoint
   * 按端点获取 API 调用
   */
  getAPIsByEndpoint(): Record<string, { count: number; avgDuration: number }> {
    const endpointStats: Record<string, { count: number; totalDuration: number }> = {}

    for (const api of this.slowApis) {
      const key = `${api.method} ${api.endpoint}`
      if (!endpointStats[key]) {
        endpointStats[key] = { count: 0, totalDuration: 0 }
      }
      endpointStats[key].count++
      endpointStats[key].totalDuration += api.duration
    }

    const result: Record<string, { count: number; avgDuration: number }> = {}
    for (const [key, stats] of Object.entries(endpointStats)) {
      result[key] = {
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count,
      }
    }

    return result
  }

  /**
   * Get error rate
   * 获取错误率
   */
  getErrorRate(): number {
    if (this.slowApis.length === 0) return 0
    const errors = this.slowApis.filter(api => api.statusCode >= 400 || api.error).length
    return (errors / this.slowApis.length) * 100
  }

  /**
   * Get average response time
   * 获取平均响应时间
   */
  getAverageResponseTime(): number {
    if (this.slowApis.length === 0) return 0
    const total = this.slowApis.reduce((sum, api) => sum + api.duration, 0)
    return total / this.slowApis.length
  }

  /**
   * Clear history
   * 清空历史记录
   */
  clearHistory(): void {
    this.slowApis = []
    this.apiStats.clear()
  }

  /**
   * Update configuration
   * 更新配置
   */
  updateConfig(partialConfig: Partial<APITrackerConfig>): void {
    this.config = { ...this.config, ...partialConfig }
  }

  /**
   * Export data for analysis
   * 导出数据用于分析
   */
  exportData(): {
    slowApis: SlowAPICall[]
    apiStats: Record<string, APIStats>
    config: APITrackerConfig
  } {
    const stats: Record<string, APIStats> = {}
    this.apiStats.forEach((value, key) => {
      stats[key] = value
    })

    return {
      slowApis: this.slowApis,
      apiStats: stats,
      config: this.config,
    }
  }

  /**
   * Generate API performance report
   * 生成 API 性能报告
   */
  generateReport(): {
    summary: {
      totalSlowApis: number
      averageResponseTime: number
      errorRate: number
      mostProblematicEndpoints: Array<{ endpoint: string; count: number; avgDuration: number }>
    }
    issues: APIIssue[]
    recommendations: string[]
  } {
    const totalSlowApis = this.slowApis.length
    const averageResponseTime = this.getAverageResponseTime()
    const errorRate = this.getErrorRate()

    // 找出问题最多的端点
    const endpointStats = this.getAPIsByEndpoint()
    const mostProblematicEndpoints = Object.entries(endpointStats)
      .map(([endpoint, stats]) => ({ endpoint, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 识别所有问题
    const issues = this.identifyAPIIssues(this.slowApis)

    // 生成建议
    const recommendations: string[] = []
    if (errorRate > 10) {
      recommendations.push(
        'High error rate detected. Review error handling and implement proper retry logic'
      )
    }
    if (averageResponseTime > 3000) {
      recommendations.push(
        'High average response time. Consider implementing caching or optimizing backend'
      )
    }
    if (issues.some(i => i.type === 'rate-limit')) {
      recommendations.push(
        'Rate limiting issues found. Implement request throttling and respect API limits'
      )
    }
    if (issues.some(i => i.type === 'timeout')) {
      recommendations.push(
        'Timeout issues detected. Review timeout configurations and implement circuit breakers'
      )
    }
    recommendations.push('Monitor API performance trends and set up alerts for anomaly detection')

    return {
      summary: {
        totalSlowApis,
        averageResponseTime,
        errorRate,
        mostProblematicEndpoints,
      },
      issues,
      recommendations,
    }
  }
}

// Export singleton instance
export const apiTracker = new APITracker()
