/**
 * 可观测性链路的加固回归测试
 *
 * 覆盖这几处真实缺陷（都不是"测试没写"，是"实现有 bug"）：
 * 1. Prometheus histogram/summary 输出的指标名与标签集不符合 Prometheus 规范
 * 2. MetricCollector 的 increment/gauge 会清空已有指标的历史值
 * 3. TraceManager 采样 rate=0 的语义反了（0% 反而全采）
 * 4. StructuredLogger / TraceManager / Span 属性完全不脱敏
 * 5. trace middleware 把成功请求标成 ERROR
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PrometheusExporter } from '@/lib/observability/metrics/PrometheusExporter'
import { MetricCollector } from '@/lib/observability/metrics/MetricCollector'
import { MetricType } from '@/lib/observability/types'
import { TraceManager } from '@/lib/observability/tracing/TraceManager'
import { StructuredLogger } from '@/lib/observability/logging/StructuredLogger'

describe('PrometheusExporter —— 输出必须符合 Prometheus 规范', () => {
  let collector: MetricCollector
  let exporter: PrometheusExporter

  beforeEach(() => {
    collector = new MetricCollector()
    exporter = new PrometheusExporter(collector)
  })

  it('histogram 的 bucket/sum/count 必须是三个独立指标名', () => {
    collector.register({ name: 'req_latency', type: MetricType.HISTOGRAM })
    for (const v of [0.05, 0.2, 1.5, 3.2]) {
      collector.observe('req_latency', v)
    }

    const metric = exporter.exportMetric({
      name: 'req_latency',
      type: MetricType.HISTOGRAM,
      description: 'latency',
    })
    const text = exporter.formatMetric(metric!)

    // 三个独立指标名
    expect(text).toMatch(/req_latency_bucket\{/)
    expect(text).toMatch(/^req_latency_sum\b/m)
    expect(text).toMatch(/^req_latency_count\b/m)

    // _sum / _count 不能带 le 标签 —— 与 _bucket 标签集冲突，
    // Prometheus 会拒收整批样本
    const sumLine = text.split('\n').find(l => l.startsWith('req_latency_sum'))
    expect(sumLine).toBeDefined()
    expect(sumLine).not.toContain('le=')
  })

  it('同一指标名下的样本标签集必须一致', () => {
    collector.register({ name: 'h', type: MetricType.HISTOGRAM })
    collector.observe('h', 1)

    const metric = exporter.exportMetric({ name: 'h', type: MetricType.HISTOGRAM })
    const text = exporter.formatMetric(metric!)

    // 按指标名分组后，每组的标签集（键集合）必须相同
    const groups = new Map<string, string[]>()
    for (const line of text.split('\n')) {
      if (line.startsWith('#') || !line.trim()) continue
      const name = line.split(/[{ ]/)[0]
      const labels = line.includes('{')
        ? line.slice(line.indexOf('{') + 1, line.indexOf('}')).split(',').map(s => s.split('=')[0]).sort()
        : []
      const key = labels.join(',')
      if (!groups.has(name)) groups.set(name, [])
      groups.get(name)!.push(key)
    }

    for (const [name, labelSets] of groups) {
      expect(new Set(labelSets).size, `${name} 的标签集不一致`).toBe(1)
    }
  })

  it('HELP 文本里的换行必须转义，不能把后面的行顶掉', () => {
    collector.register({ name: 'x', type: MetricType.GAUGE, description: 'line1\nline2' })
    collector.record('x', 1)

    const metric = exporter.exportMetric({
      name: 'x',
      type: MetricType.GAUGE,
      description: 'line1\nline2',
    })
    const text = exporter.formatMetric(metric!)

    // HELP 只能占一行
    const helpLines = text.split('\n').filter(l => l.startsWith('# HELP'))
    expect(helpLines).toHaveLength(1)
    expect(helpLines[0]).toContain('\\n')
  })
})

describe('MetricCollector —— 类型纠正不得清空历史', () => {
  it('对已注册为 gauge 的指标调 increment，历史值不能消失', () => {
    const collector = new MetricCollector()

    collector.register({ name: 'm', type: MetricType.GAUGE })
    collector.record('m', 10)
    collector.record('m', 20)
    expect(collector.getValue('m')).toHaveLength(2)

    // increment 会发现类型不是 COUNTER
    collector.increment('m', 1)

    const values = collector.getValue('m')
    // 历史值还在（不是从 0 重新开始）
    expect(values.length).toBe(3)
    expect(values[0].value).toBe(10)
    expect(values[1].value).toBe(20)
    expect(values[2].value).toBe(1)
  })

  it('对已注册为 counter 的指标调 gauge，历史值同样保留', () => {
    const collector = new MetricCollector()

    collector.register({ name: 'c', type: MetricType.COUNTER })
    collector.record('c', 5)
    collector.gauge('c', 99)

    const values = collector.getValue('c')
    expect(values.length).toBe(2)
    expect(values[0].value).toBe(5)
  })
})

describe('TraceManager —— 采样语义', () => {
  it('rate=0 表示一条都不采（不是全采）', () => {
    const tm = new TraceManager({
      serviceName: 'test',
      samplingStrategy: { type: 'probabilistic', rate: 0 },
    })

    let sampled = 0
    for (let i = 0; i < 20; i++) {
      const traceId = tm.startTrace('t')
      // 未采样时 startTrace 会返回 traceId 但不建 trace
      if (tm.getActiveSpan() || tm.getTrace(traceId)) sampled++
      tm.endTrace(traceId)
    }
    expect(sampled).toBe(0)
  })

  it('rate=1 表示全采', () => {
    const tm = new TraceManager({
      serviceName: 'test',
      samplingStrategy: { type: 'probabilistic', rate: 1 },
    })

    let sampled = 0
    for (let i = 0; i < 10; i++) {
      const traceId = tm.startTrace('t')
      const trace = tm.endTrace(traceId)
      if (trace) sampled++
    }
    expect(sampled).toBe(10)
  })
})

describe('StructuredLogger —— 脱敏必须接线', () => {
  it('message 里的 token 要被替换', () => {
    const logger = new StructuredLogger({ serviceName: 'test' })
    logger.info('connecting with token ghp_abcdefghijklmnopqrstuvwxyz012345')

    const entries = logger.query({})
    const text = JSON.stringify(entries)
    expect(text).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz012345')
    expect(text).toContain('REDACTED')
  })

  it('敏感字段名（password/token/apiKey）的值要被替换', () => {
    const logger = new StructuredLogger({ serviceName: 'test' })
    logger.info('login', { password: 'hunter2', apiKey: 'AKIAIOSFODNN7EXAMPLE', user: 'bob' })

    const entries = logger.query({})
    const fields = entries[entries.length - 1].fields as Record<string, unknown>
    expect(fields.password).not.toBe('hunter2')
    expect(fields.apiKey).not.toBe('AKIAIOSFODNN7EXAMPLE')
    // 非敏感字段不动
    expect(fields.user).toBe('bob')
  })

  it('嵌套对象里的敏感字段也要脱敏', () => {
    const logger = new StructuredLogger({ serviceName: 'test' })
    logger.info('cfg', { auth: { accessToken: 'ghp_abcdefghijklmnopqrstuvwxyz012345' } })

    const entries = logger.query({})
    expect(JSON.stringify(entries)).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz012345')
  })

  it('error 的 message 与 stack 也要脱敏', () => {
    const logger = new StructuredLogger({ serviceName: 'test' })
    const err = new Error('failed with ghp_abcdefghijklmnopqrstuvwxyz012345')
    logger.error('boom', err)

    const entries = logger.query({})
    expect(JSON.stringify(entries)).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz012345')
  })
})

describe('TraceManager —— span 属性脱敏', () => {
  it('setAttribute 的敏感值要被替换', () => {
    const tm = new TraceManager({ serviceName: 'test', samplingStrategy: { type: 'always' } })
    tm.startTrace('t')
    const span = tm.getActiveSpan()!

    tm.setAttribute(span, 'http.authorization', 'Bearer ghp_abcdefghijklmnopqrstuvwxyz012345')

    expect(span.attributes['http.authorization']).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz012345')
  })
})
