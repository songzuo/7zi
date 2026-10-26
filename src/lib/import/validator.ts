/**
 * @fileoverview Data Import Validator
 * @description 数据验证器，支持多种验证规则和自定义验证
 * @version 1.12.0
 */

import { logger } from '../logger'
import type {
  ValidationRule,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationLevel,
} from './types'

/**
 * 数据验证器
 */
export class ImportValidator {
  /**
   * 验证数据
   */
  async validate(
    data: Record<string, unknown>[],
    rules: ValidationRule[],
    level: ValidationLevel = 'normal'
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    let validRows = 0
    let invalidRows = 0
    let warningRows = 0

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const rowNumber = i + 1
      let rowHasErrors = false
      let rowHasWarnings = false

      for (const rule of rules) {
        const result = await this.validateField(row, rule, rowNumber, level)

        if (result.error) {
          errors.push(result.error)
          rowHasErrors = true
        }

        if (result.warning) {
          warnings.push(result.warning)
          rowHasWarnings = true
        }
      }

      if (rowHasErrors) {
        invalidRows++
      } else if (rowHasWarnings) {
        warningRows++
        validRows++
      } else {
        validRows++
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        totalRows: data.length,
        validRows,
        invalidRows,
        warningRows,
      },
    }
  }

  /**
   * 验证单个字段
   */
  private async validateField(
    row: Record<string, unknown>,
    rule: ValidationRule,
    rowNumber: number,
    level: ValidationLevel
  ): Promise<{ error?: ValidationError; warning?: ValidationWarning }> {
    const value = row[rule.field]
    const ruleLevel = rule.level || 'error'

    // 根据验证级别决定是否执行
    if (level === 'strict' && ruleLevel === 'warning') {
      // 严格模式下，警告也视为错误
      const result = await this.executeRule(value, row, rule)
      if (result) {
        return {
          error: {
            row: rowNumber,
            field: rule.field,
            message: result,
            value,
            rule: rule.type,
          },
        }
      }
    } else if (level === 'loose' && ruleLevel === 'error') {
      // 宽松模式下，错误降级为警告
      const result = await this.executeRule(value, row, rule)
      if (result) {
        return {
          warning: {
            row: rowNumber,
            field: rule.field,
            message: result,
            value,
          },
        }
      }
    } else {
      // 正常模式
      const result = await this.executeRule(value, row, rule)
      if (result) {
        if (ruleLevel === 'error') {
          return {
            error: {
              row: rowNumber,
              field: rule.field,
              message: result,
              value,
              rule: rule.type,
            },
          }
        } else {
          return {
            warning: {
              row: rowNumber,
              field: rule.field,
              message: result,
              value,
            },
          }
        }
      }
    }

    return {}
  }

  /**
   * 执行验证规则
   */
  private async executeRule(
    value: unknown,
    row: Record<string, unknown>,
    rule: ValidationRule
  ): Promise<string | null> {
    try {
      switch (rule.type) {
        case 'required':
          return this.validateRequired(value, rule)
        case 'type':
          return this.validateType(value, rule)
        case 'format':
          return this.validateFormat(value, rule)
        case 'range':
          return this.validateRange(value, rule)
        case 'unique':
          return this.validateUnique(value, row, rule)
        case 'custom':
          return this.validateCustom(value, row, rule)
        default:
          return null
      }
    } catch (error) {
      logger.error(`验证规则执行失败: ${rule.type}`, error, { category: 'import-validator' })
      return rule.message || '验证失败'
    }
  }

  /**
   * 验证必填字段
   */
  private validateRequired(value: unknown, rule: ValidationRule): string | null {
    if (value === null || value === undefined || value === '') {
      return rule.message || `字段 "${rule.field}" 是必填的`
    }
    return null
  }

  /**
   * 验证字段类型
   */
  private validateType(value: unknown, rule: ValidationRule): string | null {
    const expectedType = rule.params?.type as string

    if (value === null || value === undefined) {
      return null // 空值由 required 规则处理
    }

    let isValid = false

    switch (expectedType) {
      case 'string':
        isValid = typeof value === 'string'
        break
      case 'number':
        isValid = typeof value === 'number' && !isNaN(value)
        break
      case 'boolean':
        isValid = typeof value === 'boolean'
        break
      case 'date':
        isValid = !isNaN(Date.parse(String(value)))
        break
      case 'array':
        isValid = Array.isArray(value)
        break
      case 'object':
        isValid = typeof value === 'object' && !Array.isArray(value)
        break
      default:
        return `未知类型: ${expectedType}`
    }

    if (!isValid) {
      return rule.message || `字段 "${rule.field}" 必须是 ${expectedType} 类型`
    }

    return null
  }

  /**
   * 验证字段格式
   */
  private validateFormat(value: unknown, rule: ValidationRule): string | null {
    if (value === null || value === undefined) {
      return null
    }

    const format = rule.params?.format as string
    const strValue = String(value)

    let regex: RegExp

    switch (format) {
      case 'email':
        regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        break
      case 'phone':
        regex = /^\+?[\d\s-()]+$/
        break
      case 'url':
        regex = /^https?:\/\/.+/
        break
      case 'uuid':
        regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        break
      case 'date':
        regex = /^\d{4}-\d{2}-\d{2}$/
        break
      case 'datetime':
        regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
        break
      case 'custom':
        regex = new RegExp(rule.params?.pattern as string)
        break
      default:
        return `未知格式: ${format}`
    }

    if (!regex.test(strValue)) {
      return rule.message || `字段 "${rule.field}" 格式不正确`
    }

    return null
  }

  /**
   * 验证字段范围
   */
  private validateRange(value: unknown, rule: ValidationRule): string | null {
    if (value === null || value === undefined) {
      return null
    }

    const min = rule.params?.min as number
    const max = rule.params?.max as number

    if (typeof value === 'number') {
      if (min !== undefined && value < min) {
        return rule.message || `字段 "${rule.field}" 必须大于或等于 ${min}`
      }
      if (max !== undefined && value > max) {
        return rule.message || `字段 "${rule.field}" 必须小于或等于 ${max}`
      }
    } else if (typeof value === 'string') {
      const length = value.length
      if (min !== undefined && length < min) {
        return rule.message || `字段 "${rule.field}" 长度必须大于或等于 ${min}`
      }
      if (max !== undefined && length > max) {
        return rule.message || `字段 "${rule.field}" 长度必须小于或等于 ${max}`
      }
    } else if (Array.isArray(value)) {
      const length = value.length
      if (min !== undefined && length < min) {
        return rule.message || `字段 "${rule.field}" 数量必须大于或等于 ${min}`
      }
      if (max !== undefined && length > max) {
        return rule.message || `字段 "${rule.field}" 数量必须小于或等于 ${max}`
      }
    }

    return null
  }

  /**
   * 验证唯一性
   */
  private validateUnique(
    value: unknown,
    row: Record<string, unknown>,
    rule: ValidationRule
  ): string | null {
    // 这个验证需要在所有数据上执行，这里只是占位
    // 实际实现需要在 validate 方法中处理
    return null
  }

  /**
   * 自定义验证
   */
  private async validateCustom(
    value: unknown,
    row: Record<string, unknown>,
    rule: ValidationRule
  ): Promise<string | null> {
    if (rule.validate) {
      const result = rule.validate(value, row)
      if (typeof result === 'string') {
        return result
      } else if (result === false) {
        return rule.message || `字段 "${rule.field}" 验证失败`
      }
    }
    return null
  }

  /**
   * 创建常用验证规则
   */
  static createRules(): {
    required: (field: string, message?: string) => ValidationRule
    type: (field: string, type: string, message?: string) => ValidationRule
    email: (field: string, message?: string) => ValidationRule
    phone: (field: string, message?: string) => ValidationRule
    url: (field: string, message?: string) => ValidationRule
    range: (field: string, min?: number, max?: number, message?: string) => ValidationRule
    custom: (field: string, validate: (value: unknown, row: Record<string, unknown>) => boolean | string, message?: string) => ValidationRule
  } {
    return {
      required: (field: string, message?: string) => ({
        type: 'required',
        field,
        message,
      }),
      type: (field: string, type: string, message?: string) => ({
        type: 'type',
        field,
        params: { type },
        message,
      }),
      email: (field: string, message?: string) => ({
        type: 'format',
        field,
        params: { format: 'email' },
        message: message || `字段 "${field}" 必须是有效的邮箱地址`,
      }),
      phone: (field: string, message?: string) => ({
        type: 'format',
        field,
        params: { format: 'phone' },
        message: message || `字段 "${field}" 必须是有效的电话号码`,
      }),
      url: (field: string, message?: string) => ({
        type: 'format',
        field,
        params: { format: 'url' },
        message: message || `字段 "${field}" 必须是有效的 URL`,
      }),
      range: (field: string, min?: number, max?: number, message?: string) => ({
        type: 'range',
        field,
        params: { min, max },
        message,
      }),
      custom: (
        field: string,
        validate: (value: unknown, row: Record<string, unknown>) => boolean | string,
        message?: string
      ) => ({
        type: 'custom',
        field,
        validate,
        message,
      }),
    }
  }
}

// 导出单例
export const importValidator = new ImportValidator()