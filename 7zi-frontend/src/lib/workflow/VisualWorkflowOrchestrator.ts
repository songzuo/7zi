/**
 * Visual Workflow Orchestrator - 可视化工作流编排器
 *
 * 负责工作流的执行编排和状态管理
 * 支持执行状态持久化，页面刷新后可恢复执行进度
 *
 * @package 7zi-frontend
 * @version 1.12.2
 */

import type {
  WorkflowDefinition,
  WorkflowNodeData,
  WorkflowEdgeData,
  WorkflowInstance,
  NodeStatus,
  NodeExecutionResult,
  ExecutionState,
} from '@/components/WorkflowEditor/types'
import { executionStateStorage, type PersistentExecutionState } from '@/lib/storage/execution-state-storage'
import { webhookManager } from '@/lib/webhook'
import type { WebhookEvent } from '@/lib/webhook'

/**
 * 执行事件类型
 */
export type ExecutionEventType =
  | 'started'
  | 'paused'
  | 'resumed'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'node_started'
  | 'node_completed'
  | 'node_failed'
  | 'node_skipped'
  | 'progress'

/**
 * 执行事件
 */
export interface ExecutionEvent {
  type: ExecutionEventType
  timestamp: string
  nodeId?: string
  data?: unknown
}

/**
 * 执行事件监听器
 */
export type ExecutionEventListener = (event: ExecutionEvent) => void

/**
 * 执行配置
 */
export interface ExecutionConfig {
  /** 是否启用状态持久化 */
  enablePersistence?: boolean
  /** 自动保存间隔（毫秒） */
  autoSaveInterval?: number
  /** 超时时间（毫秒） */
  timeout?: number
  /** 最大重试次数 */
  maxRetries?: number
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  success: boolean
  instance: WorkflowInstance
  outputs: Record<string, unknown>
  error?: string
}

/**
 * Visual Workflow Orchestrator
 */
export class VisualWorkflowOrchestrator {
  private workflow: WorkflowDefinition | null = null
  private executionState: ExecutionState | null = null
  private isExecuting = false
  private isPaused = false
  private eventListeners: Set<ExecutionEventListener> = new Set()
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null
  private config: Required<ExecutionConfig>

  constructor(config: ExecutionConfig = {}) {
    this.config = {
      enablePersistence: config.enablePersistence ?? true,
      autoSaveInterval: config.autoSaveInterval ?? 5000,
      timeout: config.timeout ?? 300000, // 5 分钟
      maxRetries: config.maxRetries ?? 3,
    }
  }

  /**
   * 设置工作流定义
   */
  setWorkflow(workflow: WorkflowDefinition): void {
    this.workflow = workflow
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: ExecutionEventListener): void {
    this.eventListeners.add(listener)
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: ExecutionEventListener): void {
    this.eventListeners.delete(listener)
  }

