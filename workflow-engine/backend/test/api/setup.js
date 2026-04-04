/**
 * Test server setup file
 * Configures the environment for API tests
 */

// Mock executors before server loads
jest.mock('../../src/engine/executors', () => ({
  StartExecutor: class StartExecutor {
    async execute() { return { started: true }; }
  },
  EndExecutor: class EndExecutor {
    async execute() { return { ended: true }; }
  },
  TaskExecutor: class TaskExecutor {
    async execute() { return { result: 'task_completed' }; }
  },
  ConditionExecutor: class ConditionExecutor {
    async execute() { return { condition: true }; }
  },
  LoopExecutor: class LoopExecutor {
    async execute() { return { iterations: 0 }; }
  },
  ParallelExecutor: class ParallelExecutor {
    async execute() { return { branches: [] }; }
  },
  SubflowExecutor: class SubflowExecutor {
    async execute() { return { subflow: 'completed' }; }
  },
  DelayExecutor: class DelayExecutor {
    async execute() { return { delayed: true }; }
  },
  HttpExecutor: class HttpExecutor {
    async execute() { return { response: {} }; }
  },
  AiExecutor: class AiExecutor {
    async execute() { return { ai: 'generated' }; }
  },
  TransformExecutor: class TransformExecutor {
    async execute(node, execution, input) {
      return { transformed: input };
    }
  }
}));

// Set test environment
process.env.NODE_ENV = 'test';
