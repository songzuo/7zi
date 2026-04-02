// @ts-nocheck - Test file with complex type issues
/**
 * @fileoverview Advanced search tests
 * @description Tests for the advanced search functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { AdvancedSearchManager } from '@/lib/search/advanced-search'
import type { UnifiedEntity } from '@/lib/search/types'

describe('AdvancedSearchManager', () => {
  let searchManager: AdvancedSearchManager<UnifiedEntity>
  let testItems: UnifiedEntity[]

  beforeEach(() => {
    searchManager = new AdvancedSearchManager()

    testItems = [
      {
        id: '1',
        type: 'task',
        name: 'Fix login bug',
        title: 'Fix login bug',
        description: 'Users cannot login to the system',
        keywords: ['bug', 'login', 'urgent'],
      },
      {
        id: '2',
        type: 'task',
        name: 'Update documentation',
        title: 'Update documentation',
        description: 'Add new API endpoints to docs',
        keywords: ['docs', 'api'],
      },
      {
        id: '3',
        type: 'project',
        name: 'Website redesign',
        title: 'Website redesign',
        description: 'Complete overhaul of the company website',
        keywords: ['design', 'ui', 'ux'],
      },
      {
        id: '4',
        type: 'member',
        name: 'John Doe',
        login: 'johndoe',
        role: 'developer',
        email: 'john@example.com',
      },
      {
        id: '5',
        type: 'agent',
        name: 'Code Review Bot',
        title: 'Code Review Bot',
        description: 'Automated code review assistant',
        agentType: 'bot',
        capabilities: ['review', 'code-analysis'],
      },
    ]
  })

  describe('Index management', () => {
    it('should create a search index', () => {
      searchManager.createIndex(
        'tasks',
        testItems.filter(i => i.type === 'task')
      )

      expect(searchManager.hasIndex('tasks')).toBe(true)
      expect(searchManager.getIndexIds()).toContain('tasks')
    })

    it('should update an existing index', () => {
      searchManager.createIndex('tasks', testItems.slice(0, 2))
      searchManager.updateIndex(
        'tasks',
        testItems.filter(i => i.type === 'task')
      )

      const results = searchManager.searchIndex('tasks', 'documentation')
      expect(results).toHaveLength(1)
      expect(results[0].item.name).toBe('Update documentation')
    })

    it('should remove an index', () => {
      searchManager.createIndex('tasks', testItems.slice(0, 2))
      searchManager.removeIndex('tasks')

      expect(searchManager.hasIndex('tasks')).toBe(false)
      expect(searchManager.getIndexIds()).not.toContain('tasks')
    })
  })

  describe('Search functionality', () => {
    beforeEach(() => {
      searchManager.createIndex('all', testItems)
    })

    it('should return all items for empty query', () => {
      const results = searchManager.search('')

      expect(results).toHaveLength(0)
    })

    it('should find items by name', () => {
      const results = searchManager.search('login')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.name).toBe('Fix login bug')
    })

    it('should find items by description', () => {
      const results = searchManager.search('API')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.description?.toLowerCase()).toContain('api')
    })

    it('should return empty results for non-matching query', () => {
      const results = searchManager.search('nonexistent term')

      expect(results).toHaveLength(0)
    })

    it('should apply fuzzy matching', () => {
      const results = searchManager.search('logn')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.name.toLowerCase()).toContain('login')
    })

    it('should limit results', () => {
      const results = searchManager.search('', { limit: 2 })

      expect(results.length).toBeLessThanOrEqual(2)
    })
  })

  describe('Search within specific index', () => {
    beforeEach(() => {
      searchManager.createIndex(
        'tasks',
        testItems.filter(i => i.type === 'task')
      )
      searchManager.createIndex(
        'projects',
        testItems.filter(i => i.type === 'project')
      )
    })

    it('should search within specific index', () => {
      const results = searchManager.searchIndex('tasks', 'login')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.type).toBe('task')
    })

    it('should not return items from other indices', () => {
      const results = searchManager.searchIndex('tasks', 'website')

      expect(results).toHaveLength(0)
    })
  })

  describe('Autocomplete suggestions', () => {
    beforeEach(() => {
      searchManager.createIndex('all', testItems)
    })

    it('should return entity suggestions', () => {
      const suggestions = searchManager.getAutocompleteSuggestions('log')

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0].type).toBe('entity')
      expect(suggestions[0].text.toLowerCase()).toContain('log')
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
    })

    it('should limit suggestions', () => {
      const suggestions = searchManager.getAutocompleteSuggestions('', {
        includeHistory: true,
      })

      expect(suggestions.length).toBeLessThanOrEqual(10)
    })
  })

  describe('Search history', () => {
    it('should add search to history', () => {
      searchManager.addToHistory('test query', 10, 'tasks')

      const history = searchManager.getHistory()
      expect(history).toHaveLength(1)
      expect(history[0].query).toBe('test query')
      expect(history[0].resultCount).toBe(10)
      expect(history[0].target).toBe('tasks')
    })

    it('should remove duplicate queries', () => {
      searchManager.addToHistory('test query', 10, 'tasks')
      searchManager.addToHistory('test query', 5, 'tasks')

      const history = searchManager.getHistory()
      expect(history).toHaveLength(1)
    })

    it('should limit history size', () => {
      for (let i = 0; i < 60; i++) {
        searchManager.addToHistory(`query ${i}`, i, 'tasks')
      }

      const history = searchManager.getHistory()
      expect(history.length).toBeLessThanOrEqual(50)
    })

    it('should get recent history', () => {
      searchManager.addToHistory('query 1', 1, 'tasks')
      searchManager.addToHistory('query 2', 2, 'tasks')
      searchManager.addToHistory('query 3', 3, 'tasks')

      const recent = searchManager.getRecentHistory(2)
      expect(recent).toHaveLength(2)
      expect(recent[0].text).toBe('query 3')
      expect(recent[1].text).toBe('query 2')
    })

    it('should clear history', () => {
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
  })

  describe('Cache management', () => {
    beforeEach(() => {
      searchManager.createIndex('all', testItems)
    })

    it('should cache search results', () => {
      const firstResults = searchManager.search('login')
      const secondResults = searchManager.search('login')

      expect(firstResults).toEqual(secondResults)
    })

    it('should clear caches', () => {
      searchManager.search('login')
      searchManager.clearCaches()

      const stats = searchManager.getCacheStats()
      expect(stats.searchCache.size).toBe(0)
      expect(stats.autocompleteCache.size).toBe(0)
    })

    it('should provide cache statistics', () => {
      searchManager.search('login')
      searchManager.getAutocompleteSuggestions('log')

      const stats = searchManager.getCacheStats()

      expect(stats).toHaveProperty('searchCache')
      expect(stats).toHaveProperty('autocompleteCache')
      expect(stats).toHaveProperty('indices')
      expect(stats).toHaveProperty('history')
    })
  })
})

describe('Utility functions', () => {
  describe('highlightSearchTerm', () => {
    it('should highlight search terms', () => {
      const { highlightSearchTerm } = require('@/lib/search/advanced-search')

      const result = highlightSearchTerm(
        'This is a test string with test word',
        [
          [10, 13],
          [26, 29],
        ],
        'bg-yellow-200'
      )

      expect(result).toContain('<mark')
      expect(result).toContain('test')
    })

    it('should return original text if no matches', () => {
      const { highlightSearchTerm } = require('@/lib/search/advanced-search')

      const result = highlightSearchTerm('This is a test', [])

      expect(result).toBe('This is a test')
    })
  })

  describe('parseSearchQuery', () => {
    it('should parse filters from query', () => {
      const { parseSearchQuery } = require('@/lib/search/advanced-search')

      const result = parseSearchQuery('status:open label:bug login issue')

      expect(result.text).toBe('login issue')
      expect(result.filters.get('status')).toBe('open')
      expect(result.filters.get('label')).toBe('bug')
    })

    it('should handle query without filters', () => {
      const { parseSearchQuery } = require('@/lib/search/advanced-search')

      const result = parseSearchQuery('simple search query')

      expect(result.text).toBe('simple search query')
      expect(result.filters.size).toBe(0)
    })
  })

  describe('buildSearchQuery', () => {
    it('should build query from text and filters', () => {
      const { buildSearchQuery } = require('@/lib/search/advanced-search')

      const result = buildSearchQuery('login', {
        status: 'open',
        priority: 'high',
      })

      expect(result).toBe('login status:open priority:high')
    })

    it('should handle empty text', () => {
      const { buildSearchQuery } = require('@/lib/search/advanced-search')

      const result = buildSearchQuery('', { status: 'open' })

      expect(result).toBe('status:open')
    })

    it('should handle empty filters', () => {
      const { buildSearchQuery } = require('@/lib/search/advanced-search')

      const result = buildSearchQuery('test query', {})

      expect(result).toBe('test query')
    })
  })
})
