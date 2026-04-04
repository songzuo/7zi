/**
 * Draft Storage Tests
 *
 * 草稿存储模块的单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DraftStorageManager,
  getDraftStorageManager,
  saveDraft,
  loadDraft,
  listDrafts,
  deleteDraft,
  clearExpiredDrafts,
  updateDraft,
  clearAllDrafts,
  initializeDraftStorage,
} from '../draft-storage'

// Mock IndexedDB
const mockDB = {
  transaction: vi.fn(),
  close: vi.fn(),
}

const mockRequest = {
  result: mockDB,
  error: null,
  onsuccess: null as ((event: Event) => void) | null,
  onerror: null as ((event: Event) => void) | null,
  onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
}

vi.stubGlobal('indexedDB', {
  open: vi.fn(() => mockRequest),
})

describe('DraftStorage', () => {
  let manager: DraftStorageManager

  beforeEach(() => {
    // 重置 mocks
    vi.clearAllMocks()

    // 创建新的管理器实例
    manager = new DraftStorageManager()
  })

  afterEach(async () => {
    // 清理所有草稿
    try {
      await clearAllDrafts()
    } catch {
      // 忽略清理错误
    }
  })

  describe('saveDraft', () => {
    it('should save a draft and return an ID', async () => {
      const data = { name: 'Test Workflow', nodes: [] }
      const draftId = await saveDraft('workflow', data)

      expect(draftId).toBeDefined()
      expect(draftId).toMatch(/^DRAFT-WO-/)
    })

    it('should save draft with custom TTL', async () => {
      const data = { name: 'Temporary Workflow' }
      const draftId = await saveDraft('workflow', data, { ttl: 1000 })

      const draft = await loadDraft(draftId)
      expect(draft).toBeDefined()
      expect(draft?.expiresAt).toBeGreaterThan(Date.now())
    })
  })

  describe('loadDraft', () => {
    it('should load a saved draft', async () => {
      const data = { name: 'Test Workflow', nodes: [] }
      const draftId = await saveDraft('workflow', data)

      const draft = await loadDraft(draftId)

      expect(draft).toBeDefined()
      expect(draft?.id).toBe(draftId)
      expect(draft?.type).toBe('workflow')
      expect(draft?.data).toEqual(data)
    })

    it('should return null for non-existent draft', async () => {
      const draft = await loadDraft('non-existent-id')
      expect(draft).toBeNull()
    })
  })

  describe('listDrafts', () => {
    it('should list all drafts', async () => {
      await saveDraft('workflow', { name: 'Workflow 1' })
      await saveDraft('template', { name: 'Template 1' })
      await saveDraft('execution', { status: 'running' })

      const drafts = await listDrafts()

      expect(drafts.length).toBeGreaterThanOrEqual(3)
    })

    it('should filter drafts by type', async () => {
      await saveDraft('workflow', { name: 'Workflow 1' })
      await saveDraft('workflow', { name: 'Workflow 2' })
      await saveDraft('template', { name: 'Template 1' })

      const workflowDrafts = await listDrafts('workflow')
      const templateDrafts = await listDrafts('template')

      expect(workflowDrafts.length).toBeGreaterThanOrEqual(2)
      expect(templateDrafts.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('updateDraft', () => {
    it('should update an existing draft', async () => {
      const data = { name: 'Test Workflow', nodes: [] }
      const draftId = await saveDraft('workflow', data)

      await updateDraft(draftId, { nodes: [{ id: 'node1', type: 'start' }] })

      const draft = await loadDraft(draftId)
      expect(draft?.data).toEqual({
        name: 'Test Workflow',
        nodes: [{ id: 'node1', type: 'start' }],
      })
    })

    it('should throw error for non-existent draft', async () => {
      await expect(updateDraft('non-existent-id', {})).rejects.toThrow()
    })
  })

  describe('deleteDraft', () => {
    it('should delete a draft', async () => {
      const data = { name: 'Test Workflow' }
      const draftId = await saveDraft('workflow', data)

      await deleteDraft(draftId)

      const draft = await loadDraft(draftId)
      expect(draft).toBeNull()
    })
  })

  describe('clearExpiredDrafts', () => {
    it('should clear expired drafts', async () => {
      // 保存一个立即过期的草稿
      const expiredId = await saveDraft('workflow', { name: 'Expired' }, { ttl: 1 })

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 10))

      // 清理过期草稿
      const cleared = await clearExpiredDrafts()

      expect(cleared).toBeGreaterThanOrEqual(0)

      // 尝试加载过期草稿
      const draft = await loadDraft(expiredId)
      expect(draft).toBeNull()
    })
  })

  describe('clearAllDrafts', () => {
    it('should clear all drafts', async () => {
      await saveDraft('workflow', { name: 'Workflow 1' })
      await saveDraft('template', { name: 'Template 1' })

      await clearAllDrafts()

      const drafts = await listDrafts()
      expect(drafts.length).toBe(0)
    })
  })

  describe('DraftStorageManager', () => {
    it('should return singleton instance', () => {
      const instance1 = getDraftStorageManager()
      const instance2 = getDraftStorageManager()

      expect(instance1).toBe(instance2)
    })

    it('should report storage backend', () => {
      const manager = getDraftStorageManager()
      const backend = manager.getBackend()

      expect(['indexeddb', 'localstorage']).toContain(backend)
    })
  })

  describe('Type Safety', () => {
    interface WorkflowData {
      name: string
      nodes: Array<{ id: string; type: string }>
    }

    it('should preserve type information', async () => {
      const data: WorkflowData = {
        name: 'Typed Workflow',
        nodes: [{ id: 'node1', type: 'start' }],
      }

      const draftId = await saveDraft('workflow', data)
      const draft = await loadDraft<WorkflowData>(draftId)

      expect(draft?.data).toEqual(data)
      expect(draft?.data.nodes[0].type).toBe('start')
    })
  })

  describe('initializeDraftStorage', () => {
    it('should initialize and clear expired drafts', async () => {
      // 保存一个立即过期的草稿
      await saveDraft('workflow', { name: 'Expired' }, { ttl: 1 })

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 10))

      // 初始化
      await initializeDraftStorage()

      // 验证过期草稿被清理
      const drafts = await listDrafts<{ name: string }>()
      const expiredDraft = drafts.find(d => d.data?.name === 'Expired')
      expect(expiredDraft).toBeUndefined()
    })
  })
})