/**
 * @fileoverview Field Transformer
 * @description 字段转换器，支持字段映射和类型转换
 * @version 1.12.0
 */

import { logger } from '../logger'
import type { FieldMapping } from './types'

/**
 * 字段转换器
 */
export class FieldTransformer {
  /**
   * 转换数据
   */
  transform(
    data: Record<string, unknown>[],
    mappings: FieldMapping[]
  ): Record<string, unknown>[] {
    return data.map((row, index) => this.transformRow(row, mappings, index))
  }

  /**
   * 转换单行数据
   */
  private transformRow(
    row: Record<string, unknown>,
    mappings: FieldMapping[],
    index: number
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    for (const mapping of mappings) {
      try {
        // 获取源字段值
        let value = row[mapping.sourceField]

        // 如果值为空且定义了默认值，使用默认值
        if (value === null || value === undefined || value === '') {
          if (mapping.defaultValue !== undefined) {
            value = mapping.defaultValue
          }
        }

        // 类型转换
        // 未声明 type 时保持原始类型（不做隐式 String() 强转，避免数字/布尔被抹平成字符串）
        if (value !== null && value !== undefined && mapping.type) {
          value = this.convertType(value, mapping.type)
        }

        // 自定义转换
        if (mapping.transform && value !== null && value !== undefined) {
          value = mapping.transform(value, row)
        }

        // 验证
        if (mapping.validate && value !== null && value !== undefined) {
          const validationResult = mapping.validate(value)
          if (validationResult === false) {
            logger.warn(`行 ${index + 1} 字段 "${mapping.targetField}" 验证失败`, {
              category: 'import-transformer',
              value,
            })
          } else if (typeof validationResult === 'string') {
            logger.warn(`行 ${index + 1} 字段 "${mapping.targetField}" 验证失败: ${validationResult}`, {
              category: 'import-transformer',
              value,
            })
          }
        }

        // 检查必填字段
        if (mapping.required && (value === null || value === undefined || value === '')) {
          logger.warn(`行 ${index + 1} 必填字段 "${mapping.targetField}" 为空`, {
            category: 'import-transformer',
          })
        }

        result[mapping.targetField] = value
      } catch (error) {
        logger.error(
          `行 ${index + 1} 字段 "${mapping.sourceField}" 转换失败`,
          error,
          { category: 'import-transformer' }
        )
        result[mapping.targetField] = row[mapping.sourceField]
      }
    }

    return result
  }

  /**
   * 类型转换
   */
  private convertType(value: unknown, type: string): unknown {
    if (value === null || value === undefined) {
      return null
    }

    try {
      switch (type) {
        case 'string':
          // 对象/数组转字符串时用 JSON，避免得到 "[object Object]"
          if (typeof value === 'object' && value !== null) {
            try {
              return JSON.stringify(value)
            } catch {
              return String(value)
            }
          }
          return String(value)

        case 'number': {
          if (typeof value === 'number') return value
          if (typeof value === 'boolean') return value ? 1 : 0
          const text = String(value).trim()
          if (text === '') return null
          // 去除千分位分隔符
          const normalized = text.replace(/,/g, '')
          const num = Number(normalized)
          return isNaN(num) ? value : num
        }

        case 'boolean': {
          if (typeof value === 'boolean') return value
          if (typeof value === 'string') {
            const lower = value.toLowerCase()
            if (lower === 'true' || lower === '1' || lower === 'yes') return true
            if (lower === 'false' || lower === '0' || lower === 'no') return false
          }
          if (typeof value === 'number') return Boolean(value)
          return value
        }

        case 'date': {
          if (value instanceof Date) return value
          const date = new Date(String(value))
          return isNaN(date.getTime()) ? value : date
        }

        case 'json': {
          if (typeof value === 'object') return value
          try {
            return JSON.parse(String(value))
          } catch {
            return value
          }
        }

        default:
          return value
      }
    } catch (error) {
      logger.warn(`类型转换失败: ${type}`, { category: 'import-transformer', value, error })
      return value
    }
  }

  /**
   * 创建字段映射
   */
  static createMapping(
    sourceField: string,
    targetField: string,
    options?: Partial<FieldMapping>
  ): FieldMapping {
    return {
      sourceField,
      targetField,
      ...options,
    }
  }

  /**
   * 推断值的类型
   */
  static inferType(value: unknown): NonNullable<FieldMapping['type']> {
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    if (value instanceof Date) return 'date'
    if (typeof value === 'object' && value !== null) return 'json'
    return 'string'
  }

  /**
   * 自动生成字段映射
   * @param sourceFields 源字段名
   * @param targetFields 目标字段名
   * @param sampleValues 可选的样本值，用于推断字段类型；未提供时不做类型转换
   */
  static autoGenerateMapping(
    sourceFields: string[],
    targetFields: string[],
    sampleValues?: Record<string, unknown>
  ): FieldMapping[] {
    const mappings: FieldMapping[] = []

    for (const source of sourceFields) {
      // 尝试匹配目标字段
      const target = this.findBestMatch(source, targetFields)

      const mapping: FieldMapping = {
        sourceField: source,
        targetField: target || source,
      }

      // 有样本值时推断类型，没有样本值时保持 type 未定义（原样透传）
      if (sampleValues && Object.prototype.hasOwnProperty.call(sampleValues, source)) {
        mapping.type = this.inferType(sampleValues[source])
      }

      mappings.push(mapping)
    }

    return mappings
  }

  /**
   * 查找最佳匹配
   */
  private static findBestMatch(source: string, targets: string[]): string | null {
    const normalizedSource = source.toLowerCase().replace(/[_\s]/g, '')

    for (const target of targets) {
      const normalizedTarget = target.toLowerCase().replace(/[_\s]/g, '')

      // 完全匹配
      if (normalizedSource === normalizedTarget) {
        return target
      }

      // 包含匹配
      if (normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource)) {
        return target
      }
    }

    return null
  }
}

// 导出单例
export const fieldTransformer = new FieldTransformer()