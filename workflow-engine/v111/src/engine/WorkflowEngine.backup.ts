/**
 * OpenClaw Workflow Engine v1.11.0
 * Core Workflow Execution Engine
 */

import { v4 as uuidv4 } from 'uuid';
import { ILogger } from '../logging/Logger';
import { RedisStorage } from '../storage/RedisStorage';
import { QueueManager } from '../queue/QueueManager';
import {
  IWorkflow,
  IWorkflowNode,
  IWorkflowEdge,
  IExecution,
  INodeExecution,
  ICheckpoint,
  ExecutionStatus,
  NodeExecutionStatus,
  NodeType,
  TriggerType,
  ITriggerInfo,
  TaskPriority,
  IRetryPolicy,
  BackoffStrategy,
  IExecutionError,
  INodeConfig
} from '../types/workflow.types';

/**
 * 节点执行器接口
 */
export interface INodeExecutor {
  type: NodeType;
  execute(node: IWorkflowNode, context: IExecutionContext): Promise<any>;
  validate?(config: INodeConfig): Promise<boolean>;
}

/**
 * 执行上下文
 */
export interface IExecutionContext {
  workflow: IWorkflow;
  execution: IExecution;
  variables: Record<string, any>;
  logger: ILogger;
  storage: RedisStorage;
  queueManager: QueueManager;
}

/**
 * 工作流执行引擎
 */
export class WorkflowEngine {
  private logger: ILogger;
  private storage: RedisStorage;
  private queueManager: QueueManager;
  private executors: Map<NodeType, INodeExecutor>;
  private executions: Map<string, IExecution>;
  private readonly maxParallelTasks: number;
  private readonly checkpointInterval: number;
  private readonly maxCheckpointsPerExecution: number;
  private readonly executionCleanupDelay: number;
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  // 性能优化：缓存
  private workflowCache: Map<string, { workflow: IWorkflow; timestamp: number }>;
  private readonly workflowCacheTTL: number;
  private checkpointSaveQueue: Map<string, ICheckpoint>;
  private checkpointSaveTimer: NodeJS.Timeout | null = null;
  private readonly checkpointBatchSaveInterval: number;

  constructor(
    storage: RedisStorage,
    queueManager: QueueManager,
    logger: ILogger,
    options?: {
      maxParallelTasks?: number;
      checkpointInterval?: number;
      maxCheckpointsPerExecution?: number;
      executionCleanupDelay?: number;
      workflowCacheTTL?: number;
      checkpointBatchSaveInterval?: number;
    }
  ) {
    this.storage = storage;
    this.queueManager = queueManager;
    this.logger = logger;
    this.executors = new Map();
    this.executions = new Map();
    this.maxParallelTasks = options?.maxParallelTasks || 10;
    this.checkpointInterval = options?.checkpointInterval || 5000;
    this.maxCheckpointsPerExecution = options?.maxCheckpointsPerExecution || 50;
    this.executionCleanupDelay = options?.executionCleanupDelay || 300000; // 5 minutes
    
    // 性能优化配置
    this.workflowCache = new Map();
    this.workflowCacheTTL = options?.workflowCacheTTL || 60000; // 1 minute
    this.checkpointSaveQueue = new Map();
    this.checkpointBatchSaveInterval = options?.checkpointBatchSaveInterval || 2000; // 2 seconds
  }

  /**
   * 启动定期清理任务
   */
  startCleanupTask(): void {
    if (this.cleanupTimer) {
      this.logger.warn('Cleanup task already running');
      return;
    }

    // 每分钟检查一次需要清理的执行
    this.cleanupTimer = setInterval(async () => {
      await this.cleanupCompletedExecutions();
    }, 60000);

    this.logger.info('Execution cleanup task started');
  }

