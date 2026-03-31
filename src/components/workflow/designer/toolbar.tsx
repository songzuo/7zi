'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * 工具栏属性
 */
interface DesignerToolbarProps {
  zoom: number;
  snapToGrid: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onToggleSnapToGrid: () => void;
  onExportImage?: () => void;
  className?: string;
}

/**
 * 工作流设计器工具栏
 */
export function DesignerToolbar({
  zoom,
  snapToGrid,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onToggleSnapToGrid,
  onExportImage,
  className,
}: DesignerToolbarProps) {
  return (
    <div
      className={cn(
        'absolute top-4 left-4 flex items-center gap-2 z-10',
        className
      )}
    >
      {/* 缩放控制 */}
      <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={onZoomOut}
          className="px-3 py-2 hover:bg-gray-100 text-gray-600 text-sm font-medium"
          title="缩小 (Ctrl + 滚轮)"
        >
          −
        </button>
        <span className="px-3 py-2 text-sm text-gray-700 min-w-[50px] text-center border-x border-gray-200">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          className="px-3 py-2 hover:bg-gray-100 text-gray-600 text-sm font-medium"
          title="放大 (Ctrl + 滚轮)"
        >
          +
        </button>
      </div>

      {/* 视图控制 */}
      <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={onFitToScreen}
          className="px-3 py-2 hover:bg-gray-100 text-gray-600 text-sm flex items-center gap-1"
          title="适应屏幕"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          <span>适应</span>
        </button>
      </div>

      {/* 网格控制 */}
      <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={onToggleSnapToGrid}
          className={cn(
            'px-3 py-2 text-sm flex items-center gap-1 transition-colors',
            snapToGrid
              ? 'bg-blue-50 text-blue-700 border-blue-300'
              : 'hover:bg-gray-100 text-gray-600'
          )}
          title="对齐网格"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span>网格</span>
        </button>
      </div>

      {/* 导出 */}
      {onExportImage && (
        <button
          onClick={onExportImage}
          className="flex items-center gap-1 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-100 text-gray-600 text-sm"
          title="导出图片"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>导出</span>
        </button>
      )}
    </div>
  );
}

/**
 * 节点工具栏（左侧面板）
 */
export function NodeToolbar({
  onNodeAdd,
}: {
  onNodeAdd: (type: string) => void;
}) {
  const nodeTypes = [
    { type: 'agent', label: 'Agent', icon: '🤖', description: '执行 Agent 任务' },
    { type: 'condition', label: '条件', icon: '⚡', description: '基于条件分支' },
    { type: 'parallel', label: '并行', icon: '⚡', description: '并行执行多个分支' },
    { type: 'wait', label: '等待', icon: '⏱', description: '等待指定时间' },
    { type: 'human_input', label: '人工', icon: '👤', description: '等待人工输入' },
  ];

  return (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-900">添加节点</h3>
      <div className="flex flex-col gap-2">
        {nodeTypes.map(({ type, label, icon, description }) => (
          <button
            key={type}
            onClick={() => onNodeAdd(type)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('nodeType', type);
            }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-grab active:cursor-grabbing text-left transition-colors"
          >
            <span className="text-2xl">{icon}</span>
            <div>
              <div className="text-sm font-medium text-gray-900">{label}</div>
              <div className="text-xs text-gray-500">{description}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          拖拽节点到画布或点击添加
        </p>
      </div>
    </div>
  );
}

/**
 * 属性面板（右侧）
 */
export function PropertyPanel({
  selectedNode,
  onNodeUpdate,
}: {
  selectedNode?: {
    id: string;
    name: string;
    type: string;
    config?: Record<string, any>;
  };
  onNodeUpdate?: (id: string, updates: Record<string, any>) => void;
}) {
  if (!selectedNode) {
    return (
      <div className="p-4 text-sm text-gray-500 text-center">
        选择节点查看属性
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-900">节点属性</h3>

      {/* 名称 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          名称
        </label>
        <input
          type="text"
          value={selectedNode.name}
          onChange={(e) =>
            onNodeUpdate?.(selectedNode.id, { name: e.target.value })
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 类型 */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          类型
        </label>
        <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-600">
          {selectedNode.type}
        </div>
      </div>

      {/* Agent 配置 */}
      {selectedNode.type === 'agent' && (
        <>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Agent ID
            </label>
            <input
              type="text"
              value={selectedNode.config?.agentId || ''}
              onChange={(e) =>
                onNodeUpdate?.(selectedNode.id, {
                  config: { ...selectedNode.config, agentId: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              提示词
            </label>
            <textarea
              value={selectedNode.config?.prompt || ''}
              onChange={(e) =>
                onNodeUpdate?.(selectedNode.id, {
                  config: { ...selectedNode.config, prompt: e.target.value },
                })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      {/* 条件配置 */}
      {selectedNode.type === 'condition' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            条件表达式
          </label>
          <textarea
            value={selectedNode.config?.expression || ''}
            onChange={(e) =>
              onNodeUpdate?.(selectedNode.id, {
                config: { ...selectedNode.config, expression: e.target.value },
              })
            }
            rows={2}
            placeholder="例如: {{input.status}} === 'success'"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* 等待配置 */}
      {selectedNode.type === 'wait' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            等待时间（秒）
          </label>
          <input
            type="number"
            value={selectedNode.config?.duration || 10}
            onChange={(e) =>
              onNodeUpdate?.(selectedNode.id, {
                config: { ...selectedNode.config, duration: parseInt(e.target.value) },
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
}
