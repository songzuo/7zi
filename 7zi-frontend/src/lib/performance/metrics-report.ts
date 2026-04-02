/**
 * Metrics Report Generator
 * 指标报告生成器 - 生成文本和 HTML 格式的指标报告
 */

import type {
  PerformanceMetrics,
  SystemMetrics,
  ResponseTimeMetrics,
  ErrorRateMetrics,
  ThroughputMetrics,
  MetricsReportConfig,
  MetricsHealthCheck,
  MetricStatus,
  MetricsHistory,
} from './metrics-types'

/**
 * 默认报告配置
 */
const DEFAULT_REPORT_CONFIG: MetricsReportConfig = {
  format: 'text',
  includeSystem: true,
  includeResponseTime: true,
  includeErrorRate: true,
  includeThroughput: true,
  includeHistory: false,
  historyPoints: 10,
}

/**
 * 指标报告生成器
 */
export class MetricsReportGenerator {
  private config: MetricsReportConfig

  constructor(config: Partial<MetricsReportConfig> = {}) {
    this.config = { ...DEFAULT_REPORT_CONFIG, ...config }
  }

  /**
   * 生成报告
   */
  generate(metrics: PerformanceMetrics, history?: MetricsHistory): string {
    switch (this.config.format) {
      case 'html':
        return this.generateHtmlReport(metrics, history)
      case 'json':
        return this.generateJsonReport(metrics, history)
      case 'text':
      default:
        return this.generateTextReport(metrics, history)
    }
  }

  /**
   * 生成文本格式报告
   */
  generateTextReport(metrics: PerformanceMetrics, history?: MetricsHistory): string {
    const lines: string[] = []

    lines.push('════════════════════════════════════════════════════════════')
    lines.push('                   Performance Metrics Report                ')
    lines.push('                     v' + metrics.version)
    lines.push('════════════════════════════════════════════════════════════')
    lines.push('')
    lines.push(`Generated: ${this.formatTimestamp(metrics.timestamp)}`)
    lines.push('')

    if (this.config.includeSystem) {
      lines.push(this.generateSystemSectionText(metrics.system))
    }

    if (this.config.includeResponseTime) {
      lines.push(this.generateResponseTimeSectionText(metrics.responseTime))
    }

    if (this.config.includeErrorRate) {
      lines.push(this.generateErrorRateSectionText(metrics.errorRate))
    }

    if (this.config.includeThroughput) {
      lines.push(this.generateThroughputSectionText(metrics.throughput))
    }

    if (this.config.includeHistory && history) {
      lines.push(this.generateHistorySectionText(history))
    }

    lines.push('════════════════════════════════════════════════════════════')

    return lines.join('\n')
  }

  /**
   * 生成 HTML 格式报告
   */
  generateHtmlReport(metrics: PerformanceMetrics, history?: MetricsHistory): string {
    const sections: string[] = []

    sections.push(this.getHtmlHeader())

    if (this.config.includeSystem) {
      sections.push(this.generateSystemSectionHtml(metrics.system))
    }

    if (this.config.includeResponseTime) {
      sections.push(this.generateResponseTimeSectionHtml(metrics.responseTime))
    }

    if (this.config.includeErrorRate) {
      sections.push(this.generateErrorRateSectionHtml(metrics.errorRate))
    }

    if (this.config.includeThroughput) {
      sections.push(this.generateThroughputSectionHtml(metrics.throughput))
    }

    if (this.config.includeHistory && history) {
      sections.push(this.generateHistorySectionHtml(history))
    }

    sections.push(this.getHtmlFooter())

    return sections.join('\n')
  }

  /**
   * 生成 JSON 格式报告
   */
  generateJsonReport(metrics: PerformanceMetrics, history?: MetricsHistory): string {
    const report: Record<string, unknown> = {
      timestamp: metrics.timestamp,
      version: metrics.version,
      generatedAt: new Date().toISOString(),
    }

    if (this.config.includeSystem) {
      report.system = metrics.system
    }

    if (this.config.includeResponseTime) {
      report.responseTime = metrics.responseTime
    }

    if (this.config.includeErrorRate) {
      report.errorRate = metrics.errorRate
    }

    if (this.config.includeThroughput) {
      report.throughput = metrics.throughput
    }

    if (this.config.includeHistory && history) {
      report.history = {
        system: history.system.slice(-this.config.historyPoints),
        responseTime: history.responseTime.slice(-this.config.historyPoints),
        errorRate: history.errorRate.slice(-this.config.historyPoints),
        throughput: history.throughput.slice(-this.config.historyPoints),
      }
    }

    return JSON.stringify(report, null, 2)
  }

