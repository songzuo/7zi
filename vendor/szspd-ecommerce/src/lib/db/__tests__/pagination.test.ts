/**
 * Pagination Utility Tests
 */

import { describe, it, expect } from 'vitest'
import {
  parsePaginationOptions,
  buildPaginationClause,
  paginate,
  paginateWithCursor,
  validatePaginationParams,
  getDefaultPaginationOptions,
  addCursorToWhereClause,
  buildPaginatedQuery,
  type PaginationOptions,
  type PaginatedResult,
} from '../pagination'

describe('parsePaginationOptions', () => {
  it('should use default values when not provided', () => {
    const result = parsePaginationOptions({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.offset).toBe(0)
    expect(result.cursor).toBe('')
  })

  it('should use provided page and limit', () => {
    const result = parsePaginationOptions({ page: 2, limit: 50 })
    expect(result.page).toBe(2)
    expect(result.limit).toBe(50)
    expect(result.offset).toBe(50) // (2-1) * 50
  })

  it('should calculate offset from page', () => {
    const result = parsePaginationOptions({ page: 3, limit: 10 })
    expect(result.offset).toBe(20) // (3-1) * 10
  })

  it('should calculate page from offset', () => {
    const result = parsePaginationOptions({ offset: 40, limit: 20 })
    expect(result.page).toBe(3) // Math.floor(40/20) + 1
  })

  it('should enforce maximum limit', () => {
    const result = parsePaginationOptions({ limit: 200, maxLimit: 100 })
    expect(result.limit).toBe(100)
  })

  it('should use custom default limit', () => {
    const result = parsePaginationOptions({ defaultLimit: 30 })
    expect(result.limit).toBe(30)
  })

  it('should handle cursor-based pagination', () => {
    const result = parsePaginationOptions({ cursor: 'abc123' })
    expect(result.cursor).toBe('abc123')
    expect(result.cursorField).toBe('id')
  })

  it('should use custom cursor field', () => {
    const result = parsePaginationOptions({ cursorField: 'created_at' })
    expect(result.cursorField).toBe('created_at')
  })

  it('should handle page 0', () => {
    const result = parsePaginationOptions({ page: 0 })
    expect(result.page).toBe(0)
    expect(result.offset).toBe(0) // (0-1) * 20 = -20, but offset is initialized to 0 first
  })
})

describe('buildPaginationClause', () => {
  it('should build LIMIT/OFFSET clause for offset-based pagination', () => {
    const result = buildPaginationClause({ page: 2, limit: 10 })
    expect(result.clause).toBe('LIMIT ? OFFSET ?')
    expect(result.params).toEqual([10, 10])
  })

  it('should build cursor-based clause', () => {
    const result = buildPaginationClause({ cursor: 'first', limit: 10 })
    expect(result.clause).toBe('ORDER BY id ASC LIMIT ?')
    expect(result.params).toEqual([11]) // +1 to check for more
  })

  it('should build cursor clause with cursor value', () => {
    const result = buildPaginationClause({ cursor: 'abc123', limit: 10 })
    expect(result.clause).toBe('WHERE id > ? ORDER BY id ASC LIMIT ?')
    expect(result.params).toEqual(['abc123', 11])
  })

  it('should use custom cursor field', () => {
    const result = buildPaginationClause({
      cursor: '2023-01-01',
      cursorField: 'created_at',
      limit: 10,
    })
    expect(result.clause).toBe('WHERE created_at > ? ORDER BY created_at ASC LIMIT ?')
    expect(result.params).toEqual(['2023-01-01', 11])
  })
})

describe('paginate', () => {
  it('should create paginated result with metadata', () => {
    const items = [1, 2, 3, 4, 5]
    const total = 25
    const options: PaginationOptions = { page: 1, limit: 5 }

    const result = paginate(items, total, options)

    expect(result.items).toEqual(items)
    expect(result.meta.currentPage).toBe(1)
    expect(result.meta.perPage).toBe(5)
    expect(result.meta.total).toBe(25)
    expect(result.meta.totalPages).toBe(5)
    expect(result.meta.hasNext).toBe(true)
    expect(result.meta.hasPrevious).toBe(false)
  })

  it('should handle last page', () => {
    const items = [21, 22, 23, 24, 25]
    const total = 25
    const options: PaginationOptions = { page: 5, limit: 5 }

    const result = paginate(items, total, options)

    expect(result.items).toEqual(items)
    expect(result.meta.currentPage).toBe(5)
    expect(result.meta.hasNext).toBe(false)
    expect(result.meta.hasPrevious).toBe(true)
  })

  it('should handle empty result', () => {
    const items: number[] = []
    const total = 0
    const options: PaginationOptions = { page: 1, limit: 10 }

    const result = paginate(items, total, options)

    expect(result.items).toEqual([])
    expect(result.meta.total).toBe(0)
    expect(result.meta.totalPages).toBe(0)
    expect(result.meta.hasNext).toBe(false)
    expect(result.meta.hasPrevious).toBe(false)
  })

  it('should handle partial last page', () => {
    const items = [21, 22, 23]
    const total = 23
    const options: PaginationOptions = { page: 3, limit: 10 }

    const result = paginate(items, total, options)

    expect(result.items).toEqual(items)
    expect(result.meta.currentPage).toBe(3)
    expect(result.meta.totalPages).toBe(3)
    expect(result.meta.hasNext).toBe(false)
  })
})

describe('paginateWithCursor', () => {
  it('should create cursor paginated result', () => {
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ]
    const options: PaginationOptions = { limit: 3, offset: 0 }

    const result = paginateWithCursor(items, options, 'id')

    expect(result.items).toHaveLength(3)
    expect(result.meta.nextCursor).toBeNull() // No extra item fetched
    expect(result.meta.prevCursor).toBeNull()
    expect(result.meta.hasNext).toBe(false)
    expect(result.meta.hasPrevious).toBe(false)
    expect(result.meta.pageSize).toBe(3)
  })

  it('should detect next page when extra item fetched', () => {
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
      { id: '4', name: 'Item 4' },
    ]
    const options: PaginationOptions = { limit: 3, offset: 0 }

    const result = paginateWithCursor(items, options, 'id')

    expect(result.items).toHaveLength(3)
    expect(result.meta.nextCursor).toBe('3')
    expect(result.meta.hasNext).toBe(true)
  })

  it('should handle previous cursor', () => {
    const items = [
      { id: '4', name: 'Item 4' },
      { id: '5', name: 'Item 5' },
    ]
    const options: PaginationOptions = { limit: 2, offset: 3 }

    const result = paginateWithCursor(items, options, 'id')

    expect(result.items).toHaveLength(2)
    expect(result.meta.prevCursor).toBe('4')
    expect(result.meta.hasPrevious).toBe(true)
  })
})

