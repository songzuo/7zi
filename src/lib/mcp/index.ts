/**
 * MCP Server Index
 *
 * Main entry point for MCP functionality.
 *
 * @module mcp
 */

// Core server
export { SevenZiMcpServer, getMcpServer, mcpServer } from './server'
export type { McpServerConfig, ToolDefinition } from './server'

// HTTP transport
export {
  MCPHttpTransport,
  sessionManager,
  toSSE,
  parseSSE,
  MCPSessionManager,
} from './http-transport'

// Tools
export { toolRegistry, ToolRegistry, initializeDefaultTools } from './tools'
export type { ToolCategory, ExtendedToolDefinition } from './tools'

// Registry (new)
export { MCPToolRegistry, mcpRegistry, defineTool, MCPRegistryError } from './registry'
// Re-export z from zod for convenience
export { z } from 'zod'
export type {
  ToolMetadata,
  ToolParameter,
  ToolReturn,
  ToolContext,
  ToolResult,
  RegistryEvent,
  RegistrySnapshot,
} from './registry'

// Resources (new)
export {
  MCPResourceManager,
  mcpResourceManager,
  FileSystemResourceProvider,
  MCPResourceError,
} from './resources'
export type {
  ResourceProvider,
  ResourceType,
  ResourceContentType,
  ResourceMetadata,
  ResourceContent,
  ResourceSubscription,
  ResourceChangeEvent,
  ResourceSubscriptionFilter,
  CachePolicy,
  ResourceReadOptions,
  ResourceContext,
} from './resources'

// Prompts (new)
export {
  MCPPromptsManager,
  mcpPromptsManager,
  DefaultMarketplaceClient,
  initializeDefaultPrompts,
  MCPPromptsError,
} from './prompts'
export type {
  MarketplaceClient,
  PromptTemplate,
  PromptMetadata,
  PromptParameter,
  CompiledPrompt,
  MarketplaceTemplate,
  MarketplaceFilter,
  PromptCategory,
  PromptStatus,
} from './prompts'

// Auth (new)
export {
  MCPAuthManager,
  mcpAuthManager,
  ConsoleAuditLogger,
  FileAuditLogger,
  withAuth,
  createAccessRequest,
  MCPAuthError,
} from './auth'
export type {
  Role,
  Permission,
  UserSession,
  AccessRequest,
  AccessDecision,
  AuditLogEntry,
  AuditQuery,
  PermissionLevel,
  ResourceScope,
} from './auth'

// Streaming (new)
export {
  MCPStreamServer,
  mcpStreamServer,
  StreamingToolExecutor,
  streamingExecutor,
  SSEResponse,
  SSEParser,
  MCPStreamError,
} from './streaming'
export type {
  SSEEvent,
  SSEEventType,
  ProgressInfo,
  StreamingContext,
  StreamInfo,
  StreamState,
  StreamingToolOptions,
  StreamingToolResult,
  ProgressCallback,
} from './streaming'
