/**
 * Workflow Version Storage Tests
 *
 * @version 1.12.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WorkflowVersionStorageManager } from '../workflow-version-storage'
import type { CreateWorkflowVersionDTO } from '@/types/workflow-version'

// Mock IndexedDB
const mockDB = {
  transaction: vi.fn(),
  objectStore: vi.fn(),
}

const mockRequest = {
  result: null,
  error: null,
  onsuccess: null as ((event: Event) => void) | null,
  onerror: null as ((event: Event) => void) | null,
}

const mockOpenDBRequest = {
  result: mockDB,
  error: null,
  onsuccess: null as ((event: Event) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  onupgradeneeded: null as ((event: Event) => void) | null,
}

describe('WorkflowVersionStorageManager', () => {
  let storage: WorkflowVersionStorageManager

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks()

    // Create new storage instance
    storage = new WorkflowVersionStorageManager()

    // Wait for initialization
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Clean up any existing data
    await storage.deleteWorkflowVersions('workflow-1')
    await storage.deleteWorkflowVersions('workflow-2')
    await storage.deleteWorkflowVersions('non-existent-workflow')
  })

  describe('createVersion', () => {
    it('should create a new version with valid data', async () => {
      const dto: CreateWorkflowVersionDTO = {
        workflowId: 'workflow-1',
        version: '1.0.0',
        name: 'Initial Version',
        description: 'Initial workflow definition',
        definition: {
          nodes: [
            {
              id: 'node-1',
              type: 'start',
              data: { label: 'Start' },
              position: { x: 100, y: 100 },
            },
          ],
          edges: [],
        },
        changeType: 'create',
        changeDescription: 'Initial workflow creation',
      }

      const version = await storage.createVersion(dto, 'admin@example.com')

      expect(version).toBeDefined()
      expect(version.id).toBeDefined()
      expect(version.workflowId).toBe(dto.workflowId)
      expect(version.version).toBe(dto.version)
      expect(version.name).toBe(dto.name)
      expect(version.createdBy).toBe('admin@example.com')
      expect(version.metadata?.changeType).toBe('create')
    })

    it('should generate unique IDs for each version', async () => {
      const dto: CreateWorkflowVersionDTO = {
        workflowId: 'workflow-1',
        version: '1.0.0',
        name: 'Version 1',
        definition: {
          nodes: [],
          edges: [],
        },
      }

      const version1 = await storage.createVersion(dto, 'admin@example.com')
      const version2 = await storage.createVersion({ ...dto, version: '1.0.1' }, 'admin@example.com')

      expect(version1.id).not.toBe(version2.id)
    })

    it('should set default changeType to update if not provided', async () => {
      const dto: CreateWorkflowVersionDTO = {
        workflowId: 'workflow-1',
        version: '1.0.0',
        name: 'Version 1',
        definition: {
          nodes: [],
          edges: [],
        },
      }

      const version = await storage.createVersion(dto, 'admin@example.com')

      expect(version.metadata?.changeType).toBe('update')
    })
  })

  describe('getHistory', () => {
    it('should return empty history for non-existent workflow', async () => {
      const history = await storage.getHistory('non-existent-workflow')

      expect(history.versions).toEqual([])
      expect(history.total).toBe(0)
    })

    it('should return paginated history', async () => {
      const dto: CreateWorkflowVersionDTO = {
        workflowId: 'workflow-1',
        version: '1.0.0',
        name: 'Version 1',
        definition: {
          nodes: [],
          edges: [],
        },
      }

      // Create multiple versions
      for (let i = 0; i < 15; i++) {
        await storage.createVersion(
          { ...dto, version: `1.0.${i}` },
          'admin@example.com'
        )
      }

      const history = await storage.getHistory('workflow-1', { page: 1, pageSize: 10 })

      expect(history.versions.length).toBe(10)
      expect(history.total).toBe(15)
      expect(history.page).toBe(1)
      expect(history.pageSize).toBe(10)
    })

    it('should filter by changeType', async () => {
      const dto: CreateWorkflowVersionDTO = {
        workflowId: 'workflow-1',
        version: '1.0.0',
        name: 'Version 1',
        definition: {
          nodes: [],
          edges: [],
        },
      }

      await storage.createVersion(
        { ...dto, version: '1.0.0', changeType: 'create' },
        'admin@example.com'
      )
      await storage.createVersion(
        { ...dto, version: '1.0.1', changeType: 'update' },
        'admin@example.com'
      )
      await storage.createVersion(
        { ...dto, version: '1.0.2', changeType: 'rollback' },
        'admin@example.com'
      )

      const history = await storage.getHistory('workflow-1', { changeType: 'rollback' })

      expect(history.versions.length).toBe(1)
      expect(history.versions[0].metadata?.changeType).toBe('rollback')
    })
  })

  describe('getLatestVersion', () => {
    it('should return null for non-existent workflow', async () => {
      const version = await storage.getLatestVersion('non-existent-workflow')

      expect(version).toBeNull()
    })

    it('should return the most recent version', async () => {
      const dto: CreateWorkflowVersionDTO = {
        workflowId: 'workflow-1',
        version: '1.0.0',
        name: 'Version 1',
        definition: {
          nodes: [],
          edges: [],
        },
      }

      await storage.createVersion({ ...dto, version: '1.0.0' }, 'admin@example.com')
      await new Promise((resolve) => setTimeout(resolve, 10)) // Small delay
      await storage.createVersion({ ...dto, version: '1.0.1' }, 'admin@example.com')
      await new Promise((resolve) => setTimeout(resolve, 10)) // Small delay
      await storage.createVersion({ ...dto, version: '1.0.2' }, 'admin@example.com')

      const latest = await storage.getLatestVersion('workflow-1')

      expect(latest).toBeDefined()
      expect(latest?.version).toBe('1.0.2')
    })
  })

  describe('rollback', () => {
    it('should rollback to a specific version', async () => {
      const dto: CreateWorkflowVersionDTO = {
        workflowId: 'workflow-1',
        version: '1.0.0',
        name: 'Version 1',
        definition: {
          nodes: [],
          edges: [],
        },
      }

      const v1 = await storage.createVersion({ ...dto, version: '1.0.0' }, 'admin@example.com')
      await new Promise((resolve) => setTimeout(resolve, 10))
      const v2 = await storage.createVersion({ ...dto, version: '1.0.1' }, 'admin@example.com')
      await new Promise((resolve) => setTimeout(resolve, 10))
      const v3 = await storage.createVersion({ ...dto, version: '1.0.2' }, 'admin@example.com')

      const result = await storage.rollback(
        'workflow-1',
        v1.id,
        'admin@example.com',
        'Rollback to initial version'
      )

      expect(result.currentVersion).toBeDefined()
      expect(result.currentVersion.version).toBe('1.0.1') // Incremented from 1.0.0
      expect(result.currentVersion.metadata?.changeType).toBe('rollback')
      expect(result.currentVersion.metadata?.sourceVersion).toBe('1.0.0')
      expect(result.previousVersion.version).toBe('1.0.2')
    })

    it('should throw error if version not found', async () => {
      await expect(
        storage.rollback('workflow-1', 'non-existent-version', 'admin@example.com')
      ).rejects.toThrow('Version not found')
    })

    it('should throw error if version belongs to different workflow', async () => {
      const dto: CreateWorkflowVersionDTO = {
        workflowId: 'workflow-1',
        version: '1.0.0',
        name: 'Version 1',
        definition: {
          nodes: [],
          edges: [],
        },
      }

      const version = await storage.createVersion(dto, 'admin@example.com')

      await expect(
        storage.rollback('workflow-2', version.id, 'admin@example.com')
      ).rejects.toThrow('Version does not belong to this workflow')
    })
  })

  describe('deleteWorkflowVersions', () => {
    it('should delete all versions for a workflow', async () => {
      const dto: CreateWorkflowVersionDTO = {
        workflowId: 'workflow-1',
        version: '1.0.0',
        name: 'Version 1',
        definition: {
          nodes: [],
          edges: [],
        },
      }

      await storage.createVersion({ ...dto, version: '1.0.0' }, 'admin@example.com')
      await storage.createVersion({ ...dto, version: '1.0.1' }, 'admin@example.com')
      await storage.createVersion({ ...dto, version: '1.0.2' }, 'admin@example.com')

      const count = await storage.deleteWorkflowVersions('workflow-1')

      expect(count).toBe(3)

      const history = await storage.getHistory('workflow-1')
      expect(history.versions).toEqual([])
    })

    it('should return 0 for non-existent workflow', async () => {
      const count = await storage.deleteWorkflowVersions('non-existent-workflow')

      expect(count).toBe(0)
    })
  })
})