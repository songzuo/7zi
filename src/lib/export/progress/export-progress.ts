// @ts-nocheck
/**
 * @fileoverview 增强的导出进度跟踪系统
 * @description 支持实时进度更新、多个监听器、进度历史记录
 * @version 1.0.0
 */

import { EventEmitter } from 'events'

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 导出阶段
 */
export type ExportStage = 
  | 'initializing'
  | 'preparing'
  | 'fetching'
  | 'filtering'
  | 'transforming'
  | 'exporting'
  | 'writing'
  | 'compressing'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'cancelled'

/**
 * 详细进度信息
 */
export interface ExportProgressDetail {
  /** 导出ID */
  exportId: string
  /** 总体进度 (0-100) */
  overallProgress: number
  /** 当前阶段 */
  stage: ExportStage
  /** 阶段进度 (0-100) */
  stageProgress: number
  /** 阶段描述 */
  stageDescription: string
  /** 总记录数 */
  totalRecords: number
  /** 已处理记录数 */
  processedRecords: number
  /** 已处理字节数 */
  processedBytes: number
  /** 总字节数 (预估) */
  totalBytes?: number
  /** 当前处理的项目名称 */
  currentItemName?: string
  /** 当前处理的项目索引 */
  currentItemIndex?: number
  /** 总项目数 */
  totalItems?: number
  /** 预估剩余时间 (秒) */
  estimatedRemainingSeconds?: number
  /** 速度 (记录/秒) */
  speedRecordsPerSecond?: number
  /** 速度 (字节/秒) */
  speedBytesPerSecond?: number
  /** 警告信息 */
  warnings?: string[]
  /** 错误信息 */
  error?: string
  /** 开始时间 */
  startTime: string
  /** 更新时间 */
  updateTime: string
  /** 完成时间 */
  completionTime?: string
  /** 状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
}

/**
 * 进度监听器
 */
export interface ProgressListener {
  /** 监听器ID */
  id: string
  /** 回调函数 */
  callback: (progress: ExportProgressDetail) => void
  /** 过滤条件 */
  filter?: {
    exportIds?: string[]
    minProgress?: number
  }
  /** 创建时间 */
  createdAt: string
}

/**
 * 进度历史记录
 */
export interface ProgressHistoryEntry {
  timestamp: string
  progress: number
  stage: ExportStage
  message: string
}

/**
 * 进度跟踪器配置
 */
export interface ProgressTrackerConfig {
  /** 导出ID */
  exportId: string
  /** 总记录数 */
  totalRecords: number
  /** 总项目数 (批量导出时使用) */
  totalItems?: number
  /** 预估总字节数 */
  estimatedTotalBytes?: number
  /** 启用速度计算 */
  enableSpeedCalculation?: boolean
  /** 启用预估时间 */
  enableEstimatedTime?: boolean
  /** 进度更新间隔 (毫秒) */
  updateIntervalMs?: number
  /** 最小进度变化阈值 (百分比) */
  minProgressDelta?: number
}

// ============================================================================
// 进度跟踪器类
// ============================================================================

/**
 * 进度跟踪器
 */
export class ExportProgressTracker extends EventEmitter {
  private exportId: string
  private totalRecords: number
  private totalItems?: number
  private estimatedTotalBytes?: number
  private processedRecords: number = 0
  private processedBytes: number = 0
  private stage: ExportStage = 'initializing'
  private stageProgress: number = 0
  private status: ExportProgressDetail['status'] = 'pending'
  private startTime: Date
  private lastUpdateTime: Date
  private lastProgress: number = 0
  private lastProcessedRecords: number = 0
  private lastProcessedTime: number = 0
  private enableSpeedCalculation: boolean
  private enableEstimatedTime: boolean
  private updateIntervalMs: number
  private minProgressDelta: number
  private history: ProgressHistoryEntry[] = []
  private warnings: string[] = []
  private currentItemName?: string
  private currentItemIndex?: number
  constructor(config: ProgressTrackerConfig) {
    super()
    this.exportId = config.exportId
    this.totalRecords = config.totalRecords
    this.totalItems = config.totalItems
    this.estimatedTotalBytes = config.estimatedTotalBytes
    this.enableSpeedCalculation = config.enableSpeedCalculation ?? true
    this.enableEstimatedTime = config.enableEstimatedTime ?? true
    this.updateIntervalMs = config.updateIntervalMs ?? 100
    this.minProgressDelta = config.minProgressDelta ?? 1

    this.startTime = new Date()
    this.lastUpdateTime = new Date()
  }

