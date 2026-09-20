/**
 * NLG Processor Tests
 * 自然语言生成处理器测试
 * 
 * @version 1.10.0
 */

import { NLGProcessor } from '../nlg-processor'
import {
  ReportTemplateType,
  ReportTone,
  ReportLanguage,
  AggregatedData,
} from '../types'

describe('NLGProcessor', () => {
  let processor: NLGProcessor

  beforeEach(() => {
    processor = new NLGProcessor()
  })

  // Helper function to create mock aggregated data
  const createMockData = (overrides: Partial<AggregatedData> = {}): AggregatedData => ({
    metrics: {
      totalTasks: 100,
      completedTasks: 85,
      completionRate: 85,
    },
    timeSeries: [
      { timestamp: '2025-04-01T00:00:00Z', value: 10 },
      { timestamp: '2025-04-02T00:00:00Z', value: 15 },
      { timestamp: '2025-04-03T00:00:00Z', value: 20 },
    ],
    breakdown: [
      { category: 'Category A', value: 50, percentage: 50, trend: 'up' },
      { category: 'Category B', value: 30, percentage: 30, trend: 'stable' },
      { category: 'Category C', value: 20, percentage: 20, trend: 'down' },
    ],
    insights: [
      {
        type: 'positive',
        title: 'Good Progress',
        description: 'Tasks are being completed efficiently',
        importance: 'high',
      },
    ],
    metadata: {
      aggregatedAt: new Date().toISOString(),
      dataPoints: 3,
      timeRange: {
        start: '2025-04-01T00:00:00Z',
        end: '2025-04-03T00:00:00Z',
      },
    },
    ...overrides,
  })

  describe('generateReport', () => {
    it('should generate a complete report', async () => {
      const data = createMockData()
      const report = await processor.generateReport(
        ReportTemplateType.TASK_ANALYSIS,
        data
      )

      expect(report).toBeDefined()
      expect(report.id).toBeDefined()
      expect(report.title).toBeDefined()
      expect(report.summary).toBeDefined()
      expect(report.sections.length).toBeGreaterThan(0)
      expect(report.insights.length).toBeGreaterThan(0)
      expect(report.metadata.generatedAt).toBeDefined()
      expect(report.metadata.generationTimeMs).toBeDefined()
    })

    it('should generate report in different languages', async () => {
      const data = createMockData({
        metrics: {
          totalUsers: 1000,
          activeUsers: 850,
          activeRate: 85,
        },
      })

      const reportZh = await processor.generateReport(
        ReportTemplateType.USER_ENGAGEMENT,
        data,
        { language: ReportLanguage.ZH_CN }
      )
      expect(reportZh.title).toContain('用户')

      const reportEn = await processor.generateReport(
        ReportTemplateType.USER_ENGAGEMENT,
        data,
        { language: ReportLanguage.EN_US }
      )
      expect(reportEn.title).toContain('User')
    })

    it('should generate report with different tones', async () => {
      const data = createMockData({
        metrics: {
          overallProgress: 68,
          completedTasks: 42,
          newTasks: 15,
          progressTrend: 'up',
        },
      })

      // Formal tone
      const formalReport = await processor.generateReport(
        ReportTemplateType.PROJECT_PROGRESS,
        data,
        { tone: ReportTone.FORMAL }
      )
      expect(formalReport.summary).toBeDefined()

      // Concise tone
      const conciseReport = await processor.generateReport(
        ReportTemplateType.PROJECT_PROGRESS,
        data,
        { tone: ReportTone.CONCISE }
      )
      expect(conciseReport.summary).toBeDefined()

      // Detailed tone
      const detailedReport = await processor.generateReport(
        ReportTemplateType.PROJECT_PROGRESS,
        data,
        { tone: ReportTone.DETAILED }
      )
      expect(detailedReport.summary).toBeDefined()
    })

    it('should include insights when enabled', async () => {
      const data = createMockData()
      const report = await processor.generateReport(
        ReportTemplateType.TASK_ANALYSIS,
        data,
        { includeInsights: true }
      )

      expect(report.insights.length).toBeGreaterThan(0)
    })

    it('should exclude insights when disabled', async () => {
      const data = createMockData()
      const report = await processor.generateReport(
        ReportTemplateType.TASK_ANALYSIS,
        data,
        { includeInsights: false }
      )

      expect(report.insights.length).toBe(0)
    })

    it('should include raw data when requested', async () => {
      const data = createMockData()
      const report = await processor.generateReport(
        ReportTemplateType.TASK_ANALYSIS,
        data,
        { includeCharts: true }
      )

      expect(report.rawData).toBeDefined()
    })
  })

  describe('title generation', () => {
    it('should generate correct title for each template type', async () => {
      const types = [
        { type: ReportTemplateType.PROJECT_PROGRESS, keyword: '项目' },
        { type: ReportTemplateType.TEAM_PERFORMANCE, keyword: '团队' },
        { type: ReportTemplateType.TASK_ANALYSIS, keyword: '任务' },
        { type: ReportTemplateType.AGENT_ACTIVITY, keyword: '智能体' },
        { type: ReportTemplateType.REVENUE_ANALYSIS, keyword: '收入' },
        { type: ReportTemplateType.USER_ENGAGEMENT, keyword: '用户' },
      ]

      for (const { type, keyword } of types) {
        const data = createMockData()
        const report = await processor.generateReport(type, data)
        expect(report.title).toContain(keyword)
      }
    })
  })

  describe('summary generation', () => {
    it('should generate summary with key metrics', async () => {
      const data = createMockData({
        metrics: {
          totalRevenue: 100000,
          growthRate: 18.5,
          yoyGrowth: 42.3,
          arpu: 250,
        },
      })

      const report = await processor.generateReport(
        ReportTemplateType.REVENUE_ANALYSIS,
        data
      )

      expect(report.summary).toBeDefined()
      expect(report.summary.length).toBeGreaterThan(0)
    })
  })

  describe('section generation', () => {
    it('should generate overview section', async () => {
      const data = createMockData()
      const report = await processor.generateReport(
        ReportTemplateType.TASK_ANALYSIS,
        data
      )

      const overviewSection = report.sections.find(s => s.id === 'overview')
      expect(overviewSection).toBeDefined()
      expect(overviewSection?.title).toBeDefined()
      expect(overviewSection?.content).toBeDefined()
    })

    it('should generate trends section when time series available', async () => {
      const data = createMockData()
      const report = await processor.generateReport(
        ReportTemplateType.TASK_ANALYSIS,
        data
      )

      const trendsSection = report.sections.find(s => s.id === 'trends')
      expect(trendsSection).toBeDefined()
    })

    it('should generate breakdown section when breakdown available', async () => {
      const data = createMockData()
      const report = await processor.generateReport(
        ReportTemplateType.TASK_ANALYSIS,
        data
      )

      const breakdownSection = report.sections.find(s => s.id === 'breakdown')
      expect(breakdownSection).toBeDefined()
    })

    it('should include charts when enabled', async () => {
      const data = createMockData()
      const report = await processor.generateReport(
        ReportTemplateType.TASK_ANALYSIS,
        data,
        { includeCharts: true }
      )

      const sectionWithCharts = report.sections.find(s => s.charts && s.charts.length > 0)
      expect(sectionWithCharts).toBeDefined()
    })
  })

  describe('insight generation', () => {
    it('should convert data insights to report insights', async () => {
      const data = createMockData({
        insights: [
          {
            type: 'positive' as const,
            title: 'Test Insight',
            description: 'Test description',
            importance: 'high' as const,
          },
        ],
      })

      const report = await processor.generateReport(
        ReportTemplateType.TASK_ANALYSIS,
        data
      )

      const insight = report.insights.find(i => i.title === 'Test Insight')
      expect(insight).toBeDefined()
      expect(insight?.type).toBe('achievement')
    })

    it('should generate automatic trend insights', async () => {
      const data = createMockData({
        timeSeries: [
          { timestamp: '2025-04-01T00:00:00Z', value: 10 },
          { timestamp: '2025-04-02T00:00:00Z', value: 15 },
          { timestamp: '2025-04-03T00:00:00Z', value: 20 },
          { timestamp: '2025-04-04T00:00:00Z', value: 25 },
        ],
      })

      const report = await processor.generateReport(
        ReportTemplateType.TASK_ANALYSIS,
        data
      )

      // Should detect upward trend
      const trendInsight = report.insights.find(
        i => i.title.includes('趋势') || i.title.includes('Trend')
      )
      expect(trendInsight).toBeDefined()
    })

    it('should generate breakdown insights for dominant categories', async () => {
      const data = createMockData({
        breakdown: [
          { category: 'Category A', value: 60, percentage: 60, trend: 'up' },
          { category: 'Category B', value: 25, percentage: 25, trend: 'stable' },
          { category: 'Category C', value: 15, percentage: 15, trend: 'down' },
        ],
      })

      const report = await processor.generateReport(
        ReportTemplateType.TASK_ANALYSIS,
        data
      )

      const dominantInsight = report.insights.find(
        i => i.title.includes('主导') || i.title.includes('Dominant')
      )
      expect(dominantInsight).toBeDefined()
    })
  })

  describe('metadata', () => {
    it('should include correct metadata', async () => {
      const data = createMockData()
      const report = await processor.generateReport(
        ReportTemplateType.TASK_ANALYSIS,
        data
      )

      expect(report.metadata.generatedAt).toBeDefined()
      expect(report.metadata.timeRange).toEqual(data.metadata.timeRange)
      expect(report.metadata.language).toBeDefined()
      expect(report.metadata.tone).toBeDefined()
      expect(report.metadata.dataPoints).toBe(data.metadata.dataPoints)
      expect(report.metadata.generationTimeMs).toBeGreaterThanOrEqual(0)
    })
  })
})
