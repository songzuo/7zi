/**
 * 模板系统 Hooks
 *
 * 版本: v1.12.2
 * 创建日期: 2026-04-04
 *
 * 提供使用模板系统的 React hooks
 */

import { useState, useCallback, useMemo } from 'react'
import {
  listTemplates,
  listTemplatesByCategory,
  getTemplate,
  createFromTemplate,
  validateTemplate,
  getTemplateStats,
  type WorkflowTemplate,
} from './templates'
import type { WorkflowDefinition } from './types'

// ============================================
// Hooks
// ============================================

/**
 * 模板列表 Hook
 *
 * @example
 * ```tsx
 * const { templates, loading, error, refetch } = useTemplateList()
 * ```
 */
export function useTemplateList() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const templates = useMemo(() => {
    try {
      return listTemplates()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates')
      return []
    }
  }, [])

  const stats = useMemo(() => getTemplateStats(), [templates])

  const refetch = useCallback(() => {
    setLoading(true)
    try {
      // 重新加载模板
      listTemplates()
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    templates,
    stats,
    loading,
    error,
    refetch,
  }
}

/**
 * 模板筛选 Hook
 *
 * @example
 * ```tsx
 * const { filteredTemplates, setCategory, setDifficulty, setSearch } = useTemplateFilter()
 * ```
 */
export function useTemplateFilter() {
  const [category, setCategory] = useState<WorkflowTemplate['category'] | 'all'>('all')
  const [difficulty, setDifficulty] = useState<WorkflowTemplate['difficulty'] | 'all'>('all')
  const [search, setSearch] = useState('')

  const filteredTemplates = useMemo(() => {
    let result = listTemplates()

    if (category !== 'all') {
      result = listTemplatesByCategory(category)
    }

    if (difficulty !== 'all') {
      result = result.filter((t) => t.difficulty === difficulty)
    }

    if (search.trim()) {
      const query = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      )
    }

    return result
  }, [category, difficulty, search])

  const clearFilters = useCallback(() => {
    setCategory('all')
    setDifficulty('all')
    setSearch('')
  }, [])

  return {
    filteredTemplates,
    category,
    setCategory,
    difficulty,
    setDifficulty,
    search,
    setSearch,
    clearFilters,
  }
}

/**
 * 模板详情 Hook
 *
 * @example
 * ```tsx
 * const { template, loading, error } = useTemplate('ai-chat')
 * ```
 */
export function useTemplate(templateId: string | null) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const template = useMemo(() => {
    if (!templateId) return null

    try {
      const result = getTemplate(templateId)
      if (!result) {
        setError(`Template not found: ${templateId}`)
      }
      return result || null
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load template')
      return null
    }
  }, [templateId])

  return {
    template,
    loading,
    error,
    isValid: template !== null && validateTemplate(template),
  }
}

/**
 * 从模板创建工作流 Hook
 *
 * @example
 * ```tsx
 * const { workflow, createFromTemplate, isLoading, error } = useCreateFromTemplate()
 *
 * const handleCreate = () => {
 *   const workflow = createFromTemplate('ai-chat', '我的工作流')
 *   if (workflow) {
 *     // 使用创建的工作流
 *   }
 * }
 * ```
 */
export function useCreateFromTemplate() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastCreated, setLastCreated] = useState<WorkflowDefinition | null>(null)

  const createFromTemplateWithValidation = useCallback(
    (templateId: string, name: string, description?: string): WorkflowDefinition | null => {
      setIsLoading(true)
      setError(null)

      try {
        // 验证模板存在
        const template = getTemplate(templateId)
        if (!template) {
          throw new Error(`Template not found: ${templateId}`)
        }

        // 验证模板结构
        if (!validateTemplate(template)) {
          throw new Error(`Invalid template: ${templateId}`)
        }

        // 创建工作流
        const workflow = createFromTemplate(templateId, name, description)

        if (!workflow) {
          throw new Error(`Failed to create workflow from template: ${templateId}`)
        }

        setLastCreated(workflow)
        return workflow
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to create workflow'
        setError(errorMessage)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const clearLastCreated = useCallback(() => {
    setLastCreated(null)
  }, [])

  return {
    createFromTemplate: createFromTemplateWithValidation,
    lastCreated,
    isLoading,
    error,
    clearLastCreated,
  }
}

/**
 * 模板选择 Hook
 *
 * @example
 * ```tsx
 * const {
 *   isOpen,
 *   selectedTemplate,
 *   openSelector,
 *   closeSelector,
 *   selectTemplate,
 * } = useTemplateSelector()
 * ```
 */
export function useTemplateSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)

  const openSelector = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeSelector = useCallback(() => {
    setIsOpen(false)
  }, [])

  const selectTemplate = useCallback((templateId: string) => {
    const template = getTemplate(templateId)
    if (template) {
      setSelectedTemplate(template)
    }
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTemplate(null)
  }, [])

  return {
    isOpen,
    selectedTemplate,
    openSelector,
    closeSelector,
    selectTemplate,
    clearSelection,
  }
}

/**
 * 组合 Hook: 完整的模板使用流程
 *
 * @example
 * ```tsx
 * const {
 *   templates,
 *   selectedTemplate,
 *   createdWorkflow,
 *   selectTemplate,
 *   createWorkflow,
 *   isCreating,
 *   error,
 * } = useWorkflowTemplates()
 *
 * const handleSelect = (templateId: string) => {
 *   selectTemplate(templateId)
 * }
 *
 * const handleCreate = (name: string) => {
 *   const workflow = createWorkflow(name)
 *   if (workflow) {
 *     // 导航到编辑器
 *   }
 * }
 * ```
 */
export function useWorkflowTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)
  const [createdWorkflow, setCreatedWorkflow] = useState<WorkflowDefinition | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // 使用其他 hooks
  const { templates, stats, loading, error: listError, refetch } = useTemplateList()

  const selectTemplate = useCallback((templateId: string) => {
    const template = getTemplate(templateId)
    if (template) {
      setSelectedTemplate(template)
      setCreateError(null)
    }
  }, [])

  const createWorkflow = useCallback(
    (name: string, description?: string): WorkflowDefinition | null => {
      if (!selectedTemplate) {
        setCreateError('No template selected')
        return null
      }

      setIsCreating(true)
      setCreateError(null)

      try {
        const workflow = createFromTemplate(selectedTemplate.id, name, description)

        if (workflow) {
          setCreatedWorkflow(workflow)
          return workflow
        }

        throw new Error('Failed to create workflow')
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Failed to create workflow'
        setCreateError(errorMessage)
        return null
      } finally {
        setIsCreating(false)
      }
    },
    [selectedTemplate]
  )

  const clearSelection = useCallback(() => {
    setSelectedTemplate(null)
    setCreatedWorkflow(null)
    setCreateError(null)
  }, [])

  const clearWorkflow = useCallback(() => {
    setCreatedWorkflow(null)
  }, [])

  return {
    // 模板列表
    templates,
    stats,
    loading,
    listError,
    refetch,

    // 选择状态
    selectedTemplate,
    selectTemplate,

    // 创建状态
    createdWorkflow,
    createWorkflow,
    isCreating,
    createError,

    // 清理
    clearSelection,
    clearWorkflow,
  }
}

export default {
  useTemplateList,
  useTemplateFilter,
  useTemplate,
  useCreateFromTemplate,
  useTemplateSelector,
  useWorkflowTemplates,
}