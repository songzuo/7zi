// @ts-nocheck
/**
 * @fileoverview 过滤条件解析器
 * @description 支持分页、排序和复杂过滤条件
 * @version 1.0.0
 */

import { logger } from '../../logger'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 过滤条件
 */
export interface FilterCondition {
  field: string
  operator: FilterOperator
  value: unknown
  logic?: 'and' | 'or'
}

/**
 * 过滤操作符
 */
export type FilterOperator =
  | 'eq'      // 等于
  | 'ne'      // 不等于
  | 'gt'      // 大于
  | 'gte'     // 大于等于
  | 'lt'      // 小于
  | 'lte'     // 小于等于
  | 'like'    // 包含
  | 'notLike' // 不包含
  | 'in'      // 在数组中
  | 'notIn'   // 不在数组中
  | 'between' // 范围
  | 'isNull'  // 为空
  | 'isNotNull' // 不为空
  | 'startsWith' // 开头
  | 'endsWith'  // 结尾

/**
 * 排序选项
 */
export interface SortOptions {
  field: string
  order: 'asc' | 'desc'
}

/**
 * 分页选项
 */
export interface PaginationOptions {
  page: number
  pageSize: number
  total?: number
}

/**
 * 查询选项
 */
export interface QueryOptions<T = Record<string, unknown>> {
  filters?: FilterCondition[]
  sort?: SortOptions[]
  pagination?: PaginationOptions
  select?: (keyof T)[]
}

// ============================================================================
// 过滤器解析器类
// ============================================================================

/**
 * 过滤条件解析器
 * 提供数据过滤、排序和分页功能
 */
export class FilterParser {
  /**
   * 应用过滤条件
   */
  applyFilters<T extends Record<string, unknown>>(
    data: T[],
    filters: FilterCondition[]
  ): T[] {
    if (!filters || filters.length === 0) {
      return data
    }

    let result = [...data]

    // 分组处理 AND/OR 条件
    const andFilters = filters.filter(f => f.logic !== 'or')
    const orFilters = filters.filter(f => f.logic === 'or')

    // 应用 AND 条件
    if (andFilters.length > 0) {
      result = result.filter(item =>
        andFilters.every(filter => this.applyFilter(item, filter))
      )
    }

    // 应用 OR 条件
    if (orFilters.length > 0) {
      const orResult = result.filter(item =>
        orFilters.some(filter => this.applyFilter(item, filter))
      )
      result = [...new Set([...result, ...orResult])]
    }

    return result
  }

  /**
   * 应用单个过滤条件
   */
  applyFilter<T extends Record<string, unknown>>(item: T, filter: FilterCondition): boolean {
    const value = item[filter.field]
    const filterValue = filter.value

    switch (filter.operator) {
      case 'eq':
        return this.equals(value, filterValue)

      case 'ne':
        return !this.equals(value, filterValue)

      case 'gt':
        return this.greaterThan(value, filterValue)

      case 'gte':
        return this.greaterThanOrEqual(value, filterValue)

      case 'lt':
        return this.lessThan(value, filterValue)

      case 'lte':
        return this.lessThanOrEqual(value, filterValue)

      case 'like':
        return this.like(value, filterValue)

      case 'notLike':
        return !this.like(value, filterValue)

      case 'in':
        return this.in(value, filterValue)

      case 'notIn':
        return !this.in(value, filterValue)

      case 'between':
        return this.between(value, filterValue as [unknown, unknown])

      case 'isNull':
        return value === null || value === undefined

      case 'isNotNull':
        return value !== null && value !== undefined

      case 'startsWith':
        return this.startsWith(value, filterValue)

      case 'endsWith':
        return this.endsWith(value, filterValue)

      default:
        logger.warn('[FilterParser] 未知的操作符', { operator: filter.operator })
        return true
    }
  }

