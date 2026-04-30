# 🛡️ 服务器安全加固最佳实践 (2026)

## 概述

随着网络攻击手段日益复杂，服务器安全加固已成为运维工作的重中之重。本指南基于 2026 年最新安全实践，从攻击防御、SSH 防护、防火墙、容器安全、证书管理、入侵检测六个维度提供全面的安全加固方案。

---

## 一、常见的服务器攻击类型和防御方法

### 1.1 常见攻击类型

| 攻击类型 | 描述 | 风险等级 |
|----------|------|----------|
| **DDoS 攻击** | 分布式拒绝服务，通过大量请求拥塞服务器 | 🔴 高 |
| **暴力破解 (Brute Force)** | 反复尝试用户名/密码组合 | 🔴 高 |
| **SQL 注入** | 通过输入框植入恶意 SQL 代码 | 🔴 高 |
| **XSS 跨站脚本** | 在网页中注入恶意脚本 | 🟡 中 |
| **零日漏洞 (Zero-day)** | 利用未修补的已知漏洞 | 🔴 极高 |
| **社会工程学** | 通过欺骗手段获取凭据 | 🟡 中 |
| **供应链攻击** | 通过第三方软件植入后门 | 🔴 高 |

### 1.2 防御策略

```bash
# 1. 最小化攻击面 - 仅开放必要端口
# 2. 定期更新系统和软件
sudo apt update && sudo apt upgrade -y

# 3. 使用 Web 应用防火墙 (WAF)
# 4. 启用 Rate Limiting 限制请求频率
# 5. 实施 IP 白名单/黑名单制度
```

---

## 二、SSH 安全配置

### 2.1 密钥管理

```bash
# 生成强加密密钥 (Ed25519)
ssh-keygen -t ed25519 -a 100 -f ~/.ssh/id_ed25519

# 禁用密码登录
sudoedit /etc/ssh/sshd_config
# 设置: PasswordAuthentication no
# 设置: PermitRootLogin without-password

# 重启 SSH 服务
sudo systemctl restart sshd
```

### 2.2 Fail2Ban 防御暴力破解

```bash
# 安装 Fail2Ban
sudo apt install fail2ban -y

# 配置 jail
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
```

```bash
# 启用并启动
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2.3 其他 SSH 加固措施

- **修改默认端口** (如 `Port 2222`)
- **限制用户登录** (`AllowUsers username@ip`)
- **使用 Certificate Authority (CA) 认证**
- **配置 Google Authenticator 双因素认证**

---

## 三、防火墙配置 (iptables / nftables)

### 3.1 iptables 基础规则

```bash
# 清除现有规则
sudo iptables -F
sudo iptables -X

# 设置默认策略
sudo iptables -P INPUT DROP
sudo iptables -P FORWARD DROP
sudo iptables -P OUTPUT ACCEPT

# 允许本地回环
sudo iptables -A INPUT -i lo -j ACCEPT

# 允许已建立连接
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# 允许 SSH (非默认端口)
sudo iptables -A INPUT -p tcp --dport 2222 -j ACCEPT

# 允许 HTTP/HTTPS
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 保存规则
sudo iptables-save > /etc/iptables/rules.v4
```

### 3.2 nftables (推荐 2026 年使用)

```bash
# 安装 nftables
sudo apt install nftables -y

# 创建规则表
sudo nft add table inet filter

# 创建链
sudo nft add chain inet filter input { type filter hook input priority 0 \; }

# 添加规则
sudo nft add rule inet filter input ct state established,related accept
sudo nft add rule inet filter input tcp dport 22 accept
sudo nft add rule inet filter input tcp dport 80 accept
sudo nft add rule inet filter input tcp dport 443 accept
sudo nft add rule inet filter input counter

# 保存
sudo nft list ruleset > /etc/nftables.conf
```

---

## 四、Docker 容器安全

### 4.1 镜像安全

```dockerfile
# 使用官方精简镜像
FROM python:3.12-slim

# 非 root 用户运行
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

# 最小化安装
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 不要 COPY . (避免复制敏感文件)
```

### 4.2 Docker 安全运行配置

```bash
# 运行容器时启用安全选项
docker run -d \
  --read-only \
  --security-opt=no-new-privileges \
  --cap-drop ALL \
  --user 1000:1000 \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  myapp:latest
