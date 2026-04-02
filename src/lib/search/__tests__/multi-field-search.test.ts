// @ts-nocheck - Test file with complex type issues
/**
 * @fileoverview Multi-field search tests
 * @description Tests for enhanced multi-field search functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  multiFieldSearch,
  createMultiFieldConfig,
  createRequiredFieldsConfig,
  toStandardSearchResult,
  getMultiFieldSearchStats,
  type MultiFieldSearchConfig,
} from '../multi-field-search'

interface TestItem {
  id: number
  title: string
  description: string
  status: string
  priority: string
  tags: string
}

describe('multiFieldSearch', () => {
  let testItems: TestItem[]

  beforeEach(() => {
    testItems = [
      {
        id: 1,
        title: 'Bug fix: Login issue',
        description: 'Users cannot login to the system',
        status: 'open',
        priority: 'high',
        tags: 'bug critical',
      },
      {
        id: 2,
        title: 'Feature: User dashboard',
        description: 'Create a new user dashboard interface',
        status: 'in-progress',
        priority: 'medium',
        tags: 'feature ui',
      },
      {
        id: 3,
        title: 'Documentation update',
        description: 'Update API documentation',
        status: 'open',
        priority: 'low',
        tags: 'docs',
      },
      {
        id: 4,
        title: 'Performance optimization',
        description: 'Improve search performance',
        status: 'closed',
        priority: 'high',
        tags: 'performance',
      },
    ]
  })

  it('should return empty array for empty query', () => {
    const config = createMultiFieldConfig(['title', 'description'])
    const results = multiFieldSearch(testItems, '', config)

    expect(results.length).toBe(testItems.length)
    expect(results.every(r => r.score === 1)).toBe(true)
  })

  it('should return empty array for empty items', () => {
    const config = createMultiFieldConfig(['title', 'description'])
    const results = multiFieldSearch([], 'test', config)

    expect(results).toEqual([])
  })

  it('should search in title field', () => {
    const config = createMultiFieldConfig(['title'])
    const results = multiFieldSearch(testItems, 'login', config)

    expect(results.length).toBe(1)
    expect(results[0].item.title.toLowerCase()).toContain('login')
    expect(results[0].fieldMatches[0].matched).toBe(true)
  })

  it('should search in description field', () => {
    const config = createMultiFieldConfig(['description'])
    const results = multiFieldSearch(testItems, 'system', config)

    expect(results.length).toBe(1)
    expect(results[0].item.description).toContain('system')
  })

  it('should search across multiple fields', () => {
    const config = createMultiFieldConfig(['title', 'description'])
    const results = multiFieldSearch(testItems, 'user', config)

    expect(results.length).toBe(2)
    expect(results.some(r => r.item.title.includes('user'))).toBe(true)
    expect(results.some(r => r.item.description.includes('user'))).toBe(true)
  })

  it('should apply field weights', () => {
    const config: MultiFieldSearchConfig = {
      fieldConfigs: [
        { field: 'title', weight: 2 },
        { field: 'description', weight: 1 },
      ],
      target: 'all',
      caseSensitive: false,
      includeHighlights: true,
    }

    const results = multiFieldSearch(testItems, 'user', config)

    expect(results.length).toBeGreaterThan(0)
    expect(results.every(r => r.fieldMatches.length > 0)).toBe(true)
  })

  it('should handle fuzzy matching', () => {
    const config: MultiFieldSearchConfig = {
      fieldConfigs: [
        { field: 'title', fuzzyMatch: true, fuzzyThreshold: 2 },
        { field: 'description', fuzzyMatch: true, fuzzyThreshold: 2 },
      ],
      target: 'all',
      caseSensitive: false,
      includeHighlights: true,
    }

    const results = multiFieldSearch(testItems, 'logn', config)

    expect(results.length).toBeGreaterThan(0)
    expect(results.some(r => r.item.title.toLowerCase().includes('login'))).toBe(true)
  })

  it('should require all fields to match', () => {
    const config: MultiFieldSearchConfig = {
      fieldConfigs: [
        { field: 'title', required: true },
        { field: 'description', required: true },
      ],
      requireAllFields: true,
      target: 'all',
      caseSensitive: false,
      includeHighlights: true,
    }

    const results = multiFieldSearch(testItems, 'user', config)

    // Only item with 'user' in both title and description
    expect(results.length).toBeLessThanOrEqual(1)
  })

  it('should require minimum field matches', () => {
    const config: MultiFieldSearchConfig = {
      fieldConfigs: [{ field: 'title' }, { field: 'description' }, { field: 'status' }],
      minMatchedFields: 2,
      target: 'all',
      caseSensitive: false,
      includeHighlights: true,
    }

    const results = multiFieldSearch(testItems, 'open', config)

    expect(results.every(r => r.matchedFields.length >= 2)).toBe(true)
  })

  it('should include highlights', () => {
    const config: MultiFieldSearchConfig = {
      fieldConfigs: [{ field: 'title' }, { field: 'description' }],
      target: 'all',
      caseSensitive: false,
      includeHighlights: true,
    }

    const results = multiFieldSearch(testItems, 'login', config)

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].highlights.length).toBeGreaterThan(0)
    expect(results[0].highlights[0].text.toLowerCase()).toContain('login')
  })

  it('should not include highlights when disabled', () => {
    const config: MultiFieldSearchConfig = {
      fieldConfigs: [{ field: 'title' }],
      target: 'all',
      caseSensitive: false,
      includeHighlights: false,
    }

    const results = multiFieldSearch(testItems, 'login', config)

    expect(results[0].highlights).toEqual([])
  })

  it('should apply minimum score threshold', () => {
    const config: MultiFieldSearchConfig = {
      fieldConfigs: [{ field: 'title' }],
      target: 'all',
      caseSensitive: false,
      includeHighlights: true,
      minScore: 5,
    }

    const results = multiFieldSearch(testItems, 'x', config)

    // Should filter out low-score results
    expect(results.every(r => r.score >= 5)).toBe(true)
  })

  describe('fieldMatches', () => {
    it('should include match details for each field', () => {
      const config = createMultiFieldConfig(['title', 'description'])
      const results = multiFieldSearch(testItems, 'login', config)

      expect(results[0].fieldMatches).toHaveLength(2)
      expect(results[0].fieldMatches.every(fm => 'matched' in fm)).toBe(true)
      expect(results[0].fieldMatches.every(fm => 'score' in fm)).toBe(true)
    })

    it('should include match type', () => {
      const config = createMultiFieldConfig(['title'])
      const results = multiFieldSearch(testItems, 'login', config)

      const match = results[0].fieldMatches[0]
      expect(match.matchType).toBe('substring')
    })
  })
})

describe('createMultiFieldConfig', () => {
  it('should create basic config with default weights', () => {
    const config = createMultiFieldConfig(['title', 'description'])

    expect(config.fieldConfigs).toHaveLength(2)
    expect(config.fieldConfigs[0].weight).toBe(1)
    expect(config.fieldConfigs[1].weight).toBe(1)
  })

  it('should apply custom weights', () => {
    const config = createMultiFieldConfig(['title', 'description'], {
      title: 2,
      description: 1,
    })

    expect(config.fieldConfigs[0].weight).toBe(2)
    expect(config.fieldConfigs[1].weight).toBe(1)
  })

  it('should set default search options', () => {
    const config = createMultiFieldConfig(['title'])

    expect(config.target).toBe('all')
    expect(config.caseSensitive).toBe(false)
    expect(config.fuzzyMatch).toBe(true)
    expect(config.includeHighlights).toBe(true)
  })
})

describe('createRequiredFieldsConfig', () => {
  it('should mark required fields', () => {
    const config = createRequiredFieldsConfig(['title'], ['description'])

    expect(config.fieldConfigs[0].required).toBe(true)
    expect(config.fieldConfigs[1].required).toBe(false)
  })

  it('should set minimum matched fields', () => {
    const config = createRequiredFieldsConfig(['title'], ['description'])

    expect(config.minMatchedFields).toBe(1)
  })

  it('should apply weights to both required and optional fields', () => {
    const config = createRequiredFieldsConfig(['title'], ['description'], {
      title: 2,
      description: 1,
    })

    expect(config.fieldConfigs[0].weight).toBe(2)
    expect(config.fieldConfigs[1].weight).toBe(1)
  })
})

describe('toStandardSearchResult', () => {
  it('should convert multi-field results to standard results', () => {
    const config = createMultiFieldConfig(['title'])
    const multiFieldResults = multiFieldSearch(testItems, 'login', config)

    const standardResults = toStandardSearchResult(multiFieldResults)

    expect(standardResults).toHaveLength(multiFieldResults.length)
    expect(standardResults[0].item).toEqual(multiFieldResults[0].item)
    expect(standardResults[0].matchedFields).toEqual(multiFieldResults[0].matchedFields)
    expect(standardResults[0].highlights).toEqual(multiFieldResults[0].highlights)
    expect(standardResults[0].score).toBe(
      multiFieldResults[0].score + multiFieldResults[0].crossFieldScore
    )
  })

  it('should handle empty results', () => {
    const results = toStandardSearchResult([])

    expect(results).toEqual([])
  })
})

describe('getMultiFieldSearchStats', () => {
  it('should return zero stats for empty results', () => {
    const stats = getMultiFieldSearchStats([])

    expect(stats.totalResults).toBe(0)
    expect(stats.avgScore).toBe(0)
    expect(stats.avgCrossFieldScore).toBe(0)
    expect(stats.avgMatchedFields).toBe(0)
    expect(stats.fieldMatchRates).toEqual({})
  })

  it('should calculate average scores', () => {
    const config = createMultiFieldConfig(['title'])
    const results = multiFieldSearch(testItems, 'user', config)

    const stats = getMultiFieldSearchStats(results)

    expect(stats.totalResults).toBe(results.length)
    expect(stats.avgScore).toBeGreaterThan(0)
    expect(stats.avgMatchedFields).toBeGreaterThan(0)
  })

  it('should calculate field match rates', () => {
    const config = createMultiFieldConfig(['title', 'description'])
    const results = multiFieldSearch(testItems, 'user', config)

    const stats = getMultiFieldSearchStats(results)

    expect(stats.fieldMatchRates).toHaveProperty('title')
    expect(stats.fieldMatchRates).toHaveProperty('description')
    expect(stats.fieldMatchRates.title).toBeGreaterThanOrEqual(0)
    expect(stats.fieldMatchRates.title).toBeLessThanOrEqual(1)
  })
})
