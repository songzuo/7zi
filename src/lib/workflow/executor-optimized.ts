/**
 * 工作流性能优化执行器
 * v1.11 - 支持并行执行、缓存、增量更新
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
import { LRUCache } from 'lru-cache'

/**
 * 节点依赖图
 */
interface DependencyGraph {
  nodes: Map<string, Set<string>> // nodeId -> dependencies
  dependents: Map<string, Set<string>> // nodeId -> nodes that depend on this
}

/**
 * 执行缓存键
 */
interface CacheKey {
  nodeId: string
  nodeType: string
  inputsHash: string
  variablesHash: string
}

/**
 * 执行缓存条目
 */
interface CacheEntry {
  result: ExecutionResult
  timestamp: number
  hitCount: number
}

/**
 * 性能指标
 */
interface PerformanceMetrics {
  cacheHits: number
  cacheMisses: number
  parallelExecutions: number
  totalExecutionTime: number
  avgNodeExecutionTime: number
}

/**
 * 优化后的工作流执行器
 */
export class OptimizedWorkflowExecutor {
  private instances: Map<string, WorkflowInstance> = new Map()
  private workflows: Map<string, WorkflowDefinition> = new Map()

  // 执行缓存 - LRU 缓存
  private executionCache: LRUCache<string, CacheEntry>

  // 性能指标
  private metrics: PerformanceMetrics = {
    cacheHits: 0,
    cacheMisses: 0,
    parallelExecutions: 0,
    totalExecutionTime: 0,
    avgNodeExecutionTime: 0,
  }

