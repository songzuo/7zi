/**
 * MCP Tool Registry - Dynamic Tool Registration and Discovery
 *
 * Provides a comprehensive tool registry for MCP Server with:
 * - Dynamic tool registration and discovery
 * - Tool metadata (name, description, parameter schema, return values)
 * - Tool categories (search, code, data, file, etc.)
 * - Tool versioning and deprecation
 * - Tool validation and schema generation
 *
 * @module mcp/registry
 */

import { z } from 'zod'

/**
 * Tool category enumeration
 */
export type ToolCategory =
  | 'search'
  | 'code'
  | 'data'
  | 'file'
  | 'system'
  | 'network'
  | 'database'
  | 'ai'
  | 'media'
  | 'communication'
  | 'custom'

/**
 * Tool status
 */
export type ToolStatus = 'active' | 'deprecated' | 'experimental' | 'disabled'

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description: string
  required: boolean
  default?: unknown
  enum?: string[]
  pattern?: string
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  items?: ToolParameter
  properties?: Record<string, ToolParameter>
}

/**
 * Tool return value definition
 */
export interface ToolReturn {
  type: 'string' | 'object' | 'array' | 'binary' | 'stream'
  description: string
  schema?: z.ZodType
  mimeType?: string
}

/**
 * Tool metadata
 */
export interface ToolMetadata {
  /** Unique tool identifier */
  name: string
  /** Human-readable title */
  title: string
  /** Detailed description */
  description: string
  /** Tool version */
  version: string
  /** Tool category */
  category: ToolCategory
  /** Keywords for search */
  tags: string[]
  /** Tool author */
  author?: string
  /** Documentation URL */
  documentationUrl?: string
  /** Repository URL */
  repositoryUrl?: string
  /** License */
  license?: string
  /** Tool status */
  status: ToolStatus
  /** Deprecation message if deprecated */
  deprecationMessage?: string
  /** Whether tool requires confirmation */
  requiresConfirmation: boolean
  /** Whether tool is dangerous */
  isDangerous: boolean
  /** Rate limit per minute */
  rateLimit?: number
  /** Timeout in milliseconds */
  timeout?: number
  /** Created timestamp */
  createdAt: Date
  /** Last updated timestamp */
  updatedAt: Date
}

/**
 * Complete tool definition with handler
 */
export interface ToolDefinition<T extends z.ZodType = z.ZodType> {
  /** Tool metadata */
  metadata: ToolMetadata
  /** Input schema */
  inputSchema: T
  /** Output definition */
  output: ToolReturn
  /** Handler function */
  handler: ToolHandler<z.infer<T>>
  /** Middleware hooks */
  beforeExecute?: (params: z.infer<T>, context: ToolContext) => Promise<void>
  afterExecute?: (result: ToolResult, context: ToolContext) => Promise<void>
  onError?: (error: Error, context: ToolContext) => Promise<void>
}

/**
 * Tool execution context
 */
export interface ToolContext {
  /** Session ID */
  sessionId: string
  /** User ID if authenticated */
  userId?: string
  /** Request ID for tracing */
  requestId: string
  /** Timestamp */
  timestamp: Date
  /** Additional context */
  extra: Record<string, unknown>
}

/**
 * Tool execution result
 */
export interface ToolResult {
  /** Result content */
  content: Array<{
    type: 'text' | 'image' | 'resource' | 'binary'
    text?: string
    data?: string
    mimeType?: string
    uri?: string
  }>
  /** Whether result is an error */
  isError?: boolean
  /** Execution metadata */
  meta?: {
    duration: number
    tokensUsed?: number
    cached?: boolean
  }
}

/**
 * Tool handler function type
 */
export type ToolHandler<T> = (params: T, context: ToolContext) => Promise<ToolResult>

/**
 * Registry event types
 */
export type RegistryEvent =
  | { type: 'tool:registered'; toolName: string }
  | { type: 'tool:unregistered'; toolName: string }
  | { type: 'tool:updated'; toolName: string }
  | { type: 'tool:deprecated'; toolName: string; message: string }
  | { type: 'category:added'; category: ToolCategory }

/**
 * Registry event listener
 */
export type RegistryEventListener = (event: RegistryEvent) => void

/**
 * MCP Tool Registry
 *
 * Central registry for all MCP tools with discovery, metadata, and lifecycle management.
 */
