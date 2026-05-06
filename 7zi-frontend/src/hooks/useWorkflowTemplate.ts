/**
 * useWorkflowTemplate Hook
 *
 * 🎣 模板系统 Hook
 * 版本: v1.12.2
 * 创建日期: 2026-04-04
 *
 * 提供模板管理、筛选、搜索和应用功能
 */

import { useState, useEffect, useCallback } from 'react'
import { generateSecureId } from '@/lib/utils'
import { templateManager } from '../lib/workflow/template-system'
import type { Template, TemplateCategory } from '../lib/workflow/template-system'
import type { Node, Edge } from 'reactflow'

export interface UseWorkflowTemplateOptions {
  autoLoad?: boolean
  initialCategory?: TemplateCategory
}

export interface UseWorkflowTemplateReturn {
  // 数据
  templates: Template[]
  filteredTemplates: Template[]
  popularTemplates: Template[]
  recentTemplates: Template[]

  // 状态
  loading: boolean
  error: Error | null
  selectedCategory: TemplateCategory | null
  searchQuery: string

  // 操作
  selectCategory: (category: TemplateCategory | null) => void
  searchTemplates: (query: string) => void
  getTemplateById: (id: string) => Template | undefined
  createWorkflowFromTemplate: (templateId: string) => { nodes: Node[]; edges: Edge[] } | null
  saveAsTemplate: (
    name: string,
    description: string,
    category: TemplateCategory,
    tags: string[],
    nodes: Node[],
    edges: Edge[]
  ) => Template | null
  deleteTemplate: (id: string) => boolean
  refreshTemplates: () => void
}

/**
 * Workflow Template Hook
 */
