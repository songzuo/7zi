/**
 * @fileoverview Search and filter utility functions tests
 * @description Tests for search-filter.ts - core business logic for searching, filtering, and sorting
 */

import { describe, it, expect } from 'vitest'
import {
  searchItems,
  highlightSearchTerm,
  applyFilters,
  extractFilterOptions,
  extractLabelOptions,
  extractAssigneeOptions,
  applySort,
  toggleSortDirection,
  applySearchFilterSort,
  hasActiveFilters,
  clearAllFilters,
} from '@/lib/search-filter'
import type { FilterConfig, ActiveFilters, SortConfig } from '@/types/search-filter'

// ============================================================================
// Test Data Fixtures
// ============================================================================

type User = {
  id: number
  name: string
  email: string
  role: string
  status: string
}

const mockUsers: User[] = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'admin', status: 'online' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'user', status: 'offline' },
  { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'user', status: 'online' },
  { id: 4, name: 'Diana Prince', email: 'diana@example.com', role: 'editor', status: 'busy' },
]

type GitHubIssue = {
  id: number
  title: string
  labels: Array<{ name: string; color: string }>
  assignee: { login: string; avatar_url: string } | null
}

const mockGitHubIssues: GitHubIssue[] = [
  {
    id: 1,
    title: 'Fix authentication bug',
    labels: [
      { name: 'bug', color: 'd73a4a' },
      { name: 'high-priority', color: 'b60205' },
    ],
    assignee: {
      login: 'alice',
      avatar_url: 'https://github.com/alice.png',
    },
  },
  {
    id: 2,
    title: 'Add new feature',
    labels: [{ name: 'enhancement', color: 'a2eeef' }],
    assignee: null,
  },
  {
    id: 3,
    title: 'Documentation update',
    labels: [
      { name: 'documentation', color: '0075ca' },
      { name: 'good first issue', color: '7057ff' },
    ],
    assignee: {
      login: 'bob',
      avatar_url: 'https://github.com/bob.png',
    },
  },
]

// ============================================================================
// searchItems Tests
// ============================================================================

describe('searchItems', () => {
  it('should return all items with empty query', () => {
    const results = searchItems(mockUsers, '')

    expect(results).toHaveLength(mockUsers.length)
    expect(results.every(r => r.score === 1)).toBe(true)
  })

  it('should return all items with whitespace-only query', () => {
    const results = searchItems(mockUsers, '   ')

    expect(results).toHaveLength(mockUsers.length)
  })

  it('should search in all fields by default', () => {
    const results = searchItems(mockUsers, 'alice')

    expect(results).toHaveLength(1)
    expect(results[0].item.name).toBe('Alice Johnson')
    expect(results[0].matchedFields).toContain('name')
  })

  it('should search in specific fields when configured', () => {
    const results = searchItems(mockUsers, 'admin', { fields: ['role'], target: 'all' } as const)

    expect(results).toHaveLength(1)
    expect(results[0].item.role).toBe('admin')
  })

  it('should be case-insensitive by default', () => {
    const results1 = searchItems(mockUsers, 'alice')
    const results2 = searchItems(mockUsers, 'ALICE')
    const results3 = searchItems(mockUsers, 'Alice')

    expect(results1).toHaveLength(results2.length)
    expect(results2).toHaveLength(results3.length)
  })

  it('should be case-sensitive when configured', () => {
    const results1 = searchItems(mockUsers, 'Alice', {
      caseSensitive: true,
      target: 'all',
    } as const)
    const results2 = searchItems(mockUsers, 'alice', {
      caseSensitive: true,
      target: 'all',
    } as const)

    // 'Alice' matches the name 'Alice Johnson'
    expect(results1).toHaveLength(1)
    // 'alice' matches the email 'alice@example.com' (case-sensitive match)
    expect(results2).toHaveLength(1)
    // 'ALICE' (all caps) should not match anything in case-sensitive mode
    const results3 = searchItems(mockUsers, 'ALICE', {
      caseSensitive: true,
      target: 'all',
    } as const)
    expect(results3).toHaveLength(0)
  })

  it('should perform exact match when configured', () => {
    const results = searchItems(mockUsers, 'Alice', { exactMatch: true, target: 'all' } as const)

    expect(results).toHaveLength(0)
  })

  it('should return matched fields', () => {
    const results = searchItems(mockUsers, 'example.com')

    expect(results).toHaveLength(4)
    expect(results[0].matchedFields).toContain('email')
  })

  it('should return highlights with correct structure', () => {
    const results = searchItems(mockUsers, 'admin')

    expect(results[0].highlights).toBeDefined()
    expect(Array.isArray(results[0].highlights)).toBe(true)

    if (results[0].highlights.length > 0) {
      const highlight = results[0].highlights[0]
      expect(highlight).toHaveProperty('field')
      expect(highlight).toHaveProperty('text')
      expect(highlight).toHaveProperty('start')
      expect(highlight).toHaveProperty('end')
    }
  })

  it('should sort results by relevance score', () => {
    const results = searchItems(mockUsers, 'example.com')

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })

  it('should give higher score for matches at the beginning', () => {
    const results = searchItems(mockUsers, 'a')

    // Alice starts with 'a', Diana contains 'a' in the middle
    const alice = results.find(r => r.item.name === 'Alice Johnson')
    const diana = results.find(r => r.item.name === 'Diana Prince')

    if (alice && diana) {
      expect(alice.score).toBeGreaterThan(diana.score)
    }
  })

  it('should handle empty items array', () => {
    const results = searchItems([], 'test')

    expect(results).toHaveLength(0)
  })
})

