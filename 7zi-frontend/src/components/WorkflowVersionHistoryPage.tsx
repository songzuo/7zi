'use client'

/**
 * Workflow Version History Page Component
 *
 * Displays workflow version history with rollback functionality
 *
 * @version 1.12.0
 */

import { useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  FileText,
  Clock,
  User,
  GitBranch,
} from 'lucide-react'
import type {
  WorkflowVersion,
  WorkflowVersionHistoryResponse,
} from '@/types/workflow-version'

// ============================================
// Types
// ============================================

interface WorkflowVersionHistoryPageProps {
  workflowId: string
  workflowName?: string
}

// ============================================
// Component
// ============================================

export function WorkflowVersionHistoryPage({
  workflowId,
  workflowName,
}: WorkflowVersionHistoryPageProps) {
  const [data, setData] = useState<WorkflowVersionHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rollingBack, setRollingBack] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // Fetch version history
  const fetchHistory = async (pageNum: number = page) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/workflows/${workflowId}/versions?page=${pageNum}&pageSize=${pageSize}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch version history')
      }

      const result: WorkflowVersionHistoryResponse = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Rollback to a specific version
  const handleRollback = async (versionId: string, version: string) => {
    if (!confirm(`确定要回滚到版本 ${version} 吗？这将创建一个新的版本。`)) {
      return
    }

    try {
      setRollingBack(versionId)

      const response = await fetch(`/api/workflows/${workflowId}/rollback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          versionId,
          rollbackBy: 'user@example.com', // TODO: Get from auth
          rollbackReason: `Manual rollback to version ${version}`,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to rollback workflow')
      }

      // Refresh the history
      await fetchHistory(1)
      setPage(1)
    } catch (err) {
      alert(err instanceof Error ? err.message : '回滚失败')
    } finally {
      setRollingBack(null)
    }
  }

  // Get change type label and color
  const getChangeTypeBadge = (changeType: string) => {
    const config = {
      create: {
        label: '创建',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      },
      update: {
        label: '更新',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      },
      rollback: {
        label: '回滚',
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      },
    }

    const { label, className } = config[changeType as keyof typeof config] || {
      label: changeType,
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
        {label}
      </span>
    )
  }

  // Load initial data
  useEffect(() => {
    fetchHistory()
  }, [workflowId])

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            工作流版本历史
          </h1>
          {workflowName && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {workflowName}
            </p>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && !data && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
      )}

      {/* Version List */}
      {data && data.versions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    版本
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    变更类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    描述
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    创建者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.versions.map((version, index) => (
                  <tr
                    key={version.id}
                    className={
                      index === 0
                        ? 'bg-blue-50 dark:bg-blue-900/10'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <GitBranch className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {version.version}
                        </span>
                        {index === 0 && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            当前
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getChangeTypeBadge(version.metadata?.changeType || 'update')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <FileText className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 mr-2 flex-shrink-0" />
                        <div className="text-sm text-gray-900 dark:text-white">
                          <div className="font-medium">{version.name}</div>
                          {version.description && (
                            <div className="text-gray-500 dark:text-gray-400 mt-0.5">
                              {version.description}
                            </div>
                          )}
                          {version.metadata?.sourceVersion && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              从版本 {version.metadata.sourceVersion} 回滚
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {version.createdBy}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                        <div className="text-sm text-gray-900 dark:text-white">
                          <div className="flex flex-col">
                            <span>
                              {new Date(version.createdAt).toLocaleDateString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                              })}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(version.createdAt), {
                                addSuffix: true,
                                locale: zhCN,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {index !== 0 && (
                        <button
                          onClick={() => handleRollback(version.id, version.version)}
                          disabled={rollingBack === version.id}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <RotateCcw className="h-3 w-3 mr-1.5" />
                          {rollingBack === version.id ? '回滚中...' : '回滚'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.total > pageSize && (
            <div className="bg-gray-50 dark:bg-gray-700/50 px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                共 <span className="font-medium">{data.total}</span> 个版本
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一页
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  第 {page} 页 / 共 {Math.ceil(data.total / pageSize)} 页
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * pageSize >= data.total}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {data && data.versions.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <GitBranch className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无版本历史
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            该工作流还没有版本历史记录
          </p>
        </div>
      )}
    </div>
  )
}
