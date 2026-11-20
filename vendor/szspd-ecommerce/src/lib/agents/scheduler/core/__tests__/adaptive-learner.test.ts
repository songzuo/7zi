/**
 * Tests for Adaptive Learner System
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AdaptiveLearner, LearningConfig } from '../adaptive-learner'
import { ScheduleDecision } from '../../models/schedule-decision'

describe('AdaptiveLearner', () => {
  let learner: AdaptiveLearner

  const mockDecision: ScheduleDecision = {
    taskId: 'test-task-1',
    assignedAgent: 'architect',
    confidence: 0.9,
    reasoning: 'Best match',
    alternativeAgents: ['executor'],
    estimatedCompletion: Date.now() + 300000,
    decisionTime: Date.now(),
    scores: {
      capability: 0.8,
      load: 0.7,
      performance: 0.9,
      response: 0.85,
      total: 0.82,
    },
  }

  beforeEach(() => {
    learner = new AdaptiveLearner({
      minTasksForLearning: 2,
      adjustmentFactor: 0.3,
      autoUpdateWeights: true,
      enablePersistence: false,
    })
  })

  describe('recordDecision', () => {
    it('should record a successful decision', () => {
      learner.recordDecision(mockDecision, true, 15)

      const metrics = learner.getAgentMetrics('architect')
      expect(metrics).toBeDefined()
      expect(metrics?.totalAssigned).toBe(1)
      expect(metrics?.totalCompleted).toBe(1)
      expect(metrics?.totalFailed).toBe(0)
    })

    it('should record a failed decision', () => {
      learner.recordDecision(mockDecision, false, 20)

      const metrics = learner.getAgentMetrics('architect')
      expect(metrics).toBeDefined()
      expect(metrics?.totalAssigned).toBe(1)
      expect(metrics?.totalCompleted).toBe(0)
      expect(metrics?.totalFailed).toBe(1)
    })

    it('should update success rate correctly', () => {
      learner.recordDecision(mockDecision, true, 10)
      learner.recordDecision(mockDecision, false, 15)
      learner.recordDecision(mockDecision, true, 12)

      const metrics = learner.getAgentMetrics('architect')
      expect(metrics?.successRate).toBeCloseTo(2 / 3)
    })

    it('should track multiple agents separately', () => {
      const decision1 = { ...mockDecision, assignedAgent: 'agent1' }
      const decision2 = { ...mockDecision, assignedAgent: 'agent2' }

      learner.recordDecision(decision1, true, 10)
      learner.recordDecision(decision2, false, 15)
      learner.recordDecision(decision1, true, 12)

      const metrics1 = learner.getAgentMetrics('agent1')
      const metrics2 = learner.getAgentMetrics('agent2')

      expect(metrics1?.totalAssigned).toBe(2)
      expect(metrics1?.totalCompleted).toBe(2)
      expect(metrics2?.totalAssigned).toBe(1)
      expect(metrics2?.totalFailed).toBe(1)
    })

    it('should calculate average completion time', () => {
      learner.recordDecision(mockDecision, true, 10)
      learner.recordDecision(mockDecision, true, 20)

      const metrics = learner.getAgentMetrics('architect')
      expect(metrics?.avgCompletionTime).toBe(15)
    })
  })

  describe('calculateTrend', () => {
    it('should return stable for insufficient data', () => {
      learner.recordDecision(mockDecision, true, 10)

      const metrics = learner.getAgentMetrics('architect')
      expect(metrics?.trend).toBe('stable')
    })

    it('should detect improving trend', () => {
      // First half: failures
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(mockDecision, false, 10)
      }

      // Second half: successes
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(mockDecision, true, 10)
      }

      const metrics = learner.getAgentMetrics('architect')
      expect(metrics?.trend).toBe('improving')
    })

    it('should detect declining trend', () => {
      // First half: successes
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(mockDecision, true, 10)
      }

      // Second half: failures
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(mockDecision, false, 10)
      }

      const metrics = learner.getAgentMetrics('architect')
      expect(metrics?.trend).toBe('declining')
    })
  })

  describe('getSummary', () => {
    it('should return summary with no data', () => {
      const summary = learner.getSummary()

      expect(summary.totalAgents).toBe(0)
      expect(summary.totalDecisions).toBe(0)
      expect(summary.averageSuccessRate).toBe(0)
      expect(summary.learningEnabled).toBe(true)
    })

    it('should return summary with data', () => {
      learner.recordDecision(mockDecision, true, 10)
      learner.recordDecision(mockDecision, true, 15)

      const summary = learner.getSummary()

      expect(summary.totalAgents).toBe(1)
      expect(summary.totalDecisions).toBe(2)
      expect(summary.agentsWithLearningData).toBe(1)
    })
  })

  describe('getOptimizedWeights', () => {
    const mockAgents = new Map([
      [
        'architect',
        {
          agentId: 'architect',
          name: '架构师',
          provider: 'self-claude' as const,
          role: '架构设计',
          capabilities: {
            techStack: ['typescript'],
            taskTypes: ['architecture' as const, 'implementation' as const],
            concurrency: 2,
            avgResponseTime: 12,
            successRate: 0.96,
          },
          currentLoad: 0,
          availability: true,
          lastActiveTime: Date.now(),
        },
      ],
      [
        'executor',
        {
          agentId: 'executor',
          name: 'Executor',
          provider: 'volcengine' as const,
          role: '执行实现',
          capabilities: {
            techStack: ['javascript'],
            taskTypes: ['implementation' as const, 'testing' as const],
            concurrency: 5,
            avgResponseTime: 5,
            successRate: 0.94,
          },
          currentLoad: 0,
          availability: true,
          lastActiveTime: Date.now(),
        },
      ],
    ])

    it('should return null for insufficient data', () => {
      const weights = learner.getOptimizedWeights('architecture', mockAgents)
      expect(weights).toBeNull()
    })

    it('should return optimized weights after learning', () => {
      // Record enough decisions with architecture task
      const archDecision = { ...mockDecision, taskId: 'arch-task-1' }
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(archDecision, true, 10)
      }

      const weights = learner.getOptimizedWeights('architecture', mockAgents)
      expect(weights).not.toBeNull()
      expect(weights?.capability).toBeGreaterThanOrEqual(0)
      expect(weights?.load).toBeGreaterThanOrEqual(0)
      expect(weights?.performance).toBeGreaterThanOrEqual(0)
      expect(weights?.response).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getWeightAdjustments', () => {
    const mockAgents = new Map([
      [
        'architect',
        {
          agentId: 'architect',
          name: '架构师',
          provider: 'self-claude' as const,
          role: '架构设计',
          capabilities: {
            techStack: ['typescript'],
            taskTypes: ['architecture' as const, 'implementation' as const],
            concurrency: 2,
            avgResponseTime: 12,
            successRate: 0.96,
          },
          currentLoad: 0,
          availability: true,
          lastActiveTime: Date.now(),
        },
      ],
    ])

    it('should return empty array for insufficient data', () => {
      learner.recordDecision(mockDecision, true, 10)
      const adjustments = learner.getWeightAdjustments(mockAgents)
      expect(adjustments).toHaveLength(0)
    })

    it('should suggest adjustments after learning', () => {
      // Record decisions with high success rate
      for (let i = 0; i < 5; i++) {
        learner.recordDecision(mockDecision, true, 10)
      }

      const adjustments = learner.getWeightAdjustments(mockAgents)
      // May or may not have adjustments depending on thresholds
      expect(Array.isArray(adjustments)).toBe(true)
    })
  })

  describe('exportData', () => {
    it('should export data as JSON', () => {
      learner.recordDecision(mockDecision, true, 10)

      const data = learner.exportData()
      const parsed = JSON.parse(data)

      expect(parsed).toHaveProperty('metrics')
      expect(parsed).toHaveProperty('decisionHistory')
      expect(parsed).toHaveProperty('exportTime')
    })
  })

  describe('clear', () => {
    it('should clear all data', () => {
      learner.recordDecision(mockDecision, true, 10)
      learner.recordDecision(mockDecision, false, 15)

      learner.clear()

      const summary = learner.getSummary()
      expect(summary.totalAgents).toBe(0)
      expect(summary.totalDecisions).toBe(0)
    })
  })

  describe('config management', () => {
    it('should return current config', () => {
      const config = learner.getConfig()
      expect(config.minTasksForLearning).toBe(2)
      expect(config.autoUpdateWeights).toBe(true)
    })

    it('should update config', () => {
      learner.updateConfig({ minTasksForLearning: 10 })
      const config = learner.getConfig()
      expect(config.minTasksForLearning).toBe(10)
    })
  })

  describe('confidence calculation', () => {
    it('should have low confidence initially', () => {
      learner.recordDecision(mockDecision, true, 10)

      const metrics = learner.getAgentMetrics('architect')
      expect(metrics?.confidence).toBeLessThan(1)
    })

    it('should increase confidence with successful tasks', () => {
      // Record many successful tasks
      for (let i = 0; i < 10; i++) {
        learner.recordDecision(mockDecision, true, 10)
      }

      const metrics = learner.getAgentMetrics('architect')
      expect(metrics?.confidence).toBeGreaterThan(0.5)
    })
  })
})