  /**
   * 停止定期清理任务
   */
  stopCleanupTask(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      this.logger.info('Execution cleanup task stopped');
    }
  }

  /**
   * 清理已完成的执行（从内存中移除）
   */
  private async cleanupCompletedExecutions(): Promise<void> {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [executionId, execution] of this.executions.entries()) {
      // 检查执行是否已完成超过 cleanupDelay 时间
      if (execution.status === ExecutionStatus.COMPLETED ||
          execution.status === ExecutionStatus.FAILED ||
          execution.status === ExecutionStatus.CANCELLED) {
        
        const endTime = execution.endTime?.getTime() || 0;
        if (now - endTime > this.executionCleanupDelay) {
          toRemove.push(executionId);
        }
      }
    }

    // 从内存中移除
    for (const executionId of toRemove) {
      this.executions.delete(executionId);
    }

    if (toRemove.length > 0) {
      this.logger.debug('Cleaned up completed executions', { count: toRemove.length });
    }
  }

  /**
   * 手动清理单个执行（从内存中移除）
   */
  cleanupExecution(executionId: string): void {
    this.executions.delete(executionId);
    this.logger.debug('Execution removed from memory', { executionId });
  }

  /**
   * 注册节点执行器
   */
  registerExecutor(executor: INodeExecutor): void {
    this.executors.set(executor.type, executor);
    this.logger.debug('Executor registered', { type: executor.type });
  }

  /**
   * 注册工作流
   */
  async registerWorkflow(workflow: IWorkflow): Promise<void> {
    await this.storage.saveWorkflow(workflow);
    this.logger.info('Workflow registered', { workflowId: workflow.id, name: workflow.name });
  }

  /**
   * 执行工作流
   */
  async execute(
    workflowId: string,
    variables: Record<string, any> = {},
    trigger: ITriggerInfo = { type: TriggerType.MANUAL }
  ): Promise<IExecution> {
    const workflow = await this.storage.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = uuidv4();
    const execution: IExecution = {
      id: executionId,
      workflowId,
      status: ExecutionStatus.PENDING,
      trigger,
      variables: { ...workflow.variables, ...variables },
      nodeExecutions: new Map(),
      startTime: new Date(),
      checkoints: [],
      priority: workflow.priority || TaskPriority.NORMAL
    };

    await this.storage.saveExecution(execution);
    this.executions.set(executionId, execution);

    // 添加到队列
    await this.queueManager.addWorkflowJob(workflowId, executionId, {
      trigger,
      variables
    });

    this.logger.info('Workflow execution initiated', {
      workflowId,
      executionId,
      trigger: trigger.type
    });

    return execution;
  }

  /**
   * 执行工作流（同步）
   */
  async executeSync(
    workflowId: string,
    variables: Record<string, any> = {},
    trigger: ITriggerInfo = { type: TriggerType.MANUAL }
  ): Promise<IExecution> {
    const workflow = await this.storage.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = uuidv4();
    const execution: IExecution = {
      id: executionId,
      workflowId,
      status: ExecutionStatus.RUNNING,
      trigger,
      variables: { ...workflow.variables, ...variables },
      nodeExecutions: new Map(),
      startTime: new Date(),
      checkoints: [],
      priority: workflow.priority || TaskPriority.NORMAL
    };

    await this.storage.saveExecution(execution);
    this.executions.set(executionId, execution);

    try {
      this.logger.info('Starting workflow execution', { workflowId, executionId });

      // 构建执行图
      const graph = this.buildExecutionGraph(workflow);
      
      // 执行工作流
      await this.executeGraph(workflow, execution, graph);

      execution.status = ExecutionStatus.COMPLETED;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();

    } catch (error) {
      execution.status = ExecutionStatus.FAILED;
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.error = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date()
      };
      
      this.logger.error('Workflow execution failed', {
        workflowId,
        executionId,
        error: execution.error.message
      });
    }

    await this.storage.saveExecution(execution);
    return execution;
  }

  /**
   * 构建执行图（DAG）
   */
  private buildExecutionGraph(workflow: IWorkflow): Map<string, string[]> {
    const graph = new Map<string, string[]>();
    
    // 初始化所有节点的依赖关系
    for (const node of workflow.nodes) {
      graph.set(node.id, []);
    }

    // 根据边构建依赖关系
    for (const edge of workflow.edges) {
      const dependencies = graph.get(edge.target) || [];
      dependencies.push(edge.source);
      graph.set(edge.target, dependencies);
    }

    return graph;
  }

  /**
   * 执行 DAG 图
   */
  private async executeGraph(
    workflow: IWorkflow,
    execution: IExecution,
    graph: Map<string, string[]>
  ): Promise<void> {
    const completed = new Set<string>();
    const inProgress = new Set<string>();
    const pending = new Set(workflow.nodes.map(n => n.id));
    const nodeMap = new Map(workflow.nodes.map(n => [n.id, n]));

    // 查找起始节点（没有依赖的节点）
    const startNodes = Array.from(graph.entries())
      .filter(([_, deps]) => deps.length === 0)
      .map(([id]) => id);

    if (startNodes.length === 0) {
      throw new Error('No start node found in workflow');
    }

    // 执行循环
    while (pending.size > 0 || inProgress.size > 0) {
      // 找到可以执行的节点
      const readyNodes = this.findReadyNodes(graph, completed, inProgress, pending);

      if (readyNodes.length === 0 && inProgress.size === 0) {
        // 没有可执行的节点，且没有正在执行的节点 - 可能是循环依赖
        throw new Error('Circular dependency detected in workflow');
      }

      // 并行执行就绪的节点（受 maxParallelTasks 限制）
      const tasks: Promise<void>[] = [];
      const availableSlots = this.maxParallelTasks - inProgress.size;
      const nodesToExecute = readyNodes.slice(0, availableSlots);

      for (const nodeId of nodesToExecute) {
        inProgress.add(nodeId);
        pending.delete(nodeId);

        const node = nodeMap.get(nodeId);
        if (node) {
          tasks.push(this.executeNode(workflow, execution, node));
        }
      }

      // 等待所有任务完成
      await Promise.all(tasks);

      // 更新已完成节点
      for (const nodeId of nodesToExecute) {
        inProgress.delete(nodeId);
        completed.add(nodeId);
      }

      // 创建检查点
      await this.createCheckpoint(execution);
    }
  }

  /**
   * 查找就绪的节点
   */
  private findReadyNodes(
    graph: Map<string, string[]>,
    completed: Set<string>,
    inProgress: Set<string>,
    pending: Set<string>
  ): string[] {
    const ready: string[] = [];

    for (const nodeId of pending) {
      if (inProgress.has(nodeId)) continue;

      const dependencies = graph.get(nodeId) || [];
      const allDependenciesMet = dependencies.every(dep => completed.has(dep));

      if (allDependenciesMet) {
        ready.push(nodeId);
      }
    }

    return ready;
  }

  /**
   * 执行单个节点
   */
  private async executeNode(
    workflow: IWorkflow,
    execution: IExecution,
    node: IWorkflowNode
  ): Promise<void> {
    const nodeExecution: INodeExecution = {
      nodeId: node.id,
      status: NodeExecutionStatus.RUNNING,
      startTime: new Date(),
      attempts: 1,
      retries: 0
    };

    execution.nodeExecutions.set(node.id, nodeExecution);

    try {
      this.logger.debug('Executing node', { nodeId: node.id, type: node.type });

      // 获取执行器
      const executor = this.executors.get(node.type);
      if (!executor) {
        throw new Error(`No executor found for node type: ${node.type}`);
      }

      // 执行节点
      const context: IExecutionContext = {
        workflow,
        execution,
        variables: execution.variables,
        logger: this.logger,
        storage: this.storage,
        queueManager: this.queueManager
      };

      const output = await this.executeWithRetry(executor, node, context);

      // 更新执行状态
      nodeExecution.status = NodeExecutionStatus.COMPLETED;
      nodeExecution.endTime = new Date();
      nodeExecution.duration = nodeExecution.endTime.getTime() - nodeExecution.startTime.getTime();
      nodeExecution.output = output;

      // 更新变量
      if (output && typeof output === 'object') {
        execution.variables = { ...execution.variables, ...output };
      }

      this.logger.debug('Node execution completed', { nodeId: node.id });

    } catch (error) {
      // 处理错误
      if (node.onError) {
        await this.handleError(workflow, execution, node, error);
      } else {
        nodeExecution.status = NodeExecutionStatus.FAILED;
        nodeExecution.error = {
          code: 'NODE_ERROR',
          message: error instanceof Error ? error.message : String(error),
          nodeId: node.id,
          timestamp: new Date()
        };
        
        throw error;
      }
    }
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry(
    executor: INodeExecutor,
    node: IWorkflowNode,
    context: IExecutionContext
  ): Promise<any> {
    const retryPolicy = node.retryPolicy || context.workflow.retryPolicy;
    const maxAttempts = retryPolicy?.maxAttempts || 1;
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt < maxAttempts) {
      try {
        // 检查超时
        if (node.timeout) {
          return await this.executeWithTimeout(executor, node, context, node.timeout);
        }
        
        return await executor.execute(node, context);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        if (attempt >= maxAttempts) {
          break;
        }

        // 计算延迟
        const delay = this.calculateBackoffDelay(retryPolicy, attempt);
        await this.sleep(delay);

        context.logger.warn('Retrying node execution', {
          nodeId: node.id,
          attempt,
          delay
        });
      }
    }

    throw lastError;
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout(
    executor: INodeExecutor,
    node: IWorkflowNode,
    context: IExecutionContext,
    timeoutMs: number
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Node execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      executor.execute(node, context)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 计算退避延迟
   */
  private calculateBackoffDelay(retryPolicy: IRetryPolicy | undefined, attempt: number): number {
    if (!retryPolicy) return 1000;

    const { backoffStrategy = BackoffStrategy.EXPONENTIAL, initialDelay = 1000, maxDelay = 30000 } = retryPolicy;

    let delay: number;
    switch (backoffStrategy) {
      case BackoffStrategy.FIXED:
        delay = initialDelay;
        break;
      case BackoffStrategy.LINEAR:
        delay = initialDelay * attempt;
        break;
      case BackoffStrategy.EXPONENTIAL:
      default:
        delay = initialDelay * Math.pow(2, attempt - 1);
        break;
    }

    return Math.min(delay, maxDelay);
  }

  /**
   * 处理错误
   */
  private async handleError(
    workflow: IWorkflow,
    execution: IExecution,
    node: IWorkflowNode,
    error: any
  ): Promise<void> {
    if (!node.onError) return;

    const nodeExecution = execution.nodeExecutions.get(node.id);
    
    switch (node.onError.strategy) {
      case 'skip':
        if (nodeExecution) {
          nodeExecution.status = NodeExecutionStatus.SKIPPED;
        }
        this.logger.warn('Node skipped due to error', { nodeId: node.id, error: error.message });
        break;

      case 'fallback':
        if (node.onError.fallbackNode && nodeExecution) {
          this.logger.info('Executing fallback node', { 
            nodeId: node.id, 
            fallback: node.onError.fallbackNode 
          });
          // 执行回退节点（这里简化处理，实际需要完整的节点执行逻辑）
        }
        break;

      case 'abort':
      default:
        throw error;
    }
  }

  /**
   * 创建检查点
   */
  private async createCheckpoint(execution: IExecution): Promise<void> {
    const checkpoint: ICheckpoint = {
      id: uuidv4(),
      executionId: execution.id,
      timestamp: new Date(),
      nodeId: '',
      nodeStatus: NodeExecutionStatus.COMPLETED,
      variables: { ...execution.variables },
      nodeExecutions: new Map(execution.nodeExecutions)
    };

    execution.checkoints.push(checkpoint);
    
    // LRU 缓存限制：移除旧的检查点
    if (execution.checkoints.length > this.maxCheckpointsPerExecution) {
      const removedCount = execution.checkoints.length - this.maxCheckpointsPerExecution;
      execution.checkoints = execution.checkoints.slice(-this.maxCheckpointsPerExecution);
      
      this.logger.debug('Removed old checkpoints to maintain LRU limit', {
        executionId: execution.id,
        removedCount,
        remainingCount: execution.checkoints.length
      });
    }
    
    await this.storage.saveCheckpoint(checkpoint);

    this.logger.debug('Checkpoint created', { 
      executionId: execution.id, 
      checkpointId: checkpoint.id,
      totalCheckpoints: execution.checkoints.length
    });
  }

  /**
   * 暂停执行
   */
  async pauseExecution(executionId: string): Promise<IExecution> {
    const execution = await this.storage.getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.status !== ExecutionStatus.RUNNING) {
      throw new Error(`Cannot pause execution in status: ${execution.status}`);
    }

    execution.status = ExecutionStatus.PAUSED;
    await this.storage.saveExecution(execution);

    this.logger.info('Execution paused', { executionId });
    return execution;
  }

  /**
   * 从检查点恢复执行
   */
  async resumeFromCheckpoint(checkpointId: string): Promise<IExecution> {
    const checkpoint = await this.storage.getCheckpoint(checkpointId);
    if (!checkpoint) {
      throw new Error(`Checkpoint not found: ${checkpointId}`);
    }

    const execution = await this.storage.getExecution(checkpoint.executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${checkpoint.executionId}`);
    }

    // 恢复状态
    execution.status = ExecutionStatus.RUNNING;
    execution.variables = checkpoint.variables;
    execution.nodeExecutions = checkpoint.nodeExecutions;

    await this.storage.saveExecution(execution);

    this.logger.info('Execution resumed from checkpoint', {
      executionId: execution.id,
      checkpointId
    });

    return execution;
  }

  /**
   * 取消执行
   */
  async cancelExecution(executionId: string): Promise<IExecution> {
    const execution = await this.storage.getExecution(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    execution.status = ExecutionStatus.CANCELLED;
    execution.endTime = new Date();
    
    await this.storage.saveExecution(execution);

    this.logger.info('Execution cancelled', { executionId });
    return execution;
  }

  /**
   * 获取执行状态
   */
  async getExecution(executionId: string): Promise<IExecution | null> {
    return await this.storage.getExecution(executionId);
  }

  /**
   * 获取所有执行
   */
  async getAllExecutions(): Promise<IExecution[]> {
    return await this.storage.getAllExecutions();
  }

  /**
   * 关闭引擎，清理资源
   */
  async shutdown(): Promise<void> {
    this.stopCleanupTask();
    
    // 清空内存中的执行记录
    this.executions.clear();
    
    this.logger.info('Workflow engine shutdown completed');
  }

  /**
   * 工具方法
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}