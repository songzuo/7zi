/**
 * @fileoverview 数据导出工具
 * @description 支持多种格式的数据导出（CSV、JSON、Excel）
 * @version 2.0.0 - 增强版本
 * @changelog
 * - 添加自定义字段支持
 * - Excel 样式增强（列宽、自动筛选、冻结表头）
 * - 添加更多预定义格式化器
 * - 支持导出模板
 * - 支持数据验证
 * - 支持多工作表导出
 */

import { logger } from '../logger'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 支持的导出格式
 */
export type ExportFormat = 'csv' | 'json' | 'xlsx' | 'excel'

/**
 * Excel 列样式
 */
export interface ExcelColumnStyle {
  /** 列宽（字符数） */
  width?: number
  /** 自动宽度 */
  autoWidth?: boolean
  /** 数字格式 */
  numFmt?: string
  /** 水平对齐 */
  alignment?: 'left' | 'center' | 'right'
}

/**
 * Excel 配置
 */
export interface ExcelOptions {
  /** 冻结表头行数 */
  freezeRows?: number
  /** 自动筛选 */
  autoFilter?: boolean
  /** 列样式 */
  columnStyles?: Record<string, ExcelColumnStyle>
  /** 工作表名称 */
  sheetName?: string
  /** 是否包含表头样式 */
  headerStyle?: boolean
}

/**
 * 字段配置
 */
export interface ExportField<T = Record<string, unknown>> {
  /** 字段键名 */
  key: keyof T
  /** 显示名称 */
  label: string
  /** 自定义格式化函数 */
  formatter?: (value: T[keyof T], row: T) => string | number | boolean | null
  /** 是否默认选中 */
  defaultSelected?: boolean
  /** 字段描述（用于帮助提示） */
  description?: string
  /** 字段分组 */
  group?: string
  /** 字段顺序 */
  order?: number
  /** 是否必填 */
  required?: boolean
  /** 验证函数 */
  validator?: (value: T[keyof T]) => boolean | string
  /** Excel 列宽 */
  width?: number
  /** Excel 数字格式 */
  numFmt?: string
}

/**
 * 导出配置（增强版）
 */
export interface ExportConfig<T = Record<string, unknown>> {
  /** 文件名（不含扩展名） */
  filename: string
  /** 导出格式 */
  format: ExportFormat
  /** 要导出的字段配置 */
  fields: ExportField<T>[]
  /** 选中的字段键名（可选，不指定则导出所有） */
  selectedFields?: (keyof T)[]
  /** 工作表名称（仅 Excel） */
  sheetName?: string
  /** 是否包含表头 */
  includeHeader?: boolean
  /** 时间戳格式 */
  timestampFormat?: 'iso' | 'locale' | 'unix'
  /** 自定义数据处理 */
  transform?: (data: T[]) => T[]
  /** Excel 高级选项 */
  excelOptions?: ExcelOptions
  /** 数据验证回调 */
  onValidate?: (row: T, index: number) => boolean | string
  /** 导出前回调 */
  onBeforeExport?: (data: T[]) => T[]
  /** 导出后回调 */
  onAfterExport?: (result: ExportResult) => void
}

/**
 * 导出结果（增强版）
 */
export interface ExportResult {
  success: boolean
  blob?: Blob
  filename?: string
  error?: string
  /** 导出的行数 */
  rowCount?: number
  /** 导出的列数 */
  columnCount?: number
  /** 警告信息 */
  warnings?: string[]
  /** 验证错误 */
  validationErrors?: Array<{ row: number; field: string; message: string }>
}

/**
 * 导出模板
 */
export interface ExportTemplate<T = Record<string, unknown>> {
  /** 模板ID */
  id: string
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description?: string
  /** 字段配置 */
  fields: ExportField<T>[]
  /** 默认配置 */
  defaultConfig?: Partial<ExportConfig<T>>
  /** 创建时间 */
  createdAt?: string
  /** 更新时间 */
  updatedAt?: string
}

/**
 * 多工作表配置
 */
export interface MultiSheetConfig<T = Record<string, unknown>> {
  /** 文件名 */
  filename: string
  /** 工作表配置列表 */
  sheets: Array<{
    name: string
    data: T[]
    fields: ExportField<T>[]
    config?: Partial<ExportConfig<T>>
  }>
}

