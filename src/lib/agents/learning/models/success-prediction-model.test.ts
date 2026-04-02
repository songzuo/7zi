/**
 * Success Prediction Model Tests
 */

import {
  SuccessPredictionModel,
  createSuccessPredictionModel,
  predictSuccess,
  type SuccessPredictionInput,
  type SuccessPredictionResult,
  type SuccessPredictionConfig,
} from '../models/success-prediction-model'

describe('SuccessPredictionModel', () => {
  describe('constructor', () => {
    it('should create with default config', () => {
      const model = new SuccessPredictionModel()
      expect(model).toBeDefined()
    })

    it('should create with custom config', () => {
      const config: SuccessPredictionConfig = {
        reliabilityWeight: 0.4,
        loadWeight: 0.2,
      }
      const model = new SuccessPredictionModel(config)
      expect(model).toBeDefined()
    })
  })

  describe('predict', () => {
    const baseInput: SuccessPredictionInput = {
      taskType: 'data-processing',
      agentId: 'agent-1',
      agentReliability: 0.8,
      agentCurrentLoad: 0.3,
      taskComplexity: 0.4,
      dependenciesCount: 2,
      historicalSuccessRate: 0.85,
      timePressure: 0.2,
    }

    it('should predict success for low-risk scenario', () => {
      const model = new SuccessPredictionModel()
      const result = model.predict(baseInput)

      expect(result.successProbability).toBeGreaterThan(0.6)
      expect(['low', 'medium']).toContain(result.riskLevel)
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.recommendations).toBeDefined()
      expect(result.riskFactors).toBeDefined()
    })

    it('should predict low success for high-risk scenario', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        ...baseInput,
        agentReliability: 0.2,
        agentCurrentLoad: 0.9,
        taskComplexity: 0.9,
        dependenciesCount: 10,
        historicalSuccessRate: 0.3,
        timePressure: 0.9,
      }
      const result = model.predict(input)

      expect(result.successProbability).toBeLessThan(0.3)
      expect(result.riskLevel).toBe('critical')
      expect(result.riskFactors.length).toBeGreaterThan(3)
    })

    it('should handle medium risk scenario', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        ...baseInput,
        agentReliability: 0.55,
        agentCurrentLoad: 0.55,
        taskComplexity: 0.55,
      }
      const result = model.predict(input)

      expect(['medium', 'high']).toContain(result.riskLevel)
    })

    it('should handle high risk scenario', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        ...baseInput,
        agentReliability: 0.4,
        agentCurrentLoad: 0.8,
        taskComplexity: 0.8,
      }
      const result = model.predict(input)

      expect(result.riskLevel).toBe('high')
    })
  })

  describe('input validation', () => {
    it('should throw for invalid reliability', () => {
      const model = new SuccessPredictionModel()
      const input = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 1.5, // Invalid
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 0,
      }

      expect(() => model.predict(input)).toThrow('agentReliability must be between 0 and 1')
    })

    it('should throw for negative reliability', () => {
      const model = new SuccessPredictionModel()
      const input = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: -0.1, // Invalid
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 0,
      }

      expect(() => model.predict(input)).toThrow('agentReliability must be between 0 and 1')
    })

    it('should throw for invalid load', () => {
      const model = new SuccessPredictionModel()
      const input = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 1.5, // Invalid
        taskComplexity: 0.5,
        dependenciesCount: 0,
      }

      expect(() => model.predict(input)).toThrow('agentCurrentLoad must be between 0 and 1')
    })

    it('should throw for invalid complexity', () => {
      const model = new SuccessPredictionModel()
      const input = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: -0.5, // Invalid
        dependenciesCount: 0,
      }

      expect(() => model.predict(input)).toThrow('taskComplexity must be between 0 and 1')
    })

    it('should throw for negative dependencies', () => {
      const model = new SuccessPredictionModel()
      const input = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: -1, // Invalid
      }

      expect(() => model.predict(input)).toThrow('dependenciesCount must be non-negative')
    })

    it('should throw for invalid historical success rate', () => {
      const model = new SuccessPredictionModel()
      const input = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 0,
        historicalSuccessRate: 1.5, // Invalid
      }

      expect(() => model.predict(input)).toThrow('historicalSuccessRate must be between 0 and 1')
    })

    it('should throw for invalid time pressure', () => {
      const model = new SuccessPredictionModel()
      const input = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 0,
        timePressure: -0.1, // Invalid
      }

      expect(() => model.predict(input)).toThrow('timePressure must be between 0 and 1')
    })
  })

  describe('boundary conditions', () => {
    it('should handle zero dependencies', () => {
      const model = new SuccessPredictionModel()
      const input = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 0,
      }
      const result = model.predict(input)

      expect(result.successProbability).toBeGreaterThan(0.5)
    })

    it('should handle very high dependencies', () => {
      const model = new SuccessPredictionModel()
      const input = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 100,
      }
      const result = model.predict(input)

      expect(result.riskFactors).toContain('Many dependencies (100)')
    })

    it('should handle edge case: zero reliability', () => {
      const model = new SuccessPredictionModel()
      const input = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 0,
      }
      const result = model.predict(input)

      expect(result.successProbability).toBeLessThan(0.5)
      expect(['high', 'critical']).toContain(result.riskLevel)
    })

    it('should handle edge case: perfect reliability', () => {
      const model = new SuccessPredictionModel()
      const input = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 1,
        agentCurrentLoad: 0,
        taskComplexity: 0,
        dependenciesCount: 0,
      }
      const result = model.predict(input)

      expect(result.successProbability).toBeGreaterThan(0.9)
      expect(result.riskLevel).toBe('low')
    })

    it('should handle all optional fields missing', () => {
      const model = new SuccessPredictionModel()
      const input = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 0,
      }
      const result = model.predict(input)

      expect(result.successProbability).toBeDefined()
      expect(result.riskLevel).toBeDefined()
    })
  })

  describe('batchPredict', () => {
    it('should predict for multiple inputs', () => {
      const model = new SuccessPredictionModel()
      const inputs: SuccessPredictionInput[] = [
        {
          taskType: 'test',
          agentId: 'agent-1',
          agentReliability: 0.9,
          agentCurrentLoad: 0.2,
          taskComplexity: 0.3,
          dependenciesCount: 0,
        },
        {
          taskType: 'test',
          agentId: 'agent-2',
          agentReliability: 0.3,
          agentCurrentLoad: 0.9,
          taskComplexity: 0.8,
          dependenciesCount: 5,
        },
      ]

      const results = model.batchPredict(inputs)

      expect(results).toHaveLength(2)
      expect(results[0].successProbability).toBeGreaterThan(results[1].successProbability)
    })
  })

  describe('custom thresholds', () => {
    it('should use custom risk thresholds', () => {
      const config: SuccessPredictionConfig = {
        riskThresholds: {
          low: 0.9,
          medium: 0.7,
          high: 0.5,
        },
      }
      const model = new SuccessPredictionModel(config)

      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.85,
        agentCurrentLoad: 0.3,
        taskComplexity: 0.4,
        dependenciesCount: 1,
      }
      const result = model.predict(input)

      // With higher thresholds, the same score should be classified as higher risk
      expect(['medium', 'high']).toContain(result.riskLevel)
    })
  })

  describe('custom weights', () => {
    it('should use custom weights', () => {
      const config: SuccessPredictionConfig = {
        reliabilityWeight: 0.5,
        loadWeight: 0.1,
        complexityWeight: 0.1,
        dependenciesWeight: 0.1,
        historicalWeight: 0.1,
        timePressureWeight: 0.1,
      }
      const model = new SuccessPredictionModel(config)

      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 1,
        agentCurrentLoad: 1,
        taskComplexity: 1,
        dependenciesCount: 100,
      }

      // With high reliability weight, should still be relatively high
      const result = model.predict(input)
      expect(result.successProbability).toBeGreaterThan(0.4)
    })
  })

  describe('risk factor detection', () => {
    it('should detect low reliability risk', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.3,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 0,
      }
      const result = model.predict(input)

      expect(result.riskFactors).toContain('Low agent reliability (30%)')
    })

    it('should detect high load risk', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.8,
        taskComplexity: 0.5,
        dependenciesCount: 0,
      }
      const result = model.predict(input)

      expect(result.riskFactors).toContain('High agent load (80%)')
    })

    it('should detect high complexity risk', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.8,
        dependenciesCount: 0,
      }
      const result = model.predict(input)

      expect(result.riskFactors).toContain('High task complexity (80%)')
    })

    it('should detect historical performance risk', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 0,
        historicalSuccessRate: 0.4,
      }
      const result = model.predict(input)

      expect(result.riskFactors).toContain('Poor historical success rate (40%)')
    })

    it('should detect time pressure risk', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 0,
        timePressure: 0.8,
      }
      const result = model.predict(input)

      expect(result.riskFactors).toContain('High time pressure (80%)')
    })
  })

  describe('recommendations', () => {
    it('should recommend for low reliability', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.3,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 0,
      }
      const result = model.predict(input)

      expect(result.recommendations).toContain('Consider assigning to a more reliable agent')
    })

    it('should recommend for high load', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.9,
        taskComplexity: 0.5,
        dependenciesCount: 0,
      }
      const result = model.predict(input)

      expect(result.recommendations).toContain('Wait for agent load to decrease')
    })

    it('should recommend for high complexity', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.9,
        dependenciesCount: 0,
      }
      const result = model.predict(input)

      expect(result.recommendations).toContain('Break down task into smaller subtasks')
    })

    it('should recommend for many dependencies', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 5,
      }
      const result = model.predict(input)

      expect(result.recommendations).toContain('Reduce dependencies if possible')
    })

    it('should recommend for multiple risk factors', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.3,
        agentCurrentLoad: 0.9,
        taskComplexity: 0.9,
        dependenciesCount: 5,
      }
      const result = model.predict(input)

      expect(result.recommendations).toContain(
        'Multiple risk factors detected - consider alternative approach'
      )
    })
  })

  describe('confidence calculation', () => {
    it('should have higher confidence with historical data', () => {
      const model = new SuccessPredictionModel()
      const inputWithoutHistory: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.8,
        agentCurrentLoad: 0.5,
        taskComplexity: 0.5,
        dependenciesCount: 0,
      }
      const inputWithHistory: SuccessPredictionInput = {
        ...inputWithoutHistory,
        historicalSuccessRate: 0.8,
      }

      const resultWithout = model.predict(inputWithoutHistory)
      const resultWith = model.predict(inputWithHistory)

      expect(resultWith.confidence).toBeGreaterThan(resultWithout.confidence)
    })

    it('should have lower confidence for extreme values', () => {
      const model = new SuccessPredictionModel()
      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.95,
        agentCurrentLoad: 0.05,
        taskComplexity: 0.5,
        dependenciesCount: 0,
      }

      const result = model.predict(input)
      // Should have lower confidence due to extreme values
      expect(result.confidence).toBeLessThan(0.8)
    })
  })

  describe('getConfig', () => {
    it('should return current config', () => {
      const config: SuccessPredictionConfig = {
        reliabilityWeight: 0.4,
      }
      const model = new SuccessPredictionModel(config)
      const retrieved = model.getConfig()

      expect(retrieved.reliabilityWeight).toBe(0.4)
    })
  })

  describe('updateConfig', () => {
    it('should update config', () => {
      const model = new SuccessPredictionModel()
      model.updateConfig({ reliabilityWeight: 0.5 })

      const config = model.getConfig()
      expect(config.reliabilityWeight).toBe(0.5)
    })
  })

  describe('createSuccessPredictionModel', () => {
    it('should create model with factory function', () => {
      const model = createSuccessPredictionModel()
      expect(model).toBeInstanceOf(SuccessPredictionModel)
    })
  })

  describe('predictSuccess', () => {
    it('should create temp model and predict', () => {
      const input: SuccessPredictionInput = {
        taskType: 'test',
        agentId: 'agent-1',
        agentReliability: 0.9,
        agentCurrentLoad: 0.1,
        taskComplexity: 0.2,
        dependenciesCount: 0,
      }
      const result = predictSuccess(input)

      expect(result.successProbability).toBeGreaterThan(0.7)
    })
  })
})
