# MCP Server v1.5.0 - Enhanced Implementation

## Overview

The MCP (Model Context Protocol) Server has been enhanced for v1.5.0 with comprehensive support for tool registration, resource management, prompt templates, authentication, and streaming.

## Architecture

```
src/lib/mcp/
├── server.ts              # Core MCP Server implementation
├── tools.ts               # Tool registry (legacy, will be migrated)
├── http-transport.ts      # HTTP transport with SSE support
├── registry.ts            # NEW: Tool registration and discovery
├── resources.ts           # NEW: Resource management
├── prompts.ts             # NEW: Prompt template library
├── auth.ts                # NEW: Authentication and authorization
├── streaming.ts           # NEW: Server-Sent Events and streaming
├── index.ts               # Main exports
└── README.md              # This file
```

## Features

### 1. Tool Registry (`registry.ts`)

**Capabilities:**
- Dynamic tool registration and discovery
- Tool metadata (name, description, parameters, return values)
- Tool categories (search, code, data, file, system, network, database, ai, media, communication, custom)
- Tool versioning and deprecation
- Tool validation and schema generation
- Tool search by query, tags, or category
- Tool aliases
- Event listeners for lifecycle events

**Key Classes:**
- `MCPToolRegistry` - Main registry class
- `MCPRegistryError` - Registry-specific errors

**Example Usage:**

```typescript
import { mcpRegistry, defineTool, z } from './mcp';

// Define a tool
const myTool = defineTool({
  name: 'search_files',
  title: 'Search Files',
  description: 'Search for files matching a pattern',
  category: 'file',
  tags: ['search', 'filesystem'],
  version: '1.0.0',
  inputSchema: z.object({
    path: z.string(),
    pattern: z.string(),
  }),
  output: {
    type: 'array',
    description: 'List of matching files',
  },
  handler: async (params, context) => {
    // Tool implementation
    return {
      content: [{ type: 'text', text: JSON.stringify(results) }],
    };
  },
});

// Register tool
mcpRegistry.register(myTool);

// Search for tools
const searchResults = mcpRegistry.search('file');
const fileTools = mcpRegistry.getByCategory('file');
```

### 2. Resource Management (`resources.ts`)

**Capabilities:**
- Resource access interface
- Resource subscription and notifications
- Resource caching strategies (no-cache, cache-first, network-first, stale-while-revalidate)
- Resource change detection
- Resource metadata
- Multiple resource providers

**Key Classes:**
- `MCPResourceManager` - Main resource manager
- `FileSystemResourceProvider` - File system provider
- `MCPResourceError` - Resource-specific errors

**Example Usage:**

```typescript
import { mcpResourceManager } from './mcp';

// List resources
const resources = await mcpResourceManager.list({
  types: ['file'],
  pattern: '**/*.ts',
});

// Read a resource
const content = await mcpResourceManager.read('file:///path/to/file.txt', {
  cachePolicy: 'cache-first',
  maxAge: 300000, // 5 minutes
});

// Subscribe to changes
const subscriptionId = await mcpResourceManager.subscribe(
  'session-id',
  { uris: ['file:///path/to/file.txt'] }
);

// Add change listener
mcpResourceManager.addChangeListener(subscriptionId, (event) => {
  console.log('Resource changed:', event);
});

// Write to resource
await mcpResourceManager.write('file:///path/to/file.txt', {
  text: 'Hello, world!',
  metadata: { /* ... */ },
});
```

### 3. Prompt Templates (`prompts.ts`)

**Capabilities:**
- Predefined prompt template library
- Template parameterization and validation
- Template market interface
- Template versioning
- Template categories and tags
- Default templates included (code-review, data-analysis, security-audit)

**Key Classes:**
- `MCPPromptsManager` - Main prompts manager
- `MarketplaceClient` - Marketplace client interface
- `DefaultMarketplaceClient` - Default client (placeholder)
- `MCPPromptsError` - Prompts-specific errors

**Example Usage:**