// ============================================================================
// 核心导出类
// ============================================================================

/**
 * 数据导出器（增强版）
 */
export class DataExporter<T extends Record<string, unknown>> {
  private config: ExportConfig<T>
  private warnings: string[] = []
  private validationErrors: Array<{ row: number; field: string; message: string }> = []

  constructor(config: ExportConfig<T>) {
    this.config = {
      includeHeader: true,
      timestampFormat: 'locale',
      sheetName: 'Sheet1',
      excelOptions: {
        freezeRows: 1,
        autoFilter: true,
        headerStyle: true,
      },
      ...config,
    }
  }

  /**
   * 执行导出（增强版）
   */
  async export(data: T[]): Promise<ExportResult> {
    try {
      // 重置警告和验证错误
      this.warnings = []
      this.validationErrors = []

      // 导出前回调
      let processedData = data
      if (this.config.onBeforeExport) {
        processedData = this.config.onBeforeExport(data)
      }

      // 数据预处理
      if (this.config.transform) {
        processedData = this.config.transform(processedData)
      }

      // 数据验证（包括行级和字段级）
      this.validateData(processedData)

      // 根据格式选择导出方法
      let result: ExportResult
      switch (this.config.format) {
        case 'csv':
          result = this.exportCSV(processedData)
          break
        case 'json':
          result = this.exportJSON(processedData)
          break
        case 'xlsx':
        case 'excel':
          result = await this.exportExcel(processedData)
          break
        default:
          return { success: false, error: `不支持的导出格式: ${this.config.format}` }
      }

      // 添加额外信息
      result.rowCount = processedData.length
      result.columnCount = this.getSelectedFields().length
      result.warnings = this.warnings.length > 0 ? this.warnings : undefined
      result.validationErrors = this.validationErrors.length > 0 ? this.validationErrors : undefined

      // 导出后回调
      if (this.config.onAfterExport) {
        this.config.onAfterExport(result)
      }

      return result
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
      }
    }
  }

  /**
   * 验证数据
   */
  private validateData(data: T[]): void {
    // 行级验证
    if (this.config.onValidate) {
      data.forEach((row, index) => {
        const result = this.config.onValidate!(row, index)
        if (result !== true) {
          this.validationErrors.push({
            row: index + 1,
            field: 'row',
            message: typeof result === 'string' ? result : '验证失败',
          })
        }
      })
    }

    // 字段级别验证（始终执行）
    const fields = this.getSelectedFields()
    data.forEach((row, rowIndex) => {
      fields.forEach(field => {
        if (field.validator) {
          const value = row[field.key]
          const result = field.validator(value)
          if (result !== true) {
            this.validationErrors.push({
              row: rowIndex + 1,
              field: String(field.key),
              message: typeof result === 'string' ? result : `${field.label} 验证失败`,
            })
          }
        }
        // 必填检查
        if (
          field.required &&
          (row[field.key] === undefined || row[field.key] === null || row[field.key] === '')
        ) {
          this.validationErrors.push({
            row: rowIndex + 1,
            field: String(field.key),
            message: `${field.label} 为必填字段`,
          })
        }
      })
    })
  }

  /**
   * 获取选中的字段
   */
  private getSelectedFields(): ExportField<T>[] {
    if (this.config.selectedFields && this.config.selectedFields.length > 0) {
      return this.config.fields.filter(f => this.config.selectedFields!.includes(f.key))
    }
    // 返回默认选中的字段，如果没有则返回全部
    const defaultFields = this.config.fields.filter(f => f.defaultSelected !== false)
    return defaultFields.length > 0 ? defaultFields : this.config.fields
  }

  /**
   * 格式化字段值
   */
  private formatFieldValue(field: ExportField<T>, row: T): string | number | boolean | null {
    const value = row[field.key]
    if (field.formatter) {
      return field.formatter(value, row)
    }
    // 默认处理
    if (value === null || value === undefined) {
      return null
    }
    if (typeof value === 'object') {
      return JSON.stringify(value)
    }
    return value as string | number | boolean
  }

  /**
   * 转换数据为导出格式
   */
  private transformData(data: T[]): Record<string, unknown>[] {
    const fields = this.getSelectedFields()

    return data.map(row => {
      const result: Record<string, unknown> = {}
      fields.forEach(field => {
        result[field.label] = this.formatFieldValue(field, row)
      })
      return result
    })
  }

  /**
   * 导出为 CSV
   */
  private exportCSV(data: T[]): ExportResult {
    const fields = this.getSelectedFields()
    const transformedData = this.transformData(data)

    // 生成 CSV 内容
    const lines: string[] = []

    // 添加表头
    if (this.config.includeHeader) {
      lines.push(fields.map(f => this.escapeCSV(f.label)).join(','))
    }

    // 添加数据行
    transformedData.forEach(row => {
      const values = fields.map(f => {
        const value = row[f.label]
        return this.escapeCSV(String(value ?? ''))
      })
      lines.push(values.join(','))
    })

    const csvContent = lines.join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const filename = `${this.config.filename}.csv`

    return { success: true, blob, filename }
  }

  /**
   * 导出为 JSON
   */
  private exportJSON(data: T[]): ExportResult {
    const transformedData = this.transformData(data)
    const jsonContent = JSON.stringify(transformedData, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' })
    const filename = `${this.config.filename}.json`

    return { success: true, blob, filename }
  }

  /**
   * 导出为 Excel（增强版）
   */
  private async exportExcel(data: T[]): Promise<ExportResult> {
    const transformedData = this.transformData(data)
    const fields = this.getSelectedFields()
    const excelOptions = this.config.excelOptions || {}

    // 动态导入 ExcelJS
    const ExcelJS = await import(
      /* webpackChunkName: "exceljs" */
      'exceljs'
    )
    const workbook = new ExcelJS.Workbook()

    // 创建工作表
    const worksheet = workbook.addWorksheet(excelOptions.sheetName || this.config.sheetName)

    // 添加表头
    if (this.config.includeHeader) {
      const headerRow = worksheet.addRow(fields.map(f => f.label))
      // 设置表头样式
      if (excelOptions.headerStyle !== false) {
        headerRow.font = { bold: true }
        headerRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' },
        }
      }
    }

    // 添加数据行
    const dataRows = transformedData.map(row => {
      const values: (string | number | boolean | null)[] = fields.map(f => {
        const value = row[f.label]
        if (value === null || value === undefined) return ''
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          return value
        }
        return String(value)
      })
      return worksheet.addRow(values)
    })

    // 设置列宽
    fields.forEach((field, index) => {
      const column = worksheet.getColumn(index + 1)
      // 优先使用字段自定义宽度
      if (field.width) {
        column.width = field.width
      } else {
        // 自动计算宽度
        const maxWidth = Math.max(
          field.label.length,
          ...transformedData.map(row => {
            const value = row[field.label]
            return String(value ?? '').length
          })
        )
        column.width = Math.min(Math.max(maxWidth, 10), 50)
      }
    })

    // 设置冻结行
    if (excelOptions.freezeRows && this.config.includeHeader) {
      worksheet.views = [
        {
          state: 'frozen',
          ySplit: excelOptions.freezeRows,
        },
      ]
    }

    // 设置自动筛选
    if (excelOptions.autoFilter && transformedData.length > 0) {
      const endColumnLetter = String.fromCharCode(65 + fields.length - 1)
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: transformedData.length + 1, column: fields.length },
      }
    }

    // 生成文件
    const excelBuffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const filename = `${this.config.filename}.xlsx`

    return { success: true, blob, filename }
  }

  /**
   * CSV 转义
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 快速导出数据
 */