describe('validatePaginationParams', () => {
  it('should validate correct offset-based params', () => {
    const result = validatePaginationParams({ page: 1, limit: 10 })
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should validate correct cursor-based params', () => {
    const result = validatePaginationParams({ cursor: 'abc123' })
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject invalid page number', () => {
    const result = validatePaginationParams({ page: 0 })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Page number must be >= 1')
  })

  it('should reject negative page', () => {
    const result = validatePaginationParams({ page: -1 })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Page number must be >= 1')
  })

  it('should reject invalid limit', () => {
    const result = validatePaginationParams({ limit: 0 })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Limit must be >= 1')
  })

  it('should reject limit too large', () => {
    const result = validatePaginationParams({ limit: 1001 })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Limit cannot exceed 1000')
  })

  it('should reject non-string cursor', () => {
    const result = validatePaginationParams({ cursor: 123 as any })
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Cursor must be a string')
  })
})

describe('getDefaultPaginationOptions', () => {
  it('should return default options', () => {
    const result = getDefaultPaginationOptions()
    expect(result.limit).toBe(20)
    expect(result.maxLimit).toBe(100)
  })

  it('should use environment variables when set', () => {
    process.env.DEFAULT_PAGE_SIZE = '50'
    process.env.MAX_PAGE_SIZE = '200'

    const result = getDefaultPaginationOptions()

    expect(result.limit).toBe(50)
    expect(result.maxLimit).toBe(200)

    // Clean up
    delete process.env.DEFAULT_PAGE_SIZE
    delete process.env.MAX_PAGE_SIZE
  })
})

describe('addCursorToWhereClause', () => {
  it('should return original clause when no cursor', () => {
    const where = 'status = ?'
    const result = addCursorToWhereClause(where, '', 'id')
    expect(result).toBe(where)
  })

  it('should return original clause for first page', () => {
    const where = 'status = ?'
    const result = addCursorToWhereClause(where, 'first', 'id')
    expect(result).toBe(where)
  })

  it('should add cursor condition to existing where clause', () => {
    const where = 'status = ?'
    const result = addCursorToWhereClause(where, 'abc123', 'id')
    expect(result).toBe('status = ? AND id > ?')
  })

  it('should create where clause when none exists', () => {
    const where = ''
    const result = addCursorToWhereClause(where, 'abc123', 'id')
    expect(result).toBe('WHERE id > ?')
  })
})

describe('buildPaginatedQuery', () => {
  it('should add pagination clause to base query', () => {
    const baseQuery = 'SELECT * FROM users'
    const options: PaginationOptions = { page: 2, limit: 10 }
    const result = buildPaginatedQuery(baseQuery, options)
    expect(result).toBe('SELECT * FROM users LIMIT ? OFFSET ?')
  })

  it('should handle query with existing WHERE clause', () => {
    const baseQuery = 'SELECT * FROM users WHERE status = ?'
    const options: PaginationOptions = { page: 1, limit: 20 }
    const result = buildPaginatedQuery(baseQuery, options)
    expect(result).toBe('SELECT * FROM users WHERE status = ? LIMIT ? OFFSET ?')
  })
})

describe('Pagination Edge Cases', () => {
  it('should handle large page numbers', () => {
    const options: PaginationOptions = { page: 999999, limit: 10 }
    const parsed = parsePaginationOptions(options)
    expect(parsed.page).toBe(999999)
    expect(parsed.offset).toBe(9999980) // (999999-1) * 10
  })

  it('should handle zero offset', () => {
    const options: PaginationOptions = { offset: 0, limit: 10 }
    const parsed = parsePaginationOptions(options)
    expect(parsed.page).toBe(1)
    expect(parsed.offset).toBe(0)
  })

  it('should handle single item pages', () => {
    const items = [{ id: 1 }]
    const total = 1
    const options: PaginationOptions = { page: 1, limit: 10 }
    const result = paginate(items, total, options)
    expect(result.meta.totalPages).toBe(1)
    expect(result.meta.hasNext).toBe(false)
  })
})
