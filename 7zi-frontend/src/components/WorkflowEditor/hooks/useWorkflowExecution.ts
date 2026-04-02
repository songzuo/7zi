/**
 * useWorkflowExecution - 工作流执行 Hook
 *
 * 集成 EnhancedWorkflowExecutor 进行工作流执行
 */

import { useState, useCallback, useEffect } from 'react';
import type { Edge, Node } from 'reactflow';
import type { WorkflowInstance, ExecutionLog } from '../types';
import type { ExecutionState } from '../types';

interface UseWorkflowExecutionProps {
  workflowId?: string;
  nodes: Node[];
  edges: Edge[];
}

export function useWorkflowExecution({ workflowId, nodes, edges }: UseWorkflowExecutionProps) {
  const [executionState, setExecutionState] = useState<ExecutionState | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);

  const addLog = useCallback((log: Omit<ExecutionLog, 'timestamp'>) => {
    setLogs((prev) => [
      ...prev,
      {
        ...log,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  const startExecution = useCallback(async () => {
    if (!workflowId) {
      console.error('Workflow ID is required for execution');
      return;
    }

    try {
      setIsExecuting(true);
      setLogs([]);

      addLog({
        level: 'info',
        message: '开始执行工作流',
      });

      // 构建工作流定义
      const workflowDefinition = {
        id: workflowId,
        name: 'Workflow',
        nodes: nodes.map((node) => ({
          id: node.data.id,
          type: node.data.type,
          config: node.data.config,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          conditionConfig: edge.data?.conditionConfig,
        })),
      };

      // TODO: 集成真实的 EnhancedWorkflowExecutor
      // 当前为模拟实现
      const instance = await mockExecuteWorkflow(workflowDefinition);

      setExecutionState({
        instance,
        nodeStates: {},
      });

      addLog({
        level: 'info',
        message: '工作流执行完成',
      });
    } catch (error) {
      console.error('Workflow execution error:', error);
      addLog({
        level: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsExecuting(false);
    }
  }, [workflowId, nodes, edges, addLog]);

  const stopExecution = useCallback(() => {
    setIsExecuting(false);
    addLog({
      level: 'warn',
      message: '工作流执行已停止',
    });
  }, [addLog]);

  return {
    executionState,
    isExecuting,
    logs,
    startExecution,
    stopExecution,
  };
}

/**
 * 模拟工作流执行
 * TODO: 替换为真实的 EnhancedWorkflowExecutor 调用
 */
async function mockExecuteWorkflow(workflowDefinition: any): Promise<WorkflowInstance> {
  return new Promise((resolve) => {
    const instance: WorkflowInstance = {
      id: `instance-${Date.now()}`,
      workflowId: workflowDefinition.id,
      status: 'COMPLETED',
      startTime: Date.now(),
      endTime: Date.now() + 5000,
      progress: {
        total: workflowDefinition.nodes.length,
        completed: workflowDefinition.nodes.length,
        failed: 0,
        percentage: 100,
      },
      inputs: {},
      outputs: {},
      variables: {},
      error: undefined,
    };

    setTimeout(() => {
      resolve(instance);
    }, 2000);
  });
}
