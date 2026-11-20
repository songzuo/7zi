/**
 * Workflow Version Service Tests
 * 
 * Tests for version history management:
 * - Create version snapshots
 * - List versions
 * - Compare versions (diff)
 * - Rollback to version
 * - Cleanup old versions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { WorkflowVersionService } from '../version-service'
import type { WorkflowDefinition } from '@/types/workflow'
import { getDatabaseAsync } from '@/lib/db/connection'
import { NodeType, EdgeType, WorkflowStatus } from '@/types/workflow'

// Test data
const createTestWorkflow = (id: string, version = 1): WorkflowDefinition => ({
  id,
  name: `Test Workflow ${id}`,
  description: 'Test workflow for version history',
  version,
  status: WorkflowStatus.DRAFT,
  nodes: [
    {
      id: 'node_1',
      type: NodeType.START,
      name: 'Start',
      position: { x: 100, y: 100 },
    },
    {
      id: 'node_2',
      type: NodeType.AGENT,
      name: 'Agent 1',
      position: { x: 300, y: 100 },
      agentConfig: {
        agentId: 'agent_1',
        agentType: 'assistant',
      },
    },
    {
      id: 'node_3',
      type: NodeType.END,
      name: 'End',
      position: { x: 500, y: 100 },
    },
  ],
  edges: [
    {
      id: 'edge_1',
      source: 'node_1',
      target: 'node_2',
      type: EdgeType.SEQUENCE,
    },
    {
      id: 'edge_2',
      source: 'node_2',
      target: 'node_3',
      type: EdgeType.SEQUENCE,
    },
  ],
  config: {
    timeout: 3600,
    retryPolicy: {
      maxRetries: 3,
      backoff: 'exponential' as const,
      interval: 5,
    },
    variables: {},
  },
  metadata: {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'test_user',
    updatedBy: 'test_user',
  },
})

describe('WorkflowVersionService', () => {
  let service: WorkflowVersionService

  beforeEach(async () => {
    service = new WorkflowVersionService()
    
    // Ensure database is initialized
    const db = await getDatabaseAsync()
    
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_versions (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        nodes TEXT NOT NULL DEFAULT '[]',
        edges TEXT NOT NULL DEFAULT '[]',
        config TEXT NOT NULL DEFAULT '{}',
        change_summary TEXT,
        change_type TEXT DEFAULT 'update',
        parent_version_id TEXT,
        created_by TEXT NOT NULL DEFAULT 'system',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(workflow_id, version_number)
      )
    `)
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_version_diffs (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        from_version_id TEXT NOT NULL,
        to_version_id TEXT NOT NULL,
        nodes_added TEXT DEFAULT '[]',
        nodes_removed TEXT DEFAULT '[]',
        nodes_modified TEXT DEFAULT '[]',
        edges_added TEXT DEFAULT '[]',
        edges_removed TEXT DEFAULT '[]',
        edges_modified TEXT DEFAULT '[]',
        config_changed TEXT DEFAULT '{}',
        total_changes INTEGER DEFAULT 0,
        computed_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(from_version_id, to_version_id)
      )
    `)
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_version_settings (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL UNIQUE,
        max_versions INTEGER DEFAULT 50,
        auto_version_on_update INTEGER DEFAULT 1,
        retention_days INTEGER DEFAULT 90,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    
    // Clear tables before each test
    db.exec('DELETE FROM workflow_version_diffs')
    db.exec('DELETE FROM workflow_versions')
    db.exec('DELETE FROM workflow_version_settings')
  })

  describe('createVersion', () => {
    it('should create a new version with correct data', async () => {
      const workflow = createTestWorkflow('wf_test_1')

      const version = await service.createVersion(workflow, {
        changeSummary: 'Initial version',
        changeType: 'create',
        createdBy: 'test_user',
      })

      expect(version).toBeDefined()
      expect(version.workflowId).toBe('wf_test_1')
      expect(version.versionNumber).toBe(1)
      expect(version.name).toBe(workflow.name)
      expect(version.nodes).toHaveLength(3)
      expect(version.edges).toHaveLength(2)
      expect(version.changeType).toBe('create')
      expect(version.changeSummary).toBe('Initial version')
      expect(version.createdBy).toBe('test_user')
    })

    it('should increment version numbers correctly', async () => {
      const workflow = createTestWorkflow('wf_test_2')

      const v1 = await service.createVersion(workflow, { changeType: 'create' })
      const v2 = await service.createVersion(workflow, { changeType: 'update' })
      const v3 = await service.createVersion(workflow, { changeType: 'update' })

      expect(v1.versionNumber).toBe(1)
      expect(v2.versionNumber).toBe(2)
      expect(v3.versionNumber).toBe(3)
    })

    it('should store complete workflow snapshot', async () => {
      const workflow = createTestWorkflow('wf_test_3')
      workflow.nodes[1].name = 'Modified Agent'

      const version = await service.createVersion(workflow)

      expect(version.nodes[1].name).toBe('Modified Agent')
    })

    it('should support parent version reference', async () => {
      const workflow = createTestWorkflow('wf_test_4')

      const v1 = await service.createVersion(workflow, { changeType: 'create' })
      const v2 = await service.createVersion(workflow, {
        changeType: 'update',
        parentVersionId: v1.id,
      })

      expect(v2.parentVersionId).toBe(v1.id)
    })
  })

  describe('getVersions', () => {
    it('should return empty array for workflow with no versions', async () => {
      const result = await service.getVersions('nonexistent_workflow')

      expect(result.versions).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should return all versions for a workflow', async () => {
      const workflow = createTestWorkflow('wf_test_5')

      await service.createVersion(workflow, { changeType: 'create' })
      await service.createVersion(workflow, { changeType: 'update' })
      await service.createVersion(workflow, { changeType: 'update' })

      const result = await service.getVersions('wf_test_5')

      expect(result.versions).toHaveLength(3)
      expect(result.total).toBe(3)
    })

    it('should return versions in descending order', async () => {
      const workflow = createTestWorkflow('wf_test_6')

      await service.createVersion(workflow, { changeType: 'create' })
      await service.createVersion(workflow, { changeType: 'update' })
      await service.createVersion(workflow, { changeType: 'update' })

      const result = await service.getVersions('wf_test_6')

      expect(result.versions[0].versionNumber).toBe(3)
      expect(result.versions[1].versionNumber).toBe(2)
      expect(result.versions[2].versionNumber).toBe(1)
    })

    it('should support pagination', async () => {
      const workflow = createTestWorkflow('wf_test_7')

      for (let i = 0; i < 10; i++) {
        await service.createVersion(workflow, { changeType: 'update' })
      }

      const page1 = await service.getVersions('wf_test_7', { limit: 5, offset: 0 })
      const page2 = await service.getVersions('wf_test_7', { limit: 5, offset: 5 })

      expect(page1.versions).toHaveLength(5)
      expect(page1.total).toBe(10)
      expect(page2.versions).toHaveLength(5)
      expect(page2.versions[0].versionNumber).toBe(5)
    })
  })

  describe('getVersion', () => {
    it('should return null for nonexistent version', async () => {
      const version = await service.getVersion('nonexistent_version')
      expect(version).toBeNull()
    })

    it('should return specific version', async () => {
      const workflow = createTestWorkflow('wf_test_8')
      const created = await service.createVersion(workflow, {
        changeSummary: 'Test version',
      })

      const retrieved = await service.getVersion(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.changeSummary).toBe('Test version')
    })
  })

  describe('compareVersions', () => {
    it('should detect added nodes', async () => {
      const workflow = createTestWorkflow('wf_test_9')

      const v1 = await service.createVersion(workflow, { changeType: 'create' })

      // Add a new node
      workflow.nodes.push({
        id: 'node_4',
        type: NodeType.CONDITION,
        name: 'New Condition',
        position: { x: 400, y: 100 },
      })

      const v2 = await service.createVersion(workflow, { changeType: 'update' })

      const diff = await service.compareVersions(v1.id, v2.id)

      expect(diff.nodesAdded).toHaveLength(1)
      expect(diff.nodesAdded[0].id).toBe('node_4')
      expect(diff.totalChanges).toBe(1)
    })

    it('should detect removed nodes', async () => {
      const workflow = createTestWorkflow('wf_test_10')

      const v1 = await service.createVersion(workflow, { changeType: 'create' })

      // Remove a node
      workflow.nodes = workflow.nodes.filter(n => n.id !== 'node_2')

      const v2 = await service.createVersion(workflow, { changeType: 'update' })

      const diff = await service.compareVersions(v1.id, v2.id)

      expect(diff.nodesRemoved).toContain('node_2')
    })

    it('should detect modified nodes', async () => {
      const workflow = createTestWorkflow('wf_test_11')

      const v1 = await service.createVersion(workflow, { changeType: 'create' })

      // Modify a node
      workflow.nodes[1].name = 'Renamed Agent'

      const v2 = await service.createVersion(workflow, { changeType: 'update' })

      const diff = await service.compareVersions(v1.id, v2.id)

      expect(diff.nodesModified).toHaveLength(1)
      expect(diff.nodesModified[0].nodeId).toBe('node_2')
      expect(diff.nodesModified[0].changes.length).toBeGreaterThan(0)
    })

    it('should detect edge changes', async () => {
      const workflow = createTestWorkflow('wf_test_12')

      const v1 = await service.createVersion(workflow, { changeType: 'create' })

      // Add a new edge
      workflow.edges.push({
        id: 'edge_3',
        source: 'node_1',
        target: 'node_3',
        type: EdgeType.SEQUENCE,
      })

      const v2 = await service.createVersion(workflow, { changeType: 'update' })

      const diff = await service.compareVersions(v1.id, v2.id)

      expect(diff.edgesAdded).toHaveLength(1)
    })

    it('should cache computed diffs', async () => {
      const workflow = createTestWorkflow('wf_test_13')

      const v1 = await service.createVersion(workflow, { changeType: 'create' })
      workflow.nodes.push({
        id: 'node_4',
        type: NodeType.CONDITION,
        name: 'New',
        position: { x: 400, y: 100 },
      })
      const v2 = await service.createVersion(workflow, { changeType: 'update' })

      // First comparison
      const diff1 = await service.compareVersions(v1.id, v2.id)

      // Second comparison should use cache
      const diff2 = await service.compareVersions(v1.id, v2.id)

      expect(diff1.id).toBe(diff2.id)
    })
  })

  describe('rollbackToVersion', () => {
    it('should create new version with rollback type', async () => {
      const workflow = createTestWorkflow('wf_test_14')

      const v1 = await service.createVersion(workflow, { changeType: 'create' })

      // Modify workflow
      workflow.nodes.push({
        id: 'node_4',
        type: NodeType.CONDITION,
        name: 'New Node',
        position: { x: 400, y: 100 },
      })

      const v2 = await service.createVersion(workflow, { changeType: 'update' })

      // Rollback to v1
      const rollbackVersion = await service.rollbackToVersion('wf_test_14', v1.id, {
        createdBy: 'test_user',
      })

      expect(rollbackVersion.changeType).toBe('rollback')
      expect(rollbackVersion.parentVersionId).toBe(v1.id)
      expect(rollbackVersion.nodes).toHaveLength(3) // Original 3 nodes
    })

    it('should throw error for invalid version', async () => {
      await expect(service.rollbackToVersion('wf_test_15', 'nonexistent')).rejects.toThrow(
        'Version not found'
      )
    })

    it('should throw error for version from different workflow', async () => {
      const workflow1 = createTestWorkflow('wf_test_16')
      const workflow2 = createTestWorkflow('wf_test_17')

      const v1 = await service.createVersion(workflow1, { changeType: 'create' })

      await expect(service.rollbackToVersion('wf_test_17', v1.id)).rejects.toThrow(
        'Version does not belong to this workflow'
      )
    })
  })

  describe('cleanupOldVersions', () => {
    it('should not cleanup when under limit', async () => {
      const workflow = createTestWorkflow('wf_test_18')

      await service.createVersion(workflow, { changeType: 'create' })
      await service.createVersion(workflow, { changeType: 'update' })

      const deleted = await service.cleanupOldVersions('wf_test_18')

      expect(deleted).toBe(0)

      const result = await service.getVersions('wf_test_18')
      expect(result.versions).toHaveLength(2)
    })

    it('should cleanup when over limit', async () => {
      const workflow = createTestWorkflow('wf_test_19')

      // Create 5 versions first (default maxVersions=50, won't trigger auto-cleanup)
      for (let i = 0; i < 5; i++) {
        await service.createVersion(workflow, { changeType: 'update' })
      }

      // Now set max versions to 3 (less than current count)
      await service.updateVersionSettings('wf_test_19', { maxVersions: 3 })

      // Cleanup should delete 2 old versions
      const deleted = await service.cleanupOldVersions('wf_test_19')

      expect(deleted).toBe(2)

      const result = await service.getVersions('wf_test_19')
      expect(result.versions).toHaveLength(3)
      // Should keep the most recent ones
      expect(result.versions[0].versionNumber).toBe(5)
    })
  })

  describe('version settings', () => {
    it('should return default settings for new workflow', async () => {
      const settings = await service.getVersionSettings('wf_test_20')

      expect(settings.maxVersions).toBe(50)
      expect(settings.autoVersionOnUpdate).toBe(true)
      expect(settings.retentionDays).toBe(90)
    })

    it('should update version settings', async () => {
      const updated = await service.updateVersionSettings('wf_test_21', {
        maxVersions: 100,
        autoVersionOnUpdate: false,
        retentionDays: 30,
      })

      expect(updated.maxVersions).toBe(100)
      expect(updated.autoVersionOnUpdate).toBe(false)
      expect(updated.retentionDays).toBe(30)

      // Verify persistence
      const retrieved = await service.getVersionSettings('wf_test_21')
      expect(retrieved.maxVersions).toBe(100)
    })
  })

  describe('deleteAllVersions', () => {
    it('should delete all versions for a workflow', async () => {
      const workflow = createTestWorkflow('wf_test_22')

      await service.createVersion(workflow, { changeType: 'create' })
      await service.createVersion(workflow, { changeType: 'update' })

      await service.deleteAllVersions('wf_test_22')

      const result = await service.getVersions('wf_test_22')
      expect(result.versions).toHaveLength(0)
    })
  })
})
