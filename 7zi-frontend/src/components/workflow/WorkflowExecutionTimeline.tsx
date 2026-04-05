/**
 * Workflow Execution Timeline Component
 *
 * 📅 工作流执行时间轴组件
 * 版本: v1.12.3
 *
 * 显示工作流执行的时间线，支持拖动、缩放、节点高亮等功能
 */

'use client'

import React, { useMemo, useCallback } from 'react'
import { Play, Pause, SkipBack, SkipForward, RotateCcw, FastForward } from 'lucide-react'
import type { ExecutionHistory } from '@/lib/workflow/execution-history-store'
import type { ReplayStep } from '@/lib/workflow/replay-engine'
import { cn } from '@/lib/utils'

// ============================================
// 类型定义
// ============================================

export interface ExecutionTimelineProps {
  /** 执行历史 */
  history: ExecutionHistory
  /** 当前步骤索引 */
  currentStepIndex: number
  /** 播放状态 */
  isPlaying: boolean
  /** 播放速度 */
  speed: number
  /** 时间轴位置（0-100） */
  position: number
  /** 事件处理 */
  onPlay?: () => void
  onPause?: () => void
  onReset?: () => void
  onPreviousStep?: () => void
  onNextStep?: () => void
  onSeek?: (position: number) => void
  onSpeedChange?: (speed: number) => void
  /** 样式类名 */
  className?: string
}

// ============================================
// 辅助函数
// ============================================

/**
 * 格式化时间（毫秒 -> HH:MM:SS.mmm）
 */
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const milliseconds = ms % 1000

  const pad = (n: number) => n.toString().padStart(2, '0')
  const padMs = (n: number) => n.toString().padStart(3, '0')

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes % 60)}:${pad(seconds % 60)}`
  }
  return `${pad(minutes)}:${pad(seconds % 60)}.${padMs(milliseconds)}`
}

/**
 * 生成时间轴刻度
 */
function generateTimelineMarks(
  duration: number,
  count: number = 10
): { position: number; label: string }[] {
  const marks: { position: number; label: string }[] = []

  for (let i = 0; i <= count; i++) {
    const position = (i / count) * 100
    const time = (duration * i) / count
    marks.push({
      position,
      label: formatTime(time),
    })
  }

  return marks
}

// ============================================
// 组件
// ============================================

/**
 * 播放控制按钮
 */
const PlaybackControls: React.FC<{
  isPlaying: boolean
  onPlay?: () => void
  onPause?: () => void
  onReset?: () => void
  onPreviousStep?: () => void
  onNextStep?: () => void
}> = ({
  isPlaying,
  onPlay,
  onPause,
  onReset,
  onPreviousStep,
  onNextStep,
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* 重置 */}
      <button
        type="button"
        onClick={onReset}
        className="p-2 rounded-md hover:bg-muted transition-colors"
        title="重置"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* 上一步 */}
      <button
        type="button"
        onClick={onPreviousStep}
        className="p-2 rounded-md hover:bg-muted transition-colors"
        title="上一步"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* 播放/暂停 */}
      <button
        type="button"
        onClick={isPlaying ? onPause : onPlay}
        className={cn(
          'p-2 rounded-full transition-all',
          'hover:bg-primary hover:text-primary-foreground',
          isPlaying && 'bg-primary text-primary-foreground'
        )}
        title={isPlaying ? '暂停' : '播放'}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* 下一步 */}
      <button
        type="button"
        onClick={onNextStep}
        className="p-2 rounded-md hover:bg-muted transition-colors"
        title="下一步"
      >
        <SkipForward className="w-4 h-4" />
      </button>
    </div>
  )
}

/**
 * 速度控制
 */
const SpeedControl: React.FC<{
  speed: number
  onChange?: (speed: number) => void
}> = ({ speed, onChange }) => {
  const speeds = [0.5, 1, 2, 4]

  return (
    <div className="flex items-center gap-1">
      <FastForward className="w-3 h-3 text-muted-foreground" />
      <div className="flex items-center gap-1">
        {speeds.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange?.(s)}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors',
              speed === s
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * 时间显示
 */
const TimeDisplay: React.FC<{
  currentTime: number
  totalTime: number
}> = ({ currentTime, totalTime }) => {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-mono">{formatTime(currentTime)}</span>
      <span className="text-muted-foreground">/</span>
      <span className="font-mono text-muted-foreground">
        {formatTime(totalTime)}
      </span>
    </div>
  )
}

/**
 * 时间轴滑块
 */
const TimelineSlider: React.FC<{
  duration: number
  position: number
  onSeek?: (position: number) => void
}> = ({ duration, position, onSeek }) => {
  const marks = useMemo(() => generateTimelineMarks(duration, 10), [duration])

  const handleSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPosition = Number.parseFloat(e.target.value)
      onSeek?.(newPosition)
    },
    [onSeek]
  )

  return (
    <div className="relative">
      {/* 时间轴轨道 */}
      <div className="relative h-2 bg-muted rounded-full">
        {/* 进度 */}
        <div
          className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all"
          style={{ width: `${position}%` }}
        />

        {/* 滑块 */}
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={position}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {/* 滑块指示器 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg cursor-grab transition-transform"
          style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
        >
          <div className="absolute inset-0.5 bg-primary-foreground rounded-full" />
        </div>
      </div>

      {/* 刻度 */}
      {marks.map((mark, index) => (
        <div
          key={index}
          className="absolute top-6 text-xs text-muted-foreground"
          style={{ left: `${mark.position}%`, transform: 'translateX(-50%)' }}
        >
          {mark.label}
        </div>
      ))}
    </div>
  )
}

/**
 * 主组件
 */
export const WorkflowExecutionTimeline: React.FC<ExecutionTimelineProps> = ({
  history,
  currentStepIndex,
  isPlaying,
  speed,
  position,
  onPlay,
  onPause,
  onReset,
  onPreviousStep,
  onNextStep,
  onSeek,
  onSpeedChange,
  className,
}) => {
  const duration = history.duration || 0
  const currentTime = (duration * position) / 100

  return (
    <div
      className={cn(
        'flex flex-col gap-3 p-4 bg-card border rounded-lg',
        className
      )}
    >
      {/* 顶部：时间显示和控制 */}
      <div className="flex items-center justify-between">
        <TimeDisplay currentTime={currentTime} totalTime={duration} />

        <div className="flex items-center gap-4">
          <SpeedControl speed={speed} onChange={onSpeedChange} />
          <PlaybackControls
            isPlaying={isPlaying}
            onPlay={onPlay}
            onPause={onPause}
            onReset={onReset}
            onPreviousStep={onPreviousStep}
            onNextStep={onNextStep}
          />
        </div>
      </div>

      {/* 时间轴滑块 */}
      <div className="pt-2">
        <TimelineSlider
          duration={duration}
          position={position}
          onSeek={onSeek}
        />
      </div>

      {/* 步骤指示器 */}
      <div className="text-xs text-muted-foreground text-center">
        步骤 {currentStepIndex + 1} / {Object.keys(history.nodeExecutions).length}
      </div>
    </div>
  )
}

WorkflowExecutionTimeline.displayName = 'WorkflowExecutionTimeline'

export default WorkflowExecutionTimeline
