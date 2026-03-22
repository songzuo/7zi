#!/bin/bash

# ============================================
# 7zi-frontend 远程部署脚本
# 从本地部署到 7zi.com 服务器
# ============================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 服务器配置
SERVER_HOST="7zi.com"
SERVER_IP="165.99.43.61"
SERVER_USER="root"
SERVER_PASS='ge20993344$ZZ'
DEPLOY_PATH="/opt/7zi-frontend"

# 项目配置
PROJECT_NAME="7zi-frontend"
IMAGE_NAME="7zi-frontend"
CONTAINER_NAME="7zi-frontend"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# SSH 命令 (密码需要单引号)
ssh_cmd() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_HOST" "$1"
}

# SCP 命令
scp_cmd() {
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no "$1" "$SERVER_USER@$SERVER_HOST:$2"
}

# 检查本地依赖
check_local() {
    log_step "检查本地依赖..."
    
    if ! command -v sshpass &> /dev/null; then
        log_error "sshpass 未安装，请运行: apt install sshpass"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    log_info "本地依赖检查通过"
}

# 检查服务器连接
check_server() {
    log_step "检查服务器连接..."
    
    if ssh_cmd "echo '连接成功'" &> /dev/null; then
        log_info "服务器连接正常"
    else
        log_error "无法连接到服务器"
        exit 1
    fi
}

# 检查服务器 Docker 环境
check_server_docker() {
    log_step "检查服务器 Docker 环境..."
    
    ssh_cmd "
        if ! command -v docker &> /dev/null; then
            echo 'Docker 未安装，正在安装...'
            curl -fsSL https://get.docker.com | sh
            systemctl enable docker
            systemctl start docker
        fi
        
        if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
            echo 'Docker Compose 未安装，正在安装...'
            curl -L 'https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-\$(uname -s)-\$(uname -m)' -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi
        
        echo 'Docker 环境: '\$(docker --version)
        echo 'Docker Compose: '\$(docker-compose --version 2>/dev/null || docker compose version)
    "
    
    log_info "服务器 Docker 环境检查完成"
}

# 创建部署目录
setup_deploy_dir() {
    log_step "创建部署目录..."
    
    ssh_cmd "
        mkdir -p $DEPLOY_PATH
        mkdir -p $DEPLOY_PATH/nginx/ssl
        mkdir -p $DEPLOY_PATH/nginx/logs
        mkdir -p /opt/backups
    "
    
    log_info "部署目录已创建"
}

# 同步代码到服务器
sync_code() {
    log_step "同步代码到服务器..."
    
    # 排除不需要的文件
    rsync -avz --delete \
        --exclude '.git' \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude 'coverage' \
        --exclude '*.log' \
        --exclude '.env.local' \
        -e "sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no" \
        ./ "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"
    
    log_info "代码同步完成"
}

# 创建生产环境配置
setup_env() {
    log_step "配置环境变量..."
    
    ssh_cmd "
        if [ ! -f $DEPLOY_PATH/.env.production ]; then
            echo '创建 .env.production...'
            cat > $DEPLOY_PATH/.env.production << 'EOF'
# 生产环境配置
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# 网站统计（请填入实际值）
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_UMAMI_ID=
NEXT_PUBLIC_UMAMI_URL=https://analytics.umami.is
NEXT_PUBLIC_PLAUSIBLE_ID=7zi.com
NEXT_PUBLIC_BAIDU_ID=

# 邮件服务
RESEND_API_KEY=
CONTACT_EMAIL=business@7zi.studio
FROM_EMAIL=noreply@7zi.studio
EOF
            echo '请编辑 $DEPLOY_PATH/.env.production 填入实际配置'
        fi
    "
    
    log_info "环境变量配置完成"
}

