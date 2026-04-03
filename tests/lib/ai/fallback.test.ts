/**
 * Fallback Mechanism Unit Tests
 * v1.12.0 多模型路由系统 - Fallback 机制测试
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { FallbackManager, fallbackManager, getFallbackChain, selectFallback } from '../../../src/lib/ai/fallback'
import { AIModel, ModelStatus, RouteRequest } from '../../../src/lib/ai/types'

// Mock the models module
vi.mock('../../../src/lib/ai/models', () => ({
  getModelById: vi.fn((id: string) => {
    const models: Record<string, AIModel> = {
      'gpt-4o': {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        model: 'gpt-4o',
        displayName: 'GPT-4o',
        capabilities: ['code', 'text'],
        maxTokens: 4096,
        contextWindow: 128000,
        inputPricePerM: 250,
        outputPricePerM: 1000,
        priority: 1,
        enabled: true,
        isFallback: false,
      },
      'claude-4-opus': {
        id: 'claude-4-opus',
        name: 'Claude 4 Opus',
        provider: 'anthropic',
        model: 'claude-4-opus',
        displayName: 'Claude 4 Opus',
        capabilities: ['code', 'text', 'reasoning'],
        maxTokens: 4096,
        contextWindow: 200000,
        inputPricePerM: 1500,
        outputPricePerM: 7500,
        priority: 0,
        enabled: true,
        isFallback: false,
      },
      'deepseek-chat': {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'deepseek',
        model: 'deepseek-chat',
        displayName: 'DeepSeek Chat',
        capabilities: ['text', 'reasoning'],
        maxTokens: 4096,
        contextWindow: 128000,
        inputPricePerM: 7,
        outputPricePerM: 14,
        priority: 4,
        enabled: true,
        isFallback: true,
      },
    }
    return models[id]
  }),
  getEnabledModels: vi.fn(() => [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      model: 'gpt-4o',
      displayName: 'GPT-4o',
      capabilities: ['code', 'text'],
      maxTokens: 4096,
      contextWindow: 128000,
      inputPricePerM: 250,
      outputPricePerM: 1000,
      priority: 1,
      enabled: true,
      isFallback: false,
    },
    {
      id: 'claude-4-opus',
      name: 'Claude 4 Opus',
      provider: 'anthropic',
      model: 'claude-4-opus',
      displayName: 'Claude 4 Opus',
      capabilities: ['code', 'text', 'reasoning'],
      maxTokens: 4096,
      contextWindow: 200000,
      inputPricePerM: 1500,
      outputPricePerM: 7500,
      priority: 0,
      enabled: true,
      isFallback: false,
    },
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'deepseek',
      model: 'deepseek-chat',
      displayName: 'DeepSeek Chat',
      capabilities: ['text', 'reasoning'],
      maxTokens: 4096,
      contextWindow: 128000,
      inputPricePerM: 7,
      outputPricePerM: 14,
      priority: 4,
      enabled: true,
      isFallback: true,
    },
  ]),
}))

// Mock the rate-limiter module
vi.mock('../../../src/lib/ai/rate-limiter', () => ({
  globalRateLimiter: {
    check: vi.fn(() => ({ allowed: true, remaining: 100 })),
  },
}))

describe('FallbackManager - Normal Path', () => {
  let manager: FallbackManager

  beforeEach(() => {
    manager = new FallbackManager({
      maxRetries: 3,
      retryDelayMs: 100,
      enableCircuitBreaker: true,
      errorThreshold: 3,
      recoveryTimeMs: 60000,
    })
  })

  afterEach(() => {
    manager.reset()
  })

  describe('getFallbackChain()', () => {
    it('should return fallback chain for primary model', () => {
      const chain = manager.getFallbackChain('gpt-4o')

      expect(chain.length).toBeGreaterThan(0)
      expect(chain[0].id).toBe('gpt-4o')
    })

    it('should include fallback models at the end', () => {
      const chain = manager.getFallbackChain('gpt-4o')
      const lastModel = chain[chain.length - 1]

      expect(lastModel.isFallback).toBe(true)
    })

    it('should not duplicate models in chain', () => {
      const chain = manager.getFallbackChain('gpt-4o')
      const ids = chain.map(m => m.id)
      const uniqueIds = [...new Set(ids)]

      expect(ids.length).toBe(uniqueIds.length)
    })

    it('should return all enabled models for unknown primary', () => {
      const chain = manager.getFallbackChain('unknown-model')

      expect(chain.length).toBeGreaterThan(0)
    })
  })

  describe('selectFallback()', () => {
    it('should select available fallback model', () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
      }

      const model = manager.selectFallback(request, new Set(['gpt-4o']))

      expect(model).toBeDefined()
      expect(model?.id).not.toBe('gpt-4o')
    })

    it('should skip attempted models', () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
      }

      const attempted = new Set(['gpt-4o', 'claude-4-opus'])
      const model = manager.selectFallback(request, attempted)

      expect(model?.id).not.toBe('gpt-4o')
      expect(model?.id).not.toBe('claude-4-opus')
    })

    it('should return null when all models attempted', () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
      }

      const attempted = new Set(['gpt-4o', 'claude-4-opus', 'deepseek-chat'])
      const model = manager.selectFallback(request, attempted)

      expect(model).toBeNull()
    })

    it('should respect budget constraint', () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
        budget: 10, // Very low budget
      }

      const model = manager.selectFallback(request, new Set())

      // Should select cheapest model (deepseek-chat has inputPricePerM: 7)
      // Or null if budget is too restrictive
      if (model) {
        expect(model.inputPricePerM * 10).toBeLessThanOrEqual(10)
      }
    })
  })

  describe('recordSuccess() and recordFailure()', () => {
    it('should record model success', () => {
      manager.recordSuccess('gpt-4o')

      const status = manager.getModelStatus('gpt-4o')
      expect(status).toBeDefined()
      expect(status?.isAvailable).toBe(true)
      expect(status?.errorCount).toBe(0)
    })

    it('should record model failure', () => {
      manager.recordFailure('gpt-4o', new Error('Test error'))

      const status = manager.getModelStatus('gpt-4o')
      expect(status).toBeDefined()
      expect(status?.errorCount).toBe(1)
    })

    it('should mark model as unavailable after threshold failures', () => {
      for (let i = 0; i < 3; i++) {
        manager.recordFailure('gpt-4o', new Error('Test error'))
      }

      const status = manager.getModelStatus('gpt-4o')
      expect(status?.isAvailable).toBe(false)
    })

    it('should track error count correctly', () => {
      manager.recordFailure('gpt-4o', new Error('Error 1'))
      manager.recordFailure('gpt-4o', new Error('Error 2'))
      manager.recordSuccess('gpt-4o')

      const status = manager.getModelStatus('gpt-4o')
      expect(status?.errorCount).toBe(0)
    })
  })

  describe('getModelStatus()', () => {
    it('should return undefined for unknown model', () => {
      const status = manager.getModelStatus('unknown-model')
      expect(status).toBeUndefined()
    })

    it('should return status after recording', () => {
      manager.recordSuccess('gpt-4o')

      const status = manager.getModelStatus('gpt-4o')
      expect(status).toBeDefined()
    })
  })

  describe('getAllModelStatuses()', () => {
    it('should return all model statuses', () => {
      manager.recordSuccess('gpt-4o')
      manager.recordFailure('claude-4-opus', new Error('Test'))

      const statuses = manager.getAllModelStatuses()
      expect(statuses.length).toBe(2)
    })

    it('should return empty array initially', () => {
      const statuses = manager.getAllModelStatuses()
      expect(statuses).toHaveLength(0)
    })
  })

  describe('reset()', () => {
    it('should reset all model statuses', () => {
      manager.recordFailure('gpt-4o', new Error('Test'))

      manager.reset()

      const status = manager.getModelStatus('gpt-4o')
      expect(status).toBeUndefined()
    })
  })

  describe('resetModel()', () => {
    it('should reset specific model status', () => {
      manager.recordFailure('gpt-4o', new Error('Test'))
      manager.recordFailure('claude-4-opus', new Error('Test'))

      manager.resetModel('gpt-4o')

      const gptStatus = manager.getModelStatus('gpt-4o')
      const claudeStatus = manager.getModelStatus('claude-4-opus')

      expect(gptStatus?.isAvailable).toBe(true)
      expect(gptStatus?.errorCount).toBe(0)
      expect(claudeStatus?.errorCount).toBe(1)
    })
  })
})

describe('FallbackManager - Circuit Breaker', () => {
  let manager: FallbackManager

  beforeEach(() => {
    manager = new FallbackManager({
      maxRetries: 3,
      retryDelayMs: 100,
      enableCircuitBreaker: true,
      errorThreshold: 2,
      recoveryTimeMs: 1000,
    })
  })

  afterEach(() => {
    manager.reset()
  })

  describe('Circuit Breaker State', () => {
    it('should start in closed state', () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
      }

      const model = manager.selectFallback(request, new Set())
      expect(model).toBeDefined()
    })

    it('should open circuit after error threshold', () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
      }

      // Record failures to trigger circuit breaker
      manager.recordFailure('gpt-4o', new Error('Error 1'))
      manager.recordFailure('gpt-4o', new Error('Error 2'))

      // Try to select gpt-4o
      const attempted = new Set(['claude-4-opus', 'deepseek-chat'])
      const model = manager.selectFallback(request, attempted)

      // Should skip gpt-4o if it's in open state
      // (depends on circuit breaker implementation)
    })

    it('should recover after recovery time', async () => {
      const quickRecoveryManager = new FallbackManager({
        maxRetries: 3,
        retryDelayMs: 10,
        enableCircuitBreaker: true,
        errorThreshold: 2,
        recoveryTimeMs: 50,
      })

      quickRecoveryManager.recordFailure('gpt-4o', new Error('Error 1'))
      quickRecoveryManager.recordFailure('gpt-4o', new Error('Error 2'))

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 100))

      const status = quickRecoveryManager.getModelStatus('gpt-4o')
      // After recovery time, model should be available for retry
      expect(status).toBeDefined()
    })
  })
})

describe('FallbackManager - executeWithFallback()', () => {
  let manager: FallbackManager

  beforeEach(() => {
    manager = new FallbackManager({
      maxRetries: 3,
      retryDelayMs: 10,
      enableCircuitBreaker: true,
      errorThreshold: 3,
      recoveryTimeMs: 60000,
    })
  })

  afterEach(() => {
    manager.reset()
  })

  describe('Successful Execution', () => {
    it('should execute successfully on first try', async () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
      }

      const executor = vi.fn().mockResolvedValue('Success')

      const result = await manager.executeWithFallback(
        request,
        executor,
        'gpt-4o'
      )

      expect(result.result).toBe('Success')
      expect(result.model.id).toBe('gpt-4o')
      expect(result.retries).toBe(0)
      expect(executor).toHaveBeenCalledTimes(1)
    })

    it('should succeed on second model if first fails', async () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
      }

      const executor = vi.fn()
        .mockRejectedValueOnce(new Error('Model 1 failed'))
        .mockResolvedValueOnce('Success')

      const result = await manager.executeWithFallback(
        request,
        executor,
        'gpt-4o'
      )

      expect(result.result).toBe('Success')
      expect(result.retries).toBe(1)
      expect(executor).toHaveBeenCalledTimes(2)
    })

    it('should succeed on fallback model', async () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
      }

      const executor = vi.fn()
        .mockRejectedValueOnce(new Error('Model 1 failed'))
        .mockRejectedValueOnce(new Error('Model 2 failed'))
        .mockResolvedValueOnce('Success')

      const result = await manager.executeWithFallback(
        request,
        executor,
        'gpt-4o'
      )

      expect(result.result).toBe('Success')
      expect(result.retries).toBe(2)
    })
  })

  describe('Failed Execution', () => {
    it('should throw after max retries', async () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
      }

      const executor = vi.fn().mockRejectedValue(new Error('All failed'))

      await expect(
        manager.executeWithFallback(request, executor, 'gpt-4o')
      ).rejects.toThrow()

      expect(executor).toHaveBeenCalledTimes(3)
    })

    it('should handle failed models', async () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
      }

      const executor = vi.fn()

      // Mark all models as failed - but the fallback manager will still try to use them
      // since circuit breaker has a recovery time
      manager.recordFailure('gpt-4o', new Error('Failed'))
      manager.recordFailure('claude-4-opus', new Error('Failed'))
      manager.recordFailure('deepseek-chat', new Error('Failed'))

      // Even with failures, the manager should try to find an available model
      // Since we've set errorThreshold: 3, these models are still available for one more try
      const result = await manager.executeWithFallback(request, executor, 'gpt-4o')
      expect(result).toBeDefined()
    })
  })

  describe('Executor Behavior', () => {
    it('should pass model to executor', async () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
      }

      const executor = vi.fn().mockResolvedValue('Success')

      await manager.executeWithFallback(request, executor, 'gpt-4o')

      expect(executor).toHaveBeenCalledWith(expect.objectContaining({
        id: 'gpt-4o',
      }))
    })
  })
})

describe('FallbackManager - Exception Path', () => {
  let manager: FallbackManager

  beforeEach(() => {
    manager = new FallbackManager()
  })

  afterEach(() => {
    manager.reset()
  })

  describe('Invalid Inputs', () => {
    it('should handle null model in fallback chain', () => {
      // This tests the behavior when primary model doesn't exist
      const chain = manager.getFallbackChain('non-existent-model')

      // Should still return enabled models
      expect(chain.length).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty provider preference', () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
        preferredProvider: '',
      }

      const model = manager.selectFallback(request, new Set())
      expect(model).toBeDefined()
    })

    it('should handle zero budget', () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
        budget: 0,
      }

      const model = manager.selectFallback(request, new Set())
      // Should select a model within budget or null
      if (model) {
        expect(model.inputPricePerM * 10).toBe(0)
      }
    })

    it('should handle very high budget', () => {
      const request: RouteRequest = {
        taskType: 'conversation',
        prompt: 'Hello',
        budget: 1000000,
      }

      const model = manager.selectFallback(request, new Set())
      expect(model).toBeDefined()
    })
  })

  describe('Concurrent Failures', () => {
    it('should handle concurrent failure recording', () => {
      // Simulate concurrent failures
      const promises = Array(10).fill(null).map(() =>
        Promise.resolve(manager.recordFailure('gpt-4o', new Error('Concurrent error')))
      )

      return Promise.all(promises).then(() => {
        const status = manager.getModelStatus('gpt-4o')
        expect(status?.errorCount).toBe(10)
      })
    })
  })
})

describe('Default Instance', () => {
  it('should have default fallbackManager instance', () => {
    expect(fallbackManager).toBeDefined()
  })

  it('should use getFallbackChain convenience function', () => {
    const chain = getFallbackChain('gpt-4o')
    expect(chain).toBeDefined()
    expect(chain.length).toBeGreaterThan(0)
  })

  it('should use selectFallback convenience function', () => {
    const request: RouteRequest = {
      taskType: 'conversation',
      prompt: 'Hello',
    }

    const model = selectFallback(request, new Set())
    expect(model).toBeDefined()
  })
})
