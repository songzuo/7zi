/**
 * MCP Server Index
 * 
 * Main entry point for MCP functionality.
 * 
 * @module mcp
 */

// Core server
export { SevenZiMcpServer, getMcpServer, mcpServer, type McpServerConfig, type ToolDefinition } from './server';

// HTTP transport
export { MCPHttpTransport, sessionManager, toSSE, parseSSE, MCPSessionManager } from './http-transport';

// Tools
export { toolRegistry, ToolRegistry, initializeDefaultTools, type ToolCategory, type ExtendedToolDefinition } from './tools';

// Registry (new)
export {
  MCPToolRegistry,
  mcpRegistry,
  defineTool,
  type ToolMetadata,
  type ToolParameter,
  type ToolReturn,
  type ToolContext,
  type ToolResult,
  type RegistryEvent,
  type RegistrySnapshot,
  MCPRegistryError,
} from './registry';

// Resources (new)
export {
  MCPResourceManager,
  mcpResourceManager,
  FileSystemResourceProvider,
  ResourceProvider,
  type ResourceType,
  type ResourceContentType,
  type ResourceMetadata,
  type ResourceContent,
  type ResourceSubscription,
  type ResourceChangeEvent,
  type ResourceSubscriptionFilter,
  type CachePolicy,
  type ResourceReadOptions,
  type ResourceContext,
  MCPResourceError,
} from './resources';

// Prompts (new)
export {
  MCPPromptsManager,
  mcpPromptsManager,
  MarketplaceClient,
  DefaultMarketplaceClient,
  type PromptTemplate,
  type PromptMetadata,
  type PromptParameter,
  type CompiledPrompt,
  type MarketplaceTemplate,
  type MarketplaceFilter,
  type PromptCategory,
  type PromptStatus,
  initializeDefaultPrompts,
  MCPPromptsError,
} from './prompts';

// Auth (new)
export {
  MCPAuthManager,
  mcpAuthManager,
  ConsoleAuditLogger,
  FileAuditLogger,
  withAuth,
  createAccessRequest,
  type Role,
  type Permission,
  type UserSession,
  type AccessRequest,
  type AccessDecision,
  type AuditLogEntry,
  type AuditQuery,
  type PermissionLevel,
  type ResourceScope,
  MCPAuthError,
} from './auth';

// Streaming (new)
export {
  MCPStreamServer,
  mcpStreamServer,
  StreamingToolExecutor,
  streamingExecutor,
  SSEResponse,
  SSEParser,
  type SSEEvent,
  type SSEEventType,
  type ProgressInfo,
  type StreamingContext,
  type StreamInfo,
  type StreamState,
  type StreamingToolOptions,
  type StreamingToolResult,
  type ProgressCallback,
  MCPStreamError,
} from './streaming';
