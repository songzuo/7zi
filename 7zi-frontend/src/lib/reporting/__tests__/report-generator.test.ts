/**
 * Report Generator Tests
 * 报表生成器测试
 */

import { describe, it, expect } from 'vitest'
import {
  ReportGenerator,
  type ReportConfig,
  type ReportType,
} from '../report-generator'
import type { AggregatedData } from '../data-aggregator'

describe('ReportGenerator', () => {
  let generator: ReportGenerator

  beforeEach(() => {
    generator = new ReportGenerator()
  })

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

  describe('generate', () => {
    it('should generate summary report', () => {
      const config: ReportConfig = {
        type: 'summary',
        title: 'Test Summary',
        description: 'Test description',
        data: mockAggregatedData,
      }

      const report = generator.generate(config)

      expect(report).toBeDefined()
      expect(report.type).toBe('summary')
      expect(report.title).toBe('Test Summary')
      expect(report.content).toContain('Test Summary')
      expect(report.metadata.generatedAt).toBeDefined()
    })

    it('should generate detailed report', () => {
      const config: ReportConfig = {
        type: 'detailed',
        title: 'Test Detailed',
        data: mockAggregatedData,
      }

      const report = generator.generate(config)

      expect(report.type).toBe('detailed')
      expect(report.content).toContain('详细数据')
    })

    it('should generate trend report', () => {
      const config: ReportConfig = {
        type: 'trend',
        title: 'Test Trend',
        data: mockAggregatedData,
      }

      const report = generator.generate(config)

      expect(report.type).toBe('trend')
      expect(report.content).toContain('趋势')
    })

    it('should generate comparison report', () => {
      const config: ReportConfig = {
        type: 'comparison',
        title: 'Test Comparison',
        data: mockAggregatedData,
      }

      const report = generator.generate(config)

      expect(report.type).toBe('comparison')
      expect(report.content).toContain('对比')
    })

    it('should generate analytics report', () => {
      const config: ReportConfig = {
        type: 'analytics',
        title: 'Test Analytics',
        data: mockAggregatedData,
      }

      const report = generator.generate(config)

      expect(report.type).toBe('analytics')
      expect(report.content).toContain('分析')
    })

    it('should generate export report', () => {
      const config: ReportConfig = {
        type: 'export',
        title: 'Test Export',
        data: mockAggregatedData,
      }

      const report = generator.generate(config)

      expect(report.type).toBe('export')
      expect(report.content).toContain('导出')
    })

    it('should throw error for unknown report type', () => {
      const config: ReportConfig = {
        type: 'unknown' as ReportType,
        title: 'Test',
        data: mockAggregatedData,
      }

      expect(() => generator.generate(config)).toThrow('Unknown report type')
    })

    it('should include charts when option is enabled', () => {
      const config: ReportConfig = {
        type: 'summary',
        title: 'Test',
        data: mockAggregatedData,
        options: {
          includeCharts: true,
        },
      }

      const report = generator.generate(config)

      expect(report.charts).toBeDefined()
      expect(report.charts!.length).toBeGreaterThan(0)
    })

    it('should not include charts when option is disabled', () => {
      const config: ReportConfig = {
        type: 'summary',
        title: 'Test',
        data: mockAggregatedData,
        options: {
          includeCharts: false,
        },
      }

      const report = generator.generate(config)

      expect(report.charts).toBeUndefined()
    })

    it('should include raw data when option is enabled', () => {
      const config: ReportConfig = {
        type: 'summary',
        title: 'Test',
        data: mockAggregatedData,
        options: {
          includeRawData: true,
        },
      }

      const report = generator.generate(config)

      expect(report.rawData).toBeDefined()
    })

    it('should support different languages', () => {
      const config: ReportConfig = {
        type: 'summary',
        title: 'Test',
        data: mockAggregatedData,
        options: {
          language: 'en',
        },
      }

      const report = generator.generate(config)

      expect(report.metadata.options.language).toBe('en')
    })
  })

  describe('getTemplates', () => {
    it('should return all templates', () => {
      const templates = generator.getTemplates()

      expect(templates).toBeDefined()
      expect(templates.length).toBe(6)
      expect(templates.map(t => t.type)).toContain('summary')
      expect(templates.map(t => t.type)).toContain('detailed')
      expect(templates.map(t => t.type)).toContain('trend')
      expect(templates.map(t => t.type)).toContain('comparison')
      expect(templates.map(t => t.type)).toContain('analytics')
      expect(templates.map(t => t.type)).toContain('export')
    })
  })

  describe('addTemplate', () => {
    it('should add custom template', () => {
      generator.addTemplate('custom', 'Custom template {{title}}', ['title'])

      const templates = generator.getTemplates()
      const customTemplate = templates.find(t => t.type === 'custom')

      expect(customTemplate).toBeDefined()
      expect(customTemplate?.variables).toContain('title')
    })
  })
})