/**
 * @fileoverview 导出便捷函数与模板导出
 * @description exportData / exportWithTemplate / exportMultiSheet
 * @version 1.0.0
 */

import { DataExporter } from '../core/exporter'
import type {
  ExportConfig,
  ExportField,
  ExportFormat,
  ExportResult,
} from '../core/exporter'
import { getTemplate } from './template-registry'

// ============================================================================
// 类型定义
// ============================================================================

/** 多工作表导出配置 */
export interface MultiSheetDefinition<T = Record<string, unknown>> {
  /** 工作表名 */
  name: string
  /** 数据 */
  data: T[]
  /** 字段配置 */
  fields: ExportField<T>[]
}

/** 多工作表导出请求 */
export interface MultiSheetExportConfig<T = Record<string, unknown>> {
  /** 文件名（不含扩展名） */
  filename: string
  /** 工作表列表 */
  sheets: MultiSheetDefinition<T>[]
}

// ============================================================================
// 便捷导出
// ============================================================================

/**
 * 快速导出数据
 *
 * @example
 * await exportData(rows, { filename: 'users', format: 'csv', fields })
 */
export async function exportData<T extends Record<string, unknown>>(
  data: T[],
  config: Partial<ExportConfig<T>> & { format?: ExportFormat }
): Promise<ExportResult> {
  const exporter = new DataExporter<T>()
  return exporter.export(data, config as ExportConfig<T>)
}

// ============================================================================
// 模板导出
// ============================================================================

/**
 * 使用已注册的模板导出数据
 * 模板不存在时返回失败结果（error 包含 '不存在'）。
 */
export async function exportWithTemplate<T extends Record<string, unknown>>(
  data: T[],
  templateId: string,
  overrides: Partial<ExportConfig<T>> = {}
): Promise<ExportResult> {
  const template = getTemplate<T>(templateId)
  if (!template) {
    return { success: false, error: `模板不存在: ${templateId}` }
  }

  const defaultConfig = (template.defaultConfig ?? {}) as Partial<ExportConfig<T>>
  const format = (overrides.format ?? defaultConfig.format ?? template.format ?? 'xlsx') as ExportFormat

  const config: ExportConfig<T> = {
    ...defaultConfig,
    ...overrides,
    filename: overrides.filename ?? defaultConfig.filename ?? template.name,
    format,
    fields: overrides.fields ?? defaultConfig.fields ?? template.fields ?? [],
    sheetName:
      overrides.sheetName ??
      defaultConfig.sheetName ??
      template.sheetName ??
      template.name,
  } as ExportConfig<T>

  const exporter = new DataExporter<T>()
  return exporter.export(data, config)
}

// ============================================================================
// 多工作表导出
// ============================================================================

/**
 * 导出包含多个工作表的 Excel 文件
 */
export async function exportMultiSheet<T extends Record<string, unknown>>(
  config: MultiSheetExportConfig<T>
): Promise<ExportResult> {
  try {
    if (!config || !Array.isArray(config.sheets) || config.sheets.length === 0) {
      return { success: false, error: '至少需要一个工作表' }
    }

    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()

    for (const sheet of config.sheets) {
      const worksheet = workbook.addWorksheet(sheet.name || 'Sheet1')
      const fields = [...(sheet.fields ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      )

      if (fields.length > 0) {
        const headerRow = worksheet.addRow(fields.map(f => f.label))
        headerRow.font = { bold: true }
      }

      for (const row of sheet.data ?? []) {
        worksheet.addRow(
          fields.map(f => {
            const value = row?.[f.key]
            if (f.formatter) {
              const formatted = f.formatter(value as T[keyof T], row)
              return formatted === undefined ? null : formatted
            }
            if (value === null || value === undefined) return ''
            if (typeof value === 'object') return JSON.stringify(value)
            return value as string | number | boolean
          })
        )
      }
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    return {
      success: true,
      blob,
      filename: `${config.filename}.xlsx`,
      rowCount: config.sheets.reduce((sum, s) => sum + (s.data?.length ?? 0), 0),
      columnCount: config.sheets[0]?.fields?.length ?? 0,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '多工作表导出失败',
    }
  }
}
