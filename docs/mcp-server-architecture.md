# MCP Server 架构设计文档

> Model Context Protocol (MCP) Server 实现文档
> 协议版本: 2025-06-18

## 目录

1. [概述](#概述)
2. [架构设计](#架构设计)
3. [核心组件](#核心组件)
4. [工具系统](#工具系统)
5. [传输层](#传输层)
6. [API 集成](#api-集成)
7. [认证与安全](#认证与安全)
8. [使用指南](#使用指南)
9. [部署配置](#部署配置)

---

## 概述

### 什么是 MCP?

Model Context Protocol (MCP) 是一个开放协议，允许 AI 助手通过标准化接口与外部工具和系统集成。7zi MCP Server 实现了完整的 MCP 规范，使 AI 助手能够：

- 读写文件系统
- 执行系统命令
- 发起 HTTP 请求
- 搜索文件
- 获取系统信息

### 设计目标

| 目标 | 描述 |
|------|------|
| **标准化** | 完全遵循 MCP 2025-06-18 规范 |
| **安全性** | 多层安全验证，危险操作需确认 |
| **可扩展** | 模块化设计，易于添加新工具 |
| **高性能** | 支持流式响应和会话复用 |

### 项目结构

```
app/
├── lib/mcp/
│   ├── server.ts          # MCP Server 核心实现
│   ├── tools.ts           # 工具注册中心
│   ├── http-transport.ts  # HTTP 传输层
│   ├── cli.ts             # CLI 入口 (stdio)
│   └── index.ts           # 模块导出
│
└── app/api/mcp/
    └── route.ts           # Next.js API 路由
```

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Client (Claude/其他)                   │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Transport Layer                             │
│  ┌─────────────────┐              ┌─────────────────┐           │
│  │  Stdio Transport │              │  HTTP Transport  │           │
│  │  (CLI 子进程)    │              │  (SSE + JSON-RPC)│           │
│  └─────────────────┘              └─────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MCP Server Core                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   SevenZiMcpServer                        │    │
│  │  • 工具注册与管理                                         │    │
│  │  • 会话管理                                               │    │
│  │  • 消息路由                                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Tool Registry                           │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │    │
│  │  │  File   │ │ System  │ │ Network │ │ Custom  │        │    │
│  │  │ Tools   │ │ Tools   │ │ Tools   │ │ Tools   │        │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      System Resources                            │
│  • 文件系统    • 进程执行    • 网络请求                          │
└─────────────────────────────────────────────────────────────────┘
```

### 数据流

```
Client Request                    Server Response
     │                                  ▲
     ▼                                  │
┌─────────┐    ┌─────────┐    ┌─────────────────┐
│ JSON-RPC│───▶│ Session │───▶│ Tool Execution  │
│ Message │    │ Validate│    │ Handler         │
└─────────┘    └─────────┘    └─────────────────┘
                    │                  │
                    ▼                  ▼
              ┌───────────┐     ┌───────────┐
              │ Origin    │     │ Result/   │
              │ Check     │     │ Error     │
              └───────────┘     └───────────┘
```

---

## 核心组件

### 1. SevenZiMcpServer

MCP Server 的核心类，负责：

```typescript
// 位置: app/lib/mcp/server.ts

export class SevenZiMcpServer {
  private server: McpServer;        // MCP SDK 实例
  private config: McpServerConfig;   // 配置
  private tools: Map<string, ToolDefinition>; // 工具注册表

  // 构造函数
  constructor(config: Partial<McpServerConfig> = {});

  // 注册工具
  registerTool<T extends z.ZodType>(tool: ToolDefinition<T>): void;

  // 获取工具列表
  getTools(): ToolDefinition[];

  // 启动 stdio 传输
  async startStdio(): Promise<void>;
}
```

**配置选项:**

```typescript
interface McpServerConfig {
  name: string;      // 服务器名称
  version: string;   // 版本号
  debug?: boolean;   // 调试模式
}
```

### 2. ToolRegistry

工具注册中心，提供工具管理功能：

```typescript
// 位置: app/lib/mcp/tools.ts

export class ToolRegistry {
  private tools: Map<string, ExtendedToolDefinition>;
  private categories: Map<ToolCategory, Set<string>>;

  // 注册工具
  register(tool: ExtendedToolDefinition): void;

  // 注销工具
  unregister(name: string): boolean;

  // 按类别获取工具
  getByCategory(category: ToolCategory): ExtendedToolDefinition[];

  // 获取危险工具列表
  getDangerousTools(): ExtendedToolDefinition[];
}
```

**工具定义接口:**

```typescript
interface ExtendedToolDefinition {
  name: string;              // 工具标识
  title?: string;            // 显示名称
  description: string;       // 描述
  category: ToolCategory;    // 分类
  tags?: string[];           // 标签
  dangerous?: boolean;       // 危险标记
  requiresConfirmation?: boolean; // 需确认
  inputSchema: z.ZodType;    // 输入验证
  handler: (params: unknown) => Promise<ToolResult>;
}
```

### 3. MCPSessionManager

会话管理器，负责 HTTP 传输的会话生命周期：

```typescript
// 位置: app/lib/mcp/http-transport.ts

export class MCPSessionManager {
  private sessions: Map<string, Session>;

  // 创建会话
  createSession(): string;

  // 获取会话
  getSession(id: string): Session | undefined;

  // 删除会话
  deleteSession(id: string): boolean;

  // 清理过期会话
  cleanupExpired(maxAgeMs: number): number;
}
```

---

## 工具系统

### 内置工具列表

| 工具名称 | 分类 | 描述 | 危险级别 |
|---------|------|------|---------|
| `read_file` | file | 读取文件内容 | 🟢 安全 |
| `write_file` | file | 写入文件 | 🟡 中等 |
| `list_directory` | file | 列出目录内容 | 🟢 安全 |
| `delete_file` | file | 删除文件 | 🔴 危险 |
| `execute_command` | system | 执行 Shell 命令 | 🔴 危险 |
| `search_files` | file | 搜索文件 | 🟢 安全 |
| `get_system_info` | system | 获取系统信息 | 🟢 安全 |
| `http_request` | network | 发起 HTTP 请求 | 🟡 中等 |
| `http_get` | network | HTTP GET 请求 | 🟡 中等 |

### 工具分类

```typescript
type ToolCategory = 
  | 'file'     // 文件操作
  | 'system'   // 系统命令
  | 'network'  // 网络请求
  | 'data'     // 数据处理
  | 'custom';  // 自定义工具
```

### 工具输入验证

所有工具使用 Zod 进行输入验证：

```typescript
// 示例: read_file 工具
inputSchema: z.object({
  path: z.string().describe('文件路径'),
  encoding: z.string().optional().default('utf-8').describe('编码'),
})
```

### 添加自定义工具

```typescript
import { toolRegistry } from '@/lib/mcp/tools';
import { z } from 'zod';

// 注册自定义工具
toolRegistry.register({
  name: 'my_custom_tool',
  title: '自定义工具',
  description: '执行自定义操作',
  category: 'custom',
  tags: ['custom', 'example'],
  inputSchema: z.object({
    input: z.string().describe('输入参数'),
  }),
  handler: async (params: unknown) => {
    const { input } = params as { input: string };
    // 执行操作...
    return { 
      content: [{ type: 'text', text: `处理结果: ${input}` }] 
    };
  },
});
```

### 危险操作处理

危险工具需要特殊处理：

```typescript
// 检查工具是否危险
const dangerousTools = toolRegistry.getDangerousTools();

// 危险工具标记
{
  name: 'execute_command',
  dangerous: true,
  requiresConfirmation: true,  // 需要用户确认
  // ...
}
```

---

## 传输层

### 支持的传输方式

#### 1. Stdio Transport

用于 CLI 子进程模式，适合本地使用：

```bash
# 启动 stdio 传输
npx tsx app/lib/mcp/cli.ts

# 或设置调试模式
MCP_DEBUG=true npx tsx app/lib/mcp/cli.ts
```

**特点:**
- 标准输入/输出通信
- 适合作为子进程被 AI 客户端调用
- 无需网络配置

#### 2. HTTP Transport (Streamable HTTP)

用于网络通信，支持 SSE (Server-Sent Events)：

```
POST /api/mcp    - 发送 JSON-RPC 消息
GET  /api/mcp    - 打开 SSE 流 (服务端消息)
DELETE /api/mcp  - 终止会话
```

### SSE 事件格式

```typescript
// SSE 事件结构
interface SSEEvent {
  id?: string;      // 事件 ID
  event?: string;   // 事件类型
  data: string;     // JSON 数据
}

// 转换为 SSE 格式
function toSSE(event: SSEEvent): string {
  let output = '';
  if (event.id) output += `id: ${event.id}\n`;
  if (event.event) output += `event: ${event.event}\n`;
  output += `data: ${event.data}\n\n`;
  return output;
}
```

### JSON-RPC 消息处理

```typescript
// 消息类型
type JsonRpcMessage = 
  | JsonRpcRequest      // 请求 (有 id)
  | JsonRpcNotification // 通知 (无 id)
  | JsonRpcResponse;    // 响应

// 请求示例
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": { "path": "/etc/hosts" }
  }
}

// 响应示例
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "content": [{ "type": "text", "text": "..." }]
  }
}
```

---

## API 集成

### 端点规范

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/mcp` | POST | 发送 JSON-RPC 消息 |
| `/api/mcp` | GET | 打开 SSE 流 |
| `/api/mcp` | DELETE | 终止会话 |

### 初始化流程

```
┌────────┐                              ┌────────┐
│ Client │                              │ Server │
└───┬────┘                              └───┬────┘
    │                                       │
    │  POST /api/mcp                        │
    │  { "method": "initialize", ... }     │
    │──────────────────────────────────────▶│
    │                                       │
    │  { "result": {...}, "Mcp-Session-Id" }│
    │◀──────────────────────────────────────│
    │                                       │
    │  POST /api/mcp                        │
    │  Header: Mcp-Session-Id: xxx          │
    │  { "method": "tools/list" }          │
    │──────────────────────────────────────▶│
    │                                       │
    │  { "result": { "tools": [...] } }    │
    │◀──────────────────────────────────────│
    │                                       │
```

### 支持的 MCP 方法

| 方法 | 描述 |
|------|------|
| `initialize` | 初始化连接，返回服务器能力 |
| `tools/list` | 获取可用工具列表 |
| `tools/call` | 调用指定工具 |
| `ping` | 心跳检测 |

### 与 Next.js 的集成

```typescript
// app/app/api/mcp/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getMcpServer } from '@/lib/mcp/server';
import { sessionManager, MCPHttpTransport } from '@/lib/mcp/http-transport';

export async function POST(request: NextRequest) {
  // 1. 验证 Origin
  const origin = request.headers.get('origin');
  if (!MCPHttpTransport.validateOrigin(origin)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  // 2. 解析消息
  const body = await request.text();
  const message = MCPHttpTransport.parseMessage(body);

  // 3. 处理请求
  // ...
}
```

---

## 认证与安全

### 安全层级

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: Origin 验证                      │
│  • 检查 Origin Header                                       │
│  • 允许 localhost                                           │
│  • 白名单域名检查                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Layer 2: 会话验证                         │
│  • Session ID 验证                                          │
│  • 会话过期检查                                              │
│  • 活动时间更新                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Layer 3: 工具权限                         │
│  • 危险操作标记                                              │
│  • 确认机制                                                  │
│  • 输入验证 (Zod)                                           │
└─────────────────────────────────────────────────────────────┘
```

### Origin 验证

```typescript
// 位置: app/lib/mcp/http-transport.ts

static validateOrigin(origin: string | null, allowedOrigins: string[] = []): boolean {
  if (!origin) return true;  // 允许无 origin 的请求

  // 允许 localhost
  if (origin.startsWith('http://localhost') || 
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('https://localhost')) {
    return true;
  }

  // 检查白名单
  return allowedOrigins.some(allowed => {
    if (allowed === '*') return true;
    // ...域名匹配逻辑
  });
}
```

### 会话安全

```typescript
// 会话配置
const SESSION_CONFIG = {
  maxAgeMs: 3600000,    // 1 小时过期
  keepAliveInterval: 30000,  // 30 秒心跳
};

// 定期清理过期会话
setInterval(() => {
  sessionManager.cleanupExpired(SESSION_CONFIG.maxAgeMs);
}, 60000);  // 每分钟清理一次
```

### 危险操作处理

| 级别 | 工具 | 处理方式 |
|------|------|---------|
| 🟢 安全 | read_file, list_directory, search_files, get_system_info | 直接执行 |
| 🟡 中等 | write_file, http_request | 记录日志 |
| 🔴 危险 | execute_command, delete_file | 需要确认 |

---

## 使用指南

### 客户端连接示例

#### 1. HTTP 连接

```typescript
// 初始化连接
const initResponse = await fetch('https://7zi.com/api/mcp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: '1',
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'my-client', version: '1.0.0' }
    }
  })
});

