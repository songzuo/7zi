# 7zi.com 网站备份与灾难恢复方案

**版本**: 1.0
**制定日期**: 2026-05-03
**更新日期**: 2026-05-03
**制定者**: AI 主管 / 🛡️ 系统管理员
**项目**: 7zi.com 网站
**状态**: 正式方案

---

## 一、现状分析

### 1.1 当前备份现状

| 项目 | 状态 | 说明 |
|------|------|------|
| **OpenClaw 工作区备份** | ✅ 已配置 | 每日 03:00 备份到 `/root/.backup/`，保留 7 份每日 |
| **数据库备份** | ⚠️ 需完善 | SQLite + Litestream 实时复制（计划中，未完全实施） |
| **配置文件备份** | ❌ 缺失 | 无自动化备份脚本 |
| **跨服务器备份** | ⚠️ 部分 | bot5.szspd.cn 作为备用，但未实现自动同步 |
| **异地备份** | ❌ 缺失 | 无 S3/云存储备份方案 |
| **备份验证** | ⚠️ 部分 | 有校验和验证，但未定期恢复演练 |

### 1.2 服务器清单

| 服务器 | IP | 用途 | 角色 |
|--------|-----|------|------|
| **7zi.com** | 172.67.184.212 / 104.21.59.229 | 主网站 | 生产环境 |
| **bot5.szspd.cn** | 182.43.36.134 | 测试/备用 | 备用服务器 |
| **bot6 (本机)** | 本地 | OpenClaw 运行 | 开发/监控 |

### 1.3 技术栈

- **前端**: Next.js 16.2.1 (Docker 容器)
- **数据库**: SQLite (better-sqlite3 12.8.0)
- **实时复制**: Litestream (计划中)
- **服务管理**: PM2
- **反向代理**: Nginx (Cloudflare CDN)
- **CI/CD**: GitHub Actions (蓝绿部署)

---

## 二、备份策略

### 2.1 数据分类

| 数据类型 | 存储位置 | 备份频率 | 保留期限 | 备份方式 |
|----------|----------|----------|----------|----------|
| **数据库** | `/opt/7zi/data/db.sqlite` | 实时 + 每小时增量 + 每日全量 | 本地 7 天，S3 30 天 | Litestream + 脚本备份 |
| **应用代码** | `/opt/7zi-frontend` | 每次部署时自动 | 永久（GitHub） | Git 版本控制 |
| **配置文件** | `/opt/7zi-frontend/.env.production` | 每日 + 变更时 | 本地 30 天，S3 永久 | 加密压缩备份 |
| **Nginx 配置** | `/etc/nginx/` | 每日 + 变更时 | 本地 30 天，S3 永久 | 加密压缩备份 |
| **SSL 证书** | `/web/ssl_unified/` | 每月 + 续期时 | S3 永久 | 自动同步 |
| **用户上传** | `/opt/7zi/uploads` | 每 6 小时 | 本地 14 天，S3 90 天 | rsync + rclone |
| **日志文件** | `/var/log/7zi` | 每 24 小时 | 本地 30 天，S3 7 天 | logrotate + rclone |
| **工作区** | `/root/.openclaw/workspace` | 每日 | 本地 7 天 | OpenClaw 备份脚本 |

### 2.2 数据库备份方案

#### 2.2.1 备份频率与保留

| 备份类型 | 频率 | 保留时间 | 存储位置 | 说明 |
|----------|------|----------|----------|------|
| **实时复制** | 每秒 | 7 天 | 本地 Litestream | 最高 RPO (接近 0) |
| **小时增量** | 每小时 | 72 小时 | 本地 + S3 | WAL 文件备份 |
| **每日全量** | 每天 02:00 UTC | 30 天 | 本地 + S3 | gzip 压缩 |
| **每周全量** | 每周日 02:00 UTC | 12 周 | S3 | 用于长期保留 |
| **月度全量** | 每月 1 日 02:00 UTC | 12 个月 | S3 | 年度归档 |

