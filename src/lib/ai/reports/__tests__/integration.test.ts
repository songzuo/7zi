/**
 * Report Generator Integration Tests
 * 报表生成器集成测试
 * 
 * @version 1.10.0
 */

import { ReportGenerator } from '../index'
import {
  ReportTemplateType,
  ReportLanguage,
  ReportTone,
} from '../types'

describe('ReportGenerator Integration', () => {
  let generator: ReportGenerator

  beforeEach(() => {
    generator = new ReportGenerator(null, {
      enableCache: true,
      cacheTTL: 300,
      defaultLanguage: ReportLanguage.ZH_CN,
      defaultTone: ReportTone.FORMAL,
    })
  })

  afterEach(() => {
    generator.clearCache()
  })

  describe('generate', () => {
    it('should generate project progress report', async () => {
      const report = await generator.generate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week',
      })

      expect(report).toBeDefined()
      expect(report.id).toBeDefined()
      expect(report.title).toContain('项目')
      expect(report.summary).toBeDefined()
      expect(report.sections.length).toBeGreaterThan(0)
    })

    it('should generate team performance report', async () => {
      const report = await generator.generate({
        templateType: ReportTemplateType.TEAM_PERFORMANCE,
        timeRange: 'month',
      })

      expect(report).toBeDefined()
      expect(report.title).toContain('团队')
    })

    it('should generate task analysis report', async () => {
      const report = await generator.generate({
        templateType: ReportTemplateType.TASK_ANALYSIS,
        timeRange: 'week',
      })

      expect(report).toBeDefined()
      expect(report.title).toContain('任务')
    })

    it('should generate agent activity report', async () => {
      const report = await generator.generate({
        templateType: ReportTemplateType.AGENT_ACTIVITY,
        timeRange: 'week',
      })

      expect(report).toBeDefined()
      expect(report.title).toContain('智能体')
    })

    it('should generate revenue analysis report', async () => {
      const report = await generator.generate({
        templateType: ReportTemplateType.REVENUE_ANALYSIS,
        timeRange: 'month',
      })

      expect(report).toBeDefined()
      expect(report.title).toContain('收入')
    })

    it('should generate user engagement report', async () => {
      const report = await generator.generate({
        templateType: ReportTemplateType.USER_ENGAGEMENT,
        timeRange: 'week',
      })

      expect(report).toBeDefined()
      expect(report.title).toContain('用户')
    })

    it('should use custom time range', async () => {
      const start = new Date('2025-01-01').toISOString()
      const end = new Date('2025-01-31').toISOString()

      const report = await generator.generate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'custom',
        customRange: { start, end },
      })

      expect(report).toBeDefined()
      expect(report.metadata.timeRange.start).toBe(start)
      expect(report.metadata.timeRange.end).toBe(end)
    })

    it('should apply custom variables', async () => {
      const report = await generator.generate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week',
        variables: {
          projectName: 'Custom Project',
          customMetric: 100,
        },
      })

      expect(report).toBeDefined()
      expect(report.rawData?.metrics.projectName).toBe('Custom Project')
    })

    it('should respect language option', async () => {
      const report = await generator.generate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week',
        language: ReportLanguage.EN_US,
      })

      expect(report.metadata.language).toBe(ReportLanguage.EN_US)
      expect(report.title).toContain('Project')
    })

    it('should respect tone option', async () => {
      const report = await generator.generate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week',
        tone: ReportTone.CONCISE,
      })

      expect(report.metadata.tone).toBe(ReportTone.CONCISE)
    })

    it('should control insight inclusion', async () => {
      const reportWithInsights = await generator.generate({
        templateType: ReportTemplateType.TASK_ANALYSIS,
        timeRange: 'week',
        options: { includeInsights: true },
      })
      expect(reportWithInsights.insights.length).toBeGreaterThan(0)

      const reportWithoutInsights = await generator.generate({
        templateType: ReportTemplateType.TASK_ANALYSIS,
        timeRange: 'week',
        options: { includeInsights: false },
      })
      expect(reportWithoutInsights.insights.length).toBe(0)
    })
  })

  describe('generateCustom', () => {
    it('should generate custom report', async () => {
      const report = await generator.generateCustom({
        title: 'Custom Analytics Report',
        description: 'A custom report with specific metrics',
        sections: [
          {
            title: 'Performance',
            dataSource: 'performance',
            metrics: ['responseTime', 'throughput'],
          },
          {
            title: 'Usage',
            dataSource: 'usage',
            metrics: ['activeUsers', 'sessions'],
          },
        ],
        timeRange: 'week',
      })

      expect(report).toBeDefined()
      expect(report.title).toBe('Custom Analytics Report')
      expect(report.templateType).toBe(ReportTemplateType.CUSTOM)
    })
  })

  describe('templates', () => {
    it('should return all templates', () => {
      const templates = generator.getTemplates()
      expect(templates.length).toBeGreaterThan(0)
    })

    it('should return specific template', () => {
      const template = generator.getTemplate('tpl-project-progress')
      expect(template).toBeDefined()
      expect(template?.id).toBe('tpl-project-progress')
    })

    it('should return supported template types', () => {
      const types = generator.getSupportedTemplateTypes()
      expect(types).toContain(ReportTemplateType.PROJECT_PROGRESS)
      expect(types).toContain(ReportTemplateType.TEAM_PERFORMANCE)
      expect(types).toContain(ReportTemplateType.TASK_ANALYSIS)
    })

    it('should register custom template', () => {
      const customTemplate = {
        id: 'custom-test-template',
        type: ReportTemplateType.CUSTOM,
        name: 'Test Template',
        description: 'A test template',
        version: '1.0.0',
        variables: [],
        sections: [],
        supportedLanguages: [ReportLanguage.ZH_CN],
        supportedTones: [ReportTone.FORMAL],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }

      generator.registerTemplate(customTemplate)

      const retrieved = generator.getTemplate('custom-test-template')
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Test Template')
    })
  })

  describe('caching', () => {
    it('should use cache for repeated requests', async () => {
      const request = {
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week' as const,
      }

      // First request
      const report1 = await generator.generate(request)

      // Second request (should hit cache at data aggregator level)
      const report2 = await generator.generate(request)

      expect(report1.metadata).toBeDefined()
      expect(report2.metadata).toBeDefined()
    })

    it('should clear cache', async () => {
      await generator.generate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week',
      })

      generator.clearCache()

      const stats = generator.getCacheStats()
      expect(stats.size).toBe(0)
    })

    it('should return cache stats', async () => {
      await generator.generate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week',
      })

      const stats = generator.getCacheStats()
      expect(stats).toBeDefined()
      expect(stats.size).toBeDefined()
      expect(stats.entries).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should handle invalid template ID gracefully', async () => {
      const report = await generator.generate({
        templateId: 'non-existent',
        timeRange: 'week',
      })

      // Should fallback to custom template type
      expect(report).toBeDefined()
    })

    it('should handle missing custom time range', async () => {
      await expect(
        generator.generate({
          templateType: ReportTemplateType.PROJECT_PROGRESS,
          timeRange: 'custom',
          // customRange is missing
        })
      ).rejects.toThrow()
    })
  })

  describe('performance', () => {
    it('should generate report within reasonable time', async () => {
      const startTime = Date.now()

      await generator.generate({
        templateType: ReportTemplateType.PROJECT_PROGRESS,
        timeRange: 'week',
      })

      const elapsed = Date.now() - startTime
      expect(elapsed).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})
