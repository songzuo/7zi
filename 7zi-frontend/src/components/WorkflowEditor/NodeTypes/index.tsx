/**
 * NodeTypes - 节点类型注册
 *
 * 为 React Flow 定义自定义节点类型
 */

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { StartNode } from './StartNode';
import { EndNode } from './EndNode';
import { AgentNode } from './AgentNode';
import { ConditionNode } from './ConditionNode';
import { ParallelNode } from './ParallelNode';
import { WaitNode } from './WaitNode';
import type { WorkflowNodeData } from '../types';

/**
 * Start 节点类型
 */
export const startNodeType = memo((props: NodeProps<WorkflowNodeData>) => (
  <StartNode {...props} />
));
startNodeType.displayName = 'StartNode';

/**
 * End 节点类型
 */
export const endNodeType = memo((props: NodeProps<WorkflowNodeData>) => (
  <EndNode {...props} />
));
endNodeType.displayName = 'EndNode';

/**
 * Agent 节点类型
 */
export const agentNodeType = memo((props: NodeProps<WorkflowNodeData>) => (
  <AgentNode {...props} />
));
agentNodeType.displayName = 'AgentNode';

/**
 * Condition 节点类型
 */
export const conditionNodeType = memo((props: NodeProps<WorkflowNodeData>) => (
  <ConditionNode {...props} />
));
conditionNodeType.displayName = 'ConditionNode';

/**
 * Parallel 节点类型
 */
export const parallelNodeType = memo((props: NodeProps<WorkflowNodeData>) => (
  <ParallelNode {...props} />
));
parallelNodeType.displayName = 'ParallelNode';

/**
 * Wait 节点类型
 */
export const waitNodeType = memo((props: NodeProps<WorkflowNodeData>) => (
  <WaitNode {...props} />
));
waitNodeType.displayName = 'WaitNode';

/**
 * 导出所有节点类型
 */
export const nodeTypes = {
  start: startNodeType,
  end: endNodeType,
  agent: agentNodeType,
  condition: conditionNodeType,
  parallel: parallelNodeType,
  wait: waitNodeType,
};
