# 7zi 运维手册

## 目录

1. [系统架构](#系统架构)
2. [部署指南](#部署指南)
3. [监控告警](#监控告警)
4. [故障处理](#故障处理)
5. [日常维护](#日常维护)
6. [安全配置](#安全配置)
7. [备份恢复](#备份恢复)

---

## 系统架构

### 技术栈

- **前端**: Next.js 15 + React 19
- **进程管理**: PM2 (集群模式)
- **容器化**: Docker + Docker Compose
- **反向代理**: Nginx
- **监控**: Prometheus + Grafana
- **告警**: Alertmanager (Slack + Email)

### 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Next.js | 3000 | 主应用 |
| Nginx | 80, 443 | 反向代理 |
| Prometheus | 9090 | 指标收集 |
| Grafana | 3001 | 可视化面板 |
| Alertmanager | 9093 | 告警路由 |
| Node Exporter | 9100 | 系统指标 |
| cAdvisor | 8080 | 容器指标 |

---

## 部署指南

### 前置条件

```bash
# 检查依赖
node --version  # v22+
npm --version
pm2 --version   # 5.x
docker --version
docker-compose --version
```

### PM2 部署 (推荐)

```bash
# 1. 克隆代码
git clone git@github.com:7zi-studio/7zi-frontend.git
cd 7zi-frontend

# 2. 安装依赖
npm ci --legacy-peer-deps

# 3. 配置环境变量
cp .env.example .env
vim .env

# 4. 构建
npm run build

# 5. 启动
pm2 start ecosystem.config.js --env production

# 6. 保存 PM2 配置
pm2 save

# 7. 设置开机自启
pm2 startup
```

### Docker 部署

```bash
# 1. 构建镜像
docker build -t 7zi-frontend:latest .

# 2. 使用 Docker Compose 启动
docker-compose -f docker-compose.prod.yml up -d

# 3. 查看状态
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

### 部署脚本

```bash
# PM2 部署 (默认)
./scripts/deploy-production.sh

# Docker 部署
./scripts/deploy-production.sh --docker

# 跳过健康检查
./scripts/deploy-production.sh --skip-health-check
```

---

## 监控告警

### 健康检查端点

| 端点 | 用途 | 响应码 |
|------|------|--------|
| `/api/health` | 基础检查 | 200/503 |
| `/api/health/ready` | 就绪探针 | 200/503 |
| `/api/health/live` | 存活探针 | 200 |
| `/api/health/detailed` | 详细报告 | 200 |

### 手动健康检查

```bash
# 基础检查
curl http://localhost:3000/api/health

# 详细检查
./scripts/health-check.sh --detailed

# 持续监控
./scripts/health-check.sh --watch

# Cron 模式 (静默)
./scripts/health-check.sh --cron
```

### Prometheus 告警规则

**P0 - 紧急 (5分钟内响应)**
- ServiceDown: 服务完全不可用
- AllInstancesDown: 所有实例下线
- HighErrorRate: 错误率 >10%
- SSLCertificateExpired: SSL 证书过期

**P1 - 高优先级 (15分钟内响应)**
- ElevatedErrorRate: 错误率 >5%
- HighResponseTime: P95 > 2s
- HighMemoryUsage: 内存 >85%
- HighCPUUsage: CPU >90%
- DiskSpaceLow: 磁盘 <15%

**P2 - 警告 (1小时内响应)**
- ElevatedResponseTime: P95 > 1s
- MemoryUsageElevated: 内存 >75%
- DiskSpaceWarning: 磁盘 <25%

### Grafana 仪表板

访问: http://localhost:3001

默认凭证:
- 用户: admin
- 密码: 见 `monitoring/.env` 中的 `GRAFANA_ADMIN_PASSWORD`

关键面板:
- 应用健康状态
- HTTP 请求速率
- 响应时间百分位
- 错误率趋势
- 系统资源使用

---

## 故障处理

### 常见问题

#### 1. 应用无响应

```bash
# 检查进程状态
pm2 status
pm2 logs 7zi --lines 100

# 检查端口
ss -tlnp | grep 3000

# 重启应用
pm2 restart 7zi

# 强制重启
pm2 stop 7zi
pm2 start 7zi
```

#### 2. 高内存使用

```bash
# 查看内存详情
pm2 monit

# 检查内存泄漏
node --inspect .next/standalone/server.js

# 设置内存限制重启
pm2 start ecosystem.config.js --max-memory-restart 500M
```

#### 3. 高 CPU 使用

```bash
# 查看 CPU 使用
top -p $(pgrep -f "node.*server.js")

# 生成 CPU Profile
kill -USR2 $(pgrep -f "node.*server.js")

# 检查慢查询
pm2 logs 7zi | grep -i "slow"
```

#### 4. 磁盘空间不足

```bash
# 查看磁盘使用
df -h
du -sh /var/log/*
du -sh /var/lib/docker/*

# 清理日志
pm2 flush
truncate -s 0 /var/log/7zi/*.log

# 清理 Docker
docker system prune -af
docker volume prune -f

# 清理 npm 缓存
npm cache clean --force
```

#### 5. SSL 证书问题

```bash
# 检查证书
openssl s_client -connect 7zi.com:443 -servername 7zi.com

# 续签 Let's Encrypt
certbot renew --nginx

# 测试续签
certbot renew --dry-run
```

### 紧急恢复

```bash
# 回滚到上一版本
cd /var/backups/7zi/previous
pm2 stop 7zi
rsync -av --delete . /var/www/7zi/
pm2 start 7zi

# 从备份恢复
BACKUP_DIR="/var/backups/7zi/backup_YYYYMMDD_HHMMSS"
pm2 stop 7zi
rsync -av --delete "$BACKUP_DIR/" /var/www/7zi/
pm2 start 7zi
```

---

## 日常维护

### 定期任务

| 任务 | 频率 | 命令 |
|------|------|------|
| 日志轮转 | 每天 | logrotate |
| 数据备份 | 每天 | `./scripts/backup.sh` |
| 安全扫描 | 每周 | `npm audit` |
| 依赖更新 | 每月 | `npm outdated` |
| 性能分析 | 每月 | `pm2 monit` |

### PM2 命令

```bash
# 状态查看
pm2 status
pm2 describe 7zi
pm2 monit

# 日志管理
pm2 logs 7zi
pm2 logs 7zi --lines 100
pm2 flush  # 清空日志

# 进程管理
pm2 restart 7zi
pm2 reload 7zi  # 零停机重载
pm2 stop 7zi
pm2 delete 7zi

# 集群管理
pm2 scale 7zi 4  # 扩展到 4 个实例
pm2 scale 7zi +2  # 增加 2 个实例
```

### Docker 命令

```bash
# 容器管理
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f 7zi-frontend
docker-compose -f docker-compose.prod.yml restart 7zi-frontend

# 进入容器
docker exec -it 7zi-frontend sh

# 资源使用
docker stats 7zi-frontend
```

---

## 安全配置

### 防火墙

```bash
# UFW 配置
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw enable

# 查看状态
ufw status verbose
```

### SSH 安全

```bash
# 编辑配置
vim /etc/ssh/sshd_config

# 推荐设置
Port 22
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

### 环境变量安全

```bash
# 设置权限
chmod 600 .env

# 检查泄露
git log --all --full-history -- "*.env"
git secrets --scan-history
```

---

## 备份恢复

### 自动备份

```bash
# 添加到 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /var/www/7zi/scripts/backup.sh >> /var/log/7zi/backup.log 2>&1
```

### 备份内容

- 应用代码 (`.next/standalone`, `public/`, `.env`)
- 数据文件 (`data/`)
- 日志文件 (`logs/`)
- Nginx 配置 (`nginx/`)

### 恢复步骤

```bash
# 1. 停止服务
pm2 stop 7zi

# 2. 恢复文件
rsync -av /var/backups/7zi/latest/ /var/www/7zi/

# 3. 恢复数据库 (如果有)
# ...

# 4. 重启服务
pm2 start 7zi

# 5. 验证
curl http://localhost:3000/api/health
```

---

## 联系信息

### 告警接收

- **Slack**: #alerts-critical, #alerts-high, #alerts-warning
- **Email**: admin@7zi.studio, ops@7zi.studio

### 升级流程

1. **P0 紧急**: 立即电话通知 + Slack @channel
2. **P1 高优**: Slack @here + Email
3. **P2 警告**: Slack 消息
4. **P3 信息**: Email 摘要

---

*最后更新: 2026-03-10*