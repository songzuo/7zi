/**
 * @fileoverview PDF 导出器单元测试
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PDFExporter, PDFOptions, PDFTableOptions } from '../formats/pdf-exporter'

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

const columns: PDFTableOptions['columns'] = [
  { key: 'id', label: 'ID', width: 10, align: 'center' },
  { key: 'name', label: '姓名', width: 20, align: 'left' },
  { key: 'email', label: '邮箱', width: 30, align: 'left' },
  { key: 'status', label: '状态', width: 15, align: 'center' },
  { key: 'amount', label: '金额', width: 15, align: 'right' },
  { key: 'createdAt', label: '创建时间', width: 20, align: 'left' },
]

// ============================================================================
// PDFExporter 测试
// ============================================================================

describe('PDFExporter', () => {
  let exporter: PDFExporter

  beforeEach(() => {
    exporter = new PDFExporter()
  })

  describe('初始化', () => {
    it('应该成功创建导出器实例', () => {
      expect(exporter).toBeDefined()
      expect(exporter).toBeInstanceOf(PDFExporter)
    })

    it('应该使用默认配置', () => {
      const defaultExporter = new PDFExporter()
      expect(defaultExporter).toBeDefined()
    })

    it('应该接受自定义配置', () => {
      const customOptions: PDFOptions = {
        orientation: 'landscape',
        format: 'a3',
        fontSize: 12,
        showPageNumber: false,
      }
      const customExporter = new PDFExporter(customOptions)
      expect(customExporter).toBeDefined()
    })
  })

  describe('文档创建', () => {
    it('应该成功创建新文档', () => {
      exporter.createDocument()
      expect(exporter).toBeDefined()
    })

    it('应该支持多次创建文档', () => {
      exporter.createDocument()
      exporter.createDocument()
      expect(exporter).toBeDefined()
    })
  })

  describe('导出功能', () => {
    it('应该成功导出数据为 PDF', async () => {
      const result = await exporter.export(testData, {
        filename: 'test-export',
        columns,
        title: '测试导出',
        subtitle: 'PDF 导出测试',
      })

      expect(result.success).toBe(true)
      expect(result.blob).toBeDefined()
      expect(result.filename).toMatch(/^test-export(\.pdf)?$/)
      expect(result.pageCount).toBeGreaterThan(0)
    })

    it('应该处理空数据', async () => {
      const result = await exporter.export([], {
        filename: 'empty-export',
        columns,
      })

      expect(result.success).toBe(true)
      expect(result.blob).toBeDefined()
    })

    it('应该支持自定义 PDF 选项', async () => {
      const pdfOptions: PDFOptions = {
        orientation: 'landscape',
        format: 'a3',
        fontSize: 12,
        showPageNumber: true,
        title: '自定义标题',
        subtitle: '自定义副标题',
        footer: '页脚文本',
      }

      const result = await exporter.export(testData, {
        filename: 'custom-export',
        columns,
        pdfOptions,
      })

      expect(result.success).toBe(true)
      expect(result.blob).toBeDefined()
    })

    it('应该支持深色主题', async () => {
      const pdfOptions: PDFOptions = {
        theme: 'dark',
      }

      const result = await exporter.export(testData, {
        filename: 'dark-export',
        columns,
        pdfOptions,
      })

      expect(result.success).toBe(true)
      expect(result.blob).toBeDefined()
    })
  })

  describe('表格功能', () => {
    it('应该正确处理表格列配置', async () => {
      const result = await exporter.export(testData, {
        filename: 'table-test',
        columns,
      })

      expect(result.success).toBe(true)
      expect(result.blob).toBeDefined()
    })

    it('应该支持不同的对齐方式', async () => {
      const alignedColumns: PDFTableOptions['columns'] = [
        { key: 'id', label: 'ID', align: 'center' },
        { key: 'name', label: '姓名', align: 'left' },
        { key: 'amount', label: '金额', align: 'right' },
      ]

      const result = await exporter.export(testData, {
        filename: 'align-test',
        columns: alignedColumns,
      })

      expect(result.success).toBe(true)
      expect(result.blob).toBeDefined()
    })

    it('应该支持自定义列宽', async () => {
      const customWidthColumns: PDFTableOptions['columns'] = [
        { key: 'id', label: 'ID', width: 10 },
        { key: 'name', label: '姓名', width: 30 },
        { key: 'email', label: '邮箱', width: 40 },
      ]

      const result = await exporter.export(testData, {
        filename: 'width-test',
        columns: customWidthColumns,
      })

      expect(result.success).toBe(true)
      expect(result.blob).toBeDefined()
    })
  })

  describe('错误处理', () => {
    it('应该处理无效的列配置', async () => {
      const result = await exporter.export(testData, {
        filename: 'invalid-columns',
        columns: [],
      })

      expect(result.success).toBe(true)
      expect(result.blob).toBeDefined()
    })

    it('应该处理导出过程中的错误', async () => {
      // 模拟错误情况
      const result = await exporter.export(testData, {
        filename: 'error-test',
        columns: [
          { key: 'nonexistent', label: '不存在的字段' },
        ],
      })

      expect(result.success).toBe(true)
      expect(result.blob).toBeDefined()
    })
  })

  describe('保存功能', () => {
    it('应该成功保存 PDF', async () => {
      exporter.createDocument()
      const result = await exporter.save('test-save.pdf')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.blob).toBeDefined()
      expect(result.filename).toBe('test-save.pdf')
    })

    it('应该在未创建文档时返回错误', async () => {
      const newExporter = new PDFExporter()
      const result = await newExporter.save('test.pdf')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})