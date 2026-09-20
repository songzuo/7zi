/**
 * draft-storage.test.ts
 * IndexedDB 草稿存储测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DraftStorage, WorkflowDraft, getDraftStorage } from '@/lib/storage/draft-storage'
import { WorkflowDefinition, WorkflowStatus, NodeType } from '@/types/workflow'

describe('DraftStorage', () => {
  let storage: DraftStorage
  let originalIndexedDB: typeof indexedDB

  beforeEach(() => {
    storage = new DraftStorage()
    originalIndexedDB = (global as any).indexedDB
  })

  afterEach(async () => {
    try {
      await storage.clearAllDrafts()
    } catch {}
    storage.close()
    if (originalIndexedDB) {
      (global as any).indexedDB = originalIndexedDB
    }
  })

  describe('初始化', () => {
    it('应该成功初始化数据库', async () => {
      // 模拟 IndexedDB
      const mockDB = {
        close: vi.fn(),
        transaction: vi.fn(),
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        },
      }

      const mockRequest = {
        result: mockDB,
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any,
      }

      const mockOpen = vi.fn().mockReturnValue(mockRequest)
      ;(global as any).indexedDB = {
        open: mockOpen,
      }

      await storage.init()

      expect(mockOpen).toHaveBeenCalledWith('workflow_drafts_db', 1)
      expect(storage['db']).toBe(mockDB)
    })

    it('应该在不支持 IndexedDB 时抛出错误', async () => {
      ;(global as any).indexedDB = undefined

      await expect(storage.init()).rejects.toThrow('IndexedDB is not supported')
    })
  })

  describe('草稿保存和读取', () => {
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

    it('应该保存和读取草稿', async () => {
      const workflow = createMockWorkflow()
      const draft = storage.createDraftFromWorkflow(workflow, true)

      // 模拟保存
      const mockTransaction = {
        objectStore: vi.fn().mockReturnValue({
          put: vi.fn(() => ({
            onsuccess: vi.fn(),
            onerror: vi.fn(),
          })),
        }),
      }
      storage['db'] = {
        transaction: vi.fn().mockReturnValue(mockTransaction),
      } as any

      await expect(storage.saveDraft(draft)).resolves.not.toThrow()
    })

    it('应该创建草稿从 WorkflowDefinition', () => {
      const workflow = createMockWorkflow()
      const draft = storage.createDraftFromWorkflow(workflow, false)

      expect(draft.id).toBe(workflow.id)
      expect(draft.name).toBe(workflow.name)
      expect(draft.autoSaved).toBe(false)
      expect(draft.workflow.status).toBe(WorkflowStatus.DRAFT)
    })

    it('应该标记自动保存的草稿', () => {
      const workflow = createMockWorkflow()
      const autoDraft = storage.createDraftFromWorkflow(workflow, true)
      const manualDraft = storage.createDraftFromWorkflow(workflow, false)

      expect(autoDraft.autoSaved).toBe(true)
      expect(manualDraft.autoSaved).toBe(false)
    })
  })

  describe('草稿管理', () => {
    it('应该获取所有草稿元数据', async () => {
      const mockRequest = {
        result: [
          {
            id: 'draft-1',
            name: '草稿1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-02T00:00:00Z',
            autoSaved: false,
            version: 1,
          },
        ],
        onsuccess: null as any,
        onerror: null as any,
      }

      const mockTransaction = {
        objectStore: vi.fn().mockReturnValue({
          getAll: vi.fn().mockReturnValue(mockRequest),
        }),
      }

      storage['db'] = {
        transaction: vi.fn().mockReturnValue(mockTransaction),
      } as any

      const metadata = await storage.getAllDraftMetadata()

      expect(metadata).toHaveLength(1)
      expect(metadata[0].name).toBe('草稿1')
    })

    it('应该删除草稿', async () => {
      const mockDeleteRequest = {
        onsuccess: null as any,
        onerror: null as any,
      }

      const mockTransaction = {
        objectStore: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue(mockDeleteRequest),
        }),
      }

      storage['db'] = {
        transaction: vi.fn().mockReturnValue(mockTransaction),
      } as any

      await expect(storage.deleteDraft('draft-1')).resolves.not.toThrow()
    })

    it('应该清空所有草稿', async () => {
      const mockClearRequest = {
        onsuccess: null as any,
        onerror: null as any,
      }

      const mockTransaction = {
        objectStore: vi.fn().mockReturnValue({
          clear: vi.fn().mockReturnValue(mockClearRequest),
        }),
      }

      storage['db'] = {
        transaction: vi.fn().mockReturnValue(mockTransaction),
      } as any

      await expect(storage.clearAllDrafts()).resolves.not.toThrow()
    })
  })

  describe('单例模式', () => {
    it('应该返回相同的实例', () => {
      const instance1 = getDraftStorage()
      const instance2 = getDraftStorage()

      expect(instance1).toBe(instance2)
    })
  })
})
