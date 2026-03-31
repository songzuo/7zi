#!/bin/bash
# ============================================
# 灰度发布脚本 - Canary Deployment
# ============================================
# 用途：渐进式发布，逐步增加流量
# 用法：./scripts/deploy/canary-deploy.sh <image-tag> [canary-pct] [duration-minutes]
# ============================================

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_canary() {
    echo -e "${PURPLE}[CANARY]${NC} $1"
}

# 配置
IMAGE_TAG="${1:-latest}"
CANARY_PERCENTAGE="${2:-10}"
CANARY_DURATION="${3:-30}"
STABLE_CONTAINER="7zi-frontend-stable"
CANARY_CONTAINER="7zi-frontend-canary"
STABLE_PORT=3000
CANARY_PORT=3001
NGINX_CONFIG="/etc/nginx/sites-available/7zi.com"
METRICS_FILE="/var/log/7zi-canary-metrics.log"
ALERT_THRESHOLD_ERROR_RATE=5
ALERT_THRESHOLD_RESPONSE_TIME=2000

# 监控指标
declare -A METRICS

# 检查依赖
check_dependencies() {
    log_info "Checking dependencies..."

    if ! command -v jq &> /dev/null; then
        log_error "jq is required but not installed. Installing..."
        apt-get update && apt-get install -y jq
    fi

    if ! command -v bc &> /dev/null; then
        log_error "bc is required but not installed. Installing..."
        apt-get update && apt-get install -y bc
    fi

    log_success "Dependencies checked"
}

# 初始化 Canary 环境
init_canary() {
    log_info "Initializing canary environment..."

    # 检查 Docker 网络
    if ! docker network inspect nginx-network > /dev/null 2>&1; then
        log_info "Creating nginx-network..."
        docker network create nginx-network
    fi

    # 确保稳定版本正在运行
    if ! docker ps | grep -q "${STABLE_CONTAINER}"; then
        log_error "Stable container not running! Cannot start canary deployment."
        exit 1
    fi

    log_success "Canary environment initialized"
}

# 部署 Canary 版本
deploy_canary() {
    log_canary "Deploying canary version..."
    log_canary "Image: ${IMAGE_TAG}"
    log_canary "Initial traffic: ${CANARY_PERCENTAGE}%"

    # 停止并删除旧的 Canary 容器
    if docker ps -a | grep -q "${CANARY_CONTAINER}"; then
        log_info "Removing old canary container..."
        docker stop "${CANARY_CONTAINER}" || true
        docker rm "${CANARY_CONTAINER}" || true
    fi

    # 拉取新镜像
    log_info "Pulling canary image: ${IMAGE_TAG}..."
    docker pull "${IMAGE_TAG}"

    # 启动 Canary 容器
    log_info "Starting canary container..."
    docker run -d \
        --name "${CANARY_CONTAINER}" \
        --restart unless-stopped \
        -p "${CANARY_PORT}:3000" \
        --env-file /root/.env.production \
        --network nginx-network \
        -l "deployment.type=canary" \
        -l "deployment.version=${IMAGE_TAG}" \
        "${IMAGE_TAG}"

    # 健康检查
    log_info "Performing canary health check..."
    local attempt=1
    local max_attempts=12

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "http://localhost:${CANARY_PORT}/api/health" > /dev/null 2>&1; then
            log_success "Canary health check passed!"
            return 0
        fi

        log_info "Health check attempt ${attempt}/${max_attempts} failed. Retrying in 5s..."
        sleep 5
        ((attempt++))
    done

    log_error "Canary health check failed!"
    return 1
}