  // ============================================================================
  // 文本格式部分
  // ============================================================================

  private generateSystemSectionText(metrics: SystemMetrics): string {
    const lines: string[] = []

    lines.push('┌─────────────────────────────────────────────────────────────┐')
    lines.push('│                     System Metrics                          │')
    lines.push('├─────────────────────────────────────────────────────────────┤')
    lines.push(`│ CPU Usage      : ${this.formatPercent(metrics.cpuUsage).padEnd(30)} │`)
    lines.push(`│ Memory Usage   : ${this.formatPercent(metrics.memoryUsage).padEnd(30)} │`)

    if (metrics.heapUsed !== undefined && metrics.heapTotal !== undefined) {
      lines.push(
        `│ Heap Used      : ${`${metrics.heapUsed.toFixed(2)} MB / ${metrics.heapTotal.toFixed(2)} MB`.padEnd(30)} │`
      )
    }

    if (metrics.rss !== undefined) {
      lines.push(`│ RSS Memory     : ${`${metrics.rss.toFixed(2)} MB`.padEnd(30)} │`)
    }

    lines.push('└─────────────────────────────────────────────────────────────┘')
    lines.push('')

    return lines.join('\n')
  }

  private generateResponseTimeSectionText(metrics: ResponseTimeMetrics): string {
    const lines: string[] = []

    lines.push('┌─────────────────────────────────────────────────────────────┐')
    lines.push('│                   Response Time Metrics                     │')
    lines.push('├─────────────────────────────────────────────────────────────┤')
    lines.push(`│ Average        : ${this.formatMs(metrics.average).padEnd(30)} │`)
    lines.push(`│ Min            : ${this.formatMs(metrics.min).padEnd(30)} │`)
    lines.push(`│ Max            : ${this.formatMs(metrics.max).padEnd(30)} │`)
    lines.push(`│ P50            : ${this.formatMs(metrics.p50).padEnd(30)} │`)
    lines.push(`│ P95            : ${this.formatMs(metrics.p95).padEnd(30)} │`)
    lines.push(`│ P99            : ${this.formatMs(metrics.p99).padEnd(30)} │`)
    lines.push(`│ Sample Count   : ${String(metrics.sampleCount).padEnd(30)} │`)
    lines.push('└─────────────────────────────────────────────────────────────┘')
    lines.push('')

    return lines.join('\n')
  }

  private generateErrorRateSectionText(metrics: ErrorRateMetrics): string {
    const lines: string[] = []

    lines.push('┌─────────────────────────────────────────────────────────────┐')
    lines.push('│                     Error Rate Metrics                      │')
    lines.push('├─────────────────────────────────────────────────────────────┤')
    lines.push(`│ Error Rate     : ${this.formatPercent(metrics.rate).padEnd(30)} │`)
    lines.push(`│ Total Requests : ${String(metrics.totalRequests).padEnd(30)} │`)
    lines.push(`│ Error Count    : ${String(metrics.errorCount).padEnd(30)} │`)

    if (metrics.errorsByType && Object.keys(metrics.errorsByType).length > 0) {
      lines.push('├─────────────────────────────────────────────────────────────┤')
      lines.push('│ Errors by Type:                                             │')
      Object.entries(metrics.errorsByType).forEach(([type, count]) => {
        lines.push(`│   ${type.padEnd(20)} : ${String(count).padEnd(18)} │`)
      })
    }

    lines.push('└─────────────────────────────────────────────────────────────┘')
    lines.push('')

    return lines.join('\n')
  }

  private generateThroughputSectionText(metrics: ThroughputMetrics): string {
    const lines: string[] = []

    lines.push('┌─────────────────────────────────────────────────────────────┐')
    lines.push('│                    Throughput Metrics                       │')
    lines.push('├─────────────────────────────────────────────────────────────┤')
    lines.push(`│ Requests/min   : ${String(metrics.requestsPerMinute).padEnd(30)} │`)
    lines.push(`│ Requests/sec   : ${String(metrics.requestsPerSecond.toFixed(2)).padEnd(30)} │`)
    lines.push(`│ Time Window    : ${`${metrics.timeWindowMs / 1000} seconds`.padEnd(30)} │`)
    lines.push(`│ Total Requests : ${String(metrics.totalRequests).padEnd(30)} │`)
    lines.push('└─────────────────────────────────────────────────────────────┘')
    lines.push('')

    return lines.join('\n')
  }

