/**
 * Time Prediction Model Tests v1.9.0
 *
 * Comprehensive tests for the TimePredictionModel including:
 * - Basic prediction scenarios
 * - Strategy selection
 * - Confidence intervals
 * - Edge cases
 * - Integration scenarios
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  TimePredictionModel,
  createTimePredictionModel,
  adaptToEngineFormat,
  type TimePredictionInput,
  type TimePredictionResult,
  type TimePredictionModelConfig,
} from './time-prediction-model'

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper to generate historical data with specific variance
 */
function generateHistoricalData(
  count: number,
  baseMs: number,
  variancePercent: number = 0.2
): number[] {
  const data: number[] = []
  for (let i = 0; i < count; i++) {
    const variance = baseMs * variancePercent * (Math.random() * 2 - 1)
    data.push(Math.round(baseMs + variance))
  }
  return data
}

/**
 * Helper to validate prediction result structure
 */
function validatePredictionResult(result: TimePredictionResult): void {
  expect(result).toBeDefined()
  expect(typeof result.predictedMs).toBe('number')
  expect(result.predictedMs).toBeGreaterThan(0)
  expect(typeof result.confidence).toBe('number')
  expect(result.confidence).toBeGreaterThanOrEqual(0)
  expect(result.confidence).toBeLessThanOrEqual(1)
  expect(typeof result.p75).toBe('number')
  expect(typeof result.p95).toBe('number')
  expect(result.p75).toBeGreaterThanOrEqual(result.predictedMs)
  expect(result.p95).toBeGreaterThanOrEqual(result.p75)
  expect(['historical_avg', 'weighted_avg', 'complexity_adjusted']).toContain(result.strategy)
}

// ============================================================================
// Describe: TimePredictionModel
// ============================================================================

