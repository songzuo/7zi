# Gmail 集成指南

**邮箱**: lengningtu@gmail.com  
**最后更新**: 2026-03-06  
**状态**: 🔄 配置中

---

## 概述

本指南描述如何将 Gmail 集成到 OpenClaw 系统，实现：
- 📥 自动接收和监控新邮件
- 📤 自动发送邮件
- 🔔 新邮件实时通知
- 📝 邮件内容自动总结

---

## 前置条件

### 已安装工具

| 工具 | 版本 | 路径 |
|------|------|------|
| gcloud | latest | `/usr/bin/gcloud` |
| gogcli | v0.11.0 | `/usr/local/bin/gog` |

### 需要配置

1. **GCP 项目** - 用于 Gmail API 和 Pub/Sub
2. **OAuth 凭证** - 用于 gogcli 授权
3. **公网回调 URL** - `https://7zi.com/gmail-pubsub`

---

## 设置步骤

### 1. 创建 GCP 项目

```bash
# 登录 GCP
gcloud auth login

# 创建新项目（或选择现有）
gcloud projects create 7zi-gmail-integration --name="7zi Gmail Integration"

# 设置项目
gcloud config set project 7zi-gmail-integration
```

### 2. 启用 API

```bash
gcloud services enable gmail.googleapis.com
gcloud services enable pubsub.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

### 3. 创建 OAuth 凭证

1. 访问 https://console.cloud.google.com/apis/credentials
2. 创建 "Desktop app" OAuth 客户端
3. 下载 `client_secret.json`

### 4. 授权 gogcli

```bash
# 保存凭证
gog auth credentials /path/to/client_secret.json

# 授权邮箱
gog auth add lengningtu@gmail.com

# 设置默认账号
export GOG_ACCOUNT=lengningtu@gmail.com
```

### 5. 创建 Pub/Sub 主题

```bash
gcloud pubsub topics create gog-gmail-watch
```

### 6. 授权 Gmail 推送

```bash
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

### 7. 启动 Gmail Watch

```bash
gog gmail watch start \
  --account lengningtu@gmail.com \
  --label INBOX \
  --topic projects/7zi-gmail-integration/topics/gog-gmail-watch
```

### 8. 配置 OpenClaw Hooks

编辑 `/root/.openclaw/openclaw.json`:

```json5
{
  hooks: {
    enabled: true,
    token: "OPENCLAW_HOOK_TOKEN",
    path: "/hooks",
    presets: ["gmail"],
    mappings: [
      {
        match: { path: "gmail" },
        action: "agent",
        wakeMode: "now",
        name: "Gmail",
        sessionKey: "hook:gmail:{{messages[0].id}}",
        messageTemplate: "新邮件来自 {{messages[0].from}}\n主题：{{messages[0].subject}}\n{{messages[0].snippet}}",
        deliver: true,
        channel: "telegram",
        to: "telegram:1955162435"
      }
    ]
  }
}
```

### 9. 启动回调服务

```bash
gog gmail watch serve \
  --account lengningtu@gmail.com \
  --bind 0.0.0.0 \
  --port 8788 \
  --path /gmail-pubsub \
  --hook-url http://127.0.0.1:18789/hooks/gmail \
  --hook-token OPENCLAW_HOOK_TOKEN \
  --include-body \
  --max-bytes 20000
```

### 10. 配置 Nginx 反向代理（7zi.com）

在 7zi.com 服务器上：

```nginx
server {
    listen 443 ssl;
    server_name 7zi.com;
    
    location /gmail-pubsub {
        proxy_pass http://localhost:8788/gmail-pubsub;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 命令参考

### 发送邮件

```bash
gog gmail send \
  --account lengningtu@gmail.com \
  --to recipient@example.com \
  --subject "测试邮件" \
  --body "这是测试内容"
```

### 读取收件箱

```bash
gog gmail list \
  --account lengningtu@gmail.com \
  --label INBOX \
  --max 10
```

### 读取单封邮件

```bash
gog gmail get \
  --account lengningtu@gmail.com \
  --id <message-id>
```

### 回复邮件

```bash
gog gmail reply \
  --account lengningtu@gmail.com \
  --id <message-id> \
  --body "感谢您的来信"
```

### 搜索邮件

```bash
gog gmail search \
  --account lengningtu@gmail.com \
  --query "from:example@gmail.com after:2026-03-01"
```

---

## 使用场景

### 客服自动回复

```bash
# 检测到新咨询邮件，自动回复
gog gmail reply \
  --account lengningtu@gmail.com \
  --id <message-id> \
  --body "感谢您的咨询，我们将在 24 小时内回复。"
```

### 营销邮件发送

```bash
# 发送产品更新
gog gmail send \
  --account lengningtu@gmail.com \
  --to customer@example.com \
  --subject "7zi Studio 最新功能发布" \
  --body "尊敬的用户，我们发布了新功能..."
```

### 新邮件通知

通过 OpenClaw hooks 自动推送新邮件通知到 Telegram。

---

## 故障排查

### 问题：认证失败

```bash
# 重新授权
gog auth remove lengningtu@gmail.com
gog auth add lengningtu@gmail.com
```

### 问题：Watch 过期

```bash
# 检查状态
gog gmail watch status --account lengningtu@gmail.com

# 重新启动
gog gmail watch stop --account lengningtu@gmail.com
gog gmail watch start --account lengningtu@gmail.com --label INBOX --topic projects/7zi-gmail-integration/topics/gog-gmail-watch
```

### 问题：回调不工作

```bash
# 检查服务是否运行
ps aux | grep "gog gmail watch serve"

# 检查端口
netstat -tlnp | grep 8788

# 检查日志
journalctl -u gog-gmail-watch -f
```

---

## 安全注意

1. **凭证管理** - OAuth 凭证存储在 `~/.config/gog/`，权限 600
2. **权限范围** - 仅请求必要的 Gmail 权限
3. **审计日志** - 定期检查 GCP 审计日志
4. **令牌轮换** - 定期更新 OAuth 凭证

---

## 团队协作

### 其他 Agent 调用

```bash
# 通过 OpenClaw session 发送
openclaw sessions send --session agent:main:main --message "发送测试邮件到 test@example.com"
```

### API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/hooks/gmail` | POST | Gmail Pub/Sub 回调 |
| `/gmail-pubsub` | POST | gog 回调服务 |

---

## 进度追踪

| 步骤 | 状态 | 完成时间 |
|------|------|----------|
| gcloud 安装 | ✅ | 2026-03-06 |
| gogcli 安装 | ✅ | 2026-03-06 |
| GCP 项目创建 | 🔄 | - |
| API 启用 | 🔄 | - |
| OAuth 配置 | 🔄 | - |
| Gmail Watch | 🔄 | - |
| 回调部署 | 🔄 | - |

---

*文档由 7zi Studio AI 团队维护*
