'use client'

/**
 * Workflow Version History Component
 * 
 * Displays version history for a workflow with:
 * - Version list with timestamps
 * - Version comparison (diff view)
 * - Rollback functionality
 * - Settings configuration
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  History,
  RotateCcw,
  GitCompare,
  Settings,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Edit3,
  AlertCircle,
  Check,
  X,
  Loader2,
  Trash2,
} from 'lucide-react'

// Types
interface WorkflowNode {
  id: string
  type: string
  name: string
  position: { x: number; y: number }
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  type: string
}

interface WorkflowVersion {
  id: string
  workflowId: string
  versionNumber: number
  name: string
  description?: string
  status: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  config: Record<string, unknown>
  changeSummary?: string
  changeType: 'create' | 'update' | 'rollback' | 'restore'
  parentVersionId?: string
  createdBy: string
  createdAt: string
}

interface VersionDiff {
  id: string
  workflowId: string
  fromVersionId: string
  toVersionId: string
  nodesAdded: WorkflowNode[]
  nodesRemoved: string[]
  nodesModified: Array<{
    nodeId: string
    before: Partial<WorkflowNode>
    after: Partial<WorkflowNode>
    changes: string[]
  }>
  edgesAdded: WorkflowEdge[]
  edgesRemoved: string[]
  edgesModified: Array<{
    edgeId: string
    before: Partial<WorkflowEdge>
    after: Partial<WorkflowEdge>
    changes: string[]
  }>
  configChanged: Record<string, { before: unknown; after: unknown }>
  totalChanges: number
  computedAt: string
}

interface VersionSettings {
  workflowId: string
  maxVersions: number
  autoVersionOnUpdate: boolean
  retentionDays: number
}

interface WorkflowVersionHistoryProps {
  workflowId: string
  onRollback?: (version: WorkflowVersion) => void
  onCreateVersion?: () => void
}

// Change type badge colors
const changeTypeColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  rollback: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  restore: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
}

// Change type labels
const changeTypeLabels: Record<string, string> = {
  create: '创建',
  update: '更新',
  rollback: '回滚',
  restore: '恢复',
}

// Format relative time (simplified version without date-fns)
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffSec < 60) return '刚刚'
  if (diffMin < 60) return `${diffMin} 分钟前`
  if (diffHour < 24) return `${diffHour} 小时前`
  if (diffDay < 7) return `${diffDay} 天前`
  if (diffWeek < 4) return `${diffWeek} 周前`
  if (diffMonth < 12) return `${diffMonth} 个月前`
  return date.toLocaleDateString('zh-CN')
}

export function WorkflowVersionHistory({
  workflowId,
  onRollback,
  onCreateVersion,
}: WorkflowVersionHistoryProps) {
  // State
  const [versions, setVersions] = useState<WorkflowVersion[]>([])
  const [totalVersions, setTotalVersions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [diff, setDiff] = useState<VersionDiff | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [settings, setSettings] = useState<VersionSettings | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [rollbackConfirm, setRollbackConfirm] = useState<string | null>(null)
  const [rollbackLoading, setRollbackLoading] = useState(false)

  // Fetch versions
  const fetchVersions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/workflow/${workflowId}/versions`)
      if (!response.ok) throw new Error('Failed to fetch versions')

      const data = await response.json()
      setVersions(data.data.versions)
      setTotalVersions(data.data.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version history')
    } finally {
      setLoading(false)
    }
  }, [workflowId])

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch(`/api/workflow/${workflowId}/versions/settings`)
      if (!response.ok) throw new Error('Failed to fetch settings')

      const data = await response.json()
      setSettings(data.data)
    } catch (err) {
      console.error('Failed to fetch version settings:', err)
    }
  }, [workflowId])

  useEffect(() => {
    fetchVersions()
    fetchSettings()
  }, [fetchVersions, fetchSettings])

  // Compare versions
  const compareVersions = async () => {
    if (selectedVersions.length !== 2) return

    const [fromId, toId] = selectedVersions
    setDiffLoading(true)

    try {
      const response = await fetch(
        `/api/workflow/${workflowId}/versions/compare?fromVersionId=${fromId}&toVersionId=${toId}`
      )
      if (!response.ok) throw new Error('Failed to compare versions')

      const data = await response.json()
      setDiff(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compare versions')
    } finally {
      setDiffLoading(false)
    }
  }

  // Rollback to version
  const handleRollback = async (versionId: string) => {
    setRollbackLoading(true)

    try {
      const response = await fetch(`/api/workflow/${workflowId}/versions/${versionId}/rollback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'current-user' }), // Replace with actual user ID
      })

      if (!response.ok) throw new Error('Failed to rollback')

      const data = await response.json()
      setRollbackConfirm(null)
      fetchVersions()

      if (onRollback) {
        onRollback(versions.find(v => v.id === versionId)!)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback')
    } finally {
      setRollbackLoading(false)
    }
  }

  // Update settings
  const updateSettings = async (newSettings: Partial<VersionSettings>) => {
    try {
      const response = await fetch(`/api/workflow/${workflowId}/versions/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      })

      if (!response.ok) throw new Error('Failed to update settings')

      const data = await response.json()
      setSettings(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update settings')
    }
  }

  // Toggle version selection for comparison
  const toggleVersionSelection = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId)
      }
      if (prev.length >= 2) {
        return [prev[1], versionId]
      }
      return [...prev, versionId]
    })
    setDiff(null)
  }

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">加载版本历史...</span>
      </div>
    )
  }

  // Render error state
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
        <AlertCircle className="h-5 w-5" />
        <span>{error}</span>
        <button
          onClick={() => {
            setError(null)
            fetchVersions()
          }}
          className="ml-auto text-red-600 hover:text-red-800 underline"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">版本历史</h3>
          <span className="text-sm text-gray-500">({totalVersions} 个版本)</span>
        </div>

        <div className="flex items-center gap-2">
          {onCreateVersion && (
            <button
              onClick={onCreateVersion}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              保存版本
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && settings && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">版本设置</h4>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                最大版本数
              </label>
              <input
                type="number"
                value={settings.maxVersions}
                onChange={e => updateSettings({ maxVersions: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                min={1}
                max={1000}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                保留天数
              </label>
              <input
                type="number"
                value={settings.retentionDays}
                onChange={e => updateSettings({ retentionDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                min={1}
                max={365}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoVersion"
              checked={settings.autoVersionOnUpdate}
              onChange={e => updateSettings({ autoVersionOnUpdate: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="autoVersion" className="text-sm text-gray-600 dark:text-gray-400">
              更新时自动创建版本
            </label>
          </div>
        </div>
      )}

      {/* Compare Button */}
      {selectedVersions.length === 2 && (
        <button
          onClick={compareVersions}
          disabled={diffLoading}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        >
          {diffLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GitCompare className="h-4 w-4" />
          )}
          <span>对比选中的版本</span>
        </button>
      )}

      {/* Diff View */}
      {diff && (
        <div className="p-4 bg-white dark:bg-gray-800 border rounded-lg space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            版本对比结果 ({diff.totalChanges} 处变更)
          </h4>

          <div className="grid grid-cols-3 gap-4">
            {/* Nodes changes */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">节点变更</h5>
              <div className="space-y-1">
                {diff.nodesAdded.length > 0 && (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <Plus className="h-4 w-4" />
                    <span>新增 {diff.nodesAdded.length} 个</span>
                  </div>
                )}
                {diff.nodesRemoved.length > 0 && (
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <Minus className="h-4 w-4" />
                    <span>删除 {diff.nodesRemoved.length} 个</span>
                  </div>
                )}
                {diff.nodesModified.length > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 text-sm">
                    <Edit3 className="h-4 w-4" />
                    <span>修改 {diff.nodesModified.length} 个</span>
                  </div>
                )}
                {diff.nodesAdded.length === 0 && diff.nodesRemoved.length === 0 && diff.nodesModified.length === 0 && (
                  <span className="text-gray-400 text-sm">无变更</span>
                )}
              </div>
            </div>

            {/* Edges changes */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">连线变更</h5>
              <div className="space-y-1">
                {diff.edgesAdded.length > 0 && (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <Plus className="h-4 w-4" />
                    <span>新增 {diff.edgesAdded.length} 条</span>
                  </div>
                )}
                {diff.edgesRemoved.length > 0 && (
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <Minus className="h-4 w-4" />
                    <span>删除 {diff.edgesRemoved.length} 条</span>
                  </div>
                )}
                {diff.edgesModified.length > 0 && (
                  <div className="flex items-center gap-1 text-blue-600 text-sm">
                    <Edit3 className="h-4 w-4" />
                    <span>修改 {diff.edgesModified.length} 条</span>
                  </div>
                )}
                {diff.edgesAdded.length === 0 && diff.edgesRemoved.length === 0 && diff.edgesModified.length === 0 && (
                  <span className="text-gray-400 text-sm">无变更</span>
                )}
              </div>
            </div>

            {/* Config changes */}
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">配置变更</h5>
              <div className="space-y-1">
                {Object.keys(diff.configChanged).length > 0 ? (
                  <div className="flex items-center gap-1 text-blue-600 text-sm">
                    <Edit3 className="h-4 w-4" />
                    <span>{Object.keys(diff.configChanged).length} 项配置</span>
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">无变更</span>
                )}
              </div>
            </div>
          </div>

          {/* Detailed changes */}
          {diff.nodesModified.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                修改的节点
              </h5>
              <div className="space-y-2">
                {diff.nodesModified.map(mod => (
                  <div key={mod.nodeId} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                    <div className="font-medium">{mod.nodeId}</div>
                    <ul className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                      {mod.changes.map((change, i) => (
                        <li key={i}>{change}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Version List */}
      <div className="space-y-2">
        {versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">暂无版本历史</div>
        ) : (
          versions.map((version, index) => (
            <div
              key={version.id}
              className={`p-4 border rounded-lg transition-colors ${
                selectedVersions.includes(version.id)
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* Selection checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedVersions.includes(version.id)}
                    onChange={() => toggleVersionSelection(version.id)}
                    className="mt-1 rounded"
                  />

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        v{version.versionNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          changeTypeColors[version.changeType]
                        }`}
                      >
                        {changeTypeLabels[version.changeType]}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          最新
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {version.changeSummary || '无变更说明'}
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                      <span>
                        {formatRelativeTime(version.createdAt)}
                      </span>
                      <span>创建者: {version.createdBy}</span>
                      <span>
                        {version.nodes.length} 节点 / {version.edges.length} 连线
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {rollbackConfirm === version.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRollback(version.id)}
                        disabled={rollbackLoading || index === 0}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                      >
                        {rollbackLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        <span>确认</span>
                      </button>
                      <button
                        onClick={() => setRollbackConfirm(null)}
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRollbackConfirm(version.id)}
                      disabled={index === 0}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={index === 0 ? '已是最新版本' : '回滚到此版本'}
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>回滚</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default WorkflowVersionHistory
