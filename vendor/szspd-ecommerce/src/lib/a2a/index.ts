/**
 * A2A Protocol v2 - Main Export
 * 智能体通信增强模块
 */

// Types
export * from './types'

// Message Queue
export {
  PriorityMessageQueue,
  FileMessageQueue,
  getMessageQueue,
  getFileMessageQueue,
} from './message-queue'

// Agent Registry
export {
  InMemoryAgentRegistry,
  FileAgentRegistry,
  getAgentRegistry,
  getFileAgentRegistry,
} from './agent-registry'

// Task Store
export {
  InMemoryTaskStore,
  FileTaskStore,
  getTaskStore,
  getFileTaskStore,
} from './task-store'