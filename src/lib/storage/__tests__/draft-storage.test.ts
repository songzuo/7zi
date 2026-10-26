/**
 * draft-storage.test.ts
 * IndexedDB 草稿存储测试
 *
 * v12 修复（分片 3/4 被 cancelled 的真凶）
 * ---------------------------------------------------------------
 * 原来的 fake IDBRequest 只是把 onsuccess / onerror 初始化成 null，
 * 从头到尾**没有任何人调用它们**。而 DraftStorage 的每个方法都是
 *
 *     return new Promise((resolve, reject) => {
 *       const request = ...
 *       request.onsuccess = () => resolve()
 *       request.onerror = () => reject(...)
 *     })
 *
 * 于是 Promise 永不 settle → 只能等 testTimeout（60s）→ CI 里
 * `retry: 1` 再跑一遍 → 单个用例 120s+。实测：
 *
 *     ❯ src/lib/storage/__tests__/draft-storage.test.ts (9 tests | 8 failed) 700456ms
 *           × 应该成功初始化数据库 140117ms (retry x1)
 *           × 应该保存和读取草稿 120064ms (retry x1)
 *           ...
 *
 * 单个文件 700s，直接把 CI 的分片 3/4 顶穿 20 分钟上限，
 * job conclusion 变成 cancelled（不是 failure）→ 整个 run 判红 → 一封邮件。
 *
 * 现在用 fakeRequest()：一旦给 onsuccess 赋值，就在下一个宏任务里回调一次。
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DraftStorage, WorkflowDraft, getDraftStorage } from '@/lib/storage/draft-storage'
import { WorkflowDefinition, WorkflowStatus, NodeType } from '@/types/workflow'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * 创建一个「会真正回调」的 fake IDBRequest。
 *
 * - 赋值 req.onsuccess = fn 后，下一个宏任务里调用 fn 一次（只一次）。
 * - 没被赋值的 request（例如只做 fire-and-forget 的 metadataStore.put）
 *   不会触发任何回调，也就不会挂住任何 Promise。
 */
function fakeRequest(result?: any): any {
  const req: any = { result, error: null, onsuccess: null, onerror: null }
  let handler: any = null
  let fired = false

  Object.defineProperty(req, 'onsuccess', {
    configurable: true,
    enumerable: true,
    get: () => handler,
    set: (fn: any) => {
      handler = fn
      if (fired || typeof fn !== 'function') return
      fired = true
      setTimeout(() => handler({ target: req }), 0)
    },
  })

  return req
}

/** 造一个带 transaction() 的假 IDBDatabase，transaction 里统一返回同一个 store */
function fakeDb(store: Record<string, any>): any {
  return {
    close: vi.fn(),
    transaction: vi.fn(() => ({ objectStore: vi.fn(() => store) })),
  }
}

describe('DraftStorage', () => {
  let storage: DraftStorage
  let originalIndexedDB: any

  beforeEach(() => {
    storage = new DraftStorage()
    originalIndexedDB = (global as any).indexedDB
  })

  afterEach(() => {
    // 关键：这里**不能** await clearAllDrafts()。
    // 原实现无条件 await 它，只要 mock db 的 clear() 不回调，
    // afterEach 就会吃满 hookTimeout(10s)，CI retry 再翻倍 —— 连纯同步的
    // 用例（「应该创建草稿从 WorkflowDefinition」）都被拖红 20s。
    try {
      storage.close()
    } catch {
      /* 手工塞的 mock db 可能没有 close() */
    }
    if (originalIndexedDB === undefined) {
      delete (global as any).indexedDB
    } else {
      (global as any).indexedDB = originalIndexedDB
    }
  })

  describe('初始化', () => {
    it('应该成功初始化数据库', async () => {
      const mockDB = {
        close: vi.fn(),
        transaction: vi.fn(),
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        },
      }

      const mockOpen = vi.fn().mockReturnValue(fakeRequest(mockDB))
      ;(global as any).indexedDB = { open: mockOpen }

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

      const store = { put: vi.fn(() => fakeRequest(1)) }
      storage['db'] = fakeDb(store)

      // 原来写的是 `await expect(storage.saveDraft(draft)).resolves.not.toThrow()`，
      // 这是**第二个隐藏 bug**：toThrow 要求 received 是函数，resolves 出来的是
      // undefined，于是抛「received value must be a function」—— `.not` 挡不住
      // 这种前置错误。挂死修好之后它照样会红。直接 await 即可：
      // 没 reject 就是通过，reject 了用例本身就失败。
      await storage.saveDraft(draft)
      expect(store.put).toHaveBeenCalledTimes(2) // 草稿 + 元数据
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
      const store = {
        getAll: vi.fn(() =>
          fakeRequest([
            {
              id: 'draft-1',
              name: '草稿1',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-02T00:00:00Z',
              autoSaved: false,
              version: 1,
            },
          ])
        ),
      }
      storage['db'] = fakeDb(store)

      const metadata = await storage.getAllDraftMetadata()

      expect(metadata).toHaveLength(1)
      expect(metadata[0].name).toBe('草稿1')
    })

    it('应该删除草稿', async () => {
      const store = { delete: vi.fn(() => fakeRequest(undefined)) }
      storage['db'] = fakeDb(store)

      await storage.deleteDraft('draft-1')
      expect(store.delete).toHaveBeenCalledWith('draft-1')
    })

    it('应该清空所有草稿', async () => {
      const store = { clear: vi.fn(() => fakeRequest(undefined)) }
      storage['db'] = fakeDb(store)

      await storage.clearAllDrafts()
      expect(store.clear).toHaveBeenCalledTimes(2) // 草稿 + 元数据
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