#### 2.2.2 数据库备份脚本

```bash
#!/bin/bash
# /opt/7zi/scripts/backup-db.sh
# 数据库备份脚本 - 每天 02:00 执行

set -e
BACKUP_DIR="/opt/7zi/backups"
DB_PATH="/opt/7zi/data/db.sqlite"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_LOCAL=7
RETENTION_S3=30

# 创建备份目录
mkdir -p ${BACKUP_DIR}/{daily,weekly,monthly}

# 全量备份
echo "[$(date)] Starting full database backup..."
cp ${DB_PATH} ${BACKUP_DIR}/daily/db_full_${DATE}.sqlite

# 压缩
gzip ${BACKUP_DIR}/daily/db_full_${DATE}.sqlite

# 校验和
sha256sum ${BACKUP_DIR}/daily/db_full_${DATE}.sqlite.gz > ${BACKUP_DIR}/daily/db_full_${DATE}.sqlite.gz.sha256

# 上传到 S3 (如果有配置)
if command -v rclone &> /dev/null; then
    rclone copy ${BACKUP_DIR}/daily/db_full_${DATE}.sqlite.gz s3:7zi-backup/db/daily/
    rclone copy ${BACKUP_DIR}/daily/db_full_${DATE}.sqlite.gz.sha256 s3:7zi-backup/db/daily/
fi

# 清理本地过期备份
find ${BACKUP_DIR}/daily -name "db_full_*.sqlite.gz" -mtime +${RETENTION_LOCAL} -delete
find ${BACKUP_DIR}/daily -name "db_full_*.sqlite.gz.sha256" -mtime +${RETENTION_LOCAL} -delete

echo "[$(date)] Database backup completed: db_full_${DATE}.sqlite.gz"
```

### 2.3 文件备份方案

#### 2.3.1 重要目录备份清单

| 目录路径 | 内容说明 | 备份频率 | 备份方式 |
|----------|----------|----------|----------|
| `/opt/7zi-frontend` | 应用代码 | 每日 + 部署时 | Git + 脚本备份 |
| `/opt/7zi/data` | 数据库数据 | 实时 | Litestream |
| `/opt/7zi/uploads` | 用户上传文件 | 每 6 小时 | rsync |
| `/opt/7zi/logs` | 应用日志 | 每 24 小时 | logrotate |
| `/etc/nginx` | Nginx 配置 | 每日 + 变更时 | 加密压缩 |
| `/opt/7zi-frontend/.env.production` | 环境变量 | 每日 + 变更时 | 加密压缩 |
| `/web/ssl_unified` | SSL 证书 | 每月 | rclone |
| `/root/.openclaw/workspace` | 工作区 | 每日 | OpenClaw 备份 |

#### 2.3.2 文件备份脚本

```bash
#!/bin/bash
# /opt/7zi/scripts/backup-files.sh
# 文件备份脚本 - 每天 03:00 执行

set -e
BACKUP_DIR="/opt/7zi/backups"
DATE=$(date +%Y%m%d)

# 备份 Nginx 配置
echo "[$(date)] Backing up Nginx config..."
tar -czf ${BACKUP_DIR}/daily/nginx_config_${DATE}.tar.gz /etc/nginx/

# 备份环境变量（加密）
echo "[$(date)] Backing up environment variables..."
tar -czf - /opt/7zi-frontend/.env.production 2>/dev/null | \
    openssl enc -aes-256-cbc -salt -out ${BACKUP_DIR}/daily/env_production_${DATE}.tar.gz.enc

# 备份 SSL 证书
echo "[$(date)] Backing up SSL certificates..."
tar -czf ${BACKUP_DIR}/daily/ssl_certs_${DATE}.tar.gz /web/ssl_unified/ 2>/dev/null || true

# 同步上传文件到 S3
if command -v rclone &> /dev/null; then
    rclone sync /opt/7zi/uploads s3:7zi-backup/uploads/ --quiet
fi

# 清理过期备份
find ${BACKUP_DIR}/daily -name "*.tar.gz*" -mtime +30 -delete

echo "[$(date)] File backup completed."
```

