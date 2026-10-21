/**
 * EdgeTypes - 边类型注册 (v1.10.1 UX增强版)
 *
 * 为 React Flow 定义自定义边类型
 * 新增: 流动动画效果、选中高亮、渐变边
 */

import { memo, useEffect, useRef } from 'react'
import { EdgeLabelRenderer, getBezierPath, type EdgeProps } from 'reactflow'
import type { WorkflowEdgeData } from '../types'

/**
 * 条件边 - 用于条件节点的分支
 * 增强: 选中时发光效果、渐变动画
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
      {/* 选中时的发光效果 */}
      {selected && (
        <path
          d={edgePath}
          className="fill-none"
          stroke="#818CF8"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.3"
          style={{ filter: 'blur(4px)' }}
        />
      )}
      {/* 主路径 */}
      <path
        id={id}
        d={edgePath}
        className={`transition-all duration-200 ${
          selected 
            ? 'stroke-indigo-500 dark:stroke-indigo-400' 
            : 'stroke-gray-400 dark:stroke-gray-600'
        }`}
        fill="none"
        strokeWidth={selected ? 3 : 2}
        style={{
          strokeLinecap: 'round',
        }}
      />
      {/* 流动动画点 */}
      {selected && (
        <circle r="4" fill="#6366F1">
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`rounded px-2 py-1 text-xs font-medium shadow-sm transition-all ${
              selected 
                ? 'bg-indigo-500 text-white ring-2 ring-indigo-300' 
                : 'bg-gray-900 text-white dark:bg-gray-700'
            }`}
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
 * 增强: 流动粒子效果、渐变色
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
    <>
      {/* 发光效果 */}
      <path
        d={edgePath}
        className="fill-none"
        stroke="#818CF8"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.4"
        style={{ filter: 'blur(3px)' }}
      />
      {/* 主路径 */}
      <path
        id={id}
        d={edgePath}
        className={`transition-all duration-300 ${
          selected 
            ? 'stroke-indigo-400 dark:stroke-indigo-300' 
            : 'stroke-indigo-500 dark:stroke-indigo-400'
        }`}
        fill="none"
        strokeWidth={selected ? 3 : 2}
        style={{
          strokeDasharray: '8 4',
          animation: 'dash 0.8s linear infinite',
          strokeLinecap: 'round',
        }}
      />
      {/* 流动粒子 */}
      <circle r="5" fill="#A5B4FC">
        <animateMotion
          dur="1.5s"
          repeatCount="indefinite"
          path={edgePath}
        />
        <animate
          attributeName="r"
          values="3;5;3"
          dur="0.75s"
          repeatCount="indefinite"
        />
      </circle>
      <circle r="3" fill="#C7D2FE">
        <animateMotion
          dur="1.5s"
          repeatCount="indefinite"
          path={edgePath}
          begin="0.75s"
        />
      </circle>
    </>
  )
})
animatedEdgeType.displayName = 'AnimatedEdge'

/**
 * 增强边 - 带有悬停效果的默认边
 */
export const enhancedEdgeType = memo((props: EdgeProps<WorkflowEdgeData>) => {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data } = props

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      {/* 选中时的发光效果 */}
      {selected && (
        <path
          d={edgePath}
          className="fill-none"
          stroke="#818CF8"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.3"
          style={{ filter: 'blur(4px)' }}
        />
      )}
      {/* 主路径 */}
      <path
        id={id}
        d={edgePath}
        className={`transition-all duration-200 ${
          selected 
            ? 'stroke-indigo-500 dark:stroke-indigo-400' 
            : 'stroke-gray-400 dark:stroke-gray-600 hover:stroke-gray-500'
        }`}
        fill="none"
        strokeWidth={selected ? 3 : 2}
        style={{
          strokeLinecap: 'round',
        }}
      />
      {/* 执行状态动画 */}
      {data?.executionStatus === 'running' && (
        <circle r="4" fill="#6366F1">
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
    </>
  )
})
enhancedEdgeType.displayName = 'EnhancedEdge'

/**
 * 添加动画样式
 */
if (typeof document !== 'undefined') {
  const existingStyle = document.getElementById('workflow-edge-animations')
  if (!existingStyle) {
    const style = document.createElement('style')
    style.id = 'workflow-edge-animations'
    style.textContent = `
      @keyframes dash {
        to {
          stroke-dashoffset: -12;
        }
      }
      
      @keyframes pulse-glow {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
      }
      
      .react-flow__edge-path {
        transition: stroke 0.2s ease, stroke-width 0.2s ease;
      }
      
      .react-flow__edge:hover .react-flow__edge-path {
        stroke-width: 3px;
      }
    `
    document.head.appendChild(style)
  }
}

/**
 * 导出所有边类型
 */
export const edgeTypes = {
  conditional: conditionalEdgeType,
  animated: animatedEdgeType,
  enhanced: enhancedEdgeType,
  default: enhancedEdgeType,
}
