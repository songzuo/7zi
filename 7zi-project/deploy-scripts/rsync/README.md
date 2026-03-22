# rsync 同步部署方案

## 概述

使用 rsync 通过 SSH 同步文件到服务器，支持增量更新和断点续传。

## 适用场景

- 快速部署和更新
- 大文件传输
- 需要增量同步的场景
- 简单的静态网站部署

---

## 基础部署脚本

### deploy-rsync.sh

```bash
#!/bin/bash
set -e

# 配置
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="${DEPLOY_HOST:?请设置 DEPLOY_HOST}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
APP_NAME="${APP_NAME:-myapp}"
APP_DIR="/var/www/${APP_NAME}"
LOCAL_DIR="${1:-./dist}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_ed25519}"

# rsync 选项
RSYNC_OPTS=(
    -avz                    # 归档模式、详细、压缩
    --delete                # 删除远程多余文件
    --progress              # 显示进度
    -e "ssh -p ${DEPLOY_PORT} -i ${SSH_KEY}"
    --exclude='.git'        # 排除.git 目录
    --exclude='node_modules' # 排除 node_modules
    --exclude='.env'        # 排除环境文件
    --exclude='*.log'       # 排除日志文件
)

echo "🔄 开始 rsync 部署..."
echo "📂 源目录：${LOCAL_DIR}"
echo "🖥️  目标：${DEPLOY_USER}@${DEPLOY_HOST}:${APP_DIR}"

# 检查源目录
if [ ! -d "${LOCAL_DIR}" ]; then
    echo "❌ 错误：源目录不存在：${LOCAL_DIR}"
    exit 1
fi

# 创建远程目录
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "mkdir -p ${APP_DIR}"

# 执行同步
rsync "${RSYNC_OPTS[@]}" "${LOCAL_DIR}/" "${DEPLOY_USER}@${DEPLOY_HOST}:${APP_DIR}/"

echo "✅ rsync 部署完成！"
```

---

## 高级部署脚本

### deploy-rsync-advanced.sh

```bash
#!/bin/bash
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="${DEPLOY_HOST:?请设置 DEPLOY_HOST}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
APP_NAME="${APP_NAME:-myapp}"
APP_DIR="/var/www/${APP_NAME}"
BACKUP_DIR="/var/backups/${APP_NAME}"
LOCAL_DIR="${1:-./dist}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_ed25519}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# rsync 选项
RSYNC_OPTS=(
    -avz
    --delete
    --progress
    -e "ssh -p ${DEPLOY_PORT} -i ${SSH_KEY}"
    --exclude='.git'
    --exclude='node_modules'
    --exclude='.env'
    --exclude='*.log'
    --exclude='.DS_Store'
    --exclude='Thumbs.db'
)

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=========================================="
echo "🔄 rsync 高级部署"
echo "=========================================="
log_info "源目录：${LOCAL_DIR}"
log_info "目标服务器：${DEPLOY_USER}@${DEPLOY_HOST}:${APP_DIR}"
log_info "备份目录：${BACKUP_DIR}"

# 1. 检查连接
log_info "检查服务器连接..."
if ! ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o ConnectTimeout=10 \
    "${DEPLOY_USER}@${DEPLOY_HOST}" "echo '连接成功'" > /dev/null 2>&1; then
    log_error "无法连接到服务器"
    exit 1
fi

# 2. 创建备份（如果远程目录存在）
log_info "创建备份..."
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" "${DEPLOY_USER}@${DEPLOY_HOST}" << ENDSSH
if [ -d "${APP_DIR}" ] && [ "\$(ls -A ${APP_DIR})" ]; then
    mkdir -p ${BACKUP_DIR}
    cp -r ${APP_DIR} ${BACKUP_DIR}/backup_${TIMESTAMP}
    echo "✅ 备份完成：${BACKUP_DIR}/backup_${TIMESTAMP}"
    
    # 保留最近 5 个备份
    cd ${BACKUP_DIR}
    ls -dt backup_* 2>/dev/null | tail -n +6 | xargs -r rm -rf
    echo "✅ 清理旧备份完成"
else
    echo "ℹ️  无现有部署，跳过备份"
fi
ENDSSH

# 3. 执行同步
log_info "开始同步文件..."
rsync "${RSYNC_OPTS[@]}" "${LOCAL_DIR}/" "${DEPLOY_USER}@${DEPLOY_HOST}:${APP_DIR}/"

if [ $? -eq 0 ]; then
    log_info "文件同步完成"
else
    log_error "文件同步失败"
    exit 1
fi

# 4. 设置权限
log_info "设置权限..."
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" "${DEPLOY_USER}@${DEPLOY_HOST}" << ENDSSH
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}
find ${APP_DIR} -type f -name "*.sh" -exec chmod +x {} \;
echo "✅ 权限设置完成"
ENDSSH

# 5. 验证部署
log_info "验证部署..."
FILE_COUNT=$(ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "find ${APP_DIR} -type f | wc -l")
log_info "部署文件数：${FILE_COUNT}"

# 6. 显示磁盘使用情况
log_info "磁盘使用情况:"
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "du -sh ${APP_DIR} ${BACKUP_DIR} 2>/dev/null"

echo "=========================================="
log_info "✅ 部署成功完成！"
echo "=========================================="
```

