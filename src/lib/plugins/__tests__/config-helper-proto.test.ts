/**
 * PluginConfigHelper 原型链污染防护测试
 *
 * 背景：`PluginConfigHelperImpl.set(key, value)` 按 '.' 分段遍历配置对象。
 * 如果 key 里含 `__proto__` / `constructor` / `prototype`，
 * 遍历就会走进 `Object.prototype` 并把属性写在**全局原型**上 ——
 * 之后所有对象都会带上这个属性，影响面远超本插件。
 *
 * 修复：`set()` 拒绝含危险路径段的 key，抛 `Unsafe config key`。
 * `get()` / `has()` 只读，不写原型，保持原行为。
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PluginConfigHelperImpl } from '../PluginSDK'

describe('PluginConfigHelperImpl 原型污染防护', () => {
  let helper: PluginConfigHelperImpl

  beforeEach(() => {
    helper = new PluginConfigHelperImpl({})
  })

  afterEach(() => {
    // 清理可能残留的污染属性（万一防护失效，用例要能干净地失败）
    delete (Object.prototype as Record<string, unknown>).polluted
    delete (Object.prototype as Record<string, unknown>).polluted2
    delete (Object.prototype as Record<string, unknown>).x
  })

  describe('set()', () => {
    it('应拒绝 __proto__ 路径段', () => {
      expect(() => helper.set('__proto__.polluted', 'PWNED')).toThrow(/Unsafe config key/)
    })

    it('应拒绝 constructor 路径段', () => {
      expect(() => helper.set('constructor.prototype.polluted2', 'PWNED')).toThrow(
        /Unsafe config key/
      )
    })

    it('应拒绝 prototype 作为末段', () => {
      expect(() => helper.set('prototype', 'PWNED')).toThrow(/Unsafe config key/)
    })

    it('污染被拒后 Object.prototype 不应被改动', () => {
      try {
        helper.set('__proto__.polluted', 'PWNED')
      } catch {
        /* 预期抛错 */
      }
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    })

    it('正常嵌套 key 应照常写入', () => {
      helper.set('a.b.c', 42)
      expect(helper.get('a.b.c')).toBe(42)
    })

    it('含危险词的普通 key 不应被误伤', () => {
      // "my__proto__key" 这类正常标识符不含危险段，不该被拦
      helper.set('my__proto__key', 'ok')
      expect(helper.get('my__proto__key')).toBe('ok')
    })
  })

  describe('get() / has()', () => {
    it('get 应正常读取嵌套值', () => {
      helper.set('x.y', 'v')
      expect(helper.get('x.y')).toBe('v')
    })

    it('get 对不存在的 key 返回 undefined', () => {
      expect(helper.get('nope.nope')).toBeUndefined()
    })

    it('has 应正确报告存在性', () => {
      helper.set('x.y', 'v')
      expect(helper.has('x.y')).toBe(true)
      expect(helper.has('x.z')).toBe(false)
    })
  })
})
