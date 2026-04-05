/**
 * @fileoverview Unified Search Manager Tests
 * @description Tests for the unified search manager that integrates all search components
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { UnifiedSearchManager } from '@/lib/search/unified-search'
import type { UnifiedEntity } from '@/lib/search/types'

describe('UnifiedSearchManager', () => {
  let searchManager: UnifiedSearchManager
  let testEntities: {
    tasks: UnifiedEntity[]
    projects: UnifiedEntity[]
    members: UnifiedEntity[]
    agents: UnifiedEntity[]
  }

  beforeEach(() => {
    searchManager = new UnifiedSearchManager({
      enableFTS: false, // Disable FTS for faster tests
      defaultEngine: 'fuse',
    })

    testEntities = {
      tasks: [
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
          type: 'task',
          name: 'Fix performance issue',
          title: 'Fix performance issue',
          description: 'Optimize database queries',
          status: 'closed',
          priority: 'high',
          assignee: 'johndoe',
          labels: [{ name: 'performance', color: 'green' }],
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-11T00:00:00Z',
          keywords: ['performance', 'database'],
        },
      ],
      projects: [
        {
          id: 'p1',
          type: 'project',
          name: 'Website Redesign',
          title: 'Website Redesign',
          description: 'Complete overhaul of company website',
          status: 'active',
          owner: 'admin',
          members: ['johndoe', 'janedoe'],
          createdAt: '2024-01-15T00:00:00Z',
          updatedAt: '2024-01-16T00:00:00Z',
        },
      ],
      members: [
        {
          id: 'm1',
          type: 'member',
          name: 'John Doe',
          login: 'johndoe',
          displayName: 'John Doe',
          role: 'developer',
          email: 'john@example.com',
        },
        {
          id: 'm2',
          type: 'member',
          name: 'Jane Doe',
          login: 'janedoe',
          displayName: 'Jane Doe',
          role: 'designer',
          email: 'jane@example.com',
        },
      ],
      agents: [
        {
          id: 'a1',
          type: 'agent',
          name: 'Code Review Bot',
          title: 'Code Review Bot',
          description: 'Automated code review assistant',
          status: 'active',
          agentType: 'bot',
          capabilities: ['review', 'code-analysis'],
          lastActive: '2024-01-20T00:00:00Z',
        },
      ],
    }
  })

  afterEach(() => {
    searchManager.close()
  })

  describe('Initialization', () => {
    it('should initialize with entities', async () => {
      await searchManager.initialize(testEntities)

      const stats = searchManager.getStatistics()
      expect(stats.index.totalItems).toBeGreaterThan(0)
    })

    it('should initialize with empty entities', async () => {
      await searchManager.initialize({})

      const stats = searchManager.getStatistics()
      expect(stats.index.totalItems).toBe(0)
    })
  })

  describe('Basic Search', () => {
    beforeEach(async () => {
      await searchManager.initialize(testEntities)
    })

    it('should return results for query', async () => {
      const { results, pagination, statistics } = await searchManager.search({
        query: 'login bug',
      })

      expect(results.length).toBeGreaterThan(0)
      expect(pagination.total).toBeGreaterThan(0)
      expect(statistics.query).toBe('login bug')
      expect(statistics.executionTime).toBeGreaterThan(0)
    })

    it('should return empty results for empty query', async () => {
      const { results, pagination } = await searchManager.search({
        query: '',
      })

      expect(results).toEqual([])
      expect(pagination.total).toBe(0)
    })

    it('should limit results', async () => {
      const { results, pagination } = await searchManager.search({
        query: '',
        limit: 2,
      })

      expect(results.length).toBeLessThanOrEqual(2)
      expect(pagination.pageSize).toBe(2)
    })

    it('should apply offset', async () => {
      const { results: results1 } = await searchManager.search({
        query: '',
        limit: 2,
        offset: 0,
      })

      const { results: results2 } = await searchManager.search({
        query: '',
        limit: 2,
        offset: 2,
      })

      expect(results1).not.toEqual(results2)
    })

    it('should return correct pagination info', async () => {
      const { pagination } = await searchManager.search({
        query: '',
        limit: 2,
        offset: 0,
      })

      expect(pagination.page).toBe(1)
      expect(pagination.pageSize).toBe(2)
      expect(pagination.hasMore).toBe(true)
    })
  })

  describe('Target Filtering', () => {
    beforeEach(async () => {
      await searchManager.initialize(testEntities)
    })

    it('should search only tasks', async () => {
      const { results } = await searchManager.search({
        query: '',
        targets: ['task'],
      })

      expect(results.every(r => r.item.type === 'task')).toBe(true)
    })

    it('should search only projects', async () => {
      const { results } = await searchManager.search({
        query: '',
        targets: ['project'],
      })

      expect(results.every(r => r.item.type === 'project')).toBe(true)
    })

    it('should search multiple target types', async () => {
      const { results } = await searchManager.search({
        query: '',
        targets: ['task', 'project'],
      })

      expect(results.every(r => r.item.type === 'task' || r.item.type === 'project')).toBe(true)
    })

    it('should search all types by default', async () => {
      const { results } = await searchManager.search({
        query: '',
      })

      const types = new Set(results.map(r => r.item.type))
      expect(types.has('task')).toBe(true)
      expect(types.has('project')).toBe(true)
      expect(types.has('member')).toBe(true)
      expect(types.has('agent')).toBe(true)
    })
  })

  describe('Filtering', () => {
    beforeEach(async () => {
      await searchManager.initialize(testEntities)
    })

    it('should filter by status', async () => {
      const { results } = await searchManager.search({
        query: '',
        filters: {
          status: ['open'],
        },
      })

      expect(results.every(r => (r.item as any).status === 'open')).toBe(true)
    })

    it('should filter by priority', async () => {
      const { results } = await searchManager.search({
        query: '',
        filters: {
          priority: ['high'],
        },
      })

      expect(results.every(r => (r.item as any).priority === 'high')).toBe(true)
    })

    it('should filter by assignee', async () => {
      const { results } = await searchManager.search({
        query: '',
        filters: {
          assignees: ['johndoe'],
        },
      })

      expect(results.every(r => (r.item as any).assignee === 'johndoe')).toBe(true)
    })

    it('should filter by date range', async () => {
      const { results } = await searchManager.search({
        query: '',
        filters: {
          createdAfter: '2024-01-05T00:00:00Z',
          createdBefore: '2024-01-15T00:00:00Z',
        },
      })

      expect(results.length).toBeGreaterThan(0)
      for (const result of results) {
        const date = new Date(result.item.createdAt).getTime()
        expect(date).toBeGreaterThanOrEqual(new Date('2024-01-05T00:00:00Z').getTime())
        expect(date).toBeLessThanOrEqual(new Date('2024-01-15T00:00:00Z').getTime())
      }
    })

    it('should apply multiple filters', async () => {
      const { results } = await searchManager.search({
        query: '',
        filters: {
          status: ['open'],
          priority: ['high'],
        },
      })

      expect(results.every(r => {
        const item = r.item as any
        return item.status === 'open' && item.priority === 'high'
      })).toBe(true)
    })
  })

  describe('Sorting', () => {
    beforeEach(async () => {
      await searchManager.initialize(testEntities)
    })

    it('should sort by relevance (default)', async () => {
      const { results } = await searchManager.search({
        query: 'login',
        sort: 'relevance',
      })

      expect(results.length).toBeGreaterThan(0)
      // Results should be sorted by relevance score
    })

    it('should sort by date descending', async () => {
      const { results } = await searchManager.search({
        query: '',
        sort: 'date-desc',
      })

      for (let i = 1; i < results.length; i++) {
        const prevDate = new Date(results[i - 1].item.updatedAt || results[i - 1].item.createdAt).getTime()
        const currDate = new Date(results[i].item.updatedAt || results[i].item.createdAt).getTime()
        expect(prevDate).toBeGreaterThanOrEqual(currDate)
      }
    })

    it('should sort by date ascending', async () => {
      const { results } = await searchManager.search({
        query: '',
        sort: 'date-asc',
      })

      for (let i = 1; i < results.length; i++) {
        const prevDate = new Date(results[i - 1].item.updatedAt || results[i - 1].item.createdAt).getTime()
        const currDate = new Date(results[i].item.updatedAt || results[i].item.createdAt).getTime()
        expect(prevDate).toBeLessThanOrEqual(currDate)
      }
    })

    it('should sort by name ascending', async () => {
      const { results } = await searchManager.search({
        query: '',
        sort: 'name-asc',
      })

      for (let i = 1; i < results.length; i++) {
        const prevName = results[i - 1].item.name || results[i - 1].item.title || ''
        const currName = results[i].item.name || results[i].item.title || ''
        expect(prevName.localeCompare(currName)).toBeLessThanOrEqual(0)
      }
    })

    it('should sort by hybrid', async () => {
      const { results } = await searchManager.search({
        query: 'task',
        sort: 'hybrid',
      })

      expect(results.length).toBeGreaterThan(0)
      // Hybrid sort combines relevance with recency
    })
  })

  describe('Search Engines', () => {
    beforeEach(async () => {
      await searchManager.initialize(testEntities)
    })

    it('should use Fuse.js engine', async () => {
      const { results, statistics } = await searchManager.search({
        query: 'login',
        engine: 'fuse',
      })

      expect(results.length).toBeGreaterThan(0)
      expect(statistics.engine).toBe('fuse')
    })

    it('should use memory engine', async () => {
      const { results, statistics } = await searchManager.search({
        query: 'login',
        engine: 'memory',
      })

      expect(results.length).toBeGreaterThan(0)
      expect(statistics.engine).toBe('memory')
    })

    it('should use default engine when not specified', async () => {
      const { statistics } = await searchManager.search({
        query: 'login',
      })

      expect(statistics.engine).toBe('fuse')
    })
  })

  describe('Autocomplete', () => {
    beforeEach(async () => {
      await searchManager.initialize(testEntities)
    })

    it('should return autocomplete suggestions', async () => {
      const suggestions = await searchManager.getAutocompleteSuggestions('log')

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions[0].text).toContain('log')
    })

    it('should limit suggestions', async () => {
      const suggestions = await searchManager.getAutocompleteSuggestions('', {
        limit: 2,
      })

      expect(suggestions.length).toBeLessThanOrEqual(2)
    })

    it('should filter by target type', async () => {
      const suggestions = await searchManager.getAutocompleteSuggestions('', {
        targets: ['task'],
      })

      expect(suggestions.every(s => s.type === 'task')).toBe(true)
    })

    it('should include entity information', async () => {
      const suggestions = await searchManager.getAutocompleteSuggestions('login')

      const taskSuggestion = suggestions.find(s => s.text === 'Fix login bug')
      expect(taskSuggestion).toBeDefined()
      expect(taskSuggestion?.entity).toBeDefined()
      expect(taskSuggestion?.entity?.id).toBe('1')
    })
  })

  describe('Statistics', () => {
    beforeEach(async () => {
      await searchManager.initialize(testEntities)
    })

    it('should return search statistics', async () => {
      const { statistics } = await searchManager.search({
        query: 'login',
      })

      expect(statistics.query).toBe('login')
      expect(statistics.totalResults).toBeGreaterThan(0)
      expect(statistics.executionTime).toBeGreaterThan(0)
      expect(statistics.engine).toBeDefined()
      expect(statistics.filtersApplied).toBeGreaterThanOrEqual(0)
      expect(statistics.resultsByType).toBeDefined()
    })

    it('should track filters applied', async () => {
      const { statistics } = await searchManager.search({
        query: '',
        filters: {
          status: ['open'],
          priority: ['high'],
        },
      })

      expect(statistics.filtersApplied).toBe(2)
    })

    it('should group results by type', async () => {
      const { statistics } = await searchManager.search({
        query: '',
      })

      expect(statistics.resultsByType.task).toBeGreaterThan(0)
      expect(statistics.resultsByType.project).toBeGreaterThan(0)
      expect(statistics.resultsByType.member).toBeGreaterThan(0)
      expect(statistics.resultsByType.agent).toBeGreaterThan(0)
    })
  })

  describe('Entity Management', () => {
    beforeEach(async () => {
      await searchManager.initialize(testEntities)
    })

    it('should update entities', async () => {
      const updatedTask: UnifiedEntity = {
        ...testEntities.tasks[0],
        name: 'Updated Task Name',
        title: 'Updated Task Name',
      }

      await searchManager.updateEntities([updatedTask])

      const { results } = await searchManager.search({
        query: 'Updated Task Name',
      })

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.name).toBe('Updated Task Name')
    })

    it('should update multiple entities', async () => {
      const updatedTasks = testEntities.tasks.map(task => ({
        ...task,
        name: `Updated ${task.name}`,
        title: `Updated ${task.title}`,
      }))

      await searchManager.updateEntities(updatedTasks)

      const { results } = await searchManager.search({
        query: 'Updated',
      })

      expect(results.length).toBe(testEntities.tasks.length)
    })
  })

  describe('Cache Management', () => {
    beforeEach(async () => {
      await searchManager.initialize(testEntities)
    })

    it('should clear caches', () => {
      expect(() => {
        searchManager.clearCaches()
      }).not.toThrow()
    })

    it('should return statistics', () => {
      const stats = searchManager.getStatistics()

      expect(stats.fuse).toBeDefined()
      expect(stats.index).toBeDefined()
    })
  })

  describe('Performance', () => {
    beforeEach(async () => {
      // Create large dataset
      const largeTasks: UnifiedEntity[] = []
      for (let i = 0; i < 1000; i++) {
        largeTasks.push({
          id: String(i),
          type: 'task',
          name: `Task ${i}`,
          title: `Task ${i}`,
          description: `Description for task ${i}`,
          status: i % 2 === 0 ? 'open' : 'closed',
          priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
          assignee: `user${i % 10}`,
          labels: [{ name: `label${i % 5}`, color: '#000000' }],
          createdAt: new Date(2024, 0, 1 + i).toISOString(),
          updatedAt: new Date(2024, 0, 2 + i).toISOString(),
          keywords: [`keyword${i}`],
        })
      }

      await searchManager.initialize({ tasks: largeTasks })
    })

    it('should search quickly', async () => {
      const start = Date.now()
      const { results } = await searchManager.search({
        query: 'Task 500',
        limit: 10,
      })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(200) // Should be under 200ms
      expect(results.length).toBeGreaterThan(0)
    })

    it('should handle filters efficiently', async () => {
      const start = Date.now()
      const { results } = await searchManager.search({
        query: '',
        filters: {
          status: ['open'],
          priority: ['high'],
        },
        limit: 50,
      })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(300) // Should be under 300ms
      expect(results.length).toBeGreaterThan(0)
    })
  })
})