### 2.4 配置文件备份方案

#### 2.4.1 配置文件清单

| 文件 | 路径 | 说明 | 备份频率 |
|------|------|------|----------|
| `.env.production` | `/opt/7zi-frontend/.env.production` | 生产环境变量 | 每日 + 变更时 |
| `nginx.conf` | `/etc/nginx/nginx.conf` | Nginx 主配置 | 每日 + 变更时 |
| `7zi-frontend.conf` | `/etc/nginx/sites-enabled/` | 站点配置 | 每日 + 变更时 |
| `ecosystem.config.js` | `/opt/7zi-frontend/ecosystem.config.js` | PM2 配置 | 每日 + 变更时 |
| `docker-compose.yml` | `/opt/7zi/docker-compose.yml` | Docker 配置 | 每日 + 变更时 |
| `litestream.yml` | `/etc/litestream.yml` | 数据库复制配置 | 每周 + 变更时 |

#### 2.4.2 配置文件备份脚本

```bash
#!/bin/bash
# /opt/7zi/scripts/backup-config.sh
# 配置文件备份脚本 - 每天 03:30 执行

set -e
BACKUP_DIR="/opt/7zi/backups/config"
DATE=$(date +%Y%m%d_%H%M%S)
ENCRYPTION_KEY_FILE="/opt/7zi/.backup_key"

mkdir -p ${BACKUP_DIR}

# 需要备份的配置文件列表
CONFIG_FILES=(
    "/opt/7zi-frontend/.env.production"
    "/etc/nginx/nginx.conf"
    "/etc/nginx/conf.d/"
    "/opt/7zi-frontend/ecosystem.config.js"
    "/opt/7zi/docker-compose.yml"
    "/etc/litestream.yml"
)

# 打包配置文件
tar -czf - ${CONFIG_FILES[@]} 2>/dev/null | \
    openssl enc -aes-256-cbc -salt -out ${BACKUP_DIR}/config_${DATE}.tar.gz.enc

# 生成校验和
sha256sum ${BACKUP_DIR}/config_${DATE}.tar.gz.enc > ${BACKUP_DIR}/config_${DATE}.tar.gz.enc.sha256

# 上传到 S3
if command -v rclone &> /dev/null; then
    rclone copy ${BACKUP_DIR}/config_${DATE}.tar.gz.enc s3:7zi-backup/config/
fi

echo "[$(date)] Config backup completed: config_${DATE}.tar.gz.enc"
```

---

## 三、异地备份方案

### 3.1 异地备份架构

```
┌──────────────────────────────────────────────────────────────────┐
│                       7zi 异地备份架构                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐      ┌─────────────────┐                 │
│   │  7zi.com (主)   │      │  bot5.szspd.cn  │                 │
│   │  本地备份存储    │ ───► │  (异地备份)     │                 │
│   │  /opt/7zi/backups│      │  同步备份文件    │                 │
│   └────────┬────────┘      └────────┬────────┘                 │
│            │                        │                          │
│            └───────────┬────────────┘                          │
│                        │                                        │
│                        ▼                                        │
│            ┌─────────────────┐                                  │
│            │   云存储 (S3)    │                                  │
│            │  s3://7zi-backup │                                  │
│            │  长期保留 90 天  │                                  │
│            └─────────────────┘                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 异地备份策略

| 备份目标 | 同步频率 | 带宽要求 | 保留时间 | 说明 |
|----------|----------|----------|----------|------|
| **bot5.szspd.cn** | 每 6 小时 | 中等 (rsync) | 14 天 | 快速恢复用 |
| **S3 云存储** | 每日 | 低 (增量) | 90 天 | 长期保留 |

#### 3.2.1 异地备份脚本 (bot5.szspd.cn)

```bash
#!/bin/bash
# /opt/7zi/scripts/backup-offsite.sh
# 异地备份脚本 - 每天 04:00 执行

