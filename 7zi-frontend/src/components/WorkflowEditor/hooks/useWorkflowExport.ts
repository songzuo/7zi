/**
 * useWorkflowExport - 工作流导出/导入 Hook
 *
 * v1.9.1 新增
 * 提供工作流导出和导入的状态管理
 */

import { useState, useCallback } from 'react'
import type { WorkflowDefinition, WorkflowExport } from '../types'
import { EXPORT_CONFIG } from '../constants'

interface UseWorkflowExportOptions {
  onExportSuccess?: (exportData: WorkflowExport) => void
  onImportSuccess?: (workflow: WorkflowDefinition) => void
  onError?: (error: Error) => void
}

interface ExportState {
  isExporting: boolean
  isImporting: boolean
  lastExportAt: Date | null
  lastImportAt: Date | null
  error: string | null
}

/**
 * 工作流导出/导入 Hook
 */
export function useWorkflowExport({
  onExportSuccess,
  onImportSuccess,
  onError,
}: UseWorkflowExportOptions = {}) {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    isImporting: false,
    lastExportAt: null,
    lastImportAt: null,
    error: null,
  })

  /**
   * 导出工作流为 JSON
   */
  const exportWorkflow = useCallback(
    async (workflow: WorkflowDefinition): Promise<WorkflowExport | null> => {
      setState(prev => ({ ...prev, isExporting: true, error: null }))

      try {
        const exportData: WorkflowExport = {
          version: EXPORT_CONFIG.version as '1.9.1',
          exportedAt: new Date().toISOString(),
          workflow,
          metadata: {
            name: workflow.name,
            description: workflow.description,
            tags: [],
          },
        }

        setState(prev => ({
          ...prev,
          isExporting: false,
          lastExportAt: new Date(),
        }))

        if (onExportSuccess) {
          onExportSuccess(exportData)
        }

        return exportData
      } catch (error) {
        const errorMessage = (error as Error).message
        setState(prev => ({
          ...prev,
          isExporting: false,
          error: errorMessage,
        }))

        if (onError) {
          onError(error as Error)
        }

        return null
      }
    },
    [onExportSuccess, onError]
  )

  /**
   * 导出工作流并下载文件
   */
  const exportToFile = useCallback(
    async (workflow: WorkflowDefinition): Promise<boolean> => {
      const exportData = await exportWorkflow(workflow)
      if (!exportData) return false

      try {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: EXPORT_CONFIG.mimeType,
        })

        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${workflow.name || 'workflow'}${EXPORT_CONFIG.fileExtension}`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        return true
      } catch (error) {
        if (onError) {
          onError(error as Error)
        }
        return false
      }
    },
    [exportWorkflow, onError]
  )

  /**
   * 复制工作流到剪贴板
   */
  const copyToClipboard = useCallback(
    async (workflow: WorkflowDefinition): Promise<boolean> => {
      const exportData = await exportWorkflow(workflow)
      if (!exportData) return false

      try {
        await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
        return true
      } catch (error) {
        if (onError) {
          onError(error as Error)
        }
        return false
      }
    },
    [exportWorkflow, onError]
  )

  /**
   * 导入工作流
   */
  const importWorkflow = useCallback(
    async (file: File): Promise<WorkflowDefinition | null> => {
      setState(prev => ({ ...prev, isImporting: true, error: null }))

      try {
        const content = await file.text()
        const importData: WorkflowExport = JSON.parse(content)

        // 验证版本
        if (!EXPORT_CONFIG.supportedVersions.includes(importData.version)) {
          throw new Error(
            `不支持的版本: ${importData.version}. 支持的版本: ${EXPORT_CONFIG.supportedVersions.join(', ')}`
          )
        }

        // 验证工作流数据
        if (!importData.workflow || !importData.workflow.nodes || !importData.workflow.edges) {
          throw new Error('无效的工作流数据格式')
        }

        setState(prev => ({
          ...prev,
          isImporting: false,
          lastImportAt: new Date(),
        }))

        if (onImportSuccess) {
          onImportSuccess(importData.workflow)
        }

        return importData.workflow
      } catch (error) {
        const errorMessage = (error as Error).message
        setState(prev => ({
          ...prev,
          isImporting: false,
          error: errorMessage,
        }))

        if (onError) {
          onError(error as Error)
        }

        return null
      }
    },
    [onImportSuccess, onError]
  )

  /**
   * 从 JSON 字符串导入
   */
  const importFromJSON = useCallback(
    (jsonString: string): WorkflowDefinition | null => {
      try {
        const importData: WorkflowExport = JSON.parse(jsonString)

        // 验证版本
        if (!EXPORT_CONFIG.supportedVersions.includes(importData.version)) {
          throw new Error(
            `不支持的版本: ${importData.version}. 支持的版本: ${EXPORT_CONFIG.supportedVersions.join(', ')}`
          )
        }

        // 验证工作流数据
        if (!importData.workflow || !importData.workflow.nodes || !importData.workflow.edges) {
          throw new Error('无效的工作流数据格式')
        }

        setState(prev => ({
          ...prev,
          lastImportAt: new Date(),
        }))

        if (onImportSuccess) {
          onImportSuccess(importData.workflow)
        }

        return importData.workflow
      } catch (error) {
        const errorMessage = (error as Error).message
        setState(prev => ({ ...prev, error: errorMessage }))

        if (onError) {
          onError(error as Error)
        }

        return null
      }
    },
    [onImportSuccess, onError]
  )

  /**
   * 清除错误
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  return {
    // 状态
    isExporting: state.isExporting,
    isImporting: state.isImporting,
    lastExportAt: state.lastExportAt,
    lastImportAt: state.lastImportAt,
    error: state.error,

    // 方法
    exportWorkflow,
    exportToFile,
    copyToClipboard,
    importWorkflow,
    importFromJSON,
    clearError,
  }
}

export default useWorkflowExport