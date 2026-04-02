/**
 * Multi-Agent 协作框架
 * 支持 Agent 间异步消息传递、任务分解、协作协议
 */

// 核心类型 - 类型导出
export type {
  AgentInfo,
  AgentCapability,
  Message,
  MessageHeaders,
  Task,
  SubTask,
  TaskDependency,
  A2AMessage,
  TransportConfig,
  Subscription,
  MessageBusEvent,
  AgentRegistryEvent,
  TaskEvent,
  MultiAgentConfig,
} from './types'

// 核心类型 - 值导出
export {
  MessageType,
  MessagePriority,
  TaskStatus,
  TransportType,
  MultiAgentError,
  MultiAgentErrorType,
} from './types'

// 消息总线
export { MessageBus } from './message-bus'

// Agent 注册表
export { AgentRegistry } from './registry'

// 任务分解引擎
export { TaskDecomposer, DecompositionStrategy } from './task-decomposer'
export type { SubTaskTemplate, TaskTemplate, ITaskDecomposer } from './task-decomposer'

// 协作协议
export { AgentCollaborationProtocol, PROTOCOL_VERSION, PROTOCOL_MESSAGE_TYPES } from './protocol'
export type {
  TaskDelegatePayload,
  TaskStatusPayload,
  TaskResultPayload,
  StateSyncPayload,
  StateQueryPayload,
  CapabilityQueryPayload,
  CapabilityResponsePayload,
  IProtocol,
  IProtocolHandler,
} from './protocol'

// 便捷方法：创建完整的 Multi-Agent 系统
import { MessageBus } from './message-bus'
import { AgentRegistry } from './registry'
import { TaskDecomposer } from './task-decomposer'
import { AgentCollaborationProtocol } from './protocol'
import { TransportType, type MultiAgentConfig } from './types'

export interface MultiAgentSystem {
  messageBus: MessageBus
  registry: AgentRegistry
  taskDecomposer: TaskDecomposer
  createProtocol: (agentId: string) => AgentCollaborationProtocol
  close: () => Promise<void>
}

/**
 * 创建 Multi-Agent 系统
 */
export function createMultiAgentSystem(config?: Partial<MultiAgentConfig>): MultiAgentSystem {
  // 默认配置
  const defaultConfig: MultiAgentConfig = {
    messageBus: {
      defaultTimeout: 30000,
      maxRetryCount: 3,
      retryDelay: 1000,
      bufferSize: 1000,
    },
    registry: {
      heartbeatInterval: 30000,
      heartbeatTimeout: 90000,
      cleanupInterval: 60000,
    },
    taskDecomposer: {
      maxSubTasks: 10,
      defaultPriority: 2, // NORMAL
      enableAutoRetry: true,
    },
    transport: {
      type: TransportType.MEMORY,
    },
  }

  const mergedConfig = {
    ...defaultConfig,
    ...config,
  }

  // 创建消息总线
  const messageBus = new MessageBus(mergedConfig.transport.type, {
    transportUrl: mergedConfig.transport.options?.url,
    defaultTimeout: mergedConfig.messageBus.defaultTimeout,
    maxRetryCount: mergedConfig.messageBus.maxRetryCount,
    retryDelay: mergedConfig.messageBus.retryDelay,
    bufferSize: mergedConfig.messageBus.bufferSize,
  })

  // 创建注册表
  const registry = new AgentRegistry({
    heartbeatInterval: mergedConfig.registry.heartbeatInterval,
    heartbeatTimeout: mergedConfig.registry.heartbeatTimeout,
    cleanupInterval: mergedConfig.registry.cleanupInterval,
  })

  // 创建任务分解器
  const taskDecomposer = new TaskDecomposer(registry, messageBus, {
    maxSubTasks: mergedConfig.taskDecomposer.maxSubTasks,
    enableAutoRetry: mergedConfig.taskDecomposer.enableAutoRetry,
  })

  // 创建协议实例的工厂方法
  const protocols = new Map<string, AgentCollaborationProtocol>()

  const createProtocol = (agentId: string): AgentCollaborationProtocol => {
    const protocol = new AgentCollaborationProtocol(agentId, messageBus, registry, taskDecomposer)
    protocols.set(agentId, protocol)
    return protocol
  }

  // 关闭方法
  const close = async (): Promise<void> => {
    // 清理所有协议实例
    for (const protocol of Array.from(protocols.values())) {
      await protocol.cleanup()
    }
    protocols.clear()

    // 关闭组件
    await taskDecomposer.removeAllListeners?.()
    await registry.close()
    await messageBus.close()
  }

  return {
    messageBus,
    registry,
    taskDecomposer,
    createProtocol,
    close,
  }
}

// 版本信息
export const VERSION = '1.0.0'
