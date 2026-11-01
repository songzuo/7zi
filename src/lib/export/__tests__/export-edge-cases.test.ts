// @ts-nocheck - 边界测试，包含故意的类型混用
/**
 * @fileoverview 导出域边界用例
 * @description 覆盖 null/undefined、空数组、格式化器契约、模板注册删除、数值边界
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  DataExporter,
  exportData,
  createFields,
  createEnhancedFields,
  getFieldsByGroup,
  sortFields,
  dateFormatter,
  booleanFormatter,
  arrayFormatter,
  truncateFormatter,
  numberFormatter,
  currencyFormatter,
  percentFormatter,
  enumFormatter,
  jsonFormatter,
  linkFormatter,
  conditionalFormatter,
  registerTemplate,
  getTemplate,
  getAllTemplates,
  deleteTemplate,
  exportWithTemplate,
  exportMultiSheet,
  clearTemplates,
} from '../index'

const row = { id: 1, name: 'A', active: true, amount: 10, tags: ['x'] }

// ============================================================================
// 格式化器边界
// ============================================================================

describe('格式化器边界', () => {
  describe('dateFormatter', () => {
    it('应该处理 undefined 值为空字符串', () => {
      expect(dateFormatter('iso')(undefined)).toBe('')
    })

    it('应该处理 Unix 时间戳输入', () => {
      const result = dateFormatter('iso')(1700000000000)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('应该处理 Date 对象输入', () => {
      const d = new Date('2024-01-15T10:30:00Z')
      expect(dateFormatter('iso')(d)).toBe('2024-01-15T10:30:00.000Z')
    })

    it('unix 模式应该返回秒级时间戳', () => {
      const result = dateFormatter('unix')('2024-01-15T10:30:00Z')
      expect(result).toBe('1705314600')
    })
  })

  describe('booleanFormatter', () => {
    it('应该处理 null 和 undefined 为空字符串', () => {
      const f = booleanFormatter('是', '否')
      expect(f(null)).toBe('')
      expect(f(undefined)).toBe('')
    })

    it('应该处理 NaN 为空字符串', () => {
      expect(booleanFormatter()(NaN)).toBe('')
    })

    it('应该对无法判定的字符串返回空字符串', () => {
      expect(booleanFormatter()('maybe')).toBe('')
    })

    it('应该忽略大小写与空白', () => {
      expect(booleanFormatter()(' TRUE ')).toBe('是')
    })
  })

  describe('arrayFormatter', () => {
    it('应该处理空数组为空字符串', () => {
      expect(arrayFormatter()([])).toBe('')
    })

    it('应该处理 null 元素', () => {
      expect(arrayFormatter('-')([null, 'a'])).toBe('-a')
    })

    it('应该处理嵌套对象', () => {
      const result = arrayFormatter()([{ a: { b: 1 } }])
      expect(result).toBe('{"a":{"b":1}}')
    })
  })

  describe('truncateFormatter', () => {
    it('应该处理负长度按 0 处理', () => {
      const result = truncateFormatter(-5)('abc')
      expect(result).toBe('...')
    })

    it('应该处理长度恰好等于上限时不追加省略号', () => {
      expect(truncateFormatter(3)('abc')).toBe('abc')
    })

    it('应该处理数字输入', () => {
      expect(truncateFormatter(2)(12345)).toBe('12...')
    })

    it('应该处理 Infinity 上限', () => {
      expect(truncateFormatter(Infinity)('abc')).toBe('abc')
    })
  })

  describe('numberFormatter', () => {
    it('应该处理 NaN 为空字符串', () => {
      expect(numberFormatter()(NaN)).toBe('')
    })

    it('应该处理负数', () => {
      expect(numberFormatter({ decimals: 2 })(-1234.567)).toBe(-1234.57)
    })

    it('应该处理 0', () => {
      expect(numberFormatter({ decimals: 2 })(0)).toBe(0)
    })

    it('应该处理极大值', () => {
      expect(numberFormatter()(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('应该处理数字字符串', () => {
      expect(numberFormatter({ decimals: 1 })('12.34')).toBe(12.3)
    })

    it('应该处理 Infinity', () => {
      expect(numberFormatter()(Infinity)).toBe('Infinity')
    })
  })

  describe('currencyFormatter', () => {
    it('应该处理负数金额', () => {
      const result = currencyFormatter('USD', 'en-US')(-1234.56)
      expect(result).toContain('-')
      expect(result).toContain('1,234.56')
    })

    it('应该处理 0 金额', () => {
      const result = currencyFormatter('USD', 'en-US')(0)
      expect(result).toContain('0.00')
    })

    it('应该处理 NaN 为空字符串', () => {
      expect(currencyFormatter()(NaN)).toBe('')
    })
  })

  describe('percentFormatter', () => {
    it('应该处理负百分比', () => {
      expect(percentFormatter()(-0.05)).toBe('-5.00%')
    })

    it('应该处理 0 百分比', () => {
      expect(percentFormatter()(0)).toBe('0.00%')
    })

    it('应该处理 NaN 为空字符串', () => {
      expect(percentFormatter()(NaN)).toBe('')
    })

    it('应该处理超过 100% 的比例', () => {
      expect(percentFormatter(1)(1.5)).toBe('150.0%')
    })
  })

  describe('enumFormatter', () => {
    it('应该处理 null 为空字符串', () => {
      expect(enumFormatter({ a: 'A' })(null)).toBe('')
    })

    it('应该避免原型链上的属性误命中', () => {
      expect(enumFormatter({ a: 'A' })('toString')).toBe('toString')
    })
  })

  describe('jsonFormatter', () => {
    it('应该处理 undefined 为空字符串', () => {
      expect(jsonFormatter()(undefined)).toBe('')
    })

    it('应该处理 0 不为空字符串', () => {
      expect(jsonFormatter()(0)).toBe('0')
    })

    it('应该处理循环引用不抛异常', () => {
      const circular: Record<string, unknown> = {}
      circular.self = circular
      expect(() => jsonFormatter()(circular)).not.toThrow()
    })
  })

  describe('linkFormatter', () => {
    it('应该生成 Markdown 链接', () => {
      expect(linkFormatter('官网')('https://7zi.com')).toBe('[官网](https://7zi.com)')
    })

    it('没有 label 时输出原始地址', () => {
      expect(linkFormatter()('https://7zi.com')).toBe('https://7zi.com')
    })

    it('应该处理空值为空字符串', () => {
      expect(linkFormatter('x')(null)).toBe('')
    })
  })

  describe('conditionalFormatter', () => {
    it('条件命中时返回 true 分支', () => {
      const f = conditionalFormatter((v: number) => v > 10, '高', '低')
      expect(f(20)).toBe('高')
    })

    it('条件未命中时返回 false 分支', () => {
      const f = conditionalFormatter((v: number) => v > 10, '高', '低')
      expect(f(5)).toBe('低')
    })

    it('应该支持分支为函数', () => {
      const f = conditionalFormatter(
        (v: number) => v > 10,
        (v: number) => `高:${v}`,
        '低'
      )
      expect(f(20)).toBe('高:20')
    })

    it('未命中且无 false 分支时返回空字符串', () => {
      const f = conditionalFormatter((v: number) => v > 10, '高')
      expect(f(1)).toBe('')
    })
  })
})

// ============================================================================
// 字段辅助边界
// ============================================================================

describe('字段辅助边界', () => {
  it('createFields 应该支持空数组', () => {
    expect(createFields([])).toEqual([])
  })

  it('createEnhancedFields 应该给未指定 label 的字段补默认 label', () => {
    const fields = createEnhancedFields([{ key: 'id' }])
    expect(fields[0].label).toBe('id')
  })

  it('getFieldsByGroup 应该处理空字段数组', () => {
    expect(getFieldsByGroup([])).toEqual({})
  })

  it('sortFields 应该不修改原数组', () => {
    const fields = [
      { key: 'b', label: 'B', order: 2 },
      { key: 'a', label: 'A', order: 1 },
    ]
    const sorted = sortFields(fields)
    expect(sorted[0].key).toBe('a')
    expect(fields[0].key).toBe('b')
  })

  it('sortFields 应该保持 order 相同的字段原有顺序（稳定排序）', () => {
    const fields = [
      { key: 'a', label: 'A', order: 1 },
      { key: 'b', label: 'B', order: 1 },
      { key: 'c', label: 'C', order: 1 },
    ]
    expect(sortFields(fields).map(f => f.key)).toEqual(['a', 'b', 'c'])
  })
})

// ============================================================================
// 模板边界
// ============================================================================

describe('模板边界', () => {
  beforeEach(() => {
    clearTemplates()
  })

  it('注册空模板 ID 应该抛错', () => {
    expect(() => registerTemplate({ id: '', name: 'x', fields: [] })).toThrow()
  })

  it('重复注册同 ID 应该覆盖旧模板', () => {
    registerTemplate({ id: 'dup', name: '第一个', fields: [] })
    registerTemplate({ id: 'dup', name: '第二个', fields: [] })

    expect(getAllTemplates()).toHaveLength(1)
    expect(getTemplate('dup')?.name).toBe('第二个')
  })

  it('删除不存在的模板应该返回 false', () => {
    expect(deleteTemplate('never-existed')).toBe(false)
  })

  it('获取不存在的模板应该返回 undefined', () => {
    expect(getTemplate('nope')).toBeUndefined()
  })

  it('使用空字符串 ID 查询应该返回 undefined', () => {
    expect(getTemplate('')).toBeUndefined()
  })

  it('模板应该保留 createdAt 并更新 updatedAt', () => {
    registerTemplate({ id: 'ts', name: '时间戳', fields: [] })
    const first = getTemplate('ts')
    expect(first?.createdAt).toBeTruthy()
    expect(first?.updatedAt).toBeTruthy()
  })
})

// ============================================================================
// 导出边界
// ============================================================================

describe('导出边界', () => {
  it('exportData 应该支持空数组', async () => {
    const result = await exportData([], {
      filename: 'empty',
      format: 'csv',
      fields: [{ key: 'id', label: 'ID' }],
    })
    expect(result.success).toBe(true)
    expect(result.rowCount).toBe(0)
  })

  it('exportData 应该对未知格式返回失败', async () => {
    const result = await exportData([row], {
      filename: 'bad',
      format: 'xml' as never,
      fields: [{ key: 'id', label: 'ID' }],
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('不支持的导出格式')
  })

  it('导出空字段配置不应该崩溃', async () => {
    const result = await exportData([row], {
      filename: 'nofields',
      format: 'json',
      fields: [],
    })
    expect(result.success).toBe(true)
    expect(result.columnCount).toBe(0)
  })

  it('导出不存在的字段键应该得到空值而不是崩溃', async () => {
    const result = await exportData([row], {
      filename: 'missing-key',
      format: 'json',
      fields: [{ key: 'notExist' as never, label: '不存在' }],
    })
    expect(result.success).toBe(true)
    const text = await result.blob?.text()
    expect(JSON.parse(text!)[0]['不存在']).toBe(null)
  })

  it('formatter 抛错时导出应该失败而不是静默产出坏数据', async () => {
    const result = await exportData([row], {
      filename: 'boom',
      format: 'csv',
      fields: [
        {
          key: 'id',
          label: 'ID',
          formatter: () => {
            throw new Error('格式化失败')
          },
        },
      ],
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('格式化失败')
  })

  it('exportWithTemplate 应该使用模板的默认格式', async () => {
    registerTemplate({
      id: 'json-tpl',
      name: 'JSON模板',
      fields: [{ key: 'id', label: 'ID' }],
      format: 'json',
    })
    const result = await exportWithTemplate([row], 'json-tpl')
    expect(result.success).toBe(true)
    expect(result.filename).toBe('JSON模板.json')
  })

  it('exportWithTemplate 不存在的模板应该返回失败', async () => {
    const result = await exportWithTemplate([row], 'missing-template')
    expect(result.success).toBe(false)
    expect(result.error).toContain('不存在')
  })

  it('exportMultiSheet 空工作表列表应该返回失败', async () => {
    const result = await exportMultiSheet({ filename: 'none', sheets: [] })
    expect(result.success).toBe(false)
  })

  it('exportMultiSheet 单个工作表应该成功', async () => {
    const result = await exportMultiSheet({
      filename: 'one',
      sheets: [{ name: 'S', data: [row], fields: [{ key: 'id', label: 'ID' }] }],
    })
    expect(result.success).toBe(true)
    expect(result.filename).toBe('one.xlsx')
  })
})

// ============================================================================
// 校验边界
// ============================================================================

describe('校验边界', () => {
  it('required 字段缺失应该被记录', async () => {
    const exporter = new DataExporter()
    const result = await exporter.export(
      [{ id: null, name: 'A' }],
      {
        filename: 'req',
        format: 'csv',
        fields: [
          { key: 'id', label: 'ID', required: true },
          { key: 'name', label: '姓名' },
        ],
      }
    )
    expect(result.validationErrors).toHaveLength(1)
    expect(result.validationErrors?.[0].field).toBe('id')
  })

  it('空字符串也算必填缺失', async () => {
    const exporter = new DataExporter()
    const result = await exporter.export(
      [{ id: '', name: 'A' }],
      {
        filename: 'req2',
        format: 'csv',
        fields: [{ key: 'id', label: 'ID', required: true }],
      }
    )
    expect(result.validationErrors?.length).toBe(1)
  })

  it('字段 validator 返回字符串时应该作为错误信息', async () => {
    const exporter = new DataExporter()
    const result = await exporter.export(
      [{ id: -1, name: 'A' }],
      {
        filename: 'val',
        format: 'csv',
        fields: [
          {
            key: 'id',
            label: 'ID',
            validator: v => (v > 0 ? true : '必须为正数'),
          },
        ],
      }
    )
    expect(result.validationErrors?.[0].message).toBe('必须为正数')
  })

  it('onValidate 返回 false 时应该记录行级错误', async () => {
    const exporter = new DataExporter()
    const result = await exporter.export([row], {
      filename: 'rowval',
      format: 'csv',
      fields: [{ key: 'id', label: 'ID' }],
      onValidate: () => false,
    })
    expect(result.validationErrors).toHaveLength(1)
  })
})
