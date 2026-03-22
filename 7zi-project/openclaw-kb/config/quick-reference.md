# OpenClaw 配置快速参考

## 配置文件位置
- 默认: `~/.openclaw/openclaw.json`
- 环境变量: `OPENCLAW_CONFIG_PATH`

## 核心配置结构

```json
{
  "meta": { },
  "env": { },
  "logging": { },
  "update": { },
  "browser": { },
  "secrets": { },
  "auth": { },
  "acp": { },
  "models": { },
  "agents": { },
  "tools": { },
  "channels": { }
}
```

## 重要配置项

### agents.defaults (代理默认配置)
| 配置项 | 类型 | 说明 |
|--------|------|------|
| model | string | 默认模型 |
| imageModel | string | 图片理解模型 |
| pdfModel | string | PDF分析模型 |
| thinkingDefault | string | 思考模式 (off/minimal/low/medium/high/xhigh/adaptive) |
| contextTokens | number | 上下文token上限 |
| workspace | string | 工作目录 |
| skipBootstrap | boolean | 跳过引导流程 |

### tools.exec (执行工具安全配置)
| 配置项 | 类型 | 说明 |
|--------|------|------|
| host | string | 执行主机 (sandbox/gateway/node) |
| security | string | 安全模式 (deny/allowlist/full) |
| ask | string | 询问模式 (off/on-miss/always) |
| timeoutSec | number | 超时秒数 |

### memorySearch (记忆搜索配置)
| 配置项 | 类型 | 说明 |
|--------|------|------|
| enabled | boolean | 是否启用 |
| provider | string | 提供商 (openai/gemini/local/voyage/mistral/ollama) |
| sources | array | 搜索来源 (memory/sessions) |

### sandbox (沙箱配置)
| 配置项 | 类型 | 说明 |
|--------|------|------|
| mode | string | 模式 (off/non-main/all) |
| workspaceAccess | string | 工作目录访问 (none/ro/rw) |

## 配置验证
```bash
# 验证配置文件
openclaw config validate
openclaw config validate --json

# 查看当前配置
openclaw config get
```

## 配置迁移注意事项 (2026.3.2)

⚠️ **已移除的配置项**:
- agents.defaults.provider (已废弃)

⚠️ **新增必需配置**:
- 如需ACP功能: 确保 acp.dispatch.enabled 设置正确

## 常见配置示例

### 最小配置
```json
{
  "agents": {
    "defaults": {
      "model": "claude-sonnet-4-20250514"
    }
  }
}
```

### 带记忆搜索的配置
```json
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "enabled": true,
        "provider": "openai",
        "model": "text-embedding-3-small"
      }
    }
  }
}
```
