/**
 * Agent 节点执行器
 * 负责调用 Agent 执行任务
 */

import { NodeExecutor, ExecutionContext, ExecutionResult, addLog } from '../types'
import { NodeType, NodeStatus, WorkflowNode } from '@/types/workflow'

export class AgentNodeExecutor implements NodeExecutor {
  canHandle(nodeType: NodeType): boolean {
    return nodeType === NodeType.AGENT
  }

  validate(node: WorkflowNode): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!node.id) {
      errors.push('Agent 节点必须包含 ID')
    }

    if (!node.name) {
      errors.push('Agent 节点必须包含名称')
    }

    if (!node.agentConfig) {
      errors.push('Agent 节点必须配置 agentConfig')
    } else {
      if (!node.agentConfig.agentId && !node.agentConfig.agentType) {
        errors.push('Agent 节点必须指定 agentId 或 agentType')
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = new Date()
    const { node, inputs, variables } = context
    const config = node.agentConfig!

    addLog(context, 'info', `开始执行 Agent: ${node.name}`)

    try {
      // 准备输入参数
      const agentInputs = this.prepareInputs(node, inputs, variables)

      addLog(context, 'info', `Agent 输入参数准备完成`)

      // 模拟 Agent 执行（实际实现会调用 AgentScheduler）
      const agentResult = await this.executeAgent(
        config.agentId || config.agentType,
        agentInputs,
        config,
        context
      )

      const endTime = new Date()
      const duration = endTime.getTime() - startTime.getTime()

      return {
        status: NodeStatus.SUCCESS,
        output: {
          agentId: config.agentId,
          agentType: config.agentType,
          result: agentResult,
          duration,
        },
        logs: context.logs,
        metrics: {
          cpuTime: duration,
          memoryUsage: process.memoryUsage?.().heapUsed,
        },
      }
    } catch (error) {
      const _endTime = new Date()
      addLog(
        context,
        'error',
        `Agent 执行失败: ${error instanceof Error ? error.message : '未知错误'}`
      )

      return {
        status: NodeStatus.FAILED,
        error: {
          nodeId: node.id,
          code: 'AGENT_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'Agent 执行失败',
          stack: error instanceof Error ? error.stack : undefined,
          retryable: true,
        },
        logs: context.logs,
      }
    }
  }

  /**
   * 准备输入参数
   */
  private prepareInputs(
    node: WorkflowNode,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): Record<string, unknown> {
    const agentInputs: Record<string, unknown> = {
      ...inputs,
      ...variables,
    }

    // 如果有自定义参数配置
    if (node.config?.inputs) {
      Object.assign(agentInputs, node.config.inputs)
    }

    return agentInputs
  }

  /**
   * 执行 Agent（模拟）
   */
  private async executeAgent(
    agentIdOrType: string,
    inputs: Record<string, unknown>,
    config: NonNullable<WorkflowNode['agentConfig']>,
    context: ExecutionContext
  ): Promise<Record<string, unknown>> {
    // 模拟网络延迟
    const delay = config.timeout || 1000
    await this.simulateDelay(Math.min(delay, 2000)) // 最多 2 秒

    addLog(context, 'info', `Agent ${agentIdOrType} 执行完成`)

    // 返回模拟结果
    return {
      status: 'success',
      data: {
        processedInputs: inputs,
        result: `Agent ${agentIdOrType} 处理完成`,
      },
      model: config.model || 'default',
    }
  }

  /**
   * 模拟延迟
   */
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
