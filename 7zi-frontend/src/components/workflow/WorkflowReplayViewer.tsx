/**
 * Workflow Replay Viewer Component
 *
 * 🎬 工作流回放查看器
 * 版本: v1.12.3
 *
 * 提供工作流执行历史的可视化回放功能
 * 支持逐节点回放、时间轴拖动、节点详情查看等功能
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ReactFlow, Background, Controls, useNodesState, useEdgesState } from 'reactflow'
import type { Node, Edge } from 'reactflow'
import 'reactflow/dist/style.css'

import type { ExecutionHistory } from '@/lib/workflow/execution-history-store'
import type { ReplayStep, ReplayEvent } from '@/lib/workflow/replay-engine'
import { WorkflowReplayEngine } from '@/lib/workflow/replay-engine'
import { WorkflowExecutionTimeline } from './WorkflowExecutionTimeline'
import { cn } from '@/lib/utils'

// ============================================
// 类型定义
// ============================================

export interface WorkflowReplayViewerProps {
  /** 执行历史 */
  history: ExecutionHistory
  /** 样式类名 */
  className?: string
  /** 高度 */
  height?: string | number
  /** 自动播放 */
  autoPlay?: boolean
  /** 初始播放速度 */
  initialSpeed?: number
  /** 事件处理 */
  onStepChange?: (step: ReplayStep | null) => void
  onStateChange?: (state: string) => void
  onComplete?: () => void
}

// ============================================
// 内部组件：节点详情面板
// ============================================