// ============================================================================
// highlightSearchTerm Tests
// ============================================================================

describe('highlightSearchTerm', () => {
  it('should return original text with empty query', () => {
    const result = highlightSearchTerm('Hello World', '')

    expect(result).toBe('Hello World')
  })

  it('should highlight found term', () => {
    const result = highlightSearchTerm('Hello World', 'World')

    expect(result).toContain('<mark')
    expect(result).toContain('World')
    expect(result).toContain('bg-yellow-200')
  })

  it('should be case-insensitive by default', () => {
    const result1 = highlightSearchTerm('Hello World', 'world')
    const result2 = highlightSearchTerm('Hello World', 'World')

    expect(result1).toContain('<mark')
    expect(result2).toContain('<mark')
    expect(result1).toBe(result2)
  })

  it('should be case-sensitive when configured', () => {
    const result1 = highlightSearchTerm('Hello World', 'World', { caseSensitive: true })
    const result2 = highlightSearchTerm('Hello World', 'world', { caseSensitive: true })

    expect(result1).toContain('<mark')
    expect(result2).not.toContain('<mark')
  })

  it('should handle no matches', () => {
    const result = highlightSearchTerm('Hello World', 'Goodbye')

    expect(result).toBe('Hello World')
  })

  it('should include context around match', () => {
    const result = highlightSearchTerm('The quick brown fox jumps over the lazy dog', 'fox')

    expect(result).toContain('brown')
    expect(result).toContain('jumps')
  })
})

// ============================================================================
// applyFilters Tests
// ============================================================================

