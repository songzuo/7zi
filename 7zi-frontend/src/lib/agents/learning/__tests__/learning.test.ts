/**
 * Unit Tests for Task Time Prediction Model
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TaskTimePredictor } from '../time-prediction'
import type { TaskFeatures } from '../types'

describe('TaskTimePredictor', () => {
  let predictor: TaskTimePredictor

  beforeEach(() => {
    predictor = new TaskTimePredictor({
      minSamplesForPrediction: 3,
      maxHistorySize: 100,
    })
  })

  describe('predict', () => {
    it('should return default estimate when no history', () => {
      const features: TaskFeatures = {
        taskType: 'text-generation',
        inputSize: 1000,
        priority: 'normal',
        timeOfDay: 14,
        dayOfWeek: 3,
        historicalAvgTime: 5000,
        queueDepth: 0,
        agentLoad: 0.5,
      }

      const result = predictor.predict(features, 'agent-1')

      expect(result.estimatedTime).toBeGreaterThan(0)
      expect(result.confidence).toBeLessThan(0.5)
      expect(result.factors).toContain('default_estimate')
    })

    it('should use simple average with limited history', () => {
      const features: TaskFeatures = {
        taskType: 'text-generation',
        inputSize: 1000,
        priority: 'normal',
        timeOfDay: 14,
        dayOfWeek: 3,
        historicalAvgTime: 5000,
        queueDepth: 0,
        agentLoad: 0.5,
      }

      // Add some history
      predictor.update(features, 'agent-1', 4000)
      predictor.update(features, 'agent-1', 5000)

      const result = predictor.predict(features, 'agent-1')

      expect(result.factors).toContain('simple_average')
      expect(result.confidence).toBeGreaterThan(0.2)
    })

    it('should use weighted moving average with enough history', () => {
      const features: TaskFeatures = {
        taskType: 'text-generation',
        inputSize: 1000,
        priority: 'normal',
        timeOfDay: 14,
        dayOfWeek: 3,
        historicalAvgTime: 5000,
        queueDepth: 0,
        agentLoad: 0.5,
      }

      // Add enough history
      for (let i = 0; i < 5; i++) {
        predictor.update(features, 'agent-1', 4000 + i * 100)
      }

      const result = predictor.predict(features, 'agent-1')

      expect(result.factors).toContain('weighted_moving_average')
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should adjust for input size', () => {
      const features: TaskFeatures = {
        taskType: 'text-generation',
        inputSize: 1000000, // Large input
        priority: 'normal',
        timeOfDay: 14,
        dayOfWeek: 3,
        historicalAvgTime: 5000,
        queueDepth: 0,
        agentLoad: 0.5,
      }

      // Add history with small input
      predictor.update({ ...features, inputSize: 1000 }, 'agent-1', 4000)
      predictor.update({ ...features, inputSize: 1000 }, 'agent-1', 4000)
      predictor.update({ ...features, inputSize: 1000 }, 'agent-1', 4000)

      const result = predictor.predict(features, 'agent-1')

      expect(result.factors).toContain('input_size_adjustment')
      // Large input should increase estimated time
      expect(result.estimatedTime).toBeGreaterThan(4000)
    })

    it('should adjust for agent load', () => {
      const features: TaskFeatures = {
        taskType: 'text-generation',
        inputSize: 1000,
        priority: 'normal',
        timeOfDay: 14,
        dayOfWeek: 3,
        historicalAvgTime: 5000,
        queueDepth: 0,
        agentLoad: 0.9, // High load
      }

      // Add history with low load
      predictor.update({ ...features, agentLoad: 0.1 }, 'agent-1', 4000)
      predictor.update({ ...features, agentLoad: 0.1 }, 'agent-1', 4000)
      predictor.update({ ...features, agentLoad: 0.1 }, 'agent-1', 4000)

      const result = predictor.predict(features, 'agent-1')

      expect(result.factors).toContain('agent_load_adjustment')
      // High load should increase estimated time
      expect(result.estimatedTime).toBeGreaterThan(4000)
    })

    it('should handle different agents separately', () => {
      const features: TaskFeatures = {
        taskType: 'text-generation',
        inputSize: 1000,
        priority: 'normal',
        timeOfDay: 14,
        dayOfWeek: 3,
        historicalAvgTime: 5000,
        queueDepth: 0,
        agentLoad: 0.5,
      }

      // Agent 1: Fast
      for (let i = 0; i < 5; i++) {
        predictor.update(features, 'agent-1', 2000)
      }

      // Agent 2: Slow
      for (let i = 0; i < 5; i++) {
        predictor.update(features, 'agent-2', 8000)
      }

      const result1 = predictor.predict(features, 'agent-1')
      const result2 = predictor.predict(features, 'agent-2')

      expect(result1.estimatedTime).toBeLessThan(result2.estimatedTime)
    })
  })

  describe('update', () => {
    it('should update history correctly', () => {
      const features: TaskFeatures = {
        taskType: 'text-generation',
        inputSize: 1000,
        priority: 'normal',
        timeOfDay: 14,
        dayOfWeek: 3,
        historicalAvgTime: 5000,
        queueDepth: 0,
        agentLoad: 0.5,
      }

      predictor.update(features, 'agent-1', 4000)
      predictor.update(features, 'agent-1', 5000)

      const history = predictor.getHistory('agent-1', 'text-generation')

      expect(history).toHaveLength(2)
      expect(history[0].executionTime).toBe(4000)
      expect(history[1].executionTime).toBe(5000)
    })

    it('should trim history when exceeding max size', () => {
      const predictor = new TaskTimePredictor({ maxHistorySize: 10 })

      const features: TaskFeatures = {
        taskType: 'text-generation',
        inputSize: 1000,
        priority: 'normal',
        timeOfDay: 14,
        dayOfWeek: 3,
        historicalAvgTime: 5000,
        queueDepth: 0,
        agentLoad: 0.5,
      }

      for (let i = 0; i < 15; i++) {
        predictor.update(features, 'agent-1', 4000 + i * 100)
      }

      const history = predictor.getHistory('agent-1', 'text-generation')

      expect(history).toHaveLength(10)
    })
  })

  describe('getAccuracy', () => {
    it('should return 0 when insufficient data', () => {
      const accuracy = predictor.getAccuracy()
      expect(accuracy).toBe(0)
    })

    it('should calculate accuracy with enough data', () => {
      const features: TaskFeatures = {
        taskType: 'text-generation',
        inputSize: 1000,
        priority: 'normal',
        timeOfDay: 14,
        dayOfWeek: 3,
        historicalAvgTime: 5000,
        queueDepth: 0,
        agentLoad: 0.5,
      }

      // Add consistent history
      for (let i = 0; i < 20; i++) {
        predictor.update(features, 'agent-1', 4000)
      }

      const accuracy = predictor.getAccuracy('agent-1', 'text-generation')

      // With consistent times, accuracy should be high
      expect(accuracy).toBeGreaterThan(0.8)
    })
  })

  describe('persistence', () => {
    it('should export and import data correctly', () => {
      const features: TaskFeatures = {
        taskType: 'text-generation',
        inputSize: 1000,
        priority: 'normal',
        timeOfDay: 14,
        dayOfWeek: 3,
        historicalAvgTime: 5000,
        queueDepth: 0,
        agentLoad: 0.5,
      }

      for (let i = 0; i < 5; i++) {
        predictor.update(features, 'agent-1', 4000 + i * 100)
      }

      const exported = predictor.exportData()

      const newPredictor = new TaskTimePredictor()
      newPredictor.importData(exported)

      const result = newPredictor.predict(features, 'agent-1')

      expect(result.estimatedTime).toBeGreaterThan(0)
      expect(result.factors).toContain('weighted_moving_average')
    })
  })
})

/**
 * Unit Tests for Agent Capability Assessor
 */

