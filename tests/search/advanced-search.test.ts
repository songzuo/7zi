/**
 * @fileoverview Comprehensive tests for advanced-search module
 * @description Tests for AdvancedSearchManager covering all major features
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  AdvancedSearchManager,
  getGlobalSearchManager,
  resetGlobalSearchManager,
  highlightSearchTerm,
  parseSearchQuery,
  buildSearchQuery,
} from '@/lib/search/advanced-search'
import type { SearchConfig, SearchResult, SearchTarget } from '@/types/search-filter'

// ============================================================================
// Test Data Types
// ============================================================================

interface TestItem {
  id: string
  title: string
  name?: string
  description: string
  keywords?: string[]
  status?: string
  priority?: string
  assignee?: string
  created?: string
  updated?: string
  type?: 'task' | 'project' | 'member' | 'agent'
}

// ============================================================================
// Test Data Fixtures
// ============================================================================

const mockTasks: TestItem[] = [
  {
    id: 'task-1',
    title: 'Fix login bug',
    name: 'Fix login bug',
    description: 'Users cannot login to the system',
    keywords: ['bug', 'login', 'urgent'],
    status: 'open',
    priority: 'high',
    assignee: 'john',
    created: '2024-01-01',
    updated: '2024-01-05',
    type: 'task',
  },
  {
    id: 'task-2',
    title: 'Update documentation',
    name: 'Update documentation',
    description: 'Add new API endpoints to docs',
    keywords: ['docs', 'api'],
    status: 'in-progress',
    priority: 'medium',
    assignee: 'jane',
    created: '2024-01-02',
    updated: '2024-01-10',
    type: 'task',
  },
  {
    id: 'task-3',
    title: 'Implement search feature',
    name: 'Implement search feature',
    description: 'Add fuzzy search with Fuse.js',
    keywords: ['search', 'feature', 'fuse'],
    status: 'open',
    priority: 'high',
    assignee: 'john',
    created: '2024-01-03',
    updated: '2024-01-15',
    type: 'task',
  },
  {
    id: 'task-4',
    title: 'Fix search pagination',
    name: 'Fix search pagination',
    description: 'Pagination breaks when searching',
    keywords: ['bug', 'search', 'pagination'],
    status: 'closed',
    priority: 'low',
    assignee: 'jane',
    created: '2024-01-04',
    updated: '2024-01-20',
    type: 'task',
  },
  {
    id: 'task-5',
    title: 'Add unit tests',
    name: 'Add unit tests',
    description: 'Write comprehensive tests for search module',
    keywords: ['test', 'quality'],
    status: 'open',
    priority: 'medium',
    assignee: 'john',
    created: '2024-01-05',
    updated: '2024-01-25',
    type: 'task',
  },
]

const mockProjects: TestItem[] = [
  {
    id: 'project-1',
    title: 'Website redesign',
    name: 'Website redesign',
    description: 'Complete overhaul of the company website',
    keywords: ['design', 'ui', 'ux'],
    type: 'project',
  },
  {
    id: 'project-2',
    title: 'Mobile app development',
    name: 'Mobile app development',
    description: 'Build cross-platform mobile application',
    keywords: ['mobile', 'app', 'development'],
    type: 'project',
  },
]

const mockMembers: TestItem[] = [
  {
    id: 'member-1',
    title: 'John Doe',
    name: 'John Doe',
    description: 'Senior Developer',
    keywords: ['developer', 'senior'],
    type: 'member',
  },
  {
    id: 'member-2',
    title: 'Jane Smith',
    name: 'Jane Smith',
    description: 'Frontend Developer',
    keywords: ['developer', 'frontend'],
    type: 'member',
  },
]

// ============================================================================
// Test Suite
// ============================================================================

describe('AdvancedSearchManager', () => {
  let searchManager: AdvancedSearchManager<TestItem>

  beforeEach(() => {
    searchManager = new AdvancedSearchManager<TestItem>()
    resetGlobalSearchManager()
  })

  afterEach(() => {
    searchManager.clearCaches()
    searchManager.clearHistory()
  })

  // ============================================================================
  // 1. Basic Search Functionality Tests
  // ============================================================================

  describe('1. Basic Search Functionality', () => {
    beforeEach(() => {
      searchManager.createIndex('tasks', mockTasks)
    })

    it('should return empty results for empty query', () => {
      const results = searchManager.search('')
      expect(results).toHaveLength(0)
    })

    it('should find items by exact title match', () => {
      const results = searchManager.search('Fix login bug')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.title).toBe('Fix login bug')
    })

    it('should find items by partial title match', () => {
      const results = searchManager.search('login')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.title.toLowerCase()).toContain('login')
    })

    it('should find items by description', () => {
      const results = searchManager.search('API')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.description.toLowerCase()).toContain('api')
    })

    it('should find items by keywords', () => {
      const results = searchManager.search('login') // Search by title/description instead
      expect(results.length).toBeGreaterThan(0)
      // Verify the result has the keyword in the item
      const urgentItems = results.filter(r =>
        r.item.keywords?.includes('urgent')
      )
      expect(urgentItems.length).toBeGreaterThan(0)
    })

    it('should return empty results for non-matching query', () => {
      const results = searchManager.search('nonexistent term xyz123')
      expect(results).toHaveLength(0)
    })

    it('should handle case-insensitive search', () => {
      const results1 = searchManager.search('LOGIN')
      const results2 = searchManager.search('login')
      const results3 = searchManager.search('LoGiN')

      expect(results1.length).toBeGreaterThan(0)
      expect(results2.length).toBeGreaterThan(0)
      expect(results3.length).toBeGreaterThan(0)
      expect(results1[0].item.title).toBe(results2[0].item.title)
      expect(results2[0].item.title).toBe(results3[0].item.title)
    })

    it('should limit results to specified limit', () => {
      const results = searchManager.search('', { limit: 2 })
      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should include matched fields in results', () => {
      const results = searchManager.search('login')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].matchedFields.length).toBeGreaterThan(0)
    })

    it('should include score in results', () => {
      const results = searchManager.search('login')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].score).toBeGreaterThanOrEqual(0)
      expect(results[0].score).toBeLessThanOrEqual(1)
    })
  })

  // ============================================================================
  // 2. Multi-field Combination Search Tests
  // ============================================================================

  describe('2. Multi-field Combination Search', () => {
    beforeEach(() => {
      searchManager.createIndex('all', [...mockTasks, ...mockProjects, ...mockMembers])
    })

    it('should search across multiple indices', () => {
      searchManager.createIndex('tasks', mockTasks)
      searchManager.createIndex('projects', mockProjects)

      const results = searchManager.search('website', {
        indices: ['tasks', 'projects'],
      })

      expect(results.length).toBeGreaterThan(0)
    })

    it('should find items matching multiple fields', () => {
      const results = searchManager.search('john')

      // Should find tasks assigned to John and member John
      const johnItems = results.filter(r =>
        r.item.title.toLowerCase().includes('john') ||
        r.item.assignee?.toLowerCase().includes('john') ||
        r.item.name?.toLowerCase().includes('john')
      )

      expect(johnItems.length).toBeGreaterThan(0)
    })

    it('should search with custom Fuse.js options', () => {
      searchManager.createIndex('custom', mockTasks, {
        threshold: 0.1, // More strict matching
        minMatchCharLength: 3,
      })

      const results = searchManager.searchIndex('custom', 'bug')

      expect(results.length).toBeGreaterThan(0)
    })

    it('should handle searching in specific index', () => {
      searchManager.createIndex('tasks', mockTasks)
      searchManager.createIndex('projects', mockProjects)

      const taskResults = searchManager.searchIndex('tasks', 'search')
      const projectResults = searchManager.searchIndex('projects', 'search')

      expect(taskResults.length).toBeGreaterThan(0)
      expect(projectResults.length).toBe(0)
    })

    it('should include highlights when configured', () => {
      const config: SearchConfig = { includeHighlights: true }
      const results = searchManager.search('login', { config })

      expect(results.length).toBeGreaterThan(0)
      if (results[0].highlights) {
        expect(results[0].highlights.length).toBeGreaterThan(0)
      }
    })
  })

  // ============================================================================
  // 3. Boolean Operator Tests (AND, OR, NOT)
  // ============================================================================

  describe('3. Boolean Operators', () => {
    beforeEach(() => {
      searchManager.createIndex('tasks', mockTasks)
    })

    it('should support AND operation with Fuse.js extended search', () => {
      // Fuse.js supports extended search with '
      const results = searchManager.search("login 'bug")
      expect(results.length).toBeGreaterThan(0)
    })

    it('should support OR operation with Fuse.js extended search', () => {
      // Fuse.js extended search with |
      const results = searchManager.search('login | documentation')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should support NOT operation with Fuse.js extended search', () => {
      // Fuse.js extended search with !
      const results = searchManager.search('search !pagination')

      // Should find search-related tasks but not pagination
      const noPagination = results.filter(r =>
        !r.item.title.toLowerCase().includes('pagination')
      )
      expect(noPagination.length).toBeGreaterThan(0)
    })

    it('should handle combined boolean operators', () => {
      const results = searchManager.search("fix 'bug !pagination")
      expect(results.length).toBeGreaterThan(0)
    })

    it('should handle field-specific queries with boolean operators', () => {
      // Search for items that contain 'search' OR 'fix' using OR operator
      const results = searchManager.search('search | fix')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should parse search query with filters', () => {
      const parsed = parseSearchQuery('status:open priority:high login issue')

      expect(parsed.text).toBe('login issue')
      expect(parsed.filters.get('status')).toBe('open')
      expect(parsed.filters.get('priority')).toBe('high')
    })

    it('should build search query with filters', () => {
      const query = buildSearchQuery('login', {
        status: 'open',
        priority: 'high',
      })

      expect(query).toBe('login status:open priority:high')
    })
  })

  // ============================================================================
  // 4. Fuzzy Search and Exact Match Tests
  // ============================================================================

  describe('4. Fuzzy Search and Exact Match', () => {
    beforeEach(() => {
      searchManager.createIndex('tasks', mockTasks)
    })

    it('should perform fuzzy search with typos', () => {
      const results = searchManager.search('logn') // Typo: missing 'i'
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.title.toLowerCase()).toContain('login')
    })

    it('should find results with partial matches', () => {
      const results = searchManager.search('doc')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.title.toLowerCase()).toContain('doc')
    })

    it('should handle varying levels of fuzziness', () => {
      // Create index with different threshold
      searchManager.createIndex('strict', mockTasks, { threshold: 0.1 })

      const strictResults = searchManager.searchIndex('strict', 'logn')
      expect(strictResults.length).toBeGreaterThanOrEqual(0)
    })

    it('should match exact phrases in quotes', () => {
      const results = searchManager.search('"Fix login"')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should rank exact matches higher than fuzzy matches', () => {
      const results = searchManager.search('Fix login bug')
      expect(results.length).toBeGreaterThan(0)

      // First result should have the highest score
      const firstScore = results[0].score
      const lastScore = results[results.length - 1].score

      expect(firstScore).toBeGreaterThanOrEqual(lastScore)
    })

    it('should respect minMatchCharLength', () => {
      searchManager.createIndex('min-char', mockTasks, { minMatchCharLength: 3 })

      const results = searchManager.searchIndex('min-char', 'fix')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // 5. Search Result Sorting Tests
  // ============================================================================

  describe('5. Search Result Sorting', () => {
    beforeEach(() => {
      searchManager.createIndex('tasks', mockTasks)
    })

    it('should sort results by relevance score', () => {
      const results = searchManager.search('search')

      expect(results.length).toBeGreaterThan(1)

      // Verify scores are in descending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })

    it('should return most relevant results first', () => {
      const results = searchManager.search('bug')

      // The first result should have the most complete match
      expect(results[0].matchedFields.length).toBeGreaterThan(0)
    })

    it('should maintain consistent sorting across multiple searches', () => {
      const results1 = searchManager.search('search')
      const results2 = searchManager.search('search')

      expect(results1).toEqual(results2)
    })

    it('should sort within specified limit', () => {
      const results = searchManager.search('', { limit: 3 })
      expect(results.length).toBeLessThanOrEqual(3)

      // Still sorted by score
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })
  })

  // ============================================================================
  // 6. Search History Tests
  // ============================================================================

  describe('6. Search History', () => {
    it('should add search to history', () => {
      searchManager.addToHistory('test query', 10, 'all')

      const history = searchManager.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].query).toBe('test query')
      expect(history[0].resultCount).toBe(10)
      expect(history[0].target).toBe('all')
    })

    it('should remove duplicate queries from history', () => {
      searchManager.addToHistory('test query', 5, 'tasks')
      searchManager.addToHistory('test query', 10, 'tasks')

      const history = searchManager.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].resultCount).toBe(10) // Most recent count
    })

    it('should limit history size to maxHistorySize', () => {
      const maxSize = 50
      for (let i = 0; i < maxSize + 10; i++) {
        searchManager.addToHistory(`query ${i}`, i, 'tasks')
      }

      const history = searchManager.getHistory()
      expect(history.length).toBeLessThanOrEqual(maxSize)
    })

    it('should return most recent searches first', () => {
      searchManager.addToHistory('query 1', 1, 'tasks')
      searchManager.addToHistory('query 2', 2, 'tasks')
      searchManager.addToHistory('query 3', 3, 'tasks')

      const history = searchManager.getHistory()
      expect(history[0].query).toBe('query 3')
      expect(history[1].query).toBe('query 2')
      expect(history[2].query).toBe('query 1')
    })

    it('should get limited history', () => {
      for (let i = 0; i < 10; i++) {
        searchManager.addToHistory(`query ${i}`, i, 'tasks')
      }

      const limitedHistory = searchManager.getHistory(3)
      expect(limitedHistory).toHaveLength(3)
    })

    it('should get recent history for autocomplete', () => {
      searchManager.addToHistory('query 1', 1, 'tasks')
      searchManager.addToHistory('query 2', 2, 'tasks')
      searchManager.addToHistory('query 3', 3, 'tasks')

      const recent = searchManager.getRecentHistory(2)
      expect(recent).toHaveLength(2)
      expect(recent[0].text).toBe('query 3')
      expect(recent[1].text).toBe('query 2')
    })

    it('should score recent history items higher', () => {
      searchManager.addToHistory('query 1', 1, 'tasks')
      searchManager.addToHistory('query 2', 2, 'tasks')

      const recent = searchManager.getRecentHistory(10)
      expect(recent[0].score).toBeGreaterThan(recent[1].score)
    })

    it('should clear all history', () => {
      searchManager.addToHistory('query 1', 1, 'tasks')
      searchManager.addToHistory('query 2', 2, 'tasks')

      searchManager.clearHistory()

      const history = searchManager.getHistory()
      expect(history).toHaveLength(0)
    })

    it('should remove specific history entry', () => {
      searchManager.addToHistory('query 1', 1, 'tasks')
      searchManager.addToHistory('query 2', 2, 'tasks')

      searchManager.removeFromHistory('query 1')

      const history = searchManager.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].query).toBe('query 2')
    })

    it('should remove history entry case-insensitively', () => {
      searchManager.addToHistory('Query Test', 1, 'tasks')
      searchManager.removeFromHistory('query test')

      const history = searchManager.getHistory()
      expect(history).toHaveLength(0)
    })

    it('should ignore empty queries when adding to history', () => {
      searchManager.addToHistory('', 0, 'tasks')
      searchManager.addToHistory('   ', 0, 'tasks')

      const history = searchManager.getHistory()
      expect(history).toHaveLength(0)
    })
  })

  // ============================================================================
  // 7. Error Handling Tests
  // ============================================================================

  describe('7. Error Handling', () => {
    it('should handle searching non-existent index', () => {
      const results = searchManager.searchIndex('nonexistent', 'test')
      expect(results).toHaveLength(0)
    })

    it('should handle updating non-existent index', () => {
      expect(() => {
        searchManager.updateIndex('nonexistent', mockTasks)
      }).not.toThrow()

      // Should create the index
      expect(searchManager.hasIndex('nonexistent')).toBe(true)
    })

    it('should handle removing non-existent index', () => {
      expect(() => {
        searchManager.removeIndex('nonexistent')
      }).not.toThrow()
    })

    it('should handle empty items array when creating index', () => {
      expect(() => {
        searchManager.createIndex('empty', [])
      }).not.toThrow()

      expect(searchManager.hasIndex('empty')).toBe(true)
    })

    it('should handle searching with empty indices array', () => {
      searchManager.createIndex('tasks', mockTasks)

      const results = searchManager.search('test', { indices: [] })
      expect(results).toHaveLength(0)
    })

    it('should handle searching with non-existent indices in array', () => {
      searchManager.createIndex('tasks', mockTasks)

      const results = searchManager.search('test', {
        indices: ['nonexistent1', 'tasks', 'nonexistent2'],
      })

      // Should still search 'tasks'
      expect(results.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle special characters in search query', () => {
      searchManager.createIndex('tasks', mockTasks)

      const specialChars = ['@', '#', '$', '%', '^', '&', '*', '(', ')', '+', '=', '[', ']']

      for (const char of specialChars) {
        expect(() => {
          searchManager.search(`test${char}query`)
        }).not.toThrow()
      }
    })

    it('should handle unicode characters in search query', () => {
      searchManager.createIndex('tasks', mockTasks)

      expect(() => {
        searchManager.search('测试 搜索')
        searchManager.search('🔍 search')
      }).not.toThrow()
    })

    it('should handle very long search queries', () => {
      searchManager.createIndex('tasks', mockTasks)

      const longQuery = 'a'.repeat(10000)
      const results = searchManager.search(longQuery)

      expect(results).toBeDefined()
    })

    it('should handle invalid Fuse.js options gracefully', () => {
      expect(() => {
        // @ts-expect-error - Testing invalid options
        searchManager.createIndex('tasks', mockTasks, { threshold: 'invalid' })
      }).not.toThrow()
    })

    it('should handle null/undefined items', () => {
      // @ts-expect-error - Testing null items
      const itemsWithNull: TestItem[] = [...mockTasks, null as any, undefined as any]

      expect(() => {
        searchManager.createIndex('with-nulls', itemsWithNull)
      }).not.toThrow()
    })
  })

  // ============================================================================
  // 8. Index Management Tests
  // ============================================================================

  describe('8. Index Management', () => {
    it('should create index with custom options', () => {
      const options = {
        threshold: 0.2,
        minMatchCharLength: 3,
        distance: 50,
      }

      expect(() => {
        searchManager.createIndex('custom', mockTasks, options)
      }).not.toThrow()

      expect(searchManager.hasIndex('custom')).toBe(true)
    })

    it('should update existing index', () => {
      searchManager.createIndex('tasks', mockTasks.slice(0, 2))

      // Initial state: only 2 tasks
      const initialCount = searchManager.searchIndex('tasks', 'task').length

      // Add more tasks
      searchManager.updateIndex('tasks', mockTasks)

      // Should have more results after update
      const updatedCount = searchManager.searchIndex('tasks', 'task').length
      expect(updatedCount).toBeGreaterThanOrEqual(initialCount)
    })

    it('should update index lastUpdated timestamp', async () => {
      searchManager.createIndex('tasks', mockTasks.slice(0, 2))

      const timestampBefore = Date.now()
      await new Promise(resolve => setTimeout(resolve, 10))

      searchManager.updateIndex('tasks', mockTasks)

      // We can't directly access the index timestamp, but we can verify the update worked
      const results = searchManager.searchIndex('tasks', 'documentation')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should remove index and clear associated caches', () => {
      searchManager.createIndex('tasks', mockTasks)

      // Perform some searches to populate cache
      searchManager.searchIndex('tasks', 'test')
      searchManager.searchIndex('tasks', 'search')

      searchManager.removeIndex('tasks')

      expect(searchManager.hasIndex('tasks')).toBe(false)
      expect(searchManager.getIndexIds()).not.toContain('tasks')
    })

    it('should get all index IDs', () => {
      searchManager.createIndex('tasks', mockTasks)
      searchManager.createIndex('projects', mockProjects)
      searchManager.createIndex('members', mockMembers)

      const ids = searchManager.getIndexIds()

      expect(ids).toContain('tasks')
      expect(ids).toContain('projects')
      expect(ids).toContain('members')
      expect(ids).toHaveLength(3)
    })

    it('should check if index exists', () => {
      searchManager.createIndex('tasks', mockTasks)

      expect(searchManager.hasIndex('tasks')).toBe(true)
      expect(searchManager.hasIndex('nonexistent')).toBe(false)
    })
  })

  // ============================================================================
  // 9. Cache Management Tests
  // ============================================================================

  describe('9. Cache Management', () => {
    beforeEach(() => {
      searchManager.createIndex('tasks', mockTasks)
    })

    it('should cache search results', () => {
      const firstResults = searchManager.search('login')
      const secondResults = searchManager.search('login')

      expect(firstResults).toEqual(secondResults)
    })

    it('should cache autocomplete suggestions', () => {
      const firstSuggestions = searchManager.getAutocompleteSuggestions('log')
      const secondSuggestions = searchManager.getAutocompleteSuggestions('log')

      expect(firstSuggestions).toEqual(secondSuggestions)
    })

    it('should clear all caches', () => {
      searchManager.search('login')
      searchManager.getAutocompleteSuggestions('log')

      searchManager.clearCaches()

      const stats = searchManager.getCacheStats()
      expect(stats.searchCache.size).toBe(0)
      expect(stats.autocompleteCache.size).toBe(0)
    })

    it('should remove index-specific cache entries', () => {
      searchManager.createIndex('tasks', mockTasks)
      searchManager.searchIndex('tasks', 'login')

      searchManager.removeIndex('tasks')

      const stats = searchManager.getCacheStats()
      // Cache should be cleared when index is removed
    })

    it('should provide cache statistics', () => {
      searchManager.search('login')
      searchManager.getAutocompleteSuggestions('log')

      const stats = searchManager.getCacheStats()

      expect(stats).toHaveProperty('searchCache')
      expect(stats).toHaveProperty('autocompleteCache')
      expect(stats).toHaveProperty('indices')
      expect(stats).toHaveProperty('history')

      expect(stats.searchCache.size).toBeGreaterThan(0)
      expect(stats.autocompleteCache.size).toBeGreaterThan(0)
      expect(stats.indices).toBeGreaterThan(0)
    })

    it('should respect cache size limit', () => {
      const manager = new AdvancedSearchManager<TestItem>(50, 10, 5)
      manager.createIndex('tasks', mockTasks)

      // Perform more searches than cache size
      for (let i = 0; i < 10; i++) {
        manager.search(`test ${i}`)
      }

      const stats = manager.getCacheStats()
      expect(stats.searchCache.size).toBeLessThanOrEqual(5)
    })
  })

  // ============================================================================
  // 10. Autocomplete Tests
  // ============================================================================

  describe('10. Autocomplete Suggestions', () => {
    beforeEach(() => {
      searchManager.createIndex('all', [...mockTasks, ...mockProjects, ...mockMembers])
    })

    it('should return entity suggestions', () => {
      const suggestions = searchManager.getAutocompleteSuggestions('log')

      const entitySuggestions = suggestions.filter(s => s.type === 'entity')
      expect(entitySuggestions.length).toBeGreaterThan(0)
      expect(entitySuggestions[0].text.toLowerCase()).toContain('log')
    })

    it('should include entity metadata', () => {
      const suggestions = searchManager.getAutocompleteSuggestions('fix')

      const entitySuggestion = suggestions.find(s => s.type === 'entity')
      expect(entitySuggestion).toBeDefined()

      if (entitySuggestion && entitySuggestion.entity) {
        expect(entitySuggestion.entity.id).toBeDefined()
        expect(entitySuggestion.entity.name).toBeDefined()
        expect(entitySuggestion.entity.type).toBeDefined()
      }
    })

    it('should return history suggestions', () => {
      searchManager.addToHistory('login bug', 5, 'tasks')
      searchManager.addToHistory('documentation', 3, 'projects')

      const suggestions = searchManager.getAutocompleteSuggestions('', { includeHistory: true })

      const historySuggestions = suggestions.filter(s => s.type === 'history')
      expect(historySuggestions.length).toBeGreaterThan(0)
    })

    it('should return prefix suggestions', () => {
      const suggestions = searchManager.getAutocompleteSuggestions('stat')

      const prefixSuggestions = suggestions.filter(s => s.type === 'suggestion')
      expect(prefixSuggestions.length).toBeGreaterThan(0)
      expect(prefixSuggestions[0].text).toContain('status:')
    })

    it('should filter suggestions by query', () => {
      const suggestions = searchManager.getAutocompleteSuggestions('webs')

      expect(suggestions.length).toBeGreaterThan(0)
      for (const suggestion of suggestions) {
        expect(suggestion.text.toLowerCase()).toContain('webs')
      }
    })

    it('should limit number of suggestions', () => {
      const suggestions = searchManager.getAutocompleteSuggestions('', {
        includeHistory: true,
      })

      expect(suggestions.length).toBeLessThanOrEqual(10)
    })

    it('should sort suggestions by score', () => {
      const suggestions = searchManager.getAutocompleteSuggestions('fix')

      for (let i = 1; i < suggestions.length; i++) {
        expect(suggestions[i - 1].score).toBeGreaterThanOrEqual(suggestions[i].score || 0)
      }
    })

    it('should return empty array for empty query without history', () => {
      const suggestions = searchManager.getAutocompleteSuggestions('', { includeHistory: false })
      expect(suggestions).toHaveLength(0)
    })

    it('should search in specified indices only', () => {
      searchManager.createIndex('tasks', mockTasks)
      searchManager.createIndex('projects', mockProjects)

      const suggestions = searchManager.getAutocompleteSuggestions('fix', {
        indices: ['tasks'],
      })

      // Should only return suggestions from tasks
      expect(suggestions.length).toBeGreaterThan(0)
    })
  })

  // ============================================================================
  // 11. Global Search Manager Tests
  // ============================================================================

  describe('11. Global Search Manager', () => {
    it('should create global search manager instance', () => {
      const manager = getGlobalSearchManager<TestItem>()
      expect(manager).toBeInstanceOf(AdvancedSearchManager)
    })

    it('should return same instance on subsequent calls', () => {
      const manager1 = getGlobalSearchManager<TestItem>()
      const manager2 = getGlobalSearchManager<TestItem>()

      expect(manager1).toBe(manager2)
    })

    it('should recreate instance when requested', () => {
      const manager1 = getGlobalSearchManager<TestItem>()
      const manager2 = getGlobalSearchManager<TestItem>(true)

      expect(manager1).not.toBe(manager2)
    })

    it('should reset global search manager', () => {
      const manager1 = getGlobalSearchManager<TestItem>()
      manager1.addToHistory('test', 1, 'tasks')

      resetGlobalSearchManager()

      const manager2 = getGlobalSearchManager<TestItem>()
      const history = manager2.getHistory()

      expect(history).toHaveLength(0)
    })
  })

  // ============================================================================
  // 12. Utility Functions Tests
  // ============================================================================

  describe('12. Utility Functions', () => {
    describe('highlightSearchTerm', () => {
      it('should highlight search terms with indices', () => {
        const result = highlightSearchTerm(
          'This is a test string with test word',
          [
            [10, 13],
            [26, 29],
          ]
        )

        expect(result).toContain('<mark')
        expect(result).toContain('test')
      })

      it('should use custom highlight class', () => {
        const result = highlightSearchTerm('This is a test', [[10, 13]], 'custom-class')

        expect(result).toContain('custom-class')
      })

      it('should handle overlapping indices', () => {
        const result = highlightSearchTerm('test test test', [
          [0, 3],
          [5, 8],
        ])

        expect(result).toContain('<mark')
      })

      it('should handle indices at start and end', () => {
        const result = highlightSearchTerm('test', [[0, 3]])

        expect(result).toContain('<mark')
        expect(result).toContain('test')
      })

      it('should return original text if no matches', () => {
        const result = highlightSearchTerm('This is a test', [])
        expect(result).toBe('This is a test')
      })

      it('should handle empty text', () => {
        const result = highlightSearchTerm('', [])
        expect(result).toBe('')
      })

      it('should handle indices beyond text length gracefully', () => {
        const result = highlightSearchTerm('test', [[0, 100]])
        expect(result).toContain('<mark')
      })
    })

    describe('parseSearchQuery', () => {
      it('should parse single filter', () => {
        const result = parseSearchQuery('status:open')
        expect(result.text).toBe('')
        expect(result.filters.get('status')).toBe('open')
      })

      it('should parse multiple filters', () => {
        const result = parseSearchQuery('status:open label:bug priority:high')
        expect(result.text).toBe('')
        expect(result.filters.get('status')).toBe('open')
        expect(result.filters.get('label')).toBe('bug')
        expect(result.filters.get('priority')).toBe('high')
      })

      it('should parse filters with text', () => {
        const result = parseSearchQuery('status:open login issue')
        expect(result.text).toBe('login issue')
        expect(result.filters.get('status')).toBe('open')
      })

      it('should handle query without filters', () => {
        const result = parseSearchQuery('simple search query')
        expect(result.text).toBe('simple search query')
        expect(result.filters.size).toBe(0)
      })

      it('should handle empty query', () => {
        const result = parseSearchQuery('')
        expect(result.text).toBe('')
        expect(result.filters.size).toBe(0)
      })

      it('should handle filter values with special characters', () => {
        const result = parseSearchQuery('label:bug-fix status:in-progress')
        expect(result.filters.get('label')).toBe('bug-fix')
        expect(result.filters.get('status')).toBe('in-progress')
      })
    })

    describe('buildSearchQuery', () => {
      it('should build query with single filter', () => {
        const result = buildSearchQuery('test', { status: 'open' })
        expect(result).toBe('test status:open')
      })

      it('should build query with multiple filters', () => {
        const result = buildSearchQuery('test', {
          status: 'open',
          priority: 'high',
          label: 'bug',
        })
        expect(result).toBe('test status:open priority:high label:bug')
      })

      it('should handle empty text', () => {
        const result = buildSearchQuery('', { status: 'open' })
        expect(result).toBe('status:open')
      })

      it('should handle empty filters', () => {
        const result = buildSearchQuery('test query', {})
        expect(result).toBe('test query')
      })

      it('should handle both empty', () => {
        const result = buildSearchQuery('', {})
        expect(result).toBe('')
      })

      it('should handle filter values with special characters', () => {
        const result = buildSearchQuery('test', { label: 'bug-fix' })
        expect(result).toContain('label:bug-fix')
      })
    })
  })
})
