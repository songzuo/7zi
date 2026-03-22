# CI/CD 优化报告

## 优化前后对比

### 1. 原有状态

项目之前**没有 CI/CD 配置**，所有部署都是手动执行：
- 无自动化测试
- 无代码质量检查
- 无构建缓存
- 手动部署到服务器

### 2. 优化后架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     CI/CD Pipeline                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────────┐     │
│  │  Lint    │ │ TypeCheck│ │  Test (4 shards parallel)    │     │
│  │  ~30s    │ │  ~20s    │ │  ~60s total                  │     │
│  └────┬─────┘ └────┬─────┘ └────────────┬─────────────────┘     │
│       │            │                     │                       │
│       └────────────┼─────────────────────┘                       │
│                    ▼                                             │
│            ┌──────────────┐                                      │
│            │    Build     │ ← Next.js Cache                     │
│            │   ~90s       │                                      │
│            └──────┬───────┘                                      │
│                   │                                              │
│                   ▼                                              │
│            ┌──────────────┐                                      │
│            │ Pre-deploy   │                                      │
│            │   Checks     │                                      │
│            └──────┬───────┘                                      │
│                   │                                              │
│         ┌────────┴────────┐                                      │
│         ▼                 ▼                                      │
│  ┌─────────────┐   ┌─────────────┐                               │
│  │   Docker    │   │   Deploy    │                               │
│  │   Build     │   │  Staging    │                               │
│  │   ~120s     │   │  (Manual)   │                               │
│  └─────────────┘   └─────────────┘                               │
│                         │                                        │
│                         ▼                                        │
│                  ┌─────────────┐                                 │
│                  │  Production │ ← 需手动触发                    │
│                  │   Deploy    │                                 │
│                  └─────────────┘                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3. 预估时间对比

| 阶段 | 优化前（手动） | 优化后（CI） | 节省 |
|------|---------------|-------------|------|
| 代码检查 | 手动执行/跳过 | ~50s | 确保质量 |
| 单元测试 | 手动执行/跳过 | ~60s | 确保质量 |
| 构建 | ~3-5 分钟 | ~90s (有缓存更快) | ~60% |
| Docker 构建 | ~5 分钟 | ~2 分钟 (有缓存) | ~60% |
| 部署 | ~5-10 分钟 | ~1-2 分钟 | ~80% |
| **总计** | **15-20 分钟** | **~5-8 分钟** | **~65%** |

## 优化策略详情

### 1. 构建缓存策略

#### npm 依赖缓存
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '22'
    cache: 'npm'  # 自动缓存 npm 依赖
```

#### Next.js 构建缓存
```yaml
- name: Cache Next.js build
  uses: actions/cache@v4
  with:
    path: .next/cache
    key: nextjs-${{ runner.os }}-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx') }}
```

#### Docker 层缓存
```yaml
- name: Cache Docker layers
  uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: docker-${{ runner.os }}-${{ hashFiles('Dockerfile', '**/package-lock.json') }}
```

### 2. 测试并行化

- **分片策略**: 4 个并行 shard
- **线程池**: 2-4 线程
- **重试机制**: 失败后自动重试 1 次

```typescript
// vitest.config.ts
pool: 'threads',
poolOptions: {
  threads: {
    minThreads: 2,
    maxThreads: 4,
  },
},
```

### 3. 并发控制

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true  # 新提交自动取消旧的运行
```

### 4. 依赖安装优化

```bash
npm ci --prefer-offline  # 使用缓存，更快更可靠
```

### 5. 构建优化

- `NEXT_TELEMETRY_DISABLED=1` - 禁用遥测
- standalone 输出模式 - 最小化镜像
- 多阶段 Docker 构建 - 减小最终镜像大小

## 部署检查清单

### 预部署检查 (Pre-deployment)

#### ✅ 代码质量
- [ ] ESLint 检查通过
- [ ] TypeScript 类型检查通过
- [ ] 代码格式检查通过
- [ ] 单元测试全部通过
- [ ] 测试覆盖率达标 (≥50%)

#### ✅ 构建验证
- [ ] Next.js 构建成功
- [ ] standalone 文件生成
- [ ] static 文件生成
- [ ] public 目录存在
- [ ] server.js 文件存在
- [ ] 构建大小合理 (<500MB)

#### ✅ 安全检查
- [ ] 无敏感文件泄露
- [ ] 无 .env 文件包含在构建中
- [ ] 无私钥/证书包含在构建中

#### ✅ 部署准备
- [ ] Docker 镜像构建成功
- [ ] 镜像推送成功
- [ ] 部署清单生成

### Staging 部署

- [ ] 拉取最新代码
- [ ] 拉取最新镜像
- [ ] 滚动更新容器
- [ ] 健康检查通过
- [ ] 日志无错误

### Production 部署

- [ ] 手动触发部署
- [ ] 创建备份
- [ ] 创建 release tag
- [ ] 蓝绿部署
- [ ] 健康检查通过 (10 次重试)
- [ ] 自动回滚准备
- [ ] 清理旧备份

## 需要配置的 Secrets

| Secret | 描述 | 必需 |
|--------|------|------|
| `DOCKER_REGISTRY` | Docker 镜像仓库地址 | 可选 (默认 ghcr.io) |
| `DOCKER_USERNAME` | Docker 仓库用户名 | 可选 |
| `DOCKER_PASSWORD` | Docker 仓库密码 | 可选 |
| `DEPLOY_USER` | 部署服务器用户名 | 是 |
| `DEPLOY_KEY` | 部署 SSH 私钥 | 是 |
| `STAGING_HOST` | Staging 服务器地址 | 是 |
| `PRODUCTION_HOST` | Production 服务器地址 | 是 |

## 使用方式

### 自动触发
- Push 到 `main` 或 `develop` 分支自动运行 CI
- PR 到 `main` 或 `develop` 运行检查（不部署）

### 手动触发
1. 进入 Actions 页面
2. 选择 "CI/CD Pipeline"
3. 点击 "Run workflow"
4. 选择环境 (staging/production)
5. 点击 "Run workflow"

### 部署流程
1. **Staging**: 合并到 main 后自动部署
2. **Production**: 需手动触发，选择 production 环境

## 文件清单

```
.github/
└── workflows/
    └── ci.yml          # 主 CI/CD 配置

src/
└── app/
    └── api/
        └── health/
            └── route.ts  # 健康检查端点

vitest.config.ts       # 测试配置（已优化）
```

## 后续优化建议

1. **添加 E2E 测试**: 使用 Playwright 进行端到端测试
2. **添加性能测试**: 使用 Lighthouse CI
3. **添加依赖扫描**: 使用 Dependabot 或 Snyk
4. **添加 Slack/钉钉通知**: 部署结果通知
5. **添加缓存预热**: 部署后自动预热关键页面
6. **多环境支持**: 支持 feature branch 预览部署