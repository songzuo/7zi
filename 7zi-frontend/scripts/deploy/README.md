# SSL & Health Check Scripts

本目录包含 SSL 证书自动续期和健康检查脚本。

## 📁 脚本列表

| 脚本 | 用途 |
|------|------|
| `ssl-renew.sh` | SSL 证书自动续期 |
| `health-check.sh` | 服务健康检查 |
| `logrotate.conf` | 日志轮转配置 |

## 🔐 SSL 证书自动续期

### 快速开始

```bash
# 检查证书状态
./ssl-renew.sh check

# 测试模式 (不实际续期)
./ssl-renew.sh dry-run

# 强制续期
./ssl-renew.sh force

# 安装定时任务和日志轮转
./ssl-renew.sh install-cron
```

### 支持的验证方式

1. **HTTP-01 挑战** (默认)
   - 需要网站可公开访问
   - 自动在 `.well-known/acme-challenge/` 下创建验证文件

2. **DNS-01 挑战** (推荐用于通配符证书)
   - 需要 Cloudflare API Token
   - 设置环境变量 `CF_API_TOKEN`

### 环境变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `LOG_DIR` | `/var/log` | 日志目录 |
| `NOTIFY_EMAIL` | `admin@7zi.com` | 通知邮箱 |
| `CF_API_TOKEN` | - | Cloudflare API Token |
| `USE_STAGING` | `false` | 使用 Staging API |

### 定时任务配置

自动安装到 `/etc/cron.d/ssl-renew`:

```
# 每日凌晨 2:00 自动检查
0 2 * * * root /bin/bash /path/to/ssl-renew.sh >> /var/log/ssl-renew.log 2>&1

# 每周一凌晨 3:00 强制检查
0 3 * * 1 root /bin/bash /path/to/ssl-renew.sh force >> /var/log/ssl-renew.log 2>&1
```

## 🏥 健康检查

### 快速开始

```bash
# 执行健康检查
./health-check.sh check

# 详细输出
./health-check.sh verbose

# 发送通知
./health-check.sh notify

# 安装定时任务
./health-check.sh install
```

### 检查项目

1. **HTTP API 健康检查** - `https://7zi.com/api/health`
2. **HTTPS 响应检查** - `https://7zi.com/`
3. **SSL 证书状态** - 有效期检查
4. **Nginx 进程** - 服务运行状态
5. **端口监听** - 443 端口
6. **DNS 解析** - 域名解析验证

### 环境变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `LOG_DIR` | `/var/log` | 日志目录 |
| `HEALTH_CHECK_URL` | `https://7zi.com/api/health` | 健康检查 URL |
| `NOTIFY_EMAIL` | `admin@7zi.com` | 通知邮箱 |
| `SLACK_WEBHOOK` | - | Slack Webhook |
| `TELEGRAM_BOT_TOKEN` | - | Telegram Bot Token |
| `TELEGRAM_CHAT_ID` | - | Telegram Chat ID |

### 定时任务配置

自动安装到 `/etc/cron.d/health-check`:

```
# 每 5 分钟执行一次
*/5 * * * * root /bin/bash /path/to/health-check.sh >> /var/log/health-check.log 2>&1
```

## 📋 日志轮转

### 安装 Logrotate

```bash
# 复制配置到系统
sudo cp logrotate.conf /etc/logrotate.d/ssl-renew

# 或使用脚本自动安装
./ssl-renew.sh install-logrotate
```

### 配置说明

```
/var/log/ssl-renew.log {
    daily              # 每日轮转
    missingok           # 忽略缺失文件
    rotate 14           # 保留 14 天
    compress            # 压缩旧日志
    delaycompress       # 延迟压缩
    notifempty         # 空文件不轮转
    create 0644 root root
}
```

## 🔧 CI/CD 集成

### GitHub Actions Workflow

自动创建了 `ssl-monitor.yml` workflow:

- **触发时间**: 每天 UTC 2:00 / 每周一 UTC 3:00
- **检查内容**: SSL 证书、健康检查、DNS 解析
- **自动续期**: 当证书即将过期时自动续期
- **通知**: 支持 Slack、Telegram、邮件通知

### 手动触发

```bash
# 在 GitHub Actions 页面
# Workflow: SSL & Infrastructure Monitor
# 手动运行，可选择:
#   - check_type: full/ssl/health/dns
#   - force_renew: true/false
#   - notify: true/false
```

## 🚀 一键安装所有任务

```bash
cd scripts/deploy

# 安装 SSL 续期定时任务
./ssl-renew.sh install-cron

# 安装健康检查定时任务
./health-check.sh install

# 验证安装
crontab -l
cat /etc/cron.d/ssl-renew
cat /etc/cron.d/health-check
```

## 📊 监控指标

| 指标 | 阈值 | 动作 |
|------|------|------|
| SSL 剩余天数 | ≤ 7 | 🚨 紧急告警 |
| SSL 剩余天数 | ≤ 30 | ⚠️ 警告 |
| HTTP 响应 | 非 2xx | ❌ 失败 |
| Nginx 进程 | 未运行 | 🚨 紧急 |

## 🛠️ 故障排除

### 证书续期失败

1. 检查网络连通性
2. 确认域名 DNS 解析正常
3. 验证 Webroot 路径可写
4. 查看日志: `/var/log/ssl-renew.log`

### 健康检查失败

1. 检查 Nginx 是否运行: `systemctl status nginx`
2. 检查端口监听: `ss -tlnp | grep 443`
3. 测试手动访问: `curl -v https://7zi.com/`

## 📝 维护

### 定期维护任务

```bash
# 每月检查日志
tail -50 /var/log/ssl-renew.log

# 检查证书到期
openssl s_client -servername 7zi.com -connect 7zi.com:443 2>/dev/null | openssl x509 -noout -enddate

# 验证 cron 任务
crontab -l
ls -la /etc/cron.d/
```
