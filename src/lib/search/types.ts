/**
 * @fileoverview Advanced search types
 * @description Type definitions for the advanced search system
 */

import type { SearchConfig, SearchResult } from '@/types/search-filter';

// ============================================================================
// Search History Types
// ============================================================================

/**
 * Search history entry
 */
export interface SearchHistoryEntry {
  /** The search query */
  query: string;
  /** Timestamp when the search was performed */
  timestamp: number;
  /** Number of results returned */
  resultCount: number;
  /** Search target type */
  target: 'all' | 'tasks' | 'projects' | 'members' | 'agents';
}

/**
 * Search history storage
 */
export interface SearchHistoryStorage {
  entries: SearchHistoryEntry[];
  maxSize: number;
}

// ============================================================================
// Autocomplete Types
// ============================================================================

/**
 * Autocomplete suggestion type
 */
export type AutocompleteSuggestionType = 'history' | 'suggestion' | 'entity';

/**
 * Autocomplete suggestion
 */
export interface AutocompleteSuggestion {
  /** Suggestion text */
  text: string;
  /** Suggestion type */
  type: AutocompleteSuggestionType;
  /** Relevance score (0-1) */
  score?: number;
  /** Entity information (if type is 'entity') */
  entity?: {
    id: string;
    type: 'task' | 'project' | 'member' | 'agent';
    name: string;
    avatar?: string;
  };
}

/**
 * Autocomplete result
 */
export interface AutocompleteResult {
  suggestions: AutocompleteSuggestion[];
  query: string;
  hasMore: boolean;
}

// ============================================================================
// Search Index Types
// ============================================================================

/**
 * Search index metadata
 */
export interface SearchIndexMetadata {
  id: string;
  name: string;
  itemCount: number;
  lastUpdated: number;
  fields: string[];
  enabled: boolean;
}

/**
 * Search index configuration
 */
export interface SearchIndexConfig {
  /** Index identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Fields to index */
  fields: string[];
  /** Fuse.js options */
  fuseOptions?: {
    threshold?: number;
    distance?: number;
    minMatchCharLength?: number;
    useExtendedSearch?: boolean;
  };
  /** Whether this index is enabled */
  enabled?: boolean;
}

// ============================================================================
// Search Query Types
// ============================================================================

/**
 * Search query with filters
 */