describe('applyFilters', () => {
  it('should return all items with no active filters', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'role', type: 'status', label: 'Role', options: [] },
    ]
    const activeFilters: Record<string, unknown[]> = {}

    const results = applyFilters(mockUsers, filters, activeFilters)

    expect(results).toHaveLength(mockUsers.length)
  })

  it('should filter by single value', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
    ]
    const activeFilters: Record<string, unknown[]> = {
      status: ['online'],
    }

    const results = applyFilters(mockUsers, filters, activeFilters)

    expect(results).toHaveLength(2)
    expect(results.every(r => r.status === 'online')).toBe(true)
  })

  it('should filter by multiple values (OR logic)', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
    ]
    const activeFilters: Record<string, unknown[]> = {
      status: ['online', 'offline'],
    }

    const results = applyFilters(mockUsers, filters, activeFilters)

    expect(results).toHaveLength(3)
    expect(results.every(r => ['online', 'offline'].includes(r.status))).toBe(true)
  })

  it('should apply multiple filters (AND logic)', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
      { id: 'role', type: 'status', label: 'Role', options: [] },
    ]
    const activeFilters = {
      status: ['online'],
      role: ['user'],
    }

    const results = applyFilters(mockUsers, filters, activeFilters)

    expect(results).toHaveLength(1)
    expect(results[0].status).toBe('online')
    expect(results[0].role).toBe('user')
  })

  it('should use custom filter function when provided', () => {
    const filters: FilterConfig<User>[] = [
      {
        id: 'nameLength',
        type: 'custom',
        label: 'Name Length',
        options: [],
        customFilter: (item: User, values: unknown[]) => {
          const minLength = values[0] as number
          return item.name.length >= minLength
        },
      },
    ]
    const activeFilters = {
      nameLength: [12],
    }

    const results = applyFilters(mockUsers, filters, activeFilters)

    expect(results.every(r => r.name.length >= 12)).toBe(true)
  })

  it('should skip disabled filters', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [], enabled: false },
      { id: 'role', type: 'status', label: 'Role', options: [] },
    ]
    const activeFilters = {
      status: ['offline'],
      role: ['admin'],
    }

    const results = applyFilters(mockUsers, filters, activeFilters)

    // Should only apply role filter
    expect(results).toHaveLength(1)
    expect(results[0].role).toBe('admin')
  })

  it('should return empty array when no items match', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'role', type: 'status', label: 'Role', options: [] },
    ]
    const activeFilters = {
      role: ['nonexistent'],
    }

    const results = applyFilters(mockUsers, filters, activeFilters)

    expect(results).toHaveLength(0)
  })
})

// ============================================================================
// extractFilterOptions Tests
// ============================================================================

describe('extractFilterOptions', () => {
  it('should extract unique values', () => {
    const options = extractFilterOptions(mockUsers, 'role')

    expect(options).toHaveLength(3)
    expect(options.map(o => o.value)).toContain('admin')
    expect(options.map(o => o.value)).toContain('user')
    expect(options.map(o => o.value)).toContain('editor')
  })

  it('should count occurrences', () => {
    const options = extractFilterOptions(mockUsers, 'role')

    const userOption = options.find(o => o.value === 'user')
    expect(userOption?.count).toBe(2)
  })

  it('should convert values to strings for labels', () => {
    const options = extractFilterOptions(mockUsers, 'role')

    expect(options.every(o => typeof o.label === 'string')).toBe(true)
  })

  it('should handle empty array', () => {
    const options = extractFilterOptions([], 'role')

    expect(options).toHaveLength(0)
  })

  it('should ignore null and undefined values', () => {
    const items = [
      { id: 1, value: 'a' },
      { id: 2, value: null },
      { id: 3, value: 'b' },
      { id: 4, value: undefined },
    ]

    const options = extractFilterOptions(items as { id: number; value: unknown }[], 'value')

    expect(options).toHaveLength(2)
  })
})

// ============================================================================
// extractLabelOptions Tests
// ============================================================================

describe('extractLabelOptions', () => {
  it('should extract labels from GitHub issues', () => {
    const options = extractLabelOptions(mockGitHubIssues)

    expect(options).toHaveLength(5)
    expect(options.map(o => o.value)).toContain('bug')
    expect(options.map(o => o.value)).toContain('enhancement')
  })

  it('should count label occurrences', () => {
    const options = extractLabelOptions(mockGitHubIssues)

    const bugOption = options.find(o => o.value === 'bug')
    expect(bugOption?.count).toBe(1)
  })

  it('should include label colors', () => {
    const options = extractLabelOptions(mockGitHubIssues)

    expect(options.every(o => o.color?.startsWith('#'))).toBe(true)
  })

  it('should sort by count (descending)', () => {
    const options = extractLabelOptions(mockGitHubIssues)

    for (let i = 1; i < options.length; i++) {
      const prevCount = options[i - 1].count ?? 0
      const currCount = options[i].count ?? 0
      expect(prevCount).toBeGreaterThanOrEqual(currCount)
    }
  })

  it('should handle issues without labels', () => {
    const issues = [
      { id: 1, labels: [] },
      { id: 2, labels: undefined },
    ]

    const options = extractLabelOptions(
      issues as { id: number; labels?: Array<{ name: string; color: string }> }[]
    )

    expect(options).toHaveLength(0)
  })
})

// ============================================================================
// extractAssigneeOptions Tests
// ============================================================================

