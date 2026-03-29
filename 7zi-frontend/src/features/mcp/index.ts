/**
 * MCP Feature
 * Model Context Protocol 功能模块
 */

// Types - 统一从 lib/types 导出
export type {
  MCPRequest,
  MCPResponse,
} from './lib/types';

// Server implementation
export { MCPServer, mcpServer } from './lib/server';
export type { ToolDefinition, ToolResult } from './lib/server';

// Additional types
export * from './types';
