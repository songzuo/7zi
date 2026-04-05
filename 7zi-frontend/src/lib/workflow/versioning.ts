/**
 * Workflow Versioning Enhanced
 *
 * 增强的版本历史功能：
 * - 版本对比可视化（diff 视图）
 * - 版本分支管理
 * - 自动版本快照策略（基于时间/操作次数）
 * - 版本导出/导入功能
 * - 版本压缩（合并相邻小改动）
 *
 * @version 1.12.3
 * @date 2026-04-04
 */

import type {
  WorkflowVersion,
  WorkflowDefinition,
  CreateWorkflowVersionDTO,
} from '@/types/workflow-version'

// ============================================
// Diff Types
// ============================================

export interface DiffChange {
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  path: string
  oldValue?: unknown
  newValue?: unknown
}

export interface WorkflowDiff {
  nodes: DiffChange[]
  edges: DiffChange[]
  variables: DiffChange[]
  summary: {
    added: number
    removed: number
    modified: number
  }
}

// ============================================
// Branch Types
// ============================================

export interface VersionBranch {
  id: string
  name: string
  workflowId: string
  baseVersionId: string
  currentVersionId: string
  createdAt: string
  createdBy: string
  isMain: boolean
  metadata?: {
    description?: string
    color?: string
  }
}

export interface CreateBranchDTO {
  name: string
  workflowId: string
  baseVersionId: string
  description?: string
  color?: string
}

// ============================================
// Snapshot Policy Types
// ============================================

export interface SnapshotPolicy {
  enabled: boolean
  timeBased?: {
    intervalMinutes: number
    maxSnapshotsPerDay: number
  }
  operationBased?: {
    operationsCount: number
    maxSnapshotsPerSession: number
  }
  retention?: {
    maxSnapshots: number
    keepDays: number
  }
}

export interface SnapshotConfig {
  workflowId: string
  policy: SnapshotPolicy
  lastSnapshotAt?: string
  operationsSinceSnapshot: number
}

// ============================================
// Export/Import Types
// ============================================

export interface VersionExport {
  versions: WorkflowVersion[]
  branches: VersionBranch[]
  exportedAt: string
  exportedBy: string
  format: 'json' | 'yaml'
}

export interface VersionImportResult {
  imported: number
  skipped: number
  errors: Array<{
    versionId: string
    error: string
  }>
}

// ============================================
// Compression Types
// ============================================

export interface CompressionRule {
  maxVersionsToKeep: number
  minTimeBetweenSnapshots: number // minutes
  mergeThreshold: number // number of small changes to merge
  excludeChangeTypes?: ('create' | 'update' | 'rollback')[]
}

export interface CompressionResult {
  compressed: number
  merged: number
  deleted: number
  remaining: number
}

// ============================================
// Diff Engine
// ============================================

export class WorkflowDiffEngine {
  /**
   * Compare two workflow definitions and generate diff
   */
  static compare(
    oldDef: WorkflowDefinition,
    newDef: WorkflowDefinition
  ): WorkflowDiff {
    const diff: WorkflowDiff = {
      nodes: [],
      edges: [],
      variables: [],
      summary: { added: 0, removed: 0, modified: 0 },
    }

    // Compare nodes
    const oldNodeMap = new Map(oldDef.nodes.map((n) => [n.id, n]))
    const newNodeMap = new Map(newDef.nodes.map((n) => [n.id, n]))

    // Check for removed nodes
    for (const [id, node] of oldNodeMap) {
      if (!newNodeMap.has(id)) {
        diff.nodes.push({
          type: 'removed',
          path: `nodes.${id}`,
          oldValue: node,
        })
        diff.summary.removed++
      }
    }

    // Check for added and modified nodes
    for (const [id, node] of newNodeMap) {
      const oldNode = oldNodeMap.get(id)
      if (!oldNode) {
        diff.nodes.push({
          type: 'added',
          path: `nodes.${id}`,
          newValue: node,
        })
        diff.summary.added++
      } else if (!this.isEqual(oldNode, node)) {
        diff.nodes.push({
          type: 'modified',
          path: `nodes.${id}`,
          oldValue: oldNode,
          newValue: node,
        })
        diff.summary.modified++
      }
    }

    // Compare edges
    const oldEdgeMap = new Map(oldDef.edges.map((e) => [e.id, e]))
    const newEdgeMap = new Map(newDef.edges.map((e) => [e.id, e]))

    for (const [id, edge] of oldEdgeMap) {
      if (!newEdgeMap.has(id)) {
        diff.edges.push({
          type: 'removed',
          path: `edges.${id}`,
          oldValue: edge,
        })
        diff.summary.removed++
      }
    }

    for (const [id, edge] of newEdgeMap) {
      const oldEdge = oldEdgeMap.get(id)
      if (!oldEdge) {
        diff.edges.push({
          type: 'added',
          path: `edges.${id}`,
          newValue: edge,
        })
        diff.summary.added++
      } else if (!this.isEqual(oldEdge, edge)) {
        diff.edges.push({
          type: 'modified',
          path: `edges.${id}`,
          oldValue: oldEdge,
          newValue: edge,
        })
        diff.summary.modified++
      }
    }

    // Compare variables
    const oldVars = oldDef.variables || []
    const newVars = newDef.variables || []

    const oldVarMap = new Map(oldVars.map((v) => [v.name, v]))
    const newVarMap = new Map(newVars.map((v) => [v.name, v]))

    for (const [name, variable] of oldVarMap) {
      if (!newVarMap.has(name)) {
        diff.variables.push({
          type: 'removed',
          path: `variables.${name}`,
          oldValue: variable,
        })
        diff.summary.removed++
      }
    }

    for (const [name, variable] of newVarMap) {
      const oldVar = oldVarMap.get(name)
      if (!oldVar) {
        diff.variables.push({
          type: 'added',
          path: `variables.${name}`,
          newValue: variable,
        })
        diff.summary.added++
      } else if (!this.isEqual(oldVar, variable)) {
        diff.variables.push({
          type: 'modified',
          path: `variables.${name}`,
          oldValue: oldVar,
          newValue: variable,
        })
        diff.summary.modified++
      }
    }

    return diff
  }