describe('extractAssigneeOptions', () => {
  it('should extract assignees from GitHub issues', () => {
    const options = extractAssigneeOptions(mockGitHubIssues)

    expect(options).toHaveLength(2)
    expect(options.map(o => o.value)).toContain('alice')
    expect(options.map(o => o.value)).toContain('bob')
  })

  it('should count assignee occurrences', () => {
    const options = extractAssigneeOptions(mockGitHubIssues)

    const aliceOption = options.find(o => o.value === 'alice')
    expect(aliceOption?.count).toBe(1)
  })

  it('should include assignee avatar URLs', () => {
    const options = extractAssigneeOptions(mockGitHubIssues)

    expect(options.every(o => typeof o.icon === 'string')).toBe(true)
    expect(options[0].icon).toContain('github.com')
  })

  it('should ignore null assignees', () => {
    const options = extractAssigneeOptions(mockGitHubIssues)

    expect(options.every(o => o.value !== null)).toBe(true)
  })

  it('should handle all unassigned issues', () => {
    const issues = [
      { id: 1, assignee: null },
      { id: 2, assignee: undefined },
    ]

    const options = extractAssigneeOptions(
      issues as { id: number; assignee: { login: string; avatar_url: string } | null | undefined }[]
    )

    expect(options).toHaveLength(0)
  })
})

// ============================================================================
// applyFilters Edge Cases Tests
// ============================================================================

describe('applyFilters Edge Cases', () => {
  it('should handle empty array', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
    ]
    const activeFilters: Record<string, unknown[]> = {
      status: ['online'],
    }

    const results = applyFilters([], filters, activeFilters)

    expect(results).toHaveLength(0)
  })

  it('should handle null values in items', () => {
    const itemsWithNulls = [
      { id: 1, name: 'Alice', status: 'online', role: 'admin', email: 'alice@example.com' },
      {
        id: 2,
        name: null,
        status: 'offline',
        role: 'user',
        email: 'bob@example.com',
      } as unknown as User,
      {
        id: 3,
        name: 'Charlie',
        status: null,
        role: 'user',
        email: 'charlie@example.com',
      } as unknown as User,
    ]

    const filters: FilterConfig<User>[] = [
      { id: 'role', type: 'status', label: 'Role', options: [] },
    ]
    const activeFilters = {
      role: ['user'],
    }

    const results = applyFilters(itemsWithNulls, filters, activeFilters)

    expect(results).toHaveLength(2)
  })

  it('should handle items that do not match any filter', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'role', type: 'status', label: 'Role', options: [] },
      { id: 'status', type: 'status', label: 'Status', options: [] },
    ]
    const activeFilters = {
      role: ['admin'],
      status: ['busy'],
    }

    const results = applyFilters(mockUsers, filters, activeFilters)

    // No user has both admin role AND busy status
    expect(results).toHaveLength(0)
  })

  it('should handle null activeFilters', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
    ]

    const results = applyFilters(mockUsers, filters, null as unknown as ActiveFilters<User>)

    expect(results).toHaveLength(mockUsers.length)
  })

  it('should handle undefined activeFilters', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
    ]

    const results = applyFilters(mockUsers, filters, undefined as unknown as ActiveFilters<User>)

    expect(results).toHaveLength(mockUsers.length)
  })

  it('should handle empty activeFilters values', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
      { id: 'role', type: 'status', label: 'Role', options: [] },
    ]
    const activeFilters = {
      status: [],
      role: ['admin'],
    }

    const results = applyFilters(mockUsers, filters, activeFilters)

    // Should only apply role filter since status is empty
    expect(results).toHaveLength(1)
    expect(results[0].role).toBe('admin')
  })
})

// ============================================================================
// applySort Multi-field Tests
// ============================================================================