export function useWorkflowTemplate(
  options: UseWorkflowTemplateOptions = {}
): UseWorkflowTemplateReturn {
  const { autoLoad = true, initialCategory = null } = options

  // 状态
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState<boolean>(autoLoad)
  const [error, setError] = useState<Error | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | null>(initialCategory)
  const [searchQuery, setSearchQuery] = useState<string>('')

  /**
   * 加载所有模板
   */
  const refreshTemplates = useCallback(() => {
    try {
      setLoading(true)
      const allTemplates = templateManager.getAllTemplates()
      setTemplates(allTemplates)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('加载模板失败'))
      console.error('[useWorkflowTemplate] 加载模板失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 初始加载
   */
  useEffect(() => {
    if (autoLoad) {
      refreshTemplates()
    }
  }, [autoLoad, refreshTemplates])

  /**
   * 根据分类和搜索查询过滤模板
   */
  const filteredTemplates = useState<Template[]>(() => {
    let result = templates

    // 分类筛选
    if (selectedCategory) {
      result = result.filter(t => t.category === selectedCategory)
    }

    // 搜索筛选
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    return result
  })[0]

  // 重新计算筛选结果
  useEffect(() => {
    let result = templates

    if (selectedCategory) {
      result = result.filter(t => t.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      result = result.filter(
        t =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }

    setFilteredTemplatesState(result)
  }, [templates, selectedCategory, searchQuery])

  const [filteredTemplatesState, setFilteredTemplatesState] = useState<Template[]>([])

  /**
   * 获取热门模板
   */
  const popularTemplates = useState<Template[]>(() => {
    return templateManager.getPopularTemplates(5)
  })[0]

  // 更新热门模板
  useEffect(() => {
    setPopularTemplatesState(templateManager.getPopularTemplates(5))
  }, [templates])

  const [popularTemplatesState, setPopularTemplatesState] = useState<Template[]>([])

  /**
   * 获取最近创建的模板
   */
  const recentTemplates = useState<Template[]>(() => {
    return templateManager.getRecentTemplates(5)
  })[0]

  // 更新最近模板
  useEffect(() => {
    setRecentTemplatesState(templateManager.getRecentTemplates(5))
  }, [templates])

  const [recentTemplatesState, setRecentTemplatesState] = useState<Template[]>([])

  /**
   * 选择分类
   */
  const selectCategory = useCallback((category: TemplateCategory | null) => {
    setSelectedCategory(category)
  }, [])

  /**
   * 搜索模板
   */
  const searchTemplates = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  /**
   * 根据 ID 获取模板
   */
  const getTemplateById = useCallback(
    (id: string): Template | undefined => {
      return templateManager.getTemplateById(id)
    },
    []
  )

  /**
   * 从模板创建工作流
   */
  const createWorkflowFromTemplate = useCallback(
    (templateId: string): { nodes: Node[]; edges: Edge[] } | null => {
      try {
        const template = templateManager.getTemplateById(templateId)
        if (!template) {
          console.error('[useWorkflowTemplate] 模板不存在:', templateId)
          return null
        }

        // 深拷贝节点和边，避免修改原模板
        const nodes = JSON.parse(JSON.stringify(template.workflow.nodes))
        const edges = JSON.parse(JSON.stringify(template.workflow.edges))

        // 为每个节点生成新的 ID（避免冲突）
        const idMap = new Map<string, string>()
        nodes.forEach((node: Node) => {
          const newId = generateSecureId(node.type)
          idMap.set(node.id, newId)
          node.id = newId
        })

        // 更新边的 source 和 target
        edges.forEach((edge: Edge) => {
          const newSource = idMap.get(edge.source)
          const newTarget = idMap.get(edge.target)
          if (newSource) edge.source = newSource
          if (newTarget) edge.target = newTarget
        })

        // 增加模板使用次数
        templateManager.incrementUsage(templateId)

        // 刷新模板列表以更新使用次数
        refreshTemplates()

        return { nodes, edges }
      } catch (err) {
        console.error('[useWorkflowTemplate] 创建工作流失败:', err)
        return null
      }
    },
    [refreshTemplates]
  )

  /**
   * 保存为自定义模板
   */
  const saveAsTemplate = useCallback(
    (
      name: string,
      description: string,
      category: TemplateCategory,
      tags: string[],
      nodes: Node[],
      edges: Edge[]
    ): Template | null => {
      try {
        const template = templateManager.createTemplate({
          name,
          description,
          category,
          workflow: { nodes, edges },
          tags,
        })

        // 刷新模板列表
        refreshTemplates()

        return template
      } catch (err) {
        console.error('[useWorkflowTemplate] 保存模板失败:', err)
        return null
      }
    },
    [refreshTemplates]
  )

  /**
   * 删除模板
   */
  const deleteTemplate = useCallback(
    (id: string): boolean => {
      const success = templateManager.deleteTemplate(id)
      if (success) {
        refreshTemplates()
      }
      return success
    },
    [refreshTemplates]
  )

  return {
    // 数据
    templates,
    filteredTemplates: filteredTemplatesState,
    popularTemplates: popularTemplatesState,
    recentTemplates: recentTemplatesState,

    // 状态
    loading,
    error,
    selectedCategory,
    searchQuery,

    // 操作
    selectCategory,
    searchTemplates,
    getTemplateById,
    createWorkflowFromTemplate,
    saveAsTemplate,
    deleteTemplate,
    refreshTemplates,
  }
}

/**
 * 便捷 Hook：仅获取模板列表
 */
export function useWorkflowTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const allTemplates = templateManager.getAllTemplates()
      setTemplates(allTemplates)
    } catch (err) {
      console.error('[useWorkflowTemplates] 加载模板失败:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return { templates, loading }
}

/**
 * 便捷 Hook：从模板快速创建工作流
 */
export function useCreateWorkflowFromTemplate(templateId: string) {
  const [workflow, setWorkflow] = useState<{ nodes: Node[]; edges: Edge[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    try {
      const template = templateManager.getTemplateById(templateId)
      if (!template) {
        throw new Error(`模板不存在: ${templateId}`)
      }

      const nodes = JSON.parse(JSON.stringify(template.workflow.nodes))
      const edges = JSON.parse(JSON.stringify(template.workflow.edges))

      // 生成新 ID
      const idMap = new Map<string, string>()
      nodes.forEach((node: Node) => {
        const newId = generateSecureId(node.type)
        idMap.set(node.id, newId)
        node.id = newId
      })

      edges.forEach((edge: Edge) => {
        const newSource = idMap.get(edge.source)
        const newTarget = idMap.get(edge.target)
        if (newSource) edge.source = newSource
        if (newTarget) edge.target = newTarget
      })

      templateManager.incrementUsage(templateId)
      setWorkflow({ nodes, edges })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('创建工作流失败'))
      console.error('[useCreateWorkflowFromTemplate] 创建失败:', err)
    } finally {
      setLoading(false)
    }
  }, [templateId])

  return { workflow, loading, error }
}