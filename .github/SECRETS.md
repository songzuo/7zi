# GitHub Secrets 配置指南

## 必需配置

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加以下 secrets：

### 🔐 SSH 密钥（服务器部署）

#### SSH_PRIVATE_KEY
用于部署到服务器的 SSH 私钥。

**生成方法：**
```bash
# 生成专用部署密钥
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# 查看私钥（复制到 GitHub Secrets）
cat ~/.ssh/github_actions_deploy

# 将公钥添加到服务器 authorized_keys
cat ~/.ssh/github_actions_deploy.pub | ssh root@7zi.com "cat >> ~/.ssh/authorized_keys"
cat ~/.ssh/github_actions_deploy.pub | ssh root@bot5.szspd.cn "cat >> ~/.ssh/authorized_keys"
```

### 🐳 Docker Hub（Docker 镜像构建）

#### DOCKER_USERNAME
Docker Hub 用户名

#### DOCKER_PASSWORD
Docker Hub 访问令牌（不是密码！）

**生成访问令牌：**
1. 登录 https://hub.docker.com
2. Account Settings → Security → New Access Token
3. 复制令牌到 GitHub Secrets

### ☁️ Vercel（Vercel 部署）

#### VERCEL_TOKEN
Vercel API 令牌

**生成方法：**
1. 登录 https://vercel.com
2. Settings → Tokens → Create New Token
3. 复制令牌到 GitHub Secrets

### 💬 Discord（部署通知，可选）

#### DISCORD_WEBHOOK
Discord 频道 Webhook URL

**获取方法：**
1. Discord 服务器设置 → 集成 → Webhooks
2. 创建新 Webhook
3. 复制 Webhook URL

---

## 环境配置

在 **Settings → Environments** 中配置：

### production
- Name: `production`
- 保护规则（可选）：
  - Required reviewers: 添加审核人
  - Deployment branches: `main` only

### staging
- Name: `staging`
- 保护规则（可选）：
  - Deployment branches: `main`, `develop`

---

## 验证配置

配置完成后，运行以下命令验证：

```bash
# 测试 SSH 连接
ssh -i ~/.ssh/github_actions_deploy root@7zi.com "echo 'SSH OK'"

# 测试 Vercel CLI
vercel login --token $VERCEL_TOKEN
vercel ls

# 测试 Docker
docker login -u $DOCKER_USERNAME -p $DOCKER_PASSWORD
```

---

## 安全建议

1. **限制密钥权限**：部署密钥只添加必要的服务器
2. **使用专用密钥**：不要使用个人 SSH 密钥
3. **定期轮换**：每 6 个月更新一次密钥
4. **最小权限**：Docker token 只给读取权限（除非需要推送）
5. **保护环境**：生产环境启用审核人

---

## 故障排除

### SSH 连接失败
```bash
# 调试模式连接
ssh -vvv -i ~/.ssh/github_actions_deploy root@7zi.com
```

### 部署权限问题
```bash
# 检查服务器权限
ssh root@7zi.com "ls -la /var/www/"
ssh root@7zi.com "chown -R www-data:www-data /var/www/7zi-frontend"
```

### Vercel 部署失败
```bash
# 检查项目链接
vercel link
vercel pull
```
