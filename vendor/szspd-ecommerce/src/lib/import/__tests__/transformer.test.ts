/**
 * @fileoverview Field Transformer Tests
 * @description 字段转换器单元测试
 * @version 1.12.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FieldTransformer } from '../transformer'
import type { FieldMapping } from '../types'

describe('FieldTransformer', () => {
  let transformer: FieldTransformer

  beforeEach(() => {
    transformer = new FieldTransformer()
  })

  describe('transform', () => {
    it('应该正确转换字段名称', () => {
      const data = [
        { name: 'John', age: 30 },
      ]

      const mappings: FieldMapping[] = [
        { sourceField: 'name', targetField: 'fullName' },
        { sourceField: 'age', targetField: 'userAge' },
      ]

      const result = transformer.transform(data, mappings)

      expect(result[0].fullName).toBe('John')
      expect(result[0].userAge).toBe(30)
      expect(result[0].name).toBeUndefined()
    })

    it('应该正确转换数据类型', () => {
      const data = [
        { age: '30', active: 'true', score: '95.5' },
      ]

      const mappings: FieldMapping[] = [
        { sourceField: 'age', targetField: 'age', type: 'number' },
        { sourceField: 'active', targetField: 'active', type: 'boolean' },
        { sourceField: 'score', targetField: 'score', type: 'number' },
      ]

      const result = transformer.transform(data, mappings)

      expect(result[0].age).toBe(30)
      expect(result[0].active).toBe(true)
      expect(result[0].score).toBe(95.5)
    })

    it('应该正确应用默认值', () => {
      const data = [
        { name: 'John' },
        { name: '' },
      ]

      const mappings: FieldMapping[] = [
        { sourceField: 'name', targetField: 'name', defaultValue: 'Unknown' },
        { sourceField: 'status', targetField: 'status', defaultValue: 'active' },
      ]

      const result = transformer.transform(data, mappings)

      expect(result[0].status).toBe('active')
      expect(result[1].name).toBe('Unknown')
    })

    it('应该正确应用自定义转换函数', () => {
      const data = [
        { name: 'john doe' },
      ]

      const mappings: FieldMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          transform: (value) => {
            if (typeof value === 'string') {
              return value
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
            }
            return value
          },
        },
      ]

      const result = transformer.transform(data, mappings)

      expect(result[0].name).toBe('John Doe')
    })

    it('应该正确验证字段', () => {
      const data = [
        { email: 'john@example.com' },
        { email: 'invalid' },
      ]

      const mappings: FieldMapping[] = [
        {
          sourceField: 'email',
          targetField: 'email',
          validate: (value) => {
            if (typeof value !== 'string') return false
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
          },
        },
      ]

      // 转换不会抛出错误，但会记录警告
      const result = transformer.transform(data, mappings)
      expect(result).toHaveLength(2)
    })
  })

  describe('createMapping', () => {
    it('应该创建字段映射', () => {
      const mapping = FieldTransformer.createMapping('name', 'fullName', {
        type: 'string',
        required: true,
      })

      expect(mapping.sourceField).toBe('name')
      expect(mapping.targetField).toBe('fullName')
      expect(mapping.type).toBe('string')
      expect(mapping.required).toBe(true)
    })
  })

  describe('autoGenerateMapping', () => {
    it('应该自动生成字段映射', () => {
      const sourceFields = ['user_name', 'user_email', 'user_age']
      const targetFields = ['userName', 'userEmail', 'age']

      const mappings = FieldTransformer.autoGenerateMapping(sourceFields, targetFields)

      expect(mappings).toHaveLength(3)
      expect(mappings[0].sourceField).toBe('user_name')
    })
  })
})
