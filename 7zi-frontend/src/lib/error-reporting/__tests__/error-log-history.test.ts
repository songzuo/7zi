/**
 * Error Log History Tests
 * 错误日志历史记录测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

// Mock logger
vi.fn('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('ErrorLogHistoryService', () => {
  let ErrorLogHistoryService: typeof import('../error-log-history').ErrorLogHistoryService
  let service: InstanceType<typeof ErrorLogHistoryService>

  beforeEach(async () => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {})

    // Dynamic import to get fresh module
    const module = await import('../error-log-history')
    ErrorLogHistoryService = module.ErrorLogHistoryService
    service = new ErrorLogHistoryService({ maxEntries: 100, persist: false })
    service.init()
  })

  describe('init', () => {
    it('should initialize with empty logs', () => {
      expect(service.getCount()).toBe(0)
    })

    it('should load from localStorage if data exists', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify([
        { id: 'log-1', timestamp: Date.now(), type: 'TestError', message: 'Test', severity: 'medium', category: 'test', context: {}, resolved: false }
      ]))

      const service2 = new ErrorLogHistoryService({ persist: true })
      service2.init()

      expect(service2.getCount()).toBe(1)
    })
  })

  describe('add', () => {
    it('should add an error log entry', () => {
      const entry = service.add({
        type: 'TestError',
        message: 'Test error message',
        severity: 'high',
        category: 'test',
        context: { key: 'value' },
      })

      expect(entry.id).toBeDefined()
      expect(entry.timestamp).toBeDefined()
      expect(entry.resolved).toBe(false)
      expect(entry.type).toBe('TestError')
      expect(entry.message).toBe('Test error message')
      expect(entry.severity).toBe('high')
      expect(entry.context).toEqual({ key: 'value' })
    })

    it('should limit entries to maxEntries', () => {
      const smallService = new ErrorLogHistoryService({ maxEntries: 5, persist: false })
      smallService.init()

      for (let i = 0; i < 10; i++) {
        smallService.add({
          type: 'TestError',
          message: `Error ${i}`,
          severity: 'medium',
          category: 'test',
          context: {},
        })
      }

      expect(smallService.getCount()).toBe(5)
    })
  })

  describe('markResolved', () => {
    it('should mark an error as resolved', () => {
      const entry = service.add({
        type: 'TestError',
        message: 'Test error',
        severity: 'medium',
        category: 'test',
        context: {},
      })

      const result = service.markResolved(entry.id, 'test-user')

      expect(result).toBe(true)
      const resolved = service.getById(entry.id)
      expect(resolved?.resolved).toBe(true)
      expect(resolved?.resolvedAt).toBeDefined()
      expect(resolved?.resolvedBy).toBe('test-user')
    })

    it('should return false for non-existent id', () => {
      const result = service.markResolved('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('query', () => {
    beforeEach(() => {
      const now = Date.now()
      service.add({ type: 'ErrorA', message: 'Error A', severity: 'high', category: 'api', context: {}, timestamp: now - 1000 })
      service.add({ type: 'ErrorB', message: 'Error B', severity: 'medium', category: 'ui', context: {}, timestamp: now - 500 })
      service.add({ type: 'ErrorC', message: 'Error C', severity: 'low', category: 'api', context: {}, timestamp: now })
    })

    it('should query by type', () => {
      const results = service.query({ type: 'ErrorA' })

      expect(results.length).toBe(1)
      expect(results[0].type).toBe('ErrorA')
    })

    it('should query by severity', () => {
      const results = service.query({ severity: 'high' })

      expect(results.length).toBe(1)
      expect(results[0].severity).toBe('high')
    })

    it('should query by category', () => {
      const results = service.query({ category: 'api' })

      expect(results.length).toBe(2)
    })

    it('should query by resolved status', () => {
      const results = service.query({ resolved: false })

      expect(results.length).toBe(3)
    })

    it('should apply limit and offset', () => {
      const results = service.query({ limit: 1, offset: 1 })

      expect(results.length).toBe(1)
    })

    it('should query by time range', () => {
      const now = Date.now()
      // All 3 errors are within 2000ms of now
      const results = service.query({ startTime: now - 2000, endTime: now })

      expect(results.length).toBe(3)
    })
  })

  describe('getStats', () => {
    beforeEach(() => {
      service.add({ type: 'ErrorA', message: 'Error A', severity: 'high', category: 'api', context: {} })
      service.add({ type: 'ErrorB', message: 'Error B', severity: 'medium', category: 'ui', context: {} })
      service.add({ type: 'ErrorC', message: 'Error C', severity: 'high', category: 'api', context: {} })

      const entry = service.add({ type: 'ErrorD', message: 'Error D', severity: 'low', category: 'api', context: {} })
      service.markResolved(entry.id)
    })

    it('should return correct statistics', () => {
      const stats = service.getStats()

      expect(stats.total).toBe(4)
      expect(stats.bySeverity).toEqual({ high: 2, medium: 1, low: 1 })
      expect(stats.byCategory).toEqual({ api: 3, ui: 1 })
      expect(stats.byType).toEqual({ ErrorA: 1, ErrorB: 1, ErrorC: 1, ErrorD: 1 })
      expect(stats.resolved).toBe(1)
      expect(stats.unresolved).toBe(3)
    })
  })

  describe('getRecent', () => {
    it('should return recent errors', () => {
      for (let i = 0; i < 15; i++) {
        service.add({
          type: 'TestError',
          message: `Error ${i}`,
          severity: 'medium',
          category: 'test',
          context: {},
        })
      }

      const recent = service.getRecent(5)

      expect(recent.length).toBe(5)
    })
  })

  describe('getUnresolved', () => {
    it('should return only unresolved errors', () => {
      const entry1 = service.add({ type: 'Error1', message: 'Error 1', severity: 'medium', category: 'test', context: {} })
      service.add({ type: 'Error2', message: 'Error 2', severity: 'medium', category: 'test', context: {} })
      service.markResolved(entry1.id)

      const unresolved = service.getUnresolved()

      expect(unresolved.length).toBe(1)
      expect(unresolved[0].type).toBe('Error2')
    })
  })

  describe('getById', () => {
    it('should return error by id', () => {
      const entry = service.add({
        type: 'TestError',
        message: 'Test error',
        severity: 'medium',
        category: 'test',
        context: {},
      })

      const found = service.getById(entry.id)

      expect(found).toBeDefined()
      expect(found?.message).toBe('Test error')
    })

    it('should return undefined for non-existent id', () => {
      const found = service.getById('non-existent')

      expect(found).toBeUndefined()
    })
  })

  describe('clear', () => {
    it('should clear all logs', () => {
      service.add({ type: 'TestError', message: 'Error', severity: 'medium', category: 'test', context: {} })

      service.clear()

      expect(service.getCount()).toBe(0)
    })
  })

  describe('export/import', () => {
    it('should export logs as JSON', () => {
      service.add({ type: 'TestError', message: 'Error', severity: 'medium', category: 'test', context: {} })

      const exported = service.export()

      expect(exported).toContain('TestError')
    })

    it('should import logs from JSON', () => {
      const data = JSON.stringify([
        { id: 'log-1', timestamp: Date.now(), type: 'ImportedError', message: 'Imported', severity: 'high', category: 'import', context: {}, resolved: false }
      ])

      service.import(data)

      expect(service.getCount()).toBe(1)
      expect(service.getById('log-1')?.type).toBe('ImportedError')
    })
  })

  describe('markResolvedBatch', () => {
    it('should mark multiple errors as resolved', () => {
      const entry1 = service.add({ type: 'Error1', message: 'Error 1', severity: 'medium', category: 'test', context: {} })
      const entry2 = service.add({ type: 'Error2', message: 'Error 2', severity: 'medium', category: 'test', context: {} })
      const entry3 = service.add({ type: 'Error3', message: 'Error 3', severity: 'medium', category: 'test', context: {} })

      const count = service.markResolvedBatch([entry1.id, entry2.id, entry3.id], 'batch-user')

      expect(count).toBe(3)
      expect(service.getUnresolved().length).toBe(0)
    })
  })
})
