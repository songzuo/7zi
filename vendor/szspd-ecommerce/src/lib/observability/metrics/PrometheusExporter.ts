/**
 * PrometheusExporter - Prometheus 格式导出器
 * 
 * 将指标数据转换为 Prometheus 文本格式
 * 
 * @version v1.11.0
 */

import {
  MetricType,
  MetricValue,
  MetricDefinition,
  PrometheusMetric,
  Tags,
} from '../types'
import type { MetricCollector } from './MetricCollector'

// ============================================
// Prometheus Exporter
// ============================================

export class PrometheusExporter {
  private prefix: string
  private collector: MetricCollector

  constructor(collector: MetricCollector, options?: { prefix?: string }) {
    this.collector = collector
    this.prefix = options?.prefix || ''
  }

  /**
   * 导出所有指标为 Prometheus 格式
   */
  export(): string {
    const definitions = this.collector.getDefinitions()
    const lines: string[] = []

    for (const def of definitions) {
      const metric = this.exportMetric(def)
      if (metric) {
        lines.push(this.formatMetric(metric))
      }
    }

    return lines.join('\n')
  }

  /**
   * 导出单个指标
   */
  exportMetric(definition: MetricDefinition): PrometheusMetric | undefined {
    const values = this.collector.getValue(definition.name)
    if (values.length === 0) return undefined

    const name = this.getMetricName(definition.name)
    const samples = this.groupSamples(values, definition.type)

    return {
      name,
      help: definition.description || `Metric ${definition.name}`,
      type: this.getPrometheusType(definition.type),
      samples,
    }
  }

  /**
   * 格式化 Prometheus 指标
   */
  formatMetric(metric: PrometheusMetric): string {
    const lines: string[] = []

    // HELP
    lines.push(`# HELP ${metric.name} ${metric.help}`)

    // TYPE
    lines.push(`# TYPE ${metric.name} ${metric.type}`)

    // Samples
    for (const sample of metric.samples) {
      const labels = this.formatLabels(sample.labels)
      const labelStr = labels ? `{${labels}}` : ''
      lines.push(`${metric.name}${labelStr} ${sample.value}${sample.timestamp ? ` ${sample.timestamp}` : ''}`)
    }

    return lines.join('\n')
  }

  /**
   * 获取 Prometheus 指标名称
   */
  private getMetricName(name: string): string {
    // 转换为 Prometheus 命名规范 (snake_case)
    const snakeCase = name.replace(/([A-Z])/g, '_$1').toLowerCase()
    return this.prefix ? `${this.prefix}_${snakeCase}` : snakeCase
  }

  /**
   * 获取 Prometheus 类型名称
   */
  private getPrometheusType(type: MetricType): string {
    switch (type) {
      case MetricType.COUNTER:
        return 'counter'
      case MetricType.GAUGE:
        return 'gauge'
      case MetricType.HISTOGRAM:
        return 'histogram'
      case MetricType.SUMMARY:
        return 'summary'
      default:
        return 'untyped'
    }
  }

  /**
   * 分组样本值
   */
  private groupSamples(values: MetricValue[], type: MetricType): PrometheusMetric['samples'] {
    if (type === MetricType.HISTOGRAM) {
      return this.groupHistogramSamples(values)
    }

    if (type === MetricType.SUMMARY) {
      return this.groupSummarySamples(values)
    }

    // Counter 和 Gauge: 取最新值
    const latest = values[values.length - 1]
    return [{
      value: latest.value,
      labels: this.tagsToLabels(latest.tags),
      timestamp: latest.timestamp,
    }]
  }

  /**
   * 分组 Histogram 样本
   */
  private groupHistogramSamples(values: MetricValue[]): PrometheusMetric['samples'] {
    const numbers = values.map(v => v.value)
    const buckets = [0.1, 0.5, 1, 2.5, 5, 10, 30, 60, 120, 300, 600] // 默认桶边界
    const labels = this.tagsToLabels(values[0]?.tags)

    const samples: PrometheusMetric['samples'] = []
    const cumulativeCount = 0

    // 排序值
    numbers.sort((a, b) => a - b)

    for (const bucket of buckets) {
      const count = numbers.filter(n => n <= bucket).length
      samples.push({
        value: count,
        labels: { ...labels, le: String(bucket) },
      })
    }

    // +Inf bucket
    samples.push({
      value: numbers.length,
      labels: { ...labels, le: '+Inf' },
    })

    // Sum
    samples.push({
      value: numbers.reduce((a, b) => a + b, 0),
      labels: { ...labels, le: '' },
    })

    // Count
    samples.push({
      value: numbers.length,
      labels: { ...labels, le: '' },
    })

    return samples
  }

  /**
   * 分组 Summary 样本
   */
  private groupSummarySamples(values: MetricValue[]): PrometheusMetric['samples'] {
    const numbers = values.map(v => v.value)
    const quantiles = [0.5, 0.9, 0.95, 0.99]
    const labels = this.tagsToLabels(values[0]?.tags)

    numbers.sort((a, b) => a - b)

    const samples: PrometheusMetric['samples'] = []

    // Quantiles
    for (const q of quantiles) {
      const idx = Math.ceil(q * numbers.length) - 1
      samples.push({
        value: numbers[Math.max(0, idx)] || 0,
        labels: { ...labels, quantile: String(q) },
      })
    }

    // Sum
    samples.push({
      value: numbers.reduce((a, b) => a + b, 0),
      labels,
    })

    // Count
    samples.push({
      value: numbers.length,
      labels,
    })

    return samples
  }

  /**
   * 格式化标签
   */
  private formatLabels(labels: Record<string, string>): string {
    return Object.entries(labels)
      .map(([k, v]) => `${k}="${this.escapeLabelValue(v)}"`)
      .join(',')
  }

  /**
   * 转换 Tags 为 Labels
   */
  private tagsToLabels(tags?: Tags): Record<string, string> {
    if (!tags) return {}
    const labels: Record<string, string> = {}
    for (const [k, v] of Object.entries(tags)) {
      labels[k] = String(v)
    }
    return labels
  }

  /**
   * 转义标签值
   */
  private escapeLabelValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
  }
}

// ============================================
// HTTP Server Helper
// ============================================

/**
 * 创建 Prometheus metrics HTTP handler
 * 用于 Express/Fastify 等框架
 */
export function createPrometheusHandler(collector: MetricCollector) {
  const exporter = new PrometheusExporter(collector)
  
  return async function prometheusHandler(
    req: unknown,
    res: { setHeader: (name: string, value: string) => void; send?: (data: string) => void; end?: (data: string) => void }
  ): Promise<void> {
    const metrics = exporter.export()
    
    if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    }
    
    if (typeof res.send === 'function') {
      res.send(metrics)
    } else if (typeof res.end === 'function') {
      res.end(metrics)
    }
  }
}