export async function exportData<T extends Record<string, unknown>>(
  data: T[],
  config: ExportConfig<T>
): Promise<ExportResult> {
  const exporter = new DataExporter(config)
  return await exporter.export(data)
}

/**
 * 下载导出文件
 */
export function downloadExport(result: ExportResult): void {
  if (!result.success || !result.blob || !result.filename) {
    logger.error('导出失败', result.error)
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

/**
 * 创建默认字段配置
 */
export function createFields<T extends Record<string, unknown>>(
  keys: (keyof T)[],
  labels?: Partial<Record<keyof T, string>>
): ExportField<T>[] {
  return keys.map(key => ({
    key,
    label: (labels?.[key] as string) || String(key),
    defaultSelected: true,
  }))
}

// ============================================================================
// 预定义格式化器
// ============================================================================

/**
 * 日期格式化器
 */
export function dateFormatter(
  format: 'iso' | 'locale' | 'unix' = 'locale'
): (value: unknown) => string {
  return (value: unknown) => {
    if (!value) return ''
    const date = new Date(value as string | number | Date)
    if (isNaN(date.getTime())) return String(value)

    switch (format) {
      case 'iso':
        return date.toISOString()
      case 'unix':
        return String(Math.floor(date.getTime() / 1000))
      case 'locale':
      default:
        return date.toLocaleString('zh-CN')
    }
  }
}

/**
 * 布尔值格式化器
 */
export function booleanFormatter(trueLabel = '是', falseLabel = '否'): (value: unknown) => string {
  return (value: unknown) => {
    if (typeof value === 'boolean') {
      return value ? trueLabel : falseLabel
    }
    if (typeof value === 'string') {
      const lower = value.toLowerCase()
      if (lower === 'true' || lower === '1' || lower === 'yes') return trueLabel
      if (lower === 'false' || lower === '0' || lower === 'no') return falseLabel
    }
    if (typeof value === 'number') {
      return value ? trueLabel : falseLabel
    }
    return String(value)
  }
}

/**
 * 数组格式化器
 */
export function arrayFormatter(separator = ', '): (value: unknown) => string {
  return (value: unknown) => {
    if (Array.isArray(value)) {
      return value.map(v => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(separator)
    }
    return String(value)
  }
}

/**
 * 截断格式化器
 */
export function truncateFormatter(maxLength: number): (value: unknown) => string {
  return (value: unknown) => {
    const str = String(value ?? '')
    if (str.length <= maxLength) return str
    return str.substring(0, maxLength) + '...'
  }
}

// ============================================================================
// 新增格式化器
// ============================================================================

/**
 * 数字格式化器
 */
export function numberFormatter(
  options: { decimals?: number; thousandsSeparator?: boolean } = {}
): (value: unknown) => string | number {
  return (value: unknown) => {
    if (value === null || value === undefined || value === '') return ''
    const num = Number(value)
    if (isNaN(num)) return String(value)

    if (options.decimals !== undefined) {
      return Number(num.toFixed(options.decimals))
    }
    return num
  }
}

/**
 * 货币格式化器
 */
export function currencyFormatter(
  currency: string = 'CNY',
  locale: string = 'zh-CN'
): (value: unknown) => string {
  return (value: unknown) => {
    if (value === null || value === undefined || value === '') return ''
    const num = Number(value)
    if (isNaN(num)) return String(value)

    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(num)
    } catch (error) {
      return `${currency} ${num.toFixed(2)}`
    }
  }
}

/**
 * 百分比格式化器
 */
export function percentFormatter(decimals: number = 2): (value: unknown) => string {
  return (value: unknown) => {
    if (value === null || value === undefined || value === '') return ''
    const num = Number(value)
    if (isNaN(num)) return String(value)
    return `${(num * 100).toFixed(decimals)}%`
  }
}

/**
 * 枚举值格式化器
 */
export function enumFormatter<T extends string | number>(
  mapping: Record<T, string>
): (value: unknown) => string {
  return (value: unknown) => {
    if (value === null || value === undefined) return ''
    return mapping[value as T] ?? String(value)
  }
}

/**
 * 链接格式化器
 */
export function linkFormatter(displayText?: string): (value: unknown) => string {
  return (value: unknown) => {
    if (!value) return ''
    const url = String(value)
    return displayText || url
  }
}

/**
 * JSON 格式化器
 */
export function jsonFormatter(indent: number = 2): (value: unknown) => string {
  return (value: unknown) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, indent)
      } catch (error) {
        return '[Object]'
      }
    }
    return String(value)
  }
}