  /**
   * Compare two versions
   */
  static compareVersions(
    oldVersion: WorkflowVersion,
    newVersion: WorkflowVersion
  ): WorkflowDiff {
    return this.compare(oldVersion.definition, newVersion.definition)
  }

  /**
   * Deep equality check
   */
  private static isEqual(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a == null || b == null) return false
    if (typeof a !== typeof b) return false

    if (typeof a === 'object') {
      const aObj = a as Record<string, unknown>
      const bObj = b as Record<string, unknown>

      const keysA = Object.keys(aObj)
      const keysB = Object.keys(bObj)

      if (keysA.length !== keysB.length) return false

      for (const key of keysA) {
        if (!keysB.includes(key)) return false
        if (!this.isEqual(aObj[key], bObj[key])) return false
      }

      return true
    }

    return false
  }

  /**
   * Format diff as human-readable text
   */
  static formatDiff(diff: WorkflowDiff): string {
    const lines: string[] = []

    lines.push(`=== Workflow Diff Summary ===`)
    lines.push(`Added: ${diff.summary.added}`)
    lines.push(`Removed: ${diff.summary.removed}`)
    lines.push(`Modified: ${diff.summary.modified}`)
    lines.push('')

    if (diff.nodes.length > 0) {
      lines.push('=== Nodes ===')
      for (const change of diff.nodes) {
        lines.push(`[${change.type.toUpperCase()}] ${change.path}`)
      }
      lines.push('')
    }

    if (diff.edges.length > 0) {
      lines.push('=== Edges ===')
      for (const change of diff.edges) {
        lines.push(`[${change.type.toUpperCase()}] ${change.path}`)
      }
      lines.push('')
    }

    if (diff.variables.length > 0) {
      lines.push('=== Variables ===')
      for (const change of diff.variables) {
        lines.push(`[${change.type.toUpperCase()}] ${change.path}`)
      }
    }

    return lines.join('\n')
  }
}

// ============================================
// Branch Manager
// ============================================

export class WorkflowBranchManager {
  private branches: Map<string, VersionBranch> = new Map()
  private storageKey = '7zi-workflow-branches'

  constructor() {
    this.loadFromStorage()
  }

  /**
   * Create a new branch
   */
  async createBranch(dto: CreateBranchDTO, createdBy: string): Promise<VersionBranch> {
    const branch: VersionBranch = {
      id: `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: dto.name,
      workflowId: dto.workflowId,
      baseVersionId: dto.baseVersionId,
      currentVersionId: dto.baseVersionId,
      createdAt: new Date().toISOString(),
      createdBy,
      isMain: false,
      metadata: {
        description: dto.description,
        color: dto.color,
      },
    }

    this.branches.set(branch.id, branch)
    this.saveToStorage()

    return branch
  }

  /**
   * Get a branch by ID
   */
  getBranch(id: string): VersionBranch | null {
    return this.branches.get(id) || null
  }

  /**
   * Get all branches for a workflow
   */
  getWorkflowBranches(workflowId: string): VersionBranch[] {
    return Array.from(this.branches.values()).filter(
      (b) => b.workflowId === workflowId
    )
  }

  /**
   * Update branch's current version
   */
  async updateBranchVersion(
    branchId: string,
    versionId: string
  ): Promise<void> {
    const branch = this.branches.get(branchId)
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`)
    }

