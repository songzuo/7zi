# TOOLS.md - Local Notes

## SSH 服务器清单 (8 台目标)

> ⚠️ **安全提示**: 所有服务器密码存储在 `.env.secrets` 文件中，通过环境变量引用。  
> 密码变量: `{{SSH_PASSWORD}}` (Linux服务器), `{{WINDOWS_PASSWORD}}` (Windows测试机)

### 当前已配置

| 服务器            | IP                              | 用户 | 密码                    | 用途          |
| ----------------- | ------------------------------- | ---- | ----------------------- | ------------- |
| **7zi.com**       | 172.67.184.212 / 104.21.59.229  | root | `{{SSH_PASSWORD}}`      | 主网站部署    |
| **bot5.szspd.cn** | 182.43.36.134                   | root | `{{SSH_PASSWORD}}`      | 测试机器      |
| **本机 (bot6)**   | -                               | root | -                       | OpenClaw 运行 |

> ⚠️ **注意**: 7zi.com 使用 Cloudflare CDN，解析到多个 IP。实际 SSH 连接到主机名 `ecm-cd59`（可能是内网 hostname 映射）。连接时域名解析可能不稳定，建议同时测试两个 IP。

### Windows 测试机器

| 服务器             | IP           | 用户          | 密码                    | 连接方式        | 用途               |
| ------------------ | ------------ | ------------- | ----------------------- | --------------- | ------------------ |
| **Windows 测试机** | 36.133.22.15 | Administrator | `{{WINDOWS_PASSWORD}}`  | RDP (端口 3389) | 网站测试、界面验证 |

**连接命令**:

```bash
# 使用 rdesktop 连接 (密码从环境变量读取)
rdesktop -u Administrator -p "$SSH_PASSWORD" 36.133.22.15

# 或使用 xfreerdp
xfreerdp /u:Administrator /p:"$WINDOWS_PASSWORD" /v:36.133.22.15
```

### SSH 认证方法

**密码含 `$` 必须用单引号！**

```bash
# ✅ 正确 (从 .env.secrets 加载环境变量)
source ~/.openclaw/workspace/.env.secrets
sshpass -p "$SSH_PASSWORD" ssh root@7zi.com

# ❌ 错误（$会被 shell 解析）
sshpass -p "ge20993344$ZZ" ssh root@7zi.com
```

### 部署目标

- **主部署**: 7zi.com
- **测试**: bot5.szspd.cn
- **未来**: 共 8 台服务器集群

---

## TTS

- Preferred voice: "Nova" (warm, slightly British)

## Cameras

- (to be added)

## SSH Keys

### 密钥对 1 (ed25519)

```bash
# 公钥
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKUyv7pPHVE5WJ9G7aWgUuXTivNZmJHm7uV9PSgcUpxM root@bot6
# 私钥：~/.ssh/id_ed25519
```

### 密钥对 2 (最新)

```bash
# 公钥
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMl7ZIMgYpejAkTAf6mRiSNWmwyJX9O91AYGNFUJsXYo
# 需要配置到服务器 authorized_keys
```

## SSH Key Setup

```bash
# Generate key
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519

# Copy to server (密码从环境变量读取)
source ~/.openclaw/workspace/.env.secrets
sshpass -p "$SSH_PASSWORD" ssh-copy-id root@7zi.com
```

## 敏感信息存储方案

敏感信息（如密码）存储在 `.env.secrets` 文件中：

```bash
# 查看当前配置
cat ~/.openclaw/workspace/.env.secrets

# 加载环境变量
source ~/.openclaw/workspace/.env.secrets
echo $SSH_PASSWORD  # 验证读取
```

**安全措施**:
- `.env.secrets` 已被 `.gitignore` 排除，不会被提交到 Git
- 使用前需先 `source` 加载环境变量
- 密码包含特殊字符 `$`，使用双引号时需转义或使用单引号