/**
 * 条件格式化器
 */
export function conditionalFormatter<T>(
  condition: (value: unknown, row: T) => boolean,
  trueFormatter: (value: unknown, row: T) => string,
  falseFormatter: (value: unknown, row: T) => string
): (value: unknown, row: T) => string {
  return (value: unknown, row: T) => {
    if (condition(value, row)) {
      return trueFormatter(value, row)
    }
    return falseFormatter(value, row)
  }
}

// ============================================================================
// 导出模板管理
// ============================================================================

/** 模板存储（使用 Record<string, unknown> 存储不同类型的模板） */
const templateStore = new Map<string, ExportTemplate>()

/**
 * 注册导出模板
 */
export function registerTemplate<T extends Record<string, unknown>>(
  template: ExportTemplate<T>
): void {
  templateStore.set(template.id, {
    ...template,
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as ExportTemplate)
}

/**
 * 获取导出模板
 */
export function getTemplate(id: string): ExportTemplate | undefined {
  return templateStore.get(id)
}

/**
 * 获取所有模板
 */
export function getAllTemplates(): ExportTemplate[] {
  return Array.from(templateStore.values())
}

/**
 * 删除模板
 */
export function deleteTemplate(id: string): boolean {
  return templateStore.delete(id)
}

/**
 * 使用模板导出
 */
export async function exportWithTemplate<T extends Record<string, unknown>>(
  data: T[],
  templateId: string,
  overrides?: Partial<ExportConfig<T>>
): Promise<ExportResult> {
  const template = templateStore.get(templateId)
  if (!template) {
    return { success: false, error: `模板 ${templateId} 不存在` }
  }

  const fields = (template.fields || []) as ExportField<T>[]
  const defaultConfig = (template.defaultConfig || {}) as Partial<ExportConfig<T>>

  const config: ExportConfig<T> = {
    filename: template.name,
    format: 'xlsx',
    fields,
    ...defaultConfig,
    ...overrides,
  }

  return await exportData(data, config)
}

// ============================================================================
// 多工作表导出
// ============================================================================

/**
 * 导出多工作表 Excel
 */
export async function exportMultiSheet<T extends Record<string, unknown>>(
  config: MultiSheetConfig<T>
): Promise<ExportResult> {
  try {
    // 动态导入 ExcelJS
    const ExcelJS = await import(
      /* webpackChunkName: "exceljs" */
      'exceljs'
    )
    const workbook = new ExcelJS.Workbook()

    config.sheets.forEach(sheetConfig => {
      const worksheet = workbook.addWorksheet(sheetConfig.name)

      // 添加表头
      const headerRow = worksheet.addRow(sheetConfig.fields.map(f => f.label))
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      }

      // 添加数据行
      sheetConfig.data.forEach(row => {
        const values: (string | number | boolean | null)[] = sheetConfig.fields.map(field => {
          const value = row[field.key]
          if (field.formatter) {
            return field.formatter(value, row) as string | number | boolean | null
          }
          if (value === null || value === undefined) return ''
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
          ) {
            return value
          }
          return String(value)
        })
        worksheet.addRow(values)
      })

      // 设置列宽
      sheetConfig.fields.forEach((field, index) => {
        const column = worksheet.getColumn(index + 1)
        column.width = field.width || Math.max(field.label.length * 2, 15)
      })
    })

    const excelBuffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    return { success: true, blob, filename: `${config.filename}.xlsx` }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '多工作表导出失败',
    }
  }
}