```

### 4.3 DockerBench Security 扫描

```bash
# 运行安全基线检查
docker run -it --net host --privileged \
  aquasec/docker-bench-security:latest
```

### 4.4 关键安全配置

| 配置项 | 推荐值 |
|--------|--------|
| **User Namespace Remapping** | enabled |
| **Seccomp** | enabled (default profile) |
| **AppArmor/SELinux** | enabled |
| **No new privileges** | `--security-opt=no-new-privileges` |
| **Rootless mode** | recommended |

---

## 五、SSL/TLS 证书管理

### 5.1 使用 Let's Encrypt (免费自动证书)

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取证书 (Nginx 插件)
sudo certbot --nginx -d example.com -d www.example.com

# 自动续期 (Let’s Encrypt 证书 90 天有效期)
sudo certbot renew --dry-run
```

### 5.2 TLS 配置强化

```nginx
# Nginx TLS 配置示例
server {
    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    
    # TLS 版本控制 (禁用 TLS 1.0/1.1)
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # 强加密套件
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;
    
    # HSTS 头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### 5.3 证书监控

```bash
# 使用 openssl 检查证书过期
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -dates

# 自动化监控脚本
#!/bin/bash
# 检查证书剩余天数
DAYS=$(echo | openssl s_client -connect $1:443 -servername $1 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
if [ $DAYS -lt 30 ]; then
    echo "证书即将过期，请续期！" | mail -s "证书警告" admin@example.com
fi
```

---

## 六、日志监控和入侵检测

### 6.1 集中式日志管理 (ELK Stack)

```bash
# Filebeat 配置示例
sudo nano /etc/filebeat/filebeat.yml
```

```yaml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/auth.log
      - /var/log/syslog
      - /var/log/nginx/access.log

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

### 6.2 OSSEC 入侵检测

```bash
# 安装 OSSEC (主机入侵检测系统)
wget -O ossec-agent.tar.gz https://github.com/ossec/ossec-hids/releases/download/3.7.0/ossec-hids-3.7.0.tar.gz
tar -xzf ossec-agent.tar.gz
cd ossec-hids-3.7.0
./install.sh
```

### 6.3 常用监控命令

```bash
# 实时查看认证失败日志
sudo tail -f /var/log/auth.log | grep -i "failed\|invalid"

# 检查当前登录用户
who

# 查看历史登录记录
last
lastlog

# 检查打开的网络连接
ss -tunap

# 实时监控进程
top -c

# 检查异常 cron 任务
sudo crontab -l
cat /etc/crontab
```

### 6.4 自动告警配置

```bash
# 创建安全告警脚本
#!/bin/bash
# /opt/security/alert.sh

LOG_FILE="/var/log/auth.log"
ALERT_EMAIL="admin@example.com"

# 检测暴力破解
if grep -i "failed password" $LOG_FILE | tail -100 | awk '{print $11}' | sort | uniq -c | sort -rn | head -1 | awk '$1 > 10 {print "可能的暴力破解攻击"}'; then
    echo "检测到异常登录尝试" | mail -s "[安全告警] 暴力破解检测" $ALERT_EMAIL
fi

# 检测新增用户
NEW_USERS=$(grep -E "useradd|adduser" $LOG_FILE | tail -10)
if [ ! -z "$NEW_USERS" ]; then
    echo "$NEW_USERS" | mail -s "[安全告警] 新用户创建" $ALERT_EMAIL
fi
```

---

## 📋 安全加固检查清单

- [ ] SSH 禁用密码登录，使用密钥认证
- [ ] Fail2Ban 已配置并运行
- [ ] 防火墙配置最小权限原则
- [ ] Docker 容器以非 root 用户运行
- [ ] SSL/TLS 证书自动续期已配置
- [ ] 日志集中收集和实时监控
- [ ] 定期进行安全漏洞扫描
- [ ] 实施双因素认证 (2FA)
- [ ] 定期备份关键数据
- [ ] 最小化安装，仅安装必要软件

---

## 总结

服务器安全是持续过程，而非一次性任务。建议：

1. **定期审计** - 每月检查安全配置
2. **持续监控** - 7x24 小时日志监控
3. **快速响应** - 制定安全事件响应预案
4. **保持更新** - 及时打补丁、升级软件
5. **安全培训** - 提升团队安全意识

如需更详细的某项配置指南，请告知！