```typescript
import { mcpPromptsManager } from './mcp';

// Compile a template
const compiled = mcpPromptsManager.compile('code-review', {
  code: 'function add(a, b) { return a + b; }',
  language: 'typescript',
  additionalContext: 'This is a simple utility function',
});

console.log(compiled.content);

// Register a new template
mcpPromptsManager.register({
  metadata: {
    id: 'my-template',
    title: 'My Template',
    description: 'Custom prompt template',
    category: 'custom',
    tags: ['custom'],
    version: '1.0.0',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    requiredCapabilities: [],
    language: 'en',
    custom: {},
  },
  content: 'Hello {{name}}!',
  parameters: [
    {
      name: 'name',
      type: 'string',
      description: 'Name to greet',
      required: true,
    },
  ],
  examples: [],
});

// Search templates
const codingTemplates = mcpPromptsManager.getByCategory('coding');
const searchResults = mcpPromptsManager.search('review');
```

### 4. Authentication & Authorization (`auth.ts`)

**Capabilities:**
- Tool access permissions
- Resource access control
- Role-based access control (RBAC)
- Audit logging
- Rate limiting
- Built-in roles (guest, user, developer, admin)

**Key Classes:**
- `MCPAuthManager` - Main auth manager
- `ConsoleAuditLogger` - Console audit logger
- `FileAuditLogger` - File-based audit logger
- `MCPAuthError` - Auth-specific errors

**Example Usage:**

```typescript
import { mcpAuthManager, createAccessRequest, withAuth } from './mcp';

// Create a session
const sessionId = mcpAuthManager.createSession('user-123', ['user']);

// Check access
const decision = await mcpAuthManager.checkAccess({
  sessionId,
  scope: 'tools',
  resource: 'search_files',
  action: 'execute',
  level: 'execute',
});

console.log(decision.granted); // boolean
console.log(decision.reason);

// Use with middleware
await withAuth(
  createAccessRequest(sessionId, 'tools', 'search_files', 'execute'),
  async () => {
    // Execute tool
  }
);

// Query audit logs
const logs = await mcpAuthManager.queryAuditLogs({
  sessionId,
  granted: false,
  startTimestamp: new Date(Date.now() - 86400000), // Last 24h
});

// Custom role
mcpAuthManager.addRole({
  id: 'custom-role',
  name: 'Custom Role',
  description: 'Custom permissions',
  priority: 15,
  permissions: [
    {
      id: 'custom-tools-execute',
      scope: 'tools',
      resource: 'search_*',
      level: 'execute',
    },
  ],
});
```

### 5. Streaming Support (`streaming.ts`)

**Capabilities:**
- Server-Sent Events (SSE) implementation
- Streaming tool execution
- Progress callbacks and notifications
- Real-time event delivery
- Connection management

**Key Classes:**
- `MCPStreamServer` - SSE server
- `StreamingToolExecutor` - Streaming tool executor
- `SSEResponse` - SSE response helper
- `SSEParser` - SSE parser for clients
- `MCPStreamError` - Streaming-specific errors

**Example Usage:**

```typescript
import { mcpStreamServer, streamingExecutor, SSEResponse } from './mcp';

// Create a stream
const streamId = mcpStreamServer.createStream({
  sessionId: 'session-id',
  requestId: 'request-id',
  clientId: 'client-id',
});

// Send events
await mcpStreamServer.sendEvent(streamId, {
  event: 'message',
  data: 'Hello, client!',
});

await mcpStreamServer.sendProgress(streamId, {
  id: 'progress-1',
  current: 5,
  total: 10,
  percentage: 50,
  message: 'Processing...',
});

// Execute tool with streaming
const result = await streamingExecutor.executeWithStreaming(
  {
    toolName: 'search_files',
    arguments: { path: '.', pattern: '**/*.ts' },
    onProgress: async (progress) => {
      await mcpStreamServer.sendProgress(streamId, progress);
    },
    timeout: 30000,
  },
  async (params, reportProgress) => {
    // Report progress
    await reportProgress({ current: 1, percentage: 25, message: 'Scanning...' });
    
    // Execute work
    const results = await searchFiles(params.path, params.pattern);
    
    await reportProgress({ current: 2, percentage: 100, message: 'Done!' });
    return results;
  }
);

// SSE Response (for HTTP)
const sseResponse = new SSEResponse();
sseResponse.send({ event: 'message', data: 'Connected!' });
return sseResponse.getResponse();
```