// ============================================================================
// 增强的字段创建函数
// ============================================================================

/**
 * 创建增强字段配置
 */
export function createEnhancedFields<T extends Record<string, unknown>>(
  configs: Array<{
    key: keyof T
    label?: string
    formatter?: ExportField<T>['formatter']
    width?: number
    description?: string
    group?: string
    required?: boolean
  }>
): ExportField<T>[] {
  return configs.map((config, index) => ({
    key: config.key,
    label: config.label || String(config.key),
    formatter: config.formatter,
    width: config.width,
    description: config.description,
    group: config.group,
    required: config.required,
    order: index,
    defaultSelected: true,
  }))
}

/**
 * 按分组获取字段
 */
export function getFieldsByGroup<T extends Record<string, unknown>>(
  fields: ExportField<T>[]
): Record<string, ExportField<T>[]> {
  const groups: Record<string, ExportField<T>[]> = {}

  fields.forEach(field => {
    const group = field.group || 'default'
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(field)
  })

  return groups
}

/**
 * 排序字段
 */
export function sortFields<T extends Record<string, unknown>>(
  fields: ExportField<T>[]
): ExportField<T>[] {
  return [...fields].sort((a, b) => {
    const orderA = a.order ?? Infinity
    const orderB = b.order ?? Infinity
    return orderA - orderB
  })
}
