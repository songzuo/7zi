#!/bin/bash
set -e

# ==========================================
# rsync 部署脚本
# ==========================================

# 配置
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="${DEPLOY_HOST:?❌ 请设置 DEPLOY_HOST 环境变量}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
APP_NAME="${APP_NAME:-myapp}"
APP_DIR="/var/www/${APP_NAME}"
BACKUP_DIR="/var/backups/${APP_NAME}"
LOCAL_DIR="${1:-./dist}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_ed25519}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=========================================="
echo "🔄 rsync 部署"
echo "=========================================="
log_info "源目录：${LOCAL_DIR}"
log_info "目标服务器：${DEPLOY_USER}@${DEPLOY_HOST}:${APP_DIR}"
log_info "备份目录：${BACKUP_DIR}"
echo ""

# 检查源目录
if [ ! -d "${LOCAL_DIR}" ]; then
    log_error "源目录不存在：${LOCAL_DIR}"
    exit 1
fi

# 检查连接
log_info "检查服务器连接..."
if ! ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o ConnectTimeout=10 \
    "${DEPLOY_USER}@${DEPLOY_HOST}" "echo '连接成功'" > /dev/null 2>&1; then
    log_error "无法连接到服务器"
    exit 1
fi
log_success "服务器连接正常"

# 创建备份（如果远程目录存在）
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

# 执行同步
log_info "开始同步文件..."
rsync -avz \
    --delete \
    --progress \
    -e "ssh -p ${DEPLOY_PORT} -i ${SSH_KEY}" \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    "${LOCAL_DIR}/" \
    "${DEPLOY_USER}@${DEPLOY_HOST}:${APP_DIR}/"

# 设置权限
log_info "设置权限..."
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" "${DEPLOY_USER}@${DEPLOY_HOST}" << ENDSSH
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}
find ${APP_DIR} -type f -name "*.sh" -exec chmod +x {} \\;
echo "✅ 权限设置完成"
ENDSSH

# 验证部署
log_info "验证部署..."
FILE_COUNT=$(ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "find ${APP_DIR} -type f | wc -l")
log_info "部署文件数：${FILE_COUNT}"

# 显示磁盘使用情况
log_info "磁盘使用情况:"
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "du -sh ${APP_DIR} ${BACKUP_DIR} 2>/dev/null || echo '无法获取磁盘使用情况'"

echo ""
echo "=========================================="
log_success "部署成功完成！"
echo "=========================================="
echo ""
echo "💡 回滚命令:"
echo "   ssh ${DEPLOY_HOST} 'ls -lt ${BACKUP_DIR}/'"
echo "   ssh ${DEPLOY_HOST} 'cp -r ${BACKUP_DIR}/backup_YYYYMMDD_HHMMSS ${APP_DIR}'"
