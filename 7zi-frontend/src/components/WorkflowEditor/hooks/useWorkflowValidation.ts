/**
 * useWorkflowValidation - 工作流验证 Hook
 *
 * 验证工作流的结构和配置
 */

import { useMemo } from 'react';
import type { Edge, Node } from 'reactflow';
import type { ValidationError } from '../types';

interface UseWorkflowValidationProps {
  nodes: Node[];
  edges: Edge[];
}

export function useWorkflowValidation({ nodes, edges }: UseWorkflowValidationProps) {
  const validationErrors = useMemo(() => {
    const errors: ValidationError[] = [];

    // 1. 检查是否有 Start 节点
    const startNodes = nodes.filter((n) => n.data.type === 'start');
    if (startNodes.length === 0) {
      errors.push({
        type: 'structure',
        severity: 'error',
        message: '工作流必须有一个 Start 节点',
      });
    } else if (startNodes.length > 1) {
      errors.push({
        type: 'structure',
        severity: 'error',
        message: '工作流只能有一个 Start 节点',
      });
    }

    // 2. 检查是否有 End 节点
    const endNodes = nodes.filter((n) => n.data.type === 'end');
    if (endNodes.length === 0) {
      errors.push({
        type: 'structure',
        severity: 'error',
        message: '工作流必须有一个 End 节点',
      });
    }

    // 3. 检查 Start 节点的连接
    startNodes.forEach((startNode) => {
      const outgoingEdges = edges.filter((e) => e.source === startNode.id);
      if (outgoingEdges.length === 0) {
        errors.push({
          type: 'structure',
          severity: 'error',
          message: 'Start 节点必须连接到下一个节点',
          nodeId: startNode.id,
        });
      }
    });

    // 4. 检查 End 节点的连接
    endNodes.forEach((endNode) => {
      const incomingEdges = edges.filter((e) => e.target === endNode.id);
      if (incomingEdges.length === 0) {
        errors.push({
          type: 'structure',
          severity: 'error',
          message: 'End 节点必须被连接',
          nodeId: endNode.id,
        });
      }
    });

    // 5. 检查每个节点的连接（除了 Start 和 End）
    nodes.forEach((node) => {
      if (node.data.type === 'start' || node.data.type === 'end') {
        return;
      }

      const incomingEdges = edges.filter((e) => e.target === node.id);
      const outgoingEdges = edges.filter((e) => e.source === node.id);

      if (incomingEdges.length === 0) {
        errors.push({
          type: 'structure',
          severity: 'error',
          message: '节点必须有入边',
          nodeId: node.id,
        });
      }

      if (outgoingEdges.length === 0) {
        errors.push({
          type: 'structure',
          severity: 'error',
          message: '节点必须有出边',
          nodeId: node.id,
        });
      }
    });

    // 6. 检查节点配置
    nodes.forEach((node) => {
      // Agent 节点必须配置 agentType
      if (node.data.type === 'agent' && !node.data.config.agentType) {
        errors.push({
          type: 'config',
          severity: 'error',
          message: 'Agent 节点必须配置 Agent 类型',
          nodeId: node.id,
        });
      }

      // Condition 节点必须配置条件表达式
      if (node.data.type === 'condition' && !node.data.config.condition) {
        errors.push({
          type: 'config',
          severity: 'error',
          message: 'Condition 节点必须配置条件表达式',
          nodeId: node.id,
        });
      }

      // Wait 节点必须配置等待类型和时长
      if (node.data.type === 'wait') {
        if (!node.data.config.waitType) {
          errors.push({
            type: 'config',
            severity: 'error',
            message: 'Wait 节点必须配置等待类型',
            nodeId: node.id,
          });
        } else if (node.data.config.waitType === 'duration' && !node.data.config.duration) {
          errors.push({
            type: 'config',
            severity: 'error',
            message: 'Wait 节点必须配置等待时长',
            nodeId: node.id,
          });
        }
      }
    });

    // 7. 检查条件分支
    const conditionNodes = nodes.filter((n) => n.data.type === 'condition');
    conditionNodes.forEach((conditionNode) => {
      const outgoingEdges = edges.filter((e) => e.source === conditionNode.id);
      if (outgoingEdges.length < 2) {
        errors.push({
          type: 'logic',
          severity: 'error',
          message: 'Condition 节点必须有至少两个出边（True 和 False）',
          nodeId: conditionNode.id,
        });
      }
    });

    // 8. 检查循环
    // 简单的循环检测：检查每个节点是否可以到达自己
    nodes.forEach((node) => {
      if (canReachNode(node.id, node.id, nodes, edges, new Set())) {
        errors.push({
          type: 'logic',
          severity: 'warning',
          message: '检测到可能的循环',
          nodeId: node.id,
        });
      }
    });

    return errors;
  }, [nodes, edges]);

  const validateWorkflow = useCallback(() => {
    return {
      valid: validationErrors.filter((e) => e.severity === 'error').length === 0,
      errors: validationErrors,
    };
  }, [validationErrors]);

  return {
    validationErrors,
    validateWorkflow,
  };
}

/**
 * 检查从 startId 到 endId 是否存在路径
 */
function canReachNode(
  currentId: string,
  targetId: string,
  nodes: Node[],
  edges: Edge[],
  visited: Set<string>
): boolean {
  if (visited.has(currentId)) {
    return false;
  }

  if (currentId === targetId) {
    return true;
  }

  visited.add(currentId);

  const outgoingEdges = edges.filter((e) => e.source === currentId);
  for (const edge of outgoingEdges) {
    if (canReachNode(edge.target, targetId, nodes, edges, visited)) {
      return true;
    }
  }

  return false;
}

// 导出 useCallback for completeness
function useCallback<T extends (...args: any[]) => any>(fn: T, deps: any[]): T {
  return fn;
}
