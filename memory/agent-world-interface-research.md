# 智能体世界接口研究报告

**研究日期**: 2026-03-07  
**研究者**: 智能体世界专家 (子代理)  
**目的**: 研究如何连接到智能体世界，实现服务对象从人类转向智能体

---

## 一、主流智能体平台分析

### 1.1 OpenAI GPTs / Assistants API

**核心特点**:
- **GPTs**: 用户可创建定制版ChatGPT，结合指令、知识和技能
- **Assistants API**: 提供持久化线程、文件处理、函数调用等能力
- **Function Calling**: JSON Schema定义函数，模型智能选择调用

**接口标准**:
```json
{
  "name": "function_name",
  "description": "Function description",
  "parameters": {
    "type": "object",
    "properties": {...},
    "required": [...]
  }
}
```

**API端点**:
- `/v1/assistants` - 创建/管理助手
- `/v1/threads` - 会话线程管理
- `/v1/runs` - 执行任务
- `/v1/chat/completions` - 直接对话

### 1.2 Claude / Anthropic API

**核心特点**:
- **Tools API**: 支持客户端工具和服务端工具
- **Computer Use**: 计算机操作能力
- **MCP支持**: 原生支持Model Context Protocol
- **Structured Outputs**: 严格Schema验证

**工具定义格式**:
```json
{
  "name": "tool_name",
  "description": "Tool description",
  "input_schema": {
    "type": "object",
    "properties": {...}
  }
}
```

**独特优势**:
- 服务端工具（Web Search、Web Fetch）自动执行
- `tool_result` 机制处理工具返回
- MCP Connector直接连接远程MCP服务器

### 1.3 LangChain / LangGraph

**核心特点**:
- **统一接口**: 标准化多模型交互
- **Deep Agents**: 内置上下文压缩、虚拟文件系统、子代理
- **LangGraph**: 低级编排框架，支持持久化、流式、人机协同
- **100+ LLM集成**: 通过LiteLLM代理访问

**Agent创建示例**:
```python
from langchain.agents import create_agent

agent = create_agent(
    model="claude-sonnet-4-6",
    tools=[get_weather],
    system_prompt="You are a helpful assistant"
)
```

### 1.4 AutoGPT

**核心特点**:
- **持续自主Agent**: 自动化复杂工作流
- **Agent Builder**: 低代码界面创建自定义Agent
- **Marketplace**: 预构建Agent市场
- **Agent Protocol**: 标准化通信协议

**技术架构**:
- 前端：Agent交互界面
- 服务器：Agent运行引擎
- 块系统：可组合的工作流组件

### 1.5 LiteLLM

**核心特点**:
- **统一API**: 100+ LLM使用OpenAI格式
- **Proxy Server**: LLM网关，支持认证、授权、成本追踪
- **Router**: 重试/回退逻辑
- **Virtual Keys**: 安全访问控制

---

## 二、智能体API接口标准

### 2.1 工具调用标准对比

| 平台 | 工具定义格式 | 输入Schema | 输出Schema |
|------|-------------|------------|------------|
| OpenAI | `functions` / `tools` | JSON Schema | 无强制 |
| Anthropic | `tools` + `input_schema` | JSON Schema | 可选 |
| MCP | `tools` + `inputSchema` | JSON Schema | 可选 `outputSchema` |
| LangChain | Python函数/StructuredTool | Pydantic | 自定义 |

### 2.2 消息格式标准

**OpenAI Messages格式**:
```json
{
  "role": "user|assistant|system|tool",
  "content": "string or array",
  "tool_calls": [...],
  "tool_call_id": "..."
}
```

**Anthropic Messages格式**:
```json
{
  "role": "user|assistant",
  "content": [
    {"type": "text", "text": "..."},
    {"type": "tool_use", "name": "...", "input": {...}},
    {"type": "tool_result", "tool_use_id": "...", "content": "..."}
  ]
}
```

### 2.3 流式响应标准

- **SSE (Server-Sent Events)**: OpenAI、Anthropic通用
- **Event Types**: `thread.message.delta`, `content_block_delta`
- **Chunk格式**: JSON增量更新

---

## 三、智能体通信协议

### 3.1 MCP - Model Context Protocol (最重要)

**由Anthropic主导的开源标准**

