/**
 * Visual Workflow Orchestrator
 * 可视化工作流编排器 - 核心实现
 * 
 * 支持:
 * - 节点类型: task, condition, parallel, merge
 * - 状态管理: pending, running, completed, failed
 * - 异步执行引擎
 * - 完整的生命周期管理
 */

import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  NodeStatus,
  InstanceStatus,
  WorkflowInstance,
  NodeExecutionResult,
} from "@/types/workflow";

/**
 * 节点状态
 */
export type OrchestratorNodeState = 
  | "pending"    // 待执行
  | "running"    // 运行中
  | "completed"  // 已完成
  | "failed"     // 失败
  | "skipped";   // 跳过

/**
 * 执行结果
 */
export interface OrchestratorExecutionResult {
  success: boolean;
  nodeId: string;
  output?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  duration: number;
  logs: Array<{
    level: "info" | "warn" | "error";
    message: string;
    timestamp: string;
  }>;
}

/**
 * 节点执行器接口
 */
export interface NodeExecutorHandler {
  /**
   * 执行节点
   */
  execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<OrchestratorExecutionResult>;

  /**
   * 验证节点配置
   */
  validate(node: WorkflowNode): { valid: boolean; errors: string[] };
}

/**
 * 执行上下文
 */
export interface ExecutionContext {
  instanceId: string;
  workflowId: string;
  variables: Record<string, unknown>;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  parentResult?: unknown;
  logs: Array<{
    level: "info" | "warn" | "error";
    message: string;
    timestamp: string;
  }>;
}

/**
 * 工作流执行事件
 */
export interface WorkflowExecutionEvent {
  type: "node_started" | "node_completed" | "node_failed" | "workflow_completed" | "workflow_failed";
  timestamp: string;
  nodeId?: string;
  instanceId: string;
  data?: unknown;
}

/**
 * 事件监听器类型
 */
export type EventListener = (event: WorkflowExecutionEvent) => void;

/**
 * Visual Workflow Orchestrator 配置
 */
export interface OrchestratorConfig {
  /** 全局超时时间（毫秒） */
  globalTimeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试间隔（毫秒） */
  retryInterval?: number;
  /** 是否启用日志 */
  enableLogs?: boolean;
  /** 并行执行最大数量 */
  maxParallelism?: number;
}

/**
 * 工作流节点状态映射
 */
export interface NodeStateMap {
  [nodeId: string]: OrchestratorNodeState;
}

/**
 * Visual Workflow Orchestrator
 * 可视化工作流编排器核心类
 */
export class VisualWorkflowOrchestrator {
  private instances: Map<string, WorkflowInstance> = new Map();
  private nodeStates: Map<string, NodeStateMap> = new Map();
  private executorHandlers: Map<NodeType, NodeExecutorHandler> = new Map();
  private eventListeners: Set<EventListener> = new Set();
  private config: OrchestratorConfig;

  // 默认配置
  private static defaultConfig: OrchestratorConfig = {
    globalTimeout: 3600000, // 1小时
    maxRetries: 3,
    retryInterval: 1000,
    enableLogs: true,
    maxParallelism: 5,
  };

  constructor(config: OrchestratorConfig = {}) {
    this.config = { ...VisualWorkflowOrchestrator.defaultConfig, ...config };
    this.registerDefaultExecutors();
  }

