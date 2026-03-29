#!/bin/bash
# ============================================
# 7zi-frontend Docker 部署脚本
# ============================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查依赖
check_dependencies() {
    print_info "检查依赖..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi

    print_info "依赖检查通过 ✓"
}

# 环境变量检查
check_env() {
    print_info "检查环境变量..."

    if [ ! -f .env ]; then
        print_warn ".env 文件不存在，从 .env.docker.example 创建..."

        if [ -f .env.docker.example ]; then
            cp .env.docker.example .env
            print_info "已创建 .env 文件，请编辑并填入实际值"
            print_warn "重要：请设置 JWT_SECRET、RESEND_API_KEY 等敏感变量"
            exit 1
        else
            print_error ".env.docker.example 不存在"
            exit 1
        fi
    fi

    print_info "环境变量检查通过 ✓"
}

# 创建必要的目录
create_directories() {
    print_info "创建必要的目录..."

    mkdir -p data
    mkdir -p logs
    mkdir -p nginx/ssl
    mkdir -p nginx/logs

    # 设置权限
    chmod 755 data logs nginx/ssl nginx/logs

    print_info "目录创建完成 ✓"
}

# 拉取最新代码
pull_code() {
    print_info "拉取最新代码..."

    if [ -d .git ]; then
        git pull origin main || git pull origin master || print_warn "Git pull 失败，继续部署"
    else
        print_warn "不是 Git 仓库，跳过代码拉取"
    fi
}

# 构建镜像
build_image() {
    print_info "构建 Docker 镜像..."

    if docker compose version &> /dev/null; then
        docker compose -f docker-compose.prod.yml build
    else
        docker-compose -f docker-compose.prod.yml build
    fi

    print_info "镜像构建完成 ✓"
}

# 停止旧容器
stop_containers() {
    print_info "停止旧容器..."

    if docker compose version &> /dev/null; then
        docker compose -f docker-compose.prod.yml down
    else
        docker-compose -f docker-compose.prod.yml down
    fi

    print_info "容器已停止 ✓"
}

# 启动新容器
start_containers() {
    print_info "启动新容器..."

    if docker compose version &> /dev/null; then
        docker compose -f docker-compose.prod.yml up -d
    else
        docker-compose -f docker-compose.prod.yml up -d
    fi

    print_info "容器已启动 ✓"
}

# 健康检查
health_check() {
    print_info "等待容器启动..."

    # 等待 10 秒
    sleep 10

    # 检查 Next.js 容器
    if docker ps --filter "name=7zi-frontend" --filter "status=running" | grep -q "7zi-frontend"; then
        print_info "Next.js 容器运行中 ✓"

        # 检查健康状态
        HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' 7zi-frontend 2>/dev/null || echo "unknown")

        if [ "$HEALTH_STATUS" = "healthy" ]; then
            print_info "Next.js 健康检查通过 ✓"
        else
            print_warn "Next.js 健康状态: $HEALTH_STATUS"
        fi
    else
        print_error "Next.js 容器未运行"
        exit 1
    fi

    # 检查 Nginx 容器
    if docker ps --filter "name=7zi-nginx" --filter "status=running" | grep -q "7zi-nginx"; then
        print_info "Nginx 容器运行中 ✓"

        # 检查健康状态
        HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' 7zi-nginx 2>/dev/null || echo "unknown")

        if [ "$HEALTH_STATUS" = "healthy" ]; then
            print_info "Nginx 健康检查通过 ✓"
        else
            print_warn "Nginx 健康状态: $HEALTH_STATUS"
        fi
    else
        print_error "Nginx 容器未运行"
        exit 1
    fi
}

# 清理旧镜像
cleanup_old_images() {
    print_info "清理旧的 Docker 镜像..."

    # 删除悬挂的镜像
    docker image prune -f

    # 删除 7zi-frontend 旧版本（保留最近 2 个版本）
    docker images 7zi-frontend --format "{{.ID}}" | tail -n +3 | xargs -r docker rmi -f

    print_info "清理完成 ✓"
}

# 显示日志
show_logs() {
    print_info "显示容器日志（按 Ctrl+C 退出）..."

    if docker compose version &> /dev/null; then
        docker compose -f docker-compose.prod.yml logs -f
    else
        docker-compose -f docker-compose.prod.yml logs -f
    fi
}

# ============================================
# 主流程
# ============================================
main() {
    print_info "=========================================="
    print_info "  7zi-frontend Docker 部署脚本"
    print_info "=========================================="

    # 解析参数
    SKIP_PULL=false
    SKIP_BUILD=false
    SHOW_LOGS=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-pull)
                SKIP_PULL=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --logs)
                SHOW_LOGS=true
                shift
                ;;
            --help)
                echo "用法: $0 [选项]"
                echo ""
                echo "选项:"
                echo "  --skip-pull    跳过代码拉取"
                echo "  --skip-build   跳过镜像构建"
                echo "  --logs         部署完成后显示日志"
                echo "  --help         显示帮助信息"
                exit 0
                ;;
            *)
                print_error "未知参数: $1"
                echo "使用 $0 --help 查看帮助"
                exit 1
                ;;
        esac
    done

    # 执行步骤
    check_dependencies
    check_env
    create_directories

    if [ "$SKIP_PULL" = false ]; then
        pull_code
    fi

    if [ "$SKIP_BUILD" = false ]; then
        build_image
    fi

    stop_containers
    start_containers
    health_check
    cleanup_old_images

    print_info "=========================================="
    print_info "  部署完成！"
    print_info "=========================================="
    print_info ""
    print_info "访问地址:"
    print_info "  HTTP:  http://localhost:3000"
    print_info "  HTTPS: https://localhost"
    print_info ""
    print_info "查看日志:"
    print_info "  docker compose -f docker-compose.prod.yml logs -f"
    print_info ""

    if [ "$SHOW_LOGS" = true ]; then
        show_logs
    fi
}

# 运行主流程
main "$@"
