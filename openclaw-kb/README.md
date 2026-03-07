# OpenClaw 知识库

本知识库收录OpenClaw官方文档和GitHub信息，包含版本历史、配置格式、命令使用等。

**当前版本**: 2026.3.2 (2026-03-03)

**更新频道**: stable (默认)

## 📁 目录结构

```
openclaw-kb/
├── README.md                    # 知识库说明
├── versions/
│   └── latest.md               # 当前版本发布说明
├── config/
│   ├── quick-reference.md      # 配置快速参考
│   └── version-comparison.md   # 版本差异详解
└── commands/
    └── quick-reference.md      # 命令行参考
```

## ⚠️ 重要：使用前必读

### 在进行以下任务前，必须先查阅本知识库：

1. 任何OpenClaw配置相关操作
2. 版本升级/降级操作
3. 配置文件修改
4. 命令行工具使用
5. 新功能使用
6. 认证/凭据管理

### 每次操作前的标准流程：

1. **检查版本**: `openclaw --version`
2. **验证配置**: `openclaw config validate`
3. **查阅相关文档**: 根据任务类型查看对应KB文件
4. **执行操作**: 如需修改，先备份

### 关键命令速查

```bash
# 版本和状态
openclaw --version
openclaw status

# 配置验证（必须！）
openclaw config validate
openclaw config validate --json

# 诊断和修复
openclaw doctor
openclaw doctor --fix
openclaw doctor --generate-gateway-token
```

## 📚 主要内容

- **versions/latest.md**: 最新版本发布说明和Breaking Changes
- **config/quick-reference.md**: 配置项快速参考
- **config/version-comparison.md**: 旧版vs新版配置格式差异详解
- **commands/quick-reference.md**: 命令行工具使用