**核心概念**:
```
┌─────────────────┐     ┌─────────────────┐
│   MCP Client    │ ←→  │   MCP Server    │
│  (AI应用/Agent) │     │ (数据源/工具)   │
└─────────────────┘     └─────────────────┘
```

**协议特点**:
- **JSON-RPC 2.0** 基础
- **标准化工具发现**: `tools/list`
- **标准化工具调用**: `tools/call`
- **支持资源**: 文件、数据库、API

**工具定义**:
```json
{
  "name": "get_weather",
  "description": "Get current weather",
  "inputSchema": {
    "type": "object",
    "properties": {
      "location": {"type": "string"}
    }
  }
}
```

**已有支持**:
- Claude Desktop
- VS Code Copilot
- Cursor
- OpenAI (ChatGPT)

### 3.2 A2A - Agent2Agent Protocol

**由Google主导的开源标准**

**核心价值**: 
> 使不同框架、不同公司、不同服务器上的AI Agent能够作为Agent（而非工具）进行通信和协作

**三层架构**:
```
┌──────────────────────────────────────┐
│ Layer 3: Protocol Bindings           │
│ (JSON-RPC, gRPC, HTTP/REST)          │
├──────────────────────────────────────┤
│ Layer 2: Abstract Operations         │
│ (Send Message, Get Task, Stream...)  │
├──────────────────────────────────────┤
│ Layer 1: Canonical Data Model        │
│ (Task, Message, AgentCard, Part)     │
└──────────────────────────────────────┘
```

**核心操作**:
1. `Send Message` - 发送消息
2. `Send Streaming Message` - 流式消息
3. `Get Task` - 获取任务状态
4. `List Tasks` - 列出任务
5. `Cancel Task` - 取消任务
6. `Subscribe to Task` - 订阅任务更新
7. `Get Agent Card` - 获取Agent元数据

**Agent Card (能力声明)**:
```json
{
  "name": "Agent Name",
  "description": "Agent description",
  "capabilities": {
    "streaming": true,
    "pushNotifications": true
  },
  "skills": [...]
}
```

**关键概念**:
- **Task**: 基本工作单元，有状态生命周期
- **Message**: 通信回合，包含Parts
- **Part**: 最小内容单元（文本、文件、结构化数据）
- **Artifact**: Agent生成的输出

### 3.3 Agent Protocol (AI Engineer Foundation)

**AutoGPT采用的标准**

**特点**:
- 标准化Agent与前端/基准测试的通信
- RESTful API
- 任务生命周期管理

---

## 四、协议对比分析

| 维度 | MCP | A2A | Agent Protocol |
|------|-----|-----|----------------|
| **主导方** | Anthropic | Google | AI Engineer Foundation |
| **定位** | AI-工具连接 | Agent-Agent通信 | Agent-前端通信 |
| **传输** | JSON-RPC/stdio/SSE | JSON-RPC/HTTP/gRPC | REST |
| **发现机制** | tools/list | Agent Card | 无标准 |
| **异步支持** | 部分 | 原生 | 基础 |
| **状态管理** | 无 | Task状态机 | 简单 |
| **流式** | SSE | SSE | 无标准 |
| **安全** | 基础 | 企业级设计 | 基础 |

---

## 五、智能体通信协议设计建议

### 5.1 协议选型建议

**场景1: 连接外部工具/数据源**
→ 使用 **MCP**

**场景2: Agent之间协作**
→ 使用 **A2A**

**场景3: 混合场景**
→ MCP + A2A 组合

### 5.2 推荐架构