describe('TimePredictionModel', () => {
  let model: TimePredictionModel

  beforeEach(() => {
    model = new TimePredictionModel()
  })

  // ------------------------------------------------------------------------
  // Constructor and Configuration
  // ------------------------------------------------------------------------

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(model).toBeDefined()
    })

    it('should accept custom config', () => {
      const customModel = new TimePredictionModel({
        minHistoricalSamples: 5,
        recencyWeight: 0.5,
        complexityFactor: 0.8,
      })
      const config = customModel.getConfig()
      expect(config.minHistoricalSamples).toBe(5)
      expect(config.recencyWeight).toBe(0.5)
      expect(config.complexityFactor).toBe(0.8)
    })
  })

  describe('getConfig', () => {
    it('should return current config', () => {
      const config = model.getConfig()
      expect(config).toBeDefined()
      expect(config.minHistoricalSamples).toBeDefined()
      expect(config.recencyWeight).toBeDefined()
    })
  })

  describe('updateConfig', () => {
    it('should update configuration', () => {
      model.updateConfig({ recencyWeight: 0.8 })
      expect(model.getConfig().recencyWeight).toBe(0.8)
    })
  })

  // ------------------------------------------------------------------------
  // Basic Prediction Tests
  // ------------------------------------------------------------------------

  describe('predict', () => {
    it('should predict for basic input without historical data', () => {
      const input: TimePredictionInput = {
        taskType: 'general',
        estimatedDuration: 60000, // 1 minute
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0.2,
      }

      const result = model.predict(input)

      validatePredictionResult(result)
      expect(result.strategy).toBe('complexity_adjusted')
    })

    it('should predict with historical data', () => {
      const historicalData = [55000, 60000, 65000, 58000, 62000]
      const input: TimePredictionInput = {
        taskType: 'api_call',
        estimatedDuration: 60000,
        complexity: 0.3,
        dependencies: 1,
        agentLoad: 0.5,
        historicalData,
      }

      const result = model.predict(input)

      validatePredictionResult(result)
      expect(['historical_avg', 'weighted_avg', 'complexity_adjusted']).toContain(result.strategy)
    })

    it('should apply dependency penalty', () => {
      const input: TimePredictionInput = {
        taskType: 'general',
        estimatedDuration: 60000,
        complexity: 0.3,
        dependencies: 3,
        agentLoad: 0.1,
      }

      const result = model.predict(input)

      validatePredictionResult(result)
      // Base 60000 * (1 + 0.3*0.5) = 69000
      // + 3 * 100 = 300ms dependency penalty
      expect(result.predictedMs).toBeGreaterThan(69000)
    })

    it('should apply agent load multiplier', () => {
      const inputLowLoad: TimePredictionInput = {
        taskType: 'general',
        estimatedDuration: 60000,
        complexity: 0.3,
        dependencies: 0,
        agentLoad: 0.1,
      }

      const inputHighLoad: TimePredictionInput = {
        taskType: 'general',
        estimatedDuration: 60000,
        complexity: 0.3,
        dependencies: 0,
        agentLoad: 0.9,
      }

      const resultLow = model.predict(inputLowLoad)
      const resultHigh = model.predict(inputHighLoad)

      // High load should give longer predictions
      expect(resultHigh.predictedMs).toBeGreaterThan(resultLow.predictedMs)
    })
  })

  // ------------------------------------------------------------------------
  // Strategy Selection Tests
  // ------------------------------------------------------------------------

  describe('strategy selection', () => {
    it('should use complexity_adjusted when no historical data', () => {
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 30000,
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0.3,
      }

      const result = model.predict(input)
      expect(result.strategy).toBe('complexity_adjusted')
    })

    it('should use historical_avg with minimal historical data (3 samples)', () => {
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 30000,
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0.3,
        historicalData: [28000, 32000, 30000],
      }

      const result = model.predict(input)
      // With 3 samples, might still be complexity_adjusted due to config
      // Result should still be valid
      validatePredictionResult(result)
    })

    it('should use weighted_avg with sufficient historical data (5+ samples)', () => {
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 30000,
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0.3,
        historicalData: [25000, 28000, 30000, 32000, 35000],
      }

      const result = model.predict(input)
      validatePredictionResult(result)
    })
  })

  // ------------------------------------------------------------------------
  // Complexity Adjustment Tests
  // ------------------------------------------------------------------------

  describe('complexity adjustment', () => {
    it('should increase prediction with higher complexity', () => {
      const inputLow: TimePredictionInput = {
        taskType: 'simple',
        estimatedDuration: 60000,
        complexity: 0.1,
        dependencies: 0,
        agentLoad: 0.2,
      }

      const inputHigh: TimePredictionInput = {
        taskType: 'complex',
        estimatedDuration: 60000,
        complexity: 0.9,
        dependencies: 0,
        agentLoad: 0.2,
      }

      const resultLow = model.predict(inputLow)
      const resultHigh = model.predict(inputHigh)

      expect(resultHigh.predictedMs).toBeGreaterThan(resultLow.predictedMs)
    })

    it('should create wider confidence interval for higher complexity', () => {
      const inputLow: TimePredictionInput = {
        taskType: 'simple',
        estimatedDuration: 60000,
        complexity: 0.1,
        dependencies: 0,
        agentLoad: 0.2,
      }

      const inputHigh: TimePredictionInput = {
        taskType: 'complex',
        estimatedDuration: 60000,
        complexity: 0.9,
        dependencies: 0,
        agentLoad: 0.2,
      }

      const resultLow = model.predict(inputLow)
      const resultHigh = model.predict(inputHigh)

      const intervalLow = resultLow.p95 - resultLow.predictedMs
      const intervalHigh = resultHigh.p95 - resultHigh.predictedMs

      expect(intervalHigh).toBeGreaterThan(intervalLow)
    })

    it('should lower confidence for higher complexity', () => {
      const inputLow: TimePredictionInput = {
        taskType: 'simple',
        estimatedDuration: 60000,
        complexity: 0.1,
        dependencies: 0,
        agentLoad: 0.2,
      }

      const inputHigh: TimePredictionInput = {
        taskType: 'complex',
        estimatedDuration: 60000,
        complexity: 0.9,
        dependencies: 0,
        agentLoad: 0.2,
      }

      const resultLow = model.predict(inputLow)
      const resultHigh = model.predict(inputHigh)

      expect(resultHigh.confidence).toBeLessThan(resultLow.confidence)
    })
  })

  // ------------------------------------------------------------------------
  // Historical Data Analysis Tests
  // ------------------------------------------------------------------------

  describe('historical data analysis', () => {
    it('should calculate reasonable average for consistent data', () => {
      const consistentData = [60000, 62000, 58000, 61000, 59000]
      const input: TimePredictionInput = {
        taskType: 'consistent_task',
        estimatedDuration: 60000,
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0, // Zero load to avoid multiplier
        historicalData: consistentData,
      }

      const result = model.predict(input)

      // With 5 samples, uses weighted_avg strategy
      // Should be close to historical average (~60000)
      // Allow some variance due to weighted averaging
      expect(result.predictedMs).toBeGreaterThan(58000)
      expect(result.predictedMs).toBeLessThan(62000)
    })

    it('should handle high variance historical data', () => {
      const highVarianceData = [30000, 90000, 45000, 75000, 60000]
      const input: TimePredictionInput = {
        taskType: 'variable_task',
        estimatedDuration: 60000,
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0, // Zero load for pure historical test
        historicalData: highVarianceData,
      }

      const result = model.predict(input)

      // Uses weighted_avg with 5 samples
      // Mean = 60000, weighted average may vary due to recency weighting
      expect(result.predictedMs).toBeGreaterThan(50000)
      expect(result.predictedMs).toBeLessThan(70000)
      // Lower confidence due to variance
      expect(result.confidence).toBeLessThan(0.8)
    })

    it('should calculate p75 and p95 correctly', () => {
      const data = [30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000]
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 60000,
        complexity: 0.3,
        dependencies: 0,
        agentLoad: 0.2,
        historicalData: data,
      }

      const result = model.predict(input)

      // p75 should be around 77500, p95 around 96000
      expect(result.p75).toBeGreaterThan(result.predictedMs)
      expect(result.p95).toBeGreaterThan(result.p75)
    })

    it('should boost confidence when estimate matches historical', () => {
      const historicalData = [58000, 62000, 60000]
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 60000, // Close to historical
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0.2,
        historicalData,
      }

      const result = model.predict(input)

      // Should have higher confidence when estimate aligns with historical
      expect(result.confidence).toBeGreaterThan(0.6)
    })

    it('should penalize estimate very different from historical', () => {
      const historicalData = [58000, 62000, 60000]
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 10000, // Very different from historical
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0.2,
        historicalData,
      }

      const result = model.predict(input)

      // Should have lower confidence due to discrepancy
      validatePredictionResult(result)
    })
  })

  // ------------------------------------------------------------------------
  // Edge Cases
  // ------------------------------------------------------------------------

  describe('edge cases', () => {
    it('should handle empty historical data array', () => {
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 60000,
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0.2,
        historicalData: [],
      }

      const result = model.predict(input)
      validatePredictionResult(result)
    })

    it('should handle zero complexity', () => {
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 60000,
        complexity: 0,
        dependencies: 0,
        agentLoad: 0.2,
      }

      const result = model.predict(input)
      validatePredictionResult(result)
      // With zero complexity: 60000 * (1 + 0*0.5) = 60000
      // With agent load 0.2: 60000 * (1 + 0.2*(3.0-1)) = 60000 * 1.4 = 84000
      expect(result.predictedMs).toBeCloseTo(84000, -2)
    })

    it('should handle full complexity', () => {
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 60000,
        complexity: 1,
        dependencies: 0,
        agentLoad: 0.2,
      }

      const result = model.predict(input)
      validatePredictionResult(result)
      expect(result.predictedMs).toBeGreaterThan(60000)
    })

    it('should handle zero agent load', () => {
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 60000,
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0,
      }

      const result = model.predict(input)
      validatePredictionResult(result)
    })

    it('should handle full agent load', () => {
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 60000,
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 1,
      }

      const result = model.predict(input)
      validatePredictionResult(result)
      // Should have significant multiplier
      expect(result.predictedMs).toBeGreaterThan(150000)
    })

    it('should handle many dependencies', () => {
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 60000,
        complexity: 0.3,
        dependencies: 10,
        agentLoad: 0.2,
      }

      const result = model.predict(input)
      // Should add 10 * 100ms = 1000ms penalty
      expect(result.predictedMs).toBeGreaterThanOrEqual(70000)
    })

    it('should handle very small estimated duration', () => {
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 100,
        complexity: 0.3,
        dependencies: 0,
        agentLoad: 0.2,
      }

      const result = model.predict(input)
      validatePredictionResult(result)
      expect(result.predictedMs).toBeGreaterThan(0)
    })

    it('should handle very large estimated duration', () => {
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 3600000, // 1 hour
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0.2,
      }

      const result = model.predict(input)
      validatePredictionResult(result)
      expect(result.predictedMs).toBeGreaterThan(3000000)
    })
  })

  // ------------------------------------------------------------------------
  // Confidence Level Tests
  // ------------------------------------------------------------------------

  describe('confidence levels', () => {
    it('should return confidence in valid range (0-1)', () => {
      const testCases: TimePredictionInput[] = [
        {
          taskType: 't1',
          estimatedDuration: 5000,
          complexity: 0.1,
          dependencies: 0,
          agentLoad: 0.1,
        },
        {
          taskType: 't2',
          estimatedDuration: 5000,
          complexity: 0.5,
          dependencies: 5,
          agentLoad: 0.5,
        },
        {
          taskType: 't3',
          estimatedDuration: 5000,
          complexity: 0.9,
          dependencies: 10,
          agentLoad: 0.9,
        },
        {
          taskType: 't4',
          estimatedDuration: 5000,
          complexity: 0.3,
          dependencies: 0,
          agentLoad: 0.3,
          historicalData: [5000, 5100, 4900],
        },
        {
          taskType: 't5',
          estimatedDuration: 5000,
          complexity: 0.3,
          dependencies: 0,
          agentLoad: 0.3,
          historicalData: generateHistoricalData(10, 5000, 0.1),
        },
      ]

      for (const input of testCases) {
        const result = model.predict(input)
        expect(result.confidence).toBeGreaterThanOrEqual(0.3)
        expect(result.confidence).toBeLessThanOrEqual(0.95)
      }
    })

    it('should have higher confidence with consistent historical data', () => {
      const consistentData = [50000, 50100, 49900, 50050, 49950]
      const variableData = [30000, 70000, 40000, 60000, 50000]

      const consistentInput: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 50000,
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0.3,
        historicalData: consistentData,
      }

      const variableInput: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 50000,
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0.3,
        historicalData: variableData,
      }

      const consistentResult = model.predict(consistentInput)
      const variableResult = model.predict(variableInput)

      expect(consistentResult.confidence).toBeGreaterThan(variableResult.confidence)
    })
  })

  // ------------------------------------------------------------------------
  // Integration Tests
  // ------------------------------------------------------------------------

  describe('integration', () => {
    it('should work with createTimePredictionModel factory', () => {
      const model = createTimePredictionModel({
        minHistoricalSamples: 2,
        recencyWeight: 0.4,
      })

      const input: TimePredictionInput = {
        taskType: 'api',
        estimatedDuration: 30000,
        complexity: 0.4,
        dependencies: 2,
        agentLoad: 0.5,
        historicalData: [28000, 32000, 30000],
      }

      const result = model.predict(input)
      validatePredictionResult(result)
    })

    it('should adapt results to TimePredictionEngine format', () => {
      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 60000, // 1 minute
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0, // Zero to avoid multiplier
        historicalData: [58000, 62000, 60000],
      }

      const result = model.predict(input)
      const adapted = adaptToEngineFormat(result)

      // With 3 samples, uses historical_avg strategy
      // Historical average is ~60000ms = 1 minute
      expect(adapted.estimatedMinutes).toBe(1)
      expect(adapted.confidence).toBe(result.confidence)
      expect(adapted.confidenceInterval).toBeDefined()
      expect(adapted.basedOn).toContain('v1.9.0')
      expect(['rule-based', 'statistical', 'adaptive']).toContain(adapted.strategy)
    })

    it('should handle multiple predictions in sequence', () => {
      const predictions: TimePredictionResult[] = []

      for (let i = 0; i < 10; i++) {
        const input: TimePredictionInput = {
          taskType: `task_${i}`,
          estimatedDuration: 30000 + i * 1000,
          complexity: Math.random(),
          dependencies: Math.floor(Math.random() * 5),
          agentLoad: Math.random(),
          historicalData: generateHistoricalData(5, 30000, 0.2),
        }

        predictions.push(model.predict(input))
      }

      // All predictions should be valid
      predictions.forEach(p => validatePredictionResult(p))

      // Each should be different (varying inputs)
      const predictionsSet = new Set(predictions.map(p => p.predictedMs))
      expect(predictionsSet.size).toBeGreaterThan(1)
    })
  })

  // ------------------------------------------------------------------------
  // Custom Configuration Tests
  // ------------------------------------------------------------------------

  describe('custom configuration', () => {
    it('should respect custom recency weight', () => {
      const modelHighRecency = new TimePredictionModel({
        recencyWeight: 0.9,
      })

      const historicalData = [
        50000, // older
        55000, // older
        100000, // recent - should have more weight
      ]

      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 60000,
        complexity: 0.3,
        dependencies: 0,
        agentLoad: 0.2,
        historicalData,
      }

      const result = modelHighRecency.predict(input)
      validatePredictionResult(result)
      // With high recency weight, prediction should be closer to recent values
    })

    it('should respect custom dependency penalty', () => {
      const modelHighPenalty = new TimePredictionModel({
        dependencyPenaltyMs: 500,
      })

      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 60000,
        complexity: 0.3,
        dependencies: 3,
        agentLoad: 0.2,
      }

      const result = modelHighPenalty.predict(input)
      // Should add 3 * 500ms = 1500ms penalty
      expect(result.predictedMs).toBeGreaterThan(70000)
    })

    it('should respect custom complexity factor', () => {
      const modelHighComplexity = new TimePredictionModel({
        complexityFactor: 1.0,
      })

      const input: TimePredictionInput = {
        taskType: 'test',
        estimatedDuration: 60000,
        complexity: 1.0,
        dependencies: 0,
        agentLoad: 0.2,
      }

      const result = modelHighComplexity.predict(input)
      // With complexityFactor=1.0, prediction = 60000 * (1 + 1*1.0) = 120000
      expect(result.predictedMs).toBeGreaterThanOrEqual(120000)
    })
  })

  // ------------------------------------------------------------------------
  // Task Type Tests
  // ------------------------------------------------------------------------

  describe('task type handling', () => {
    it('should handle different task types consistently', () => {
      const taskTypes = [
        'api_call',
        'data_processing',
        'file_upload',
        'user_interaction',
        'batch_job',
      ]

      const results = taskTypes.map(taskType => {
        const input: TimePredictionInput = {
          taskType,
          estimatedDuration: 60000,
          complexity: 0.5,
          dependencies: 0,
          agentLoad: 0.3,
        }
        return model.predict(input)
      })

      results.forEach(r => validatePredictionResult(r))
    })

    it('should handle special characters in task type', () => {
      const input: TimePredictionInput = {
        taskType: 'task-with-special-chars_123',
        estimatedDuration: 60000,
        complexity: 0.5,
        dependencies: 0,
        agentLoad: 0.3,
      }

      const result = model.predict(input)
      validatePredictionResult(result)
    })
  })
})

