/**
 * @fileoverview 导出核心 - 通用导出器
 * @description 支持 CSV/JSON/Excel 格式的统一导出接口
 * @version 3.0.0
 */

import { logger } from '../../logger'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 导出格式
 */
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'excel'

/**
 * Excel 列样式
 */
export interface ExcelColumnStyle {
  width?: number
  autoWidth?: boolean
  numFmt?: string
  alignment?: 'left' | 'center' | 'right'
}

/**
 * Excel 配置
 */
export interface ExcelOptions {
  freezeRows?: number
  autoFilter?: boolean
  columnStyles?: Record<string, ExcelColumnStyle>
  sheetName?: string
  headerStyle?: boolean
}

/**
 * 字段配置
 */
export interface ExportField<T = Record<string, unknown>> {
  key: keyof T
  label: string
  formatter?: (value: T[keyof T], row: T) => string | number | boolean | null
  defaultSelected?: boolean
  description?: string
  group?: string
  order?: number
  required?: boolean
  validator?: (value: T[keyof T]) => boolean | string
  width?: number
  numFmt?: string
}

/**
 * 导出配置
 */
export interface ExportConfig<T = Record<string, unknown>> {
  filename: string
  format: ExportFormat
  fields: ExportField<T>[]
  selectedFields?: (keyof T)[]
  sheetName?: string
  includeHeader?: boolean
  timestampFormat?: 'iso' | 'locale' | 'unix'
  transform?: (data: T[]) => T[]
  excelOptions?: ExcelOptions
  onValidate?: (row: T, index: number) => boolean | string
  onBeforeExport?: (data: T[]) => T[]
  onAfterExport?: (result: ExportResult) => void
}

/**
 * 导出结果
 */
export interface ExportResult {
  success: boolean
  blob?: Blob
  filename?: string
  error?: string
  rowCount?: number
  columnCount?: number
  warnings?: string[]
  validationErrors?: Array<{ row: number; field: string; message: string }>
}

// ============================================================================
// 导出器类
// ============================================================================

/**
 * 数据导出器
 * 提供统一的导出接口，支持多种格式。
 *
 * 两种用法：
 * 1. 构造时传入配置：`new DataExporter(cfg).export(data)`
 * 2. 导出时传入配置：`new DataExporter().export(data, cfg)`
 */
export class DataExporter<T extends Record<string, unknown> = Record<string, unknown>> {
  private readonly baseConfig?: Partial<ExportConfig<T>>

  constructor(config?: Partial<ExportConfig<T>>) {
    this.baseConfig = config
  }

  /**
   * 合并构造配置与调用配置
   */
  private resolveConfig(config?: Partial<ExportConfig<T>>): ExportConfig<T> {
    const merged = { ...(this.baseConfig ?? {}), ...(config ?? {}) } as ExportConfig<T>
    if (!merged.fields) merged.fields = []
    if (!merged.filename) merged.filename = 'export'
    if (!merged.format) merged.format = 'csv'
    return merged
  }

  /**
   * 执行导出
   */
  async export(data: T[], config?: Partial<ExportConfig<T>>): Promise<ExportResult> {
    const resolved = this.resolveConfig(config)
    try {
      // 根据格式选择导出方法
      switch (resolved.format) {
        case 'csv':
          return this.exportCSV(data, resolved)
        case 'json':
          return this.exportJSON(data, resolved)
        case 'xlsx':
        case 'excel':
          return await this.exportExcel(data, resolved)
        default:
          return { success: false, error: `不支持的导出格式: ${resolved.format}` }
      }
    } catch (error) {
      logger.error('[DataExporter] 导出失败', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
      }
    }
  }

  /**
   * 导出 CSV
   */
  private exportCSV(data: T[], config: ExportConfig<T>): ExportResult {
    try {
      const fields = this.getSelectedFields(config)
      const rows = this.processData(data, fields, config)
      const validationErrors = this.validateRows(rows, fields, config)

      // 生成 CSV 内容
      const csvLines: string[] = []

      // 表头
      if (config.includeHeader !== false) {
        csvLines.push(fields.map(f => this.escapeCSV(f.label)).join(','))
      }

      // 数据行
      rows.forEach(row => {
        csvLines.push(
          fields.map(f => this.escapeCSV(this.formatValue(row[f.key], f, row))).join(',')
        )
      })

      // 创建 Blob
      const csvContent = csvLines.join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })

