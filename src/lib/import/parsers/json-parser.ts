// @ts-nocheck
/**
 * @fileoverview JSON Parser
 * @description 支持 JSON 和 JSON Lines 格式的解析器
 * @version 1.12.0
 */

import { logger } from '../../logger'
import type { ParseOptions, ParseResult, ParseError, ParseWarning } from '../types'

/**
 * JSON 解析器
 * 支持标准 JSON 和 JSON Lines 格式
 */
export class JSONParser {
  /**
   * 解析 JSON 内容
   */
  async parse(content: string, options: ParseOptions = { format: 'json' }): Promise<ParseResult> {
    const errors: ParseError[] = []
    const warnings: ParseWarning[] = []

    try {
      // 尝试解析为 JSON Lines (每行一个 JSON 对象)
      if (this.isJSONLines(content)) {
        return this.parseJSONLines(content, options)
      }

      // 尝试解析为标准 JSON 数组
      const data = JSON.parse(content)

      if (!Array.isArray(data)) {
        return {
          success: false,
          data: [],
          fields: [],
          totalRows: 0,
          errors: [
            {
              message: 'JSON 必须是数组格式',
            },
          ],
          warnings,
        }
      }

      // 提取字段名
      const fields = this.extractFields(data)

      // 应用最大行数限制
      const limitedData = options.maxRows ? data.slice(0, options.maxRows) : data

      return {
        success: true,
        data: limitedData,
        fields,
        totalRows: data.length,
        errors,
        warnings,
      }
    } catch (error) {
      logger.error('JSON 解析失败', error, { category: 'import-parser' })
      return {
        success: false,
        data: [],
        fields: [],
        totalRows: 0,
        errors: [
          {
            message: error instanceof Error ? error.message : 'JSON 解析失败',
          },
        ],
        warnings,
      }
    }
  }

  /**
   * 流式解析 JSON Lines
   */
  async *parseStream(
    content: string,
    options: ParseOptions = { format: 'json' }
  ): AsyncGenerator<Record<string, unknown>[], void, unknown> {
    const batchSize = options.batchSize || 100
    const lines = content.split('\n')

    let batch: Record<string, unknown>[] = []

    for (const line of lines) {
      if (!line.trim()) continue

      try {
        const obj = JSON.parse(line)
        if (typeof obj === 'object' && obj !== null) {
          batch.push(obj)

          if (batch.length >= batchSize) {
            yield batch
            batch = []
          }
        }
      } catch (error) {
        logger.warn(`JSON 行解析失败: ${error}`, { category: 'import-parser' })
      }
    }

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
    const result = await this.parse(content, { format: 'json', maxRows })
    return {
      fields: result.fields,
      data: result.data.slice(0, maxRows),
      totalRows: result.totalRows,
    }
  }

  /**
   * 检测是否为 JSON Lines 格式
   */
  private isJSONLines(content: string): boolean {
    const lines = content.trim().split('\n')
    if (lines.length < 2) return false

    // 检查前几行是否都是有效的 JSON 对象
    const sampleSize = Math.min(lines.length, 5)
    for (let i = 0; i < sampleSize; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        const obj = JSON.parse(line)
        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
          return false
        }
      } catch {
        return false
      }
    }

    return true
  }

  /**
   * 解析 JSON Lines
   */
  private parseJSONLines(content: string, options: ParseOptions): ParseResult {
    const errors: ParseError[] = []
    const warnings: ParseWarning[] = []
    const data: Record<string, unknown>[] = []
    const fields = new Set<string>()

    const lines = content.split('\n')
    const maxRows = options.maxRows

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      if (maxRows && data.length >= maxRows) break

      try {
        const obj = JSON.parse(line)

        if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
          errors.push({
            row: i + 1,
            message: '每行必须是 JSON 对象',
          })
          continue
        }

        // 提取字段名
        Object.keys(obj).forEach(key => fields.add(key))

        data.push(obj)
      } catch (error) {
        errors.push({
          row: i + 1,
          message: error instanceof Error ? error.message : 'JSON 解析失败',
        })
      }
    }

    return {
      success: errors.length === 0,
      data,
      fields: Array.from(fields),
      totalRows: data.length,
      errors,
      warnings,
    }
  }

  /**
   * 提取字段名
   */
  private extractFields(data: unknown[]): string[] {
    const fields = new Set<string>()

    for (const item of data) {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(key => fields.add(key))
      }
    }

    return Array.from(fields)
  }
}

// 导出单例
export const jsonParser = new JSONParser()