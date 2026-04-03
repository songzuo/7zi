/**
 * WorkflowExporter - 工作流导出/导入组件
 *
 * v1.9.1 新增
 * 支持工作流的导出和导入功能
 */

import React, { useState, useCallback } from 'react'
import { Download, Upload, FileJson, CheckCircle, XCircle } from 'lucide-react'
import type { WorkflowDefinition, WorkflowExport } from './types'
import { EXPORT_CONFIG } from './constants'

interface WorkflowExporterProps {
  workflow: WorkflowDefinition
  onImport?: (workflow: WorkflowDefinition) => void
  onExport?: (exportData: WorkflowExport) => void
}

/**
 * 工作流导出/导入组件
 */
export function WorkflowExporter({
  workflow,
  onImport,
  onExport,
}: WorkflowExporterProps) {
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState(false)
  const [exportSuccess, setExportSuccess] = useState(false)

  /**
   * 导出工作流为 JSON 文件
   */
  const handleExport = useCallback(() => {
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

      // 创建 Blob
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: EXPORT_CONFIG.mimeType,
      })

      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${workflow.name || 'workflow'}${EXPORT_CONFIG.fileExtension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // 触发回调
      if (onExport) {
        onExport(exportData)
      }

      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (error) {
      console.error('Export failed:', error)
      setImportError('导出失败: ' + (error as Error).message)
      setTimeout(() => setImportError(null), 3000)
    }
  }, [workflow, onExport])

  /**
   * 导入工作流 JSON 文件
   */
  const handleImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()

      reader.onload = e => {
        try {
          const content = e.target?.result as string
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

          // 触发回调
          if (onImport) {
            onImport(importData.workflow)
          }

          setImportSuccess(true)
          setTimeout(() => setImportSuccess(false), 3000)
        } catch (error) {
          console.error('Import failed:', error)
          setImportError('导入失败: ' + (error as Error).message)
          setTimeout(() => setImportError(null), 3000)
        }
      }

      reader.onerror = () => {
        setImportError('读取文件失败')
        setTimeout(() => setImportError(null), 3000)
      }

      reader.readAsText(file)

      // 重置 input
      event.target.value = ''
    },
    [onImport]
  )

  /**
   * 复制工作流 JSON 到剪贴板
   */
  const handleCopyToClipboard = useCallback(async () => {
    try {
      const exportData: WorkflowExport = {
        version: EXPORT_CONFIG.version as '1.9.1',
        exportedAt: new Date().toISOString(),
        workflow,
      }

      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
      setExportSuccess(true)
      setTimeout(() => setExportSuccess(false), 3000)
    } catch (error) {
      console.error('Copy failed:', error)
      setImportError('复制失败: ' + (error as Error).message)
      setTimeout(() => setImportError(null), 3000)
    }
  }, [workflow])

  return (
    <div className="flex items-center gap-2">
      {/* 导出按钮 */}
      <button
        type="button"
        onClick={handleExport}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
        title="导出为 JSON 文件"
      >
        <Download className="h-4 w-4" />
        <span>导出</span>
      </button>

      {/* 复制按钮 */}
      <button
        type="button"
        onClick={handleCopyToClipboard}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        title="复制 JSON 到剪贴板"
      >
        <FileJson className="h-4 w-4" />
        <span>复制</span>
      </button>

      {/* 导入按钮 */}
      <div className="relative">
        <input
          type="file"
          accept={EXPORT_CONFIG.mimeType}
          onChange={handleImport}
          className="hidden"
          id="workflow-import"
        />
        <label
          htmlFor="workflow-import"
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          title="导入 JSON 文件"
        >
          <Upload className="h-4 w-4" />
          <span>导入</span>
        </label>
      </div>

      {/* 成功提示 */}
      {exportSuccess && (
        <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span>已导出</span>
        </div>
      )}

      {importSuccess && (
        <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span>已导入</span>
        </div>
      )}

      {/* 错误提示 */}
      {importError && (
        <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <XCircle className="h-4 w-4" />
          <span>{importError}</span>
        </div>
      )}
    </div>
  )
}

export default WorkflowExporter