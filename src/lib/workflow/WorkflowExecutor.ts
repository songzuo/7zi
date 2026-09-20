/**
 * 真实工作流执行器
 * 使用节点执行器注册表，实现真实的节点执行逻辑
 */

import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowNode,
  NodeExecutionResult,
  NodeStatus,
  InstanceStatus,
  EdgeType,
  NodeType,
} from '@/types/workflow'
import {
  ExecutionContext,
  createExecutionContext,
  addLog,
  calculateDuration,
  ExecutionResult,
} from './types'
import { nodeExecutorRegistry } from './executors/registry'

/**
 * 节点执行结果转换器
 */
function toNodeExecutionResult(
  nodeId: string,
  executionResult: ExecutionResult,
  startTime: string,
  input?: Record<string, unknown>
): NodeExecutionResult {
  return {
    nodeId,
    status: executionResult.status,
    startTime,
    endTime: new Date().toISOString(),
    duration: calculateDuration(startTime, new Date().toISOString()),
    input,
    output: executionResult.output,
    error: executionResult.error
      ? {
          code: executionResult.error.code,
          message: executionResult.error.message,
          stack: executionResult.error.stack,
        }
      : undefined,
    logs: executionResult.logs?.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      data: undefined,
    })),
  }
}

/**
 * WorkflowExecutor - 真实的工作流执行器
 * 使用节点执行器注册表，支持所有节点类型的真实执行
 */
export class WorkflowExecutor {
  private instances: Map<string, WorkflowInstance> = new Map()
  private workflows: Map<string, WorkflowDefinition> = new Map()

