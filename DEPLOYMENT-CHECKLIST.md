# 7zi.com 部署清单

> 服务器部署规划检查和部署脚本准备
> 生成时间: 2026-03-22

---

## 📋 服务器配置

| 服务器            | IP            | 用户 | 密码            | 用途     |
| ----------------- | ------------- | ---- | --------------- | -------- |
| **7zi.com**       | 165.99.43.61  | root | `ge20993344$ZZ` | 主网站   |
| **bot5.szspd.cn** | 182.43.36.134 | root | `ge20993344$ZZ` | 测试机器 |

---

## ✅ 1. Docker 配置检查

### Dockerfile 状态

项目包含 **4 个 Dockerfile**：

| 文件                    | 用途                   | 状态    |
| ----------------------- | ---------------------- | ------- |
| `Dockerfile`            | 标准多阶段构建（推荐） | ✅ 可用 |
| `Dockerfile.optimized`  | 优化版本               | ✅ 可用 |
| `Dockerfile.production` | 生产环境专用           | ✅ 可用 |
| `Dockerfile.static`     | 静态导出版本           | ✅ 可用 |

**推荐使用**: `Dockerfile` - 包含完整的多阶段构建优化

**特性**:

- 多阶段构建（deps → builder → runner）
- Node.js 22 Alpine 基础镜像
- 非 root 用户运行（uid 1001）
- 健康检查内置
- SQLite 数据库支持
- Standalone 模式（自包含运行时）

### Docker Compose 配置

项目包含 **3 个 docker-compose 配置**：

| 文件                               | 用途          | 状态    |
| ---------------------------------- | ------------- | ------- |
| `docker-compose.yml`               | 开发/测试环境 | ✅ 可用 |
| `docker-compose.prod.yml`          | 生产环境      | ✅ 可用 |
| `docker-compose.zero-downtime.yml` | 零停机部署    | ✅ 可用 |

**推荐使用**: `docker-compose.prod.yml` - 专为生产环境优化

**特性**:

- 健康检查配置
- 资源限制（CPU/内存）
- 日志轮转配置
- Nginx 反向代理
- SSL 证书支持
- Watchtower 自动更新（可选）

---

## 📁 2. 部署脚本清单

### 主部署脚本

| 脚本                      | 用途             | 目标服务器 | 状态    |
| ------------------------- | ---------------- | ---------- | ------- |
| `deploy-remote.sh`        | 远程部署（推荐） | 7zi.com    | ✅ 可用 |
| `deploy-production.sh`    | 生产部署         | 7zi.com    | ✅ 可用 |
| `deploy-cluster.sh`       | 集群部署（8台）  | 所有服务器 | ✅ 可用 |
| `deploy.sh`               | 快速部署         | 通用       | ✅ 可用 |
| `deploy-zero-downtime.sh` | 零停机部署       | 7zi.com    | ✅ 可用 |

### 辅助脚本（deploy-scripts/）

| 脚本                       | 用途          | 状态    |
| -------------------------- | ------------- | ------- |
| `deploy-nginx.sh`          | Nginx 部署    | ✅ 可用 |
| `deploy-docker.sh`         | Docker 部署   | ✅ 可用 |
| `deploy-rsync.sh`          | rsync 同步    | ✅ 可用 |
| `deploy-7zi-bot5.sh`       | 部署到 bot5   | ✅ 可用 |
| `deploy-7zi-www.sh`        | 部署到 www    | ✅ 可用 |
| `check-cicd.sh`            | CI/CD 检查    | ✅ 可用 |
| `setup-git-hook-server.sh` | Git Hook 设置 | ✅ 可用 |

**推荐使用**: `deploy-remote.sh deploy` - 完整的一键部署流程

---

## 🔑 3. 环境变量配置

### 必需环境变量

```bash
# 基础应用配置
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# 应用 URL（重要！）
NEXT_PUBLIC_APP_URL=https://7zi.com

# NextAuth 配置（如使用）
NEXTAUTH_SECRET=<生成随机字符串>
NEXTAUTH_URL=https://7zi.com
JWT_SECRET=<生成随机字符串>
```