---

## 排除文件配置

### .rsync-filter

```
# rsync 排除规则文件
# 使用方法：--filter="merge .rsync-filter"

# Git 相关
- .git/
- .gitignore
- .gitattributes

# 依赖目录
- node_modules/
- vendor/
- __pycache__/

# 构建产物（如果需要重新构建）
- dist/
- build/
- target/

# 环境文件
- .env
- .env.*
- *.env

# 日志和缓存
- *.log
- .cache/
- .npm/

# 系统文件
- .DS_Store
- Thumbs.db
- desktop.ini

# 文档（可选）
- README.md
- docs/

# 测试
- test/
- tests/
- *.test.js
- *.spec.js

# IDE
- .vscode/
- .idea/
- *.swp
- *.swo
```

### 使用排除文件的部署脚本

```bash
#!/bin/bash
set -e

DEPLOY_HOST="${DEPLOY_HOST:?请设置 DEPLOY_HOST}"
LOCAL_DIR="${1:-./dist}"

rsync -avz \
    --delete \
    --progress \
    --filter="merge .rsync-filter" \
    -e "ssh -p 22" \
    "${LOCAL_DIR}/" \
    "root@${DEPLOY_HOST}:/var/www/myapp/"
```

---

## 批量部署脚本

### deploy-multiple-servers.sh

```bash
#!/bin/bash
set -e

# 服务器列表
SERVERS=(
    "server1.example.com"
    "server2.example.com"
    "192.168.1.100"
    "192.168.1.101"
)

DEPLOY_USER="${DEPLOY_USER:-root}"
APP_NAME="${APP_NAME:-myapp}"
APP_DIR="/var/www/${APP_NAME}"
LOCAL_DIR="${1:-./dist}"

echo "🔄 开始批量部署到 ${#SERVERS[@]} 台服务器..."

for SERVER in "${SERVERS[@]}"; do
    echo ""
    echo "=========================================="
    echo "📍 部署到：${SERVER}"
    echo "=========================================="
    
    export DEPLOY_HOST="${SERVER}"
    
    if ./deploy-rsync.sh "${LOCAL_DIR}"; then
        echo "✅ ${SERVER} 部署成功"
    else
        echo "❌ ${SERVER} 部署失败"
    fi
done

echo ""
echo "=========================================="
echo "📊 批量部署完成"
echo "=========================================="
```

---

## 定时同步（Cron）

### 设置定时任务

```bash
# 编辑 crontab
crontab -e

# 每 5 分钟同步一次（适用于持续集成场景）
*/5 * * * * /path/to/deploy-rsync.sh /path/to/dist >> /var/log/deploy.log 2>&1

# 每天凌晨 2 点同步
0 2 * * * /path/to/deploy-rsync.sh /path/to/dist >> /var/log/deploy.log 2>&1
```

### 带锁的定时任务脚本

