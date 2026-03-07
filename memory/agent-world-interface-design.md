# 智能体世界接口设计文档

**创建日期**: 2026-03-07  
**作者**: 咨询师子代理 + 主管  
**项目**: 7zi Studio  
**目标**: 定义智能体世界接口，为 AI 代理提供服务

---

## 执行摘要

7zi Studio 的核心战略已从服务人类用户转向**服务智能体 (Agents)**。本文档分析两种主流智能体接口协议，并提出 7zi 的集成方案。

**核心结论**:
1. **优先实现 MCP Server** - 成熟度高，生态完善，Anthropic 主导
2. **中期规划 A2A 支持** - Google 主导，关注发展动态
3. **7zi 定位**: 成为智能体世界的"服务提供者"

---

## 1. MCP (Model Context Protocol) 分析

### 1.1 协议概述

**MCP** (Model Context Protocol) 是由 Anthropic 主导开发的开放协议，用于连接 AI 助手与外部系统。

| 属性 | 详情 |
|------|------|
| **主导方** | Anthropic |
| **协议类型** | JSON-RPC 2.0 |
| **传输层** | Stdio / HTTP (SSE) |
| **开源** | ✅ MIT License |
| **GitHub** | modelcontextprotocol/servers |
| **成熟度** | ⭐⭐⭐⭐⭐ 生产可用 |

### 1.2 核心概念

```
┌─────────────────┐     MCP Protocol     ┌─────────────────┐
│   AI Client     │ ◄─────────────────► │   MCP Server    │
│  (Claude/其他)   │    JSON-RPC 2.0     │   (7zi 服务)    │
└─────────────────┘                      └─────────────────┘
        │                                        │
        │ 请求工具/资源/提示                       │
        │                                        │
        ▼                                        ▼
```

#### 三大核心能力

1. **Resources (资源)**
   - 类似 REST API 的只读数据源
   - 示例：文件内容、数据库记录、配置信息
   - URI 格式：`resource://path/to/resource`

2. **Tools (工具)**
   - 可执行的函数/操作
   - 示例：发送消息、创建任务、查询状态
   - 包含参数 schema (JSON Schema)

3. **Prompts (提示)**
   - 预定义的提示模板
   - 示例：代码审查模板、报告生成模板
   - 支持参数化

### 1.3 技术架构

```typescript
// MCP Server 基本结构
interface MCPServer {
  name: string;
  version: string;
  
  // 能力声明
  capabilities: {
    resources?: { subscribe?: boolean };
    tools?: {};
    prompts?: {};
  };
  
  // 资源处理器
  listResources(): Resource[];
  readResource(uri: string): ResourceContent;
  
  // 工具处理器
  listTools(): Tool[];
  callTool(name: string, args: Record<string, any>): ToolResult;
  
  // 提示处理器
  listPrompts(): Prompt[];
  getPrompt(name: string, args: Record<string, any>): PromptResult;
}
```

### 1.4 通信流程

```
1. 初始化握手
   Client → Server: initialize(request)
   Server → Client: initialize(response) + capabilities

2. 列出可用能力
   Client → Server: resources/list
   Server → Client: { resources: [...] }
   
   Client → Server: tools/list
   Server → Client: { tools: [...] }

3. 调用工具
   Client → Server: tools/call { name: "create_task", args: {...} }
   Server → Client: { content: [...] }

4. 读取资源
   Client → Server: resources/read { uri: "task://123" }
   Server → Client: { contents: [...] }
```

### 1.5 7zi 可提供的 MCP 能力

#### Resources (资源)

| 资源 URI | 描述 | 用途 |
|----------|------|------|
| `team://members` | AI 团队成员列表 | 了解可用代理 |
| `team://member/{id}` | 特定成员详情 | 选择合适代理 |
| `project://status` | 项目状态概览 | 监控进度 |
| `task://{id}` | 任务详情 | 查询任务状态 |

#### Tools (工具)

| 工具名称 | 参数 | 功能 |
|----------|------|------|
| `assign_task` | task, assignee | 分配任务给 AI 成员 |
| `create_project` | name, description | 创建新项目 |
| `send_message` | to, content | 发送消息给团队 |
| `get_dashboard` | - | 获取实时 Dashboard |
| `generate_report` | type, period | 生成项目报告 |

#### Prompts (提示)

| 提示名称 | 参数 | 用途 |
|----------|------|------|
| `task_brief` | task_type, requirements | 生成任务简报 |
| `code_review` | language, code | 代码审查模板 |
| `project_summary` | project_id | 项目摘要生成 |

