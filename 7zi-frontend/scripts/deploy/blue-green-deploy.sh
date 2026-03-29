#!/bin/bash
# ============================================
# 蓝绿部署脚本 - Blue-Green Deployment
# ============================================
# 用途：实现零停机部署，蓝绿环境切换
# 用法：./scripts/deploy/blue-green-deploy.sh [blue|green] [image-tag]
# ============================================

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
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
DEPLOY_MODE="${1:-auto}"
IMAGE_TAG="${2:-latest}"
BLUE_CONTAINER="7zi-frontend-blue"
GREEN_CONTAINER="7zi-frontend-green"
BLUE_PORT=3000
GREEN_PORT=3001
NGINX_CONFIG="/etc/nginx/sites-available/7zi.com"
HEALTH_CHECK_URL="http://localhost:${BLUE_PORT}/api/health"
HEALTH_CHECK_TIMEOUT=60
HEALTH_CHECK_INTERVAL=5

# 获取当前活跃环境
get_active_environment() {
    if docker ps | grep -q "${BLUE_CONTAINER}"; then
        echo "green"
    elif docker ps | grep -q "${GREEN_CONTAINER}"; then
        echo "blue"
    else
        echo "none"
    fi
}

# 获取待部署环境
get_deploy_environment() {
    local active=$(get_active_environment)

    if [ "$DEPLOY_MODE" = "auto" ]; then
        if [ "$active" = "blue" ]; then
            echo "green"
        elif [ "$active" = "green" ]; then
            echo "blue"
        else
            echo "blue"  # 默认部署到 blue
        fi
    else
        echo "$DEPLOY_MODE"
    fi
}

# 健康检查
health_check() {
    local container_name="$1"
    local port="$2"
    local url="http://localhost:${port}/api/health"
    local attempt=1
    local max_attempts=$((HEALTH_CHECK_TIMEOUT / HEALTH_CHECK_INTERVAL))

    log_info "Checking health of ${container_name}..."

    while [ $attempt -le $max_attempts ]; do
        if docker exec "${container_name}" curl -f -s "${url}" > /dev/null 2>&1; then
            log_success "Health check passed for ${container_name}!"
            return 0
        fi

        log_info "Attempt ${attempt}/${max_attempts} failed. Retrying in ${HEALTH_CHECK_INTERVAL}s..."
        sleep $HEALTH_CHECK_INTERVAL
        ((attempt++))
    done

    log_error "Health check failed for ${container_name} after ${max_attempts} attempts"
    return 1
}

# 部署新版本
deploy_new_version() {
    local deploy_env="$1"
    local container_name="7zi-frontend-${deploy_env}"
    local port="$2"

    log_info "Deploying to ${deploy_env} environment (container: ${container_name}, port: ${port})..."

    # 停止并删除旧容器
    if docker ps -a | grep -q "${container_name}"; then
        log_info "Stopping old ${container_name}..."
        docker stop "${container_name}" || true
        docker rm "${container_name}" || true
    fi

    # 拉取最新镜像
    log_info "Pulling new image: ${IMAGE_TAG}..."
    docker pull "${IMAGE_TAG}"

    # 启动新容器
    log_info "Starting new container..."
    docker run -d \
        --name "${container_name}" \
        --restart unless-stopped \
        -p "${port}:3000" \
        --env-file /root/.env.production \
        --network nginx-network \
        "${IMAGE_TAG}"

    log_success "Container ${container_name} started!"
}

