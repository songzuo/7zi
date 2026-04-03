/**
 * Report Template Engine Tests
 * 报表模板引擎测试
 * 
 * @version 1.10.0
 */

import { ReportTemplateEngine } from '../template-engine'
import {
  ReportTemplateType,
  ReportLanguage,
  ReportTone,
} from '../types'

describe('ReportTemplateEngine', () => {
  let engine: ReportTemplateEngine

  beforeEach(() => {
    engine = new ReportTemplateEngine()
  })

  describe('getTemplate', () => {
    it('should return undefined for non-existent template', () => {
      const template = engine.getTemplate('non-existent')
      expect(template).toBeUndefined()
    })

    it('should return template for valid id', () => {
      const template = engine.getTemplate('tpl-project-progress')
      expect(template).toBeDefined()
      expect(template?.type).toBe(ReportTemplateType.PROJECT_PROGRESS)
    })
  })

  describe('getTemplateByType', () => {
    it('should return template for valid type', () => {
      const template = engine.getTemplateByType(ReportTemplateType.TEAM_PERFORMANCE)
      expect(template).toBeDefined()
      expect(template?.type).toBe(ReportTemplateType.TEAM_PERFORMANCE)
    })
  })

  describe('getAllTemplates', () => {
    it('should return all built-in templates', () => {
      const templates = engine.getAllTemplates()
      expect(templates.length).toBeGreaterThan(0)
      expect(templates.some(t => t.type === ReportTemplateType.PROJECT_PROGRESS)).toBe(true)
      expect(templates.some(t => t.type === ReportTemplateType.TEAM_PERFORMANCE)).toBe(true)
      expect(templates.some(t => t.type === ReportTemplateType.TASK_ANALYSIS)).toBe(true)
    })
  })

  describe('interpolate', () => {
    it('should interpolate simple variables', () => {
      const template = 'Hello {{name}}, you have {{count}} tasks'
      const result = engine.interpolate(template, { name: 'Alice', count: 5 })
      expect(result).toBe('Hello Alice, you have 5 tasks')
    })

    it('should interpolate nested variables', () => {
      const template = 'Project: {{project.name}}, Progress: {{project.progress}}%'
      const result = engine.interpolate(template, {
        project: { name: 'Website', progress: 75 }
      })
      expect(result).toBe('Project: Website, Progress: 75%')
    })

    it('should handle conditional blocks', () => {
      const template = 'Status: {{#if active}}Active{{/if}}'
      const result1 = engine.interpolate(template, { active: true })
      expect(result1).toBe('Status: Active')

      const result2 = engine.interpolate(template, { active: false })
      expect(result2).toBe('Status: ')
    })

    it('should handle loops', () => {
      const template = '{{#each items}}{{this}}, {{/each}}'
      const result = engine.interpolate(template, { items: ['A', 'B', 'C'] })
      expect(result).toContain('A')
      expect(result).toContain('B')
      expect(result).toContain('C')
    })
  })

  describe('validateVariables', () => {
    it('should validate required variables', () => {
      const template = engine.getTemplate('tpl-project-progress')
      if (!template) throw new Error('Template not found')

      const result = engine.validateVariables(template, {})
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.includes('projectName'))).toBe(true)
    })

    it('should validate variable types', () => {
      const template = engine.getTemplate('tpl-project-progress')
      if (!template) throw new Error('Template not found')

      const result = engine.validateVariables(template, {
        projectName: 'Test Project',
        overallProgress: 'not-a-number', // Should be number
        milestones: [],
      })

      expect(result.errors.some(e => e.includes('Invalid type'))).toBe(true)
    })

    it('should validate number constraints', () => {
      const template = engine.getTemplate('tpl-project-progress')
      if (!template) throw new Error('Template not found')

      const result = engine.validateVariables(template, {
        projectName: 'Test',
        overallProgress: 150, // Should be 0-100
        milestones: [],
      })

      expect(result.errors.some(e => e.includes('must be'))).toBe(true)
    })
  })

  describe('renderSections', () => {
    it('should render all sections', () => {
      const template = engine.getTemplate('tpl-project-progress')
      if (!template) throw new Error('Template not found')

      const variables = {
        projectName: 'Test Project',
        overallProgress: 68,
        completedTasks: 42,
        newTasks: 15,
        progressTrend: '提升 5%',
        milestones: [],
      }

      const sections = engine.renderSections(template, variables)
      expect(sections.length).toBeGreaterThan(0)
      expect(sections[0]).toContain('Test Project')
    })

    it('should respect conditional sections', () => {
      const template = engine.getTemplate('tpl-project-progress')
      if (!template) throw new Error('Template not found')

      const variables = {
        projectName: 'Test',
        overallProgress: 50,
        completedTasks: 10,
        newTasks: 5,
        progressTrend: '稳定',
        milestones: [],
        risks: undefined, // Conditional section should not render
      }

      const sections = engine.renderSections(template, variables)
      const hasRisksSection = sections.some(s => s.includes('风险提示'))
      expect(hasRisksSection).toBe(false)
    })
  })

  describe('registerTemplate', () => {
    it('should register custom template', () => {
      const customTemplate = {
        id: 'custom-1',
        type: ReportTemplateType.CUSTOM,
        name: 'Custom Report',
        description: 'A custom template',
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

      engine.registerTemplate(customTemplate)
      const retrieved = engine.getTemplate('custom-1')
      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('Custom Report')
    })
  })
})