set -e
REMOTE_SERVER="root@bot5.szspd.cn"
REMOTE_BACKUP_DIR="/opt/7zi/backups"
LOCAL_BACKUP_DIR="/opt/7zi/backups"
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=30"

# 创建远程目录
ssh ${SSH_OPTS} ${REMOTE_SERVER} "mkdir -p ${REMOTE_BACKUP_DIR}"

# 同步每日备份到异地服务器
echo "[$(date)] Syncing backups to bot5.szspd.cn..."
rsync -avz --delete \
    -e "ssh ${SSH_OPTS}" \
    ${LOCAL_BACKUP_DIR}/daily/ \
    ${REMOTE_SERVER}:${REMOTE_BACKUP_DIR}/daily/

# 同步配置文件
echo "[$(date)] Syncing config backups..."
rsync -avz --delete \
    -e "ssh ${SSH_OPTS}" \
    ${LOCAL_BACKUP_DIR}/config/ \
    ${REMOTE_SERVER}:${REMOTE_BACKUP_DIR}/config/

echo "[$(date)] Off-site backup completed."
```

#### 3.2.2 S3 云备份脚本

```bash
#!/bin/bash
# /opt/7zi/scripts/backup-s3.sh
# S3 云备份脚本 - 每天 05:00 执行

set -e
S3_BUCKET="s3:7zi-backup"
DATE=$(date +%Y%m%d)

echo "[$(date)] Starting S3 backup..."

# 备份数据库到 S3
rclone copy /opt/7zi/backups/daily/ s3://7zi-backup/db/daily/ --include "db_full_*.sqlite.gz"

# 备份配置文件到 S3
rclone copy /opt/7zi/backups/config/ s3://7zi-backup/config/ --include "config_*.tar.gz.enc"

# 备份 Nginx 配置
rclone copy /opt/7zi/backups/daily/ s3://7zi-backup/nginx/ --include "nginx_config_*.tar.gz"

# 备份 SSL 证书
rclone copy /opt/7zi/backups/daily/ s3://7zi-backup/ssl/ --include "ssl_certs_*.tar.gz"

# 设置 S3 生命周期规则（保留 90 天）- 通过 rclone 清理
find /opt/7zi/backups/daily -name "*.sqlite.gz" -mtime +90 -delete 2>/dev/null || true

echo "[$(date)] S3 backup completed."
```

---

## 四、灾难恢复步骤

### 4.1 恢复场景分类

| 场景 | RTO 目标 | RPO 目标 | 恢复优先级 |
|------|----------|----------|------------|
| **单容器故障** | 5 分钟 | 0 | P0 |
| **服务器完全故障** | 4 小时 | 15 分钟 | P0 |
| **数据库损坏** | 2 小时 | 5 分钟 | P0 |
| **误删除数据** | 1 小时 | 15 分钟 | P1 |
| **安全攻击/勒索** | 4 小时 | 1 小时 | P0 |

### 4.2 场景 1: 单容器故障（蓝绿切换）

**适用情况**: Docker 容器崩溃或无响应，但服务器正常

**预计恢复时间**: 5 分钟

**操作步骤**:

```bash
# 1. 检查容器状态
docker ps -a | grep 7zi-frontend

# 2. 确定当前活跃环境 (Blue 或 Green)
docker inspect --format='{{.Name}}' 7zi-frontend-blue 2>/dev/null && echo "Blue" || echo "Green"

# 3. 切换到备用环境
cd /opt/7zi-frontend
./scripts/deploy/blue-green-switch.sh

# 4. 验证服务恢复
curl -s https://7zi.com/health | jq .status

