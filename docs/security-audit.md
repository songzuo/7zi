# 🔒 系统安全审计报告

**审计时间**: 2026-05-10 10:45 (GMT+2)  
**审计目标**: bot6 (本机)  
**审计类型**: 定期安全检查

---

## 1. SSH 配置文件安全检查

**文件**: `/etc/ssh/sshd_config`

### ✅ 安全配置

| 配置项 | 当前值 | 状态 | 说明 |
|--------|--------|------|------|
| `PermitRootLogin` | `prohibit-password` | ✅ 安全 | 禁止 root 用户密码登录，允许密钥登录 |
| `PubkeyAuthentication` | `yes` | ✅ 安全 | 启用公钥认证 |
| `MaxAuthTries` | `3` | ✅ 安全 | 限制最多 3 次认证尝试 |
| `MaxSessions` | `5` | ✅ 安全 | 限制最大会话数 |
| `ClientAliveInterval` | `300` | ✅ 安全 | 5 分钟无响应自动断开 |
| `ClientAliveCountMax` | `2` | ✅ 安全 | 最多 2 次心跳后断开 |
| `PasswordAuthentication` | (默认 no) | ✅ 安全 | 未显式配置时默认禁用密码认证 |
| `KbdInteractiveAuthentication` | `no` | ✅ 安全 | 禁用键盘交互认证 |

### ⚠️ 需关注

| 配置项 | 当前值 | 风险 | 建议 |
|--------|--------|------|------|
| `X11Forwarding` | `yes` | 中 | 如不需要可关闭 |
| `AllowTcpForwarding` | `yes` | 中 | 如不需要可关闭 |

---

## 2. 防火墙规则检查

**命令**: `iptables -L -n`

### ⚠️ 状态: 未安装

```
iptables: command not found
```

**说明**: 系统未安装 iptables，可能使用 UFW 或其他防火墙工具。

**建议**: 检查并配置系统防火墙：
```bash
# 检查 UFW 状态
sudo ufw status

# 或检查 firewalld
sudo firewall-cmd --state
```

---

## 3. 最近失败的登录尝试

**时间范围**: 最近 1 小时

### 🚨 发现多次暴力破解尝试

| 时间 | 来源 IP | 用户名 | 状态 |
|------|---------|--------|------|
| 10:41:19 | 193.24.211.100 | root | Failed password |
| 10:36:11 | 165.154.224.129 | admin | Invalid user |
| 10:37:12 | 165.154.224.129 | orangepi | Invalid user |
| 10:35:49 | 103.91.78.244 | root | Failed password |
| 10:25:01 | 193.24.211.100 | vt100 | Invalid user |
| 10:10:45 | 103.91.78.244 | root | Failed password |
| 10:08:40 | 193.24.211.100 | root | Failed password |
| 10:00:53 | 92.118.39.23 | root | Failed password (3次) |
| 09:52:15 | 193.24.211.100 | root | Failed password |
| 09:48:51 | 103.91.78.244 | root | Failed password |

### 🚨 攻击源分析

**恶意 IP 列表** (建议加入黑名单):
- `193.24.211.100` - 多次尝试 root 和无效用户
- `103.91.78.244` - 多次尝试 root
- `165.154.224.129` - 尝试常见用户名 (admin, orangepi)
- `92.118.39.23` - 暴力破解 root

---

## 4. 开放网络端口检查

**命令**: `ss -tuln`

### 📋 开放端口清单

| 端口 | 协议 | 服务 | 监听地址 | 风险 |
|------|------|------|----------|------|
| 22 | TCP | SSH | 0.0.0.0 | ⚠️ 外部可访问 |
| 80 | TCP | HTTP | 0.0.0.0 | ⚠️ 外部可访问 |
| 443 | TCP | HTTPS | 0.0.0.0 | ⚠️ 外部可访问 |
| 3306 | TCP | MySQL | 0.0.0.0 | 🔴 高风险 |
| 25 | TCP | SMTP | 0.0.0.0 | ⚠️ 邮件服务 |
| 110 | TCP | POP3 | 0.0.0.0 | ⚠️ 邮件服务 |
| 143 | TCP | IMAP | 0.0.0.0 | ⚠️ 邮件服务 |
| 993 | TCP | IMAPS | 0.0.0.0 | ⚠️ 邮件服务 |
| 995 | TCP | POP3S | 0.0.0.0 | ⚠️ 邮件服务 |
| 9090-9093 | TCP | 未知 | 0.0.0.0 | ⚠️ 需确认 |
| 8080/8085 | TCP | HTTP 代理 | 0.0.0.0 | ⚠️ 外部可访问 |
| 8111 | TCP | 代理 | 0.0.0.0 | ⚠️ 外部可访问 |
| 9100/9101 | TCP | Prometheus | 0.0.0.0 | ⚠️ 监控服务 |
| 4369 | TCP | Erlang | 0.0.0.0 | ⚠️ RabbitMQ |
| 5672 | TCP | AMQP | 0.0.0.0 | ⚠️ RabbitMQ |
| 9200 | TCP | Elasticsearch | 0.0.0.0 | 🔴 高风险 |
| 9300 | TCP | Elasticsearch | 0.0.0.0 | 🔴 高风险 |
| 2000 | TCP | 未知 | 0.0.0.0 | ⚠️ 需确认 |
| 3100 | TCP | 未知 | 0.0.0.0 | ⚠️ 需确认 |
| 5001 | TCP | 未知 | 0.0.0.0 | ⚠️ 需确认 |
| 15672 | TCP | RabbitMQ UI | 0.0.0.0 | ⚠️ 外部可访问 |
| 18789-18792 | TCP | OpenClaw | 127.0.0.1 | ✅ 本地 |
| 2325 | TCP | OpenClaw | 127.0.0.1 | ✅ 本地 |
| 53 | TCP/UDP | DNS | 127.0.0.1/54 | ✅ 本地 |

---

## 5. 安全建议

### 🔴 紧急处理

1. **封禁恶意 IP**
   ```bash
   # 使用 ufw 封禁
   sudo ufw deny from 193.24.211.100
   sudo ufw deny from 103.91.78.244
   sudo ufw deny from 165.154.224.129
   sudo ufw deny from 92.118.39.23
   ```

2. **限制 MySQL/ES 访问**
   - 将 `3306`, `9200`, `9300` 改为仅监听 `127.0.0.1`

3. **安装配置防火墙**
   ```bash
   sudo apt install ufw
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow 22/tcp
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable
   ```

### 🟡 建议优化

1. **SSH 防护**
   - 改为仅监听指定 IP
   - 考虑使用 fail2ban 自动封禁
   - 启用 `AllowUsers` 限制可登录用户

2. **端口清理**
   - 关闭不必要的服务
   - 将内部服务改为仅本地监听

3. **日志监控**
   - 设置自动告警机制
   - 定期审计登录日志

---

## 📊 审计总结

| 检查项 | 状态 | 风险等级 |
|--------|------|----------|
| SSH 配置 | ✅ 基本安全 | 低 |
| 防火墙 | ❌ 未配置 | 高 |
| 暴力破解 | 🚨 频繁攻击 | 高 |
| 开放端口 | ⚠️ 过多高风险端口 | 中-高 |

**整体评估**: 需要紧急处理防火墙配置和恶意 IP 封禁
