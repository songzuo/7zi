/**
 * 模板系统测试
 *
 * 版本: v1.12.2
 * 创建日期: 2026-04-04
 */

import {
  listTemplates,
  getTemplate,
  createFromTemplate,
  validateTemplate,
  getTemplateStats,
  listTemplatesByCategory,
  listTemplatesByDifficulty,
  searchTemplatesByTag,
} from '../templates'
import { runTemplateValidation } from './templateValidation'

describe('Workflow Template System', () => {
  describe('listTemplates', () => {
    it('should return all templates', () => {
      const templates = listTemplates()
      expect(templates).toBeInstanceOf(Array)
      expect(templates.length).toBeGreaterThan(0)
    })

    it('should return templates with correct structure', () => {
      const templates = listTemplates()
      templates.forEach((template) => {
        expect(template).toHaveProperty('id')
        expect(template).toHaveProperty('name')
        expect(template).toHaveProperty('description')
        expect(template).toHaveProperty('category')
        expect(template).toHaveProperty('icon')
        expect(template).toHaveProperty('tags')
        expect(template).toHaveProperty('difficulty')
        expect(template).toHaveProperty('estimatedNodes')
        expect(template).toHaveProperty('workflow')
      })
    })
  })

  describe('getTemplate', () => {
    it('should return template by id', () => {
      const template = getTemplate('blank')
      expect(template).toBeDefined()
      expect(template?.id).toBe('blank')
    })

    it('should return undefined for non-existent template', () => {
      const template = getTemplate('non-existent')
      expect(template).toBeUndefined()
    })
  })

  describe('createFromTemplate', () => {
    it('should create workflow from template', () => {
      const workflow = createFromTemplate('blank', 'Test Workflow', 'Test Description')
      expect(workflow).toBeDefined()
      expect(workflow?.name).toBe('Test Workflow')
      expect(workflow?.description).toBe('Test Description')
      expect(workflow?.nodes).toBeInstanceOf(Array)
      expect(workflow?.edges).toBeInstanceOf(Array)
    })

    it('should return null for non-existent template', () => {
      const workflow = createFromTemplate('non-existent', 'Test Workflow')
      expect(workflow).toBeNull()
    })

    it('should create unique IDs for each workflow', () => {
      const workflow1 = createFromTemplate('blank', 'Workflow 1')
      const workflow2 = createFromTemplate('blank', 'Workflow 2')
      expect(workflow1?.id).not.toBe(workflow2?.id)
    })
  })

  describe('validateTemplate', () => {
    it('should validate correct template', () => {
      const template = getTemplate('blank')
      expect(template).toBeDefined()
      if (template) {
        expect(validateTemplate(template)).toBe(true)
      }
    })

    it('should invalidate template with missing fields', () => {
      const invalidTemplate = {
        id: 'invalid',
        name: 'Invalid Template',
        workflow: {
          nodes: [],
          edges: [],
        },
      } as any
      expect(validateTemplate(invalidTemplate)).toBe(false)
    })
  })

  describe('getTemplateStats', () => {
    it('should return correct statistics', () => {
      const stats = getTemplateStats()
      expect(stats.total).toBeGreaterThan(0)
      expect(stats.byCategory).toBeDefined()
      expect(stats.byDifficulty).toBeDefined()
    })
  })

  describe('listTemplatesByCategory', () => {
    it('should filter templates by category', () => {
      const basicTemplates = listTemplatesByCategory('basic')
      expect(basicTemplates.every((t) => t.category === 'basic')).toBe(true)
    })
  })

  describe('listTemplatesByDifficulty', () => {
    it('should filter templates by difficulty', () => {
      const beginnerTemplates = listTemplatesByDifficulty('beginner')
      expect(beginnerTemplates.every((t) => t.difficulty === 'beginner')).toBe(true)
    })
  })

  describe('searchTemplatesByTag', () => {
    it('should search templates by tag', () => {
      const results = searchTemplatesByTag('AI')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Template Validation', () => {
    it('should pass all validations', () => {
      const templates = listTemplates()
      const result = runTemplateValidation(templates)
      expect(result.success).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('Template Content', () => {
    it('blank template should have start and end nodes', () => {
      const template = getTemplate('blank')
      expect(template).toBeDefined()
      expect(template?.workflow.nodes).toHaveLength(2)
      expect(template?.workflow.nodes[0].type).toBe('start')
      expect(template?.workflow.nodes[1].type).toBe('end')
    })

    it('ai-chat template should have agent node', () => {
      const template = getTemplate('ai-chat')
      expect(template).toBeDefined()
      const agentNodes = template?.workflow.nodes.filter((n) => n.type === 'agent')
      expect(agentNodes).toHaveLength(1)
    })

    it('conditional template should have condition node', () => {
      const template = getTemplate('conditional')
      expect(template).toBeDefined()
      const conditionNodes = template?.workflow.nodes.filter((n) => n.type === 'condition')
      expect(conditionNodes).toHaveLength(1)
    })

    it('loop template should have loop node', () => {
      const template = getTemplate('loop')
      expect(template).toBeDefined()
      const loopNodes = template?.workflow.nodes.filter((n) => n.type === 'loop')
      expect(loopNodes).toHaveLength(1)
    })

    it('data-processing template should have transform node', () => {
      const template = getTemplate('data-processing')
      expect(template).toBeDefined()
      const transformNodes = template?.workflow.nodes.filter((n) => n.type === 'transform')
      expect(transformNodes).toHaveLength(1)
    })
  })
})
