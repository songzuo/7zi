/**
 * 开始节点执行器
 */

import { NodeExecutor, ExecutionContext, ExecutionResult } from "../types";
import { NodeType, NodeStatus, WorkflowNode } from "@/types/workflow";

export class StartNodeExecutor implements NodeExecutor {
  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.START;
  }

  validate(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!node.id) {
      errors.push("开始节点必须包含 ID");
    }

    if (!node.name) {
      errors.push("开始节点必须包含名称");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = new Date();

    // 开始节点只做初始化工作
    const result: ExecutionResult = {
      status: NodeStatus.SUCCESS,
      output: {
        message: "工作流开始执行",
        startedAt: startTime.toISOString(),
      },
      logs: [
        {
          level: "info",
          message: `开始节点 ${context.node.name} 执行完成`,
          timestamp: startTime.toISOString(),
        },
      ],
      metrics: {
        memoryUsage: process.memoryUsage?.().heapUsed,
        cpuTime: 0,
      },
    };

    return result;
  }
}
