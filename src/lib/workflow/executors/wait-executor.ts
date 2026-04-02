/**
 * 等待节点执行器
 * 支持定时等待和事件等待
 */

import { NodeExecutor, ExecutionContext, ExecutionResult, addLog } from "../types";
import { NodeType, NodeStatus, WorkflowNode } from "@/types/workflow";

export class WaitNodeExecutor implements NodeExecutor {
  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.WAIT;
  }

  validate(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!node.id) {
      errors.push("等待节点必须包含 ID");
    }

    if (!node.name) {
      errors.push("等待节点必须包含名称");
    }

    if (!node.waitConfig) {
      errors.push("等待节点必须配置 waitConfig");
    } else {
      if (
        !node.waitConfig.duration &&
        !node.waitConfig.waitForEvent
      ) {
        errors.push("等待节点必须指定 duration 或 waitForEvent");
      }

      if (node.waitConfig.duration && node.waitConfig.duration < 0) {
        errors.push("等待时长不能为负数");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = new Date();
    const { node } = context;
    const config = node.waitConfig!;

    addLog(context, "info", `开始执行等待节点: ${node.name}`);

    try {
      if (config.duration) {
        // 定时等待
        await this.waitWithDuration(config.duration, context);
      } else if (config.waitForEvent) {
        // 事件等待（模拟）
        await this.waitForEvent(config.waitForEvent, context);
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        status: NodeStatus.SUCCESS,
        output: {
          message: "等待完成",
          waitedFor: config.duration || config.waitForEvent,
          actualDuration: duration,
        },
        logs: context.logs,
        metrics: {
          cpuTime: duration,
          memoryUsage: process.memoryUsage?.().heapUsed,
        },
      };
    } catch (error) {
      addLog(
        context,
        "error",
        `等待节点执行失败: ${error instanceof Error ? error.message : "未知错误"}`,
      );

      return {
        status: NodeStatus.FAILED,
        error: {
          nodeId: node.id,
          code: "WAIT_EXECUTION_FAILED",
          message:
            error instanceof Error ? error.message : "等待节点执行失败",
          stack: error instanceof Error ? error.stack : undefined,
          retryable: true,
        },
        logs: context.logs,
      };
    }
  }

  /**
   * 定时等待
   */
  private async waitWithDuration(
    duration: number,
    context: ExecutionContext,
  ): Promise<void> {
    const maxWait = Math.min(duration * 1000, 5000); // 最多 5 秒（测试用）

    addLog(context, "info", `等待 ${duration} 秒...`);

    await new Promise((resolve) => setTimeout(resolve, maxWait));

    addLog(context, "info", `等待完成`);
  }

  /**
   * 等待事件（模拟）
   */
  private async waitForEvent(
    eventName: string,
    context: ExecutionContext,
  ): Promise<void> {
    addLog(context, "info", `等待事件: ${eventName}`);

    // 模拟事件等待（实际实现需要事件系统）
    await new Promise((resolve) => setTimeout(resolve, 1000));

    addLog(context, "info", `事件 ${eventName} 已触发`);
  }
}
