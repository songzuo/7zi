/**
 * 并行节点执行器
 * 用于并行分支的起始点
 */

import { NodeExecutor, ExecutionContext, ExecutionResult, addLog } from "../types";
import { NodeType, NodeStatus, WorkflowNode } from "@/types/workflow";

export class ParallelNodeExecutor implements NodeExecutor {
  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.PARALLEL;
  }

  validate(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!node.id) {
      errors.push("并行节点必须包含 ID");
    }

    if (!node.name) {
      errors.push("并行节点必须包含名称");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = new Date();

    addLog(context, "info", `开始执行并行节点: ${context.node.name}`);

    // 并行节点只是一个标记，实际并行执行由执行引擎处理
    const result: ExecutionResult = {
      status: NodeStatus.SUCCESS,
      output: {
        message: "并行分支开始",
        parallelStartedAt: startTime.toISOString(),
      },
      logs: context.logs,
      metrics: {
        cpuTime: 0,
        memoryUsage: process.memoryUsage?.().heapUsed,
      },
    };

    addLog(context, "info", `并行节点标记完成，等待引擎处理分支`);

    return result;
  }
}
