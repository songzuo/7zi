# MCP (Model Context Protocol) 实现指南

## 概述

MCP 是由 Anthropic 主导的开源标准，用于连接 AI 应用和工具。

### 官方规范
- [MCP Specification](https://modelcontextprotocol.io/specification)
- [MCP GitHub](https://github.com/modelcontextprotocol)

### 核心概念

```
┌─────────────────┐     ┌─────────────────┐
│   MCP Client    │ ←→  │   MCP Server    │
│  (AI应用/Agent) │     │ (数据源/工具)   │
└─────────────────┘     └─────────────────┘
```

---

## OpenClaw MCP Server

### 功能特性

#### 1. 内置工具

| 工具名 | 描述 | 输入参数 |
|--------|------|----------|
| `read_file` | 读取文件内容 | `path`, `offset`, `limit` |
| `write_file` | 写入文件 | `path`, `content` |
| `exec_command` | 执行 Shell 命令 | `command`, `workdir` |
| `web_search` | Web 搜索（Brave） | `query`, `count` |
| `web_fetch` | 获取网页内容 | `url`, `extractMode` |
| `browser_control` | 浏览器控制 | `action`, `url` |

#### 2. API 端点

```
POST /api/mcp/rpc          # JSON-RPC 2.0 主端点
GET  /api/mcp/rpc          # Server 信息
```

---

## 使用方法

### 1. Claude Desktop 集成

#### 安装 Claude Desktop
```bash
# macOS
brew install --cask claude

# Windows
# 从 https://claude.ai/download 下载
```

#### 配置 MCP Server

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):
```json
{
  "mcpServers": {
    "openclaw": {
      "command": "node",
      "args": [
        "-e",
        "require('http').get('http://localhost:3000/api/mcp/rpc', (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => console.log(d)); })"
      ]
    }
  }
}
```

或使用服务器 URL（需要 HTTPS）：
```json
{
  "mcpServers": {
    "openclaw": {
      "transport": {
        "type": "sse",
        "url": "https://your-domain.com/api/mcp/rpc"
      }
    }
  }
}
```

#### 重启 Claude Desktop

重启后，Claude 将自动连接到 OpenClaw MCP Server。

---

### 2. 测试 MCP Server

#### 列出工具

```bash
curl -X POST http://localhost:3000/api/mcp/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

响应：
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "read_file",
        "description": "Read the contents of a file",
        "inputSchema": {
          "type": "object",
          "properties": {
            "path": {
              "type": "string",
              "description": "Path to the file to read"
            }
          },
          "required": ["path"]
        }
      },
      ...
    ]
  }
}
```

#### 调用工具

```bash
curl -X POST http://localhost:3000/api/mcp/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "read_file",
      "arguments": {
        "path": "/path/to/file.txt"
      }
    }
  }'
```

---

### 3. 在代码中使用

#### TypeScript 示例

```typescript
import { mcpServer } from '@/lib/mcp/server';

// 列出工具
const tools = await mcpServer.listTools();
console.log('Available tools:', tools.tools);

// 调用工具
const result = await mcpServer.callTool('read_file', {
  path: '/path/to/file.txt',
});

console.log('Result:', result.content[0].text);
```

---

## JSON-RPC 2.0 协议

### 请求格式

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "method": "tools/list",
  "params": { ... }
}
```

### 响应格式

成功：
```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "result": { ... }
}
```

错误：
```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "error": {
    "code": -32601,
    "message": "Method not found"
  }
}
```

### 错误代码

| 代码 | 名称 | 描述 |
|------|------|------|
| -32700 | Parse error | 无效的 JSON |
| -32600 | Invalid Request | 无效的请求 |
| -32601 | Method not found | 方法不存在 |
| -32602 | Invalid params | 无效的参数 |
| -32603 | Internal error | 内部错误 |

---

## 工具定义规范

### Tool Definition Schema

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}
```

### 示例：自定义工具

```typescript
import { mcpServer } from '@/lib/mcp/server';

// 注册自定义工具
mcpServer.registerTool({
  name: "get_weather",
  description: "Get current weather for a location",
  inputSchema: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "City name or coordinates",
      },
    },
    required: ["location"],
  },
});
```

---

## 安全考虑

### 1. CORS 配置

MCP Server 支持跨域请求，用于 Claude Desktop 等客户端：

```typescript
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
```

### 2. 请求验证

- JSON-RPC 2.0 格式验证
- 方法名白名单
- 参数 Schema 验证

### 3. 生产环境建议

- 使用 HTTPS
- 添加认证（API Key 或 JWT）
- 限制调用频率
- 日志和监控

---

## 扩展 MCP Server

### 1. 添加新工具

```typescript
// src/lib/mcp/server.ts
export class MCPServer {
  // ...

  private registerBuiltinTools(): void {
    // 现有工具...

    // 添加新工具
    this.registerTool({
      name: "your_custom_tool",
      description: "Description of your tool",
      inputSchema: {
        type: "object",
        properties: {
          param1: { type: "string" },
        },
        required: ["param1"],
      },
    });
  }

  // 实现工具逻辑
  private async executeTool(name: string, args: any): Promise<ToolResult> {
    switch (name) {
      case "your_custom_tool":
        // 实现工具逻辑
        return {
          content: [
            { type: "text", text: "Result from custom tool" },
          ],
        };
      // ...
    }
  }
}
```

### 2. 集成 OpenClaw 工具

```typescript
// 通过 OpenClaw API 调用实际工具
private async executeTool(name: string, args: any): Promise<ToolResult> {
  switch (name) {
    case "read_file":
      // 调用 OpenClaw read 工具
      const result = await openclaw.read(args.path);
      return {
        content: [{ type: "text", text: result }],
      };
    // ...
  }
}
```

---

## 故障排查

### 1. Claude Desktop 无法连接

检查：
- Server 是否运行（`localhost:3000`）
- 配置文件路径是否正确
- CORS 是否启用

### 2. 工具调用失败

检查：
- 工具名称是否正确
- 参数是否符合 Schema
- Server 日志

### 3. CORS 错误

检查：
- `Access-Control-Allow-Origin` 头
- `OPTIONS` 方法支持

---

## 参考资料

- [MCP Specification](https://modelcontextprotocol.io/specification)
- [JSON-RPC 2.0](https://www.jsonrpc.org/specification)
- [Claude Desktop](https://claude.ai/download)
- [OpenClaw Docs](https://docs.openclaw.ai)

---

**文档版本**: 1.0.0
**更新日期**: 2026-03-07