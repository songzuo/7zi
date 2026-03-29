#!/bin/bash
# ============================================
# 回滚脚本 - Rollback Script
# ============================================
# 用途：一键回滚到上一个稳定版本
# 用法：./scripts/deploy/rollback.sh [blue|green]
# ============================================

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 配置
TARGET_ENV="${1:-auto}"
BLUE_CONTAINER="7zi-frontend-blue"
GREEN_CONTAINER="7zi-frontend-green"
BLUE_BACKUP="7zi-frontend-blue-backup"
GREEN_BACKUP="7zi-frontend-green-backup"
BLUE_PORT=3000
GREEN_PORT=3001
NGINX_CONFIG="/etc/nginx/sites-available/7zi.com"

# 确定回滚目标
determine_rollback_target() {
    local current_active=""

    if docker ps | grep -q "${BLUE_CONTAINER}"; then
        current_active="blue"
    elif docker ps | grep -q "${GREEN_CONTAINER}"; then
        current_active="green"
    fi

    if [ "$TARGET_ENV" = "auto" ]; then
        if [ "$current_active" = "blue" ]; then
            echo "green"
        elif [ "$current_active" = "green" ]; then
            echo "blue"
        else
            log_error "Cannot determine current active environment"
            exit 1
        fi
    else
        echo "$TARGET_ENV"
    fi
}

# 执行回滚
perform_rollback() {
    local rollback_env="$1"
    local current_env="$2"
    local rollback_container="7zi-frontend-${rollback_env}"
    local backup_container="7zi-frontend-${rollback_env}-backup"
    local current_container="7zi-frontend-${current_env}"
    local port=""

    if [ "$rollback_env" = "blue" ]; then
        port=$BLUE_PORT
    else
        port=$GREEN_PORT
    fi

    log_info "Rolling back from ${current_env} to ${rollback_env}..."

    # 1. 检查备份容器是否存在
    if ! docker ps -a | grep -q "${backup_container}"; then
        log_error "Backup container ${backup_container} not found!"
        log_info "Available containers:"
        docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
        exit 1
    fi

    # 2. 停止当前容器
    log_info "Stopping current container ${current_container}..."
    docker stop "${current_container}" || true

    # 3. 将备份容器重命名为主容器
    log_info "Restoring backup container..."
    docker rename "${backup_container}" "${rollback_container}"

    # 4. 启动回滚的容器
    log_info "Starting ${rollback_container}..."
    docker start "${rollback_container}"

    # 5. 健康检查
    log_info "Performing health check..."
    sleep 5

    if ! docker exec "${rollback_container}" curl -f -s "http://localhost:3000/api/health" > /dev/null 2>&1; then
        log_error "Health check failed for ${rollback_container}!"
        exit 1
    fi

    log_success "Health check passed!"

    # 6. 更新 Nginx 配置
    log_info "Updating Nginx configuration..."
    cat > "${NGINX_CONFIG}.tmp" << EOF
server {
    listen 80;
    server_name 7zi.com www.7zi.com;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 7zi.com www.7zi.com;

    ssl_certificate /etc/letsencrypt/live/7zi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/7zi.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /_next/static/ {
        proxy_pass http://127.0.0.1:${port};
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }

    location /static/ {
        proxy_pass http://127.0.0.1:${port};
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public";
    }
}
EOF

    if nginx -t -c "${NGINX_CONFIG}.tmp"; then
        mv "${NGINX_CONFIG}.tmp" "${NGINX_CONFIG}"
        systemctl reload nginx
        log_success "Nginx configuration updated and reloaded"
    else
        log_error "Nginx configuration is invalid!"
        exit 1
    fi

    # 7. 标记当前容器为备份
    log_info "Marking ${current_container} as backup..."
    docker rename "${current_container}" "${current_container}-backup" || true

    # 8. 运行验证测试
    log_info "Running deployment verification..."
    if /root/.openclaw/workspace/7zi-frontend/scripts/deploy/verify-deploy.sh production; then
        log_success "Verification passed!"
    else
        log_warning "Verification failed, but rollback completed"
    fi
}

# 主流程
main() {
    log_info "========================================"
    log_info "  Rollback Script"
    log_info "========================================"
    log_info ""

    # 显示当前状态
    log_info "Current container status:"
    docker ps --filter "name=7zi-frontend" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
    log_info ""

    # 确认回滚
    if [ "${2:-}" != "--force" ]; then
        read -p "Are you sure you want to rollback? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "Rollback cancelled"
            exit 0
        fi
    fi

    # 确定回滚目标
    local current_active=""
    if docker ps | grep -q "${BLUE_CONTAINER}"; then
        current_active="blue"
    elif docker ps | grep -q "${GREEN_CONTAINER}"; then
        current_active="green"
    fi

    local rollback_target=$(determine_rollback_target)

    log_info "Current active: ${current_active}"
    log_info "Rolling back to: ${rollback_target}"
    log_info ""

    # 执行回滚
    perform_rollback "$rollback_target" "$current_active"

    # 总结
    log_info ""
    log_success "========================================"
    log_success "  Rollback Completed Successfully!"
    log_success "========================================"
    log_success "Previous Active: ${current_active}"
    log_success "New Active: ${rollback_target}"
    log_success "========================================"
}

# 运行主流程
main "$@"
