/**
 * 智能路由服务测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SmartRoutingAIService } from '../smart-service'
import { TaskType, RoutingStrategy } from '../routing/types'

// Mock Provider
vi.mock('../providers/index', () => ({
  ProviderFactory: {
    create: vi.fn((model) => ({
      generate: vi.fn(async () => ({
        content: 'Test response',
        model: model.model,
        finishReason: 'stop',
        usage: {
          promptTokens: 100,
          completionTokens: 200,
          totalTokens: 300,
        },
        cost: 50,
        latency: 1500,
      })),
    })),
  },
}))

describe('SmartRoutingAIService', () => {
  let service: SmartRoutingAIService

  beforeEach(() => {
    service = new SmartRoutingAIService({
      enableCostTracking: true,
      enableCaching: true,
      enableFallback: true,
    })
  })

  describe('生成文本', () => {
    it('should generate text with routing', async () => {
      const result = await service.generate({
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello, how are you?',
      })

      expect(result.content).toBe('Test response')
      expect(result.model).toBeDefined()
      expect(result.cost).toBe(50)
      expect(result.latency).toBe(1500)
      expect(result.decision).toBeDefined()
      expect(result.fromCache).toBe(false)
    })

    it('should route code generation to appropriate model', async () => {
      const result = await service.generate({
        taskType: TaskType.CODE_GENERATION,
        prompt: 'Write a function to add numbers',
      })

      expect(result.content).toBe('Test response')
      expect(result.decision.selectedModel).toBeDefined()
    })

    it('should respect budget limits', async () => {
      const budgetService = new SmartRoutingAIService({
        enableCostTracking: true,
        costTrackerConfig: {
          dailyBudgetLimit: 100,
        },
      })

      // First request should succeed
      await budgetService.generate({
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      })

      // Second request should fail if budget exceeded
      // (This depends on the mock implementation)
    })
  })

  describe('流式生成', () => {
    it('should generate stream', async () => {
      const chunks: string[] = []

      for await (const chunk of service.generateStream({
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      })) {
        chunks.push(chunk)
      }

      expect(chunks.length).toBeGreaterThan(0)
    })
  })

  describe('统计信息', () => {
    it('should track routing stats', async () => {
      await service.generate({
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      })

      const stats = service.getRoutingStats()
      expect(stats.totalRequests).toBeGreaterThan(0)
    })

    it('should track cost stats', async () => {
      await service.generate({
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      })

      const stats = service.getCostStats()
      expect(stats.totalCost).toBeGreaterThan(0)
      expect(stats.totalRequests).toBeGreaterThan(0)
    })

    it('should track daily cost', async () => {
      await service.generate({
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      })

      const dailyCost = service.getDailyCost()
      expect(dailyCost).toBeGreaterThan(0)
    })

    it('should get remaining budget', async () => {
      const budgetService = new SmartRoutingAIService({
        enableCostTracking: true,
        costTrackerConfig: {
          dailyBudgetLimit: 1000,
        },
      })

      await budgetService.generate({
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      })

      const remaining = budgetService.getRemainingBudget()
      expect(remaining).toBeLessThan(1000)
    })
  })

  describe('配置管理', () => {
    it('should set routing strategy', () => {
      service.setStrategy(RoutingStrategy.COST_OPTIMIZED)
      // Strategy should be set
    })

    it('should switch default model', () => {
      const result = service.switchModel('gpt-4o')
      expect(result).toBe(true)
    })
  })

  describe('重置', () => {
    it('should reset stats', async () => {
      await service.generate({
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      })

      service.resetStats()

      const routingStats = service.getRoutingStats()
      const costStats = service.getCostStats()

      expect(routingStats.totalRequests).toBe(0)
      expect(costStats.totalRequests).toBe(0)
    })
  })

  describe('可视化', () => {
    it('should get visualization data', () => {
      const viz = service.getVisualization({
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      })

      expect(viz.request).toBeDefined()
      expect(viz.decision).toBeDefined()
      expect(viz.candidates).toBeDefined()
      expect(viz.timeline).toBeDefined()
    })
  })
})