# 5. 清理故障容器（异步）
docker logs 7zi-frontend-old > /opt/7zi/logs/container-crash-$(date +%Y%m%d).log
docker rm -f 7zi-frontend-old
```

### 4.3 场景 2: 服务器完全故障

**适用情况**: 7zi.com 服务器完全不可用（如硬件故障、数据中心断电）

**预计恢复时间**: 3-4 小时

**操作步骤**:

```bash
# 阶段 1: 准备备用服务器 (30 分钟)
# ========================================

# 1. SSH 到备用服务器 bot5.szspd.cn
ssh root@bot5.szspd.cn

# 2. 拉取最新代码
cd /opt/7zi-frontend
git pull origin main

# 3. 安装依赖
pnpm install
pnpm build

# 4. 从 S3 恢复最新数据库备份
mkdir -p /opt/7zi/data
rclone copy s3:7zi-backup/db/daily/ /opt/7zi/backups/db/ --latest
gunzip /opt/7zi/backups/db/db_full_latest.sqlite.gz
cp /opt/7zi/backups/db/db_full_latest.sqlite /opt/7zi/data/db.sqlite

# 5. 恢复配置文件
rclone copy s3:7zi-backup/config/ /opt/7zi/backups/config/
# 解密配置文件
openssl enc -d -aes-256-cbc -in /opt/7zi/backups/config/config_latest.tar.gz.enc | tar -xzf - -C /

