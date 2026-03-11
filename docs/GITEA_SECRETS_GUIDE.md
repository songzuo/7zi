# Gitea Secrets 配置指南

本文档详细说明如何配置 Gitea CI/CD 所需的所有 Secrets。

## 📋 Secrets 清单

| Secret 名称 | 值/说明 | 来源 |
|------------|--------|------|
| `GITEA_REGISTRY` | `165.232.43.117:3000` | Gitea 容器镜像仓库地址 |
| `GITEA_USERNAME` | 需手动配置 | Gitea 用户名 |
| `GITEA_TOKEN` | 在 Gitea 生成 | Settings → Applications |
| `SERVER_HOST` | `165.232.43.117` | 部署服务器地址 |
| `SERVER_USER` | `root` | 服务器用户名 |
| `SSH_PRIVATE_KEY` | 脚本生成 | SSH 私钥 |
| `SSH_PORT` | `22` | SSH 端口 |

---

## 🔧 配置步骤

### 1. GITEA_REGISTRY ✅ 已确定

```
GITEA_REGISTRY = 165.232.43.117:3000
```

这是 Gitea 内置的容器镜像仓库地址。

---

### 2. GITEA_USERNAME ⚠️ 需手动配置

这是你的 Gitea 用户名。

**步骤：**
1. 登录 Gitea: http://165.232.43.117:3000
2. 查看右上角头像，确认你的用户名
3. 在 Gitea 仓库的 Settings → Secrets 中添加：

```
Name: GITEA_USERNAME
Value: <你的用户名>
```

---

### 3. GITEA_TOKEN 🔑 需要生成

**生成步骤：**

1. 登录 Gitea: http://165.232.43.117:3000
2. 点击右上角头像 → **Settings**
3. 左侧菜单选择 **Applications**
4. 在 "Generate New Token" 区域：
   - **Token Name**: 填写 `ci-cd-token` 或其他名称
   - **Scopes**: 勾选以下权限：
     - ✅ `write:repository` - 读写仓库
     - ✅ `write:package` - 写入镜像包
     - ✅ `read:user` - 读取用户信息
     - ✅ `write:org` (如需组织权限)
5. 点击 **Generate Token**
6. ⚠️ **立即复制 Token**（只显示一次！）
7. 在仓库 Settings → Secrets 中添加：

```
Name: GITEA_TOKEN
Value: gitea_xxxxxxxxxxxxxxxxxx
```

---

### 4. SERVER_HOST ✅ 已确定

```
SERVER_HOST = 165.232.43.117
```

这是部署服务器的 IP 地址。

---

### 5. SERVER_USER ✅ 已确定

```
SERVER_USER = root
```

SSH 登录用户名。

---

### 6. SSH_PRIVATE_KEY 🔐 需要生成/配置

#### 方案 A: 生成新密钥（推荐）

运行以下脚本生成 SSH 密钥：

```bash
#!/bin/bash
# generate-ssh-key.sh

# 生成新的 SSH 密钥对
KEY_FILE="$HOME/.ssh/gitea_deploy_key"
ssh-keygen -t ed25519 -f "$KEY_FILE" -N "" -C "gitea-deploy"

# 显示公钥（需要添加到服务器）
echo "=========================================="
echo "📋 公钥（添加到服务器 ~/.ssh/authorized_keys）："
echo "=========================================="
cat "${KEY_FILE}.pub"

echo ""
echo "=========================================="
echo "🔐 私钥（添加到 Gitea Secrets）："
echo "=========================================="
cat "$KEY_FILE"

echo ""
echo "=========================================="
echo "✅ 密钥已保存到: $KEY_FILE"
echo "=========================================="
```

**执行步骤：**

```bash
# 1. 生成密钥
chmod +x generate-ssh-key.sh
./generate-ssh-key.sh

# 2. 将公钥添加到目标服务器
ssh-copy-id -i ~/.ssh/gitea_deploy_key.pub root@165.232.43.117

# 或者手动添加：
cat ~/.ssh/gitea_deploy_key.pub | ssh root@165.232.43.117 "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"

# 3. 复制私钥内容，添加到 Gitea Secrets
cat ~/.ssh/gitea_deploy_key
```

#### 方案 B: 使用现有密钥

如果已有密钥，直接使用：

```bash
# 查看现有私钥
cat ~/.ssh/id_ed25519
# 或
cat ~/.ssh/id_rsa
```

**在 Gitea 添加 Secret：**

```
Name: SSH_PRIVATE_KEY
Value: |
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
  ...（完整私钥内容）...
  -----END OPENSSH PRIVATE KEY-----
```

⚠️ **重要**: 私钥需要完整复制，包括开头和结尾的标记行。

---

### 7. SSH_PORT ✅ 已确定

```
SSH_PORT = 22
```

默认 SSH 端口。

---

## 📝 在 Gitea 中添加 Secrets

### 方法 1: Web UI

1. 打开仓库页面: http://165.232.43.117:3000/<用户名>/<仓库名>
2. 点击 **Settings** → **Secrets**
3. 点击 **Add Secret**
4. 填写 Name 和 Value
5. 点击 **Add Secret**

### 方法 2: 使用 Gitea CLI (gitea admin)

```bash
# 在 Gitea 服务器上执行
gitea admin secrets --repository <repo-id> --name <secret-name> --value <secret-value>
```

---

## ✅ 配置验证清单

完成所有配置后，使用此清单验证：

- [ ] `GITEA_REGISTRY` = `165.232.43.117:3000`
- [ ] `GITEA_USERNAME` = 你的 Gitea 用户名
- [ ] `GITEA_TOKEN` = 已生成并添加
- [ ] `SERVER_HOST` = `165.232.43.117`
- [ ] `SERVER_USER` = `root`
- [ ] `SSH_PRIVATE_KEY` = 已生成并添加
- [ ] `SSH_PORT` = `22`

---

## 🔍 故障排查

### SSH 连接失败

```bash
# 测试 SSH 连接
ssh -i ~/.ssh/gitea_deploy_key root@165.232.43.117

# 检查服务器 SSH 配置
ssh root@165.232.43.117 "cat /etc/ssh/sshd_config | grep -E 'PubkeyAuth|AuthorizedKeys'"
```

### Token 权限不足

确保 Token 有以下权限：
- `write:repository`
- `write:package`
- `read:user`

### 镜像推送失败

```bash
# 测试 Registry 登录
echo "<token>" | docker login 165.232.43.117:3000 -u <username> --password-stdin

# 测试推送
docker tag <image> 165.232.43.117:3000/<user>/<image>:test
docker push 165.232.43.117:3000/<user>/<image>:test
```

---

## 📚 相关文档

- [Gitea Actions 文档](https://docs.gitea.com/usage/actions)
- [Gitea Package Registry](https://docs.gitea.com/usage/packages)
- [SSH 密钥最佳实践](https://www.ssh.com/academy/ssh/best-practices)

---

*文档生成时间: 2026-03-11*