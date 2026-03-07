#!/bin/bash
set -e

# ==========================================
# 7zi-frontend 部署脚本 - bot5.szspd.cn
# 一键部署脚本 - 包含备份、验证、回滚支持
# ==========================================

# 配置
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="bot5.szspd.cn"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
APP_NAME="7zi-frontend"
APP_DIR="/var/www/${APP_NAME}"
BACKUP_DIR="/var/backups/${APP_NAME}"
LOCAL_BUILD_DIR="${1:-/root/7zi-project/7zi-frontend/out}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_ed25519}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

print_header() {
    echo ""
    echo -e "${CYAN}=========================================="
    echo -e "$1"
    echo -e "==========================================${NC}"
}

# 打印头部
print_header "🚀 7zi-frontend 部署到 bot5.szspd.cn"
log_info "📦 本地目录：${LOCAL_BUILD_DIR}"
log_info "🖥️  服务器：${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PORT}"
log_info "📁 部署目录：${APP_DIR}"
log_info "💾 备份目录：${BACKUP_DIR}"
echo ""

# 步骤 1: 检查本地构建目录
log_step "检查本地构建目录..."
if [ ! -d "${LOCAL_BUILD_DIR}" ]; then
    log_error "本地构建目录不存在：${LOCAL_BUILD_DIR}"
    log_info "💡 提示：先运行构建命令："
    echo "   cd ~/7zi-project/7zi-frontend && npm run build"
    exit 1
fi

# 检查是否有文件
FILE_COUNT=$(find "${LOCAL_BUILD_DIR}" -type f | wc -l)
if [ "${FILE_COUNT}" -eq 0 ]; then
    log_error "本地构建目录为空：${LOCAL_BUILD_DIR}"
    log_info "💡 提示：先运行构建命令生成静态文件"
    exit 1
fi
log_success "本地构建目录正常 (${FILE_COUNT} 个文件)"

# 步骤 2: 检查 SSH 连接
log_step "检查 SSH 连接..."
if ! ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o StrictHostKeyChecking=no -o ConnectTimeout=10 \
    "${DEPLOY_USER}@${DEPLOY_HOST}" "echo 'SSH 连接成功'" 2>/dev/null; then
    log_error "无法连接到服务器 ${DEPLOY_HOST}"
    log_info "💡 提示：检查以下项目："
    echo "   1. SSH 密钥是否正确：~/.ssh/id_ed25519"
    echo "   2. 服务器 IP 是否被封锁"
    echo "   3. 网络连接是否正常"
    echo "   4. SSH 端口是否开放"
    exit 1
fi
log_success "SSH 连接正常"

# 步骤 3: 创建备份（如果远程目录存在且有内容）
log_step "创建远程备份..."
BACKUP_RESULT=$(ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" << ENDSSH
if [ -d "${APP_DIR}" ] && [ "\$(ls -A ${APP_DIR} 2>/dev/null)" ]; then
    mkdir -p ${BACKUP_DIR}
    cp -r ${APP_DIR} ${BACKUP_DIR}/backup_${TIMESTAMP}
    echo "BACKUP_CREATED:${BACKUP_DIR}/backup_${TIMESTAMP}"
    
    # 保留最近 5 个备份
    cd ${BACKUP_DIR}
    BACKUP_COUNT=\$(ls -dt backup_* 2>/dev/null | wc -l)
    if [ "\$BACKUP_COUNT" -gt 5 ]; then
        ls -dt backup_* | tail -n +6 | xargs -r rm -rf
        echo "BACKUP_CLEANED: 旧备份已清理"
    fi
else
    echo "NO_EXISTING_DEPLOY: 无现有部署，跳过备份"
fi
ENDSSH
)
echo "${BACKUP_RESULT}" | grep -E "^(BACKUP_CREATED|BACKUP_CLEANED|NO_EXISTING_DEPLOY)" || true
if echo "${BACKUP_RESULT}" | grep -q "BACKUP_CREATED"; then
    log_success "备份完成"
else
    log_info "无需备份（首次部署）"
fi

# 步骤 4: 在服务器创建目录
log_step "创建远程目录..."
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "mkdir -p ${APP_DIR} ${BACKUP_DIR}"
log_success "远程目录已创建"

# 步骤 5: 同步文件
log_step "上传文件到服务器..."
rsync -avz -e "ssh -p ${DEPLOY_PORT} -i ${SSH_KEY}" \
    --delete \
    --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='.DS_Store' \
    "${LOCAL_BUILD_DIR}/" \
    "${DEPLOY_USER}@${DEPLOY_HOST}:${APP_DIR}/"
log_success "文件同步完成"

# 步骤 6: 设置权限
log_step "设置文件权限..."
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" << ENDSSH
chown -R www-data:www-data ${APP_DIR}
chmod -R 755 ${APP_DIR}
find ${APP_DIR} -type d -exec chmod 755 {} \\;
find ${APP_DIR} -type f -exec chmod 644 {} \\;
echo "✅ 权限设置完成"
ENDSSH
log_success "权限设置完成"

# 步骤 7: 配置 Nginx
log_step "配置 Nginx..."
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" << 'ENDSSH'
cat > /etc/nginx/sites-available/7zi-frontend << 'NGINX_EOF'
server {
    listen 80;
    server_name bot5.szspd.cn;
    
    root /var/www/7zi-frontend;
    index index.html;
    
    access_log /var/log/nginx/7zi-frontend-access.log;
    error_log /var/log/nginx/7zi-frontend-error.log;
    
    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/javascript application/javascript application/json application/xml;
}
NGINX_EOF

# 启用站点
ln -sf /etc/nginx/sites-available/7zi-frontend /etc/nginx/sites-enabled/

# 测试 Nginx 配置
if nginx -t 2>&1; then
    echo "✅ Nginx 配置测试通过"
else
    echo "❌ Nginx 配置测试失败"
    exit 1
fi
ENDSSH
log_success "Nginx 配置完成"

# 步骤 8: 重载 Nginx
log_step "重载 Nginx 服务..."
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "systemctl reload nginx"
log_success "Nginx 已重载"

# 步骤 9: 验证部署
log_step "验证部署..."
REMOTE_FILE_COUNT=$(ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "find ${APP_DIR} -type f | wc -l")
log_info "远程文件数：${REMOTE_FILE_COUNT}"

# 检查首页是否存在
if ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "[ -f ${APP_DIR}/index.html ] && echo 'OK'"; then
    log_success "index.html 存在"
else
    log_warn "index.html 不存在，请检查构建输出"
fi

# 显示磁盘使用情况
log_info "磁盘使用情况:"
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "du -sh ${APP_DIR} 2>/dev/null || echo '无法获取'"

# 完成
print_header "✅ 部署完成！"
log_success "🌐 访问地址：http://${DEPLOY_HOST}"
echo ""
log_info "💡 验证部署:"
echo "   curl -I http://${DEPLOY_HOST}"
echo ""
log_info "💡 查看日志:"
echo "   ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'tail -f /var/log/nginx/7zi-frontend-error.log'"
echo ""
log_info "💡 回滚命令:"
echo "   ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'ls -lt ${BACKUP_DIR}/'"
echo "   ssh ${DEPLOY_USER}@${DEPLOY_HOST} 'cp -r ${BACKUP_DIR}/backup_YYYYMMDD_HHMMSS ${APP_DIR}'"
echo ""
