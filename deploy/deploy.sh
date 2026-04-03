#!/bin/bash

# ============================================
# OpenClaw v1.11.0 快速部署脚本
# ============================================

set -e

# 颜色定义
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

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    local deps=("docker" "docker-compose" "kubectl" "helm")
    local missing=()
    
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            missing+=("$dep")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "缺少依赖: ${missing[*]}"
        exit 1
    fi
    
    log_success "所有依赖已安装"
}

# 检查环境变量
check_env() {
    log_info "检查环境变量..."
    
    if [ ! -f .env ]; then
        log_warning ".env 文件不存在，从 .env.example 创建..."
        cp .env.example .env
        log_warning "请编辑 .env 文件并设置正确的配置"
        exit 1
    fi
    
    # 检查关键环境变量
    source .env
    
    if [ "$POSTGRES_PASSWORD" = "CHANGE_ME_IN_PRODUCTION" ]; then
        log_error "请设置 POSTGRES_PASSWORD"
        exit 1
    fi
    
    if [ "$REDIS_PASSWORD" = "CHANGE_ME_IN_PRODUCTION" ]; then
        log_error "请设置 REDIS_PASSWORD"
        exit 1
    fi
    
    if [ "$JWT_SECRET" = "CHANGE_ME_TO_RANDOM_32_CHAR_STRING" ]; then
        log_error "请设置 JWT_SECRET"
        exit 1
    fi
    
    log_success "环境变量检查通过"
}

# 构建 Docker 镜像
build_image() {
    log_info "构建 Docker 镜像..."
    
    docker build \
        -f deploy/docker/Dockerfile \
        -t openclaw:${VERSION:-v1.11.0} \
        --build-arg VERSION=${VERSION:-v1.11.0} \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown") \
        .
    
    log_success "Docker 镜像构建完成"
}

# 部署到 Docker Compose
deploy_docker() {
    log_info "部署到 Docker Compose..."
    
    local compose_file="deploy/docker/docker-compose.prod.yml"
    
    # 创建必要的目录
    mkdir -p data logs uploads nginx/ssl nginx/logs
    
    # 启动服务
    docker-compose -f "$compose_file" up -d
    
    log_success "Docker Compose 部署完成"
}

# 部署到 Kubernetes
deploy_kubernetes() {
    log_info "部署到 Kubernetes..."
    
    # 检查 kubectl 连接
    if ! kubectl cluster-info &> /dev/null; then
        log_error "无法连接到 Kubernetes 集群"
        exit 1
    fi
    
    # 创建命名空间
    kubectl create namespace openclaw --dry-run=client -o yaml | kubectl apply -f -
    
    # 创建 ConfigMap 和 Secret
    kubectl apply -f deploy/kubernetes/configmap.yaml
    
    # 部署应用
    kubectl apply -f deploy/kubernetes/
    
    # 等待部署完成
    kubectl rollout status deployment/openclaw -n openclaw --timeout=5m
    
    log_success "Kubernetes 部署完成"
}

# 使用 Helm 部署
deploy_helm() {
    log_info "使用 Helm 部署..."
    
    local chart_path="deploy/helm/openclaw"
    local release_name="openclaw"
    local namespace="openclaw"
    
    # 创建命名空间
    kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
    
    # 安装/升级 Chart
    helm upgrade --install "$release_name" "$chart_path" \
        --namespace "$namespace" \
        --create-namespace \
        --set image.tag=${VERSION:-v1.11.0} \
        --set image.pullPolicy=Always \
        --set replicaCount=3 \
        --set ingress.enabled=true \
        --set ingress.hosts[0].host=${DOMAIN:-openclaw.example.com} \
        --set ingress.tls[0].hosts[0]=${DOMAIN:-openclaw.example.com} \
        --set ingress.tls[0].secretName=openclaw-tls \
        --wait \
        --timeout 5m
    
    log_success "Helm 部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:${PORT:-3000}/api/health &> /dev/null; then
            log_success "健康检查通过"
            return 0
        fi
        
        log_warning "健康检查失败，重试 ($attempt/$max_attempts)..."
        sleep 2
        ((attempt++))
    done
    
    log_error "健康检查失败"
    return 1
}

# 显示状态
show_status() {
    log_info "部署状态:"
    
    echo ""
    echo "Docker 容器:"
    docker ps --filter "name=openclaw" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    echo "Kubernetes Pods:"
    kubectl get pods -n openclaw -l app=openclaw
    
    echo ""
    echo "Kubernetes Services:"
    kubectl get services -n openclaw
    
    echo ""
    echo "Kubernetes Ingress:"
    kubectl get ingress -n openclaw
}

# 清理部署
cleanup() {
    log_info "清理部署..."
    
    read -p "确定要清理部署吗？(y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 停止 Docker Compose
        docker-compose -f deploy/docker/docker-compose.prod.yml down -v
        
        # 删除 Kubernetes 资源
        kubectl delete namespace openclaw --ignore-not-found=true
        
        log_success "清理完成"
    else
        log_info "取消清理"
    fi
}

# 显示帮助
show_help() {
    cat << EOF
OpenClaw v1.11.0 部署脚本

用法: $0 [命令] [选项]

命令:
    build           构建 Docker 镜像
    docker          部署到 Docker Compose
    kubernetes      部署到 Kubernetes
    helm            使用 Helm 部署
    status          显示部署状态
    health          执行健康检查
    cleanup         清理部署
    help            显示帮助信息

选项:
    -v, --version   指定版本 (默认: v1.11.0)
    -e, --env       指定环境变量文件 (默认: .env)

示例:
    $0 build
    $0 docker
    $0 kubernetes
    $0 helm -v v1.11.1
    $0 status
    $0 health

EOF
}

# 主函数
main() {
    local command=""
    local version="v1.11.0"
    local env_file=".env"
    
    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            build|docker|kubernetes|helm|status|health|cleanup|help)
                command="$1"
                shift
                ;;
            -v|--version)
                version="$2"
                shift 2
                ;;
            -e|--env)
                env_file="$2"
                shift 2
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 设置版本
    export VERSION="$version"
    
    # 执行命令
    case $command in
        build)
            check_dependencies
            build_image
            ;;
        docker)
            check_dependencies
            check_env
            build_image
            deploy_docker
            health_check
            show_status
            ;;
        kubernetes)
            check_dependencies
            check_env
            build_image
            deploy_kubernetes
            health_check
            show_status
            ;;
        helm)
            check_dependencies
            check_env
            build_image
            deploy_helm
            health_check
            show_status
            ;;
        status)
            show_status
            ;;
        health)
            health_check
            ;;
        cleanup)
            cleanup
            ;;
        help|"")
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"