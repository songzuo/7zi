// @ts-nocheck - Test file with complex type issues
/**
 * @fileoverview Search filter enhancement tests
 * @description Tests for enhanced search, filter, and highlight functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  searchItems,
  highlightSearchTerm,
  applyFilters,
  applySort,
  hasActiveFilters,
  clearAllFilters,
  clearAllCaches,
  getCacheStats,
} from './search-filter'
import type { SearchConfig, FilterConfig, ActiveFilters } from '@/types/search-filter'

interface TestItem {
  id: number
  title: string
  description: string
  status: string
  priority: string
  tags: string
}

describe('Enhanced search functionality', () => {
  let testItems: TestItem[]

  beforeEach(() => {
    // Clear caches before each test
    clearAllCaches()

    testItems = [
      {
        id: 1,
        title: '修复登录Bug',
        description: '用户无法登录系统的问题',
        status: 'open',
        priority: 'high',
        tags: 'bug critical',
      },
      {
        id: 2,
        title: '用户界面优化',
        description: '改进用户界面的交互体验',
        status: 'in-progress',
        priority: 'medium',
        tags: 'ui ux',
      },
      {
        id: 3,
        title: 'User Dashboard Feature',
        description: 'Create a new user dashboard',
        status: 'open',
        priority: 'low',
        tags: 'feature',
      },
      {
        id: 4,
        title: '性能优化',
        description: '提高搜索功能的性能',
        status: 'closed',
        priority: 'high',
        tags: 'performance',
      },
      {
        id: 5,
        title: '文档更新',
        description: '更新API文档',
        status: 'open',
        priority: 'low',
        tags: 'docs',
      },
    ]
  })

  describe('Basic search', () => {
    it('should return all items for empty query', () => {
      const results = searchItems(testItems, '')

      expect(results.length).toBe(testItems.length)
      expect(results.every(r => r.score === 1)).toBe(true)
    })

    it('should find items by exact match', () => {
      const results = searchItems(testItems, '登录')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.item.title.includes('登录'))).toBe(true)
    })

    it('should search across all fields by default', () => {
      const results = searchItems(testItems, 'open')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.item.status === 'open')).toBe(true)
    })

    it('should search in specified fields only', () => {
      const config: SearchConfig = {
        target: 'all',
        fields: ['title'],
      }

      const results = searchItems(testItems, 'open', config)

      // Should not match status field
      expect(results.every(r => r.matchedFields.includes('title'))).toBe(true)
    })
  })

  describe('Fuzzy matching', () => {
    it('should handle typos with fuzzy matching', () => {
      const config: SearchConfig = {
        target: 'all',
        fuzzyMatch: true,
        fuzzyThreshold: 1,
      }

      const results = searchItems(testItems, '登l录', config)

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.item.title.includes('登录'))).toBe(true)
    })

    it('should respect fuzzy threshold', () => {
      const config: SearchConfig = {
        target: 'all',
        fuzzyMatch: true,
        fuzzyThreshold: 0, // Very strict
      }

      const results = searchItems(testItems, '登l录', config)

      expect(results.length).toBe(0)
    })

    it('should not use fuzzy matching when disabled', () => {
      const config: SearchConfig = {
        target: 'all',
        fuzzyMatch: false,
      }

      const results = searchItems(testItems, '登l录', config)

      expect(results.length).toBe(0)
    })
  })

  describe('Pinyin matching', () => {
    it('should match Chinese text with pinyin', () => {
      const config: SearchConfig = {
        target: 'all',
        pinyinMatch: true,
      }

      const results = searchItems(testItems, 'denglu', config)

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.item.title.includes('登录'))).toBe(true)
    })

    it('should not use pinyin matching when disabled', () => {
      const config: SearchConfig = {
        target: 'all',
        pinyinMatch: false,
      }

      const results = searchItems(testItems, 'denglu', config)

      expect(results.length).toBe(0)
    })
  })

  describe('Field weights', () => {
    it('should apply higher weight to title field', () => {
      const config: SearchConfig = {
        target: 'all',
        fieldWeights: {
          title: 2.0,
          description: 1.0,
        },
      }

      const results = searchItems(testItems, 'open', config)

      // Items with 'open' in title should rank higher
      const titleMatch = results.find(r => r.item.title.includes('open'))
      const statusMatch = results.find(
        r => r.item.status === 'open' && !r.item.title.includes('open')
      )

      expect(titleMatch?.score).toBeGreaterThan(statusMatch?.score || 0)
    })

    it('should score items based on weighted fields', () => {
      const config: SearchConfig = {
        target: 'all',
        fieldWeights: {
          title: 2,
          description: 1,
          status: 0.5,
        },
      }

      const results = searchItems(testItems, 'open', config)

      expect(results.every(r => r.score > 0)).toBe(true)
    })
  })

  describe('Search result highlights', () => {
    it('should include highlights when enabled', () => {
      const config: SearchConfig = {
        target: 'all',
        includeHighlights: true,
      }

      const results = searchItems(testItems, '登录', config)

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].highlights.length).toBeGreaterThan(0)
    })

    it('should include field in highlights', () => {
      const config: SearchConfig = {
        target: 'all',
        includeHighlights: true,
      }

      const results = searchItems(testItems, '登录', config)

      expect(results[0].highlights[0]).toHaveProperty('field')
    })

    it('should include text snippet in highlights', () => {
      const config: SearchConfig = {
        target: 'all',
        includeHighlights: true,
      }

      const results = searchItems(testItems, '登录', config)

      expect(results[0].highlights[0]).toHaveProperty('text')
      expect(results[0].highlights[0].text.toLowerCase()).toContain('登录')
    })

    it('should include start and end positions in highlights', () => {
      const config: SearchConfig = {
        target: 'all',
        includeHighlights: true,
      }

      const results = searchItems(testItems, '登录', config)

      expect(results[0].highlights[0]).toHaveProperty('start')
      expect(results[0].highlights[0]).toHaveProperty('end')
      expect(results[0].highlights[0].start).toBeLessThanOrEqual(results[0].highlights[0].end)
    })

    it('should not include highlights when disabled', () => {
      const config: SearchConfig = {
        target: 'all',
        includeHighlights: false,
      }

      const results = searchItems(testItems, '登录', config)

      expect(results[0].highlights).toEqual([])
    })
  })

  describe('Minimum score threshold', () => {
    it('should filter results by minimum score', () => {
      const config: SearchConfig = {
        target: 'all',
        minScore: 3,
      }

      const results = searchItems(testItems, 'open', config)

      expect(results.every(r => r.score >= 3)).toBe(true)
    })

    it('should return all results when minScore is 0', () => {
      const config: SearchConfig = {
        target: 'all',
        minScore: 0,
      }

      const results = searchItems(testItems, 'open', config)

      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('Case sensitivity', () => {
    it('should be case-insensitive by default', () => {
      const results1 = searchItems(testItems, 'OPEN')
      const results2 = searchItems(testItems, 'open')

      expect(results1.length).toBe(results2.length)
    })

    it('should respect case-sensitive option', () => {
      const config: SearchConfig = {
        target: 'all',
        caseSensitive: true,
      }

      const results = searchItems(testItems, 'OPEN', config)

      expect(results.length).toBe(0)
    })
  })

  describe('Search result ranking', () => {
    it('should sort results by score descending', () => {
      const results = searchItems(testItems, 'open')

      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score)
      }
    })
  })
})

describe('Highlight search term', () => {
  it('should highlight exact matches', () => {
    const highlighted = highlightSearchTerm('This is a test', 'test')

    expect(highlighted).toContain('<mark')
    expect(highlighted).toContain('test')
  })

  it('should highlight with custom config', () => {
    const highlighted = highlightSearchTerm('This is a test', 'test', { fuzzyMatch: true })

    expect(highlighted).toContain('<mark')
  })

  it('should return original text when no match', () => {
    const highlighted = highlightSearchTerm('This is a test', 'notfound')

    expect(highlighted).toBe('This is a test')
  })

  it('should handle empty query', () => {
    const highlighted = highlightSearchTerm('This is a test', '')

    expect(highlighted).toBe('This is a test')
  })
})

describe('Apply filters', () => {
  let testItems: TestItem[]
  let filters: FilterConfig<TestItem>[]

  beforeEach(() => {
    testItems = [
      {
        id: 1,
        title: 'Task 1',
        description: 'Desc 1',
        status: 'open',
        priority: 'high',
        tags: 'bug',
      },
      {
        id: 2,
        title: 'Task 2',
        description: 'Desc 2',
        status: 'open',
        priority: 'low',
        tags: 'feature',
      },
      {
        id: 3,
        title: 'Task 3',
        description: 'Desc 3',
        status: 'closed',
        priority: 'high',
        tags: 'bug',
      },
    ]

    filters = [{ id: 'status' }, { id: 'priority' }, { id: 'tags' }]
  })

  it('should return all items when no filters active', () => {
    const activeFilters: ActiveFilters<TestItem> = {}
    const results = applyFilters(testItems, filters, activeFilters)

    expect(results).toHaveLength(testItems.length)
  })

  it('should filter by single field', () => {
    const activeFilters: ActiveFilters<TestItem> = {
      status: ['open'],
    }
    const results = applyFilters(testItems, filters, activeFilters)

    expect(results.every(r => r.status === 'open')).toBe(true)
    expect(results.length).toBe(2)
  })

  it('should filter by multiple fields', () => {
    const activeFilters: ActiveFilters<TestItem> = {
      status: ['open'],
      priority: ['high'],
    }
    const results = applyFilters(testItems, filters, activeFilters)

    expect(results.every(r => r.status === 'open' && r.priority === 'high')).toBe(true)
    expect(results.length).toBe(1)
  })

  it('should handle multiple values per field', () => {
    const activeFilters: ActiveFilters<TestItem> = {
      status: ['open', 'closed'],
    }
    const results = applyFilters(testItems, filters, activeFilters)

    expect(results.length).toBe(3)
  })

  it('should skip disabled filters', () => {
    filters[0].enabled = false
    const activeFilters: ActiveFilters<TestItem> = {
      status: ['open'],
      priority: ['high'],
    }
    const results = applyFilters(testItems, filters, activeFilters)

    // Should only filter by priority
    expect(results.length).toBe(2)
  })
})

describe('Apply sort', () => {
  let testItems: TestItem[]

  beforeEach(() => {
    testItems = [
      {
        id: 3,
        title: 'Task C',
        description: 'Desc 3',
        status: 'open',
        priority: 'high',
        tags: 'bug',
      },
      {
        id: 1,
        title: 'Task A',
        description: 'Desc 1',
        status: 'open',
        priority: 'low',
        tags: 'bug',
      },
      {
        id: 2,
        title: 'Task B',
        description: 'Desc 2',
        status: 'closed',
        priority: 'medium',
        tags: 'feature',
      },
    ]
  })

  it('should sort by field ascending', () => {
    const results = applySort(testItems, { field: 'title', direction: 'asc' })

    expect(results[0].title).toBe('Task A')
    expect(results[1].title).toBe('Task B')
    expect(results[2].title).toBe('Task C')
  })

  it('should sort by field descending', () => {
    const results = applySort(testItems, { field: 'title', direction: 'desc' })

    expect(results[0].title).toBe('Task C')
    expect(results[1].title).toBe('Task B')
    expect(results[2].title).toBe('Task A')
  })

  it('should handle null values', () => {
    const itemsWithNulls = [
      { ...testItems[0], title: null as unknown as string },
      testItems[1],
      testItems[2],
    ]

    const results = applySort(itemsWithNulls, { field: 'title', direction: 'asc' })

    expect(results[results.length - 1]).toEqual(itemsWithNulls[0])
  })

  it('should return new array', () => {
    const results = applySort(testItems, { field: 'id', direction: 'asc' })

    expect(results).not.toBe(testItems)
  })
})

describe('Utility functions', () => {
  describe('hasActiveFilters', () => {
    it('should return false for empty object', () => {
      expect(hasActiveFilters({})).toBe(false)
    })

    it('should return false for null', () => {
      expect(hasActiveFilters(null as unknown as Record<string, unknown[]>)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(hasActiveFilters(undefined)).toBe(false)
    })

    it('should return true when filters have values', () => {
      const filters = { status: ['open'] }
      expect(hasActiveFilters(filters)).toBe(true)
    })

    it('should return false when all filter arrays are empty', () => {
      const filters = { status: [], priority: [] }
      expect(hasActiveFilters(filters)).toBe(false)
    })
  })

  describe('clearAllFilters', () => {
    it('should return empty object', () => {
      const result = clearAllFilters()

      expect(result).toEqual({})
    })
  })

  describe('Cache management', () => {
    it('should clear all caches', () => {
      // Perform some searches to populate cache
      searchItems([{ id: 1, title: 'test' }], 'test')
      searchItems([{ id: 2, title: 'test2' }], 'test2')

      clearAllCaches()

      const stats = getCacheStats()
      expect(stats.total).toBe(0)
    })

    it('should get cache statistics', () => {
      const stats = getCacheStats()

      expect(stats).toHaveProperty('total')
      expect(typeof stats.total).toBe('number')
    })
  })
})