export class MCPToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map()
  private categories: Map<ToolCategory, Set<string>> = new Map()
  private listeners: RegistryEventListener[] = []
  private aliases: Map<string, string> = new Map()

  /**
   * Register a new tool
   */
  register<T extends z.ZodType>(tool: ToolDefinition<T>): void {
    const name = tool.metadata.name

    if (this.tools.has(name)) {
      throw new MCPRegistryError(`Tool "${name}" is already registered`, 'TOOL_EXISTS')
    }

    // Validate tool definition
    this.validateToolDefinition(tool)

    // Store tool
    this.tools.set(name, tool as ToolDefinition)

    // Update category index
    this.addToCategory(tool.metadata.category, name)

    // Emit event
    this.emit({ type: 'tool:registered', toolName: name })
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    const tool = this.tools.get(name)
    if (!tool) return false

    // Remove from category
    this.removeFromCategory(tool.metadata.category, name)

    // Remove aliases
    for (const [alias, target] of this.aliases) {
      if (target === name) {
        this.aliases.delete(alias)
      }
    }

    // Remove tool
    this.tools.delete(name)

    // Emit event
    this.emit({ type: 'tool:unregistered', toolName: name })

    return true
  }

  /**
   * Update a tool's metadata
   */
  update(name: string, updates: Partial<ToolMetadata>): void {
    const tool = this.tools.get(name)
    if (!tool) {
      throw new MCPRegistryError(`Tool "${name}" not found`, 'TOOL_NOT_FOUND')
    }

    // Handle category change
    if (updates.category && updates.category !== tool.metadata.category) {
      this.removeFromCategory(tool.metadata.category, name)
      this.addToCategory(updates.category, name)
    }

    // Update metadata
    tool.metadata = {
      ...tool.metadata,
      ...updates,
      updatedAt: new Date(),
    }

    // Emit event
    this.emit({ type: 'tool:updated', toolName: name })
  }

  /**
   * Deprecate a tool
   */
  deprecate(name: string, message: string): void {
    const tool = this.tools.get(name)
    if (!tool) {
      throw new MCPRegistryError(`Tool "${name}" not found`, 'TOOL_NOT_FOUND')
    }

    tool.metadata.status = 'deprecated'
    tool.metadata.deprecationMessage = message

    this.emit({ type: 'tool:deprecated', toolName: name, message })
  }

  /**
   * Get a tool by name
   */
  get(name: string): ToolDefinition | undefined {
    // Check aliases
    const resolvedName = this.aliases.get(name) || name
    return this.tools.get(resolvedName)
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name) || this.aliases.has(name)
  }

  /**
   * Get all tools
   */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get tools by category
   */
  getByCategory(category: ToolCategory): ToolDefinition[] {
    const names = this.categories.get(category)
    if (!names) return []

    return Array.from(names)
      .map(name => this.tools.get(name))
      .filter((t): t is ToolDefinition => t !== undefined)
  }

  /**
   * Get tools by tags
   */
  getByTags(tags: string[]): ToolDefinition[] {
    return this.getAll().filter(tool => tags.some(tag => tool.metadata.tags.includes(tag)))
  }

  /**
   * Get active tools (not disabled or deprecated)
   */
  getActive(): ToolDefinition[] {
    return this.getAll().filter(tool => tool.metadata.status === 'active')
  }

  /**
   * Get tools requiring confirmation
   */
  getDangerousTools(): ToolDefinition[] {
    return this.getAll().filter(
      tool => tool.metadata.isDangerous || tool.metadata.requiresConfirmation
    )
  }

  /**
   * Search tools by query
   */
  search(query: string): ToolDefinition[] {
    const lowerQuery = query.toLowerCase()

    return this.getAll().filter(tool => {
      const metadata = tool.metadata
      return (
        metadata.name.toLowerCase().includes(lowerQuery) ||
        metadata.title.toLowerCase().includes(lowerQuery) ||
        metadata.description.toLowerCase().includes(lowerQuery) ||
        metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      )
    })
  }

  /**
   * Add an alias for a tool
   */
  addAlias(alias: string, toolName: string): void {
    if (!this.tools.has(toolName)) {
      throw new MCPRegistryError(`Tool "${toolName}" not found`, 'TOOL_NOT_FOUND')
    }

    if (this.tools.has(alias) || this.aliases.has(alias)) {
      throw new MCPRegistryError(
        `"${alias}" is already used as a tool name or alias`,
        'ALIAS_EXISTS'
      )
    }

    this.aliases.set(alias, toolName)
  }

  /**
   * Get all aliases
   */
  getAliases(): Map<string, string> {
    return new Map(this.aliases)
  }

  /**
   * Get all categories
   */
  getCategories(): ToolCategory[] {
    return Array.from(this.categories.keys())
  }

  /**
   * Get tool names
   */
  getNames(): string[] {
    return Array.from(this.tools.keys())
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalTools: number
    activeTools: number
    deprecatedTools: number
    experimentalTools: number
    disabledTools: number
    categories: number
    aliases: number
  } {
    const tools = this.getAll()
    return {
      totalTools: tools.length,
      activeTools: tools.filter(t => t.metadata.status === 'active').length,
      deprecatedTools: tools.filter(t => t.metadata.status === 'deprecated').length,
      experimentalTools: tools.filter(t => t.metadata.status === 'experimental').length,
      disabledTools: tools.filter(t => t.metadata.status === 'disabled').length,
      categories: this.categories.size,
      aliases: this.aliases.size,
    }
  }

  /**
   * Export tools as MCP protocol format
   */
  exportMcpFormat(): Array<{
    name: string
    title: string
    description: string
    inputSchema: Record<string, unknown>
  }> {
    return this.getActive().map(tool => ({
      name: tool.metadata.name,
      title: tool.metadata.title,
      description: tool.metadata.description,
      inputSchema: this.zodToJsonSchema(tool.inputSchema),
    }))
  }

  /**
   * Export registry state for persistence
   */
  export(): RegistrySnapshot {
    return {
      tools: Array.from(this.tools.entries()).map(([name, tool]) => ({
        name,
        metadata: tool.metadata,
        inputSchema: tool.inputSchema,
        output: tool.output,
      })),
      aliases: Array.from(this.aliases.entries()),
      exportedAt: new Date(),
    }
  }

  /**
   * Import registry state
   */
  import(snapshot: RegistrySnapshot, handlers: Map<string, ToolHandler<unknown>>): void {
    for (const toolData of snapshot.tools) {
      const handler = handlers.get(toolData.name)
      if (!handler) {
        console.warn(`Handler not found for tool "${toolData.name}", skipping`)
        continue
      }

      this.register({
        metadata: toolData.metadata,
        inputSchema: toolData.inputSchema,
        output: toolData.output,
        handler,
      })
    }

    for (const [alias, target] of snapshot.aliases) {
      this.addAlias(alias, target)
    }
  }

  /**
   * Add event listener
   */
  addListener(listener: RegistryEventListener): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index >= 0) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Validate tool definition
   */
  private validateToolDefinition(tool: ToolDefinition): void {
    if (!tool.metadata.name) {
      throw new MCPRegistryError('Tool name is required', 'INVALID_TOOL')
    }

    if (!tool.metadata.title) {
      throw new MCPRegistryError(`Tool "${tool.metadata.name}" must have a title`, 'INVALID_TOOL')
    }

    if (!tool.metadata.description) {
      throw new MCPRegistryError(
        `Tool "${tool.metadata.name}" must have a description`,
        'INVALID_TOOL'
      )
    }

    if (!tool.handler || typeof tool.handler !== 'function') {
      throw new MCPRegistryError(
        `Tool "${tool.metadata.name}" must have a handler function`,
        'INVALID_TOOL'
      )
    }
  }

  /**
   * Add tool to category index
   */
  private addToCategory(category: ToolCategory, name: string): void {
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set())
      this.emit({ type: 'category:added', category })
    }
    this.categories.get(category)!.add(name)
  }

  /**
   * Remove tool from category index
   */
  private removeFromCategory(category: ToolCategory, name: string): void {
    const categoryTools = this.categories.get(category)
    if (categoryTools) {
      categoryTools.delete(name)
      if (categoryTools.size === 0) {
        this.categories.delete(category)
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: RegistryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('Registry event listener error:', error)
      }
    }
  }

  /**
   * Convert Zod schema to JSON Schema
   */
  private zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
    // Basic conversion - for more complex schemas, use zod-to-json-schema package
    if (schema instanceof z.ZodObject) {
      const properties: Record<string, unknown> = {}
      const required: string[] = []

      for (const [key, value] of Object.entries(schema.shape)) {
        properties[key] = this.zodToJsonSchema(value as z.ZodType)
        // Check if optional
        if (!(value instanceof z.ZodOptional)) {
          required.push(key)
        }
      }

      return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined,
      }
    }

    if (schema instanceof z.ZodString) {
      return { type: 'string' }
    }

    if (schema instanceof z.ZodNumber) {
      return { type: 'number' }
    }

    if (schema instanceof z.ZodBoolean) {
      return { type: 'boolean' }
    }

    if (schema instanceof z.ZodArray) {
      return {
        type: 'array',
        items: this.zodToJsonSchema(schema.element as z.ZodType),
      }
    }

    if (schema instanceof z.ZodOptional) {
      return this.zodToJsonSchema(schema.unwrap() as z.ZodType)
    }

    return {}
  }
}