# 6. 配置 SSL 证书
rclone copy s3:7zi-backup/ssl/ /opt/7zi/ssl/
cp /opt/7zi/ssl/*.pem /web/ssl_unified/

# 7. 启动服务
pm2 restart ecosystem.config.production.js

# 阶段 2: DNS 切换 (15 分钟)
# ========================================

# 8. 降低 DNS TTL (在域名服务商设置)
# 将 TTL 从 3600 改为 300

# 9. 更新 DNS 记录指向备用服务器
# A 记录: 7zi.com -> 182.43.36.134

# 10. 等待 DNS 传播 (最多 5 分钟)
sleep 300

# 11. 验证服务
curl -s https://7zi.com/health

# 阶段 3: 监控与通知
# ========================================

# 12. 启用监控
pm2 monit

# 13. 发送服务恢复通知
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d "chat_id=${CHAT_ID}&text=✅ 7zi.com 服务已恢复 - 从 bot5.szspd.cn 备用服务器运行"
```

### 4.4 场景 3: 数据库损坏恢复

**适用情况**: SQLite 数据库文件损坏或数据丢失

**预计恢复时间**: 30 分钟 - 2 小时

**操作步骤**:

```bash
# 1. 停止应用服务
pm2 stop all

# 2. 备份当前损坏的数据库（如果有残留）
cp /opt/7zi/data/db.sqlite /opt/7zi/data/db.corrupted.$(date +%Y%m%d%H%M%S) 2>/dev/null || true

# 3. 检查 Litestream 是否有实时复制
ls -la /opt/7zi/data/db.sqlite.litestream.lock 2>/dev/null && echo "Litestream active" || echo "No Litestream"

# 4. 从最新备份恢复
LATEST_BACKUP=$(ls -t /opt/7zi/backups/daily/db_full_*.sqlite.gz 2>/dev/null | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    gunzip -k ${LATEST_BACKUP}
    cp ${LATEST_BACKUP%.gz} /opt/7zi/data/db.sqlite
    echo "Restored from: ${LATEST_BACKUP}"
else
    # 尝试从 S3 恢复
    rclone copy s3:7zi-backup/db/daily/ /opt/7zi/backups/db/ --latest
    LATEST_S3=$(ls -t /opt/7zi/backups/db/db_full_*.sqlite.gz | head -1)
    if [ -n "$LATEST_S3" ]; then
        gunzip -k ${LATEST_S3}
        cp ${LATEST_S3%.gz} /opt/7zi/data/db.sqlite
    fi
fi

# 5. 验证数据库完整性
sqlite3 /opt/7zi/data/db.sqlite "PRAGMA integrity_check;"

# 6. 启动应用服务
pm2 restart all

# 7. 运行健康检查
curl -s https://7zi.com/health | jq .

# 8. 检查数据一致性（应用特定检查）
# 例如: 用户数量、会话数据等
```

### 4.5 场景 4: 误删除数据恢复

**适用情况**: 管理员误删了用户数据或配置

**预计恢复时间**: 1-2 小时

**操作步骤**:

```bash
# 1. 立即停止写入操作（防止数据进一步覆盖）
pm2 stop all

# 2. 从 S3 恢复到删除前的备份
# 注意: 需要知道删除发生的大致时间

# 3. 列出可用的备份
rclone ls s3:7zi-backup/db/daily/ | tail -20

# 4. 恢复到指定时间点（如果有 Litestream WAL）
# Litestream 可以恢复到指定时间点之前的数据

# 5. 检查 Litestream WAL
# /opt/7zi/data/db.sqlite.litestream/

# 6. 使用 Litestream 恢复
# litestream restore -v /opt/7zi/data/db.sqlite

# 7. 验证恢复的数据
sqlite3 /opt/7zi/data/db.sqlite "SELECT COUNT(*) FROM users;"

# 8. 启动服务
pm2 start all

# 9. 通知相关人员
```

### 4.6 场景 5: 安全攻击/勒索软件

**适用情况**: 服务器被入侵或遭受勒索软件攻击

**预计恢复时间**: 4-8 小时

**操作步骤**:

```bash
# 阶段 1: 隔离与止损 (15 分钟)
# ========================================

# 1. 立即断开服务器网络连接
# 在云控制台禁用网络接口 或 iptables -I INPUT -j DROP

# 2. 确认攻击范围
docker ps -a
ps aux | grep -E "nc|bash|python" | grep -v grep
netstat -tlnp

# 3. 检查是否有新的用户或 SSH 密钥
cat /etc/passwd | grep -E "nologin|false"
cat ~/.ssh/authorized_keys

# 4. 从已知安全的备份恢复（攻击前最后一个备份）
# 不要使用攻击后创建的备份

# 阶段 2: 在备用服务器恢复服务 (1-2 小时)
# ========================================

# 5. 在 bot5.szspd.cn 上部署新环境（不要复用旧代码）
ssh root@bot5.szspd.cn
cd /opt/7zi-frontend
git fetch --all
git reset --hard origin/main  # 从干净的 Git 状态开始
pnpm install
pnpm build

# 6. 从 S3 恢复干净的数据
rclone copy s3:7zi-backup/db/daily/ /opt/7zi/backups/db/
LATEST_CLEAN=$(ls -t /opt/7zi/backups/db/db_full_*.sqlite.gz | head -1)
gunzip -k ${LATEST_CLEAN}
cp ${LATEST_CLEAN%.gz} /opt/7zi/data/db.sqlite

# 7. 更改所有密码和密钥
# - 数据库密码
# - API 密钥
# - JWT secret
# - S3 访问密钥

# 8. 启动服务
pm2 start ecosystem.config.production.js

# 阶段 3: DNS 切换与通知
# ========================================

# 9. 切换 DNS 到备用服务器
# 更新 DNS A 记录指向 182.43.36.134

# 10. 通知用户（如果需要）
# 发送邮件说明安全事件和恢复情况

# 阶段 4: 安全审计
# ========================================

# 11. 分析攻击路径
# - 检查日志
# - 检查 SSH 登录记录
# - 检查文件完整性

# 12. 修复安全漏洞
# - 更新系统
# - 更新 Docker 镜像
# - 配置防火墙规则

# 13. 设置额外的安全措施
# - Fail2Ban
# - 入侵检测系统
# - 更严格的 SSH 策略
```

---

## 五、备份恢复验证

### 5.1 验证脚本

```bash
#!/bin/bash
# /opt/7zi/scripts/verify-backup.sh
# 备份验证脚本 - 每天 06:00 执行

set -e
BACKUP_DIR="/opt/7zi/backups"
REPORT_FILE="/opt/7zi/reports/backup-verify-$(date +%Y%m%d).log"

mkdir -p /opt/7zi/reports

echo "=== Backup Verification Report - $(date) ===" > ${REPORT_FILE}

# 1. 检查最新数据库备份
echo "" >> ${REPORT_FILE}
echo "Database Backup Check:" >> ${REPORT_FILE}
LATEST_DB=$(ls -t ${BACKUP_DIR}/daily/db_full_*.sqlite.gz 2>/dev/null | head -1)
if [ -n "$LATEST_DB" ]; then
    DB_SIZE=$(stat -f%z "$LATEST_DB" 2>/dev/null || stat -c%s "$LATEST_DB")
    DB_AGE=$(echo "($(date +%s) - $(stat -c%Y "$LATEST_DB")) / 3600" | bc)
    echo "  Latest: $(basename $LATEST_DB)" >> ${REPORT_FILE}
    echo "  Size: $((DB_SIZE / 1024 / 1024)) MB" >> ${REPORT_FILE}
    echo "  Age: ${DB_AGE}h" >> ${REPORT_FILE}
    
    # 校验和验证
    if [ -f "${LATEST_DB}.sha256" ]; then
        if sha256sum -c "${LATEST_DB}.sha256" 2>/dev/null; then
            echo "  Checksum: ✅ Valid" >> ${REPORT_FILE}
        else
            echo "  Checksum: ❌ Failed" >> ${REPORT_FILE}
        fi
    fi
    
    # 解压测试
    gunzip -t "$LATEST_DB" 2>/dev/null && echo "  Archive: ✅ Valid" >> ${REPORT_FILE} || echo "  Archive: ❌ Corrupt" >> ${REPORT_FILE}
else
    echo "  ❌ No database backup found" >> ${REPORT_FILE}
fi

# 2. 检查配置文件备份
echo "" >> ${REPORT_FILE}
echo "Config Backup Check:" >> ${REPORT_FILE}
LATEST_CONFIG=$(ls -t ${BACKUP_DIR}/config/config_*.tar.gz.enc 2>/dev/null | head -1)
if [ -n "$LATEST_CONFIG" ]; then
    echo "  Latest: $(basename $LATEST_CONFIG)" >> ${REPORT_FILE}
    echo "  Size: $(du -h "$LATEST_CONFIG" | cut -f1)" >> ${REPORT_FILE}
else
    echo "  ❌ No config backup found" >> ${REPORT_FILE}
fi

# 3. 检查 S3 同步状态
echo "" >> ${REPORT_FILE}
echo "S3 Sync Check:" >> ${REPORT_FILE}
if command -v rclone &> /dev/null; then
    S3_DB_COUNT=$(rclone ls s3:7zi-backup/db/daily/ 2>/dev/null | wc -l)
    echo "  S3 DB files: $S3_DB_COUNT" >> ${REPORT_FILE}
    if [ "$S3_DB_COUNT" -gt 0 ]; then
        echo "  S3 Status: ✅ Connected" >> ${REPORT_FILE}
    else
        echo "  S3 Status: ⚠️ Empty" >> ${REPORT_FILE}
    fi
else
    echo "  S3 Status: ⚠️ rclone not installed" >> ${REPORT_FILE}
fi

# 4. 检查磁盘空间
echo "" >> ${REPORT_FILE}
echo "Disk Space Check:" >> ${REPORT_FILE}
df -h /opt/7zi | tail -1 | awk '{print "  Used: " $3 " / " $2 " (" $5 ")"}' >> ${REPORT_FILE}
df -h / | tail -1 | awk '{print "  Root Used: " $3 " / " $2 " (" $5 ")"}' >> ${REPORT_FILE}

# 5. 总结
echo "" >> ${REPORT_FILE}
echo "=== Summary ===" >> ${REPORT_FILE}
if grep -q "❌" ${REPORT_FILE}; then
    echo "Status: ⚠️ Issues found - manual review required" >> ${REPORT_FILE}
    exit 1
else
    echo "Status: ✅ All checks passed" >> ${REPORT_FILE}
fi

cat ${REPORT_FILE}
```

### 5.2 恢复演练计划

| 演练类型 | 频率 | 时长 | 参与人员 |
|----------|------|------|----------|
| **备份恢复演练** | 每月 | 2 小时 | 系统管理员 |
| **完整灾难恢复** | 每季度 | 4 小时 | 全体团队 |
| **桌面推演** | 每月 | 1 小时 | 技术团队 |

**演练检查清单**:

- [ ] 确认备份文件完整性
- [ ] 从备份恢复数据库
- [ ] 验证数据库数据完整性
- [ ] 恢复配置文件
- [ ] 启动应用服务
- [ ] 执行健康检查
- [ ] 测试关键功能
- [ ] 记录恢复时间
- [ ] 编写演练报告

---

## 六、自动化 Cron 配置

### 6.1 Cron 任务清单

```bash
# /etc/crontab - 备份任务配置

# 数据库每小时增量备份
0 * * * * root /opt/7zi/scripts/backup-db-hourly.sh

# 数据库每日全量备份 (02:00)
0 2 * * * root /opt/7zi/scripts/backup-db.sh

# 文件备份 (03:00)
0 3 * * * root /opt/7zi/scripts/backup-files.sh

# 配置文件备份 (03:30)
30 3 * * * root /opt/7zi/scripts/backup-config.sh

# 异地备份到 bot5 (04:00)
0 4 * * * root /opt/7zi/scripts/backup-offsite.sh

# S3 云备份 (05:00)
0 5 * * * root /opt/7zi/scripts/backup-s3.sh

# 备份验证 (06:00)
0 6 * * * root /opt/7zi/scripts/verify-backup.sh

# OpenClaw 工作区备份 (03:00)
0 3 * * * root /root/.backup/backup.sh

# 监控检查 (08:00)
0 8 * * * root /root/.backup/monitor.sh
```

---

## 七、关键指标与监控

### 7.1 关键指标

| 指标 | 目标 | 告警阈值 |
|------|------|----------|
| **备份成功率** | 100% | < 99% |
| **恢复时间 (RTO)** | < 4 小时 | > 4 小时 |
| **数据丢失 (RPO)** | < 15 分钟 | > 15 分钟 |
| **备份延迟** | < 1 小时 | > 2 小时 |

### 7.2 告警配置

| 告警条件 | 级别 | 通知方式 |
|----------|------|----------|
| 备份失败 | Critical | Telegram + Email |
| 备份延迟 > 2 小时 | Warning | Telegram |
| 磁盘空间 < 20GB | Warning | Telegram |
| 磁盘空间 < 10GB | Critical | Telegram + Email |
| S3 同步失败 | Critical | Telegram |
| 恢复演练失败 | Critical | Telegram |

---

## 八、实施优先级

| 优先级 | 任务 | 预计工时 | 说明 |
|--------|------|----------|------|
| **P0** | 配置 Litestream 实时复制 | 2 小时 | 数据库 RPO 接近 0 |
| **P0** | 实现 S3 备份脚本 | 2 小时 | 异地数据保护 |
| **P0** | 配置每日备份 Cron | 1 小时 | 自动化备份 |
| **P1** | 实现异地同步到 bot5 | 2 小时 | 快速恢复能力 |
| **P1** | 创建备份验证脚本 | 1 小时 | 确保备份可用 |
| **P1** | 实施配置文件备份 | 2 小时 | 配置安全 |
| **P2** | 定期恢复演练 | 每月 | 验证备份有效性 |
| **P2** | 监控告警集成 | 3 小时 | 实时问题发现 |

---

**文档结束**

---

_本文档每季度审查和更新一次，确保与实际系统状态保持一致。_

_最后更新: 2026-05-03_