```
┌────────────────────────────────────────────────────────────┐
│                    OpenClaw Agent System                    │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   主Agent   │ ←→ │  子Agent 1  │ ←→ │  子Agent N  │    │
│  │  (Director) │    │  (Worker)   │    │  (Worker)   │    │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    │
│         │                  │                  │            │
│         └──────────────────┴──────────────────┘            │
│                           │                                 │
│                    A2A Protocol                            │
│                           │                                 │
├───────────────────────────┼─────────────────────────────────┤
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   MCP Servers                        │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │ Files   │ │ Database│ │ Web API │ │ Tools   │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### 5.3 核心接口设计

#### 5.3.1 Agent Card (能力声明)
```json
{
  "id": "openclaw-main-agent",
  "name": "OpenClaw Director",
  "version": "1.0.0",
  "description": "AI主管系统",
  "capabilities": {
    "streaming": true,
    "pushNotifications": true,
    "subagents": true,
    "mcp": true
  },
  "skills": [
    {"name": "task_management", "description": "任务管理"},
    {"name": "subagent_orchestration", "description": "子代理编排"}
  ],
  "securitySchemes": {
    "bearer": {"type": "http", "scheme": "bearer"}
  },
  "endpoints": {
    "a2a": "https://api.openclaw.com/a2a",
    "mcp": "https://api.openclaw.com/mcp"
  }
}
```

#### 5.3.2 子代理通信接口
```typescript
interface SubagentRequest {
  taskId: string;
  agentRole: string; // 咨询师/架构师/Executor等
  task: string;
  context?: object;
  timeout?: number;
}

interface SubagentResponse {
  taskId: string;
  status: 'completed' | 'failed' | 'timeout';
  result: string;
  artifacts?: Artifact[];
}
```

#### 5.3.3 MCP工具扩展
```json
{
  "name": "delegate_to_subagent",
  "description": "委托任务给子代理",
  "inputSchema": {
    "type": "object",
    "properties": {
      "agent_role": {
        "type": "string",
        "enum": ["consultant", "architect", "executor", "admin", "tester"]
      },
      "task_description": {"type": "string"},
      "context": {"type": "object"}
    },
    "required": ["agent_role", "task_description"]
  }
}
```

---

## 六、实现方案

### 6.1 阶段一: MCP集成 (短期)

**目标**: 让OpenClaw作为MCP Server暴露工具

**实现**:
1. 实现MCP Server接口
2. 暴露核心工具：
   - `read_file`
   - `write_file`
   - `exec_command`
   - `browser_control`
   - `send_message`
   - `web_search`

**技术栈**: TypeScript + MCP SDK

### 6.2 阶段二: A2A支持 (中期)

**目标**: Agent间协作能力

**实现**:
1. 实现A2A Server
2. 定义Agent Card
3. 支持Task生命周期管理
4. 子代理A2A通信

**技术栈**: Python + A2A SDK

### 6.3 阶段三: 智能体市场 (长期)

**目标**: 成为智能体世界的枢纽

**实现**:
1. Agent Registry - 注册/发现
2. Agent Marketplace - 能力交易
3. Agent Collaboration Network - 协作网络
4. Cross-platform Bridge - 多协议桥接

---

## 七、关键发现与建议

### 7.1 核心发现

1. **MCP是最重要的协议** - 由Anthropic主导，已获广泛支持
2. **A2A是Agent间通信的未来** - Google推动，解决Agent协作问题
3. **两者互补** - MCP处理AI-工具，A2A处理Agent-Agent
4. **标准正在快速演进** - 需要持续跟踪

### 7.2 战略建议

1. **优先MCP** - 让OpenClaw工具可被Claude/ChatGPT调用
2. **跟进A2A** - 为Agent协作做准备
3. **设计桥接层** - MCP ↔ A2A 转换
4. **参与社区** - 跟进协议演进

### 7.3 技术建议

```python
# 推荐技术栈
class OpenClawAgentProtocol:
    """OpenClaw智能体协议实现"""
    
    # MCP Server - 暴露工具给其他AI
    mcp_server: MCPServer
    
    # A2A Server - Agent间通信
    a2a_server: A2AServer
    
    # Agent Card - 能力声明
    agent_card: AgentCard
    
    # 子代理管理
    subagent_manager: SubagentManager
```

---

## 八、参考资源

### 协议规范
- [MCP Specification](https://modelcontextprotocol.io/specification)
- [A2A Specification](https://a2a-protocol.org/specification)
- [Agent Protocol](https://agentprotocol.ai/)

### SDK
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [A2A Python SDK](https://pypi.org/project/a2a-sdk)
- [A2A Go SDK](https://github.com/a2aproject/a2a-go)

### 框架
- [LangChain](https://python.langchain.com/)
- [LangGraph](https://langchain-ai.github.io/langgraph/)
- [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT)
- [LiteLLM](https://docs.litellm.ai/)

---

**报告完成时间**: 2026-03-07  
**状态**: 研究完成，待实施