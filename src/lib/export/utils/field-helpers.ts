/**
 * @fileoverview 导出字段辅助函数
 * @description 字段配置创建、分组与排序
 * @version 1.0.0
 */

import type { ExportField } from '../core/exporter'

// ============================================================================
// 类型定义
// ============================================================================

/** 字段创建描述 */
export interface FieldSpec<T = Record<string, unknown>> {
  key: keyof T
  label?: string
  description?: string
  group?: string
  width?: number
  required?: boolean
  numFmt?: string
  defaultSelected?: boolean
}

/** 字段分组结果 */
export type FieldGroups<T = Record<string, unknown>> = Record<
  string,
  ExportField<T>[]
>

/** 无分组字段的默认分组名 */
export const DEFAULT_FIELD_GROUP = 'default'

// ============================================================================
// 创建字段
// ============================================================================

/**
 * 从键名数组快速创建字段配置
 * @param keys 字段键名
 * @param labels 可选的标签映射（键名 -> 标签）
 */
export function createFields<T extends Record<string, unknown> = Record<string, unknown>>(
  keys: Array<keyof T>,
  labels?: Partial<Record<string, string>>
): ExportField<T>[] {
  return keys.map(key => ({
    key,
    label: labels?.[String(key)] ?? String(key),
    defaultSelected: true,
  }))
}

/**
 * 创建增强字段配置（自动补齐 order / label）
 */
export function createEnhancedFields<
  T extends Record<string, unknown> = Record<string, unknown>,
>(specs: Array<FieldSpec<T>>): ExportField<T>[] {
  return specs.map((spec, index) => ({
    key: spec.key,
    label: spec.label ?? String(spec.key),
    description: spec.description,
    group: spec.group,
    width: spec.width,
    required: spec.required,
    numFmt: spec.numFmt,
    defaultSelected: spec.defaultSelected ?? true,
    order: index,
  }))
}

/**
 * 按 group 分组字段，未指定 group 的归入 'default'
 */
export function getFieldsByGroup<
  T extends Record<string, unknown> = Record<string, unknown>,
>(fields: ExportField<T>[]): FieldGroups<T> {
  const groups: FieldGroups<T> = {}
  for (const field of fields) {
    const group = field.group ?? DEFAULT_FIELD_GROUP
    if (!groups[group]) groups[group] = []
    groups[group].push(field)
  }
  return groups
}

/**
 * 按 order 升序排序字段；没有 order 的排在最后
 */
export function sortFields<T extends Record<string, unknown> = Record<string, unknown>>(
  fields: ExportField<T>[]
): ExportField<T>[] {
  return [...fields].sort((a, b) => {
    const left = a.order ?? Number.POSITIVE_INFINITY
    const right = b.order ?? Number.POSITIVE_INFINITY
    if (left === right) return 0
    return left < right ? -1 : 1
  })
}
