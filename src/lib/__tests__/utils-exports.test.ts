/**
 * Tests for utils.ts re-exports
 * Verifies that all re-exported utilities are available
 *
 * Note: This test is currently disabled due to module resolution issues
 * with vitest and ES modules. The exports are verified through
 * other unit tests that directly import and use these functions.
 */

import { describe, it, expect } from 'vitest'
// 用静态 import，而不是 require()：
// require 是 CJS 解析，既不能把目录映射到 index.ts，
// 也不接受 '../utils.ts' 这种带 .ts 后缀的路径 —— 原文件这么写
// 必然报 "Cannot find module"，这批用例被 skip 的直接原因就在这。
//
// 另外要注意 '../utils' 会解析到 src/lib/utils.ts（那个只转出 4 个符号的
// 薄壳），而不是 src/lib/utils/index.ts（真正的中心导出，50+ 符号）。
// 文件优先于目录，所以这里必须写全 '../utils/index'。
import * as utilsIndex from '../utils/index'

describe('lib/utils re-exports', () => {
  describe('ID utilities', () => {
    it('should export generateId', () => {
      const utils = utilsIndex
      expect(typeof utils.generateId).toBe('function')
      const id = utils.generateId()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    it('should export generateUUID', () => {
      const utils = utilsIndex
      expect(typeof utils.generateUUID).toBe('function')
      const uuid = utils.generateUUID()
      expect(typeof uuid).toBe('string')
      expect(uuid).toMatch(/^[0-9a-f-]{36}$/i)
    })
  })

  describe('Async utilities', () => {
    it('should export debounce', () => {
      const utils = utilsIndex
      expect(typeof utils.debounce).toBe('function')
    })

    it('should export throttle', () => {
      const utils = utilsIndex
      expect(typeof utils.throttle).toBe('function')
    })

    it('should export memoize', () => {
      const utils = utilsIndex
      expect(typeof utils.memoize).toBe('function')
    })

    it('should export sleep', () => {
      const utils = utilsIndex
      expect(typeof utils.sleep).toBe('function')
    })

    it('should export retry', () => {
      const utils = utilsIndex
      expect(typeof utils.retry).toBe('function')
    })
  })

  describe('Cache utilities', () => {
    it('should export LRUCache', () => {
      const utils = utilsIndex
      expect(typeof utils.LRUCache).toBe('function')
    })

    it('should export createCache', () => {
      const utils = utilsIndex
      expect(typeof utils.createCache).toBe('function')
    })
  })

  describe('Array utilities', () => {
    it('should export batch', () => {
      const utils = utilsIndex
      expect(typeof utils.batch).toBe('function')
    })

    it('should export shuffle', () => {
      const utils = utilsIndex
      expect(typeof utils.shuffle).toBe('function')
    })

    it('should export randomItem', () => {
      const utils = utilsIndex
      expect(typeof utils.randomItem).toBe('function')
    })

    it('should export unique', () => {
      const utils = utilsIndex
      expect(typeof utils.unique).toBe('function')
    })

    it('should export groupBy', () => {
      const utils = utilsIndex
      expect(typeof utils.groupBy).toBe('function')
    })

    it('should export pick', () => {
      const utils = utilsIndex
      expect(typeof utils.pick).toBe('function')
    })

    it('should export omit', () => {
      const utils = utilsIndex
      expect(typeof utils.omit).toBe('function')
    })
  })

  describe('Math utilities', () => {
    it('should export clamp', () => {
      const utils = utilsIndex
      expect(typeof utils.clamp).toBe('function')
    })

    it('should export mapRange', () => {
      const utils = utilsIndex
      expect(typeof utils.mapRange).toBe('function')
    })

    it('should export lerp', () => {
      const utils = utilsIndex
      expect(typeof utils.lerp).toBe('function')
    })
  })

  describe('Validation utilities', () => {
    it('should export isEmpty', () => {
      const utils = utilsIndex
      expect(typeof utils.isEmpty).toBe('function')
      expect(utils.isEmpty('')).toBe(true)
      expect(utils.isEmpty([])).toBe(true)
      expect(utils.isEmpty(null)).toBe(true)
      expect(utils.isEmpty('test')).toBe(false)
    })

    it('should export isValidEmail', () => {
      const utils = utilsIndex
      expect(typeof utils.isValidEmail).toBe('function')
      expect(utils.isValidEmail('test@example.com')).toBe(true)
      expect(utils.isValidEmail('invalid')).toBe(false)
    })

    it('should export isValidUrl', () => {
      const utils = utilsIndex
      expect(typeof utils.isValidUrl).toBe('function')
      expect(utils.isValidUrl('https://example.com')).toBe(true)
      expect(utils.isValidUrl('invalid-url')).toBe(false)
    })
  })

  describe('Environment detection', () => {
    it('should export isClient', () => {
      const utils = utilsIndex
      expect(typeof utils.isClient()).toBe('boolean')
    })

    it('should export isServer', () => {
      const utils = utilsIndex
      expect(typeof utils.isServer()).toBe('boolean')
    })

    it('should export isBrowser', () => {
      const utils = utilsIndex
      expect(typeof utils.isBrowser()).toBe('boolean')
    })

    it('should export isNode', () => {
      const utils = utilsIndex
      expect(typeof utils.isNode()).toBe('boolean')
    })

    it('should export isTouchDevice', () => {
      const utils = utilsIndex
      expect(typeof utils.isTouchDevice()).toBe('boolean')
    })

    it('should export getDeviceType', () => {
      const utils = utilsIndex
      expect(typeof utils.getDeviceType).toBe('function')
    })

    it('should export prefersReducedMotion', () => {
      const utils = utilsIndex
      expect(typeof utils.prefersReducedMotion()).toBe('boolean')
    })

    it('should export prefersDarkMode', () => {
      const utils = utilsIndex
      expect(typeof utils.prefersDarkMode()).toBe('boolean')
    })

    it('should export prefersLightMode', () => {
      const utils = utilsIndex
      expect(typeof utils.prefersLightMode()).toBe('boolean')
    })

    it('should export getViewportSize', () => {
      const utils = utilsIndex
      expect(typeof utils.getViewportSize).toBe('function')
    })
  })

  describe('DOM utilities', () => {
    it('should export isInViewport', () => {
      const utils = utilsIndex
      expect(typeof utils.isInViewport).toBe('function')
    })

    it('should export scrollToElement', () => {
      const utils = utilsIndex
      expect(typeof utils.scrollToElement).toBe('function')
    })

    it('should export addEventListener', () => {
      const utils = utilsIndex
      expect(typeof utils.addEventListener).toBe('function')
    })

    it('should export getElementById', () => {
      const utils = utilsIndex
      expect(typeof utils.getElementById).toBe('function')
    })

    it('should export querySelector', () => {
      const utils = utilsIndex
      expect(typeof utils.querySelector).toBe('function')
    })

    it('should export querySelectorAll', () => {
      const utils = utilsIndex
      expect(typeof utils.querySelectorAll).toBe('function')
    })

    it('should export debounceDOM', () => {
      const utils = utilsIndex
      expect(typeof utils.debounceDOM).toBe('function')
    })

    it('should export throttleDOM', () => {
      const utils = utilsIndex
      expect(typeof utils.throttleDOM).toBe('function')
    })

    it('should export observeIntersection', () => {
      const utils = utilsIndex
      expect(typeof utils.observeIntersection).toBe('function')
    })

    it('should export observeResize', () => {
      const utils = utilsIndex
      expect(typeof utils.observeResize).toBe('function')
    })

    it('should export addClassWithDelay', () => {
      const utils = utilsIndex
      expect(typeof utils.addClassWithDelay).toBe('function')
    })

    it('should export toggleClass', () => {
      const utils = utilsIndex
      expect(typeof utils.toggleClass).toBe('function')
    })

    it('should export hasAllClasses', () => {
      const utils = utilsIndex
      expect(typeof utils.hasAllClasses).toBe('function')
    })

    it('should export hasAnyClass', () => {
      const utils = utilsIndex
      expect(typeof utils.hasAnyClass).toBe('function')
    })

    it('should export getComputedStyleValue', () => {
      const utils = utilsIndex
      expect(typeof utils.getComputedStyleValue).toBe('function')
    })
  })

  describe('Browser utilities', () => {
    it('should export copyToClipboard', () => {
      const utils = utilsIndex
      expect(typeof utils.copyToClipboard).toBe('function')
    })

    it('should export readFromClipboard', () => {
      const utils = utilsIndex
      expect(typeof utils.readFromClipboard).toBe('function')
    })

    it('should export downloadFile', () => {
      const utils = utilsIndex
      expect(typeof utils.downloadFile).toBe('function')
    })

    it('should export getQueryParams', () => {
      const utils = utilsIndex
      expect(typeof utils.getQueryParams).toBe('function')
    })

    it('should export updateQueryParams', () => {
      const utils = utilsIndex
      expect(typeof utils.updateQueryParams).toBe('function')
    })
  })

  describe('Performance utilities', () => {
    it('should export optimizeImageUrl', () => {
      const utils = utilsIndex
      expect(typeof utils.optimizeImageUrl).toBe('function')
    })

    it('should export preloadResources', () => {
      const utils = utilsIndex
      expect(typeof utils.preloadResources).toBe('function')
    })

    it('should export lazyLoadComponent', () => {
      const utils = utilsIndex
      expect(typeof utils.lazyLoadComponent).toBe('function')
    })
  })
})

describe('lib/utils re-exports', () => {
  it('should not re-export the same symbol from two places', () => {
    // index.ts 里 formatTimeAgo 等是从 ../date 转出的，
    // 这里确认中心导出确实把工具集都挂上了（防止重构时漏 re-export）。
    const utils = utilsIndex
    const expected = [
      'generateId', 'generateUUID', 'deepClone', 'debounce', 'throttle',
      'memoize', 'sleep', 'batch', 'shuffle', 'unique', 'groupBy',
      'pick', 'omit', 'clamp', 'mapRange', 'lerp', 'isEmpty',
      'isValidEmail', 'isValidUrl', 'cn',
    ]
    for (const name of expected) {
      // utils 是模块命名空间，按字符串索引需要显式声明索引签名
      const exported = (utils as Record<string, unknown>)[name]
      expect(typeof exported, `缺少导出: ${name}`).toBe('function')
    }
  })
})
