#!/bin/bash

# ============================================
# 7zi-frontend 快速部署脚本（简化版）
# 用于开发和小型部署场景
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_HOST="7zi.com"
SERVER_USER="root"
SERVER_PASS='ge20993344$ZZ'
DEPLOY_PATH="/opt/7zi-frontend"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

ssh_cmd() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "$1"
}

# 快速部署（仅同步代码和重启）
quick_deploy() {
    log_info "⚡ 快速部署..."

    # 同步代码
    log_step "同步代码..."
    rsync -avz --delete \
        --exclude '.git' \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude 'coverage' \
        --exclude '*.log' \
        -e "sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no" \
        "$SCRIPT_DIR/" "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"

    # 重启服务
    log_step "重启服务..."
    ssh_cmd "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml restart"

    # 健康检查
    log_step "健康检查..."
    local max_attempts=10
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if ssh_cmd "curl -sf http://localhost:3000/ > /dev/null 2>&1"; then
            log_info "✅ 健康检查通过"
            break
        fi
        echo "尝试 $attempt/$max_attempts..."
        sleep 3
        attempt=$((attempt + 1))
    done

    log_info "快速部署完成"
}

case "${1:-}" in
    deploy)
        quick_deploy
        ;;
    *)
        echo "用法: $0 deploy"
        exit 1
        ;;
esac
