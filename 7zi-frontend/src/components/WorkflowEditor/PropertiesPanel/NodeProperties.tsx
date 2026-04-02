/**
 * NodeProperties - 节点属性编辑器
 *
 * 编辑单个节点的属性
 */

import React from 'react';
import type { Node } from 'reactflow';
import type { WorkflowNodeData } from '../types';

interface NodePropertiesProps {
  node: Node<WorkflowNodeData>;
  onChange?: (data: Partial<WorkflowNodeData>) => void;
}

export function NodeProperties({ node, onChange }: NodePropertiesProps) {
  const { data } = node;

  const handleChange = (field: string, value: unknown) => {
    onChange?.({ [field]: value });
  };

  const handleConfigChange = (field: string, value: unknown) => {
    onChange?.({
      config: {
        ...data.config,
        [field]: value,
      },
    });
  };

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        节点属性
      </h2>

      {/* 基本信息 */}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            节点 ID
          </label>
          <input
            type="text"
            value={data.id}
            disabled
            className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            名称
          </label>
          <input
            type="text"
            value={data.label}
            onChange={(e) => handleChange('label', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
            placeholder="输入节点名称"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            描述
          </label>
          <textarea
            value={data.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
            placeholder="输入节点描述（可选）"
          />
        </div>
      </div>

      {/* 节点特定配置 */}
      {data.type === 'agent' && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            Agent 配置
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Agent 类型
              </label>
              <input
                type="text"
                value={data.config.agentType || ''}
                onChange={(e) => handleConfigChange('agentType', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                placeholder="例如: researcher"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                超时 (毫秒)
              </label>
              <input
                type="number"
                value={data.config.timeout || ''}
                onChange={(e) => handleConfigChange('timeout', Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                placeholder="例如: 30000"
              />
            </div>
          </div>
        </div>
      )}

      {data.type === 'condition' && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            条件配置
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                条件表达式
              </label>
              <input
                type="text"
                value={data.config.condition || ''}
                onChange={(e) => handleConfigChange('condition', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                placeholder="例如: inputs.value > 10"
              />
            </div>
          </div>
        </div>
      )}

      {data.type === 'wait' && (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            等待配置
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                等待类型
              </label>
              <select
                value={data.config.waitType || 'duration'}
                onChange={(e) => handleConfigChange('waitType', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
              >
                <option value="duration">时间等待</option>
                <option value="event">事件等待</option>
              </select>
            </div>
            {data.config.waitType === 'duration' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  等待时长 (毫秒)
                </label>
                <input
                  type="number"
                  value={data.config.duration || ''}
                  onChange={(e) => handleConfigChange('duration', Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-800"
                  placeholder="例如: 5000"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
