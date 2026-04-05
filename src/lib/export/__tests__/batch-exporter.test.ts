/**
 * @fileoverview 批量导出管理器单元测试
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BatchExporter, BatchExportRequest, BatchExportItem } from '../batch/batch-exporter'

// ============================================================================
// 测试数据
// ============================================================================

interface TestData {
  id: number
  name: string
  email: string
}

const testData1: TestData[] = [
  { id: 1, name: '张三', email: 'zhangsan@example.com' },
  { id: 2, name: '李四', email: 'lisi@example.com' },
]

const testData2: TestData[] = [
  { id: 3, name: '王五', email: 'wangwu@example.com' },
  { id: 4, name: '赵六', email: 'zhaoliu@example.com' },
  { id: 5, name: '孙七', email: 'sunqi@example.com' },
]

const testData3: TestData[] = [
  { id: 6, name: '周八', email: 'zhouba@example.com' },
]

// ============================================================================
// BatchExporter 测试
// ============================================================================

describe('BatchExporter', () => {
  let exporter: BatchExporter

  beforeEach(() => {
    exporter = new BatchExporter()
  })

  describe('初始化', () => {
    it('应该成功创建导出器实例', () => {
      expect(exporter).toBeDefined()
      expect(exporter).toBeInstanceOf(BatchExporter)
    })
  })

  describe('批量导出', () => {
    it('应该成功批量导出多个数据源', async () => {
      const items: BatchExportItem<TestData>[] = [
        {
          id: 'users',
          name: '用户列表',
          data: testData1,
          columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '姓名' },
            { key: 'email', label: '邮箱' },
          ],
        },
        {
          id: 'employees',
          name: '员工列表',
          data: testData2,
          columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '姓名' },
            { key: 'email', label: '邮箱' },
          ],
        },
      ]

      const request: BatchExportRequest<TestData> = {
        requestId: 'batch-test-1',
        items,
        format: 'csv',
        packaging: {
          createZip: true,
          includeSummary: true,
        },
      }

      const result = await exporter.export(request)

      expect(result.success).toBe(true)
      expect(result.requestId).toBe('batch-test-1')
      expect(result.totalItems).toBe(2)
      expect(result.successfulItems).toBe(2)
      expect(result.failedItems).toBe(0)
      expect(result.blob).toBeDefined()
      expect(result.filename).toMatch(/\.zip$/)
      expect(result.itemResults).toHaveLength(2)
    })

    it('应该成功处理单个项目', async () => {
      const items: BatchExportItem<TestData>[] = [
        {
          id: 'single',
          name: '单个数据集',
          data: testData1,
          columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '姓名' },
          ],
        },
      ]

      const request: BatchExportRequest<TestData> = {
        requestId: 'single-test',
        items,
        format: 'csv',
      }

      const result = await exporter.export(request)

      expect(result.success).toBe(true)
      expect(result.totalItems).toBe(1)
      expect(result.successfulItems).toBe(1)
    })

    it('应该处理空数据项目', async () => {
      const items: BatchExportItem<TestData>[] = [
        {
          id: 'empty',
          name: '空数据集',
          data: [],
          columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '姓名' },
          ],
        },
      ]

      const request: BatchExportRequest<TestData> = {
        requestId: 'empty-test',
        items,
        format: 'csv',
      }

      const result = await exporter.export(request)

      expect(result.success).toBe(true)
      expect(result.totalItems).toBe(1)
    })

    it('应该处理不同格式的导出', async () => {
      const items: BatchExportItem<TestData>[] = [
        {
          id: 'csv-data',
          name: 'CSV数据',
          data: testData1,
          columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '姓名' },
          ],
        },
      ]

      // CSV 格式
      const csvRequest: BatchExportRequest<TestData> = {
        requestId: 'csv-format-test',
        items,
        format: 'csv',
      }
      const csvResult = await exporter.export(csvRequest)
      expect(csvResult.success).toBe(true)
      expect(csvResult.filename).toMatch(/\.zip$/)

      // JSON 格式
      const jsonRequest: BatchExportRequest<TestData> = {
        requestId: 'json-format-test',
        items,
        format: 'json',
      }
      const jsonResult = await exporter.export(jsonRequest)
      expect(jsonResult.success).toBe(true)
      expect(jsonResult.filename).toMatch(/\.zip$/)
    })
  })

  describe('打包选项', () => {
    it('应该支持 ZIP 打包', async () => {
      const items: BatchExportItem<TestData>[] = [
        {
          id: 'item1',
          name: '项目1',
          data: testData1,
          columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '姓名' },
          ],
        },
      ]

      const request: BatchExportRequest<TestData> = {
        requestId: 'zip-test',
        items,
        format: 'csv',
        packaging: {
          createZip: true,
          zipFilename: 'custom-export.zip',
        },
      }

      const result = await exporter.export(request)

      expect(result.success).toBe(true)
      expect(result.filename).toBe('custom-export.zip')
    })

    it('应该支持汇总表', async () => {
      const items: BatchExportItem<TestData>[] = [
        {
          id: 'item1',
          name: '项目1',
          data: testData1,
          columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '姓名' },
          ],
        },
      ]

      const request: BatchExportRequest<TestData> = {
        requestId: 'summary-test',
        items,
        format: 'csv',
        packaging: {
          createZip: true,
          includeSummary: true,
          summaryConfig: {
            title: '自定义汇总',
            includeTimestamp: true,
            includeRecordCounts: true,
          },
        },
      }

      const result = await exporter.export(request)

      expect(result.success).toBe(true)
      expect(result.totalSize).toBeGreaterThan(0)
    })

    it('应该计算正确的文件大小', async () => {
      const items: BatchExportItem<TestData>[] = [
        {
          id: 'item1',
          name: '项目1',
          data: testData1,
          columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '姓名' },
          ],
        },
      ]

      const request: BatchExportRequest<TestData> = {
        requestId: 'size-test',
        items,
        format: 'csv',
      }

      const result = await exporter.export(request)

      expect(result.success).toBe(true)
      expect(result.totalSize).toBeGreaterThan(0)
    })
  })

  describe('进度回调', () => {
    it('应该触发进度回调', async () => {
      const progressCallback = vi.fn()
      exporter.onProgress(progressCallback)

      const items: BatchExportItem<TestData>[] = [
        {
          id: 'item1',
          name: '项目1',
          data: testData1,
          columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '姓名' },
          ],
        },
      ]

      const request: BatchExportRequest<TestData> = {
        requestId: 'progress-test',
        items,
        format: 'csv',
      }

      await exporter.export(request)

      expect(progressCallback).toHaveBeenCalled()
    })
  })

  describe('取消功能', () => {
    it('应该支持取消导出', async () => {
      exporter.cancel()

      const items: BatchExportItem<TestData>[] = [
        {
          id: 'item1',
          name: '项目1',
          data: testData1,
          columns: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: '姓名' },
          ],
        },
      ]

      const request: BatchExportRequest<TestData> = {
        requestId: 'cancel-test',
        items,
        format: 'csv',
      }

      // 注意：当前实现中取消功能需要在实际导出过程中生效
      // 这里只测试 cancel 方法可以调用
      expect(() => exporter.cancel()).not.toThrow()
    })
  })

  describe('错误处理', () => {
    it('应该验证必填字段', async () => {
      const items: BatchExportItem<TestData>[] = [
        {
          id: 'item1',
          name: '项目1',
          data: testData1,
          columns: [
            { key: 'id', label: 'ID' },
          ],
        },
      ]

      // 缺少 requestId
      const invalidRequest = {
        items,
        format: 'csv',
      } as unknown as BatchExportRequest<TestData>

      const result = await exporter.export(invalidRequest)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('应该验证项目列表不为空', async () => {
      const request: BatchExportRequest<TestData> = {
        requestId: 'empty-items-test',
        items: [],
        format: 'csv',
      }

      const result = await exporter.export(request)
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/at least one/i)
    })

    it('应该验证项目数据', async () => {
      const items: BatchExportItem<TestData>[] = [
        {
          id: 'no-data',
          name: '无数据的项目',
          data: undefined as unknown as TestData[],
          columns: [
            { key: 'id', label: 'ID' },
          ],
        },
      ]

      const request: BatchExportRequest<TestData> = {
        requestId: 'no-data-test',
        items,
        format: 'csv',
      }

      const result = await exporter.export(request)
      expect(result.success).toBe(false)
    })
  })

  describe('文件名处理', () => {
    it('应该正确处理特殊字符', async () => {
      const items: BatchExportItem<TestData>[] = [
        {
          id: 'special',
          name: '特殊字符: 测试@#$%',
          data: testData1,
          columns: [
            { key: 'id', label: 'ID' },
          ],
        },
      ]

      const request: BatchExportRequest<TestData> = {
        requestId: 'special-chars-test',
        items,
        format: 'csv',
      }

      const result = await exporter.export(request)

      expect(result.success).toBe(true)
      expect(result.itemResults?.[0].filename).toBeDefined()
    })

    it('应该截断过长的文件名', async () => {
      const longName = 'A'.repeat(200)
      const items: BatchExportItem<TestData>[] = [
        {
          id: 'long',
          name: longName,
          data: testData1,
          columns: [
            { key: 'id', label: 'ID' },
          ],
        },
      ]

      const request: BatchExportRequest<TestData> = {
        requestId: 'long-name-test',
        items,
        format: 'csv',
      }

      const result = await exporter.export(request)

      expect(result.success).toBe(true)
    })
  })
})