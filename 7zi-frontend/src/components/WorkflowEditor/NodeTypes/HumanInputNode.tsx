/**
 * HumanInputNode - 人工输入节点
 *
 * 等待人工输入或审批
 */

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { WorkflowNodeData } from '../types'
import { NODE_COLORS } from '../constants'

export const HumanInputNode = memo((props: NodeProps<WorkflowNodeData>) => {
  const { data, selected } = props
  const colors = NODE_COLORS.wait // 使用与 wait 相同的颜色

  // 执行状态颜色
  const getStatusColor = () => {
    switch (data.executionStatus) {
      case 'running':
        return '#3B82F6'
      case 'completed':
      case 'SUCCESS':
        return '#10B981'
      case 'failed':
      case 'FAILED':
        return '#EF4444'
      default:
        return colors.light
    }
  }

  return (
    <div
      className="workflow-node human-input-node"
      style={{
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: colors.bg,
        border: `2px solid ${selected ? '#3B82F6' : colors.light}`,
        minWidth: '160px',
        boxShadow: selected ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : 'none',
        position: 'relative',
      }}
    >
      {/* 状态指示器 */}
      <div
        style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: getStatusColor(),
          border: '2px solid white',
        }}
      />

      {/* 输入 Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: '10px',
          height: '10px',
          backgroundColor: colors.light,
          border: '2px solid white',
        }}
      />

      {/* 节点内容 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '20px' }}>👤</span>
        <div>
          <div
            style={{
              fontWeight: 600,
              color: colors.dark,
              fontSize: '14px',
            }}
          >
            {data.label}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>人工输入</div>
        </div>
      </div>

      {/* 配置预览 */}
      {data.config?.waitForEvent && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '11px',
            color: '#9CA3AF',
            padding: '4px 8px',
            backgroundColor: 'rgba(0,0,0,0.05)',
            borderRadius: '4px',
          }}
        >
          等待: {data.config.waitForEvent}
        </div>
      )}

      {/* 输出 Handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: '10px',
          height: '10px',
          backgroundColor: colors.light,
          border: '2px solid white',
        }}
      />
    </div>
  )
})

HumanInputNode.displayName = 'HumanInputNode'

export default HumanInputNode
