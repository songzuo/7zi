/**
 * @fileoverview HTML 导出器单元测试
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { HTMLExporter, HTMLOptions, HTMLTableOptions } from '../formats/html-exporter'

// ============================================================================
// 测试数据
// ============================================================================

interface TestData {
  id: number
  name: string
  email: string
  status: string
  amount: number
  createdAt: string
  [key: string]: unknown
}

const testData: TestData[] = [
  {
    id: 1,
    name: '张三',
    email: 'zhangsan@example.com',
    status: 'active',
    amount: 1000.50,
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: 2,
    name: '李四',
    email: 'lisi@example.com',
    status: 'inactive',
    amount: 2500.75,
    createdAt: '2024-02-20T14:45:00Z',
  },
  {
    id: 3,
    name: '王五',
    email: 'wangwu@example.com',
    status: 'active',
    amount: 500.00,
    createdAt: '2024-03-10T08:00:00Z',
  },
]

const columns: HTMLTableOptions['columns'] = [
  { key: 'id', label: 'ID', align: 'center', width: '10%' },
  { key: 'name', label: '姓名', align: 'left', width: '20%' },
  { key: 'email', label: '邮箱', align: 'left', width: '30%' },
  { key: 'status', label: '状态', align: 'center', width: '15%' },
  { key: 'amount', label: '金额', align: 'right', width: '15%' },
  { key: 'createdAt', label: '创建时间', align: 'left', width: '10%' },
]

// ============================================================================
// HTMLExporter 测试
// ============================================================================

describe('HTMLExporter', () => {
  let exporter: HTMLExporter

  beforeEach(() => {
    exporter = new HTMLExporter()
  })

  describe('初始化', () => {
    it('应该成功创建导出器实例', () => {
      expect(exporter).toBeDefined()
      expect(exporter).toBeInstanceOf(HTMLExporter)
    })

    it('应该使用默认配置', () => {
      const defaultExporter = new HTMLExporter()
      expect(defaultExporter).toBeDefined()
    })

    it('应该接受自定义配置', () => {
      const customOptions: HTMLOptions = {
        title: '自定义标题',
        theme: 'dark',
        includePrintStyles: false,
      }
      const customExporter = new HTMLExporter(customOptions)
      expect(customExporter).toBeDefined()
    })
  })

  describe('导出功能', () => {
    it('应该成功导出数据为 HTML', async () => {
      const result = await exporter.export(testData, {
        filename: 'test-export.html',
        columns,
        title: '测试导出',
        subtitle: 'HTML 导出测试',
        description: '这是一个测试导出的描述',
      })

      expect(result.success).toBe(true)
      expect(result.html).toBeDefined()
      expect(result.blob).toBeDefined()
      expect(result.filename).toBe('test-export.html')
      expect(result.rowCount).toBe(testData.length)
    })

    it('应该处理空数据', async () => {
      const result = await exporter.export([], {
        filename: 'empty-export',
        columns,
      })

      expect(result.success).toBe(true)
      expect(result.html).toBeDefined()
      expect(result.html).toContain('No data available')
    })

    it('应该支持自定义 HTML 选项', async () => {
      const htmlOptions: HTMLOptions = {
        title: '自定义标题',
        subtitle: '自定义副标题',
        description: '自定义描述',
        theme: 'dark',
        lang: 'zh-CN',
        includePrintStyles: true,
        includeMetadata: true,
        responsive: true,
      }

      const result = await exporter.export(testData, {
        filename: 'custom-export',
        columns,
        htmlOptions,
      })

      expect(result.success).toBe(true)
      expect(result.html).toBeDefined()
      expect(result.html).toContain('自定义标题')
    })

    it('应该支持不同的主题', async () => {
      const themes: Array<HTMLOptions['theme']> = ['light', 'dark', 'blue', 'green', 'red']

      for (const theme of themes) {
        const htmlOptions: HTMLOptions = { theme }
        const result = await exporter.export(testData, {
          filename: `${theme}-export`,
          columns,
          htmlOptions,
        })

        expect(result.success).toBe(true)
        expect(result.html).toBeDefined()
        expect(result.html).toContain(`theme-${theme}`)
      }
    })
  })

  describe('表格功能', () => {
    it('应该正确处理表格列配置', async () => {
      const result = await exporter.export(testData, {
        filename: 'table-test',
        columns,
      })

      expect(result.success).toBe(true)
      expect(result.html).toBeDefined()
      expect(result.html).toContain('<table>')
      expect(result.html).toContain('<thead>')
      expect(result.html).toContain('<tbody>')
    })

    it('应该支持不同的对齐方式', async () => {
      const alignedColumns: HTMLTableOptions['columns'] = [
        { key: 'id', label: 'ID', align: 'center' },
        { key: 'name', label: '姓名', align: 'left' },
        { key: 'amount', label: '金额', align: 'right' },
      ]

      const result = await exporter.export(testData, {
        filename: 'align-test',
        columns: alignedColumns,
      })

      expect(result.success).toBe(true)
      expect(result.html).toBeDefined()
    })

    it('应该支持自定义列宽', async () => {
      const customWidthColumns: HTMLTableOptions['columns'] = [
        { key: 'id', label: 'ID', width: '10%' },
        { key: 'name', label: '姓名', width: '30%' },
        { key: 'email', label: '邮箱', width: '60%' },
      ]

      const result = await exporter.export(testData, {
        filename: 'width-test',
        columns: customWidthColumns,
      })

      expect(result.success).toBe(true)
      expect(result.html).toBeDefined()
    })

    it('应该支持隐藏列', async () => {
      const hiddenColumns: HTMLTableOptions['columns'] = [
        { key: 'id', label: 'ID', visible: true },
        { key: 'name', label: '姓名', visible: true },
        { key: 'email', label: '邮箱', visible: false },
        { key: 'status', label: '状态', visible: true },
      ]

      const result = await exporter.export(testData, {
        filename: 'hidden-test',
        columns: hiddenColumns,
      })

      expect(result.success).toBe(true)
      expect(result.html).toBeDefined()
      expect(result.html).not.toContain('邮箱')
    })
  })

  describe('HTML 内容验证', () => {
    it('应该包含完整的 HTML 结构', async () => {
      const result = await exporter.export(testData, {
        filename: 'structure-test',
        columns,
      })

      expect(result.html).toBeDefined()
      expect(result.html).toContain('<!DOCTYPE html>')
      expect(result.html).toMatch(/<html/i)
      expect(result.html).toContain('<head>')
      expect(result.html).toMatch(/<body/i)
      expect(result.html).toMatch(/<\/html>/i)
    })

    it('应该包含元数据', async () => {
      const htmlOptions: HTMLOptions = { includeMetadata: true }
      const result = await exporter.export(testData, {
        filename: 'metadata-test',
        columns,
        htmlOptions,
      })

      expect(result.html).toBeDefined()
      expect(result.html).toContain('name="generator"')
      expect(result.html).toContain('name="export-date"')
    })

    it('应该包含打印样式', async () => {
      const htmlOptions: HTMLOptions = { includePrintStyles: true }
      const result = await exporter.export(testData, {
        filename: 'print-test',
        columns,
        htmlOptions,
      })

      expect(result.html).toBeDefined()
      expect(result.html).toContain('@media print')
    })

    it('应该包含响应式样式', async () => {
      const htmlOptions: HTMLOptions = { responsive: true }
      const result = await exporter.export(testData, {
        filename: 'responsive-test',
        columns,
        htmlOptions,
      })

      expect(result.html).toBeDefined()
      expect(result.html).toContain('@media (max-width: 768px)')
    })
  })

  describe('数据格式化', () => {
    it('应该正确格式化布尔值', async () => {
      const booleanData = [
        { id: 1, active: true },
        { id: 2, active: false },
      ]

      const columns = [
        { key: 'id', label: 'ID' },
        { key: 'active', label: '状态' },
      ]

      const result = await exporter.export(booleanData, {
        filename: 'boolean-test',
        columns,
      })

      expect(result.success).toBe(true)
      expect(result.html).toBeDefined()
      expect(result.html).toContain('✓')
      expect(result.html).toContain('✗')
    })

    it('应该正确格式化日期', async () => {
      const dateData = [
        { id: 1, date: new Date('2024-01-15') },
      ]

      const columns = [
        { key: 'id', label: 'ID' },
        { key: 'date', label: '日期' },
      ]

      const result = await exporter.export(dateData, {
        filename: 'date-test',
        columns,
      })

      expect(result.success).toBe(true)
      expect(result.html).toBeDefined()
    })

    it('应该正确转义 HTML 特殊字符', async () => {
      const specialData = [
        { id: 1, text: '<script>alert("test")</script>' },
        { id: 2, text: 'Hello & World' },
      ]

      const columns = [
        { key: 'id', label: 'ID' },
        { key: 'text', label: '文本' },
      ]

      const result = await exporter.export(specialData, {
        filename: 'escape-test',
        columns,
      })

      expect(result.success).toBe(true)
      expect(result.html).toBeDefined()
      expect(result.html).not.toContain('<script>')
      expect(result.html).toContain('&lt;script&gt;')
    })
  })

  describe('错误处理', () => {
    it('应该处理无效的列配置', async () => {
      const result = await exporter.export(testData, {
        filename: 'invalid-columns',
        columns: [],
      })

      expect(result.success).toBe(true)
      expect(result.html).toBeDefined()
    })

    it('应该处理导出过程中的错误', async () => {
      const result = await exporter.export(testData, {
        filename: 'error-test',
        columns: [
          { key: 'nonexistent', label: '不存在的字段' },
        ],
      })

      expect(result.success).toBe(true)
      expect(result.html).toBeDefined()
    })
  })
})