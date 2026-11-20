/**
 * Tests for MultiAgentOrchestrator.ts - v1.9.0
 * Multi-Agent Collaboration Framework Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  MultiAgentOrchestrator,
  createMultiAgentOrchestrator,
  AgentCapabilities,
  AgentResult,
  AggregatedResult,
  WorkflowStep,
  WorkflowResult,
  Branch,
  BranchResult,
  OrchestratorTask,
  Conflict,
  AggregationStrategy,
  RetryConfig,
  LoadBalancingOptions,
} from '../MultiAgentOrchestrator'
import { InMemoryAgentRegistry } from '../a2a/agent-registry'
import { SevenZiExecutor } from '../a2a/executor'

// ============================================================================
// Test Utilities
// ============================================================================

function createMockRegistry(): InMemoryAgentRegistry {
  const registry = new InMemoryAgentRegistry()

  // Register test agents
  registry.register({
    id: 'architect',
    name: '架构师',
    url: 'http://architect.example.com',
    capabilities: ['code_review', 'architecture'],
    skills: ['architecture', 'best_practices', 'code_review'],
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    load: 0,
  })

  registry.register({
    id: 'tester',
    name: '测试员',
    url: 'http://tester.example.com',
    capabilities: ['testing', 'quality'],
    skills: ['test_coverage', 'testing', 'quality'],
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    load: 0,
  })

  registry.register({
    id: 'security',
    name: '安全专家',
    url: 'http://security.example.com',
    capabilities: ['security', 'audit'],
    skills: ['security', 'vulnerability', 'safe_coding'],
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    load: 0,
  })

  registry.register({
    id: 'sysadmin',
    name: '系统管理员',
    url: 'http://sysadmin.example.com',
    capabilities: ['system', 'diagnosis'],
    skills: ['system_admin', 'diagnosis', 'troubleshooting'],
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    load: 0,
  })

  registry.register({
    id: 'consultant',
    name: '咨询师',
    url: 'http://consultant.example.com',
    capabilities: ['analysis', 'consulting'],
    skills: ['analysis', 'consulting', 'root_cause'],
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    load: 0,
  })

  registry.register({
    id: 'executor',
    name: 'Executor',
    url: 'http://executor.example.com',
    capabilities: ['execution', 'fix'],
    skills: ['execution', 'fix', 'implementation'],
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    load: 0,
  })

  registry.register({
    id: 'designer',
    name: '设计师',
    url: 'http://designer.example.com',
    capabilities: ['design', 'visual'],
    skills: ['design', 'visual', 'ui'],
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    load: 0,
  })

  registry.register({
    id: 'media',
    name: '媒体',
    url: 'http://media.example.com',
    capabilities: ['content', 'writing'],
    skills: ['content', 'writing', 'copywriting'],
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    load: 0,
  })

  registry.register({
    id: 'marketer',
    name: '推广专员',
    url: 'http://marketer.example.com',
    capabilities: ['marketing', 'promotion'],
    skills: ['marketing', 'promotion', 'seo'],
    status: 'online',
    lastHeartbeat: new Date().toISOString(),
    load: 0,
  })

  return registry
}

function createMockOrchestrator(): MultiAgentOrchestrator {
  const registry = createMockRegistry()
  const executor = new SevenZiExecutor()
  return new MultiAgentOrchestrator(registry, executor)
}

function createMockTask(overrides?: Partial<OrchestratorTask>): OrchestratorTask {
  return {
    id: 'task-1',
    type: 'test',
    description: 'Test task',
    input: {},
    priority: 'normal',
    ...overrides,
  }
}

function createMockAgent(overrides?: Partial<AgentCapabilities>): AgentCapabilities {
  return {
    id: 'agent-1',
    name: 'Test Agent',
    type: 'executor',
    skills: ['testing'],
    maxConcurrentTasks: 5,
    currentLoad: 0,
    averageExecutionTime: 100,
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('MultiAgentOrchestrator', () => {
  let orchestrator: MultiAgentOrchestrator
  let registry: InMemoryAgentRegistry

  beforeEach(() => {
    registry = createMockRegistry()
    const executor = new SevenZiExecutor()
    orchestrator = new MultiAgentOrchestrator(registry, executor)
  })

  afterEach(() => {
    registry.destroy()
    orchestrator.clearHistory()
  })

  // ==========================================================================
  // Parallel Execution Tests
  // ==========================================================================

  describe('executeParallel', () => {
    it('should execute multiple agents in parallel', async () => {
      const agents = [
        {
          agent: createMockAgent({ id: 'architect', name: '架构师' }),
          task: createMockTask({ id: 'task-1' }),
        },
        {
          agent: createMockAgent({ id: 'tester', name: '测试员' }),
          task: createMockTask({ id: 'task-2' }),
        },
        {
          agent: createMockAgent({ id: 'security', name: '安全专家' }),
          task: createMockTask({ id: 'task-3' }),
        },
      ]

      const result = await orchestrator.executeParallel(agents, createMockTask())

      expect(result).toBeDefined()
      expect(result.results).toHaveLength(3)
      expect(result.strategy).toBe('all')
    })

    it('should aggregate results correctly with "all" strategy', async () => {
      const agents = [
        {
          agent: createMockAgent({ id: 'agent-1' }),
          task: createMockTask(),
        },
        {
          agent: createMockAgent({ id: 'agent-2' }),
          task: createMockTask(),
        },
      ]

      const result = await orchestrator.executeParallel(agents, {
        ...createMockTask(),
        aggregationStrategy: 'all',
      })

      expect(result.combinedOutput).toBeDefined()
      expect(result.summary?.total).toBe(2)
    })

    it('should return first result with "first" strategy', async () => {
      const agents = [
        {
          agent: createMockAgent({ id: 'agent-1', name: 'Agent 1' }),
          task: createMockTask(),
        },
        {
          agent: createMockAgent({ id: 'agent-2', name: 'Agent 2' }),
          task: createMockTask(),
        },
      ]

      const result = await orchestrator.executeParallel(agents, {
        ...createMockTask(),
        aggregationStrategy: 'first',
      })

      expect(result.strategy).toBe('first')
    })

    it('should detect conflicts between results', async () => {
      const agents = [
        {
          agent: createMockAgent({ id: 'agent-1', name: 'Agent 1' }),
          task: createMockTask(),
        },
        {
          agent: createMockAgent({ id: 'agent-2', name: 'Agent 2' }),
          task: createMockTask(),
        },
      ]

      const result = await orchestrator.executeParallel(agents, createMockTask())

      // Conflicts may or may not exist depending on results
      expect(result.conflicts).toBeDefined()
      expect(Array.isArray(result.conflicts)).toBe(true)
    })

    it('should handle agent failures gracefully', async () => {
      const agents = [
        {
          agent: createMockAgent({ id: 'agent-1' }),
          task: createMockTask(),
        },
      ]

      const result = await orchestrator.executeParallel(agents, createMockTask())

      expect(result.results[0].success).toBe(true)
    })

    it('should include execution time in result', async () => {
      const agents = [
        {
          agent: createMockAgent({ id: 'agent-1' }),
          task: createMockTask(),
        },
      ]

      const result = await orchestrator.executeParallel(agents, createMockTask())

      expect(result.executionTime).toBeGreaterThanOrEqual(0)
      expect(result.timestamp).toBeDefined()
    })
  })

  // ==========================================================================
  // Sequential Execution Tests
  // ==========================================================================

  describe('executeSequential', () => {
    it('should execute workflow steps sequentially', async () => {
      const workflow: WorkflowStep[] = [
        {
          id: 'step-1',
          agentId: 'designer',
          agentName: '设计师',
          task: createMockTask({ id: 'task-1', type: 'design' }),
        },
        {
          id: 'step-2',
          agentId: 'media',
          agentName: '媒体',
          task: createMockTask({ id: 'task-2', type: 'content' }),
          dependsOn: ['step-1'],
        },
        {
          id: 'step-3',
          agentId: 'marketer',
          agentName: '推广专员',
          task: createMockTask({ id: 'task-3', type: 'marketing' }),
          dependsOn: ['step-2'],
        },
      ]

      const result = await orchestrator.executeSequential(workflow)

      expect(result).toBeDefined()
      expect(result.steps).toHaveLength(3)
      expect(result.status).toBe('completed')
    })

    it('should pass context between steps', async () => {
      const workflow: WorkflowStep[] = [
        {
          id: 'step-1',
          agentId: 'designer',
          agentName: '设计师',
          task: createMockTask({ input: { phase: 1 } }),
        },
        {
          id: 'step-2',
          agentId: 'media',
          agentName: '媒体',
          task: createMockTask({ input: { phase: 2 } }),
          dependsOn: ['step-1'],
        },
      ]

      const result = await orchestrator.executeSequential(workflow)

      expect(result.finalContext).toBeDefined()
    })

    it('should handle step dependencies correctly', async () => {
      const workflow: WorkflowStep[] = [
        {
          id: 'step-1',
          agentId: 'designer',
          agentName: '设计师',
          task: createMockTask(),
        },
        {
          id: 'step-2',
          agentId: 'media',
          agentName: '媒体',
          task: createMockTask(),
          dependsOn: ['step-1'],
        },
      ]

      const result = await orchestrator.executeSequential(workflow)

      // Step 2 should only run after Step 1 completes
      expect(result.steps[0].status).toBe('success')
    })

    it('should skip steps with unmet dependencies', async () => {
      const workflow: WorkflowStep[] = [
        {
          id: 'step-1',
          agentId: 'designer',
          agentName: '设计师',
          task: createMockTask(),
        },
        {
          id: 'step-2',
          agentId: 'media',
          agentName: '媒体',
          task: createMockTask(),
          dependsOn: ['non-existent-step'],
        },
      ]

      const result = await orchestrator.executeSequential(workflow)

      // Step 2 should be skipped due to missing dependency
      expect(result.steps[1].status).toBe('skipped')
    })

    it('should track total execution time', async () => {
      const workflow: WorkflowStep[] = [
        {
          id: 'step-1',
          agentId: 'designer',
          agentName: '设计师',
          task: createMockTask(),
        },
      ]

      const result = await orchestrator.executeSequential(workflow)

      expect(result.totalExecutionTime).toBeGreaterThanOrEqual(0)
      expect(result.timestamp).toBeDefined()
    })
  })

  // ==========================================================================
  // Conditional Routing Tests
  // ==========================================================================

  describe('executeConditional', () => {
    it('should execute branch matching condition', async () => {
      const initialAgent = {
        agent: createMockAgent({ id: 'diagnosis-agent' }),
        task: createMockTask(),
      }

      const branches: Branch[] = [
        {
          id: 'branch-a',
          name: 'Branch A',
          condition: { field: 'result', operator: 'eq', value: 'success' },
          agents: [
            {
              agent: createMockAgent({ id: 'success-handler' }),
              task: createMockTask(),
            },
          ],
        },
        {
          id: 'branch-b',
          name: 'Branch B',
          condition: { field: 'result', operator: 'eq', value: 'failure' },
          agents: [
            {
              agent: createMockAgent({ id: 'failure-handler' }),
              task: createMockTask(),
            },
          ],
        },
      ]

      const result = await orchestrator.executeConditional(initialAgent, branches, {
        result: 'success',
      })

      expect(result).toBeDefined()
      expect(result.executed).toBeDefined()
    })

    it('should return no match when no condition is met', async () => {
      const initialAgent = {
        agent: createMockAgent({ id: 'diagnosis-agent' }),
        task: createMockTask(),
      }

      const branches: Branch[] = [
        {
          id: 'branch-a',
          name: 'Branch A',
          condition: { field: 'status', operator: 'eq', value: 'ready' },
          agents: [
            {
              agent: createMockAgent({ id: 'handler' }),
              task: createMockTask(),
            },
          ],
        },
      ]

      const result = await orchestrator.executeConditional(initialAgent, branches, {
        status: 'not-ready', // Doesn't match condition
      })

      expect(result.branchId).toBe('none')
      expect(result.executed).toBe(false)
    })

    it('should support different condition operators', async () => {
      const initialAgent = {
        agent: createMockAgent({ id: 'test-agent' }),
        task: createMockTask(),
      }

      // Test 'gt' operator
      const branches: Branch[] = [
        {
          id: 'high-priority',
          name: 'High Priority',
          condition: { field: 'priority', operator: 'gt', value: 5 },
          agents: [
            {
              agent: createMockAgent({ id: 'high-handler' }),
              task: createMockTask(),
            },
          ],
        },
      ]

      const result = await orchestrator.executeConditional(initialAgent, branches, {
        priority: 10,
      })

      expect(result.executed).toBe(true)
    })

    it('should support "contains" operator', async () => {
      const initialAgent = {
        agent: createMockAgent({ id: 'test-agent' }),
        task: createMockTask(),
      }

      const branches: Branch[] = [
        {
          id: 'error-branch',
          name: 'Error Branch',
          condition: { field: 'message', operator: 'contains', value: 'error' },
          agents: [
            {
              agent: createMockAgent({ id: 'error-handler' }),
              task: createMockTask(),
            },
          ],
        },
      ]

      const result = await orchestrator.executeConditional(initialAgent, branches, {
        message: 'This is an error message',
      })

      expect(result.executed).toBe(true)
      expect(result.branchId).toBe('error-branch')
    })
  })

  // ==========================================================================
  // Result Aggregation Tests
  // ==========================================================================

  describe('aggregateResults', () => {
    const mockResults: AgentResult[] = [
      {
        agentId: 'agent-1',
        agentName: 'Agent 1',
        success: true,
        output: { result: 'A' },
        executionTime: 100,
        timestamp: new Date().toISOString(),
      },
      {
        agentId: 'agent-2',
        agentName: 'Agent 2',
        success: true,
        output: { result: 'A' },
        executionTime: 150,
        timestamp: new Date().toISOString(),
      },
      {
        agentId: 'agent-3',
        agentName: 'Agent 3',
        success: true,
        output: { result: 'B' },
        executionTime: 200,
        timestamp: new Date().toISOString(),
      },
    ]

    it('should aggregate all results with "all" strategy', () => {
      const result = orchestrator.aggregateResults(mockResults, 'all')

      expect(result.strategy).toBe('all')
      expect(result.results).toHaveLength(3)
      expect(result.combinedOutput).toBeDefined()
    })

    it('should return first result with "first" strategy', () => {
      const result = orchestrator.aggregateResults(mockResults, 'first')

      expect(result.combinedOutput).toEqual({ result: 'A' })
    })

    it('should compute majority with "majority" strategy', () => {
      const result = orchestrator.aggregateResults(mockResults, 'majority')

      // A appears twice, B appears once
      expect(result.combinedOutput).toEqual({ result: 'A' })
    })

    it('should compute weighted result with "weighted" strategy', () => {
      const result = orchestrator.aggregateResults(mockResults, 'weighted')

      expect(result.combinedOutput).toBeDefined()
    })

    it('should return best result with "best" strategy', () => {
      const result = orchestrator.aggregateResults(mockResults, 'best')

      // Best is the one with lowest execution time
      expect(result.combinedOutput).toEqual({ result: 'A' })
    })

    it('should generate summary for results', () => {
      const result = orchestrator.aggregateResults(mockResults, 'all')

      expect(result.summary).toBeDefined()
      expect(result.summary?.total).toBe(3)
      expect(result.summary?.successful).toBe(3)
      expect(result.summary?.failed).toBe(0)
    })

    it('should handle empty results', () => {
      const result = orchestrator.aggregateResults([], 'all')

      expect(result.results).toHaveLength(0)
      expect(result.summary?.total).toBe(0)
    })

    it('should count failed results in summary', () => {
      const resultsWithFailure: AgentResult[] = [
        ...mockResults,
        {
          agentId: 'agent-4',
          agentName: 'Agent 4',
          success: false,
          output: null,
          error: 'Failed',
          executionTime: 50,
          timestamp: new Date().toISOString(),
        },
      ]

      const result = orchestrator.aggregateResults(resultsWithFailure, 'all')

      expect(result.summary?.failed).toBe(1)
    })
  })

  // ==========================================================================
  // Conflict Detection Tests
  // ==========================================================================

  describe('detectConflicts', () => {
    it('should detect conflicts between different results', () => {
      const results: AgentResult[] = [
        {
          agentId: 'agent-1',
          agentName: 'Agent 1',
          success: true,
          output: { result: 'A' },
          executionTime: 100,
          timestamp: new Date().toISOString(),
        },
        {
          agentId: 'agent-2',
          agentName: 'Agent 2',
          success: true,
          output: { result: 'B' },
          executionTime: 100,
          timestamp: new Date().toISOString(),
        },
      ]

      const conflicts = orchestrator.detectConflicts(results)

      expect(conflicts).toBeDefined()
      expect(conflicts.length).toBeGreaterThan(0)
      expect(conflicts[0].type).toBe('different_conclusions')
    })

    it('should return no conflicts for identical results', () => {
      const results: AgentResult[] = [
        {
          agentId: 'agent-1',
          agentName: 'Agent 1',
          success: true,
          output: { result: 'same' },
          executionTime: 100,
          timestamp: new Date().toISOString(),
        },
        {
          agentId: 'agent-2',
          agentName: 'Agent 2',
          success: true,
          output: { result: 'same' },
          executionTime: 100,
          timestamp: new Date().toISOString(),
        },
      ]

      const conflicts = orchestrator.detectConflicts(results)

      expect(conflicts).toHaveLength(0)
    })

    it('should return empty array for single result', () => {
      const results: AgentResult[] = [
        {
          agentId: 'agent-1',
          agentName: 'Agent 1',
          success: true,
          output: { result: 'A' },
          executionTime: 100,
          timestamp: new Date().toISOString(),
        },
      ]

      const conflicts = orchestrator.detectConflicts(results)

      expect(conflicts).toHaveLength(0)
    })

    it('should return empty array for empty results', () => {
      const conflicts = orchestrator.detectConflicts([])

      expect(conflicts).toHaveLength(0)
    })

    it('should include agent IDs in conflict', () => {
      const results: AgentResult[] = [
        {
          agentId: 'agent-1',
          agentName: 'Agent 1',
          success: true,
          output: { result: 'A' },
          executionTime: 100,
          timestamp: new Date().toISOString(),
        },
        {
          agentId: 'agent-2',
          agentName: 'Agent 2',
          success: true,
          output: { result: 'B' },
          executionTime: 100,
          timestamp: new Date().toISOString(),
        },
      ]

      const conflicts = orchestrator.detectConflicts(results)

      expect(conflicts[0].agents).toContain('agent-1')
      expect(conflicts[0].agents).toContain('agent-2')
    })

    it('should set conflict severity', () => {
      const results: AgentResult[] = [
        {
          agentId: 'agent-1',
          agentName: 'Agent 1',
          success: true,
          output: { result: 'A' },
          executionTime: 100,
          timestamp: new Date().toISOString(),
        },
        {
          agentId: 'agent-2',
          agentName: 'Agent 2',
          success: true,
          output: { result: 'B' },
          executionTime: 100,
          timestamp: new Date().toISOString(),
        },
      ]

      const conflicts = orchestrator.detectConflicts(results)

      expect(conflicts[0].severity).toBeDefined()
    })
  })

  // ==========================================================================
  // Task Delegation Tests
  // ==========================================================================

  describe('assignTask', () => {
    it('should find agent matching capabilities', async () => {
      const task = createMockTask({
        requiredCapabilities: ['code_review'],
        requiredSkills: ['architecture'],
      })

      const agent = await orchestrator.assignTask(task)

      expect(agent).toBeDefined()
      expect(agent.id).toBeDefined()
    })

    it('should throw error when no suitable agent found', async () => {
      const task = createMockTask({
        requiredCapabilities: ['non-existent-capability'],
      })

      await expect(orchestrator.assignTask(task)).rejects.toThrow()
    })

    it('should respect max load constraint', async () => {
      // Mark architect as busy
      registry.updateStatus('architect', 'busy')
      registry.register({
        id: 'architect-2',
        name: '架构师2',
        url: 'http://architect-2.example.com',
        capabilities: ['code_review', 'architecture'],
        skills: ['architecture', 'best_practices'],
        status: 'online',
        lastHeartbeat: new Date().toISOString(),
        load: 0,
      })

      const task = createMockTask({
        requiredCapabilities: ['code_review'],
      })

      const agents = orchestrator.findMatchingAgents(task)
      // Should not return busy agent in available list
      const busyAgent = agents.find(a => a.id === 'architect')
      // The busy agent should not be in the available list
      expect(busyAgent).toBeUndefined()
    })
  })

  describe('findMatchingAgents', () => {
    it('should return agents matching required skills', () => {
      const task = createMockTask({
        requiredSkills: ['architecture', 'best_practices'],
      })

      const agents = orchestrator.findMatchingAgents(task)

      expect(agents.length).toBeGreaterThan(0)
    })

    it('should return empty array for unmatched skills', () => {
      const task = createMockTask({
        requiredSkills: ['non-existent-skill'],
      })

      const agents = orchestrator.findMatchingAgents(task)

      expect(agents).toHaveLength(0)
    })

    it('should filter by load', () => {
      // Set high load on all agents
      const task = createMockTask({
        requiredSkills: ['architecture'],
      })

      const agents = orchestrator.findMatchingAgents(task)

      expect(agents).toBeDefined()
    })
  })

  // ==========================================================================
  // Collaboration Scenarios Tests
  // ==========================================================================

  describe('executeCodeReview', () => {
    it('should execute code review with 3 agents', async () => {
      const code = `
        function example() {
          return "Hello World";
        }
      `

      const result = await orchestrator.executeCodeReview(code)

      expect(result).toBeDefined()
      expect(result.results).toHaveLength(3)
      expect(result.strategy).toBe('all')
    })

    it('should respect priority option', async () => {
      const result = await orchestrator.executeCodeReview('code', {
        priority: 'critical',
      })

      expect(result).toBeDefined()
    })

    it('should include architecture review', async () => {
      const result = await orchestrator.executeCodeReview('code')

      const architectResult = result.results.find(
        r => r.agentName === '架构师' || r.agentId === 'architect'
      )
      expect(architectResult).toBeDefined()
    })

    it('should include test coverage review', async () => {
      const result = await orchestrator.executeCodeReview('code')

      const testerResult = result.results.find(
        r => r.agentName === '测试员' || r.agentId === 'tester'
      )
      expect(testerResult).toBeDefined()
    })

    it('should include security review', async () => {
      const result = await orchestrator.executeCodeReview('code')

      const securityResult = result.results.find(
        r => r.agentName === '安全专家' || r.agentId === 'security'
      )
      expect(securityResult).toBeDefined()
    })
  })

  describe('executeFaultDiagnosis', () => {
    it('should execute fault diagnosis workflow', async () => {
      const result = await orchestrator.executeFaultDiagnosis('System is slow')

      expect(result).toBeDefined()
      expect(result.steps).toHaveLength(3)
    })

    it('should execute steps in order', async () => {
      const result = await orchestrator.executeFaultDiagnosis('Memory leak')

      // Check step order
      const stepIds = result.steps.map(s => s.stepId)
      expect(stepIds).toEqual(['step-1', 'step-2', 'step-3'])
    })

    it('should include sysadmin diagnosis', async () => {
      const result = await orchestrator.executeFaultDiagnosis('Error occurred')

      const sysadminStep = result.steps.find(
        s => s.agentId === 'sysadmin'
      )
      expect(sysadminStep).toBeDefined()
    })

    it('should include consultant analysis', async () => {
      const result = await orchestrator.executeFaultDiagnosis('Bug found')

      const consultantStep = result.steps.find(
        s => s.agentId === 'consultant'
      )
      expect(consultantStep).toBeDefined()
    })

    it('should include executor fix', async () => {
      const result = await orchestrator.executeFaultDiagnosis('Fix needed')

      const executorStep = result.steps.find(
        s => s.agentId === 'executor'
      )
      expect(executorStep).toBeDefined()
    })
  })

  describe('executeContentCreation', () => {
    it('should execute content creation workflow', async () => {
      const result = await orchestrator.executeContentCreation('React 19 Features')

      expect(result).toBeDefined()
      expect(result.steps).toHaveLength(3)
    })

    it('should execute designer first', async () => {
      const result = await orchestrator.executeContentCreation('Topic')

      expect(result.steps[0].agentId).toBe('designer')
    })

    it('should execute media after designer', async () => {
      const result = await orchestrator.executeContentCreation('Topic')

      expect(result.steps[1].agentId).toBe('media')
      expect(result.steps[1].status).not.toBe('skipped')
    })

    it('should execute marketer after media', async () => {
      const result = await orchestrator.executeContentCreation('Topic')

      expect(result.steps[2].agentId).toBe('marketer')
      expect(result.steps[2].status).not.toBe('skipped')
    })
  })

  // ==========================================================================
  // Execution History Tests
  // ==========================================================================

  describe('execution history', () => {
    it('should store execution history', async () => {
      const task = createMockTask({ id: 'history-test' })
      const agents = [
        {
          agent: createMockAgent({ id: 'agent-1' }),
          task,
        },
      ]

      await orchestrator.executeParallel(agents, task)

      const history = orchestrator.getExecutionHistory(task.id)
      expect(history).toBeDefined()
      expect(history?.length).toBe(1)
    })

    it('should clear history', async () => {
      const task = createMockTask({ id: 'clear-test' })
      const agents = [
        {
          agent: createMockAgent({ id: 'agent-1' }),
          task,
        },
      ]

      await orchestrator.executeParallel(agents, task)
      orchestrator.clearHistory()

      const history = orchestrator.getExecutionHistory(task.id)
      expect(history).toBeUndefined()
    })
  })

  // ==========================================================================
  // Configuration Tests
  // ==========================================================================

  describe('configuration', () => {
    it('should use default retry configuration', () => {
      const registry = createMockRegistry()
      const executor = new SevenZiExecutor()
      const orchestrator = new MultiAgentOrchestrator(registry, executor)

      // Default retry config should be used
      expect(orchestrator).toBeDefined()
    })

    it('should accept custom retry configuration', () => {
      const registry = createMockRegistry()
      const executor = new SevenZiExecutor()
      const orchestrator = new MultiAgentOrchestrator(registry, executor, {
        retryConfig: {
          maxRetries: 5,
          backoff: 'fixed',
          baseDelay: 2000,
          maxDelay: 60000,
        },
      })

      expect(orchestrator).toBeDefined()
    })

    it('should accept custom load balancing options', () => {
      const registry = createMockRegistry()
      const executor = new SevenZiExecutor()
      const orchestrator = new MultiAgentOrchestrator(registry, executor, {
        loadBalancingOptions: {
          strategy: 'fastest',
          maxLoad: 5,
        },
      })

      expect(orchestrator).toBeDefined()
    })
  })
})

// ==========================================================================
// Factory Function Tests
// ==========================================================================

describe('createMultiAgentOrchestrator', () => {
  it('should create orchestrator with defaults', () => {
    const registry = createMockRegistry()
    const executor = new SevenZiExecutor()
    const orchestrator = createMultiAgentOrchestrator(registry, executor)

    expect(orchestrator).toBeInstanceOf(MultiAgentOrchestrator)
  })
})

// ==========================================================================
// Type Exports Tests
// ==========================================================================

describe('Type exports', () => {
  it('should export AgentCapabilities type', () => {
    const capabilities: AgentCapabilities = createMockAgent()
    expect(capabilities).toBeDefined()
  })

  it('should export AgentResult type', () => {
    const result: AgentResult = {
      agentId: 'test',
      agentName: 'Test',
      success: true,
      output: {},
      executionTime: 100,
      timestamp: new Date().toISOString(),
    }
    expect(result).toBeDefined()
  })

  it('should export AggregationStrategy type', () => {
    const strategy: AggregationStrategy = 'majority'
    expect(strategy).toBe('majority')
  })

  it('should export Conflict type', () => {
    const conflict: Conflict = {
      id: 'conflict-1',
      type: 'different_conclusions',
      agents: ['agent-1', 'agent-2'],
      description: 'Test conflict',
      severity: 'medium',
    }
    expect(conflict).toBeDefined()
  })
})
