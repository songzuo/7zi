/**
 * PerformanceMonitor - 性能监控器
 * 使用 AutoCleanMap 防止内存泄漏
 */

import { AutoCleanMap } from '../utils/AutoCleanMap'
import { ResourceManager, Disposable } from '../utils/ResourceManager'

/**
 * 操作记录
 */
export interface Operation {
  id: string
  name: string
  startTime: number
  endTime?: number
  duration?: number
  metadata?: Record<string, unknown>
  status: 'running' | 'completed' | 'failed'
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  totalOperations: number
  activeOperations: number
  averageDuration: number
  successRate: number
  p50Duration: number
  p95Duration: number
  p99Duration: number
}

/**
 * 监控器配置
 */
export interface PerformanceMonitorOptions {
  /** 操作最大存活时间 (毫秒)，默认 5 分钟 */
  maxOperationAge?: number
  /** 是否自动收集指标 */
  autoCollectMetrics?: boolean
  /** 指标收集间隔 (毫秒) */
  metricsInterval?: number
}

/**
 * 性能监控器
 * 跟踪和记录操作的性能数据，自动清理过期操作
 *
 * @example
 * const monitor = new PerformanceMonitor({ maxOperationAge: 300000 });
 *
 * // 开始操作
 * const opId = monitor.startOperation('api-call', { endpoint: '/users' });
 *
 * // 结束操作
 * monitor.endOperation(opId, 'completed');
 *
 * // 获取指标
 * const metrics = monitor.getMetrics();
 */
export class PerformanceMonitor implements Disposable {
  private activeOperations: AutoCleanMap<string, Operation>
  private completedOperations: Operation[] = []
  private resourceManager: ResourceManager
  private maxCompletedOperations: number = 1000
  private isDisposed: boolean = false

  constructor(options: PerformanceMonitorOptions = {}) {
    const maxAge = options.maxOperationAge ?? 300000 // 5 分钟

    // 使用 AutoCleanMap 防止内存泄漏
    this.activeOperations = new AutoCleanMap<string, Operation>({
      maxAge,
      cleanupInterval: Math.min(maxAge / 5, 60000),
      onExpire: (id: unknown, operation: unknown) => {
        const opId = id as string
        const op = operation as Operation
        console.warn(`[PerformanceMonitor] 操作 ${opId} (${op.name}) 超时未完成，已自动清理`)
        // 记录为失败
        op.status = 'failed'
        op.endTime = Date.now()
        op.duration = op.endTime - op.startTime
        this.addToCompleted(op)
      },
    })

    this.resourceManager = new ResourceManager({
      name: 'PerformanceMonitor',
    })

    // 注册清理资源
    this.resourceManager.register({
      dispose: () => this.activeOperations.destroy(),
    })
  }

  /**
   * 开始一个操作
   * @param name 操作名称
   * @param metadata 操作元数据
   * @returns 操作ID
   */
  startOperation(name: string, metadata?: Record<string, unknown>): string {
    if (this.isDisposed) {
      throw new Error('[PerformanceMonitor] 已 disposed，无法启动新操作')
    }

    const id = this.generateId()
    const operation: Operation = {
      id,
      name,
      startTime: Date.now(),
      metadata,
      status: 'running',
    }

    this.activeOperations.set(id, operation)
    return id
  }

  /**
   * 结束一个操作
   * @param id 操作ID
   * @param status 操作状态
   * @param metadata 额外元数据
   */
  endOperation(
    id: string,
    status: 'completed' | 'failed' = 'completed',
    metadata?: Record<string, unknown>
  ): void {
    const operation = this.activeOperations.get(id)
    if (!operation) {
      console.warn(`[PerformanceMonitor] 未找到操作 ${id}`)
      return
    }

    operation.endTime = Date.now()
    operation.duration = operation.endTime - operation.startTime
    operation.status = status

    // 合并元数据
    if (metadata) {
      operation.metadata = {
        ...operation.metadata,
        ...metadata,
      }
    }

    // 从活动操作中移除
    this.activeOperations.delete(id)

    // 添加到已完成操作
    this.addToCompleted(operation)
  }

  /**
   * 获取当前活动操作
   */
  getActiveOperations(): Operation[] {
    const operations: Operation[] = []
    this.activeOperations.forEach(op => {
      operations.push(op)
    })
    return operations
  }

  /**
   * 获取操作
   */
  getOperation(id: string): Operation | undefined {
    return this.activeOperations.get(id)
  }

  /**
   * 获取性能指标
   */
  getMetrics(): PerformanceMetrics {
    const allOperations = [...this.getActiveOperations(), ...this.completedOperations]

    const completedCount = allOperations.filter(op => op.status === 'completed').length
    const failedCount = allOperations.filter(op => op.status === 'failed').length
    const totalCompleted = completedCount + failedCount

    const durations = allOperations
      .filter(op => op.duration !== undefined)
      .map(op => op.duration!)
      .sort((a, b) => a - b)

    return {
      totalOperations: allOperations.length,
      activeOperations: this.activeOperations.size,
      averageDuration: this.calculateAverage(durations),
      successRate: totalCompleted > 0 ? completedCount / totalCompleted : 0,
      p50Duration: this.calculatePercentile(durations, 50),
      p95Duration: this.calculatePercentile(durations, 95),
      p99Duration: this.calculatePercentile(durations, 99),
    }
  }

  /**
   * 清除所有已完成操作
   */
  clearCompleted(): void {
    this.completedOperations = []
  }

  /**
   * 释放资源
   */
  async dispose(): Promise<void> {
    if (this.isDisposed) return
    this.isDisposed = true

    // 记录未完成的操作
    const activeOps = this.getActiveOperations()
    for (const op of activeOps) {
      console.warn(`[PerformanceMonitor] 操作 ${op.id} (${op.name}) 未完成即被清理`)
    }

    await this.resourceManager.dispose()
    this.completedOperations = []
  }

  /**
   * 添加到已完成操作列表
   */
  private addToCompleted(operation: Operation): void {
    this.completedOperations.push(operation)

    // 限制已完成操作数量，防止内存泄漏
    if (this.completedOperations.length > this.maxCompletedOperations) {
      this.completedOperations = this.completedOperations.slice(-this.maxCompletedOperations)
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 计算平均值
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((a, b) => a + b, 0) / values.length
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))]
  }
}

// 导出单例（可选）
let defaultMonitor: PerformanceMonitor | null = null

export function getDefaultMonitor(options?: PerformanceMonitorOptions): PerformanceMonitor {
  if (!defaultMonitor) {
    defaultMonitor = new PerformanceMonitor(options)
  }
  return defaultMonitor
}

export function resetDefaultMonitor(): void {
  if (defaultMonitor) {
    defaultMonitor.dispose()
    defaultMonitor = null
  }
}

export default PerformanceMonitor
