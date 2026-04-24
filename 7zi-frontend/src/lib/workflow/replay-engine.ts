/**
 * Workflow Replay Engine
 *
 * ⚡ 执行回放引擎
 * 版本: v1.12.3
 *
 * 负责执行历史的回放，支持逐节点推进、暂停、恢复、快进等功能
 */

import type {
  ExecutionHistory,
  NodeExecution,
  NodeExecutionStatus,
  TriggerType,
} from './execution-history-store'

// Re-export types for external consumers (e.g., tests)
export type { ExecutionHistory, NodeExecution }
export { NodeExecutionStatus, TriggerType }

/**
 * 回放步骤类型
 */
export type ReplayStepType = 'enter' | 'exit'

/**
 * 回放步骤
 */
export interface ReplayStep {
  /** 步骤索引 */
  index: number
  /** 节点 ID */
  nodeId: string
  /** 节点名称 */
  nodeName: string
  /** 节点类型 */
  nodeType: string
  /** 步骤类型 */
  type: ReplayStepType
  /** 时间戳 */
  timestamp: number
  /** 相对时间（毫秒） */
  relativeTime: number
  /** 数据快照 */
  data?: {
    input?: unknown
    output?: unknown
    error?: string
    status: string
  }
}

/**
 * 回放状态
 */
export type ReplayState = 'idle' | 'playing' | 'paused' | 'completed'

/**
 * 回放配置
 */
export interface ReplayConfig {
  /** 自动播放 */
  autoPlay?: boolean
  /** 播放速度 */
  speed?: number
  /** 步进间隔（毫秒） */
  stepInterval?: number
}

/**
 * 回放事件类型
 */
export type ReplayEventType = 'step' | 'play' | 'pause' | 'complete' | 'reset' | 'seek'

/**
 * 回放事件
 */
export interface ReplayEvent {
  type: ReplayEventType
  step?: ReplayStep
  state?: ReplayState
  currentStepIndex?: number
  totalSteps?: number
}

/**
 * 回放事件监听器
 */
export type ReplayEventListener = (event: ReplayEvent) => void

/**
 * 工作流回放引擎
 */
export class WorkflowReplayEngine {
  private history: ExecutionHistory | null = null
  private steps: ReplayStep[] = []
  private currentStepIndex = -1
  private state: ReplayState = 'idle'
  private config: Required<ReplayConfig>
  private eventListeners: Set<ReplayEventListener> = new Set()
  private animationFrameId: number | null = null
  private lastStepTime = 0

  constructor(config: ReplayConfig = {}) {
    this.config = {
      autoPlay: config.autoPlay ?? false,
      speed: config.speed ?? 1,
      stepInterval: config.stepInterval ?? 1000,
    }
  }

  /**
   * 加载执行历史
   */
  load(history: ExecutionHistory): void {
    this.history = history
    this.generateSteps()
    this.reset()
  }

  /**
   * 生成回放步骤
   */
  private generateSteps(): void {
    if (!this.history) {
      return
    }

    this.steps = []
    const startTime = this.history.startTime

    // 遍历所有节点执行记录
    const nodeExecutions = this.history.nodeExecutions

    for (const [nodeId, execution] of Object.entries(nodeExecutions)) {
      const nodeName = execution.nodeName || nodeId
      const nodeType = execution.nodeType || 'unknown'

      // 添加进入步骤
      this.steps.push({
        index: this.steps.length,
        nodeId,
        nodeName,
        nodeType,
        type: 'enter',
        timestamp: execution.enterTime,
        relativeTime: execution.enterTime - startTime,
        data: {
          input: execution.input,
          status: execution.status,
        },
      })

      // 如果有退出时间，添加退出步骤
      if (execution.exitTime) {
        this.steps.push({
          index: this.steps.length,
          nodeId,
          nodeName,
          nodeType,
          type: 'exit',
          timestamp: execution.exitTime,
          relativeTime: execution.exitTime - startTime,
          data: {
            output: execution.output,
            error: execution.error,
            status: execution.status,
          },
        })
      }
    }

    // 按时间戳排序
    this.steps.sort((a, b) => a.timestamp - b.timestamp)

    // 重新设置索引
    this.steps.forEach((step, index) => {
      step.index = index
    })
  }

  /**
   * 开始回放
   */
  play(): void {
    if (this.state === 'playing') {
      return
    }

    if (this.steps.length === 0) {
      return
    }

    this.state = 'playing'
    this.emitEvent({ type: 'play', state: this.state })

    if (this.currentStepIndex < 0) {
      this.currentStepIndex = 0
    }

    this.startAnimation()
  }

  /**
   * 暂停回放
   */
  pause(): void {
    if (this.state !== 'playing') {
      return
    }

    this.state = 'paused'
    this.stopAnimation()
    this.emitEvent({ type: 'pause', state: this.state })
  }

  /**
   * 恢复回放
   */
  resume(): void {
    if (this.state !== 'paused') {
      return
    }

    this.play()
  }

  /**
   * 停止回放
   */
  stop(): void {
    this.stopAnimation()
    this.reset()
    this.state = 'idle'
    this.emitEvent({ type: 'reset', state: this.state })
  }

  /**
   * 重置回放
   */
  reset(): void {
    this.stopAnimation()
    this.currentStepIndex = -1
    this.state = 'idle'
    this.emitEvent({
      type: 'reset',
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
    })
  }

