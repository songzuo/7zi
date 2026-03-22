#!/bin/bash
# ============================================
# 7zi.com 快速部署脚本
# 用于新服务器的一键部署
# ============================================

set -e

# ============================================
# 配置
# ============================================

# 服务器信息（默认 7zi.com）
SERVER="${DEPLOY_SERVER:-7zi.com}"
SERVER_IP="${DEPLOY_IP:-165.99.43.61}"
SERVER_USER="${DEPLOY_USER:-root}"
SERVER_PASS="${DEPLOY_PASSWORD:-ge20993344\$ZZ}"

# 部署路径
DEPLOY_PATH="/opt/7zi-frontend"
BACKUP_PATH="/opt/backups"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================
# 工具函数
# ============================================

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }
log_section() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# SSH 命令执行
ssh_cmd() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER" "$1"
}

# 检查本地依赖
check_local_deps() {
    log_step "检查本地依赖..."

    local missing=()

    for cmd in sshpass rsync docker; do
        if ! command -v $cmd &> /dev/null; then
            missing+=($cmd)
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "缺少依赖: ${missing[*]}"
        log_info "安装命令: apt install ${missing[*]}"
        exit 1
    fi

    log_info "✓ 本地依赖检查通过"
}

# 测试服务器连接
test_connection() {
    log_step "测试服务器连接..."

    if ssh_cmd "echo '连接成功'" &> /dev/null; then
        local hostname=$(ssh_cmd "hostname")
        local uptime=$(ssh_cmd "uptime -p")
        log_info "✓ 连接成功: $hostname ($uptime)"
        return 0
    else
        log_error "✗ 连接失败"
        return 1
    fi
}

# 安装服务器基础环境
install_server_env() {
    log_step "安装服务器基础环境..."

    ssh_cmd "
        # 更新系统
        apt update -qq

        # 安装基础工具
        apt install -y -qq curl wget git sshpass rsync htop

        # 安装 Docker
        if ! command -v docker &> /dev/null; then
            echo '正在安装 Docker...'
            curl -fsSL https://get.docker.com | sh
            systemctl enable docker
            systemctl start docker
        fi

        # 安装 Docker Compose
        if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
            echo '正在安装 Docker Compose...'
            curl -L 'https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-\$(uname -s)-\$(uname -m)' -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi

        # 创建部署目录
        mkdir -p $DEPLOY_PATH
        mkdir -p $BACKUP_PATH
        mkdir -p $DEPLOY_PATH/nginx/ssl
        mkdir -p $DEPLOY_PATH/nginx/logs
        mkdir -p $DEPLOY_PATH/data

        # 设置时区
        timedatectl set-timezone Asia/Shanghai 2>/dev/null || echo 'Asia/Shanghai' > /etc/timezone

        echo '基础环境安装完成'
    "

    log_info "✓ 服务器环境安装完成"
}

# 同步代码到服务器
sync_code() {
    log_step "同步代码到服务器..."

    cd "$(dirname "$0")"

    # 使用 rsync 同步（排除不需要的文件）
    sshpass -p "$SERVER_PASS" rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude '.git' \
        --exclude 'test-results' \
        --exclude 'playwright-report' \
        --exclude 'coverage' \
        --exclude '*.log' \
        --exclude '.env.local' \
        --exclude '.DS_Store' \
        -e "ssh -o StrictHostKeyChecking=no" \
        ./ "$SERVER_USER@$SERVER:$DEPLOY_PATH/"

    log_info "✓ 代码同步完成"
}

# 配置环境变量
setup_env() {
    log_step "配置环境变量..."

    ssh_cmd "
        cd $DEPLOY_PATH

        # 检查是否已有 .env.production
        if [ -f .env.production ]; then
            echo '.env.production 已存在，跳过创建'
        else
            # 从示例创建配置文件
            cp .env.production.example .env.production

            # 更新关键配置
            sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env.production
            sed -i 's/PORT=.*/PORT=3000/' .env.production
            sed -i 's/HOSTNAME=.*/HOSTNAME=0.0.0.0/' .env.production
            sed -i 's|NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=https://7zi.com|' .env.production

            echo '✓ .env.production 已创建'
            echo '⚠️  请手动编辑 $DEPLOY_PATH/.env.production 填入实际配置'
        fi
    "

    log_info "✓ 环境变量配置完成"
}

# 配置 Nginx
setup_nginx() {
    log_step "配置 Nginx..."

    ssh_cmd "
        # 安装 Nginx（如果未安装）
        if ! command -v nginx &> /dev/null; then
            apt install -y nginx
            systemctl enable nginx
        fi

        # 复制 Nginx 配置
        if [ -f $DEPLOY_PATH/7zi-nginx.conf ]; then
            cp $DEPLOY_PATH/7zi-nginx.conf /etc/nginx/sites-available/7zi.com

            # 创建软链接
            ln -sf /etc/nginx/sites-available/7zi.com /etc/nginx/sites-enabled/7zi.com

            # 删除默认配置
            rm -f /etc/nginx/sites-enabled/default

            # 测试配置
            if nginx -t 2>&1 | grep -q 'successful'; then
                systemctl reload nginx
                echo '✓ Nginx 配置已加载'
            else
                echo '⚠️  Nginx 配置有误，请手动检查'
            fi
        else
            echo '⚠️  Nginx 配置文件不存在，跳过'
        fi
    "

    log_info "✓ Nginx 配置完成"
}

# 构建 Docker 镜像
build_docker() {
    log_step "构建 Docker 镜像..."

    ssh_cmd "
        cd $DEPLOY_PATH

        # 检查 Dockerfile 存在
        if [ ! -f Dockerfile ]; then
            echo '错误: Dockerfile 不存在'
            exit 1
        fi

        # 构建镜像
        docker-compose -f docker-compose.prod.yml build --no-cache

        echo '✓ Docker 镜像构建完成'
    "

    log_info "✓ Docker 镜像构建完成"
}