const sessionId = initResponse.headers.get('Mcp-Session-Id');

// 获取工具列表
const toolsResponse = await fetch('https://7zi.com/api/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Mcp-Session-Id': sessionId
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: '2',
    method: 'tools/list'
  })
});

// 调用工具
const result = await fetch('https://7zi.com/api/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Mcp-Session-Id': sessionId
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: '3',
    method: 'tools/call',
    params: {
      name: 'read_file',
      arguments: { path: '/etc/hosts' }
    }
  })
});
```

#### 2. SSE 流连接

```typescript
// 打开 SSE 流
const eventSource = new EventSource('https://7zi.com/api/mcp', {
  headers: { 'Mcp-Session-Id': sessionId }
});

eventSource.addEventListener('connected', (event) => {
  console.log('Connected:', JSON.parse(event.data));
});

eventSource.addEventListener('message', (event) => {
  console.log('Message:', JSON.parse(event.data));
});
```

#### 3. Stdio 连接 (Claude Desktop)

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "7zi": {
      "command": "npx",
      "args": ["tsx", "/path/to/app/lib/mcp/cli.ts"],
      "env": {
        "MCP_DEBUG": "true"
      }
    }
  }
}
```

### 工具调用示例

```typescript
// 读取文件
{
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": { "path": "/var/log/syslog" }
  }
}

// 执行命令
{
  "method": "tools/call",
  "params": {
    "name": "execute_command",
    "arguments": { 
      "command": "docker ps",
      "cwd": "/home/user"
    }
  }
}

// HTTP 请求
{
  "method": "tools/call",
  "params": {
    "name": "http_request",
    "arguments": {
      "url": "https://api.example.com/data",
      "method": "GET",
      "headers": { "Authorization": "Bearer token" }
    }
  }
}
```