/**
 * Registry snapshot for persistence
 */
export interface RegistrySnapshot {
  tools: Array<{
    name: string
    metadata: ToolMetadata
    inputSchema: z.ZodType
    output: ToolReturn
  }>
  aliases: Array<[string, string]>
  exportedAt: Date
}

/**
 * MCP Registry Error
 */
export class MCPRegistryError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'MCPRegistryError'
  }
}

/**
 * Global registry instance
 */
export const mcpRegistry = new MCPToolRegistry()

/**
 * Helper function to create a tool definition
 */
export function defineTool<T extends z.ZodType>(
  config: Omit<ToolDefinition<T>, 'metadata'> & {
    name: string
    title: string
    description: string
    category?: ToolCategory
    tags?: string[]
    version?: string
    isDangerous?: boolean
    requiresConfirmation?: boolean
  }
): ToolDefinition<T> {
  return {
    metadata: {
      name: config.name,
      title: config.title,
      description: config.description,
      version: config.version || '1.0.0',
      category: config.category || 'custom',
      tags: config.tags || [],
      status: 'active',
      requiresConfirmation: config.requiresConfirmation || false,
      isDangerous: config.isDangerous || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    inputSchema: config.inputSchema,
    output: config.output,
    handler: config.handler,
    beforeExecute: config.beforeExecute,
    afterExecute: config.afterExecute,
    onError: config.onError,
  }
}

export default MCPToolRegistry