import { AgentCapabilityAssessor } from '../agent-capability'
import type { TaskHistoryRecord } from '../types'

describe('AgentCapabilityAssessor', () => {
  let assessor: AgentCapabilityAssessor

  beforeEach(() => {
    assessor = new AgentCapabilityAssessor({
      minTasksForAssessment: 5,
    })
  })

  describe('assess', () => {
    it('should return default assessment for new agents', () => {
      const result = assessor.assess('new-agent')

      expect(result.overallScore).toBe(50)
      expect(result.confidence).toBe(0)
      expect(result.recommendations).toContain('数据不足，需要更多任务进行评估')
    })

    it('should assess agent with enough history', () => {
      const now = Date.now()

      // Add completed tasks with reasonable execution times
      for (let i = 0; i < 10; i++) {
        const record: TaskHistoryRecord = {
          taskId: `task-${i}`,
          taskType: 'text-generation',
          agentId: 'agent-1',
          createdAt: now - 3600000 + i * 60000,
          startedAt: now - 3500000 + i * 60000,
          completedAt: now - 3400000 + i * 60000,
          queueWaitTime: 60000,
          executionTime: 15000, // 15 seconds - close to baseline
          status: 'completed',
          outputSize: 1000,
          retryCount: 0,
          priority: 'normal',
          inputSize: 1000,
          agentLoadAtStart: 0.5,
        }
        assessor.recordTask(record)
      }

      const result = assessor.assess('agent-1')

      expect(result.overallScore).toBeGreaterThan(0)
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.dimensions.technical.score).toBeGreaterThan(0)
      expect(result.dimensions.speed.score).toBeGreaterThanOrEqual(0)
      expect(typeof result.dimensions.reliability.score).toBe('number')
      expect(result.dimensions.reliability.score).toBeGreaterThan(0)
    })

    it('should detect failed tasks', () => {
      const now = Date.now()

      // Mix of completed and failed
      for (let i = 0; i < 10; i++) {
        const record: TaskHistoryRecord = {
          taskId: `task-${i}`,
          taskType: 'text-generation',
          agentId: 'agent-1',
          createdAt: now - 3600000 + i * 60000,
          startedAt: now - 3500000 + i * 60000,
          completedAt: now - 3400000 + i * 60000,
          queueWaitTime: 60000,
          executionTime: 100000,
          status: i % 3 === 0 ? 'failed' : 'completed',
          outputSize: 1000,
          retryCount: 0,
          priority: 'normal',
          inputSize: 1000,
          agentLoadAtStart: 0.5,
        }
        assessor.recordTask(record)
      }

      const result = assessor.assess('agent-1')

      // Reliability score should be lower
      expect(typeof result.dimensions.reliability.score).toBe('number')
      expect(result.dimensions.reliability.score).toBeLessThan(100)
      expect(typeof result.dimensions.reliability.failureRate).toBe('number')
      expect(result.dimensions.reliability.failureRate).toBeGreaterThan(0)
    })

    it('should calculate speed score based on completion time', () => {
      const now = Date.now()

      // Fast agent
      for (let i = 0; i < 10; i++) {
        const record: TaskHistoryRecord = {
          taskId: `task-${i}`,
          taskType: 'text-generation',
          agentId: 'fast-agent',
          createdAt: now - 3600000 + i * 60000,
          startedAt: now - 3500000 + i * 60000,
          completedAt: now - 3400000 + i * 60000,
          queueWaitTime: 60000,
          executionTime: 5000, // Very fast
          status: 'completed',
          outputSize: 1000,
          retryCount: 0,
          priority: 'normal',
          inputSize: 1000,
          agentLoadAtStart: 0.5,
        }
        assessor.recordTask(record)
      }

      const result = assessor.assess('fast-agent')

      expect(result.dimensions.speed.score).toBeGreaterThan(70)
    })

    it('should generate appropriate recommendations', () => {
      const now = Date.now()

      // Good performance
      for (let i = 0; i < 15; i++) {
        const record: TaskHistoryRecord = {
          taskId: `task-${i}`,
          taskType: 'text-generation',
          agentId: 'good-agent',
          createdAt: now - 3600000 + i * 60000,
          startedAt: now - 3500000 + i * 60000,
          completedAt: now - 3400000 + i * 60000,
          queueWaitTime: 60000,
          executionTime: 10000,
          status: 'completed',
          outputSize: 1000,
          retryCount: 0,
          priority: 'normal',
          inputSize: 1000,
          agentLoadAtStart: 0.5,
        }
        assessor.recordTask(record)
      }

      const result = assessor.assess('good-agent')

      // Should have positive recommendations
      expect(result.recommendations.length).toBeGreaterThan(0)
    })
  })

  describe('getTrend', () => {
    it('should return stable trend for insufficient data', () => {
      const trend = assessor.getTrend('agent-1', 'text-generation')

      expect(trend.direction).toBe('stable')
      expect(trend.confidence).toBe(0)
    })

    it('should detect improving trend', () => {
      const now = Date.now()

      // Historical: low success rate
      for (let i = 0; i < 10; i++) {
        const record: TaskHistoryRecord = {
          taskId: `task-h-${i}`,
          taskType: 'text-generation',
          agentId: 'agent-1',
          createdAt: now - 86400000 * 5 + i * 60000,
          startedAt: now - 86400000 * 5 + i * 60000 + 100000,
          completedAt: now - 86400000 * 5 + i * 60000 + 200000,
          queueWaitTime: 60000,
          executionTime: 100000,
          status: i % 2 === 0 ? 'completed' : 'failed', // 50% success
          outputSize: 1000,
          retryCount: 0,
          priority: 'normal',
          inputSize: 1000,
          agentLoadAtStart: 0.5,
        }
        assessor.recordTask(record)
      }

      // First assessment - stores baseline
      assessor.assess('agent-1')

      // Recent: high success rate
      for (let i = 0; i < 10; i++) {
        const record: TaskHistoryRecord = {
          taskId: `task-r-${i}`,
          taskType: 'text-generation',
          agentId: 'agent-1',
          createdAt: now - 3600000 + i * 60000,
          startedAt: now - 3500000 + i * 60000,
          completedAt: now - 3400000 + i * 60000,
          queueWaitTime: 60000,
          executionTime: 100000,
          status: 'completed', // 100% success
          outputSize: 1000,
          retryCount: 0,
          priority: 'normal',
          inputSize: 1000,
          agentLoadAtStart: 0.5,
        }
        assessor.recordTask(record)
      }

      // Second assessment - should detect improvement
      const result = assessor.assess('agent-1')

      // Check that changes are detected
      expect(result.changes.improved.length + result.changes.stable.length).toBeGreaterThan(0)
    })
  })

  describe('persistence', () => {
    it('should export and import data correctly', () => {
      const now = Date.now()

      for (let i = 0; i < 10; i++) {
        const record: TaskHistoryRecord = {
          taskId: `task-${i}`,
          taskType: 'text-generation',
          agentId: 'agent-1',
          createdAt: now - 3600000 + i * 60000,
          startedAt: now - 3500000 + i * 60000,
          completedAt: now - 3400000 + i * 60000,
          queueWaitTime: 60000,
          executionTime: 100000,
          status: 'completed',
          outputSize: 1000,
          retryCount: 0,
          priority: 'normal',
          inputSize: 1000,
          agentLoadAtStart: 0.5,
        }
        assessor.recordTask(record)
      }

      const exported = assessor.exportData()

      const newAssessor = new AgentCapabilityAssessor()
      newAssessor.importData(exported)

      const result = newAssessor.assess('agent-1')

      expect(result.overallScore).toBeGreaterThan(0)
    })
  })
})

