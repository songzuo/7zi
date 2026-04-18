/**
 * Unit tests for Audit Log Storage
 */

import { describe, test, expect, beforeEach } from '@jest/globals'
import { AuditLogStorage } from './storage'
import { AuditLogEntry, AuditSearchFilters } from './types'

describe('AuditLogStorage', () => {
  let storage: AuditLogStorage
  let sampleEntries: AuditLogEntry[]

  beforeEach(() => {
    storage = new AuditLogStorage()
    sampleEntries = generateSampleEntries(100)
    sampleEntries.forEach(entry => storage.add(entry))
  })

  describe('Add and Get', () => {
    test('should add and retrieve an entry', () => {
      const entry: AuditLogEntry = {
        id: 'test-1',
        timestamp: new Date(),
        userId: 'user-1',
        action: 'create',
        resourceType: 'document',
        status: 'success',
      }

      storage.add(entry)
      const retrieved = storage.get('test-1')
      expect(retrieved).toEqual(entry)
    })

    test('should handle multiple adds', () => {
      expect(storage.count()).toBe(100)
    })
  })

  describe('Search - Basic Filters', () => {
    test('should filter by userId', () => {
      const result = storage.search({ userId: 'user-1' })
      expect(result.total).toBeGreaterThan(0)
      result.entries.forEach(entry => {
        expect(entry.userId).toBe('user-1')
      })
    })

    test('should filter by action', () => {
      const result = storage.search({ action: 'create' })
      expect(result.total).toBeGreaterThan(0)
      result.entries.forEach(entry => {
        expect(entry.action).toBe('create')
      })
    })

    test('should filter by resourceType', () => {
      const result = storage.search({ resourceType: 'document' })
      expect(result.total).toBeGreaterThan(0)
      result.entries.forEach(entry => {
        expect(entry.resourceType).toBe('document')
      })
    })

    test('should filter by status', () => {
      const result = storage.search({ status: 'success' })
      expect(result.total).toBeGreaterThan(0)
      result.entries.forEach(entry => {
        expect(entry.status).toBe('success')
      })
    })

    test('should filter by tenantId', () => {
      const result = storage.search({ tenantId: 'tenant-1' })
      expect(result.total).toBeGreaterThan(0)
      result.entries.forEach(entry => {
        expect(entry.tenantId).toBe('tenant-1')
      })
    })
  })

  describe('Search - Time Range', () => {
    test('should filter by start date', () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const result = storage.search({ startDate: yesterday })
      expect(result.total).toBeGreaterThan(0)
      result.entries.forEach(entry => {
        expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(yesterday.getTime())
      })
    })

    test('should filter by end date', () => {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const result = storage.search({ endDate: tomorrow })
      expect(result.total).toBeGreaterThan(0)
      result.entries.forEach(entry => {
        expect(entry.timestamp.getTime()).toBeLessThanOrEqual(tomorrow.getTime())
      })
    })

    test('should filter by time range', () => {
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      const result = storage.search({
        startDate: oneDayAgo,
        endDate: oneHourAgo,
      })

      result.entries.forEach(entry => {
        expect(entry.timestamp.getTime()).toBeGreaterThanOrEqual(oneDayAgo.getTime())
        expect(entry.timestamp.getTime()).toBeLessThanOrEqual(oneHourAgo.getTime())
      })
    })
  })

  describe('Search - Full Text', () => {
    test('should search by action text', () => {
      const result = storage.search({ searchText: 'create' })
      expect(result.total).toBeGreaterThan(0)
      result.entries.forEach(entry => {
        const text = `${entry.action} ${entry.resourceType}`.toLowerCase()
        expect(text).toContain('create')
      })
    })

    test('should search in details', () => {
      const entry: AuditLogEntry = {
        id: 'search-test',
        timestamp: new Date(),
        userId: 'user-1',
        action: 'update',
        resourceType: 'document',
        details: { description: 'This is a test document' },
        status: 'success',
      }

      storage.add(entry)

      const result = storage.search({ searchText: 'test document' })
      expect(result.total).toBeGreaterThan(0)
      expect(result.entries.some(e => e.id === 'search-test')).toBe(true)
    })
  })

  describe('Search - Composite Filters', () => {
    test('should apply multiple filters', () => {
      // Add specific entry for this test
      const testEntry: AuditLogEntry = {
        id: 'multi-filter-test',
        timestamp: new Date(),
        userId: 'user-1',
        action: 'create',
        resourceType: 'document',
        status: 'success',
      }
      storage.add(testEntry)

      const result = storage.search({
        userId: 'user-1',
        action: 'create',
        status: 'success',
      })

      expect(result.total).toBeGreaterThan(0)
      result.entries.forEach(entry => {
        expect(entry.userId).toBe('user-1')
        expect(entry.action).toBe('create')
        expect(entry.status).toBe('success')
      })
    })

    test('should handle filters with no matches', () => {
      const result = storage.search({
        userId: 'non-existent-user',
        action: 'create',
      })

      expect(result.total).toBe(0)
      expect(result.entries).toHaveLength(0)
    })
  })

  describe('Search - Pagination', () => {
    test('should paginate results', () => {
      const page1 = storage.search({}, { page: 1, pageSize: 10 })
      const page2 = storage.search({}, { page: 2, pageSize: 10 })

      expect(page1.entries).toHaveLength(10)
      expect(page2.entries).toHaveLength(10)
      expect(page1.entries).not.toEqual(page2.entries)
    })

    test('should handle page beyond available', () => {
      const result = storage.search({}, { page: 999, pageSize: 10 })
      expect(result.entries).toHaveLength(0)
    })

    test('should calculate total pages correctly', () => {
      const result = storage.search({}, { page: 1, pageSize: 25 })
      expect(result.totalPages).toBe(Math.ceil(100 / 25))
    })
  })

  describe('Search - Sorting', () => {
    test('should sort by timestamp desc (default)', () => {
      const result = storage.search({}, { sortBy: 'timestamp', sortOrder: 'desc' })

      for (let i = 1; i < result.entries.length; i++) {
        expect(result.entries[i - 1].timestamp.getTime()).toBeGreaterThanOrEqual(
          result.entries[i].timestamp.getTime()
        )
      }
    })

    test('should sort by timestamp asc', () => {
      const result = storage.search({}, { sortBy: 'timestamp', sortOrder: 'asc' })

      for (let i = 1; i < result.entries.length; i++) {
        expect(result.entries[i - 1].timestamp.getTime()).toBeLessThanOrEqual(
          result.entries[i].timestamp.getTime()
        )
      }
    })

    test('should sort by action', () => {
      const result = storage.search({}, { sortBy: 'action', sortOrder: 'asc' })

      for (let i = 1; i < result.entries.length; i++) {
        const comparison = result.entries[i - 1].action.localeCompare(result.entries[i].action)
        expect(comparison).toBeLessThanOrEqual(0)
      }
    })
  })

  describe('Performance', () => {
    test('should search quickly with 10,000 records', async () => {
      // Add more entries for performance test
      for (let i = 0; i < 10000; i++) {
        storage.add(generateSampleEntry(i))
      }

      const start = Date.now()
      const result = storage.search({
        action: 'create',
        status: 'success',
      })
      const duration = Date.now() - start

      expect(result.total).toBeGreaterThan(0)
      expect(duration).toBeLessThan(500) // Should complete in < 500ms
    })
  })

  describe('Count', () => {
    test('should count all entries', () => {
      expect(storage.count()).toBe(100)
    })

    test('should count with filters', () => {
      const count = storage.count({ status: 'success' })
      const result = storage.search({ status: 'success' })

      expect(count).toBe(result.total)
    })
  })

  describe('Clear', () => {
    test('should clear all entries', () => {
      storage.clear()
      expect(storage.count()).toBe(0)
    })
  })
})

