/**
 * useWorkflowDraft.test.ts
 * 工作流草稿管理 Hook 测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useWorkflowDraft } from '@/hooks/useWorkflowDraft'
import { WorkflowDefinition, WorkflowStatus, NodeType } from '@/types/workflow'

// Mock IndexedDB
const mockIndexedDB = {
  open: vi.fn(),
}

// Mock draft-storage module
vi.mock('@/lib/storage/draft-storage', () => ({
  getDraftStorage: vi.fn(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    saveDraft: vi.fn().mockResolvedValue(undefined),
    getDraft: vi.fn().mockResolvedValue(null),
    getAllDraftMetadata: vi.fn().mockResolvedValue([]),
    deleteDraft: vi.fn().mockResolvedValue(undefined),
    clearAllDrafts: vi.fn().mockResolvedValue(undefined),
    createDraftFromWorkflow: vi.fn((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      workflow,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      autoSaved: false,
      version: 1,
    })),
  })),
  isIndexedDBAvailable: vi.fn().mockResolvedValue(true),
}))

describe('useWorkflowDraft', () => {
  const createMockWorkflow = (): WorkflowDefinition => ({
    id: 'test-workflow-1',
    name: '测试工作流',
    description: '测试描述',
    version: 1,
    status: WorkflowStatus.DRAFT,
    nodes: [
      {
        id: 'node-1',
        type: NodeType.START,
        name: '开始节点',
        position: { x: 100, y: 100 },
      },
    ],
    edges: [],
    config: { variables: {} },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'user',
      updatedBy: 'user',
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    ;(global as any).indexedDB = mockIndexedDB
  })

  describe('初始化', () => {
    it('应该正确初始化', async () => {
      const { result } = renderHook(() => useWorkflowDraft())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAvailable).toBe(true)
    })

    it('应该在 IndexedDB 不可用时正确处理', async () => {
      const { isIndexedDBAvailable } = await import('@/lib/storage/draft-storage')
      vi.mocked(isIndexedDBAvailable).mockResolvedValueOnce(false)

      const { result } = renderHook(() => useWorkflowDraft())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAvailable).toBe(false)
    })
  })

  describe('保存草稿', () => {
    it('应该保存草稿', async () => {
      const { result } = renderHook(() => useWorkflowDraft())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const workflow = createMockWorkflow()

      await act(async () => {
        await result.current.saveDraft(workflow)
      })

      expect(result.current.currentDraft).not.toBeNull()
      expect(result.current.currentDraft?.id).toBe(workflow.id)
    })

    it('应该正确标记自动保存', async () => {
      const { result } = renderHook(() => useWorkflowDraft())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const workflow = createMockWorkflow()

      await act(async () => {
        await result.current.saveDraft(workflow, true)
      })

      expect(result.current.currentDraft?.autoSaved).toBe(true)
    })
  })

  describe('加载草稿', () => {
    it('应该加载草稿', async () => {
      const { getDraftStorage } = await import('@/lib/storage/draft-storage')
      const mockStorage = vi.mocked(getDraftStorage)()
      const workflow = createMockWorkflow()

      vi.mocked(mockStorage.getDraft).mockResolvedValueOnce({
        id: workflow.id,
        name: workflow.name,
        workflow,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        autoSaved: false,
        version: 1,
      })

      const { result } = renderHook(() => useWorkflowDraft())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        const draft = await result.current.loadDraft(workflow.id)
        expect(draft).not.toBeNull()
      })
    })
  })

  describe('删除草稿', () => {
    it('应该删除草稿', async () => {
      const { result } = renderHook(() => useWorkflowDraft())

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.deleteDraft('test-id')
      })

      expect(result.current.currentDraft).toBeNull()
    })
  })

  describe('自动保存', () => {
    it('应该触发自动保存', async () => {
      const { result } = renderHook(() => useWorkflowDraft({
        enableAutoSave: true,
        autoSaveInterval: 1000,
      }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const workflow = createMockWorkflow()

      act(() => {
        result.current.triggerAutoSave(workflow)
      })

      // 等待自动保存定时器触发
      await waitFor(() => {
        expect(result.current.lastSavedAt).not.toBeNull()
      }, { timeout: 2000 })
    }, 10000)
  })

  describe('回调函数', () => {
    it('应该调用 onAutoSave 回调', async () => {
      const onAutoSave = vi.fn()

      const { result } = renderHook(() => useWorkflowDraft({
        enableAutoSave: true,
        autoSaveInterval: 100,
        onAutoSave,
      }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const workflow = createMockWorkflow()

      act(() => {
        result.current.triggerAutoSave(workflow)
      })

      await waitFor(() => {
        expect(onAutoSave).toHaveBeenCalled()
      }, { timeout: 500 })
    }, 10000)

    it('应该调用 onError 回调', async () => {
      const onError = vi.fn()
      const { getDraftStorage } = await import('@/lib/storage/draft-storage')
      const mockStorage = vi.mocked(getDraftStorage)()
      vi.mocked(mockStorage.saveDraft).mockRejectedValueOnce(new Error('保存失败'))

      const { result } = renderHook(() => useWorkflowDraft({ onError }))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const workflow = createMockWorkflow()

      await act(async () => {
        try {
          await result.current.saveDraft(workflow)
        } catch {}
      })

      expect(onError).toHaveBeenCalled()
    })
  })
})