  private generateHistorySectionText(history: MetricsHistory): string {
    const lines: string[] = []
    const points = this.config.historyPoints

    lines.push('┌─────────────────────────────────────────────────────────────┐')
    lines.push('│                    Historical Trends                        │')
    lines.push('├─────────────────────────────────────────────────────────────┤')

    // Response Time Trend
    const recentResponse = history.responseTime.slice(-points)
    if (recentResponse.length > 0) {
      lines.push(
        '│ Response Time (last ' +
          String(recentResponse.length).padStart(2) +
          ' samples):                 │'
      )
      const p95Values = recentResponse.map(m => m.p95)
      const trend = this.getTrendArrow(p95Values)
      lines.push(
        `│   P95 Trend: ${trend}  (${p95Values[p95Values.length - 1]?.toFixed(0) || 0} ms)`
      )
    }

    // Error Rate Trend
    const recentErrors = history.errorRate.slice(-points)
    if (recentErrors.length > 0) {
      lines.push(
        '│ Error Rate (last ' +
          String(recentErrors.length).padStart(2) +
          ' samples):                    │'
      )
      const rateValues = recentErrors.map(m => m.rate)
      const trend = this.getTrendArrow(rateValues)
      lines.push(
        `│   Rate Trend: ${trend}  (${rateValues[rateValues.length - 1]?.toFixed(2) || 0}%)`
      )
    }

    lines.push('└─────────────────────────────────────────────────────────────┘')
    lines.push('')

    return lines.join('\n')
  }

  // ============================================================================
  // HTML 格式部分
  // ============================================================================

