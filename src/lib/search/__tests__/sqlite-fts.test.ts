// @ts-nocheck
/**
 * @fileoverview SQLite FTS Manager Tests
 * @description Tests for SQLite full-text search functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { SQLiteFTSManager } from '@/lib/search/sqlite-fts'
import type { UnifiedEntity } from '@/lib/search/types'

describe('SQLiteFTSManager', () => {
  let ftsManager: SQLiteFTSManager
  let testEntities: UnifiedEntity[]

  beforeEach(() => {
    ftsManager = new SQLiteFTSManager({ inMemory: true })
    ftsManager.initialize()

    testEntities = [
      {
        id: '1',
        type: 'task',
        name: 'Fix login bug',
        title: 'Fix login bug',
        description: 'Users cannot login to system',
        status: 'open',
        priority: 'high',
        assignee: 'johndoe',
        labels: [{ name: 'bug', color: 'red' }],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        keywords: ['bug', 'login', 'urgent'],
      },
      {
        id: '2',
        type: 'task',
        name: 'Update documentation',
        title: 'Update documentation',
        description: 'Add new API endpoints to docs',
        status: 'open',
        priority: 'medium',
        assignee: 'janedoe',
        labels: [{ name: 'documentation', color: 'blue' }],
        createdAt: '2024-01-05T00:00:00Z',
        updatedAt: '2024-01-06T00:00:00Z',
        keywords: ['docs', 'api'],
      },
      {
        id: '3',
        type: 'project',
        name: 'Website redesign',
        title: 'Website redesign',
        description: 'Complete overhaul of company website',
        status: 'active',
        owner: 'admin',
        members: ['johndoe', 'janedoe'],
        createdAt: '2024-01-10T00:00:00Z',
        updatedAt: '2024-01-11T00:00:00Z',
      },
      {
        id: '4',
        type: 'member',
        name: 'John Doe',
        login: 'johndoe',
        displayName: 'John Doe',
        role: 'developer',
        email: 'john@example.com',
      },
      {
        id: '5',
        type: 'agent',
        name: 'Code Review Bot',
        title: 'Code Review Bot',
        description: 'Automated code review assistant',
        status: 'active',
        agentType: 'bot',
        capabilities: ['review', 'code-analysis'],
        lastActive: '2024-01-15T00:00:00Z',
      },
    ]
  })

  afterEach(() => {
    ftsManager.close()
  })

  describe('Index management', () => {
    it('should create an FTS index', () => {
      ftsManager.createIndex(
        { id: 'tasks', name: 'Tasks', fields: ['title', 'description'], enabled: true },
        testEntities.filter(e => e.type === 'task')
      )

      const stats = ftsManager.getStatistics()
      expect(stats.totalItems).toBeGreaterThanOrEqual(2)
    })

    it('should upsert items to index', () => {
      ftsManager.createIndex(
        { id: 'tasks', name: 'Tasks', fields: ['title'], enabled: true },
        []
      )

      const tasks = testEntities.filter(e => e.type === 'task')
      ftsManager.upsertItems('tasks', tasks)

      const stats = ftsManager.getStatistics()
      expect(stats.totalItems).toBe(tasks.length)
    })

    it('should remove items from index', () => {
      ftsManager.createIndex(
        { id: 'tasks', name: 'Tasks', fields: ['title'], enabled: true },
        testEntities.filter(e => e.type === 'task')
      )

      ftsManager.removeItems('tasks', ['1'])

      const stats = ftsManager.getStatistics()
      expect(stats.totalItems).toBeLessThan(testEntities.length)
    })
  })

  describe('Search functionality', () => {
    beforeEach(() => {
      // Create indices for all entity types
      ftsManager.createIndex(
        { id: 'tasks', name: 'Tasks', fields: ['title', 'description'], enabled: true },
        testEntities.filter(e => e.type === 'task')
      )

      ftsManager.createIndex(
        { id: 'projects', name: 'Projects', fields: ['title', 'description'], enabled: true },
        testEntities.filter(e => e.type === 'project')
      )

      ftsManager.createIndex(
        { id: 'members', name: 'Members', fields: ['login', 'displayName'], enabled: true },
        testEntities.filter(e => e.type === 'member')
      )

      ftsManager.createIndex(
        { id: 'agents', name: 'Agents', fields: ['title', 'description'], enabled: true },
        testEntities.filter(e => e.type === 'agent')
      )
    })

    it('should return relevant results for query', () => {
      const results = ftsManager.search('login bug')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.id).toBe('1')
      expect(results[0].matchedFields).toContain('title')
    })

    it('should search in description', () => {
      const results = ftsManager.search('documentation')

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(r => r.item.id === '2')).toBe(true)
    })

    it('should limit results', () => {
      const results = ftsManager.search('', { limit: 2 })

      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should apply offset', () => {
      const results1 = ftsManager.search('', { limit: 2, offset: 0 })
      const results2 = ftsManager.search('', { limit: 2, offset: 2 })

      expect(results1).not.toEqual(results2)
    })

    it('should sort by relevance (default)', () => {
      const results = ftsManager.search('api')

      expect(results).toHaveLength(1)
      expect(results[0].item.id).toBe('2')
    })

    it('should sort by date', () => {
      const resultsDesc = ftsManager.search('', { sortBy: 'date' })
      const resultsAsc = ftsManager.search('', { sortBy: 'date' })

      // Results should be sorted by updatedAt
      for (let i = 1; i < resultsDesc.length; i++) {
        const prevDate = new Date(resultsDesc[i - 1].item.updatedAt || resultsDesc[i - 1].item.createdAt).getTime()
        const currDate = new Date(resultsDesc[i].item.updatedAt || resultsDesc[i].item.createdAt).getTime()
        expect(prevDate).toBeGreaterThanOrEqual(currDate)
      }
    })

    it('should sort by hybrid', () => {
      const results = ftsManager.search('', { sortBy: 'hybrid' })

      expect(results.length).toBeGreaterThan(0)
      // Hybrid sort combines relevance with recency
    })

    it('should filter by entity type', () => {
      const tasksResults = ftsManager.search('', {
        indices: ['tasks'],
      })
      const projectsResults = ftsManager.search('', {
        indices: ['projects'],
      })

      expect(tasksResults.length).toBe(2)
      expect(projectsResults.length).toBe(1)
      expect(tasksResults.every(r => r.item.type === 'task')).toBe(true)
      expect(projectsResults.every(r => r.item.type === 'project')).toBe(true)
    })

    it('should generate highlights', () => {
      const results = ftsManager.search('login bug')

      const result = results.find(r => r.item.id === '1')
      expect(result).toBeDefined()
      expect(result?.highlights.length).toBeGreaterThan(0)
      expect(result?.highlights[0].field).toBe('title')
    })

    it('should return empty results for empty query', () => {
      const results = ftsManager.search('')

      expect(results).toEqual([])
    })
  })

  describe('Autocomplete', () => {
    beforeEach(() => {
      ftsManager.createIndex(
        { id: 'all', name: 'All', fields: ['title', 'description', 'name'], enabled: true },
        testEntities
      )
    })

    it('should return autocomplete suggestions', () => {
      const suggestions = ftsManager.getAutocompleteSuggestions('log')

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0].text).toContain('log')
    })

    it('should limit suggestions', () => {
      const suggestions = ftsManager.getAutocompleteSuggestions('', { limit: 2 })

      expect(suggestions.length).toBeLessThanOrEqual(2)
    })

    it('should filter by entity type', () => {
      const suggestions = ftsManager.getAutocompleteSuggestions('', {
        entityTypes: ['task'],
      })

      expect(suggestions.every(s => s.type === 'task')).toBe(true)
    })

    it('should return entity information', () => {
      const suggestions = ftsManager.getAutocompleteSuggestions('login')

      const taskSuggestion = suggestions.find(s => s.text === 'Fix login bug')
      expect(taskSuggestion).toBeDefined()
      expect(taskSuggestion?.entity).toBeDefined()
      expect(taskSuggestion?.entity?.id).toBe('1')
    })
  })

  describe('Statistics', () => {
    beforeEach(() => {
      ftsManager.createIndex(
        { id: 'all', name: 'All', fields: ['title'], enabled: true },
        testEntities
      )
    })

    it('should return correct statistics', () => {
      const stats = ftsManager.getStatistics()

      expect(stats.totalItems).toBe(testEntities.length)
      expect(stats.indices).toBe(1)
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0)
    })

    it('should track cache size', () => {
      ftsManager.search('test')
      ftsManager.search('documentation')

      const stats = ftsManager.getStatistics()
      expect(stats.cacheSize).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Performance', () => {
    beforeEach(() => {
      // Create large dataset
      const largeEntities: UnifiedEntity[] = []
      for (let i = 0; i < 1000; i++) {
        largeEntities.push({
          id: String(i),
          type: 'task',
          name: `Task ${i}`,
          title: `Task ${i}`,
          description: `Description for task ${i}`,
          status: 'open',
          priority: 'medium',
          createdAt: new Date(2024, 0, 1 + i).toISOString(),
          updatedAt: new Date(2024, 0, 2 + i).toISOString(),
          keywords: [`keyword${i}`],
        })
      }

      ftsManager.createIndex(
        { id: 'large', name: 'Large', fields: ['title', 'description'], enabled: true },
        largeEntities
      )
    })

    it('should search quickly', () => {
      const start = Date.now()
      const results = ftsManager.search('Task 500', { limit: 10 })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100) // Should be under 100ms
      expect(results.length).toBeGreaterThan(0)
    })

    it('should handle concurrent searches efficiently', () => {
      const start = Date.now()

      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve(ftsManager.search(`Task ${i * 100}`))
      )

      Promise.all(promises).then(() => {
        const duration = Date.now() - start
        expect(duration).toBeLessThan(500) // Should be under 500ms for 10 searches
      })
    })
  })

  describe('Optimization', () => {
    beforeEach(() => {
      ftsManager.createIndex(
        { id: 'all', name: 'All', fields: ['title'], enabled: true },
        testEntities
      )
    })

    it('should optimize FTS index', () => {
      expect(() => {
        ftsManager.optimize()
      }).not.toThrow()
    })
  })

  describe('Cache', () => {
    beforeEach(() => {
      ftsManager.createIndex(
        { id: 'all', name: 'All', fields: ['title'], enabled: true },
        testEntities
      )
    })

    it('should use cache for repeated queries', () => {
      const query = 'login bug'

      // First search - should populate cache
      ftsManager.search(query)

      // Second search - should hit cache
      const start = Date.now()
      ftsManager.search(query)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(10) // Should be very fast from cache
    })

    it('should clear cache', () => {
      ftsManager.search('test')
      ftsManager.search('documentation')

      ftsManager.clearCache()

      const stats = ftsManager.getStatistics()
      expect(stats.cacheSize).toBe(0)
    })
  })
})
