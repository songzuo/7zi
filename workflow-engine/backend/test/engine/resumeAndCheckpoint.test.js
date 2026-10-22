/**
 * WorkflowEngine - Advanced Feature Tests
 * Tests for: runExecution, executeNextNodes, resumeFromCheckpoint, startCheckpointTimer
 */

const WorkflowEngine = require('../../src/engine/WorkflowEngine');

class MockExecutor {
  constructor(options = {}) {
    this.type = options.type || 'mock';
    this.shouldFail = options.shouldFail || false;
    this.delay = options.delay || 5;
  }

  async execute(node, execution, input) {
    if (this.shouldFail) {
      throw new Error(`Mock executor failed: ${node.type}`);
    }
    await new Promise(resolve => setTimeout(resolve, this.delay));
    return { executed: node.type, nodeId: node.id, timestamp: new Date().toISOString() };
  }
}

describe('WorkflowEngine - Advanced Execution', () => {
  let engine;

  beforeEach(() => {
    engine = new WorkflowEngine({
      maxParallelTasks: 5,
      checkpointInterval: 100,
      defaultTimeout: 60
    });
  });

  describe('runExecution', () => {
    test('should run from start node and execute graph', async () => {
      engine.registerExecutor('start', new MockExecutor({ type: 'start' }));
      engine.registerExecutor('task', new MockExecutor({ type: 'task' }));
      engine.registerExecutor('end', new MockExecutor({ type: 'end' }));

      const workflow = {
        id: 'wf_run_exec',
        name: 'Run Execution Test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'task', type: 'task' },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task' },
          { id: 'e2', source: 'task', target: 'end' }
        ]
      };

      engine.registerWorkflow(workflow);
      const execution = await engine.execute('wf_run_exec');

      expect(execution.status).toBe('completed');
      expect(execution.nodeExecutions.length).toBe(3);
    });

    test('should throw if no start node found', async () => {
      engine.registerExecutor('task', new MockExecutor());

      const workflow = {
        id: 'wf_no_start',
        name: 'No Start Test',
        version: '1.0.0',
        nodes: [
          { id: 'task', type: 'task' }
        ]
      };

      // The error is thrown during registerWorkflow (validateWorkflow)
      expect(() => engine.registerWorkflow(workflow)).toThrow('Invalid workflow: no start node');
    });

    test('should create checkpoints during execution', async () => {
      // Use a very short checkpoint interval
      const fastEngine = new WorkflowEngine({
        checkpointInterval: 5,
        defaultTimeout: 60
      });
      fastEngine.registerExecutor('start', new MockExecutor({ delay: 20 }));

      const workflow = {
        id: 'wf_checkpoint_timing',
        name: 'Checkpoint Timing Test',
        version: '1.0.0',
        nodes: [{ id: 'start', type: 'start' }],
        edges: []
      };

      fastEngine.registerWorkflow(workflow);
      const execution = await fastEngine.execute('wf_checkpoint_timing');

      // With 5ms interval and 20ms execution, at least 1 checkpoint should fire
      expect(execution.checkpoints.length).toBeGreaterThan(0);
    });
  });

  describe('executeNextNodes', () => {
    test('should execute sequential edges', async () => {
      engine.registerExecutor('start', new MockExecutor());
      engine.registerExecutor('task1', new MockExecutor());
      engine.registerExecutor('task2', new MockExecutor());

      const workflow = {
        id: 'wf_sequential',
        name: 'Sequential Test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'task1', type: 'task1' },
          { id: 'task2', type: 'task2' }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'task1' },
          { id: 'e2', source: 'task1', target: 'task2' }
        ]
      };

      engine.registerWorkflow(workflow);
      const execution = await engine.execute('wf_sequential');

      expect(execution.nodeExecutions.length).toBe(3);
      const task1Exec = execution.nodeExecutions.find(ne => ne.nodeId === 'task1');
      const task2Exec = execution.nodeExecutions.find(ne => ne.nodeId === 'task2');
      expect(task1Exec.status).toBe('completed');
      expect(task2Exec.status).toBe('completed');
    });

    test('should execute parallel edges when output.parallel is true', async () => {
      engine.registerExecutor('start', new MockExecutor({ delay: 10 }));
      engine.registerExecutor('branch1', new MockExecutor({ type: 'branch1' }));
      engine.registerExecutor('branch2', new MockExecutor({ type: 'branch2' }));
      engine.registerExecutor('end', new MockExecutor());

      const workflow = {
        id: 'wf_parallel_branches',
        name: 'Parallel Branches Test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'branch1', type: 'branch1' },
          { id: 'branch2', type: 'branch2' },
          { id: 'end', type: 'end' }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'branch1' },
          { id: 'e2', source: 'start', target: 'branch2' },
          { id: 'e3', source: 'branch1', target: 'end' },
          { id: 'e4', source: 'branch2', target: 'end' }
        ]
      };

      engine.registerWorkflow(workflow);

      // Mock the parallel output by intercepting
      const originalExecuteNode = engine.executeNode.bind(engine);
      let callCount = 0;
      engine.executeNode = async function(execution, nodeId, input) {
        callCount++;
        const result = await originalExecuteNode(execution, nodeId, input);
        // After start node, return parallel:true to trigger parallel execution
        if (nodeId === 'start') {
          return { ...result, parallel: true };
        }
        return result;
      };

      const execution = await engine.execute('wf_parallel_branches');
      expect(execution.status).toBe('completed');
    });

    test('should skip edges with failing condition', async () => {
      engine.registerExecutor('start', new MockExecutor());
      engine.registerExecutor('skipped', new MockExecutor());
      engine.registerExecutor('taken', new MockExecutor());

      const workflow = {
        id: 'wf_condition_skip',
        name: 'Condition Skip Test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'skipped', type: 'skipped' },
          { id: 'taken', type: 'taken' }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'skipped', condition: '${skipFlag} == 1' },
          { id: 'e2', source: 'start', target: 'taken', condition: '${takeFlag} == 1' }
        ]
      };

      engine.registerWorkflow(workflow);
      const execution = await engine.execute('wf_condition_skip', { skipFlag: 0, takeFlag: 1 });

      const skippedExec = execution.nodeExecutions.find(ne => ne.nodeId === 'skipped');
      expect(skippedExec).toBeUndefined();
      const takenExec = execution.nodeExecutions.find(ne => ne.nodeId === 'taken');
      expect(takenExec).toBeDefined();
      expect(takenExec.status).toBe('completed');
    });
  });

  describe('resumeFromCheckpoint', () => {
    test('should throw for non-existent checkpoint', async () => {
      await expect(engine.resumeFromCheckpoint('non_existent')).rejects.toThrow('Checkpoint not found: non_existent');
    });

    test('should throw for checkpoint without execution', async () => {
      // Create a checkpoint directly in the map without an execution
      engine.checkpoints.set('orphan_checkpoint', {
        id: 'orphan_checkpoint',
        executionId: 'non_existent_exec',
        timestamp: new Date().toISOString(),
        state: { variables: {}, nodeExecutions: [] }
      });

      await expect(engine.resumeFromCheckpoint('orphan_checkpoint')).rejects.toThrow('Execution not found: non_existent_exec');
    });
  });

  describe('startCheckpointTimer', () => {
    test('should return a timer interval', () => {
      engine.registerExecutor('start', new MockExecutor());

      const workflow = {
        id: 'wf_timer_test',
        name: 'Timer Test',
        version: '1.0.0',
        nodes: [{ id: 'start', type: 'start' }],
        edges: []
      };

      engine.registerWorkflow(workflow);
      const execution = engine.execute('wf_timer_test').then(exec => {
        // After execution completes, the timer should be cleared
        expect(exec.status).toBe('completed');
      });

      return execution;
    });

    test('should create checkpoints at interval during long execution', async () => {
      // Use a very short checkpoint interval
      const fastEngine = new WorkflowEngine({
        checkpointInterval: 5,
        defaultTimeout: 60
      });
      fastEngine.registerExecutor('start', new MockExecutor({ delay: 20 }));

      const workflow = {
        id: 'wf_interval_checkpoint',
        name: 'Interval Checkpoint Test',
        version: '1.0.0',
        nodes: [{ id: 'start', type: 'start' }],
        edges: []
      };

      fastEngine.registerWorkflow(workflow);
      const execution = await fastEngine.execute('wf_interval_checkpoint');

      // With 5ms interval and 20ms execution, at least 1 checkpoint should fire
      expect(execution.checkpoints.length).toBeGreaterThan(0);
      expect(fastEngine.checkpoints.size).toBeGreaterThan(0);
    });
  });

  describe('delay', () => {
    test('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await engine.delay(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });
  });

  describe('resolvePath', () => {
    test('should resolve simple property', () => {
      const context = { name: 'John' };
      const result = engine.resolvePath('name', context);
      expect(result).toBe('John');
    });

    test('should resolve nested property', () => {
      const context = { user: { profile: { name: 'John' } } };
      const result = engine.resolvePath('user.profile.name', context);
      expect(result).toBe('John');
    });

    test('should return undefined for non-existent path', () => {
      const context = { user: { name: 'John' } };
      const result = engine.resolvePath('user.email', context);
      expect(result).toBeUndefined();
    });

    test('should return undefined for null context', () => {
      const result = engine.resolvePath('name', null);
      expect(result).toBeUndefined();
    });

    test('should handle intermediate null value', () => {
      const context = { user: null };
      const result = engine.resolvePath('user.name', context);
      expect(result).toBeUndefined();
    });

    test('should resolve array index path', () => {
      const context = { items: [{ id: 'a' }, { id: 'b' }] };
      expect(engine.resolvePath('items[1].id', context)).toBe('b');
    });
  });

  describe('safeEval', () => {
    test('should return boolean true for truthy resolved value', () => {
      const context = { flag: true };
      expect(engine.safeEval('${flag}', context)).toBe(true);
    });

    test('should return true for falsy variable in comparison', () => {
      // When variable is false and compared with ==, result should be false
      const context = { flag: false };
      expect(engine.safeEval('${flag} == true', context)).toBe(false);
    });

    test('should handle equality comparison', () => {
      const context = { value: 5 };
      expect(engine.safeEval('${value} == 5', context)).toBe(true);
    });

    test('should handle inequality comparison', () => {
      const context = { value: 5 };
      expect(engine.safeEval('${value} != 3', context)).toBe(true);
    });

    test('should handle greater than comparison', () => {
      const context = { value: 10 };
      expect(engine.safeEval('${value} > 5', context)).toBe(true);
    });

    test('should handle less than comparison', () => {
      const context = { value: 3 };
      expect(engine.safeEval('${value} < 5', context)).toBe(true);
    });

    test('should return false for unresolved variable in comparison', () => {
      const context = {};
      expect(engine.safeEval('${undefined_var} > 5', context)).toBe(false);
    });

    test('should compare string variables without quoting issues', () => {
      const context = { name: 'John' };
      expect(engine.safeEval('${name} == "John"', context)).toBe(true);
      expect(engine.safeEval('${name} == "Jane"', context)).toBe(false);
    });

    test('should treat string values as literals rather than executable code', () => {
      const context = { payload: '"; return true; //' };
      expect(engine.safeEval('${payload} == "safe"', context)).toBe(false);
    });

    test('should support literal keywords', () => {
      expect(engine.safeEval('${true}', {})).toBe(true);
      expect(engine.safeEval('${false}', {})).toBe(false);
    });
  });

  describe('evaluateCondition', () => {
    test('should return true for null condition', () => {
      const execution = { variables: {}, nodeExecutions: [] };
      expect(engine.evaluateCondition(null, execution, {})).toBe(true);
    });

    test('should return true for undefined condition', () => {
      const execution = { variables: {}, nodeExecutions: [] };
      expect(engine.evaluateCondition(undefined, execution, {})).toBe(true);
    });

    test('should return false for unresolvable condition variable', () => {
      // When a condition references an undefined variable, safeEval returns false
      const execution = { variables: {}, nodeExecutions: [] };
      const result = engine.evaluateCondition('${undefinedVar} > 5', execution, {});
      expect(result).toBe(false);
    });

    test('should resolve bare variable names against execution variables', () => {
      const execution = { variables: { skipFlag: 0, takeFlag: 1 }, nodeExecutions: [] };

      expect(engine.evaluateCondition('${skipFlag} == 1', execution, {})).toBe(false);
      expect(engine.evaluateCondition('${takeFlag} == 1', execution, {})).toBe(true);
    });

    test('should resolve variables.* against execution variables', () => {
      const execution = { variables: { value: 10 }, nodeExecutions: [] };
      expect(engine.evaluateCondition('${variables.value} > 3', execution, {})).toBe(true);
    });

    test('should support plain JS expressions using output fields', () => {
      const execution = { variables: {}, nodeExecutions: [] };
      expect(engine.evaluateCondition("branch === 'valid'", execution, { branch: 'valid' })).toBe(true);
      expect(engine.evaluateCondition("branch === 'invalid'", execution, { branch: 'valid' })).toBe(false);
    });
  });

  describe('node retry logic', () => {
    test('should retry node on failure up to maxAttempts', async () => {
      let attempt = 0;
      engine.registerExecutor('start', new MockExecutor());
      engine.registerExecutor('fragile', {
        async execute(node, execution, input) {
          attempt++;
          if (attempt < 3) {
            throw new Error('Transient failure');
          }
          return { success: true, attempt };
        }
      });

      const workflow = {
        id: 'wf_retry',
        name: 'Retry Test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'start' },
          {
            id: 'fragile',
            type: 'fragile',
            retry: { maxAttempts: 3, backoffStrategy: 'fixed', initialDelay: 5, maxDelay: 100 }
          }
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'fragile' }
        ]
      };

      engine.registerWorkflow(workflow);
      const execution = await engine.execute('wf_retry');

      expect(execution.status).toBe('completed');
      expect(attempt).toBe(3);
    });
  });

  describe('timeout handling', () => {
    test('should timeout long-running nodes', async () => {
      engine.registerExecutor('start', new MockExecutor());
      engine.registerExecutor('slow', {
        async execute(node, execution, input) {
          await new Promise(resolve => setTimeout(resolve, 500));
          return { done: true };
        }
      });

      const workflow = {
        id: 'wf_timeout',
        name: 'Timeout Test',
        version: '1.0.0',
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'slow', type: 'slow', timeout: 0.05 } // 50ms timeout
        ],
        edges: [
          { id: 'e1', source: 'start', target: 'slow' }
        ]
      };

      engine.registerWorkflow(workflow);
      const execution = await engine.execute('wf_timeout');

      expect(execution.status).toBe('failed');
      expect(execution.error.message).toBe('Execution timeout');
    });
  });
});
