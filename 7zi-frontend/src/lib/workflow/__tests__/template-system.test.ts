/**
 * Template System Tests
 *
 * 🧪 模板系统测试
 * 版本: v1.12.2
 * 创建日期: 2026-04-04
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TemplateManager } from '../template-system'
import type { Template, TemplateCategory } from '../template-system'

describe('TemplateManager', () => {
  let manager: TemplateManager

  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear()
    manager = new TemplateManager()
  })

  describe('初始化', () => {
    it('应该初始化预设模板', () => {
      const templates = manager.getAllTemplates()
      expect(templates.length).toBeGreaterThan(0)
      expect(templates.every(t => t.isPreset)).toBe(true)
    })

    it('应该包含 5 个预设模板', () => {
      const templates = manager.getAllTemplates()
      expect(templates.length).toBe(5)
    })

    it('预设模板应该有正确的分类', () => {
      const templates = manager.getAllTemplates()
      const categories = templates.map(t => t.category)
      expect(categories).toContain('customer-service')
      expect(categories).toContain('data-processing')
      expect(categories).toContain('automation')
      expect(categories).toContain('approval')
      expect(categories).toContain('collaboration')
    })
  })

  describe('获取模板', () => {
    it('应该能够获取所有模板', () => {
      const templates = manager.getAllTemplates()
      expect(Array.isArray(templates)).toBe(true)
      expect(templates.length).toBe(5)
    })

    it('应该能够根据分类获取模板', () => {
      const customerServiceTemplates = manager.getTemplatesByCategory('customer-service')
      expect(customerServiceTemplates.length).toBe(1)
      expect(customerServiceTemplates[0].category).toBe('customer-service')
    })

    it('应该能够根据 ID 获取模板', () => {
      const templates = manager.getAllTemplates()
      const firstTemplate = templates[0]
      const found = manager.getTemplateById(firstTemplate.id)
      expect(found).toEqual(firstTemplate)
    })

    it('应该能够搜索模板', () => {
      const results = manager.searchTemplates('AI')
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(t => t.name.includes('AI') || t.description.includes('AI') || t.tags.some(tag => tag.includes('AI')))).toBe(true)
    })
  })

  describe('创建自定义模板', () => {
    it('应该能够创建自定义模板', () => {
      const customTemplate = manager.createTemplate({
        name: '自定义模板',
        description: '这是一个自定义模板',
        category: 'custom',
        workflow: {
          nodes: [],
          edges: [],
        },
        tags: ['自定义', '测试'],
      })

      expect(customTemplate.id).toBeDefined()
      expect(customTemplate.name).toBe('自定义模板')
      expect(customTemplate.isPreset).toBe(false)
      expect(customTemplate.usageCount).toBe(0)
    })

    it('创建的模板应该出现在模板列表中', () => {
      const beforeCount = manager.getAllTemplates().length
      manager.createTemplate({
        name: '新模板',
        description: '描述',
        category: 'custom',
        workflow: { nodes: [], edges: [] },
        tags: [],
      })
      const afterCount = manager.getAllTemplates().length
      expect(afterCount).toBe(beforeCount + 1)
    })
  })

  describe('更新模板', () => {
    it('应该能够更新自定义模板', () => {
      const template = manager.createTemplate({
        name: '原始名称',
        description: '原始描述',
        category: 'custom',
        workflow: { nodes: [], edges: [] },
        tags: [],
      })

      const updated = manager.updateTemplate(template.id, {
        name: '更新后的名称',
      })

      expect(updated?.name).toBe('更新后的名称')
    })

    it('不应该允许修改预设模板的核心属性', () => {
      const presetTemplate = manager.getAllTemplates().find(t => t.isPreset)
      expect(presetTemplate).toBeDefined()

      const updated = manager.updateTemplate(presetTemplate!.id, {
        name: '尝试修改',
      })

      expect(updated?.name).toBe(presetTemplate!.name)
    })

    it('应该允许增加预设模板的使用次数', () => {
      const presetTemplate = manager.getAllTemplates().find(t => t.isPreset)
      expect(presetTemplate).toBeDefined()

      const beforeUsage = presetTemplate!.usageCount
      manager.incrementUsage(presetTemplate!.id)

      const afterTemplate = manager.getTemplateById(presetTemplate!.id)
      expect(afterTemplate?.usageCount).toBe(beforeUsage + 1)
    })
  })

  describe('删除模板', () => {
    it('应该能够删除自定义模板', () => {
      const template = manager.createTemplate({
        name: '待删除',
        description: '描述',
        category: 'custom',
        workflow: { nodes: [], edges: [] },
        tags: [],
      })

      const success = manager.deleteTemplate(template.id)
      expect(success).toBe(true)

      const found = manager.getTemplateById(template.id)
      expect(found).toBeUndefined()
    })

    it('不应该允许删除预设模板', () => {
      const presetTemplate = manager.getAllTemplates().find(t => t.isPreset)
      expect(presetTemplate).toBeDefined()

      const success = manager.deleteTemplate(presetTemplate!.id)
      expect(success).toBe(false)

      const found = manager.getTemplateById(presetTemplate!.id)
      expect(found).toBeDefined()
    })
  })

  describe('热门和最近模板', () => {
    it('应该能够获取热门模板', () => {
      const templates = manager.getAllTemplates()
      // 增加第一个模板的使用次数
      manager.incrementUsage(templates[0].id)
      manager.incrementUsage(templates[0].id)

      const popular = manager.getPopularTemplates(3)
      expect(popular.length).toBeLessThanOrEqual(3)
      expect(popular[0].id).toBe(templates[0].id)
    })

    it('应该能够获取最近创建的模板', () => {
      const recent = manager.getRecentTemplates(3)
      expect(recent.length).toBeLessThanOrEqual(3)
      // 应该按创建时间降序排列
      for (let i = 0; i < recent.length - 1; i++) {
        expect(recent[i].createdAt).toBeGreaterThanOrEqual(recent[i + 1].createdAt)
      }
    })
  })

  describe('持久化', () => {
    it('应该能够保存模板到 localStorage', () => {
      const template = manager.createTemplate({
        name: '持久化测试',
        description: '测试',
        category: 'custom',
        workflow: { nodes: [], edges: [] },
        tags: [],
      })

      // 创建新的 manager 实例
      const newManager = new TemplateManager()
      const found = newManager.getTemplateById(template.id)
      expect(found).toEqual(template)
    })
  })
})

describe('预设模板内容', () => {
  let manager: TemplateManager

  beforeEach(() => {
    localStorage.clear()
    manager = new TemplateManager()
  })

  it('AI 客服对话流程应该包含正确的节点', () => {
    const template = manager.getTemplateById('preset-ai-customer-service')
    expect(template).toBeDefined()
    expect(template?.workflow.nodes.length).toBe(5)
    expect(template?.workflow.nodes.some(n => n.type === 'start')).toBe(true)
    expect(template?.workflow.nodes.some(n => n.type === 'condition')).toBe(true)
  })

  it('数据处理流水线应该包含并行节点', () => {
    const template = manager.getTemplateById('preset-data-pipeline')
    expect(template).toBeDefined()
    expect(template?.workflow.nodes.length).toBe(7)
    // 应该有 3 个数据源节点
    const dataSources = template?.workflow.nodes.filter(n => n.data.label?.includes('数据源'))
    expect(dataSources?.length).toBe(3)
  })

  it('定时任务调度应该包含循环节点', () => {
    const template = manager.getTemplateById('preset-scheduled-task')
    expect(template).toBeDefined()
    expect(template?.workflow.nodes.some(n => n.type === 'wait')).toBe(true)
    expect(template?.workflow.nodes.some(n => n.type === 'condition')).toBe(true)
  })

  it('人工审批流程应该包含等待节点', () => {
    const template = manager.getTemplateById('preset-approval-flow')
    expect(template).toBeDefined()
    expect(template?.workflow.nodes.some(n => n.type === 'wait')).toBe(true)
    expect(template?.workflow.nodes.some(n => n.data.label?.includes('审批'))).toBe(true)
  })

  it('多 Agent 协作任务应该包含多个 Agent 节点', () => {
    const template = manager.getTemplateById('preset-multi-agent')
    expect(template).toBeDefined()
    const agents = template?.workflow.nodes.filter(n => n.data.label?.includes('Agent'))
    expect(agents?.length).toBe(3)
  })
})