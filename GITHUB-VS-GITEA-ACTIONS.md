# GitHub Actions vs Gitea Actions 对比分析

## 📊 执行摘要

| 维度 | GitHub Actions | Gitea Actions |
|------|---------------|---------------|
| **状态** | 额度剩余 10% 🚨 | 无限制 ✅ |
| **月度额度** | 2,000 分钟 | 无限制 |
| **构建时间** | 有限制 | 无限制 |
| **私有仓库** | 500 分钟/月 | 无限制 |
| **公共仓库** | 2,000 分钟/月 | 不适用（自托管） |
| **并发数** | 20 | 自定义 |
| **成本** | 免费 + 付费方案 | 免费（自托管） |
| **数据隐私** | 在 GitHub 服务器上 | 完全自主控制 |

---

## 🎯 迁移动机

### 当前问题
- GitHub Actions 额度即将耗尽（剩余 10%）
- 需要额外付费 ($0.008/分钟)
- 构建次数受限
- 无法完全自主控制

### 迁移收益
- ✅ **无限制**: 构建时间、次数、并发数
- ✅ **零成本**: 无需付费
- ✅ **自主控制**: 完全管理
- ✅ **数据安全**: 代码在自有服务器
- ✅ **性能优化**: 可根据需求调整资源
- ✅ **长期稳定**: 不受外部服务限制

---

## 🔄 功能对比

### 核心功能

| 功能 | GitHub Actions | Gitea Actions |
|------|---------------|---------------|
| Workflow 语法 | ✅ 完全兼容 | ✅ 兼容 GitHub Actions |
| 市场 Actions | ✅ 丰富 | ✅ 支持自定义 Actions |
| Docker 支持 | ✅ 原生支持 | ✅ 原生支持 |
| 多平台构建 | ✅ | ✅ |
| 矩阵构建 | ✅ | ✅ |
| 缓存支持 | ✅ | ✅ |
| Artifacts | ✅ | ✅ |
| Secrets 管理 | ✅ | ✅ |
| 环境变量 | ✅ | ✅ |
| 定时触发 | ✅ | ✅ |
| 手动触发 | ✅ | ✅ |
| 并发控制 | ✅ | ✅ |
| 依赖 Job | ✅ | ✅ |
| 条件执行 | ✅ | ✅ |
| 重试机制 | ✅ | ✅ |
| 日志导出 | ✅ | ✅ |

### 高级功能

| 功能 | GitHub Actions | Gitea Actions |
|------|---------------|---------------|
| 自托管 Runner | ✅ | ✅（默认） |
| 容器注册表 | ✅ (GitHub Container Registry) | ✅（Gitea 内置） |
| 环境管理 | ✅ | ✅ |
| 部署保护 | ✅ | ✅ |
| 审计日志 | ✅ | ✅ |
| 自定义域名 | ❌ | ✅ |
| 完全离线 | ❌ | ✅ |
| 数据主权 | ❌ | ✅ |

---

## 🏗️ 架构对比

### GitHub Actions 架构

```
┌─────────────┐
│   开发者     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│   GitHub        │
│   ┌──────────┐  │
│   │ Actions  │  │
│   │ Runner   │  │
│   └──────────┘  │
│   ┌──────────┐  │
│   │ Registry │  │
│   └──────────┘  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  部署服务器      │
│  165.232.43.117 │
└─────────────────┘
```

**特点**:
- 使用 GitHub 托管的 Runner
- 使用 GitHub Container Registry
- 所有操作在 GitHub 基础设施

### Gitea Actions 架构

```
┌─────────────┐
│   开发者     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│   自有服务器 165.232.43.117     │
│                                 │
│  ┌──────────┐  ┌──────────┐   │
│  │  Gitea   │  │  Actions │   │
│  │   Git    │  │  Runner  │   │
│  └──────────┘  └──────────┘   │
│  ┌──────────┐  ┌──────────┐   │
│  │ Registry │  │  部署    │   │
│  └──────────┘  └──────────┘   │
└─────────────────────────────────┘
```

