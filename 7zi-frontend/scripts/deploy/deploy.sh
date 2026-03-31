#!/bin/bash
# ============================================
# 统一部署脚本 - Unified Deployment Script
# ============================================
# 用途：支持多种部署策略的统一入口
# 用法：./scripts/deploy/deploy.sh <strategy> [options]
# 策略：
#   - canary: 灰度发布
#   - blue-green: 蓝绿部署
#   - rolling: 滚动更新
#   - quick: 快速部署（跳过测试）
# ============================================

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
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

log_strategy() {
    echo -e "${PURPLE}[STRATEGY]${NC} $1"
}

# 显示帮助
show_help() {
    cat << EOF
7zi v1.5.0 部署脚本

用法: $0 <strategy> [options]

部署策略:
  canary        灰度发布（推荐用于生产环境）
                用法: $0 canary <image-tag> [percentage] [duration]
                示例: $0 canary ghcr.io/.../7zi-frontend:main-abc123 10 30

  blue-green    蓝绿部署（零停机部署）
                用法: $0 blue-green <image-tag>
                示例: $0 blue-green ghcr.io/.../7zi-frontend:main-abc123

  rolling       滚动更新（适合单服务器环境）
                用法: $0 rolling <image-tag>
                示例: $0 rolling ghcr.io/.../7zi-frontend:main-abc123

  quick         快速部署（跳过测试，仅用于紧急修复）
                用法: $0 quick <image-tag>
                示例: $0 quick ghcr.io/.../7zi-frontend:main-abc123

选项:
  --help, -h    显示帮助信息
  --dry-run     模拟执行，不实际部署
  --force       强制执行，跳过确认

环境变量:
  DEPLOY_ENV        部署环境 (production/staging)
  SLACK_WEBHOOK     Slack 通知 webhook
  DINGTALK_WEBHOOK  钉钉通知 webhook

示例:
  # 灰度发布，初始流量 5%，持续 60 分钟
  $0 canary ghcr.io/.../7zi-frontend:v1.5.0 5 60

  # 蓝绿部署
  $0 blue-green ghcr.io/.../7zi-frontend:v1.5.0

  # 快速部署（紧急修复）
  $0 quick ghcr.io/.../7zi-frontend:hotfix-123

EOF
    exit 0
}

# 配置
DEPLOY_STRATEGY="${1:-help}"
IMAGE_TAG="${2:-latest}"
DRY_RUN="${DRY_RUN:-false}"
FORCE="${FORCE:-false}"
DEPLOY_ENV="${DEPLOY_ENV:-production}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="/var/log/7zi-deploy-$(date +%Y%m%d-%H%M%S).log"

# 日志记录
log_to_file() {
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" >> "$LOG_FILE"
}

# 发送通知
send_notification() {
    local status="$1"
    local message="$2"

    # Slack 通知
    if [ -n "${SLACK_WEBHOOK:-}" ]; then
        curl -s -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${status}: ${message}\",\"attachments\":[{\"color\":\"${status}\",\"fields\":[{\"title\":\"Environment\",\"value\":\"${DEPLOY_ENV}\",\"short\":true},{\"title\":\"Strategy\",\"value\":\"${DEPLOY_STRATEGY}\",\"short\":true},{\"title\":\"Image\",\"value\":\"${IMAGE_TAG}\",\"short\":false}]}]}" \
            "$SLACK_WEBHOOK" || true
    fi

    # 钉钉通知
    if [ -n "${DINGTALK_WEBHOOK:-}" ]; then
        curl -s -X POST -H 'Content-Type: application/json' \
            --data "{\"msgtype\":\"markdown\",\"markdown\":{\"title\":\"部署通知\",\"text\":\"## ${status}\\n\\n${message}\\n\\n**环境:** ${DEPLOY_ENV}\\n**策略:** ${DEPLOY_STRATEGY}\\n**镜像:** ${IMAGE_TAG}\"}}" \
            "$DINGTALK_WEBHOOK" || true
    fi
}

# 确认部署
confirm_deployment() {
    if [ "$FORCE" = "true" ]; then
        return 0
    fi

    echo ""
    log_warning "即将执行部署:"
    echo "  策略: ${DEPLOY_STRATEGY}"
    echo "  镜像: ${IMAGE_TAG}"
    echo "  环境: ${DEPLOY_ENV}"
    echo ""
    read -p "确认继续？(yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "部署已取消"
        exit 0
    fi
}

# 前置检查
pre_deployment_check() {
    log_info "执行前置检查..."

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi

    # 检查 Nginx
    if ! command -v nginx &> /dev/null; then
        log_error "Nginx 未安装"
        exit 1
    fi

    # 检查镜像是否存在
    if ! docker image inspect "${IMAGE_TAG}" &> /dev/null; then
        log_warning "本地镜像不存在，尝试拉取..."
        if ! docker pull "${IMAGE_TAG}"; then
            log_error "镜像拉取失败: ${IMAGE_TAG}"
            exit 1
        fi
    fi

    # 检查环境变量文件
    if [ ! -f "/root/.env.${DEPLOY_ENV}" ]; then
        log_error "环境变量文件不存在: /root/.env.${DEPLOY_ENV}"
        exit 1
    fi

    log_success "前置检查通过"
}

