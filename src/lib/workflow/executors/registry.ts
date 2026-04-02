/**
 * 节点执行器注册表
 * 管理所有节点类型的执行器
 */

import { NodeExecutor } from '../types'
import { NodeType } from '@/types/workflow'
import { StartNodeExecutor } from './start-executor'
import { EndNodeExecutor } from './end-executor'
import { AgentNodeExecutor } from './agent-executor'
import { ConditionNodeExecutor } from './condition-executor'
import { ParallelNodeExecutor } from './parallel-executor'
import { WaitNodeExecutor } from './wait-executor'

export class NodeExecutorRegistry {
  private executors: Map<NodeType, NodeExecutor> = new Map()

  constructor() {
    // 注册内置执行器
    this.register(new StartNodeExecutor())
    this.register(new EndNodeExecutor())
    this.register(new AgentNodeExecutor())
    this.register(new ConditionNodeExecutor())
    this.register(new ParallelNodeExecutor())
    this.register(new WaitNodeExecutor())
  }

  /**
   * 注册执行器
   */
  register(executor: NodeExecutor): void {
    // 获取所有支持的节点类型
    const nodeTypes = Object.values(NodeType)

    for (const nodeType of nodeTypes) {
      if (executor.canHandle(nodeType)) {
        this.executors.set(nodeType, executor)
      }
    }
  }

  /**
   * 获取指定类型的执行器
   */
  get(nodeType: NodeType): NodeExecutor | undefined {
    return this.executors.get(nodeType)
  }

  /**
   * 检查是否有可用的执行器
   */
  has(nodeType: NodeType): boolean {
    return this.executors.has(nodeType)
  }

  /**
   * 获取所有已注册的节点类型
   */
  getRegisteredTypes(): NodeType[] {
    return Array.from(this.executors.keys())
  }

  /**
   * 取消注册执行器
   */
  unregister(nodeType: NodeType): void {
    this.executors.delete(nodeType)
  }

  /**
   * 清除所有执行器
   */
  clear(): void {
    this.executors.clear()
  }
}

// 导出单例实例
export const nodeExecutorRegistry = new NodeExecutorRegistry()
