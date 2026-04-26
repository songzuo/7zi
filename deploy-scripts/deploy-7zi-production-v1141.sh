#!/bin/bash
set -e

# ==========================================
# 7zi-frontend 部署脚本 - 生产环境 v1.14.1
# 目标: 165.99.43.61 (直接 IP，绕过 Cloudflare SSH 阻断)
# ==========================================

DEPLOY_HOST="165.99.43.61"
DEPLOY_USER="root"
DEPLOY_PORT="22"
DEPLOY_PASSWORD='ge20993344$ZZ'
APP_NAME="7zi-frontend"
APP_DIR="/var/www/7zi/7zi-frontend"
BACKUP_DIR="/var/backups/7zi"
LOCAL_BUILD_DIR="/root/.openclaw/workspace/.next/standalone"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 打印头部
echo ""
echo -e "${CYAN}=========================================="
echo -e "🚀 7zi-frontend 部署到生产环境 v1.14.1"
echo -e "==========================================${NC}"
log_info "目标服务器: ${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PORT}"
log_info "部署目录: ${APP_DIR}"
echo ""

# 步骤 1: 检查本地构建
log_info "检查本地构建目录..."
if [ ! -d "${LOCAL_BUILD_DIR}" ]; then
    log_error "本地构建目录不存在: ${LOCAL_BUILD_DIR}"
    log_info "请先运行构建: cd /root/.openclaw/workspace && npm run build"
    exit 1
fi

FILE_COUNT=$(find "${LOCAL_BUILD_DIR}" -type f | wc -l)
BUILD_SIZE=$(du -sh "${LOCAL_BUILD_DIR}" | cut -f1)
log_success "本地构建正常 (${FILE_COUNT} 个文件, ${BUILD_SIZE})"

# 步骤 2: 检查服务器连接和磁盘空间
log_info "检查服务器连接..."
if sshpass -p "${DEPLOY_PASSWORD}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
    "${DEPLOY_USER}@${DEPLOY_HOST}" "echo 'SSH OK' && df -h / | tail -1"; then
    log_success "SSH 连接正常"
else
    log_error "无法连接到服务器"
    exit 1
fi

# 步骤 3: 检查磁盘空间
log_info "检查磁盘空间..."
DISK_USAGE=$(sshpass -p "${DEPLOY_PASSWORD}" ssh -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" "df / | tail -1 | awk '{print \$5}'" | sed 's/%//')

if [ "${DISK_USAGE}" -gt 85 ]; then
    log_warn "磁盘使用率 ${DISK_USAGE}%，建议清理"
    log_info "清理建议: rm -rf /var/cache/apt/archives/* /tmp/* /root/.npm/_cacache/*"
fi

# 步骤 4: 创建备份
log_info "创建备份 (${TIMESTAMP})..."
sshpass -p "${DEPLOY_PASSWORD}" ssh -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" << 'ENDSSH'
mkdir -p /var/backups/7zi
if [ -d "/var/www/7zi/7zi-frontend/.next/standalone" ]; then
    cp -r /var/www/7zi/7zi-frontend/.next/standalone /var/backups/7zi/standalone_backup_$(date +%Y%m%d_%H%M%S)
    echo "BACKUP_CREATED"
else
    echo "NO_BACKUP_NEEDED"
fi
ENDSSH

if [ $? -eq 0 ]; then
    log_success "备份完成"
else
    log_warn "备份失败，继续部署..."
fi

# 步骤 5: 同步文件
log_info "同步文件到服务器..."

# 先同步整个 .next 目录
sshpass -p "${DEPLOY_PASSWORD}" rsync -avz \
    --exclude='node_modules' \
    --exclude='.git' \
    --progress \
    /root/.openclaw/workspace/.next/ \
    "${DEPLOY_USER}@${DEPLOY_HOST}:/var/www/7zi/7zi-frontend/.next/"

log_success "文件同步完成"

# 步骤 6: 设置权限
log_info "设置文件权限..."
sshpass -p "${DEPLOY_PASSWORD}" ssh -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" << 'ENDSSH'
chown -R root:root /var/www/7zi/7zi-frontend/.next/standalone
chmod -R 755 /var/www/7zi/7zi-frontend/.next/standalone
find /var/www/7zi/7zi-frontend/.next/standalone -type d -exec chmod 755 {} \;
find /var/www/7zi/7zi-frontend/.next/standalone -type f -exec chmod 644 {} \;
echo "PERMISSION_OK"
ENDSSH

log_success "权限设置完成"

# 步骤 7: PM2 重启
log_info "PM2 重启应用..."
sshpass -p "${DEPLOY_PASSWORD}" ssh -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" "pm2 restart 7zi-main --update-env"

sleep 5

# 步骤 8: 验证部署
log_info "验证部署..."
STATUS=$(sshpass -p "${DEPLOY_PASSWORD}" ssh -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" "pm2 status 7zi-main | grep -E 'online|errored' | awk '{print \$4}'")

if [ "${STATUS}" = "online" ]; then
    log_success "✅ 部署成功！7zi-main 状态: ${STATUS}"
else
    log_error "⚠️ 部署完成但状态异常: ${STATUS}"
    log_info "查看日志: pm2 logs 7zi-main --nostream --lines 30"
fi

# 步骤 9: 检查错误日志
log_info "最近错误日志:"
sshpass -p "${DEPLOY_PASSWORD}" ssh -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" "pm2 logs 7zi-main --nostream --lines 10 --err" 2>/dev/null | grep -E 'Error|error|Failed' | head -5 || true

echo ""
echo -e "${CYAN}=========================================="
echo -e "✅ 部署流程完成！"
echo -e "==========================================${NC}"
log_info "验证地址: https://7zi.com"
log_info "查看状态: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'pm2 status'"
log_info "查看日志: ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'pm2 logs 7zi-main'"
echo ""
