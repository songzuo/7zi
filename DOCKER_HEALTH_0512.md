# Docker 容器健康检查与优化分析报告

**检查日期**: 2026-05-12  
**检查者**: 系统管理员子代理  
**检查范围**: Dockerfile, docker-compose.yml, .dockerignore, 多阶段构建, 依赖分离

---

## 1. Dockerfile 配置检查

### 1.1 根目录 Dockerfile (`/root/.openclaw/workspace/Dockerfile`)

| 项目 | 状态 | 说明 |
|------|------|------|
| 多阶段构建 | ✅ 通过 | 3阶段构建: deps → builder → runner |
| 基础镜像 | ⚠️ 需更新 | 使用 `node:22-alpine` (可用) |
| 非 root 用户 | ✅ 通过 | 创建 `nextjs` 用户 (uid/gid 1001) |
| 健康检查 | ✅ 通过 | 使用 `/api/health` 端点 |
| 构建缓存优化 | ✅ 通过 | 分离依赖安装阶段 |

**问题发现**:
- Stage 1 (deps) 使用 `--only=production` 安装依赖，但 Stage 2 (builder) 会重新安装所有依赖（含 devDependencies），这个 --only=production 在 deps 阶段是多余的
- Stage 3 (runner) 使用 `node:22-alpine`，但缺少 `sharp` 和 `better-sqlite3` 的运行时库声明（仅安装了 `sqlite` 和 `vips`）

### 1.2 7zi-frontend Dockerfile

| 版本 | 基础镜像 | 阶段数 | 状态 |
|------|----------|--------|------|
| `Dockerfile` | node:20-alpine | 3 | ✅ 标准 |
| `Dockerfile.production-optimized` | node:20-slim | 4 | ✅ 最佳 |
| `Dockerfile.production.optimized` | node:20-slim | 4 | ✅ 最佳 |

**7zi-frontend/Dockerfile.production-optimized 优势**:
- 使用 `base` 基础阶段复用系统依赖
- 4阶段构建更清晰: base → deps → builder → runner
- 使用 `dumb-init` 作为 PID 1（信号处理更好）
- 包含 `npm prune --production` 清理

---

## 2. 镜像大小和构建分析

### 2.1 dist/ 目录状态

| 目录 | 大小 | 说明 |
|------|------|------|
| `/root/.openclaw/workspace/dist/` | 4.0K (空) | 项目构建输出目录 |
| `7zi-frontend/dist/` | 4.0K (空) | Next.js standalone 输出 |

**说明**: 当前 dist 目录为空，因为 Docker 构建在容器内完成，不影响镜像大小。

### 2.2 构建优化建议

基于 Dockerfile 分析，预计镜像大小:

| 版本 | 预计大小 | 说明 |
|------|----------|------|
| 当前 (node:22-alpine) | ~400-600MB | 包含构建工具 |
| 优化后 (node:20-slim + prune) | ~200-300MB | 仅运行时依赖 |

**优化措施已实施**:
- ✅ 使用 Alpine/slim 基础镜像
- ✅ 多阶段构建分离构建工具
- ✅ `npm prune --production` 清理
- ✅ .dockerignore 排除不必要文件

---

## 3. .dockerignore 文件检查

### 3.1 根目录 .dockerignore

| 类别 | 覆盖情况 | 评估 |
|------|----------|------|
| node_modules | ✅ | 已排除 |
| 测试文件 | ✅ | 已排除 coverage, tests, __tests__, e2e |
| Git | ✅ | 已排除 .git |
| IDE | ✅ | 已排除 .vscode, .idea |
| 日志 | ✅ | 已排除 logs/ |
| 环境文件 | ✅ | 已排除 .env |
| 构建输出 | ✅ | 已排除 .next, dist |
| 文档 | ✅ | 排除 *.md (保留 README.md, CHANGELOG.md) |

**发现的问题**:
1. ❌ **重复条目**: 存在重复的条目块（如 `# IDE` 出现多次）
2. ❌ **package-lock.json 被排除**: 可能导致构建不稳定
   ```dockerfile
   # 当前 .dockerignore
   package-lock.json  # ❌ 不应排除，用于验证依赖版本
   ```
3. ⚠️ **pnpm-lock.yaml 被排除**: 与 package-lock.json 类似问题

### 3.2 7zi-frontend .dockerignore

| 条目 | 状态 |
|------|------|
| node_modules | ✅ |
| .next, .turbo | ✅ |
| 测试/报告 | ✅ |
| *.md | ✅ (保留 README, CHANGELOG) |
| 环境文件 | ✅ |
| Docker 相关文件 | ✅ |

---

## 4. 多阶段构建审查

### 4.1 三份 Dockerfile 对比

| 特性 | 根目录 | 7zi-frontend | 7zi-frontend(prod-opt) |
|------|--------|--------------|------------------------|
| 基础镜像 | node:22-alpine | node:20-alpine | node:20-slim |
| 阶段数 | 3 | 3 | 4 |
| 非 root 用户 | ✅ | ✅ | ✅ |
| dumb-init | ❌ | ❌ | ✅ |
| npm prune | ❌ | ❌ | ✅ |
| 运行时最小化 | ⚠️ | ⚠️ | ✅ |

