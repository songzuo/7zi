//  - Test file with complex type issues
/**
// @ts-expect-error - Mock type compatibility issues
 * Database Optimization Initialization Tests
 * 测试数据库优化初始化功能
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  initializeDatabaseOptimization,
  cleanupDatabaseOptimization,
  getOptimizationStatus,
} from '../optimization-init'
import { logger } from '@/lib/logger'
// Mock dependencies
vi.mock('@/lib/db', () => ({
  getDatabaseAsync: vi.fn().mockResolvedValue({
    prepare: vi.fn().mockReturnValue({
      all: vi.fn().mockReturnValue([]),
      get: vi.fn().mockReturnValue({}),
    }),
  }),
}))
vi.mock('../cache', () => ({
  startCacheCleanup: vi.fn().mockReturnValue(123), // Mock interval ID
  warmupCache: vi.fn().mockResolvedValue(undefined),
}))
describe('Database Optimization Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment
    Reflect.deleteProperty(process.env, 'NODE_ENV')
  })
  afterEach(() => {
    // Clean up after tests
    try {
      cleanupDatabaseOptimization()
    } catch (error) {
      // Ignore cleanup errors in tests
    }
  })
  describe('initializeDatabaseOptimization', () => {
    it('should initialize without errors', async () => {
      await expect(initializeDatabaseOptimization()).resolves.not.toThrow()
    })
    it('should connect to database', async () => {
      const { getDatabaseAsync } = await import('@/lib/db')
      await initializeDatabaseOptimization()
      expect(getDatabaseAsync).toHaveBeenCalled()
    })
    it('should warm up cache', async () => {
      const { warmupCache } = await import('../cache')
      await initializeDatabaseOptimization()
      expect(warmupCache).toHaveBeenCalled()
    })
    it('should start cache cleanup interval', async () => {
      const { startCacheCleanup } = await import('../cache')
      await initializeDatabaseOptimization()
      expect(startCacheCleanup).toHaveBeenCalledWith(60 * 1000)
    })
    it('should log initialization steps', async () => {
      // 实现走的是项目自带的结构化日志 logger.info(msg, { category: 'db' })，
      // 没有任何 console.log —— 断言必须打在这个通道上。
      const loggerSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})
      await initializeDatabaseOptimization()
      expect(loggerSpy).toHaveBeenCalledWith('Initializing database optimization...', {
        category: 'db',
      })
      expect(loggerSpy).toHaveBeenCalledWith('Database connected', { category: 'db' })
      expect(loggerSpy).toHaveBeenCalledWith('Warming up cache...', { category: 'db' })
      expect(loggerSpy).toHaveBeenCalledWith('Cache warmed up successfully', { category: 'db' })
      expect(loggerSpy).toHaveBeenCalledWith('Starting periodic cache cleanup...', {
        category: 'db',
      })
      expect(loggerSpy).toHaveBeenCalledWith('Cache cleanup started', { category: 'db' })
      expect(loggerSpy).toHaveBeenCalledWith('Initialization completed', { category: 'db' })
      loggerSpy.mockRestore()
    })
    it('should detect production environment', async () => {
      // Reflect.set 绕开 TS 对 process.env 只读索引签名的限制（不用 as any）
      Reflect.set(process.env, 'NODE_ENV', 'production')
      // 实现里生产环境分支是 logger.debug('Production mode detected', ...)
      const loggerSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {})
      await initializeDatabaseOptimization()
      expect(loggerSpy).toHaveBeenCalledWith('Production mode detected', { category: 'db' })
      loggerSpy.mockRestore()
    })
    it('should handle initialization errors', async () => {
      const { getDatabaseAsync } = await import('@/lib/db')
      // 实现通过 getDatabaseAsync() 拿连接；这里让连接失败来触发 catch 分支。
      vi.mocked(getDatabaseAsync).mockRejectedValueOnce(new Error('init failed'))

      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
      await expect(initializeDatabaseOptimization()).rejects.toThrow('init failed')
      // 实现把原始 Error 实例直接交给 logger.error(msg, error, context)
      expect(loggerSpy).toHaveBeenCalledWith(
        'Initialization failed',
        expect.any(Error),
        expect.objectContaining({ category: 'db' })
      )
      loggerSpy.mockRestore()
    })
    it('should throw error when database connection fails', async () => {
      const { getDatabaseAsync } = await import('@/lib/db')
      vi.mocked(getDatabaseAsync).mockRejectedValueOnce(new Error('DB connection failed'))
      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
      await expect(initializeDatabaseOptimization()).rejects.toThrow('DB connection failed')
      loggerSpy.mockRestore()
    })
    it('should throw error when cache warmup fails', async () => {
      const { warmupCache } = await import('../cache')
      vi.mocked(warmupCache).mockRejectedValueOnce(new Error('Warmup failed'))
      const loggerSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
      await expect(initializeDatabaseOptimization()).rejects.toThrow('Warmup failed')
      loggerSpy.mockRestore()
    })
  })
  describe('cleanupDatabaseOptimization', () => {
    it('should cleanup without errors', () => {
      expect(() => cleanupDatabaseOptimization()).not.toThrow()
    })
    it('should clear cache cleanup interval', async () => {
      await initializeDatabaseOptimization()
      const loggerSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})
      cleanupDatabaseOptimization()
      expect(loggerSpy).toHaveBeenCalledWith(
        'Cleaning up database optimization resources...',
        { category: 'db' }
      )
      expect(loggerSpy).toHaveBeenCalledWith('Cache cleanup interval cleared', { category: 'db' })
      loggerSpy.mockRestore()
    })
    it('should log cleanup completion', () => {
      const loggerSpy = vi.spyOn(logger, 'info').mockImplementation(() => {})
      cleanupDatabaseOptimization()
      expect(loggerSpy).toHaveBeenCalledWith('Cleanup completed', { category: 'db' })
      loggerSpy.mockRestore()
    })
    it('should handle cleanup when not initialized', () => {
      expect(() => cleanupDatabaseOptimization()).not.toThrow()
    })
  })
  describe('getOptimizationStatus', () => {
    it('should return correct initial status', () => {
      const status = getOptimizationStatus()
      expect(status).toHaveProperty('isCacheCleanupRunning')
      expect(status).toHaveProperty('cleanupIntervalMs')
      expect(typeof status.isCacheCleanupRunning).toBe('boolean')
      expect(typeof status.cleanupIntervalMs).toBe('number')
    })
    it('should return false for isCacheCleanupRunning before initialization', () => {
      const status = getOptimizationStatus()
      expect(status.isCacheCleanupRunning).toBe(false)
    })
    it('should return 0 for cleanupIntervalMs before initialization', () => {
      const status = getOptimizationStatus()
      expect(status.cleanupIntervalMs).toBe(0)
    })
    it('should return true for isCacheCleanupRunning after initialization', async () => {
      await initializeDatabaseOptimization()
      const status = getOptimizationStatus()
      expect(status.isCacheCleanupRunning).toBe(true)
    })
    it('should return correct interval after initialization', async () => {
      await initializeDatabaseOptimization()
      const status = getOptimizationStatus()
      expect(status.cleanupIntervalMs).toBe(60 * 1000)
    })
    it('should return false for isCacheCleanupRunning after cleanup', async () => {
      await initializeDatabaseOptimization()
      cleanupDatabaseOptimization()
      const status = getOptimizationStatus()
      expect(status.isCacheCleanupRunning).toBe(false)
    })
    it('should return 0 for cleanupIntervalMs after cleanup', async () => {
      await initializeDatabaseOptimization()
      cleanupDatabaseOptimization()
      const status = getOptimizationStatus()
      expect(status.cleanupIntervalMs).toBe(0)
    })
  })
  describe('initialization and cleanup cycle', () => {
    it('should handle multiple initialize and cleanup cycles', async () => {
      // First cycle
      await initializeDatabaseOptimization()
      let status = getOptimizationStatus()
      expect(status.isCacheCleanupRunning).toBe(true)
      cleanupDatabaseOptimization()
      status = getOptimizationStatus()
      expect(status.isCacheCleanupRunning).toBe(false)
      // Second cycle
      await initializeDatabaseOptimization()
      status = getOptimizationStatus()
      expect(status.isCacheCleanupRunning).toBe(true)
      cleanupDatabaseOptimization()
      status = getOptimizationStatus()
      expect(status.isCacheCleanupRunning).toBe(false)
    })
    it('should handle re-initialization without cleanup', async () => {
      await initializeDatabaseOptimization()
      await initializeDatabaseOptimization()
      const status = getOptimizationStatus()
      expect(status.isCacheCleanupRunning).toBe(true)
    })
  })
  describe('default export', () => {
    it('should export default object with methods', async () => {
      const module = await import('../optimization-init')
      expect(module.default).toHaveProperty('initialize')
      expect(module.default).toHaveProperty('cleanup')
      expect(module.default).toHaveProperty('getStatus')
      expect(module.default.initialize).toBe(initializeDatabaseOptimization)
      expect(module.default.cleanup).toBe(cleanupDatabaseOptimization)
      expect(module.default.getStatus).toBe(getOptimizationStatus)
    })
    it('should provide access to methods via default export', async () => {
      const module = await import('../optimization-init')
      await expect(module.default.initialize()).resolves.not.toThrow()
      expect(() => module.default.cleanup()).not.toThrow()
      const status = module.default.getStatus()
      expect(status).toHaveProperty('isCacheCleanupRunning')
    })
  })
})
