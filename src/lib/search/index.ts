/**
 * @fileoverview Enhanced search library - Main export
 * @description Comprehensive search functionality with multi-field search, debouncing, history, and performance optimization
 * @exports Search utilities, managers, and types
 */

// ============================================================================
// Core search functionality
// ============================================================================

export {
  searchItems,
  highlightSearchTerm,
  applyFilters,
  applySort,
  extractFilterOptions,
  extractLabelOptions,
  extractAssigneeOptions,
  applySearchFilterSort,
  hasActiveFilters,
  clearAllFilters,
  clearAllCaches,
  getCacheStats,
  toggleSortDirection,
} from '../search-filter'

// ============================================================================
// Enhanced features
// ============================================================================

export {
  // Debouncing
  debounce,
  debounceLeading,
  debounceCancellable,
  throttle,
  createSearchDebounce,
  DebounceManager,
  getGlobalDebounceManager,
  resetGlobalDebounceManager,
  SEARCH_DEBOUNCE_DELAYS,
} from './debounce'

export {
  // Multi-field search
  multiFieldSearch,
  createMultiFieldConfig,
  createRequiredFieldsConfig,
  toStandardSearchResult,
  getMultiFieldSearchStats,
} from './multi-field-search'

// ============================================================================
// Search managers
// ============================================================================

export {
  // Advanced search (Fuse.js integration)
  AdvancedSearchManager,
  getGlobalSearchManager,
  resetGlobalSearchManager,
  highlightSearchTerm as fuseHighlightSearchTerm,
  parseSearchQuery,
  buildSearchQuery,
} from './advanced-search'

export {
  // Search index manager
  SearchIndexManager,
  getGlobalIndexManager,
  resetGlobalIndexManager,
  convertIssueToTaskEntity,
  convertToProjectEntity,
  convertToMemberEntity,
  convertToAgentEntity,
} from './index-manager'

export {
  // Search history manager
  SearchHistoryManager,
  getGlobalHistoryManager,
  resetGlobalHistoryManager,
} from './history-manager'

// ============================================================================
// Types
// ============================================================================

export type {
  // Multi-field search types
  MultiFieldSearchConfig,
  FieldSearchConfig,
  MultiFieldSearchResult,
  FieldMatch,
} from './multi-field-search'

export type {
  // Advanced search types
  SearchHistoryEntry,
  AutocompleteSuggestion,
  SearchIndex,
} from './advanced-search'

export type { AutocompleteSuggestionType } from './types'

export type {
  // Index manager types
  SearchIndexConfig,
  SearchIndexMetadata,
  UnifiedEntity,
  TaskEntity,
  ProjectEntity,
  MemberEntity,
  AgentEntity,
} from './types'

export type {
  // History manager types
  SearchHistoryEntry as HistoryEntry,
  SearchHistoryStorage,
} from './types'

// ============================================================================
// Re-exports from types
// ============================================================================

export type {
  SearchConfig,
  SearchResult,
  FilterConfig,
  SortConfig,
  ActiveFilters,
} from '@/types/search-filter'

// ============================================================================
// Utility types
// ============================================================================

/**
 * Search event for tracking and analytics
 */
export interface SearchEvent {
  type: 'search' | 'filter-change' | 'history-add' | 'cache-hit' | 'cache-miss'
  timestamp: number
  query?: string
  resultCount?: number
  target?: string
  metadata?: Record<string, unknown>
}

/**
 * Search performance metrics
 */
export interface SearchPerformanceMetrics {
  query: string
  executionTime: number
  resultCount: number
  cacheHit: boolean
  timestamp: number
}

/**
 * Search options for all search functions
 */
export interface SearchOptions {
  /** Query string */
  query: string
  /** Search configuration */
  config?: import('./multi-field-search').MultiFieldSearchConfig
  /** Field filters */
  filters?: Record<string, unknown[]>
  /** Sort configuration */
  sort?: import('@/types/search-filter').SortConfig<unknown>
  /** Result limit */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Complete search result with metadata
 */
export interface CompleteSearchResult<T> {
  /** Search results */
  results: import('@/types/search-filter').SearchResult<T>[]
  /** Pagination info */
  pagination: {
    total: number
    page: number
    pageSize: number
    hasMore: boolean
  }
  /** Performance metrics */
  performance: SearchPerformanceMetrics
  /** Active filters count */
  activeFilterCount: number
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default search options
 */
export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  query: '',
  limit: 50,
  offset: 0,
}

/**
 * Performance thresholds
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Fast search threshold (ms) */
  FAST: 50,
  /** Normal search threshold (ms) */
  NORMAL: 200,
  /** Slow search threshold (ms) */
  SLOW: 500,
  /** Very slow search threshold (ms) */
  VERY_SLOW: 1000,
} as const

/**
 * Cache sizes
 */
export const CACHE_SIZES = {
  /** Small cache */
  SMALL: 50,
  /** Medium cache (default) */
  MEDIUM: 100,
  /** Large cache */
  LARGE: 500,
  /** Extra large cache */
  EXTRA_LARGE: 1000,
} as const
