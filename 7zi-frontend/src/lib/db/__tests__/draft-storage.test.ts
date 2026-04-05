/**
 * Draft Storage Tests
 *
 * 草稿存储模块的完整单元测试
 * 使用 localStorage 后端进行测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DraftStorageManager,
  type Draft,
  type DraftType,
} from '../draft-storage'

// ============================================================================
// Test Setup
// ============================================================================

describe('DraftStorage', () => {
  let manager: DraftStorageManager

  beforeEach(() => {
    // 清理 localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear()
    }

    // Mock 没有 IndexedDB，强制使用 localStorage
    vi.stubGlobal('indexedDB', undefined)

    // 创建新的管理器实例
    manager = new DraftStorageManager()
  })

  afterEach(() => {
    // 清理 localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.clear()
    }

    // 清理 mocks
    vi.unstubAllGlobals()
  })

  // ============================================================================
  // 基础功能测试
  // ============================================================================

  describe('saveDraft', () => {
    it('should save a draft and return an ID', async () => {
      const data = { name: 'Test Workflow', nodes: [] }
      const draftId = await manager.saveDraft('workflow', data)

      expect(draftId).toBeDefined()
      expect(draftId).toMatch(/^DRAFT-WO-/)
    })

    it('should save draft with custom TTL', async () => {
      const data = { name: 'Temporary Workflow' }
      const draftId = await manager.saveDraft('workflow', data, { ttl: 1000 })

      const draft = await manager.loadDraft(draftId)
      expect(draft).toBeDefined()
      expect(draft?.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should save draft with default TTL (7 days)', async () => {
      const data = { name: 'Default TTL Workflow' }
      const draftId = await manager.saveDraft('workflow', data)

      const draft = await manager.loadDraft(draftId)
      expect(draft).toBeDefined()

      const expectedExpiresAt = draft!.createdAt + 7 * 24 * 60 * 60 * 1000
      expect(draft?.expiresAt).toBe(expectedExpiresAt)
    })

    it('should generate unique IDs for each draft', async () => {
      const id1 = await manager.saveDraft('workflow', { name: 'Draft 1' })
      const id2 = await manager.saveDraft('workflow', { name: 'Draft 2' })
      const id3 = await manager.saveDraft('template', { name: 'Draft 3' })

      expect(id1).not.toBe(id2)
      expect(id2).not.toBe(id3)
      expect(id1).not.toBe(id3)
    })

    it('should include correct type prefix in ID', async () => {
      const workflowId = await manager.saveDraft('workflow', { name: 'Workflow' })
      const templateId = await manager.saveDraft('template', { name: 'Template' })
      const executionId = await manager.saveDraft('execution', { status: 'running' })

      expect(workflowId).toMatch(/^DRAFT-WO-/)
      expect(templateId).toMatch(/^DRAFT-TE-/)
      expect(executionId).toMatch(/^DRAFT-EX-/)
    })

    it('should persist data to localStorage', async () => {
      const data = { name: 'Persistent Draft' }
      const draftId = await manager.saveDraft('workflow', data)

      const storageKey = '7zi-drafts'
      const storedData = localStorage.getItem(storageKey)
      expect(storedData).toBeDefined()

      const parsed = JSON.parse(storedData!)
      expect(parsed[draftId]).toBeDefined()
      expect(parsed[draftId].data).toEqual(data)
    })
  })

  describe('loadDraft', () => {
    it('should load a saved draft', async () => {
      const data = { name: 'Test Workflow', nodes: [] }
      const draftId = await manager.saveDraft('workflow', data)

      const draft = await manager.loadDraft(draftId)

      expect(draft).toBeDefined()
      expect(draft?.id).toBe(draftId)
      expect(draft?.type).toBe('workflow')
      expect(draft?.data).toEqual(data)
    })

    it('should return null for non-existent draft', async () => {
      const draft = await manager.loadDraft('non-existent-id')
      expect(draft).toBeNull()
    })

    it('should return null for expired draft', async () => {
      const draftId = await manager.saveDraft('workflow', { name: 'Expired' }, { ttl: 1 })

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 10))

      const draft = await manager.loadDraft(draftId)
      expect(draft).toBeNull()
    })

    it('should preserve draft metadata', async () => {
      const data = { name: 'Test' }
      const draftId = await manager.saveDraft('workflow', data)

      const draft = await manager.loadDraft(draftId)
      expect(draft?.createdAt).toBeDefined()
      expect(draft?.updatedAt).toBeDefined()
      expect(draft?.expiresAt).toBeDefined()
      expect(draft?.createdAt).toBe(draft?.updatedAt)
    })

    it('should load draft from localStorage', async () => {
      const data = { name: 'From Storage' }
      const draftId = await manager.saveDraft('workflow', data)

      // 创建新的管理器实例
      const newManager = new DraftStorageManager()
      const draft = await newManager.loadDraft(draftId)

      expect(draft).toBeDefined()
      expect(draft?.data).toEqual(data)
    })
  })

  describe('listDrafts', () => {
    it('should list all drafts', async () => {
      await manager.saveDraft('workflow', { name: 'Workflow 1' })
      await manager.saveDraft('template', { name: 'Template 1' })
      await manager.saveDraft('execution', { status: 'running' })

      const drafts = await manager.listDrafts()

      expect(drafts.length).toBeGreaterThanOrEqual(3)
    })

    it('should filter drafts by type', async () => {
      await manager.saveDraft('workflow', { name: 'Workflow 1' })
      await manager.saveDraft('workflow', { name: 'Workflow 2' })
      await manager.saveDraft('template', { name: 'Template 1' })

      const workflowDrafts = await manager.listDrafts('workflow')
      const templateDrafts = await manager.listDrafts('template')

      expect(workflowDrafts.length).toBeGreaterThanOrEqual(2)
      expect(templateDrafts.length).toBeGreaterThanOrEqual(1)

      // 验证类型过滤正确
      workflowDrafts.forEach(d => expect(d.type).toBe('workflow'))
      templateDrafts.forEach(d => expect(d.type).toBe('template'))
    })

    it('should not include expired drafts in list', async () => {
      await manager.saveDraft('workflow', { name: 'Valid' })
      await manager.saveDraft('workflow', { name: 'Expired' }, { ttl: 1 })

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 10))

      const drafts = await manager.listDrafts('workflow')
      const expiredDraft = drafts.find(d => d.data.name === 'Expired')

      expect(expiredDraft).toBeUndefined()
    })

    it('should return empty array when no drafts exist', async () => {
      const drafts = await manager.listDrafts()
      expect(drafts).toEqual([])
    })
  })

  describe('updateDraft', () => {
    it('should update an existing draft', async () => {
      const data = { name: 'Test Workflow', nodes: [] }
      const draftId = await manager.saveDraft('workflow', data)

      await manager.updateDraft(draftId, { nodes: [{ id: 'node1', type: 'start' }] })

      const draft = await manager.loadDraft(draftId)
      expect(draft?.data).toEqual({
        name: 'Test Workflow',
        nodes: [{ id: 'node1', type: 'start' }],
      })
    })

    it('should update updatedAt timestamp', async () => {
      const draftId = await manager.saveDraft('workflow', { name: 'Test' })
      const originalDraft = await manager.loadDraft(draftId)

      await new Promise(resolve => setTimeout(resolve, 10))
      await manager.updateDraft(draftId, { name: 'Updated' })

      const updatedDraft = await manager.loadDraft(draftId)
      expect(updatedDraft?.updatedAt).toBeGreaterThan(originalDraft!.updatedAt)
    })

    it('should throw error for non-existent draft', async () => {
      await expect(manager.updateDraft('non-existent-id', {})).rejects.toThrow('Draft not found')
    })

    it('should merge nested objects (shallow merge)', async () => {
      // 注意：updateDraft 只做浅合并
      // 要更新嵌套属性，需要传入完整对象

      // 定义类型以避免使用 any
      interface TestData {
        name: string
        config: {
          theme: string
          language?: string
        }
      }

      const data: TestData = {
        name: 'Test',
        config: { theme: 'dark', language: 'en' },
      }
      const draftId = await manager.saveDraft('workflow', data)

      // 浅合并会替换整个 config 对象
      // 使用类型断言但更安全：明确指定类型
      await manager.updateDraft<TestData>(draftId, { name: 'Test', config: { theme: 'light' } })

      const draft = await manager.loadDraft<TestData>(draftId)
      // 因为只传入了 { theme: 'light' }，所以 language 丢失
      expect(draft?.data).toEqual({
        name: 'Test',
        config: { theme: 'light' },
      })
    })

    it('should replace non-object data', async () => {
      const draftId = await manager.saveDraft('workflow', 'simple string data')

      await manager.updateDraft(draftId, 'updated string')

      const draft = await manager.loadDraft(draftId)
      expect(draft?.data).toBe('updated string')
    })

    it('should persist updates to localStorage', async () => {
      const draftId = await manager.saveDraft('workflow', { name: 'Original' })
      await manager.updateDraft(draftId, { name: 'Updated' })

      const storageKey = '7zi-drafts'
      const storedData = localStorage.getItem(storageKey)
      const parsed = JSON.parse(storedData!)

      expect(parsed[draftId].data.name).toBe('Updated')
    })
  })

  describe('deleteDraft', () => {
    it('should delete a draft', async () => {
      const data = { name: 'Test Workflow' }
      const draftId = await manager.saveDraft('workflow', data)

      await manager.deleteDraft(draftId)

      const draft = await manager.loadDraft(draftId)
      expect(draft).toBeNull()
    })

    it('should not throw error when deleting non-existent draft', async () => {
      await expect(manager.deleteDraft('non-existent-id')).resolves.not.toThrow()
    })

    it('should remove draft from list', async () => {
      const draftId = await manager.saveDraft('workflow', { name: 'To Delete' })
      await manager.saveDraft('workflow', { name: 'Keep' })

      await manager.deleteDraft(draftId)

      const drafts = await manager.listDrafts('workflow')
      const deletedDraft = drafts.find(d => d.id === draftId)

      expect(deletedDraft).toBeUndefined()
    })

    it('should remove draft from localStorage', async () => {
      const draftId = await manager.saveDraft('workflow', { name: 'To Delete' })
      await manager.deleteDraft(draftId)

      const storageKey = '7zi-drafts'
      const storedData = localStorage.getItem(storageKey)
      const parsed = JSON.parse(storedData!)

      expect(parsed[draftId]).toBeUndefined()
    })
  })

  describe('clearExpiredDrafts', () => {
    it('should clear expired drafts', async () => {
      // 保存一个立即过期的草稿
      const expiredId = await manager.saveDraft('workflow', { name: 'Expired' }, { ttl: 1 })
      await manager.saveDraft('workflow', { name: 'Valid' })

      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 10))

      // 清理过期草稿
      const cleared = await manager.clearExpiredDrafts()

      expect(cleared).toBeGreaterThanOrEqual(1)

      // 尝试加载过期草稿
      const draft = await manager.loadDraft(expiredId)
      expect(draft).toBeNull()
    })

    it('should return count of cleared drafts', async () => {
      await manager.saveDraft('workflow', { name: 'Expired 1' }, { ttl: 1 })
      await manager.saveDraft('workflow', { name: 'Expired 2' }, { ttl: 1 })
      await manager.saveDraft('workflow', { name: 'Expired 3' }, { ttl: 1 })
      await manager.saveDraft('workflow', { name: 'Valid' })

      await new Promise(resolve => setTimeout(resolve, 10))

      const cleared = await manager.clearExpiredDrafts()
      expect(cleared).toBeGreaterThanOrEqual(3)
    })

    it('should not clear valid drafts', async () => {
      await manager.saveDraft('workflow', { name: 'Valid 1' })
      await manager.saveDraft('workflow', { name: 'Valid 2' })

      const cleared = await manager.clearExpiredDrafts()
      expect(cleared).toBe(0)

      const drafts = await manager.listDrafts('workflow')
      expect(drafts.length).toBeGreaterThanOrEqual(2)
    })

    it('should remove expired drafts from localStorage', async () => {
      await manager.saveDraft('workflow', { name: 'Expired' }, { ttl: 1 })
      await manager.saveDraft('workflow', { name: 'Valid' })

      await new Promise(resolve => setTimeout(resolve, 10))
      await manager.clearExpiredDrafts()

      const storageKey = '7zi-drafts'
      const storedData = localStorage.getItem(storageKey)
      const parsed = JSON.parse(storedData!)

      const expiredDraft = Object.values(parsed).find((d: any) => d.data.name === 'Expired')
      expect(expiredDraft).toBeUndefined()
    })
  })

  describe('clearAllDrafts', () => {
    it('should clear all drafts', async () => {
      await manager.saveDraft('workflow', { name: 'Workflow 1' })
      await manager.saveDraft('template', { name: 'Template 1' })
      await manager.saveDraft('execution', { status: 'running' })

      await manager.clearAllDrafts()

      const drafts = await manager.listDrafts()
      expect(drafts.length).toBe(0)
    })

    it('should clear drafts of all types', async () => {
      await manager.saveDraft('workflow', { name: 'Workflow' })
      await manager.saveDraft('template', { name: 'Template' })
      await manager.saveDraft('execution', { status: 'running' })

      await manager.clearAllDrafts()

      expect(await manager.listDrafts('workflow')).toHaveLength(0)
      expect(await manager.listDrafts('template')).toHaveLength(0)
      expect(await manager.listDrafts('execution')).toHaveLength(0)
    })

    it('should clear localStorage', async () => {
      await manager.saveDraft('workflow', { name: 'Test' })
      await manager.clearAllDrafts()

      const storageKey = '7zi-drafts'
      const storedData = localStorage.getItem(storageKey)
      expect(storedData).toBeNull()
    })
  })

  // ============================================================================
  // DraftStorageManager 测试
  // ============================================================================

  describe('DraftStorageManager', () => {
    it('should report storage backend', () => {
      const backend = manager.getBackend()
      expect(['indexeddb', 'localstorage']).toContain(backend)
    })

    it('should use localStorage when IndexedDB is not available', () => {
      expect(manager.getBackend()).toBe('localstorage')
    })
  })

  // ============================================================================
  // 类型安全测试
  // ============================================================================

  describe('Type Safety', () => {
    interface WorkflowData {
      name: string
      nodes: Array<{ id: string; type: string }>
    }

    interface TemplateData {
      title: string
      description: string
    }

    interface ExecutionData {
      status: 'running' | 'completed' | 'failed'
      progress: number
    }

    it('should preserve type information for workflow', async () => {
      const data: WorkflowData = {
        name: 'Typed Workflow',
        nodes: [{ id: 'node1', type: 'start' }],
      }

      const draftId = await manager.saveDraft('workflow', data)
      const draft = await manager.loadDraft<WorkflowData>(draftId)

      expect(draft?.data).toEqual(data)
      expect(draft?.data.nodes[0].type).toBe('start')
    })

    it('should preserve type information for template', async () => {
      const data: TemplateData = {
        title: 'Typed Template',
        description: 'A test template',
      }

      const draftId = await manager.saveDraft('template', data)
      const draft = await manager.loadDraft<TemplateData>(draftId)

      expect(draft?.data).toEqual(data)
      expect(draft?.data.title).toBe('Typed Template')
    })

    it('should preserve type information for execution', async () => {
      const data: ExecutionData = {
        status: 'running',
        progress: 50,
      }

      const draftId = await manager.saveDraft('execution', data)
      const draft = await manager.loadDraft<ExecutionData>(draftId)

      expect(draft?.data).toEqual(data)
      expect(draft?.data.progress).toBe(50)
    })

    it('should handle complex nested objects', async () => {
      interface ComplexData {
        metadata: {
          author: string
          tags: string[]
          settings: {
            theme: string
            language: string
          }
        }
        content: {
          sections: Array<{
            title: string
            items: string[]
          }>
        }
      }

      const data: ComplexData = {
        metadata: {
          author: 'Test Author',
          tags: ['tag1', 'tag2', 'tag3'],
          settings: {
            theme: 'dark',
            language: 'en',
          },
        },
        content: {
          sections: [
            {
              title: 'Section 1',
              items: ['item1', 'item2'],
            },
          ],
        },
      }

      const draftId = await manager.saveDraft('workflow', data)
      const draft = await manager.loadDraft<ComplexData>(draftId)

      expect(draft?.data).toEqual(data)
      expect(draft?.data.metadata.tags).toHaveLength(3)
      expect(draft?.data.content.sections[0].items[0]).toBe('item1')
    })

    it('should handle array data', async () => {
      const data = ['item1', 'item2', 'item3']
      const draftId = await manager.saveDraft('workflow', data)
      const draft = await manager.loadDraft<string[]>(draftId)

      expect(draft?.data).toEqual(data)
      expect(draft?.data).toHaveLength(3)
    })

    it('should handle primitive types', async () => {
      const stringDraftId = await manager.saveDraft('workflow', 'string data')
      const numberDraftId = await manager.saveDraft('workflow', 12345)
      const booleanDraftId = await manager.saveDraft('workflow', true)

      expect(await manager.loadDraft<string>(stringDraftId)).toMatchObject({ data: 'string data' })
      expect(await manager.loadDraft<number>(numberDraftId)).toMatchObject({ data: 12345 })
      expect(await manager.loadDraft<boolean>(booleanDraftId)).toMatchObject({ data: true })
    })
  })

  // ============================================================================
  // 边界条件和错误处理测试
  // ============================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty data', async () => {
      const draftId = await manager.saveDraft('workflow', {})
      const draft = await manager.loadDraft(draftId)

      expect(draft).toBeDefined()
      expect(draft?.data).toEqual({})
    })

    it('should handle null data', async () => {
      // 使用 unknown 转换来避免使用 any，同时允许 null 作为数据
      const nullData = null as unknown as string
      const draftId = await manager.saveDraft('workflow', nullData)
      const draft = await manager.loadDraft<string>(draftId)

      expect(draft).toBeDefined()
      expect(draft?.data).toBeNull()
    })

    it('should handle very long data', async () => {
      const longString = 'x'.repeat(10000)
      const draftId = await manager.saveDraft('workflow', { longString })
      const draft = await manager.loadDraft(draftId)

      expect(draft?.data.longString).toHaveLength(10000)
    })

    it('should handle special characters in data', async () => {
      const data = {
        special: '特殊字符 ñ 中文 🎉 emoji',
        unicode: '\u0000\u001F\u007F',
      }
      const draftId = await manager.saveDraft('workflow', data)
      const draft = await manager.loadDraft(draftId)

      expect(draft?.data).toEqual(data)
    })

    it('should handle concurrent saves', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        manager.saveDraft('workflow', { index: i })
      )

      const ids = await Promise.all(promises)

      expect(ids).toHaveLength(10)
      expect(new Set(ids).size).toBe(10) // 所有 ID 应该唯一
    })

    it('should handle concurrent loads', async () => {
      const draftId = await manager.saveDraft('workflow', { name: 'Test' })

      const promises = Array.from({ length: 10 }, () => manager.loadDraft(draftId))
      const drafts = await Promise.all(promises)

      drafts.forEach(draft => {
        expect(draft).toBeDefined()
        expect(draft?.id).toBe(draftId)
      })
    })

    it('should handle zero TTL', async () => {
      const draftId = await manager.saveDraft('workflow', { name: 'Immediate' }, { ttl: 0 })
      const draft = await manager.loadDraft(draftId)

      // 零TTL意味着 expiresAt = createdAt
      expect(draft).toBeDefined()
      expect(draft?.expiresAt).toBe(draft?.createdAt)
    })

    it('should handle very large TTL', async () => {
      const largeTTL = 365 * 24 * 60 * 60 * 1000 // 1 年
      const draftId = await manager.saveDraft('workflow', { name: 'Long lived' }, { ttl: largeTTL })

      const draft = await manager.loadDraft(draftId)
      expect(draft).toBeDefined()
      expect(draft?.expiresAt).toBeGreaterThan(Date.now() + largeTTL - 1000)
    })
  })

  // ============================================================================
  // 数据完整性测试
  // ============================================================================

  describe('Data Integrity', () => {
    it('should preserve data after multiple updates', async () => {
      const draftId = await manager.saveDraft('workflow', { name: 'Initial', count: 0 })

      await manager.updateDraft(draftId, { count: 1 })
      await manager.updateDraft(draftId, { count: 2 })
      await manager.updateDraft(draftId, { count: 3 })

      const draft = await manager.loadDraft(draftId)
      expect(draft?.data).toEqual({ name: 'Initial', count: 3 })
    })

    it('should handle update after expiration', async () => {
      const draftId = await manager.saveDraft('workflow', { name: 'Test' }, { ttl: 1 })

      await new Promise(resolve => setTimeout(resolve, 10))

      await expect(manager.updateDraft(draftId, { name: 'Updated' })).rejects.toThrow()
    })

    it('should not affect other drafts when deleting one', async () => {
      const id1 = await manager.saveDraft('workflow', { name: 'Draft 1' })
      const id2 = await manager.saveDraft('workflow', { name: 'Draft 2' })
      const id3 = await manager.saveDraft('workflow', { name: 'Draft 3' })

      await manager.deleteDraft(id2)

      expect(await manager.loadDraft(id1)).toBeDefined()
      expect(await manager.loadDraft(id2)).toBeNull()
      expect(await manager.loadDraft(id3)).toBeDefined()
    })

    it('should maintain correct draft count after operations', async () => {
      const initialCount = (await manager.listDrafts()).length

      await manager.saveDraft('workflow', { name: 'New 1' })
      await manager.saveDraft('workflow', { name: 'New 2' })
      expect((await manager.listDrafts()).length).toBe(initialCount + 2)

      await manager.deleteDraft((await manager.listDrafts())[0].id)
      expect((await manager.listDrafts()).length).toBe(initialCount + 1)
    })

    it('should preserve data across manager instances', async () => {
      const draftId = await manager.saveDraft('workflow', { name: 'Cross Instance' })

      // 创建新的管理器实例
      const newManager = new DraftStorageManager()
      const draft = await newManager.loadDraft(draftId)

      expect(draft).toBeDefined()
      expect(draft?.data.name).toBe('Cross Instance')
    })
  })

  // ============================================================================
  // 性能测试
  // ============================================================================

  describe('Performance', () => {
    it('should handle large number of drafts', async () => {
      const count = 100
      const promises = Array.from({ length: count }, (_, i) =>
        manager.saveDraft('workflow', { index: i })
      )

      await Promise.all(promises)

      const drafts = await manager.listDrafts('workflow')
      expect(drafts.length).toBeGreaterThanOrEqual(count)
    })

    it('should efficiently filter by type', async () => {
      await Promise.all([
        ...Array.from({ length: 50 }, () => manager.saveDraft('workflow', { type: 'workflow' })),
        ...Array.from({ length: 50 }, () => manager.saveDraft('template', { type: 'template' })),
        ...Array.from({ length: 50 }, () => manager.saveDraft('execution', { type: 'execution' })),
      ])

      const workflowDrafts = await manager.listDrafts('workflow')
      const templateDrafts = await manager.listDrafts('template')
      const executionDrafts = await manager.listDrafts('execution')

      expect(workflowDrafts.length).toBeGreaterThanOrEqual(50)
      expect(templateDrafts.length).toBeGreaterThanOrEqual(50)
      expect(executionDrafts.length).toBeGreaterThanOrEqual(50)
    })

    it('should efficiently clear expired drafts', async () => {
      // 创建 100 个过期草稿
      await Promise.all(
        Array.from({ length: 100 }, () => manager.saveDraft('workflow', { expired: true }, { ttl: 1 }))
      )

      // 创建 100 个有效草稿
      await Promise.all(
        Array.from({ length: 100 }, () => manager.saveDraft('workflow', { expired: false }))
      )

      await new Promise(resolve => setTimeout(resolve, 10))

      const startTime = Date.now()
      const cleared = await manager.clearExpiredDrafts()
      const duration = Date.now() - startTime

      expect(cleared).toBeGreaterThanOrEqual(100)
      expect(duration).toBeLessThan(1000) // 应该在 1 秒内完成
    })

    it('should handle rapid sequential operations', async () => {
      const operations = []

      for (let i = 0; i < 50; i++) {
        operations.push(manager.saveDraft('workflow', { index: i }))
      }

      const ids = await Promise.all(operations)

      for (let i = 0; i < 50; i++) {
        operations.push(manager.loadDraft(ids[i]))
      }

      const drafts = await Promise.all(operations.slice(50))

      expect(drafts.every(d => d !== null)).toBe(true)
    })
  })

  // ============================================================================
  // localStorage 特定测试
  // ============================================================================

  describe('localStorage Specific', () => {
    it('should use correct storage key', async () => {
      await manager.saveDraft('workflow', { name: 'Test' })

      const storageKey = '7zi-drafts'
      const storedData = localStorage.getItem(storageKey)

      expect(storedData).toBeDefined()
    })

    it('should handle corrupted localStorage data', async () => {
      // 写入损坏的数据
      localStorage.setItem('7zi-drafts', 'invalid json')

      // 应该优雅地处理错误
      const drafts = await manager.listDrafts()
      expect(Array.isArray(drafts)).toBe(true)
    })
  })

  // ============================================================================
  // Draft 类型测试
  // ============================================================================

  describe('Draft Types', () => {
    it('should support workflow type', async () => {
      const draftId = await manager.saveDraft('workflow', { name: 'Workflow' })
      const draft = await manager.loadDraft(draftId)

      expect(draft?.type).toBe('workflow')
    })

    it('should support template type', async () => {
      const draftId = await manager.saveDraft('template', { title: 'Template' })
      const draft = await manager.loadDraft(draftId)

      expect(draft?.type).toBe('template')
    })

    it('should support execution type', async () => {
      const draftId = await manager.saveDraft('execution', { status: 'running' })
      const draft = await manager.loadDraft(draftId)

      expect(draft?.type).toBe('execution')
    })

    it('should filter by workflow type', async () => {
      await manager.saveDraft('workflow', { name: 'W1' })
      await manager.saveDraft('template', { name: 'T1' })
      await manager.saveDraft('execution', { status: 'running' })

      const drafts = await manager.listDrafts('workflow')
      expect(drafts.every(d => d.type === 'workflow')).toBe(true)
    })

    it('should filter by template type', async () => {
      await manager.saveDraft('workflow', { name: 'W1' })
      await manager.saveDraft('template', { name: 'T1' })
      await manager.saveDraft('execution', { status: 'running' })

      const drafts = await manager.listDrafts('template')
      expect(drafts.every(d => d.type === 'template')).toBe(true)
    })

    it('should filter by execution type', async () => {
      await manager.saveDraft('workflow', { name: 'W1' })
      await manager.saveDraft('template', { name: 'T1' })
      await manager.saveDraft('execution', { status: 'running' })

      const drafts = await manager.listDrafts('execution')
      expect(drafts.every(d => d.type === 'execution')).toBe(true)
    })
  })

  // ============================================================================
  // 时间戳测试
  // ============================================================================

  describe('Timestamps', () => {
    it('should set createdAt on save', async () => {
      const beforeSave = Date.now()
      const draftId = await manager.saveDraft('workflow', { name: 'Test' })
      const draft = await manager.loadDraft(draftId)
      const afterSave = Date.now()

      expect(draft).toBeDefined()
      expect(draft?.createdAt).toBeGreaterThanOrEqual(beforeSave)
      expect(draft?.createdAt).toBeLessThanOrEqual(afterSave)
    })

    it('should set updatedAt on save', async () => {
      const beforeSave = Date.now()
      const draftId = await manager.saveDraft('workflow', { name: 'Test' })
      const draft = await manager.loadDraft(draftId)
      const afterSave = Date.now()

      expect(draft).toBeDefined()
      expect(draft?.updatedAt).toBeGreaterThanOrEqual(beforeSave)
      expect(draft?.updatedAt).toBeLessThanOrEqual(afterSave)
    })

    it('should update updatedAt on update', async () => {
      const draftId = await manager.saveDraft('workflow', { name: 'Test' })
      const originalDraft = await manager.loadDraft(draftId)

      await new Promise(resolve => setTimeout(resolve, 10))
      await manager.updateDraft(draftId, { name: 'Updated' })

      const updatedDraft = await manager.loadDraft(draftId)

      expect(updatedDraft?.updatedAt).toBeGreaterThan(originalDraft!.updatedAt)
      expect(updatedDraft?.createdAt).toBe(originalDraft!.createdAt)
    })

    it('should calculate expiresAt correctly', async () => {
      const ttl = 60000 // 1 分钟
      const draftId = await manager.saveDraft('workflow', { name: 'Test' }, { ttl })
      const draft = await manager.loadDraft(draftId)

      expect(draft).toBeDefined()
      expect(draft?.expiresAt).toBe(draft!.createdAt + ttl)
    })
  })
})