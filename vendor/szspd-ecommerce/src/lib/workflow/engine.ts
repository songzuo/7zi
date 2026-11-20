/**
 * 工作流运行时引擎
 * 负责工作流的解析、验证、执行和状态管理
 */

import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowNode,
  NodeExecutionResult,
  NodeStatus,
  InstanceStatus,
} from '@/types/workflow'

export class WorkflowEngine {
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

    // 检查必需字段
    if (!workflow.name) {
      errors.push('工作流名称不能为空')
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      errors.push('工作流必须包含至少一个节点')
    }

    // 检查节点
    const nodeIds = new Set<string>()
    workflow.nodes.forEach(node => {
      if (!node.id) {
        errors.push('存在没有 ID 的节点')
      } else if (nodeIds.has(node.id)) {
        errors.push(`节点 ID 重复: ${node.id}`)
      } else {
        nodeIds.add(node.id)
      }

      if (!node.type) {
        errors.push(`节点 ${node.id} 缺少类型`)
      }

      if (!node.position) {
        errors.push(`节点 ${node.id} 缺少位置信息`)
      }
    })

    // 检查边
    const edgeIds = new Set<string>()
    workflow.edges.forEach(edge => {
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
    })

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

    // 检查是否有孤立节点（没有连接的节点）
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
      },
      metadata: {
        startedAt: new Date().toISOString(),
        triggeredBy: options?.triggeredBy || 'system',
        triggerType: options?.triggerType || 'manual',
      },
    }

    // 初始化所有节点的执行结果为 IDLE
    workflow.nodes.forEach(node => {
      instance.nodeResults.set(node.id, {
        nodeId: node.id,
        status: NodeStatus.IDLE,
        startTime: new Date().toISOString(),
      })
    })

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

    let startNode: WorkflowNode | undefined
    try {
      // 获取开始节点
      startNode = workflow.nodes.find(n => n.type === 'start')
      if (!startNode) {
        throw new Error('未找到开始节点')
      }

      // 执行工作流
      await this.executeNode(instance, workflow, startNode.id, {})

      // 所有节点执行完成
      instance.status = InstanceStatus.COMPLETED
      instance.metadata.endedAt = new Date().toISOString()
      instance.metadata.duration =
        new Date(instance.metadata.endedAt).getTime() -
        new Date(instance.metadata.startedAt).getTime()

      return instance
    } catch (error) {
      instance.status = InstanceStatus.FAILED
      instance.error = {
        nodeId: startNode?.id || '',
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
    context: Record<string, unknown>
  ): Promise<void> {
    const node = workflow.nodes.find(n => n.id === nodeId)
    if (!node) {
      throw new Error(`节点不存在: ${nodeId}`)
    }

    // 更新节点状态为 RUNNING
    const result: NodeExecutionResult = {
      nodeId,
      status: NodeStatus.RUNNING,
      startTime: new Date().toISOString(),
      input: { ...context },
    }

    instance.nodeResults.set(nodeId, result)

    try {
      // 模拟节点执行（实际实现会调用对应的 Agent 或服务）
      await this.executeNodeLogic(instance, workflow, node, context)

      // 获取执行结果
      const finalResult = instance.nodeResults.get(nodeId)!
      finalResult.status = NodeStatus.SUCCESS
      finalResult.endTime = new Date().toISOString()
      finalResult.duration =
        new Date(finalResult.endTime).getTime() - new Date(finalResult.startTime).getTime()

      // 更新进度
      instance.progress.completed++
      instance.progress.percentage = Math.round(
        (instance.progress.completed / instance.progress.total) * 100
      )

      // 查找下一个节点
      const nextNodeIds = this.getNextNodes(workflow, nodeId)
      if (nextNodeIds.length === 0) {
        // 没有下一个节点，工作流结束
        return
      }

      // 判断是否是条件节点
      if (node.type === 'condition') {
        // 根据条件选择下一个节点
        const conditionResult = finalResult.output?.condition
        if (conditionResult === true || conditionResult === 'true') {
          const trueEdge = workflow.edges.find(
            e => e.source === nodeId && e.conditionConfig?.label === 'true'
          )
          if (trueEdge) {
            await this.executeNode(instance, workflow, trueEdge.target, {
              ...context,
              ...finalResult.output,
            })
          }
        } else {
          const falseEdge = workflow.edges.find(
            e => e.source === nodeId && e.conditionConfig?.label === 'false'
          )
          if (falseEdge) {
            await this.executeNode(instance, workflow, falseEdge.target, {
              ...context,
              ...finalResult.output,
            })
          }
        }
      } else if (node.type === 'parallel') {
        // 并行执行所有下一个节点
        await Promise.all(
          nextNodeIds.map(nextNodeId =>
            this.executeNode(instance, workflow, nextNodeId, {
              ...context,
              ...finalResult.output,
            })
          )
        )
      } else {
        // 顺序执行下一个节点
        const nextNodeId = nextNodeIds[0]
        await this.executeNode(instance, workflow, nextNodeId, {
          ...context,
          ...finalResult.output,
        })
      }
    } catch (error) {
      const finalResult = instance.nodeResults.get(nodeId)!
      finalResult.status = NodeStatus.FAILED
      finalResult.endTime = new Date().toISOString()
      const errorInfo = {
        code: 'NODE_EXECUTION_FAILED',
        message: error instanceof Error ? error.message : '未知错误',
        stack: error instanceof Error ? error.stack : undefined,
      }
      finalResult.error = errorInfo

      instance.progress.failed++
      instance.error = {
        nodeId,
        code: errorInfo.code,
        message: errorInfo.message,
        stack: errorInfo.stack,
      }

      throw error
    }
  }

  /**
   * 执行节点逻辑（模拟）
   */
  private async executeNodeLogic(
    instance: WorkflowInstance,
    workflow: WorkflowDefinition,
    node: WorkflowNode,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const result = instance.nodeResults.get(node.id)!

    switch (node.type) {
      case 'start':
        result.output = { message: '工作流开始' }
        break

      case 'end':
        result.output = { message: '工作流结束' }
        instance.data.outputs = { ...context }
        break

      case 'agent':
        // 模拟 Agent 执行
        await this.delay(1000) // 模拟耗时
        result.output = {
          agentId: node.agentConfig?.agentId,
          result: 'Agent 执行完成',
          data: { ...context },
        }
        break

      case 'condition':
        // 模拟条件判断
        await this.delay(500)
        result.output = {
          condition: Math.random() > 0.5, // 随机返回 true/false
          message: '条件判断完成',
        }
        break

      case 'parallel':
        result.output = { message: '并行分支开始' }
        break

      case 'wait':
        const duration = node.waitConfig?.duration || 1
        await this.delay(duration * 1000)
        result.output = { message: `等待 ${duration} 秒完成` }
        break

      default:
        result.output = { message: '节点执行完成' }
    }

    return result.output || {}
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
    }
  }

  /**
   * 延迟辅助函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取工作流统计信息
   */
  getStatistics(workflowId: string): {
    totalInstances: number
    success: number
    failed: number
    avgDuration: number
  } {
    const instances = this.getAllInstances(workflowId)

    const total = instances.length
    const success = instances.filter(i => i.status === InstanceStatus.COMPLETED).length
    const failed = instances.filter(i => i.status === InstanceStatus.FAILED).length

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
      avgDuration: Math.round(avgDuration),
    }
  }
}

// 导出单例实例
export const workflowEngine = new WorkflowEngine()
