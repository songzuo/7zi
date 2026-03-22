/**
 * @fileoverview Advanced search library with Fuse.js integration
 * @description Provides high-performance fuzzy search with indexing, history management, and autocomplete
 * @features Fuse.js integration, search history, autocomplete, result highlighting
 */

import Fuse from 'fuse.js';
import type { SearchConfig, SearchResult, SearchTarget } from '@/types/search-filter';
import { LRUCache } from '@/lib/cache/lru-cache';

// ============================================================================
// Types
// ============================================================================

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
  resultCount: number;
  target: SearchTarget;
}

export interface AutocompleteSuggestion {
  text: string;
  type: 'history' | 'suggestion' | 'entity';
  score?: number;
  entity?: {
    id: string;
    type: 'task' | 'project' | 'member' | 'agent';
    name: string;
  };
}

export interface SearchIndex<T> {
  id: string;
  fuse: Fuse<T>;
  items: T[];
  lastUpdated: number;
}

// ============================================================================
// Constants
// ============================================================================

// @ts-ignore - Fuse.js type issue with namespace in TypeScript
const DEFAULT_FUSE_OPTIONS: Fuse.IFuseOptions<Record<string, unknown>> = {
  threshold: 0.3,
  distance: 100,
  minMatchCharLength: 2,
  keys: ['title', 'name', 'description', 'content', 'body'],
  includeScore: true,
  includeMatches: true,
  ignoreLocation: true,
  useExtendedSearch: true,
};

const SEARCH_HISTORY_MAX_SIZE = 50;
const AUTOCOMPOTE_MAX_SUGGESTIONS = 10;
const SEARCH_CACHE_SIZE = 100;

// ============================================================================
// Search Manager
// ============================================================================

export class AdvancedSearchManager<T extends Record<string, unknown>> {
  private indices: Map<string, SearchIndex<T>> = new Map();
  private searchHistory: SearchHistoryEntry[] = [];
  private searchCache: LRUCache<SearchResult<T>[]>;
  private autocompleteCache: LRUCache<AutocompleteSuggestion[]>;

  constructor(
    private maxHistorySize: number = SEARCH_HISTORY_MAX_SIZE,
    private maxSuggestions: number = AUTOCOMPOTE_MAX_SUGGESTIONS,
    private cacheSize: number = SEARCH_CACHE_SIZE
  ) {
    this.searchCache = new LRUCache(cacheSize);
    this.autocompleteCache = new LRUCache(cacheSize);
  }

  /**
   * Create or update a search index
   */
  createIndex(
    id: string,
    items: T[],
    // @ts-ignore - Fuse.js type issue with namespace in TypeScript
    options?: Partial<Fuse.IFuseOptions<T>>
  ): void {
    const fuseOptions = { ...DEFAULT_FUSE_OPTIONS, ...options };
    const fuse = new Fuse(items, fuseOptions);

    this.indices.set(id, {
      id,
      fuse,
      items: [...items],
      lastUpdated: Date.now(),
    });
  }

  /**
   * Update an existing index with new items
   */
  updateIndex(id: string, items: T[]): void {
    const index = this.indices.get(id);
    if (!index) {
      this.createIndex(id, items);
      return;
    }

    index.fuse.setCollection(items);
    index.items = [...items];
    index.lastUpdated = Date.now();
  }

  /**
   * Remove an index
   */
  removeIndex(id: string): void {
    this.indices.delete(id);
    this.searchCache.delete(id);
    this.autocompleteCache.delete(id);
  }

  /**
   * Get all index IDs
   */
  getIndexIds(): string[] {
    return Array.from(this.indices.keys());
  }

  /**
   * Check if an index exists
   */
  hasIndex(id: string): boolean {
    return this.indices.has(id);
  }

  /**
   * Perform search across all or specific indices
   */
  search(
    query: string,
    options: {
      indices?: string[];
      limit?: number;
      config?: SearchConfig;
    } = {}
  ): SearchResult<T>[] {
    if (!query.trim()) {
      return [];
    }

    const { indices: targetIndices, limit = 50, config } = options;
    const indicesToSearch = targetIndices
      ? targetIndices.filter(id => this.indices.has(id))
      : Array.from(this.indices.keys());

    if (indicesToSearch.length === 0) {
      return [];
    }

    // Check cache
    const cacheKey = this.generateCacheKey(query, indicesToSearch, config);
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return cached.slice(0, limit);
    }

    const allResults: SearchResult<T>[] = [];

    for (const indexId of indicesToSearch) {
      const index = this.indices.get(indexId);
      if (!index) continue;

      const fuseResults = index.fuse.search(query, { limit });

      const results = this.convertFuseResults(indexId, fuseResults, config);
      allResults.push(...results);
    }

    // Sort by score
    allResults.sort((a, b) => b.score - a.score);

    // Apply limit
    const limitedResults = allResults.slice(0, limit);

    // Cache results
    this.searchCache.set(cacheKey, limitedResults);

