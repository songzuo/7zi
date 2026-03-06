#!/bin/bash

# ============================================
# 7zi-frontend Docker 部署脚本
# 用于 7zi.com 服务器
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
}

# 构建镜像
build() {
    log_info "构建 Docker 镜像..."
    docker-compose build --no-cache
    log_info "构建完成"
}

# 启动服务
start() {
    log_info "启动服务..."
    docker-compose -f docker-compose.prod.yml up -d
    log_info "服务已启动"
}

# 停止服务
stop() {
    log_info "停止服务..."
    docker-compose -f docker-compose.prod.yml down
    log_info "服务已停止"
}

# 重启服务
restart() {
    stop
    sleep 2
    start
}

# 查看日志
logs() {
    docker-compose -f docker-compose.prod.yml logs -f --tail=100
}

# 查看状态
status() {
    docker-compose -f docker-compose.prod.yml ps
}

# 清理
clean() {
    log_warn "清理未使用的 Docker 资源..."
    docker system prune -f
    log_info "清理完成"
}

# 部署（完整流程）
deploy() {
    log_info "开始部署..."
    
    # 1. 拉取最新代码
    log_info "拉取最新代码..."
    git pull origin main
    
    # 2. 构建镜像
    build
    
    # 3. 停止旧容器
    stop
    
    # 4. 启动新容器
    start
    
    # 5. 检查健康状态
    log_info "等待服务启动..."
    sleep 10
    
    if curl -sf http://localhost:3000/ > /dev/null; then
        log_info "部署成功！服务运行正常"
    else
        log_error "部署失败！请检查日志"
        exit 1
    fi
}

# 帮助信息
help() {
    echo "用法: $0 {build|start|stop|restart|logs|status|clean|deploy}"
    echo ""
    echo "命令:"
    echo "  build   - 构建 Docker 镜像"
    echo "  start   - 启动服务"
    echo "  stop    - 停止服务"
    echo "  restart - 重启服务"
    echo "  logs    - 查看日志"
    echo "  status  - 查看服务状态"
    echo "  clean   - 清理未使用的资源"
    echo "  deploy  - 完整部署流程"
}

# 主入口
case "$1" in
    build)
        check_docker
        build
        ;;
    start)
        check_docker
        start
        ;;
    stop)
        check_docker
        stop
        ;;
    restart)
        check_docker
        restart
        ;;
    logs)
        logs
        ;;
    status)
        status
        ;;
    clean)
        clean
        ;;
    deploy)
        check_docker
        deploy
        ;;
    *)
        help
        exit 1
        ;;
esac
