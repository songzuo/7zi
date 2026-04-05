/**
 * @fileoverview Enhanced Sort and Filter Tests
 * @description Tests for advanced sorting and filtering functionality
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  sortResults,
  applyAdvancedFilters,
  createFiltersFromSearchFilters,
  parseSortOption,
  extractFieldValues,
  groupResultsByField,
  executeSearch,
  type SortConfig,
  type AdvancedFilter,
} from '@/lib/search/sort-filter'
import type { UnifiedEntity } from './types'

describe('Sort Results', () => {
  let testResults: any[]

  beforeEach(() => {
    testResults = [
      {
        item: {
          id: '1',
          type: 'task',
          name: 'Task C',
          title: 'Task C',
          status: 'open',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-05T00:00:00Z',
          priority: 'high',
        },
        matchedFields: ['title'],
        score: 0.8,
      },
      {
        item: {
          id: '2',
          type: 'task',
          name: 'Task A',
          title: 'Task A',
          status: 'open',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
          priority: 'low',
        },
        matchedFields: ['title'],
        score: 0.95,
      },
      {
        item: {
          id: '3',
          type: 'task',
          name: 'Task B',
          title: 'Task B',
          status: 'closed',
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-07T00:00:00Z',
          priority: 'medium',
        },
        matchedFields: ['title'],
        score: 0.9,
      },
    ]
  })

  describe('Sort by relevance', () => {
    it('should keep relevance order', () => {
      const config: SortConfig = { field: 'relevance' }
      const sorted = sortResults(testResults, config)

      expect(sorted).toHaveLength(3)
      expect(sorted[0].item.id).toBe('2') // Score 0.95
      expect(sorted[1].item.id).toBe('3') // Score 0.9
      expect(sorted[2].item.id).toBe('1') // Score 0.8
    })
  })

  describe('Sort by date (descending)', () => {
    it('should sort by updated date descending', () => {
      const config: SortConfig = { field: 'date-desc' }
      const sorted = sortResults(testResults, config)

      expect(sorted[0].item.id).toBe('2') // Updated 2024-01-10
      expect(sorted[1].item.id).toBe('3') // Updated 2024-01-07
      expect(sorted[2].item.id).toBe('1') // Updated 2024-01-05
    })

    it('should sort by created date descending', () => {
      const config: SortConfig = { field: 'date-desc', dateField: 'createdAt' }
      const sorted = sortResults(testResults, config)

      expect(sorted[0].item.id).toBe('3') // Created 2024-01-03
      expect(sorted[1].item.id).toBe('2') // Created 2024-01-02
      expect(sorted[2].item.id).toBe('1') // Created 2024-01-01
    })
  })

  describe('Sort by date (ascending)', () => {
    it('should sort by updated date ascending', () => {
      const config: SortConfig = { field: 'date-asc' }
      const sorted = sortResults(testResults, config)

      expect(sorted[0].item.id).toBe('1') // Updated 2024-01-05
      expect(sorted[1].item.id).toBe('3') // Updated 2024-01-07
      expect(sorted[2].item.id).toBe('2') // Updated 2024-01-10
    })
  })

  describe('Sort by name', () => {
    it('should sort by name ascending', () => {
      const config: SortConfig = { field: 'name-asc' }
      const sorted = sortResults(testResults, config)

      expect(sorted[0].item.name).toBe('Task A')
      expect(sorted[1].item.name).toBe('Task B')
      expect(sorted[2].item.name).toBe('Task C')
    })

    it('should sort by name descending', () => {
      const config: SortConfig = { field: 'name-desc' }
      const sorted = sortResults(testResults, config)

      expect(sorted[0].item.name).toBe('Task C')
      expect(sorted[1].item.name).toBe('Task B')
      expect(sorted[2].item.name).toBe('Task A')
    })
  })

  describe('Hybrid sort', () => {
    it('should combine relevance with recency', () => {
      const config: SortConfig = { field: 'hybrid', hybridWeight: 0.5 }
      const sorted = sortResults(testResults, config)

      // Hybrid sort should balance score and recency
      expect(sorted).toHaveLength(3)
      // Task 2 has highest relevance and is recent
      expect(sorted[0].item.id).toBe('2')
    })

    it('should allow custom hybrid weight', () => {
      const configHighRelevance: SortConfig = {
        field: 'hybrid',
        hybridWeight: 0.1, // Mostly relevance
      }
      const configHighRecency: SortConfig = {
        field: 'hybrid',
        hybridWeight: 0.9, // Mostly recency
      }

      const sortedHighRelevance = sortResults(testResults, configHighRelevance)
      const sortedHighRecency = sortResults(testResults, configHighRecency)

      // Results should differ based on weight
      expect(sortedHighRelevance).not.toEqual(sortedHighRecency)
    })
  })
})

describe('Apply Advanced Filters', () => {
  let testResults: any[]

  beforeEach(() => {
    testResults = [
      {
        item: {
          id: '1',
          type: 'task',
          name: 'Open Task',
          status: 'open',
          priority: 'high',
          assignee: 'johndoe',
          labels: [{ name: 'bug' }, { name: 'urgent' }],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-05T00:00:00Z',
        },
        matchedFields: ['title'],
        score: 0.9,
      },
      {
        item: {
          id: '2',
          type: 'task',
          name: 'Closed Task',
          status: 'closed',
          priority: 'medium',
          assignee: 'janedoe',
          labels: [{ name: 'feature' }],
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-06T00:00:00Z',
        },
        matchedFields: ['title'],
        score: 0.8,
      },
      {
        item: {
          id: '3',
          type: 'task',
          name: 'Another Open Task',
          status: 'open',
          priority: 'low',
          assignee: 'johndoe',
          labels: [{ name: 'documentation' }],
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-07T00:00:00Z',
        },
        matchedFields: ['title'],
        score: 0.7,
      },
    ]
  })

  describe('AND filters', () => {
    it('should filter by single field with AND', () => {
      const filters: AdvancedFilter[] = [
        { field: 'status', values: ['open'], mode: 'and' },
      ]

      const filtered = applyAdvancedFilters(testResults, filters)

      expect(filtered).toHaveLength(2)
      expect(filtered.every(r => r.item.status === 'open')).toBe(true)
    })

    it('should filter by multiple fields with AND', () => {
      const filters: AdvancedFilter[] = [
        { field: 'status', values: ['open'], mode: 'and' },
        { field: 'assignee', values: ['johndoe'], mode: 'and' },
      ]

      const filtered = applyAdvancedFilters(testResults, filters)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].item.id).toBe('1')
    })
  })

  describe('OR filters', () => {
    it('should filter by single field with OR', () => {
      const filters: AdvancedFilter[] = [
        {
          field: 'priority',
          values: ['high', 'low'],
          mode: 'or',
        },
      ]

      const filtered = applyAdvancedFilters(testResults, filters)

      expect(filtered).toHaveLength(2)
      expect(filtered.some(r => r.item.priority === 'high')).toBe(true)
      expect(filtered.some(r => r.item.priority === 'low')).toBe(true)
    })
  })

  describe('AND-NOT filters', () => {
    it('should exclude matching items', () => {
      const filters: AdvancedFilter[] = [
        { field: 'status', values: ['open'], mode: 'and' },
        { field: 'priority', values: ['high'], mode: 'and-not' },
      ]

      const filtered = applyAdvancedFilters(testResults, filters)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].item.id).toBe('3') // open but not high priority
    })
  })

  describe('Nested field filters', () => {
    it('should filter by nested field (labels.name)', () => {
      const filters: AdvancedFilter[] = [
        {
          field: 'labels.name',
          values: ['bug'],
          mode: 'or',
        },
      ]

      const filtered = applyAdvancedFilters(testResults, filters)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].item.id).toBe('1')
    })
  })

  describe('Custom filter functions', () => {
    it('should use custom filter function', () => {
      const filters: AdvancedFilter[] = [
        {
          field: 'status',
          values: ['open'],
          mode: 'and',
          filterFn: (item: UnifiedEntity, value: unknown) => {
            return item.status === value
          },
        },
      ]

      const filtered = applyAdvancedFilters(testResults, filters)

      expect(filtered).toHaveLength(2)
    })

    it('should filter by date range', () => {
      const filters: AdvancedFilter[] = [
        {
          field: 'createdAt',
          values: [
            {
              start: '2024-01-02T00:00:00Z',
              end: '2024-01-03T00:00:00Z',
            },
          ],
          mode: 'and',
          filterFn: (item: UnifiedEntity, value: unknown) => {
            const range = value as { start?: string; end?: string }
            const date = new Date(item.createdAt).getTime()

            if (range.start && date < new Date(range.start).getTime()) {
              return false
            }
            if (range.end && date > new Date(range.end).getTime()) {
              return false
            }
            return true
          },
        },
      ]

      const filtered = applyAdvancedFilters(testResults, filters)

      expect(filtered).toHaveLength(1)
      expect(filtered[0].item.id).toBe('2')
    })
  })

  describe('Empty filters', () => {
    it('should return all results when no filters', () => {
      const filtered = applyAdvancedFilters(testResults, [])

      expect(filtered).toEqual(testResults)
    })
  })
})

describe('Create Filters from Search Filters', () => {
  it('should create filters for status', () => {
    const searchFilters = {
      status: ['open', 'closed'],
    }

    const filters = createFiltersFromSearchFilters(searchFilters)

    expect(filters).toHaveLength(1)
    expect(filters[0].field).toBe('status')
    expect(filters[0].values).toEqual(['open', 'closed'])
    expect(filters[0].mode).toBe('and')
  })

  it('should create filters for priority', () => {
    const searchFilters = {
      priority: ['high'],
    }

    const filters = createFiltersFromSearchFilters(searchFilters)

    expect(filters).toHaveLength(1)
    expect(filters[0].field).toBe('priority')
    expect(filters[0].values).toEqual(['high'])
  })

  it('should create filters for labels (OR mode)', () => {
    const searchFilters = {
      labels: ['bug', 'feature'],
    }

    const filters = createFiltersFromSearchFilters(searchFilters)

    expect(filters).toHaveLength(1)
    expect(filters[0].field).toBe('labels.name')
    expect(filters[0].mode).toBe('or')
  })

  it('should create filters for date ranges', () => {
    const searchFilters = {
      createdAfter: '2024-01-01T00:00:00Z',
      createdBefore: '2024-01-31T00:00:00Z',
    }

    const filters = createFiltersFromSearchFilters(searchFilters)

    expect(filters).toHaveLength(2)
    expect(filters.some(f => f.field === 'createdAt')).toBe(true)
  })

  it('should create filters for custom fields', () => {
    const searchFilters = {
      custom: {
        'customField': ['value1', 'value2'],
      },
    }

    const filters = createFiltersFromSearchFilters(searchFilters)

    expect(filters).toHaveLength(1)
    expect(filters[0].field).toBe('customField')
    expect(filters[0].values).toEqual(['value1', 'value2'])
  })
})

describe('Parse Sort Option', () => {
  it('should parse relevance', () => {
    const config = parseSortOption('relevance')
    expect(config.field).toBe('relevance')
  })

  it('should parse date-asc', () => {
    const config = parseSortOption('date-asc')
    expect(config.field).toBe('date-asc')
  })

  it('should parse date-desc', () => {
    const config = parseSortOption('date-desc')
    expect(config.field).toBe('date-desc')
  })

  it('should parse name-asc', () => {
    const config = parseSortOption('name-asc')
    expect(config.field).toBe('name-asc')
  })

  it('should parse hybrid', () => {
    const config = parseSortOption('hybrid')
    expect(config.field).toBe('hybrid')
    expect(config.hybridWeight).toBe(0.3)
  })

  it('should handle underscore variants', () => {
    const config = parseSortOption('date_desc')
    expect(config.field).toBe('date-desc')
  })

  it('should default to relevance for unknown options', () => {
    const config = parseSortOption('unknown')
    expect(config.field).toBe('relevance')
  })
})

describe('Extract Field Values', () => {
  let testResults: any[]

  beforeEach(() => {
    testResults = [
      {
        item: { id: '1', status: 'open', priority: 'high' },
        matchedFields: [],
        score: 0.9,
      },
      {
        item: { id: '2', status: 'closed', priority: 'medium' },
        matchedFields: [],
        score: 0.8,
      },
      {
        item: { id: '3', status: 'open', priority: 'low' },
        matchedFields: [],
        score: 0.7,
      },
    ]
  })

  it('should extract unique values for status', () => {
    const values = extractFieldValues(testResults, 'status')

    expect(values).toHaveLength(2)
    expect(values).toContain('open')
    expect(values).toContain('closed')
  })

  it('should extract unique values for priority', () => {
    const values = extractFieldValues(testResults, 'priority')

    expect(values).toHaveLength(3)
    expect(values).toContain('high')
    expect(values).toContain('medium')
    expect(values).toContain('low')
  })
})

describe('Group Results by Field', () => {
  let testResults: any[]

  beforeEach(() => {
    testResults = [
      {
        item: { id: '1', status: 'open', name: 'Task 1' },
        matchedFields: [],
        score: 0.9,
      },
      {
        item: { id: '2', status: 'closed', name: 'Task 2' },
        matchedFields: [],
        score: 0.8,
      },
      {
        item: { id: '3', status: 'open', name: 'Task 3' },
        matchedFields: [],
        score: 0.7,
      },
    ]
  })

  it('should group results by status', () => {
    const groups = groupResultsByField(testResults, 'status')

    expect(groups.size).toBe(2)
    expect(groups.get('open')).toHaveLength(2)
    expect(groups.get('closed')).toHaveLength(1)
  })
})

describe('Execute Search Pipeline', () => {
  let testResults: any[]

  beforeEach(() => {
    testResults = [
      {
        item: {
          id: '1',
          type: 'task',
          name: 'Task C',
          title: 'Task C',
          status: 'open',
          priority: 'high',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-05T00:00:00Z',
        },
        matchedFields: ['title'],
        score: 0.8,
      },
      {
        item: {
          id: '2',
          type: 'task',
          name: 'Task A',
          title: 'Task A',
          status: 'closed',
          priority: 'medium',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
        },
        matchedFields: ['title'],
        score: 0.95,
      },
      {
        item: {
          id: '3',
          type: 'task',
          name: 'Task B',
          title: 'Task B',
          status: 'open',
          priority: 'low',
          createdAt: '2024-01-03T00:00:00Z',
          updatedAt: '2024-01-07T00:00:00Z',
        },
        matchedFields: ['title'],
        score: 0.9,
      },
    ]
  })

  it('should execute complete search pipeline', () => {
    const filters: AdvancedFilter[] = [
      { field: 'status', values: ['open'], mode: 'and' },
    ]

    const sortConfig: SortConfig = { field: 'relevance' }

    const results = executeSearch(testResults, 'task', filters, sortConfig)

    expect(results).toHaveLength(2)
    expect(results.every(r => r.item.status === 'open')).toBe(true)
    expect(results[0].score).toBeGreaterThan(results[1].score)
  })

  it('should apply filters and sort', () => {
    const filters: AdvancedFilter[] = [
      { field: 'status', values: ['open'], mode: 'and' },
    ]

    const sortConfig: SortConfig = { field: 'name-asc' }

    const results = executeSearch(testResults, 'task', filters, sortConfig)

    expect(results).toHaveLength(2)
    expect(results[0].item.name).toBe('Task B')
    expect(results[1].item.name).toBe('Task C')
  })
})