      return {
        success: true,
        blob,
        filename: `${config.filename}.csv`,
        rowCount: rows.length,
        columnCount: fields.length,
        validationErrors,
      }
    } catch (error) {
      logger.error('[DataExporter] CSV 导出失败', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'CSV 导出失败',
      }
    }
  }

  /**
   * 导出 JSON（以字段 label 作为键）
   */
  private exportJSON(data: T[], config: ExportConfig<T>): ExportResult {
    try {
      const fields = this.getSelectedFields(config)
      const rows = this.processData(data, fields, config)
      const validationErrors = this.validateRows(rows, fields, config)

      const processedRows = rows.map(row => {
        const processedRow: Record<string, unknown> = {}
        fields.forEach(f => {
          processedRow[f.label] = this.formatValue(row[f.key], f, row)
        })
        return processedRow
      })

      // 创建 JSON Blob
      const jsonContent = JSON.stringify(processedRows, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' })

      return {
        success: true,
        blob,
        filename: `${config.filename}.json`,
        rowCount: rows.length,
        columnCount: fields.length,
        validationErrors,
      }
    } catch (error) {
      logger.error('[DataExporter] JSON 导出失败', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'JSON 导出失败',
      }
    }
  }

  /**
   * 导出 Excel
   */
  private async exportExcel(data: T[], config: ExportConfig<T>): Promise<ExportResult> {
    try {
      const ExcelJS = await import('exceljs')
      const fields = this.getSelectedFields(config)
      const rows = this.processData(data, fields, config)
      const validationErrors = this.validateRows(rows, fields, config)

      // 创建工作簿
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(config.sheetName || config.excelOptions?.sheetName || 'Sheet1')

      // 表头行
      if (config.includeHeader !== false) {
        const headerRow = worksheet.addRow(fields.map(f => f.label))
        headerRow.font = { bold: true }
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        }
      }

      // 数据行
      rows.forEach(row => {
        worksheet.addRow(fields.map(f => this.formatValue(row[f.key], f, row)))
      })

      // 列宽设置
      if (config.excelOptions?.columnStyles) {
        fields.forEach((f, i) => {
          const col = worksheet.getColumn(i + 1)
          const style = config.excelOptions?.columnStyles?.[String(f.key)]
          if (style?.width) {
            col.width = style.width
          } else if (style?.autoWidth) {
            col.width = 15
          }
          if (f.width) {
            col.width = f.width
          }
        })
      }

      // 冻结行
      if (config.excelOptions?.freezeRows) {
        worksheet.views = [
          {
            state: 'frozen',
            ySplit: config.excelOptions.freezeRows,
          },
        ]
      }

      // 自动筛选
      if (config.excelOptions?.autoFilter) {
        worksheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: rows.length + 1, column: fields.length },
        }
      }

      // 写入缓冲区
      const excelBuffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      return {
        success: true,
        blob,
        filename: `${config.filename}.xlsx`,
        rowCount: rows.length,
        columnCount: fields.length,
        validationErrors,
      }
    } catch (error) {
      logger.error('[DataExporter] Excel 导出失败', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Excel 导出失败',
      }
    }
  }

  /**
   * 获取参与导出的字段
   * - 指定 selectedFields 时按其过滤
   * - 否则排除 defaultSelected === false 的字段
   */
  private getSelectedFields(config: ExportConfig<T>): ExportField<T>[] {
    const all = [...(config.fields ?? [])]
    const filtered =
      config.selectedFields && config.selectedFields.length > 0
        ? all.filter(f => config.selectedFields!.includes(f.key))
        : all.filter(f => f.defaultSelected !== false)
    return filtered.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  /**
   * 处理数据
   */
  private processData(data: T[], fields: ExportField<T>[], config: ExportConfig<T>): T[] {
    let processed = [...(data ?? [])]

    // 数据转换
    if (config.transform) {
      processed = config.transform(processed)
    }

    // 导出前回调
    if (config.onBeforeExport) {
      processed = config.onBeforeExport(processed)
    }

    return processed
  }

  /**
   * 行级与字段级校验
   */
  private validateRows(
    rows: T[],
    fields: ExportField<T>[],
    config: ExportConfig<T>
  ): Array<{ row: number; field: string; message: string }> {
    const errors: Array<{ row: number; field: string; message: string }> = []

    rows.forEach((row, index) => {
      fields.forEach(field => {
        const value = row?.[field.key]

        // required 校验：null / undefined / 空字符串视为缺失
        if (field.required && (value === null || value === undefined || value === '')) {
          errors.push({
            row: index,
            field: String(field.key),
            message: `${field.label} 为必填项`,
          })
          return
        }

        // 自定义字段校验器
        if (field.validator) {
          const outcome = field.validator(value)
          if (outcome === false) {
            errors.push({
              row: index,
              field: String(field.key),
              message: `${field.label} 校验未通过`,
            })
          } else if (typeof outcome === 'string' && outcome) {
            errors.push({ row: index, field: String(field.key), message: outcome })
          }
        }
      })

      // 行级校验回调
      if (config.onValidate) {
        const outcome = config.onValidate(row, index)
        if (outcome === false) {
          errors.push({ row: index, field: '*', message: `第 ${index + 1} 行校验未通过` })
        } else if (typeof outcome === 'string' && outcome) {
          errors.push({ row: index, field: '*', message: outcome })
        }
      }
    })

    return errors
  }

  /**
   * 格式化值
   * - 有 formatter 时完全交给 formatter 处理（formatter 可接收 null）
   * - 无 formatter 时 null / undefined 保留为 null
   */
  private formatValue(value: unknown, field: ExportField<T>, row: T): string | number | boolean | null {
    // 使用自定义格式化器
    if (field.formatter) {
      const result = field.formatter(value as T[keyof T], row)
      return result === undefined ? null : result
    }

    if (value === null || value === undefined) {
      return null
    }

    // 处理日期
    if (value instanceof Date) {
      const mode = (field.numFmt || 'iso') as string
      switch (mode) {
        case 'locale':
          return value.toLocaleString()
        case 'unix':
          return value.getTime()
        case 'iso':
        default:
          return value.toISOString()
      }
    }

    // 处理对象/数组
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }

    return value as string | number | boolean
  }

  /**
   * CSV 转义
   */
  private escapeCSV(value: unknown): string {
    const str = value === null || value === undefined ? '' : String(value)

    // 如果包含逗号、引号或换行符，需要转义
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }

    return str
  }
}

// ============================================================================
// 导出
// ============================================================================

/**
 * 触发浏览器下载
 * @param result 导出结果
 */
export function downloadExport(result: ExportResult): void {
  if (!result.success || !result.blob || !result.filename) {
    return
  }

  const url = URL.createObjectURL(result.blob)
  const link = document.createElement('a')
  link.href = url
  link.download = result.filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default DataExporter
