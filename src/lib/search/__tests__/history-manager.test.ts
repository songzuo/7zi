/**
 * @fileoverview Search history manager tests
 * @description Tests for search history management
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SearchHistoryManager } from '@/lib/search/history-manager'

describe('SearchHistoryManager', () => {
  let historyManager: SearchHistoryManager

  beforeEach(() => {
    // Create a new instance for each test
    historyManager = new SearchHistoryManager(10, 86400000) // 1 day max age
  })

  describe('add', () => {
    it('should add a search to history', () => {
      historyManager.add({
        query: 'test search',
        resultCount: 5,
        target: 'tasks',
      })

      const all = historyManager.getAll()
      expect(all).toHaveLength(1)
      expect(all[0].query).toBe('test search')
      expect(all[0].resultCount).toBe(5)
      expect(all[0].target).toBe('tasks')
      expect(typeof all[0].timestamp).toBe('number')
    })

    it('should remove duplicate queries (case-insensitive)', () => {
      historyManager.add({ query: 'Test Search', resultCount: 5, target: 'tasks' })
      historyManager.add({ query: 'test search', resultCount: 3, target: 'projects' })

      const all = historyManager.getAll()
      expect(all).toHaveLength(1)
      expect(all[0].query).toBe('test search')
      expect(all[0].target).toBe('projects') // Most recent target
    })

    it('should limit history to max size', () => {
      for (let i = 0; i < 15; i++) {
        historyManager.add({ query: `query ${i}`, resultCount: i, target: 'tasks' })
      }

      const all = historyManager.getAll()
      expect(all.length).toBeLessThanOrEqual(10)
    })
  })

  describe('getAll', () => {
    it('should return all history entries', () => {
      historyManager.add({ query: 'query 1', resultCount: 1, target: 'tasks' })
      historyManager.add({ query: 'query 2', resultCount: 2, target: 'projects' })
      historyManager.add({ query: 'query 3', resultCount: 3, target: 'members' })

      const all = historyManager.getAll()
      expect(all).toHaveLength(3)
    })

    it('should return empty array when no history', () => {
      const all = historyManager.getAll()
      expect(all).toEqual([])
    })
  })

  describe('getRecent', () => {
    it('should return recent history entries', () => {
      historyManager.add({ query: 'query 1', resultCount: 1, target: 'tasks' })
      historyManager.add({ query: 'query 2', resultCount: 2, target: 'projects' })
      historyManager.add({ query: 'query 3', resultCount: 3, target: 'members' })

      const recent = historyManager.getRecent(2)
      expect(recent).toHaveLength(2)
      expect(recent[0].query).toBe('query 3')
      expect(recent[1].query).toBe('query 2')
    })

    it('should limit to specified number', () => {
      for (let i = 0; i < 10; i++) {
        historyManager.add({ query: `query ${i}`, resultCount: i, target: 'tasks' })
      }

      const recent = historyManager.getRecent(5)
      expect(recent).toHaveLength(5)
    })
  })

  describe('search', () => {
    it('should search within history', () => {
      historyManager.add({ query: 'login bug fix', resultCount: 5, target: 'tasks' })
      historyManager.add({ query: 'update documentation', resultCount: 2, target: 'projects' })
      historyManager.add({ query: 'login authentication', resultCount: 3, target: 'tasks' })

      const results = historyManager.search('login')
      expect(results).toHaveLength(2)
      expect(results[0].query).toContain('login')
      expect(results[1].query).toContain('login')
    })

    it('should be case-insensitive', () => {
      historyManager.add({ query: 'Login Issue', resultCount: 5, target: 'tasks' })

      const results = historyManager.search('login')
      expect(results).toHaveLength(1)
    })

    it('should limit results', () => {
      for (let i = 0; i < 10; i++) {
        historyManager.add({ query: `test ${i}`, resultCount: i, target: 'tasks' })
      }

      const results = historyManager.search('test', 3)
      expect(results.length).toBeLessThanOrEqual(3)
    })
  })

  describe('getByTarget', () => {
    it('should return history for specific target', () => {
      historyManager.add({ query: 'query 1', resultCount: 1, target: 'tasks' })
      historyManager.add({ query: 'query 2', resultCount: 2, target: 'projects' })
      historyManager.add({ query: 'query 3', resultCount: 3, target: 'tasks' })

      const tasks = historyManager.getByTarget('tasks')
      expect(tasks).toHaveLength(2)
      expect(tasks.every(h => h.target === 'tasks')).toBe(true)
    })

    it('should return empty array for non-existent target', () => {
      const results = historyManager.getByTarget('agents')
      expect(results).toEqual([])
    })
  })

  describe('getPopular', () => {
    it('should return most frequent searches', () => {
      historyManager.add({ query: 'search', resultCount: 1, target: 'tasks' })
      historyManager.add({ query: 'search', resultCount: 2, target: 'projects' })
      historyManager.add({ query: 'search', resultCount: 3, target: 'members' })
      historyManager.add({ query: 'login', resultCount: 1, target: 'tasks' })

      const popular = historyManager.getPopular()
      expect(popular[0].query).toBe('search')
      expect(popular[0].count).toBe(3)
      expect(popular[1].query).toBe('login')
      expect(popular[1].count).toBe(1)
    })

    it('should limit results', () => {
      for (let i = 0; i < 15; i++) {
        historyManager.add({ query: `query ${i}`, resultCount: 1, target: 'tasks' })
      }

      const popular = historyManager.getPopular(5)
      expect(popular).toHaveLength(5)
    })

    it('should be case-insensitive', () => {
      historyManager.add({ query: 'Search', resultCount: 1, target: 'tasks' })
      historyManager.add({ query: 'search', resultCount: 2, target: 'projects' })

      const popular = historyManager.getPopular()
      expect(popular[0].count).toBe(2)
    })
  })

  describe('getTrending', () => {
    it('should return recent and frequent searches', async () => {
      const now = Date.now()

      // Add recent searches (within 7 days)
      for (let i = 0; i < 5; i++) {
        historyManager.add({
          query: 'recent query',
          resultCount: 1,
          target: 'tasks',
        })
      }

      // Add old search (outside 7 days)
      // Note: This requires mocking Date.now() or the maxAge parameter
      const oldHistoryManager = new SearchHistoryManager(10, 1000) // 1 second max age
      oldHistoryManager.add({ query: 'old query', resultCount: 10, target: 'tasks' })

      // Wait for it to become old
      await new Promise(resolve => setTimeout(resolve, 1100))

      const trending = historyManager.getTrending()
      expect(trending.some(t => t.query === 'recent query')).toBe(true)
    })

    it('should limit results', () => {
      for (let i = 0; i < 15; i++) {
        historyManager.add({ query: `query ${i % 3}`, resultCount: 1, target: 'tasks' })
      }

      const trending = historyManager.getTrending(5)
      expect(trending).toHaveLength(5)
    })
  })

  describe('remove', () => {
    it('should remove specific entry', () => {
      historyManager.add({ query: 'query 1', resultCount: 1, target: 'tasks' })
      historyManager.add({ query: 'query 2', resultCount: 2, target: 'projects' })

      historyManager.remove('query 1')

      const all = historyManager.getAll()
      expect(all).toHaveLength(1)
      expect(all[0].query).toBe('query 2')
    })

    it('should be case-insensitive', () => {
      historyManager.add({ query: 'Query', resultCount: 1, target: 'tasks' })

      historyManager.remove('query')

      const all = historyManager.getAll()
      expect(all).toHaveLength(0)
    })
  })

  describe('clear', () => {
    it('should clear all history', () => {
      historyManager.add({ query: 'query 1', resultCount: 1, target: 'tasks' })
      historyManager.add({ query: 'query 2', resultCount: 2, target: 'projects' })

      historyManager.clear()

      const all = historyManager.getAll()
      expect(all).toEqual([])
    })
  })

  describe('clearOld', () => {
    it('should remove entries older than threshold', async () => {
      const shortLivedManager = new SearchHistoryManager(10, 1000) // 1 second

      shortLivedManager.add({ query: 'old query', resultCount: 1, target: 'tasks' })

      // Wait for it to become old
      await new Promise(resolve => setTimeout(resolve, 1100))

      shortLivedManager.clearOld()

      const all = shortLivedManager.getAll()
      expect(all).toHaveLength(0)
    })
  })

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      historyManager.add({ query: 'search 1', resultCount: 5, target: 'tasks' })
      historyManager.add({ query: 'search 1', resultCount: 3, target: 'projects' })
      historyManager.add({ query: 'search 2', resultCount: 10, target: 'tasks' })

      const stats = historyManager.getStatistics()

      expect(stats.totalEntries).toBe(2) // Duplicates removed
      expect(stats.uniqueQueries).toBe(2)
      expect(stats.averageResults).toBe(7.5) // (5 + 10) / 2
      expect(stats.searchesByTarget.tasks).toBe(2)
      expect(stats.searchesByTarget.projects).toBe(1)
      expect(stats.oldestEntry).toBeTruthy()
      expect(stats.newestEntry).toBeTruthy()
    })

    it('should return zero statistics when empty', () => {
      const stats = historyManager.getStatistics()

      expect(stats.totalEntries).toBe(0)
      expect(stats.uniqueQueries).toBe(0)
      expect(stats.averageResults).toBe(0)
    })
  })

  describe('export', () => {
    it('should export history as JSON', () => {
      historyManager.add({ query: 'query 1', resultCount: 1, target: 'tasks' })
      historyManager.add({ query: 'query 2', resultCount: 2, target: 'projects' })

      const exported = historyManager.export()
      const parsed = JSON.parse(exported)

      expect(parsed.entries).toHaveLength(2)
      expect(parsed.exportedAt).toBeTruthy()
    })
  })

  describe('import', () => {
    it('should import valid history', () => {
      const data = JSON.stringify({
        entries: [
          {
            query: 'imported query 1',
            timestamp: Date.now(),
            resultCount: 5,
            target: 'tasks',
          },
          {
            query: 'imported query 2',
            timestamp: Date.now(),
            resultCount: 10,
            target: 'projects',
          },
        ],
        exportedAt: Date.now(),
      })

      const result = historyManager.import(data)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)

      const all = historyManager.getAll()
      expect(all).toHaveLength(2)
    })

    it('should skip duplicates on import', () => {
      historyManager.add({ query: 'existing', resultCount: 1, target: 'tasks' })

      const data = JSON.stringify({
        entries: [
          {
            query: 'existing',
            timestamp: Date.now(),
            resultCount: 5,
            target: 'projects',
          },
          {
            query: 'new',
            timestamp: Date.now(),
            resultCount: 10,
            target: 'tasks',
          },
        ],
        exportedAt: Date.now(),
      })

      const result = historyManager.import(data)

      expect(result.success).toBe(true)
      expect(result.imported).toBe(1)

      const all = historyManager.getAll()
      expect(all).toHaveLength(2)
    })

    it('should handle invalid JSON', () => {
      const result = historyManager.import('invalid json')

      expect(result.success).toBe(false)
      expect(result.imported).toBe(0)
      expect(result.error).toBeTruthy()
    })

    it('should handle invalid format', () => {
      const data = JSON.stringify({ entries: 'not an array' })

      const result = historyManager.import(data)

      expect(result.success).toBe(false)
      expect(result.imported).toBe(0)
    })
  })
})
