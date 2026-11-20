/**
 * 工作流批量执行器
 * v1.11 - 支持批量操作、增量状态更新
 */

import {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowNode,
  NodeExecutionResult,
  NodeStatus,
  InstanceStatus,
} from '@/types/workflow'
import {
  NodeExecutor,
  ExecutionContext,
  ExecutionResult,
  createExecutionContext,
  calculateDuration,
} from './types'
import { nodeExecutorRegistry } from './executors/registry'
import { OptimizedWorkflowExecutor } from './executor-optimized'

/**
 * 批量执行请求
 */
export interface BatchExecutionRequest {
  workflowId: string
  inputs: Record<string, unknown>[]
  options?: {
    triggeredBy: string
    triggerType: 'manual' | 'api' | 'scheduled' | 'webhook'
    parallel?: boolean // 是否并行执行多个实例
    maxConcurrency?: number // 最大并发数
  }
}

/**
 * 批量执行结果
 */
export interface BatchExecutionResult {
  batchId: string
  total: number
  completed: number
  failed: number
  instanceIds: string[]
  errors: Array<{
    index: number
    error: string
  }>
  duration: number
}

/**
 * 增量状态更新
 */
export interface IncrementalStateUpdate {
  instanceId: string
  nodeId: string
  updates: Partial<NodeExecutionResult>
  timestamp: string
}

/**
 * 状态变更事件
 */
export interface StateChangeEvent {
  type: 'node_status' | 'instance_status' | 'variable_update' | 'progress_update'
  instanceId: string
  nodeId?: string
  oldValue: unknown
  newValue: unknown
  timestamp: string
}

/**
 * 批量工作流执行器
 */
export class BatchWorkflowExecutor {
  private baseExecutor: OptimizedWorkflowExecutor
  private stateChangeListeners: Array<(event: StateChangeEvent) => void> = []
  private incrementalUpdates: Map<string, IncrementalStateUpdate[]> = new Map()

  constructor(baseExecutor: OptimizedWorkflowExecutor) {
    this.baseExecutor = baseExecutor
  }

  /**
   * 批量执行工作流
   */
  async executeBatch(request: BatchExecutionRequest): Promise<BatchExecutionResult> {
    const startTime = Date.now()
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const result: BatchExecutionResult = {
      batchId,
      total: request.inputs.length,
      completed: 0,
      failed: 0,
      instanceIds: [],
      errors: [],
      duration: 0,
    }

    const { parallel = true, maxConcurrency = 5 } = request.options || {}

    if (parallel) {
      // 并行执行（带并发限制）
      const chunks = this.chunkArray(request.inputs, maxConcurrency)

      for (const chunk of chunks) {
        const results = await Promise.allSettled(
          chunk.map((inputs, index) =>
            this.executeSingle(request.workflowId, inputs, request.options, index)
          )
        )

        for (const r of results) {
          if (r.status === 'fulfilled') {
            result.instanceIds.push(r.value.instanceId)
            if (r.value.success) {
              result.completed++
            } else {
              result.failed++
              result.errors.push({
                index: r.value.index,
                error: r.value.error || 'Unknown error',
              })
            }
          } else {
            result.failed++
            result.errors.push({
              index: -1,
              error: r.reason?.message || 'Unknown error',
            })
          }
        }
      }
    } else {
      // 顺序执行
      for (let i = 0; i < request.inputs.length; i++) {
        try {
          const r = await this.executeSingle(
            request.workflowId,
            request.inputs[i],
            request.options,
            i
          )
          result.instanceIds.push(r.instanceId)
          if (r.success) {
            result.completed++
          } else {
            result.failed++
            result.errors.push({
              index: i,
              error: r.error || 'Unknown error',
            })
          }
        } catch (error) {
          result.failed++
          result.errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }
    }

    result.duration = Date.now() - startTime
    return result
  }

  /**
   * 执行单个工作流实例
   */
  private async executeSingle(
    workflowId: string,
    inputs: Record<string, unknown>,
    options?: {
      triggeredBy: string
      triggerType: 'manual' | 'api' | 'scheduled' | 'webhook'
    },
    index: number = 0
  ): Promise<{
    instanceId: string
    success: boolean
    error?: string
    index: number
  }> {
    try {
      const instance = this.baseExecutor.createInstance(workflowId, inputs, options)
      const result = await this.baseExecutor.executeInstance(instance.id)

      return {
        instanceId: instance.id,
        success: result.status === InstanceStatus.COMPLETED,
        error: result.error?.message,
        index,
      }
    } catch (error) {
      return {
        instanceId: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        index,
      }
    }
  }

  /**
   * 数组分块
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * 添加状态变更监听器
   */
  addStateChangeListener(listener: (event: StateChangeEvent) => void): void {
    this.stateChangeListeners.push(listener)
  }

  /**
   * 移除状态变更监听器
   */
  removeStateChangeListener(listener: (event: StateChangeEvent) => void): void {
    const index = this.stateChangeListeners.indexOf(listener)
    if (index > -1) {
      this.stateChangeListeners.splice(index, 1)
    }
  }

  /**
   * 触发状态变更事件
   */
  private emitStateChange(event: StateChangeEvent): void {
    for (const listener of this.stateChangeListeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('State change listener error:', error)
      }
    }
  }

  /**
   * 记录增量状态更新
   */
  recordIncrementalUpdate(
    instanceId: string,
    nodeId: string,
    updates: Partial<NodeExecutionResult>
  ): void {
    const update: IncrementalStateUpdate = {
      instanceId,
      nodeId,
      updates,
      timestamp: new Date().toISOString(),
    }

    if (!this.incrementalUpdates.has(instanceId)) {
      this.incrementalUpdates.set(instanceId, [])
    }

    this.incrementalUpdates.get(instanceId)!.push(update)

    // 触发状态变更事件
    this.emitStateChange({
      type: 'node_status',
      instanceId,
      nodeId,
      oldValue: null, // 可以从上一次更新中获取
      newValue: updates,
      timestamp: update.timestamp,
    })
  }

  /**
   * 获取实例的增量更新历史
   */
  getIncrementalUpdates(instanceId: string): IncrementalStateUpdate[] {
    return this.incrementalUpdates.get(instanceId) || []
  }

  /**
   * 应用增量更新到实例
   */
  applyIncrementalUpdates(
    instance: WorkflowInstance,
    updates: IncrementalStateUpdate[]
  ): WorkflowInstance {
    for (const update of updates) {
      const currentResult = instance.nodeResults.get(update.nodeId)
      if (currentResult) {
        instance.nodeResults.set(update.nodeId, {
          ...currentResult,
          ...update.updates,
        } as NodeExecutionResult)
      }
    }
    return instance
  }

  /**
   * 清除增量更新历史
   */
  clearIncrementalUpdates(instanceId: string): void {
    this.incrementalUpdates.delete(instanceId)
  }

  /**
   * 获取批量执行统计
   */
  getBatchStatistics(batchId: string): {
    batchId: string
    totalUpdates: number
    avgUpdatesPerInstance: number
  } {
    let totalUpdates = 0
    const instanceCount = this.incrementalUpdates.size

    for (const [, updates] of this.incrementalUpdates) {
      totalUpdates += updates.length
    }

    return {
      batchId,
      totalUpdates,
      avgUpdatesPerInstance: instanceCount > 0 ? totalUpdates / instanceCount : 0,
    }
  }
}

// 导出单例实例
import { optimizedWorkflowExecutor } from './executor-optimized'
export const batchWorkflowExecutor = new BatchWorkflowExecutor(optimizedWorkflowExecutor)