  /**
   * 触发事件
   */
  private emitEvent(event: ExecutionEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('[VisualWorkflowOrchestrator] 事件监听器错误:', error)
      }
    })
  }

  /**
   * 开始执行工作流
   */
  async startExecution(
    inputs: Record<string, unknown> = {}
  ): Promise<ExecutionResult> {
    if (!this.workflow) {
      throw new Error('未设置工作流定义')
    }

    if (this.isExecuting) {
      throw new Error('工作流正在执行中')
    }

    // 检查是否有可恢复的执行状态
    const savedState = await executionStateStorage.loadExecutionState()
    if (savedState && savedState.workflowId === this.workflow.id) {
      console.log('[VisualWorkflowOrchestrator] 检测到可恢复的执行状态')
      return this.resumeExecution(savedState)
    }

    // 创建新的执行实例
    const executionId = `exec-${Date.now()}`
    const instance: WorkflowInstance = {
      id: executionId,
      workflowId: this.workflow.id,
      status: 'running',
      startTime: Date.now(),
      progress: {
        total: this.workflow.nodes.length,
        completed: 0,
        failed: 0,
      },
      inputs,
      outputs: {},
      variables: this.workflow.variables || [],
    }

    this.executionState = {
      instance,
      nodeStates: {},
    }

    this.isExecuting = true
    this.isPaused = false

    this.emitEvent({
      type: 'started',
      timestamp: new Date().toISOString(),
      data: { executionId },
    })

    // 触发 Webhook - 工作流启动
    this.triggerWebhook(this.createWorkflowStartedEvent(instance))

    // 保存初始状态
    if (this.config.enablePersistence) {
      await this.saveExecutionState()
      this.startAutoSave()
    }

    try {
      // 执行工作流
      const result = await this.executeWorkflow(instance)

      // 触发 Webhook - 工作流完成
      if (result.success) {
        this.triggerWebhook(this.createWorkflowCompletedEvent(result.instance))
      }

      // 清理
      this.stopAutoSave()
      if (this.config.enablePersistence) {
        await executionStateStorage.clearExecutionState()
      }

      this.isExecuting = false

      return result
    } catch (error) {
      this.stopAutoSave()
      this.isExecuting = false

      const errorMessage = error instanceof Error ? error.message : String(error)

      this.emitEvent({
        type: 'failed',
        timestamp: new Date().toISOString(),
        data: { error: errorMessage },
      })

      // 触发 Webhook - 工作流失败
      this.triggerWebhook(this.createWorkflowFailedEvent(instance, errorMessage))

      throw error
    }
  }

  /**
   * 恢复执行
   */
  private async resumeExecution(
    savedState: PersistentExecutionState
  ): Promise<ExecutionResult> {
    console.log('[VisualWorkflowOrchestrator] 恢复执行:', savedState.executionId)

    // 重建执行实例
    const instance: WorkflowInstance = {
      id: savedState.executionId,
      workflowId: savedState.workflowId,
      status: savedState.pausedAt ? 'running' : 'running',
      startTime: savedState.startedAt,
      progress: {
        total: Object.keys(savedState.nodeStates).length,
        completed: Object.values(savedState.nodeStates).filter(
          n => n.status === 'completed' || n.status === 'success'
        ).length,
        failed: Object.values(savedState.nodeStates).filter(n => n.status === 'failed').length,
      },
      inputs: {},
      outputs: {},
      variables: Object.entries(savedState.variables).map(([key, value]) => ({
        name: key,
        value,
        type: typeof value as string,
      })),
    }

    this.executionState = {
      instance,
      nodeStates: savedState.nodeStates,
    }

    this.isExecuting = true
    this.isPaused = !!savedState.pausedAt

    this.emitEvent({
      type: 'resumed',
      timestamp: new Date().toISOString(),
      data: { executionId: savedState.executionId },
    })

    // 如果之前是暂停状态，先恢复
    if (this.isPaused) {
      await executionStateStorage.resumeExecution()
      this.isPaused = false
    }

    // 重新启动自动保存
    if (this.config.enablePersistence) {
      this.startAutoSave()
    }

    try {
      // 继续执行工作流
      const result = await this.executeWorkflow(instance)

      // 清理
      this.stopAutoSave()
      if (this.config.enablePersistence) {
        await executionStateStorage.clearExecutionState()
      }

      this.isExecuting = false

      return result
    } catch (error) {
      this.stopAutoSave()
      this.isExecuting = false

      this.emitEvent({
        type: 'failed',
        timestamp: new Date().toISOString(),
        data: { error: error instanceof Error ? error.message : String(error) },
      })

      throw error
    }
  }

  /**
   * 执行工作流
   */
  private async executeWorkflow(instance: WorkflowInstance): Promise<ExecutionResult> {
    if (!this.workflow) {
      throw new Error('未设置工作流定义')
    }

    // 构建节点依赖图
    const nodeMap = new Map<string, WorkflowNodeData>()
    const dependencies = new Map<string, string[]>()

    for (const node of this.workflow.nodes) {
      nodeMap.set(node.id, node)
      dependencies.set(node.id, [])
    }

    for (const edge of this.workflow.edges) {
      const deps = dependencies.get(edge.target) || []
      deps.push(edge.source)
      dependencies.set(edge.target, deps)
    }

    // 拓扑排序
    const executionOrder = this.topologicalSort(this.workflow.nodes, dependencies)

    // 执行节点
    for (const nodeId of executionOrder) {
      if (!this.isExecuting) {
        break
      }

      // 检查是否已执行
      const existingState = this.executionState?.nodeStates[nodeId]
      if (existingState && (existingState.status === 'completed' || existingState.status === 'success')) {
        console.log(`[VisualWorkflowOrchestrator] 节点 ${nodeId} 已完成，跳过`)
        continue
      }

      // 检查依赖是否完成
      const deps = dependencies.get(nodeId) || []
      const allDepsCompleted = deps.every(
        depId => {
          const depState = this.executionState?.nodeStates[depId]
          return depState && (depState.status === 'completed' || depState.status === 'success')
        }
      )

      if (!allDepsCompleted) {
        console.log(`[VisualWorkflowOrchestrator] 节点 ${nodeId} 的依赖未完成，跳过`)
        continue
      }

      // 执行节点
      await this.executeNode(nodeId, nodeMap.get(nodeId)!)
    }

    // 更新实例状态
    const nodeStates = this.executionState?.nodeStates || {}
    const completedCount = Object.values(nodeStates).filter(
      n => n.status === 'completed' || n.status === 'success'
    ).length
    const failedCount = Object.values(nodeStates).filter(n => n.status === 'failed').length

    instance.progress.completed = completedCount
    instance.progress.failed = failedCount
    instance.endTime = Date.now()

    const success = failedCount === 0
    instance.status = success ? 'completed' : 'failed'

    this.emitEvent({
      type: success ? 'completed' : 'failed',
      timestamp: new Date().toISOString(),
      data: { instance },
    })

    return {
      success,
      instance,
      outputs: instance.outputs,
    }
  }

  /**
   * 执行单个节点
   */
  private async executeNode(nodeId: string, node: WorkflowNodeData): Promise<void> {
    console.log(`[VisualWorkflowOrchestrator] 执行节点: ${nodeId}`)

    // 更新节点状态为运行中
    this.executionState!.nodeStates[nodeId] = {
      status: 'running',
    }

    this.emitEvent({
      type: 'node_started',
      timestamp: new Date().toISOString(),
      nodeId,
    })

    // 保存状态
    if (this.config.enablePersistence) {
      await this.saveExecutionState()
    }

    try {
      // 执行节点逻辑（这里需要根据节点类型实现具体的执行逻辑）
      const result = await this.executeNodeLogic(node)

      // 更新节点状态为完成
      this.executionState!.nodeStates[nodeId] = {
        status: 'completed',
        result,
      }

      // 更新输出
      if (result && typeof result === 'object') {
        this.executionState!.instance.outputs[nodeId] = result
      }

      this.emitEvent({
        type: 'node_completed',
        timestamp: new Date().toISOString(),
        nodeId,
        data: { result },
      })

      // 触发 Webhook - 节点执行完成
      const nodeExecutionResult = result as NodeExecutionResult
      this.triggerWebhook(this.createNodeExecutedEvent(nodeId, node, {
        success: true,
        outputs: nodeExecutionResult as Record<string, unknown>,
        duration: 100,
      }))

      // 保存状态
      if (this.config.enablePersistence) {
        await this.saveExecutionState()
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // 更新节点状态为失败
      this.executionState!.nodeStates[nodeId] = {
        status: 'failed',
        result: {
          success: false,
          error: errorMessage,
        },
      }

      this.emitEvent({
        type: 'node_failed',
        timestamp: new Date().toISOString(),
        nodeId,
        data: { error: errorMessage },
      })

      // 触发 Webhook - 节点执行失败
      this.triggerWebhook(this.createNodeFailedEvent(nodeId, node, errorMessage))

      // 保存状态
      if (this.config.enablePersistence) {
        await this.saveExecutionState()
      }

      throw error
    }
  }

  /**
   * 执行节点逻辑（示例实现）
   */
  private async executeNodeLogic(node: WorkflowNodeData): Promise<unknown> {
    // 这里需要根据节点类型实现具体的执行逻辑
    // 例如：agent 节点调用 AI，condition 节点评估条件等

    console.log(`[VisualWorkflowOrchestrator] 执行节点逻辑: ${node.type}`)

    // 模拟执行延迟
    await new Promise(resolve => setTimeout(resolve, 100))

    // 返回示例结果
    return {
      success: true,
      data: { nodeId: node.id, type: node.type },
    }
  }

  /**
   * 拓扑排序
   */
  private topologicalSort(
    nodes: WorkflowNodeData[],
    dependencies: Map<string, string[]>
  ): string[] {
    const result: string[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (nodeId: string): void => {
      if (visiting.has(nodeId)) {
        throw new Error(`检测到循环依赖: ${nodeId}`)
      }
      if (visited.has(nodeId)) {
        return
      }

      visiting.add(nodeId)

      const deps = dependencies.get(nodeId) || []
      for (const depId of deps) {
        visit(depId)
      }

      visiting.delete(nodeId)
      visited.add(nodeId)
      result.push(nodeId)
    }

    for (const node of nodes) {
      visit(node.id)
    }

    return result
  }

  /**
   * 暂停执行
   */
  async pauseExecution(): Promise<void> {
    if (!this.isExecuting || this.isPaused) {
      return
    }

    this.isPaused = true

    if (this.config.enablePersistence) {
      await executionStateStorage.pauseExecution()
    }

    this.emitEvent({
      type: 'paused',
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * 恢复执行
   */
  async resumeExecutionFromPause(): Promise<void> {
    if (!this.isPaused) {
      return
    }

    this.isPaused = false

    if (this.config.enablePersistence) {
      await executionStateStorage.resumeExecution()
    }

    this.emitEvent({
      type: 'resumed',
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * 取消执行
   */
  async cancelExecution(): Promise<void> {
    if (!this.isExecuting) {
      return
    }

    this.isExecuting = false
    this.stopAutoSave()

    if (this.executionState?.instance) {
      this.executionState.instance.status = 'cancelled'
    }

    if (this.config.enablePersistence) {
      await executionStateStorage.clearExecutionState()
    }

    this.emitEvent({
      type: 'cancelled',
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * 保存执行状态
   */
  private async saveExecutionState(): Promise<void> {
    if (!this.executionState || !this.workflow) {
      return
    }

    const { instance, nodeStates } = this.executionState

    // 找到当前运行的节点
    const currentNodeId = Object.entries(nodeStates).find(
      ([, state]) => state.status === 'running'
    )?.[0] || null

    const persistentState = executionStateStorage.createPersistentState(
      instance.id,
      this.workflow.id,
      instance,
      currentNodeId,
      nodeStates
    )

    await executionStateStorage.saveExecutionState(persistentState)
  }

  /**
   * 启动自动保存
   */
  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
    }

    this.autoSaveTimer = setInterval(() => {
      this.saveExecutionState()
    }, this.config.autoSaveInterval)
  }

  /**
   * 停止自动保存
   */
  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer)
      this.autoSaveTimer = null
    }
  }

  /**
   * 获取执行状态
   */
  getExecutionState(): ExecutionState | null {
    return this.executionState
  }

  /**
   * 获取是否正在执行
   */
  getIsExecuting(): boolean {
    return this.isExecuting
  }

  /**
   * 获取是否暂停
   */
  getIsPaused(): boolean {
    return this.isPaused
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stopAutoSave()
    this.eventListeners.clear()
    this.executionState = null
    this.isExecuting = false
    this.isPaused = false
  }

  // ==================== Webhook 集成 ====================

  /**
   * 触发 Webhook 事件
   * @param event Webhook 事件
   */
  private async triggerWebhook(event: WebhookEvent): Promise<void> {
    try {
      await webhookManager.triggerEvent(event)
    } catch (error) {
      console.error('[VisualWorkflowOrchestrator] Webhook 触发失败:', error)
      // 不阻塞工作流执行
    }
  }

  /**
   * 创建工作流启动事件
   */
  private createWorkflowStartedEvent(instance: WorkflowInstance): WebhookEvent {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: 'workflow.started',
      timestamp: new Date().toISOString(),
      source: 'workflow-orchestrator',
      data: {
        workflowId: instance.workflowId,
        workflowName: this.workflow?.name || 'Unknown',
        workflowVersion: this.workflow?.version,
        executionId: instance.id,
        metadata: {
          inputs: instance.inputs,
          startTime: instance.startTime,
        },
      },
    }
  }

  /**
   * 创建工作流完成事件
   */
  private createWorkflowCompletedEvent(instance: WorkflowInstance): WebhookEvent {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: 'workflow.completed',
      timestamp: new Date().toISOString(),
      source: 'workflow-orchestrator',
      data: {
        workflowId: instance.workflowId,
        workflowName: this.workflow?.name || 'Unknown',
        workflowVersion: this.workflow?.version,
        executionId: instance.id,
        duration: instance.endTime ? instance.endTime - instance.startTime : undefined,
        metadata: {
          outputs: instance.outputs,
          progress: instance.progress,
          endTime: instance.endTime,
        },
      },
    }
  }

  /**
   * 创建工作流失败事件
   */
  private createWorkflowFailedEvent(instance: WorkflowInstance, error: string): WebhookEvent {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: 'workflow.failed',
      timestamp: new Date().toISOString(),
      source: 'workflow-orchestrator',
      data: {
        workflowId: instance.workflowId,
        workflowName: this.workflow?.name || 'Unknown',
        workflowVersion: this.workflow?.version,
        executionId: instance.id,
        error,
        duration: instance.endTime ? instance.endTime - instance.startTime : undefined,
        metadata: {
          progress: instance.progress,
          endTime: instance.endTime,
        },
      },
    }
  }

  /**
   * 创建节点执行事件
   */
  private createNodeExecutedEvent(
    nodeId: string,
    node: WorkflowNodeData,
    result: NodeExecutionResult
  ): WebhookEvent {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: 'workflow.node.executed',
      timestamp: new Date().toISOString(),
      source: 'workflow-orchestrator',
      data: {
        workflowId: this.workflow?.id || 'Unknown',
        workflowName: this.workflow?.name || 'Unknown',
        executionId: this.executionState?.instance.id || 'Unknown',
        nodeId,
        nodeName: node.data?.label || node.id,
        nodeType: node.type,
        duration: result.duration,
        metadata: {
          outputs: result.outputs,
          status: result.success ? 'success' : 'failed',
        },
      },
    }
  }

  /**
   * 创建节点失败事件
   */
  private createNodeFailedEvent(
    nodeId: string,
    node: WorkflowNodeData,
    error: string
  ): WebhookEvent {
    return {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: 'workflow.node.failed',
      timestamp: new Date().toISOString(),
      source: 'workflow-orchestrator',
      data: {
        workflowId: this.workflow?.id || 'Unknown',
        workflowName: this.workflow?.name || 'Unknown',
        executionId: this.executionState?.instance.id || 'Unknown',
        nodeId,
        nodeName: node.data?.label || node.id,
        nodeType: node.type,
        error,
        metadata: {
          nodeData: node.data,
        },
      },
    }
  }
}

// 导出单例实例
export const visualWorkflowOrchestrator = new VisualWorkflowOrchestrator()