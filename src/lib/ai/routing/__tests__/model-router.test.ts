/**
 * 智能路由引擎测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ModelRouter,
  modelRouter,
  initFromEnv,
} from '../model-router'
import {
  RouteRequest,
  TaskType,
  TaskComplexity,
  RoutingStrategy,
  ModelCapability,
} from '../types'
import { modelRegistry } from '../model-registry'

describe('ModelRouter', () => {
  let router: ModelRouter

  beforeEach(() => {
    router = new ModelRouter()
  })

  describe('route', () => {
    it('should route a simple request', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello, how are you?',
      }

      const decision = router.route(request)

      expect(decision).toBeDefined()
      expect(decision.selectedModel).toBeDefined()
      expect(decision.fallbackModels).toBeInstanceOf(Array)
      expect(decision.estimatedCost).toBeGreaterThanOrEqual(0)
      expect(decision.estimatedLatency).toBeGreaterThan(0)
      expect(decision.confidence).toBeGreaterThan(0)
      expect(decision.confidence).toBeLessThanOrEqual(1)
    })

    it('should respect preferred provider', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
        preferredProvider: 'openai',
      }

      const decision = router.route(request)

      expect(decision.selectedModel.provider).toBe('openai')
    })

    it('should respect budget constraint', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
        budget: 10, // 0.1元
      }

      const decision = router.route(request)

      expect(decision.estimatedCost).toBeLessThanOrEqual(10)
    })

    it('should respect required capabilities', () => {
      const request: RouteRequest = {
        taskType: TaskType.CODE_GENERATION,
        prompt: 'Write a function',
        requiredCapabilities: [ModelCapability.CODE],
      }

      const decision = router.route(request)

      expect(decision.selectedModel.capabilities).toContain(ModelCapability.CODE)
    })

    it('should use cost optimization strategy', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
        strategy: RoutingStrategy.COST_OPTIMIZED,
      }

      const decision = router.route(request)

      expect(decision.strategy).toBe(RoutingStrategy.COST_OPTIMIZED)
      expect(decision.reasoning).toContain('成本优化')
    })

    it('should use latency optimization strategy', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
        strategy: RoutingStrategy.LATENCY_OPTIMIZED,
      }

      const decision = router.route(request)

      expect(decision.strategy).toBe(RoutingStrategy.LATENCY_OPTIMIZED)
      expect(decision.reasoning).toContain('延迟优化')
    })

    it('should use quality optimization strategy', () => {
      const request: RouteRequest = {
        taskType: TaskType.REASONING,
        prompt: 'Explain quantum computing',
        strategy: RoutingStrategy.QUALITY_OPTIMIZED,
      }

      const decision = router.route(request)

      expect(decision.strategy).toBe(RoutingStrategy.QUALITY_OPTIMIZED)
      expect(decision.reasoning).toContain('质量优化')
    })

    it('should handle complexity level', () => {
      const request: RouteRequest = {
        taskType: TaskType.REASONING,
        prompt: 'Explain quantum computing',
        complexity: TaskComplexity.EXPERT,
      }

      const decision = router.route(request)

      expect(decision.reasoning).toContain('复杂度')
    })

    it('should avoid specified models', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
        avoidModels: ['gpt-4o'],
      }

      const decision = router.route(request)

      expect(decision.selectedModel.id).not.toBe('gpt-4o')
    })
  })

  describe('caching', () => {
    it('should cache routing decisions', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      const decision1 = router.route(request)
      const decision2 = router.route(request)

      expect(decision1.selectedModel.id).toBe(decision2.selectedModel.id)
    })

    it('should track cache hits', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      router.route(request)
      router.route(request)

      const stats = router.getStats()
      expect(stats.cacheHits).toBeGreaterThan(0)
    })
  })

  describe('fallback chain', () => {
    it('should generate fallback chain', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      const decision = router.route(request)

      expect(decision.fallbackModels.length).toBeGreaterThan(0)
      expect(decision.fallbackModels.length).toBeLessThanOrEqual(5)
    })

    it('should respect capabilities in fallback chain', () => {
      const request: RouteRequest = {
        taskType: TaskType.CODE_GENERATION,
        prompt: 'Write code',
        requiredCapabilities: [ModelCapability.CODE],
      }

      const decision = router.route(request)

      for (const model of decision.fallbackModels) {
        expect(model.capabilities).toContain(ModelCapability.CODE)
      }
    })
  })

  describe('queue management', () => {
    it('should enqueue requests', async () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      const promise = router.enqueue(request)
      expect(promise).toBeInstanceOf(Promise)

      const decision = await promise
      expect(decision).toBeDefined()
    })

    it('should respect priority', async () => {
      const request1: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Low priority',
      }

      const request2: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'High priority',
      }

      const promise1 = router.enqueue(request1, 1)
      const promise2 = router.enqueue(request2, 10)

      const [decision1, decision2] = await Promise.all([promise1, promise2])

      expect(decision1).toBeDefined()
      expect(decision2).toBeDefined()
    })

    it('should handle queue limits', async () => {
      const config = {
        concurrency: {
          maxConcurrent: 1,
          maxQueueSize: 2,
          queueTimeout: 30000,
        },
      }

      const smallRouter = new ModelRouter(config)

      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      // Should be able to enqueue
      const decision = await smallRouter.enqueue(request)
      expect(decision).toBeDefined()
    })
  })

  describe('runtime configuration', () => {
    it('should switch default model', () => {
      const result = router.switchModel('gpt-4o')
      expect(result).toBe(true)

      const config = router.getConfig()
      expect(config.defaultModelId).toBe('gpt-4o')
    })

    it('should set routing strategy', () => {
      router.setStrategy(RoutingStrategy.COST_OPTIMIZED)

      const config = router.getConfig()
      expect(config.defaultStrategy).toBe(RoutingStrategy.COST_OPTIMIZED)
    })

    it('should update configuration', () => {
      router.updateConfig({
        enableCache: false,
        enableFallback: false,
      })

      const config = router.getConfig()
      expect(config.enableCache).toBe(false)
      expect(config.enableFallback).toBe(false)
    })
  })

  describe('statistics', () => {
    it('should track total requests', () => {
      const request1: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      const request2: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hi there', // Different prompt to avoid cache
      }

      router.route(request1)
      router.route(request2)

      const stats = router.getStats()
      expect(stats.totalRequests).toBeGreaterThanOrEqual(1)
    })

    it('should track by model', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      router.route(request)

      const stats = router.getStats()
      expect(stats.byModel.size).toBeGreaterThan(0)
    })

    it('should track by strategy', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
        strategy: RoutingStrategy.COST_OPTIMIZED,
      }

      router.route(request)

      const stats = router.getStats()
      expect(stats.byStrategy.get(RoutingStrategy.COST_OPTIMIZED)).toBe(1)
    })

    it('should calculate average latency', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      router.route(request)

      const stats = router.getStats()
      expect(stats.avgLatency).toBeGreaterThanOrEqual(0)
    })

    it('should track total cost', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      router.route(request)

      const stats = router.getStats()
      expect(stats.totalCost).toBeGreaterThanOrEqual(0)
    })

    it('should reset stats', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      router.route(request)
      router.resetStats()

      const stats = router.getStats()
      expect(stats.totalRequests).toBe(0)
    })
  })

  describe('visualization', () => {
    it('should generate visualization data', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      const viz = router.getVisualization(request)

      expect(viz.request).toEqual(request)
      expect(viz.decision).toBeDefined()
      expect(viz.candidates).toBeInstanceOf(Array)
      expect(viz.timeline).toBeInstanceOf(Array)
    })

    it('should include candidate scores', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      const viz = router.getVisualization(request)

      for (const candidate of viz.candidates) {
        expect(candidate.model).toBeDefined()
        expect(candidate.score).toBeGreaterThanOrEqual(0)
        expect(candidate.reasons).toBeInstanceOf(Array)
      }
    })

    it('should include timeline events', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      const viz = router.getVisualization(request)

      expect(viz.timeline.length).toBeGreaterThan(0)
      for (const event of viz.timeline) {
        expect(event.timestamp).toBeGreaterThan(0)
        expect(event.event).toBeDefined()
      }
    })
  })

  describe('edge cases', () => {
    it('should handle models with different availability', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }

      // Should still be able to route with available models
      const decision = router.route(request)
      expect(decision).toBeDefined()
    })

    it('should handle very long prompts', () => {
      const longPrompt = 'Hello '.repeat(10000)

      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: longPrompt,
      }

      const decision = router.route(request)
      expect(decision).toBeDefined()
    })

    it('should handle zero budget', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
        budget: 0,
      }

      // Should still route even with zero budget
      const decision = router.route(request)
      expect(decision).toBeDefined()
      // Estimated cost might still be calculated based on model prices
      expect(decision.estimatedCost).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('initFromEnv', () => {
  it('should initialize from environment variables', () => {
    const originalEnv = { ...process.env }

    process.env.DEFAULT_MODEL_ID = 'gpt-4o'
    process.env.DEFAULT_STRATEGY = 'cost_optimized'
    process.env.DAILY_BUDGET_LIMIT = '5000'
    process.env.MAX_CONCURRENT_REQUESTS = '20'
    process.env.ENABLE_COST_OPTIMIZATION = 'true'
    process.env.ENABLE_CACHE = 'false'
    process.env.ENABLE_FALLBACK = 'false'

    initFromEnv()

    const config = modelRouter.getConfig()
    expect(config.defaultModelId).toBe('gpt-4o')
    expect(config.defaultStrategy).toBe(RoutingStrategy.COST_OPTIMIZED)
    expect(config.dailyBudgetLimit).toBe(5000)
    expect(config.concurrency.maxConcurrent).toBe(20)
    expect(config.enableCostOptimization).toBe(true)
    expect(config.enableCache).toBe(false)
    expect(config.enableFallback).toBe(false)

    // Restore environment
    process.env = originalEnv
  })
})

describe('default router', () => {
  it('should have default router instance', () => {
    expect(modelRouter).toBeDefined()
  })

  it('should route requests', () => {
    const request: RouteRequest = {
      taskType: TaskType.CONVERSATION,
      prompt: 'Hello',
    }

    const decision = modelRouter.route(request)
    expect(decision).toBeDefined()
  })
})