  /**
   * 开始跟踪
   */
  start(): void {
    this.status = 'running'
    this.stage = 'preparing'
    this.stageProgress = 0
    this.addHistory(0, 'initializing', 'Export started')
    this.emitProgress()
  }

  /**
   * 设置阶段
   */
  setStage(stage: ExportStage, description?: string): void {
    const previousStage = this.stage
    this.stage = stage
    this.stageProgress = 0
    
    this.addHistory(
      this.calculateOverallProgress(),
      stage,
      description || this.getStageDescription(stage)
    )

    // 如果阶段改变，发送事件
    if (previousStage !== stage) {
      this.emit('stageChange', {
        exportId: this.exportId,
        previousStage,
        currentStage: stage,
        progress: this.getProgress(),
      })
    }

    this.emitProgress()
  }

  /**
   * 更新阶段进度
   */
  updateStageProgress(stageProgress: number): void {
    this.stageProgress = Math.min(100, Math.max(0, stageProgress))
    this.emitProgress()
  }

  /**
   * 更新处理记录数
   */
  updateProcessedRecords(count: number): void {
    this.processedRecords = Math.min(this.totalRecords, Math.max(0, count))
    this.emitProgress()
  }

  /**
   * 增加处理记录数
   */
  addProcessedRecords(count: number): void {
    this.processedRecords = Math.min(this.totalRecords, this.processedRecords + count)
    this.emitProgress()
  }

  /**
   * 更新处理字节数
   */
  updateProcessedBytes(bytes: number): void {
    this.processedBytes = Math.min(this.estimatedTotalBytes || Infinity, Math.max(0, bytes))
    this.emitProgress()
  }

  /**
   * 设置当前项目
   */
  setCurrentItem(name: string, index: number): void {
    this.currentItemName = name
    this.currentItemIndex = index
    this.emitProgress()
  }

  /**
   * 添加警告
   */
  addWarning(warning: string): void {
    this.warnings.push(warning)
    this.emit('warning', {
      exportId: this.exportId,
      warning,
      progress: this.getProgress(),
    })
    this.emitProgress()
  }

  /**
   * 标记完成
   */
  complete(): void {
    this.status = 'completed'
    this.processedRecords = this.totalRecords
    this.stageProgress = 100
    
    this.addHistory(100, 'completed', 'Export completed successfully')
    
    this.emit('complete', {
      exportId: this.exportId,
      progress: this.getProgress(),
      duration: this.getDuration(),
    })
    
    this.emitProgress()
  }

  /**
   * 标记失败
   */
  fail(error: string): void {
    this.status = 'failed'
    
    this.addHistory(
      this.calculateOverallProgress(),
      'failed',
      error
    )
    
    this.emit('error', {
      exportId: this.exportId,
      error,
      progress: this.getProgress(),
    })
    
    this.emitProgress()
  }

  /**
   * 取消
   */
  cancel(): void {
    this.status = 'cancelled'
    
    this.addHistory(
      this.calculateOverallProgress(),
      'cancelled',
      'Export cancelled by user'
    )
    
    this.emit('cancel', {
      exportId: this.exportId,
      progress: this.getProgress(),
    })
    
    this.emitProgress()
  }