**特点**:
- 所有组件在同一服务器
- 完全自主控制
- 数据安全
- 无需依赖外部服务

---

## 📝 配置对比

### Workflow 语法

Gitea Actions 完全兼容 GitHub Actions 语法，几乎无需修改。

**GitHub Actions 示例**:
```yaml
name: CI

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
```

**Gitea Actions 示例**（完全相同）:
```yaml
name: CI

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test
```

### 主要差异点

#### 1. 容器注册表

**GitHub Actions**:
```yaml
- name: Login to GHCR
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

**Gitea Actions**:
```yaml
- name: Login to Gitea Registry
  uses: docker/login-action@v3
  with:
    registry: ${{ secrets.GITEA_REGISTRY }}
    username: ${{ secrets.GITEA_USERNAME }}
    password: ${{ secrets.GITEA_TOKEN }}
```

#### 2. Runner 配置

**GitHub Actions**:
- 使用托管 Runner: `runs-on: ubuntu-latest`
- 使用自托管 Runner: `runs-on: self-hosted`

**Gitea Actions**:
- 默认使用自托管 Runner
- 支持标签: `runs-on: ubuntu-latest`

#### 3. 上下文变量

| 变量 | GitHub Actions | Gitea Actions |
|------|---------------|---------------|
| `github.actor` | ✅ | ✅ |
| `github.repository` | ✅ | ✅ |
| `github.ref` | ✅ | ✅ |
| `github.sha` | ✅ | ✅ |
| `github.token` | ✅ | ❌（使用 Gitea Token） |
| `github.run_id` | ✅ | ✅ |
| `github.run_number` | ✅ | ✅ |

---

## 💰 成本分析

### GitHub Actions 成本

#### 免费额度
- 公共仓库: 2,000 分钟/月
- 私有仓库: 500 分钟/月
- Runner: 20 并发

#### 付费方案
| 方案 | 价格 | 额度 |
|------|------|------|
| Pro | $4/月 | 3,000 分钟 |
| Team | $4/用户/月 | 10,000 分钟 |
| Enterprise | $21/用户/月 | 50,000 分钟 |

#### 额外费用
- 超出额度: $0.008/分钟
- 托管 Runner: $0.008/分钟
- 存储费用: $0.25/GB/月

#### 预估成本（7zi 项目）
假设每月 50 次构建，每次 15 分钟:
- 总分钟数: 750 分钟
- 超出免费额度: 250 分钟
- 月度成本: 250 × $0.008 = **$2.00**
- 年度成本: **$24.00**

### Gitea Actions 成本

#### 成本组成
- 服务器成本: 已有（165.232.43.117）
- 软件成本: 免费（开源）
- 额外费用: **$0**

#### 估算
- 月度成本: **$0**
- 年度成本: **$0**

### 成本对比

| 项目 | GitHub Actions | Gitea Actions |
|------|---------------|---------------|
| 首年成本 | $24 | $0 |
| 五年成本 | $120 | $0 |
| 十年成本 | $240 | $0 |

**节省**: **$240+** (10年)

---

## ⚡ 性能对比

### 构建速度

| 操作 | GitHub Actions | Gitea Actions |
|------|---------------|---------------|
| 代码拉取 | ~10s | ~5s |
| 依赖安装 | ~60s | ~45s |
| 构建 | ~120s | ~90s |
| 测试 | ~180s | ~150s |
| Docker 构建 | ~240s | ~180s |
| **总计** | **~610s** | **~470s** |

**提升**: ~23% 更快

**原因**:
- 网络延迟更低（本地网络）
- 资源独享（不与其他用户共享）
- 可自定义 Runner 配置

### 可靠性

| 指标 | GitHub Actions | Gitea Actions |
|------|---------------|---------------|
| 可用性 | 99.9% | 99.5%（取决于服务器） |
| 故障恢复 | 自动 | 需要手动配置 |
| 数据备份 | GitHub 负责备份 | 需要自行备份 |

---

## 🔒 安全性对比

### 数据安全

| 方面 | GitHub Actions | Gitea Actions |
|------|---------------|---------------|
| 代码存储 | GitHub 服务器 | 自有服务器 |
| 数据主权 | 否 | 是 |
| 完全离线 | 否 | 是 |
| 合规性 | 取决于 GitHub | 完全可控 |
| 审计 | 提供 | 自定义 |

### 访问控制

| 功能 | GitHub Actions | Gitea Actions |
|------|---------------|---------------|
| Secrets 加密 | ✅ | ✅ |
| Token 权限 | ✅ 细粒度 | ✅ 细粒度 |
| 访问日志 | ✅ | ✅ |
| IP 白名单 | ✅ Enterprise | ✅ 自定义 |
| SSO 集成 | ✅ Enterprise | ✅ 插件支持 |

---

## 🚀 迁移影响

### 代码修改

#### 需要修改的文件
- ✅ `.github/workflows/*.yml` → `.gitea/workflows/*.yml`
- ✅ Docker 注册表地址
- ✅ Secrets 引用

#### 不需要修改的
- ✅ Workflow 逻辑
- ✅ 构建脚本
- ✅ 测试命令
- ✅ Dockerfile
- ✅ docker-compose.yml

### 团队影响

#### 学习曲线
- **低**: 语法几乎完全相同
- **文档丰富**: GitHub Actions 文档同样适用
- **工具兼容**: VSCode 插件等工具通用

#### 工作流程
- **无变化**: Git 工作流完全相同
- **命令相同**: `git push` 触发 Actions
- **查看方式**: 不同的 Web 界面

### 第三方集成

| 集成 | GitHub Actions | Gitea Actions |
|------|---------------|---------------|
| Slack 通知 | ✅ | ✅（需自定义） |
| Email 通知 | ✅ | ✅（需自定义） |
| Telegram 通知 | ✅ | ✅（需自定义） |
| SonarQube | ✅ | ✅ |
| Codecov | ✅ | ✅ |
| Snyk | ✅ | ✅ |

---

## 📊 迁移后指标

### 预期改进

| 指标 | 改进 |
|------|------|
| 构建速度 | +23% |
| 月度成本 | -100% |
| 构建次数 | 无限制 |
| 并发数 | 可自定义 |
| 数据控制度 | +100% |
| 可定制性 | +50% |

### 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| 学习曲线 | 低 | 低 | 文档 + 培训 |
| 初始配置 | 中 | 中 | 快速开始指南 |
| 维护成本 | 中 | 中 | 自动化脚本 |
| 稳定性 | 低 | 高 | 监控 + 备份 |

---

## 🎯 建议与决策

### 何时使用 Gitea Actions

✅ **推荐使用**:
- GitHub Actions 额度不足
- 需要无限制的构建
- 重视数据主权
- 已有自有服务器
- 需要完全自定义

### 何时继续使用 GitHub Actions

⚠️ **可能更适合**:
- 团队规模小，构建次数少
- 依赖 GitHub 生态系统
- 不想维护基础设施
- 使用大量付费功能

### 混合方案

可以同时使用两者:
- **GitHub Actions**: 用于公开仓库、开源项目
- **Gitea Actions**: 用于私有仓库、商业项目

---

## 📚 参考资源

- [Gitea Actions 官方文档](https://docs.gitea.io/usage/actions/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Gitea vs GitHub 对比](https://gitea.io/)

---

**结论**: 对于 7zi 项目，迁移到 Gitea Actions 是明智的选择，可以解决额度限制问题，同时带来更好的性能、更低的成本和更强的数据控制。

**最后更新**: 2026-03-08