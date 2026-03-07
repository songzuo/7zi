# TOOLS.md - Local Notes

## SSH 服务器清单 (8 台目标)

### 当前已配置

| 服务器 | IP | 用户 | 密码 | 用途 |
|--------|-----|------|------|------|
| **7zi.com** | 165.99.43.61 | root | `ge20993344$ZZ` | 主网站部署 |
| **bot5.szspd.cn** | 182.43.36.134 | root | `ge20993344$ZZ` | 测试机器 |
| **本机 (bot6)** | - | root | - | OpenClaw 运行 |

### SSH 认证方法

**密码含 `$` 必须用单引号！**

```bash
# ✅ 正确
sshpass -p 'ge20993344$ZZ' ssh root@7zi.com

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

# Copy to server (需要正确密码)
sshpass -p 'ge20993344$ZZ' ssh-copy-id root@7zi.com
```