  /**
   * 跳到下一步
   */
  nextStep(): ReplayStep | null {
    if (this.currentStepIndex >= this.steps.length - 1) {
      return null
    }

    this.currentStepIndex++
    const step = this.steps[this.currentStepIndex]

    this.emitEvent({
      type: 'step',
      step,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
    })

    if (this.currentStepIndex >= this.steps.length - 1) {
      this.state = 'completed'
      this.emitEvent({ type: 'complete', state: this.state })
    }

    return step
  }

  /**
   * 返回上一步
   */
  previousStep(): ReplayStep | null {
    if (this.currentStepIndex <= 0) {
      return null
    }

    this.currentStepIndex--
    const step = this.steps[this.currentStepIndex]

    this.emitEvent({
      type: 'step',
      step,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
    })

    return step
  }

  /**
   * 跳到指定步骤
   */
  seekToStep(index: number): ReplayStep | null {
    if (index < 0 || index >= this.steps.length) {
      return null
    }

    this.currentStepIndex = index
    const step = this.steps[this.currentStepIndex]

    this.emitEvent({
      type: 'seek',
      step,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.steps.length,
    })

    return step
  }

  /**
   * 跳到指定时间点
   */
  seekToTime(relativeTime: number): ReplayStep | null {
    // 找到最近的步骤
    let targetIndex = -1

    for (let i = 0; i < this.steps.length; i++) {
      if (this.steps[i].relativeTime <= relativeTime) {
        targetIndex = i
      } else {
        break
      }
    }

    if (targetIndex < 0) {
      targetIndex = 0
    }

    return this.seekToStep(targetIndex)
  }

  /**
   * 快进到指定节点
   */
  fastForwardToNode(nodeId: string): ReplayStep | null {
    const stepIndex = this.steps.findIndex(s => s.nodeId === nodeId && s.type === 'enter')

    if (stepIndex < 0) {
      return null
    }

    return this.seekToStep(stepIndex)
  }

  /**
   * 跳到执行完成
   */
  skipToEnd(): ReplayStep | null {
    if (this.steps.length === 0) {
      return null
    }

    return this.seekToStep(this.steps.length - 1)
  }

  /**
   * 设置播放速度
   */
  setSpeed(speed: number): void {
    this.config.speed = Math.max(0.1, Math.min(10, speed))
  }

  /**
   * 获取当前步骤
   */
  getCurrentStep(): ReplayStep | null {
    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.steps.length) {
      return null
    }
    return this.steps[this.currentStepIndex]
  }

  /**
   * 获取所有步骤
   */
  getSteps(): ReplayStep[] {
    return [...this.steps]
  }

  /**
   * 获取当前状态
   */
  getState(): ReplayState {
    return this.state
  }

  /**
   * 获取当前步骤索引
   */
  getCurrentStepIndex(): number {
    return this.currentStepIndex
  }

  /**
   * 获取总步骤数
   */
  getTotalSteps(): number {
    return this.steps.length
  }

  /**
   * 获取当前节点的执行详情
   */
  getCurrentNodeExecution(): NodeExecution | null {
    const currentStep = this.getCurrentStep()
    if (!currentStep || !this.history) {
      return null
    }

    return this.history.nodeExecutions[currentStep.nodeId] || null
  }

  /**
   * 获取执行历史
   */
  getHistory(): ExecutionHistory | null {
    return this.history
  }

  /**
   * 获取执行时长
   */
  getDuration(): number {
    if (!this.history || !this.history.duration) {
      return 0
    }
    return this.history.duration
  }

  /**
   * 获取当前相对时间
   */
  getCurrentRelativeTime(): number {
    const currentStep = this.getCurrentStep()
    if (!currentStep) {
      return 0
    }
    return currentStep.relativeTime
  }

  /**
   * 添加事件监听器
   */
  addEventListener(listener: ReplayEventListener): void {
    this.eventListeners.add(listener)
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(listener: ReplayEventListener): void {
    this.eventListeners.delete(listener)
  }

  /**
   * 触发事件
   */
  private emitEvent(event: ReplayEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('[WorkflowReplayEngine] 事件监听器错误:', error)
      }
    })
  }

  /**
   * 开始动画循环
   */
  private startAnimation(): void {
    this.lastStepTime = performance.now()
    this.animate()
  }

  /**
   * 动画循环
   */
  private animate = (): void => {
    if (this.state !== 'playing') {
      return
    }

    const now = performance.now()
    const elapsed = now - this.lastStepTime
    const adjustedInterval = this.config.stepInterval / this.config.speed

    if (elapsed >= adjustedInterval) {
      const currentStep = this.getCurrentStep()

      // 如果有当前步骤，尝试进入下一步
      if (currentStep) {
        const nextStepResult = this.nextStep()

        // 如果已经完成，停止动画
        if (!nextStepResult && this.state !== 'playing') {
          return
        }
      } else {
        // 还没有任何步骤，开始播放
        this.nextStep()
      }

      this.lastStepTime = now
    }

    this.animationFrameId = requestAnimationFrame(this.animate)
  }

  /**
   * 停止动画循环
   */
  private stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stopAnimation()
    this.eventListeners.clear()
    this.history = null
    this.steps = []
    this.currentStepIndex = -1
    this.state = 'idle'
  }

  /**
   * 静态方法：从执行历史创建回放引擎
   */
  static fromHistory(history: ExecutionHistory, config?: ReplayConfig): WorkflowReplayEngine {
    const engine = new WorkflowReplayEngine(config)
    engine.load(history)
    return engine
  }
}

// 导出单例实例
export const workflowReplayEngine = new WorkflowReplayEngine()