---

## 2. A2A (Agent2Agent Protocol) 分析

### 2.1 协议概述

**A2A** (Agent2Agent Protocol) 是 Google 提出的智能体间通信协议，专注于 Agent ↔ Agent 协作。

| 属性 | 详情 |
|------|------|
| **主导方** | Google |
| **协议类型** | HTTP/REST + JSON |
| **传输层** | HTTPS |
| **成熟度** | ⭐⭐⭐ 发展中 |
| **关注点** | 多代理协作、任务委派 |

### 2.2 核心概念

```
┌─────────────────┐     A2A Protocol     ┌─────────────────┐
│   Agent A       │ ◄─────────────────► │   Agent B       │
│  (任务发起者)    │    HTTP/REST        │  (任务执行者)    │
└─────────────────┘                      └─────────────────┘
```

#### 核心能力

1. **Agent Card (代理名片)**
   - 描述代理能力和接口
   - 类似 OpenAPI 规范
   - JSON-LD 格式

2. **Task Delegation (任务委派)**
   - 跨代理任务分配
   - 状态追踪和回调
   - 结果收集

3. **Skill Discovery (技能发现)**
   - 动态发现其他代理
   - 能力匹配
   - 协作编排

### 2.3 与 MCP 的区别

| 维度 | MCP | A2A |
|------|-----|-----|
| **通信模式** | Client-Server | Peer-to-Peer |
| **主要场景** | AI ↔ 工具/数据 | Agent ↔ Agent |
| **主导方** | Anthropic | Google |
| **成熟度** | 高 | 中 |
| **生态** | 丰富 | 发展中 |
| **协议基础** | JSON-RPC | HTTP REST |
| **发现机制** | 配置驱动 | 动态发现 |

### 2.4 A2A 适用场景

- 多代理协作（如：代理A负责设计，代理B负责开发）
- 任务委派和追踪
- 跨平台代理通信
- 分布式 AI 系统

---

## 3. 7zi 集成方案

### 3.1 战略定位

```
┌─────────────────────────────────────────────────────────────┐
│                    智能体世界生态                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│   │ Claude   │    │ ChatGPT  │    │ Gemini   │            │
│   │ (Anthropic)│   │ (OpenAI) │    │ (Google) │            │
│   └────┬─────┘    └────┬─────┘    └────┬─────┘            │
│        │               │               │                   │
│        └───────────────┼───────────────┘                   │
│                        │                                   │
│                        ▼                                   │
│              ┌─────────────────┐                          │
│              │   MCP Client    │                          │
│              │   (在 AI 侧)    │                          │
│              └────────┬────────┘                          │
│                       │                                   │
│                       │ MCP Protocol                      │
│                       │                                   │
│                       ▼                                   │
│              ┌─────────────────┐                          │
│              │   7zi Studio    │ ◄── 我们在这里！          │
│              │   MCP Server    │                          │
│              │                 │                          │
│              │  - AI 团队服务  │                          │
│              │  - 任务管理     │                          │
│              │  - Dashboard    │                          │
│              └─────────────────┘                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**7zi 的角色**: 智能体世界的**服务提供者 (Service Provider)**

### 3.2 技术架构

```
7zi Studio Architecture for Agent World
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────┐
│                      MCP Server Layer                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Resources  │  │   Tools     │  │   Prompts   │        │
│  │  Provider   │  │  Executor   │  │   Library   │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Team     │    │  Task    │    │ Dashboard│
    │ Service  │    │ Service  │    │ Service  │
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
         └───────────────┼───────────────┘
                         │
                         ▼
              ┌──────────────────┐
              │   Data Layer     │
              │  - PostgreSQL    │
              │  - Redis Cache   │
              │  - File Storage  │
              └──────────────────┘
```

### 3.3 实施路线图

#### Phase 1: MCP Server MVP (2 周)

**目标**: 提供基础的 MCP 服务

| 任务 | 工时 | 优先级 |
|------|------|--------|
| 搭建 MCP Server 框架 | 4h | P0 |
| 实现 Resources API | 6h | P0 |
| 实现 Tools API | 8h | P0 |
| 集成现有 Dashboard 数据 | 4h | P0 |
| 编写文档和示例 | 4h | P1 |
| **总计** | **26h** | - |

**交付物**:
- `@7zi/mcp-server` npm 包
- 基础 Resources: `team://`, `project://`
- 基础 Tools: `assign_task`, `get_dashboard`
- 使用文档

