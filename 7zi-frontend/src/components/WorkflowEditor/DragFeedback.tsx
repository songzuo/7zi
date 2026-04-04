/**
 * DragFeedback - 拖拽视觉反馈组件
 *
 * v1.10.1 UX增强: 拖拽时的视觉反馈效果
 * - 拖拽时的幽灵节点
 * - 放置目标高亮
 * - 连接线预览
 */

import React, { useState, useEffect } from 'react'
import { useReactFlow } from 'reactflow'

interface DragFeedbackProps {
  isDragging: boolean
  nodeType?: string
  position?: { x: number; y: number }
}

/**
 * 拖拽反馈组件
 */
export const DragFeedback: React.FC<DragFeedbackProps> = ({
  isDragging,
  nodeType,
  position,
}) => {
  const { getNodes, getEdges } = useReactFlow()
  const [dropTargets, setDropTargets] = useState<string[]>([])

  useEffect(() => {
    if (!isDragging) {
      setDropTargets([])
      return
    }

    // 查找可能的放置目标
    const nodes = getNodes()
    const edges = getEdges()

    // 找出所有可以作为连接目标的节点
    const targets = nodes
      .filter((node) => {
        // 排除当前拖拽的节点
        if (node.type === nodeType) return false

        // 检查是否已经有连接
        const hasConnection = edges.some(
          (edge) => edge.source === nodeType || edge.target === node.id
        )

        return !hasConnection
      })
      .map((node) => node.id)

    setDropTargets(targets)
  }, [isDragging, nodeType, getNodes, getEdges])

  if (!isDragging || !position) return null

  return (
    <>
      {/* 拖拽时的幽灵节点 */}
      <div
        className="pointer-events-none fixed z-50 rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-50 px-4 py-3 shadow-lg dark:border-indigo-500 dark:bg-indigo-900/30"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
          opacity: 0.8,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">📦</span>
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {nodeType || '节点'}
          </span>
        </div>
      </div>

      {/* 放置目标高亮 */}
      {dropTargets.map((targetId) => {
        const targetNode = getNodes().find((n) => n.id === targetId)
        if (!targetNode) return null

        return (
          <div
            key={targetId}
            className="pointer-events-none fixed z-40 rounded-lg border-2 border-green-400 bg-green-50 dark:border-green-500 dark:bg-green-900/30"
            style={{
              left: targetNode.position.x + 100,
              top: targetNode.position.y + 40,
              width: 200,
              height: 80,
              opacity: 0.5,
              animation: 'pulse 1s ease-in-out infinite',
            }}
          >
            <div className="flex h-full items-center justify-center">
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                可放置
              </span>
            </div>
          </div>
        )
      })}
    </>
  )
}

/**
 * 拖拽状态 Hook
 */
export const useDragFeedback = () => {
  const [isDragging, setIsDragging] = useState(false)
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | undefined>()
  const [dragNodeType, setDragNodeType] = useState<string>()

  const handleDragStart = (nodeType: string) => {
    setIsDragging(true)
    setDragNodeType(nodeType)
  }

  const handleDragMove = (x: number, y: number) => {
    setDragPosition({ x, y })
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setDragPosition(undefined)
    setDragNodeType(undefined)
  }

  return {
    isDragging,
    dragPosition,
    dragNodeType,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  }
}

/**
 * 添加全局样式
 */
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('drag-feedback-animations')
  if (!existingStyle) {
    const style = document.createElement('style')
    style.id = 'drag-feedback-animations'
    style.textContent = `
      @keyframes pulse {
        0%, 100% {
          opacity: 0.5;
          transform: scale(1);
        }
        50% {
          opacity: 0.8;
          transform: scale(1.05);
        }
      }
    `
    document.head.appendChild(style)
  }
}

export default DragFeedback