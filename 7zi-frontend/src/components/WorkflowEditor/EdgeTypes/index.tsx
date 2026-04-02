/**
 * EdgeTypes - 边类型注册
 *
 * 为 React Flow 定义自定义边类型
 */

import { memo } from 'react'
import { EdgeLabelRenderer, getBezierPath, type EdgeProps } from 'reactflow'
import type { WorkflowEdgeData } from '../types'

/**
 * 条件边 - 用于条件节点的分支
 */
export const conditionalEdgeType = memo((props: EdgeProps<WorkflowEdgeData>) => {
  const {
    id,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  } = props

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const label =
    data?.conditionConfig?.label ||
    (data?.conditionConfig?.condition ? String(data.conditionConfig.condition) : '')

  return (
    <>
      <path
        id={id}
        d={edgePath}
        className={`stroke-gray-400 dark:stroke-gray-600 ${selected ? 'stroke-indigo-500 stroke-[3px]' : 'stroke-2'}`}
        fill="none"
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="rounded bg-gray-900 px-2 py-1 text-xs font-medium text-white dark:bg-gray-700"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})
conditionalEdgeType.displayName = 'ConditionalEdge'

/**
 * 动画边 - 用于执行时显示数据流
 */
export const animatedEdgeType = memo((props: EdgeProps<WorkflowEdgeData>) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected } = props

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <path
      id={id}
      d={edgePath}
      className={`stroke-indigo-500 dark:stroke-indigo-400 ${selected ? 'stroke-[3px]' : 'stroke-2'}`}
      fill="none"
      style={{
        strokeDasharray: '5',
        animation: 'dash 1s linear infinite',
      }}
    />
  )
})
animatedEdgeType.displayName = 'AnimatedEdge'

/**
 * 添加动画样式
 */
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes dash {
      to {
        stroke-dashoffset: -10;
      }
    }
  `
  document.head.appendChild(style)
}
