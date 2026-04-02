/**
 * 增强的工作流执行器
 * 使用节点执行器注册表，支持更灵活的节点执行
 */

import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowNode,
  WorkflowEdge,
  NodeExecutionResult,
  NodeStatus,
  InstanceStatus,
  EdgeType,
} from '@/types/workflow'
import {
  NodeExecutor,
  ExecutionContext,
  ExecutionResult,
  createExecutionContext,
  addLog,
  calculateDuration,
} from './types'
import { nodeExecutorRegistry } from './executors/registry'

export class EnhancedWorkflowExecutor {
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
  } {
    const errors: string[] = []

    // 基本验证
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
    const startNodes = workflow.nodes.filter(n => n.type === 'start')
    const endNodes = workflow.nodes.filter(n => n.type === 'end')

    if (startNodes.length === 0) {
      errors.push('工作流必须包含至少一个开始节点')
    } else if (startNodes.length > 1) {
      errors.push('工作流只能包含一个开始节点')
    }

    if (endNodes.length === 0) {
      errors.push('工作流必须包含至少一个结束节点')
    }

    // 检查是否有孤立节点
    const connectedNodes = new Set<string>()
    workflow.edges.forEach(edge => {
      connectedNodes.add(edge.source)
      connectedNodes.add(edge.target)
    })

    workflow.nodes.forEach(node => {
      if (node.type !== 'start' && node.type !== 'end' && !connectedNodes.has(node.id)) {
        errors.push(`节点 ${node.id} 是孤立节点，没有连接`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
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

    const validation = this.validateWorkflow(workflow)
    if (!validation.valid) {
      throw new Error(`工作流验证失败: ${validation.errors.join(', ')}`)
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
      const startNode = workflow.nodes.find(n => n.type === 'start')
      if (!startNode) {
        throw new Error('未找到开始节点')
      }

      // 执行工作流
      await this.executeNode(instance, workflow, startNode.id, {}, instance.data.variables || {})

      // 检查是否有失败的节点
      const failedNodes = Array.from(
        instance.nodeResults.values() as IterableIterator<NodeExecutionResult>
      ).filter(r => r.status === NodeStatus.FAILED)

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
   * 执行单个节点
   */
  private async executeNode(
    instance: WorkflowInstance,
    workflow: WorkflowDefinition,
    nodeId: string,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): Promise<void> {
    const node = workflow.nodes.find(n => n.id === nodeId)
    if (!node) {
      throw new Error(`节点不存在: ${nodeId}`)
    }

    // 获取执行器
    const executor = nodeExecutorRegistry.get(node.type)
    if (!executor) {
      throw new Error(`没有找到节点类型 ${node.type} 的执行器`)
    }

    // 更新节点状态为 RUNNING
    const result: NodeExecutionResult = {
      nodeId,
      status: NodeStatus.RUNNING,
      startTime: new Date().toISOString(),
      input: { ...inputs },
    }

    instance.nodeResults.set(nodeId, result)

    try {
      // 创建执行上下文
      const context = createExecutionContext(
        instance.id,
        instance.workflowId,
        node,
        variables,
        inputs,
        instance.data.outputs
      )

      // 执行节点
      const executionResult = await executor.execute(context)

      // 更新节点结果
      const finalResult: NodeExecutionResult = {
        ...result,
        status: executionResult.status,
        endTime: new Date().toISOString(),
        output: executionResult.output,
        error: executionResult.error
          ? {
              code: executionResult.error.code,
              message: executionResult.error.message,
              stack: executionResult.error.stack,
            }
          : undefined,
        duration: calculateDuration(result.startTime, new Date().toISOString()),
        logs: executionResult.logs,
      }

      instance.nodeResults.set(nodeId, finalResult)

      // 更新全局变量
      if (executionResult.output) {
        instance.data.variables = {
          ...instance.data.variables,
          [`node_${nodeId}_output`]: executionResult.output,
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

      // 查找下一个节点
      const nextNodeIds = this.getNextNodes(workflow, nodeId)
      if (nextNodeIds.length === 0) {
        // 没有下一个节点，工作流结束
        return
      }

      // 判断节点类型以决定执行方式
      if (node.type === 'condition') {
        // 条件节点，根据结果选择分支
        await this.executeConditionBranch(instance, workflow, node, finalResult, inputs, variables)
      } else if (node.type === 'parallel') {
        // 并行节点，并行执行所有下一个节点
        await Promise.all(
          nextNodeIds.map(nextNodeId =>
            this.executeNode(
              instance,
              workflow,
              nextNodeId,
              { ...inputs, ...finalResult.output },
              { ...variables }
            )
          )
        )
      } else {
        // 顺序执行
        const nextNodeId = nextNodeIds[0]
        await this.executeNode(
          instance,
          workflow,
          nextNodeId,
          { ...inputs, ...finalResult.output },
          { ...variables }
        )
      }
    } catch (error) {
      const finalResult: NodeExecutionResult = {
        ...result,
        status: NodeStatus.FAILED,
        endTime: new Date().toISOString(),
        error: {
          code: 'NODE_EXECUTION_FAILED',
          message: error instanceof Error ? error.message : '未知错误',
          stack: error instanceof Error ? error.stack : undefined,
        },
        duration: calculateDuration(result.startTime, new Date().toISOString()),
      }

      instance.nodeResults.set(nodeId, finalResult)
      instance.progress.failed++
      instance.error = {
        nodeId: nodeId,
        code: 'NODE_EXECUTION_FAILED',
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
      }

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
    result: NodeExecutionResult,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): Promise<void> {
    const conditionValue = result.output?.condition

    // 查找匹配的边
    const matchingEdge = workflow.edges.find(
      e =>
        e.source === node.id &&
        e.conditionConfig?.condition?.toLowerCase() === String(conditionValue).toLowerCase()
    )

    if (matchingEdge) {
      await this.executeNode(
        instance,
        workflow,
        matchingEdge.target,
        { ...inputs, ...result.output },
        { ...variables }
      )
    } else {
      // 没有匹配的边，尝试默认分支
      const defaultEdge = workflow.edges.find(
        e => e.source === node.id && e.type === EdgeType.DEFAULT
      )

      if (defaultEdge) {
        await this.executeNode(
          instance,
          workflow,
          defaultEdge.target,
          { ...inputs, ...result.output },
          { ...variables }
        )
      }
    }
  }

  /**
   * 获取下一个节点
   */
  private getNextNodes(workflow: WorkflowDefinition, nodeId: string): string[] {
    const edges = workflow.edges.filter(e => e.source === nodeId)
    return edges.map(e => e.target)
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
      const instances = Array.from(this.instances.entries())
      for (const [id, instance] of instances) {
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
export const enhancedWorkflowExecutor = new EnhancedWorkflowExecutor()
