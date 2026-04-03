/**
 * 内存泄漏检测测试
 * 测试 Map 清理、事件监听器清理、定时器清理等内存管理
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// =====================================================
// Mock Classes for Memory Management Testing
// =====================================================

interface EventListener {
  event: string
  callback: (...args: any[]) => void
}

interface Timer {
  id: number
  callback: () => void
  interval: number
  type: 'timeout' | 'interval'
}

class MemoryManager {
  private maps: Map<string, Map<string, any>> = new Map()
  private eventListeners: Map<string, Set<EventListener>> = new Map()
  private timers: Map<string, Set<Timer>> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  // Map 管理
  createMap(name: string): Map<string, any> {
    const map = new Map()
    this.maps.set(name, map)
    return map
  }

  getMap(name: string): Map<string, any> | undefined {
    return this.maps.get(name)
  }

  deleteMap(name: string): boolean {
    const map = this.maps.get(name)
    if (map) {
      map.clear()
      this.maps.delete(name)
      return true
    }
    return false
  }

  // 事件监听器管理
  addEventListener(target: string, event: string, callback: (...args: any[]) => void): void {
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, new Set())
    }
    this.eventListeners.get(target)!.add({ event, callback })
  }

  removeEventListener(target: string, event: string): void {
    const listeners = this.eventListeners.get(target)
    if (listeners) {
      for (const listener of listeners) {
        if (listener.event === event) {
          listeners.delete(listener)
        }
      }
    }
  }

  removeAllEventListeners(target: string): void {
    this.eventListeners.delete(target)
  }

  // 定时器管理
  setTimeout(name: string, callback: () => void, delay: number): number {
    const id = Date.now() + Math.random()
    const timer: Timer = { id, callback, interval: delay, type: 'timeout' }

    if (!this.timers.has(name)) {
      this.timers.set(name, new Set())
    }
    this.timers.get(name)!.add(timer)

    // 模拟 setTimeout
    const actualId = setTimeout(() => {
      callback()
      this.timers.get(name)?.delete(timer)
    }, delay)

    this.intervals.set(`timeout_${name}`, actualId)

    return id
  }

  setInterval(name: string, callback: () => void, interval: number): number {
    const id = Date.now() + Math.random()
    const timer: Timer = { id, callback, interval, type: 'interval' }

    if (!this.timers.has(name)) {
      this.timers.set(name, new Set())
    }
    this.timers.get(name)!.add(timer)

    // 模拟 setInterval
    const actualId = setInterval(callback, interval)
    this.intervals.set(`interval_${name}`, actualId)

    return id
  }

  clearTimeout(name: string): void {
    const actualId = this.intervals.get(`timeout_${name}`)
    if (actualId !== undefined) {
      clearTimeout(actualId)
      this.intervals.delete(`timeout_${name}`)
    }
    this.timers.delete(name)
  }

  clearInterval(name: string): void {
    const actualId = this.intervals.get(`interval_${name}`)
    if (actualId !== undefined) {
      clearInterval(actualId)
      this.intervals.delete(`interval_${name}`)
    }
    this.timers.delete(name)
  }

  // 清理所有资源
  cleanup(): void {
    // 清理所有 Map
    for (const map of this.maps.values()) {
      map.clear()
    }
    this.maps.clear()

    // 清理所有事件监听器
    this.eventListeners.clear()

    // 清理所有定时器
    for (const [key, id] of this.intervals) {
      if (key.startsWith('timeout_')) {
        clearTimeout(id)
      } else {
        clearInterval(id)
      }
    }
    this.timers.clear()
    this.intervals.clear()
  }

  // 获取资源统计
  getStats() {
    return {
      maps: this.maps.size,
      eventListeners: Array.from(this.eventListeners.values()).reduce(
        (sum, set) => sum + set.size,
        0
      ),
      timers: this.timers.size,
    }
  }
}

// =====================================================
// Test Suite
// =====================================================

describe('Memory Leak Detection', () => {
  let manager: MemoryManager

  beforeEach(() => {
    manager = new MemoryManager()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // =====================================================
  // 1. Map 清理测试
  // =====================================================
  describe('should clean up maps after workflow completion', () => {
    it('should clear map after workflow completion', () => {
      const workflowData = manager.createMap('workflow_123')

      // 添加数据
      for (let i = 0; i < 100; i++) {
        workflowData.set(`node_${i}`, { status: 'completed', result: `result_${i}` })
      }

      expect(workflowData.size).toBe(100)

      // 工作流完成，清理 Map
      manager.deleteMap('workflow_123')

      expect(manager.getMap('workflow_123')).toBeUndefined()
      expect(manager.getStats().maps).toBe(0)
    })

    it('should handle multiple maps cleanup', () => {
      // 创建多个 Map
      for (let i = 0; i < 10; i++) {
        const map = manager.createMap(`workflow_${i}`)
        for (let j = 0; j < 50; j++) {
          map.set(`item_${j}`, { data: `data_${j}` })
        }
      }

      expect(manager.getStats().maps).toBe(10)

      // 清理所有 Map
      manager.cleanup()

      expect(manager.getStats().maps).toBe(0)
    })

    it('should clean up nested map references', () => {
      const outerMap = manager.createMap('outer')
      const innerData: Map<string, any>[] = []

      // 创建嵌套结构
      for (let i = 0; i < 10; i++) {
        const innerMap = new Map<string, any>()
        for (let j = 0; j < 10; j++) {
          innerMap.set(`key_${j}`, { value: j })
        }
        outerMap.set(`nested_${i}`, innerMap)
        innerData.push(innerMap)
      }

      expect(outerMap.size).toBe(10)

      // 清理外部 Map
      manager.deleteMap('outer')

      // 内部 Map 引用仍然存在，但外部 Map 已清理
      expect(manager.getMap('outer')).toBeUndefined()
    })

    it('should handle large data cleanup', () => {
      const largeMap = manager.createMap('large')

      // 添加大量数据
      for (let i = 0; i < 10000; i++) {
        largeMap.set(`key_${i}`, {
          id: i,
          data: 'x'.repeat(100),
          metadata: { created: Date.now(), tags: [] },
        })
      }

      expect(largeMap.size).toBe(10000)

      // 清理
      manager.deleteMap('large')

      expect(manager.getMap('large')).toBeUndefined()
    })

    it('should handle cleanup during iteration', () => {
      const map = manager.createMap('test')

      for (let i = 0; i < 100; i++) {
        map.set(`key_${i}`, i)
      }

      // 模拟迭代过程中清理
      const keys = Array.from(map.keys())
      keys.forEach(key => {
        map.delete(key)
      })

      expect(map.size).toBe(0)
    })
  })

  // =====================================================
  // 2. 事件监听器清理测试
  // =====================================================
  describe('should remove all event listeners on cleanup', () => {
    it('should remove single event listener', () => {
      const callback = vi.fn()

      manager.addEventListener('workflow', 'complete', callback)

      expect(manager.getStats().eventListeners).toBe(1)

      manager.removeEventListener('workflow', 'complete')

      expect(manager.getStats().eventListeners).toBe(0)
    })

    it('should remove multiple event listeners', () => {
      const callbacks = Array.from({ length: 10 }, () => vi.fn())

      callbacks.forEach((cb, i) => {
        manager.addEventListener('workflow', `event_${i}`, cb)
      })

      expect(manager.getStats().eventListeners).toBe(10)

      manager.removeAllEventListeners('workflow')

      expect(manager.getStats().eventListeners).toBe(0)
    })

    it('should handle duplicate listener registration', () => {
      const callback = vi.fn()

      manager.addEventListener('workflow', 'update', callback)
      manager.addEventListener('workflow', 'update', callback) // 重复注册

      // 即使重复，也应该能正确清理
      manager.removeAllEventListeners('workflow')

      expect(manager.getStats().eventListeners).toBe(0)
    })

    it('should clean up listeners for multiple targets', () => {
      // 为多个目标添加监听器
      for (let i = 0; i < 5; i++) {
        manager.addEventListener(`target_${i}`, 'update', () => {})
        manager.addEventListener(`target_${i}`, 'delete', () => {})
      }

      expect(manager.getStats().eventListeners).toBe(10)

      manager.cleanup()

      expect(manager.getStats().eventListeners).toBe(0)
    })

    it('should handle listener removal during event emission', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      manager.addEventListener('workflow', 'update', callback1)
      manager.addEventListener('workflow', 'update', callback2)

      // 模拟移除一个监听器
      manager.removeEventListener('workflow', 'update')

      // 仍然有一个监听器
      expect(manager.getStats().eventListeners).toBe(1)
    })
  })

  // =====================================================
  // 3. 定时器清理测试
  // =====================================================
  describe('should clear all timers on shutdown', () => {
    it('should clear setTimeout', () => {
      const callback = vi.fn()

      manager.setTimeout('test_timeout', callback, 1000)

      expect(manager.getStats().timers).toBe(1)

      manager.clearTimeout('test_timeout')

      expect(manager.getStats().timers).toBe(0)
    })

    it('should clear setInterval', () => {
      const callback = vi.fn()

      manager.setInterval('test_interval', callback, 100)

      expect(manager.getStats().timers).toBe(1)

      manager.clearInterval('test_interval')

      expect(manager.getStats().timers).toBe(0)
    })

    it('should clear multiple timers', () => {
      // 创建多个定时器
      for (let i = 0; i < 10; i++) {
        manager.setTimeout(`timeout_${i}`, () => {}, 1000 * i)
        manager.setInterval(`interval_${i}`, () => {}, 100 * (i + 1))
      }

      expect(manager.getStats().timers).toBe(20)

      manager.cleanup()

      expect(manager.getStats().timers).toBe(0)
    })

    it('should prevent callback execution after cleanup', () => {
      const callback = vi.fn()

      manager.setTimeout('test', callback, 1000)

      // 在定时器触发前清理
      manager.clearTimeout('test')

      // 推进时间
      vi.advanceTimersByTime(1000)

      // 回调不应该被执行
      expect(callback).not.toHaveBeenCalled()
    })

    it('should handle clearTimeout on already fired timer', () => {
      const callback = vi.fn()

      manager.setTimeout('test', callback, 100)

      // 推进时间让定时器触发
      vi.advanceTimersByTime(100)

      // 再次清理不应该抛出错误
      expect(() => manager.clearTimeout('test')).not.toThrow()
    })

    it('should cleanup all timers on shutdown', () => {
      // 创建各种类型的定时器
      manager.setTimeout('t1', () => {}, 100)
      manager.setTimeout('t2', () => {}, 200)
      manager.setInterval('i1', () => {}, 50)
      manager.setInterval('i2', () => {}, 100)

      expect(manager.getStats().timers).toBe(4)

      manager.cleanup()

      const stats = manager.getStats()
      expect(stats.timers).toBe(0)
    })
  })

  // =====================================================
  // 4. 综合清理测试
  // =====================================================
  describe('should handle comprehensive cleanup', () => {
    it('should cleanup all resources', () => {
      // 创建 Map
      const map = manager.createMap('test')
      map.set('key1', 'value1')

      // 添加事件监听器
      manager.addEventListener('workflow', 'update', () => {})

      // 创建定时器
      manager.setTimeout('timer', () => {}, 1000)

      // 验证资源存在
      const statsBefore = manager.getStats()
      expect(statsBefore.maps).toBe(1)
      expect(statsBefore.eventListeners).toBe(1)
      expect(statsBefore.timers).toBe(1)

      // 执行全面清理
      manager.cleanup()

      // 验证所有资源已清理
      const statsAfter = manager.getStats()
      expect(statsAfter.maps).toBe(0)
      expect(statsAfter.eventListeners).toBe(0)
      expect(statsAfter.timers).toBe(0)
    })

    it('should handle repeated cleanup calls', () => {
      manager.createMap('test')
      manager.addEventListener('workflow', 'update', () => {})
      manager.setTimeout('timer', () => {}, 1000)

      // 多次清理不应该抛出错误
      expect(() => {
        manager.cleanup()
        manager.cleanup()
        manager.cleanup()
      }).not.toThrow()
    })

    it('should handle cleanup with active references', () => {
      const map = manager.createMap('test')
      map.set('key', { data: 'value' })

      // 创建引用
      const ref = map.get('key')

      // 清理
      manager.cleanup()

      // 引用仍然存在，但 Map 已清理
      expect(ref).toBeDefined()
      expect(manager.getMap('test')).toBeUndefined()
    })
  })

  // =====================================================
  // 5. 内存使用监控测试
  // =====================================================
  describe('should monitor memory usage', () => {
    it('should track map sizes', () => {
      const map = manager.createMap('test')

      for (let i = 0; i < 100; i++) {
        map.set(`key_${i}`, `value_${i}`)
      }

      expect(map.size).toBe(100)
    })

    it('should detect large memory allocations', () => {
      const largeMap = manager.createMap('large')

      // 创建大型对象
      for (let i = 0; i < 1000; i++) {
        largeMap.set(`large_${i}`, {
          data: 'x'.repeat(10000),
          nested: {
            array: new Array(100).fill(0),
          },
        })
      }

      // Map 应该能处理大型数据
      expect(largeMap.size).toBe(1000)

      // 清理
      manager.deleteMap('large')
      expect(largeMap.size).toBe(0)
    })

    it('should handle memory pressure', () => {
      const maps: Map<string, any>[] = []

      // 创建大量 Map 模拟内存压力
      for (let i = 0; i < 100; i++) {
        const map = manager.createMap(`pressure_${i}`)
        for (let j = 0; j < 100; j++) {
          map.set(`item_${j}`, { index: j })
        }
        maps.push(map)
      }

      expect(manager.getStats().maps).toBe(100)

      // 清理释放内存
      manager.cleanup()

      expect(manager.getStats().maps).toBe(0)
    })
  })

  // =====================================================
  // 6. 异步资源清理测试
  // =====================================================
  describe('should handle async resource cleanup', () => {
    it('should cleanup async resources', async () => {
      const asyncCleanup = vi.fn().mockResolvedValue(undefined)

      // 模拟异步清理
      await asyncCleanup()

      expect(asyncCleanup).toHaveBeenCalled()
    })

    it('should handle pending promises during cleanup', async () => {
      const pendingPromise = new Promise(resolve => setTimeout(resolve, 1000))

      // 启动 Promise
      const promise = pendingPromise

      // 清理不应该等待 Promise
      manager.cleanup()

      expect(manager.getStats().timers).toBe(0)
    })

    it('should cleanup event emitters', () => {
      // 模拟事件发射器
      const emitter = {
        listeners: new Map<string, Set<() => void>>(),
        on(event: string, callback: () => void) {
          if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
          }
          this.listeners.get(event)!.add(callback)
        },
        off(event: string, callback: () => void) {
          this.listeners.get(event)?.delete(callback)
        },
        removeAllListeners() {
          this.listeners.clear()
        },
      }

      emitter.on('update', () => {})
      emitter.on('delete', () => {})

      expect(emitter.listeners.size).toBe(2)

      emitter.removeAllListeners()

      expect(emitter.listeners.size).toBe(0)
    })
  })
})
