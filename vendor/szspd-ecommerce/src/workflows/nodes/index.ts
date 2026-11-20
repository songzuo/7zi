/**
 * 高级工作流节点模块
 * 导出所有高级节点执行器和相关工具
 */

// 节点执行器
export { AdvancedConditionNodeExecutor } from './ConditionNode'
export type { ConditionBranch, AdvancedConditionConfig } from './ConditionNode'

export { LoopNodeExecutor, LoopType } from './LoopNode'
export type { LoopConfig, LoopExecutionResult } from './LoopNode'

export { ParallelNodeExecutor, FailureStrategy, AggregationStrategy } from './ParallelNode'
export type {
  ParallelBranch,
  ParallelConfig,
  BranchExecutionResult,
  ParallelExecutionResult,
} from './ParallelNode'

export { SubWorkflowNodeExecutor } from './SubWorkflowNode'
export type { SubWorkflowConfig, SubWorkflowExecutionResult } from './SubWorkflowNode'

export { AIAgentNodeExecutor, AIProvider } from './AIAgentNode'
export type {
  AIAgentConfig,
  AITool,
  AIAgentExecutionResult,
} from './AIAgentNode'

// 节点注册表
export { AdvancedNodeRegistry, advancedNodeRegistry, ExtendedNodeType } from './NodeRegistry'
export type { ExtendedNodeType as ExtendedNodeTypeType } from './NodeRegistry'

// DSL 解析器
export { DSLParser, dslParser } from '../DSLParser'
export type { DSLParseResult, DSLNodeDefinition, DSLEdgeDefinition, DSLWorkflowDefinition } from '../DSLParser'