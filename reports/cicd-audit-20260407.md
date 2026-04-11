# CI/CD 安全审计报告

**审计日期**: 2026-04-07  
**审计范围**: `/root/.openclaw/workspace`  
**审计类型**: CI/CD 配置文件安全审查

---

## 📋 目录

1. [发现的 CI/CD 配置文件](#发现的-cicd-配置文件)
2. [安全检查结果](#安全检查结果)
3. [环境变量配置审查](#环境变量配置审查)
4. [安全问题汇总](#安全问题汇总)
5. [安全建议](#安全建议)
6. [总结评分](#总结评分)

---

## 发现的 CI/CD 配置文件

### GitHub Workflows

| 文件路径 | 用途 |
|---------|------|
| `.github/workflows/ci.yml` | 主 CI/CD Pipeline (统一) |
| `.github/workflows/tests.yml` | 测试工作流 |
| `.github/workflows/security-scan.yml` | 安全扫描 |
| `.github/workflows/performance-audit.yml` | 性能审计 |
| `.github/workflows/version-check.yml` | 版本检查 |
| `.github/workflows/preview.yml` | 预览环境部署 |
| `.github/workflows/backup-20260326/ci.yml` | 备份 CI |
| `.github/workflows/backup-20260326/ci-pr.yml` | PR CI |
| `.github/workflows/backup-20260326/ci-main.yml` | Main 分支 CI |
| `.github/SECRETS.md` | Secrets 配置指南 |
| `7zi-frontend/.github/workflows/ci.yml` | 前端 CI |
| `7zi-frontend/.github/workflows/cd.yml` | 前端 CD |
| `7zi-frontend/.github/workflows/cd-blue-green.yml` | 蓝绿部署 |
| `7zi-frontend/.github/workflows/cd-canary.yml` | 金丝雀部署 |
| `7zi-frontend/.github/workflows/e2e.yml` | E2E 测试 |
| `7zi-frontend/.github/workflows/dependency-updates.yml` | 依赖更新 |

### Docker 相关

| 文件路径 | 用途 |
|---------|------|
| `Dockerfile.production` | 生产环境 Dockerfile (多阶段构建) |
| `Dockerfile.optimized` | 优化版 Dockerfile |
| `Dockerfile.dev` | 开发环境 Dockerfile |
| `Dockerfile.auth` | 认证服务 Dockerfile |
| `Dockerfile.static` | 静态资源 Dockerfile |
| `docker-compose.prod.yml` | 生产环境 Docker Compose |
| `docker-compose.staging.yml` | Staging 环境 Docker Compose |
| `docker-compose.dev.yml` | 开发环境 Docker Compose |
| `docker-compose.auth.yml` | 认证服务 Docker Compose |
| `docker-compose.zero-downtime.yml` | 零停机部署配置 |
| `7zi-frontend/docker-compose.prod.yml` | 前端生产配置 |
| `deploy/docker/docker-compose.prod.yml` | 部署脚本生产配置 |
| `deploy/docker/docker-compose.dev.yml` | 部署脚本开发配置 |
| `deploy-scripts/docker/docker-compose.prod.yml` | 部署脚本 Docker 配置 |

### Kubernetes

| 文件路径 | 用途 |
|---------|------|
| `k8s-auth-deployment.yaml` | K8s 认证服务部署配置 |

---

## 安全检查结果

### ✅ 良好实践

#### 1. 主 CI/CD Pipeline (`.github/workflows/ci.yml`)

| 检查项 | 状态 | 说明 |
|-------|------|------|
| 使用 `actions/checkout@v4` | ✅ | 较新版本 |
| 使用 SSH 密钥认证部署 | ✅ | 使用 `secrets.SSH_PRIVATE_KEY` |
| 非 root 用户运行 | ✅ | Docker 使用 `USER nextjs` |
| 资源限制 | ✅ | 内存/CPU 限制已配置 |
| 健康检查 | ✅ | 多层健康检查机制 |
| 清理旧备份 | ✅ | 保留最近 5 个备份 |
| 并行执行 | ✅ | 4 分片并行测试 |
| 缓存策略 | ✅ | npm/Next.js 缓存 |
| 环境隔离 | ✅ | staging/production 分离 |
| 回滚机制 | ✅ | 自动回滚逻辑 |
| 权限最小化 | ✅ | `permissions:` 限制 |
| 并发控制 | ✅ | `concurrency:` 避免重复运行 |

#### 2. Docker 安全配置

| 检查项 | 状态 | 说明 |
|-------|------|------|
| 多阶段构建 | ✅ | 减小镜像体积 |
| 非 root 用户 | ✅ | `USER nextjs/openclaw` |
| 资源限制 | ✅ | memory/CPU limits |
| 健康检查 | ✅ | `HEALTHCHECK` 配置 |
| 日志轮转 | ✅ | `max-size: '10m'` |
| `no-new-privileges` | ✅ | 安全选项已设置 |
| `read_only` | ✅ | 容器文件系统只读 |
| `tmpfs` 挂载 | ✅ | 敏感目录使用内存文件系统 |
| dumb-init | ✅ | 正确的信号处理 |

#### 3. Kubernetes 配置

| 检查项 | 状态 | 说明 |
|-------|------|------|
| 安全上下文 | ✅ | `runAsNonRoot: true` |
| 网络策略 | ✅ | `NetworkPolicy` 配置 |
| Pod 中断预算 | ✅ | `PodDisruptionBudget` |
| 水平自动扩缩容 | ✅ | `HorizontalPodAutoscaler` |
| 探针配置 | ✅ | liveness/readiness probes |
| 密钥管理 | ✅ | 使用 `Secret` 而非明文 |

#### 4. 安全扫描

| 检查项 | 状态 | 说明 |
|-------|------|------|
| npm audit | ✅ | 定期运行 |
| Snyk 集成 | ✅ | 依赖漏洞扫描 |
| TruffleHog | ✅ | 秘钥扫描 |
| Trivy | ✅ | 容器镜像扫描 |
| 定时扫描 | ✅ | 每天 UTC 2:00 运行 |

---

### ⚠️ 发现的安全问题

#### 🔴 高风险

**1. K8s Secret 中存在硬编码的默认密钥**

```yaml
# k8s-auth-deployment.yaml
stringData:
  JWT_SECRET: "your-super-secret-jwt-key-change-this-in-production"
  POSTGRES_PASSWORD: "your-postgres-password"
```

**问题**: Kubernetes Secret 中包含示例/占位符密码，如果部署时未修改，将使用不安全的默认值。

**建议**: 
- 使用 Sealed Secrets 或 external-secrets 动态拉取
- 部署前必须强制修改默认值
- 添加 CI 检查确保不使用默认密码

---

**2. GitHub Secrets 配置指南中暴露私钥生成方法**

```bash
# .github/SECRETS.md
cat ~/.ssh/github_actions_deploy.pub | ssh root@7zi.com "cat >> ~/.ssh/authorized_keys"
```

**问题**: 文档中包含 SSH 密钥部署到 root 账户的示例，过于宽松的权限。

**建议**: 
- 使用非 root 用户部署
- 限制 SSH 密钥的权限（如只允许特定命令）
- 文档应明确安全最佳实践

---

#### 🟠 中风险

**3. SSH 私钥通过 GitHub Secrets 传递**

```yaml
# ci.yml - 部署到 Staging
echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/deploy_key
```

**问题**: 
- 私钥在每次部署时都会被写入 Runner 的文件系统
- 虽然 Runner 是临时环境，但理论上存在泄露风险

**建议**:
- 考虑使用 GitHub 的 ` Deploy keys` 或 OIDC 联邦认证
- 使用临时 SSH 连接而非存储私钥

---

**4. 生产部署缺少人工审核环节**

```yaml
# ci.yml
deploy-production:
  if: github.ref == 'refs/heads/main' && github.event_name == 'workflow_dispatch'
```

**问题**: 虽然需要 `workflow_dispatch` 手动触发，但没有配置 Required reviewers。

**建议**:
- 在 GitHub Environments 中为 production 环境设置 `Required reviewers`
- 添加审批流程确保有人工监督

---

**5. 数据库密码在 docker-compose 中使用环境变量引用但无加密**

```yaml
# docker-compose.auth.yml
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

**问题**: 虽然使用了环境变量，但如果 `.env` 文件泄露或被意外提交，数据库密码会暴露。

**建议**:
- 确保 `.env` 文件在 `.gitignore` 中
- 使用 Docker secrets 或 K8s secrets
- 不要将 `.env` 文件提交到版本控制

---

**6. docker-compose.prod.yml 中 Redis 无密码配置**

```yaml
# docker-compose.prod.yml
redis:
  image: redis:7-alpine
  # 无密码配置
```

**问题**: Redis 服务没有设置密码，如果网络策略被绕过，可能被未授权访问。

**建议**:
- 为 Redis 设置密码 (`redis-server --requirepass`)
- 使用 `REDIS_PASSWORD` 环境变量

---

#### 🟡 低风险

**7. 多处使用 `--prefer-offline` 加速 npm 安装**

```yaml
# ci.yml
npm ci --prefer-offline
```

**问题**: 离线安装可能使用过时的/有漏洞的缓存包版本。

**建议**:
- 仅在 CI 缓存命中时使用
- 首次安装应从官方源获取

---

**8. 主 CI Pipeline Job 依赖链过长**

```
lint → typecheck → test-unit → build → test-e2e → docker → pre-deploy → deploy-staging/deploy-production
```

**问题**: 13 个 Job 的依赖链，任何一个失败都会中断整个流程。

**建议**:
- 某些 job 可以并行运行
- 考虑拆分流水线减少单次运行时间

---

**9. 部署后未清理 Docker 旧镜像**

```bash
# ci.yml deploy-production
docker image prune -af
```

**问题**: 只在成功部署后清理，但没有在失败时清理，可能导致磁盘空间问题。

**建议**:
- 添加定时清理任务
- 配置 Docker 日志轮转限制

---

**10. 健康检查端点可能不够全面**

```bash
# healthcheck.sh
curl -f -s --max-time 5 http://localhost:3000/api/health
```

**问题**: 只检查健康端点，未检查数据库/Redis 连接。

**建议**:
- 扩展健康检查包含依赖服务状态
- 实现更详细的 `/api/health/detailed` 端点

---

## 环境变量配置审查

### 已配置的环境变量

#### Docker 环境变量 (docker-compose.prod.yml)

| 变量名 | 敏感程度 | 建议 |
|--------|---------|------|
| `NODE_ENV` | 低 | ✅ 已配置 |
| `PORT` | 低 | ✅ 已配置 |
| `NEXT_PUBLIC_GA_ID` | 低 | ✅ 公开变量 |
| `RESEND_API_KEY` | 🔴 高 | ⚠️ 通过 env_file 传入 |
| `DATABASE_PATH` | 低 | ✅ 已配置 |
| `REDIS_URL` | 中 | ⚠️ 无认证信息 |

#### GitHub Secrets (参考 SECRETS.md)

| Secret 名称 | 用途 | 敏感程度 |
|-----------|------|---------|
| `SSH_PRIVATE_KEY` | 服务器部署 | 🔴 高 |
| `DOCKER_USERNAME` | 镜像仓库 | 🟠 中 |
| `DOCKER_PASSWORD` | 镜像仓库 | 🔴 高 |
| `VERCEL_TOKEN` | Vercel 部署 | 🔴 高 |
| `DISCORD_WEBHOOK` | 通知 | 🟡 低 |
| `SNYK_TOKEN` | 安全扫描 | 🟠 中 |
| `STAGING_HOST` | 部署目标 | 🟠 中 |
| `PRODUCTION_HOST` | 部署目标 | 🟠 中 |
| `DEPLOY_USER` | 部署用户 | 🟠 中 |

---

### 缺失的安全配置

| 检查项 | 状态 | 说明 |
|-------|------|------|
| `.env` 在 `.gitignore` 中 | ⚠️ 未确认 | 需验证 |
| Docker secrets 使用 | ❌ 未使用 | 可改进 |
| OIDC 联邦认证 | ❌ 未使用 | 可增强 |
| 密钥轮换策略 | ⚠️ 文档提及但未强制 | 需实施 |
| 环境变量验证 | ⚠️ 部分检查 | 可增强 |

---

## 安全问题汇总

| 风险等级 | 数量 | 详情 |
|---------|------|------|
| 🔴 高风险 | 2 | K8s 硬编码密钥、文档暴露 root 部署 |
| 🟠 中风险 | 4 | SSH 私钥传递、缺少人工审核、数据库密码、Redis 无密码 |
| 🟡 低风险 | 4 | 离线包安装、Job 依赖过长、未清理镜像、健康检查简单 |

**总计**: 10 个安全问题

---

## 安全建议

### 立即修复 (高优先级)

1. **修改 Kubernetes 默认密钥**
   ```bash
   # 使用 kubectl 创建真正的 secret
   kubectl create secret generic auth-secrets \
     --from-literal=JWT_SECRET=$(openssl rand -base64 32) \
     --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 16)
   ```

2. **为 Redis 添加密码**
   ```yaml
   # docker-compose.prod.yml
   redis:
     command: redis-server --requirepass ${REDIS_PASSWORD}
   ```

3. **更新部署文档避免 root 权限**
   ```bash
   # 创建专用部署用户
   useradd -m -s /bin/bash deploy
   # 限制 sudo 权限
   echo "deploy ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/bin/docker-compose" > /etc/sudoers.d/deploy
   ```

### 短期改进 (1-2 周)

4. **为生产环境添加强制审核**
   - 在 GitHub Environments 中配置 `Required reviewers: 1`
   - 添加审批后自动部署

5. **启用 OIDC 联邦认证替代 SSH 密钥**
   - 使用 AWS/Azure/GCP 的 OIDC 提供商
   - 避免存储长期凭证

6. **增强健康检查端点**
   ```typescript
   // /api/health/detailed
   {
     status: "healthy",
     uptime: process.uptime(),
     dependencies: {
       database: await checkDatabase(),
       redis: await checkRedis()
     }
   }
   ```

### 中期改进 (1 个月)

7. **实现密钥轮换机制**
   - 每 90 天自动轮换 SSH 密钥
   - 使用 HashiCorp Vault 管理密钥

8. **添加安全扫描门禁**
   - 阻止 Critical/High 漏洞合并到 main
   - 集成到 PR 状态检查

9. **实施最小权限原则**
   - 使用 Kubernetes RBAC
   - Docker 使用非特权用户运行
   - GitHub Actions 使用最小权限 tokens

---

## 总结评分

| 类别 | 得分 | 满分 | 说明 |
|-----|------|------|------|
| 基础设施即代码 | ⭐⭐⭐⭐ | 5 | K8s/Docker 配置完善 |
| 密钥管理 | ⭐⭐⭐ | 5 | 部分使用 Secrets，但有默认值问题 |
| 部署流程 | ⭐⭐⭐⭐ | 5 | 自动化程度高，有回滚机制 |
| 安全扫描 | ⭐⭐⭐⭐⭐ | 5 | 多层次安全扫描覆盖 |
| 环境隔离 | ⭐⭐⭐⭐ | 5 | staging/production 分离 |
| 合规审计 | ⭐⭐⭐ | 5 | 有日志但缺少审计追踪 |

**总体评分**: ⭐⭐⭐⭐ (4/5)

**评价**: 
CI/CD 流程整体设计良好，具有完善的自动化部署、安全扫描和回滚机制。主要风险在于密钥管理（K8s 默认值）和部分配置（Redis 无密码）需要在部署前修正。建议按照上述安全建议进行改进。

---

## 附录

### A. 相关文档

- `.github/SECRETS.md` - GitHub Secrets 配置指南
- `.github/workflows/README.md` - Workflow 使用说明
- `docker-compose.prod.yml` - 生产环境部署配置
- `k8s-auth-deployment.yaml` - Kubernetes 部署配置

### B. 审计工具

- `npm audit` - Node.js 依赖漏洞扫描
- `trufflehog` - 秘钥/凭证扫描
- `trivy` - 容器镜像漏洞扫描
- `snyk` - 依赖安全扫描

### C. 审计人员

- DevOps 子代理 (cicd-config-review-20260407-v2)

---

*报告生成时间: 2026-04-07 03:30 GMT+2*