/**
 * Generate sample audit log entries
 */
function generateSampleEntries(count: number): AuditLogEntry[] {
  const entries: AuditLogEntry[] = []
  const actions = ['create', 'read', 'update', 'delete']
  const resourceTypes = ['document', 'user', 'tenant', 'settings', 'log']
  const statuses: ('success' | 'failure' | 'pending')[] = ['success', 'failure', 'pending']

  for (let i = 0; i < count; i++) {
    entries.push(generateSampleEntry(i, actions, resourceTypes, statuses))
  }

  return entries
}

function generateSampleEntry(
  index: number,
  actions = ['create', 'read', 'update', 'delete'],
  resourceTypes = ['document', 'user', 'tenant', 'settings', 'log'],
  statuses: ('success' | 'failure' | 'pending')[] = ['success', 'failure', 'pending']
): AuditLogEntry {
  const now = new Date()
  return {
    id: `audit-${index}`,
    timestamp: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    userId: `user-${(index % 10) + 1}`,
    username: `user${(index % 10) + 1}`,
    action: actions[Math.floor(Math.random() * actions.length)],
    resourceType: resourceTypes[Math.floor(Math.random() * resourceTypes.length)],
    resourceId: `resource-${index}`,
    tenantId: `tenant-${(index % 5) + 1}`,
    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    details: {
      index,
      timestamp: now.toISOString(),
    },
  }
}
