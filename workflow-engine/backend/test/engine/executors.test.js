/**
 * Executors Unit Tests
 */

const {
  BaseExecutor,
  StartExecutor,
  EndExecutor,
  TaskExecutor,
  CodeExecutor,
  ConditionExecutor,
  LoopExecutor,
  ParallelExecutor,
  SubflowExecutor,
  DelayExecutor,
  HttpExecutor,
  AiExecutor,
  TransformExecutor
} = require('../../src/engine/executors/index');

const WorkflowEngine = require('../../src/engine/WorkflowEngine');

// Mock fetch for HttpExecutor tests
global.fetch = jest.fn();

describe('BaseExecutor', () => {
  test('should throw error when execute is called directly', async () => {
    const executor = new BaseExecutor('test');
    const node = { id: 'test', type: 'test', data: {} };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    await expect(executor.execute(node, execution, {})).rejects.toThrow('execute() must be implemented by subclass');
  });

  test('should have type property', () => {
    const executor = new BaseExecutor('custom');
    expect(executor.type).toBe('custom');
  });
});

describe('StartExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new StartExecutor();
  });

  test('should have correct type', () => {
    expect(executor.type).toBe('start');
  });

  test('should execute and return success', async () => {
    const node = { id: 'start', type: 'start', data: {} };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.started).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  test('should return timestamp in ISO format', async () => {
    const node = { id: 'start', type: 'start', data: {} };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('EndExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new EndExecutor();
  });

  test('should have correct type', () => {
    expect(executor.type).toBe('end');
  });

  test('should execute and return completed', async () => {
    const node = { id: 'end', type: 'end', data: {} };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.completed).toBe(true);
    expect(result.timestamp).toBeDefined();
  });

  test('should return timestamp in ISO format', async () => {
    const node = { id: 'end', type: 'end', data: {} };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('TaskExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new TaskExecutor();
    console.log = jest.fn(); // Mock console.log
  });

  test('should have correct type', () => {
    expect(executor.type).toBe('task');
  });

  test('should execute task with action', async () => {
    const node = {
      id: 'task1',
      type: 'task',
      data: {
        action: 'sendEmail',
        params: { to: 'test@example.com', subject: 'Test' }
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.action).toBe('sendEmail');
    expect(result.result).toBe('success');
    expect(result.timestamp).toBeDefined();
  });

  test('should log task execution', async () => {
    const node = {
      id: 'task1',
      type: 'task',
      data: {
        action: 'processData',
        params: { input: 'test' }
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    await executor.execute(node, execution, {});

    expect(console.log).toHaveBeenCalledWith('Executing task: processData', { input: 'test' });
  });

  test('should handle task without params', async () => {
    const node = {
      id: 'task1',
      type: 'task',
      data: {
        action: 'cleanup'
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.action).toBe('cleanup');
    expect(result.result).toBe('success');
  });
});

describe('CodeExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new CodeExecutor();
    console.log = jest.fn(); // Mock console.log
  });

  test('should have correct type', () => {
    expect(executor.type).toBe('code');
  });

  test('should inherit from TaskExecutor', () => {
    expect(executor).toBeInstanceOf(TaskExecutor);
  });

  test('should execute code action', async () => {
    const node = {
      id: 'code1',
      type: 'code',
      data: {
        action: 'runScript',
        params: { script: 'console.log("Hello")' }
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.action).toBe('runScript');
    expect(result.result).toBe('success');
    expect(result.timestamp).toBeDefined();
  });

  test('should log code execution', async () => {
    const node = {
      id: 'code1',
      type: 'code',
      data: {
        action: 'eval',
        params: { code: '1 + 1' }
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    await executor.execute(node, execution, {});

    expect(console.log).toHaveBeenCalledWith('Executing task: eval', { code: '1 + 1' });
  });

  test('should handle code execution with input context', async () => {
    const node = {
      id: 'code1',
      type: 'code',
      data: {
        action: 'process',
        params: { inputData: 'test' }
      }
    };
    const execution = { id: 'exec_1', variables: { userId: 123 }, nodeExecutions: [] };

    const result = await executor.execute(node, execution, { extra: 'data' });

    expect(result.action).toBe('process');
    expect(result.result).toBe('success');
  });
});

describe('ConditionExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new ConditionExecutor();
  });

  test('should have correct type', () => {
    expect(executor.type).toBe('condition');
  });

  test('should match first true condition', async () => {
    const node = {
      id: 'cond1',
      type: 'condition',
      data: {
        conditions: [
          { expression: 'variables.value > 10', branch: 'high' },
          { expression: 'variables.value > 5', branch: 'medium' },
          { expression: 'true', branch: 'low' }
        ],
        defaultBranch: 'default'
      }
    };
    const execution = { id: 'exec_1', variables: { value: 15 }, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.branch).toBe('high');
    expect(result.matched).toBe(true);
  });

  test('should match second condition', async () => {
    const node = {
      id: 'cond1',
      type: 'condition',
      data: {
        conditions: [
          { expression: 'variables.value > 10', branch: 'high' },
          { expression: 'variables.value > 5', branch: 'medium' },
          { expression: 'true', branch: 'low' }
        ],
        defaultBranch: 'default'
      }
    };
    const execution = { id: 'exec_1', variables: { value: 7 }, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.branch).toBe('medium');
    expect(result.matched).toBe(true);
  });

  test('should use default branch when no conditions match', async () => {
    const node = {
      id: 'cond1',
      type: 'condition',
      data: {
        conditions: [
          { expression: 'variables.value > 10', branch: 'high' },
          { expression: 'variables.value > 5', branch: 'medium' }
        ],
        defaultBranch: 'default'
      }
    };
    const execution = { id: 'exec_1', variables: { value: 2 }, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.branch).toBe('default');
    expect(result.matched).toBe(false);
  });

  test('should evaluate conditions with input', async () => {
    const node = {
      id: 'cond1',
      type: 'condition',
      data: {
        conditions: [
          { expression: 'input.status === "success"', branch: 'success' },
          { expression: 'input.status === "error"', branch: 'error' }
        ],
        defaultBranch: 'unknown'
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, { status: 'success' });

    expect(result.branch).toBe('success');
    expect(result.matched).toBe(true);
  });

  test('should handle invalid expression gracefully', async () => {
    const node = {
      id: 'cond1',
      type: 'condition',
      data: {
        conditions: [
          { expression: 'invalid syntax', branch: 'invalid' }
        ],
        defaultBranch: 'default'
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.branch).toBe('default');
    expect(result.matched).toBe(false);
  });

  test('should handle empty conditions array', async () => {
    const node = {
      id: 'cond1',
      type: 'condition',
      data: {
        conditions: [],
        defaultBranch: 'default'
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.branch).toBe('default');
    expect(result.matched).toBe(false);
  });

  test('should handle complex boolean expressions', async () => {
    const node = {
      id: 'cond1',
      type: 'condition',
      data: {
        conditions: [
          { expression: 'variables.a > 5 && variables.b < 10', branch: 'both' },
          { expression: 'variables.a > 5 || variables.b > 10', branch: 'either' }
        ],
        defaultBranch: 'none'
      }
    };
    const execution = { id: 'exec_1', variables: { a: 7, b: 8 }, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.branch).toBe('both');
    expect(result.matched).toBe(true);
  });
});

describe('LoopExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new LoopExecutor();
  });

  test('should have correct type', () => {
    expect(executor.type).toBe('loop');
  });

  test('should iterate over array from input', async () => {
    const node = {
      id: 'loop1',
      type: 'loop',
      data: {
        iterable: [1, 2, 3, 4, 5],
        maxIterations: 100
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.count).toBe(5);
    expect(result.iterations).toHaveLength(5);
    expect(result.iterations[0].item).toBe(1);
    expect(result.iterations[4].item).toBe(5);
  });

  test('should iterate over array from variables', async () => {
    const node = {
      id: 'loop1',
      type: 'loop',
      data: {
        iterable: 'variables.items',
        maxIterations: 100
      }
    };
    const execution = {
      id: 'exec_1',
      variables: { items: ['a', 'b', 'c'] },
      nodeExecutions: []
    };

    const result = await executor.execute(node, execution, {});

    expect(result.count).toBe(3);
    expect(result.iterations[0].item).toBe('a');
    expect(result.iterations[2].item).toBe('c');
  });

  test('should respect maxIterations limit', async () => {
    const node = {
      id: 'loop1',
      type: 'loop',
      data: {
        iterable: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        maxIterations: 5
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.count).toBe(5);
    expect(result.iterations).toHaveLength(5);
  });

  test('should handle empty array', async () => {
    const node = {
      id: 'loop1',
      type: 'loop',
      data: {
        iterable: [],
        maxIterations: 100
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.count).toBe(0);
    expect(result.iterations).toHaveLength(0);
  });

  test('should handle undefined iterable', async () => {
    const node = {
      id: 'loop1',
      type: 'loop',
      data: {
        iterable: 'variables.nonexistent',
        maxIterations: 100
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.count).toBe(0);
    expect(result.iterations).toHaveLength(0);
  });

  test('should include index in iterations', async () => {
    const node = {
      id: 'loop1',
      type: 'loop',
      data: {
        iterable: ['x', 'y', 'z'],
        maxIterations: 100
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.iterations[0].index).toBe(0);
    expect(result.iterations[1].index).toBe(1);
    expect(result.iterations[2].index).toBe(2);
  });

  test('should include timestamp in iterations', async () => {
    const node = {
      id: 'loop1',
      type: 'loop',
      data: {
        iterable: [1],
        maxIterations: 100
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.iterations[0].timestamp).toBeDefined();
    expect(result.iterations[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('ParallelExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new ParallelExecutor();
  });

  test('should have correct type', () => {
    expect(executor.type).toBe('parallel');
  });

  test('should mark execution as parallel', async () => {
    const node = {
      id: 'parallel1',
      type: 'parallel',
      data: {
        branches: ['branch1', 'branch2', 'branch3']
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.parallel).toBe(true);
    expect(result.branches).toEqual(['branch1', 'branch2', 'branch3']);
  });

  test('should include timestamp', async () => {
    const node = {
      id: 'parallel1',
      type: 'parallel',
      data: {
        branches: ['branch1']
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.timestamp).toBeDefined();
  });

  test('should handle empty branches', async () => {
    const node = {
      id: 'parallel1',
      type: 'parallel',
      data: {
        branches: []
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.parallel).toBe(true);
    expect(result.branches).toEqual([]);
  });
});

describe('DelayExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new DelayExecutor();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should have correct type', () => {
    expect(executor.type).toBe('delay');
  });

  test('should delay for specified seconds', async () => {
    const node = {
      id: 'delay1',
      type: 'delay',
      data: {
        duration: 2,
        unit: 'seconds'
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const promise = executor.execute(node, execution, {});

    // Fast-forward timers
    jest.advanceTimersByTime(2000);

    const result = await promise;

    expect(result.delayed).toBe(true);
    expect(result.duration).toBe('2 seconds');
  });

  test('should delay for specified minutes', async () => {
    const node = {
      id: 'delay1',
      type: 'delay',
      data: {
        duration: 1,
        unit: 'minutes'
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const promise = executor.execute(node, execution, {});

    // Fast-forward timers (1 minute = 60000ms)
    jest.advanceTimersByTime(60000);

    const result = await promise;

    expect(result.delayed).toBe(true);
    expect(result.duration).toBe('1 minutes');
  });

  test('should delay for specified hours', async () => {
    const node = {
      id: 'delay1',
      type: 'delay',
      data: {
        duration: 1,
        unit: 'hours'
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const promise = executor.execute(node, execution, {});

    // Fast-forward timers (1 hour = 3600000ms)
    jest.advanceTimersByTime(3600000);

    const result = await promise;

    expect(result.delayed).toBe(true);
    expect(result.duration).toBe('1 hours');
  });

  test('should default to seconds unit', async () => {
    const node = {
      id: 'delay1',
      type: 'delay',
      data: {
        duration: 3
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const promise = executor.execute(node, execution, {});

    jest.advanceTimersByTime(3000);

    const result = await promise;

    expect(result.delayed).toBe(true);
    expect(result.duration).toBe('3 seconds');
  });
});

describe('HttpExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new HttpExecutor();
    global.fetch.mockClear();
  });

  test('should have correct type', () => {
    expect(executor.type).toBe('http');
  });

  test('should execute GET request', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' })
    };
    global.fetch.mockResolvedValue(mockResponse);

    const node = {
      id: 'http1',
      type: 'http',
      data: {
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: { 'Authorization': 'Bearer token' }
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/data',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token'
        })
      })
    );
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ data: 'test' });
  });

  test('should execute POST request with body', async () => {
    const mockResponse = {
      ok: true,
      status: 201,
      json: async () => ({ id: 123, created: true })
    };
    global.fetch.mockResolvedValue(mockResponse);

    const node = {
      id: 'http1',
      type: 'http',
      data: {
        url: 'https://api.example.com/users',
        method: 'POST',
        headers: { 'Authorization': 'Bearer token' },
        body: { name: 'John', email: 'john@example.com' }
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/users',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'John', email: 'john@example.com' })
      })
    );
    expect(result.status).toBe(201);
    expect(result.data).toEqual({ id: 123, created: true });
  });

  test('should execute PUT request', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ updated: true })
    };
    global.fetch.mockResolvedValue(mockResponse);

    const node = {
      id: 'http1',
      type: 'http',
      data: {
        url: 'https://api.example.com/users/123',
        method: 'PUT',
        body: { name: 'Updated Name' }
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/users/123',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' })
      })
    );
    expect(result.status).toBe(200);
  });

  test('should execute DELETE request', async () => {
    const mockResponse = {
      ok: true,
      status: 204,
      json: async () => ({ deleted: true })
    };
    global.fetch.mockResolvedValue(mockResponse);

    const node = {
      id: 'http1',
      type: 'http',
      data: {
        url: 'https://api.example.com/users/123',
        method: 'DELETE'
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/users/123',
      expect.objectContaining({
        method: 'DELETE'
      })
    );
    expect(result.status).toBe(204);
  });

  test('should handle HTTP errors', async () => {
    const mockError = new Error('Network error');
    global.fetch.mockRejectedValue(mockError);

    const node = {
      id: 'http1',
      type: 'http',
      data: {
        url: 'https://api.example.com/data',
        method: 'GET'
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    await expect(executor.execute(node, execution, {})).rejects.toThrow('HTTP request failed: Network error');
  });

  test('should handle 404 response', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' })
    };
    global.fetch.mockResolvedValue(mockResponse);

    const node = {
      id: 'http1',
      type: 'http',
      data: {
        url: 'https://api.example.com/notfound',
        method: 'GET'
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.status).toBe(404);
    expect(result.data).toEqual({ error: 'Not found' });
  });

  test('should include timestamp in result', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' })
    };
    global.fetch.mockResolvedValue(mockResponse);

    const node = {
      id: 'http1',
      type: 'http',
      data: {
        url: 'https://api.example.com/data',
        method: 'GET'
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, {});

    expect(result.timestamp).toBeDefined();
    expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test('should handle custom headers', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' })
    };
    global.fetch.mockResolvedValue(mockResponse);

    const node = {
      id: 'http1',
      type: 'http',
      data: {
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {
          'Authorization': 'Bearer token',
          'X-Custom-Header': 'custom-value',
          'Accept': 'application/json'
        }
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    await executor.execute(node, execution, {});

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/data',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer token',
          'X-Custom-Header': 'custom-value',
          'Accept': 'application/json'
        })
      })
    );
  });
});

