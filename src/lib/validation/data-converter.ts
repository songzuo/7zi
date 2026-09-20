/**
 * @fileoverview 数据转换工具模块
 * @description 提供通用的数据转换函数，包括数据清洗、格式转换、类型转换等
 * @module lib/validation/data-converter
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 数据转换选项
 */
export type ConvertOptions = {
  ignoreEmpty?: boolean
  ignoreNull?: boolean
  ignoreUndefined?: boolean
  trimStrings?: boolean
  convertNumbers?: boolean
  convertBooleans?: boolean
  dateFormat?: string
  deep?: boolean
}

/**
 * 字段映射配置
 */
export type FieldMapping = {
  from: string
  to: string
  transform?: (value: unknown) => unknown
}

// ============================================================================
// 数据清洗
// ============================================================================

/**
 * 清洗字符串（去除前后空格，处理空值）
 */
export function cleanString(
  value: unknown,
  options: { trim?: boolean; emptyToNull?: boolean } = {}
): string | null {
  const { trim = true, emptyToNull = true } = options

  if (value === null || value === undefined) {
    return null
  }

  let str = String(value)

  if (trim) {
    str = str.trim()
  }

  if (emptyToNull && str === '') {
    return null
  }

  return str
}

/**
 * 清洗数字（转换为数字类型，处理无效值）
 */
export function cleanNumber(
  value: unknown,
  options: { default?: number; min?: number; max?: number } = {}
): number | null {
  const { default: defaultValue, min, max } = options

  if (value === null || value === undefined || value === '') {
    return defaultValue ?? null
  }

  let num = typeof value === 'number' ? value : parseFloat(String(value))

  if (isNaN(num)) {
    return defaultValue ?? null
  }

  if (min !== undefined && num < min) {
    num = min
  }

  if (max !== undefined && num > max) {
    num = max
  }

  return num
}

/**
 * 清洗布尔值（转换为布尔类型）
 */
export function cleanBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    return ['true', 'yes', '1', 'on'].includes(lower)
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  return false
}

/**
 * 清洗数组（确保返回数组，过滤无效值）
 */
export function cleanArray<T>(
  value: unknown,
  options: { unique?: boolean; filterEmpty?: boolean } = {}
): T[] {
  const { unique = false, filterEmpty = false } = options

  if (value === null || value === undefined) {
    return []
  }

  let arr: T[] = Array.isArray(value) ? value : [value as T]

  if (filterEmpty) {
    arr = arr.filter(item => item !== null && item !== undefined && item !== '')
  }

  if (unique) {
    arr = Array.from(new Set(arr))
  }

  return arr
}

// ============================================================================
// 对象转换
// ============================================================================

/**
 * 深度清洗对象
 */
export function cleanObject<T extends Record<string, unknown>>(
  obj: T,
  options: ConvertOptions = {}
): Partial<T> {
  const {
    ignoreEmpty = true,
    ignoreNull = true,
    ignoreUndefined = true,
    trimStrings = true,
    convertNumbers = false,
    convertBooleans = false,
    deep = false,
  } = options

  const result: Partial<T> = {}

  for (const [key, value] of Object.entries(obj)) {
    // Skip null/undefined if configured
    if (value === null && ignoreNull) continue
    if (value === undefined && ignoreUndefined) continue
    if (value === '' && ignoreEmpty) continue

    // Clean strings
    if (typeof value === 'string') {
      const cleaned = trimStrings
        ? cleanString(value, { trim: true, emptyToNull: ignoreEmpty })
        : value
      if (cleaned !== null) {
        ;(result as Record<string, unknown>)[key] = cleaned
      }
      continue
    }

    // Convert numbers
    if (convertNumbers && typeof value === 'string' && !isNaN(Number(value))) {
      ;(result as Record<string, unknown>)[key] = Number(value)
      continue
    }

    // Convert booleans
    if (convertBooleans && typeof value === 'string') {
      ;(result as Record<string, unknown>)[key] = cleanBoolean(value)
      continue
    }

    // Deep clean nested objects
    if (deep && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      ;(result as Record<string, unknown>)[key] = cleanObject(
        value as Record<string, unknown>,
        options
      )
      continue
    }

    // Keep other values as-is
    ;(result as Record<string, unknown>)[key] = value
  }

  return result
}

/**
 * 重命名字段
 */
export function renameFields<T extends Record<string, unknown>, R extends Record<string, unknown>>(
  obj: T,
  mappings: FieldMapping[]
): R {
  const result: Partial<R> = {}

  // Copy fields that are not in mappings
  const mappedFrom = new Set(mappings.map(m => m.from))
  for (const [key, value] of Object.entries(obj)) {
    if (!mappedFrom.has(key)) {
      ;(result as Record<string, unknown>)[key] = value
    }
  }

  // Apply mappings
  for (const mapping of mappings) {
    const value = obj[mapping.from as keyof T]
    const transformedValue = mapping.transform ? mapping.transform(value) : value
    ;(result as Record<string, unknown>)[mapping.to] = transformedValue
  }

  return result as R
}

/**
 * 扁平化嵌套对象
 */
export function flattenObject<T extends Record<string, unknown>>(
  obj: T,
  separator: string = '.',
  prefix: string = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = flattenObject(value as Record<string, unknown>, separator, newKey)
      Object.assign(result, nested)
    } else {
      result[newKey] = value
    }
  }

  return result
}

/**
 * 展平对象（反向操作）
 */
