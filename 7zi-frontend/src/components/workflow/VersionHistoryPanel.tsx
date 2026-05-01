/**
 * Version History Panel Component
 *
 * 工作流版本历史面板，提供：
 * - 版本列表展示
 * - 版本对比可视化（diff 视图）
 * - 版本分支管理
 * - 版本导出/导入
 * - 版本压缩
 *
 * @version 1.12.3
 * @date 2026-04-04
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  WorkflowVersion,
  WorkflowDiff,
  VersionBranch,
  SnapshotPolicy,
  CompressionRule,
} from '@/types/workflow-version'
import {
  WorkflowDiffEngine,
  getBranchManager,
  getSnapshotPolicyManager,
  getExportImportManager,
  getCompressionManager,
  VersionCompressionManager,
} from '@/lib/workflow/versioning'
import {
  getWorkflowVersionHistory,
  rollbackWorkflow,
} from '@/lib/workflows/workflow-version-storage'

// ============================================
// UI Components
// ============================================

interface VersionHistoryPanelProps {
  workflowId: string
  currentVersionId?: string
  onVersionSelect?: (version: WorkflowVersion) => void
  onRollback?: (version: WorkflowVersion) => void
  className?: string
}

export function VersionHistoryPanel({
  workflowId,
  currentVersionId,
  onVersionSelect,
  onRollback,
  className = '',
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<WorkflowVersion[]>([])
  const [branches, setBranches] = useState<VersionBranch[]>([])
  const [selectedVersions, setSelectedVersions] = useState<WorkflowVersion[]>([])
  const [diff, setDiff] = useState<WorkflowDiff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'history' | 'branches' | 'settings'>('history')
  const [showDiff, setShowDiff] = useState(false)

  // Load versions and branches
  useEffect(() => {
    loadData()
  }, [workflowId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [versionsResult, workflowBranches] = await Promise.all([
        getWorkflowVersionHistory(workflowId),
        getBranchManager().getWorkflowBranches(workflowId),
      ])

      setVersions(versionsResult.versions)
      setBranches(workflowBranches)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version history')
    } finally {
      setLoading(false)
    }
  }

  // Handle version selection for diff
  const handleVersionSelect = useCallback(
    (version: WorkflowVersion) => {
      if (selectedVersions.length === 0) {
        setSelectedVersions([version])
      } else if (selectedVersions.length === 1) {
        if (selectedVersions[0].id !== version.id) {
          setSelectedVersions([...selectedVersions, version])
          // Generate diff
          const newDiff = WorkflowDiffEngine.compareVersions(
            selectedVersions[0],
            version
          )
          setDiff(newDiff)
          setShowDiff(true)
        } else {
          setSelectedVersions([])
          setDiff(null)
          setShowDiff(false)
        }
      } else {
        setSelectedVersions([version])
        setDiff(null)
        setShowDiff(false)
      }

      onVersionSelect?.(version)
    },
    [selectedVersions, onVersionSelect]
  )

  // Handle rollback
  const handleRollback = async (version: WorkflowVersion) => {
    try {
      await rollbackWorkflow(workflowId, version.id, 'current-user')
      onRollback?.(version)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback')
    }
  }

  // Handle export
  const handleExport = async () => {
    try {
      const exportData = await getExportImportManager().exportVersions(
        versions,
        branches,
        'current-user'
      )
      getExportImportManager().downloadExport(exportData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export versions')
    }
  }

  // Handle import
  const handleImport = async (file: File) => {
    try {
      const exportData = await getExportImportManager().parseExportFile(file)
      const result = await getExportImportManager().importVersions(exportData, workflowId)
      await loadData()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import versions')
      throw err
    }
  }

  // Handle compression
  const handleCompress = async () => {
    try {
      const rule = VersionCompressionManager.getDefaultRule()
      const result = await getCompressionManager().compressVersions(versions, rule)
      await loadData()
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compress versions')
      throw err
    }
  }

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading version history...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Version History</h2>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Export
            </button>
            <label className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer">
              Import
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImport(file)
                }}
                className="hidden"
              />
            </label>
            <button
              onClick={handleCompress}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Compress
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4">
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 text-sm rounded ${
              activeTab === 'history'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            History ({versions.length})
          </button>
          <button
            onClick={() => setActiveTab('branches')}
            className={`px-3 py-1.5 text-sm rounded ${
              activeTab === 'branches'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Branches ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 text-sm rounded ${
              activeTab === 'settings'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'history' && (
          <HistoryTab
            versions={versions}
            selectedVersions={selectedVersions}
            currentVersionId={currentVersionId}
            onVersionSelect={handleVersionSelect}
            onRollback={handleRollback}
          />
        )}

        {activeTab === 'branches' && (
          <BranchesTab
            branches={branches}
            workflowId={workflowId}
            onRefresh={loadData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab workflowId={workflowId} />
        )}
      </div>

      {/* Diff View */}
      {showDiff && diff && (
        <DiffView
          diff={diff}
          onClose={() => {
            setShowDiff(false)
            setDiff(null)
            setSelectedVersions([])
          }}
        />
      )}
    </div>
  )
}

