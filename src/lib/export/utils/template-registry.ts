/**
 * @fileoverview 导出模板注册表
 * @description 轻量级内存模板存储，供 registerTemplate/getTemplate 等函数使用
 * @version 1.0.0
 */

import type { ExportField, ExportConfig, ExportFormat } from '../core/exporter'

// ============================================================================
// 类型定义
// ============================================================================

/** 导出模板 */
export interface ExportTemplate<T = Record<string, unknown>> {
  /** 模板 ID */
  id: string
  /** 模板名称（同时作为默认导出文件名） */
  name: string
  /** 模板描述 */
  description?: string
  /** 字段配置 */
  fields: ExportField<T>[]
  /** 默认导出配置 */
  defaultConfig?: Partial<ExportConfig<T>>
  /** 默认格式 */
  format?: ExportFormat
  /** 工作表名 */
  sheetName?: string
  /** 创建时间 */
  createdAt?: string
  /** 更新时间 */
  updatedAt?: string
}

/** 模板存储 */
const templateStore = new Map<string, ExportTemplate<never>>()

// ============================================================================
// 注册与查询
// ============================================================================

/**
 * 注册（或覆盖）一个导出模板
 * 同 ID 重复注册会覆盖旧模板。
 */
export function registerTemplate<T = Record<string, unknown>>(
  template: ExportTemplate<T>
): ExportTemplate<T> {
  if (!template || !template.id) {
    throw new Error('模板必须包含 id')
  }
  const now = new Date().toISOString()
  const stored: ExportTemplate<T> = {
    ...template,
    fields: template.fields ?? [],
    createdAt: template.createdAt ?? now,
    updatedAt: now,
  }
  templateStore.set(template.id, stored as unknown as ExportTemplate<never>)
  return stored
}

/**
 * 获取模板，不存在时返回 undefined
 */
export function getTemplate<T = Record<string, unknown>>(
  id: string
): ExportTemplate<T> | undefined {
  if (!id) return undefined
  return templateStore.get(id) as unknown as ExportTemplate<T> | undefined
}

/**
 * 获取所有已注册模板
 */
export function getAllTemplates<T = Record<string, unknown>>(): ExportTemplate<T>[] {
  return Array.from(templateStore.values()) as unknown as ExportTemplate<T>[]
}

/**
 * 删除模板
 * @returns 是否成功删除（模板不存在时返回 false）
 */
export function deleteTemplate(id: string): boolean {
  if (!id) return false
  return templateStore.delete(id)
}

/**
 * 清空所有模板（主要供测试使用）
 */
export function clearTemplates(): void {
  templateStore.clear()
}
