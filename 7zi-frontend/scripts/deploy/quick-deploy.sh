#!/bin/bash
# ============================================
# 快速部署脚本 - Quick Deploy
# ============================================
# 用途：快速部署到指定环境（跳过部分验证）
# 用法：./scripts/deploy/quick-deploy.sh [environment] [image-tag]
# ============================================

set -euo pipefail

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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

ENVIRONMENT="${1:-production}"
IMAGE_TAG="${2:-latest}"
QUICK_MODE="${3:-false}"

log_info "========================================"
log_info "  Quick Deployment"
log_info "========================================"
log_info "Environment: ${ENVIRONMENT}"
log_info "Image Tag: ${IMAGE_TAG}"
log_info "Quick Mode: ${QUICK_MODE}"
log_info ""

# 如果是快速模式，直接部署
if [ "$QUICK_MODE" = "true" ]; then
    log_info "Running in quick mode (minimal validation)..."

    # 拉取镜像
    log_info "Pulling image ${IMAGE_TAG}..."
    docker pull "${IMAGE_TAG}"

    # 蓝绿部署
    log_info "Executing blue-green deployment..."
    /root/.openclaw/workspace/7zi-frontend/scripts/deploy/blue-green-deploy.sh auto "${IMAGE_TAG}"

    if [ $? -eq 0 ]; then
        log_success "Quick deployment completed!"
        exit 0
    else
        log_error "Quick deployment failed!"
        exit 1
    fi
fi

# 否则运行完整部署
log_info "Running full deployment..."
/root/.openclaw/workspace/7zi-frontend/scripts/deploy/blue-green-deploy.sh auto "${IMAGE_TAG}"

if [ $? -eq 0 ]; then
    log_info "Running deployment verification..."
    /root/.openclaw/workspace/7zi-frontend/scripts/deploy/verify-deploy.sh production
    log_success "Deployment completed successfully!"
else
    log_error "Deployment failed!"
    exit 1
fi