const NodeDetailsPanel: React.FC<{
  step: ReplayStep | null
}> = ({ step }) => {
  if (!step) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        选择节点查看详情
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* 节点基本信息 */}
      <div className="space-y-2">
        <div className="text-sm font-medium">{step.nodeName}</div>
        <div className="text-xs text-muted-foreground">
          类型: {step.nodeType} | ID: {step.nodeId}
        </div>
        <div className="text-xs text-muted-foreground">
          时间: {new Date(step.timestamp).toLocaleString()}
        </div>
      </div>

      {/* 步骤类型 */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'px-2 py-1 text-xs rounded',
            step.type === 'enter'
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          )}
        >
          {step.type === 'enter' ? '进入' : '退出'}
        </span>
        <span className="text-xs text-muted-foreground">
          相对时间: {(step.relativeTime / 1000).toFixed(2)}s
        </span>
      </div>

      {/* 数据快照 */}
      {step.data && (
        <div className="space-y-2">
          {/* 输入数据 */}
          {step.data.input !== undefined && (
            <div>
              <div className="text-xs font-medium mb-1">输入数据</div>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(step.data.input, null, 2)}
              </pre>
            </div>
          )}

          {/* 输出数据 */}
          {step.data.output !== undefined && (
            <div>
              <div className="text-xs font-medium mb-1">输出数据</div>
              <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                {JSON.stringify(step.data.output, null, 2)}
              </pre>
            </div>
          )}

          {/* 错误信息 */}
          {step.data.error && (
            <div>
              <div className="text-xs font-medium mb-1 text-destructive">错误信息</div>
              <div className="bg-destructive/10 p-2 rounded text-xs text-destructive">
                {step.data.error}
              </div>
            </div>
          )}

          {/* 状态 */}
          {step.data.status && (
            <div>
              <div className="text-xs font-medium mb-1">状态</div>
              <span className="text-xs">{step.data.status}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================
// 内部组件：工作流图
// ============================================

const WorkflowGraph: React.FC<{
  nodes: Node[]
  edges: Edge[]
  currentNodeId: string | null
  nodeStatus: Record<string, string>
}> = ({ nodes, edges, currentNodeId, nodeStatus }) => {
  // 为节点添加高亮样式
  const styledNodes = nodes.map(node => ({
    ...node,
    style: {
      ...node.style,
      opacity: currentNodeId && node.id !== currentNodeId ? 0.4 : 1,
      boxShadow:
        node.id === currentNodeId
          ? '0 0 0 3px rgba(59, 130, 246, 0.5)'
          : undefined,
    },
    className: cn(
      node.className,
      node.id === currentNodeId && 'ring-2 ring-primary'
    ),
    data: {
      ...node.data,
      status: nodeStatus[node.id] || 'pending',
    },
  }))

  return (
    <ReactFlow
      nodes={styledNodes}
      edges={edges}
      fitView
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      zoomOnScroll={false}
      panOnScroll={false}
      preventScrolling
    >
      <Background />
      <Controls showInteractive={false} />
    </ReactFlow>
  )
}

// ============================================
// 主组件
// ============================================

/**
 * 工作流回放查看器
 */
export const WorkflowReplayViewer: React.FC<WorkflowReplayViewerProps> = ({
  history,
  className,
  height = '600px',
  autoPlay = false,
  initialSpeed = 1,
  onStepChange,
  onStateChange,
  onComplete,
}) => {
  // 状态
  const [nodes, setNodes, onNodesChange] = useNodesState(history.workflowSnapshot.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(history.workflowSnapshot.edges)
  const [replayEngine] = useState(() => {
    const engine = new WorkflowReplayEngine({ speed: initialSpeed, autoPlay })
    engine.load(history)
    return engine
  })

  const [currentStep, setCurrentStep] = useState<ReplayStep | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(initialSpeed)
  const [timelinePosition, setTimelinePosition] = useState(0)

  // 更新节点状态映射
  const nodeStatus = useCallback(() => {
    const status: Record<string, string> = 'pending'

    if (!currentStep) {
      return status
    }

    // 设置当前节点为运行中
    status[currentStep.nodeId] = 'running'

    // 设置已完成的节点
    for (const [nodeId, execution] of Object.entries(history.nodeExecutions)) {
      if (execution.status === 'completed' || execution.status === 'success') {
        status[nodeId] = 'completed'
      } else if (execution.status === 'failed') {
        status[nodeId] = 'failed'
      }
    }

    return status
  }, [currentStep, history])

  // 事件监听
  useEffect(() => {
    const handleEvent = (event: ReplayEvent): void => {
      switch (event.type) {
        case 'step':
          setCurrentStep(event.step || null)
          onStepChange?.(event.step || null)

          // 更新时间轴位置
          if (event.step) {
            const newPosition = (event.step.relativeTime / history.duration) * 100
            setTimelinePosition(newPosition)
          }
          break

        case 'play':
          setIsPlaying(true)
          onStateChange?.('playing')
          break

        case 'pause':
          setIsPlaying(false)
          onStateChange?.('paused')
          break

        case 'complete':
          setIsPlaying(false)
          onStateChange?.('completed')
          onComplete?.()
          break

        case 'reset':
          setCurrentStep(null)
          setIsPlaying(false)
          setTimelinePosition(0)
          onStepChange?.(null)
          onStateChange?.('idle')
          break

        case 'seek':
          setCurrentStep(event.step || null)
          onStepChange?.(event.step || null)
          break
      }
    }

    replayEngine.addEventListener(handleEvent)

    // 如果启用了自动播放，开始回放
    if (autoPlay) {
      replayEngine.play()
    }

    return () => {
      replayEngine.removeEventListener(handleEvent)
      replayEngine.stop()
    }
  }, [replayEngine, autoPlay, history.duration, onStepChange, onStateChange, onComplete])

  // 播放控制处理
  const handlePlay = useCallback(() => {
    replayEngine.play()
  }, [replayEngine])

  const handlePause = useCallback(() => {
    replayEngine.pause()
  }, [replayEngine])

  const handleReset = useCallback(() => {
    replayEngine.reset()
  }, [replayEngine])

  const handlePreviousStep = useCallback(() => {
    replayEngine.previousStep()
  }, [replayEngine])

  const handleNextStep = useCallback(() => {
    replayEngine.nextStep()
  }, [replayEngine])

  const handleSeek = useCallback(
    (position: number) => {
      setTimelinePosition(position)
      const relativeTime = (history.duration * position) / 100
      replayEngine.seekToTime(relativeTime)
    },
    [replayEngine, history.duration]
  )

  const handleSpeedChange = useCallback(
    (newSpeed: number) => {
      setSpeed(newSpeed)
      replayEngine.setSpeed(newSpeed)
    },
    [replayEngine]
  )

  return (
    <div
      className={cn('flex flex-col gap-4', className)}
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      {/* 工作流图 */}
      <div className="flex-1 relative border rounded-lg overflow-hidden bg-background">
        <WorkflowGraph
          nodes={nodes}
          edges={edges}
          currentNodeId={currentStep?.nodeId || null}
          nodeStatus={nodeStatus()}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
        />
      </div>

      {/* 时间轴 */}
      <WorkflowExecutionTimeline
        history={history}
        currentStepIndex={replayEngine.getCurrentStepIndex()}
        isPlaying={isPlaying}
        speed={speed}
        position={timelinePosition}
        onPlay={handlePlay}
        onPause={handlePause}
        onReset={handleReset}
        onPreviousStep={handlePreviousStep}
        onNextStep={handleNextStep}
        onSeek={handleSeek}
        onSpeedChange={handleSpeedChange}
      />

      {/* 节点详情面板 */}
      <div className="border rounded-lg bg-card">
        <div className="px-4 py-2 border-b font-medium text-sm">
          节点详情
        </div>
        <NodeDetailsPanel step={currentStep} />
      </div>
    </div>
  )
}

WorkflowReplayViewer.displayName = 'WorkflowReplayViewer'

export default WorkflowReplayViewer