export function unflattenObject<T extends Record<string, unknown>>(
  obj: T,
  separator: string = '.'
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    const parts = key.split(separator)
    let current = result

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!(part in current)) {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }

    current[parts[parts.length - 1]] = value
  }

  return result
}

// ============================================================================
// 类型转换
// ============================================================================

/**
 * 将值转换为指定类型
 */
export function convertToType<T>(
  value: unknown,
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
): T | null {
  switch (type) {
    case 'string':
      return cleanString(value) as T

    case 'number':
      return cleanNumber(value) as T

    case 'boolean':
      return cleanBoolean(value) as T

    case 'date':
      if (value === null || value === undefined) return null
      const date = new Date(value as string | number)
      return (isNaN(date.getTime()) ? null : date) as T

    case 'array':
      return cleanArray(value) as T

    case 'object':
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value as T
      }
      return null

    default:
      return null
  }
}

/**
 * 将查询字符串转换为对象
 */
export function queryStringToObj(queryString: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {}

  if (!queryString) {
    return result
  }

  // Remove leading '?' or '#'
  const cleanQuery = queryString.replace(/^[?#]/, '')

  const pairs = cleanQuery.split('&')
  for (const pair of pairs) {
    const [key, value] = pair.split('=')
    const decodedKey = decodeURIComponent(key)
    const decodedValue = value ? decodeURIComponent(value) : ''

    if (decodedKey in result) {
      // Convert to array if multiple values
      const existing = result[decodedKey]
      if (Array.isArray(existing)) {
        existing.push(decodedValue)
      } else {
        result[decodedKey] = [existing, decodedValue]
      }
    } else {
      result[decodedKey] = decodedValue
    }
  }

  return result
}

/**
 * 将对象转换为查询字符串
 */
export function objToQueryString(obj: Record<string, unknown>): string {
  const params: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined || value === '') {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`)
      }
    } else {
      params.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    }
  }

  return params.length > 0 ? `?${params.join('&')}` : ''
}

// ============================================================================
// 数据转换
// ============================================================================

/**
 * 转换对象为键值对数组
 */
export function objectToPairs<T extends Record<string, unknown>>(
  obj: T
): Array<{ key: string; value: unknown }> {
  return Object.entries(obj).map(([key, value]) => ({ key, value }))
}

/**
 * 转换键值对数组为对象
 */
export function pairsToObject<T extends Array<{ key: string; value: unknown }>>(
  pairs: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const { key, value } of pairs) {
    result[key] = value
  }
  return result
}

/**
 * 转换对象为FormData（用于文件上传）
 */
export function objectToFormData(
  obj: Record<string, unknown>,
  options: { arrayFormat?: 'brackets' | 'indices' | 'repeat' } = {}
): FormData {
  const formData = new FormData()
  const { arrayFormat = 'brackets' } = options

  const appendValue = (key: string, value: unknown): void => {
    if (value === null || value === undefined) {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const arrayKey =
          arrayFormat === 'indices'
            ? `${key}[${index}]`
            : arrayFormat === 'brackets'
              ? `${key}[]`
              : key
        appendValue(arrayKey, item)
      })
    } else if (typeof value === 'object' && value instanceof File) {
      formData.append(key, value)
    } else if (typeof value === 'object' && value !== null) {
      Object.entries(value).forEach(([k, v]) => {
        appendValue(`${key}[${k}]`, v)
      })
    } else {
      formData.append(key, String(value))
    }
  }

  Object.entries(obj).forEach(([key, value]) => {
    appendValue(key, value)
  })

  return formData
}

/**
 * 转换FormData为对象
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of formData.entries()) {
    if (key in result) {
      const existing = result[key]
      if (Array.isArray(existing)) {
        existing.push(value)
      } else {
        result[key] = [existing, value]
      }
    } else {
      result[key] = value
    }
  }

  return result
}

// ============================================================================
// 数据验证和转换组合
// ============================================================================

/**
 * 转换并验证数据
 */
export function convertAndValidate<
  T extends Record<string, unknown>,
  R extends Record<string, unknown>,
>(
  data: T,
  schema: {
    [K in keyof R]?: {
      type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
      required?: boolean
      default?: unknown
      transform?: (value: unknown) => unknown
    }
  }
): { data: R; errors: Partial<Record<keyof R, string>> } {
  const result = {} as R
  const errors = {} as Partial<Record<keyof R, string>>

  for (const [field, fieldSchema] of Object.entries(schema)) {
    const value = data[field as keyof T]

    // Ensure fieldSchema is not undefined before using it
    if (!fieldSchema) {
      continue
    }

    // Ensure fieldSchema has required properties before accessing them
    const typedSchema = {
      required: fieldSchema.required || false,
      type: fieldSchema.type || 'string',
      default: fieldSchema.default,
      transform: fieldSchema.transform,
    } as Required<typeof fieldSchema>

    // Check required
    if (typedSchema.required && (value === null || value === undefined || value === '')) {
      errors[field as keyof R] = `${field} is required`
      continue
    }

    // Skip conversion if not required and value is empty
    if (!typedSchema.required && (value === null || value === undefined || value === '')) {
      ;(result as Record<string, unknown>)[field] = typedSchema.default
      continue
    }

    // Convert type
    const converted = convertToType(value, typedSchema.type)

    // Check conversion result
    if (converted === null && typedSchema.required) {
      errors[field as keyof R] = `${field} is invalid`
      continue
    }

    // Apply custom transform
    const finalValue = typedSchema.transform ? typedSchema.transform(converted) : converted

    ;(result as Record<string, unknown>)[field] = finalValue
  }

  return { data: result, errors }
}