# 配置 Nginx 流量分配
configure_traffic_split() {
    local canary_pct="$1"

    log_canary "Configuring traffic split: ${canary_pct}% canary, $((100 - canary_pct))% stable"

    # 计算 stable 权重
    local stable_pct=$((100 - canary_pct))

    # 创建 Nginx 配置（使用 split_clients 模块）
    cat > "${NGINX_CONFIG}.tmp" << EOF
# Canary deployment configuration
split_clients "\${remote_addr}" \$canary_backend {
    ${canary_pct}%    "http://127.0.0.1:${CANARY_PORT}";
    "*"               "http://127.0.0.1:${STABLE_PORT}";
}

upstream stable_backend {
    server 127.0.0.1:${STABLE_PORT};
}

upstream canary_backend {
    server 127.0.0.1:${CANARY_PORT};
}

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

    # 日志格式（包含 upstream 地址，用于分析流量分布）
    log_format canary_log '\$remote_addr - \$remote_user [\$time_local] '
                          '"\$request" \$status \$body_bytes_sent '
                          '"\$http_referer" "\$http_user_agent" '
                          'upstream=\$upstream_addr response_time=\$upstream_response_time';

    access_log /var/log/nginx/7zi.access.log canary_log;

    location / {
        # 使用 split_clients 决定路由
        proxy_pass \$canary_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Canary-Version "${IMAGE_TAG}";
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /api/ {
        proxy_pass \$canary_backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /_next/static/ {
        proxy_pass \$canary_backend;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }

    location /static/ {
        proxy_pass \$canary_backend;
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public";
    }

    # 健康检查端点（始终访问 stable）
    location /api/health {
        proxy_pass http://127.0.0.1:${STABLE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF

    # 验证并应用配置
    if nginx -t -c "${NGINX_CONFIG}.tmp"; then
        mv "${NGINX_CONFIG}.tmp" "${NGINX_CONFIG}"
        systemctl reload nginx
        log_success "Nginx configured for ${canary_pct}% canary traffic"
    else
        log_error "Nginx configuration validation failed!"
        return 1
    fi
}

# 收集监控指标
collect_metrics() {
    log_info "Collecting metrics..."

    # 从 Nginx 日志解析指标
    local logs=$(tail -n 1000 /var/log/nginx/7zi.access.log 2>/dev/null || echo "")

    if [ -z "$logs" ]; then
        log_warning "No logs available for metrics collection"
        return
    fi

    # 计算错误率
    local total_requests=$(echo "$logs" | grep -c "canary" || echo "0")
    local error_requests=$(echo "$logs" | grep "canary" | grep -E "\" (4|5)[0-9]{2} " | wc -l || echo "0")

    if [ "$total_requests" -gt 0 ]; then
        local error_rate=$(echo "scale=2; ($error_requests / $total_requests) * 100" | bc)
        METRICS[error_rate]=$error_rate
    else
        METRICS[error_rate]=0
    fi

    # 计算平均响应时间
    local response_times=$(echo "$logs" | grep "canary" | awk '{print $NF}' | sed 's/response_time=//' | grep -E '^[0-9.]+$' || echo "0")
    local avg_response_time=$(echo "$response_times" | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
    METRICS[avg_response_time]=$avg_response_time

    # 记录指标
    echo "$(date +%Y-%m-%d\ %H:%M:%S) - Error Rate: ${METRICS[error_rate]}% - Avg Response Time: ${METRICS[avg_response_time]}ms" >> "$METRICS_FILE"

    log_info "Metrics - Error Rate: ${METRICS[error_rate]}%, Avg Response Time: ${METRICS[avg_response_time]}ms"
}

# 检查是否需要回滚
should_rollback() {
    collect_metrics

    local error_rate="${METRICS[error_rate]:-0}"
    local response_time="${METRICS[avg_response_time]:-0}"

    if (( $(echo "$error_rate > $ALERT_THRESHOLD_ERROR_RATE" | bc -l) )); then
        log_error "Error rate (${error_rate}%) exceeds threshold (${ALERT_THRESHOLD_ERROR_RATE}%)"
        return 0
    fi

    if (( $(echo "$response_time > $ALERT_THRESHOLD_RESPONSE_TIME" | bc -l) )); then
        log_error "Response time (${response_time}ms) exceeds threshold (${ALERT_THRESHOLD_RESPONSE_TIME}ms)"
        return 0
    fi

    return 1
}

# 渐进式增加流量
increase_traffic_gradually() {
    log_canary "Starting gradual traffic increase..."
    log_canary "Duration: ${CANARY_DURATION} minutes"
    log_canary "Initial percentage: ${CANARY_PERCENTAGE}%"

    local current_pct=$CANARY_PERCENTAGE
    local step_size=10
    local step_duration=$((CANARY_DURATION / 10))

    while [ $current_pct -lt 100 ]; do
        log_canary "Current traffic: ${current_pct}% canary"

        # 等待并监控
        log_info "Waiting ${step_duration} minutes before next increase..."
        sleep $((step_duration * 60))

        # 检查指标
        if should_rollback; then
            log_error "Metrics indicate failure. Initiating rollback..."
            rollback_canary
            exit 1
        fi

        # 增加流量
        current_pct=$((current_pct + step_size))
        if [ $current_pct -gt 100 ]; then
            current_pct=100
        fi

        configure_traffic_split "$current_pct"
    done

    log_success "Traffic fully migrated to canary (100%)"
}

# 完成 Canary 部署
complete_canary_deployment() {
    log_canary "Completing canary deployment..."

    # 所有流量已切换到 canary
    # 停止旧版本
    log_info "Stopping stable container..."
    docker stop "${STABLE_CONTAINER}" || true
    docker rename "${STABLE_CONTAINER}" "${STABLE_CONTAINER}-backup" || true

    # 重命名 canary 为 stable
    log_info "Promoting canary to stable..."
    docker rename "${CANARY_CONTAINER}" "${STABLE_CONTAINER}"

    # 恢复标准 Nginx 配置
    cat > "${NGINX_CONFIG}" << EOF
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
        proxy_pass http://127.0.0.1:${STABLE_PORT};
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
        proxy_pass http://127.0.0.1:${STABLE_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /_next/static/ {
        proxy_pass http://127.0.0.1:${STABLE_PORT};
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }

    location /static/ {
        proxy_pass http://127.0.0.1:${STABLE_PORT};
        proxy_cache_valid 200 30d;
        add_header Cache-Control "public";
    }
}
EOF

    systemctl reload nginx
    log_success "Canary deployment completed!"
}

# 回滚 Canary
rollback_canary() {
    log_warning "Rolling back canary deployment..."

    # 恢复 100% 流量到 stable
    configure_traffic_split 0

    # 停止 canary
    docker stop "${CANARY_CONTAINER}" || true
    docker rm "${CANARY_CONTAINER}" || true

    log_success "Rollback completed. All traffic routed to stable version."
}

# 主流程
main() {
    log_info "========================================"
    log_info "  Canary Deployment Script"
    log_info "========================================"
    log_info "Image: ${IMAGE_TAG}"
    log_info "Canary Percentage: ${CANARY_PERCENTAGE}%"
    log_info "Duration: ${CANARY_DURATION} minutes"
    log_info ""

    # 检查依赖
    check_dependencies

    # 初始化
    init_canary

    # 部署 Canary
    if ! deploy_canary; then
        log_error "Canary deployment failed!"
        exit 1
    fi

    # 配置初始流量分配
    if ! configure_traffic_split "$CANARY_PERCENTAGE"; then
        log_error "Traffic split configuration failed!"
        rollback_canary
        exit 1
    fi

    # 渐进式增加流量
    increase_traffic_gradually

    # 完成
    complete_canary_deployment

    # 总结
    log_info ""
    log_success "========================================"
    log_success "  Canary Deployment Completed!"
    log_success "========================================"
    log_success "Version: ${IMAGE_TAG}"
    log_success "Traffic: 100%"
    log_success "Duration: ${CANARY_DURATION} minutes"
    log_success "========================================"
}

# 运行主流程
main "$@"