  /**
   * 排序
   */
  sort<T extends Record<string, unknown>>(
    data: T[],
    sortOptions: SortOptions[]
  ): T[] {
    if (!sortOptions || sortOptions.length === 0) {
      return data
    }

    return [...data].sort((a, b) => {
      for (const option of sortOptions) {
        const aValue = a[option.field]
        const bValue = b[option.field]

        let comparison = 0

        if (aValue === null || aValue === undefined) {
          comparison = 1
        } else if (bValue === null || bValue === undefined) {
          comparison = -1
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue)
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          comparison = aValue - bValue
        } else if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime()
        } else {
          comparison = String(aValue).localeCompare(String(bValue))
        }

        if (comparison !== 0) {
          return option.order === 'desc' ? -comparison : comparison
        }
      }
      return 0
    })
  }

  /**
   * 分页
   */
  paginate<T extends Record<string, unknown>>(
    data: T[],
    pagination: PaginationOptions
  ): { data: T[]; total: number; page: number; pageSize: number; totalPages: number } {
    const page = Math.max(1, pagination.page)
    const pageSize = Math.max(1, Math.min(pagination.pageSize, 100000))
    const total = data.length
    const totalPages = Math.ceil(total / pageSize)

    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize

    return {
      data: data.slice(startIndex, endIndex),
      total,
      page,
      pageSize,
      totalPages,
    }
  }

  /**
   * 执行查询
   */
  query<T extends Record<string, unknown>>(
    data: T[],
    options: QueryOptions<T>
  ): {
    data: T[]
    total: number
    pagination: PaginationOptions & { totalPages: number }
  } {
    let result = [...data]

    // 应用过滤
    if (options.filters && options.filters.length > 0) {
      result = this.applyFilters(result, options.filters)
    }

    const total = result.length

    // 应用排序
    if (options.sort && options.sort.length > 0) {
      result = this.sort(result, options.sort)
    }

    // 应用分页
    const pagination: PaginationOptions & { totalPages: number } = {
      page: options.pagination?.page || 1,
      pageSize: options.pagination?.pageSize || 20,
      total,
      totalPages: 0,
    }

    if (options.pagination) {
      const paginated = this.paginate(result, pagination)
      result = paginated.data
      pagination.totalPages = paginated.totalPages
    } else {
      pagination.totalPages = 1
    }

    // 选择字段
    if (options.select && options.select.length > 0) {
      result = result.map(item => {
        const selected: Record<string, unknown> = {}
        options.select!.forEach(key => {
          selected[String(key)] = item[key]
        })
        return selected as T
      })
    }

    return { data: result, total, pagination }
  }

  /**
   * 构建 SQL WHERE 子句
   */
  buildSQLWhere(filters: FilterCondition[]): { sql: string; params: unknown[] } {
    if (!filters || filters.length === 0) {
      return { sql: '', params: [] }
    }

    const conditions: string[] = []
    const params: unknown[] = []

    filters.forEach((filter, index) => {
      const { field, operator, value } = filter

      // 处理字段名（防止 SQL 注入）
      const safeField = this.escapeIdentifier(field)

      let condition = ''
      switch (operator) {
        case 'eq':
          condition = `${safeField} = ?`
          params.push(value)
          break

        case 'ne':
          condition = `${safeField} != ?`
          params.push(value)
          break

        case 'gt':
          condition = `${safeField} > ?`
          params.push(value)
          break

        case 'gte':
          condition = `${safeField} >= ?`
          params.push(value)
          break

        case 'lt':
          condition = `${safeField} < ?`
          params.push(value)
          break

        case 'lte':
          condition = `${safeField} <= ?`
          params.push(value)
          break

        case 'like':
          condition = `${safeField} LIKE ?`
          params.push(`%${value}%`)
          break

        case 'notLike':
          condition = `${safeField} NOT LIKE ?`
          params.push(`%${value}%`)
          break

        case 'in':
          const inPlaceholders = (value as unknown[]).map(() => '?').join(', ')
          condition = `${safeField} IN (${inPlaceholders})`
          params.push(...(value as unknown[]))
          break

        case 'notIn':
          const notInPlaceholders = (value as unknown[]).map(() => '?').join(', ')
          condition = `${safeField} NOT IN (${notInPlaceholders})`
          params.push(...(value as unknown[]))
          break

        case 'between':
          condition = `${safeField} BETWEEN ? AND ?`
          params.push((value as [unknown, unknown])[0], (value as [unknown, unknown])[1])
          break

        case 'isNull':
          condition = `${safeField} IS NULL`
          break

        case 'isNotNull':
          condition = `${safeField} IS NOT NULL`
          break

        case 'startsWith':
          condition = `${safeField} LIKE ?`
          params.push(`${value}%`)
          break

        case 'endsWith':
          condition = `${safeField} LIKE ?`
          params.push(`%${value}`)
          break

        default:
          logger.warn('[FilterParser] 未知的操作符', { operator })
          return
      }

      if (index > 0) {
        conditions.push(filter.logic === 'or' ? 'OR' : 'AND')
      }
      conditions.push(condition)
    })

    return {
      sql: conditions.join(' '),
      params,
    }
  }

  // ===========================================================================
  // 私有方法
  // ===========================================================================

  private equals(a: unknown, b: unknown): boolean {
    if (a === b) return true
    if (a === null || b === null) return false
    if (typeof a === 'string' && typeof b === 'string') {
      return a.toLowerCase() === b.toLowerCase()
    }
    return false
  }

  private greaterThan(a: unknown, b: unknown): boolean {
    if (typeof a === 'number' && typeof b === 'number') return a > b
    if (a instanceof Date && b instanceof Date) return a.getTime() > b.getTime()
    return String(a) > String(b)
  }

  private greaterThanOrEqual(a: unknown, b: unknown): boolean {
    return this.greaterThan(a, b) || this.equals(a, b)
  }

  private lessThan(a: unknown, b: unknown): boolean {
    if (typeof a === 'number' && typeof b === 'number') return a < b
    if (a instanceof Date && b instanceof Date) return a.getTime() < b.getTime()
    return String(a) < String(b)
  }

  private lessThanOrEqual(a: unknown, b: unknown): boolean {
    return this.lessThan(a, b) || this.equals(a, b)
  }

  private like(a: unknown, b: unknown): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') return false
    const searchStr = b.toLowerCase()
    const targetStr = a.toLowerCase()
    return targetStr.includes(searchStr)
  }

  private in(a: unknown, b: unknown): boolean {
    if (!Array.isArray(b)) return false
    return b.some(item => this.equals(a, item))
  }

  private between(a: unknown, b: [unknown, unknown]): boolean {
    return this.greaterThanOrEqual(a, b[0]) && this.lessThanOrEqual(a, b[1])
  }

  private startsWith(a: unknown, b: unknown): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') return false
    return a.toLowerCase().startsWith(b.toLowerCase())
  }

  private endsWith(a: unknown, b: unknown): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') return false
    return a.toLowerCase().endsWith(b.toLowerCase())
  }

  private escapeIdentifier(identifier: string): string {
    // 简单转义，防止 SQL 注入
    // 在生产环境中应该使用参数化查询
    return identifier.replace(/[^a-zA-Z0-9_]/g, '')
  }
}

// ============================================================================
// 导出
// ============================================================================

export default FilterParser
