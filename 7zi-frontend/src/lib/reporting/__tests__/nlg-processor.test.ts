/**
 * NLG Processor Tests
 * 自然语言生成器测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  NLGProcessor,
  createNLGProcessor,
  generateMultilingualText,
  generateMultiToneText,
  type Language,
  type ToneStyle,
} from '../nlg-processor'
import type { AggregatedData } from '../data-aggregator'

describe('NLGProcessor', () => {
  let processor: NLGProcessor

  const mockAggregatedData: AggregatedData = {
    timeRange: { type: 'day' },
    metrics: [
      {
        name: 'active_users',
        value: 1000,
        change: 100,
        changePercent: 0.1,
        trend: 'up',
      },
      {
        name: 'new_users',
        value: 50,
        change: -5,
        changePercent: -0.09,
        trend: 'down',
      },
    ],
    timestamp: Date.now(),
  }

  beforeEach(() => {
    processor = createNLGProcessor('zh', 'formal')
  })

  describe('generateSummary', () => {
    it('should generate summary in Chinese', () => {
      processor.updateConfig({ language: 'zh', tone: 'formal' })
      const result = processor.generateSummary(mockAggregatedData)

      expect(result).toBeDefined()
      expect(result.language).toBe('zh')
      expect(result.tone).toBe('formal')
      expect(result.text).toContain('数据分析')
    })

    it('should generate summary in English', () => {
      processor.updateConfig({ language: 'en', tone: 'formal' })
      const result = processor.generateSummary(mockAggregatedData)

      expect(result.language).toBe('en')
      expect(result.text).toContain('data analysis')
    })

    it('should generate summary in Japanese', () => {
      processor.updateConfig({ language: 'ja', tone: 'formal' })
      const result = processor.generateSummary(mockAggregatedData)

      expect(result.language).toBe('ja')
      expect(result.text).toContain('データ分析')
    })
  })

  describe('generateMetricDescription', () => {
    it('should generate description for metric', () => {
      const metric = mockAggregatedData.metrics[0]
      const result = processor.generateMetricDescription(metric)

      expect(result).toBeDefined()
      expect(result.text).toContain(metric.name)
      expect(result.text).toMatch(/\d/)
    })

    it('should include trend information', () => {
      processor.updateConfig({ includeTrends: true })
      const metric = mockAggregatedData.metrics[0]
      const result = processor.generateMetricDescription(metric)

      expect(result.text).toContain('趋势')
    })

    it('should not include trend when disabled', () => {
      processor.updateConfig({ includeTrends: false })
      const metric = mockAggregatedData.metrics[0]
      const result = processor.generateMetricDescription(metric)

      expect(result.text).not.toContain('趋势')
    })
  })

  describe('generateReport', () => {
    it('should generate formal report', () => {
      processor.updateConfig({ tone: 'formal', language: 'zh' })
      const result = processor.generateReport(mockAggregatedData)

      expect(result).toBeDefined()
      expect(result.tone).toBe('formal')
      expect(result.text).toContain('数据分析报告')
    })

    it('should generate concise report', () => {
      processor.updateConfig({ tone: 'concise', language: 'zh' })
      const result = processor.generateReport(mockAggregatedData)

      expect(result.tone).toBe('concise')
      expect(result.text.length).toBeLessThan(500)
    })

    it('should generate detailed report', () => {
      processor.updateConfig({ tone: 'detailed', language: 'zh' })
      const result = processor.generateReport(mockAggregatedData)

      expect(result.tone).toBe('detailed')
      expect(result.text).toContain('收集了')
    })

    it('should generate casual report', () => {
      processor.updateConfig({ tone: 'casual', language: 'zh' })
      const result = processor.generateReport(mockAggregatedData)

      expect(result.tone).toBe('casual')
      expect(result.text).toContain('！')
    })
  })

  describe('formatValue', () => {
    it('should include numbers when enabled', () => {
      processor.updateConfig({ includeNumbers: true })
      const result = processor.generateMetricDescription({
        name: 'test',
        value: 1000,
        trend: 'stable',
      })

      expect(result.text).toMatch(/\d/)
    })

    it('should not include numbers when disabled', () => {
      processor.updateConfig({ includeNumbers: false })
      const result = processor.generateMetricDescription({
        name: 'test',
        value: 1000,
        trend: 'stable',
      })

      expect(result.text).toContain('N/A')
    })
  })

  describe('formatChange', () => {
    it('should include percentage when enabled', () => {
      processor.updateConfig({ includePercentages: true, includeTrends: true })
      const result = processor.generateMetricDescription({
        name: 'test',
        value: 1000,
        change: 100,
        changePercent: 0.1,
        trend: 'up',
      })

      expect(result.text).toContain('%')
    })

    it('should not include percentage when disabled', () => {
      processor.updateConfig({ includePercentages: false, includeTrends: true })
      const result = processor.generateMetricDescription({
        name: 'test',
        value: 1000,
        change: 100,
        changePercent: 0.1,
        trend: 'up',
      })

      expect(result.text).not.toContain('%')
    })
  })

  describe('updateConfig', () => {
    it('should update language', () => {
      processor.updateConfig({ language: 'en' })
      const config = processor.getConfig()

      expect(config.language).toBe('en')
    })

    it('should update tone', () => {
      processor.updateConfig({ tone: 'casual' })
      const config = processor.getConfig()

      expect(config.tone).toBe('casual')
    })

    it('should preserve existing config when partial update', () => {
      processor.updateConfig({ tone: 'detailed' })
      processor.updateConfig({ language: 'en' })
      const config = processor.getConfig()

      expect(config.tone).toBe('detailed')
      expect(config.language).toBe('en')
    })
  })
})

describe('createNLGProcessor', () => {
  it('should create processor with default config', () => {
    const processor = createNLGProcessor()
    const config = processor.getConfig()

    expect(config.language).toBe('zh')
    expect(config.tone).toBe('formal')
    expect(config.includeNumbers).toBe(true)
  })

  it('should create processor with custom config', () => {
    const processor = createNLGProcessor('en', 'casual')
    const config = processor.getConfig()

    expect(config.language).toBe('en')
    expect(config.tone).toBe('casual')
  })
})

describe('generateMultilingualText', () => {
  it('should generate text in all languages', () => {
    const mockData: AggregatedData = {
      timeRange: { type: 'day' },
      metrics: [
        {
          name: 'test',
          value: 100,
          trend: 'stable',
        },
      ],
      timestamp: Date.now(),
    }

    const results = generateMultilingualText(mockData, 'formal')

    expect(results.zh).toBeDefined()
    expect(results.en).toBeDefined()
    expect(results.ja).toBeDefined()

    expect(results.zh.language).toBe('zh')
    expect(results.en.language).toBe('en')
    expect(results.ja.language).toBe('ja')
  })
})

describe('generateMultiToneText', () => {
  it('should generate text in all tones', () => {
    const mockData: AggregatedData = {
      timeRange: { type: 'day' },
      metrics: [
        {
          name: 'test',
          value: 100,
          trend: 'stable',
        },
      ],
      timestamp: Date.now(),
    }

    const results = generateMultiToneText(mockData, 'zh')

    expect(results.formal).toBeDefined()
    expect(results.concise).toBeDefined()
    expect(results.detailed).toBeDefined()
    expect(results.casual).toBeDefined()

    expect(results.formal.tone).toBe('formal')
    expect(results.concise.tone).toBe('concise')
    expect(results.detailed.tone).toBe('detailed')
    expect(results.casual.tone).toBe('casual')
  })
})