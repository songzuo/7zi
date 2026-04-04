/**
 * Memory Leak Fix Tests
 * Simple unit tests for the three P0 memory leak fixes
 */

import { WorkflowEngine } from '../../src/engine/WorkflowEngine';
import {
  ExecutionStatus,
  NodeExecutionStatus,
  TriggerType,
  IExecution
} from '../../src/types/workflow.types';

// Mock dependencies
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  verbose: jest.fn()
};

const mockStorage = {
  getWorkflow: jest.fn(),
  saveExecution: jest.fn(),
  getExecution: jest.fn(),
  saveCheckpoint: jest.fn(),
  getCheckpoint: jest.fn()
};

const mockQueueManager = {
  addWorkflowJob: jest.fn()
};

describe('Memory Leak Fixes', () => {
  describe('Execution State Map Cleanup', () => {
    it('should initialize with cleanup configuration', () => {
      const engine = new WorkflowEngine(
        mockStorage as any,
        mockQueueManager as any,
        mockLogger as any,
        {
          maxParallelTasks: 10,
          checkpointInterval: 1000,
          maxCheckpointsPerExecution: 5,
          executionCleanupDelay: 1000
        }
      );

      expect((engine as any).maxParallelTasks).toBe(10);
      expect((engine as any).checkpointInterval).toBe(1000);
      expect((engine as any).maxCheckpointsPerExecution).toBe(5);
      expect((engine as any).executionCleanupDelay).toBe(1000);
    });

    it('should start and stop cleanup task', () => {
      const engine = new WorkflowEngine(
        mockStorage as any,
        mockQueueManager as any,
        mockLogger as any
      );

      engine.startCleanupTask();
      expect((engine as any).cleanupTimer).not.toBeNull();

      engine.stopCleanupTask();
      expect((engine as any).cleanupTimer).toBeNull();
    });

    it('should cleanup completed executions from memory', async () => {
      const engine = new WorkflowEngine(
        mockStorage as any,
        mockQueueManager as any,
        mockLogger as any,
        { executionCleanupDelay: 100 }
      );

      const executionId = 'test-execution-1';
      const mockExecution: IExecution = {
        id: executionId,
        workflowId: 'test-workflow',
        status: ExecutionStatus.COMPLETED,
        trigger: { type: TriggerType.MANUAL },
        variables: {},
        nodeExecutions: new Map(),
        startTime: new Date(),
        endTime: new Date(Date.now() - 200),
        checkoints: [],
        priority: 1
      };

      (engine as any).executions.set(executionId, mockExecution);
      expect((engine as any).executions.has(executionId)).toBe(true);

      await (engine as any).cleanupCompletedExecutions();
      expect((engine as any).executions.has(executionId)).toBe(false);
    });

    it('should allow manual cleanup of specific execution', () => {
      const engine = new WorkflowEngine(
        mockStorage as any,
        mockQueueManager as any,
        mockLogger as any
      );

      const executionId = 'test-execution-manual';
      const mockExecution: IExecution = {
        id: executionId,
        workflowId: 'test-workflow',
        status: ExecutionStatus.FAILED,
        trigger: { type: TriggerType.MANUAL },
        variables: {},
        nodeExecutions: new Map(),
        startTime: new Date(),
        checkoints: [],
        priority: 1
      };

      (engine as any).executions.set(executionId, mockExecution);
      expect((engine as any).executions.has(executionId)).toBe(true);

      engine.cleanupExecution(executionId);
      expect((engine as any).executions.has(executionId)).toBe(false);
    });

    it('should clear all executions on shutdown', async () => {
      const engine = new WorkflowEngine(
        mockStorage as any,
        mockQueueManager as any,
        mockLogger as any
      );

      for (let i = 0; i < 5; i++) {
        const mockExecution: IExecution = {
          id: `test-execution-${i}`,
          workflowId: 'test-workflow',
          status: ExecutionStatus.COMPLETED,
          trigger: { type: TriggerType.MANUAL },
          variables: {},
          nodeExecutions: new Map(),
          startTime: new Date(),
          checkoints: [],
          priority: 1
        };
        (engine as any).executions.set(`test-execution-${i}`, mockExecution);
      }

      expect((engine as any).executions.size).toBe(5);

      await engine.shutdown();

      expect((engine as any).executions.size).toBe(0);
      expect((engine as any).cleanupTimer).toBeNull();
    });
  });

  describe('Checkpoint LRU Cache Limit', () => {
    it('should enforce maxCheckpointsPerExecution limit', async () => {
      const maxCheckpoints = 5;
      const engine = new WorkflowEngine(
        mockStorage as any,
        mockQueueManager as any,
        mockLogger as any,
        { maxCheckpointsPerExecution: maxCheckpoints }
      );

      const mockExecution: IExecution = {
        id: 'test-execution-checkpoint',
        workflowId: 'test-workflow',
        status: ExecutionStatus.RUNNING,
        trigger: { type: TriggerType.MANUAL },
        variables: {},
        nodeExecutions: new Map(),
        startTime: new Date(),
        checkoints: [],
        priority: 1
      };

      // Create more checkpoints than the limit
      for (let i = 0; i < 10; i++) {
        await (engine as any).createCheckpoint(mockExecution);
      }

      // Verify checkpoint count is limited
      expect(mockExecution.checkoints.length).toBe(maxCheckpoints);
    });

    it('should keep the most recent checkpoints (LRU behavior)', async () => {
      const maxCheckpoints = 3;
      const engine = new WorkflowEngine(
        mockStorage as any,
        mockQueueManager as any,
        mockLogger as any,
        { maxCheckpointsPerExecution: maxCheckpoints }
      );

      const mockExecution: IExecution = {
        id: 'test-execution-lru',
        workflowId: 'test-workflow',
        status: ExecutionStatus.RUNNING,
        trigger: { type: TriggerType.MANUAL },
        variables: { value: 0 },
        nodeExecutions: new Map(),
        startTime: new Date(),
        checkoints: [],
        priority: 1
      };

      // Create checkpoints with sequential values
      for (let i = 1; i <= 5; i++) {
        mockExecution.variables.value = i;
        await (engine as any).createCheckpoint(mockExecution);
      }

      // Verify we have exactly maxCheckpoints
      expect(mockExecution.checkoints.length).toBe(maxCheckpoints);

      // Verify the checkpoints are the most recent ones (values 3, 4, 5)
      const values = mockExecution.checkoints.map(cp => cp.variables.value);
      expect(values).toEqual([3, 4, 5]);
    });
  });

  describe('Configuration Options', () => {
    it('should use default values when options are not provided', () => {
      const engine = new WorkflowEngine(
        mockStorage as any,
        mockQueueManager as any,
        mockLogger as any
      );

      expect((engine as any).maxParallelTasks).toBe(10);
      expect((engine as any).checkpointInterval).toBe(5000);
      expect((engine as any).maxCheckpointsPerExecution).toBe(50);
      expect((engine as any).executionCleanupDelay).toBe(300000);
    });

    it('should use custom values when options are provided', () => {
      const engine = new WorkflowEngine(
        mockStorage as any,
        mockQueueManager as any,
        mockLogger as any,
        {
          maxParallelTasks: 20,
          checkpointInterval: 2000,
          maxCheckpointsPerExecution: 10,
          executionCleanupDelay: 60000
        }
      );

      expect((engine as any).maxParallelTasks).toBe(20);
      expect((engine as any).checkpointInterval).toBe(2000);
      expect((engine as any).maxCheckpointsPerExecution).toBe(10);
      expect((engine as any).executionCleanupDelay).toBe(60000);
    });
  });
});
