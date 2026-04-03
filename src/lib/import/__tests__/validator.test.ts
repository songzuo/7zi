/**
 * @fileoverview Import Validator Tests
 * @description 数据验证器单元测试
 * @version 1.12.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ImportValidator } from '../validator'
import type { ValidationRule } from '../types'

describe('ImportValidator', () => {
  let validator: ImportValidator

  beforeEach(() => {
    validator = new ImportValidator()
  })

  describe('validate', () => {
    it('应该正确验证必填字段', async () => {
      const data = [
        { name: 'John', age: 30 },
        { name: '', age: 25 },
        { name: null, age: 20 },
      ]

      const rules: ValidationRule[] = [
        { type: 'required', field: 'name' },
      ]

      const result = await validator.validate(data, rules, 'normal')

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
      expect(result.stats.invalidRows).toBe(2)
    })

    it('应该正确验证字段类型', async () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 'twenty' },
      ]

      const rules: ValidationRule[] = [
        { type: 'type', field: 'age', params: { type: 'number' } },
      ]

      const result = await validator.validate(data, rules, 'normal')

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('应该正确验证邮箱格式', async () => {
      const data = [
        { email: 'john@example.com' },
        { email: 'invalid-email' },
      ]

      const rules: ValidationRule[] = [
        { type: 'format', field: 'email', params: { format: 'email' } },
      ]

      const result = await validator.validate(data, rules, 'normal')

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('应该正确验证范围', async () => {
      const data = [
        { age: 30 },
        { age: 10 },
        { age: 100 },
      ]

      const rules: ValidationRule[] = [
        { type: 'range', field: 'age', params: { min: 18, max: 65 } },
      ]

      const result = await validator.validate(data, rules, 'normal')

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(2)
    })

    it('应该正确验证自定义规则', async () => {
      const data = [
        { code: 'ABC123' },
        { code: 'xyz' },
      ]

      const rules: ValidationRule[] = [
        {
          type: 'custom',
          field: 'code',
          validate: (value) => typeof value === 'string' && value.length === 6,
          message: 'Code must be 6 characters',
        },
      ]

      const result = await validator.validate(data, rules, 'normal')

      expect(result.valid).toBe(false)
      expect(result.errors).toHaveLength(1)
    })

    it('应该根据验证级别调整结果', async () => {
      const data = [
        { name: 'John' },
        { name: '' },
      ]

      const rules: ValidationRule[] = [
        { type: 'required', field: 'name', level: 'warning' },
      ]

      // 正常模式 - 应该返回警告
      const normalResult = await validator.validate(data, rules, 'normal')
      expect(normalResult.valid).toBe(true)
      expect(normalResult.warnings).toHaveLength(1)

      // 严格模式 - 警告应转为错误
      const strictResult = await validator.validate(data, rules, 'strict')
      expect(strictResult.valid).toBe(false)
      expect(strictResult.errors).toHaveLength(1)

      // 宽松模式 - 应该通过
      const looseResult = await validator.validate(data, rules, 'loose')
      expect(looseResult.valid).toBe(true)
    })
  })

  describe('createRules', () => {
    it('应该创建常用验证规则', () => {
      const rules = ImportValidator.createRules()

      const requiredRule = rules.required('name', 'Name is required')
      expect(requiredRule.type).toBe('required')
      expect(requiredRule.field).toBe('name')

      const emailRule = rules.email('email')
      expect(emailRule.type).toBe('format')
      expect(emailRule.params?.format).toBe('email')

      const rangeRule = rules.range('age', 0, 100)
      expect(rangeRule.type).toBe('range')
      expect(rangeRule.params?.min).toBe(0)
      expect(rangeRule.params?.max).toBe(100)
    })
  })
})