# 构建 Docker 镜像
build_image() {
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
        
        echo '镜像构建完成'
    "
    
    log_info "Docker 镜像构建完成"
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
        sleep 10
        
        # 检查容器状态
        docker-compose -f docker-compose.prod.yml ps
    "
    
    log_info "服务已启动"
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

# 查看日志
logs() {
    ssh_cmd "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml logs -f --tail=100"
}

# 查看状态
status() {
    ssh_cmd "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml ps"
}

# 停止服务
stop() {
    log_step "停止服务..."
    ssh_cmd "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml down"
    log_info "服务已停止"
}

# 重启服务
restart() {
    stop
    sleep 2
    start_service
    health_check
}

# 完整部署
deploy() {
    log_info "🚀 开始完整部署流程..."
    echo ""
    
    check_local
    check_server
    check_server_docker
    setup_deploy_dir
    sync_code
    setup_env
    build_image
    start_service
    health_check
    
    echo ""
    log_info "🎉 部署完成！"
    echo ""
    echo "访问地址: http://$SERVER_HOST:3000"
    echo ""
    echo "常用命令:"
    echo "  $0 logs     - 查看日志"
    echo "  $0 status   - 查看状态"
    echo "  $0 restart  - 重启服务"
    echo "  $0 stop     - 停止服务"
}

# 快速部署（仅同步和重启）
quick_deploy() {
    log_info "⚡ 快速部署..."
    
    check_local
    check_server
    sync_code
    
    ssh_cmd "cd $DEPLOY_PATH && docker-compose -f docker-compose.prod.yml restart"
    
    health_check
    log_info "快速部署完成"
}

# 回滚
rollback() {
    log_warn "⚠️ 回滚到上一个版本..."
    
    ssh_cmd "
        cd $DEPLOY_PATH
        
        # 查找最近的备份
        LATEST_BACKUP=\$(ls -dt /opt/backups/7zi-frontend-* 2>/dev/null | head -1)
        
        if [ -z \"\$LATEST_BACKUP\" ]; then
            echo '没有找到备份'
            exit 1
        fi
        
        echo \"使用备份: \$LATEST_BACKUP\"
        
        # 停止服务
        docker-compose -f docker-compose.prod.yml down
        
        # 恢复
        cp -r \"\$LATEST_BACKUP/.next\" ./
        
        # 重启
        docker-compose -f docker-compose.prod.yml up -d
    "
    
    health_check
    log_info "回滚完成"
}

# 清理旧资源
cleanup() {
    log_step "清理旧 Docker 资源..."
    
    ssh_cmd "
        cd $DEPLOY_PATH
        
        # 清理未使用的镜像
        docker image prune -f
        
        # 清理未使用的容器
        docker container prune -f
        
        # 清理旧的备份（保留最近5个）
        ls -dt /opt/backups/7zi-frontend-* 2>/dev/null | tail -n +6 | xargs -r rm -rf
        
        echo '清理完成'
    "
    
    log_info "清理完成"
}

# 帮助信息
help() {
    echo "用法: $0 <命令>"
    echo ""
    echo "命令:"
    echo "  deploy      - 完整部署（推荐首次使用）"
    echo "  quick       - 快速部署（仅同步代码和重启）"
    echo "  build       - 仅构建镜像"
    echo "  start       - 启动服务"
    echo "  stop        - 停止服务"
    echo "  restart     - 重启服务"
    echo "  logs        - 查看日志"
    echo "  status      - 查看状态"
    echo "  health      - 健康检查"
    echo "  rollback    - 回滚到上一个版本"
    echo "  cleanup     - 清理旧资源"
    echo "  check       - 检查服务器环境"
    echo ""
    echo "示例:"
    echo "  $0 deploy   # 完整部署"
    echo "  $0 logs     # 查看日志"
    echo "  $0 restart  # 重启服务"
}

# 主入口
case "${1:-}" in
    deploy)
        deploy
        ;;
    quick)
        quick_deploy
        ;;
    build)
        check_local && check_server && build_image
        ;;
    start)
        check_local && check_server && start_service
        ;;
    stop)
        check_local && check_server && stop
        ;;
    restart)
        check_local && check_server && restart
        ;;
    logs)
        check_local && logs
        ;;
    status)
        check_local && status
        ;;
    health)
        check_local && health_check
        ;;
    rollback)
        check_local && check_server && rollback
        ;;
    cleanup)
        check_local && check_server && cleanup
        ;;
    check)
        check_local && check_server && check_server_docker
        ;;
    *)
        help
        exit 1
        ;;
esac