  /**
   * 注册默认执行器
   */
  private registerDefaultExecutors(): void {
    // Start 节点执行器
    this.registerExecutor(NodeType.START, {
      execute: async (node, context) => {
        const startTime = Date.now();
        this.addLog(context, "info", `Starting workflow: ${node.name}`);
        
        return {
          success: true,
          nodeId: node.id,
          output: { message: "Workflow started" },
          duration: Date.now() - startTime,
          logs: context.logs,
        };
      },
      validate: () => ({
        valid: true,
        errors: [],
      }),
    });

    // End 节点执行器
    this.registerExecutor(NodeType.END, {
      execute: async (node, context) => {
        const startTime = Date.now();
        this.addLog(context, "info", `Ending workflow: ${node.name}`);
        
        return {
          success: true,
          nodeId: node.id,
          output: { message: "Workflow completed" },
          duration: Date.now() - startTime,
          logs: context.logs,
        };
      },
      validate: () => ({
        valid: true,
        errors: [],
      }),
    });

    // Task 节点执行器
    this.registerExecutor(NodeType.AGENT, {
      execute: async (node, context) => {
        const startTime = Date.now();
        this.addLog(context, "info", `Executing task node: ${node.name}`);
        
        // 模拟任务执行
        await this.delay(100);
        
        return {
          success: true,
          nodeId: node.id,
          output: {
            result: "Task completed",
            data: context.inputs,
          },
          duration: Date.now() - startTime,
          logs: context.logs,
        };
      },
      validate: (node) => ({
        valid: true,
        errors: [],
      }),
    });

    // Condition 节点执行器
    this.registerExecutor(NodeType.CONDITION, {
      execute: async (node, context) => {
        const startTime = Date.now();
        this.addLog(context, "info", `Evaluating condition: ${node.name}`);
        
        const condition = node.conditionConfig?.expression || "true";
        const result = this.evaluateCondition(condition, context);
        
        return {
          success: true,
          nodeId: node.id,
          output: {
            condition: result,
            branch: result ? (node.conditionConfig?.trueLabel || "true") : (node.conditionConfig?.falseLabel || "false"),
          },
          duration: Date.now() - startTime,
          logs: context.logs,
        };
      },
      validate: (node) => ({
        valid: !!node.conditionConfig?.expression,
        errors: node.conditionConfig?.expression ? [] : ["Condition expression is required"],
      }),
    });

    // Parallel 节点执行器
    this.registerExecutor(NodeType.PARALLEL, {
      execute: async (node, context) => {
        const startTime = Date.now();
        this.addLog(context, "info", `Starting parallel execution: ${node.name}`);
        
        // 模拟并行执行
        await this.delay(50);
        
        return {
          success: true,
          nodeId: node.id,
          output: { parallel: true },
          duration: Date.now() - startTime,
          logs: context.logs,
        };
      },
      validate: (node) => ({
        valid: true,
        errors: [],
      }),
    });

    // Wait 节点执行器
    this.registerExecutor(NodeType.WAIT, {
      execute: async (node, context) => {
        const startTime = Date.now();
        const duration = (node.waitConfig?.duration || 1) * 1000;
        
        this.addLog(context, "info", `Waiting for ${node.waitConfig?.duration} seconds`);
        await this.delay(duration);
        
        return {
          success: true,
          nodeId: node.id,
          output: { waited: duration },
          duration: Date.now() - startTime,
          logs: context.logs,
        };
      },
      validate: (node) => ({
        valid: !!node.waitConfig?.duration,
        errors: node.waitConfig?.duration ? [] : ["Wait duration is required"],
      }),
    });
  }

  /**
   * 注册节点执行器
   */
  registerExecutor(type: NodeType, handler: NodeExecutorHandler): void {
    this.executorHandlers.set(type, handler);
  }

  /**
   * 注册事件监听器
   */
  addEventListener(listener: EventListener): void {
    this.eventListeners.add(listener);
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: EventListener): void {
    this.eventListeners.delete(listener);
  }