describe('applySort Multi-field Sorting', () => {
  it('should sort by single field ascending', () => {
    const results = applySort(mockUsers, {
      field: 'name',
      direction: 'asc',
    })

    expect(results[0].name).toBe('Alice Johnson')
    expect(results[1].name).toBe('Bob Smith')
    expect(results[2].name).toBe('Charlie Brown')
    expect(results[3].name).toBe('Diana Prince')
  })

  it('should sort by single field descending', () => {
    const results = applySort(mockUsers, {
      field: 'name',
      direction: 'desc',
    })

    expect(results[0].name).toBe('Diana Prince')
    expect(results[1].name).toBe('Charlie Brown')
    expect(results[2].name).toBe('Bob Smith')
    expect(results[3].name).toBe('Alice Johnson')
  })

  it('should sort by numeric field', () => {
    const results = applySort(mockUsers, {
      field: 'id',
      direction: 'asc',
    })

    expect(results[0].id).toBe(1)
    expect(results[1].id).toBe(2)
    expect(results[2].id).toBe(3)
    expect(results[3].id).toBe(4)
  })

  it('should handle multi-field sorting with custom comparator', () => {
    const results = applySort(mockUsers, {
      field: 'status' as keyof User,
      direction: 'asc',
      comparator: (a, b) => {
        // First sort by status, then by name
        if (a.status !== b.status) {
          return a.status.localeCompare(b.status)
        }
        return a.name.localeCompare(b.name)
      },
    })

    // All online users should come before offline, and both groups sorted by name
    const onlineUsers = results.filter(r => r.status === 'online')
    const offlineUsers = results.filter(r => r.status === 'offline')

    expect(onlineUsers[0].name).toBe('Alice Johnson')
    expect(onlineUsers[1].name).toBe('Charlie Brown')
    expect(offlineUsers[0].name).toBe('Bob Smith')
  })

  it('should handle sorting with null values', () => {
    const itemsWithNulls = [
      { id: 1, name: 'Alice Johnson', status: 'online', role: 'admin' },
      { id: 2, name: null, status: 'offline', role: 'user' } as unknown as User,
      { id: 3, name: 'Charlie Brown', status: 'online', role: 'user' },
    ]

    const results = applySort(itemsWithNulls, {
      field: 'name',
      direction: 'asc',
    })

    // Null values should be sorted last
    expect(results[0].name).toBe('Alice Johnson')
    expect(results[1].name).toBe('Charlie Brown')
    expect(results[2].name).toBeNull()
  })

  it('should handle sorting with undefined values', () => {
    const itemsWithUndefined = [
      { id: 1, name: 'Alice', status: 'online', role: 'admin' },
      { id: 2, name: 'Bob', status: 'offline', role: undefined as unknown as string },
      { id: 3, name: 'Charlie', status: 'online', role: 'user' },
    ]

    const results = applySort(itemsWithUndefined, {
      field: 'role',
      direction: 'asc',
    })

    // Undefined values should be sorted last
    expect(results[0].role).toBe('admin')
    expect(results[1].role).toBe('user')
    expect(results[2].role).toBeUndefined()
  })
})

// ============================================================================
// searchItems Fuzzy Search Tests
// ============================================================================

