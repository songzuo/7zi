/**
 * Workflow Version History Service
 *
 * Provides version management for workflows:
 * - Create version snapshots
 * - List versions
 * - Compare versions (diff)
 * - Rollback to specific version
 * - Cleanup old versions
 */

import { getDatabaseAsync } from '../db/connection'
import { logger } from '../logger'
import type { WorkflowDefinition, WorkflowNode, WorkflowEdge } from '@/types/workflow'

// Type definitions
export interface WorkflowVersion {
  id: string
  workflowId: string
  versionNumber: number
  name: string
  description?: string
  status: string
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  config: WorkflowDefinition['config']
  changeSummary?: string
  changeType: 'create' | 'update' | 'rollback' | 'restore'
  parentVersionId?: string
  createdBy: string
  createdAt: string
}

export interface VersionDiff {
  id: string
  workflowId: string
  fromVersionId: string
  toVersionId: string
  nodesAdded: WorkflowNode[]
  nodesRemoved: string[] // Node IDs
  nodesModified: Array<{
    nodeId: string
    before: Partial<WorkflowNode>
    after: Partial<WorkflowNode>
    changes: string[]
  }>
  edgesAdded: WorkflowEdge[]
  edgesRemoved: string[] // Edge IDs
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

export interface VersionSettings {
  workflowId: string
  maxVersions: number
  autoVersionOnUpdate: boolean
  retentionDays: number
}

/**
 * Generate a unique version ID
 */
function generateVersionId(): string {
  return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Workflow Version History Service
 */
export class WorkflowVersionService {
  /**
   * Create a new version snapshot
   */
  async createVersion(
    workflow: WorkflowDefinition,
    options: {
      changeSummary?: string
      changeType?: 'create' | 'update' | 'rollback' | 'restore'
      createdBy?: string
      parentVersionId?: string
    } = {}
  ): Promise<WorkflowVersion> {
    const db = await getDatabaseAsync()

    // Get next version number
    const nextVersion = await this.getNextVersionNumber(workflow.id)

    const versionId = generateVersionId()
    const version: WorkflowVersion = {
      id: versionId,
      workflowId: workflow.id,
      versionNumber: nextVersion,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      nodes: workflow.nodes,
      edges: workflow.edges,
      config: workflow.config,
      changeSummary: options.changeSummary,
      changeType: options.changeType || 'update',
      parentVersionId: options.parentVersionId,
      createdBy: options.createdBy || 'system',
      createdAt: new Date().toISOString(),
    }

    // Insert version
    db.exec(
      `INSERT INTO workflow_versions (
        id, workflow_id, version_number, name, description, status,
        nodes, edges, config, change_summary, change_type, parent_version_id, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        version.id,
        version.workflowId,
        version.versionNumber,
        version.name,
        version.description || null,
        version.status,
        JSON.stringify(version.nodes),
        JSON.stringify(version.edges),
        JSON.stringify(version.config),
        version.changeSummary || null,
        version.changeType,
        version.parentVersionId || null,
        version.createdBy,
        version.createdAt,
      ]
    )

    logger.info(`Created workflow version ${version.versionNumber} for ${workflow.id}`, {
      category: 'workflow',
    })

    // Cleanup old versions if needed
    await this.cleanupOldVersions(workflow.id)

    return version
  }

  /**
   * Get next version number for a workflow
   */
  private async getNextVersionNumber(workflowId: string): Promise<number> {
    const db = await getDatabaseAsync()

    const result = db.prepare(
      'SELECT MAX(version_number) as max_version FROM workflow_versions WHERE workflow_id = ?'
    ).get(workflowId)

    return ((result?.max_version as number | null) || 0) + 1
  }

  /**
   * Get version list for a workflow
   */
  async getVersions(
    workflowId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ versions: WorkflowVersion[]; total: number }> {
    const db = await getDatabaseAsync()
    const limit = options.limit || 50
    const offset = options.offset || 0

    // Get total count
    const countResult = db.prepare(
      'SELECT COUNT(*) as count FROM workflow_versions WHERE workflow_id = ?'
    ).get(workflowId)
    const total = (countResult?.count as number) || 0

    // Get versions
    const rows = db.prepare(
      `SELECT * FROM workflow_versions 
       WHERE workflow_id = ? 
       ORDER BY version_number DESC 
       LIMIT ? OFFSET ?`
    ).all(workflowId, limit, offset) as Record<string, unknown>[]

    const versions: WorkflowVersion[] = rows.map(row => ({
      id: row.id as string,
      workflowId: row.workflow_id as string,
      versionNumber: row.version_number as number,
      name: row.name as string,
      description: row.description as string | undefined,
      status: row.status as string,
      nodes: JSON.parse(row.nodes as string) as WorkflowNode[],
      edges: JSON.parse(row.edges as string) as WorkflowEdge[],
      config: JSON.parse(row.config as string) as WorkflowDefinition['config'],
      changeSummary: row.change_summary as string | undefined,
      changeType: row.change_type as WorkflowVersion['changeType'],
      parentVersionId: row.parent_version_id as string | undefined,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
    }))

    return { versions, total }
  }

  /**
   * Get a specific version
   */
  async getVersion(versionId: string): Promise<WorkflowVersion | null> {
    const db = await getDatabaseAsync()

    const row = db.prepare('SELECT * FROM workflow_versions WHERE id = ?').get(
      versionId
    ) as Record<string, unknown> | null

    if (!row) return null

    return {
      id: row.id as string,
      workflowId: row.workflow_id as string,
      versionNumber: row.version_number as number,
      name: row.name as string,
      description: row.description as string | undefined,
      status: row.status as string,
      nodes: JSON.parse(row.nodes as string) as WorkflowNode[],
      edges: JSON.parse(row.edges as string) as WorkflowEdge[],
      config: JSON.parse(row.config as string) as WorkflowDefinition['config'],
      changeSummary: row.change_summary as string | undefined,
      changeType: row.change_type as WorkflowVersion['changeType'],
      parentVersionId: row.parent_version_id as string | undefined,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
    }
  }

  /**
   * Get latest version for a workflow
   */
  async getLatestVersion(workflowId: string): Promise<WorkflowVersion | null> {
    const db = await getDatabaseAsync()

    const row = db.prepare(
      'SELECT * FROM workflow_versions WHERE workflow_id = ? ORDER BY version_number DESC LIMIT 1'
    ).get(workflowId) as Record<string, unknown> | null

    if (!row) return null

    return {
      id: row.id as string,
      workflowId: row.workflow_id as string,
      versionNumber: row.version_number as number,
      name: row.name as string,
      description: row.description as string | undefined,
      status: row.status as string,
      nodes: JSON.parse(row.nodes as string) as WorkflowNode[],
      edges: JSON.parse(row.edges as string) as WorkflowEdge[],
      config: JSON.parse(row.config as string) as WorkflowDefinition['config'],
      changeSummary: row.change_summary as string | undefined,
      changeType: row.change_type as WorkflowVersion['changeType'],
      parentVersionId: row.parent_version_id as string | undefined,
      createdBy: row.created_by as string,
      createdAt: row.created_at as string,
    }
  }

  /**
   * Compare two versions and compute diff
   */
  async compareVersions(fromVersionId: string, toVersionId: string): Promise<VersionDiff> {
    const db = await getDatabaseAsync()

    // Check for cached diff
    const cachedDiff = db.prepare(
      'SELECT * FROM workflow_version_diffs WHERE from_version_id = ? AND to_version_id = ?'
    ).get(fromVersionId, toVersionId) as Record<string, unknown> | null

    if (cachedDiff) {
      return {
        id: cachedDiff.id as string,
        workflowId: cachedDiff.workflow_id as string,
        fromVersionId: cachedDiff.from_version_id as string,
        toVersionId: cachedDiff.to_version_id as string,
        nodesAdded: JSON.parse(cachedDiff.nodes_added as string) as WorkflowNode[],
        nodesRemoved: JSON.parse(cachedDiff.nodes_removed as string) as string[],
        nodesModified: JSON.parse(cachedDiff.nodes_modified as string) as Array<{
          nodeId: string
          before: Partial<WorkflowNode>
          after: Partial<WorkflowNode>
          changes: string[]
        }>,
        edgesAdded: JSON.parse(cachedDiff.edges_added as string) as WorkflowEdge[],
        edgesRemoved: JSON.parse(cachedDiff.edges_removed as string) as string[],
        edgesModified: JSON.parse(cachedDiff.edges_modified as string) as Array<{
          edgeId: string
          before: Partial<WorkflowEdge>
          after: Partial<WorkflowEdge>
          changes: string[]
        }>,
        configChanged: JSON.parse(cachedDiff.config_changed as string) as Record<
          string,
          { before: unknown; after: unknown }
        >,
        totalChanges: cachedDiff.total_changes as number,
        computedAt: cachedDiff.computed_at as string,
      }
    }

    // Get versions
    const fromVersion = await this.getVersion(fromVersionId)
    const toVersion = await this.getVersion(toVersionId)

    if (!fromVersion || !toVersion) {
      throw new Error('Version not found')
    }

    // Compute diff
    const diff = this.computeDiff(fromVersion, toVersion)

    // Cache diff
    const diffId = `diff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    db.exec(
      `INSERT INTO workflow_version_diffs (
        id, workflow_id, from_version_id, to_version_id,
        nodes_added, nodes_removed, nodes_modified,
        edges_added, edges_removed, edges_modified,
        config_changed, total_changes, computed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        diffId,
        diff.workflowId,
        diff.fromVersionId,
        diff.toVersionId,
        JSON.stringify(diff.nodesAdded),
        JSON.stringify(diff.nodesRemoved),
        JSON.stringify(diff.nodesModified),
        JSON.stringify(diff.edgesAdded),
        JSON.stringify(diff.edgesRemoved),
        JSON.stringify(diff.edgesModified),
        JSON.stringify(diff.configChanged),
        diff.totalChanges,
        diff.computedAt,
      ]
    )

    diff.id = diffId
    return diff
  }

  /**
   * Compute diff between two versions
   */
  private computeDiff(from: WorkflowVersion, to: WorkflowVersion): VersionDiff {
    const diff: VersionDiff = {
      id: '',
      workflowId: to.workflowId,
      fromVersionId: from.id,
      toVersionId: to.id,
      nodesAdded: [],
      nodesRemoved: [],
      nodesModified: [],
      edgesAdded: [],
      edgesRemoved: [],
      edgesModified: [],
      configChanged: {},
      totalChanges: 0,
      computedAt: new Date().toISOString(),
    }

    // Create maps for quick lookup
    const fromNodesMap = new Map(from.nodes.map(n => [n.id, n]))
    const toNodesMap = new Map(to.nodes.map(n => [n.id, n]))
    const fromEdgesMap = new Map(from.edges.map(e => [e.id, e]))
    const toEdgesMap = new Map(to.edges.map(e => [e.id, e]))

    // Find added and modified nodes
    for (const node of to.nodes) {
      const fromNode = fromNodesMap.get(node.id)
      if (!fromNode) {
        diff.nodesAdded.push(node)
      } else {
        const changes = this.getNodeChanges(fromNode, node)
        if (changes.length > 0) {
          diff.nodesModified.push({
            nodeId: node.id,
            before: fromNode,
            after: node,
            changes,
          })
        }
      }
    }

    // Find removed nodes
    for (const node of from.nodes) {
      if (!toNodesMap.has(node.id)) {
        diff.nodesRemoved.push(node.id)
      }
    }

    // Find added and modified edges
    for (const edge of to.edges) {
      const fromEdge = fromEdgesMap.get(edge.id)
      if (!fromEdge) {
        diff.edgesAdded.push(edge)
      } else {
        const changes = this.getEdgeChanges(fromEdge, edge)
        if (changes.length > 0) {
          diff.edgesModified.push({
            edgeId: edge.id,
            before: fromEdge,
            after: edge,
            changes,
          })
        }
      }
    }

    // Find removed edges
    for (const edge of from.edges) {
      if (!toEdgesMap.has(edge.id)) {
        diff.edgesRemoved.push(edge.id)
      }
    }

    // Compare config
    const configKeys = new Set([...Object.keys(from.config), ...Object.keys(to.config)])
    for (const key of configKeys) {
      const fromValue = (from.config as Record<string, unknown>)[key]
      const toValue = (to.config as Record<string, unknown>)[key]
      if (JSON.stringify(fromValue) !== JSON.stringify(toValue)) {
        diff.configChanged[key] = { before: fromValue, after: toValue }
      }
    }

    // Calculate total changes
    diff.totalChanges =
      diff.nodesAdded.length +
      diff.nodesRemoved.length +
      diff.nodesModified.length +
      diff.edgesAdded.length +
      diff.edgesRemoved.length +
      diff.edgesModified.length +
      Object.keys(diff.configChanged).length

    return diff
  }

  /**
   * Get changes between two nodes
   */
  private getNodeChanges(from: WorkflowNode, to: WorkflowNode): string[] {
    const changes: string[] = []
    const keys: (keyof WorkflowNode)[] = ['name', 'description', 'type', 'position']

    for (const key of keys) {
      if (JSON.stringify(from[key]) !== JSON.stringify(to[key])) {
        changes.push(`${key}: "${from[key]}" → "${to[key]}"`)
      }
    }

    // Check agentConfig
    if (JSON.stringify(from.agentConfig) !== JSON.stringify(to.agentConfig)) {
      changes.push('agentConfig changed')
    }

    // Check conditionConfig
    if (JSON.stringify(from.conditionConfig) !== JSON.stringify(to.conditionConfig)) {
      changes.push('conditionConfig changed')
    }

    // Check waitConfig
    if (JSON.stringify(from.waitConfig) !== JSON.stringify(to.waitConfig)) {
      changes.push('waitConfig changed')
    }

    // Check config
    if (JSON.stringify(from.config) !== JSON.stringify(to.config)) {
      changes.push('config changed')
    }

    return changes
  }

  /**
   * Get changes between two edges
   */
  private getEdgeChanges(from: WorkflowEdge, to: WorkflowEdge): string[] {
    const changes: string[] = []
    const keys: (keyof WorkflowEdge)[] = ['source', 'target', 'type']

    for (const key of keys) {
      if (JSON.stringify(from[key]) !== JSON.stringify(to[key])) {
        changes.push(`${key}: "${from[key]}" → "${to[key]}"`)
      }
    }

    if (JSON.stringify(from.conditionConfig) !== JSON.stringify(to.conditionConfig)) {
      changes.push('conditionConfig changed')
    }

    if (JSON.stringify(from.style) !== JSON.stringify(to.style)) {
      changes.push('style changed')
    }

    return changes
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(
    workflowId: string,
    versionId: string,
    options: { createdBy?: string } = {}
  ): Promise<WorkflowVersion> {
    const version = await this.getVersion(versionId)

    if (!version) {
      throw new Error('Version not found')
    }

    if (version.workflowId !== workflowId) {
      throw new Error('Version does not belong to this workflow')
    }

    // Create a new version as a rollback snapshot
    const newVersion = await this.createVersion(
      {
        id: workflowId,
        name: version.name,
        description: version.description,
        version: version.versionNumber,
        status: version.status as WorkflowDefinition['status'],
        nodes: version.nodes,
        edges: version.edges,
        config: version.config,
        metadata: {
          createdAt: version.createdAt,
          updatedAt: new Date().toISOString(),
          createdBy: version.createdBy,
          updatedBy: options.createdBy || 'system',
        },
      },
      {
        changeSummary: `Rollback to version ${version.versionNumber}`,
        changeType: 'rollback',
        createdBy: options.createdBy || 'system',
        parentVersionId: versionId,
      }
    )

    return newVersion
  }

  /**
   * Cleanup old versions based on retention settings
   */
  async cleanupOldVersions(workflowId: string): Promise<number> {
    const db = await getDatabaseAsync()
    const settings = await this.getVersionSettings(workflowId)
    const maxVersions = settings.maxVersions

    // Get current version count
    const countResult = db.prepare(
      'SELECT COUNT(*) as count FROM workflow_versions WHERE workflow_id = ?'
    ).get(workflowId) as Record<string, unknown> | null
    const currentCount = (countResult?.count as number) || 0

    if (currentCount <= maxVersions) {
      return 0
    }

    // Get versions to delete (keep the most recent ones)
    const toDelete = currentCount - maxVersions

    const rows = db.prepare(
      `SELECT id FROM workflow_versions 
       WHERE workflow_id = ? 
       ORDER BY version_number ASC 
       LIMIT ?`
    ).all(workflowId, toDelete) as Record<string, unknown>[]

    const idsToDelete = rows.map(r => r.id as string)

    if (idsToDelete.length === 0) {
      return 0
    }

    // Delete old versions
    const placeholders = idsToDelete.map(() => '?').join(',')
    db.exec(`DELETE FROM workflow_versions WHERE id IN (${placeholders})`, idsToDelete)

    // Also delete related diffs
    db.exec(`DELETE FROM workflow_version_diffs WHERE workflow_id = ?`, [workflowId])

    logger.info(`Cleaned up ${idsToDelete.length} old versions for workflow ${workflowId}`, {
      category: 'workflow',
    })

    return idsToDelete.length
  }

  /**
   * Get or create version settings for a workflow
   */
  async getVersionSettings(workflowId: string): Promise<VersionSettings> {
    const db = await getDatabaseAsync()

    const row = db.prepare(
      'SELECT * FROM workflow_version_settings WHERE workflow_id = ?'
    ).get(workflowId) as Record<string, unknown> | null

    if (row) {
      return {
        workflowId: row.workflow_id as string,
        maxVersions: row.max_versions as number,
        autoVersionOnUpdate: row.auto_version_on_update === 1,
        retentionDays: row.retention_days as number,
      }
    }

    // Create default settings
    const defaultSettings: VersionSettings = {
      workflowId,
      maxVersions: 50,
      autoVersionOnUpdate: true,
      retentionDays: 90,
    }

    db.exec(
      `INSERT INTO workflow_version_settings (id, workflow_id, max_versions, auto_version_on_update, retention_days)
       VALUES (?, ?, ?, ?, ?)`,
      [
        `vset_${Date.now()}`,
        workflowId,
        defaultSettings.maxVersions,
        defaultSettings.autoVersionOnUpdate ? 1 : 0,
        defaultSettings.retentionDays,
      ]
    )

    return defaultSettings
  }

  /**
   * Update version settings for a workflow
   */
  async updateVersionSettings(
    workflowId: string,
    settings: Partial<Omit<VersionSettings, 'workflowId'>>
  ): Promise<VersionSettings> {
    const db = await getDatabaseAsync()
    const current = await this.getVersionSettings(workflowId)

    const updated: VersionSettings = {
      ...current,
      ...settings,
    }

    db.exec(
      `UPDATE workflow_version_settings 
       SET max_versions = ?, auto_version_on_update = ?, retention_days = ?, updated_at = ?
       WHERE workflow_id = ?`,
      [
        updated.maxVersions,
        updated.autoVersionOnUpdate ? 1 : 0,
        updated.retentionDays,
        new Date().toISOString(),
        workflowId,
      ]
    )

    return updated
  }

  /**
   * Delete all versions for a workflow
   */
  async deleteAllVersions(workflowId: string): Promise<void> {
    const db = await getDatabaseAsync()

    db.exec('DELETE FROM workflow_version_diffs WHERE workflow_id = ?', [workflowId])
    db.exec('DELETE FROM workflow_versions WHERE workflow_id = ?', [workflowId])
    db.exec('DELETE FROM workflow_version_settings WHERE workflow_id = ?', [workflowId])

    logger.info(`Deleted all versions for workflow ${workflowId}`, { category: 'workflow' })
  }
}

// Singleton instance
export const workflowVersionService = new WorkflowVersionService()