export interface AdvancedSearchQuery {
  /** Main search text */
  text: string;
  /** Key-value filters (e.g., status:open) */
  filters: SearchFilters;
  /** Search configuration */
  config?: SearchConfig;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Search filters
 */
export interface SearchFilters {
  status?: string[];
  priority?: string[];
  labels?: string[];
  assignees?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  custom?: Record<string, string[]>;
}

/**
 * Search result with pagination
 */
export interface PaginatedSearchResult<T> {
  /** Search results */
  results: SearchResult<T>[];
  /** Total number of results (before pagination) */
  total: number;
  /** Current page */
  page: number;
  /** Page size */
  pageSize: number;
  /** Whether there are more results */
  hasMore: boolean;
}

// ============================================================================
// Search Statistics Types
// ============================================================================

/**
 * Search statistics
 */
export interface SearchStatistics {
  /** Total number of searches performed */
  totalSearches: number;
  /** Average result count */
  averageResultCount: number;
  /** Most common queries */
  topQueries: Array<{ query: string; count: number }>;
  /** Searches by target type */
  searchesByTarget: Record<string, number>;
  /** Cache hit rate */
  cacheHitRate: number;
  /** Average search time (ms) */
  averageSearchTime: number;
}

// ============================================================================
// Search Cache Types
// ============================================================================

/**
 * Search cache entry
 */
export interface SearchCacheEntry<T> {
  /** Cached search results */
  results: SearchResult<T>[];
  /** Timestamp when cached */
  timestamp: number;
  /** Query string */
  query: string;
  /** Result count */
  resultCount: number;
}

/**
 * Cache statistics
 */
export interface CacheStatistics {
  /** Current cache size */
  size: number;
  /** Maximum cache size */
  maxSize: number;
  /** Number of cache hits */
  hits: number;
  /** Number of cache misses */
  misses: number;
  /** Cache hit rate */
  hitRate: number;
}

// ============================================================================
// Entity Types for Cross-Entity Search
// ============================================================================

/**
 * Searchable entity base interface
 */
export interface SearchableEntity {
  /** Unique identifier */
  id: string;
  /** Entity type */
  type: 'task' | 'project' | 'member' | 'agent';
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Search keywords/tags */
  keywords?: string[];
}

/**
 * Task entity
 */
export interface TaskEntity extends SearchableEntity {
  type: 'task';
  /** Task title */
  title: string;
  /** Task status */
  status: 'open' | 'closed' | 'in_progress';
  /** Task priority */
  priority: 'high' | 'medium' | 'low';
  /** Assignee */
  assignee?: string;
  /** Labels */
  labels?: Array<{ name: string; color: string }>;
  /** Created date */
  createdAt: string;
  /** Updated date */
  updatedAt: string;
}

/**
 * Project entity
 */
export interface ProjectEntity extends SearchableEntity {
  type: 'project';
  /** Project name */
  title: string;
  /** Project status */
  status: 'active' | 'archived' | 'completed';
  /** Owner */
  owner: string;
  /** Members */
  members: string[];
  /** Created date */
  createdAt: string;
  /** Updated date */
  updatedAt: string;
}

/**
 * Member entity
 */
export interface MemberEntity extends SearchableEntity {
  type: 'member';
  /** Username */
  login: string;
  /** Display name */
  displayName?: string;
  /** Avatar URL */
  avatarUrl?: string;
  /** Role */
  role: string;
  /** Email */
  email?: string;
}

/**
 * Agent entity
 */
export interface AgentEntity extends SearchableEntity {
  type: 'agent';
  /** Agent name */
  title: string;
  /** Agent status */
  status: 'active' | 'inactive' | 'maintenance';
  /** Agent type */
  agentType: string;
  /** Capabilities */
  capabilities: string[];
  /** Last active */
  lastActive?: string;
}

/**
 * Unified searchable entity
 */
export type UnifiedEntity =
  | TaskEntity
  | ProjectEntity
  | MemberEntity
  | AgentEntity;

// ============================================================================
// Search Settings Types
// ============================================================================

/**
 * Search user preferences
 */
export interface SearchPreferences {
  /** Default search target */
  defaultTarget: 'all' | 'tasks' | 'projects' | 'members' | 'agents';
  /** Enable fuzzy search */
  enableFuzzySearch: boolean;
  /** Fuzzy search threshold (0-1) */
  fuzzyThreshold: number;
  /** Enable search history */
  enableHistory: boolean;
  /** Maximum history size */
  maxHistorySize: number;
  /** Enable autocomplete */
  enableAutocomplete: boolean;
  /** Default result limit */
  defaultResultLimit: number;
  /** Enable result highlighting */
  enableHighlighting: boolean;
  /** Case sensitive search */
  caseSensitive: boolean;
}

/**
 * Default search preferences
 */
export const DEFAULT_SEARCH_PREFERENCES: SearchPreferences = {
  defaultTarget: 'all',
  enableFuzzySearch: true,
  fuzzyThreshold: 0.3,
  enableHistory: true,
  maxHistorySize: 50,
  enableAutocomplete: true,
  defaultResultLimit: 50,
  enableHighlighting: true,
  caseSensitive: false,
};

// ============================================================================
// Search Event Types
// ============================================================================

/**
 * Search event types
 */
export type SearchEventType =
  | 'search'
  | 'filter-change'
  | 'history-add'
  | 'history-clear'
  | 'cache-clear'
  | 'index-update';

/**
 * Search event
 */
export interface SearchEvent {
  type: SearchEventType;
  timestamp: number;
  data: unknown;
}

/**
 * Search event listener
 */
export type SearchEventListener = (event: SearchEvent) => void;

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Search result group by entity type
 */
export type SearchResultsByType<T> = {
  [K in UnifiedEntity['type']]?: SearchResult<T>[];
};

/**
 * Search index options
 */
export interface SearchIndexOptions<T> {
  /** Index identifier */
  id: string;
  /** Items to index */
  items: T[];
  /** Fields to search */
  fields: string[];
  /** Fuse.js configuration */
  fuseOptions?: Partial<Fuse.IFuseOptions<T>>;
}