describe('searchItems Fuzzy Search', () => {
  it('should find matches with partial substring', () => {
    const results = searchItems(mockUsers, 'John')

    expect(results).toHaveLength(1)
    expect(results[0].item.name).toBe('Alice Johnson')
  })

  it('should find matches with partial substring in middle', () => {
    const results = searchItems(mockUsers, 'son')

    expect(results).toHaveLength(1)
    expect(results[0].item.name).toBe('Alice Johnson')
  })

  it('should find matches with single character', () => {
    const results = searchItems(mockUsers, 'a')

    expect(results.length).toBeGreaterThanOrEqual(2)
    const alice = results.find(r => r.item.name === 'Alice Johnson')
    const diana = results.find(r => r.item.name === 'Diana Prince')
    const charlie = results.find(r => r.item.name === 'Charlie Brown')

    expect(alice).toBeDefined()
    expect(diana).toBeDefined()
    expect(charlie).toBeDefined()
  })

  it('should prioritize matches at the beginning of text', () => {
    const results = searchItems(mockUsers, 'a')

    const alice = results.find(r => r.item.name === 'Alice Johnson')
    const diana = results.find(r => r.item.name === 'Diana Prince')
    const charlie = results.find(r => r.item.name === 'Charlie Brown')

    if (alice && diana && charlie) {
      // Alice has 'a' at position 0 (highest score)
      // Diana has 'a' at position 2 in name
      // Charlie has 'a' at position 2 in name
      // Both Diana and Charlie have 'a' at the same position, so scores are similar
      expect(alice.score).toBeGreaterThan(diana.score)
      expect(alice.score).toBeGreaterThan(charlie.score)
      // Diana and Charlie have similar scores (same position for 'a')
      expect(Math.abs(diana.score - charlie.score)).toBeLessThan(0.1)
    }
  })

  it('should handle search with special characters', () => {
    const results = searchItems(mockUsers, '@example.com')

    expect(results).toHaveLength(4)
    expect(results.every(r => r.matchedFields.includes('email'))).toBe(true)
  })

  it('should handle search with numbers', () => {
    const results = searchItems(mockUsers, '123')

    expect(results).toHaveLength(0)
  })

  it('should handle search with mixed case fuzzy match', () => {
    const results1 = searchItems(mockUsers, 'JOHNSON')
    const results2 = searchItems(mockUsers, 'johnson')
    const results3 = searchItems(mockUsers, 'Johnson')

    expect(results1).toHaveLength(results2.length)
    expect(results2).toHaveLength(results3.length)
    expect(results1[0].item.name).toBe('Alice Johnson')
  })

  it('should return all matches across multiple fields', () => {
    const results = searchItems(mockUsers, 'example')

    expect(results).toHaveLength(4)
    expect(results.every(r => r.matchedFields.includes('email'))).toBe(true)
  })

  it('should handle search query longer than text', () => {
    const results = searchItems(mockUsers, 'Alice Johnson Smith Brown Prince This Is Very Long')

    expect(results).toHaveLength(0)
  })
})

// ============================================================================
// applySearchFilterSort Integration Tests
// ============================================================================

describe('applySearchFilterSort Integration', () => {
  it('should apply search only', () => {
    const results = applySearchFilterSort(mockUsers, 'alice', [], {})

    expect(results.items).toHaveLength(1)
    expect(results.items[0].name).toBe('Alice Johnson')
    expect(results.searchResults).toBeDefined()
    expect(results.activeFilterCount).toBe(0)
    expect(results.totalResults).toBe(4)
    expect(results.filteredResults).toBe(1)
  })

  it('should apply filters only', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
    ]
    const activeFilters = {
      status: ['online'],
    }

    const results = applySearchFilterSort(mockUsers, '', filters, activeFilters)

    expect(results.items).toHaveLength(2)
    expect(results.items.every(r => r.status === 'online')).toBe(true)
    expect(results.searchResults).toBeUndefined()
    expect(results.activeFilterCount).toBe(1)
    expect(results.totalResults).toBe(4)
    expect(results.filteredResults).toBe(2)
  })

  it('should apply sort only', () => {
    const sortConfig = {
      field: 'name' as const,
      direction: 'desc' as const,
    }

    const results = applySearchFilterSort(mockUsers, '', [], {}, sortConfig)

    expect(results.items).toHaveLength(4)
    expect(results.items[0].name).toBe('Diana Prince')
    expect(results.items[3].name).toBe('Alice Johnson')
    expect(results.activeFilterCount).toBe(0)
  })

  it('should apply search and filters', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
    ]
    const activeFilters = {
      status: ['online'],
    }

    const results = applySearchFilterSort(mockUsers, 'johnson', filters, activeFilters)

    expect(results.items).toHaveLength(1)
    expect(results.items[0].name).toBe('Alice Johnson')
    expect(results.items[0].status).toBe('online')
    expect(results.activeFilterCount).toBe(1)
    expect(results.filteredResults).toBe(1)
  })

  it('should apply search and sort', () => {
    const sortConfig = {
      field: 'id' as const,
      direction: 'desc' as const,
    }

    const results = applySearchFilterSort(mockUsers, 'online', [], {}, sortConfig)

    expect(results.items).toHaveLength(2)
    expect(results.items[0].id).toBeGreaterThan(results.items[1].id)
    expect(results.items.every(r => r.status === 'online' || r.email.includes('online'))).toBe(true)
  })

  it('should apply filters and sort', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
    ]
    const activeFilters = {
      status: ['online'],
    }
    const sortConfig = {
      field: 'name' as const,
      direction: 'asc' as const,
    }

    const results = applySearchFilterSort(mockUsers, '', filters, activeFilters, sortConfig)

    expect(results.items).toHaveLength(2)
    expect(results.items[0].name).toBe('Alice Johnson')
    expect(results.items[1].name).toBe('Charlie Brown')
    expect(results.activeFilterCount).toBe(1)
  })

  it('should apply search, filters, and sort together', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
      { id: 'role', type: 'status', label: 'Role', options: [] },
    ]
    const activeFilters = {
      status: ['online'],
      role: ['user'],
    }
    const sortConfig = {
      field: 'name' as const,
      direction: 'desc' as const,
    }

    const results = applySearchFilterSort(mockUsers, 'brown', filters, activeFilters, sortConfig)

    expect(results.items).toHaveLength(1)
    expect(results.items[0].name).toBe('Charlie Brown')
    expect(results.items[0].status).toBe('online')
    expect(results.items[0].role).toBe('user')
    expect(results.activeFilterCount).toBe(2)
    expect(results.filteredResults).toBe(1)
  })

  it('should return empty results when no match found', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'role', type: 'status', label: 'Role', options: [] },
    ]
    const activeFilters = {
      role: ['nonexistent'],
    }

    const results = applySearchFilterSort(mockUsers, 'nonexistent', filters, activeFilters)

    expect(results.items).toHaveLength(0)
    expect(results.filteredResults).toBe(0)
  })

  it('should handle empty query, no filters, no sort', () => {
    const results = applySearchFilterSort(mockUsers, '', [], {})

    expect(results.items).toHaveLength(4)
    expect(results.searchResults).toBeUndefined()
    expect(results.activeFilterCount).toBe(0)
    expect(results.totalResults).toBe(4)
    expect(results.filteredResults).toBe(4)
  })

  it('should calculate activeFilterCount correctly with multiple filters', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
      { id: 'role', type: 'status', label: 'Role', options: [] },
    ]
    const activeFilters = {
      status: ['online', 'offline'],
      role: ['admin', 'user'],
    }

    const results = applySearchFilterSort(mockUsers, '', filters, activeFilters)

    expect(results.activeFilterCount).toBe(4)
  })
})