# 切换流量
switch_traffic() {
    local deploy_env="$1"
    local port="$2"

    log_info "Switching traffic to ${deploy_env} (port ${port})..."

    # 更新 Nginx 配置
    cat > "${NGINX_CONFIG}.tmp" << EOF
server {
    listen 80;
    server_name 7zi.com www.7zi.com;

    # Redirect HTTP to HTTPS
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

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Next.js API routes
    location /api/ {
        proxy_pass http://127.0.0.1:${port};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files caching
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

    # 验证 Nginx 配置
    if nginx -t -c "${NGINX_CONFIG}.tmp"; then
        mv "${NGINX_CONFIG}.tmp" "${NGINX_CONFIG}"
        log_success "Nginx configuration updated"
        systemctl reload nginx
        log_success "Nginx reloaded successfully"
    else
        log_error "Nginx configuration is invalid!"
        return 1
    fi
}

# 清理旧版本
cleanup_old_version() {
    local deploy_env="$1"
    local old_env=""

    if [ "$deploy_env" = "blue" ]; then
        old_env="green"
    else
        old_env="blue"
    fi

    local old_container="7zi-frontend-${old_env}"

    if docker ps -a | grep -q "${old_container}"; then
        log_info "Cleaning up old environment: ${old_env}..."

        # 停止旧容器（但不删除，作为备份）
        docker stop "${old_container}" || true

        # 标记为备份（可选）
        docker rename "${old_container}" "${old_container}-backup" || true

        log_success "Old environment stopped and backed up"
    fi

    # 清理未使用的镜像
    log_info "Pruning unused Docker images..."
    docker image prune -f --filter "until=24h"
}

# 回滚
rollback() {
    local failed_env="$1"
    local failed_port="$2"
    local backup_env=""

    if [ "$failed_env" = "blue" ]; then
        backup_env="green"
        backup_port=$GREEN_PORT
    else
        backup_env="blue"
        backup_port=$BLUE_PORT
    fi

    log_warning "Rolling back to ${backup_env}..."

    # 停止失败的容器
    docker stop "7zi-frontend-${failed_env}" || true

    # 启动备份容器
    if docker ps -a | grep -q "7zi-frontend-${backup_env}-backup"; then
        docker rename "7zi-frontend-${backup_env}-backup" "7zi-frontend-${backup_env}"
        docker start "7zi-frontend-${backup_env}"
    elif docker ps -a | grep -q "7zi-frontend-${backup_env}"; then
        docker start "7zi-frontend-${backup_env}" || true
    fi

    # 切换流量
    switch_traffic "$backup_env" "$backup_port"

    log_success "Rollback completed!"
}

# 主流程
main() {
    log_info "========================================"
    log_info "  Blue-Green Deployment Script"
    log_info "========================================"
    log_info "Deploy Mode: ${DEPLOY_MODE}"
    log_info "Image Tag: ${IMAGE_TAG}"
    log_info ""

    # 检查 Docker 网络
    if ! docker network inspect nginx-network > /dev/null 2>&1; then
        log_info "Creating nginx-network..."
        docker network create nginx-network
    fi

    # 获取当前状态
    local active_env=$(get_active_environment)
    log_info "Current active environment: ${active_env}"

    # 获取目标环境
    local deploy_env=$(get_deploy_environment)
    local deploy_port=""

    if [ "$deploy_env" = "blue" ]; then
        deploy_port=$BLUE_PORT
    else
        deploy_port=$GREEN_PORT
    fi

    log_info "Deploying to: ${deploy_env} (port ${deploy_port})"
    log_info ""

    # 部署新版本
    if ! deploy_new_version "$deploy_env" "$deploy_port"; then
        log_error "Deployment failed!"
        exit 1
    fi

    # 健康检查
    local container_name="7zi-frontend-${deploy_env}"
    if ! health_check "$container_name" "$deploy_port"; then
        log_error "Health check failed! Rolling back..."
        rollback "$deploy_env" "$deploy_port"
        exit 1
    fi

    # 切换流量
    if ! switch_traffic "$deploy_env" "$deploy_port"; then
        log_error "Traffic switch failed! Rolling back..."
        rollback "$deploy_env" "$deploy_port"
        exit 1
    fi

    # 部署后验证（可选：运行快速冒烟测试）
    log_info "Running post-deployment validation..."
    sleep 5  # 等待 Nginx 完全启动
    if curl -f -s "https://7zi.com/api/health" > /dev/null 2>&1; then
        log_success "Post-deployment validation passed!"
    else
        log_warning "Post-deployment validation warning (but deployment succeeded)"
    fi

    # 清理旧版本
    cleanup_old_version "$deploy_env"

    # 总结
    log_info ""
    log_success "========================================"
    log_success "  Deployment Completed Successfully!"
    log_success "========================================"
    log_success "Active Environment: ${deploy_env}"
    log_success "Image: ${IMAGE_TAG}"
    log_success "Port: ${deploy_port}"
    log_success "========================================"
}

# 运行主流程
main "$@"
