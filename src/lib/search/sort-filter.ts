// @ts-nocheck
/**
 * @fileoverview Enhanced search sorting and filtering logic
 * @description Provides advanced sorting (relevance + time hybrid) and filter combination
 */

import type { UnifiedEntity, SearchFilters } from './types'
import type { SearchResult } from '@/types/search-filter'

// ============================================================================
// Types
// ============================================================================

/**
 * Sort options for search results
 */
export type SortOption = 'relevance' | 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc' | 'hybrid'

/**
 * Sort configuration
 */
export interface SortConfig {
  /** Sort field */
  field: SortOption
  /** Date field to sort by (default: 'updatedAt') */
  dateField?: 'createdAt' | 'updatedAt'
  /** Hybrid sort weight (0-1) */
  hybridWeight?: number
}

/**
 * Filter combination mode
 */
export type FilterMode = 'and' | 'or' | 'and-not'

/**
 * Advanced filter definition
 */
export interface AdvancedFilter {
  /** Filter field path (e.g., 'status', 'priority', 'labels.name') */
  field: string
  /** Filter values */
  values: unknown[]
  /** Filter mode for this field */
  mode?: FilterMode
  /** Custom filter function */
  filterFn?: (item: UnifiedEntity, value: unknown) => boolean
}

/**
 * Search context for sorting
 */
export interface SearchContext {
  query: string
  filters: AdvancedFilter[]
  sort: SortConfig
  dateRange?: {
    start?: Date
    end?: Date
  }
}

// ============================================================================
// Sorting Functions
// ============================================================================

/**
 * Sort search results by various criteria
 */
export function sortResults<T>(
  results: SearchResult<T>[],
  config: SortConfig
): SearchResult<T>[] {
  const { field, dateField = 'updatedAt', hybridWeight = 0.3 } = config

  // Clone results to avoid mutation
  const sorted = [...results]

  switch (field) {
    case 'relevance':
      // Already sorted by relevance from search engine
      return sorted

    case 'date-asc':
      return sorted.sort((a, b) => {
        const dateA = new Date((a.item as Record<string, unknown>)[dateField] as string || 0).getTime()
        const dateB = new Date((b.item as Record<string, unknown>)[dateField] as string || 0).getTime()
        return dateA - dateB
      })

    case 'date-desc':
      return sorted.sort((a, b) => {
        const dateA = new Date((a.item as Record<string, unknown>)[dateField] as string || 0).getTime()
        const dateB = new Date((b.item as Record<string, unknown>)[dateField] as string || 0).getTime()
        return dateB - dateA
      })

    case 'name-asc':
      return sorted.sort((a, b) => {
        const nameA = String((a.item as Record<string, unknown>).name || (a.item as Record<string, unknown>).title || '')
        const nameB = String((b.item as Record<string, unknown>).name || (b.item as Record<string, unknown>).title || '')
        return nameA.localeCompare(nameB)
      })

    case 'name-desc':
      return sorted.sort((a, b) => {
        const nameA = String((a.item as Record<string, unknown>).name || (a.item as Record<string, unknown>).title || '')
        const nameB = String((b.item as Record<string, unknown>).name || (b.item as Record<string, unknown>).title || '')
        return nameB.localeCompare(nameA)
      })

    case 'hybrid':
      // Hybrid: combine relevance score with recency
      return sorted.sort((a, b) => {
        const recencyA = calculateRecencyScore(a.item as UnifiedEntity, dateField)
        const recencyB = calculateRecencyScore(b.item as UnifiedEntity, dateField)

        const relevanceA = a.score
        const relevanceB = b.score

        // Combined score: (1 - w) * relevance + w * recency
        const combinedA = (1 - hybridWeight) * relevanceA + hybridWeight * recencyA
        const combinedB = (1 - hybridWeight) * relevanceB + hybridWeight * recencyB

        return combinedB - combinedA
      })

    default:
      return sorted
  }
}

/**
 * Calculate recency score (0-1) based on date
 */
