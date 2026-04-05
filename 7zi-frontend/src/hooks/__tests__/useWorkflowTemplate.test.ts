/**
 * useWorkflowTemplate Hook Tests
 *
 * 🧪 模板 Hook 测试
 * 版本: v1.12.2
 * 创建日期: 2026-04-04
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWorkflowTemplate } from '../../hooks/useWorkflowTemplate'
import { templateManager } from '../../lib/workflow/template-system'
import type { TemplateCategory } from '../../lib/workflow/template-system'

describe('useWorkflowTemplate', () => {
  beforeEach(() => {
    // 清除 localStorage
    localStorage.clear()
    // 重置模板管理器
    vi.clearAllMocks()
  })

  describe('基本功能', () => {
    it('应该加载所有模板', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.templates.length).toBeGreaterThan(0)
    })

    it('应该提供模板列表', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(Array.isArray(result.current.templates)).toBe(true)
    })

    it('应该提供热门模板', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(Array.isArray(result.current.popularTemplates)).toBe(true)
    })

    it('应该提供最近模板', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(Array.isArray(result.current.recentTemplates)).toBe(true)
    })
  })

  describe('分类筛选', () => {
    it('应该能够选择分类', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.selectCategory('customer-service')
      })

      expect(result.current.selectedCategory).toBe('customer-service')
    })

    it('筛选后应该只显示该分类的模板', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.selectCategory('customer-service')
      })

      await waitFor(() => {
        expect(result.current.filteredTemplates.every(t => t.category === 'customer-service')).toBe(true)
      })
    })

    it('应该能够清除分类筛选', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.selectCategory('customer-service')
      })

      act(() => {
        result.current.selectCategory(null)
      })

      expect(result.current.selectedCategory).toBe(null)
    })
  })

  describe('搜索功能', () => {
    it('应该能够搜索模板', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.searchTemplates('AI')
      })

      expect(result.current.searchQuery).toBe('AI')
    })

    it('搜索结果应该匹配关键词', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.searchTemplates('AI')
      })

      await waitFor(() => {
        expect(result.current.filteredTemplates.every(
          t =>
            t.name.toLowerCase().includes('ai') ||
            t.description.toLowerCase().includes('ai') ||
            t.tags.some(tag => tag.toLowerCase().includes('ai'))
        )).toBe(true)
      })
    })

    it('应该能够清除搜索', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.searchTemplates('AI')
      })

      act(() => {
        result.current.searchTemplates('')
      })

      expect(result.current.searchQuery).toBe('')
    })
  })

  describe('获取模板', () => {
    it('应该能够根据 ID 获取模板', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const firstTemplate = result.current.templates[0]
      const found = result.current.getTemplateById(firstTemplate.id)

      expect(found).toEqual(firstTemplate)
    })

    it('获取不存在的模板应该返回 undefined', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const found = result.current.getTemplateById('non-existent-id')

      expect(found).toBeUndefined()
    })
  })

  describe('从模板创建工作流', () => {
    it('应该能够从模板创建工作流', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const firstTemplate = result.current.templates[0]
      const workflow = result.current.createWorkflowFromTemplate(firstTemplate.id)

      expect(workflow).not.toBeNull()
      expect(workflow?.nodes.length).toBeGreaterThan(0)
      expect(workflow?.edges.length).toBeGreaterThan(0)
    })

    it('创建的工作流应该有新的节点 ID', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const firstTemplate = result.current.templates[0]
      const originalNodeId = firstTemplate.workflow.nodes[0].id

      const workflow = result.current.createWorkflowFromTemplate(firstTemplate.id)
      const newNodeId = workflow?.nodes[0].id

      expect(newNodeId).not.toBe(originalNodeId)
    })

    it('创建的工作流应该增加模板使用次数', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const firstTemplate = result.current.templates[0]
      const beforeUsage = firstTemplate.usageCount

      result.current.createWorkflowFromTemplate(firstTemplate.id)

      await waitFor(() => {
        const updatedTemplate = result.current.getTemplateById(firstTemplate.id)
        expect(updatedTemplate?.usageCount).toBe(beforeUsage + 1)
      })
    })

    it('从不存在的模板创建应该返回 null', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const workflow = result.current.createWorkflowFromTemplate('non-existent-id')

      expect(workflow).toBeNull()
    })
  })

  describe('保存自定义模板', () => {
    it('应该能够保存自定义模板', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const beforeCount = result.current.templates.length

      const template = result.current.saveAsTemplate(
        '测试模板',
        '这是一个测试模板',
        'custom',
        ['测试'],
        [],
        []
      )

      expect(template).not.toBeNull()
      expect(template?.name).toBe('测试模板')

      await waitFor(() => {
        expect(result.current.templates.length).toBe(beforeCount + 1)
      })
    })

    it('保存的模板应该出现在模板列表中', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const template = result.current.saveAsTemplate(
        '新模板',
        '描述',
        'custom',
        [],
        [],
        []
      )

      await waitFor(() => {
        const found = result.current.getTemplateById(template!.id)
        expect(found).toBeDefined()
      })
    })
  })

  describe('删除模板', () => {
    it('应该能够删除自定义模板', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const template = result.current.saveAsTemplate(
        '待删除',
        '描述',
        'custom',
        [],
        [],
        []
      )

      await waitFor(() => {
        expect(result.current.getTemplateById(template!.id)).toBeDefined()
      })

      const success = result.current.deleteTemplate(template!.id)

      expect(success).toBe(true)

      await waitFor(() => {
        expect(result.current.getTemplateById(template!.id)).toBeUndefined()
      })
    })

    it('不应该能够删除预设模板', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const presetTemplate = result.current.templates.find(t => t.isPreset)
      expect(presetTemplate).toBeDefined()

      const success = result.current.deleteTemplate(presetTemplate!.id)

      expect(success).toBe(false)
    })
  })

  describe('刷新模板', () => {
    it('应该能够刷新模板列表', async () => {
      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const beforeCount = result.current.templates.length

      // 添加一个新模板
      templateManager.createTemplate({
        name: '新模板',
        description: '描述',
        category: 'custom',
        workflow: { nodes: [], edges: [] },
        tags: [],
      })

      act(() => {
        result.current.refreshTemplates()
      })

      await waitFor(() => {
        expect(result.current.templates.length).toBe(beforeCount + 1)
      })
    })
  })

  describe('错误处理', () => {
    it('应该处理加载错误', async () => {
      // 模拟 localStorage 错误
      const originalGetItem = localStorage.getItem
      localStorage.getItem = vi.fn(() => {
        throw new Error('Storage error')
      })

      const { result } = renderHook(() => useWorkflowTemplate({ autoLoad: true }))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.error).not.toBeNull()

      // 恢复
      localStorage.getItem = originalGetItem
    })
  })
})