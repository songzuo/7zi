/**
 * NodeTypes - 节点类型注册
 *
 * 为 React Flow 定义自定义节点类型
 * v1.9.1 新增: loop, subworkflow, transform 节点
 * v1.10.1 新增: NodeWrapper 统一样式和选择高亮
 */

import { memo } from 'react'
import type { NodeProps } from 'reactflow'

import { StartNode } from './StartNode'
import { EndNode } from './EndNode'
import { AgentNode } from './AgentNode'
import { ConditionNode } from './ConditionNode'
import { ParallelNode } from './ParallelNode'
import { WaitNode } from './WaitNode'
import { HumanInputNode } from './HumanInputNode'

// v1.9.1 新增节点
import { LoopNode } from './LoopNode'
import { SubworkflowNode } from './SubworkflowNode'
import { TransformNode } from './TransformNode'

// v1.10.1 新增：节点包装组件
export { NodeWrapper, InputHandle, OutputHandle, TopHandle, BottomHandle, NodeIcon, NodeTitle, NodeDescription } from './NodeWrapper'

import type { WorkflowNodeData } from '../types'

/**
 * Start 节点类型
 */
export const startNodeType = memo((props: NodeProps<WorkflowNodeData>) => <StartNode {...props} />)
startNodeType.displayName = 'StartNode'

/**
 * End 节点类型
 */
export const endNodeType = memo((props: NodeProps<WorkflowNodeData>) => <EndNode {...props} />)
endNodeType.displayName = 'EndNode'

/**
 * Agent 节点类型
 */
export const agentNodeType = memo((props: NodeProps<WorkflowNodeData>) => <AgentNode {...props} />)
agentNodeType.displayName = 'AgentNode'

/**
 * Condition 节点类型
 */
export const conditionNodeType = memo((props: NodeProps<WorkflowNodeData>) => (
  <ConditionNode {...props} />
))
conditionNodeType.displayName = 'ConditionNode'

/**
 * Parallel 节点类型
 */
export const parallelNodeType = memo((props: NodeProps<WorkflowNodeData>) => (
  <ParallelNode {...props} />
))
parallelNodeType.displayName = 'ParallelNode'

/**
 * Wait 节点类型
 */
export const waitNodeType = memo((props: NodeProps<WorkflowNodeData>) => <WaitNode {...props} />)
waitNodeType.displayName = 'WaitNode'

/**
 * HumanInput 节点类型
 */
export const humanInputNodeType = memo((props: NodeProps<WorkflowNodeData>) => (
  <HumanInputNode {...props} />
))
humanInputNodeType.displayName = 'HumanInputNode'

/**
 * v1.9.1: Loop 节点类型
 */
export const loopNodeType = memo((props: NodeProps<WorkflowNodeData>) => <LoopNode {...props} />)
loopNodeType.displayName = 'LoopNode'

/**
 * v1.9.1: Subworkflow 节点类型
 */
export const subworkflowNodeType = memo((props: NodeProps<WorkflowNodeData>) => (
  <SubworkflowNode {...props} />
))
subworkflowNodeType.displayName = 'SubworkflowNode'

/**
 * v1.9.1: Transform 节点类型
 */
export const transformNodeType = memo((props: NodeProps<WorkflowNodeData>) => (
  <TransformNode {...props} />
))
transformNodeType.displayName = 'TransformNode'

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
  humanInput: humanInputNodeType,
  // v1.9.1 新增
  loop: loopNodeType,
  subworkflow: subworkflowNodeType,
  transform: transformNodeType,
}
