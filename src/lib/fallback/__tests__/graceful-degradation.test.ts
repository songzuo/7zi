import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DegradationManager,
  FeatureFlags,
  NetworkCondition,
  getDegradationManager,
  getNetworkCondition,
  withDegradation,
  DegradationLevel,
} from '../graceful-degradation'

describe('FeatureFlags', () => {
  let flags: FeatureFlags

  beforeEach(() => {
    flags = new FeatureFlags()
  })

  describe('Basic Operations', () => {
    it('should return true by default for unknown feature', () => {
      expect(flags.getFlag('unknown')).toBe(true)
    })

    it('should set and get flag', () => {
      flags.setFlag('feature1', false)
      expect(flags.getFlag('feature1')).toBe(false)
    })

    it('should check if feature is enabled', () => {
      flags.setFlag('feature1', true)
      expect(flags.isEnabled('feature1')).toBe(true)
    })

    it('should disable feature', () => {
      flags.disable('feature1')
      expect(flags.isEnabled('feature1')).toBe(false)
    })

    it('should enable feature', () => {
      flags.disable('feature1')
      flags.enable('feature1')
      expect(flags.isEnabled('feature1')).toBe(true)
    })

    it('should set multiple flags', () => {
      flags.setFlags({ feature1: true, feature2: false })
      expect(flags.getFlag('feature1')).toBe(true)
      expect(flags.getFlag('feature2')).toBe(false)
    })

    it('should get all flags as object', () => {
      flags.setFlags({ feature1: true, feature2: false })
      const all = flags.getAllFlags()
      expect(all).toEqual({ feature1: true, feature2: false })
    })
  })
})

describe('DegradationManager', () => {
  beforeEach(() => {
    // Use getDegradationManager to get fresh instance
  })

  describe('Singleton', () => {
    it('should return same instance', () => {
      const manager1 = DegradationManager.getInstance()
      const manager2 = DegradationManager.getInstance()
      expect(manager1).toBe(manager2)
    })

    it('should accept config on first call', () => {
      const manager = DegradationManager.getInstance({
        enabled: false,
        autoDegrade: true,
      })
      expect(manager).toBeDefined()
    })
  })

  describe('Feature Degradation', () => {
    it('should track degraded features', () => {
      const manager = DegradationManager.getInstance()

      manager.registerStrategy('heavy-feature', {
        level: 'partial',
        shouldApply: async () => true,
        fallback: () => {},
      })

      // Direct disable
      manager.getFeatureFlags().disable('heavy-feature')
      expect(manager.isDegraded('heavy-feature')).toBe(true)
    })

    it('should record errors and auto-degrade', async () => {
      const manager = DegradationManager.getInstance({
        errorThreshold: 2,
        autoDegrade: true,
      })

      // Register feature
      manager.registerStrategy('test-feature', {
        level: 'partial',
        shouldApply: async () => false,
        fallback: () => {},
      })

      // Record errors up to threshold
      manager.recordError('test-feature')
      manager.recordError('test-feature')

      expect(manager.isDegraded('test-feature')).toBe(true)
    })

    it('should reset error count and re-enable feature', () => {
      const manager = DegradationManager.getInstance({
        errorThreshold: 1,
        autoDegrade: true,
      })

      manager.registerStrategy('test-feature', {
        level: 'partial',
        shouldApply: async () => false,
        fallback: () => {},
      })

      // Manually disable
      manager.getFeatureFlags().disable('test-feature')
      expect(manager.isDegraded('test-feature')).toBe(true)

      manager.resetErrorCount('test-feature')
      expect(manager.isDegraded('test-feature')).toBe(false)
    })

    it('should record performance and auto-degrade on slow', () => {
      const manager = DegradationManager.getInstance({
        performanceThreshold: 100,
        autoDegrade: true,
      })

      manager.registerStrategy('slow-feature', {
        level: 'partial',
        shouldApply: async () => false,
        fallback: () => {},
      })

      manager.recordPerformance('slow-feature', 150)

      expect(manager.isDegraded('slow-feature')).toBe(true)
    })

    it('should get circuit breaker for feature', () => {
      const manager = DegradationManager.getInstance()
      const breaker = manager.getCircuitBreaker('test-feature')

      expect(breaker).toBeDefined()
      expect(breaker.getHealth().state).toBeDefined()
    })

    it('should return correct status', () => {
      const manager = DegradationManager.getInstance({
        errorThreshold: 1,
        autoDegrade: true,
      })

      manager.registerStrategy('test-feature', {
        level: 'partial',
        shouldApply: async () => false,
        fallback: () => {},
      })

      // Manually degrade
      manager.getFeatureFlags().disable('test-feature')
      manager.recordError('test-feature')

      const status = manager.getStatus()
      expect(status.degradedFeatures).toContain('test-feature')
      expect(status.errorCounts['test-feature']).toBe(1)
    })
  })

  describe('withDegradation decorator', () => {
    it('should return fallback when degraded', async () => {
      const manager = getDegradationManager()
      manager.updateConfig({
        errorThreshold: 0, // Any error triggers degradation
        autoDegrade: true,
      })

      // Register the feature before recording error
      manager.registerStrategy('decorated-feature', {
        level: 'partial',
        shouldApply: async () => false,
        fallback: () => {},
      })

      manager.recordError('decorated-feature')

      const decorated = withDegradation(async () => 'result', {
        feature: 'decorated-feature',
        fallback: 'fallback-value',
      })

      const result = await decorated()
      expect(result).toBe('fallback-value')
    })

    it('should call original function when not degraded', async () => {
      const manager = DegradationManager.getInstance()

      const decorated = withDegradation(async () => 'result', {
        feature: 'not-degraded',
        fallback: 'fallback',
      })

      const result = await decorated()
      expect(result).toBe('result')
    })

    it('should call fallbackFn when provided and degraded', async () => {
      const manager = DegradationManager.getInstance({
        errorThreshold: 0,
        autoDegrade: true,
      })

      manager.registerStrategy('with-fn', {
        level: 'partial',
        shouldApply: async () => false,
        fallback: () => {},
      })

      manager.recordError('with-fn')

      const fallbackFn = vi.fn(() => 'fallback-fn-result')

      const decorated = withDegradation(async () => 'result', {
        feature: 'with-fn',
        fallbackFn,
      })

      await decorated()
      expect(fallbackFn).toHaveBeenCalled()
    })
  })
})

describe('NetworkCondition', () => {
  it('should be singleton', () => {
    const nc1 = NetworkCondition.getInstance()
    const nc2 = NetworkCondition.getInstance()
    expect(nc1).toBe(nc2)
  })

  it('should return network status', async () => {
    const nc = NetworkCondition.getInstance()
    const status = await nc.check()

    expect(typeof status.isSlow).toBe('boolean')
    expect(typeof status.isOffline).toBe('boolean')
  })
})

describe('getDegradationManager', () => {
  it('should return singleton instance', () => {
    const manager1 = getDegradationManager()
    const manager2 = getDegradationManager()
    expect(manager1).toBe(manager2)
  })
})

describe('getNetworkCondition', () => {
  it('should return singleton instance', () => {
    const nc1 = getNetworkCondition()
    const nc2 = getNetworkCondition()
    expect(nc1).toBe(nc2)
  })
})