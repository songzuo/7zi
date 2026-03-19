/**
 * A2A Protocol Types for 7zi
 * Based on A2A Protocol Specification v0.3.0
 */

// Core A2A Types
export type TaskState =
  | 'submitted'
  | 'working'
  | 'input-required'
  | 'auth-required'
  | 'completed'
  | 'canceled'
  | 'failed'
  | 'rejected';

export interface TaskStatus {
  state: TaskState;
  timestamp: string;
  message?: string;
}

export interface Part {
  kind: 'text' | 'file' | 'data';
  text?: string;
  file?: {
    name?: string;
    mimeType?: string;
    bytes?: string;
    uri?: string;
  };
  data?: Record<string, unknown>;
}

export interface Message {
  kind: 'message';
  messageId: string;
  role: 'user' | 'agent';
  parts: Part[];
  contextId?: string;
  referenceTaskIds?: string[];
  createdAt?: string;
}

export interface Artifact {
  artifactId: string;
  name?: string;
  description?: string;
  parts: Part[];
  metadata?: Record<string, unknown>;
}

export interface Task {
  kind: 'task';
  id: string;
  contextId?: string;
  status: TaskStatus;
  history?: Message[];
  artifacts?: Artifact[];
  metadata?: Record<string, unknown>;
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

export interface AgentCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  stateTransitionHistory?: boolean;
  extendedAgentCard?: boolean;
}

export interface SecurityScheme {
  type: string;
  description?: string;
  scheme?: string;
  bearerFormat?: string;
  in?: string;
  name?: string;
  flows?: Record<string, unknown>;
  openIdConnectUrl?: string;
}

export interface AgentCard {
  name: string;
  description?: string;
  version: string;
  protocolVersion: string;
  url: string;
  skills: Skill[];
  capabilities?: AgentCapabilities;
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  additionalInterfaces?: Array<{
    url: string;
    transport: 'JSONRPC' | 'GRPC' | 'HTTP+JSON';
  }>;
  securitySchemes?: Record<string, SecurityScheme>;
  security?: Array<Record<string, string[]>>;
  documentationUrl?: string;
  provider?: {
    organization?: string;
    url?: string;
  };
}

// Request/Response Types
export interface SendMessageRequest {
  message: Message;
  configuration?: SendMessageConfiguration;
  metadata?: Record<string, unknown>;
}

export interface SendMessageConfiguration {
  acceptedOutputModes?: string[];
  blocking?: boolean;
  historyLength?: number;
  pushNotificationConfig?: PushNotificationConfig;
}

export interface GetTaskRequest {
  id: string;
  historyLength?: number;
}

export interface ListTasksRequest {
  contextId?: string;
  status?: TaskState;
  pageSize?: number;
  pageToken?: string;
  historyLength?: number;
  includeArtifacts?: boolean;
}

export interface ListTasksResponse {
  tasks: Task[];
  nextPageToken: string;
  pageSize: number;
  totalSize: number;
}

export interface CancelTaskRequest {
  id: string;
  metadata?: Record<string, unknown>;
}

// Push Notification Types
export interface PushNotificationConfig {
  id?: string;
  url: string;
  token?: string;
  authentication?: {
    schemes?: string[];
    credentials?: string;
  };
}

// Event Types
export interface TaskStatusUpdateEvent {
  kind: 'status-update';
  taskId: string;
  contextId?: string;
  status: TaskStatus;
  final: boolean;
  metadata?: Record<string, unknown>;
}

export interface TaskArtifactUpdateEvent {
  kind: 'artifact-update';
  taskId: string;
  contextId?: string;
  artifact: Artifact;
  append?: boolean;
  lastChunk?: boolean;
  metadata?: Record<string, unknown>;
}

export type StreamEvent = Task | Message | TaskStatusUpdateEvent | TaskArtifactUpdateEvent;

// JSON-RPC Types
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id?: string | number;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: JsonRpcError;
  id?: string | number | null;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// Batch response type
export type JsonRpcBatchResponse = JsonRpcResponse[];

// Error Codes
export const A2AErrorCodes = {
  // JSON-RPC Standard Errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,

  // A2A Specific Errors
  TASK_NOT_FOUND: -32001,
  TASK_NOT_CANCELABLE: -32002,
  PUSH_NOTIFICATION_NOT_SUPPORTED: -32003,
  UNSUPPORTED_OPERATION: -32004,
  CONTENT_TYPE_NOT_SUPPORTED: -32005,
  INVALID_AGENT_RESPONSE: -32006,
  EXTENDED_AGENT_CARD_NOT_CONFIGURED: -32007,
  EXTENSION_SUPPORT_REQUIRED: -32008,
  VERSION_NOT_SUPPORTED: -32009,
} as const;