# 启动服务
start_service() {
    log_step "启动服务..."

    ssh_cmd "
        cd $DEPLOY_PATH

        # 停止旧容器
        docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

        # 启动新容器
        docker-compose -f docker-compose.prod.yml up -d

        echo '等待服务启动...'
        sleep 15

        # 显示容器状态
        docker-compose -f docker-compose.prod.yml ps
    "

    log_info "✓ 服务已启动"
}

# 健康检查
health_check() {
    log_step "执行健康检查..."

    local max_attempts=12
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if ssh_cmd "curl -sf http://localhost:3000/ > /dev/null 2>&1"; then
            log_info "✅ 健康检查通过！服务运行正常"
            return 0
        fi

        echo "尝试 $attempt/$max_attempts 失败，等待中..."
        sleep 5
        attempt=$((attempt + 1))
    done

    log_error "❌ 健康检查失败！"
    ssh_cmd "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml logs --tail=50"
    return 1
}

# 显示部署信息
show_deployment_info() {
    log_section "部署完成！"

    echo ""
    echo -e "${GREEN}✓ 7zi.com 部署成功！${NC}"
    echo ""
    echo "访问地址:"
    echo "  - HTTP:  http://7zi.com"
    echo "  - HTTPS: https://7zi.com"
    echo "  - 应用:  http://7zi.com:3000"
    echo ""
    echo "管理命令:"
    echo "  - 查看日志:  docker-compose -f $DEPLOY_PATH/docker-compose.prod.yml logs -f"
    echo "  - 查看状态:  docker-compose -f $DEPLOY_PATH/docker-compose.prod.yml ps"
    echo "  - 重启服务:  docker-compose -f $DEPLOY_PATH/docker-compose.prod.yml restart"
    echo "  - 停止服务:  docker-compose -f $DEPLOY_PATH/docker-compose.prod.yml down"
    echo ""
    echo "SSH 连接:"
    echo "  ssh root@$SERVER"
    echo ""
    echo "下一步:"
    echo "  1. 编辑环境变量: ssh root@$SERVER 'nano $DEPLOY_PATH/.env.production'"
    echo "  2. 配置 SSL 证书: certbot --nginx -d 7zi.com"
    echo "  3. 验证部署: curl -I https://7zi.com"
    echo ""
}

# 完整部署流程
full_deploy() {
    log_section "开始完整部署流程"

    check_local_deps
    test_connection
    install_server_env
    sync_code
    setup_env
    setup_nginx
    build_docker
    start_service
    health_check
    show_deployment_info
}

# 快速部署（跳过环境安装）
quick_deploy() {
    log_section "开始快速部署"

    check_local_deps
    test_connection
    sync_code
    build_docker
    start_service
    health_check
    show_deployment_info
}

# 帮助信息
show_help() {
    cat << EOF
7zi.com 快速部署脚本

用法: $0 [命令] [选项]

命令:
  full        - 完整部署（包括环境安装，推荐首次使用）
  quick       - 快速部署（仅同步和重启）
  check       - 检查环境和连接
  logs        - 查看服务日志
  status      - 查看服务状态
  restart     - 重启服务
  stop        - 停止服务
  help        - 显示此帮助信息

选项:
  --server    指定服务器地址（默认: 7zi.com）
  --ip        指定服务器IP（默认: 165.99.43.61）
  --user      指定SSH用户（默认: root）
  --password  指定SSH密码（默认: 自动）

环境变量:
  DEPLOY_SERVER       服务器地址
  DEPLOY_IP          服务器IP
  DEPLOY_USER        SSH用户
  DEPLOY_PASSWORD    SSH密码

示例:
  $0 full                      # 完整部署到 7zi.com
  $0 quick                     # 快速部署
  $0 check                     # 检查环境
  $0 logs                      # 查看日志

自定义服务器:
  $0 full --server bot5.szspd.cn --ip 182.43.36.134

EOF
}

# ============================================
# 主入口
# ============================================

# 解析参数
COMMAND="full"

while [[ $# -gt 0 ]]; do
    case $1 in
        --server)
            SERVER="$2"
            shift 2
            ;;
        --ip)
            SERVER_IP="$2"
            shift 2
            ;;
        --user)
            SERVER_USER="$2"
            shift 2
            ;;
        --password)
            SERVER_PASS="$2"
            shift 2
            ;;
        full|quick|check|logs|status|restart|stop|help)
            COMMAND="$1"
            shift
            ;;
        *)
            echo "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 执行命令
case "$COMMAND" in
    full)
        full_deploy
        ;;
    quick)
        quick_deploy
        ;;
    check)
        check_local_deps
        test_connection
        ssh_cmd "
            echo '=== 系统信息 ==='
            uname -a
            echo ''
            echo '=== Docker 版本 ==='
            docker --version
            docker-compose --version 2>/dev/null || docker compose version
            echo ''
            echo '=== 磁盘使用 ==='
            df -h /
            echo ''
            echo '=== 内存使用 ==='
            free -h
            echo ''
            echo '=== 部署目录 ==='
            ls -la $DEPLOY_PATH 2>/dev/null || echo '目录不存在'
        "
        ;;
    logs)
        ssh_cmd "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml logs -f --tail=100"
        ;;
    status)
        ssh_cmd "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml ps"
        ;;
    restart)
        ssh_cmd "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml restart"
        sleep 10
        health_check
        ;;
    stop)
        ssh_cmd "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml down"
        log_info "服务已停止"
        ;;
    help|"")
        show_help
        ;;
    *)
        echo "未知命令: $COMMAND"
        show_help
        exit 1
        ;;
esac
