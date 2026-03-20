# 服务器清单 - 7zi Studio

## 当前服务器 (3/8)

| # | 服务器 | IP | 用途 | SSH 状态 |
|---|--------|-----|------|---------|
| 1 | 7zi.com | 165.99.43.61 | 主网站 | ⚠️ 需要配置密钥 |
| 2 | bot5.szspd.cn | 182.43.36.134 | 测试 | ⚠️ 需要配置密钥 |
| 3 | bot6 (本机) | - | OpenClaw 运行 | ✅ 本地 |

## 未来服务器 (5/8)

待配置...

## SSH 公钥

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKUyv7pPHVE5WJ9G7aWgUuXTivNZmJHm7uV9PSgcUpxM root@bot6
```

## 部署流程

1. 配置 SSH 密钥到服务器
2. 运行部署脚本
3. 验证网站访问

## 密码格式

**重要**: 密码含 `$` 必须用单引号！

```bash
sshpass -p 'ge20993344$ZZ' ssh root@server
```
