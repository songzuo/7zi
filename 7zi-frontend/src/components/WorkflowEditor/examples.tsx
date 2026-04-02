/**
 * 工作流编辑器使用示例
 *
 * 🎨 设计师: Designer
 * 创建日期: 2026-04-01
 *
 * 这个文件展示了如何在应用中集成和使用工作流编辑器
 */

import React, { useState } from 'react';
import { WorkflowEditor } from '@/components/WorkflowEditor';

/**
 * 示例 1: 基本使用
 */
export function BasicExample() {
  const handleSave = (workflow: unknown) => {
    console.log('保存工作流:', workflow);

    // 调用 API 保存
    fetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow),
    }).catch((err) => {
      console.error('保存失败:', err);
      alert('保存失败');
    });

    alert('工作流已保存');
  };

  return (
    <WorkflowEditor
      onSave={(w) => handleSave(w)}
      readOnly={false}
    />
  );
}

/**
 * 示例 2: 预设工作流
 */
export function PresetWorkflowExample() {
  // 预设节点
  const initialNodes = [
    {
      id: 'start',
      type: 'start' as const,
      position: { x: 0, y: 200 },
      data: {
        id: 'start',
        type: 'start' as const,
        label: '开始',
        config: {},
      },
    },
    {
      id: 'agent-1',
      type: 'agent' as const,
      position: { x: 250, y: 200 },
      data: {
        id: 'agent-1',
        type: 'agent' as const,
        label: '数据处理',
        description: '处理输入数据',
        config: {
          agentType: 'processor',
          timeout: 30000,
        },
      },
    },
    {
      id: 'condition-1',
      type: 'condition' as const,
      position: { x: 500, y: 200 },
      data: {
        id: 'condition-1',
        type: 'condition' as const,
        label: '条件判断',
        config: {
          condition: 'inputs.result > 0.5',
        },
      },
    },
    {
      id: 'end',
      type: 'end' as const,
      position: { x: 750, y: 200 },
      data: {
        id: 'end',
        type: 'end' as const,
        label: '结束',
        config: {},
      },
    },
  ];

  // 预设边
  const initialEdges = [
    { id: 'e1', source: 'start', target: 'agent-1' },
    { id: 'e2', source: 'agent-1', target: 'condition-1' },
    {
      id: 'e3',
      source: 'condition-1',
      target: 'end',
      sourceHandle: 'true',
    },
  ];

  return (
    <WorkflowEditor
      workflowId="preset-workflow"
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      onSave={console.log}
    />
  );
}

/**
 * 示例 3: 只读查看模式
 */
export function ReadOnlyExample({ workflowId }: { workflowId: string }) {
  return (
    <div className="h-screen">
      <WorkflowEditor
        workflowId={workflowId}
        readOnly={true}
        onSave={() => {}}
      />
    </div>
  );
}

/**
 * 示例 4: 完整的工作流管理页面
 */
export function WorkflowManagementPage() {
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = (workflow: unknown) => {
    const url = workflowId
      ? `/api/workflows/${workflowId}`
      : '/api/workflows';

    fetch(url, {
      method: workflowId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workflow),
    })
      .then((response) => {
        if (!response.ok) throw new Error('保存失败');
        return response.json();
      })
      .then((savedWorkflow) => {
        setWorkflowId(savedWorkflow.id);
        setIsCreating(false);
        alert('保存成功');
      })
      .catch((error) => {
        console.error('保存失败:', error);
        alert('保存失败: ' + (error as Error).message);
      });
  };

  const handleCreateNew = () => {
    setWorkflowId(null);
    setIsCreating(true);
  };

  return (
    <div className="h-screen">
      {/* 顶部操作栏 */}
      <div className="border-b border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            工作流管理
          </h1>
          <button
            onClick={handleCreateNew}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            创建新工作流
          </button>
        </div>
      </div>

      {/* 工作流编辑器 */}
      {isCreating || workflowId ? (
        <WorkflowEditor
          workflowId={workflowId || undefined}
          onSave={(w) => handleSave(w)}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="mb-4 text-gray-500 dark:text-gray-400">
              选择一个工作流进行编辑，或创建新的工作流
            </p>
            <button
              onClick={handleCreateNew}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
            >
              创建新工作流
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BasicExample;
