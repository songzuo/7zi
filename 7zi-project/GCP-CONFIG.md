# GCP 配置清单 - Gmail 集成

**目标邮箱**: lengningtu@gmail.com  
**创建日期**: 2026-03-06

---

## ✅ 已完成

| 项目 | 状态 | 备注 |
|------|------|------|
| gcloud 安装 | ✅ | `/usr/bin/gcloud` |
| gogcli 安装 | ✅ | v0.11.0 |
| 文档创建 | ✅ | `docs/GMAIL-INTEGRATION.md` |

---

## 🔄 需要配置

### 1. GCP 项目

**选项 A: 使用现有项目**
- 项目 ID: `________________`
- 项目名称: `________________`

**选项 B: 创建新项目**
```bash
gcloud auth login
gcloud projects create 7zi-gmail --name="7zi Gmail"
gcloud config set project 7zi-gmail
```

### 2. OAuth 凭证

1. 访问：https://console.cloud.google.com/apis/credentials
2. 创建 "Desktop app" OAuth 客户端
3. 下载 `client_secret.json`
4. 上传到服务器或执行：
```bash
gog auth credentials /path/to/client_secret.json
gog auth add lengningtu@gmail.com
```

### 3. 启用 API

```bash
gcloud services enable gmail.googleapis.com
gcloud services enable pubsub.googleapis.com
```

### 4. Pub/Sub 配置

```bash
gcloud pubsub topics create gog-gmail-watch
gcloud pubsub topics add-iam-policy-binding gog-gmail-watch \
  --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
  --role=roles/pubsub.publisher
```

### 5. Gmail Watch

```bash
gog gmail watch start \
  --account lengningtu@gmail.com \
  --label INBOX \
  --topic projects/7zi-gmail/topics/gog-gmail-watch
```

### 6. 回调部署

**目标**: `https://7zi.com/gmail-pubsub`

**Nginx 配置** (在 7zi.com):
```nginx
location /gmail-pubsub {
    proxy_pass http://localhost:8788/gmail-pubsub;
    proxy_set_header Host $host;
}
```

**启动服务**:
```bash
gog gmail watch serve \
  --account lengningtu@gmail.com \
  --bind 0.0.0.0 \
  --port 8788 \
  --path /gmail-pubsub \
  --hook-url http://127.0.0.1:18789/hooks/gmail \
  --include-body
```

---

## 📋 快速配置命令

```bash
# 1. 登录 (需要浏览器)
gcloud auth login
gcloud config set project <项目 ID>

# 2. 启用 API
gcloud services enable gmail.googleapis.com pubsub.googleapis.com

# 3. 创建主题
gcloud pubsub topics create gog-gmail-watch

# 4. 授权
gog auth credentials ~/client_secret.json
gog auth add lengningtu@gmail.com
export GOG_ACCOUNT=lengningtu@gmail.com

# 5. 启动 Watch
gog gmail watch start --account lengningtu@gmail.com --label INBOX --topic projects/<项目 ID>/topics/gog-gmail-watch

# 6. 启动服务
gog gmail watch serve --account lengningtu@gmail.com --port 8788 --path /gmail-pubsub --hook-url http://127.0.0.1:18789/hooks/gmail --include-body
```

---

## 🔐 认证方式选择

### 方式 1: OAuth 浏览器登录（推荐）
- ✅ 安全
- ✅ 官方支持
- ❌ 需要浏览器

### 方式 2: 服务账号
- ✅ 完全自动化
- ❌ 配置复杂
- ❌ 需要 GCP 管理员权限

### 方式 3: 应用专用密码
- ✅ 简单
- ❌ 安全性较低
- ❌ 需要 2FA 启用

---

## 📊 当前状态

| 组件 | 状态 |
|------|------|
| 工具安装 | ✅ 完成 |
| GCP 认证 | ⏳ 待配置 |
| API 启用 | ⏳ 待配置 |
| Pub/Sub | ⏳ 待配置 |
| Gmail Watch | ⏳ 待配置 |
| 回调服务 | ⏳ 待配置 |

---

## 🚀 下一步

1. **主人提供**: GCP 项目 ID 或 OAuth 凭证
2. **自主执行**: API 启用、Pub/Sub 配置
3. **部署**: 7zi.com 回调服务

---

*最后更新：2026-03-06 06:52*
