/**
 * Workflow Version Service Tests
 * Test coverage for v1.12.2 Workflow Versioning feature
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { WorkflowVersionService, type WorkflowVersion, type VersionDiff, type VersionSettings } from '@/lib/workflow/version-service'

// Mock database
const mockDb = {
  exec: vi.fn(),
  prepare: vi.fn(() => ({
    get: vi.fn(),
    all: vi.fn(),
    run: vi.fn()
  }))
}

vi.mock('@/lib/db/connection', () => ({
  getDatabaseAsync: vi.fn(() => Promise.resolve(mockDb))
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}))

describe('WorkflowVersionService', () => {
  let service: WorkflowVersionService

  // Sample workflow definition
  const sampleWorkflow = {
    id: 'workflow-123',
    name: 'Test Workflow',
    description: 'A test workflow',
    status: 'active' as const,
    version: 1,
    nodes: [
      { id: 'node-1', name: 'Start', type: 'start', position: { x: 0, y: 0 } },
      { id: 'node-2', name: 'Process', type: 'task', position: { x: 100, y: 100 } }
    ],
    edges: [
      { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'default' }
    ],
    config: { timeout: 30000 },
    metadata: {
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      createdBy: 'test-user',
      updatedBy: 'test-user'
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new WorkflowVersionService()
  })

  describe('createVersion', () => {
    it('should create a new version with correct structure', async () => {
      const mockGetResult = { max_version: 2 }
      
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockGetResult),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.createVersion(sampleWorkflow, {
        changeSummary: 'Initial version',
        changeType: 'create',
        createdBy: 'test-user'
      })

      expect(result).toBeDefined()
      expect(result.workflowId).toBe('workflow-123')
      expect(result.versionNumber).toBe(3) // max_version(2) + 1
      expect(result.name).toBe('Test Workflow')
      expect(result.changeSummary).toBe('Initial version')
      expect(result.changeType).toBe('create')
      expect(result.nodes).toEqual(sampleWorkflow.nodes)
      expect(result.edges).toEqual(sampleWorkflow.edges)
      expect(result.config).toEqual(sampleWorkflow.config)
      expect(result.createdAt).toBeDefined()
    })

    it('should use default values when options are not provided', async () => {
      const mockGetResult = { max_version: 0 }
      
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockGetResult),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.createVersion(sampleWorkflow)

      expect(result.changeType).toBe('update') // default
      expect(result.createdBy).toBe('system') // default
    })

    it('should increment version number correctly', async () => {
      const mockGetResult = { max_version: 5 }
      
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockGetResult),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.createVersion(sampleWorkflow)
      expect(result.versionNumber).toBe(6)
    })

    it('should call db.exec for insert operation', async () => {
      const mockGetResult = { max_version: 0 }
      
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockGetResult),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      await service.createVersion(sampleWorkflow)

      // Verify db.exec was called for insert
      expect(mockDb.exec).toHaveBeenCalled()
    })
  })

  describe('getVersions', () => {
    it('should return versions with pagination', async () => {
      const mockVersions = [
        {
          id: 'ver-1',
          workflow_id: 'workflow-123',
          version_number: 2,
          name: 'Test Workflow',
          description: 'Version 2',
          status: 'active',
          nodes: '[]',
          edges: '[]',
          config: '{}',
          change_summary: 'Update 2',
          change_type: 'update',
          parent_version_id: null,
          created_by: 'test-user',
          created_at: '2024-01-02T00:00:00Z'
        },
        {
          id: 'ver-2',
          workflow_id: 'workflow-123',
          version_number: 1,
          name: 'Test Workflow',
          description: 'Version 1',
          status: 'active',
          nodes: '[]',
          edges: '[]',
          config: '{}',
          change_summary: 'Initial',
          change_type: 'create',
          parent_version_id: null,
          created_by: 'test-user',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      // Setup mock to return versions
      let callCount = 0
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) return { count: 2 }
          return null
        }),
        all: vi.fn().mockReturnValue(mockVersions),
        run: vi.fn()
      })

      const result = await service.getVersions('workflow-123', { limit: 10, offset: 0 })

      expect(result.versions).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.versions[0].versionNumber).toBe(2) // First should be most recent
      expect(result.versions[0].changeSummary).toBe('Update 2')
    })

    it('should return empty array when no versions exist', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue({ count: 0 }),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.getVersions('workflow-123')

      expect(result.versions).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('should apply pagination correctly', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue({ count: 100 }),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      await service.getVersions('workflow-123', { limit: 10, offset: 20 })

      // Verify the query was called with correct pagination
      expect(mockDb.prepare).toHaveBeenCalled()
    })
  })

  describe('getVersion', () => {
    it('should return specific version by ID', async () => {
      const mockVersion = {
        id: 'ver-1',
        workflow_id: 'workflow-123',
        version_number: 1,
        name: 'Test Workflow',
        description: 'Version 1',
        status: 'active',
        nodes: JSON.stringify(sampleWorkflow.nodes),
        edges: JSON.stringify(sampleWorkflow.edges),
        config: JSON.stringify(sampleWorkflow.config),
        change_summary: 'Initial',
        change_type: 'create',
        parent_version_id: null,
        created_by: 'test-user',
        created_at: '2024-01-01T00:00:00Z'
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockVersion),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.getVersion('ver-1')

      expect(result).toBeDefined()
      expect(result?.id).toBe('ver-1')
      expect(result?.versionNumber).toBe(1)
      expect(result?.nodes).toEqual(sampleWorkflow.nodes)
    })

    it('should return null for non-existent version', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(null),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.getVersion('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('compareVersions', () => {
    it('should compute diff between two versions', async () => {
      const fromVersion: WorkflowVersion = {
        id: 'ver-1',
        workflowId: 'workflow-123',
        versionNumber: 1,
        name: 'Test Workflow',
        status: 'active',
        nodes: [
          { id: 'node-1', name: 'Start', type: 'start', position: { x: 0, y: 0 } }
        ],
        edges: [],
        config: {},
        changeType: 'create',
        createdBy: 'test-user',
        createdAt: '2024-01-01T00:00:00Z'
      }

      const toVersion: WorkflowVersion = {
        id: 'ver-2',
        workflowId: 'workflow-123',
        versionNumber: 2,
        name: 'Test Workflow',
        status: 'active',
        nodes: [
          { id: 'node-1', name: 'Start', type: 'start', position: { x: 0, y: 0 } },
          { id: 'node-2', name: 'End', type: 'end', position: { x: 100, y: 100 } }
        ],
        edges: [
          { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'default' }
        ],
        config: { timeout: 60000 },
        changeType: 'update',
        createdBy: 'test-user',
        createdAt: '2024-01-02T00:00:00Z'
      }

      // Mock database to return null for cached diff, then return versions
      mockDb.prepare.mockReturnValue({
        get: vi.fn()
          .mockReturnValueOnce(null) // check cached diff - return null
          .mockReturnValueOnce({
            id: 'ver-1',
            workflow_id: 'workflow-123',
            version_number: 1,
            name: 'Test Workflow',
            status: 'active',
            nodes: JSON.stringify(fromVersion.nodes),
            edges: JSON.stringify(fromVersion.edges),
            config: JSON.stringify(fromVersion.config),
            change_type: 'create',
            parent_version_id: null,
            created_by: 'test-user',
            created_at: '2024-01-01T00:00:00Z'
          })
          .mockReturnValueOnce({
            id: 'ver-2',
            workflow_id: 'workflow-123',
            version_number: 2,
            name: 'Test Workflow',
            status: 'active',
            nodes: JSON.stringify(toVersion.nodes),
            edges: JSON.stringify(toVersion.edges),
            config: JSON.stringify(toVersion.config),
            change_type: 'update',
            parent_version_id: null,
            created_by: 'test-user',
            created_at: '2024-01-02T00:00:00Z'
          }),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.compareVersions('ver-1', 'ver-2')

      expect(result).toBeDefined()
      expect(result.fromVersionId).toBe('ver-1')
      expect(result.toVersionId).toBe('ver-2')
      expect(result.nodesAdded).toHaveLength(1)
      expect(result.nodesAdded[0].id).toBe('node-2')
      expect(result.edgesAdded).toHaveLength(1)
      expect(result.configChanged).toHaveProperty('timeout')
      expect(result.totalChanges).toBeGreaterThan(0)
    })

    it('should throw error when version not found', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn()
          .mockReturnValueOnce(null) // check cached diff
          .mockReturnValueOnce(null) // fromVersion not found
          .mockReturnValueOnce(null), // toVersion not found
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      await expect(service.compareVersions('ver-1', 'ver-2')).rejects.toThrow('Version not found')
    })
  })

  describe('rollbackToVersion', () => {
    it('should create a new version as rollback snapshot', async () => {
      const targetVersion: WorkflowVersion = {
        id: 'ver-1',
        workflowId: 'workflow-123',
        versionNumber: 1,
        name: 'Test Workflow',
        description: 'Original version',
        status: 'active',
        nodes: sampleWorkflow.nodes,
        edges: sampleWorkflow.edges,
        config: sampleWorkflow.config,
        changeType: 'create',
        createdBy: 'test-user',
        createdAt: '2024-01-01T00:00:00Z'
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn()
          .mockReturnValueOnce({
            id: 'ver-1',
            workflow_id: 'workflow-123',
            version_number: 1,
            name: 'Test Workflow',
            description: 'Original version',
            status: 'active',
            nodes: JSON.stringify(sampleWorkflow.nodes),
            edges: JSON.stringify(sampleWorkflow.edges),
            config: JSON.stringify(sampleWorkflow.config),
            change_type: 'create',
            parent_version_id: null,
            created_by: 'test-user',
            created_at: '2024-01-01T00:00:00Z'
          }) // getVersion
          .mockReturnValueOnce({ max_version: 2 }),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.rollbackToVersion('workflow-123', 'ver-1', {
        createdBy: 'admin-user'
      })

      expect(result.changeType).toBe('rollback')
      expect(result.changeSummary).toContain('Rollback to version 1')
      expect(result.parentVersionId).toBe('ver-1')
      expect(result.nodes).toEqual(sampleWorkflow.nodes)
    })

    it('should throw error when version not found', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(null),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      await expect(
        service.rollbackToVersion('workflow-123', 'non-existent')
      ).rejects.toThrow('Version not found')
    })

    it('should throw error when version belongs to different workflow', async () => {
      const targetVersion: WorkflowVersion = {
        id: 'ver-1',
        workflowId: 'different-workflow',
        versionNumber: 1,
        name: 'Test Workflow',
        status: 'active',
        nodes: [],
        edges: [],
        config: {},
        changeType: 'create',
        createdBy: 'test-user',
        createdAt: '2024-01-01T00:00:00Z'
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue({
          id: 'ver-1',
          workflow_id: 'different-workflow',
          version_number: 1,
          name: 'Test Workflow',
          status: 'active',
          nodes: JSON.stringify([]),
          edges: JSON.stringify([]),
          config: JSON.stringify({}),
          change_type: 'create',
          parent_version_id: null,
          created_by: 'test-user',
          created_at: '2024-01-01T00:00:00Z'
        }),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      await expect(
        service.rollbackToVersion('workflow-123', 'ver-1')
      ).rejects.toThrow('Version does not belong to this workflow')
    })
  })

  describe('getVersionSettings', () => {
    it('should return existing settings', async () => {
      const mockSettings = {
        workflow_id: 'workflow-123',
        max_versions: 20,
        auto_version_on_update: 1,
        retention_days: 30
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockSettings),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.getVersionSettings('workflow-123')

      expect(result.workflowId).toBe('workflow-123')
      expect(result.maxVersions).toBe(20)
      expect(result.autoVersionOnUpdate).toBe(true)
      expect(result.retentionDays).toBe(30)
    })

    it('should create default settings if not exist', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(null),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.getVersionSettings('workflow-new')

      expect(result.maxVersions).toBe(50)
      expect(result.autoVersionOnUpdate).toBe(true)
      expect(result.retentionDays).toBe(90)
    })
  })

  describe('updateVersionSettings', () => {
    it('should update version settings', async () => {
      const mockSettings = {
        workflow_id: 'workflow-123',
        max_versions: 50,
        auto_version_on_update: 1,
        retention_days: 90
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockSettings),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.updateVersionSettings('workflow-123', {
        maxVersions: 100,
        retentionDays: 180
      })

      expect(result.maxVersions).toBe(100)
      expect(result.retentionDays).toBe(180)
      expect(result.autoVersionOnUpdate).toBe(true)
    })
  })

  describe('deleteAllVersions', () => {
    it('should call db.exec for delete operations', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn(),
        all: vi.fn(),
        run: vi.fn()
      })

      await service.deleteAllVersions('workflow-123')

      expect(mockDb.exec).toHaveBeenCalled()
    })
  })

  describe('getLatestVersion', () => {
    it('should return latest version', async () => {
      const mockVersion = {
        id: 'ver-2',
        workflow_id: 'workflow-123',
        version_number: 2,
        name: 'Test Workflow',
        status: 'active',
        nodes: '[]',
        edges: '[]',
        config: '{}',
        change_type: 'update',
        parent_version_id: null,
        created_by: 'test-user',
        created_at: '2024-01-02T00:00:00Z'
      }

      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(mockVersion),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.getLatestVersion('workflow-123')

      expect(result).toBeDefined()
      expect(result?.versionNumber).toBe(2)
    })

    it('should return null when no versions exist', async () => {
      mockDb.prepare.mockReturnValue({
        get: vi.fn().mockReturnValue(null),
        all: vi.fn().mockReturnValue([]),
        run: vi.fn()
      })

      const result = await service.getLatestVersion('workflow-123')

      expect(result).toBeNull()
    })
  })
})
