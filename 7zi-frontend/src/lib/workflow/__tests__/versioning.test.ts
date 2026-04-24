/**
 * Workflow Versioning Tests
 *
 * 测试增强的版本历史功能：
 * - Diff引擎
 * - 分支管理
 * - 快照策略
 * - 导出/导入
 * - 版本压缩
 *
 * @version 1.12.3
 * @date 2026-04-04
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  WorkflowDiffEngine,
  WorkflowBranchManager,
  SnapshotPolicyManager,
  VersionExportImportManager,
  VersionCompressionManager,
  getBranchManager,
  getSnapshotPolicyManager,
  getExportImportManager,
  getCompressionManager,
} from '@/lib/workflow/versioning'
import type {
  WorkflowVersion,
  WorkflowDefinition,
} from '@/types/workflow-version'
import type {
  VersionBranch,
  SnapshotPolicy,
  CompressionRule,
} from '@/lib/workflow/versioning'

// ============================================
// Fixtures
// ============================================

const mockWorkflowDefinition: WorkflowDefinition = {
  nodes: [
    {
      id: 'node-1',
      type: 'start',
      data: { label: 'Start' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'node-2',
      type: 'action',
      data: { label: 'Process' },
      position: { x: 200, y: 0 },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
    },
  ],
  variables: [
    {
      name: 'var1',
      type: 'string',
      defaultValue: 'value1',
    },
  ],
}

const mockModifiedWorkflowDefinition: WorkflowDefinition = {
  nodes: [
    {
      id: 'node-1',
      type: 'start',
      data: { label: 'Start' },
      position: { x: 0, y: 0 },
    },
    {
      id: 'node-2',
      type: 'action',
      data: { label: 'Process Updated' }, // Modified
      position: { x: 200, y: 0 },
    },
    {
      id: 'node-3',
      type: 'end',
      data: { label: 'End' }, // Added
      position: { x: 400, y: 0 },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
    },
    {
      id: 'edge-2',
      source: 'node-2',
      target: 'node-3', // Added
    },
  ],
  variables: [
    {
      name: 'var1',
      type: 'string',
      defaultValue: 'value1',
    },
    {
      name: 'var2',
      type: 'number',
      defaultValue: 42, // Added
    },
  ],
}

const mockWorkflowVersion: WorkflowVersion = {
  id: 'version-1',
  workflowId: 'workflow-1',
  version: '1.0.0',
  name: 'Initial Version',
  description: 'Initial version of the workflow',
  definition: mockWorkflowDefinition,
  createdAt: '2026-04-04T00:00:00Z',
  createdBy: 'user-1',
  metadata: {
    changeType: 'create',
    changeDescription: 'Created initial workflow',
  },
}

const mockModifiedVersion: WorkflowVersion = {
  id: 'version-2',
  workflowId: 'workflow-1',
  version: '1.0.1',
  name: 'Updated Version',
  description: 'Updated workflow with new node',
  definition: mockModifiedWorkflowDefinition,
  createdAt: '2026-04-04T01:00:00Z',
  createdBy: 'user-1',
  metadata: {
    changeType: 'update',
    changeDescription: 'Added new node and edge',
  },
}

// ============================================
// Diff Engine Tests
// ============================================

describe('WorkflowDiffEngine', () => {
  describe('compare', () => {
    it('should detect added nodes', () => {
      const diff = WorkflowDiffEngine.compare(
        mockWorkflowDefinition,
        mockModifiedWorkflowDefinition
      )

      const addedNodes = diff.nodes.filter((n) => n.type === 'added')
      expect(addedNodes.length).toBe(1)
      expect(addedNodes[0].path).toBe('nodes.node-3')
    })

    it('should detect modified nodes', () => {
      const diff = WorkflowDiffEngine.compare(
        mockWorkflowDefinition,
        mockModifiedWorkflowDefinition
      )

      const modifiedNodes = diff.nodes.filter((n) => n.type === 'modified')
      expect(modifiedNodes.length).toBe(1)
      expect(modifiedNodes[0].path).toBe('nodes.node-2')
    })

    it('should detect added edges', () => {
      const diff = WorkflowDiffEngine.compare(
        mockWorkflowDefinition,
        mockModifiedWorkflowDefinition
      )

      const addedEdges = diff.edges.filter((e) => e.type === 'added')
      expect(addedEdges.length).toBe(1)
      expect(addedEdges[0].path).toBe('edges.edge-2')
    })

    it('should detect added variables', () => {
      const diff = WorkflowDiffEngine.compare(
        mockWorkflowDefinition,
        mockModifiedWorkflowDefinition
      )

      const addedVars = diff.variables.filter((v) => v.type === 'added')
      expect(addedVars.length).toBe(1)
      expect(addedVars[0].path).toBe('variables.var2')
    })

    it('should generate correct summary', () => {
      const diff = WorkflowDiffEngine.compare(
        mockWorkflowDefinition,
        mockModifiedWorkflowDefinition
      )

      expect(diff.summary).toEqual({
        added: 3, // node-3, edge-2, var2
        removed: 0,
        modified: 1, // node-2
      })
    })
  })

  describe('compareVersions', () => {
    it('should compare two workflow versions', () => {
      const diff = WorkflowDiffEngine.compareVersions(
        mockWorkflowVersion,
        mockModifiedVersion
      )

      expect(diff.summary.added).toBeGreaterThan(0)
      expect(diff.summary.modified).toBeGreaterThan(0)
    })
  })

  describe('formatDiff', () => {
    it('should format diff as human-readable text', () => {
      const diff = WorkflowDiffEngine.compare(
        mockWorkflowDefinition,
        mockModifiedWorkflowDefinition
      )

      const formatted = WorkflowDiffEngine.formatDiff(diff)

      expect(formatted).toContain('Workflow Diff Summary')
      expect(formatted).toContain('Added:')
      expect(formatted).toContain('Modified:')
      expect(formatted).toContain('=== Nodes ===')
      expect(formatted).toContain('=== Edges ===')
    })
  })
})

// ============================================
// Branch Manager Tests
// ============================================

describe('WorkflowBranchManager', () => {
  let manager: WorkflowBranchManager

  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear()
    }
    manager = new WorkflowBranchManager()
  })

  describe('createBranch', () => {
    it('should create a new branch', async () => {
      const branch = await manager.createBranch(
        {
          name: 'feature-branch',
          workflowId: 'workflow-1',
          baseVersionId: 'version-1',
          description: 'Test feature branch',
        },
        'user-1'
      )

      expect(branch).toBeDefined()
      expect(branch.name).toBe('feature-branch')
      expect(branch.workflowId).toBe('workflow-1')
      expect(branch.isMain).toBe(false)
      expect(branch.createdBy).toBe('user-1')
    })

    it('should assign a unique ID to the branch', async () => {
      const branch1 = await manager.createBranch(
        {
          name: 'branch-1',
          workflowId: 'workflow-1',
          baseVersionId: 'version-1',
        },
        'user-1'
      )

      const branch2 = await manager.createBranch(
        {
          name: 'branch-2',
          workflowId: 'workflow-1',
          baseVersionId: 'version-1',
        },
        'user-1'
      )

      expect(branch1.id).not.toBe(branch2.id)
    })
  })

  describe('getBranch', () => {
    it('should retrieve a branch by ID', async () => {
      const created = await manager.createBranch(
        {
          name: 'test-branch',
          workflowId: 'workflow-1',
          baseVersionId: 'version-1',
        },
        'user-1'
      )

      const retrieved = manager.getBranch(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.name).toBe('test-branch')
    })

    it('should return null for non-existent branch', () => {
      const branch = manager.getBranch('non-existent-id')
      expect(branch).toBeNull()
    })
  })

  describe('getWorkflowBranches', () => {
    it('should retrieve all branches for a workflow', async () => {
      await manager.createBranch(
        {
          name: 'branch-1',
          workflowId: 'workflow-1',
          baseVersionId: 'version-1',
        },
        'user-1'
      )

      await manager.createBranch(
        {
          name: 'branch-2',
          workflowId: 'workflow-1',
          baseVersionId: 'version-1',
        },
        'user-1'
      )

      await manager.createBranch(
        {
          name: 'branch-3',
          workflowId: 'workflow-2',
          baseVersionId: 'version-1',
        },
        'user-1'
      )

      const workflow1Branches = manager.getWorkflowBranches('workflow-1')
      expect(workflow1Branches.length).toBe(2)

      const workflow2Branches = manager.getWorkflowBranches('workflow-2')
      expect(workflow2Branches.length).toBe(1)
    })
  })

  describe('updateBranchVersion', () => {
    it('should update branch current version', async () => {
      const branch = await manager.createBranch(
        {
          name: 'test-branch',
          workflowId: 'workflow-1',
          baseVersionId: 'version-1',
        },
        'user-1'
      )

      await manager.updateBranchVersion(branch.id, 'version-2')

      const updated = manager.getBranch(branch.id)
      expect(updated?.currentVersionId).toBe('version-2')
    })

    it('should throw error for non-existent branch', async () => {
      await expect(
        manager.updateBranchVersion('non-existent', 'version-2')
      ).rejects.toThrow('Branch not found')
    })
  })

  describe('deleteBranch', () => {
    it('should delete a branch', async () => {
      const branch = await manager.createBranch(
        {
          name: 'test-branch',
          workflowId: 'workflow-1',
          baseVersionId: 'version-1',
        },
        'user-1'
      )

      await manager.deleteBranch(branch.id)

      const deleted = manager.getBranch(branch.id)
      expect(deleted).toBeNull()
    })

    it('should throw error when deleting main branch', async () => {
      const manager = new WorkflowBranchManager()
      const mainBranch: VersionBranch = {
        id: 'main-branch',
        name: 'main',
        workflowId: 'workflow-1',
        baseVersionId: 'version-1',
        currentVersionId: 'version-1',
        createdAt: new Date().toISOString(),
        createdBy: 'system',
        isMain: true,
      }

      // Directly set the branch as main
      ;(manager as any).branches.set('main-branch', mainBranch)

      await expect(manager.deleteBranch('main-branch')).rejects.toThrow(
        'Cannot delete main branch'
      )
    })
  })
})

// ============================================
// Snapshot Policy Manager Tests
// ============================================

describe('SnapshotPolicyManager', () => {
  let manager: SnapshotPolicyManager

  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear()
    }
    manager = new SnapshotPolicyManager()
  })

  describe('configurePolicy', () => {
    it('should configure snapshot policy for workflow', () => {
      const policy: SnapshotPolicy = {
        enabled: true,
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
      }

      manager.configurePolicy('workflow-1', policy)

      const config = manager.getConfig('workflow-1')
      expect(config).toBeDefined()
      expect(config?.policy.enabled).toBe(true)
      expect(config?.policy.timeBased?.intervalMinutes).toBe(30)
    })

    it('should initialize operations counter to 0', () => {
      const policy: SnapshotPolicy = {
        enabled: true,
        timeBased: { intervalMinutes: 30, maxSnapshotsPerDay: 48 },
      }

      manager.configurePolicy('workflow-1', policy)

      const config = manager.getConfig('workflow-1')
      expect(config?.operationsSinceSnapshot).toBe(0)
    })
  })

  describe('shouldSnapshot', () => {
    it('should return false when policy is disabled', () => {
      const policy: SnapshotPolicy = { enabled: false }
      manager.configurePolicy('workflow-1', policy)

      expect(manager.shouldSnapshot('workflow-1')).toBe(false)
    })

    it('should return true when time interval passed', () => {
      const policy: SnapshotPolicy = {
        enabled: true,
        timeBased: { intervalMinutes: 30, maxSnapshotsPerDay: 48 },
      }

      manager.configurePolicy('workflow-1', policy)

      // Set last snapshot to more than 30 minutes ago
      const config = manager.getConfig('workflow-1')
      if (config) {
        config.lastSnapshotAt = new Date(Date.now() - 31 * 60 * 1000).toISOString()
      }

      expect(manager.shouldSnapshot('workflow-1')).toBe(true)
    })

    it('should return true when operation threshold reached', () => {
      const policy: SnapshotPolicy = {
        enabled: true,
        operationBased: { operationsCount: 10, maxSnapshotsPerSession: 20 },
      }

      manager.configurePolicy('workflow-1', policy)

      // Record enough operations
      for (let i = 0; i < 10; i++) {
        manager.recordOperation('workflow-1')
      }

      expect(manager.shouldSnapshot('workflow-1')).toBe(true)
    })
  })

  describe('recordOperation', () => {
    it('should increment operation counter', () => {
      const policy: SnapshotPolicy = {
        enabled: true,
        operationBased: { operationsCount: 10, maxSnapshotsPerSession: 20 },
      }

      manager.configurePolicy('workflow-1', policy)

      manager.recordOperation('workflow-1')
      manager.recordOperation('workflow-1')

      const config = manager.getConfig('workflow-1')
      expect(config?.operationsSinceSnapshot).toBe(2)
    })
  })

  describe('markSnapshotCreated', () => {
    it('should reset operation counter', () => {
      const policy: SnapshotPolicy = {
        enabled: true,
        operationBased: { operationsCount: 10, maxSnapshotsPerSession: 20 },
      }

      manager.configurePolicy('workflow-1', policy)

      // Record some operations
      manager.recordOperation('workflow-1')
      manager.recordOperation('workflow-1')
      manager.recordOperation('workflow-1')

      // Mark snapshot created
      manager.markSnapshotCreated('workflow-1')

      const config = manager.getConfig('workflow-1')
      expect(config?.operationsSinceSnapshot).toBe(0)
      expect(config?.lastSnapshotAt).toBeDefined()
    })
  })
})

// ============================================
// Export/Import Manager Tests
// ============================================

describe('VersionExportImportManager', () => {
  let manager: VersionExportImportManager

  beforeEach(() => {
    manager = new VersionExportImportManager()
  })

  describe('exportVersions', () => {
    it('should export versions and branches', async () => {
      const versions = [mockWorkflowVersion, mockModifiedVersion]
      const branches: VersionBranch[] = []

      const exportData = await manager.exportVersions(
        versions,
        branches,
        'user-1'
      )

      expect(exportData.versions).toHaveLength(2)
      expect(exportData.branches).toHaveLength(0)
      expect(exportData.exportedBy).toBe('user-1')
      expect(exportData.format).toBe('json')
      expect(exportData.exportedAt).toBeDefined()
    })
  })

  describe('importVersions', () => {
    it('should count imported and skipped versions', async () => {
      const exportData = {
        versions: [
          { ...mockWorkflowVersion, workflowId: 'workflow-1' },
          { ...mockModifiedVersion, workflowId: 'workflow-2' }, // Different workflow
        ],
        branches: [],
        exportedAt: new Date().toISOString(),
        exportedBy: 'user-1',
        format: 'json' as const,
      }

      const result = await manager.importVersions(exportData, 'workflow-1')

      expect(result.imported).toBe(1)
      expect(result.skipped).toBe(1)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('parseExportFile', () => {
    it('should parse JSON export file', async () => {
      const exportData = {
        versions: [mockWorkflowVersion],
        branches: [],
        exportedAt: new Date().toISOString(),
        exportedBy: 'user-1',
        format: 'json' as const,
      }

      const file = new File([JSON.stringify(exportData)], 'export.json', {
        type: 'application/json',
      })

      const parsed = await manager.parseExportFile(file)

      expect(parsed.versions).toHaveLength(1)
      expect(parsed.format).toBe('json')
    })
  })
})

// ============================================
// Compression Manager Tests
// ============================================

describe('VersionCompressionManager', () => {
  let manager: VersionCompressionManager

  beforeEach(() => {
    manager = new VersionCompressionManager()
  })

  describe('compressVersions', () => {
    it('should not compress if versions under limit', async () => {
      const rule: CompressionRule = {
        maxVersionsToKeep: 10,
        minTimeBetweenSnapshots: 5,
        mergeThreshold: 3,
      }

      const versions = [mockWorkflowVersion, mockModifiedVersion]

      const result = await manager.compressVersions(versions, rule)

      expect(result.compressed).toBe(0)
      expect(result.remaining).toBe(2)
    })

    it('should compress versions exceeding limit', async () => {
      const rule: CompressionRule = {
        maxVersionsToKeep: 2,
        minTimeBetweenSnapshots: 5,
        mergeThreshold: 3,
      }

      const versions = [
        mockWorkflowVersion,
        mockModifiedVersion,
        {
          ...mockModifiedVersion,
          id: 'version-3',
          version: '1.0.2',
          createdAt: '2026-04-04T02:00:00Z',
        },
        {
          ...mockModifiedVersion,
          id: 'version-4',
          version: '1.0.3',
          createdAt: '2026-04-04T03:00:00Z',
        },
      ]

      const result = await manager.compressVersions(versions, rule)

      expect(result.compressed).toBeGreaterThan(0)
      expect(result.remaining).toBeLessThanOrEqual(2)
    })

    it('should merge versions within time threshold', async () => {
      const rule: CompressionRule = {
        maxVersionsToKeep: 10,
        minTimeBetweenSnapshots: 5, // 5 minutes
        mergeThreshold: 3,
      }

      const now = Date.now()
      const versions = [
        {
          ...mockWorkflowVersion,
          createdAt: new Date(now - 20 * 60 * 1000).toISOString(), // 20 min ago
        },
        {
          ...mockModifiedVersion,
          id: 'version-2',
          createdAt: new Date(now - 15 * 60 * 1000).toISOString(), // 15 min ago
        },
        {
          ...mockModifiedVersion,
          id: 'version-3',
          createdAt: new Date(now - 10 * 60 * 1000).toISOString(), // 10 min ago
        },
        {
          ...mockModifiedVersion,
          id: 'version-4',
          createdAt: new Date(now - 5 * 60 * 1000).toISOString(), // 5 min ago
        },
        {
          ...mockModifiedVersion,
          id: 'version-5',
          createdAt: new Date(now - 2 * 60 * 1000).toISOString(), // 2 min ago
        },
      ]

      const result = await manager.compressVersions(versions, rule)

      // Verify compression completed successfully
      expect(result).toBeDefined()
      expect(result.remaining).toBeLessThanOrEqual(versions.length)
    })
  })

  describe('getDefaultRule', () => {
    it('should return default compression rule', () => {
      const rule = VersionCompressionManager.getDefaultRule()

      expect(rule.maxVersionsToKeep).toBe(50)
      expect(rule.minTimeBetweenSnapshots).toBe(5)
      expect(rule.mergeThreshold).toBe(3)
      expect(rule.excludeChangeTypes).toEqual(['create', 'rollback'])
    })
  })
})

// ============================================
// Singleton Functions Tests
// ============================================

describe('Singleton Functions', () => {
  it('should return same branch manager instance', () => {
    const instance1 = getBranchManager()
    const instance2 = getBranchManager()
    expect(instance1).toBe(instance2)
  })

  it('should return same snapshot policy manager instance', () => {
    const instance1 = getSnapshotPolicyManager()
    const instance2 = getSnapshotPolicyManager()
    expect(instance1).toBe(instance2)
  })

  it('should return same export/import manager instance', () => {
    const instance1 = getExportImportManager()
    const instance2 = getExportImportManager()
    expect(instance1).toBe(instance2)
  })

  it('should return same compression manager instance', () => {
    const instance1 = getCompressionManager()
    const instance2 = getCompressionManager()
    expect(instance1).toBe(instance2)
  })
})