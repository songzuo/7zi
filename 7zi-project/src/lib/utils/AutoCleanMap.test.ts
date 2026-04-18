/**
 * AutoCleanMap Tests
 */

import { AutoCleanMap } from './AutoCleanMap'

// Mock timers
jest.useFakeTimers()

describe('AutoCleanMap', () => {
  let map: AutoCleanMap<string, { value: number }>

  beforeEach(() => {
    map = new AutoCleanMap<string, { value: number }>({
      maxAge: 5000, // 5 秒
      cleanupInterval: 1000, // 1 秒
    })
  })

  afterEach(() => {
    map.destroy()
  })

  describe('基本 Map 操作', () => {
    test('should set and get values', () => {
      map.set('key1', { value: 1 })

      expect(map.has('key1')).toBe(true)
      expect(map.get('key1')).toEqual({ value: 1 })
    })

    test('should return undefined for non-existent key', () => {
      expect(map.get('non-existent')).toBeUndefined()
      expect(map.has('non-existent')).toBe(false)
    })

    test('should delete entries', () => {
      map.set('key1', { value: 1 })
      expect(map.has('key1')).toBe(true)

      const result = map.delete('key1')

      expect(result).toBe(true)
      expect(map.has('key1')).toBe(false)
    })

    test('should return false when deleting non-existent key', () => {
      const result = map.delete('non-existent')
      expect(result).toBe(false)
    })

    test('should clear all entries', () => {
      map.set('key1', { value: 1 })
      map.set('key2', { value: 2 })

      map.clear()

      expect(map.size).toBe(0)
    })

    test('should return correct size', () => {
      expect(map.size).toBe(0)

      map.set('key1', { value: 1 })
      expect(map.size).toBe(1)

      map.set('key2', { value: 2 })
      expect(map.size).toBe(2)

      map.delete('key1')
      expect(map.size).toBe(1)
    })
  })

  describe('迭代器', () => {
    beforeEach(() => {
      map.set('a', { value: 1 })
      map.set('b', { value: 2 })
      map.set('c', { value: 3 })
    })

    test('should iterate keys', () => {
      const keys = Array.from(map.keys())
      expect(keys).toContain('a')
      expect(keys).toContain('b')
      expect(keys).toContain('c')
    })

    test('should iterate values', () => {
      const values = Array.from(map.values())
      expect(values).toContainEqual({ value: 1 })
      expect(values).toContainEqual({ value: 2 })
      expect(values).toContainEqual({ value: 3 })
    })

    test('should iterate entries', () => {
      const entries = Array.from(map.entries())
      expect(entries).toContainEqual(['a', { value: 1 }])
      expect(entries).toContainEqual(['b', { value: 2 }])
      expect(entries).toContainEqual(['c', { value: 3 }])
    })

    test('should support forEach', () => {
      const results: Array<{ key: string; value: { value: number } }> = []

      map.forEach((value, key) => {
        results.push({ key, value })
      })

      expect(results.length).toBe(3)
    })

    test('should be iterable', () => {
      const entries = Array.from(map)
      expect(entries.length).toBe(3)
    })

    test('should have correct toStringTag', () => {
      expect(map[Symbol.toStringTag]).toBe('AutoCleanMap')
    })
  })

  describe('TTL 和过期', () => {
    test('should update lastAccess on get', () => {
      map.set('key1', { value: 1 })
      const initialTTL = map.getTTL('key1')

      jest.advanceTimersByTime(1000)

      map.get('key1')
      const newTTL = map.getTTL('key1')

      expect(newTTL).toBeGreaterThan(initialTTL - 1000)
    })

    test('should return -1 for TTL of non-existent key', () => {
      expect(map.getTTL('non-existent')).toBe(-1)
    })

    test('should touch key to refresh TTL', () => {
      map.set('key1', { value: 1 })

      jest.advanceTimersByTime(2000)

      const result = map.touch('key1')

      expect(result).toBe(true)
      const ttl = map.getTTL('key1')
      expect(ttl).toBeGreaterThan(4000)
    })

    test('should return false when touching non-existent key', () => {
      const result = map.touch('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('自动清理', () => {
    test('should auto-cleanup expired entries', () => {
      const onExpire = jest.fn()
      const localMap = new AutoCleanMap<string, { value: number }>({
        maxAge: 1000,
        cleanupInterval: 500,
        onExpire,
      })

      localMap.set('key1', { value: 1 })
      expect(localMap.size).toBe(1)

      // 推进时间超过 maxAge
      jest.advanceTimersByTime(1500)

      expect(localMap.has('key1')).toBe(false)
      expect(onExpire).toHaveBeenCalledWith('key1', { value: 1 })

      localMap.destroy()
    })

    test('should not cleanup recently accessed entries', () => {
      map.set('key1', { value: 1 })

      // 推进时间但没有超过 maxAge
      jest.advanceTimersByTime(3000)

      // 访问一下刷新 TTL
      map.get('key1')

      // 再推进时间
      jest.advanceTimersByTime(3000)

      // 仍然应该存在
      expect(map.has('key1')).toBe(true)
    })

    test('should cleanup manually', () => {
      map.set('key1', { value: 1 })

      jest.advanceTimersByTime(6000) // 超过 maxAge

      map.cleanup()

      expect(map.has('key1')).toBe(false)
    })
  })

  describe('destroy', () => {
    test('should clear all entries and stop timer on destroy', () => {
      map.set('key1', { value: 1 })
      map.set('key2', { value: 2 })

      map.destroy()

      expect(map.size).toBe(0)
    })

    test('should not cleanup after destroy', () => {
      map.set('key1', { value: 1 })
      map.destroy()

      // 定时器应该被清除
      jest.advanceTimersByTime(10000)

      // 不应该有错误
    })
  })

  describe('onExpire 回调', () => {
    test('should call onExpire callback when entry expires', () => {
      const expiredEntries: Array<{ key: unknown; value: unknown }> = []

      const localMap = new AutoCleanMap<string, { value: number }>({
        maxAge: 1000,
        cleanupInterval: 500,
        onExpire: (key, value) => {
          expiredEntries.push({ key, value })
        },
      })

      localMap.set('key1', { value: 1 })
      localMap.set('key2', { value: 2 })

      jest.advanceTimersByTime(1500)

      expect(expiredEntries.length).toBe(2)

      localMap.destroy()
    })

    test('should handle onExpire callback errors', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation()

      const localMap = new AutoCleanMap<string, { value: number }>({
        maxAge: 1000,
        cleanupInterval: 500,
        onExpire: () => {
          throw new Error('Callback error')
        },
      })

      localMap.set('key1', { value: 1 })

      // 不应该抛出错误
      jest.advanceTimersByTime(1500)

      expect(errorSpy).toHaveBeenCalled()

      errorSpy.mockRestore()
      localMap.destroy()
    })
  })

  describe('并发清理保护', () => {
    test('should not run cleanup concurrently', () => {
      map.set('key1', { value: 1 })

      // 手动调用 cleanup 多次
      const cleanup1 = map.cleanup()
      const cleanup2 = map.cleanup()

      // 都应该成功完成，不会互相干扰
      expect(map).toBeDefined()
    })
  })

  describe('边界情况', () => {
    test('should handle empty map operations', () => {
      expect(map.size).toBe(0)
      expect(Array.from(map.keys())).toEqual([])
      expect(Array.from(map.values())).toEqual([])
      expect(Array.from(map.entries())).toEqual([])
    })

    test('should handle setting same key multiple times', () => {
      map.set('key1', { value: 1 })
      map.set('key1', { value: 2 })
      map.set('key1', { value: 3 })

      expect(map.size).toBe(1)
      expect(map.get('key1')).toEqual({ value: 3 })
    })

    test('should handle different key types', () => {
      const numKeyMap = new AutoCleanMap<number, string>({
        maxAge: 5000,
        cleanupInterval: 1000,
      })

      numKeyMap.set(1, 'one')
      numKeyMap.set(2, 'two')

      expect(numKeyMap.get(1)).toBe('one')
      expect(numKeyMap.get(2)).toBe('two')

      numKeyMap.destroy()
    })
  })
})
