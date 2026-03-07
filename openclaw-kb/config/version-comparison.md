# OpenClaw 配置格式版本差异详解

> 本文档整合自用户分享的知识库，详细说明不同版本间配置的变化

## 一、配置格式的具体差异

### 1. JSON格式支持

- **旧版**：可能只支持标准JSON
- **新版**：明确支持 JSON5格式（支持注释和尾逗号）

```json5
{
  // 这是注释
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } }, // 尾逗号允许
}
```

### 2. 字段名称的具体变化

| 旧版字段路径 | 新版字段路径 | 变化说明 |
|------------|------------|---------|
| agent.workspace | agents.defaults.workspace | 从单智能体到多智能体默认值 |
| agent.sandbox | agents.defaults.sandbox | 同上 |
| ~/.openclaw/agent/* | ~/.openclaw/agents/&lt;agentId&gt;/agent/* | 目录结构变化 |
| ~/.openclaw/sessions/ | ~/.openclaw/agents/&lt;agentId&gt;/sessions/ | 会话存储位置变化 |
| 直接API密钥配置 | 通过auth-profiles.json管理 | 认证存储方式变化 |

---

## 二、智能体配置的具体结构差异

### 旧版（单智能体）

```json
{
  "agent": {
    "workspace": "~/.openclaw/workspace",
    "model": "anthropic/claude-opus-4-5",
    "sandbox": { "mode": "non-main" }
  }
}
```

### 新版（多智能体）

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "model": { "primary": "anthropic/claude-opus-4-5" },
      "sandbox": { "mode": "non-main" }
    },
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/.openclaw/workspace-main",
        "tools": { "allow": ["read", "write"] }
      },
      {
        "id": "work",
        "workspace": "~/.openclaw/workspace-work",
        "model": { "primary": "openai/gpt-4o" }
      }
    ]
  }
}
```

---

## 三、认证管理的具体差异

### 1. 存储位置对比

**旧版结构**：
```
~/.openclaw/
├── credentials/
│   ├── oauth.json          # OAuth令牌
│   └── whatsapp/...        # 渠道凭证
├── agent/                  # 单智能体目录
│   └── auth.json          # 运行时缓存
```

**新版结构**：
```
~/.openclaw/
├── credentials/
│   ├── oauth.json          # 仅用于旧版导入（首次使用时迁移）
│   └── whatsapp/...        # 渠道凭证
├── agents/                 # 多智能体目录
│   ├── main/              # 智能体ID
│   │   └── agent/
│   │       ├── auth-profiles.json  # 主存储：API密钥+OAuth
│   │       └── auth.json           # 运行时缓存（自动管理）
│   └── work/              # 另一个智能体
│       └── agent/
│           ├── auth-profiles.json
│           └── auth.json
```

### 2. 配置文件中的认证配置差异

**旧版方式（直接在配置中写密钥）**：
```json
{
  "models": {
    "providers": {
      "openai": {
        "apiKey": "sk-..."  // 密钥直接暴露在配置中
      }
    }
  }
}
```

**新版方式（通过认证配置文件）**：
```json
{
  "auth": {
    "profiles": {
      "openai:default": {
        "provider": "openai",
        "mode": "api_key"
        // 注意：这里不包含实际密钥！
      },
      "anthropic:me@example.com": {
        "provider": "anthropic", 
        "mode": "oauth",
        "email": "me@example.com"
      }
    },
    "order": {
      "anthropic": ["anthropic:me@example.com", "anthropic:work"]
    }
  }
}
```

实际密钥存储在 `~/.openclaw/agents/<agentId>/agent/auth-profiles.json` 中。

---

## 四、工具管控的具体差异

### 1. 工具配置文件（profiles）的具体内容

新版引入了预定义的工具配置文件：

```json
{
  "tools": {
    "profile": "messaging",  // 可选值：minimal, coding, messaging, full
    // 各配置文件的工具集不同：
    // - minimal: 仅核心工具（read/exec/edit/write）
    // - coding: 包含开发相关工具
    // - messaging: 包含消息和社交工具
    // - full: 所有可用工具
  }
}
```

### 2. 多层管控的具体示例

```json
{
  "tools": {
    "profile": "full",
    "allow": ["read", "write", "browser", "message"],
    "deny": ["exec"],  // 全局拒绝exec工具
    "byProvider": {
      "anthropic/claude-opus-4-5": {
        "allow": ["read", "write"],  // 为特定模型进一步限制
        "deny": ["browser"]
      }
    }
  },
  "agents": {
    "list": [
      {
        "id": "secure-agent",
        "tools": {
          "allow": ["read"],  // 只能进一步限制，不能恢复被拒绝的工具
          "deny": ["write"]   // 这个智能体既不能用exec（全局拒绝），也不能用write
        }
      }
    ]
  }
}
```

---

## 五、配置包含（$include）的具体用法

这是新版特有的功能：

```json
// 主配置文件：~/.openclaw/openclaw.json
{
  "gateway": { "port": 18789 },
  "agents": { 
    "$include": "./agents.json5"  // 包含单个文件，替换整个agents对象
  },
  "broadcast": {
    "$include": [  // 包含多个文件，按顺序深度合并
      "./clients/client1.json5",
      "./clients/client2.json5"
    ],
    "enabled": true  // 合并后可以覆盖包含的值
  }
}
```

---

## 六、环境变量加载的具体优先级

新版有明确的加载顺序（从高到低）：

1. **进程环境变量**（最高优先级）
2. **当前目录的 .env 文件**
3. **全局 ~/.openclaw/.env 文件**
4. **配置文件中的 env 块**（仅当缺失时应用）
5. **可选的shell环境导入**（env.shellEnv.enabled: true）

配置示例：
```json
{
  "env": {
    "OPENROUTER_API_KEY": "sk-or-...",
    "vars": {
      "GROQ_API_KEY": "gsk-..."
    },
    "shellEnv": {
      "enabled": true,
      "timeoutMs": 15000
    }
  }
}
```

---

## 七、验证和迁移的具体命令

### 1. 配置验证命令

```bash
# 验证配置是否符合schema
openclaw config validate

# 机器可读的输出
openclaw config validate --json

# 获取当前配置路径
openclaw config file
```

### 2. 迁移和修复命令

```bash
# 检查配置问题（干跑）
openclaw doctor

# 应用修复和迁移
openclaw doctor --fix

# 自动确认所有修复
openclaw doctor --yes

# 生成网关令牌
openclaw doctor --generate-gateway-token
```

### 3. 配置无效时的命令限制

当配置无效时，只有诊断命令可用：
- `openclaw doctor`
- `openclaw logs`
- `openclaw health`
- `openclaw status`
- `openclaw help`

其他命令会硬失败并显示："Config invalid. Run openclaw doctor --fix."

---

## 八、插件配置的具体差异

### 1. 插件清单要求

新版要求每个插件必须有：

```json
// openclaw.plugin.json
{
  "id": "voice-call",  // 必填：唯一插件ID
  "configSchema": {    // 必填：配置的JSON Schema
    "type": "object",
    "additionalProperties": false,
    "properties": {}
  },
  "kind": "memory",    // 可选：插件类型
  "channels": ["matrix"],  // 可选：注册的渠道
  "uiHints": {         // 可选：UI提示信息
    "apiKey": {
      "label": "API密钥",
      "sensitive": true
    }
  }
}
```

### 2. 验证流程

新版插件加载流程：
- 解析插件清单 + schema
- 根据schema验证配置
- 如果缺少schema或配置无效 → 阻止插件加载
- 错误消息包括：插件ID、原因、验证失败的路径

---

## 九、工作区文件的具体变化

### 1. 引导文件注入规则

| 文件 | 用途 | 注入时机 | 截断限制 |
|-----|------|---------|---------|
| AGENTS.md | 操作指令+记忆 | 每个新会话的第一轮 | 默认20,000字符 |
| SOUL.md | 人设、边界、语气 | 每个新会话的第一轮 | 默认20,000字符 |
| TOOLS.md | 用户维护的工具说明 | 每个新会话的第一轮 | 默认20,000字符 |
| BOOTSTRAP.md | 一次性首次运行仪式 | 仅全新工作区 | 完成后删除 |
| IDENTITY.md | 智能体名称/风格/表情 | 每个新会话的第一轮 | 默认20,000字符 |
| USER.md | 用户档案+偏好称呼 | 每个新会话的第一轮 | 默认20,000字符 |

### 2. 总注入字符数限制

```json
{
  "agents": {
    "defaults": {
      "bootstrapMaxChars": 20000,       // 单个文件限制
      "bootstrapTotalMaxChars": 150000  // 所有文件总限制
    }
  }
}
```

---

## 十、版本迁移步骤

### 从旧版迁移到新版的具体步骤：

```bash
# 1. 备份旧配置
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup

# 2. 运行迁移命令
openclaw doctor --fix

# 3. 验证迁移结果
# 检查新结构
openclaw config get agents.list

# 检查认证迁移
ls -la ~/.openclaw/agents/*/agent/auth-profiles.json

