/**
 * @fileoverview Unified Search API
 * @description High-level search API that integrates all search components
 */

import Fuse from 'fuse.js'
import { AdvancedSearchManager } from './advanced-search'
import { SearchIndexManager } from './index-manager'
import { SQLiteFTSManager } from './sqlite-fts'
import {
  sortResults,
  applyAdvancedFilters,
  createFiltersFromSearchFilters,
  parseSortOption,
  type SortConfig,
  type AdvancedFilter,
} from './sort-filter'
import type {
  UnifiedEntity,
  SearchFilters,
  AdvancedSearchQuery,
  PaginatedSearchResult,
  SearchIndexConfig,
} from './types'
import type { SearchResult } from '@/types/search-filter'

// ============================================================================
// Types
// ============================================================================

/**
 * Search engine type
 */
export type SearchEngineType = 'memory' | 'fuse' | 'sqlite-fts'

/**
 * Unified search options
 */
export interface UnifiedSearchOptions {
  /** Search query */
  query: string
  /** Target entity types */
  targets?: UnifiedEntity['type'][]
  /** Search filters */
  filters?: SearchFilters
  /** Sort configuration */
  sort?: SortConfig | string
  /** Result limit */
  limit?: number
  /** Result offset */
  offset?: number
  /** Search engine to use */
  engine?: SearchEngineType
  /** Include highlights */
  includeHighlights?: boolean
  /** Enable fuzzy search */
  fuzzySearch?: boolean
  /** Fuzzy search threshold */
  fuzzyThreshold?: number
}

/**
 * Search statistics
 */
export interface SearchStatistics {
  query: string
  totalResults: number
  executionTime: number
  engine: SearchEngineType
  cacheHit: boolean
  filtersApplied: number
  resultsByType: Record<string, number>
}

// ============================================================================
// Unified Search Manager
// ============================================================================

export class UnifiedSearchManager {
  private fuseManager: AdvancedSearchManager<UnifiedEntity>
  private indexManager: SearchIndexManager
  private ftsManager: SQLiteFTSManager | null = null
  private defaultEngine: SearchEngineType = 'fuse'
  private statsCache: Map<string, SearchStatistics> = new Map()

  constructor(options: {
    enableFTS?: boolean
    ftsDbPath?: string
    defaultEngine?: SearchEngineType
  } = {}) {
    this.fuseManager = new AdvancedSearchManager<UnifiedEntity>()
    this.indexManager = new SearchIndexManager()
    this.defaultEngine = options.defaultEngine || 'fuse'

    // Initialize FTS if enabled
    if (options.enableFTS) {
      this.ftsManager = new SQLiteFTSManager({
        dbPath: options.ftsDbPath,
        inMemory: !options.ftsDbPath,
      })
      this.ftsManager.initialize()
    }
  }

  /**
   * Initialize search indices
   */
  async initialize(entities: {
    tasks?: UnifiedEntity[]
    projects?: UnifiedEntity[]
    members?: UnifiedEntity[]
    agents?: UnifiedEntity[]
  }): Promise<void> {
    // Initialize index manager
    await this.indexManager.initialize()

    // Update indices with entities
    if (entities.tasks) {
      this.indexManager.updateIndex('tasks', entities.tasks)
      this.fuseManager.createIndex('tasks', entities.tasks)
      this.ftsManager?.createIndex(
        { id: 'tasks', name: 'Tasks', fields: ['title', 'description'], enabled: true },
        entities.tasks
      )
    }

    if (entities.projects) {
      this.indexManager.updateIndex('projects', entities.projects)
      this.fuseManager.createIndex('projects', entities.projects)
      this.ftsManager?.createIndex(
        { id: 'projects', name: 'Projects', fields: ['title', 'description'], enabled: true },
        entities.projects
      )
    }

    if (entities.members) {
      this.indexManager.updateIndex('members', entities.members)
      this.fuseManager.createIndex('members', entities.members)
      this.ftsManager?.createIndex(
        { id: 'members', name: 'Members', fields: ['login', 'displayName', 'role'], enabled: true },
        entities.members
      )
    }

    if (entities.agents) {
      this.indexManager.updateIndex('agents', entities.agents)
      this.fuseManager.createIndex('agents', entities.agents)
      this.ftsManager?.createIndex(
        { id: 'agents', name: 'Agents', fields: ['title', 'description', 'capabilities'], enabled: true },
        entities.agents
      )
    }
  }