/**
 * Unit Tests for Learning Persistence
 */

import { LearningPersistence } from '../learning-data'

describe('LearningPersistence', () => {
  let persistence: LearningPersistence

  beforeEach(() => {
    persistence = new LearningPersistence({
      storageKey: 'test-learning-data',
      maxHistorySize: 100,
    })
  })

  afterEach(() => {
    persistence.stopAutoSave()
    persistence.clear()
  })

  describe('task history', () => {
    it('should add and retrieve task records', () => {
      const record: TaskHistoryRecord = {
        taskId: 'task-1',
        taskType: 'text-generation',
        agentId: 'agent-1',
        createdAt: Date.now() - 100000,
        startedAt: Date.now() - 90000,
        completedAt: Date.now(),
        queueWaitTime: 10000,
        executionTime: 90000,
        status: 'completed',
        outputSize: 1000,
        retryCount: 0,
        priority: 'normal',
        inputSize: 1000,
        agentLoadAtStart: 0.5,
      }

      persistence.addTaskRecord(record)

      const history = persistence.getTaskHistory()

      expect(history).toHaveLength(1)
      expect(history[0].taskId).toBe('task-1')
    })

    it('should filter history by agent', () => {
      const now = Date.now()

      for (let i = 0; i < 5; i++) {
        persistence.addTaskRecord({
          taskId: `task-${i}`,
          taskType: 'text-generation',
          agentId: i < 3 ? 'agent-1' : 'agent-2',
          createdAt: now - 100000 + i * 1000,
          startedAt: now - 90000 + i * 1000,
          completedAt: now + i * 1000,
          queueWaitTime: 10000,
          executionTime: 90000,
          status: 'completed',
          outputSize: 1000,
          retryCount: 0,
          priority: 'normal',
          inputSize: 1000,
          agentLoadAtStart: 0.5,
        })
      }

      const agent1History = persistence.getTaskHistory('agent-1')
      const agent2History = persistence.getTaskHistory('agent-2')

      expect(agent1History).toHaveLength(3)
      expect(agent2History).toHaveLength(2)
    })

    it('should limit history results', () => {
      const now = Date.now()

      for (let i = 0; i < 20; i++) {
        persistence.addTaskRecord({
          taskId: `task-${i}`,
          taskType: 'text-generation',
          agentId: 'agent-1',
          createdAt: now - 100000 + i * 1000,
          startedAt: now - 90000 + i * 1000,
          completedAt: now + i * 1000,
          queueWaitTime: 10000,
          executionTime: 90000,
          status: 'completed',
          outputSize: 1000,
          retryCount: 0,
          priority: 'normal',
          inputSize: 1000,
          agentLoadAtStart: 0.5,
        })
      }

      const history = persistence.getTaskHistory(undefined, undefined, 10)

      expect(history).toHaveLength(10)
    })
  })

  describe('compression', () => {
    it('should compress and restore state', async () => {
      const now = Date.now()

      for (let i = 0; i < 10; i++) {
        persistence.addTaskRecord({
          taskId: `task-${i}`,
          taskType: i % 2 === 0 ? 'text-generation' : 'image-generation',
          agentId: i % 2 === 0 ? 'agent-1' : 'agent-2',
          createdAt: now - 100000 + i * 1000,
          startedAt: now - 90000 + i * 1000,
          completedAt: now + i * 1000,
          queueWaitTime: 10000,
          executionTime: 90000 + i * 1000,
          status: 'completed',
          outputSize: 1000,
          retryCount: 0,
          priority: 'normal',
          inputSize: 1000,
          agentLoadAtStart: 0.5,
        })
      }

      const exported = await persistence.exportData()
      const state = JSON.parse(exported)

      expect(state.version).toBe('1.0.0')
      expect(state.compressedHistory).toHaveLength(10)
      expect(state.lookupTables.agents).toContain('agent-1')
      expect(state.lookupTables.agents).toContain('agent-2')
      expect(state.summary.totalTasks).toBe(10)
    })
  })

  describe('sync status', () => {
    it('should track pending changes', () => {
      persistence.addTaskRecord({
        taskId: 'task-1',
        taskType: 'text-generation',
        agentId: 'agent-1',
        createdAt: Date.now() - 100000,
        startedAt: Date.now() - 90000,
        completedAt: Date.now(),
        queueWaitTime: 10000,
        executionTime: 90000,
        status: 'completed',
        outputSize: 1000,
        retryCount: 0,
        priority: 'normal',
        inputSize: 1000,
        agentLoadAtStart: 0.5,
      })

      const syncStatus = persistence.getSyncStatus()

      expect(syncStatus.pendingChanges).toBe(1)
    })
  })

  describe('statistics', () => {
    it('should return correct statistics', () => {
      const now = Date.now()

      for (let i = 0; i < 5; i++) {
        persistence.addTaskRecord({
          taskId: `task-${i}`,
          taskType: 'text-generation',
          agentId: 'agent-1',
          createdAt: now - 100000 + i * 1000,
          startedAt: now - 90000 + i * 1000,
          completedAt: now + i * 1000,
          queueWaitTime: 10000,
          executionTime: 90000,
          status: 'completed',
          outputSize: 1000,
          retryCount: 0,
          priority: 'normal',
          inputSize: 1000,
          agentLoadAtStart: 0.5,
        })
      }

      const stats = persistence.getStatistics()

      expect(stats.totalRecords).toBe(5)
      expect(stats.memoryUsage).toBeGreaterThan(0)
    })
  })
})
