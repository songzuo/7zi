/**
 * 高级节点执行器注册表
 * 管理所有高级节点类型的执行器
 */

import { NodeExecutor } from '../../lib/workflow/types'
import { NodeType } from '@/types/workflow'
import { AdvancedConditionNodeExecutor } from './ConditionNode'
import { LoopNodeExecutor } from './LoopNode'
import { ParallelNodeExecutor } from './ParallelNode'
import { SubWorkflowNodeExecutor } from './SubWorkflowNode'
import { AIAgentNodeExecutor } from './AIAgentNode'

/**
 * 扩展节点类型映射
 */
export const ExtendedNodeType = {
  ...NodeType,
  LOOP: 'loop',
  SUBWORKFLOW: 'subworkflow',
} as const

export type ExtendedNodeType = (typeof ExtendedNodeType)[keyof typeof ExtendedNodeType]

/**
 * 高级节点执行器注册表
 */
export class AdvancedNodeRegistry {
  private executors: Map<string, NodeExecutor> = new Map()
  private static instance: AdvancedNodeRegistry | null = null

  private constructor() {
    // 注册高级节点执行器
    this.registerAdvancedExecutors()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): AdvancedNodeRegistry {
    if (!AdvancedNodeRegistry.instance) {
      AdvancedNodeRegistry.instance = new AdvancedNodeRegistry()
    }
    return AdvancedNodeRegistry.instance
  }

  /**
   * 注册高级执行器
   */
  private registerAdvancedExecutors(): void {
    // 高级条件节点
    this.register(new AdvancedConditionNodeExecutor())

    // 循环节点
    this.register(new LoopNodeExecutor())

    // 并行节点（高级版）
    this.register(new ParallelNodeExecutor())

    // 子工作流节点
    this.register(new SubWorkflowNodeExecutor())

    // AI Agent 节点（高级版）
    this.register(new AIAgentNodeExecutor())
  }

  /**
   * 注册执行器
   */
  register(executor: NodeExecutor): void {
    const supportedTypes = [
      NodeType.CONDITION,
      NodeType.PARALLEL,
      NodeType.AGENT,
      ExtendedNodeType.LOOP,
      ExtendedNodeType.SUBWORKFLOW,
    ]

    for (const nodeType of supportedTypes) {
      if (executor.canHandle(nodeType)) {
        this.executors.set(nodeType, executor)
      }
    }
  }

  /**
   * 获取指定类型的执行器
   */
  get(nodeType: string): NodeExecutor | undefined {
    return this.executors.get(nodeType)
  }

  /**
   * 检查是否有可用的执行器
   */
  has(nodeType: string): boolean {
    return this.executors.has(nodeType)
  }

  /**
   * 获取所有已注册的节点类型
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.executors.keys())
  }

  /**
   * 取消注册执行器
   */
  unregister(nodeType: string): void {
    this.executors.delete(nodeType)
  }

  /**
   * 清除所有执行器
   */
  clear(): void {
    this.executors.clear()
  }

  /**
   * 获取执行器信息
   */
  getExecutorInfo(): Array<{
    nodeType: string
    hasExecutor: boolean
  }> {
    const types = [
      NodeType.CONDITION,
      NodeType.PARALLEL,
      NodeType.AGENT,
      ExtendedNodeType.LOOP,
      ExtendedNodeType.SUBWORKFLOW,
    ]

    return types.map(nodeType => ({
      nodeType,
      hasExecutor: this.has(nodeType),
    }))
  }
}

// 导出单例实例
export const advancedNodeRegistry = AdvancedNodeRegistry.getInstance()