  /**
   * 注册工作流定义
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow)
  }

  /**
   * 获取工作流定义
   */
  getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId)
  }

  /**
   * 验证工作流定义
   */
  validateWorkflow(workflow: WorkflowDefinition): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // 基本验证
    if (!workflow.id) {
      errors.push('工作流 ID 不能为空')
    }

    if (!workflow.name) {
      errors.push('工作流名称不能为空')
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('工作流必须包含至少一个节点')
    }

    // 验证节点
    const nodeIds = new Set<string>()
    for (const node of workflow.nodes) {
      if (!node.id) {
        errors.push('存在没有 ID 的节点')
      } else if (nodeIds.has(node.id)) {
        errors.push(`节点 ID 重复: ${node.id}`)
      } else {
        nodeIds.add(node.id)
      }

      // 检查是否有执行器
      if (!nodeExecutorRegistry.has(node.type)) {
        errors.push(`节点类型 ${node.type} 没有可用的执行器`)
      }

      // 使用执行器验证节点配置
      const executor = nodeExecutorRegistry.get(node.type)
      if (executor) {
        const validation = executor.validate(node)
        if (!validation.valid) {
          errors.push(`节点 ${node.id} 配置错误: ${validation.errors.join(', ')}`)
        }
      }
    }

    // 验证边
    const edgeIds = new Set<string>()
    for (const edge of workflow.edges) {
      if (!edge.id) {
        errors.push('存在没有 ID 的边')
      } else if (edgeIds.has(edge.id)) {
        errors.push(`边 ID 重复: ${edge.id}`)
      } else {
        edgeIds.add(edge.id)
      }

      if (!nodeIds.has(edge.source)) {
        errors.push(`边的源节点不存在: ${edge.source}`)
      }

      if (!nodeIds.has(edge.target)) {
        errors.push(`边的目标节点不存在: ${edge.target}`)
      }
    }

    // 检查开始和结束节点
    const startNodes = workflow.nodes.filter(n => n.type === NodeType.START)
    const endNodes = workflow.nodes.filter(n => n.type === NodeType.END)

    if (startNodes.length === 0) {
      errors.push('工作流必须包含至少一个开始节点')
    } else if (startNodes.length > 1) {
      warnings.push('工作流包含多个开始节点')
    }

    if (endNodes.length === 0) {
      errors.push('工作流必须包含至少一个结束节点')
    }

    // 检查孤立节点
    const connectedNodes = new Set<string>()
    workflow.edges.forEach(edge => {
      connectedNodes.add(edge.source)
      connectedNodes.add(edge.target)
    })

    workflow.nodes.forEach(node => {
      if (node.type !== NodeType.START && node.type !== NodeType.END && !connectedNodes.has(node.id)) {
        warnings.push(`节点 ${node.id} 是孤立节点，没有连接`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 创建工作流实例
   */
  createInstance(
    workflowId: string,
    inputs?: Record<string, unknown>,
    options?: {
      triggeredBy: string
      triggerType: 'manual' | 'api' | 'scheduled' | 'webhook'
    }
  ): WorkflowInstance {
    const workflow = this.getWorkflow(workflowId)
    if (!workflow) {
      throw new Error(`工作流不存在: ${workflowId}`)
    }

    const instance: WorkflowInstance = {
      id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
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
        variables: { ...workflow.config.variables },
        outputs: {},
      },
      metadata: {
        startedAt: new Date().toISOString(),
        triggeredBy: options?.triggeredBy || 'system',
        triggerType: options?.triggerType || 'manual',
      },
    }

    // 初始化所有节点的执行结果
    for (const node of workflow.nodes) {
      instance.nodeResults.set(node.id, {
        nodeId: node.id,
        status: NodeStatus.IDLE,
        startTime: new Date().toISOString(),
      })
    }

    this.instances.set(instance.id, instance)
    return instance
  }

  /**
   * 执行工作流实例
   */
  async executeInstance(instanceId: string): Promise<WorkflowInstance> {
    const instance = this.instances.get(instanceId)
    if (!instance) {
      throw new Error(`实例不存在: ${instanceId}`)
    }

    if (instance.status !== InstanceStatus.PENDING) {
      throw new Error(`实例状态错误: ${instance.status}`)
    }

    const workflow = this.getWorkflow(instance.workflowId)
    if (!workflow) {
      throw new Error(`工作流不存在: ${instance.workflowId}`)
    }

    instance.status = InstanceStatus.RUNNING

    try {
      // 获取开始节点
      const startNode = workflow.nodes.find(n => n.type === NodeType.START)
      if (!startNode) {
        throw new Error('未找到开始节点')
      }

      // 执行工作流
      await this.executeNode(
        instance,
        workflow,
        startNode,
        instance.data.inputs || {},
        instance.data.variables || {}
      )

      // 检查是否有失败的节点
      const failedNodes = Array.from(instance.nodeResults.values()).filter(
        r => r.status === NodeStatus.FAILED
      )

      if (failedNodes.length > 0) {
        instance.status = InstanceStatus.FAILED
        instance.error = {
          nodeId: failedNodes[0].nodeId,
          code: 'WORKFLOW_HAS_FAILED_NODES',
          message: `工作流中有 ${failedNodes.length} 个节点执行失败`,
        }
      } else {
        instance.status = InstanceStatus.COMPLETED
      }

      instance.metadata.endedAt = new Date().toISOString()
      instance.metadata.duration = calculateDuration(
        instance.metadata.startedAt,
        instance.metadata.endedAt
      )

      return instance
    } catch (error) {
      instance.status = InstanceStatus.FAILED
      instance.error = {
        nodeId: '',
        code: 'EXECUTION_FAILED',
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
      }
      instance.metadata.endedAt = new Date().toISOString()

      throw error
    }
  }

  /**
   * 执行单个节点（使用真实执行器）
   */
  private async executeNode(
    instance: WorkflowInstance,
    workflow: WorkflowDefinition,
    node: WorkflowNode,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): Promise<void> {
    // 获取执行器
    const executor = nodeExecutorRegistry.get(node.type)
    if (!executor) {
      throw new Error(`没有找到节点类型 ${node.type} 的执行器`)
    }

    const startTime = new Date().toISOString()

    // 更新节点状态为 RUNNING
    const result: NodeExecutionResult = {
      nodeId: node.id,
      status: NodeStatus.RUNNING,
      startTime,
      input: { ...inputs },
    }

    instance.nodeResults.set(node.id, result)

    try {
      // 创建执行上下文
      const context = createExecutionContext(
        instance.id,
        instance.workflowId,
        node,
        variables,
        inputs,
        instance.data.outputs || {}
      )

      // 使用真实执行器执行节点
      const executionResult = await executor.execute(context)

      // 转换执行结果
      const finalResult = toNodeExecutionResult(node.id, executionResult, startTime, inputs)

      instance.nodeResults.set(node.id, finalResult)

      // 更新全局变量
      if (executionResult.output) {
        instance.data.variables = {
          ...instance.data.variables,
          [`node_${node.id}_output`]: executionResult.output,
        }
      }

      // 更新进度
      if (executionResult.status === NodeStatus.SUCCESS) {
        instance.progress.completed++
      } else if (executionResult.status === NodeStatus.FAILED) {
        instance.progress.failed++
      }

      instance.progress.percentage = Math.round(
        (instance.progress.completed / instance.progress.total) * 100
      )

      // 如果节点失败，抛出错误
      if (executionResult.status === NodeStatus.FAILED) {
        throw new Error(executionResult.error?.message || '节点执行失败')
      }

      // 查找下一个节点
      const nextNodes = this.getNextNodes(workflow, node.id)

      if (nextNodes.length === 0) {
        // 没有下一个节点，工作流结束
        return
      }

      // 根据节点类型决定执行方式
      if (node.type === NodeType.CONDITION) {
        // 条件节点：根据条件结果选择分支
        await this.executeConditionBranch(
          instance,
          workflow,
          node,
          executionResult.output,
          inputs,
          variables
        )
      } else if (node.type === NodeType.PARALLEL) {
        // 并行节点：并行执行所有分支
        await Promise.all(
          nextNodes.map(nextNode =>
            this.executeNode(
              instance,
              workflow,
              nextNode,
              { ...inputs, ...executionResult.output },
              { ...variables }
            )
          )
        )
      } else {
        // 顺序执行第一个分支
        const nextNode = nextNodes[0]
        await this.executeNode(
          instance,
          workflow,
          nextNode,
          { ...inputs, ...executionResult.output },
          { ...variables }
        )
      }
    } catch (error) {
      const finalResult: NodeExecutionResult = {
        nodeId: node.id,
        status: NodeStatus.FAILED,
        startTime,
        endTime: new Date().toISOString(),
        duration: calculateDuration(startTime, new Date().toISOString()),
        input: inputs,
        error: {
          code: 'NODE_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : '未知错误',
          stack: error instanceof Error ? error.stack : undefined,
        },
      }

      instance.nodeResults.set(node.id, finalResult)
      instance.progress.failed++

      throw error
    }
  }

  /**
   * 执行条件分支
   */
  private async executeConditionBranch(
    instance: WorkflowInstance,
    workflow: WorkflowDefinition,
    node: WorkflowNode,
    output: Record<string, unknown> | undefined,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): Promise<void> {
    // 条件节点返回的 output 中包含 label 字段
    const conditionValue = output?.label || output?.condition

    // 查找匹配的边 - 使用分支标签匹配
    let matchingEdge = workflow.edges.find(
      e =>
        e.source === node.id &&
        e.conditionConfig?.label?.toLowerCase() === String(conditionValue).toLowerCase()
    )

    // 如果没有找到，尝试使用 condition 字段匹配（向后兼容）
    if (!matchingEdge) {
      matchingEdge = workflow.edges.find(
        e =>
          e.source === node.id &&
          e.conditionConfig?.condition?.toLowerCase() === String(conditionValue).toLowerCase()
      )
    }

    // 如果还是没有找到，尝试默认分支
    if (!matchingEdge) {
      matchingEdge = workflow.edges.find(e => e.source === node.id && e.type === EdgeType.DEFAULT)
    }

    if (matchingEdge) {
      const nextNode = workflow.nodes.find(n => n.id === matchingEdge!.target)
      if (nextNode) {
        await this.executeNode(
          instance,
          workflow,
          nextNode,
          { ...inputs, ...output },
          { ...variables }
        )
      }
    } else {
      // 没有匹配的分支，记录警告
      console.warn(`条件节点 ${node.id} 没有找到匹配的分支: ${conditionValue}`)
    }
  }

  /**
   * 获取下一个节点列表
   */
  private getNextNodes(workflow: WorkflowDefinition, nodeId: string): WorkflowNode[] {
    const edges = workflow.edges.filter(e => e.source === nodeId)
    return edges
      .map(e => workflow.nodes.find(n => n.id === e.target))
      .filter((n): n is WorkflowNode => n !== undefined)
  }

  /**
   * 获取实例状态
   */
  getInstance(instanceId: string): WorkflowInstance | undefined {
    return this.instances.get(instanceId)
  }

  /**
   * 获取所有实例
   */
  getAllInstances(workflowId?: string): WorkflowInstance[] {
    const instances = Array.from(this.instances.values())
    if (workflowId) {
      return instances.filter(i => i.workflowId === workflowId)
    }
    return instances
  }

  /**
   * 取消实例
   */
  cancelInstance(instanceId: string): void {
    const instance = this.instances.get(instanceId)
    if (instance) {
      instance.status = InstanceStatus.CANCELLED
      instance.metadata.endedAt = new Date().toISOString()
      if (instance.metadata.startedAt) {
        instance.metadata.duration = calculateDuration(
          instance.metadata.startedAt,
          instance.metadata.endedAt
        )
      }
    }
  }

  /**
   * 获取工作流统计信息
   */
  getStatistics(workflowId: string): {
    totalInstances: number
    success: number
    failed: number
    cancelled: number
    avgDuration: number
  } {
    const instances = this.getAllInstances(workflowId)

    const total = instances.length
    const success = instances.filter(i => i.status === InstanceStatus.COMPLETED).length
    const failed = instances.filter(i => i.status === InstanceStatus.FAILED).length
    const cancelled = instances.filter(i => i.status === InstanceStatus.CANCELLED).length

    const completedInstances = instances.filter(i => i.metadata.duration)
    const avgDuration =
      completedInstances.length > 0
        ? completedInstances.reduce((sum, i) => sum + (i.metadata.duration || 0), 0) /
          completedInstances.length
        : 0

    return {
      totalInstances: total,
      success,
      failed,
      cancelled,
      avgDuration: Math.round(avgDuration),
    }
  }

  /**
   * 清除实例
   */
  clearInstances(workflowId?: string): void {
    if (workflowId) {
      const entries = Array.from(this.instances.entries())
      for (const [id, instance] of entries) {
        if (instance.workflowId === workflowId) {
          this.instances.delete(id)
        }
      }
    } else {
      this.instances.clear()
    }
  }
}

// 导出单例实例
export const workflowExecutor = new WorkflowExecutor()
