#!/bin/bash
# ============================================
# 滚动更新脚本 - Rolling Deployment
# ============================================
# 用途：无停机滚动更新，适合单服务器环境
# 用法：./scripts/deploy/rolling-deploy.sh <image-tag>
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
IMAGE_TAG="${1:-latest}"
CONTAINER_NAME="7zi-frontend"
CONTAINER_PORT=3000
HEALTH_CHECK_URL="http://localhost:${CONTAINER_PORT}/api/health"
HEALTH_CHECK_TIMEOUT=60
HEALTH_CHECK_INTERVAL=5

# 健康检查
health_check() {
    local url="$1"
    local attempt=1
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))

    log_info "Performing health check..."

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null 2>&1; then
            log_success "Health check passed!"
            return 0
        fi

        log_info "Attempt ${attempt}/${max_attempts} failed. Retrying in ${HEALTH_CHECK_INTERVAL}s..."
        sleep $HEALTH_CHECK_INTERVAL
        ((attempt++))
    done

    log_error "Health check failed after ${max_attempts} attempts"
    return 1
}

# 检查容器是否存在
check_container() {
    if ! docker ps -a | grep -q "${CONTAINER_NAME}"; then
        log_error "Container ${CONTAINER_NAME} not found"
        exit 1
    fi
}

# 备份当前容器
backup_container() {
    log_info "Creating backup of current container..."

    # 获取当前运行的镜像
    CURRENT_IMAGE=$(docker inspect --format='{{.Config.Image}}' "${CONTAINER_NAME}")

    # 创建备份容器（停止状态）
    docker create \
        --name "${CONTAINER_NAME}-backup" \
        --restart unless-stopped \
        -p "${CONTAINER_PORT}:3000" \
        --env-file /root/.env.production \
        "$CURRENT_IMAGE"

    log_success "Backup container created: ${CONTAINER_NAME}-backup"
}

# 拉取新镜像
pull_new_image() {
    log_info "Pulling new image: ${IMAGE_TAG}..."

    if ! docker pull "${IMAGE_TAG}"; then
        log_error "Failed to pull image: ${IMAGE_TAG}"
        exit 1
    fi

    log_success "New image pulled successfully"
}

# 部署新容器
deploy_new_container() {
    log_info "Deploying new container..."

    # 创建新容器（不同的名称和端口）
    NEW_CONTAINER_NAME="${CONTAINER_NAME}-new"
    NEW_CONTAINER_PORT=$((CONTAINER_PORT + 1))

    # 停止并删除旧的临时容器
    if docker ps -a | grep -q "${NEW_CONTAINER_NAME}"; then
        docker stop "${NEW_CONTAINER_NAME}" || true
        docker rm "${NEW_CONTAINER_NAME}" || true
    fi

    # 创建新容器
    docker run -d \
        --name "${NEW_CONTAINER_NAME}" \
        --restart unless-stopped \
        -p "${NEW_CONTAINER_PORT}:3000" \
        --env-file /root/.env.production \
        "${IMAGE_TAG}"

    log_success "New container started: ${NEW_CONTAINER_NAME}"

    # 健康检查
    local new_health_url="http://localhost:${NEW_CONTAINER_PORT}/api/health"
    if ! health_check "$new_health_url"; then
        log_error "New container health check failed!"
        log_info "Rolling back to old container..."

        # 清理新容器
        docker stop "${NEW_CONTAINER_NAME}" || true
        docker rm "${NEW_CONTAINER_NAME}" || true

        # 恢复备份容器
        docker start "${CONTAINER_NAME}-backup" || true
        exit 1
    fi

    log_success "New container health check passed!"
}

# 更新 Nginx 配置
update_nginx_config() {
    local port="$1"
    local config="/etc/nginx/sites-available/7zi.com"

    log_info "Updating Nginx configuration to port ${port}..."

    cat > "${config}.tmp" << EOF
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

    # 验证并应用配置
    if nginx -t -c "${config}.tmp"; then
        mv "${config}.tmp" "${config}"
        systemctl reload nginx
        log_success "Nginx configuration updated"
    else
        log_error "Nginx configuration validation failed!"
        return 1
    fi
}

# 切换流量
switch_traffic() {
    log_info "Switching traffic to new container..."

    # 更新 Nginx 配置到新端口
    update_nginx_config "$((CONTAINER_PORT + 1))"

    # 等待 Nginx 生效
    sleep 5

    # 最终健康检查
    if ! health_check "https://7zi.com/api/health"; then
        log_error "Post-switch health check failed!"
        log_info "Rolling back..."

        # 回滚到原容器
        update_nginx_config "${CONTAINER_PORT}"

        # 停止新容器
        docker stop "${CONTAINER_NAME}-new" || true
        docker rm "${CONTAINER_NAME}-new" || true

        exit 1
    fi

    log_success "Traffic switch completed!"
}

# 清理
cleanup() {
    log_info "Cleaning up..."

    # 停止旧容器
    if docker ps | grep -q "${CONTAINER_NAME}"; then
        docker stop "${CONTAINER_NAME}" || true
        docker rm "${CONTAINER_NAME}" || true
    fi

    # 停止备份容器
    if docker ps | grep -q "${CONTAINER_NAME}-backup"; then
        docker stop "${CONTAINER_NAME}-backup" || true
        docker rm "${CONTAINER_NAME}-backup" || true
    fi

    # 重命名新容器为主容器
    if docker ps | grep -q "${CONTAINER_NAME}-new"; then
        docker stop "${CONTAINER_NAME}-new"
        docker rename "${CONTAINER_NAME}-new" "${CONTAINER_NAME}"
        docker start "${CONTAINER_NAME}"
    fi

    # 恢复标准 Nginx 配置
    update_nginx_config "${CONTAINER_PORT}"

    log_success "Cleanup completed"
}

# 主流程
main() {
    log_info "========================================"
    log_info "  Rolling Deployment Script"
    log_info "========================================"
    log_info "Image: ${IMAGE_TAG}"
    log_info ""

    # 检查容器
    check_container

    # 备份当前容器
    backup_container

    # 拉取新镜像
    pull_new_image

    # 部署新容器
    deploy_new_container

    # 切换流量
    switch_traffic

    # 清理
    cleanup

    # 总结
    log_info ""
    log_success "========================================"
    log_success "  Rolling Deployment Completed!"
    log_success "========================================"
    log_success "Container: ${CONTAINER_NAME}"
    log_success "Image: ${IMAGE_TAG}"
    log_success "Port: ${CONTAINER_PORT}"
    log_success "========================================"
}

# 运行主流程
main "$@"
