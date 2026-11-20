/**
 * @fileoverview 导出核心 - 通用导出器
 * @description 支持 CSV/JSON/Excel 格式的统一导出接口
 * @version 2.0.0
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
 * 提供统一的导出接口，支持多种格式
 */
export class DataExporter<T extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * 执行导出
   */
  async export(data: T[], config: ExportConfig<T>): Promise<ExportResult> {
    try {
      // 根据格式选择导出方法
      switch (config.format) {
        case 'csv':
          return this.exportCSV(data, config)
        case 'json':
          return this.exportJSON(data, config)
        case 'xlsx':
        case 'excel':
          return this.exportExcel(data, config)
        default:
          return { success: false, error: `不支持的导出格式: ${config.format}` }
      }
    } catch (error) {
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

      // 生成 CSV 内容
      const csvLines: string[] = []

      // 表头
      if (config.includeHeader !== false) {
        csvLines.push(fields.map(f => this.escapeCSV(f.label)).join(','))
      }

      // 数据行
      rows.forEach(row => {
        csvLines.push(fields.map(f => this.escapeCSV(this.formatValue(row[f.key], f, row))).join(','))
      })

      // 创建 Blob
      const csvContent = csvLines.join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })

      return {
        success: true,
        blob,
        filename: `${config.filename}.csv`,
        rowCount: rows.length,
        columnCount: fields.length,
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
   * 导出 JSON
   */
  private exportJSON(data: T[], config: ExportConfig<T>): ExportResult {
    try {
      const fields = this.getSelectedFields(config)
      const rows = this.processData(data, fields, config)

      // 处理时间戳格式
      const processedRows = rows.map(row => {
        const processedRow: Record<string, unknown> = {}
        fields.forEach(f => {
          processedRow[String(f.key)] = this.formatValue(row[f.key], f, row)
        })
        return processedRow
      })

      // 创建 JSON Blob
      const jsonContent = JSON.stringify(processedRows, null, 2)
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' })

      return {
        success: true,
        blob,
        filename: `${config.filename}.json`,
        rowCount: rows.length,
        columnCount: fields.length,
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

      // 创建工作簿
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(config.sheetName || 'Sheet1')

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
        })
      }

      // 冻结行
      if (config.excelOptions?.freezeRows) {
        worksheet.views = [{
          state: 'frozen',
          ySplit: config.excelOptions.freezeRows,
        }]
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
   * 获取选中的字段
   */
  private getSelectedFields(config: ExportConfig<T>): ExportField<T>[] {
    if (config.selectedFields && config.selectedFields.length > 0) {
      return config.fields
        .filter(f => config.selectedFields!.includes(f.key))
        .sort((a, b) => (a.order || 0) - (b.order || 0))
    }
    return config.fields.sort((a, b) => (a.order || 0) - (b.order || 0))
  }

  /**
   * 处理数据
   */
  private processData(data: T[], fields: ExportField<T>[], config: ExportConfig<T>): T[] {
    let processed = [...data]

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
   * 格式化值
   */
  private formatValue(value: unknown, field: ExportField<T>, row: T): string | number | boolean | null {
    if (value === null || value === undefined) {
      return ''
    }

    // 使用自定义格式化器
    if (field.formatter) {
      return field.formatter(value as T[keyof T], row)
    }

    // 处理日期
    if (value instanceof Date) {
      const formatter = (field.formatter || 'iso') as string
      switch (formatter) {
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
    const str = String(value || '')
    
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
