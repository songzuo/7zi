// @ts-nocheck
/**
 * @fileoverview Excel Parser
 * @description 支持 .xlsx 和 .xls 格式的 Excel 解析器
 * @version 2.0.0 - 使用 exceljs 替代 xlsx
 */

import { logger } from '../../logger'
import type { ParseOptions, ParseResult, ParseError, ParseWarning } from '../types'

/**
 * Excel 解析器
 * 支持多工作表、流式处理
 */
export class ExcelParser {
  /**
   * 解析 Excel 文件
   */
  async parse(buffer: ArrayBuffer, options: ParseOptions = { format: 'xlsx' }): Promise<ParseResult> {
    try {
      const ExcelJS = await import('exceljs')

      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)

      // 获取工作表
      const worksheet = workbook.getWorksheet(options.sheetName || workbook.worksheets[options.sheetIndex || 0]?.name)

      if (!worksheet) {
        return {
          success: false,
          data: [],
          fields: [],
          totalRows: 0,
          errors: [
            {
              message: `工作表不存在`,
            },
          ],
          warnings: [],
        }
      }

      // 解析数据
      const jsonData: unknown[][] = []
      worksheet.eachRow((row, rowIndex) => {
        jsonData.push(row.values as unknown[])
      })

      if (jsonData.length === 0) {
        return {
          success: true,
          data: [],
          fields: [],
          totalRows: 0,
          errors: [],
          warnings: [],
        }
      }

      // 解析标题行
      const headers = (jsonData[0] as string[]).slice(1) // 第一列是空的位置
      const startIndex = options.skipHeader ? 1 : 0

      // 解析数据行
      const data: Record<string, unknown>[] = []
      const errors: ParseError[] = []
      const warnings: ParseWarning[] = []

      const maxRows = options.maxRows
      const limit = maxRows ? Math.min(jsonData.length, startIndex + maxRows) : jsonData.length

      for (let i = startIndex; i < limit; i++) {
        const row = jsonData[i] as unknown[]

        if (!row || row.length === 0) continue

        try {
          const record: Record<string, unknown> = {}

          // 从索引1开始，跳过第一列（行号）
          headers.forEach((header, index) => {
            const value = row[index + 1]
            record[header] = this.parseValue(value)
          })

          data.push(record)
        } catch (error) {
          errors.push({
            row: i + 1,
            message: error instanceof Error ? error.message : '解析失败',
          })
        }
      }

      return {
        success: errors.length === 0,
        data,
        fields: headers,
        totalRows: data.length,
        errors,
        warnings,
      }
    } catch (error) {
      logger.error('Excel 解析失败', error, { category: 'import-parser' })
      return {
        success: false,
        data: [],
        fields: [],
        totalRows: 0,
        errors: [
          {
            message: error instanceof Error ? error.message : 'Excel 解析失败',
          },
        ],
        warnings: [],
      }
    }
  }

  /**
   * 流式解析 Excel
   */
  async *parseStream(
    buffer: ArrayBuffer,
    options: ParseOptions = { format: 'xlsx' }
  ): AsyncGenerator<Record<string, unknown>[], void, unknown> {
    const batchSize = options.batchSize || 100

    try {
      const ExcelJS = await import('exceljs')

      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)

      const worksheet = workbook.getWorksheet(options.sheetName || workbook.worksheets[options.sheetIndex || 0]?.name)

      if (!worksheet) return

      const jsonData: unknown[][] = []
      worksheet.eachRow((row) => {
        jsonData.push(row.values as unknown[])
      })

      if (jsonData.length === 0) return

      const headers = (jsonData[0] as string[]).slice(1)
      const startIndex = options.skipHeader ? 1 : 0

      let batch: Record<string, unknown>[] = []

      for (let i = startIndex; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[]

        if (!row || row.length === 0) continue

        try {
          const record: Record<string, unknown> = {}

          headers.forEach((header, index) => {
            const value = row[index + 1]
            record[header] = this.parseValue(value)
          })

          batch.push(record)

          if (batch.length >= batchSize) {
            yield batch
            batch = []
          }
        } catch (error) {
          logger.warn(`行 ${i + 1} 解析失败: ${error}`, { category: 'import-parser' })
        }
      }

      if (batch.length > 0) {
        yield batch
      }
    } catch (error) {
      logger.error('Excel 流式解析失败', error, { category: 'import-parser' })
    }
  }

  /**
   * 解析文件预览
   */
  async preview(buffer: ArrayBuffer, maxRows = 10): Promise<{
    fields: string[]
    data: Record<string, unknown>[]
    totalRows: number
    sheets: string[]
  }> {
    try {
      const ExcelJS = await import('exceljs')

      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)

      const result = await this.parse(buffer, { format: 'xlsx', maxRows, skipHeader: true })

      return {
        fields: result.fields,
        data: result.data.slice(0, maxRows),
        totalRows: result.totalRows,
        sheets: workbook.worksheets.map(ws => ws.name),
      }
    } catch (error) {
      logger.error('Excel 预览失败', error, { category: 'import-parser' })
      return {
        fields: [],
        data: [],
        totalRows: 0,
        sheets: [],
      }
    }
  }

  /**
   * 获取工作表列表
   */
  async getSheetNames(buffer: ArrayBuffer): Promise<string[]> {
    try {
      const ExcelJS = await import('exceljs')

      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)

      return workbook.worksheets.map(ws => ws.name)
    } catch (error) {
      logger.error('获取工作表列表失败', error, { category: 'import-parser' })
      return []
    }
  }

  /**
   * 解析值
   */
  private parseValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return null
    }

    if (typeof value === 'number') {
      return value
    }

    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'string') {
      // 尝试解析为数字
      if (/^-?\d+\.?\d*$/.test(value)) {
        const num = parseFloat(value)
        if (!isNaN(num)) return num
      }

      // 尝试解析为布尔值
      if (value.toLowerCase() === 'true') return true
      if (value.toLowerCase() === 'false') return false

      // 尝试解析为 JSON
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          return JSON.parse(value)
        } catch {
          // 不是有效的 JSON，返回原值
        }
      }

      return value
    }

    return value
  }
}

// 导出单例
export const excelParser = new ExcelParser()
