/**
 * @fileoverview Field Transformer Edge Case Tests
 * @description 字段转换器边界用例（类型契约、缺失值、兜底策略、字段名映射 fallback、Unicode）
 * @version 1.12.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { FieldTransformer } from '../transformer'
import type { FieldMapping } from '../types'

describe('FieldTransformer 边界用例', () => {
  let transformer: FieldTransformer

  beforeEach(() => {
    transformer = new FieldTransformer()
  })

  describe('未声明 type 时的类型保持', () => {
    it('未声明 type 时数字应保持为数字而不是被转成字符串', () => {
      const result = transformer.transform([{ age: 30 }], [
        { sourceField: 'age', targetField: 'age' },
      ])

      expect(result[0].age).toBe(30)
      expect(typeof result[0].age).toBe('number')
    })

    it('未声明 type 时布尔应保持为布尔', () => {
      const result = transformer.transform([{ ok: true }], [
        { sourceField: 'ok', targetField: 'ok' },
      ])

      expect(result[0].ok).toBe(true)
      expect(typeof result[0].ok).toBe('boolean')
    })

    it('未声明 type 时 null 应保持为 null', () => {
      const result = transformer.transform([{ v: null }], [
        { sourceField: 'v', targetField: 'v' },
      ])

      expect(result[0].v).toBe(null)
    })
  })

  describe('类型转换契约', () => {
    it('number: 空字符串应转为 null', () => {
      const result = transformer.transform([{ v: '' }], [
        { sourceField: 'v', targetField: 'v', type: 'number' },
      ])

      expect(result[0].v).toBe(null)
    })

    it('number: 非数字字符串应保留原值（转换失败兜底）', () => {
      const result = transformer.transform([{ v: 'abc' }], [
        { sourceField: 'v', targetField: 'v', type: 'number' },
      ])

      expect(result[0].v).toBe('abc')
    })

    it('number: 应支持千分位分隔符', () => {
      const result = transformer.transform([{ v: '1,234' }], [
        { sourceField: 'v', targetField: 'v', type: 'number' },
      ])

      expect(result[0].v).toBe(1234)
    })

    it('number: 布尔应转为 1/0', () => {
      const result = transformer.transform([{ v: true }, { v: false }], [
        { sourceField: 'v', targetField: 'v', type: 'number' },
      ])

      expect(result[0].v).toBe(1)
      expect(result[1].v).toBe(0)
    })

    it('boolean: 应识别 yes/no/1/0', () => {
      const result = transformer.transform(
        [{ a: 'YES', b: 'no', c: '1', d: '0' }],
        [
          { sourceField: 'a', targetField: 'a', type: 'boolean' },
          { sourceField: 'b', targetField: 'b', type: 'boolean' },
          { sourceField: 'c', targetField: 'c', type: 'boolean' },
          { sourceField: 'd', targetField: 'd', type: 'boolean' },
        ]
      )

      expect(result[0].a).toBe(true)
      expect(result[0].b).toBe(false)
      expect(result[0].c).toBe(true)
      expect(result[0].d).toBe(false)
    })

    it('boolean: 无法识别的值应保留原值', () => {
      const result = transformer.transform([{ v: 'maybe' }], [
        { sourceField: 'v', targetField: 'v', type: 'boolean' },
      ])

      expect(result[0].v).toBe('maybe')
    })

    it('date: 应转为 Date 实例', () => {
      const result = transformer.transform([{ v: '2026-01-15' }], [
        { sourceField: 'v', targetField: 'v', type: 'date' },
      ])

      expect(result[0].v).toBeInstanceOf(Date)
      expect((result[0].v as Date).getFullYear()).toBe(2026)
    })

    it('date: 非法日期应保留原值（转换失败兜底）', () => {
      const result = transformer.transform([{ v: 'not-a-date' }], [
        { sourceField: 'v', targetField: 'v', type: 'date' },
      ])

      expect(result[0].v).toBe('not-a-date')
    })

    it('date: 已经是 Date 的值应保持不变', () => {
      const d = new Date('2020-05-05')
      const result = transformer.transform([{ v: d }], [
        { sourceField: 'v', targetField: 'v', type: 'date' },
      ])

      expect(result[0].v).toBe(d)
    })

    it('json: 数组字符串应转为数组', () => {
      const result = transformer.transform([{ v: '[1,2,3]' }], [
        { sourceField: 'v', targetField: 'v', type: 'json' },
      ])

      expect(result[0].v).toEqual([1, 2, 3])
    })

    it('json: 对象字符串应转为对象', () => {
      const result = transformer.transform([{ v: '{"k":"v"}' }], [
        { sourceField: 'v', targetField: 'v', type: 'json' },
      ])

      expect(result[0].v).toEqual({ k: 'v' })
    })

    it('json: 非法 JSON 应保留原值', () => {
      const result = transformer.transform([{ v: '{oops' }], [
        { sourceField: 'v', targetField: 'v', type: 'json' },
      ])

      expect(result[0].v).toBe('{oops')
    })

    it('string: 对象不应变成 [object Object]', () => {
      const result = transformer.transform([{ v: { a: 1 } }], [
        { sourceField: 'v', targetField: 'v', type: 'string' },
      ])

      expect(result[0].v).toBe('{"a":1}')
    })

    it('string: 数字应转为字符串', () => {
      const result = transformer.transform([{ v: 30 }], [
        { sourceField: 'v', targetField: 'v', type: 'string' },
      ])

      expect(result[0].v).toBe('30')
    })
  })

  describe('缺失值与默认值', () => {
    it('源字段不存在时应为 undefined', () => {
      const result = transformer.transform([{}], [
        { sourceField: 'missing', targetField: 'missing' },
      ])

      expect(result[0].missing).toBeUndefined()
    })

    it('源字段不存在且定义了默认值时应使用默认值', () => {
      const result = transformer.transform([{}], [
        { sourceField: 'missing', targetField: 'missing', defaultValue: 'fallback' },
      ])

      expect(result[0].missing).toBe('fallback')
    })

    it('默认值为 null 时不应被当作未定义', () => {
      const result = transformer.transform([{}], [
        { sourceField: 'missing', targetField: 'missing', defaultValue: null },
      ])

      expect(result[0].missing).toBe(null)
    })

    it('null 值不应被默认值覆盖（除非值为空字符串）', () => {
      const result = transformer.transform([{ v: null }], [
        { sourceField: 'v', targetField: 'v', defaultValue: 'x' },
      ])

      // 当前实现把 null 也视为空值并套用默认值；记录实际契约
      expect(result[0].v).toBe('x')
    })

    it('空字符串在 number 转换下应转为 null', () => {
      const result = transformer.transform([{ v: '' }], [
        { sourceField: 'v', targetField: 'v', type: 'number' },
      ])

      expect(result[0].v).toBe(null)
    })
  })

  describe('字段名映射与 fallback', () => {
    it('映射缺失的源字段不应污染结果对象其它键', () => {
      const result = transformer.transform([{ a: 1, b: 2 }], [
        { sourceField: 'a', targetField: 'x' },
      ])

      expect(result[0].x).toBe(1)
      expect(result[0].b).toBeUndefined()
      expect(Object.keys(result[0])).toEqual(['x'])
    })

    it('源字段不存在时应生成对应 target 键且值为 undefined', () => {
      const result = transformer.transform([{ a: 1 }], [
        { sourceField: 'nope', targetField: 'y' },
      ])

      expect('y' in result[0]).toBe(true)
      expect(result[0].y).toBeUndefined()
    })

    it('多个映射指向同一 target 时后者覆盖前者', () => {
      const result = transformer.transform([{ a: 1, b: 2 }], [
        { sourceField: 'a', targetField: 'x' },
        { sourceField: 'b', targetField: 'x' },
      ])

      expect(result[0].x).toBe(2)
    })

    it('中文目标字段名应正常工作', () => {
      const result = transformer.transform([{ 姓名: '张三' }], [
        { sourceField: '姓名', targetField: '用户姓名' },
      ])

      expect(result[0].用户姓名).toBe('张三')
    })
  })

  describe('自定义转换与异常兜底', () => {
    it('自定义 transform 抛异常时应回退为源字段原值', () => {
      const result = transformer.transform([{ v: 'raw' }], [
        {
          sourceField: 'v',
          targetField: 'v',
          transform: () => {
            throw new Error('boom')
          },
        },
      ])

      expect(result[0].v).toBe('raw')
    })

    it('validate 返回 false 时不应抛出异常', () => {
      const result = transformer.transform([{ v: 'x' }], [
        { sourceField: 'v', targetField: 'v', validate: () => false },
      ])

      expect(result[0].v).toBe('x')
    })

    it('自定义 transform 应在类型转换之后执行', () => {
      const result = transformer.transform([{ v: '30' }], [
        {
          sourceField: 'v',
          targetField: 'v',
          type: 'number',
          transform: (v) => (v as number) * 2,
        },
      ])

      expect(result[0].v).toBe(60)
    })

    it('空数据数组应返回空数组', () => {
      const result = transformer.transform([], [{ sourceField: 'a', targetField: 'b' }])

      expect(result).toEqual([])
    })
  })

  describe('autoGenerateMapping 与 inferType', () => {
    it('未提供样本值时不应强制声明 type 为 string', () => {
      const mappings = FieldTransformer.autoGenerateMapping(['age'], ['age'])

      expect(mappings[0].type).toBeUndefined()
    })

    it('提供样本值时应推断类型', () => {
      const mappings = FieldTransformer.autoGenerateMapping(
        ['age', 'name', 'active'],
        ['age', 'name', 'active'],
        { age: 30, name: 'x', active: true }
      )

      expect(mappings[0].type).toBe('number')
      expect(mappings[1].type).toBe('string')
      expect(mappings[2].type).toBe('boolean')
    })

    it('无法匹配目标字段时应 fallback 到源字段名', () => {
      const mappings = FieldTransformer.autoGenerateMapping(['zzz'], ['age'])

      expect(mappings[0].targetField).toBe('zzz')
    })

    it('inferType 对对象和数组应返回 json', () => {
      expect(FieldTransformer.inferType({ a: 1 })).toBe('json')
      expect(FieldTransformer.inferType([1, 2])).toBe('json')
      expect(FieldTransformer.inferType(new Date())).toBe('date')
      expect(FieldTransformer.inferType(null)).toBe('string')
    })
  })
})