describe('TransformExecutor', () => {
  let executor;

  beforeEach(() => {
    executor = new TransformExecutor();
  });

  test('should have correct type', () => {
    expect(executor.type).toBe('transform');
  });

  test('should apply map transformation', async () => {
    const node = {
      id: 'transform1',
      type: 'transform',
      data: {
        transformations: [
          {
            type: 'map',
            config: {
              mapping: {
                id: 'userId',
                name: 'userName',
                email: 'userEmail'
              }
            }
          }
        ]
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const input = [
      { userId: 1, userName: 'John', userEmail: 'john@example.com' },
      { userId: 2, userName: 'Jane', userEmail: 'jane@example.com' }
    ];

    const result = await executor.execute(node, execution, input);

    expect(result).toEqual([
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: 'Jane', email: 'jane@example.com' }
    ]);
  });

  test('should apply filter transformation', async () => {
    const node = {
      id: 'transform1',
      type: 'transform',
      data: {
        transformations: [
          {
            type: 'filter',
            config: {
              field: 'status',
              value: 'active'
            }
          }
        ]
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const input = [
      { id: 1, status: 'active' },
      { id: 2, status: 'inactive' },
      { id: 3, status: 'active' }
    ];

    const result = await executor.execute(node, execution, input);

    expect(result).toEqual([
      { id: 1, status: 'active' },
      { id: 3, status: 'active' }
    ]);
  });

  test('should apply reduce transformation', async () => {
    const node = {
      id: 'transform1',
      type: 'transform',
      data: {
        transformations: [
          {
            type: 'reduce',
            config: {
              field: 'amount',
              operation: 'sum',
              initialValue: 0
            }
          }
        ]
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const input = [
      { amount: 10 },
      { amount: 20 },
      { amount: 30 }
    ];

    const result = await executor.execute(node, execution, input);

    expect(result).toBe(60);
  });

  test('should apply merge transformation', async () => {
    const node = {
      id: 'transform1',
      type: 'transform',
      data: {
        transformations: [
          {
            type: 'merge',
            config: {
              values: {
                processed: true,
                timestamp: '2024-01-01'
              }
            }
          }
        ]
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const input = { id: 1, name: 'Test' };

    const result = await executor.execute(node, execution, input);

    expect(result).toEqual({
      id: 1,
      name: 'Test',
      processed: true,
      timestamp: '2024-01-01'
    });
  });

  test('should apply extract transformation', async () => {
    const node = {
      id: 'transform1',
      type: 'transform',
      data: {
        transformations: [
          {
            type: 'extract',
            config: {
              path: 'data.user.name'
            }
          }
        ]
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const input = {
      data: {
        user: {
          id: 123,
          name: 'John Doe',
          email: 'john@example.com'
        }
      }
    };

    const result = await executor.execute(node, execution, input);

    expect(result).toBe('John Doe');
  });

  test('should apply multiple transformations in sequence', async () => {
    const node = {
      id: 'transform1',
      type: 'transform',
      data: {
        transformations: [
          {
            type: 'filter',
            config: {
              field: 'active',
              value: true
            }
          },
          {
            type: 'reduce',
            config: {
              field: 'id',
              operation: 'count',
              initialValue: 0
            }
          }
        ]
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const input = [
      { id: 1, name: 'John', active: true },
      { id: 2, name: 'Jane', active: false },
      { id: 3, name: 'Bob', active: true }
    ];

    const result = await executor.execute(node, execution, input);

    expect(result).toBe(2);
  });

  test('should handle non-array input for map', async () => {
    const node = {
      id: 'transform1',
      type: 'transform',
      data: {
        transformations: [
          {
            type: 'map',
            config: {
              mapping: { id: 'userId' }
            }
          }
        ]
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const input = { id: 1, name: 'Test' };

    const result = await executor.execute(node, execution, input);

    expect(result).toEqual({ id: 1, name: 'Test' });
  });

  test('should handle non-array input for filter', async () => {
    const node = {
      id: 'transform1',
      type: 'transform',
      data: {
        transformations: [
          {
            type: 'filter',
            config: {
              field: 'status',
              value: 'active'
            }
          }
        ]
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const input = { status: 'active' };

    const result = await executor.execute(node, execution, input);

    expect(result).toEqual({ status: 'active' });
  });

  test('should handle non-array input for reduce', async () => {
    const node = {
      id: 'transform1',
      type: 'transform',
      data: {
        transformations: [
          {
            type: 'reduce',
            config: {
              field: 'value',
              operation: 'sum',
              initialValue: 0
            }
          }
        ]
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const input = { value: 10 };

    const result = await executor.execute(node, execution, input);

    expect(result).toEqual({ value: 10 });
  });

  test('should handle unknown transformation type', async () => {
    const node = {
      id: 'transform1',
      type: 'transform',
      data: {
        transformations: [
          {
            type: 'unknown',
            config: {}
          }
        ]
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const input = { id: 1 };

    const result = await executor.execute(node, execution, input);

    expect(result).toEqual({ id: 1 });
  });

  test('should handle empty transformations array', async () => {
    const node = {
      id: 'transform1',
      type: 'transform',
      data: {
        transformations: []
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const input = { id: 1, name: 'Test' };

    const result = await executor.execute(node, execution, input);

    expect(result).toEqual({ id: 1, name: 'Test' });
  });
});

describe('SubflowExecutor', () => {
  let executor;
  let engine;

  beforeEach(() => {
    engine = new WorkflowEngine();
    executor = new SubflowExecutor(engine);

    // Register a mock executor for the subflow
    const mockExecutor = {
      async execute(node, execution, input) {
        return { result: 'subflow-executed', ...input };
      }
    };
    engine.registerExecutor('start', mockExecutor);
    engine.registerExecutor('end', mockExecutor);

    // Register a subflow
    const subflow = {
      id: 'subflow_1',
      name: 'Subflow',
      version: '1.0.0',
      nodes: [
        { id: 'start', type: 'start' },
        { id: 'end', type: 'end' }
      ],
      edges: [{ id: 'e1', source: 'start', target: 'end' }]
    };
    engine.registerWorkflow(subflow);
  });

  test('should have correct type', () => {
    expect(executor.type).toBe('subflow');
  });

  test('should execute subflow', async () => {
    const node = {
      id: 'subflow1',
      type: 'subflow',
      data: {
        workflowId: 'subflow_1',
        variables: { fromParent: 'value' }
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, { inputVar: 'test' });

    expect(result.subflowId).toBeDefined();
    expect(result.status).toBe('completed');
    expect(result.output).toBeDefined();
  });

  test('should throw error when workflowId is missing', async () => {
    const node = {
      id: 'subflow1',
      type: 'subflow',
      data: {}
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    await expect(executor.execute(node, execution, {})).rejects.toThrow('Subflow requires workflowId');
  });

  test('should merge variables with input', async () => {
    const node = {
      id: 'subflow1',
      type: 'subflow',
      data: {
        workflowId: 'subflow_1',
        variables: { var1: 'fromNode' }
      }
    };
    const execution = { id: 'exec_1', variables: {}, nodeExecutions: [] };

    const result = await executor.execute(node, execution, { var2: 'fromInput' });

    expect(result.subflowId).toBeDefined();
    expect(result.status).toBe('completed');
  });
});