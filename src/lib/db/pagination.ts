/**
 * Pagination Utility for Database Queries
 * 数据库查询分页工具
 *
 * ⚠️ DEPRECATED: This module is no longer maintained.
 * Use query-builder.ts pagination functionality instead.
 *
 * Features:
 * - Offset-based pagination
 * - Cursor-based pagination (for large datasets)
 * - Automatic limit enforcement
 * - Total count optimization
 * - Type-safe pagination
 *
 * @deprecated Use QueryBuilder.paginate() instead
 */

export interface PaginationOptions {
  /** Page number (1-based) for offset-based pagination */
  page?: number
  /** Number of items per page */
  limit?: number
  /** Offset for manual control */
  offset?: number
  /** Cursor for cursor-based pagination */
  cursor?: string
  /** Cursor field name (default: 'id') */
  cursorField?: string
  /** Maximum limit enforced (default: 100) */
  maxLimit?: number
  /** Default limit (default: 20) */
  defaultLimit?: number
}

export interface PaginationMeta {
  /** Current page number */
  currentPage: number
  /** Items per page */
  perPage: number
  /** Total items */
  total: number
  /** Total pages */
  totalPages: number
  /** Has next page */
  hasNext: boolean
  /** Has previous page */
  hasPrevious: boolean
}

export interface CursorPaginationMeta {
  /** Next cursor for fetching next page */
  nextCursor: string | null
  /** Previous cursor for fetching previous page */
  prevCursor: string | null
  /** Has next page */
  hasNext: boolean
  /** Has previous page */
  hasPrevious: boolean
  /** Current page size */
  pageSize: number
}

export interface PaginatedResult<T> {
  /** Result items */
  items: T[]
  /** Pagination metadata */
  meta: PaginationMeta
}

export interface CursorPaginatedResult<T> {
  /** Result items */
  items: T[]
  /** Cursor pagination metadata */
  meta: CursorPaginationMeta
}

/**
 * Parse and validate pagination options
 */
export function parsePaginationOptions(
  options: PaginationOptions
): Required<Omit<PaginationOptions, 'page' | 'offset'>> & { page: number; offset: number } {
  const defaultLimit = options.defaultLimit || 20
  const maxLimit = options.maxLimit || 100

  let limit = options.limit || defaultLimit

  // Enforce limits
  if (limit < 1) limit = 1
  if (limit > maxLimit) limit = maxLimit

  let page = options.page || 1
  let offset = options.offset || 0

  // Respect explicit page=0
  if (options.page === 0) {
    page = 0
    offset = 0
  } else if (options.page && !options.offset) {
    // Calculate offset from page
    offset = (page - 1) * limit
  } else if (!options.page && options.offset) {
    // Calculate page from offset
    page = Math.floor(offset / limit) + 1
  }

  return {
    page,
    limit,
    offset,
    cursor: options.cursor || '',
    cursorField: options.cursorField || 'id',
    maxLimit,
    defaultLimit,
  }
}

/**
 * Build LIMIT/OFFSET clause for SQL queries
 */
export function buildPaginationClause(options: PaginationOptions): {
  clause: string
  params: unknown[]
} {
  const parsed = parsePaginationOptions(options)

  if (parsed.cursor) {
    // Cursor-based pagination
    const clause = `ORDER BY ${parsed.cursorField} ASC LIMIT ?`
    const params: unknown[] = [parsed.limit + 1] // Fetch one extra to check for more

    if (parsed.cursor !== 'first') {
      // If not first page, add cursor filter
      return {
        clause: `WHERE ${parsed.cursorField} > ? ORDER BY ${parsed.cursorField} ASC LIMIT ?`,
        params: [parsed.cursor, parsed.limit + 1],
      }
    }

    return { clause, params }
  }

  // Offset-based pagination
  return {
    clause: `LIMIT ? OFFSET ?`,
    params: [parsed.limit, parsed.offset],
  }
}

/**
 * Paginate a query result (offset-based)
 */
export function paginate<T>(
  items: T[],
  total: number,
  options: PaginationOptions
): PaginatedResult<T> {
  const parsed = parsePaginationOptions(options)
  const totalPages = Math.ceil(total / parsed.limit)

  const meta: PaginationMeta = {
    currentPage: parsed.page,
    perPage: parsed.limit,
    total,
    totalPages,
    hasNext: parsed.page < totalPages,
    hasPrevious: parsed.page > 1,
  }

  return { items, meta }
}

/**
 * Paginate using cursor-based approach
 */
