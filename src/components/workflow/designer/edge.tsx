'use client';

import React, { useMemo } from 'react';
import {
  WorkflowEdge,
  EdgeType,
} from '@/types/workflow';
import { cn } from '@/lib/utils';

/**
 * 边组件属性
 */
interface WorkflowEdgeProps {
  edge: WorkflowEdge;
  sourcePosition: { x: number; y: number };
  targetPosition: { x: number; y: number };
  onDelete?: () => void;
  readOnly?: boolean;
}

/**
 * 计算贝塞尔曲线控制点
 */
function calculateControlPoints(
  start: { x: number; y: number },
  end: { x: number; y: number }
): { cp1: { x: number; y: number }; cp2: { x: number; y: number } } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  const controlOffset = Math.abs(dx) * 0.5 + 50;

  return {
    cp1: { x: start.x + controlOffset, y: start.y },
    cp2: { x: end.x - controlOffset, y: end.y },
  };
}

/**
 * 生成贝塞尔曲线路径
 */
function generateBezierPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
  type: EdgeType
): string {
  if (type === EdgeType.CONDITION || type === EdgeType.PARALLEL) {
    const { cp1, cp2 } = calculateControlPoints(start, end);
    return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;
  }

  // 默认使用直线
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
}

/**
 * 生成箭头标记定义
 */
function generateArrowMarker(id: string, color: string): React.ReactElement {
  return (
    <marker
      id={id}
      markerWidth={10}
      markerHeight={10}
      refX={9}
      refY={3}
      orient="auto"
      markerUnits="strokeWidth"
    >
      <path d="M0,0 L0,6 L9,3 z" fill={color} />
    </marker>
  );
}

/**
 * 计算箭头角度
 */
function calculateArrowAngle(
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  return Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);
}

/**
 * 工作流边组件
 */
export function WorkflowEdgeComponent({
  edge,
  sourcePosition,
  targetPosition,
  onDelete,
  readOnly = false,
}: WorkflowEdgeProps) {
  // 计算路径
  const pathData = useMemo(
    () => generateBezierPath(sourcePosition, targetPosition, edge.type),
    [sourcePosition, targetPosition, edge.type]
  );

  // 计算箭头角度
  const arrowAngle = useMemo(
    () => calculateArrowAngle(sourcePosition, targetPosition),
    [sourcePosition, targetPosition]
  );

  // 样式配置
  const getEdgeStyle = () => {
    switch (edge.type) {
      case EdgeType.CONDITION:
        return {
          color: edge.conditionConfig?.condition === 'true' ? '#10b981' : '#ef4444',
          width: 2,
          style: 'solid' as const,
        };
      case EdgeType.PARALLEL:
        return {
          color: '#8b5cf6',
          width: 2,
          style: 'dashed' as const,
        };
      case EdgeType.DEFAULT:
        return {
          color: '#9ca3af',
          width: 2,
          style: 'dashed' as const,
        };
      default:
        return {
          color: '#6b7280',
          width: 2,
          style: 'solid' as const,
        };
    }
  };

  const style = getEdgeStyle();

  // 箭头标记 ID
  const markerId = `arrow-${edge.id}`;

  return (
    <g className={cn('edge', 'group', !readOnly && 'cursor-pointer')}>
      {/* 箭头标记 */}
      <defs>
        {generateArrowMarker(markerId, style.color)}
      </defs>

      {/* 边路径 */}
      <path
        d={pathData}
        fill="none"
        stroke={style.color}
        strokeWidth={style.width}
        strokeDasharray={style.style === 'dashed' ? '5,5' : undefined}
        markerEnd={`url(#${markerId})`}
        className={cn(
          'transition-all',
          !readOnly && 'hover:stroke-blue-500 hover:stroke-w-[3px]'
        )}
      />

      {/* 条件标签 */}
      {edge.type === EdgeType.CONDITION && edge.conditionConfig?.label && (
        <foreignObject
          x={(sourcePosition.x + targetPosition.x) / 2 - 20}
          y={(sourcePosition.y + targetPosition.y) / 2 - 10}
          width={40}
          height={20}
        >
          <div
            className={cn(
              'text-xs font-medium text-center py-0.5 px-1 rounded',
              edge.conditionConfig.condition === 'true'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            )}
          >
            {edge.conditionConfig.label}
          </div>
        </foreignObject>
      )}

      {/* 默认标签 */}
      {edge.type === EdgeType.DEFAULT && (
        <foreignObject
          x={(sourcePosition.x + targetPosition.x) / 2 - 20}
          y={(sourcePosition.y + targetPosition.y) / 2 - 10}
          width={40}
          height={20}
        >
          <div className="text-xs text-gray-500 text-center py-0.5 px-1">
            默认
          </div>
        </foreignObject>
      )}

      {/* 删除按钮（只读模式不显示） */}
      {!readOnly && onDelete && (
        <g
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            transform: `translate(${(sourcePosition.x + targetPosition.x) / 2}px, ${
              (sourcePosition.y + targetPosition.y) / 2
            }px)`,
          }}
        >
          <circle r={8} fill="#ef4444" className="cursor-pointer" />
          <text x={0} y={4} textAnchor="middle" fill="white" fontSize={10}>
            ×
          </text>
        </g>
      )}
    </g>
  );
}

/**
 * 边类型选择器
 */
export function EdgeTypeSelector({
  currentType,
  onTypeChange,
}: {
  currentType: EdgeType;
  onTypeChange: (type: EdgeType) => void;
}) {
  const types: Array<{ type: EdgeType; label: string; description: string }> = [
    { type: EdgeType.SEQUENCE, label: '顺序', description: '按顺序执行' },
    { type: EdgeType.CONDITION, label: '条件', description: '基于条件分支' },
    { type: EdgeType.PARALLEL, label: '并行', description: '同时执行' },
    { type: EdgeType.DEFAULT, label: '默认', description: '默认分支' },
  ];

  return (
    <div className="flex flex-col gap-1">
      {types.map(({ type, label, description }) => (
        <button
          key={type}
          onClick={() => onTypeChange(type)}
          className={cn(
            'px-3 py-2 rounded text-left text-sm transition-colors',
            currentType === type
              ? 'bg-blue-50 text-blue-700 border-blue-300'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          )}
        >
          <div className="font-medium">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </button>
      ))}
    </div>
  );
}
