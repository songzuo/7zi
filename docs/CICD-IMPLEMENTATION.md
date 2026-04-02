# CI/CD 工作流优化实施文档

## 概述

本次优化将三个冗余的 workflow 文件（`ci.yml`、`production.yml`、`deploy-main.yml`）合并为统一的 `ci.yml`，并进行了安全性和性能优化。

**实施日期**: 2026-03-26

---

## 主要变更

### 1. 合并冗余 Workflow

| 原文件            | 状态       | 说明                |
| ----------------- | ---------- | ------------------- |
| `ci.yml`          | 保留并优化 | 主要 CI/CD 流程     |
| `production.yml`  | 已删除     | 功能已合并到 ci.yml |
| `deploy-main.yml` | 已删除     | 功能已合并到 ci.yml |

所有原有功能均已保留：

- ✅ 代码检查（lint）
- ✅ TypeScript 类型检查（typecheck）
- ✅ 单元测试（4x 并行分片）
- ✅ E2E 测试
- ✅ 构建（build）
- ✅ Docker 镜像构建
- ✅ Staging 部署（自动）
- ✅ Production 部署（手动触发）

### 2. 优化缓存策略

#### 新增：共享 node_modules 缓存

所有 jobs 现在共享同一个 `node_modules` 缓存键：

```yaml
- name: 缓存 node_modules
  uses: actions/cache@v4
  with:
    path: |
      node_modules
      ~/.npm
    key: ${{ runner.os }}-node-modules-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-modules-
```

**优势**：

- 减少 `npm ci` 执行时间（缓存命中时跳过）
- 所有 jobs 共享缓存，节省存储空间
- 使用 GitHub Actions 原生缓存（比 actions/cache 更高效）

#### 保留：Next.js Turbo Cache

```yaml
- name: 缓存 Next.js turbo
  uses: actions/cache@v4
  with:
    path: .next/cache
    key: ${{ runner.os }}-nextjs-turbo-${{ hashFiles('**/package-lock.json') }}-${{ hashFiles('src/**/*.{ts,tsx,js,jsx}') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-turbo-${{ hashFiles('**/package-lock.json') }}-
      ${{ runner.os }}-nextjs-turbo-
```

#### 保留：Docker GHA Cache

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

### 3. 加强安全

#### 移除：密码认证

**之前**（不安全）：

```yaml
env:
  SSH_PASS: ${{ secrets.DEPLOY_PASS }}
```

**现在**（安全）：

```yaml
- name: 设置 SSH 密钥
  run: |
    mkdir -p ~/.ssh
    echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/deploy_key
    chmod 600 ~/.ssh/deploy_key
    ssh-keyscan -H ${{ secrets.STAGING_HOST }} >> ~/.ssh/known_hosts
```

**原因**：

- 密码无法追踪使用记录
- 密码容易被泄露或滥用
- SSH 密钥可限制权限（如只读、只执行特定命令）

#### 限制 workflow 权限

```yaml
permissions:
  contents: read # 只读仓库内容
  deployments: write # 写入部署状态
  pull-requests: write # 写入 PR 评论/标签
  actions: write # 写入 Actions 状态
  packages: write # 写入 Packages
```

**移除的权限**：

- `admin` - 不需要管理员权限
- `security-events` - 未使用
- `checks` - 不需要直接写入 check

### 4. 使用条件 Job 区分环境

| 环境           | 触发条件                                         | 部署 Job                        |
| -------------- | ------------------------------------------------ | ------------------------------- |
| **Staging**    | push to main                                     | `deploy-staging`（自动执行）    |
| **Production** | workflow_dispatch + input.environment=production | `deploy-production`（手动触发） |

---

## SSH 密钥配置指南

### 步骤 1: 生成 SSH 密钥对

在本地机器上执行：

```bash
# 生成 ed25519 密钥（推荐）
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy -N ""
```

输出示例：

```
Your identification has been saved in /root/.ssh/github_actions_deploy
Your public key has been saved in /root/.ssh/github_actions_deploy.pub
```

### 步骤 2: 配置服务器

#### Staging 服务器

```bash
# 将公钥添加到 Staging 服务器
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub root@staging.7zi.com

# 或手动添加
cat ~/.ssh/github_actions_deploy.pub | ssh root@staging.7zi.com "cat >> ~/.ssh/authorized_keys"
```

#### Production 服务器

```bash
# 将公钥添加到 Production 服务器
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub root@7zi.com

# 或手动添加
cat ~/.ssh/github_actions_deploy.pub | ssh root@7zi.com "cat >> ~/.ssh/authorized_keys"
```

### 步骤 3: 将私钥添加到 GitHub Secrets

访问：`https://github.com/<your-org>/<repo>/settings/secrets/actions`

创建以下 Secrets：

| Secret 名称       | 说明            | 值                                                  |
| ----------------- | --------------- | --------------------------------------------------- |
| `SSH_PRIVATE_KEY` | SSH 私钥        | 私钥内容（`~/.ssh/github_actions_deploy` 文件内容） |
| `DEPLOY_USER`     | SSH 用户名      | `root` 或部署用户                                   |
| `STAGING_HOST`    | Staging 主机    | `staging.7zi.com` 或 IP                             |
| `PRODUCTION_HOST` | Production 主机 | `7zi.com` 或 IP                                     |

**注意**：

- 私钥内容应包含完整的 PEM 格式（包括 `-----BEGIN ...-----` 和 `-----END ...-----`）
- 不要在公钥或私钥中添加额外的注释或空行

