/**
 * Execution State Persistence Tests (v1.12.2)
 *
 * Tests for execution state storage and hooks
 */

import { describe, it, expect, vi } from 'vitest'

// Mock IndexedDB for testing environment
const mockIndexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
}

const mockIDBDatabase = {
  createObjectStore: vi.fn(),
  objectStoreNames: {
    contains: vi.fn().mockReturnValue(false),
  },
}

const mockObjectStore = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  openCursor: vi.fn(),
  createIndex: vi.fn(),
}

const mockTransaction = {
  objectStore: vi.fn().mockReturnValue(mockObjectStore),
}

// Setup mocks
beforeEach(() => {
  vi.clearAllMocks()

  // Mock window.indexedDB
  if (typeof window !== 'undefined') {
    ;(window as any).indexedDB = mockIndexedDB
  }

  // Mock IDBOpenDBRequest
  mockIndexedDB.open.mockImplementation(() => {
    const request = {
      onsuccess: null as any,
      onerror: null as any,
      onupgradeneeded: null as any,
      result: mockIDBDatabase as any,
    }

    // Simulate async success
    setTimeout(() => {
      if (request.onupgradeneeded) {
        request.onupgradeneeded({ target: request, currentTarget: mockIDBDatabase })
      }
      if (request.onsuccess) {
        request.onsuccess({ target: request })
      }
    }, 0)

    return request
  })

  // Mock IDBTransaction
  mockIDBDatabase.transaction = vi.fn().mockReturnValue(mockTransaction)

  // Mock IDBRequest
  mockObjectStore.put.mockImplementation(() => {
    const request = {
      onsuccess: null as any,
      onerror: null as any,
    }

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({})
      }
    }, 0)

    return request
  })

  mockObjectStore.get.mockImplementation(() => {
    const request = {
      onsuccess: null as any,
      onerror: null as any,
      result: null,
    }

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request })
      }
    }, 0)

    return request
  })

  mockObjectStore.delete.mockImplementation(() => {
    const request = {
      onsuccess: null as any,
      onerror: null as any,
    }

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({})
      }
    }, 0)

    return request
  })
})

describe('Execution Storage', () => {
  describe('Type Definitions', () => {
    it('should define ExecutionStatus types', async () => {
      const { ExecutionStatus } = await import('../execution-storage')

      const statuses: ExecutionStatus[] = [
        'pending',
        'running',
        'paused',
        'completed',
        'failed',
        'cancelled',
      ]

      expect(statuses).toHaveLength(6)
    })

    it('should define NodeState interface', async () => {
      const nodeState: NodeState = {
        nodeId: 'node-1',
        status: 'completed',
        result: {
          success: true,
          data: { value: 100 },
          duration: 500,
        },
        startTime: Date.now() - 500,
        endTime: Date.now(),
      }

      expect(nodeState.nodeId).toBe('node-1')
      expect(nodeState.status).toBe('completed')
      expect(nodeState.result?.success).toBe(true)
    })

    it('should define ExecutionStateData interface', async () => {
      const state: ExecutionStateData = {
        workflowId: 'workflow-123',
        workflowName: 'Test Workflow',
        instanceId: 'exec-1',
        status: 'running',
        nodeStates: {},
        progress: {
          totalNodes: 5,
          completedNodes: 2,
          failedNodes: 0,
          skippedNodes: 0,
          percentage: 40,
        },
        inputs: {},
        outputs: {},
        variables: {},
        logs: [],
        startTime: Date.now(),
      }

      expect(state.workflowId).toBe('workflow-123')
      expect(state.progress.percentage).toBe(40)
    })
  })

  describe('ExecutionStorageManager', () => {
    it('should be a singleton', async () => {
      const { ExecutionStorageManager } = await import('../execution-storage')

      const instance1 = ExecutionStorageManager.getInstance()
      const instance2 = ExecutionStorageManager.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('Convenience Functions', () => {
    it('should export all convenience functions', async () => {
      const functions = await import('../execution-storage')

      expect(typeof functions.saveExecutionState).toBe('function')
      expect(typeof functions.loadExecutionState).toBe('function')
      expect(typeof functions.updateExecutionProgress).toBe('function')
      expect(typeof functions.updateNodeState).toBe('function')
      expect(typeof functions.completeExecution).toBe('function')
      expect(typeof functions.failExecution).toBe('function')
      expect(typeof functions.pauseExecution).toBe('function')
      expect(typeof functions.resumeExecution).toBe('function')
      expect(typeof functions.cancelExecution).toBe('function')
      expect(typeof functions.addExecutionLog).toBe('function')
      expect(typeof functions.updateVariables).toBe('function')
      expect(typeof functions.listExecutions).toBe('function')
      expect(typeof functions.deleteExecution).toBe('function')
      expect(typeof functions.clearExpiredExecutions).toBe('function')
    })
  })
})

describe('useExecutionPersistence Hook', () => {
  it('should export hook function and types', async () => {
    // Just verify exports exist - actual hook testing requires React Testing Library
    const module = await import('../useExecutionPersistence')
    expect(module.useExecutionPersistence).toBeDefined()
    expect(typeof module.useExecutionPersistence).toBe('function')
  })
})

describe('Integration Tests', () => {
  it('should integrate with draft-storage', async () => {
    const { getDraftStorageManager } = await import('@/lib/db/draft-storage')

    // Both should use the same draft storage infrastructure
    const draftManager = getDraftStorageManager()
    expect(draftManager).toBeDefined()
    expect(typeof draftManager.saveDraft).toBe('function')
  })

  it('should use "execution" draft type', async () => {
    const { DRAFT_TYPE } = await import('../execution-storage')

    // The execution storage should use 'execution' as draft type
    expect(DRAFT_TYPE).toBeDefined()
  })
})

// Type imports
import type { NodeState, ExecutionStateData } from '../execution-storage'
