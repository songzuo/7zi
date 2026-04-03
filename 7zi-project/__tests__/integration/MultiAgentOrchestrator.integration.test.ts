/**
 * MultiAgentOrchestrator 集成测试
 * 
 * 测试场景：
 * 1. 完整工作流执行（动态分配 -> 并行执行 -> 结果聚合）
 * 2. 与真实 AgentRegistry 和 A2AProtocol 的交互
 * 3. 多智能体协作场景
 * 4. 负载均衡和故障转移
 * 5. 工作流依赖管理
 */

import { MultiAgentOrchestrator, Task, WorkflowStep, AggregatedResult } from '../../src/lib/multi-agent/MultiAgentOrchestrator';
import { AgentRegistry, Agent } from '../../src/lib/agents/AgentRegistry';
import { A2AProtocol, A2AMessage } from '../../src/lib/a2a/A2AProtocol';

describe('MultiAgentOrchestrator Integration Tests', () => {
  let orchestrator: MultiAgentOrchestrator;
  let registry: AgentRegistry;
  let a2aProtocol: A2AProtocol;

  // 模拟真实环境的智能体配置
  const testAgents: Agent[] = [
    {
      id: 'research-agent-1',
      name: 'Primary Researcher',
      capabilities: ['research', 'analysis', 'web-search'],
      status: 'online',
      currentLoad: 0.1,
      metadata: { model: 'gpt-4', priority: 'high' }
    },
    {
      id: 'research-agent-2',
      name: 'Secondary Researcher',
      capabilities: ['research', 'analysis'],
      status: 'online',
      currentLoad: 0.3,
      metadata: { model: 'gpt-3.5-turbo' }
    },
    {
      id: 'coder-agent-1',
      name: 'Code Generator',
      capabilities: ['coding', 'debugging', 'testing'],
      status: 'online',
      currentLoad: 0.2,
      metadata: { model: 'claude-2' }
    },
    {
      id: 'coder-agent-2',
      name: 'Code Reviewer',
      capabilities: ['coding', 'code-review'],
      status: 'online',
      currentLoad: 0.5,
      metadata: { model: 'gpt-4' }
    },
    {
      id: 'writer-agent',
      name: 'Content Writer',
      capabilities: ['writing', 'translation', 'summarization'],
      status: 'online',
      currentLoad: 0.15,
      metadata: { model: 'gpt-4' }
    },
    {
      id: 'analyst-agent',
      name: 'Data Analyst',
      capabilities: ['analysis', 'visualization', 'statistics'],
      status: 'busy',
      currentLoad: 0.85,
      metadata: { model: 'specialized-model' }
    }
  ];

  beforeEach(() => {
    registry = new AgentRegistry();
    a2aProtocol = new A2AProtocol();
    orchestrator = new MultiAgentOrchestrator(registry, a2aProtocol);

    // 注册所有测试智能体
    testAgents.forEach(agent => registry.register(agent));
  });

  afterEach(() => {
    registry.clear();
    a2aProtocol.cleanup();
  });

  // ==========================================================================
  // 场景 1: 完整研究工作流
  // ==========================================================================
  describe('Complete Research Workflow', () => {
    test('should execute complete research workflow with dynamic agent assignment', async () => {
      // 任务: 研究一个技术主题
      const researchTask: Task = {
        id: 'research-001',
        title: 'Research Quantum Computing Applications',
        requiredCapabilities: ['research', 'analysis'],
        payload: {
          topic: 'quantum computing',
          depth: 'comprehensive',
          timeframe: '2024'
        }
      };

      // 设置 A2A 协议的响应处理
      const mockResponses = new Map<string, unknown>([
        ['research-agent-1', { findings: 'Quantum computing breakthroughs in 2024...', sources: 15 }],
        ['research-agent-2', { findings: 'Key applications include cryptography...', sources: 10 }]
      ]);

      // 监听 A2A 请求并模拟响应
      let requestCount = 0;
      a2aProtocol.on('message:sent', async (message: A2AMessage) => {
        if (message.type === 'request') {
          requestCount++;
          const response = mockResponses.get(message.to);
          if (response) {
            // 模拟异步响应
            setTimeout(() => {
              const pending = (a2aProtocol as any).pendingRequests.get(message.id);
              if (pending) {
                clearTimeout(pending.timeout);
                (a2aProtocol as any).pendingRequests.delete(message.id);
                pending.resolve(response);
              }
            }, 50);
          }
        }
      });

      // 执行动态分配
      const result = await orchestrator.assignDynamically(researchTask);

      // 验证结果
      expect(result.taskId).toBe('research-001');
      expect(result.metadata.agentsUsed).toBe(1);
      expect(result.metadata.successCount).toBe(1);
      // 应该选择负载最低的研究智能体 (research-agent-1, load: 0.1)
      expect(result.results[0].agentId).toBe('research-agent-1');
    });

    test('should handle parallel research with result aggregation', async () => {
      const parallelTask: Task = {
        id: 'parallel-research-001',
        title: 'Multi-perspective Analysis',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'all',
        payload: { topic: 'AI trends 2024' }
      };

      // 获取具备研究能力的在线智能体
      const researchAgents = registry.filter({
        capabilities: ['research'],
        status: 'online'
      });

      // 设置并行响应
      const responses = [
        { perspective: 'technical', insights: ['LLM advances', 'Multimodal models'] },
        { perspective: 'business', insights: ['Enterprise adoption', 'Cost reduction'] }
      ];

      let responseIndex = 0;
      a2aProtocol.on('message:sent', (message: A2AMessage) => {
        if (message.type === 'request') {
          const response = responses[responseIndex++ % responses.length];
          setTimeout(() => {
            const pending = (a2aProtocol as any).pendingRequests.get(message.id);
            if (pending) {
              clearTimeout(pending.timeout);
              (a2aProtocol as any).pendingRequests.delete(message.id);
              pending.resolve(response);
            }
          }, 30);
        }
      });

      const result = await orchestrator.executeParallel(researchAgents, parallelTask);

      expect(result.taskId).toBe('parallel-research-001');
      expect(result.results.length).toBe(researchAgents.length);
      expect(Array.isArray(result.aggregated)).toBe(true);
      expect(result.metadata.duration).toBeLessThan(1000); // 应该很快完成
    });
  });

  // ==========================================================================
  // 场景 2: 串行工作流执行
  // ==========================================================================
  describe('Sequential Workflow Execution', () => {
    test('should execute multi-step workflow with dependencies', async () => {
      // 工作流: 研究 -> 分析 -> 编写报告
      const workflow: WorkflowStep[] = [
        {
          taskId: 'step-1-research',
          task: {
            id: 'step-1-research',
            title: 'Initial Research',
            requiredCapabilities: ['research'],
            payload: { query: 'market analysis' }
          }
        },
        {
          taskId: 'step-2-analysis',
          task: {
            id: 'step-2-analysis',
            title: 'Data Analysis',
            requiredCapabilities: ['analysis'],
            payload: { data: 'research results' }
          },
          dependsOn: ['step-1-research']
        },
        {
          taskId: 'step-3-report',
          task: {
            id: 'step-3-report',
            title: 'Write Report',
            requiredCapabilities: ['writing'],
            payload: { format: 'professional' }
          },
          dependsOn: ['step-2-analysis']
        }
      ];

      // 模拟每个步骤的响应
      const stepResponses: Record<string, unknown> = {
        'step-1-research': { data: 'research findings', sources: 20 },
        'step-2-analysis': { insights: 'key trends identified', confidence: 0.85 },
        'step-3-report': { document: 'final report content', pages: 5 }
      };

      a2aProtocol.on('message:sent', (message: A2AMessage) => {
        if (message.type === 'request') {
          const taskId = (message.payload as any)?.taskId;
          const response = stepResponses[taskId];
          setTimeout(() => {
            const pending = (a2aProtocol as any).pendingRequests.get(message.id);
            if (pending) {
              clearTimeout(pending.timeout);
              (a2aProtocol as any).pendingRequests.delete(message.id);
              pending.resolve(response || { success: true });
            }
          }, 20);
        }
      });

      const results = await orchestrator.executeSequential(workflow);

      // 验证所有步骤完成
      expect(results).toHaveLength(3);
      expect(results[0].taskId).toBe('step-1-research');
      expect(results[1].taskId).toBe('step-2-analysis');
      expect(results[2].taskId).toBe('step-3-report');

      // 验证每个步骤使用的智能体
      expect(results[0].results[0].agentId).toMatch(/research/);
      expect(results[1].results[0].agentId).toMatch(/research|analyst/);
      expect(results[2].results[0].agentId).toBe('writer-agent');
    });

    test('should fail workflow when dependency is not met', async () => {
      const invalidWorkflow: WorkflowStep[] = [
        {
          taskId: 'step-2',
          task: {
            id: 'step-2',
            title: 'Second Step',
            requiredCapabilities: ['research']
          },
          dependsOn: ['step-1'] // step-1 不存在
        }
      ];

      await expect(orchestrator.executeSequential(invalidWorkflow)).rejects.toThrow(
        'has unmet dependencies'
      );
    });
  });

  // ==========================================================================
  // 场景 3: 负载均衡和故障转移
  // ==========================================================================
  describe('Load Balancing and Failover', () => {
    test('should select agent with lowest load', async () => {
      const task: Task = {
        id: 'load-test',
        title: 'Load Balance Test',
        requiredCapabilities: ['coding']
      };

      a2aProtocol.on('message:sent', (message: A2AMessage) => {
        setTimeout(() => {
          const pending = (a2aProtocol as any).pendingRequests.get(message.id);
          if (pending) {
            clearTimeout(pending.timeout);
            (a2aProtocol as any).pendingRequests.delete(message.id);
            pending.resolve({ code: 'generated' });
          }
        }, 10);
      });

      const result = await orchestrator.assignDynamically(task);

      // coder-agent-1 负载最低 (0.2)，应该被选中
      expect(result.results[0].agentId).toBe('coder-agent-1');
    });

    test('should track and recover agent load after task completion', async () => {
      const initialLoad = registry.get('coder-agent-1')?.currentLoad || 0;

      a2aProtocol.on('message:sent', (message: A2AMessage) => {
        setTimeout(() => {
          const pending = (a2aProtocol as any).pendingRequests.get(message.id);
          if (pending) {
            clearTimeout(pending.timeout);
            (a2aProtocol as any).pendingRequests.delete(message.id);
            pending.resolve({ done: true });
          }
        }, 10);
      });

      const task: Task = {
        id: 'load-track-test',
        title: 'Load Tracking Test',
        requiredCapabilities: ['coding']
      };

      await orchestrator.assignDynamically(task);

      const finalLoad = registry.get('coder-agent-1')?.currentLoad || 0;

      // 负载应该恢复到初始值
      expect(finalLoad).toBeCloseTo(initialLoad, 1);
    });

    test('should skip busy agents', async () => {
      const task: Task = {
        id: 'skip-busy-test',
        title: 'Skip Busy Agent Test',
        requiredCapabilities: ['analysis']
      };

      a2aProtocol.on('message:sent', (message: A2AMessage) => {
        setTimeout(() => {
          const pending = (a2aProtocol as any).pendingRequests.get(message.id);
          if (pending) {
            clearTimeout(pending.timeout);
            (a2aProtocol as any).pendingRequests.delete(message.id);
            pending.resolve({ analysis: 'complete' });
          }
        }, 10);
      });

      const result = await orchestrator.assignDynamically(task);

      // analyst-agent 是 busy 状态，应该跳过
      // 应该选择 research-agent-1 或 research-agent-2
      expect(result.results[0].agentId).not.toBe('analyst-agent');
      expect(result.results[0].agentId).toMatch(/research/);
    });
  });

  // ==========================================================================
  // 场景 4: 错误处理和恢复
  // ==========================================================================
  describe('Error Handling and Recovery', () => {
    test('should handle agent timeout gracefully', async () => {
      const task: Task = {
        id: 'timeout-test',
        title: 'Timeout Test',
        requiredCapabilities: ['research'],
        timeout: 100 // 短超时
      };

      const researchAgents = registry.filter({
        capabilities: ['research'],
        status: 'online'
      });

      // 不设置响应，让请求超时
      const result = await orchestrator.executeParallel(researchAgents, task);

      expect(result.metadata.failureCount).toBe(researchAgents.length);
      expect(result.metadata.successCount).toBe(0);
    });

    test('should handle partial failures in parallel execution', async () => {
      const task: Task = {
        id: 'partial-failure-test',
        title: 'Partial Failure Test',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'first'
      };

      const researchAgents = registry.filter({
        capabilities: ['research'],
        status: 'online'
      });

      let callCount = 0;
      a2aProtocol.on('message:sent', (message: A2AMessage) => {
        callCount++;
        // 第一个成功，后续失败
        const shouldSucceed = callCount === 1;
        setTimeout(() => {
          const pending = (a2aProtocol as any).pendingRequests.get(message.id);
          if (pending) {
            clearTimeout(pending.timeout);
            (a2aProtocol as any).pendingRequests.delete(message.id);
            if (shouldSucceed) {
              pending.resolve({ success: true, data: 'result' });
            } else {
              pending.reject(new Error('Simulated failure'));
            }
          }
        }, 10);
      });

      const result = await orchestrator.executeParallel(researchAgents, task);

      // 使用 'first' 策略，应该能获得至少一个成功结果
      expect(result.metadata.successCount).toBeGreaterThanOrEqual(1);
      expect(result.aggregated).toBeDefined();
    });
  });

  // ==========================================================================
  // 场景 5: 聚合策略测试
  // ==========================================================================
  describe('Result Aggregation Strategies', () => {
    const setupResponses = (responses: unknown[]) => {
      let index = 0;
      a2aProtocol.on('message:sent', (message: A2AMessage) => {
        const response = responses[index++ % responses.length];
        setTimeout(() => {
          const pending = (a2aProtocol as any).pendingRequests.get(message.id);
          if (pending) {
            clearTimeout(pending.timeout);
            (a2aProtocol as any).pendingRequests.delete(message.id);
            pending.resolve(response);
          }
        }, 10);
      });
    };

    test('should aggregate with "first" strategy', async () => {
      const task: Task = {
        id: 'first-strategy',
        title: 'First Strategy Test',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'first'
      };

      setupResponses([
        { value: 'first result' },
        { value: 'second result' }
      ]);

      const agents = registry.filter({ capabilities: ['research'], status: 'online' });
      const result = await orchestrator.executeParallel(agents, task);

      expect(result.aggregated).toEqual({ value: 'first result' });
    });

    test('should aggregate with "all" strategy', async () => {
      const task: Task = {
        id: 'all-strategy',
        title: 'All Strategy Test',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'all'
      };

      setupResponses([
        { value: 'result 1' },
        { value: 'result 2' }
      ]);

      const agents = registry.filter({ capabilities: ['research'], status: 'online' });
      const result = await orchestrator.executeParallel(agents, task);

      expect(Array.isArray(result.aggregated)).toBe(true);
      expect(result.aggregated).toHaveLength(agents.length);
    });

    test('should aggregate with "vote" strategy', async () => {
      const task: Task = {
        id: 'vote-strategy',
        title: 'Vote Strategy Test',
        requiredCapabilities: ['research'],
        aggregationStrategy: 'vote'
      };

      // 大多数返回相同的值，应该投票选出
      setupResponses([
        { consensus: 'majority answer' },
        { consensus: 'majority answer' },
        { consensus: 'different answer' }
      ]);

      const agents = registry.filter({ capabilities: ['research'], status: 'online' });
      const result = await orchestrator.executeParallel(agents, task);

      // 投票应该选出多数结果
      expect((result.aggregated as any)?.consensus).toBe('majority answer');
    });
  });

  // ==========================================================================
  // 场景 6: 真实工作流模拟
  // ==========================================================================
  describe('Real-World Workflow Scenarios', () => {
    test('should handle software development workflow', async () => {
      // 模拟: 需求分析 -> 代码实现 -> 代码审查 -> 文档编写
      const devWorkflow: WorkflowStep[] = [
        {
          taskId: 'requirements',
          task: {
            id: 'requirements',
            title: 'Requirements Analysis',
            requiredCapabilities: ['analysis']
          }
        },
        {
          taskId: 'implementation',
          task: {
            id: 'implementation',
            title: 'Code Implementation',
            requiredCapabilities: ['coding']
          },
          dependsOn: ['requirements']
        },
        {
          taskId: 'review',
          task: {
            id: 'review',
            title: 'Code Review',
            requiredCapabilities: ['code-review']
          },
          dependsOn: ['implementation']
        },
        {
          taskId: 'documentation',
          task: {
            id: 'documentation',
            title: 'Write Documentation',
            requiredCapabilities: ['writing']
          },
          dependsOn: ['review']
        }
      ];

      const stepResults: Record<string, unknown> = {
        requirements: { features: ['auth', 'api', 'ui'], priorities: ['high', 'medium', 'low'] },
        implementation: { files: ['auth.ts', 'api.ts', 'ui.tsx'], linesOfCode: 1500 },
        review: { approved: true, comments: 5, suggestions: 3 },
        documentation: { readme: 'updated', apiDocs: 'generated' }
      };

      a2aProtocol.on('message:sent', (message: A2AMessage) => {
        const taskId = (message.payload as any)?.taskId;
        setTimeout(() => {
          const pending = (a2aProtocol as any).pendingRequests.get(message.id);
          if (pending) {
            clearTimeout(pending.timeout);
            (a2aProtocol as any).pendingRequests.delete(message.id);
            pending.resolve(stepResults[taskId] || { success: true });
          }
        }, 15);
      });

      const results = await orchestrator.executeSequential(devWorkflow);

      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result.metadata.successCount).toBe(1);
      });
    });

    test('should handle concurrent parallel tasks', async () => {
      // 并行执行多个独立任务
      const tasks: Task[] = [
        {
          id: 'task-a',
          title: 'Task A',
          requiredCapabilities: ['research'],
          aggregationStrategy: 'first'
        },
        {
          id: 'task-b',
          title: 'Task B',
          requiredCapabilities: ['coding'],
          aggregationStrategy: 'first'
        },
        {
          id: 'task-c',
          title: 'Task C',
          requiredCapabilities: ['writing'],
          aggregationStrategy: 'first'
        }
      ];

      a2aProtocol.on('message:sent', (message: A2AMessage) => {
        setTimeout(() => {
          const pending = (a2aProtocol as any).pendingRequests.get(message.id);
          if (pending) {
            clearTimeout(pending.timeout);
            (a2aProtocol as any).pendingRequests.delete(message.id);
            pending.resolve({ completed: true, taskId: (message.payload as any)?.taskId });
          }
        }, 10);
      });

      // 并行执行所有任务
      const executionPromises = tasks.map(task => orchestrator.assignDynamically(task));
      const results = await Promise.all(executionPromises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.metadata.successCount).toBe(1);
      });
    });
  });

  // ==========================================================================
  // 场景 7: 性能和边界条件
  // ==========================================================================
  describe('Performance and Edge Cases', () => {
    test('should handle large number of agents efficiently', async () => {
      // 注册大量智能体
      const largeAgentCount = 50;
      for (let i = 0; i < largeAgentCount; i++) {
        registry.register({
          id: `agent-${i}`,
          name: `Agent ${i}`,
          capabilities: ['research'],
          status: 'online',
          currentLoad: Math.random() * 0.5
        });
      }

      const task: Task = {
        id: 'large-scale-test',
        title: 'Large Scale Test',
        requiredCapabilities: ['research']
      };

      a2aProtocol.on('message:sent', (message: A2AMessage) => {
        setTimeout(() => {
          const pending = (a2aProtocol as any).pendingRequests.get(message.id);
          if (pending) {
            clearTimeout(pending.timeout);
            (a2aProtocol as any).pendingRequests.delete(message.id);
            pending.resolve({ data: 'result' });
          }
        }, 5);
      });

      const startTime = Date.now();
      const result = await orchestrator.assignDynamically(task);
      const duration = Date.now() - startTime;

      expect(result.metadata.successCount).toBe(1);
      expect(duration).toBeLessThan(1000); // 应该在 1 秒内完成
    });

    test('should handle workflow with many steps', async () => {
      // 创建多步骤工作流
      const steps: WorkflowStep[] = [];
      for (let i = 0; i < 10; i++) {
        steps.push({
          taskId: `step-${i}`,
          task: {
            id: `step-${i}`,
            title: `Step ${i}`,
            requiredCapabilities: ['research']
          },
          dependsOn: i > 0 ? [`step-${i - 1}`] : undefined
        });
      }

      a2aProtocol.on('message:sent', (message: A2AMessage) => {
        setTimeout(() => {
          const pending = (a2aProtocol as any).pendingRequests.get(message.id);
          if (pending) {
            clearTimeout(pending.timeout);
            (a2aProtocol as any).pendingRequests.delete(message.id);
            pending.resolve({ step: 'completed' });
          }
        }, 5);
      });

      const results = await orchestrator.executeSequential(steps);

      expect(results).toHaveLength(10);
    });

    test('should handle agent registry events', async () => {
      const registeredSpy = jest.fn();
      const statusChangedSpy = jest.fn();

      registry.on('agent:registered', registeredSpy);
      registry.on('agent:status:changed', statusChangedSpy);

      // 注册新智能体
      registry.register({
        id: 'new-agent',
        name: 'New Agent',
        capabilities: ['research'],
        status: 'online',
        currentLoad: 0
      });

      expect(registeredSpy).toHaveBeenCalled();

      // 更新状态
      registry.updateStatus('new-agent', 'busy');
      expect(statusChangedSpy).toHaveBeenCalled();
    });
  });
});