### 步骤 4: 限制 SSH 密钥权限（可选但推荐）

为了进一步增强安全，可以在服务器上限制 SSH 密钥只能执行特定命令：

编辑 `~/.ssh/authorized_keys`，在对应的公钥前添加：

```ssh
command="cd /opt/7zi-frontend && bash -s" no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... github-actions-deploy
```

**参数说明**：

- `command` - 限制只能执行此命令
- `no-port-forwarding` - 禁用端口转发
- `no-X11-forwarding` - 禁用 X11 转发
- `no-agent-forwarding` - 禁用 SSH Agent 转发
- `no-pty` - 不分配伪终端

### 步骤 5: 测试 SSH 密钥

在本地测试密钥是否可用：

```bash
# 测试 Staging
ssh -i ~/.ssh/github_actions_deploy root@staging.7zi.com "echo '✅ Staging SSH 配置成功'"

# 测试 Production
ssh -i ~/.ssh/github_actions_deploy root@7zi.com "echo '✅ Production SSH 配置成功'"
```

---

## 备份文件

原始文件已备份为：

- `.github/workflows/ci.yml.bak`
- `.github/workflows/production.yml.bak`
- `.github/workflows/deploy-main.yml.bak`

如需恢复，执行：

```bash
# 恢复 ci.yml
mv .github/workflows/ci.yml.bak .github/workflows/ci.yml

# 恢复 production.yml
mv .github/workflows/production.yml.bak .github/workflows/production.yml

# 恢复 deploy-main.yml
mv .github/workflows/deploy-main.yml.bak .github/workflows/deploy-main.yml
```

---

## 迁移清单

- [x] 备份原始 workflow 文件
- [x] 合并 `ci.yml`、`production.yml`、`deploy-main.yml` 到统一 `ci.yml`
- [x] 添加共享 `node_modules` 缓存到所有 jobs
- [x] 移除 `secrets.DEPLOY_PASS` 密码认证
- [x] 添加 SSH 密钥部署支持
- [x] 限制 workflow permissions（仅必要权限）
- [x] 删除冗余 workflow 文件
- [x] 创建实施文档（本文档）

---

## 部署后验证

### 1. 验证 workflow 语法

访问 GitHub Actions 页面，检查 workflow 文件是否有语法错误：

```
https://github.com/<your-org>/<repo>/actions
```

### 2. 触发测试运行

推送到 `main` 分支后，验证：

- [ ] Lint 通过
- [ ] Typecheck 通过
- [ ] 单元测试通过
- [ ] 构建成功
- [ ] Docker 镜像推送成功
- [ ] Staging 部署成功（自动）

### 3. 手动触发 Production 部署

1. 访问 `Actions` -> `CI/CD Pipeline`
2. 点击 `Run workflow`
3. 选择 `environment: production`
4. 选择部署策略（blue-green 或 rolling）
5. 点击 `Run workflow`
6. 验证 Production 部署成功

### 4. 检查缓存效果

在后续的 workflow 运行中，检查：

- [ ] `setup` job 中 node_modules 缓存命中
- [ ] `build` job 中 Next.js turbo 缓存命中
- [ ] `docker` job 中 GHA 缓存命中

---

## 性能提升预估

基于共享缓存优化，预期性能提升：

| 指标            | 优化前 | 优化后             | 提升 |
| --------------- | ------ | ------------------ | ---- |
| 依赖安装时间    | ~90s   | ~10s（缓存命中）   | 89%  |
| 构建时间        | ~120s  | ~60s（turbo 缓存） | 50%  |
| 总体 CI/CD 时间 | ~10min | ~5min              | 50%  |

---

## 故障排查

### 问题：SSH 连接失败

**症状**：

```
Permission denied (publickey)
```

**解决方案**：

1. 确认私钥内容正确复制到 GitHub Secrets
2. 确认公钥已添加到服务器的 `authorized_keys`
3. 检查私钥权限（应为 `600`）
4. 验证 GitHub Actions 可以访问服务器

### 问题：缓存未命中

**症状**：
每次运行都执行 `npm ci`

**解决方案**：

1. 检查 `package-lock.json` 是否在 `.gitignore`
2. 确认缓存键计算正确（`hashFiles('**/package-lock.json')`）
3. 检查 Actions 缓存配额（GitHub 免费账户 10GB）

### 问题：部署后健康检查失败

**症状**：

```
❌ 健康检查失败！
```

**解决方案**：

1. 检查 Docker 容器状态：`docker ps`
2. 查看容器日志：`docker logs <container-id>`
3. 确认端口正确映射（默认 3000）
4. 检查防火墙规则

---

## 回滚方案

如需回滚到之前的 workflow 配置：

```bash
# 1. 恢复备份文件
mv .github/workflows/ci.yml.bak .github/workflows/ci.yml
mv .github/workflows/production.yml.bak .github/workflows/production.yml
mv .github/workflows/deploy-main.yml.bak .github/workflows/deploy-main.yml

# 2. 提交变更
git add .github/workflows/
git commit -m "Revert: 恢复原始 workflow 配置"
git push origin main
```

---

## 联系支持

如有问题，请联系：

- **技术负责人**: [待填写]
- **DevOps 团队**: [待填写]
- **GitHub Issues**: [仓库 Issues 链接]

---

**文档版本**: 1.0
**最后更新**: 2026-03-26