### 4.2 正确配置的多阶段构建

```dockerfile
# ✅ 正确的模式 (production-optimized)
Stage 1: base      → 安装系统依赖
Stage 2: deps     → npm ci (所有依赖，包括 devDependencies)
Stage 3: builder  → npm run build
Stage 4: runner   → 仅复制构建产物，使用非 root 用户
```

### 4.3 问题

1. **根目录 Dockerfile 的 Stage 1 (deps) 使用 `--only=production`**
   - 这是多余的，因为 Stage 2 会重新安装所有依赖
   - 但不影响最终结果，只是浪费了缓存优化

2. **镜像版本不一致**
   - 根目录: node:22-alpine
   - 7zi-frontend: node:20-alpine/slim
   - 建议统一使用 node:20-slim (LTS, 更稳定)

---

## 5. 生产环境依赖分离验证

### 5.1 package.json 依赖分析

**dependencies (生产依赖)**:
- next: ^16.2.6 ✅
- react: ^19.2.6 ✅
- zustand: ^5.0.13 ✅
- better-sqlite3: ^12.9.0 ✅ (需原生模块)
- sharp: ^0.34.5 ✅ (需原生模块)
- hono, bull, ioredis, redis 等 ✅

**devDependencies (开发依赖)**:
- @playwright/test ✅
- vitest ✅
- typescript ✅
- eslint ✅
- babel-plugin-react-compiler ✅

### 5.2 Dockerfile 中的依赖安装

| 阶段 | 安装命令 | 正确性 |
|------|----------|--------|
| deps (根目录) | `npm ci --only=production` | ⚠️ 多余但无害 |
| builder | `npm ci --legacy-peer-deps` | ✅ 正确 (获取 devDependencies) |
| runner | `COPY --from=builder` | ✅ 正确 |

### 5.3 依赖分离结论

**✅ 生产依赖正确分离**

- 生产镜像只包含 `dependencies` (通过 standalone 构建)
- `devDependencies` (如测试框架、TypeScript) 仅在 builder 阶段使用
- 原生模块 (sharp, better-sqlite3) 需要在 Alpine 中安装对应系统库

---

## 6. 优化建议

### 6.1 高优先级

1. **统一 Node 版本**
   ```
   将根目录 Dockerfile 从 node:22-alpine 改为 node:20-slim
   与 production-optimized 版本保持一致
   ```

2. **修复 .dockerignore**
   ```dockerfile
   # 删除以下行避免重复
   # package-lock.json  # ❌ 删除
   # pnpm-lock.yaml     # ❌ 删除
   
   # 保留一个用于锁版本验证
   ```

3. **添加 dumb-init**
   - 在根目录 Dockerfile 的 runner 阶段添加 `dumb-init`
   - 改善信号处理，避免僵尸进程

### 6.2 中优先级

4. **在 runner 阶段添加原生模块运行时依赖**
   ```dockerfile
   RUN apk add --no-cache sqlite vips musl # sharp 需要 musl on alpine
   ```

5. **添加 npm prune 到 builder 阶段**
   ```dockerfile
   RUN npm prune --production && \
       rm -rf .next/cache
   ```

6. **清理 .dockerignore 重复条目**

### 6.3 低优先级

7. **考虑使用 BuildKit 缓存**
   ```yaml
   # docker-compose.yml
   build:
     context: .
     dockerfile: Dockerfile
     cache_from:
       - 7zi-frontend:prod-v3
   ```

---

## 7. docker-compose.yml 检查

### 7.1 根目录 docker-compose.yml

| 配置 | 状态 | 说明 |
|------|------|------|
| 端口映射 | ✅ | ${PORT:-3000}:3000 |
| 健康检查 | ✅ | 使用 /api/health |
| 资源限制 | ✅ | 512M memory |
| 日志配置 | ✅ | json-file, 10m, 3 files |
| 网络 | ✅ | 7zi-network |

### 7.2 7zi-frontend docker-compose.prod.optimized.yml

| 配置 | 状态 | 说明 |
|------|------|------|
| 资源限制 | ✅ | 1024M memory (已优化) |
| 安全配置 | ✅ | no-new-privileges, read-only |
| tmpfs | ✅ | /tmp 限制 |
| restart policy | ✅ | on-failure, 3 attempts |

---

## 8. 总结

| 检查项 | 状态 | 评分 |
|--------|------|------|
| Dockerfile 配置 | ✅ 通过 | 8/10 |
| 多阶段构建 | ✅ 通过 | 9/10 |
| .dockerignore | ⚠️ 需优化 | 6/10 |
| 依赖分离 | ✅ 通过 | 9/10 |
| docker-compose | ✅ 通过 | 9/10 |

**总体评估**: Docker 配置整体良好，主要问题是 .dockerignore 有重复条目和误排除文件，以及根目录 Dockerfile 与 7zi-frontend 目录中的版本不一致。

**建议行动**:
1. 统一使用 `Dockerfile.production-optimized` 作为生产镜像
2. 清理 `.dockerignore` 重复条目，恢复 `package-lock.json`
3. 考虑将根目录的 Dockerfile 作为开发/测试使用，生产统一用 7zi-frontend 目录版本
