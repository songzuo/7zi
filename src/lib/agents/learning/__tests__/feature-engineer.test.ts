/**
 * Unit Tests for FeatureEngineer
 *
 * Test coverage for:
 * - Task feature extraction
 * - Agent feature extraction
 * - Context feature extraction
 * - Feature normalization
 * - Feature importance analysis
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  FeatureEngineer,
  InMemoryFeatureStore,
  createFeatureEngineer,
  createFeatureEngineerWithStore,
  type TaskInput,
  type AgentInput,
  type TaskFeatures,
  type AgentFeatures,
  type ContextFeatures,
  type FeatureStore,
} from '../feature-engineer'

// ============================================================================
// Test Fixtures
// ============================================================================

const mockTask: TaskInput = {
  id: 'task-001',
  type: 'analysis',
  dependencies: ['task-000'],
  priority: 'high',
  createdAt: Date.now(),
  metadata: {
    source: 'test',
    complexity: 'high',
  },
}

const mockSimpleTask: TaskInput = {
  id: 'task-simple',
  type: 'read',
  dependencies: [],
  priority: 'normal',
}

const mockComplexTask: TaskInput = {
  id: 'task-complex',
  type: 'integration',
  dependencies: ['dep-1', 'dep-2', 'dep-3'],
  priority: 'urgent',
  input: { data: 'x'.repeat(15000) },
}

const mockAgent: AgentInput = {
  id: 'agent-001',
  name: 'Test Agent',
  capabilities: ['analysis', 'generation', 'testing'],
  status: 'idle',
  currentTasks: 0,
  maxTasks: 5,
  performance: {
    avgTime: 45000,
    successRate: 0.95,
    totalCompleted: 100,
    totalFailed: 5,
  },
}

const mockBusyAgent: AgentInput = {
  id: 'agent-busy',
  name: 'Busy Agent',
  capabilities: ['query', 'read'],
  status: 'busy',
  currentTasks: 4,
  maxTasks: 5,
  performance: {
    avgTime: 60000,
    successRate: 0.8,
    totalCompleted: 50,
    totalFailed: 10,
  },
}

// ============================================================================
// InMemoryFeatureStore Tests
// ============================================================================

describe('InMemoryFeatureStore', () => {
  let store: InMemoryFeatureStore

  beforeEach(() => {
    store = new InMemoryFeatureStore()
  })

  describe('Task Features', () => {
    it('should return null for non-existent task features', async () => {
      const features = await store.getTaskFeatures('non-existent')
      expect(features).toBeNull()
    })

    it('should store and retrieve task features', async () => {
      const features: TaskFeatures = {
        complexity: 7,
        estimatedDuration: 60000,
        dependencyCount: 2,
        taskType: 'moderate',
        requiresExternal: false,
        isIdempotent: true,
        historicalAvgDuration: 55000,
        historicalSuccessRate: 0.9,
        recentFailureCount: 1,
      }

      await store.updateTaskFeatures('task-001', features)
      const retrieved = await store.getTaskFeatures('task-001')

      expect(retrieved).not.toBeNull()
      expect(retrieved?.complexity).toBe(7)
      expect(retrieved?.taskType).toBe('moderate')
    })

    it('should merge partial task features', async () => {
      await store.updateTaskFeatures('task-001', { complexity: 5 })
      await store.updateTaskFeatures('task-001', { dependencyCount: 3 })

      const features = await store.getTaskFeatures('task-001')
      expect(features?.complexity).toBe(5)
      expect(features?.dependencyCount).toBe(3)
    })
  })

  describe('Agent Features', () => {
    it('should return null for non-existent agent features', async () => {
      const features = await store.getAgentFeatures('non-existent')
      expect(features).toBeNull()
    })

    it('should store and retrieve agent features', async () => {
      const features: AgentFeatures = {
        capabilities: ['analysis', 'testing'],
        currentLoad: 0.5,
        maxConcurrentTasks: 4,
        avgExecutionTime: 30000,
        successRate: 0.95,
        reliability: 0.9,
        totalTasksCompleted: 150,
        specializationScore: { analysis: 0.9 },
      }

      await store.updateAgentFeatures('agent-001', features)
      const retrieved = await store.getAgentFeatures('agent-001')

      expect(retrieved).not.toBeNull()
      expect(retrieved?.capabilities).toEqual(['analysis', 'testing'])
      expect(retrieved?.currentLoad).toBe(0.5)
    })

    it('should merge partial agent features', async () => {
      await store.updateAgentFeatures('agent-001', { currentLoad: 0.3 })
      await store.updateAgentFeatures('agent-001', { successRate: 0.85 })

      const features = await store.getAgentFeatures('agent-001')
      expect(features?.currentLoad).toBe(0.3)
      expect(features?.successRate).toBe(0.85)
    })
  })

  describe('Context Features', () => {
    it('should return context features', () => {
      const context = store.getContextFeatures()

      expect(context.hourOfDay).toBeGreaterThanOrEqual(0)
      expect(context.hourOfDay).toBeLessThanOrEqual(23)
      expect(context.dayOfWeek).toBeGreaterThanOrEqual(0)
      expect(context.dayOfWeek).toBeLessThanOrEqual(6)
      expect(typeof context.isWeekend).toBe('boolean')
    })

    it('should update context features', () => {
      store.updateContext({
        systemLoad: 0.75,
        availableMemory: 1024 * 1024 * 1024,
        activeConnections: 10,
      })

      const context = store.getContextFeatures()
      expect(context.systemLoad).toBe(0.75)
      expect(context.availableMemory).toBe(1024 * 1024 * 1024)
      expect(context.activeConnections).toBe(10)
    })
  })

  describe('Historical Features', () => {
    it('should return historical features with default values', async () => {
      const features = await store.getHistoricalFeatures('analysis', 7)

      expect(features).toBeDefined()
      expect(features.taskType).toBe('analysis')
      expect(features.historicalAvgDuration).toBeGreaterThan(0)
    })
  })
})

// ============================================================================
// FeatureEngineer Tests
// ============================================================================

describe('FeatureEngineer', () => {
  let engineer: FeatureEngineer
  let store: InMemoryFeatureStore

  beforeEach(() => {
    store = new InMemoryFeatureStore()
    engineer = new FeatureEngineer(store)
  })

  // ==========================================================================
  // Task Feature Extraction
  // ==========================================================================

  describe('extractTaskFeatures', () => {
    it('should extract features from a simple task', () => {
      const features = engineer.extractTaskFeatures(mockSimpleTask)

      expect(features.complexity).toBeGreaterThanOrEqual(1)
      expect(features.complexity).toBeLessThanOrEqual(10)
      expect(features.dependencyCount).toBe(0)
      expect(features.taskType).toBe('simple')
      expect(features.isIdempotent).toBe(true)
    })

    it('should extract features from a complex task', () => {
      const features = engineer.extractTaskFeatures(mockComplexTask)

      expect(features.complexity).toBeGreaterThan(5)
      expect(features.dependencyCount).toBe(3)
      expect(features.taskType).toBe('complex') // 7 complexity -> complex (7-9 range)
      expect(features.estimatedDuration).toBeGreaterThan(30000)
    })

    it('should detect external resource requirements', () => {
      const externalTask: TaskInput = {
        id: 'task-ext',
        type: 'api_fetch',
      }

      const features = engineer.extractTaskFeatures(externalTask)
      expect(features.requiresExternal).toBe(true)
    })

    it('should detect non-idempotent operations', () => {
      const nonIdempotentTask: TaskInput = {
        id: 'task-create',
        type: 'create_user',
      }

      const features = engineer.extractTaskFeatures(nonIdempotentTask)
      expect(features.isIdempotent).toBe(false)
    })

    it('should calculate complexity based on dependencies', () => {
      const highDepsTask: TaskInput = {
        id: 'task-deps',
        type: 'workflow',
        dependencies: ['d1', 'd2', 'd3', 'd4', 'd5'],
      }

      const features = engineer.extractTaskFeatures(highDepsTask)
      expect(features.complexity).toBeGreaterThan(5)
      expect(features.dependencyCount).toBe(5)
    })

    it('should calculate complexity based on input size', () => {
      const largeInputTask: TaskInput = {
        id: 'task-large',
        type: 'process',
        input: { data: 'x'.repeat(50000) },
      }

      const smallInputTask: TaskInput = {
        id: 'task-small',
        type: 'process',
        input: { data: 'x' },
      }

      const largeFeatures = engineer.extractTaskFeatures(largeInputTask)
      const smallFeatures = engineer.extractTaskFeatures(smallInputTask)

      expect(largeFeatures.complexity).toBeGreaterThanOrEqual(smallFeatures.complexity)
    })

    it('should classify task types correctly', () => {
      const simpleTask = engineer.extractTaskFeatures({ id: 't1', type: 'read' })
      const moderateTask = engineer.extractTaskFeatures({ id: 't2', type: 'process' })
      const complexTask = engineer.extractTaskFeatures({
        id: 't3',
        type: 'integration',
        dependencies: ['d1', 'd2', 'd3'],
      })

      expect(simpleTask.taskType).toBe('simple')
      expect(['simple', 'moderate']).toContain(moderateTask.taskType)
      expect(['moderate', 'complex']).toContain(complexTask.taskType)
    })
  })

  // ==========================================================================
  // Agent Feature Extraction
  // ==========================================================================

  describe('extractAgentFeatures', () => {
    it('should extract features from an idle agent', () => {
      const features = engineer.extractAgentFeatures(mockAgent)

      expect(features.capabilities).toEqual(['analysis', 'generation', 'testing'])
      expect(features.currentLoad).toBe(0)
      expect(features.maxConcurrentTasks).toBe(5)
      expect(features.successRate).toBe(0.95)
      expect(features.reliability).toBeGreaterThan(0.9)
    })

    it('should extract features from a busy agent', () => {
      const features = engineer.extractAgentFeatures(mockBusyAgent)

      expect(features.currentLoad).toBe(0.8) // 4/5
      expect(features.successRate).toBe(0.8)
    })

    it('should handle agent with no performance data', () => {
      const newAgent: AgentInput = {
        id: 'agent-new',
        capabilities: [],
      }

      const features = engineer.extractAgentFeatures(newAgent)

      expect(features.capabilities).toEqual([])
      expect(features.currentLoad).toBe(0)
      expect(features.successRate).toBe(0.9) // Default
      expect(features.reliability).toBeGreaterThan(0.8)
    })

    it('should calculate specialization scores from capabilities', () => {
      const features = engineer.extractAgentFeatures(mockAgent)

      expect(features.specializationScore).toBeDefined()
      expect(features.specializationScore['analysis']).toBe(0.8)
      expect(features.specializationScore['generation']).toBe(0.8)
      expect(features.specializationScore['testing']).toBe(0.8)
    })

    it('should handle offline agents', () => {
      const offlineAgent: AgentInput = {
        id: 'agent-offline',
        status: 'offline',
      }

      const features = engineer.extractAgentFeatures(offlineAgent)
      expect(features.currentLoad).toBe(1)
    })

    it('should calculate success rate correctly', () => {
      const agent: AgentInput = {
        id: 'agent-test',
        performance: {
          totalCompleted: 90,
          totalFailed: 10,
        },
      }

      const features = engineer.extractAgentFeatures(agent)
      expect(features.successRate).toBe(0.9)
    })
  })

  // ==========================================================================
  // Context Feature Extraction
  // ==========================================================================

  describe('extractContextFeatures', () => {
    it('should extract current context features', () => {
      const context = engineer.extractContextFeatures()

      expect(context.hourOfDay).toBeGreaterThanOrEqual(0)
      expect(context.hourOfDay).toBeLessThanOrEqual(23)
      expect(context.dayOfWeek).toBeGreaterThanOrEqual(0)
      expect(context.dayOfWeek).toBeLessThanOrEqual(6)
      expect(typeof context.isWeekend).toBe('boolean')
    })
  })

  // ==========================================================================
  // Feature Normalization
  // ==========================================================================

  describe('normalizeFeatures', () => {
    it('should normalize task features to 0-1 range', () => {
      const taskFeatures: TaskFeatures = {
        complexity: 5,
        estimatedDuration: 60000,
        dependencyCount: 3,
        taskType: 'moderate',
        requiresExternal: false,
        isIdempotent: true,
        historicalAvgDuration: 55000,
        historicalSuccessRate: 0.9,
        recentFailureCount: 2,
      }

      const normalized = engineer.normalizeFeatures(taskFeatures)

      expect(normalized.values.length).toBeGreaterThan(0)
      expect(normalized.labels.length).toBe(normalized.values.length)
      expect(normalized.timestamp).toBeGreaterThan(0)

      // All values should be in 0-1 range
      for (const value of normalized.values) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    })

    it('should normalize agent features to 0-1 range', () => {
      const agentFeatures: AgentFeatures = {
        capabilities: ['a', 'b', 'c'],
        currentLoad: 0.5,
        maxConcurrentTasks: 4,
        avgExecutionTime: 30000,
        successRate: 0.9,
        reliability: 0.85,
        totalTasksCompleted: 100,
        specializationScore: {},
      }

      const normalized = engineer.normalizeFeatures(agentFeatures)

      expect(normalized.values.length).toBeGreaterThan(0)
      expect(normalized.labels.length).toBe(normalized.values.length)

      // All values should be in 0-1 range
      for (const value of normalized.values) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(1)
      }
    })

    it('should include feature labels', () => {
      const taskFeatures: TaskFeatures = {
        complexity: 7,
        estimatedDuration: 45000,
        dependencyCount: 2,
        taskType: 'moderate',
        requiresExternal: true,
        isIdempotent: false,
        historicalAvgDuration: 40000,
        historicalSuccessRate: 0.85,
        recentFailureCount: 1,
      }

      const normalized = engineer.normalizeFeatures(taskFeatures)

      expect(normalized.labels).toContain('complexity')
      expect(normalized.labels).toContain('estimatedDuration')
      expect(normalized.labels).toContain('dependencyCount')
    })
  })

  // ==========================================================================
  // Feature Importance Analysis
  // ==========================================================================

  describe('analyzeFeatureImportance', () => {
    it('should return feature importance scores', () => {
      const importance = engineer.analyzeFeatureImportance()

      expect(importance.length).toBeGreaterThan(0)
      expect(importance.some(i => i.category === 'task')).toBe(true)
      expect(importance.some(i => i.category === 'agent')).toBe(true)
      expect(importance.some(i => i.category === 'context')).toBe(true)
    })

    it('should have importance scores in 0-1 range', () => {
      const importance = engineer.analyzeFeatureImportance()

      for (const item of importance) {
        expect(item.importance).toBeGreaterThanOrEqual(0)
        expect(item.importance).toBeLessThanOrEqual(1)
      }
    })

    it('should cache importance scores when enabled', () => {
      const importance1 = engineer.analyzeFeatureImportance()
      const importance2 = engineer.analyzeFeatureImportance()

      // Should return same reference when caching is enabled
      expect(importance1).toBe(importance2)
    })

    it('should include descriptions for features', () => {
      const importance = engineer.analyzeFeatureImportance()

      for (const item of importance) {
        expect(item.featureName).toBeDefined()
        expect(item.description).toBeDefined()
        expect(item.description.length).toBeGreaterThan(0)
      }
    })
  })

  // ==========================================================================
  // Store Operations
  // ==========================================================================

  describe('store operations', () => {
    it('should store and retrieve task features', async () => {
      const features = engineer.extractTaskFeatures(mockTask)
      await engineer.storeTaskFeatures(mockTask.id, features)

      const retrieved = await engineer.getTaskFeatures(mockTask.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.complexity).toBe(features.complexity)
    })

    it('should store and retrieve agent features', async () => {
      const features = engineer.extractAgentFeatures(mockAgent)
      await engineer.storeAgentFeatures(mockAgent.id, features)

      const retrieved = await engineer.getAgentFeatures(mockAgent.id)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.capabilities).toEqual(features.capabilities)
    })

    it('should return null for non-existent features', async () => {
      const taskFeatures = await engineer.getTaskFeatures('non-existent')
      const agentFeatures = await engineer.getAgentFeatures('non-existent')

      expect(taskFeatures).toBeNull()
      expect(agentFeatures).toBeNull()
    })
  })
})

// ============================================================================
// Factory Functions Tests
// ============================================================================

describe('Factory Functions', () => {
  describe('createFeatureEngineer', () => {
    it('should create a FeatureEngineer with default config', () => {
      const engineer = createFeatureEngineer()
      expect(engineer).toBeInstanceOf(FeatureEngineer)
    })

    it('should create a FeatureEngineer with custom config', () => {
      const engineer = createFeatureEngineer({
        defaults: {
          taskComplexity: 3,
          taskDuration: 30000,
          agentReliability: 0.7,
          agentSuccessRate: 0.8,
        },
      })
      expect(engineer).toBeInstanceOf(FeatureEngineer)
    })
  })

  describe('createFeatureEngineerWithStore', () => {
    it('should create a FeatureEngineer with custom store', () => {
      const store = new InMemoryFeatureStore()
      const engineer = createFeatureEngineerWithStore(store)
      expect(engineer).toBeInstanceOf(FeatureEngineer)
    })
  })
})

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Edge Cases', () => {
  let engineer: FeatureEngineer
  let store: InMemoryFeatureStore

  beforeEach(() => {
    store = new InMemoryFeatureStore()
    engineer = new FeatureEngineer(store)
  })

  it('should handle empty task input', () => {
    const emptyTask: TaskInput = { id: 'empty', type: '' }
    const features = engineer.extractTaskFeatures(emptyTask)

    expect(features).toBeDefined()
    expect(features.complexity).toBeGreaterThanOrEqual(1)
  })

  it('should handle null/undefined task properties', () => {
    const sparseTask: TaskInput = {
      id: 'sparse',
      type: 'test',
      dependencies: undefined,
      input: undefined,
      metadata: undefined,
    }

    const features = engineer.extractTaskFeatures(sparseTask)
    expect(features.dependencyCount).toBe(0)
  })

  it('should handle circular input objects safely', () => {
    const circularObj: Record<string, unknown> = { name: 'test' }
    circularObj.self = circularObj

    const taskWithCircular: TaskInput = {
      id: 'circular',
      type: 'test',
      input: circularObj,
    }

    // Should not throw
    const features = engineer.extractTaskFeatures(taskWithCircular)
    expect(features).toBeDefined()
  })

  it('should handle agents with zero max tasks', () => {
    const agent: AgentInput = {
      id: 'zero-max',
      maxTasks: 0,
      currentTasks: 0,
    }

    const features = engineer.extractAgentFeatures(agent)
    expect(features.currentLoad).toBe(0) // 0/0 should be handled
  })

  it('should handle agents with currentTasks > maxTasks', () => {
    const agent: AgentInput = {
      id: 'overloaded',
      maxTasks: 3,
      currentTasks: 5,
    }

    const features = engineer.extractAgentFeatures(agent)
    expect(features.currentLoad).toBe(1) // Should be capped at 1
  })

  it('should handle tasks with very high complexity', () => {
    const complexTask: TaskInput = {
      id: 'very-complex',
      type: 'integration_analysis_transformation',
      dependencies: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10'],
      input: { data: 'x'.repeat(100000) },
    }

    const features = engineer.extractTaskFeatures(complexTask)
    expect(features.complexity).toBeLessThanOrEqual(10)
    expect(features.complexity).toBe(10) // Should be capped at max
  })

  it('should handle normalization edge cases', () => {
    const extremeFeatures: TaskFeatures = {
      complexity: 10,
      estimatedDuration: 10000000,
      dependencyCount: 100,
      taskType: 'complex',
      requiresExternal: true,
      isIdempotent: false,
      historicalAvgDuration: 10000000,
      historicalSuccessRate: 0,
      recentFailureCount: 100,
    }

    const normalized = engineer.normalizeFeatures(extremeFeatures)

    // All values should still be in 0-1 range
    for (const value of normalized.values) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Integration Tests', () => {
  it('should work end-to-end with task and agent features', async () => {
    const store = new InMemoryFeatureStore()
    const engineer = new FeatureEngineer(store)

    // Extract and store task features
    const taskFeatures = engineer.extractTaskFeatures(mockTask)
    await engineer.storeTaskFeatures(mockTask.id, taskFeatures)

    // Extract and store agent features
    const agentFeatures = engineer.extractAgentFeatures(mockAgent)
    await engineer.storeAgentFeatures(mockAgent.id, agentFeatures)

    // Retrieve and verify
    const retrievedTask = await engineer.getTaskFeatures(mockTask.id)
    const retrievedAgent = await engineer.getAgentFeatures(mockAgent.id)

    expect(retrievedTask).not.toBeNull()
    expect(retrievedAgent).not.toBeNull()

    // Normalize for ML model input
    const normalizedTask = engineer.normalizeFeatures(retrievedTask!)
    const normalizedAgent = engineer.normalizeFeatures(retrievedAgent!)

    expect(normalizedTask.values.length).toBeGreaterThan(0)
    expect(normalizedAgent.values.length).toBeGreaterThan(0)

    // Get feature importance for model interpretation
    const importance = engineer.analyzeFeatureImportance()
    expect(importance.length).toBeGreaterThan(0)
  })
})