export function paginateWithCursor<T>(
  items: T[],
  options: PaginationOptions,
  cursorField: string = 'id'
): CursorPaginatedResult<T> {
  const parsed = parsePaginationOptions(options)

  // Check if we fetched an extra item
  const hasNext = items.length > parsed.limit
  const resultItems = hasNext ? items.slice(0, -1) : items

  // Generate cursors - use type-safe property access
  const lastItem = hasNext ? resultItems[resultItems.length - 1] : null
  const nextCursor =
    lastItem && typeof lastItem === 'object' && lastItem !== null
      ? String((lastItem as Record<string, unknown>)[cursorField] ?? null)
      : null
  const firstItem = items[0]
  const prevCursor =
    parsed.offset > 0 && firstItem && typeof firstItem === 'object' && firstItem !== null
      ? String((firstItem as Record<string, unknown>)[cursorField] ?? null)
      : null

  const meta: CursorPaginationMeta = {
    nextCursor,
    prevCursor,
    hasNext,
    hasPrevious: parsed.offset > 0,
    pageSize: resultItems.length,
  }

  return { items: resultItems, meta }
}

/**
 * Execute paginated query with count
 */
export async function executePaginatedQuery<T>(
  queryFn: (limit: number, offset: number) => Promise<T[]>,
  countFn: () => Promise<number>,
  options: PaginationOptions
): Promise<PaginatedResult<T>> {
  const parsed = parsePaginationOptions(options)

  // Execute query and count in parallel
  const [items, total] = await Promise.all([queryFn(parsed.limit, parsed.offset), countFn()])

  return paginate(items, total, options)
}

/**
 * Execute cursor-based paginated query
 */
export async function executeCursorPaginatedQuery<T>(
  queryFn: (limit: number, cursor?: string) => Promise<T[]>,
  options: PaginationOptions
): Promise<CursorPaginatedResult<T>> {
  const parsed = parsePaginationOptions(options)

  const items = await queryFn(
    parsed.limit + 1,
    parsed.cursor === 'first' ? undefined : parsed.cursor
  )

  return paginateWithCursor(items, options, parsed.cursorField)
}

/**
 * Generate SQL for paginated queries
 */
export function buildPaginatedQuery(baseQuery: string, options: PaginationOptions): string {
  const { clause } = buildPaginationClause(options)
  return `${baseQuery} ${clause}`
}

/**
 * Add pagination to WHERE clause for cursor-based queries
 */
export function addCursorToWhereClause(
  whereClause: string,
  cursor: string,
  cursorField: string
): string {
  if (!cursor || cursor === 'first') {
    return whereClause
  }

  const cursorCondition = `${cursorField} > ?`
  return whereClause ? `${whereClause} AND ${cursorCondition}` : `WHERE ${cursorCondition}`
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params: {
  page?: number
  limit?: number
  cursor?: string
}): { valid: boolean; error?: string } {
  if (params.cursor) {
    // Cursor-based: just validate cursor is a string
    if (typeof params.cursor !== 'string') {
      return { valid: false, error: 'Cursor must be a string' }
    }
  } else if (params.page !== undefined) {
    // Offset-based: validate page number
    if (params.page < 1) {
      return { valid: false, error: 'Page number must be >= 1' }
    }
  }

  if (params.limit !== undefined) {
    if (params.limit < 1) {
      return { valid: false, error: 'Limit must be >= 1' }
    }
    if (params.limit > 1000) {
      return { valid: false, error: 'Limit cannot exceed 1000' }
    }
  }

  return { valid: true }
}

/**
 * Get default pagination options from environment or defaults
 */
export function getDefaultPaginationOptions(): PaginationOptions {
  return {
    limit: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    maxLimit: parseInt(process.env.MAX_PAGE_SIZE || '100', 10),
  }
}

/**
 * Calculate page from cursor for offset-based pagination
 */
export function calculatePageFromCursor(
  cursor: string,
  cursorField: string,
  countFn: () => Promise<number>,
  pageSize: number
): Promise<number> {
  return countFn().then(total => {
    // This is a simplified calculation - in practice you'd need to query
    // the actual position of the cursor value
    return Math.ceil(total / pageSize)
  })
}

/**
 * Merge pagination meta with response data
 */
export function mergePaginationMeta<T, M extends PaginationMeta | CursorPaginationMeta>(
  data: T[],
  meta: M
) {
  return {
    data,
    pagination: meta,
  }
}

export default {
  parsePaginationOptions,
  buildPaginationClause,
  paginate,
  paginateWithCursor,
  executePaginatedQuery,
  executeCursorPaginatedQuery,
  buildPaginatedQuery,
  addCursorToWhereClause,
  validatePaginationParams,
  getDefaultPaginationOptions,
}
