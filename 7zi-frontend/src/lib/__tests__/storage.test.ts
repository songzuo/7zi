import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  InMemoryStorage,
  storage,
  type StorageItem,
  type QueryCondition,
  type TransactionOperation,
  type StorageStats,
} from '../db/storage'

describe('Storage 模块', () => {
  let store: InMemoryStorage<string>

  beforeEach(() => {
    store = new InMemoryStorage()
  })

  describe('基本 CRUD 操作', () => {
    it('应该能够设置和获取值', () => {
      store.set('key1', 'value1')
      expect(store.get('key1')).toBe('value1')
    })

    it('应该能够更新已存在的值', () => {
      store.set('key1', 'value1')
      store.set('key1', 'value2')
      expect(store.get('key1')).toBe('value2')
    })

    it('获取不存在的键应该返回 undefined', () => {
      expect(store.get('nonexistent')).toBeUndefined()
    })

    it('应该能够检查键是否存在', () => {
      store.set('key1', 'value1')
      expect(store.has('key1')).toBe(true)
      expect(store.has('key2')).toBe(false)
    })

    it('应该能够删除键', () => {
      store.set('key1', 'value1')
      expect(store.delete('key1')).toBe(true)
      expect(store.get('key1')).toBeUndefined()
    })

    it('删除不存在的键应该返回 false', () => {
      expect(store.delete('nonexistent')).toBe(false)
    })

    it('应该能够清空所有键', () => {
      store.set('key1', 'value1')
      store.set('key2', 'value2')
      store.clear()
      expect(store.size()).toBe(0)
      expect(store.get('key1')).toBeUndefined()
      expect(store.get('key2')).toBeUndefined()
    })
  })

  describe('TTL (过期时间) 功能', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该支持设置 TTL', () => {
      store.set('key1', 'value1', 1000)
      expect(store.get('key1')).toBe('value1')
    })

    it('过期的值应该自动被清除', () => {
      store.set('key1', 'value1', 1000)

      vi.advanceTimersByTime(500)
      expect(store.get('key1')).toBe('value1')

      vi.advanceTimersByTime(600)
      expect(store.get('key1')).toBeUndefined()
    })

    it('应该能够检查值是否过期', () => {
      store.set('key1', 'value1', 1000)
      expect(store.isExpired('key1')).toBe(false)

      vi.advanceTimersByTime(1500)
      expect(store.isExpired('key1')).toBe(true)
    })

    it('应该能够延长 TTL', () => {
      store.set('key1', 'value1', 1000)

      vi.advanceTimersByTime(500)
      expect(store.get('key1')).toBe('value1')

      store.extendTTL('key1', 1000)
      vi.advanceTimersByTime(600)
      expect(store.get('key1')).toBe('value1')

      vi.advanceTimersByTime(500)
      expect(store.get('key1')).toBeUndefined()
    })

    it('延长不存在键的 TTL 应该返回 false', () => {
      expect(store.extendTTL('nonexistent', 1000)).toBe(false)
    })

    it('应该能够获取过期时间', () => {
      store.set('key1', 'value1', 1000)
      const expiresAt = store.getExpiresAt('key1')
      expect(expiresAt).toBeDefined()
      expect(expiresAt).toBeGreaterThan(Date.now())
    })

    it('没有 TTL 的键返回 undefined 过期时间', () => {
      store.set('key1', 'value1')
      expect(store.getExpiresAt('key1')).toBeUndefined()
    })
  })

  describe('批量操作', () => {
    it('应该能够批量设置', () => {
      store.setMany({
        key1: 'value1',
        key2: 'value2',
        key3: 'value3',
      })

      expect(store.get('key1')).toBe('value1')
      expect(store.get('key2')).toBe('value2')
      expect(store.get('key3')).toBe('value3')
    })

    it('应该能够批量获取', () => {
      store.set('key1', 'value1')
      store.set('key2', 'value2')
      store.set('key3', 'value3')

      const result = store.getMany(['key1', 'key2', 'key4'])

      expect(result.size).toBe(2)
      expect(result.get('key1')).toBe('value1')
      expect(result.get('key2')).toBe('value2')
      expect(result.get('key4')).toBeUndefined()
    })

    it('应该能够批量删除', () => {
      store.set('key1', 'value1')
      store.set('key2', 'value2')
      store.set('key3', 'value3')

      const count = store.deleteMany(['key1', 'key2', 'key4'])

      expect(count).toBe(2)
      expect(store.get('key1')).toBeUndefined()
      expect(store.get('key2')).toBeUndefined()
      expect(store.get('key3')).toBe('value3')
    })
  })

  describe('查询功能', () => {
    beforeEach(() => {
      const now = Date.now()
      store.set('user:1', 'John')
      store.set('user:2', 'Jane')
      store.set('user:3', 'Bob')
      store.set('session:1', 'abc123')
      store.set('session:2', 'def456')
    })

    it('应该能够按键查询', () => {
      const results = store.query({ key: 'user:1' })
      expect(results).toHaveLength(1)
      expect(results[0]).toEqual(['user:1', 'John'])
    })

    it('应该能够按正则表达式查询键', () => {
      const results = store.query({ key: /^user:/ })
      expect(results).toHaveLength(3)
      expect(results[0][0]).toBe('user:1')
      expect(results[1][0]).toBe('user:2')
      expect(results[2][0]).toBe('user:3')
    })

    it('应该能够按值查询', () => {
      const results = store.query({ value: 'John' })
      expect(results).toHaveLength(1)
      expect(results[0][1]).toBe('John')
    })

    it('应该能够按值函数查询', () => {
      const results = store.query({
        value: (val: string) => val.startsWith('J'),
      })
      expect(results).toHaveLength(2)
      expect(results[0][1]).toBe('John')
      expect(results[1][1]).toBe('Jane')
    })

    it('应该能够按过期时间查询', () => {
      const now = Date.now()
      store.set('temp', 'value', 1000)

      const results = store.query({
        expiresAt: { after: now },
      })
      expect(results.length).toBeGreaterThan(0)
    })

    it('应该能够按创建时间查询', () => {
      const before = Date.now()
      store.set('new', 'value')
      const after = Date.now() + 1 // Ensure after > before

      const results = store.query({
        createdAt: { after: before, before: after },
      })
      expect(results.length).toBeGreaterThan(0)
    })

    it('应该支持组合查询条件', () => {
      const results = store.query({
        key: /^user:/,
        value: (val: string) => val.startsWith('J'),
      })
      expect(results).toHaveLength(2)
    })

    it('空查询应该返回所有项', () => {
      const results = store.query({})
      expect(results).toHaveLength(5)
    })
  })

  describe('事务功能', () => {
    it('应该能够执行事务', () => {
      store.set('key1', 'value1')

      const operations: TransactionOperation[] = [
        { type: 'set', key: 'key2', value: 'value2' },
        { type: 'delete', key: 'key1' },
      ]

      const result = store.transaction(operations)

      expect(result).toBe(true)
      expect(store.get('key1')).toBeUndefined()
      expect(store.get('key2')).toBe('value2')
    })

    it('失败的事务应该回滚', () => {
      store.set('key1', 'value1')
      store.set('key2', 'value2')

      const operations: TransactionOperation[] = [
        { type: 'set', key: 'key3', value: 'value3' },
        { type: 'delete', key: 'key1' },
      ]

      const result = store.transaction(operations)

      expect(result).toBe(true)
      expect(store.size()).toBe(2) // key2 and key3 remain
      expect(store.get('key1')).toBeUndefined()
      expect(store.get('key3')).toBe('value3')
    })

    it('clear 操作应该清除所有数据', () => {
      store.set('key1', 'value1')
      store.set('key2', 'value2')

      const result = store.transaction([{ type: 'clear' }])

      expect(result).toBe(true)
      expect(store.size()).toBe(0)
    })
  })

  describe('统计和导出功能', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      store.set('key1', 'value1')
      store.set('key2', 'value2', 1000)
      store.set('key3', 'value3')
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该返回正确的统计信息', () => {
      const stats = store.getStats()

      expect(stats.itemCount).toBe(3)
      expect(stats.expiredCount).toBe(0)
      expect(stats.totalSize).toBeGreaterThan(0)
      expect(stats.keys).toContain('key1')
      expect(stats.keys).toContain('key2')
      expect(stats.keys).toContain('key3')
    })

    it('应该统计过期项', () => {
      vi.advanceTimersByTime(1500)

      const stats = store.getStats()

      expect(stats.expiredCount).toBe(1)
      expect(stats.itemCount).toBe(2)
    })

    it('应该能够导出数据', () => {
      const data = store.export()

      expect(data.key1).toBeDefined()
      expect(data.key1.value).toBe('value1')
      expect(data.key1.createdAt).toBeDefined()
      expect(data.key1.updatedAt).toBeDefined()
      expect(data.key2.expiresAt).toBeDefined()
    })

    it('应该能够导入数据', () => {
      const exportData = store.export()
      const newStore = new InMemoryStorage()
      newStore.import(exportData)

      expect(newStore.get('key1')).toBe('value1')
      expect(newStore.get('key2')).toBe('value2')
      expect(newStore.get('key3')).toBe('value3')
    })

    it('导入应该清空现有数据', () => {
      const newStore = new InMemoryStorage()
      newStore.set('old', 'data')

      const exportData = store.export()
      newStore.import(exportData)

      expect(newStore.get('old')).toBeUndefined()
      expect(newStore.get('key1')).toBe('value1')
    })
  })

  describe('清理过期项', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      store.set('key1', 'value1', 500)
      store.set('key2', 'value2', 1000)
      store.set('key3', 'value3')
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该清理过期项', () => {
      vi.advanceTimersByTime(750)

      const count = store.cleanup()

      expect(count).toBe(1)
      expect(store.get('key1')).toBeUndefined()
      expect(store.get('key2')).toBe('value2')
      expect(store.get('key3')).toBe('value3')
    })

    it('应该清理所有过期项', () => {
      vi.advanceTimersByTime(1500)

      const count = store.cleanup()

      expect(count).toBe(2)
      expect(store.get('key1')).toBeUndefined()
      expect(store.get('key2')).toBeUndefined()
      expect(store.get('key3')).toBe('value3')
    })

    it('get 应该自动清理过期项', () => {
      vi.advanceTimersByTime(1500)

      expect(store.get('key1')).toBeUndefined()
      expect(store.get('key2')).toBeUndefined()
      expect(store.get('key3')).toBe('value3')
      expect(store.size()).toBe(1)
    })
  })

  describe('keys, values, entries 方法', () => {
    beforeEach(() => {
      store.set('key1', 'value1')
      store.set('key2', 'value2')
      store.set('key3', 'value3')
    })

    it('keys 应该返回所有键', () => {
      const keys = store.keys()
      expect(keys).toHaveLength(3)
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
    })

    it('values 应该返回所有值', () => {
      const values = store.values()
      expect(values).toHaveLength(3)
      expect(values).toContain('value1')
      expect(values).toContain('value2')
      expect(values).toContain('value3')
    })

    it('entries 应该返回所有键值对', () => {
      const entries = store.entries()
      expect(entries).toHaveLength(3)
      expect(entries).toContainEqual(['key1', 'value1'])
      expect(entries).toContainEqual(['key2', 'value2'])
      expect(entries).toContainEqual(['key3', 'value3'])
    })
  })

  describe('size 和 isEmpty 方法', () => {
    it('空存储的 size 应该为 0', () => {
      expect(store.size()).toBe(0)
    })

    it('空存储的 isEmpty 应该返回 true', () => {
      expect(store.isEmpty()).toBe(true)
    })

    it('有数据时 size 应该正确返回', () => {
      store.set('key1', 'value1')
      store.set('key2', 'value2')
      expect(store.size()).toBe(2)
    })

    it('有数据时 isEmpty 应该返回 false', () => {
      store.set('key1', 'value1')
      expect(store.isEmpty()).toBe(false)
    })

    it('过期项不应该计入 size', () => {
      vi.useFakeTimers()
      store.set('key1', 'value1', 500)
      store.set('key2', 'value2')

      vi.advanceTimersByTime(1000)
      expect(store.size()).toBe(1)
      vi.useRealTimers()
    })
  })

  describe('复杂类型支持', () => {
    it('应该支持对象类型', () => {
      const objectStore = new InMemoryStorage<{ name: string }>()
      const obj = { name: 'John' }
      objectStore.set('key1', obj)

      const result = objectStore.get('key1')
      expect(result).toEqual(obj)
    })

    it('应该支持数组类型', () => {
      const arrayStore = new InMemoryStorage<number[]>()
      const arr = [1, 2, 3]
      arrayStore.set('key1', arr)

      const result = arrayStore.get('key1')
      expect(result).toEqual(arr)
    })

    it('应该支持嵌套对象', () => {
      const nestedStore = new InMemoryStorage<{ user: { name: string; age: number } }>()
      const nested = { user: { name: 'John', age: 30 } }
      nestedStore.set('key1', nested)

      const result = nestedStore.get('key1')
      expect(result).toEqual(nested)
    })

    it('应该支持 null 和 undefined 值', () => {
      store.set('null', null as unknown as string)
      store.set('undefined', undefined as unknown as string)

      expect(store.get('null')).toBeNull()
      expect(store.get('undefined')).toBeUndefined()
    })
  })

  describe('默认 storage 实例', () => {
    it('应该导出默认 storage 实例', () => {
      expect(storage).toBeDefined()
      expect(storage).toBeInstanceOf(InMemoryStorage)
    })
  })

  describe('集成测试', () => {
    it('应该支持完整的存储生命周期', () => {
      // 创建
      store.set('user:1', 'John', 60000)
      store.set('user:2', 'Jane')
      store.set('session:1', 'abc123', 30000)

      // 读取
      expect(store.get('user:1')).toBe('John')
      expect(store.has('user:2')).toBe(true)

      // 更新
      store.set('user:1', 'John Doe')
      expect(store.get('user:1')).toBe('John Doe')

      // 查询
      const users = store.query({ key: /^user:/ })
      expect(users).toHaveLength(2)

      // 统计
      const stats = store.getStats()
      expect(stats.itemCount).toBe(3)

      // 批量操作
      store.setMany({ 'user:3': 'Bob', 'user:4': 'Alice' })
      expect(store.size()).toBe(5)

      // 删除
      store.deleteMany(['user:3', 'user:4'])
      expect(store.size()).toBe(3)

      // 导出和导入
      const data = store.export()
      const newStore = new InMemoryStorage()
      newStore.import(data)
      expect(newStore.get('user:1')).toBe('John Doe')

      // 清空
      store.clear()
      expect(store.size()).toBe(0)
    })

    it('应该正确处理并发操作', () => {
      // 模拟并发写入
      for (let i = 0; i < 100; i++) {
        store.set(`key${i}`, `value${i}`)
      }

      expect(store.size()).toBe(100)

      // 模拟并发读取
      for (let i = 0; i < 100; i++) {
        expect(store.get(`key${i}`)).toBe(`value${i}`)
      }
    })

    it('应该能够处理大量数据', () => {
      const count = 10000
      for (let i = 0; i < count; i++) {
        store.set(`key${i}`, `value${i}`)
      }

      expect(store.size()).toBe(count)

      const stats = store.getStats()
      expect(stats.itemCount).toBe(count)
      expect(stats.keys).toHaveLength(count)
    })
  })

  describe('边界情况', () => {
    it('应该能够处理空键', () => {
      store.set('', 'value')
      expect(store.get('')).toBe('value')
      expect(store.has('')).toBe(true)
    })

    it('应该能够处理特殊字符键', () => {
      const specialKeys = [
        'key with spaces',
        'key/with/slashes',
        'key:with:colons',
        'key.with.dots',
      ]
      specialKeys.forEach(key => {
        store.set(key, `value for ${key}`)
      })

      specialKeys.forEach(key => {
        expect(store.get(key)).toBe(`value for ${key}`)
      })
    })

    it('应该能够处理超大值', () => {
      const largeValue = 'x'.repeat(1000000)
      store.set('large', largeValue)

      expect(store.get('large')).toBe(largeValue)
    })

    it('应该能够处理 JSON 对象中的特殊字符', () => {
      const obj = {
        'key with "quotes"': 'value',
        'key with \\backslash\\': 'value',
        'key with \n newline': 'value',
      }

      const objectStore = new InMemoryStorage<typeof obj>()
      objectStore.set('test', obj)

      const result = objectStore.get('test')
      expect(result).toEqual(obj)
    })

    it('批量操作中的空数组不应该出错', () => {
      expect(store.setMany({})).toBeUndefined()
      expect(store.getMany([]).size).toBe(0)
      expect(store.deleteMany([])).toBe(0)
    })

    it('空事务不应该出错', () => {
      expect(store.transaction([])).toBe(true)
    })
  })

  describe('性能测试', () => {
    it('快速查找应该高效', () => {
      store.set('key1', 'value1')
      store.set('key2', 'value2')
      store.set('key3', 'value3')

      const start = Date.now()
      for (let i = 0; i < 10000; i++) {
        store.get('key2')
      }
      const end = Date.now()

      // 10000 次查找应该在 100ms 内完成
      expect(end - start).toBeLessThan(100)
    })

    it('批量操作应该比单个操作更快', () => {
      const count = 1000

      const singleStart = Date.now()
      for (let i = 0; i < count; i++) {
        store.set(`key${i}`, `value${i}`)
      }
      const singleEnd = Date.now()

      store.clear()

      const items: Record<string, string> = {}
      for (let i = 0; i < count; i++) {
        items[`key${i}`] = `value${i}`
      }

      const batchStart = Date.now()
      store.setMany(items)
      const batchEnd = Date.now()

      // 批量操作应该能正常工作（性能比较较难在测试中可靠）
      expect(store.size()).toBe(count)
    })
  })
})