  private getHtmlHeader(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Metrics Report</title>
  <style>
    :root {
      --primary: #3b82f6;
      --success: #22c55e;
      --warning: #f59e0b;
      --danger: #ef4444;
      --dark: #1f2937;
      --light: #f3f4f6;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--light);
      margin: 0;
      padding: 20px;
      color: var(--dark);
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      background: linear-gradient(135deg, var(--primary), #8b5cf6);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 8px;
      font-size: 1.75rem;
    }
    .header .timestamp {
      opacity: 0.9;
      font-size: 0.9rem;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      margin-bottom: 20px;
      overflow: hidden;
    }
    .card-header {
      background: var(--light);
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
      font-weight: 600;
      font-size: 1.1rem;
    }
    .card-body {
      padding: 20px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }
    .metric-item {
      padding: 16px;
      background: var(--light);
      border-radius: 8px;
    }
    .metric-label {
      font-size: 0.85rem;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .metric-value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--dark);
    }
    .metric-value.success { color: var(--success); }
    .metric-value.warning { color: var(--warning); }
    .metric-value.danger { color: var(--danger); }
    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 8px;
    }
    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    .progress-fill.success { background: var(--success); }
    .progress-fill.warning { background: var(--warning); }
    .progress-fill.danger { background: var(--danger); }
    .percentile-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .percentile-row:last-child {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <div class="container">`
  }

  private getHtmlFooter(): string {
    return `  </div>
</body>
</html>`
  }

  private generateSystemSectionHtml(metrics: SystemMetrics): string {
    const cpuStatus = this.getValueStatus(metrics.cpuUsage, 70, 90)
    const memoryStatus = this.getValueStatus(metrics.memoryUsage, 70, 90)

    return `
    <div class="card">
      <div class="card-header">🖥️ System Metrics</div>
      <div class="card-body">
        <div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-label">CPU Usage</div>
            <div class="metric-value ${cpuStatus}">${metrics.cpuUsage.toFixed(1)}%</div>
            <div class="progress-bar">
              <div class="progress-fill ${cpuStatus}" style="width: ${Math.min(100, metrics.cpuUsage)}%"></div>
            </div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Memory Usage</div>
            <div class="metric-value ${memoryStatus}">${metrics.memoryUsage.toFixed(1)}%</div>
            <div class="progress-bar">
              <div class="progress-fill ${memoryStatus}" style="width: ${Math.min(100, metrics.memoryUsage)}%"></div>
            </div>
          </div>
          ${
            metrics.heapUsed !== undefined
              ? `
          <div class="metric-item">
            <div class="metric-label">Heap Used</div>
            <div class="metric-value">${metrics.heapUsed.toFixed(0)} MB</div>
          </div>
          `
              : ''
          }
          ${
            metrics.rss !== undefined
              ? `
          <div class="metric-item">
            <div class="metric-label">RSS Memory</div>
            <div class="metric-value">${metrics.rss.toFixed(0)} MB</div>
          </div>
          `
              : ''
          }
        </div>
      </div>
    </div>`
  }

  private generateResponseTimeSectionHtml(metrics: ResponseTimeMetrics): string {
    return `
    <div class="card">
      <div class="card-header">⏱️ Response Time Metrics</div>
      <div class="card-body">
        <div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-label">Average</div>
            <div class="metric-value">${metrics.average.toFixed(0)} ms</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Min</div>
            <div class="metric-value">${metrics.min.toFixed(0)} ms</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Max</div>
            <div class="metric-value">${metrics.max.toFixed(0)} ms</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Samples</div>
            <div class="metric-value">${metrics.sampleCount}</div>
          </div>
        </div>
        <div style="margin-top: 20px;">
          <h4 style="margin: 0 0 12px; font-size: 0.9rem; color: #6b7280;">Percentiles</h4>
          <div class="percentile-row">
            <span>P50</span>
            <strong>${metrics.p50.toFixed(0)} ms</strong>
          </div>
          <div class="percentile-row">
            <span>P95</span>
            <strong>${metrics.p95.toFixed(0)} ms</strong>
          </div>
          <div class="percentile-row">
            <span>P99</span>
            <strong>${metrics.p99.toFixed(0)} ms</strong>
          </div>
        </div>
      </div>
    </div>`
  }

  private generateErrorRateSectionHtml(metrics: ErrorRateMetrics): string {
    const errorStatus = this.getValueStatus(metrics.rate, 1, 5)

    return `
    <div class="card">
      <div class="card-header">⚠️ Error Rate Metrics</div>
      <div class="card-body">
        <div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-label">Error Rate</div>
            <div class="metric-value ${errorStatus}">${metrics.rate.toFixed(2)}%</div>
            <div class="progress-bar">
              <div class="progress-fill ${errorStatus}" style="width: ${Math.min(100, metrics.rate * 10)}%"></div>
            </div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Total Requests</div>
            <div class="metric-value">${metrics.totalRequests}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Error Count</div>
            <div class="metric-value ${errorStatus}">${metrics.errorCount}</div>
          </div>
        </div>
        ${
          metrics.errorsByType && Object.keys(metrics.errorsByType).length > 0
            ? `
        <div style="margin-top: 20px;">
          <h4 style="margin: 0 0 12px; font-size: 0.9rem; color: #6b7280;">Errors by Type</h4>
          ${Object.entries(metrics.errorsByType)
            .map(
              ([type, count]) => `
          <div class="percentile-row">
            <span>${type}</span>
            <strong>${count}</strong>
          </div>
          `
            )
            .join('')}
        </div>
        `
            : ''
        }
      </div>
    </div>`
  }

  private generateThroughputSectionHtml(metrics: ThroughputMetrics): string {
    return `
    <div class="card">
      <div class="card-header">🚀 Throughput Metrics</div>
      <div class="card-body">
        <div class="metrics-grid">
          <div class="metric-item">
            <div class="metric-label">Requests/min</div>
            <div class="metric-value success">${metrics.requestsPerMinute}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Requests/sec</div>
            <div class="metric-value">${metrics.requestsPerSecond.toFixed(2)}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Time Window</div>
            <div class="metric-value">${metrics.timeWindowMs / 1000}s</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Total Requests</div>
            <div class="metric-value">${metrics.totalRequests}</div>
          </div>
        </div>
      </div>
    </div>`
  }

  private generateHistorySectionHtml(history: MetricsHistory): string {
    return `
    <div class="card">
      <div class="card-header">📊 Historical Trends</div>
      <div class="card-body">
        <p style="color: #6b7280; margin: 0;">Historical trend visualization coming soon...</p>
      </div>
    </div>`
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
  }

  private formatPercent(value: number): string {
    return `${value.toFixed(1)}%`
  }

  private formatMs(value: number): string {
    return `${value.toFixed(2)} ms`
  }

  private getValueStatus(value: number, warningThreshold: number, dangerThreshold: number): string {
    if (value >= dangerThreshold) return 'danger'
    if (value >= warningThreshold) return 'warning'
    return 'success'
  }

  private getTrendArrow(values: number[]): string {
    if (values.length < 2) return '→'

    const first = values.slice(0, Math.floor(values.length / 2))
    const second = values.slice(Math.floor(values.length / 2))

    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length
    const secondAvg = second.reduce((a, b) => a + b, 0) / second.length

    const change = ((secondAvg - firstAvg) / firstAvg) * 100

    if (change > 10) return '↑ increasing'
    if (change < -10) return '↓ decreasing'
    return '→ stable'
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<MetricsReportConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取配置
   */
  getConfig(): MetricsReportConfig {
    return { ...this.config }
  }
}

// 单例实例
export const metricsReportGenerator = new MetricsReportGenerator()

/**
 * 便捷函数：生成健康检查报告
 */
export function generateHealthCheck(
  metrics: PerformanceMetrics,
  thresholds?: {
    cpuWarning?: number
    cpuCritical?: number
    memoryWarning?: number
    memoryCritical?: number
    errorRateWarning?: number
    errorRateCritical?: number
    responseTimeWarning?: number
    responseTimeCritical?: number
  }
): MetricsHealthCheck {
  const {
    cpuWarning = 70,
    cpuCritical = 90,
    memoryWarning = 70,
    memoryCritical = 90,
    errorRateWarning = 1,
    errorRateCritical = 5,
    responseTimeWarning = 1000,
    responseTimeCritical = 3000,
  } = thresholds || {}

  const checks: MetricsHealthCheck['checks'] = []

  // CPU 检查
  const cpuStatus: MetricStatus =
    metrics.system.cpuUsage >= cpuCritical
      ? 'critical'
      : metrics.system.cpuUsage >= cpuWarning
        ? 'warning'
        : 'healthy'
  checks.push({
    name: 'CPU Usage',
    status: cpuStatus,
    value: metrics.system.cpuUsage,
    threshold: cpuStatus === 'critical' ? cpuCritical : cpuWarning,
    message: `CPU usage at ${metrics.system.cpuUsage.toFixed(1)}%`,
  })

  // 内存检查
  const memoryStatus: MetricStatus =
    metrics.system.memoryUsage >= memoryCritical
      ? 'critical'
      : metrics.system.memoryUsage >= memoryWarning
        ? 'warning'
        : 'healthy'
  checks.push({
    name: 'Memory Usage',
    status: memoryStatus,
    value: metrics.system.memoryUsage,
    threshold: memoryStatus === 'critical' ? memoryCritical : memoryWarning,
    message: `Memory usage at ${metrics.system.memoryUsage.toFixed(1)}%`,
  })

  // 错误率检查
  const errorStatus: MetricStatus =
    metrics.errorRate.rate >= errorRateCritical
      ? 'critical'
      : metrics.errorRate.rate >= errorRateWarning
        ? 'warning'
        : 'healthy'
  checks.push({
    name: 'Error Rate',
    status: errorStatus,
    value: metrics.errorRate.rate,
    threshold: errorStatus === 'critical' ? errorRateCritical : errorRateWarning,
    message: `Error rate at ${metrics.errorRate.rate.toFixed(2)}%`,
  })

  // 响应时间检查
  const responseStatus: MetricStatus =
    metrics.responseTime.p95 >= responseTimeCritical
      ? 'critical'
      : metrics.responseTime.p95 >= responseTimeWarning
        ? 'warning'
        : 'healthy'
  checks.push({
    name: 'Response Time (P95)',
    status: responseStatus,
    value: metrics.responseTime.p95,
    threshold: responseStatus === 'critical' ? responseTimeCritical : responseTimeWarning,
    message: `P95 response time at ${metrics.responseTime.p95.toFixed(0)}ms`,
  })

  // 确定总体状态
  const overallStatus: MetricStatus = checks.some(c => c.status === 'critical')
    ? 'critical'
    : checks.some(c => c.status === 'warning')
      ? 'warning'
      : 'healthy'

  return {
    status: overallStatus,
    checks,
    timestamp: Date.now(),
  }
}