function calculateRecencyScore(item: UnifiedEntity, dateField: string): number {
  const dateValue = item[dateField] || item.createdAt
  if (!dateValue) return 0.5 // Default middle score

  const date = new Date(dateValue as string).getTime()
  const now = Date.now()

  // Days since date
  const daysSince = (now - date) / (1000 * 60 * 60 * 24)

  // Score decays exponentially: 1 for today, 0.5 for 30 days ago, ~0 for 90+ days
  if (daysSince <= 0) return 1
  if (daysSince >= 90) return 0

  // Exponential decay: score = e^(-days/30)
  return Math.exp(-daysSince / 30)
}

// ============================================================================
// Filter Functions
// ============================================================================

/**
 * Apply advanced filters to search results
 */
export function applyAdvancedFilters(
  results: SearchResult<UnifiedEntity>[],
  filters: AdvancedFilter[]
): SearchResult<UnifiedEntity>[] {
  if (filters.length === 0) return results

  // Group filters by their combination mode
  const andFilters = filters.filter(f => f.mode === 'and' || !f.mode)
  const orFilters = filters.filter(f => f.mode === 'or')
  const notFilters = filters.filter(f => f.mode === 'and-not')

  return results.filter(result => {
    const item = result.item

    // Apply AND filters (all must match)
    for (const filter of andFilters) {
      if (!passesFilter(item, filter)) {
        return false
      }
    }

    // Apply OR filters (at least one must match)
    if (orFilters.length > 0) {
      const orMatch = orFilters.some(filter => passesFilter(item, filter))
      if (!orMatch && orFilters.length > 0) {
        return false
      }
    }

    // Apply AND-NOT filters (none must match)
    for (const filter of notFilters) {
      if (passesFilter(item, filter)) {
        return false
      }
    }

    return true
  })
}

/**
 * Check if an item passes a filter
 */
function passesFilter(item: UnifiedEntity, filter: AdvancedFilter): boolean {
  // Use custom filter function if provided
  if (filter.filterFn) {
    return filter.values.some(value => filter.filterFn!(item, value))
  }

  // Get value from item using field path
  const value = getNestedValue(item, filter.field)

  // Handle array values
  if (Array.isArray(value)) {
    return filter.values.some(filterValue =>
      value.some(v => matchValue(v, filterValue))
    )
  }

  // Handle single value
  return filter.values.some(filterValue => matchValue(value, filterValue))
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.')
  let current: unknown = obj

  for (const key of keys) {
    if (current === null || current === undefined) return undefined
    current = (current as Record<string, unknown>)[key]
  }

  return current
}

/**
 * Match a value against a filter value
 */
function matchValue(value: unknown, filterValue: unknown): boolean {
  // Exact match
  if (value === filterValue) return true

  // String case-insensitive match
  if (typeof value === 'string' && typeof filterValue === 'string') {
    return value.toLowerCase() === filterValue.toLowerCase()
  }

  // Partial string match
  if (typeof value === 'string' && typeof filterValue === 'string') {
    return value.toLowerCase().includes(filterValue.toLowerCase())
  }

  // Array containment
  if (Array.isArray(value)) {
    return value.some(v => matchValue(v, filterValue))
  }

  return false
}

/**
 * Create filters from simple search filters
 */