    return limitedResults;
  }

  /**
   * Search within a specific index
   */
  searchIndex(
    indexId: string,
    query: string,
    options: {
      limit?: number;
      config?: SearchConfig;
    } = {}
  ): SearchResult<T>[] {
    if (!query.trim()) {
      return [];
    }

    const index = this.indices.get(indexId);
    if (!index) {
      return [];
    }

    const { limit = 50, config } = options;
    const cacheKey = `${indexId}:${query}:${JSON.stringify(config)}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return cached.slice(0, limit);
    }

    const fuseResults = index.fuse.search(query, { limit });
    const results = this.convertFuseResults(indexId, fuseResults, config);

    this.searchCache.set(cacheKey, results);

    return results;
  }

  /**
   * Get autocomplete suggestions
   */
  getAutocompleteSuggestions(
    query: string,
    options: {
      indices?: string[];
      includeHistory?: boolean;
    } = {}
  ): AutocompleteSuggestion[] {
    if (!query.trim()) {
      // Return recent history if query is empty
      if (options.includeHistory) {
        return this.getRecentHistory(5);
      }
      return [];
    }

    const { indices: targetIndices, includeHistory = true } = options;
    const cacheKey = `autocomplete:${query}:${targetIndices?.join(',') || 'all'}`;
    const cached = this.autocompleteCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const suggestions: AutocompleteSuggestion[] = [];

    // Add history suggestions
    if (includeHistory) {
      const historySuggestions = this.searchHistory
        .filter(entry => entry.query.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map(entry => ({
          text: entry.query,
          type: 'history' as const,
          score: 0.9,
        }));
      suggestions.push(...historySuggestions);
    }

    // Add entity suggestions from indices
    const indicesToSearch = targetIndices
      ? targetIndices.filter(id => this.indices.has(id))
      : Array.from(this.indices.keys());

    for (const indexId of indicesToSearch) {
      const index = this.indices.get(indexId);
      if (!index) continue;

      const fuseResults = index.fuse.search(query, { limit: 5 });

      for (const result of fuseResults) {
        const item = result.item;
        const entityName = (item.title || item.name || item.description || '') as string;

        suggestions.push({
          text: entityName,
          type: 'entity',
          score: result.score ? 1 - result.score : 0,
          entity: {
            id: String((item.id || item.number || item._id) || ''),
            type: this.getEntityType(indexId),
            name: entityName,
          },
        });
      }
    }

    // Add prefix suggestions
    suggestions.push(...this.generatePrefixSuggestions(query));

    // Sort by score and limit
    const sorted = suggestions
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, this.maxSuggestions);

    this.autocompleteCache.set(cacheKey, sorted);

    return sorted;
  }

  /**
   * Add search to history
   */
  addToHistory(
    query: string,
    resultCount: number,
    target: SearchTarget = 'all'
  ): void {
    if (!query.trim()) return;

    const entry: SearchHistoryEntry = {
      query,
      timestamp: Date.now(),
      resultCount,
      target,
    };

    // Remove duplicate queries
    this.searchHistory = this.searchHistory.filter(
      h => h.query.toLowerCase() !== query.toLowerCase()
    );

    // Add to beginning
    this.searchHistory.unshift(entry);

    // Trim to max size
    if (this.searchHistory.length > this.maxHistorySize) {
      this.searchHistory = this.searchHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Get search history
   */
  getHistory(limit?: number): SearchHistoryEntry[] {
    if (limit) {
      return this.searchHistory.slice(0, limit);
    }
    return [...this.searchHistory];
  }

  /**
   * Get recent history entries
   */
  getRecentHistory(limit: number): AutocompleteSuggestion[] {
    return this.searchHistory
      .slice(0, limit)
      .map(entry => ({
        text: entry.query,
        type: 'history' as const,
        score: 1 - (this.searchHistory.indexOf(entry) / limit),
      }));
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.searchHistory = [];
  }

  /**
   * Remove a specific history entry
   */
  removeFromHistory(query: string): void {
    this.searchHistory = this.searchHistory.filter(
      h => h.query.toLowerCase() !== query.toLowerCase()
    );
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.searchCache.clear();
    this.autocompleteCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    searchCache: { size: number; maxSize: number };
    autocompleteCache: { size: number; maxSize: number };
    indices: number;
    history: number;
  } {
    return {
      searchCache: {
        size: this.searchCache.size,
        maxSize: this.cacheSize,
      },
      autocompleteCache: {
        size: this.autocompleteCache.size,
        maxSize: this.cacheSize,
      },
      indices: this.indices.size,
      history: this.searchHistory.length,
    };
  }

  /**
   * Convert Fuse.js results to SearchResult format
   */
  private convertFuseResults(
    indexId: string,
    // @ts-ignore - Fuse.js type issue with namespace in TypeScript
    fuseResults: Fuse.FuseResult<T>[],
    config?: SearchConfig
  ): SearchResult<T>[] {
    return fuseResults.map(result => {
      const matchedFields: string[] = [];
      const highlights: SearchResult['highlights'] = [];

      if (result.matches) {
        for (const match of result.matches) {
          matchedFields.push(match.key || match.refIndex?.toString() || '');

          if (config?.includeHighlights && match.indices && match.value) {
            const value = String(match.value);
            const textHighlights = this.generateHighlights(
              value,
              match.indices,
              40
            );
            highlights.push({
              field: match.key || '',
              text: textHighlights.text,
              start: textHighlights.start,
              end: textHighlights.end,
            });
          }
        }
      }

      return {
        item: result.item,
        matchedFields,
        highlights,
        score: result.score ? 1 - result.score : 1,
      };
    });
  }

  /**
   * Generate text highlights from Fuse.js match indices
   */
  private generateHighlights(
    text: string,
    indices: number[][],
    contextChars: number
  ): { text: string; start: number; end: number } {
    if (indices.length === 0) {
      return { text: text.slice(0, contextChars * 2), start: 0, end: 0 };
    }

    const [start, end] = indices[0];
    const highlightStart = Math.max(0, start - contextChars);
    const highlightEnd = Math.min(text.length, end + contextChars);

    return {
      text: text.slice(highlightStart, highlightEnd),
      start: highlightStart,
      end: highlightEnd,
    };
  }

  /**
   * Generate prefix-based suggestions
   */
  private generatePrefixSuggestions(query: string): AutocompleteSuggestion[] {
    const suggestions: AutocompleteSuggestion[] = [];

    // Common prefixes
    const commonPrefixes = [
      'status:', 'label:', 'assignee:', 'priority:', 'created:', 'updated:',
      'is:open', 'is:closed', 'is:high', 'is:medium', 'is:low',
    ];

    for (const prefix of commonPrefixes) {
      if (prefix.startsWith(query.toLowerCase())) {
        suggestions.push({
          text: prefix,
          type: 'suggestion',
          score: 0.7,
        });
      }
    }

    return suggestions;
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(
    query: string,
    indices: string[],
    config?: SearchConfig
  ): string {
    return `${indices.sort().join(',')}:${query}:${JSON.stringify(config)}`;
  }

  /**
   * Get entity type from index ID
   */
  private getEntityType(indexId: string): 'task' | 'project' | 'member' | 'agent' {
    if (indexId.includes('task')) return 'task';
    if (indexId.includes('project')) return 'project';
    if (indexId.includes('member')) return 'member';
    if (indexId.includes('agent')) return 'agent';
    return 'task'; // Default
  }
}

// ============================================================================
// Global search manager instance
// ============================================================================

let globalSearchManager: AdvancedSearchManager<Record<string, unknown>> | null = null;

/**
 * Get or create the global search manager instance
 */
export function getGlobalSearchManager<T extends Record<string, unknown>>(
  recreate = false
): AdvancedSearchManager<T> {
  if (!globalSearchManager || recreate) {
    globalSearchManager = new AdvancedSearchManager<T>();
  }
  return globalSearchManager as AdvancedSearchManager<T>;
}

/**
 * Reset the global search manager instance
 */
export function resetGlobalSearchManager(): void {
  if (globalSearchManager) {
    globalSearchManager.clearCaches();
    globalSearchManager.clearHistory();
  }
  globalSearchManager = null;
}

// ============================================================================
// Utility functions
// ============================================================================

/**
 * Highlight search terms in text using Fuse.js indices
 */
export function highlightSearchTerm(
  text: string,
  indices: number[][],
  highlightClass = 'bg-yellow-200 dark:bg-yellow-700 px-0.5 rounded'
): string {
  if (indices.length === 0) {
    return text;
  }

  let result = '';
  let lastIndex = 0;

  // Sort indices by start position
  const sortedIndices = [...indices].sort((a, b) => a[0] - b[0]);

  for (const [start, end] of sortedIndices) {
    // Add text before highlight
    result += text.slice(lastIndex, start);

    // Add highlighted text
    result += `<mark class="${highlightClass}">${text.slice(start, end + 1)}</mark>`;

    lastIndex = end + 1;
  }

  // Add remaining text
  result += text.slice(lastIndex);

  return result;
}

/**
 * Parse search query with special operators
 */
export function parseSearchQuery(query: string): {
  text: string;
  filters: Map<string, string>;
} {
  const filters = new Map<string, string>();
  let text = query;

  // Extract filters like "status:open", "label:bug"
  const filterRegex = /(\w+):(\S+)/g;
  let match;

  while ((match = filterRegex.exec(query)) !== null) {
    const [fullMatch, key, value] = match;
    filters.set(key, value);
    text = text.replace(fullMatch, '').trim();
  }

  return { text, filters };
}

/**
 * Build search query from text and filters
 */
export function buildSearchQuery(
  text: string,
  filters: Record<string, string>
): string {
  const filterParts = Object.entries(filters)
    .map(([key, value]) => `${key}:${value}`)
    .join(' ');

  return [text, filterParts].filter(Boolean).join(' ').trim();
}
