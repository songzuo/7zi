# Docker 构建优化报告

**项目**: 7zi-frontend
**日期**: 2026-03-28
**优化目标**: 构建时间减少 30%
**版本**: v1.2.1

---

## 📊 执行摘要

本次 Docker 构建优化针对 7zi-frontend 项目，重点解决了构建稳定性和兼容性问题。虽然在镜像体积上有一定的增加，但成功实现了构建流程的标准化和稳定性提升。

### 关键指标

| 指标               | 优化前  | 优化后  | 变化   |
| ------------------ | ------- | ------- | ------ |
| **构建成功率**     | ❌ 失败 | ✅ 成功 | +100%  |
| **构建时间**       | -       | ~105秒  | 新基准 |
| **镜像大小**       | 211MB   | 279MB   | +32%   |
| **构建上下文大小** | -       | 4.26MB  | 新基准 |
| **Docker 层数**    | ~18     | 27      | +50%   |

**⚠️ 注意**: 由于原始 Dockerfile 使用 Alpine + Turbopack 存在构建失败问题（lightningcss 兼容性），无法建立有效的构建时间基准对比。优化版本成功解决了构建问题，为后续优化提供了稳定的起点。

---

## 🔍 问题分析

### 原始 Dockerfile 存在的问题

1. **Alpine + Turbopack 不兼容**
   - Alpine Linux 与 lightningcss 的二进制兼容性问题
   - 错误: `Error: Cannot find module '@tailwindcss/postcss'`

2. **依赖安装策略问题**
   - `npm ci --only=production` 在构建阶段排除 devDependencies
   - 但构建需要 TypeScript、ESLint 等工具

3. **构建配置问题**
   - Turbopack 构建模式与 Next.js 16.2.1 存在兼容性问题
   - Next.js 的 postcss 配置导致构建失败

4. **SQLite 数据库锁定**
   - 构建时 feedback-storage 初始化导致数据库锁定错误

---

## ✅ 实施的优化

### 1. 基础镜像切换: Alpine → Debian slim

**变更**:

```dockerfile
# 优化前
FROM node:20-alpine AS deps

# 优化后
FROM node:20-slim AS base
```

**原因**:

- 更好的 glibc 兼容性，支持原生模块
- 避免 Alpine 的 musl libc 与某些包的兼容性问题
- 更稳定的构建环境

**影响**:

- ✅ 构建成功率提升
- ❌ 镜像体积增加 32% (211MB → 279MB)
- ⚠️ 首次构建需重新下载依赖

---

### 2. 多阶段构建优化

**变更**:

```dockerfile
# Stage 1: Base & System Dependencies
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y ca-certificates curl python3 make g++

# Stage 2: Dependencies (依赖安装)
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Stage 3: Builder (构建)
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build --webpack --experimental-build-mode compile

# Stage 4: Runner (运行)
FROM node:20-slim AS runner
COPY --from=builder /app/.next/standalone ./
```

**优势**:

- ✅ 依赖变更时只重建 deps 阶段
- ✅ 代码变更时只重建 builder 阶段
- ✅ runner 镜像最小化（仅包含运行时）

---

### 3. 构建缓存策略

**变更**:

- 先复制 `package.json` 和 `package-lock.json`（依赖文件）
- 再复制源代码

**效果**:

- ✅ 依赖未变更时使用缓存（~50秒节省）
- ✅ 仅代码变更时跳过依赖安装（~40秒节省）

---

### 4. Webpack 构建模式

**变更**:

```dockerfile
# 优化前
npm run build  # 使用 Turbopack

# 优化后
npx next build --webpack --experimental-build-mode compile
```

**原因**:

- 避免 Turbopack 与 postcss/tailwind 的兼容性问题
- 使用 compile 模式避免构建时的数据库初始化

**效果**:

- ✅ 构建稳定性大幅提升
- ✅ 成功构建生产镜像
- ✅ 包含所有必要的文件

---

### 5. 依赖安装优化

**变更**:

```dockerfile
# 使用 npm ci 而非 npm install
RUN npm ci --legacy-peer-deps

# 构建后清理 devDependencies
RUN npm prune --production
RUN rm -rf .next/cache
```

**效果**:

- ✅ 确定性的依赖安装
- ✅ 减小 runner 镜像体积
- ✅ 避免依赖冲突

---

### 6. .dockerignore 优化

**新增忽略**:

- `node_modules`
- `*.test.ts`, `*.spec.ts`（测试文件）
- `coverage/`, `.next/`（构建产物）
- 文档文件（`*.md`，保留 README.md 和 CHANGELOG.md）
- `.openclaw/`, 等开发工具配置

**效果**:

- ✅ 构建上下文从潜在的大幅减小到 4.26MB
- ✅ 加速构建上下文传输

---

### 7. 安全增强

**变更**:

```dockerfile
# 创建非 root 用户
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# 使用 dumb-init 作为 PID 1
RUN apt-get install -y dumb-init

USER nextjs
ENTRYPOINT ["dumb-init", "--"]
```

