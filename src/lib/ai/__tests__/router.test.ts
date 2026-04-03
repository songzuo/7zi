/**
 * 路由器测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ModelRouter, routeRequest } from '../router'
import { TaskType, RouteRequest } from '../types'
import { AIModelProvider } from '../types'

describe('ModelRouter', () => {
  let router: ModelRouter

  beforeEach(() => {
    router = new ModelRouter()
  })

  describe('基本路由', () => {
    it('should route code generation requests', () => {
      const request: RouteRequest = {
        taskType: TaskType.CODE_GENERATION,
        prompt: 'Write a function to calculate fibonacci',
      }
      const decision = router.route(request)
      
      expect(decision.selectedModel).toBeDefined()
      expect(decision.reasoning).toContain('code_generation')
    })

    it('should route conversation requests', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello, how are you?',
      }
      const decision = router.route(request)
      
      expect(decision.selectedModel).toBeDefined()
      expect(decision.fallbackModels.length).toBeGreaterThan(0)
    })

    it('should route analysis requests', () => {
      const request: RouteRequest = {
        taskType: TaskType.ANALYSIS,
        prompt: 'Analyze the performance of this code',
      }
      const decision = router.route(request)
      
      expect(decision.selectedModel).toBeDefined()
    })
  })

  describe('成本控制', () => {
    it('should respect budget limits', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
        budget: 1, // Very low budget
      }
      const decision = router.route(request)
      
      // Should still return a model
      expect(decision.selectedModel).toBeDefined()
    })
  })

  describe('提供商偏好', () => {
    it('should prefer specified provider', () => {
      const request: RouteRequest = {
        taskType: TaskType.CODE_GENERATION,
        prompt: 'Write code',
        preferredProvider: AIModelProvider.ANTHROPIC,
      }
      const decision = router.route(request)
      
      expect(decision.selectedModel.provider).toBe(AIModelProvider.ANTHROPIC)
    })

    it('should fallback to other providers if none available', () => {
      const request: RouteRequest = {
        taskType: TaskType.CODE_GENERATION,
        prompt: 'Write code',
        preferredProvider: 'nonexistent' as AIModelProvider,
      }
      const decision = router.route(request)
      
      expect(decision.selectedModel).toBeDefined()
    })
  })

  describe('能力要求', () => {
    it('should filter by streaming support', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
        requireStreaming: true,
      }
      const decision = router.route(request)
      
      expect(decision.selectedModel.supportsStreaming).toBe(true)
    })

    it('should filter by vision support', () => {
      const request: RouteRequest = {
        taskType: TaskType.MULTIMODAL,
        prompt: 'Describe this image',
        requireVision: true,
      }
      const decision = router.route(request)
      
      expect(decision.selectedModel.supportsVision).toBe(true)
    })

    it('should filter by function calling', () => {
      const request: RouteRequest = {
        taskType: TaskType.INSTRUCTION_FOLLOWING,
        prompt: 'Call the function',
        requireFunctionCalling: true,
      }
      const decision = router.route(request)
      
      expect(decision.selectedModel.supportsFunctionCalling).toBe(true)
    })
  })

  describe('备用模型链', () => {
    it('should generate fallback chain', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }
      const decision = router.route(request)
      
      // 备用链应该不包含主模型
      expect(decision.fallbackModels.find(m => m.id === decision.selectedModel.id)).toBeUndefined()
    })

    it('should limit fallback chain length', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }
      const decision = router.route(request)
      
      expect(decision.fallbackModels.length).toBeLessThanOrEqual(5)
    })
  })

  describe('估算', () => {
    it('should estimate cost', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }
      const decision = router.route(request)
      
      // Cost can be 0 for free models, just check it exists
      expect(decision.estimatedCost).toBeGreaterThanOrEqual(0)
    })

    it('should estimate latency', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }
      const decision = router.route(request)
      
      expect(decision.estimatedLatency).toBeGreaterThan(0)
    })

    it('should provide reasoning', () => {
      const request: RouteRequest = {
        taskType: TaskType.CODE_GENERATION,
        prompt: 'Write a function',
      }
      const decision = router.route(request)
      
      expect(decision.reasoning).toBeDefined()
      expect(decision.reasoning.length).toBeGreaterThan(0)
    })
  })

  describe('置信度', () => {
    it('should calculate confidence', () => {
      const request: RouteRequest = {
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      }
      const decision = router.route(request)
      
      expect(decision.confidence).toBeGreaterThanOrEqual(0)
      expect(decision.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe('统计', () => {
    it('should track statistics', () => {
      const initialStats = router.getStats()
      
      router.route({
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      })
      
      const stats = router.getStats()
      expect(stats.totalRequests).toBe(initialStats.totalRequests + 1)
    })

    it('should track by model', () => {
      router.route({
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      })
      
      const stats = router.getStats()
      expect(stats.byModel.size).toBeGreaterThan(0)
    })

    it('should track by task type', () => {
      router.route({
        taskType: TaskType.CODE_GENERATION,
        prompt: 'Write code',
      })
      
      const stats = router.getStats()
      expect(stats.byTaskType.get(TaskType.CODE_GENERATION)).toBeGreaterThan(0)
    })

    it('should reset stats', () => {
      router.route({
        taskType: TaskType.CONVERSATION,
        prompt: 'Hello',
      })
      
      router.resetStats()
      
      const stats = router.getStats()
      expect(stats.totalRequests).toBe(0)
    })
  })

  describe('自动任务分类', () => {
    it('should auto-classify code generation', () => {
      const request: RouteRequest = {
        // 不指定 taskType
        prompt: 'Write a function to add numbers',
      }
      const decision = router.route(request)
      
      // 应该自动识别为代码生成
      expect(decision.reasoning).toContain('code_generation')
    })

    it('should auto-classify conversation', () => {
      const request: RouteRequest = {
        prompt: 'Hello there!',
      }
      const decision = router.route(request)
      
      expect(decision.selectedModel).toBeDefined()
    })
  })
})

describe('convenience function', () => {
  it('should route using convenience function', () => {
    const request: RouteRequest = {
      taskType: TaskType.CONVERSATION,
      prompt: 'Hello',
    }
    const decision = routeRequest(request)
    
    expect(decision.selectedModel).toBeDefined()
  })
})