---

## 部署配置

### 环境变量

```bash
# MCP Server 配置
MCP_DEBUG=true                    # 调试模式
MCP_SESSION_MAX_AGE=3600000       # 会话过期时间 (ms)
MCP_ALLOWED_ORIGINS=localhost,7zi.com  # 允许的 Origin

# 安全配置
MCP_REQUIRE_CONFIRMATION=true     # 危险操作需确认
```

### 生产部署

```yaml
# docker-compose.yml
services:
  mcp-server:
    build: .
    environment:
      - MCP_DEBUG=false
      - MCP_SESSION_MAX_AGE=3600000
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data  # 持久化数据
```

### Nginx 配置

```nginx
# SSE 支持
location /api/mcp {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Connection '';
    proxy_buffering off;
    proxy_cache off;
    chunked_transfer_encoding off;
    
    # 超时设置
    proxy_read_timeout 86400s;
    proxy_send_timeout 86400s;
}
```

### 监控指标

```typescript
// 建议监控的指标
const metrics = {
  activeSessions: () => sessionManager.sessions.size,
  totalTools: () => toolRegistry.getNames().length,
  dangerousToolCalls: 0,  // 危险工具调用次数
  errors: 0,              // 错误次数
  avgResponseTime: 0,     // 平均响应时间
};
```

---

## 附录

### A. 错误码参考

| 错误码 | 描述 |
|--------|------|
| -32700 | Parse error - JSON 解析失败 |
| -32600 | Invalid Request - 无效请求 |
| -32601 | Method not found - 方法不存在 |
| -32602 | Invalid params - 参数无效 |
| -32603 | Internal error - 内部错误 |
| -32001 | Session not found - 会话不存在 |

### B. 相关文件

| 文件 | 描述 |
|------|------|
| `app/lib/mcp/server.ts` | MCP Server 核心实现 |
| `app/lib/mcp/tools.ts` | 工具注册中心 |
| `app/lib/mcp/http-transport.ts` | HTTP 传输层 |
| `app/lib/mcp/cli.ts` | CLI 入口点 |
| `app/app/api/mcp/route.ts` | Next.js API 路由 |

### C. 参考资料

- [MCP 规范文档](https://modelcontextprotocol.io/)
- [MCP SDK GitHub](https://github.com/modelcontextprotocol/sdk)
- [JSON-RPC 2.0 规范](https://www.jsonrpc.org/specification)

---

*文档版本: 1.0.0*
*最后更新: 2026-03-07*
*作者: 架构师 (AI 子代理)*