// ============================================================================
// applySort Tests
// ============================================================================

describe('applySort', () => {
  it('should sort strings ascending', () => {
    const results = applySort(mockUsers, {
      field: 'name',
      direction: 'asc',
    })

    expect(results[0].name).toBe('Alice Johnson')
    expect(results[results.length - 1].name).toBe('Diana Prince')
  })

  it('should sort strings descending', () => {
    const results = applySort(mockUsers, {
      field: 'name',
      direction: 'desc',
    })

    expect(results[0].name).toBe('Diana Prince')
    expect(results[results.length - 1].name).toBe('Alice Johnson')
  })

  it('should not mutate original array', () => {
    const original = [...mockUsers]
    applySort(mockUsers, { field: 'name', direction: 'asc' })

    expect(original).toEqual(mockUsers)
  })

  it('should handle empty array', () => {
    const results = applySort([], { field: 'name', direction: 'asc' })

    expect(results).toHaveLength(0)
  })

  it('should use custom comparator when provided', () => {
    const results = applySort(mockUsers, {
      field: 'id' as keyof User,
      direction: 'asc',
      comparator: (a, b) => a.id - b.id,
    })

    expect(results[0].id).toBe(1)
    expect(results[results.length - 1].id).toBe(4)
  })

  it('should handle mixed data types', () => {
    const items = [{ value: 'a' }, { value: 'z' }, { value: 'm' }]

    const results = applySort(items as { value: unknown }[], {
      field: 'value' as const,
      direction: 'asc',
    })

    expect(results[0].value).toBe('a')
    expect(results[1].value).toBe('m')
    expect(results[2].value).toBe('z')
  })
})

// ============================================================================
// toggleSortDirection Tests
// ============================================================================

describe('toggleSortDirection', () => {
  it('should toggle asc to desc', () => {
    const result = toggleSortDirection('asc')

    expect(result).toBe('desc')
  })

  it('should toggle desc to asc', () => {
    const result = toggleSortDirection('desc')

    expect(result).toBe('asc')
  })
})