### 可选但推荐的环境变量

```bash
# 网站统计
NEXT_PUBLIC_PLAUSIBLE_ID=7zi.com
NEXT_PUBLIC_GA_ID=GA4 Measurement ID

# 邮件服务（联系表单）
RESEND_API_KEY=re_xxx
CONTACT_EMAIL=business@7zi.studio
FROM_EMAIL=noreply@7zi.studio

# GitHub API（可选）
GITHUB_TOKEN=ghp_xxx
NEXT_PUBLIC_GITHUB_OWNER=songzhuo
NEXT_PUBLIC_GITHUB_REPO=openclaw-workspace

# 数据库
DATABASE_PATH=/data/7zi.db
DATABASE_POOL_SIZE=10
DATABASE_TIMEOUT=30000

# Sentry 错误监控（推荐）
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o0.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx
SENTRY_ORG=xxx
SENTRY_PROJECT=xxx
```

### 配置文件

项目提供以下配置模板：

| 文件                      | 用途             | 状态            |
| ------------------------- | ---------------- | --------------- |
| `.env.example`            | 完整环境变量示例 | ✅ 存在         |
| `.env.production.example` | 生产环境示例     | ✅ 存在         |
| `.env.production`         | 实际生产配置     | ⚠️ 需要手动创建 |

---

## 🌐 4. 端口配置

### 应用端口

| 服务                 | 容器内端口 | 主机端口 | 说明             |
| -------------------- | ---------- | -------- | ---------------- |
| **Next.js Frontend** | 3000       | 3000     | 主应用           |
| **Nginx**            | 80/443     | 80/443   | 反向代理         |
| **Socket.IO**        | 3001       | 3001     | 实时通知（可选） |

### 服务器防火墙

需要开放的端口：

```bash
# HTTP/HTTPS
80/tcp   # HTTP
443/tcp  # HTTPS

# 应用直接访问（可选）
3000/tcp # Next.js 直接访问

# SSH
22/tcp   # SSH
```

防火墙配置命令：

```bash
# Ubuntu/Debian
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable

# CentOS/RHEL
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload
```

---

## 🚀 5. 快速部署流程

### 方法 1: 使用 deploy-remote.sh（推荐）

```bash
# 从本机执行完整部署
cd /root/.openclaw/workspace
./deploy-remote.sh deploy
```

**部署流程**：

1. ✅ 检查本地依赖
2. ✅ 检查服务器连接
3. ✅ 检查 Docker 环境
4. ✅ 创建部署目录
5. ✅ 同步代码到服务器
6. ✅ 配置环境变量
7. ✅ 构建 Docker 镜像
8. ✅ 启动服务
9. ✅ 健康检查

**其他命令**：

```bash
./deploy-remote.sh quick      # 快速部署（仅同步）
./deploy-remote.sh logs       # 查看日志
./deploy-remote.sh status      # 查看状态
./deploy-remote.sh restart    # 重启服务
./deploy-remote.sh rollback   # 回滚版本
```

### 方法 2: 使用 Docker Compose

```bash
# 1. SSH 到服务器
sshpass -p 'ge20993344$ZZ' ssh root@7zi.com

# 2. 克隆代码（如果不存在）
cd /opt
git clone https://github.com/songzhuo/openclaw-workspace.git 7zi-frontend
cd 7zi-frontend

# 3. 配置环境变量
cp .env.production.example .env.production
nano .env.production  # 编辑配置

# 4. 构建并启动
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 5. 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

### 方法 3: 使用集群部署脚本

```bash
# 一键部署到所有服务器
./deploy-cluster.sh deploy
```

---

## 📦 6. 服务器需求

### 最小配置

| 资源 | 最低          | 推荐             |
| ---- | ------------- | ---------------- |
| CPU  | 1核           | 2核              |
| 内存 | 512MB         | 1GB              |
| 磁盘 | 10GB          | 20GB             |
| 系统 | Ubuntu 20.04+ | Ubuntu 22.04 LTS |

### 必需软件

```bash
# Docker
docker >= 20.10