# Canary 部署
deploy_canary() {
    log_strategy "执行 Canary 部署..."

    local percentage="${3:-10}"
    local duration="${4:-30}"

    log_info "Canary 参数:"
    log_info "  - 初始流量: ${percentage}%"
    log_info "  - 持续时间: ${duration} 分钟"

    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY-RUN] 将执行 Canary 部署"
        return 0
    fi

    # 执行 Canary 部署脚本
    if ! "${SCRIPT_DIR}/canary-deploy.sh" "$IMAGE_TAG" "$percentage" "$duration"; then
        log_error "Canary 部署失败"
        send_notification "❌ 部署失败" "Canary 部署失败: ${IMAGE_TAG}"
        exit 1
    fi

    log_success "Canary 部署完成"
    send_notification "✅ 部署成功" "Canary 部署完成: ${IMAGE_TAG}"
}

# Blue-Green 部署
deploy_blue_green() {
    log_strategy "执行 Blue-Green 部署..."

    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY-RUN] 将执行 Blue-Green 部署"
        return 0
    fi

    # 执行 Blue-Green 部署脚本
    if ! "${SCRIPT_DIR}/blue-green-deploy.sh" auto "$IMAGE_TAG"; then
        log_error "Blue-Green 部署失败"
        send_notification "❌ 部署失败" "Blue-Green 部署失败: ${IMAGE_TAG}"
        exit 1
    fi

    log_success "Blue-Green 部署完成"
    send_notification "✅ 部署成功" "Blue-Green 部署完成: ${IMAGE_TAG}"
}

# Rolling 部署
deploy_rolling() {
    log_strategy "执行 Rolling 部署..."

    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY-RUN] 将执行 Rolling 部署"
        return 0
    fi

    # 执行 Rolling 部署脚本
    if ! "${SCRIPT_DIR}/rolling-deploy.sh" "$IMAGE_TAG"; then
        log_error "Rolling 部署失败"
        send_notification "❌ 部署失败" "Rolling 部署失败: ${IMAGE_TAG}"
        exit 1
    fi

    log_success "Rolling 部署完成"
    send_notification "✅ 部署成功" "Rolling 部署完成: ${IMAGE_TAG}"
}

# 快速部署
deploy_quick() {
    log_strategy "执行快速部署（跳过测试）..."
    log_warning "⚠️  此模式仅用于紧急修复！"

    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY-RUN] 将执行快速部署"
        return 0
    fi

    # 执行快速部署脚本
    if ! "${SCRIPT_DIR}/quick-deploy.sh" "$IMAGE_TAG"; then
        log_error "快速部署失败"
        send_notification "❌ 部署失败" "快速部署失败: ${IMAGE_TAG}"
        exit 1
    fi

    log_success "快速部署完成"
    send_notification "✅ 部署成功" "快速部署完成: ${IMAGE_TAG}"
}

# 部署后验证
post_deployment_verification() {
    log_info "执行部署后验证..."

    # 健康检查
    local max_attempts=10
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "https://7zi.com/api/health" > /dev/null 2>&1; then
            log_success "健康检查通过"
            return 0
        fi

        log_info "健康检查 ${attempt}/${max_attempts} 失败，5秒后重试..."
        sleep 5
        ((attempt++))
    done

    log_error "健康检查失败"
    return 1
}

# 主流程
main() {
    log_info "========================================"
    log_info "  7zi v1.5.0 部署脚本"
    log_info "========================================"
    log_info "策略: ${DEPLOY_STRATEGY}"
    log_info "镜像: ${IMAGE_TAG}"
    log_info "环境: ${DEPLOY_ENV}"
    log_info "时间: $(date)"
    log_info ""

    # 创建日志文件
    mkdir -p "$(dirname "$LOG_FILE")"
    log_to_file "开始部署 - 策略: ${DEPLOY_STRATEGY}, 镜像: ${IMAGE_TAG}"

    # 解析参数
    case "$DEPLOY_STRATEGY" in
        -h|--help|help)
            show_help
            ;;
        --dry-run)
            DRY_RUN=true
            DEPLOY_STRATEGY="${2:-help}"
            IMAGE_TAG="${3:-latest}"
            ;;
    esac

    # 前置检查
    pre_deployment_check

    # 确认部署
    confirm_deployment

    # 执行部署
    local start_time=$(date +%s)

    case "$DEPLOY_STRATEGY" in
        canary)
            deploy_canary "$@"
            ;;
        blue-green)
            deploy_blue_green
            ;;
        rolling)
            deploy_rolling
            ;;
        quick)
            deploy_quick
            ;;
        *)
            log_error "未知的部署策略: ${DEPLOY_STRATEGY}"
            show_help
            ;;
    esac

    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # 部署后验证
    post_deployment_verification

    # 总结
    log_info ""
    log_success "========================================"
    log_success "  部署完成！"
    log_success "========================================"
    log_success "策略: ${DEPLOY_STRATEGY}"
    log_success "镜像: ${IMAGE_TAG}"
    log_success "环境: ${DEPLOY_ENV}"
    log_success "耗时: ${duration} 秒"
    log_success "========================================"

    log_to_file "部署完成 - 耗时: ${duration}秒"
}

# 运行主流程
main "$@"
