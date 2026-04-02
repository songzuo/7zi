# Tool Executor Module

## Overview

The **Tool Executor Module** provides real, production-ready implementations for all MCP (Model Context Protocol) tools. This replaces the previous simulated/mock implementations with actual functionality.

## Features

### 1. **File Operations**

- `read_file`: Read file contents with optional offset/limit pagination
- `write_file`: Write content to files (creates directories as needed)
- `list_files`: List files and directories in a given path

### 2. **Command Execution**

- `exec_command`: Execute shell commands safely with timeout and working directory support
- Built-in security validation to block dangerous commands

### 3. **Web Tools (Extensible)**

- `web_search`: Web search (placeholder for OpenClaw integration)
- `web_fetch`: Fetch and extract web content (placeholder for OpenClaw integration)
- `browser_control`: Browser automation (placeholder for OpenClaw integration)

### 4. **Security Features**

#### Path Security

- Blocks parent directory traversal (`../`)
- Blocks home directory expansion (`~`)
- Blocks access to sensitive files (`/etc/passwd`, `/etc/shadow`, `.ssh/`, `.aws/`)
- Restricts operations to allowed base directories (CWD and `/tmp`)

#### Command Security

- Blocks destructive commands (`rm`, `rm -rf`, `del`, `format`, `fdisk`, `mkfs`, `dd`)
- Blocks system commands (`shutdown`, `reboot`)
- Blocks fork bombs and other malicious patterns
- Timeout support for long-running commands

## Architecture

```
src/lib/tools/
├── executor.ts           # Main tool executor and routing
└── __tests__/
    └── executor.test.ts  # Comprehensive test suite
```

## Usage

### Integration with MCP Server

The tool executor is automatically integrated with the MCP server:

```typescript
import { ToolExecutor } from "@/lib/tools/executor";

// In MCP Server's executeTool method:
async callTool(name: string, args: Record<string, unknown>) {
  return await ToolExecutor.execute(name, args);
}
```

### Direct Usage

You can also use the tool classes directly:

```typescript
import { FileTools, CommandTools } from '@/lib/tools/executor'

// Read a file
const result = await FileTools.readFile('/path/to/file.txt', {
  offset: 10,
  limit: 20,
})

// Write a file
await FileTools.writeFile('/path/to/file.txt', 'Hello, World!')

// Execute a command
const cmdResult = await CommandTools.executeCommand('ls -la', {
  workdir: '/tmp',
  timeout: 5000,
})
```

## Tool Definitions

### File Tools

#### `read_file`

**Parameters:**

- `path` (string, required): File path to read
- `offset` (number, optional): Line number to start from (1-indexed)
- `limit` (number, optional): Maximum number of lines to read

**Returns:**

- File contents as text
- Error if file not found or path is blocked

#### `write_file`

**Parameters:**

- `path` (string, required): File path to write
- `content` (string, required): Content to write

**Returns:**

- Success message with byte count
- Creates parent directories if needed
- Overwrites existing files

#### `list_files`

**Parameters:**

- `path` (string, required): Directory path to list

**Returns:**

- JSON array of files/directories with `name` and `type` fields

### Command Tools

#### `exec_command`

**Parameters:**

- `command` (string, required): Shell command to execute
- `workdir` (string, optional): Working directory
- `timeout` (number, optional): Timeout in milliseconds

**Returns:**

- Command stdout/stderr output
- Error if command is blocked or fails

### Web Tools (Placeholder)

These tools require integration with OpenClaw's capabilities:

#### `web_search`

**Parameters:**

- `query` (string, required): Search query
- `count` (number, optional): Number of results

#### `web_fetch`

**Parameters:**

- `url` (string, required): URL to fetch
- `extractMode` (string, optional): "markdown" or "text"

#### `browser_control`

**Parameters:**

- `action` (string, required): Browser action name
- Additional parameters based on action

## Testing

Run the test suite:

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest src/lib/tools/__tests__/executor.test.ts
```

### Test Coverage

The test suite includes:

- ✅ Path security validation (6 tests)
- ✅ File operations (9 tests)
- ✅ Command security validation (5 tests)
- ✅ Command execution (5 tests)
- ✅ Tool executor routing (8 tests)

**Total: 33 comprehensive tests**

## Security Considerations

### Path Validation

All file paths are validated against:

1. Blocked patterns (traversal, sensitive paths)
2. Allowed base directories
3. Normalization to prevent path manipulation

### Command Validation

All commands are validated against:

1. Blocked command patterns
2. Explicit allowlist for safe commands
3. Timeout enforcement

### Recommendations for Production

1. **Environment-specific configuration**: Consider using environment variables to configure allowed directories
2. **Rate limiting**: Add rate limiting to prevent abuse
3. **Audit logging**: Log all file and command operations for security auditing
4. **Authentication**: Ensure MCP endpoints are authenticated
5. **Sandboxing**: Consider running commands in a container or sandbox for additional isolation

## Future Enhancements

### Web Tools Integration

To make web tools functional, integrate with OpenClaw's existing capabilities:

```typescript
// Example integration for web_search
static async webSearch(query: string, options?: { count?: number }) {
  // Call OpenClaw's web_search tool
  const results = await openclaw.webSearch({
    query,
    count: options?.count ?? 5
  });

  return {
    content: [{
      type: "text",
      text: JSON.stringify(results, null, 2)
    }]
  };
}
```

### Additional Tools

Consider adding:

- `git_operations`: Git commands (clone, commit, push)
- `file_permissions`: chmod/chown operations
- `archive_operations`: zip/tar/gzip operations
- `file_search`: Search for files by pattern
- `file_diff`: Compare two files

### Performance Optimizations

- Add file operation caching
- Implement async streaming for large files
- Add concurrent operation limits

## Troubleshooting

### Common Issues

**Issue: "Path is outside allowed directories"**

- Solution: Ensure the path is within the current working directory or `/tmp`
- Or configure additional allowed directories in `PathSecurity.ALLOWED_BASE_DIRS`

**Issue: "Command is blocked for security reasons"**

- Solution: The command matches a blocked pattern
- Review the blocked patterns in `CommandTools.BLOCKED_COMMANDS`

**Issue: Command timeout**

- Solution: Increase the timeout parameter or optimize the command

## License

This module is part of the 7zi project and follows the same license.

## Contributing

When adding new tools:

1. Add the tool definition in the MCP server's `registerBuiltinTools` method
2. Implement the tool logic in the appropriate class in `executor.ts`
3. Add comprehensive tests in `executor.test.ts`
4. Update this documentation

---

**Version:** 1.0.0
**Last Updated:** 2026-03-17
**Maintainer:** 7zi Team
