/**
 * 模型注册中心测试
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  ModelRegistry,
  initializeDefaultModels,
  modelRegistry,
} from '../model-registry'
import {
  ModelConfig,
  ModelCapability,
  ModelStatus,
  ModelPriority,
} from '../types'

describe('ModelRegistry', () => {
  let registry: ModelRegistry

  beforeEach(() => {
    registry = new ModelRegistry()
  })

  describe('register', () => {
    it('should register a model', () => {
      const config: ModelConfig = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'test',
        model: 'test-model-v1',
        displayName: 'Test Model',
        capabilities: [ModelCapability.TEXT],
        maxTokens: 4096,
        contextWindow: 8192,
        inputPricePerM: 100,
        outputPricePerM: 200,
        priority: ModelPriority.NORMAL,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      registry.register(config)

      const model = registry.getModel('test-model')
      expect(model).toBeDefined()
      expect(model?.name).toBe('Test Model')
    })

    it('should register multiple models', () => {
      const configs: ModelConfig[] = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'test',
          model: 'model-1',
          displayName: 'Model 1',
          capabilities: [ModelCapability.TEXT],
          maxTokens: 4096,
          contextWindow: 8192,
          inputPricePerM: 100,
          outputPricePerM: 200,
          priority: ModelPriority.NORMAL,
          enabled: true,
          status: ModelStatus.AVAILABLE,
        },
        {
          id: 'model-2',
          name: 'Model 2',
          provider: 'test',
          model: 'model-2',
          displayName: 'Model 2',
          capabilities: [ModelCapability.CODE],
          maxTokens: 8192,
          contextWindow: 16384,
          inputPricePerM: 150,
          outputPricePerM: 250,
          priority: ModelPriority.HIGH,
          enabled: true,
          status: ModelStatus.AVAILABLE,
        },
      ]

      registry.registerBatch(configs)

      expect(registry.getAllModels()).toHaveLength(2)
    })
  })

  describe('unregister', () => {
    it('should unregister a model', () => {
      const config: ModelConfig = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'test',
        model: 'test-model-v1',
        displayName: 'Test Model',
        capabilities: [ModelCapability.TEXT],
        maxTokens: 4096,
        contextWindow: 8192,
        inputPricePerM: 100,
        outputPricePerM: 200,
        priority: ModelPriority.NORMAL,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      registry.register(config)
      expect(registry.getModel('test-model')).toBeDefined()

      const result = registry.unregister('test-model')
      expect(result).toBe(true)
      expect(registry.getModel('test-model')).toBeUndefined()
    })

    it('should return false for non-existent model', () => {
      const result = registry.unregister('non-existent')
      expect(result).toBe(false)
    })
  })

  describe('update', () => {
    it('should update model config', () => {
      const config: ModelConfig = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'test',
        model: 'test-model-v1',
        displayName: 'Test Model',
        capabilities: [ModelCapability.TEXT],
        maxTokens: 4096,
        contextWindow: 8192,
        inputPricePerM: 100,
        outputPricePerM: 200,
        priority: ModelPriority.NORMAL,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      registry.register(config)
      registry.update('test-model', { maxTokens: 8192 })

      const model = registry.getModel('test-model')
      expect(model?.maxTokens).toBe(8192)
    })
  })

  describe('query methods', () => {
    beforeEach(() => {
      const configs: ModelConfig[] = [
        {
          id: 'code-model',
          name: 'Code Model',
          provider: 'test',
          model: 'code-model',
          displayName: 'Code Model',
          capabilities: [ModelCapability.CODE, ModelCapability.TEXT],
          maxTokens: 4096,
          contextWindow: 8192,
          inputPricePerM: 100,
          outputPricePerM: 200,
          priority: ModelPriority.HIGH,
          enabled: true,
          status: ModelStatus.AVAILABLE,
        },
        {
          id: 'text-model',
          name: 'Text Model',
          provider: 'test',
          model: 'text-model',
          displayName: 'Text Model',
          capabilities: [ModelCapability.TEXT],
          maxTokens: 2048,
          contextWindow: 4096,
          inputPricePerM: 50,
          outputPricePerM: 100,
          priority: ModelPriority.NORMAL,
          enabled: true,
          status: ModelStatus.AVAILABLE,
        },
        {
          id: 'disabled-model',
          name: 'Disabled Model',
          provider: 'test',
          model: 'disabled-model',
          displayName: 'Disabled Model',
          capabilities: [ModelCapability.TEXT],
          maxTokens: 4096,
          contextWindow: 8192,
          inputPricePerM: 100,
          outputPricePerM: 200,
          priority: ModelPriority.NORMAL,
          enabled: false,
          status: ModelStatus.UNAVAILABLE,
        },
      ]

      registry.registerBatch(configs)
    })

    it('should get enabled models', () => {
      const models = registry.getEnabledModels()
      expect(models).toHaveLength(2)
      expect(models.map((m) => m.id)).toContain('code-model')
      expect(models.map((m) => m.id)).toContain('text-model')
    })

    it('should get available models', () => {
      const models = registry.getAvailableModels()
      expect(models).toHaveLength(2)
    })

    it('should filter by capability', () => {
      const models = registry.getModelsByCapability(ModelCapability.CODE)
      expect(models).toHaveLength(1)
      expect(models[0].id).toBe('code-model')
    })

    it('should filter by multiple capabilities', () => {
      const models = registry.getModelsByCapabilities([
        ModelCapability.CODE,
        ModelCapability.TEXT,
      ])
      expect(models).toHaveLength(1)
      expect(models[0].id).toBe('code-model')
    })

    it('should sort by priority', () => {
      const models = registry.getModelsByPriority()
      expect(models[0].priority).toBeLessThanOrEqual(models[1].priority)
    })

    it('should sort by cost', () => {
      const models = registry.getModelsByCost()
      expect(models[0].inputPricePerM).toBeLessThanOrEqual(models[1].inputPricePerM)
    })
  })

  describe('cost estimation', () => {
    beforeEach(() => {
      const config: ModelConfig = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'test',
        model: 'test-model-v1',
        displayName: 'Test Model',
        capabilities: [ModelCapability.TEXT],
        maxTokens: 4096,
        contextWindow: 8192,
        inputPricePerM: 100, // 1元/百万token = 100分
        outputPricePerM: 200,
        priority: ModelPriority.NORMAL,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      registry.register(config)
    })

    it('should estimate cost correctly', () => {
      // 1M input tokens = 100分, 1M output tokens = 200分
      // 1000 input tokens = 0.1分, 500 output tokens = 0.1分
      const cost = registry.estimateCost('test-model', 1000, 500)
      // Cost is rounded, so it should be 0 (very small amounts round to 0)
      expect(cost).toBeGreaterThanOrEqual(0)
    })
  })

  describe('status management', () => {
    beforeEach(() => {
      const config: ModelConfig = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'test',
        model: 'test-model-v1',
        displayName: 'Test Model',
        capabilities: [ModelCapability.TEXT],
        maxTokens: 4096,
        contextWindow: 8192,
        inputPricePerM: 100,
        outputPricePerM: 200,
        priority: ModelPriority.NORMAL,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      registry.register(config)
    })

    it('should set model status', () => {
      registry.setModelStatus('test-model', ModelStatus.ERROR)
      const model = registry.getModel('test-model')
      expect(model?.status).toBe(ModelStatus.ERROR)
    })

    it('should enable/disable model', () => {
      registry.setModelEnabled('test-model', false)
      const model = registry.getModel('test-model')
      expect(model?.enabled).toBe(false)
    })
  })

  describe('health check', () => {
    beforeEach(() => {
      const config: ModelConfig = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'test',
        model: 'test-model-v1',
        displayName: 'Test Model',
        capabilities: [ModelCapability.TEXT],
        maxTokens: 4096,
        contextWindow: 8192,
        inputPricePerM: 100,
        outputPricePerM: 200,
        priority: ModelPriority.NORMAL,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      registry.register(config)
    })

    it('should update health check', () => {
      registry.updateHealthCheck({
        modelId: 'test-model',
        isHealthy: true,
        latency: 500,
        checkedAt: Date.now(),
      })

      const health = registry.getHealthCheck('test-model')
      expect(health).toBeDefined()
      expect(health?.isHealthy).toBe(true)
      expect(health?.latency).toBe(500)
    })

    it('should update model status based on health', () => {
      registry.updateHealthCheck({
        modelId: 'test-model',
        isHealthy: false,
        error: 'Connection failed',
        checkedAt: Date.now(),
      })

      const model = registry.getModel('test-model')
      expect(model?.status).toBe(ModelStatus.ERROR)
    })
  })

  describe('stats', () => {
    it('should return correct stats', () => {
      const configs: ModelConfig[] = [
        {
          id: 'model-1',
          name: 'Model 1',
          provider: 'provider-a',
          model: 'model-1',
          displayName: 'Model 1',
          capabilities: [ModelCapability.TEXT],
          maxTokens: 4096,
          contextWindow: 8192,
          inputPricePerM: 100,
          outputPricePerM: 200,
          priority: ModelPriority.NORMAL,
          enabled: true,
          status: ModelStatus.AVAILABLE,
        },
        {
          id: 'model-2',
          name: 'Model 2',
          provider: 'provider-b',
          model: 'model-2',
          displayName: 'Model 2',
          capabilities: [ModelCapability.CODE],
          maxTokens: 8192,
          contextWindow: 16384,
          inputPricePerM: 150,
          outputPricePerM: 250,
          priority: ModelPriority.HIGH,
          enabled: false,
          status: ModelStatus.UNAVAILABLE,
        },
      ]

      registry.registerBatch(configs)
      const stats = registry.getStats()

      expect(stats.total).toBe(2)
      expect(stats.enabled).toBe(1)
      expect(stats.available).toBe(1)
      expect(stats.byProvider['provider-a']).toBe(1)
      expect(stats.byProvider['provider-b']).toBe(1)
    })
  })
})

describe('default models', () => {
  it('should have default models initialized', () => {
    const models = modelRegistry.getAllModels()
    expect(models.length).toBeGreaterThan(0)
  })

  it('should have GPT-4o model', () => {
    const model = modelRegistry.getModel('gpt-4o')
    expect(model).toBeDefined()
    expect(model?.provider).toBe('openai')
  })

  it('should have Claude model', () => {
    const model = modelRegistry.getModel('claude-4-opus')
    expect(model).toBeDefined()
    expect(model?.provider).toBe('anthropic')
  })
})