  /**
   * 触发事件
   */
  private emitEvent(event: WorkflowExecutionEvent): void {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        console.error("Event listener error:", error);
      }
    });
  }

  /**
   * 添加日志
   */
  private addLog(
    context: ExecutionContext,
    level: "info" | "warn" | "error",
    message: string
  ): void {
    if (this.config.enableLogs) {
      context.logs.push({
        level,
        message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 评估条件
   */
  private evaluateCondition(condition: string, context: ExecutionContext): boolean {
    try {
      // 简单的条件评估（实际应该使用安全的表达式解析器）
      // 支持变量引用: {{variable_name}}
      let evalCondition = condition;
      
      // 替换变量
      Object.keys(context.variables).forEach((key) => {
        evalCondition = evalCondition.replace(
          new RegExp(`{{${key}}}`, "g"),
          String(context.variables[key])
        );
      });

      // 处理简单条件
      if (evalCondition === "true") return true;
      if (evalCondition === "false") return false;
      
      // 尝试求值
      return new Function(`return ${evalCondition}`)();
    } catch {
      return false;
    }
  }

  /**
   * 延迟辅助函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 创建工作流实例
   */
  createInstance(
    workflow: WorkflowDefinition,
    inputs: Record<string, unknown> = {}
  ): WorkflowInstance {
    const instanceId = `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const instance: WorkflowInstance = {
      id: instanceId,
      workflowId: workflow.id,
      workflowVersion: workflow.version,
      status: InstanceStatus.PENDING,
      progress: {
        total: workflow.nodes.length,
        completed: 0,
        failed: 0,
        percentage: 0,
      },
      nodeResults: new Map(),
      data: {
        inputs,
        outputs: {},
        variables: { ...workflow.config.variables },
      },
      metadata: {
        startedAt: new Date().toISOString(),
        triggeredBy: "system",
        triggerType: "manual",
      },
    };

    // 初始化所有节点状态
    const states: NodeStateMap = {};
    workflow.nodes.forEach((node) => {
      states[node.id] = "pending";
      instance.nodeResults.set(node.id, {
        nodeId: node.id,
        status: NodeStatus.IDLE,
        startTime: new Date().toISOString(),
      });
    });

    this.instances.set(instanceId, instance);
    this.nodeStates.set(instanceId, states);

    return instance;
  }

  /**
   * 验证工作流
   */
  validateWorkflow(workflow: WorkflowDefinition): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查节点
    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push("Workflow must contain at least one node");
    }

    // 检查开始和结束节点
    const startNodes = workflow.nodes.filter((n) => n.type === NodeType.START);
    const endNodes = workflow.nodes.filter((n) => n.type === NodeType.END);

    if (startNodes.length === 0) {
      errors.push("Workflow must have a start node");
    } else if (startNodes.length > 1) {
      warnings.push("Workflow has multiple start nodes");
    }

    if (endNodes.length === 0) {
      errors.push("Workflow must have an end node");
    }

    // 检查节点ID唯一性
    const nodeIds = new Set<string>();
    workflow.nodes.forEach((node) => {
      if (nodeIds.has(node.id)) {
        errors.push(`Duplicate node ID: ${node.id}`);
      }
      nodeIds.add(node.id);
    });

    // 检查边
    workflow.edges.forEach((edge) => {
      if (!nodeIds.has(edge.source)) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }
    });

    // 检查孤立节点
    const connectedNodes = new Set<string>();
    workflow.edges.forEach((edge) => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    workflow.nodes.forEach((node) => {
      if (
        node.type !== NodeType.START &&
        node.type !== NodeType.END &&
        !connectedNodes.has(node.id)
      ) {
        warnings.push(`Isolated node: ${node.id} (no connections)`);
      }
    });

    // 验证节点配置
    workflow.nodes.forEach((node) => {
      const executor = this.executorHandlers.get(node.type);
      if (executor) {
        const validation = executor.validate(node);
        errors.push(...validation.errors.map((e) => `Node ${node.id}: ${e}`));
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 执行工作流
   */
  async execute(workflow: WorkflowDefinition, inputs: Record<string, unknown> = {}): Promise<WorkflowInstance> {
    // 验证工作流
    const validation = this.validateWorkflow(workflow);
    if (!validation.valid) {
      throw new Error(`Workflow validation failed: ${validation.errors.join(", ")}`);
    }

    // 创建实例
    const instance = this.createInstance(workflow, inputs);
    instance.status = InstanceStatus.RUNNING;

    // 获取开始节点
    const startNode = workflow.nodes.find((n) => n.type === NodeType.START);
    if (!startNode) {
      throw new Error("No start node found");
    }

    try {
      // 执行工作流
      await this.executeNode(workflow, startNode, instance);

      // 完成
      instance.status = InstanceStatus.COMPLETED;
      instance.metadata.endedAt = new Date().toISOString();
      instance.metadata.duration =
        new Date(instance.metadata.endedAt).getTime() -
        new Date(instance.metadata.startedAt).getTime();

      this.emitEvent({
        type: "workflow_completed",
        timestamp: new Date().toISOString(),
        instanceId: instance.id,
        data: { duration: instance.metadata.duration },
      });
    } catch (error) {
      instance.status = InstanceStatus.FAILED;
      instance.error = {
        nodeId: "unknown",
        code: "EXECUTION_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      };
      instance.metadata.endedAt = new Date().toISOString();

      this.emitEvent({
        type: "workflow_failed",
        timestamp: new Date().toISOString(),
        instanceId: instance.id,
        data: { error: instance.error },
      });

      throw error;
    }

    return instance;
  }

  /**
   * 执行单个节点
   */
  private async executeNode(
    workflow: WorkflowDefinition,
    node: WorkflowNode,
    instance: WorkflowInstance
  ): Promise<void> {
    const states = this.nodeStates.get(instance.id)!;
    
    // 检查节点状态
    if (states[node.id] === "completed") {
      return; // 节点已执行
    }

    // 更新状态为运行中
    states[node.id] = "running";
    instance.nodeResults.get(node.id)!.status = NodeStatus.RUNNING;

    this.emitEvent({
      type: "node_started",
      timestamp: new Date().toISOString(),
      nodeId: node.id,
      instanceId: instance.id,
    });

    // 获取执行器
    const executor = this.executorHandlers.get(node.type);
    if (!executor) {
      throw new Error(`No executor found for node type: ${node.type}`);
    }

    // 创建执行上下文
    const context: ExecutionContext = {
      instanceId: instance.id,
      workflowId: workflow.id,
      variables: instance.data.variables || {},
      inputs: instance.data.inputs || {},
      outputs: {},
      logs: [],
    };

    try {
      // 执行节点
      const result = await executor.execute(node, context);

      // 更新结果
      const nodeResult = instance.nodeResults.get(node.id)!;
      nodeResult.status = result.success ? NodeStatus.SUCCESS : NodeStatus.FAILED;
      nodeResult.endTime = new Date().toISOString();
      nodeResult.duration = result.duration;
      nodeResult.output = result.output;
      nodeResult.logs = result.logs;

      // 更新状态
      if (result.success) {
        states[node.id] = "completed";
        instance.progress.completed++;
      } else {
        states[node.id] = "failed";
        instance.progress.failed++;
      }

      // 更新进度
      instance.progress.percentage = Math.round(
        (instance.progress.completed / instance.progress.total) * 100
      );

      this.emitEvent({
        type: result.success ? "node_completed" : "node_failed",
        timestamp: new Date().toISOString(),
        nodeId: node.id,
        instanceId: instance.id,
        data: result,
      });

      // 如果节点失败，抛出错误
      if (!result.success) {
        throw new Error(result.error?.message || "Node execution failed");
      }

      // 获取下一个节点
      const nextNodes = this.getNextNodes(workflow, node, result.output);

      // 根据节点类型执行下一个节点
      if (node.type === NodeType.CONDITION) {
        // 条件节点：执行条件分支
        const branch = result.output?.branch as string;
        const nextNode = nextNodes.find((n) => {
          const edge = workflow.edges.find(
            (e) => e.source === node.id && e.target === n.id
          );
          return edge?.conditionConfig?.label === branch;
        });
        
        if (nextNode) {
          await this.executeNode(workflow, nextNode, instance);
        }
      } else if (node.type === NodeType.PARALLEL) {
        // 并行节点：并行执行所有分支
        await Promise.all(
          nextNodes.map((nextNode) =>
            this.executeNode(workflow, nextNode, instance)
          )
        );
      } else {
        // 顺序执行
        for (const nextNode of nextNodes) {
          await this.executeNode(workflow, nextNode, instance);
        }
      }
    } catch (error) {
      states[node.id] = "failed";
      instance.progress.failed++;
      
      const nodeResult = instance.nodeResults.get(node.id)!;
      nodeResult.status = NodeStatus.FAILED;
      nodeResult.endTime = new Date().toISOString();
      nodeResult.error = {
        code: "NODE_FAILED",
        message: error instanceof Error ? error.message : "Unknown error",
      };

      throw error;
    }
  }

  /**
   * 获取下一个节点
   */
  private getNextNodes(
    workflow: WorkflowDefinition,
    currentNode: WorkflowNode,
    output?: Record<string, unknown>
  ): WorkflowNode[] {
    const edges = workflow.edges.filter((e) => e.source === currentNode.id);
    return edges
      .map((edge) => workflow.nodes.find((n) => n.id === edge.target))
      .filter((n): n is WorkflowNode => n !== undefined);
  }

  /**
   * 获取实例
   */
  getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * 获取节点状态
   */
  getNodeState(instanceId: string, nodeId: string): OrchestratorNodeState | undefined {
    return this.nodeStates.get(instanceId)?.[nodeId];
  }

  /**
   * 获取所有实例
   */
  getAllInstances(): WorkflowInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * 取消执行
   */
  cancel(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance && instance.status === InstanceStatus.RUNNING) {
      instance.status = InstanceStatus.CANCELLED;
      instance.metadata.endedAt = new Date().toISOString();
    }
  }

  /**
   * 暂停执行
   */
  pause(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance && instance.status === InstanceStatus.RUNNING) {
      instance.status = InstanceStatus.PENDING;
    }
  }

  /**
   * 恢复执行
   */
  resume(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance && instance.status === InstanceStatus.PENDING) {
      instance.status = InstanceStatus.RUNNING;
    }
  }

  /**
   * 获取统计信息
   */
  getStatistics(workflowId: string): {
    totalInstances: number;
    completed: number;
    failed: number;
    cancelled: number;
    avgDuration: number;
  } {
    const instances = this.getAllInstances().filter(
      (i) => i.workflowId === workflowId
    );

    return {
      totalInstances: instances.length,
      completed: instances.filter((i) => i.status === InstanceStatus.COMPLETED).length,
      failed: instances.filter((i) => i.status === InstanceStatus.FAILED).length,
      cancelled: instances.filter((i) => i.status === InstanceStatus.CANCELLED).length,
      avgDuration:
        instances.length > 0
          ? instances.reduce((sum, i) => sum + (i.metadata.duration || 0), 0) /
            instances.length
          : 0,
    };
  }
}

// 导出单例
export const visualWorkflowOrchestrator = new VisualWorkflowOrchestrator();

// 导出类型
export type { WorkflowNode, WorkflowEdge, WorkflowDefinition };