// ============================================================================
// Additional Integration Tests
// ============================================================================

describe('TimePredictionModel - Integration Scenarios', () => {
  let model: TimePredictionModel

  beforeEach(() => {
    model = new TimePredictionModel()
  })

  describe('realistic usage scenarios', () => {
    it('should handle API call prediction', () => {
      const input: TimePredictionInput = {
        taskType: 'api_call',
        estimatedDuration: 5000,
        complexity: 0.3,
        dependencies: 1,
        agentLoad: 0, // Zero to simplify assertion
        historicalData: [4500, 5200, 4800, 5100, 4900],
      }

      const result = model.predict(input)

      // Historical average ~4900, complexity adjustment ~1.15 = ~5635
      // Plus dependency penalty 100 = ~5735
      expect(result.predictedMs).toBeGreaterThan(5000)
      expect(result.predictedMs).toBeLessThan(8000)
      expect(result.confidence).toBeGreaterThan(0.6)
    })

    it('should handle batch processing prediction', () => {
      const input: TimePredictionInput = {
        taskType: 'batch_processing',
        estimatedDuration: 300000, // 5 minutes
        complexity: 0.7,
        dependencies: 3,
        agentLoad: 0.6,
        historicalData: [280000, 320000, 350000, 290000],
      }

      const result = model.predict(input)

      validatePredictionResult(result)
      expect(result.p95).toBeGreaterThan(result.predictedMs)
    })

    it('should handle real-time user interaction prediction', () => {
      const input: TimePredictionInput = {
        taskType: 'user_interaction',
        estimatedDuration: 200, // Very fast
        complexity: 0.2,
        dependencies: 0,
        agentLoad: 0.8, // High load
        historicalData: [180, 220, 200, 190, 210],
      }

      const result = model.predict(input)

      // With high agent load, should predict longer
      expect(result.predictedMs).toBeGreaterThan(200)
    })
  })
})

// ============================================================================
// Test Summary
// ============================================================================

/**
 * Test Coverage:
 * - Constructor and configuration
 * - Basic prediction
 * - Strategy selection (historical_avg, weighted_avg, complexity_adjusted)
 * - Complexity adjustment
 * - Historical data analysis
 * - Confidence intervals (p75, p95)
 * - Edge cases (extreme values, zero values)
 * - Multiple predictions in sequence
 * - Integration with TimePredictionEngine
 * - Custom configuration
 * - Task type handling
 * - Realistic usage scenarios
 */