// ============================================================================
// applySearchFilterSort Tests
// ============================================================================

describe('applySearchFilterSort', () => {
  it('should apply search, filter, and sort together', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
    ]
    const activeFilters: Record<string, unknown[]> = {
      status: ['online'],
    }
    const sortConfig: SortConfig<User> = {
      field: 'name' as keyof User,
      direction: 'asc',
    }

    const results = applySearchFilterSort(mockUsers, 'johnson', filters, activeFilters, sortConfig)

    expect(results.items).toHaveLength(1)
    expect(results.items[0].name).toBe('Alice Johnson')
    expect(results.activeFilterCount).toBe(1)
    expect(results.totalResults).toBe(mockUsers.length)
    expect(results.filteredResults).toBe(1)
  })

  it('should return search results when query exists', () => {
    const results = applySearchFilterSort(mockUsers, 'alice', [], {})

    expect(results.searchResults).toBeDefined()
    expect(results.searchResults).toHaveLength(1)
    expect(results.searchResults?.[0].item.name).toBe('Alice Johnson')
  })

  it('should not return search results when query is empty', () => {
    const results = applySearchFilterSort(mockUsers, '   ', [], {})

    expect(results.searchResults).toBeUndefined()
  })

  it('should calculate active filter count', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'status', type: 'status', label: 'Status', options: [] },
      { id: 'role', type: 'status', label: 'Role', options: [] },
    ]
    const activeFilters = {
      status: ['online', 'offline'],
      role: ['admin'],
    }

    const results = applySearchFilterSort(mockUsers, '', filters, activeFilters)

    expect(results.activeFilterCount).toBe(3)
  })

  it('should handle only search (no filters or sort)', () => {
    const results = applySearchFilterSort(mockUsers, 'example.com', [], {})

    expect(results.items).toHaveLength(4)
    expect(results.activeFilterCount).toBe(0)
  })

  it('should handle only filters (no search or sort)', () => {
    const filters: FilterConfig<User>[] = [
      { id: 'role', type: 'status', label: 'Role', options: [] },
    ]
    const activeFilters = {
      role: ['admin'],
    }

    const results = applySearchFilterSort(mockUsers, '', filters, activeFilters)

    expect(results.items).toHaveLength(1)
    expect(results.items[0].role).toBe('admin')
  })

  it('should handle only sort (no search or filters)', () => {
    const sortConfig = {
      field: 'id' as const,
      direction: 'desc' as const,
    }

    const results = applySearchFilterSort(mockUsers, '', [], {}, sortConfig)

    expect(results.items).toHaveLength(mockUsers.length)
    expect(results.items[0].id).toBe(4)
  })
})

// ============================================================================
// hasActiveFilters Tests
// ============================================================================

describe('hasActiveFilters', () => {
  it('should return false for empty filters', () => {
    const result = hasActiveFilters({})

    expect(result).toBe(false)
  })

  it('should return false for null values', () => {
    const result = hasActiveFilters({
      status: null,
      role: undefined,
    } as unknown as ActiveFilters<User>)

    expect(result).toBe(false)
  })

  it('should return false for empty arrays', () => {
    const result = hasActiveFilters({
      status: [],
      role: [],
    })

    expect(result).toBe(false)
  })

  it('should return true for single active filter', () => {
    const result = hasActiveFilters({
      status: ['online'],
    })

    expect(result).toBe(true)
  })

  it('should return true for multiple active filters', () => {
    const result = hasActiveFilters({
      status: ['online'],
      role: ['admin'],
    })

    expect(result).toBe(true)
  })

  it('should return true if any filter has values', () => {
    const result = hasActiveFilters({
      status: [],
      role: ['admin'],
    })

    expect(result).toBe(true)
  })
})

// ============================================================================
// clearAllFilters Tests
// ============================================================================

describe('clearAllFilters', () => {
  it('should return empty object', () => {
    const result = clearAllFilters()

    expect(result).toEqual({})
  })

  it('should always return a fresh empty object', () => {
    const result1 = clearAllFilters()
    const result2 = clearAllFilters()

    expect(result1).not.toBe(result2) // Different references
    expect(result1).toEqual(result2) // Same content
  })
})