  /**
   * 获取当前进度
   */
  getProgress(): ExportProgressDetail {
    const overallProgress = this.calculateOverallProgress()
    const now = Date.now()
    const durationSeconds = (now - this.startTime.getTime()) / 1000

    // 计算速度
    let speedRecordsPerSecond: number | undefined
    let speedBytesPerSecond: number | undefined
    let estimatedRemainingSeconds: number | undefined

    if (this.enableSpeedCalculation && this.lastProcessedTime > 0) {
      const timeDiff = (now - this.lastProcessedTime) / 1000
      const recordsDiff = this.processedRecords - this.lastProcessedRecords
      
      if (timeDiff > 0) {
        speedRecordsPerSecond = recordsDiff / timeDiff
        
        if (this.estimatedTotalBytes && this.processedBytes > 0) {
          const bytesPerRecord = this.processedBytes / this.processedRecords
          speedBytesPerSecond = speedRecordsPerSecond * bytesPerRecord
        }
        
        // 预估剩余时间
        if (this.enableEstimatedTime && speedRecordsPerSecond > 0) {
          const remainingRecords = this.totalRecords - this.processedRecords
          estimatedRemainingSeconds = remainingRecords / speedRecordsPerSecond
        }
      }
    }

    // 更新上次记录
    this.lastProcessedTime = now
    this.lastProcessedRecords = this.processedRecords
    this.lastUpdateTime = new Date()

    return {
      exportId: this.exportId,
      overallProgress,
      stage: this.stage,
      stageProgress: this.stageProgress,
      stageDescription: this.getStageDescription(this.stage),
      totalRecords: this.totalRecords,
      processedRecords: this.processedRecords,
      processedBytes: this.processedBytes,
      totalBytes: this.estimatedTotalBytes,
      currentItemName: this.currentItemName,
      currentItemIndex: this.currentItemIndex,
      totalItems: this.totalItems,
      estimatedRemainingSeconds,
      speedRecordsPerSecond,
      speedBytesPerSecond,
      warnings: this.warnings.length > 0 ? [...this.warnings] : undefined,
      startTime: this.startTime.toISOString(),
      updateTime: new Date().toISOString(),
      completionTime: this.status === 'completed' || this.status === 'failed' ? new Date().toISOString() : undefined,
      status: this.status,
    }
  }

  /**
   * 获取进度历史
   */
  getHistory(): ProgressHistoryEntry[] {
    return [...this.history]
  }

  /**
   * 获取持续时间 (毫秒)
   */
  getDuration(): number {
    const endTime = this.status === 'completed' || this.status === 'failed' || this.status === 'cancelled'
      ? new Date()
      : new Date()
    return endTime.getTime() - this.startTime.getTime()
  }

  /**
   * 获取状态
   */
  getStatus(): ExportProgressDetail['status'] {
    return this.status
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 计算总体进度
   */
  private calculateOverallProgress(): number {
    // 基础进度来自已处理记录
    let recordProgress = this.totalRecords > 0
      ? (this.processedRecords / this.totalRecords) * 70
      : 0

    // 阶段进度贡献 (最多 30%)
    let stageProgressContribution = (this.stageProgress / 100) * 30

    // 如果有多个项目，项目进度贡献
    if (this.totalItems && this.totalItems > 1 && this.currentItemIndex !== undefined) {
      const itemProgress = (this.currentItemIndex / this.totalItems) * 100
      recordProgress = (itemProgress / 100) * 70
      stageProgressContribution = ((this.currentItemIndex + 1) / this.totalItems / 100) * 30
    }

    const overall = Math.min(100, recordProgress + stageProgressContribution)
    return Math.floor(overall)
  }

  /**
   * 发送进度更新
   */
  private emitProgress(): void {
    const progress = this.getProgress()
    
    // 检查最小进度变化
    if (Math.abs(progress.overallProgress - this.lastProgress) >= this.minProgressDelta) {
      this.lastProgress = progress.overallProgress
      this.emit('progress', progress)
    }
  }

  /**
   * 添加历史记录
   */
  private addHistory(progress: number, stage: ExportStage, message: string): void {
    this.history.push({
      timestamp: new Date().toISOString(),
      progress,
      stage,
      message,
    })

    // 限制历史记录数量
    if (this.history.length > 100) {
      this.history = this.history.slice(-100)
    }
  }

  /**
   * 获取阶段描述
   */
  private getStageDescription(stage: ExportStage): string {
    const descriptions: Record<ExportStage, string> = {
      initializing: 'Initializing export...',
      preparing: 'Preparing data...',
      fetching: 'Fetching data from source...',
      filtering: 'Applying filters...',
      transforming: 'Transforming data...',
      exporting: 'Exporting to file...',
      writing: 'Writing to disk...',
      compressing: 'Compressing file...',
      uploading: 'Uploading to storage...',
      completed: 'Export completed',
      failed: 'Export failed',
      cancelled: 'Export cancelled',
    }
    return descriptions[stage]
  }
}

// ============================================================================
// 进度管理器
// ============================================================================

/**
 * 进度管理器 - 管理多个导出任务的进度
 */
export class ExportProgressManager extends EventEmitter {
  private trackers: Map<string, ExportProgressTracker> = new Map()
  private progressListeners: Map<string, ProgressListener> = new Map()
  private maxTrackers: number = 100
  private cleanupInterval?: NodeJS.Timeout

