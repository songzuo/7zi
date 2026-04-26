/**
 * Collaboration Utils ID Functions Tests
 * 测试 src/lib/collab/utils/id.ts 中的工具函数
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateId,
  stringToColor,
  debounce,
  throttle,
  deepClone,
  mergeVectorClocks,
  compareVectorClocks,
  positionFromLineColumn,
  lineColumnFromPosition,
  formatTimestamp,
  timeDifference,
} from '@/lib/collab/utils/id'

describe('Collaboration ID Utils', () => {
  // ============ generateId tests ============
  describe('generateId', () => {
    it('应该生成唯一ID', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })

    it('应该包含时间戳和随机字符串', () => {
      const id = generateId()
      const parts = id.split('-')
      expect(parts.length).toBeGreaterThanOrEqual(2)
      expect(parts[0]).toMatch(/^\d+$/) // 时间戳部分应该是数字
    })
  })

  // ============ stringToColor tests ============
  describe('stringToColor', () => {
    it('应该为相同字符串返回相同颜色', () => {
      const color1 = stringToColor('test')
      const color2 = stringToColor('test')
      expect(color1).toBe(color2)
    })

    it('应该为不同字符串返回不同颜色', () => {
      const color1 = stringToColor('user1')
      const color2 = stringToColor('user2')
      expect(color1).not.toBe(color2)
    })

    it('应该返回有效的十六进制颜色', () => {
      const color = stringToColor('anyString')
      expect(color).toMatch(/^#[0-9A-F]{6}$/i)
    })

    it('应该为常用字符串生成一致颜色', () => {
      // 测试一些边界情况
      expect(stringToColor('')).toMatch(/^#[0-9A-F]{6}$/i)
      expect(stringToColor('a')).toMatch(/^#[0-9A-F]{6}$/i)
      expect(stringToColor('longer string with spaces')).toMatch(/^#[0-9A-F]{6}$/i)
    })
  })

  // ============ deepClone tests ============
  describe('deepClone', () => {
    it('应该正确克隆简单对象', () => {
      const original = { name: 'test', value: 123 }
      const cloned = deepClone(original)
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
    })

    it('应该正确克隆嵌套对象', () => {
      const original = { user: { name: 'test', scores: [1, 2, 3] } }
      const cloned = deepClone(original)
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
      expect(cloned.user).not.toBe(original.user)
    })

    it('应该处理null值', () => {
      const original = { data: null }
      const cloned = deepClone(original)
      expect(cloned.data).toBeNull()
    })

    it('应该正确克隆数组', () => {
      const original = [1, [2, 3], { a: 4 }]
      const cloned = deepClone(original)
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
      expect(cloned[1]).not.toBe(original[1])
    })
  })

  // ============ mergeVectorClocks tests ============
  describe('mergeVectorClocks', () => {
    it('应该合并两个空时钟', () => {
      const clock1 = new Map<string, number>()
      const clock2 = new Map<string, number>()
      const merged = mergeVectorClocks(clock1, clock2)
      expect(merged.size).toBe(0)
    })

    it('应该合并两个时钟，保留最大值', () => {
      const clock1 = new Map<string, number>([['a', 1], ['b', 2]])
      const clock2 = new Map<string, number>([['b', 3], ['c', 4]])
      const merged = mergeVectorClocks(clock1, clock2)
      expect(merged.get('a')).toBe(1)
      expect(merged.get('b')).toBe(3) // max(2, 3)
      expect(merged.get('c')).toBe(4)
    })

    it('应该处理只有一边有的键', () => {
      const clock1 = new Map<string, number>([['onlyIn1', 5]])
      const clock2 = new Map<string, number>()
      const merged = mergeVectorClocks(clock1, clock2)
      expect(merged.get('onlyIn1')).toBe(5)
    })
  })

  // ============ compareVectorClocks tests ============
  describe('compareVectorClocks', () => {
    it('应该返回0当两个时钟相等', () => {
      const clock1 = new Map<string, number>([['a', 1], ['b', 2]])
      const clock2 = new Map<string, number>([['a', 1], ['b', 2]])
      expect(compareVectorClocks(clock1, clock2)).toBe(0)
    })

    it('应该返回1当clock1大于clock2', () => {
      const clock1 = new Map<string, number>([['a', 2], ['b', 2]])
      const clock2 = new Map<string, number>([['a', 1], ['b', 2]])
      expect(compareVectorClocks(clock1, clock2)).toBe(1)
    })

    it('应该返回-1当clock1小于clock2', () => {
      const clock1 = new Map<string, number>([['a', 1], ['b', 2]])
      const clock2 = new Map<string, number>([['a', 2], ['b', 2]])
      expect(compareVectorClocks(clock1, clock2)).toBe(-1)
    })

    it('应该处理空时钟', () => {
      const clock1 = new Map<string, number>()
      const clock2 = new Map<string, number>()
      expect(compareVectorClocks(clock1, clock2)).toBe(0)
    })
  })

  // ============ formatTimestamp tests ============
  describe('formatTimestamp', () => {
    it('应该格式化时间戳', () => {
      const timestamp = new Date('2026-04-26T00:00:00Z').getTime()
      const formatted = formatTimestamp(timestamp)
      expect(typeof formatted).toBe('string')
      expect(formatted.length).toBeGreaterThan(0)
    })
  })

  // ============ timeDifference tests ============
  describe('timeDifference', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-04-26T00:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('应该正确计算秒级差异', () => {
      const timestamp = Date.now() - 30000 // 30秒前
      expect(timeDifference(timestamp)).toBe('30s ago')
    })

    it('应该正确计算分钟级差异', () => {
      const timestamp = Date.now() - 60000 // 1分钟前
      expect(timeDifference(timestamp)).toBe('1m ago')
    })

    it('应该正确计算小时级差异', () => {
      const timestamp = Date.now() - 3600000 // 1小时前
      expect(timeDifference(timestamp)).toBe('1h ago')
    })

    it('应该正确计算天级差异', () => {
      const timestamp = Date.now() - 86400000 // 1天前
      expect(timeDifference(timestamp)).toBe('1d ago')
    })

    it('应该处理刚刚的情况', () => {
      const timestamp = Date.now()
      expect(timeDifference(timestamp)).toBe('0s ago')
    })
  })
})