  /**
   * Perform unified search
   */
  async search(options: UnifiedSearchOptions): Promise<{
    results: SearchResult<UnifiedEntity>[]
    pagination: PaginatedSearchResult<UnifiedEntity>
    statistics: SearchStatistics
  }> {
    const startTime = Date.now()

    // Normalize options
    const query = options.query || ''
    const targets = options.targets || ['task', 'project', 'member', 'agent']
    const limit = options.limit || 50
    const offset = options.offset || 0
    const engine = options.engine || this.defaultEngine

    // Parse sort config
    const sortConfig =
      typeof options.sort === 'string'
        ? parseSortOption(options.sort)
        : options.sort || { field: 'relevance' }

    // Convert filters
    const filters = options.filters
      ? createFiltersFromSearchFilters(options.filters)
      : []

    // Perform search using selected engine
    let rawResults: SearchResult<UnifiedEntity>[] = []

    switch (engine) {
      case 'memory':
        rawResults = await this.searchMemory(query, targets, options)
        break
      case 'fuse':
        rawResults = await this.searchFuse(query, targets, options)
        break
      case 'sqlite-fts':
        rawResults = await this.searchFTS(query, targets, options)
        break
      default:
        rawResults = await this.searchFuse(query, targets, options)
    }

    // Apply filters
    let filteredResults = applyAdvancedFilters(rawResults, filters)

    // Sort results
    filteredResults = sortResults(filteredResults, sortConfig)

    // Apply pagination
    const paginatedResults = this.applyPagination(filteredResults, offset, limit)

    // Calculate statistics
    const executionTime = Date.now() - startTime
    const statistics: SearchStatistics = {
      query,
      totalResults: filteredResults.length,
      executionTime,
      engine,
      cacheHit: false, // TODO: Implement cache tracking
      filtersApplied: filters.length,
      resultsByType: this.groupResultsByType(paginatedResults.results),
    }

    return {
      results: paginatedResults.results,
      pagination: paginatedResults,
      statistics,
    }
  }

  /**
   * Search using in-memory search
   */
  private async searchMemory(
    query: string,
    targets: UnifiedEntity['type'][],
    options: UnifiedSearchOptions
  ): Promise<SearchResult<UnifiedEntity>[]> {
    // Simple in-memory search using Fuse.js
    const allIndices = this.indexManager.getAllIndices()
    const results: SearchResult<UnifiedEntity>[] = []

    for (const [id, fuse] of allIndices) {
      const targetType = id.slice(0, -1) as UnifiedEntity['type'] // Remove 's'

      if (!targets.includes(targetType)) continue

      const fuseResults = fuse.search(query, { limit: options.limit })

      for (const result of fuseResults) {
        results.push({
          item: result.item,
          matchedFields: result.matches?.map(m => m.key || '') || [],
          highlights: [],
          score: result.score ? 1 - result.score : 1,
        })
      }
    }

    return results
  }

  /**
   * Search using Fuse.js
   */
  private async searchFuse(
    query: string,
    targets: UnifiedEntity['type'][],
    options: UnifiedSearchOptions
  ): Promise<SearchResult<UnifiedEntity>[]> {
    const indices = targets.map(t => `${t}s`)
    return this.fuseManager.search(query, {
      indices,
      limit: options.limit,
      config: {
        target: 'all',
        caseSensitive: false,
        fuzzyMatch: options.fuzzySearch ?? true,
        fuzzyThreshold: options.fuzzyThreshold ?? 0.3,
        includeHighlights: options.includeHighlights ?? true,
      },
    })
  }

  /**
   * Search using SQLite FTS
   */
  private async searchFTS(
    query: string,
    targets: UnifiedEntity['type'][],
    options: UnifiedSearchOptions
  ): Promise<SearchResult<UnifiedEntity>[]> {
    if (!this.ftsManager) {
      throw new Error('SQLite FTS is not enabled')
    }

    return this.ftsManager.search(query, {
      indices: targets.map(t => `${t}s`),
      limit: options.limit,
      offset: options.offset,
      sortBy: options.sort === 'hybrid' ? 'hybrid' : 'relevance',
    })
  }

  /**
   * Apply pagination to results
   */
  private applyPagination<T>(
    results: T[],
    offset: number,
    limit: number
  ): PaginatedSearchResult<T> {
    const total = results.length
    const paginatedResults = results.slice(offset, offset + limit)
    const page = Math.floor(offset / limit) + 1

    return {
      results: paginatedResults as T[],
      total,
      page,
      pageSize: limit,
      hasMore: offset + limit < total,
    }
  }

