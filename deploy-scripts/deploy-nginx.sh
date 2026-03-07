#!/bin/bash
set -e

# ==========================================
# Nginx 部署脚本
# ==========================================

# 配置
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_HOST="${DEPLOY_HOST:?❌ 请设置 DEPLOY_HOST 环境变量}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
APP_NAME="${APP_NAME:-myapp}"
APP_DIR="/var/www/${APP_NAME}"
LOCAL_BUILD_DIR="${1:-./dist}"
SSH_KEY="${SSH_KEY:-~/.ssh/id_ed25519}"

echo "=========================================="
echo "🚀 Nginx 部署"
echo "=========================================="
echo "📦 本地目录：${LOCAL_BUILD_DIR}"
echo "🖥️  服务器：${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_PORT}"
echo "📁 部署目录：${APP_DIR}"
echo ""

# 检查本地构建目录
if [ ! -d "${LOCAL_BUILD_DIR}" ]; then
    echo "❌ 错误：本地构建目录不存在：${LOCAL_BUILD_DIR}"
    echo "💡 提示：先运行构建命令，如：npm run build"
    exit 1
fi

# 在服务器创建目录
echo "📁 创建远程目录..."
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "mkdir -p ${APP_DIR}"

# 同步文件
echo "📤 上传文件..."
rsync -avz -e "ssh -p ${DEPLOY_PORT} -i ${SSH_KEY}" \
    --delete \
    --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='*.log' \
    "${LOCAL_BUILD_DIR}/" \
    "${DEPLOY_USER}@${DEPLOY_HOST}:${APP_DIR}/"

# 设置权限
echo "🔐 设置权限..."
ssh -p "${DEPLOY_PORT}" -i "${SSH_KEY}" -o StrictHostKeyChecking=no \
    "${DEPLOY_USER}@${DEPLOY_HOST}" \
    "chown -R www-data:www-data ${APP_DIR} && chmod -R 755 ${APP_DIR}"

echo ""
echo "=========================================="
echo "✅ 部署完成！"
echo "=========================================="
echo "🌐 访问地址：http://${DEPLOY_HOST}"
echo ""
echo "💡 下一步:"
echo "   1. 配置 Nginx: /etc/nginx/sites-available/${APP_NAME}"
echo "   2. 启用站点：ln -s /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/"
echo "   3. 重载 Nginx: systemctl reload nginx"