// ============================================
// History Tab Component
// ============================================

interface HistoryTabProps {
  versions: WorkflowVersion[]
  selectedVersions: WorkflowVersion[]
  currentVersionId?: string
  onVersionSelect: (version: WorkflowVersion) => void
  onRollback: (version: WorkflowVersion) => void
}

function HistoryTab({
  versions,
  selectedVersions,
  currentVersionId,
  onVersionSelect,
  onRollback,
}: HistoryTabProps) {
  return (
    <div className="space-y-2">
      {versions.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No versions yet
        </div>
      ) : (
        versions.map((version) => {
          const isSelected = selectedVersions.some((v) => v.id === version.id)
          const isCurrent = version.id === currentVersionId

          return (
            <div
              key={version.id}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : isCurrent
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onVersionSelect(version)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {version.version}
                    </span>
                    <span className="text-sm text-gray-600">
                      {version.name}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                        Current
                      </span>
                    )}
                    {version.metadata?.changeType && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                        {version.metadata.changeType}
                      </span>
                    )}
                  </div>
                  {version.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {version.description}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(version.createdAt).toLocaleString()} by {version.createdBy}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRollback(version)
                  }}
                  className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  Rollback
                </button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ============================================
// Branches Tab Component
// ============================================

interface BranchesTabProps {
  branches: VersionBranch[]
  workflowId: string
  onRefresh: () => void
}

function BranchesTab({ branches, workflowId, onRefresh }: BranchesTabProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchDescription, setNewBranchDescription] = useState('')

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return

    try {
      await getBranchManager().createBranch(
        {
          name: newBranchName,
          workflowId,
          baseVersionId: '', // Would need to get current version
          description: newBranchDescription,
        },
        'current-user'
      )
      setShowCreateDialog(false)
      setNewBranchName('')
      setNewBranchDescription('')
      onRefresh()
    } catch (err) {
      console.error('Failed to create branch:', err)
    }
  }

  const handleDeleteBranch = async (branchId: string) => {
    try {
      await getBranchManager().deleteBranch(branchId)
      onRefresh()
    } catch (err) {
      console.error('Failed to delete branch:', err)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Branch
        </button>
      </div>

      {branches.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No branches yet
        </div>
      ) : (
        <div className="space-y-2">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">
                      {branch.name}
                    </span>
                    {branch.isMain && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                        Main
                      </span>
                    )}
                  </div>
                  {branch.metadata?.description && (
                    <p className="text-sm text-gray-600 mt-1">
                      {branch.metadata.description}
                    </p>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    Created {new Date(branch.createdAt).toLocaleString()} by {branch.createdBy}
                  </div>
                </div>
                {!branch.isMain && (
                  <button
                    onClick={() => handleDeleteBranch(branch.id)}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Branch Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create New Branch</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  placeholder="feature/new-feature"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newBranchDescription}
                  onChange={(e) => setNewBranchDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  rows={3}
                  placeholder="Describe this branch..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBranch}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Settings Tab Component
// ============================================

interface SettingsTabProps {
  workflowId: string
}

function SettingsTab({ workflowId }: SettingsTabProps) {
  const [policy, setPolicy] = useState<SnapshotPolicy>({
    enabled: false,
    timeBased: {
      intervalMinutes: 30,
      maxSnapshotsPerDay: 48,
    },
    operationBased: {
      operationsCount: 10,
      maxSnapshotsPerSession: 20,
    },
    retention: {
      maxSnapshots: 100,
      keepDays: 30,
    },
  })

  const handleSavePolicy = () => {
    getSnapshotPolicyManager().configurePolicy(workflowId, policy)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Snapshot Policy</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enable-snapshots"
              checked={policy.enabled}
              onChange={(e) => setPolicy({ ...policy, enabled: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label htmlFor="enable-snapshots" className="text-sm font-medium text-gray-700">
              Enable automatic snapshots
            </label>
          </div>

          {policy.enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time-based interval (minutes)
                </label>
                <input
                  type="number"
                  value={policy.timeBased?.intervalMinutes || 30}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      timeBased: {
                        ...policy.timeBased!,
                        intervalMinutes: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operation-based threshold
                </label>
                <input
                  type="number"
                  value={policy.operationBased?.operationsCount || 10}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      operationBased: {
                        ...policy.operationBased!,
                        operationsCount: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum snapshots to keep
                </label>
                <input
                  type="number"
                  value={policy.retention?.maxSnapshots || 100}
                  onChange={(e) =>
                    setPolicy({
                      ...policy,
                      retention: {
                        ...policy.retention!,
                        maxSnapshots: parseInt(e.target.value, 10),
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSavePolicy}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Settings
        </button>
      </div>
    </div>
  )
}

// ============================================
// Diff View Component
// ============================================

interface DiffViewProps {
  diff: WorkflowDiff
  onClose: () => void
}

function DiffView({ diff, onClose }: DiffViewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Version Diff</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-6">
              <div>
                <span className="text-green-600 font-semibold">+{diff.summary.added}</span>
                <span className="text-gray-600 ml-1">added</span>
              </div>
              <div>
                <span className="text-red-600 font-semibold">-{diff.summary.removed}</span>
                <span className="text-gray-600 ml-1">removed</span>
              </div>
              <div>
                <span className="text-orange-600 font-semibold">~{diff.summary.modified}</span>
                <span className="text-gray-600 ml-1">modified</span>
              </div>
            </div>
          </div>

          {/* Nodes Diff */}
          {diff.nodes.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Nodes</h4>
              <div className="space-y-2">
                {diff.nodes.map((change, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded ${
                      change.type === 'added'
                        ? 'bg-green-50 border border-green-200'
                        : change.type === 'removed'
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-orange-50 border border-orange-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        change.type === 'added'
                          ? 'text-green-700'
                          : change.type === 'removed'
                          ? 'text-red-700'
                          : 'text-orange-700'
                      }`}>
                        {change.type.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">{change.path}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edges Diff */}
          {diff.edges.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3">Edges</h4>
              <div className="space-y-2">
                {diff.edges.map((change, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded ${
                      change.type === 'added'
                        ? 'bg-green-50 border border-green-200'
                        : change.type === 'removed'
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-orange-50 border border-orange-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        change.type === 'added'
                          ? 'text-green-700'
                          : change.type === 'removed'
                          ? 'text-red-700'
                          : 'text-orange-700'
                      }`}>
                        {change.type.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">{change.path}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Variables Diff */}
          {diff.variables.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Variables</h4>
              <div className="space-y-2">
                {diff.variables.map((change, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded ${
                      change.type === 'added'
                        ? 'bg-green-50 border border-green-200'
                        : change.type === 'removed'
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-orange-50 border border-orange-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        change.type === 'added'
                          ? 'text-green-700'
                          : change.type === 'removed'
                          ? 'text-red-700'
                          : 'text-orange-700'
                      }`}>
                        {change.type.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">{change.path}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {diff.nodes.length === 0 &&
           diff.edges.length === 0 &&
           diff.variables.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No changes detected
            </div>
          )}
        </div>
      </div>
    </div>
  )
}