  /**
   * Group results by entity type
   */
  private groupResultsByType(results: SearchResult<UnifiedEntity>[]): Record<string, number> {
    const groups: Record<string, number> = {}

    for (const result of results) {
      const type = result.item.type
      groups[type] = (groups[type] || 0) + 1
    }

    return groups
  }

  /**
   * Get autocomplete suggestions
   */
  async getAutocompleteSuggestions(
    query: string,
    options: {
      limit?: number
      targets?: UnifiedEntity['type'][]
      includeHistory?: boolean
    } = {}
  ): Promise<Array<{ text: string; type: UnifiedEntity['type']; entity?: UnifiedEntity }>> {
    const { limit = 10, targets, includeHistory = true } = options

    const suggestions: Array<{ text: string; type: UnifiedEntity['type']; entity?: UnifiedEntity }> = []

    // Get suggestions from Fuse.js
    const fuseSuggestions = this.fuseManager.getAutocompleteSuggestions(query, {
      indices: targets?.map(t => `${t}s`),
      includeHistory,
    })

    for (const suggestion of fuseSuggestions) {
      if (suggestion.type === 'entity' && suggestion.entity) {
        suggestions.push({
          text: suggestion.text,
          type: suggestion.entity.type,
          entity: suggestion.entity as UnifiedEntity,
        })
      } else if (suggestion.type === 'history') {
        suggestions.push({
          text: suggestion.text,
          type: 'task', // Default type for history
        })
      }
    }

    // Add FTS suggestions if available
    if (this.ftsManager) {
      const ftsSuggestions = this.ftsManager.getAutocompleteSuggestions(query, {
        limit: Math.max(0, limit - suggestions.length),
        entityTypes: targets,
      })

      for (const suggestion of ftsSuggestions) {
        if (!suggestions.some(s => s.text === suggestion.text)) {
          suggestions.push({
            text: suggestion.text,
            type: suggestion.type,
            entity: suggestion.entity,
          })
        }
      }
    }

    return suggestions.slice(0, limit)
  }

  /**
   * Update entities in all indices
   */
  async updateEntities(entities: UnifiedEntity[]): Promise<void> {
    // Group by type
    const byType = entities.reduce(
      (acc, entity) => {
        if (!acc[entity.type]) acc[entity.type] = []
        acc[entity.type].push(entity)
        return acc
      },
      {} as Record<UnifiedEntity['type'], UnifiedEntity[]>
    )

    // Update each index
    for (const [type, items] of Object.entries(byType)) {
      const indexId = `${type}s`

      // Update Fuse.js index
      this.fuseManager.updateIndex(indexId, items)

      // Update FTS index
      this.ftsManager?.upsertItems(indexId, items)

      // Update index manager
      this.indexManager.updateIndex(indexId, items)
    }
  }

  /**
   * Remove entities from all indices
   */
  async removeEntities(entityIds: string[]): Promise<void> {
    // Remove from Fuse.js (requires full rebuild)
    // TODO: Implement efficient removal

    // Remove from FTS
    if (this.ftsManager) {
      this.ftsManager.removeItems('all', entityIds)
    }

    // Remove from index manager
    // TODO: Implement efficient removal
  }

  /**
   * Get search statistics
   */
  getStatistics(): {
    fuse: ReturnType<AdvancedSearchManager<UnifiedEntity>['getCacheStats']>
    index: ReturnType<SearchIndexManager['getStatistics']>
    fts?: ReturnType<SQLiteFTSManager['getStatistics']>
  } {
    return {
      fuse: this.fuseManager.getCacheStats(),
      index: this.indexManager.getStatistics(),
      fts: this.ftsManager?.getStatistics(),
    }
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.fuseManager.clearCaches()
    this.ftsManager?.clearCache()
    this.statsCache.clear()
  }

  /**
   * Close all connections
   */
  close(): void {
    this.ftsManager?.close()
  }
}

// ============================================================================
// Global unified search manager instance
// ============================================================================

let globalUnifiedSearchManager: UnifiedSearchManager | null = null

/**
 * Get or create global unified search manager instance
 */
export function getGlobalUnifiedSearchManager(options?: {
  enableFTS?: boolean
  ftsDbPath?: string
  defaultEngine?: SearchEngineType
}): UnifiedSearchManager {
  if (!globalUnifiedSearchManager) {
    globalUnifiedSearchManager = new UnifiedSearchManager(options)
  }
  return globalUnifiedSearchManager
}

/**
 * Reset global unified search manager instance
 */
export function resetGlobalUnifiedSearchManager(): void {
  if (globalUnifiedSearchManager) {
    globalUnifiedSearchManager.close()
  }
  globalUnifiedSearchManager = null
}