    branch.currentVersionId = versionId
    this.saveToStorage()
  }

  /**
   * Delete a branch
   */
  async deleteBranch(branchId: string): Promise<void> {
    const branch = this.branches.get(branchId)
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`)
    }

    if (branch.isMain) {
      throw new Error('Cannot delete main branch')
    }

    this.branches.delete(branchId)
    this.saveToStorage()
  }

  /**
   * Merge a branch into main
   */
  async mergeBranch(
    branchId: string,
    mergedBy: string
  ): Promise<WorkflowVersion> {
    const branch = this.branches.get(branchId)
    if (!branch) {
      throw new Error(`Branch not found: ${branchId}`)
    }

    if (branch.isMain) {
      throw new Error('Cannot merge main branch into itself')
    }

    // Get the current version from the branch
    // This would typically come from the version storage
    // For now, we'll just delete the branch
    this.branches.delete(branchId)
    this.saveToStorage()

    // Return a placeholder - in real implementation, this would create a new version
    return {} as WorkflowVersion
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    try {
      const data = localStorage.getItem(this.storageKey)
      if (data) {
        const parsed = JSON.parse(data)
        this.branches = new Map(Object.entries(parsed))
      }
    } catch (error) {
      console.warn('[WorkflowBranchManager] Failed to load branches:', error)
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    try {
      const data = Object.fromEntries(this.branches)
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.warn('[WorkflowBranchManager] Failed to save branches:', error)
    }
  }
}

// ============================================
// Snapshot Policy Manager
// ============================================

export class SnapshotPolicyManager {
  private configs: Map<string, SnapshotConfig> = new Map()
  private storageKey = '7zi-workflow-snapshot-configs'

  constructor() {
    this.loadFromStorage()
  }

  /**
   * Configure snapshot policy for a workflow
   */
  configurePolicy(workflowId: string, policy: SnapshotPolicy): void {
    const config: SnapshotConfig = {
      workflowId,
      policy,
      operationsSinceSnapshot: 0,
    }

    this.configs.set(workflowId, config)
    this.saveToStorage()
  }

  /**
   * Check if a snapshot should be created
   */
  shouldSnapshot(workflowId: string): boolean {
    const config = this.configs.get(workflowId)
    if (!config || !config.policy.enabled) {
      return false
    }

    const { policy, lastSnapshotAt, operationsSinceSnapshot } = config

    // Check time-based policy
    if (policy.timeBased) {
      const now = Date.now()
      const lastSnapshot = lastSnapshotAt ? new Date(lastSnapshotAt).getTime() : 0
      const elapsedMinutes = (now - lastSnapshot) / (1000 * 60)

      if (elapsedMinutes >= policy.timeBased.intervalMinutes) {
        return true
      }
    }

    // Check operation-based policy
    if (policy.operationBased) {
      if (operationsSinceSnapshot >= policy.operationBased.operationsCount) {
        return true
      }
    }

    return false
  }

  /**
   * Record an operation
   */
  recordOperation(workflowId: string): void {
    const config = this.configs.get(workflowId)
    if (!config) {
      return
    }

    config.operationsSinceSnapshot++
    this.saveToStorage()
  }

  /**
   * Mark that a snapshot was created
   */
  markSnapshotCreated(workflowId: string): void {
    const config = this.configs.get(workflowId)
    if (!config) {
      return
    }

    config.lastSnapshotAt = new Date().toISOString()
    config.operationsSinceSnapshot = 0
    this.saveToStorage()
  }

  /**
   * Get configuration for a workflow
   */
  getConfig(workflowId: string): SnapshotConfig | null {
    return this.configs.get(workflowId || null)
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    try {
      const data = localStorage.getItem(this.storageKey)
      if (data) {
        const parsed = JSON.parse(data)
        this.configs = new Map(Object.entries(parsed))
      }
    } catch (error) {
      console.warn('[SnapshotPolicyManager] Failed to load configs:', error)
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return
    }

    try {
      const data = Object.fromEntries(this.configs)
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      console.warn('[SnapshotPolicyManager] Failed to save configs:', error)
    }
  }
}

// ============================================
// Version Export/Import Manager
// ============================================

export class VersionExportImportManager {
  /**
   * Export versions to JSON
   */
  async exportVersions(
    versions: WorkflowVersion[],
    branches: VersionBranch[],
    exportedBy: string
  ): Promise<VersionExport> {
    const exportData: VersionExport = {
      versions,
      branches,
      exportedAt: new Date().toISOString(),
      exportedBy,
      format: 'json',
    }

    return exportData
  }

  /**
   * Import versions from export data
   */
  async importVersions(
    exportData: VersionExport,
    workflowId: string
  ): Promise<VersionImportResult> {
    const result: VersionImportResult = {
      imported: 0,
      skipped: 0,
      errors: [],
    }

    // This would integrate with the version storage
    // For now, just count the versions
    for (const version of exportData.versions) {
      if (version.workflowId === workflowId) {
        result.imported++
      } else {
        result.skipped++
      }
    }

    return result
  }

  /**
   * Download export as file
   */
  downloadExport(exportData: VersionExport, filename?: string): void {
    const data = JSON.stringify(exportData, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = filename || `workflow-versions-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * Parse export from file
   */
  async parseExportFile(file: File): Promise<VersionExport> {
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
    const data = JSON.parse(text)
    return data as VersionExport
  }
}

