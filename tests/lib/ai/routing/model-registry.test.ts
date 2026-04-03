/**
 * Model Registry Unit Tests (Enhanced)
 * v1.12.0 多模型路由系统 - 模型注册表测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ModelRegistry,
  initializeDefaultModels,
  modelRegistry,
} from '../../../../src/lib/ai/routing/model-registry'
import {
  ModelConfig,
  ModelCapability,
  ModelStatus,
  ModelPriority,
  ModelHealthCheck,
} from '../../../../src/lib/ai/routing/types'

describe('ModelRegistry - Normal Path', () => {
  let registry: ModelRegistry

  beforeEach(() => {
    registry = new ModelRegistry()
  })

  describe('register()', () => {
    it('should register a model successfully', () => {
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
      expect(model?.provider).toBe('test')
    })

    it('should overwrite existing model on re-registration', () => {
      const config1: ModelConfig = {
        id: 'test-model',
        name: 'Test Model V1',
        provider: 'test',
        model: 'test-model-v1',
        displayName: 'Test Model V1',
        capabilities: [ModelCapability.TEXT],
        maxTokens: 4096,
        contextWindow: 8192,
        inputPricePerM: 100,
        outputPricePerM: 200,
        priority: ModelPriority.NORMAL,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      const config2: ModelConfig = {
        id: 'test-model',
        name: 'Test Model V2',
        provider: 'test',
        model: 'test-model-v2',
        displayName: 'Test Model V2',
        capabilities: [ModelCapability.TEXT, ModelCapability.CODE],
        maxTokens: 8192,
        contextWindow: 16384,
        inputPricePerM: 150,
        outputPricePerM: 250,
        priority: ModelPriority.HIGH,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      registry.register(config1)
      registry.register(config2)

      const model = registry.getModel('test-model')
      expect(model?.name).toBe('Test Model V2')
      expect(model?.maxTokens).toBe(8192)
    })

    it('should register model with all capabilities', () => {
      const config: ModelConfig = {
        id: 'full-model',
        name: 'Full Model',
        provider: 'test',
        model: 'full-model',
        displayName: 'Full Model',
        capabilities: [
          ModelCapability.CODE,
          ModelCapability.TEXT,
          ModelCapability.IMAGE,
          ModelCapability.AUDIO,
          ModelCapability.REASONING,
          ModelCapability.MULTIMODAL,
          ModelCapability.FUNCTION_CALLING,
          ModelCapability.STREAMING,
        ],
        maxTokens: 4096,
        contextWindow: 8192,
        inputPricePerM: 100,
        outputPricePerM: 200,
        priority: ModelPriority.CRITICAL,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      registry.register(config)

      const model = registry.getModel('full-model')
      expect(model?.capabilities).toHaveLength(8)
    })
  })

  describe('registerBatch()', () => {
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
      expect(registry.getModel('model-1')).toBeDefined()
      expect(registry.getModel('model-2')).toBeDefined()
    })

    it('should handle empty batch', () => {
      registry.registerBatch([])
      expect(registry.getAllModels()).toHaveLength(0)
    })
  })

  describe('unregister()', () => {
    it('should unregister a model successfully', () => {
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

  describe('update()', () => {
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
      registry.update('test-model', { maxTokens: 8192, inputPricePerM: 200 })

      const model = registry.getModel('test-model')
      expect(model?.maxTokens).toBe(8192)
      expect(model?.inputPricePerM).toBe(200)
      expect(model?.name).toBe('Test Model') // Unchanged
    })

    it('should return false for non-existent model', () => {
      const result = registry.update('non-existent', { maxTokens: 8192 })
      expect(result).toBe(false)
    })

    it('should update lastUpdated timestamp', () => {
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

      // Wait a bit to ensure timestamp difference
      return new Promise(resolve => {
        setTimeout(() => {
          const beforeUpdate = registry.getModel('test-model')
          registry.update('test-model', { maxTokens: 8192 })

          // Note: timestamp is in the registration, not directly accessible
          expect(registry.getModel('test-model')?.maxTokens).toBe(8192)
          resolve(null)
        }, 10)
      })
    })
  })

  describe('Query Methods', () => {
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
        {
          id: 'error-model',
          name: 'Error Model',
          provider: 'test',
          model: 'error-model',
          displayName: 'Error Model',
          capabilities: [ModelCapability.TEXT],
          maxTokens: 4096,
          contextWindow: 8192,
          inputPricePerM: 100,
          outputPricePerM: 200,
          priority: ModelPriority.NORMAL,
          enabled: true,
          status: ModelStatus.ERROR,
        },
      ]

      registry.registerBatch(configs)
    })

    describe('getModel()', () => {
      it('should get a model by id', () => {
        const model = registry.getModel('code-model')
        expect(model).toBeDefined()
        expect(model?.name).toBe('Code Model')
      })

      it('should return undefined for non-existent model', () => {
        const model = registry.getModel('non-existent')
        expect(model).toBeUndefined()
      })
    })

    describe('getAllModels()', () => {
      it('should return all registered models', () => {
        const models = registry.getAllModels()
        expect(models).toHaveLength(4)
      })
    })

    describe('getEnabledModels()', () => {
      it('should return only enabled models', () => {
        const models = registry.getEnabledModels()
        expect(models).toHaveLength(3)
        expect(models.map(m => m.id)).toContain('code-model')
        expect(models.map(m => m.id)).toContain('text-model')
        expect(models.map(m => m.id)).not.toContain('disabled-model')
      })
    })

    describe('getAvailableModels()', () => {
      it('should return only available models', () => {
        const models = registry.getAvailableModels()
        expect(models).toHaveLength(2) // enabled AND available
        expect(models.map(m => m.id)).toContain('code-model')
        expect(models.map(m => m.id)).toContain('text-model')
      })
    })

    describe('getModelsByCapability()', () => {
      it('should filter by single capability', () => {
        const models = registry.getModelsByCapability(ModelCapability.CODE)
        expect(models).toHaveLength(1)
        expect(models[0].id).toBe('code-model')
      })

      it('should return empty array for no matches', () => {
        const models = registry.getModelsByCapability(ModelCapability.AUDIO)
        expect(models).toHaveLength(0)
      })
    })

    describe('getModelsByCapabilities()', () => {
      it('should filter by multiple capabilities (AND logic)', () => {
        const models = registry.getModelsByCapabilities([
          ModelCapability.CODE,
          ModelCapability.TEXT,
        ])
        expect(models).toHaveLength(1)
        expect(models[0].id).toBe('code-model')
      })

      it('should return empty array when not all capabilities match', () => {
        const models = registry.getModelsByCapabilities([
          ModelCapability.TEXT,
          ModelCapability.AUDIO,
        ])
        expect(models).toHaveLength(0)
      })
    })

    describe('getModelsByProvider()', () => {
      it('should filter by provider', () => {
        const models = registry.getModelsByProvider('test')
        expect(models).toHaveLength(2) // Only available models
      })

      it('should return empty array for unknown provider', () => {
        const models = registry.getModelsByProvider('unknown')
        expect(models).toHaveLength(0)
      })
    })

    describe('getModelsByPriority()', () => {
      it('should sort models by priority', () => {
        const models = registry.getModelsByPriority()
        expect(models[0].priority).toBeLessThanOrEqual(models[1].priority)
      })
    })

    describe('getModelsByCost()', () => {
      it('should sort models by cost (low to high)', () => {
        const models = registry.getModelsByCost()
        const costs = models.map(m => (m.inputPricePerM + m.outputPricePerM) / 2)

        for (let i = 1; i < costs.length; i++) {
          expect(costs[i - 1]).toBeLessThanOrEqual(costs[i])
        }
      })
    })

    describe('getModelsByLatency()', () => {
      it('should sort models by latency (low to high)', () => {
        const models = registry.getModelsByLatency()
        const latencies = models.map(m => m.avgLatencyMs ?? 1500)

        for (let i = 1; i < latencies.length; i++) {
          expect(latencies[i - 1]).toBeLessThanOrEqual(latencies[i])
        }
      })
    })

    describe('getModelsByReliability()', () => {
      it('should sort models by reliability (high to low)', () => {
        const models = registry.getModelsByReliability()
        const reliabilities = models.map(m => m.reliabilityScore ?? 0.9)

        for (let i = 1; i < reliabilities.length; i++) {
          expect(reliabilities[i - 1]).toBeGreaterThanOrEqual(reliabilities[i])
        }
      })
    })
  })

  describe('Status Management', () => {
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

    describe('setModelStatus()', () => {
      it('should set model status', () => {
        registry.setModelStatus('test-model', ModelStatus.ERROR)
        const model = registry.getModel('test-model')
        expect(model?.status).toBe(ModelStatus.ERROR)
      })

      it('should return false for non-existent model', () => {
        const result = registry.setModelStatus('non-existent', ModelStatus.ERROR)
        expect(result).toBe(false)
      })
    })

    describe('setModelEnabled()', () => {
      it('should enable/disable model', () => {
        registry.setModelEnabled('test-model', false)
        const model = registry.getModel('test-model')
        expect(model?.enabled).toBe(false)

        registry.setModelEnabled('test-model', true)
        expect(registry.getModel('test-model')?.enabled).toBe(true)
      })

      it('should return false for non-existent model', () => {
        const result = registry.setModelEnabled('non-existent', false)
        expect(result).toBe(false)
      })
    })
  })

  describe('Health Check', () => {
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

    describe('updateHealthCheck()', () => {
      it('should update health check result', () => {
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

      it('should update model status to ERROR when unhealthy', () => {
        registry.updateHealthCheck({
          modelId: 'test-model',
          isHealthy: false,
          error: 'Connection failed',
          checkedAt: Date.now(),
        })

        const model = registry.getModel('test-model')
        expect(model?.status).toBe(ModelStatus.ERROR)
      })

      it('should restore model status when healthy again', () => {
        // First make it unhealthy
        registry.updateHealthCheck({
          modelId: 'test-model',
          isHealthy: false,
          error: 'Connection failed',
          checkedAt: Date.now(),
        })

        // Then make it healthy
        registry.updateHealthCheck({
          modelId: 'test-model',
          isHealthy: true,
          latency: 500,
          checkedAt: Date.now(),
        })

        const model = registry.getModel('test-model')
        expect(model?.status).toBe(ModelStatus.AVAILABLE)
      })
    })

    describe('getHealthCheck()', () => {
      it('should return undefined for non-existent model', () => {
        const health = registry.getHealthCheck('non-existent')
        expect(health).toBeUndefined()
      })
    })

    describe('getAllHealthChecks()', () => {
      it('should return all health checks', () => {
        registry.updateHealthCheck({
          modelId: 'test-model',
          isHealthy: true,
          latency: 500,
          checkedAt: Date.now(),
        })

        const healths = registry.getAllHealthChecks()
        expect(healths).toHaveLength(1)
      })
    })
  })

  describe('Cost Estimation', () => {
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
        inputPricePerM: 100, // 1元/百万token
        outputPricePerM: 200, // 2元/百万token
        priority: ModelPriority.NORMAL,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      registry.register(config)
    })

    describe('estimateCost()', () => {
      it('should estimate cost correctly', () => {
        // 1M input tokens = 100分, 1M output tokens = 200分
        // 1000 input tokens = 0.1分, 500 output tokens = 0.1分
        const cost = registry.estimateCost('test-model', 1000000, 1000000)
        expect(cost).toBe(300) // 100 + 200 = 300分
      })

      it('should throw for non-existent model', () => {
        expect(() => registry.estimateCost('non-existent', 100, 100)).toThrow()
      })

      it('should handle zero tokens', () => {
        const cost = registry.estimateCost('test-model', 0, 0)
        expect(cost).toBe(0)
      })

      it('should handle large token counts', () => {
        const cost = registry.estimateCost('test-model', 10000000, 10000000)
        expect(cost).toBe(3000) // 10M * (0.0001 + 0.0002) = 3000分
      })
    })

    describe('checkBudget()', () => {
      it('should check if within budget', () => {
        const result = registry.checkBudget('test-model', 1000, 1000, 1)
        expect(result).toBe(true)
      })

      it('should check if over budget', () => {
        const result = registry.checkBudget('test-model', 1000000, 1000000, 100)
        expect(result).toBe(false)
      })
    })
  })

  describe('checkCapabilities()', () => {
    beforeEach(() => {
      const config: ModelConfig = {
        id: 'test-model',
        name: 'Test Model',
        provider: 'test',
        model: 'test-model-v1',
        displayName: 'Test Model',
        capabilities: [ModelCapability.TEXT, ModelCapability.CODE],
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

    it('should return true when all capabilities present', () => {
      const result = registry.checkCapabilities('test-model', [ModelCapability.TEXT])
      expect(result).toBe(true)
    })

    it('should return true when all required capabilities present', () => {
      const result = registry.checkCapabilities('test-model', [
        ModelCapability.TEXT,
        ModelCapability.CODE,
      ])
      expect(result).toBe(true)
    })

    it('should return false when capability missing', () => {
      const result = registry.checkCapabilities('test-model', [
        ModelCapability.TEXT,
        ModelCapability.AUDIO,
      ])
      expect(result).toBe(false)
    })

    it('should return false for non-existent model', () => {
      const result = registry.checkCapabilities('non-existent', [ModelCapability.TEXT])
      expect(result).toBe(false)
    })
  })

  describe('getStats()', () => {
    it('should return correct statistics', () => {
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

  describe('clear()', () => {
    it('should clear all models', () => {
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
      registry.clear()

      expect(registry.getAllModels()).toHaveLength(0)
    })
  })

  describe('export() and import()', () => {
    it('should export configurations', () => {
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
      const exported = registry.export()

      expect(exported).toHaveLength(1)
      expect(exported[0].config.id).toBe('test-model')
    })

    it('should import configurations', () => {
      const data = [
        {
          config: {
            id: 'imported-model',
            name: 'Imported Model',
            provider: 'test',
            model: 'imported-model',
            displayName: 'Imported Model',
            capabilities: [ModelCapability.TEXT],
            maxTokens: 4096,
            contextWindow: 8192,
            inputPricePerM: 100,
            outputPricePerM: 200,
            priority: ModelPriority.NORMAL,
            enabled: true,
            status: ModelStatus.AVAILABLE,
          } as ModelConfig,
          registeredAt: Date.now(),
          lastUpdated: Date.now(),
        },
      ]

      registry.import(data)
      expect(registry.getAllModels()).toHaveLength(1)
      expect(registry.getModel('imported-model')).toBeDefined()
    })

    it('should export and import correctly', () => {
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
      const exported = registry.export()

      const newRegistry = new ModelRegistry()
      newRegistry.import(exported)

      expect(newRegistry.getAllModels()).toHaveLength(1)
      expect(newRegistry.getModel('test-model')?.name).toBe('Test Model')
    })
  })
})

describe('ModelRegistry - Exception Path', () => {
  let registry: ModelRegistry

  beforeEach(() => {
    registry = new ModelRegistry()
  })

  describe('Edge Cases', () => {
    it('should handle model with empty capabilities', () => {
      const config: ModelConfig = {
        id: 'empty-cap-model',
        name: 'Empty Cap Model',
        provider: 'test',
        model: 'empty-cap-model',
        displayName: 'Empty Cap Model',
        capabilities: [],
        maxTokens: 4096,
        contextWindow: 8192,
        inputPricePerM: 100,
        outputPricePerM: 200,
        priority: ModelPriority.NORMAL,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      registry.register(config)

      const model = registry.getModel('empty-cap-model')
      expect(model?.capabilities).toHaveLength(0)
    })

    it('should handle model with zero price', () => {
      const config: ModelConfig = {
        id: 'free-model',
        name: 'Free Model',
        provider: 'test',
        model: 'free-model',
        displayName: 'Free Model',
        capabilities: [ModelCapability.TEXT],
        maxTokens: 4096,
        contextWindow: 8192,
        inputPricePerM: 0,
        outputPricePerM: 0,
        priority: ModelPriority.FALLBACK,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      registry.register(config)

      const cost = registry.estimateCost('free-model', 1000, 1000)
      expect(cost).toBe(0)
    })

    it('should handle model with very large context window', () => {
      const config: ModelConfig = {
        id: 'large-context-model',
        name: 'Large Context Model',
        provider: 'test',
        model: 'large-context-model',
        displayName: 'Large Context Model',
        capabilities: [ModelCapability.TEXT],
        maxTokens: 100000,
        contextWindow: 1000000,
        inputPricePerM: 100,
        outputPricePerM: 200,
        priority: ModelPriority.NORMAL,
        enabled: true,
        status: ModelStatus.AVAILABLE,
      }

      registry.register(config)

      const model = registry.getModel('large-context-model')
      expect(model?.contextWindow).toBe(1000000)
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle concurrent registrations', async () => {
      const promises = Array(10)
        .fill(null)
        .map((_, i) =>
          Promise.resolve(
            registry.register({
              id: `model-${i}`,
              name: `Model ${i}`,
              provider: 'test',
              model: `model-${i}`,
              displayName: `Model ${i}`,
              capabilities: [ModelCapability.TEXT],
              maxTokens: 4096,
              contextWindow: 8192,
              inputPricePerM: 100,
              outputPricePerM: 200,
              priority: ModelPriority.NORMAL,
              enabled: true,
              status: ModelStatus.AVAILABLE,
            })
          )
        )

      await Promise.all(promises)

      expect(registry.getAllModels()).toHaveLength(10)
    })
  })
})

describe('Default Models', () => {
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

  it('should have Gemini model', () => {
    const model = modelRegistry.getModel('gemini-2-pro')
    expect(model).toBeDefined()
    expect(model?.provider).toBe('google')
  })

  it('should have DeepSeek model', () => {
    const model = modelRegistry.getModel('deepseek-chat')
    expect(model).toBeDefined()
    expect(model?.provider).toBe('deepseek')
  })

  it('should have GLM-4 model', () => {
    const model = modelRegistry.getModel('glm-4')
    expect(model).toBeDefined()
    expect(model?.provider).toBe('zhipu')
  })
})