# 4. 调整多智能体配置（如果需要）
# 添加新智能体
openclaw agents add work --model "openai/gpt-4o"
```

---

## 总结对比表

| 特性 | 旧版 / 宽松模式 | 新版 / 严格模式 |
|------|---------------|---------------|
| 格式验证 | 可能允许未知键 | 严格Schema验证，未知键报错 |
| 智能体模型 | 单智能体配置 | 多智能体配置 (agents.list) |
| 认证存储 | 分散（环境变量、oauth.json） | 集中认证配置文件 (auth-profiles.json) |
| 工具管控 | 相对简单 | 多层精细化策略（全局、智能体、提供商、沙箱） |
| 配置组织 | 单一文件 | 支持 $include 模块化 |
| 环境变量 | 可能未明确优先级 | 明确优先级与"不覆盖"原则 |
| 变更与迁移 | 可能自动迁移或静默处理 | 通过 openclaw doctor 进行显式迁移 |

---

## ⚠️ 2026.3.2版重要注意事项

1. **tools.profile 默认值变更**：新安装默认 `messaging`，不再是 `coding`
2. **ACP调度默认启用**：`acp.dispatch.enabled` 默认为 true
3. **Plugin SDK API变更**：移除 `api.registerHttpHandler(...)`
4. **配置验证**：使用 `openclaw config validate` 进行检查
