/**
 * 工作流执行器类型定义
 */

import {
  WorkflowNode,
  NodeStatus,
} from "@/types/workflow";

/**
 * 执行上下文
 */
export interface ExecutionContext {
  instanceId: string;
  workflowId: string;
  node: WorkflowNode;
  variables: Record<string, unknown>;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  logs: LogEntry[];
}

/**
 * 日志条目
 */
export interface LogEntry {
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
}

/**
 * 执行错误
 */
export interface ExecutionError {
  nodeId: string;
  code: string;
  message: string;
  stack?: string;
  retryable?: boolean;
}

/**
 * 执行指标
 */
export interface ExecutionMetrics {
  cpuTime?: number;
  memoryUsage?: number;
  networkCalls?: number;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  status: NodeStatus;
  output?: Record<string, unknown>;
  error?: ExecutionError;
  logs: LogEntry[];
  metrics?: ExecutionMetrics;
}

/**
 * 节点执行器接口
 */
export interface NodeExecutor {
  /**
   * 检查是否能处理指定节点类型
   */
  canHandle(nodeType: string): boolean;

  /**
   * 验证节点配置
   */
  validate(node: WorkflowNode): { valid: boolean; errors: string[] };

  /**
   * 执行节点
   */
  execute(context: ExecutionContext): Promise<ExecutionResult>;
}

/**
 * 创建执行上下文
 */
export function createExecutionContext(
  instanceId: string,
  workflowId: string,
  node: WorkflowNode,
  variables: Record<string, unknown>,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown> = {}
): ExecutionContext {
  return {
    instanceId,
    workflowId,
    node,
    variables,
    inputs,
    outputs,
    logs: [],
  };
}

/**
 * 添加日志
 */
export function addLog(
  context: ExecutionContext,
  level: LogEntry["level"],
  message: string
): void {
  context.logs.push({
    level,
    message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * 计算执行时长
 */
export function calculateDuration(
  startTime: string | Date,
  endTime: string | Date
): number {
  const start = startTime instanceof Date ? startTime : new Date(startTime);
  const end = endTime instanceof Date ? endTime : new Date(endTime);
  return end.getTime() - start.getTime();
}
