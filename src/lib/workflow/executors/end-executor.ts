/**
 * 结束节点执行器
 */

import { NodeExecutor, ExecutionContext, ExecutionResult } from "../types";
import { NodeType, NodeStatus, WorkflowNode } from "@/types/workflow";

export class EndNodeExecutor implements NodeExecutor {
  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.END;
  }

  validate(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!node.id) {
      errors.push("结束节点必须包含 ID");
    }

    if (!node.name) {
      errors.push("结束节点必须包含名称");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = new Date();

    // 结束节点收集所有输出
    const result: ExecutionResult = {
      status: NodeStatus.SUCCESS,
      output: {
        message: "工作流执行完成",
        endedAt: startTime.toISOString(),
        finalOutputs: context.outputs,
        finalVariables: context.variables,
      },
      logs: [
        {
          level: "info",
          message: `结束节点 ${context.node.name} 执行完成`,
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
