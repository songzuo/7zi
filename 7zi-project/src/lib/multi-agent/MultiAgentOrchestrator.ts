/**
 * Multi-Agent Orchestrator - 多智能体协作编排器
 */

import { AgentRegistry, Agent } from '../agents/AgentRegistry';
import { A2AProtocol, A2AMessage } from '../a2a/A2AProtocol';

export interface Task {
  id: string;
  title: string;
  requiredCapabilities: string[];
  aggregationStrategy?: 'first' | 'all' | 'best' | 'vote' | 'custom';
  payload?: unknown;
  timeout?: number;
}

export interface WorkflowStep {
  taskId: string;
  task: Task;
  dependsOn?: string[]; // 依赖的任务ID
}

export interface AggregatedResult {
  taskId: string;
  results: Array<{ agentId: string; result: unknown }>;
  aggregated: unknown;
  metadata: {
    duration: number;
    agentsUsed: number;
    successCount: number;
    failureCount: number;
  };
}

export interface ExecutionOptions {
  timeout?: number;
  maxAgents?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export class MultiAgentOrchestrator {
  private agentRegistry: AgentRegistry;
  private a2aProtocol: A2AProtocol;

  constructor(agentRegistry?: AgentRegistry, a2aProtocol?: A2AProtocol) {
    this.agentRegistry = agentRegistry || new AgentRegistry();
    this.a2aProtocol = a2aProtocol || new A2AProtocol();
  }

  /**
   * 并行执行多个 Agent，汇总结果
   */
  async executeParallel(
    agents: Agent[],
    task: Task,
    options?: ExecutionOptions
  ): Promise<AggregatedResult> {
    const startTime = Date.now();
    const results: Array<{ agentId: string; result: unknown }> = [];
    let successCount = 0;
    let failureCount = 0;

    // 过滤在线且负载较低的智能体
    const availableAgents = agents.filter(
      a => a.status === 'online' && a.currentLoad < 0.9
    );

    if (availableAgents.length === 0) {
      throw new Error('No available agents for parallel execution');
    }

    // 限制最大并发数
    const maxAgents = options?.maxAgents || availableAgents.length;
    const agentsToExecute = availableAgents.slice(0, maxAgents);

    // 并行执行
    const promises = agentsToExecute.map(async (agent) => {
      try {
        const result = await this.executeAgentTask(agent, task, options);
        successCount++;
        return { agentId: agent.id, result };
      } catch (error) {
        failureCount++;
        return {
          agentId: agent.id,
          result: { error: error instanceof Error ? error.message : String(error) }
        };
      }
    });

    const executionResults = await Promise.all(promises);
    results.push(...executionResults);

    // 根据聚合策略汇总结果
    const aggregated = this.aggregateResults(task, results);

    const duration = Date.now() - startTime;

    return {
      taskId: task.id,
      results,
      aggregated,
      metadata: {
        duration,
        agentsUsed: agentsToExecute.length,
        successCount,
        failureCount
      }
    };
  }

  /**
   * 串行执行工作流步骤
   */
  async executeSequential(
    workflow: WorkflowStep[],
    options?: ExecutionOptions
  ): Promise<AggregatedResult[]> {
    const results: AggregatedResult[] = [];
    const completedTasks = new Set<string>();

    for (const step of workflow) {
      // 检查依赖是否完成
      if (step.dependsOn) {
        const missingDeps = step.dependsOn.filter(dep => !completedTasks.has(dep));
        if (missingDeps.length > 0) {
          throw new Error(
            `Task ${step.taskId} has unmet dependencies: ${missingDeps.join(', ')}`
          );
        }
      }

      // 动态分配任务
      const result = await this.assignDynamically(step.task, options);
      results.push(result);
      completedTasks.add(step.taskId);
    }

    return results;
  }

  /**
   * 基于能力和负载动态分配任务
   */
  async assignDynamically(
    task: Task,
    options?: ExecutionOptions
  ): Promise<AggregatedResult> {
    const startTime = Date.now();

    // 查找具备所需能力的智能体
    const capableAgents = this.agentRegistry.filter({
      capabilities: task.requiredCapabilities,
      status: 'online'
    });

    if (capableAgents.length === 0) {
      throw new Error(
        `No agents available with required capabilities: ${task.requiredCapabilities.join(', ')}`
      );
    }

    // 选择负载最低的智能体
    const bestAgent = capableAgents.reduce((best, current) =>
      current.currentLoad < best.currentLoad ? current : best
    );

    // 更新智能体负载
    this.agentRegistry.updateLoad(bestAgent.id, bestAgent.currentLoad + 0.3);

    try {
      const result = await this.executeAgentTask(bestAgent, task, options);

      // 恢复智能体负载
      this.agentRegistry.updateLoad(bestAgent.id, bestAgent.currentLoad - 0.3);

      const duration = Date.now() - startTime;

      return {
        taskId: task.id,
        results: [{ agentId: bestAgent.id, result }],
        aggregated: result,
        metadata: {
          duration,
          agentsUsed: 1,
          successCount: 1,
          failureCount: 0
        }
      };
    } catch (error) {
      // 恢复智能体负载
      this.agentRegistry.updateLoad(bestAgent.id, bestAgent.currentLoad - 0.3);

      const duration = Date.now() - startTime;

      return {
        taskId: task.id,
        results: [{
          agentId: bestAgent.id,
          result: { error: error instanceof Error ? error.message : String(error) }
        }],
        aggregated: null,
        metadata: {
          duration,
          agentsUsed: 1,
          successCount: 0,
          failureCount: 1
        }
      };
    }
  }

  /**
   * 执行单个智能体的任务
   */
  private async executeAgentTask(
    agent: Agent,
    task: Task,
    options?: ExecutionOptions
  ): Promise<unknown> {
    const timeout = options?.timeout || task.timeout || 30000;

    // 使用 A2A 协议发送任务
    const result = await this.a2aProtocol.request(
      'orchestrator',
      agent.id,
      {
        taskId: task.id,
        title: task.title,
        payload: task.payload
      },
      { timeout }
    );

    return result;
  }

  /**
   * 根据策略聚合结果
   */
  private aggregateResults(
    task: Task,
    results: Array<{ agentId: string; result: unknown }>
  ): unknown {
    const strategy = task.aggregationStrategy || 'first';

    switch (strategy) {
      case 'first':
        // 返回第一个成功的结果
        const firstSuccess = results.find(r => !(r.result as any)?.error);
        return firstSuccess?.result || null;

      case 'all':
        // 返回所有结果
        return results.map(r => r.result);

      case 'best':
        // 返回最佳结果（这里简化为第一个成功的结果）
        return results.find(r => !(r.result as any)?.error)?.result || null;

      case 'vote':
        // 投票策略（简化实现）
        const votes = new Map<string, number>();
        results.forEach(r => {
          const key = JSON.stringify(r.result);
          votes.set(key, (votes.get(key) || 0) + 1);
        });
        let maxVotes = 0;
        let bestResult: unknown = null;
        votes.forEach((count, key) => {
          if (count > maxVotes) {
            maxVotes = count;
            bestResult = JSON.parse(key);
          }
        });
        return bestResult;

      case 'custom':
        // 自定义聚合策略，需要用户提供聚合函数
        return results;

      default:
        return results[0]?.result || null;
    }
  }

  /**
   * 获取智能体注册表
   */
  getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }

  /**
   * 获取 A2A 协议实例
   */
  getA2AProtocol(): A2AProtocol {
    return this.a2aProtocol;
  }
}