  constructor(cacheSize: number = 1000) {
    this.executionCache = new LRUCache<string, CacheEntry>({
      max: cacheSize,
      ttl: 1000 * 60 * 30, // 30分钟过期
      updateAgeOnGet: true,
    })
  }

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
   * 执行工作流实例（优化版）
   */
  async executeInstance(instanceId: string): Promise<WorkflowInstance> {
    const startTime = Date.now()
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
      // 构建依赖图
      const dependencyGraph = this.buildDependencyGraph(workflow)

      // 获取开始节点
      const startNode = workflow.nodes.find(n => n.type === 'start')
      if (!startNode) {
        throw new Error('未找到开始节点')
      }

      // 使用优化的并行执行
      await this.executeWorkflowOptimized(
        instance,
        workflow,
        startNode.id,
        {},
        instance.data.variables || {},
        dependencyGraph
      )

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

      // 更新性能指标
      const executionTime = Date.now() - startTime
      this.metrics.totalExecutionTime += executionTime
      this.metrics.avgNodeExecutionTime =
        executionTime / (instance.progress.completed + instance.progress.failed)

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
   * 构建依赖图
   */
  private buildDependencyGraph(workflow: WorkflowDefinition): DependencyGraph {
    const nodes = new Map<string, Set<string>>()
    const dependents = new Map<string, Set<string>>()

    // 初始化
    workflow.nodes.forEach(node => {
      nodes.set(node.id, new Set())
      dependents.set(node.id, new Set())
    })

    // 构建依赖关系
    workflow.edges.forEach(edge => {
      // target 依赖于 source
      if (nodes.has(edge.target)) {
        nodes.get(edge.target)!.add(edge.source)
      }
      // source 被 target 依赖
      if (dependents.has(edge.source)) {
        dependents.get(edge.source)!.add(edge.target)
      }
    })

    return { nodes, dependents }
  }

  /**
   * 优化的工作流执行
   */
  private async executeWorkflowOptimized(
    instance: WorkflowInstance,
    workflow: WorkflowDefinition,
    startNodeId: string,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>,
    dependencyGraph: DependencyGraph
  ): Promise<void> {
    // 使用拓扑排序和并行执行
    const executionOrder = this.topologicalSort(workflow, dependencyGraph)

    // 按层级执行
    for (const level of executionOrder) {
      if (level.length === 1) {
        // 单个节点，顺序执行
        await this.executeNode(
          instance,
          workflow,
          level[0],
          inputs,
          variables,
          dependencyGraph
        )
      } else {
        // 多个节点，并行执行
        this.metrics.parallelExecutions++
        await Promise.all(
          level.map(nodeId =>
            this.executeNode(
              instance,
              workflow,
              nodeId,
              inputs,
              variables,
              dependencyGraph
            )
          )
        )
      }
    }
  }

  /**
   * 拓扑排序 - 返回按层级分组的节点
   */
  private topologicalSort(
    workflow: WorkflowDefinition,
    dependencyGraph: DependencyGraph
  ): string[][] {
    const levels: string[][] = []
    const visited = new Set<string>()
    const inDegree = new Map<string, number>()

    // 计算入度
    workflow.nodes.forEach(node => {
      inDegree.set(node.id, dependencyGraph.nodes.get(node.id)!.size)
    })

    // 找到入度为0的节点（开始节点）
    const queue: string[] = workflow.nodes
      .filter(n => inDegree.get(n.id) === 0)
      .map(n => n.id)

    while (queue.length > 0) {
      const levelSize = queue.length
      const currentLevel: string[] = []

      for (let i = 0; i < levelSize; i++) {
        const nodeId = queue.shift()!
        currentLevel.push(nodeId)
        visited.add(nodeId)

        // 减少依赖此节点的节点的入度
        const dependents = dependencyGraph.dependents.get(nodeId) || new Set()
        for (const dependentId of dependents) {
          const newDegree = (inDegree.get(dependentId) || 0) - 1
          inDegree.set(dependentId, newDegree)

          if (newDegree === 0 && !visited.has(dependentId)) {
            queue.push(dependentId)
          }
        }
      }

      if (currentLevel.length > 0) {
        levels.push(currentLevel)
      }
    }

    return levels
  }

  /**
   * 执行单个节点（带缓存）
   */
  private async executeNode(
    instance: WorkflowInstance,
    workflow: WorkflowDefinition,
    nodeId: string,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>,
    dependencyGraph: DependencyGraph
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

    // 检查缓存
    const cacheKey = this.generateCacheKey(node, inputs, variables)
    const cachedResult = this.executionCache.get(cacheKey)

    if (cachedResult) {
      // 缓存命中
      this.metrics.cacheHits++
      cachedResult.hitCount++

      // 更新节点结果
      const result: NodeExecutionResult = {
        nodeId,
        status: cachedResult.result.status,
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        output: cachedResult.result.output,
        duration: 0, // 缓存命中，执行时间为0
        logs: cachedResult.result.logs,
        cached: true,
      }

      instance.nodeResults.set(nodeId, result)

      // 更新进度
      if (result.status === NodeStatus.SUCCESS) {
        instance.progress.completed++
      } else if (result.status === NodeStatus.FAILED) {
        instance.progress.failed++
      }

      instance.progress.percentage = Math.round(
        (instance.progress.completed / instance.progress.total) * 100
      )

      return
    }

    // 缓存未命中
    this.metrics.cacheMisses++

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

      // 缓存结果
      this.executionCache.set(cacheKey, {
        result: executionResult,
        timestamp: Date.now(),
        hitCount: 0,
      })

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
   * 生成缓存键
   */
  private generateCacheKey(
    node: WorkflowNode,
    inputs: Record<string, unknown>,
    variables: Record<string, unknown>
  ): string {
    const inputsHash = this.hashObject(inputs)
    const variablesHash = this.hashObject(variables)

    return `${node.id}_${node.type}_${inputsHash}_${variablesHash}`
  }

  /**
   * 简单的对象哈希
   */
  private hashObject(obj: Record<string, unknown>): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort())
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
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
   * 获取性能指标
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 重置性能指标
   */
  resetPerformanceMetrics(): void {
    this.metrics = {
      cacheHits: 0,
      cacheMisses: 0,
      parallelExecutions: 0,
      totalExecutionTime: 0,
      avgNodeExecutionTime: 0,
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.executionCache.clear()
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    size: number
    maxSize: number
    hits: number
    misses: number
    hitRate: number
  } {
    const hits = this.metrics.cacheHits
    const misses = this.metrics.cacheMisses
    const total = hits + misses

    return {
      size: this.executionCache.size,
      maxSize: this.executionCache.max,
      hits,
      misses,
      hitRate: total > 0 ? hits / total : 0,
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
export const optimizedWorkflowExecutor = new OptimizedWorkflowExecutor()