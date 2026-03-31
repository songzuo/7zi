/**
 * Agents Module - Unified Exports
 * @/lib/agents
 *
 * This module consolidates all agent-related functionality:
 * - agent: Core agent operations (auth, repository, wallet, middleware)
 * - scheduler: Task scheduling and load balancing
 * - a2a: Agent-to-Agent communication protocol
 * - tools: Utility functions for agents
 */

// Re-export all submodules
export * from './agent';
export * from './scheduler';

// Re-export a2a types with explicit naming to avoid conflicts
export {
  InMemoryAgentRegistry,
  FileAgentRegistry,
  getAgentRegistry,
  resetAgentRegistry,
  SimpleEventBus,
  A2ARequestHandler,
  createRequestHandler,
  InMemoryTaskStore,
  PriorityMessageQueue,
  getMessageQueue,
  A2AErrorCodes,
} from './a2a';

export type {
  AgentCard,
  AgentExecutor,
  RequestContext,
  RequestHandlerOptions,
  TaskStore,
  TaskState,
  TaskStatus,
  Part,
  Message,
  Artifact,
  // Rename a2a Task to avoid conflict with scheduler Task
  Task as A2ATask,
  Skill,
  AgentCapabilities,
  SecurityScheme,
  SendMessageRequest,
  SendMessageConfiguration,
  GetTaskRequest,
  ListTasksRequest,
  ListTasksResponse,
  CancelTaskRequest,
  PushNotificationConfig,
  TaskStatusUpdateEvent,
  TaskArtifactUpdateEvent,
  StreamEvent,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcBatchResponse,
  TaskPriority,
  QueueMessage,
  IMessageQueue as MessageQueue,
  QueueConfig,
  QueueEvent,
  IAgentRegistryType as AgentRegistry,
  IAgentRegistrationType as AgentRegistration,
  TaskWithPriority,
} from './a2a';

// Tools
export * from './tools';