## API Endpoints

### Tools

- `tools/list` - List available tools
- `tools/call` - Call a tool
- `tools/search` - Search tools by query
- `tools/get` - Get tool by name

### Resources

- `resources/list` - List available resources
- `resources/read` - Read a resource
- `resources/write` - Write a resource
- `resources/delete` - Delete a resource
- `resources/subscribe` - Subscribe to changes
- `resources/unsubscribe` - Unsubscribe from changes

### Prompts

- `prompts/list` - List prompt templates
- `prompts/get` - Get a template
- `prompts/compile` - Compile a template
- `prompts/search` - Search templates

### Auth

- `auth/sessions` - Create/manage sessions
- `auth/check` - Check access permissions
- `auth/audit` - Query audit logs

### Streaming

- `stream/create` - Create a stream
- `stream/send` - Send event to stream
- `stream/close` - Close a stream

## MCP Protocol Compliance

The implementation follows the Anthropic MCP Protocol Specification:

- ✅ JSON-RPC 2.0 messaging
- ✅ Tool discovery and execution
- ✅ Resource reading and watching
- ✅ Prompt templates
- ✅ SSE for streaming
- ✅ Proper error codes and messages
- ✅ HTTP and WebSocket transports supported

## Built-in Tools

The following tools are pre-registered:

### File Operations
- `read_file` - Read file contents
- `write_file` - Write file contents
- `list_directory` - List directory contents
- `delete_file` - Delete a file

### System Operations
- `execute_command` - Execute shell command
- `get_system_info` - Get system information

### Network Operations
- `http_request` - Make HTTP request

### Search
- `search_files` - Search files by pattern

## Built-in Prompt Templates

The following prompt templates are included:

- `code-review` - Review code for bugs and best practices
- `data-analysis` - Analyze data and provide insights
- `security-audit` - Perform security audit

## Configuration

### Session Management

Sessions are managed via `MCPSessionManager`:

```typescript
import { sessionManager } from './mcp';

const sessionId = sessionManager.createSession();
const session = sessionManager.getSession(sessionId);
sessionManager.deleteSession(sessionId);
```

### Cache Configuration

Resource cache can be configured:

```typescript
import { mcpResourceManager } from './mcp';

// Clear cache
mcpResourceManager.clearCache();

// Get cache stats
const stats = mcpResourceManager.getCacheStats();
console.log(stats); // { hits: 10, misses: 2, evictions: 0, size: 5, hitRate: 83.33 }
```

### Role Configuration

Default roles:
- `guest` - Read-only access
- `user` - Standard access with execute permissions
- `developer` - Extended access with write permissions
- `admin` - Full administrative access

## Testing

To test the MCP Server:

```typescript
import { getMcpServer } from './mcp';

const server = getMcpServer();

// Start stdio transport
await server.startStdio();

// Or use HTTP transport
const response = await server.handleRequest({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
});
```

## Performance Considerations

- **Caching**: Resources use `cache-first` policy by default
- **Rate Limiting**: 60 requests/minute per session
- **Session Cleanup**: Expired sessions are cleaned up periodically
- **Cache Eviction**: LRU strategy with configurable max size
- **Streaming**: SSE for real-time updates with automatic ping/keepalive

## Security

- **RBAC**: Role-based access control for all resources
- **Audit Logging**: All access attempts are logged
- **Rate Limiting**: Prevents abuse
- **Session Expiration**: Sessions can expire after a timeout
- **Origin Validation**: HTTP transport validates origins

## Future Enhancements

- [ ] WebSocket transport
- [ ] Persistent storage for registry and templates
- [ ] Template marketplace integration
- [ ] Advanced caching policies
- [ ] Tool composition and chaining
- [ ] Streaming resources (large file support)
- [ ] Resource versioning
- [ ] Multi-tenant support

## License

MIT

## Contributing

See project CONTRIBUTING.md for guidelines.
