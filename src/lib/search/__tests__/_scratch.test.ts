import { describe, it, expect } from 'vitest'
import { multiFieldSearch, type MultiFieldSearchConfig } from '../multi-field-search'

const items = [
  { id: 1, title: 'Bug fix: Login issue', description: 'Users cannot login to the system', status: 'open', priority: 'high', tags: 'bug critical' },
  { id: 2, title: 'Feature: User dashboard', description: 'Create a new user dashboard interface', status: 'in-progress', priority: 'medium', tags: 'feature ui' },
  { id: 3, title: 'Documentation update', description: 'Update API documentation', status: 'open', priority: 'low', tags: 'docs' },
  { id: 4, title: 'Performance optimization', description: 'Improve search performance', status: 'closed', priority: 'high', tags: 'performance' },
]

describe('scratch', () => {
  it('dump', () => {
    const config: MultiFieldSearchConfig = {
      fieldConfigs: [{ field: 'title' }],
      target: 'all',
      caseSensitive: false,
      includeHighlights: true,
      minScore: 5,
    }
    const results = multiFieldSearch(items, 'x', config)
    console.log('MINSCORE RESULTS', JSON.stringify(results.map(r => ({ id: r.item.id, score: r.score }))))

    const cfg2: MultiFieldSearchConfig = {
      fieldConfigs: [{ field: 'title', fuzzyMatch: true, fuzzyThreshold: 2 }, { field: 'description', fuzzyMatch: true, fuzzyThreshold: 2 }],
      target: 'all', caseSensitive: false, includeHighlights: true,
    }
    const r2 = multiFieldSearch(items, 'logn', cfg2)
    console.log('FUZZY RESULTS', JSON.stringify(r2.map(r => ({ id: r.item.id, score: r.score, fm: r.fieldMatches.map(f => f.matchType) }))))

    const cfg3 = { fieldConfigs: [{ field: 'title' }, { field: 'description' }], target: 'all' as const, caseSensitive: false, includeHighlights: true }
    const r3 = multiFieldSearch(items, 'user', cfg3)
    console.log('USER RESULTS', JSON.stringify(r3.map(r => ({ id: r.item.id, score: r.score, fm: r.fieldMatches.map(f => f.matchType) }))))
    expect(true).toBe(true)
  })
})