#### Phase 2: 功能增强 (3 周)

| 任务 | 工时 | 优先级 |
|------|------|--------|
| Prompts API 实现 | 6h | P1 |
| 认证和授权机制 | 8h | P0 |
| Webhook 支持 | 6h | P1 |
| 流式响应 (SSE) | 4h | P2 |
| 错误处理和重试 | 4h | P1 |
| **总计** | **28h** | - |

#### Phase 3: A2A 探索 (4 周)

| 任务 | 工时 | 优先级 |
|------|------|--------|
| A2A 规范研究 | 8h | P2 |
| Agent Card 实现 | 6h | P2 |
| 与 MCP 桥接 | 8h | P2 |
| 多代理协作演示 | 8h | P2 |
| **总计** | **30h** | - |

### 3.4 技术选型

| 组件 | 技术选择 | 理由 |
|------|----------|------|
| **MCP SDK** | `@modelcontextprotocol/sdk` | 官方 TypeScript SDK |
| **传输层** | HTTP + SSE | 支持远程访问 |
| **认证** | API Key + JWT | 简单且安全 |
| **数据存储** | PostgreSQL + Redis | 现有技术栈 |
| **部署** | Vercel + Docker | 现有部署方式 |

### 3.5 MCP Server 实现示例

```typescript
// server/mcp/index.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: '7zi-studio',
  version: '1.0.0',
}, {
  capabilities: {
    resources: {},
    tools: {},
    prompts: {},
  },
});

// Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      { uri: 'team://members', name: 'AI Team Members', mimeType: 'application/json' },
      { uri: 'project://status', name: 'Project Status', mimeType: 'application/json' },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  if (uri === 'team://members') {
    const members = await getTeamMembers();
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(members) }] };
  }
  
  throw new Error(`Unknown resource: ${uri}`);
});

// Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'assign_task',
        description: 'Assign a task to an AI team member',
        inputSchema: {
          type: 'object',
          properties: {
            task: { type: 'string', description: 'Task description' },
            assignee: { type: 'string', description: 'AI member ID' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          },
          required: ['task', 'assignee'],
        },
      },
      {
        name: 'get_dashboard',
        description: 'Get real-time dashboard data',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'assign_task') {
    const result = await assignTask(args);
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
  
  if (name === 'get_dashboard') {
    const dashboard = await getDashboard();
    return { content: [{ type: 'text', text: JSON.stringify(dashboard) }] };
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## 4. 商业价值

### 4.1 对智能体的价值

| 服务 | 价值描述 |
|------|----------|
| **AI 团队服务** | 智能体可以将任务委派给 7zi 的 11 位专业 AI 代理 |
| **专业能力** | 每个代理有独特专长（开发、设计、研究、营销等） |
| **实时协作** | Dashboard 提供实时进度监控 |
| **报告生成** | 自动生成项目报告和分析 |

### 4.2 收费模式建议

| 模式 | 描述 | 价格建议 |
|------|------|----------|
| **免费层** | 基础 MCP 访问，限制调用次数 | $0/月 |
| **专业层** | 无限调用 + 高级工具 | $29/月 |
| **企业层** | 私有部署 + 定制集成 | 定制 |

---

## 5. 风险与挑战

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| MCP 协议变更 | 高 | 关注官方更新，保持兼容 |
| A2A 发展不确定 | 中 | 观望态度，不过度投入 |
| 竞品出现 | 中 | 快速迭代，建立先发优势 |
| 认证安全 | 高 | 采用成熟方案，定期审计 |

---

## 6. 下一步行动

### 立即执行 (本周)

1. ✅ 创建 `server/mcp` 目录结构
2. ✅ 安装 `@modelcontextprotocol/sdk`
3. ✅ 实现基础 MCP Server
4. ✅ 测试与 Claude Desktop 集成

### 短期 (2 周内)

1. 实现完整的 Resources API
2. 实现 5 个核心 Tools
3. 编写使用文档
4. 发布到 npm

### 中期 (1 个月内)

1. 添加认证机制
2. 实现 Prompts API
3. 探索 A2A 集成
4. 建立监控和日志

---

## 7. 参考资料

- [MCP 官方文档](https://modelcontextprotocol.io)
- [Anthropic MCP GitHub](https://github.com/modelcontextprotocol)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Google A2A Proposal](https://github.com/google/A2A) (待确认)

---

**文档状态**: ✅ 完成  
**最后更新**: 2026-03-07  
**下一步**: 开始 Phase 1 实施

---

*本文档由咨询师子代理和主管共同完成*
