#!/bin/bash
# ============================================
# v1.5.0 生产部署脚本
# ============================================
# 用途：一键部署到生产环境（包含安全检查）
# 用法：./deploy.sh [image-tag] [skip-health-check]
# ============================================

set -euo pipefail

# ============================================
# 颜色和日志函数
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================
# 配置
# ============================================
IMAGE_TAG="${1:-7zi-frontend:v1.5.0}"
SKIP_HEALTH_CHECK="${2:-false}"
ENV_FILE="/root/.env.production"
WORKSPACE="/root/.openclaw/workspace/7zi-frontend"

# ============================================
# 安全检查函数
# ============================================
check_jwt_secret() {
    log_info "Checking JWT_SECRET configuration..."

    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file not found: $ENV_FILE"
        return 1
    fi

    # 检查 JWT_SECRET 是否设置
    if ! grep -q "^JWT_SECRET=" "$ENV_FILE" || grep -q "^JWT_SECRET=your-secret-key" "$ENV_FILE"; then
        log_error "JWT_SECRET is not properly configured in $ENV_FILE"
        log_error "Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
        return 1
    fi

    # 检查 JWT_SECRET 长度（至少 32 字符）
    JWT_SECRET=$(grep "^JWT_SECRET=" "$ENV_FILE" | cut -d'=' -f2)
    if [ ${#JWT_SECRET} -lt 32 ]; then
        log_error "JWT_SECRET is too short (${#JWT_SECRET} characters, minimum 32 required)"
        return 1
    fi

    log_success "JWT_SECRET is properly configured (length: ${#JWT_SECRET})"
}

check_required_env_vars() {
    log_info "Checking required environment variables..."

    local required_vars=(
        "NODE_ENV=production"
        "NEXT_PUBLIC_APP_URL"
        "DATABASE_URL"
    )

    local missing_vars=()

    for var_pattern in "${required_vars[@]}"; do
        local var_name=$(echo "$var_pattern" | cut -d'=' -f1)
        local expected_value=$(echo "$var_pattern" | cut -d'=' -f2)

        if ! grep -q "^${var_name}=" "$ENV_FILE"; then
            missing_vars+=("$var_name")
        elif [ -n "$expected_value" ]; then
            local actual_value=$(grep "^${var_name}=" "$ENV_FILE" | cut -d'=' -f2)
            if [ "$actual_value" != "$expected_value" ]; then
                log_warning "${var_name} is set to '$actual_value' (expected '$expected_value')"
            fi
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        return 1
    fi

    log_success "All required environment variables are set"
}

check_redis_connection() {
    log_info "Checking Redis connection..."

    if ! grep -q "^REDIS_URL=" "$ENV_FILE"; then
        log_warning "REDIS_URL not configured - Rate limiting will use memory storage"
        log_warning "This is not recommended for production environments"
        return 0
    fi

    local redis_url=$(grep "^REDIS_URL=" "$ENV_FILE" | cut -d'=' -f2)

    if ! command -v redis-cli &> /dev/null; then
        log_warning "redis-cli not available - cannot verify Redis connection"
        return 0
    fi

    if redis-cli -u "$redis_url" ping > /dev/null 2>&1; then
        log_success "Redis connection is working"
        return 0
    else
        log_warning "Redis connection failed - Rate limiting will use memory storage"
        return 0
    fi
}

check_database_connection() {
    log_info "Checking database connection..."

    local db_url=$(grep "^DATABASE_URL=" "$ENV_FILE" | cut -d'=' -f2)

    if [ -z "$db_url" ]; then
        log_error "DATABASE_URL is not configured"
        return 1
    fi

    log_success "DATABASE_URL is configured"
    # Note: 实际的数据库连接测试需要在运行时进行
}

check_docker_resources() {
    log_info "Checking Docker resources..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        return 1
    fi

    local available_memory=$(free -m | awk '/^Mem:/{print $2}')
    log_info "Available memory: ${available_memory}MB"

    if [ "$available_memory" -lt 1024 ]; then
        log_warning "Available memory is less than 1GB - may cause issues"
    else
        log_success "Docker resources are sufficient"
    fi
}

# ============================================
# 构建函数
# ============================================
build_image() {
    log_info "Building Docker image: $IMAGE_TAG"

    cd "$WORKSPACE"

    if ! docker build -f Dockerfile.production-optimized -t "$IMAGE_TAG" .; then
        log_error "Docker build failed"
        return 1
    fi

    # 检查镜像大小
    local image_size=$(docker images "$IMAGE_TAG" --format "{{.Size}}")
    log_info "Image size: $image_size"

    log_success "Docker image built successfully"
}

# ============================================
# 部署函数
# ============================================
deploy_image() {
    log_info "Deploying image: $IMAGE_TAG"

    if [ ! -f "$WORKSPACE/scripts/deploy/blue-green-deploy.sh" ]; then
        log_error "Blue-green deployment script not found"
        return 1
    fi

    # 运行蓝绿部署
    if ! bash "$WORKSPACE/scripts/deploy/blue-green-deploy.sh" auto "$IMAGE_TAG"; then
        log_error "Deployment failed"
        return 1
    fi

    log_success "Deployment completed"
}

# ============================================
# 健康检查函数
# ============================================
health_check() {
    if [ "$SKIP_HEALTH_CHECK" = "true" ]; then
        log_warning "Skipping health check (as requested)"
        return 0
    fi

    log_info "Running health checks..."

    local health_url="https://7zi.com/api/health"
    local max_attempts=10
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        log_info "Health check attempt $attempt/$max_attempts..."

        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log_success "Health check passed!"

            # 显示健康状态
            local health_status=$(curl -s "$health_url" | jq -r '.status')
            local response_time=$(curl -s "$health_url" | jq -r '.responseTime')

            log_info "Health status: $health_status"
            log_info "Response time: $response_time"

            if [ "$health_status" != "healthy" ]; then
                log_warning "Health status is '$health_status' (expected 'healthy')"
            fi

            return 0
        fi

        log_warning "Health check failed, retrying in 5s..."
        sleep 5
        ((attempt++))
    done

    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# ============================================
# 主函数
# ============================================
main() {
    log_info "========================================"
    log_info "  v1.5.0 Production Deployment"
    log_info "========================================"
    log_info "Image Tag: $IMAGE_TAG"
    log_info "Environment File: $ENV_FILE"
    log_info ""

    # 1. 安全检查
    log_info "========================================"
    log_info "  Phase 1: Security Checks"
    log_info "========================================"

    if ! check_jwt_secret; then
        log_error "JWT_SECRET check failed - aborting deployment"
        exit 1
    fi

    if ! check_required_env_vars; then
        log_error "Required environment variables check failed - aborting deployment"
        exit 1
    fi

    if ! check_redis_connection; then
        log_warning "Redis connection check failed (non-critical)"
    fi

    if ! check_database_connection; then
        log_error "Database connection check failed - aborting deployment"
        exit 1
    fi

    if ! check_docker_resources; then
        log_error "Docker resources check failed - aborting deployment"
        exit 1
    fi

    log_success "========================================"
    log_success "  Security checks passed"
    log_success "========================================"
    log_info ""

    # 2. 构建镜像
    log_info "========================================"
    log_info "  Phase 2: Build Image"
    log_info "========================================"

    if ! build_image; then
        log_error "Build failed - aborting deployment"
        exit 1
    fi

    log_success "========================================"
    log_success "  Build completed"
    log_success "========================================"
    log_info ""

    # 3. 部署
    log_info "========================================"
    log_info "  Phase 3: Deploy"
    log_info "========================================"

    if ! deploy_image; then
        log_error "Deployment failed"
        log_info "You can run rollback with: ./scripts/deploy/rollback.sh"
        exit 1
    fi

    log_success "========================================"
    log_success "  Deployment completed"
    log_success "========================================"
    log_info ""

    # 4. 健康检查
    log_info "========================================"
    log_info "  Phase 4: Health Check"
    log_info "========================================"

    if ! health_check; then
        log_error "Health check failed"
        log_info "You can run rollback with: ./scripts/deploy/rollback.sh"
        exit 1
    fi

    log_success "========================================"
    log_success "  Health check passed"
    log_success "========================================"
    log_info ""

    # 5. 完成
    log_info "========================================"
    log_success "  Deployment Summary"
    log_success "========================================"
    log_success "Version: $IMAGE_TAG"
    log_success "Status: Deployed successfully"
    log_success "Health: OK"
    log_info ""
    log_info "Next steps:"
    log_info "  1. Monitor logs: docker logs -f 7zi-frontend-blue"
    log_info "  2. Check metrics: ./scripts/deploy/monitor.sh"
    log_info "  3. Run tests: ./scripts/deploy/verify-deploy.sh production"
    log_info "========================================"
}

# 运行主函数
main "$@"