  constructor() {
    super()
    this.startCleanup()
  }

  /**
   * 创建进度跟踪器
   */
  createTracker(config: ProgressTrackerConfig): ExportProgressTracker {
    // 清理旧的跟踪器
    if (this.trackers.size >= this.maxTrackers) {
      this.cleanup()
    }

    const tracker = new ExportProgressTracker(config)

    // 设置事件转发
    tracker.on('progress', (progress) => this.notifyListeners(progress))
    tracker.on('complete', (data) => this.emit('complete', data))
    tracker.on('error', (data) => this.emit('error', data))
    tracker.on('cancel', (data) => this.emit('cancel', data))
    tracker.on('warning', (data) => this.emit('warning', data))
    tracker.on('stageChange', (data) => this.emit('stageChange', data))

    this.trackers.set(config.exportId, tracker)
    return tracker
  }

  /**
   * 获取跟踪器
   */
  getTracker(exportId: string): ExportProgressTracker | undefined {
    return this.trackers.get(exportId)
  }

  /**
   * 获取所有跟踪器
   */
  getAllTrackers(): ExportProgressTracker[] {
    return Array.from(this.trackers.values())
  }

  /**
   * 获取进度
   */
  getProgress(exportId: string): ExportProgressDetail | null {
    const tracker = this.trackers.get(exportId)
    return tracker ? tracker.getProgress() : null
  }

  /**
   * 删除跟踪器
   */
  removeTracker(exportId: string): boolean {
    const tracker = this.trackers.get(exportId)
    if (tracker) {
      // 移除所有关联的监听器
      this.progressListeners.forEach((listener, listenerId) => {
        if (listener.filter?.exportIds?.includes(exportId)) {
          this.removeProgressListener(listenerId)
        }
      })

      this.trackers.delete(exportId)
      return true
    }
    return false
  }

  /**
   * 添加进度监听器
   */
  addProgressListener(
    listener: Omit<ProgressListener, 'id' | 'createdAt'>
  ): string {
    const id = `listener_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const fullListener: ProgressListener = {
      ...listener,
      id,
      createdAt: new Date().toISOString(),
    }

    this.progressListeners.set(id, fullListener)
    return id
  }

  /**
   * 移除监听器
   */
  removeProgressListener(listenerId: string): boolean {
    return this.progressListeners.delete(listenerId)
  }

  /**
   * 通知监听器
   */
  private notifyListeners(progress: ExportProgressDetail): void {
    this.progressListeners.forEach(listener => {
      // 检查过滤条件
      if (listener.filter) {
        if (listener.filter.exportIds && !listener.filter.exportIds.includes(progress.exportId)) {
          return
        }
        if (listener.filter.minProgress !== undefined && progress.overallProgress < listener.filter.minProgress) {
          return
        }
      }

      // 调用回调
      try {
        listener.callback(progress)
      } catch (error) {
        console.error('[ExportProgressManager] Listener error:', error)
      }
    })
  }

  /**
   * 清理完成的跟踪器
   */
  private cleanup(): void {
    const completedStatuses: ExportProgressDetail['status'][] = ['completed', 'failed', 'cancelled']
    
    this.trackers.forEach((tracker, exportId) => {
      if (completedStatuses.includes(tracker.getStatus())) {
        this.trackers.delete(exportId)
      }
    })
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000) // 5 分钟
  }

  /**
   * 关闭管理器
   */
  close(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.trackers.clear()
    this.progressListeners.clear()
  }
}
