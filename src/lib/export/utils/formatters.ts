/**
 * @fileoverview 导出格式化器集合
 * @description 为 ExportField.formatter 提供开箱即用的格式化函数
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 日期格式化模式 */
export type DateFormatMode = 'iso' | 'locale' | 'unix' | 'date'

/** 数字格式化选项 */
export interface NumberFormatterOptions {
  /** 小数位数（未指定时保留原值） */
  decimals?: number
  /** 千分位分隔符（默认 false） */
  thousands?: boolean
}

/** 条件格式化器的分支值：字面量或格式化函数 */
export type ConditionalBranch<T> = string | number | boolean | null | ((value: T, row?: unknown) => unknown)

/** 通用格式化器签名 */
export type FieldFormatter<T = unknown> = (value: T, row?: unknown) => string | number | boolean | null

// ============================================================================
// 内部工具
// ============================================================================

function isBlank(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

// ============================================================================
// 日期格式化
// ============================================================================

/**
 * 日期格式化器
 * - iso: ISO 8601 字符串（new Date(v).toISOString()）
 * - locale: 本地化字符串
 * - unix: Unix 时间戳（秒）
 * - date: 仅日期（本地化）
 *
 * 空值返回 ''；无法解析的日期返回原始字符串。
 */
export function dateFormatter(mode: DateFormatMode = 'iso'): FieldFormatter<unknown> {
  return (value: unknown): string => {
    if (isBlank(value)) return ''

    const date =
      value instanceof Date ? value : new Date(value as string | number)
    if (Number.isNaN(date.getTime())) {
      return String(value)
    }

    switch (mode) {
      case 'unix':
        return String(Math.floor(date.getTime() / 1000))
      case 'locale':
        return date.toLocaleString()
      case 'date':
        return date.toLocaleDateString()
      case 'iso':
      default:
        return date.toISOString()
    }
  }
}

// ============================================================================
// 布尔格式化
// ============================================================================

const TRUTHY = new Set(['true', 'yes', 'y', '1', 'on'])
const FALSY = new Set(['false', 'no', 'n', '0', 'off'])

/**
 * 布尔格式化器
 * 支持 boolean / number / 'true'|'false'|'yes'|'no' 等字符串。
 * 空值返回 ''；无法判定的值返回 ''。
 */
export function booleanFormatter(
  trueLabel: string = '是',
  falseLabel: string = '否'
): FieldFormatter<unknown> {
  return (value: unknown): string => {
    if (isBlank(value)) return ''
    if (typeof value === 'boolean') return value ? trueLabel : falseLabel
    if (typeof value === 'number') {
      if (Number.isNaN(value)) return ''
      return value === 0 ? falseLabel : trueLabel
    }
    const normalized = String(value).trim().toLowerCase()
    if (TRUTHY.has(normalized)) return trueLabel
    if (FALSY.has(normalized)) return falseLabel
    return ''
  }
}

// ============================================================================
// 数组格式化
// ============================================================================

/**
 * 数组格式化器
 * 非数组值原样转字符串；对象元素使用 JSON.stringify。
 */
export function arrayFormatter(separator: string = ', '): FieldFormatter<unknown> {
  return (value: unknown): string => {
    if (isBlank(value)) return ''
    if (!Array.isArray(value)) return String(value)
    return value
      .map(item => {
        if (item === null || item === undefined) return ''
        if (typeof item === 'object') return JSON.stringify(item)
        return String(item)
      })
      .join(separator)
  }
}

// ============================================================================
// 截断格式化
// ============================================================================

/**
 * 截断格式化器
 * 超过 maxLength 时截断并追加省略号；maxLength 为负时按 0 处理。
 */
export function truncateFormatter(
  maxLength: number = 50,
  ellipsis: string = '...'
): FieldFormatter<unknown> {
  const limit = Math.max(0, Math.floor(maxLength))
  return (value: unknown): string => {
    if (isBlank(value)) return ''
    const str = String(value)
    if (str.length <= limit) return str
    return str.slice(0, limit) + ellipsis
  }
}

// ============================================================================
// 数字格式化
// ============================================================================

/**
 * 数字格式化器
 * - 无 decimals 时返回数字本身
 * - 非数字字符串原样返回
 * - NaN / 空值返回 ''
 */
export function numberFormatter(
  options?: number | NumberFormatterOptions
): FieldFormatter<unknown> {
  const decimals =
    typeof options === 'number' ? options : options?.decimals
  const thousands = typeof options === 'object' ? options?.thousands : false

  return (value: unknown): string | number => {
    if (isBlank(value)) return ''
    if (typeof value === 'string' && Number.isNaN(Number(value))) return value

    const num = typeof value === 'number' ? value : Number(value)
    if (Number.isNaN(num)) return ''
    if (!Number.isFinite(num)) return String(num)

    if (decimals === undefined) {
      return thousands ? Number(num.toLocaleString('en-US')) : num
    }
    const fixed = num.toFixed(Math.max(0, Math.floor(decimals)))
    const rounded = Number(fixed)
    return thousands ? Number(rounded.toLocaleString('en-US')) : rounded
  }
}

// ============================================================================
// 货币格式化
// ============================================================================

/**
 * 货币格式化器
 * 使用 Intl.NumberFormat 的 currency 样式。
 */
export function currencyFormatter(
  currency: string = 'CNY',
  locale: string = 'zh-CN'
): FieldFormatter<unknown> {
  return (value: unknown): string => {
    if (isBlank(value)) return ''
    const num = typeof value === 'number' ? value : Number(value)
    if (Number.isNaN(num)) return ''
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(num)
    } catch {
      return `${currency} ${num.toFixed(2)}`
    }
  }
}

