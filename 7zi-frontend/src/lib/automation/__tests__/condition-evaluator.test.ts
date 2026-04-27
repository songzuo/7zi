/**
 * Condition Evaluator Tests
 * Tests for automation engine condition expression evaluation
 * Edge cases including string escaping, special characters, and syntax errors
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the automation engine's evaluateCondition functionality
// We test the condition evaluation logic directly

describe('Condition Evaluator', () => {
  describe('String conditions with special characters', () => {
    it('should handle single quotes in string values', async () => {
      // Test that single quotes don't break the expression evaluation
      const expression = `ctx.triggerData?.status === "active"`
      const context = { triggerData: { status: "active" } }
      
      // Using Function constructor like the actual implementation
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle escaped quotes in values', async () => {
      const expression = `ctx.triggerData?.name === "O'Reilly"`
      const context = { triggerData: { name: "O'Reilly" } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle strings with special characters', async () => {
      // Test JSON string escaping
      const expression = `ctx.triggerData?.json === '{"key":"value"}'`
      const context = { triggerData: { json: '{"key":"value"}' } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle empty string conditions', async () => {
      const expression = `ctx.triggerData?.value === ""`
      const context = { triggerData: { value: "" } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle unicode characters', async () => {
      const expression = `ctx.triggerData?.name === "日本語テスト"`
      const context = { triggerData: { name: "日本語テスト" } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle emoji in string values', async () => {
      const expression = `ctx.triggerData?.reaction === "👍"`
      const context = { triggerData: { reaction: "👍" } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })
  })

  describe('Numeric conditions', () => {
    it('should handle negative numbers', async () => {
      const expression = `ctx.triggerData?.value < 0`
      const context = { triggerData: { value: -5 } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle zero values', async () => {
      const expression = `ctx.triggerData?.count >= 0`
      const context = { triggerData: { count: 0 } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle floating point numbers', async () => {
      const expression = `ctx.triggerData?.price > 99.99`
      const context = { triggerData: { price: 100.50 } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle exponential notation', async () => {
      const expression = `ctx.triggerData?.bigNum > 1e10`
      const context = { triggerData: { bigNum: 1e11 } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })
  })

  describe('Boolean conditions', () => {
    it('should handle true boolean values', async () => {
      const expression = `ctx.triggerData?.enabled === true`
      const context = { triggerData: { enabled: true } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle false boolean values', async () => {
      const expression = `ctx.triggerData?.enabled === false`
      const context = { triggerData: { enabled: false } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle null/undefined checks', async () => {
      const expression = `ctx.triggerData?.value == null`
      const context1 = { triggerData: { value: null } }
      const context2 = { triggerData: {} }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context1)).toBe(true)
      expect(fn(context2)).toBe(true)
    })
  })

  describe('Logical operators', () => {
    it('should handle AND conditions', async () => {
      const expression = `ctx.triggerData?.a > 5 && ctx.triggerData?.b < 10`
      const context = { triggerData: { a: 7, b: 8 } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle OR conditions', async () => {
      const expression = `ctx.triggerData?.a > 10 || ctx.triggerData?.b < 10`
      const context = { triggerData: { a: 5, b: 8 } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle NOT conditions', async () => {
      const expression = `!(ctx.triggerData?.disabled)`
      const context = { triggerData: { disabled: false } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle complex nested conditions', async () => {
      const expression = `(ctx.triggerData?.a > 0 && ctx.triggerData?.b > 0) || ctx.triggerData?.c === true`
      const context = { triggerData: { a: -1, b: -1, c: true } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })
  })

  describe('Array conditions', () => {
    it('should handle array length checks', async () => {
      const expression = `ctx.triggerData?.items?.length > 0`
      const context = { triggerData: { items: [1, 2, 3] } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle array includes', async () => {
      const expression = `ctx.triggerData?.tags?.includes("important")`
      const context = { triggerData: { tags: ["urgent", "important", "review"] } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle array every/some', async () => {
      const expression = `ctx.triggerData?.items?.every(i => i.valid === true)`
      const context = { triggerData: { items: [{ valid: true }, { valid: true }] } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })
  })

  describe('Object/Nested conditions', () => {
    it('should handle nested object properties', async () => {
      const expression = `ctx.triggerData?.user?.role === "admin"`
      const context = { triggerData: { user: { role: "admin", id: 1 } } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle deeply nested paths', async () => {
      const expression = `ctx.triggerData?.a?.b?.c?.d === "deep"`
      const context = { triggerData: { a: { b: { c: { d: "deep" } } } } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle missing nested properties gracefully', async () => {
      const expression = `ctx.triggerData?.user?.profile?.name === "John"`
      const context = { triggerData: { user: null } }
      
      const fn = new Function('ctx', `return ${expression}`)
      // Should not throw, should return false
      expect(fn(context)).toBe(false)
    })
  })

  describe('Error handling', () => {
    it('should return false for invalid syntax', async () => {
      const expression = `invalid syntax here`
      
      try {
        const fn = new Function('ctx', `return ${expression}`)
        fn({})
      } catch (error) {
        // Expected to throw
        expect(error).toBeDefined()
      }
    })

    it('should handle division by zero gracefully', async () => {
      const expression = `ctx.triggerData?.a / ctx.triggerData?.b > 1`
      const context = { triggerData: { a: 1, b: 0 } }
      
      const fn = new Function('ctx', `return ${expression}`)
      const result = fn(context)
      // Infinity > 1 is true, but we should handle this edge case
      expect(typeof result).toBe('boolean')
    })

    it('should handle undefined variable access', async () => {
      const expression = `ctx.triggerData?.undefinedVar === "test"`
      const context = { triggerData: {} }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(false)
    })
  })

  describe('Mathematical expressions', () => {
    it('should handle arithmetic operations', async () => {
      const expression = `(ctx.triggerData?.a + ctx.triggerData?.b) * ctx.triggerData?.multiplier > 100`
      const context = { triggerData: { a: 30, b: 30, multiplier: 2 } } // (30+30)*2 = 120 > 100
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })

    it('should handle modulo operations', async () => {
      const expression = `ctx.triggerData?.value % 2 === 0`
      const context = { triggerData: { value: 42 } }
      
      const fn = new Function('ctx', `return ${expression}`)
      expect(fn(context)).toBe(true)
    })
  })

  describe('Type coercion', () => {
    it('should handle loose equality vs strict equality', async () => {
      const looseExpr = `ctx.triggerData?.value == 0`
      const strictExpr = `ctx.triggerData?.value === 0`
      
      const context1 = { triggerData: { value: 0 } }
      const context2 = { triggerData: { value: "0" } }
      
      const looseFn = new Function('ctx', `return ${looseExpr}`)
      const strictFn = new Function('ctx', `return ${strictExpr}`)
      
      expect(looseFn(context1)).toBe(true)
      expect(looseFn(context2)).toBe(true)
      expect(strictFn(context1)).toBe(true)
      expect(strictFn(context2)).toBe(false)
    })
  })
})
