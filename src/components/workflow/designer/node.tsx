'use client';

import React from 'react';
import {
  WorkflowNode,
  NodeType,
  NodeStatus,
} from '@/types/workflow';
import { cn } from '@/lib/utils';

/**
 * 节点组件属性
 */
interface WorkflowNodeProps {
  node: WorkflowNode;
  isSelected?: boolean;
  status?: NodeStatus;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onConnectorMouseDown?: (e: React.MouseEvent) => void;
  readOnly?: boolean;
}

/**
 * 节点样式配置
 */
const NODE_STYLES: Record<NodeType, { bg: string; border: string; icon: string }> = {
  [NodeType.START]: { bg: 'bg-green-50', border: 'border-green-300', icon: '▶' },
  [NodeType.END]: { bg: 'bg-red-50', border: 'border-red-300', icon: '■' },
  [NodeType.AGENT]: { bg: 'bg-blue-50', border: 'border-blue-300', icon: '🤖' },
  [NodeType.CONDITION]: { bg: 'bg-yellow-50', border: 'border-yellow-300', icon: '⚡' },
  [NodeType.PARALLEL]: { bg: 'bg-purple-50', border: 'border-purple-300', icon: '⚡' },
  [NodeType.WAIT]: { bg: 'bg-gray-50', border: 'border-gray-300', icon: '⏱' },
  [NodeType.HUMAN_INPUT]: { bg: 'bg-orange-50', border: 'border-orange-300', icon: '👤' },
};

/**
 * 状态颜色配置
 */
const STATUS_COLORS: Record<NodeStatus, string> = {
  [NodeStatus.IDLE]: 'bg-gray-200',
  [NodeStatus.RUNNING]: 'bg-blue-500',
  [NodeStatus.SUCCESS]: 'bg-green-500',
  [NodeStatus.FAILED]: 'bg-red-500',
  [NodeStatus.SKIPPED]: 'bg-gray-400',
  [NodeStatus.PENDING]: 'bg-yellow-400',
};

/**
 * 节点宽度
 */
const NODE_WIDTH = 200;
const NODE_HEIGHT = 80;

/**
 * 工作流节点组件
 */
export function WorkflowNodeComponent({
  node,
  isSelected = false,
  status,
  onMouseDown,
  onMouseUp,
  onConnectorMouseDown,
  readOnly = false,
}: WorkflowNodeProps) {
  const style = NODE_STYLES[node.type];

  // 输入连接点位置
  const inputPoint = { x: 0, y: NODE_HEIGHT / 2 };

  // 输出连接点位置
  const outputPoint = { x: NODE_WIDTH, y: NODE_HEIGHT / 2 };

  return (
    <g
      data-node-id={node.id}
      transform={`translate(${node.position.x}, ${node.position.y})`}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      className={cn(
        'cursor-move',
        isSelected && 'drop-shadow-lg',
        !readOnly && 'hover:drop-shadow-md transition-shadow'
      )}
    >
      {/* 节点主体 */}
      <g className="node-body">
        {/* 外边框 */}
        <rect
          x={0}
          y={0}
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx={8}
          ry={8}
          className={cn(
            'stroke-2',
            style.bg,
            style.border,
            isSelected && 'ring-2 ring-blue-500'
          )}
          fill="none"
          strokeWidth={isSelected ? 3 : 2}
        />

        {/* 背景填充 */}
        <rect
          x={2}
          y={2}
          width={NODE_WIDTH - 4}
          height={NODE_HEIGHT - 4}
          rx={6}
          ry={6}
          className={style.bg}
          fillOpacity={0.5}
        />

        {/* 图标 */}
        <text x={15} y={NODE_HEIGHT / 2 + 5} className="text-2xl">
          {style.icon}
        </text>

        {/* 节点名称 */}
        <foreignObject x={45} y={15} width={NODE_WIDTH - 50} height={40}>
          <div className="text-sm font-medium text-gray-900 truncate">
            {node.name}
          </div>
        </foreignObject>

        {/* 节点描述 */}
        <foreignObject x={45} y={45} width={NODE_WIDTH - 50} height={25}>
          <div className="text-xs text-gray-600 truncate">
            {node.description || node.type}
          </div>
        </foreignObject>

        {/* 状态指示器 */}
        {status && (
          <circle
            cx={NODE_WIDTH - 12}
            cy={12}
            r={6}
            className={STATUS_COLORS[status]}
          />
        )}

        {/* 选中标记 */}
        {isSelected && (
          <rect
            x={-2}
            y={-2}
            width={NODE_WIDTH + 4}
            height={NODE_HEIGHT + 4}
            rx={10}
            ry={10}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="4,2"
          />
        )}
      </g>

      {/* 输入连接点 */}
      {node.type !== NodeType.START && (
        <circle
          cx={inputPoint.x}
          cy={inputPoint.y}
          r={6}
          className="fill-gray-400 hover:fill-blue-500 cursor-crosshair"
          onMouseDown={(e) => {
            e.stopPropagation();
            if (!readOnly) onConnectorMouseDown?.(e);
          }}
        />
      )}

      {/* 输出连接点 */}
      {node.type !== NodeType.END && (
        <circle
          cx={outputPoint.x}
          cy={outputPoint.y}
          r={6}
          className="fill-gray-400 hover:fill-blue-500 cursor-crosshair"
          onMouseDown={(e) => {
            e.stopPropagation();
            if (!readOnly) onConnectorMouseDown?.(e);
          }}
        />
      )}

      {/* 特殊节点形状 */}
      {node.type === NodeType.CONDITION && (
        <>
          {/* 条件节点菱形标记 */}
          <polygon
            points={`${NODE_WIDTH / 2},${NODE_HEIGHT} ${NODE_WIDTH},${NODE_HEIGHT / 2} ${NODE_WIDTH / 2},${NODE_HEIGHT + 10}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={2}
          />
        </>
      )}
    </g>
  );
}

/**
 * 节点类型选择器（用于拖拽添加新节点）
 */
export function NodeTypeSelector({
  onTypeSelect,
}: {
  onTypeSelect: (type: NodeType) => void;
}) {
  const types: Array<{ type: NodeType; label: string; icon: string }> = [
    { type: NodeType.AGENT, label: 'Agent', icon: '🤖' },
    { type: NodeType.CONDITION, label: '条件', icon: '⚡' },
    { type: NodeType.PARALLEL, label: '并行', icon: '⚡' },
    { type: NodeType.WAIT, label: '等待', icon: '⏱' },
    { type: NodeType.HUMAN_INPUT, label: '人工', icon: '👤' },
  ];

  return (
    <div className="flex flex-col gap-2 p-3 bg-white rounded shadow-lg border">
      <div className="text-xs font-medium text-gray-600 mb-1">
        拖拽添加节点
      </div>
      {types.map(({ type, label, icon }) => (
        <div
          key={type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('nodeType', type);
          }}
          className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded hover:bg-gray-100 cursor-grab active:cursor-grabbing"
        >
          <span className="text-lg">{icon}</span>
          <span className="text-sm text-gray-700">{label}</span>
        </div>
      ))}
    </div>
  );
}