// ============================================================================
// 百分比格式化
// ============================================================================

/**
 * 百分比格式化器
 * 0.1234 -> '12.34%'
 */
export function percentFormatter(decimals: number = 2): FieldFormatter<unknown> {
  const places = Math.max(0, Math.floor(decimals))
  return (value: unknown): string => {
    if (isBlank(value)) return ''
    const num = typeof value === 'number' ? value : Number(value)
    if (Number.isNaN(num)) return ''
    return `${(num * 100).toFixed(places)}%`
  }
}

// ============================================================================
// 枚举格式化
// ============================================================================

/**
 * 枚举格式化器
 * 映射表中不存在的值原样返回。
 */
export function enumFormatter<T = string>(
  mapping: Record<string, string>
): FieldFormatter<T> {
  return (value: T): string => {
    if (isBlank(value)) return ''
    const key = String(value)
    if (Object.prototype.hasOwnProperty.call(mapping, key)) {
      return mapping[key]
    }
    return key
  }
}

// ============================================================================
// JSON 格式化
// ============================================================================

/**
 * JSON 格式化器
 * 空值返回 ''；其余使用 JSON.stringify。
 */
export function jsonFormatter(indent: number = 2): FieldFormatter<unknown> {
  return (value: unknown): string => {
    if (value === null || value === undefined) return ''
    try {
      return JSON.stringify(value, null, indent) ?? ''
    } catch {
      return String(value)
    }
  }
}

// ============================================================================
// 链接格式化
// ============================================================================

/**
 * 链接格式化器
 * 提供 label 时输出 Markdown 风格链接 `[label](url)`，否则输出原始地址。
 */
export function linkFormatter(label?: string): FieldFormatter<unknown> {
  return (value: unknown): string => {
    if (isBlank(value)) return ''
    const url = String(value)
    return label ? `[${label}](${url})` : url
  }
}

// ============================================================================
// 条件格式化
// ============================================================================

function resolveBranch<T>(branch: ConditionalBranch<T>, value: T, row?: unknown): unknown {
  return typeof branch === 'function'
    ? (branch as (v: T, r?: unknown) => unknown)(value, row)
    : branch
}

/**
 * 条件格式化器
 * 命中 predicate 返回 trueValue，未命中返回 falseValue。
 * 分支既可以是字面量，也可以是 (value, row) => unknown 的函数。
 */
export function conditionalFormatter<T = unknown>(
  predicate: (value: T, row?: unknown) => boolean,
  trueValue: ConditionalBranch<T> = '',
  falseValue: ConditionalBranch<T> = ''
): FieldFormatter<T> {
  return (value: T, row?: unknown): string | number | boolean | null => {
    const matched = predicate(value, row)
    const branch = matched ? trueValue : falseValue
    const resolved = resolveBranch(branch, value, row)
    if (resolved === null || resolved === undefined) return ''
    if (typeof resolved === 'object') return JSON.stringify(resolved)
    return resolved as string | number | boolean
  }
}
