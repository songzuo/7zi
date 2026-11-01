/**
 * @fileoverview CSV Parser
 * @description 支持流式处理和大文件的 CSV 解析器
 * @version 1.12.0
 */

import { logger } from '../../logger'
import type { ParseOptions, ParseResult, ParseError, ParseWarning } from '../types'

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
      const records = this.splitRecords(content)

      // 空文件：没有任何有效内容
      if (records.length === 0 || (records.length === 1 && records[0].trim() === '')) {
        return {
          success: true,
          data: [],
          fields: [],
          totalRows: 0,
          errors,
          warnings,
        }
      }

      // 表头始终用于确定字段名（与 ExcelParser 行为一致）；
      // skipHeader=false 时表头行本身也作为一条数据行处理
      const fields = this.parseLine(records[0], delimiter)
      const startIndex = skipHeader ? 1 : 0
      this.checkHeader(fields, warnings)

      // 统计全部数据行数（不受 maxRows 限制，totalRows 表示文件的完整数据行数）
      let totalRows = 0
      for (let i = startIndex; i < records.length; i++) {
        if (!records[i].trim()) continue
        totalRows++
      }

      // 解析数据行
      let parsed = 0
      for (let i = startIndex; i < records.length; i++) {
        const record = records[i]
        if (!record.trim()) continue

        if (maxRows !== undefined && parsed >= maxRows) break

        try {
          const values = this.parseLine(record, delimiter)
          const row: Record<string, unknown> = {}

          // 映射字段（缺失的列补 null，多余的列落到 field_N）
          values.forEach((value, index) => {
            const fieldName = this.resolveFieldName(fields, index)
            row[fieldName] = this.parseValue(value)
          })

          // 表头列数不足时，补齐为 null
          if (values.length < fields.length) {
            for (let index = values.length; index < fields.length; index++) {
              const fieldName = this.resolveFieldName(fields, index)
              row[fieldName] = null
              warnings.push({
                row: i + 1,
                field: fieldName,
                message: `字段数量少于表头（期望 ${fields.length} 列，实际 ${values.length} 列），缺失列按 null 处理`,
                rawValue: record,
              })
            }
          }

          // 超出表头列数的值
          if (values.length > fields.length) {
            for (let index = fields.length; index < values.length; index++) {
              warnings.push({
                row: i + 1,
                field: `field_${index}`,
                message: `字段数量多于表头（期望 ${fields.length} 列，实际 ${values.length} 列），多余值存入 field_${index}`,
                rawValue: record,
              })
            }
          }

          data.push(row)
          parsed++
        } catch (error) {
          errors.push({
            row: i + 1,
            message: error instanceof Error ? error.message : '解析失败',
            rawValue: record,
          })
        }
      }

      return {
        success: errors.length === 0,
        data,
        fields,
        totalRows,
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
    const records = this.splitRecords(content)

    let fields: string[] = []
    let startIndex = 0

    if (records.length > 0 && records[0].trim() !== '') {
      fields = this.parseLine(records[0], delimiter)
      startIndex = 1
    }

    // 批量处理
    let batch: Record<string, unknown>[] = []

    for (let i = startIndex; i < records.length; i++) {
      const record = records[i]
      if (!record.trim()) continue

      try {
        const values = this.parseLine(record, delimiter)
        const row: Record<string, unknown> = {}

        values.forEach((value, index) => {
          const fieldName = this.resolveFieldName(fields, index)
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
   * 拆分为 CSV 记录（正确处理引号内嵌的换行）
   */
  private splitRecords(content: string): string[] {
    // 去掉 BOM
    const text = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content

    const records: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < text.length; i++) {
      const char = text[i]

      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '""'
          i++
          continue
        }
        inQuotes = !inQuotes
        current += char
        continue
      }

      if (!inQuotes && (char === '\n' || char === '\r')) {
        if (char === '\r' && text[i + 1] === '\n') i++
        records.push(current)
        current = ''
        continue
      }

      current += char
    }

    if (current.length > 0) {
      records.push(current)
    }

    return records
  }

  /**
   * 解析单行（支持引号、"" 转义、引号内分隔符）
   */
  private parseLine(line: string, delimiter: string): string[] {
    const result: string[] = []
    let i = 0

    while (true) {
      let value = ''

      if (line[i] === '"') {
        // 引号字段："" 表示字面量引号
        i++
        while (i < line.length) {
          const char = line[i]
          if (char === '"') {
            if (line[i + 1] === '"') {
              value += '"'
              i += 2
              continue
            }
            i++
            break
          }
          value += char
          i++
        }
        // 跳过闭合引号之后到分隔符之间的内容
        while (i < line.length && line[i] !== delimiter) i++
      } else {
        const start = i
        while (i < line.length && line[i] !== delimiter) i++
        // 未加引号的字段去除首尾空白
        value = line.slice(start, i).trim()
      }

      result.push(value)

      if (i < line.length && line[i] === delimiter) {
        i++
        continue
      }
      break
    }

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

    // 保留前导零的字符串（如邮编 007、订单号 000123）
    if (/^0\d/.test(value)) {
      return value
    }

    // 尝试解析为数字（含小数、指数）
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(value)) {
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
   * 解析字段名：优先使用表头，缺失或为空时回退到 field_N
   */
  private resolveFieldName(fields: string[], index: number): string {
    const name = fields[index]
    if (name && name.trim() !== '') return name
    return `field_${index}`
  }

  /**
   * 表头检查：重复列名告警
   */
  private checkHeader(fields: string[], warnings: ParseWarning[]): void {
    const seen = new Set<string>()
    fields.forEach((field, index) => {
      if (!field || field.trim() === '') return
      if (seen.has(field)) {
        warnings.push({
          row: 1,
          field,
          message: `重复的表头字段 "${field}"（第 ${index + 1} 列），后出现的值会覆盖先出现的值`,
        })
      }
      seen.add(field)
    })
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