# Docker Compose
docker-compose >= 2.0

# 工具
curl, wget, rsync, git, sshpass
```

### 自动安装

所有部署脚本都会自动检测并安装缺失的依赖。

---

## 🔧 7. Nginx 配置

### Nginx 反向代理

项目提供 Nginx 配置文件：

| 文件                                       | 用途                        |
| ------------------------------------------ | --------------------------- |
| `7zi-nginx.conf`                           | 主 Nginx 配置（已配置 SSL） |
| `deploy-scripts/nginx/nginx.conf.template` | 配置模板                    |

### Nginx 配置特性

- ✅ HTTP → HTTPS 自动重定向
- ✅ SSL/TLS 1.2+ 支持
- ✅ 安全头配置（HSTS, X-Frame-Options 等）
- ✅ 静态资源缓存
- ✅ Gzip 压缩
- ✅ 健康检查端点
- ✅ Gmail Pub/Sub 回调支持

### SSL 证书

证书位置：

```
/web/ssl_unified/7zi.com.crt
/web/ssl_unified/7zi.com.key
```

使用 Let's Encrypt 自动续期（推荐）：

```bash
# 安装 certbot
apt install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d 7zi.com -d www.7zi.com

# 自动续期
certbot renew --dry-run
```

---

## 🧪 8. 健康检查

### 应用健康检查

```bash
# HTTP 健康检查
curl -sf http://localhost:3000/health

# 详细健康信息
curl -sf http://localhost:3000/api/health/detailed
```

### 容器健康检查

Docker Compose 已配置自动健康检查：

```yaml
healthcheck:
  test:
    [
      'CMD',
      'node',
      '-e',
      "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})",
    ]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 20s
```

### 手动检查

```bash
# 检查容器状态
docker ps | grep 7zi

# 查看容器日志
docker logs 7zi-frontend -f

# 检查服务是否响应
curl -I https://7zi.com
```

---

## 🔄 9. 零停机部署

### 使用 docker-compose.zero-downtime.yml

```bash
# 零停机部署
docker-compose -f docker-compose.zero-downtime.yml up -d

# 回滚
docker-compose -f docker-compose.zero-downtime.yml down
```

### 部署策略

1. **蓝绿部署**: 启动新容器，测试通过后切换流量
2. **滚动更新**: 逐步替换旧容器
3. **金丝雀发布**: 先小流量验证，再全量发布

---

## 📊 10. 监控和日志

### 日志位置

| 日志类型    | 位置                          |
| ----------- | ----------------------------- |
| Docker 日志 | `/var/lib/docker/containers/` |
| Nginx 日志  | `/var/log/nginx/`             |
| 应用日志    | Docker 容器内                 |

### 日志查看

```bash
# 实时查看 Docker 日志
docker-compose -f docker-compose.prod.yml logs -f

# 查看 Nginx 日志
tail -f /var/log/nginx/7zi.com-https.access.log
tail -f /var/log/nginx/7zi.com-https.error.log

# 日志轮转
logrotate -f /etc/logrotate.conf
```

### 资源监控

```bash
# 查看容器资源使用
docker stats

# 系统资源
htop
free -h
df -h
```

---

## 🔐 11. 安全检查清单

### 服务器安全

- [ ] 使用 SSH 密钥认证（禁用密码登录）
- [ ] 配置防火墙（ufw/firewalld）
- [ ] 定期更新系统：`apt update && apt upgrade`
- [ ] 非 root 用户运行应用（Docker 已配置）
- [ ] 禁用 root SSH 登录（可选）

### 应用安全

- [ ] 启用 HTTPS（SSL 证书）
- [ ] 配置安全头（Nginx 已配置）
- [ ] 设置 CSP（Content Security Policy）
- [ ] 限制 API 速率
- [ ] 启用 CORS 白名单

### 数据安全

- [ ] 定期备份数据库
- [ ] 加密敏感数据
- [ ] 使用环境变量管理密钥
- [ ] 定期轮换密钥

---

## 📝 12. 备份策略

### 数据备份

```bash
# 备份 SQLite 数据库
docker exec 7zi-frontend tar -czf /tmp/backup.tar.gz /data
docker cp 7zi-frontend:/tmp/backup.tar.gz ./backups/backup-$(date +%Y%m%d).tar.gz

