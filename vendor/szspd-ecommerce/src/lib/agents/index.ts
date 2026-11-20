/**
 * Agents Module - Unified Exports
 * @/lib/agents
 *
 * This module consolidates all agent-related functionality:
 * - core: Core agent operations (auth, repository, wallet, middleware)
 * - scheduler: Task scheduling and load balancing
 * - a2a: Agent-to-Agent communication protocol
 * - tools: Utility functions for agents
 * - communication: Agent communication utilities
 * - MultiAgentOrchestrator: v1.9.0 Multi-Agent collaboration framework
 *
 * REFACTORED (2026-03-31):
 * - agent/ → core/ (better naming)
 * - agent/communication/ → communication/ (flattened structure)
 *
 * ENHANCED (2026-04-03) v1.9.0:
 * - Added MultiAgentOrchestrator for parallel/sequential agent coordination
 */

// ===== 新的统一导出 =====

// Core agent operations
export * from './core'

// Scheduler
export * from './scheduler'

// A2A Protocol
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
} from './a2a'

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
} from './a2a'

// Tools
export * from './tools'

// Communication
export * from './communication'

// Multi-Agent Orchestrator (v1.9.0)
export {
  MultiAgentOrchestrator,
  createMultiAgentOrchestrator,
  CollaborationScenarios,
} from './MultiAgentOrchestrator'

export type {
  AgentCapabilities as MultiAgentCapabilities,
  OrchestratorTask,
  AgentResult,
  AggregatedResult,
  ResultSummary,
  AggregationStrategy,
  Conflict,
  ConflictResolution,
  WorkflowStep,
  WorkflowResult,
  WorkflowStepResult,
  Condition,
  Branch,
  BranchResult,
  AgentWithTask,
  LoadBalancingOptions,
  RetryConfig,
} from './MultiAgentOrchestrator'

// ===== 向后兼容导出（已废弃） =====

/**
 * @deprecated 使用 @/lib/agents/core 代替
 * 旧版本: export * from './agent'
 */
export {
  generateApiKey,
  hashApiKey,
  validateApiKeyFormat,
  registerAgent,
  authenticateAgent,
  generateAgentToken,
  verifyAgentToken,
  refreshAgentToken,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
} from './core/auth-service'

export {
  initializeAgentTables,
  createAgent,
  getAgentById,
  getAllAgents,
  updateAgent,
  updateAgentStatus,
  deleteAgent,
  updateAgentLastActive,
  validateAgentApiKey,
  mapRowToAgent,
  getAgentDataAccessLog,
  logDataAccess,
} from './core/repository'

export {
  initializeWalletTables,
  createWallet,
  getWalletByAgentId,
  getWalletBalance,
  deposit,
  withdraw,
  transfer,
  getTransactions,
  getWalletStats,
} from './core/wallet-repository'

export {
  withAgentAuth,
  withPermissions,
  withAnyPermission,
  type AgentContext,
} from './core/middleware'