// ============================================
// Version Compression Manager
// ============================================

export class VersionCompressionManager {
  /**
   * Compress version history
   */
  async compressVersions(
    versions: WorkflowVersion[],
    rule: CompressionRule
  ): Promise<CompressionResult> {
    const result: CompressionResult = {
      compressed: 0,
      merged: 0,
      deleted: 0,
      remaining: 0,
    }

    if (versions.length <= rule.maxVersionsToKeep) {
      result.remaining = versions.length
      return result
    }

    // Sort by creation time
    const sorted = [...versions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    // Identify versions to keep
    const toKeep: WorkflowVersion[] = []
    const toMerge: WorkflowVersion[] = []

    for (let i = 0; i < sorted.length; i++) {
      const version = sorted[i]

      // Always keep the first and last versions
      if (i === 0 || i === sorted.length - 1) {
        toKeep.push(version)
        continue
      }

      // Check if this version should be excluded
      if (
        rule.excludeChangeTypes?.includes(
          version.metadata?.changeType as 'create' | 'update' | 'rollback'
        )
      ) {
        toKeep.push(version)
        continue
      }

      // Check if this is a small change that can be merged
      const prevVersion = sorted[i - 1]
      const timeDiff =
        new Date(version.createdAt).getTime() -
        new Date(prevVersion.createdAt).getTime()
      const timeDiffMinutes = timeDiff / (1000 * 60)

      if (timeDiffMinutes < rule.minTimeBetweenSnapshots) {
        toMerge.push(version)
        result.merged++
      } else {
        toKeep.push(version)
      }
    }

    // If we still have too many versions, delete the oldest ones
    const excess = toKeep.length - rule.maxVersionsToKeep
    if (excess > 0) {
      toKeep.splice(0, excess)
      result.deleted = excess
    }

    result.compressed = result.merged + result.deleted
    result.remaining = toKeep.length

    return result
  }

  /**
   * Get default compression rule
   */
  static getDefaultRule(): CompressionRule {
    return {
      maxVersionsToKeep: 50,
      minTimeBetweenSnapshots: 5, // 5 minutes
      mergeThreshold: 3,
      excludeChangeTypes: ['create', 'rollback'],
    }
  }
}

// ============================================
// Singleton Instances
// ============================================

let branchManagerInstance: WorkflowBranchManager | null = null
let snapshotPolicyManagerInstance: SnapshotPolicyManager | null = null
let exportImportManagerInstance: VersionExportImportManager | null = null
let compressionManagerInstance: VersionCompressionManager | null = null

export function getBranchManager(): WorkflowBranchManager {
  if (!branchManagerInstance) {
    branchManagerInstance = new WorkflowBranchManager()
  }
  return branchManagerInstance
}

export function getSnapshotPolicyManager(): SnapshotPolicyManager {
  if (!snapshotPolicyManagerInstance) {
    snapshotPolicyManagerInstance = new SnapshotPolicyManager()
  }
  return snapshotPolicyManagerInstance
}

export function getExportImportManager(): VersionExportImportManager {
  if (!exportImportManagerInstance) {
    exportImportManagerInstance = new VersionExportImportManager()
  }
  return exportImportManagerInstance
}

export function getCompressionManager(): VersionCompressionManager {
  if (!compressionManagerInstance) {
    compressionManagerInstance = new VersionCompressionManager()
  }
  return compressionManagerInstance
}