# 备份配置
tar -czf ./backups/config-$(date +%Y%m%d).tar.gz .env.production nginx/

# 备份到远程
rsync -avz ./backups/ user@backup.server:/backups/7zi/
```

### 自动备份脚本

创建 `/opt/backup.sh`：

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
docker exec 7zi-frontend tar -czf /tmp/backup-$DATE.tar.gz /data
docker cp 7zi-frontend:/tmp/backup-$DATE.tar.gz $BACKUP_DIR/

# 备份配置
tar -czf $BACKUP_DIR/config-$DATE.tar.gz /opt/7zi-frontend/.env.production

# 清理7天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: backup-$DATE.tar.gz"
```

添加到 crontab：

```bash
# 每天凌晨2点备份
0 2 * * * /opt/backup.sh >> /var/log/backup.log 2>&1
```

---

## 🆘 13. 故障排查

### 常见问题

#### 1. 容器无法启动

```bash
# 查看容器日志
docker logs 7zi-frontend

# 检查端口占用
netstat -tlnp | grep :3000

# 重新构建镜像
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### 2. 健康检查失败

```bash
# 检查服务是否响应
curl -v http://localhost:3000/

# 检查环境变量
docker exec 7zi-frontend env | grep NEXT

# 重启容器
docker restart 7zi-frontend
```

#### 3. Nginx 502 Bad Gateway

```bash
# 检查后端服务状态
docker ps | grep 7zi-frontend

# 检查 Nginx 配置
nginx -t

# 查看 Nginx 错误日志
tail -f /var/log/nginx/7zi.com-https.error.log
```

#### 4. 磁盘空间不足

```bash
# 检查磁盘使用
df -h

# 清理 Docker 资源
docker system prune -a

# 清理日志
docker log cleanup
```

---

## 📚 14. 文档参考

### 相关文档

| 文档                                | 说明           |
| ----------------------------------- | -------------- |
| `README.md`                         | 项目主文档     |
| `deploy-scripts/README.md`          | 部署方案概览   |
| `deploy-scripts/QUICKSTART.md`      | 快速开始指南   |
| `deploy-scripts/PROJECT_SUMMARY.md` | 部署方案总结   |
| `7zi-nginx.conf`                    | Nginx 配置示例 |

### 在线文档

- Next.js: https://nextjs.org/docs
- Docker: https://docs.docker.com
- Docker Compose: https://docs.docker.com/compose
- Nginx: https://nginx.org/en/docs/

---

## ✨ 15. 下一步行动

### 首次部署

1. ✅ 检查服务器环境：`./deploy-remote.sh check`
2. ✅ 配置环境变量：编辑 `.env.production`
3. ✅ 执行完整部署：`./deploy-remote.sh deploy`
4. ✅ 验证部署：访问 https://7zi.com
5. ✅ 配置 SSL 证书（如需要）
6. ✅ 设置自动备份

### 日常维护

- [ ] 每周检查服务器状态
- [ ] 每月更新系统和 Docker
- [ ] 定期检查日志
- [ ] 监控磁盘使用
- [ ] 验证备份有效性

### 监控建议

- 设置 uptime 监控（如 UptimeRobot）
- 配置错误告警（Sentry）
- 监控资源使用（Prometheus + Grafana）
- 日志聚合（ELK Stack 或 Loki）

---

## 📞 16. 联系和支持

如有问题，请检查：

1. 📖 相关文档
2. 📋 部署日志
3. 🔍 Docker 日志
4. 🌐 网络连接
5. 🔧 系统资源

---

**生成时间**: 2026-03-22
**最后更新**: 2026-03-22
**版本**: v1.0