export function createFiltersFromSearchFilters(searchFilters: SearchFilters): AdvancedFilter[] {
  const filters: AdvancedFilter[] = []

  if (searchFilters.status && searchFilters.status.length > 0) {
    filters.push({
      field: 'status',
      values: searchFilters.status,
      mode: 'and',
    })
  }

  if (searchFilters.priority && searchFilters.priority.length > 0) {
    filters.push({
      field: 'priority',
      values: searchFilters.priority,
      mode: 'and',
    })
  }

  if (searchFilters.labels && searchFilters.labels.length > 0) {
    filters.push({
      field: 'labels.name',
      values: searchFilters.labels,
      mode: 'or',
    })
  }

  if (searchFilters.assignees && searchFilters.assignees.length > 0) {
    filters.push({
      field: 'assignee',
      values: searchFilters.assignees,
      mode: 'and',
    })
  }

  if (searchFilters.dateRange) {
    filters.push({
      field: 'createdAt',
      values: [searchFilters.dateRange],
      mode: 'and',
      filterFn: (item, value) => {
        const dateRange = value as { start?: string; end?: string }
        const date = new Date((item as UnifiedEntity).createdAt as string).getTime()

        if (dateRange.start && date < new Date(dateRange.start).getTime()) {
          return false
        }
        if (dateRange.end && date > new Date(dateRange.end).getTime()) {
          return false
        }
        return true
      },
    })
  }

  if (searchFilters.createdAfter) {
    filters.push({
      field: 'createdAt',
      values: [searchFilters.createdAfter],
      mode: 'and',
      filterFn: (item, value) => {
        const date = new Date((item as UnifiedEntity).createdAt as string).getTime()
        return date >= new Date(value as string).getTime()
      },
    })
  }

  if (searchFilters.createdBefore) {
    filters.push({
      field: 'createdAt',
      values: [searchFilters.createdBefore],
      mode: 'and',
      filterFn: (item, value) => {
        const date = new Date((item as UnifiedEntity).createdAt as string).getTime()
        return date <= new Date(value as string).getTime()
      },
    })
  }

  if (searchFilters.updatedAfter) {
    filters.push({
      field: 'updatedAt',
      values: [searchFilters.updatedAfter],
      mode: 'and',
      filterFn: (item, value) => {
        const date = new Date((item as UnifiedEntity).updatedAt as string).getTime()
        return date >= new Date(value as string).getTime()
      },
    })
  }

  if (searchFilters.updatedBefore) {
    filters.push({
      field: 'updatedAt',
      values: [searchFilters.updatedBefore],
      mode: 'and',
      filterFn: (item, value) => {
        const date = new Date((item as UnifiedEntity).updatedAt as string).getTime()
        return date <= new Date(value as string).getTime()
      },
    })
  }

  // Custom filters
  if (searchFilters.custom) {
    for (const [field, values] of Object.entries(searchFilters.custom)) {
      filters.push({
        field,
        values,
        mode: 'and',
      })
    }
  }

  return filters
}

// ============================================================================
// Unified Search Function
// ============================================================================

/**
 * Complete search pipeline
 */
export function executeSearch(
  results: SearchResult<UnifiedEntity>[],
  query: string,
  filters: AdvancedFilter[],
  sortConfig: SortConfig
): SearchResult<UnifiedEntity>[] {
  // 1. Apply filters
  let filtered = applyAdvancedFilters(results, filters)

  // 2. Sort results
  filtered = sortResults(filtered, sortConfig)

  return filtered
}

/**
 * Parse sort option from string
 */
export function parseSortOption(option: string): SortConfig {
  switch (option.toLowerCase()) {
    case 'relevance':
      return { field: 'relevance' }
    case 'date-asc':
    case 'date_asc':
      return { field: 'date-asc' }
    case 'date-desc':
    case 'date_desc':
      return { field: 'date-desc' }
    case 'name-asc':
    case 'name_asc':
      return { field: 'name-asc' }
    case 'name-desc':
    case 'name_desc':
      return { field: 'name-desc' }
    case 'hybrid':
      return { field: 'hybrid', hybridWeight: 0.3 }
    default:
      return { field: 'relevance' }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Extract unique values for a field from results
 */
export function extractFieldValues(
  results: SearchResult<UnifiedEntity>[],
  field: string
): unknown[] {
  const values = new Set<unknown>()

  for (const result of results) {
    const value = getNestedValue(result.item as Record<string, unknown>, field)
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(v => values.add(v))
      } else {
        values.add(value)
      }
    }
  }

  return Array.from(values)
}

/**
 * Group results by field value
 */
export function groupResultsByField<T>(
  results: SearchResult<T>[],
  field: string
): Map<unknown, SearchResult<T>[]> {
  const groups = new Map<unknown, SearchResult<T>[]>()

  for (const result of results) {
    const value = getNestedValue(result.item as Record<string, unknown>, field)
    const key = value ?? 'undefined'

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(result)
  }

  return groups
}
