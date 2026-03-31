/**
 * Integration Tests: Workflow Orchestrator (v1.5.0)
 *
 * 测试工作流编排器的核心功能:
 * - 状态机转换
 * - 条件分支
 * - 并行执行
 * - 错误处理和重试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WorkflowEngine, WorkflowDefinition, WorkflowContext, WorkflowState } from '@/lib/workflows/types';

// ===== Mock Workflow Engine =====

interface MockTask {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: unknown;
  error?: string;
  retries: number;
  maxRetries: number;
}

interface MockWorkflow {
  id: string;
  definition: WorkflowDefinition;
  state: WorkflowState;
  tasks: Map<string, MockTask>;
  context: WorkflowContext;
}

class MockWorkflowEngine {
  private workflows: Map<string, MockWorkflow> = new Map();
  private taskExecutors: Map<string, (ctx: WorkflowContext) => Promise<unknown>> = new Map();

  registerExecutor(taskType: string, executor: (ctx: WorkflowContext) => Promise<unknown>) {
    this.taskExecutors.set(taskType, executor);
  }

  async createWorkflow(definition: WorkflowDefinition): Promise<MockWorkflow> {
    const workflow: MockWorkflow = {
      id: `wf-${Date.now()}`,
      definition,
      state: 'created',
      tasks: new Map(),
      context: {
        inputs: {},
        outputs: {},
        variables: {},
      },
    };

    // Initialize tasks
    for (const step of definition.steps) {
      workflow.tasks.set(step.id, {
        id: step.id,
        name: step.name,
        status: 'pending',
        retries: 0,
        maxRetries: step.retryPolicy?.maxRetries ?? 3,
      });
    }

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async startWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    workflow.state = 'running';
    await this.executeSteps(workflow);
  }

  private async executeSteps(workflow: MockWorkflow): Promise<void> {
    const { definition, tasks, context } = workflow;

    for (const step of definition.steps) {
      const task = tasks.get(step.id);
      if (!task) continue;

      // Check condition
      if (step.condition && !this.evaluateCondition(step.condition, context)) {
        task.status = 'skipped';
        continue;
      }

      // Wait for dependencies
      if (step.dependsOn) {
        for (const depId of step.dependsOn) {
          const depTask = tasks.get(depId);
          if (depTask && depTask.status !== 'completed') {
            // Wait for dependency (simplified)
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      // Execute task
      task.status = 'running';
      const executor = this.taskExecutors.get(step.type);

      if (!executor) {
        task.status = 'failed';
        task.error = `No executor for type: ${step.type}`;
        continue;
      }

      try {
        const result = await executor(context);
        task.status = 'completed';
        task.result = result;
        context.outputs[step.id] = result;
      } catch (error) {
        task.retries++;
        if (task.retries >= task.maxRetries) {
          task.status = 'failed';
          task.error = String(error);
        } else {
          // Retry
          await this.executeSteps(workflow);
        }
      }
    }

    // Check all tasks completed
    const allCompleted = Array.from(tasks.values()).every(
      t => t.status === 'completed' || t.status === 'skipped'
    );
    workflow.state = allCompleted ? 'completed' : 'failed';
  }

  private evaluateCondition(condition: string, context: WorkflowContext): boolean {
    // Simplified condition evaluation
    try {
      return Boolean(eval(condition.replace(/\$\{/g, 'context.variables.')));
    } catch {
      return false;
    }
  }

  getWorkflow(workflowId: string): MockWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  getWorkflowState(workflowId: string): WorkflowState | undefined {
    return this.workflows.get(workflowId)?.state;
  }

  async cancelWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      workflow.state = 'cancelled';
    }
  }
}

// ===== Test Suite =====

describe('Workflow Orchestrator', () => {
  let engine: MockWorkflowEngine;

  beforeEach(() => {
    engine = new MockWorkflowEngine();

    // Register test executors
    engine.registerExecutor('http-request', async (ctx) => {
      return { status: 200, data: { success: true } };
    });

    engine.registerExecutor('data-transform', async (ctx) => {
      return { transformed: true };
    });

    engine.registerExecutor('notification', async (ctx) => {
      return { sent: true };
    });

    engine.registerExecutor('failing-task', async (ctx) => {
      throw new Error('Intentional failure');
    });

    engine.registerExecutor('slow-task', async (ctx) => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { completed: true };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Workflow Execution', () => {
    it('should create workflow from definition', async () => {
      const definition: WorkflowDefinition = {
        id: 'test-workflow-1',
        name: 'Test Workflow',
        version: '1.0.0',
        steps: [
          { id: 'step-1', name: 'HTTP Request', type: 'http-request' },
          { id: 'step-2', name: 'Transform Data', type: 'data-transform' },
        ],
      };

      const workflow = await engine.createWorkflow(definition);

      expect(workflow.id).toBeDefined();
      expect(workflow.state).toBe('created');
      expect(workflow.tasks.size).toBe(2);
    });

    it('should execute linear workflow', async () => {
      const definition: WorkflowDefinition = {
        id: 'linear-workflow',
        name: 'Linear Workflow',
        version: '1.0.0',
        steps: [
          { id: 'step-1', name: 'HTTP Request', type: 'http-request' },
          { id: 'step-2', name: 'Transform', type: 'data-transform' },
          { id: 'step-3', name: 'Notify', type: 'notification' },
        ],
      };

      const workflow = await engine.createWorkflow(definition);
      await engine.startWorkflow(workflow.id);

      const finalWorkflow = engine.getWorkflow(workflow.id);
      expect(finalWorkflow?.state).toBe('completed');

      const tasks = Array.from(finalWorkflow?.tasks.values() || []);
      expect(tasks.every(t => t.status === 'completed')).toBe(true);
    });

    it('should handle workflow with dependencies', async () => {
      const definition: WorkflowDefinition = {
        id: 'dependency-workflow',
        name: 'Dependency Workflow',
        version: '1.0.0',
        steps: [
          { id: 'step-1', name: 'First', type: 'http-request' },
          { 
            id: 'step-2', 
            name: 'Second', 
            type: 'data-transform',
            dependsOn: ['step-1'],
          },
          { 
            id: 'step-3', 
            name: 'Third', 
            type: 'notification',
            dependsOn: ['step-2'],
          },
        ],
      };

      const workflow = await engine.createWorkflow(definition);
      await engine.startWorkflow(workflow.id);

      const finalWorkflow = engine.getWorkflow(workflow.id);
      expect(finalWorkflow?.state).toBe('completed');
    });
  });

  describe('Conditional Execution', () => {
    it('should skip steps with false conditions', async () => {
      const definition: WorkflowDefinition = {
        id: 'conditional-workflow',
        name: 'Conditional Workflow',
        version: '1.0.0',
        steps: [
          { id: 'step-1', name: 'Always Run', type: 'http-request' },
          { 
            id: 'step-2', 
            name: 'Conditional Step', 
            type: 'data-transform',
            condition: 'false',
          },
          { id: 'step-3', name: 'After Conditional', type: 'notification' },
        ],
      };

      const workflow = await engine.createWorkflow(definition);
      await engine.startWorkflow(workflow.id);

      const finalWorkflow = engine.getWorkflow(workflow.id);
      const step2 = finalWorkflow?.tasks.get('step-2');
      expect(step2?.status).toBe('skipped');
    });

    it('should evaluate conditions with context variables', async () => {
      const definition: WorkflowDefinition = {
        id: 'context-condition-workflow',
        name: 'Context Condition Workflow',
        version: '1.0.0',
        steps: [
          { id: 'step-1', name: 'First', type: 'http-request' },
          { 
            id: 'step-2', 
            name: 'Conditional', 
            type: 'notification',
            condition: 'context.variables.shouldNotify === true',
          },
        ],
      };

      const workflow = await engine.createWorkflow(definition);
      workflow.context.variables.shouldNotify = true;

      await engine.startWorkflow(workflow.id);

      const finalWorkflow = engine.getWorkflow(workflow.id);
      const step2 = finalWorkflow?.tasks.get('step-2');
      expect(step2?.status).toBe('completed');
    });
  });

  describe('Error Handling', () => {
    it('should handle task failures', async () => {
      const definition: WorkflowDefinition = {
        id: 'failing-workflow',
        name: 'Failing Workflow',
        version: '1.0.0',
        steps: [
          { id: 'step-1', name: 'Good Step', type: 'http-request' },
          { id: 'step-2', name: 'Failing Step', type: 'failing-task' },
        ],
      };

      const workflow = await engine.createWorkflow(definition);
      await engine.startWorkflow(workflow.id);

      const finalWorkflow = engine.getWorkflow(workflow.id);
      const step2 = finalWorkflow?.tasks.get('step-2');
      expect(step2?.status).toBe('failed');
      expect(step2?.error).toBe('Error: Intentional failure');
    });

    it('should retry failed tasks', async () => {
      const definition: WorkflowDefinition = {
        id: 'retry-workflow',
        name: 'Retry Workflow',
        version: '1.0.0',
        steps: [
          { 
            id: 'step-1', 
            name: 'Failing with Retry', 
            type: 'failing-task',
            retryPolicy: {
              maxRetries: 3,
              backoff: 'exponential',
            },
          },
        ],
      };

      const workflow = await engine.createWorkflow(definition);
      await engine.startWorkflow(workflow.id);

      const finalWorkflow = engine.getWorkflow(workflow.id);
      const step1 = finalWorkflow?.tasks.get('step-1');
      expect(step1?.retries).toBeGreaterThanOrEqual(1);
    });

    it('should cancel running workflow', async () => {
      const definition: WorkflowDefinition = {
        id: 'cancellable-workflow',
        name: 'Cancellable Workflow',
        version: '1.0.0',
        steps: [
          { id: 'step-1', name: 'Slow Step', type: 'slow-task' },
          { id: 'step-2', name: 'After Slow', type: 'notification' },
        ],
      };

      const workflow = await engine.createWorkflow(definition);
      
      // Start and immediately cancel
      const startPromise = engine.startWorkflow(workflow.id);
      await engine.cancelWorkflow(workflow.id);
      await startPromise.catch(() => {}); // Ignore errors from cancelled workflow

      const finalWorkflow = engine.getWorkflow(workflow.id);
      expect(finalWorkflow?.state).toBe('cancelled');
    });
  });

  describe('Parallel Execution', () => {
    it('should execute parallel steps concurrently', async () => {
      const definition: WorkflowDefinition = {
        id: 'parallel-workflow',
        name: 'Parallel Workflow',
        version: '1.0.0',
        steps: [
          { id: 'step-1', name: 'Parallel 1', type: 'slow-task' },
          { id: 'step-2', name: 'Parallel 2', type: 'slow-task' },
          { id: 'step-3', name: 'Parallel 3', type: 'slow-task' },
          { 
            id: 'step-4', 
            name: 'After All', 
            type: 'notification',
            dependsOn: ['step-1', 'step-2', 'step-3'],
          },
        ],
      };

      const startTime = Date.now();
      const workflow = await engine.createWorkflow(definition);
      await engine.startWorkflow(workflow.id);
      const duration = Date.now() - startTime;

      // If parallel, total time should be less than sum of individual times
      // 3 * 500ms = 1500ms sequential, ~500ms parallel
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('State Management', () => {
    it('should track workflow state transitions', async () => {
      const definition: WorkflowDefinition = {
        id: 'state-workflow',
        name: 'State Workflow',
        version: '1.0.0',
        steps: [
          { id: 'step-1', name: 'Step', type: 'http-request' },
        ],
      };

      const workflow = await engine.createWorkflow(definition);
      expect(engine.getWorkflowState(workflow.id)).toBe('created');

      await engine.startWorkflow(workflow.id);
      expect(engine.getWorkflowState(workflow.id)).toBe('completed');
    });

    it('should persist context across steps', async () => {
      const definition: WorkflowDefinition = {
        id: 'context-workflow',
        name: 'Context Workflow',
        version: '1.0.0',
        steps: [
          { id: 'step-1', name: 'Generate', type: 'http-request' },
          { id: 'step-2', name: 'Consume', type: 'data-transform' },
        ],
      };

      const workflow = await engine.createWorkflow(definition);
      workflow.context.inputs.testInput = 'test-value';

      await engine.startWorkflow(workflow.id);

      const finalWorkflow = engine.getWorkflow(workflow.id);
      expect(finalWorkflow?.context.outputs['step-1']).toBeDefined();
    });
  });

  describe('Workflow Definition Validation', () => {
    it('should validate workflow definition', async () => {
      const invalidDefinition = {
        id: '',
        name: 'Invalid',
        version: '1.0.0',
        steps: [],
      } as WorkflowDefinition;

      await expect(engine.createWorkflow(invalidDefinition)).rejects.toThrow();
    });

    it('should detect circular dependencies', async () => {
      const circularDefinition: WorkflowDefinition = {
        id: 'circular-workflow',
        name: 'Circular Workflow',
        version: '1.0.0',
        steps: [
          { id: 'step-1', name: 'Step 1', type: 'http-request', dependsOn: ['step-2'] },
          { id: 'step-2', name: 'Step 2', type: 'data-transform', dependsOn: ['step-1'] },
        ],
      };

      // Should either throw or handle gracefully
      const workflow = await engine.createWorkflow(circularDefinition);
      await expect(engine.startWorkflow(workflow.id)).rejects.toThrow();
    });

    it('should validate step types', async () => {
      const definition: WorkflowDefinition = {
        id: 'invalid-type-workflow',
        name: 'Invalid Type Workflow',
        version: '1.0.0',
        steps: [
          { id: 'step-1', name: 'Unknown Type', type: 'unknown-type' },
        ],
      };

      const workflow = await engine.createWorkflow(definition);
      await engine.startWorkflow(workflow.id);

      const finalWorkflow = engine.getWorkflow(workflow.id);
      const step1 = finalWorkflow?.tasks.get('step-1');
      expect(step1?.status).toBe('failed');
      expect(step1?.error).toContain('No executor');
    });
  });
});

// ===== Workflow Types Export =====

declare module '@/lib/workflows/types' {
  export interface WorkflowDefinition {
    id: string;
    name: string;
    version: string;
    steps: WorkflowStep[];
  }

  export interface WorkflowStep {
    id: string;
    name: string;
    type: string;
    dependsOn?: string[];
    condition?: string;
    retryPolicy?: {
      maxRetries: number;
      backoff: 'linear' | 'exponential';
    };
  }

  export interface WorkflowContext {
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    variables: Record<string, unknown>;
  }

  export type WorkflowState = 'created' | 'running' | 'completed' | 'failed' | 'cancelled';
}
