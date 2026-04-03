/**
 * @fileoverview CSV Parser
 * @description 支持流式处理和大文件的 CSV 解析器
 * @version 1.12.0
 */

import { logger } from '../../logger'
import type { ParseOptions, ParseResult, ParseError, ParseWarning } from './types'

/**
 * CSV 解析器
 * 支持流式处理、大文件、自定义分隔符
 */
export class CSVParser {
  private defaultDelimiter = ','
  private defaultEncoding = 'utf-8'

  /**
   * 解析 CSV 内容
   */
  async parse(content: string, options: ParseOptions = { format: 'csv' }): Promise<ParseResult> {
    const errors: ParseError[] = []
    const warnings: ParseWarning[] = []
    const data: Record<string, unknown>[] = []

    const delimiter = options.delimiter || this.defaultDelimiter
    const skipHeader = options.skipHeader ?? true
    const maxRows = options.maxRows

    try {
      const lines = this.splitLines(content)
      let fields: string[] = []
      let startIndex = 0

      // 解析标题行
      if (lines.length > 0 && !skipHeader) {
        fields = this.parseLine(lines[0], delimiter)
        startIndex = 1
      } else if (lines.length > 0 && skipHeader) {
        fields = this.parseLine(lines[0], delimiter)
        startIndex = 1
      }

      // 解析数据行
      const limit = maxRows ? Math.min(lines.length, startIndex + maxRows) : lines.length

      for (let i = startIndex; i < limit; i++) {
        const line = lines[i]
        if (!line.trim()) continue

        try {
          const values = this.parseLine(line, delimiter)
          const row: Record<string, unknown> = {}

          // 映射字段
          values.forEach((value, index) => {
            const fieldName = fields[index] || `field_${index}`
            row[fieldName] = this.parseValue(value)
          })

          data.push(row)
        } catch (error) {
          errors.push({
            row: i + 1,
            message: error instanceof Error ? error.message : '解析失败',
            rawValue: line,
          })
        }
      }

      return {
        success: errors.length === 0,
        data,
        fields,
        totalRows: data.length,
        errors,
        warnings,
      }
    } catch (error) {
      logger.error('CSV 解析失败', error, { category: 'import-parser' })
      return {
        success: false,
        data: [],
        fields: [],
        totalRows: 0,
        errors: [
          {
            message: error instanceof Error ? error.message : 'CSV 解析失败',
          },
        ],
        warnings,
      }
    }
  }

  /**
   * 流式解析 CSV
   */
  async *parseStream(
    content: string,
    options: ParseOptions = { format: 'csv' }
  ): AsyncGenerator<Record<string, unknown>[], void, unknown> {
    const delimiter = options.delimiter || this.defaultDelimiter
    const batchSize = options.batchSize || 100
    const lines = this.splitLines(content)

    let fields: string[] = []
    let startIndex = 0

    // 解析标题行
    if (lines.length > 0) {
      fields = this.parseLine(lines[0], delimiter)
      startIndex = 1
    }

    // 批量处理
    let batch: Record<string, unknown>[] = []

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue

      try {
        const values = this.parseLine(line, delimiter)
        const row: Record<string, unknown> = {}

        values.forEach((value, index) => {
          const fieldName = fields[index] || `field_${index}`
          row[fieldName] = this.parseValue(value)
        })

        batch.push(row)

        if (batch.length >= batchSize) {
          yield batch
          batch = []
        }
      } catch (error) {
        logger.warn(`行 ${i + 1} 解析失败: ${error}`, { category: 'import-parser' })
      }
    }

    // 返回剩余数据
    if (batch.length > 0) {
      yield batch
    }
  }

  /**
   * 解析文件预览
   */
  async preview(content: string, maxRows = 10): Promise<{
    fields: string[]
    data: Record<string, unknown>[]
    totalRows: number
  }> {
    const result = await this.parse(content, { format: 'csv', maxRows, skipHeader: true })
    return {
      fields: result.fields,
      data: result.data.slice(0, maxRows),
      totalRows: result.totalRows,
    }
  }

  /**
   * 检测分隔符
   */
  detectDelimiter(content: string): string {
    const commonDelimiters = [',', ';', '\t', '|']
    const firstLine = content.split('\n')[0]

    for (const delimiter of commonDelimiters) {
      const count = (firstLine.match(new RegExp(this.escapeRegex(delimiter), 'g')) || []).length
      if (count > 0) return delimiter
    }

    return this.defaultDelimiter
  }

  /**
   * 拆分行
   */
  private splitLines(content: string): string[] {
    return content.split(/\r?\n/)
  }

  /**
   * 解析单行
   */
  private parseLine(line: string, delimiter: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          current += '"'
          i++ // 跳过下一个引号
        } else if (char === '"') {
          inQuotes = false
        } else {
          current += char
        }
      } else {
        if (char === '"') {
          inQuotes = true
        } else if (char === delimiter) {
          result.push(current)
          current = ''
        } else {
          current += char
        }
      }
    }

    result.push(current)
    return result
  }

  /**
   * 解析值
   */
  private parseValue(value: string): unknown {
    // 空值
    if (value === '' || value === null || value === undefined) {
      return null
    }

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

    // 返回字符串
    return value
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

// 导出单例
export const csvParser = new CSVParser()