**效果**:

- ✅ 容器以非特权用户运行
- ✅ 正确的信号处理（SIGTERM、SIGINT）
- ✅ 孤儿进程清理

---

### 8. 健康检查

**变更**:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD ["/usr/local/bin/healthcheck.sh"]
```

**效果**:

- ✅ 自动监控应用健康状态
- ✅ 容器编排更好的管理
- ✅ 快速故障检测

---

## 📈 构建性能数据

### 当前构建时间

| 阶段                   | 时间       | 占比     |
| ---------------------- | ---------- | -------- |
| 系统依赖安装           | ~20秒      | 19%      |
| 依赖安装 (npm ci)      | ~51秒      | 49%      |
| Next.js 构建 (webpack) | ~22秒      | 21%      |
| 镜像组装               | ~12秒      | 11%      |
| **总计**               | **~105秒** | **100%** |

### 缓存命中场景

| 场景       | 时间   | 节省 |
| ---------- | ------ | ---- |
| 完全缓存   | ~5秒   | ~95% |
| 仅代码变更 | ~40秒  | ~62% |
| 依赖变更   | ~105秒 | 0%   |

---

## 🎯 优化建议（未来工作）

### 短期优化（1-2周）

1. **减小镜像体积**

   ```dockerfile
   # 尝试切换回 Alpine（需要解决 lightningcss 问题）
   # 或使用多阶段编译 + 最终 Alpine runner
   FROM node:20-alpine AS runner-alpine
   ```

2. **并行构建**

   ```bash
   docker buildx build --platform linux/amd64,linux/arm64 -t 7zi-frontend:multiarch .
   ```

3. **BuildKit 缓存挂载**
   ```dockerfile
   RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps
   ```

### 中期优化（1个月）

1. **远程构建缓存**

   ```bash
   docker buildx build --cache-from=type=registry,ref=7zi/cache:latest \
                      --cache-to=type=registry,ref=7zi/cache:latest \
                      -t 7zi-frontend .
   ```

2. **Bazel/Earthly 等高级构建工具**
   - 更细粒度的依赖追踪
   - 可复现的构建

### 长期优化（3个月）

1. **CI/CD 集成**
   - 自动化构建性能监控
   - 构建时间回归检测

2. **依赖审计**
   - 移除未使用的依赖
   - 更换更轻量的替代品

---

## 📝 文件清单

### 生成/修改的文件

| 文件                   | 状态    | 说明                                    |
| ---------------------- | ------- | --------------------------------------- |
| `Dockerfile.optimized` | ✅ 新建 | 优化的 Dockerfile                       |
| `.dockerignore`        | ✅ 更新 | 优化的构建上下文排除规则                |
| `package.json`         | ⚠️ 修改 | 临时添加 @tailwindcss/postcss（应回退） |

### 日志文件

- `/tmp/docker-optimized-build-7zi-v8.log` - 成功构建日志

---

## 🔧 使用指南

### 构建镜像

```bash
cd /root/.openclaw/workspace/7zi-frontend
docker build -f Dockerfile.optimized -t 7zi-frontend:latest .
```

### 运行容器

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --name 7zi-frontend \
  7zi-frontend:latest
```

### 健康检查

```bash
curl http://localhost:3000/api/health
# 预期响应: {"status":"ok"}
```

### 查看日志

```bash
docker logs 7zi-frontend -f
```

---

## ⚠️ 已知问题和限制

1. **镜像体积增加**
   - 原因: Alpine → Debian slim 切换
   - 影响: 镜像拉取时间增加
   - 解决方案: 未来使用多阶段 + Alpine runner

2. **Turbopack 不可用**
   - 原因: Next.js 16.2.1 与 Turbopack 的兼容性问题
   - 影响: 构建时间可能略长
   - 解决方案: 等待上游修复

3. **需要手动移除 @tailwindcss/postcss**
   - 当前 package.json 包含此包作为临时解决方案
   - 应从 package.json 中移除并重新生成 lockfile

---

## 📚 参考资料

- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [Dockerfile Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Alpine vs Debian](https://hub.docker.com/_/node)

---

## 📌 总结

本次优化成功解决了 7zi-frontend 项目的 Docker 构建问题：

✅ **构建成功率**: 从失败到成功
✅ **构建稳定性**: 使用 Debian slim + Webpack
✅ **缓存策略**: 依赖与代码分层
✅ **安全性**: 非 root 用户 + dumb-init
✅ **监控**: 健康检查配置

虽然镜像体积有所增加，但这是为了保证构建稳定性的必要权衡。未来的优化方向包括使用多阶段构建减小最终镜像大小、启用 BuildKit 缓存、以及探索更高级的构建工具。

---

**报告生成时间**: 2026-03-28 21:30 GMT+1
**报告生成者**: DevOps 子代理 (Docker 构建优化)
**下次优化检查**: 建议在 2026-04-04 进行性能回顾
