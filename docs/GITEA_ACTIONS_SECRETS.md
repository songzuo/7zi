# Gitea Actions Secrets 配置报告

## 📋 需要配置的 Secrets 清单

根据 `.gitea/workflows/ci-cd.yml` 和 `.github/workflows/deploy.yml` 配置文件，以下是需要配置的 secrets：

---

## 🔐 Gitea Actions Secrets（核心）

### 1. `GITEA_REGISTRY`
- **用途**: Gitea 容器注册表地址
- **示例值**: `docker.7zi.studio` 或 `gitea.7zi.studio:5000`
- **配置路径**: Gitea 实例设置 → Packages → Container Registry

### 2. `GITEA_USERNAME`
- **用途**: Gitea 用户名（用于登录容器注册表）
- **示例值**: `your-username`
- **要求**: 需具有 Package 读取/写入权限

### 3. `GITEA_TOKEN`
- **用途**: Gitea 访问令牌（Personal Access Token）
- **生成路径**: Gitea → 设置 → 应用 → 管理访问令牌
- **权限要求**:
  - `package:read` - 读取包
  - `package:write` - 写入包
  - `write:repository` - 仓库写入（用于 tag）
- **格式**: `gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 🖥️ SSH 部署 Secrets

### 4. `SERVER_HOST`
- **用途**: 部署服务器 IP 或域名
- **示例值**: `165.232.43.117` 或 `deploy.7zi.studio`

### 5. `SERVER_USER`
- **用途**: SSH 登录用户名
- **示例值**: `root` 或 `deploy`

### 6. `SSH_PRIVATE_KEY`
- **用途**: SSH 私钥（用于无密码登录）
- **生成方法**:
  ```bash
  # 生成 ED25519 密钥（推荐）
  ssh-keygen -t ed25519 -C "gitea-actions-deploy" -f ~/.ssh/gitea_actions
  
  # 或生成 RSA 密钥
  ssh-keygen -t rsa -b 4096 -C "gitea-actions-deploy" -f ~/.ssh/gitea_actions
  ```
- **配置步骤**:
  1. 将公钥添加到服务器 `~/.ssh/authorized_keys`
  2. 将私钥内容配置为 secret

### 7. `SSH_PORT` (可选)
- **用途**: SSH 端口
- **默认值**: `22`

---

## 🐳 Docker Registry（可选）

### 8. `DOCKER_REGISTRY`
- **用途**: Docker 镜像仓库地址
- **示例值**: 
  - `ghcr.io` (GitHub Container Registry)
  - `docker.io` (Docker Hub)
  - `registry.7zi.studio` (私有 registry)

### 9. `DOCKER_USERNAME`
- **用途**: Docker Registry 用户名

### 10. `DOCKER_PASSWORD`
- **用途**: Docker Registry 密码或访问令牌
- **注意**: 建议使用 Access Token 而非密码

---

## ☁️ 部署服务器 Secrets（GitHub Actions 备用）

### 11. `DEPLOY_HOST`
- **用途**: GitHub Actions 部署服务器地址

### 12. `DEPLOY_USER`
- **用途**: 部署服务器 SSH 用户

### 13. `DEPLOY_PASS`
- **用途**: SSH 密码（可选，与 SSH_KEY 二选一）
- **安全建议**: 优先使用 SSH_KEY

---

## 📝 环境变量 Secrets（构建时使用）

### 14. `NEXT_PUBLIC_SENTRY_DSN`
- **用途**: Sentry 错误追踪 DSN
- **示例值**: `https://xxxx@sentry.io/xxxxxx`

### 15. `RESEND_API_KEY`
- **用途**: 邮件发送 API 密钥
- **示例值**: `re_xxxxxxxxxxxxx`

### 16. `SLACK_WEBHOOK_URL`
- **用途**: Slack 部署通知 Webhook
- **示例值**: `https://hooks.slack.com/services/xxx/xxx/xxx`

---

## ⚙️ 配置步骤

### 步骤 1: 生成 Gitea Personal Access Token
1. 登录 Gitea
2. 进入 **设置** → **应用** → **管理访问令牌**
3. 创建新令牌，名称：`gitea-actions-deploy`
4. 勾选权限：`package:read`, `package:write`, `write:repository`
5. 保存生成的令牌

### 步骤 2: 配置容器注册表
1. 启用 Gitea 容器注册表：`gitea admin settings --set-value registry.enabled=true`
2. 或在 Gitea 配置文件中启用

### 步骤 3: 生成 SSH 密钥
```bash
# 在部署服务器或本地生成
ssh-keygen -t ed25519 -f ~/.ssh/gitea_actions -N "" -C "gitea-actions"

# 将公钥添加到服务器
cat ~/.ssh/gitea_actions.pub >> ~/.ssh/authorized_keys

# 测试连接
ssh -i ~/.ssh/gitea_actions -p 22 user@server_host
```

### 步骤 4: 在 Gitea 中配置 Secrets
1. 进入仓库 **设置** → **Actions** → **Secrets**
2. 逐个添加以下 secrets:
   - `GITEA_REGISTRY`
   - `GITEA_USERNAME`  
   - `GITEA_TOKEN`
   - `SERVER_HOST`
   - `SERVER_USER`
   - `SSH_PRIVATE_KEY`

---

## 🔒 安全建议

1. **最小权限原则**: Token 只授予必要权限
2. **定期轮换**: 每 90 天更换一次 secrets
3. **环境分离**: Staging 和 Production 使用不同的 secrets
4. **日志审计**: 定期检查 Actions 运行日志
5. **备份**: 将 secrets 安全备份（不要提交到 Git）

---

## ✅ 验证清单

- [ ] Gitea PAT 已生成并配置
- [ ] 容器注册表已启用
- [ ] SSH 密钥对已生成
- [ ] 公钥已添加到服务器
- [ ] 所有必需 secrets 已配置
- [ ] 测试运行 CI workflow 验证配置

---

*文档生成时间: 2026-03-15*