```bash
#!/bin/bash
# deploy-cron.sh - 防止并发执行

LOCKFILE="/tmp/deploy-rsync.lock"

# 检查是否已有进程在运行
if [ -f "${LOCKFILE}" ]; then
    PID=$(cat "${LOCKFILE}")
    if kill -0 "${PID}" 2>/dev/null; then
        echo "部署已在进行中 (PID: ${PID})"
        exit 1
    fi
fi

# 创建锁文件
echo $$ > "${LOCKFILE}"
trap "rm -f ${LOCKFILE}" EXIT

# 执行部署
/path/to/deploy-rsync.sh /path/to/dist
```

---

## 回滚脚本

### rollback.sh

```bash
#!/bin/bash
set -e

DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="${DEPLOY_HOST:?请设置 DEPLOY_HOST}"
APP_NAME="${APP_NAME:-myapp}"
APP_DIR="/var/www/${APP_NAME}"
BACKUP_DIR="/var/backups/${APP_NAME}"

echo "🔄 可用备份:"
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" "ls -lt ${BACKUP_DIR}/"

echo ""
read -p "输入要回滚的备份名称（例如 backup_20240101_120000）: " BACKUP_NAME

if [ -z "${BACKUP_NAME}" ]; then
    echo "❌ 未指定备份名称"
    exit 1
fi

BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "⚠️  即将回滚到：${BACKUP_PATH}"
read -p "确认？(y/n): " CONFIRM

if [ "${CONFIRM}" != "y" ]; then
    echo "❌ 取消回滚"
    exit 0
fi

# 执行回滚
ssh "${DEPLOY_USER}@${DEPLOY_HOST}" << ENDSSH
set -e

# 备份当前版本
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
if [ -d "${APP_DIR}" ]; then
    cp -r ${APP_DIR} ${BACKUP_DIR}/pre-rollback_${TIMESTAMP}
fi

# 恢复备份
rm -rf ${APP_DIR}
cp -r ${BACKUP_PATH} ${APP_DIR}

# 设置权限
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}

echo "✅ 回滚完成"
ENDSSH

echo "✅ 回滚成功！"
```

---

## 使用步骤

### 1. 配置 SSH 密钥

```bash
# 生成密钥（如果没有）
ssh-keygen -t ed25519 -C "deploy@myapp"

# 复制公钥到服务器
ssh-copy-id -p 22 root@your.server.ip
```

### 2. 测试连接

```bash
ssh root@your.server.ip "echo 连接成功"
```

### 3. 执行部署

```bash
# 设置环境变量
export DEPLOY_HOST="your.server.ip"
export APP_NAME="myapp"

# 执行部署
./deploy-rsync.sh ./dist

# 或使用高级版本
./deploy-rsync-advanced.sh ./dist
```

---

## 性能优化

### rsync 优化选项

```bash
# 大文件传输优化
rsync -avz \
    --inplace \              # 就地更新（减少磁盘 IO）
    --no-compress \          # 如果网络快，禁用压缩
    --partial \              # 保留部分传输的文件
    --bwlimit=10000 \        # 限制带宽（KB/s）
    source/ dest/

# 大量小文件优化
rsync -avz \
    --omit-dir-times \       # 不更新时间戳
    --no-perms \             # 不保留权限
    --no-owner \             # 不保留所有者
    --no-group \             # 不保留组
    source/ dest/
```

---

## 故障排查

### 常见问题

1. **权限拒绝**
   ```bash
   # 检查 SSH 密钥权限
   chmod 600 ~/.ssh/id_ed25519
   
   # 检查服务器目录权限
   ssh root@server "chown -R www-data:www-data /var/www/myapp"
   ```

2. **连接超时**
   ```bash
   # 增加超时时间
   rsync -e "ssh -o ConnectTimeout=30" ...
   ```

3. **磁盘空间不足**
   ```bash
   # 检查磁盘空间
   ssh root@server "df -h"
   
   # 清理旧备份
   ssh root@server "find /var/backups -name 'backup_*' -mtime +30 -delete"
   ```
