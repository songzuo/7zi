/**
 * A2A Protocol Module
 * Agent-to-Agent communication protocol for 7zi
 */

export type { AgentCard } from './agent-card';
export {
  InMemoryAgentRegistry,
  FileAgentRegistry,
  getAgentRegistry,
  resetAgentRegistry,
} from './agent-registry';
export type { AgentExecutor, RequestContext } from './executor';
export { SimpleEventBus } from './executor';
export type { RequestHandlerOptions } from './jsonrpc-handler';
export { A2ARequestHandler, createRequestHandler } from './jsonrpc-handler';
export { InMemoryTaskStore } from './task-store';
export type { TaskStore } from './task-store';
export { PriorityMessageQueue, getMessageQueue } from './message-queue';

// Types
export type {
  // Core A2A Types
  TaskState,
  TaskStatus,
  Part,
  Message,
  Artifact,
  Task,
  Skill,
  AgentCapabilities,
  SecurityScheme,
  AgentCard as IAgentCard,

  // Request/Response Types
  SendMessageRequest,
  SendMessageConfiguration,
  GetTaskRequest,
  ListTasksRequest,
  ListTasksResponse,
  CancelTaskRequest,

  // Push Notification Types
  PushNotificationConfig,

  // Event Types
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  StreamEvent,

  // JSON-RPC Types
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcBatchResponse,

  // Message Queue Types
  TaskPriority,
  QueueMessage,
  MessageQueue as IMessageQueue,
  QueueConfig,
  QueueEvent,

  // Agent Registry Types
  AgentRegistry as IAgentRegistryType,
  AgentRegistration as IAgentRegistrationType,

  // Enhanced Task
  TaskWithPriority,
} from './types';

export { A2AErrorCodes } from './types';
