# Gitea Secrets 配置指南

本文档说明如何为 Gitea Actions CI/CD 配置所需的 Secrets。

## 前提条件

- Gitea 仓库已创建
- 有部署服务器的 SSH 访问权限
- 已生成 SSH 密钥对（参考 `scripts/configure-gitea-secrets.sh`）

## 配置位置

进入 Gitea 仓库页面 → **Settings** → **Secrets** → **Actions**

---

## Secrets 清单

### 必需 Secrets

| Name | 说明 | 示例值 |
|------|------|--------|
| `GITEA_REGISTRY` | Gitea 容器注册表地址 | `165.232.43.117:3000` |
| `GITEA_USERNAME` | Gitea 用户名 | `your-username` |
| `GITEA_TOKEN` | Gitea 访问令牌 | `gitea_token_xxxxx` |
| `SERVER_HOST` | 部署服务器 IP 或域名 | `165.232.43.117` |
| `SERVER_USER` | 部署服务器用户名 | `root` |
| `SSH_PRIVATE_KEY` | SSH 私钥内容 | *(见下方说明)* |

### 可选 Secrets

| Name | 说明 | 默认值 |
|------|------|--------|
| `SSH_PORT` | SSH 端口 | `22` |

---

## 获取各 Secret 值

### 1. GITEA_REGISTRY

Gitea 容器注册表地址，格式为 `服务器IP:端口`。

```
165.232.43.117:3000
```

### 2. GITEA_USERNAME

你的 Gitea 用户名。

### 3. GITEA_TOKEN

**生成步骤：**

1. 点击右上角头像 → **Settings**
2. 左侧菜单选择 **Applications**
3. 在 **Generate New Token** 区域：
   - 输入 Token 名称（如 `ci-deploy`）
   - 选择权限：勾选 `write:repository`, `write:package`
4. 点击 **Generate Token**
5. **立即复制保存**（只显示一次）

### 4. SERVER_HOST

部署服务器的 IP 地址或域名。

```
165.232.43.117
```

### 5. SERVER_USER

部署服务器的登录用户名。

```
root
```

### 6. SSH_PRIVATE_KEY

**生成密钥对：**

```bash
# 创建目录
mkdir -p ~/.ssh/gitea_actions

# 生成密钥
ssh-keygen -t rsa -b 4096 -C "gitea-actions" -f ~/.ssh/gitea_actions -N ""
```

**配置公钥到部署服务器：**

```bash
# 将公钥添加到服务器的 authorized_keys
ssh-copy-id -i ~/.ssh/gitea_actions.pub user@server-host

# 或手动添加
cat ~/.ssh/gitea_actions.pub | ssh user@server-host "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

**将私钥内容添加到 Secret：**

```bash
# 查看私钥内容
cat ~/.ssh/gitea_actions
```

复制完整输出（包括 `-----BEGIN` 和 `-----END` 行），粘贴到 `SSH_PRIVATE_KEY`。

**私钥格式示例：**

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAACFwAAAAdzc2gtcn
...（多行内容）...
U6IJq2VM5CxSqr3i5XcAAAAFnNzaC1hY3Rpb25zAQI=
-----END OPENSSH PRIVATE KEY-----
```

### 7. SSH_PORT (可选)

如果 SSH 使用非标准端口，配置此项。默认为 `22`。

---

## 添加 Secrets

在 Gitea 仓库的 **Settings → Secrets → Actions** 页面：

1. 点击 **Add Secret**
2. 输入 Name（如 `GITEA_REGISTRY`）
3. 输入 Value
4. 点击 **Add Secret**
5. 重复以上步骤添加所有 Secrets

---

## 验证配置

所有 Secrets 配置完成后，可以通过以下方式验证：

1. 手动触发 Gitea Actions 工作流
2. 检查工作流日志，确认 Secrets 正确注入
3. 验证部署是否成功

---

## 安全建议

- **Token 权限最小化**：仅授予必需的权限
- **定期轮换**：定期更新 Token 和 SSH 密钥
- **私钥保护**：私钥文件权限设为 `600`
- **使用专用账户**：为 CI/CD 创建专用的部署账户

---

## 故障排除

### SSH 连接失败

```bash
# 测试 SSH 连接
ssh -i ~/.ssh/gitea_actions -p 22 user@server-host

# 检查服务器 authorized_keys 权限
ls -la ~/.ssh/authorized_keys  # 应为 600
```

### Docker 登录失败

```bash
# 手动测试注册表登录
docker login 165.232.43.117:3000 -u username -p token
```

### Token 权限不足

确保 Token 具有以下权限：
- `write:repository` - 推送代码
- `write:package` - 推送镜像
- `read:package` - 拉取镜像

---

## 参考脚本

完整的自动化配置脚本：`scripts/configure-gitea-secrets.sh`

```bash
# 运行脚本（需要 root 权限）
sudo bash scripts/configure-gitea-secrets.sh
```