#!/bin/bash

# ============================================
# 7zi-frontend 生产环境部署脚本
# 目标服务器: root@7zi.com (165.99.43.61)
# 用法: ./deploy-production.sh [命令]
# ============================================

set -e

# 配置
SERVER="root@7zi.com"
SERVER_IP="165.99.43.61"
REMOTE_PATH="/var/www/7zi"
PASSWORD='ge20993344$ZZ'
LOCAL_PATH="$(cd "$(dirname "$0")" && pwd)"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# SSH 命令
ssh_cmd() {
    sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no "$SERVER" "$1"
}

# SCP 命令
scp_cmd() {
    sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no "$1" "$2"
}

# 检查依赖
check_dependencies() {
    log_step "检查本地依赖..."
    
    if ! command -v sshpass &> /dev/null; then
        log_error "sshpass 未安装，请运行: apt install sshpass"
        exit 1
    fi
    
    if ! command -v rsync &> /dev/null; then
        log_error "rsync 未安装，请运行: apt install rsync"
        exit 1
    fi
    
    log_info "本地依赖检查通过"
}

# 测试 SSH 连接
test_ssh() {
    log_step "测试 SSH 连接到 $SERVER..."
    
    if ssh_cmd "echo 'SSH连接成功'" &> /dev/null; then
        log_info "SSH 连接成功"
        ssh_cmd "uname -a"
        return 0
    else
        log_error "SSH 连接失败"
        return 1
    fi
}

# 本地构建
build_local() {
    log_step "开始本地构建..."
    
    cd "$LOCAL_PATH"
    
    # 检查 node_modules
    if [ ! -d "node_modules" ]; then
        log_info "安装依赖..."
        npm ci
    fi
    
    # TypeScript 检查
    log_info "TypeScript 类型检查..."
    npm run type-check || log_warn "TypeScript 检查有警告"
    
    # Lint 检查
    log_info "ESLint 检查..."
    npm run lint || log_warn "Lint 检查有警告"
    
    # 构建
    log_info "执行构建..."
    npm run build
    
    log_info "构建完成"
}

# 同步文件到服务器
sync_files() {
    log_step "同步文件到服务器..."
    
    cd "$LOCAL_PATH"
    
    # 创建目标目录
    ssh_cmd "mkdir -p $REMOTE_PATH"
    
    # 使用 rsync 同步（排除不需要的文件）
    rsync -avz --progress \
        --exclude 'node_modules' \
        --exclude '.next/cache' \
        --exclude '.git' \
        --exclude 'test-results' \
        --exclude 'playwright-report' \
        --exclude 'coverage' \
        --exclude '.env.local' \
        --exclude '*.log' \
        --exclude '.DS_Store' \
        -e "sshpass -p '$PASSWORD' ssh -o StrictHostKeyChecking=no" \
        ./ "$SERVER:$REMOTE_PATH/"
    
    log_info "文件同步完成"
}

# 安装服务器依赖
install_deps() {
    log_step "安装服务器依赖..."
    
    ssh_cmd "cd $REMOTE_PATH && npm ci --production"
    
    log_info "服务器依赖安装完成"
}

# 配置环境变量
setup_env() {
    log_step "配置环境变量..."
    
    # 检查是否已存在 .env.production
    if ssh_cmd "[ -f $REMOTE_PATH/.env.production ]" &> /dev/null; then
        log_info ".env.production 已存在"
    else
        log_warn ".env.production 不存在，请手动配置"
        log_info "示例命令: scp .env.production root@7zi.com:$REMOTE_PATH/"
    fi
}

# PM2 部署
deploy_pm2() {
    log_step "使用 PM2 部署..."
    
    # 创建 ecosystem.config.js
    ssh_cmd "cat > $REMOTE_PATH/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: '7zi-frontend',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/7zi',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0'
    },
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    restart_delay: 3000,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/var/log/7zi-error.log',
    out_file: '/var/log/7zi-out.log'
  }]
};
EOF"
    
    # 创建日志目录
    ssh_cmd "mkdir -p /var/log"
    
    # 停止旧进程
    ssh_cmd "cd $REMOTE_PATH && pm2 delete 7zi-frontend 2>/dev/null || true"
    
    # 启动新进程
    ssh_cmd "cd $REMOTE_PATH && pm2 start ecosystem.config.js"
    
    # 保存 PM2 配置
    ssh_cmd "pm2 save"
    
    log_info "PM2 部署完成"
    
    # 显示状态
    ssh_cmd "pm2 list"
}

# Docker 部署
deploy_docker() {
    log_step "使用 Docker 部署..."
    
    # 复制 Docker 相关文件
    scp_cmd "$LOCAL_PATH/Dockerfile.production" "$SERVER:$REMOTE_PATH/Dockerfile"
    scp_cmd "$LOCAL_PATH/docker-compose.prod.yml" "$SERVER:$REMOTE_PATH/docker-compose.prod.yml"
    
    # 构建镜像
    ssh_cmd "cd $REMOTE_PATH && docker build -t 7zi-frontend:latest ."
    
    # 停止旧容器
    ssh_cmd "cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml down || true"
    
    # 启动新容器
    ssh_cmd "cd $REMOTE_PATH && docker-compose -f docker-compose.prod.yml up -d"
    
    log_info "Docker 部署完成"
    
    # 显示状态
    ssh_cmd "docker ps | grep 7zi"
}

# 健康检查
health_check() {
    log_step "执行健康检查..."
    
    sleep 5
    
    if ssh_cmd "curl -sf http://localhost:3000/api/health > /dev/null" &> /dev/null; then
        log_info "健康检查通过 ✓"
        ssh_cmd "curl -s http://localhost:3000/api/health/detailed"
        return 0
    else
        log_error "健康检查失败"
        log_info "查看日志: ssh root@7zi.com 'pm2 logs 7zi-frontend'"
        return 1
    fi
}

# 查看日志
logs() {
    ssh_cmd "pm2 logs 7zi-frontend --lines 100"
}

# 查看状态
status() {
    log_info "服务器状态:"
    ssh_cmd "pm2 list"
    echo ""
    log_info "磁盘使用:"
    ssh_cmd "df -h /"
    echo ""
    log_info "内存使用:"
    ssh_cmd "free -h"
}

# 回滚
rollback() {
    log_warn "回滚到上一个版本..."
    ssh_cmd "cd $REMOTE_PATH && git checkout HEAD~1"
    ssh_cmd "cd $REMOTE_PATH && npm ci --production"
    ssh_cmd "pm2 restart 7zi-frontend"
    log_info "回滚完成"
}

# 完整部署
deploy() {
    log_info "========== 开始完整部署 =========="
    
    check_dependencies
    test_ssh
    build_local
    sync_files
    install_deps
    setup_env
    deploy_pm2
    health_check
    
    log_info "========== 部署完成 =========="
    log_info "访问: https://7zi.com"
}

# 快速部署（跳过构建）
quick_deploy() {
    log_info "========== 开始快速部署 =========="
    
    check_dependencies
    test_ssh
    sync_files
    install_deps
    deploy_pm2
    health_check
    
    log_info "========== 快速部署完成 =========="
}

# 帮助信息
help() {
    echo "用法: $0 {命令}"
    echo ""
    echo "命令:"
    echo "  test        - 测试 SSH 连接"
    echo "  build       - 本地构建"
    echo "  sync        - 同步文件到服务器"
    echo "  install     - 安装服务器依赖"
    echo "  env         - 配置环境变量"
    echo "  pm2         - PM2 部署"
    echo "  docker      - Docker 部署"
    echo "  health      - 健康检查"
    echo "  logs        - 查看日志"
    echo "  status      - 查看服务器状态"
    echo "  rollback    - 回滚到上一版本"
    echo "  deploy      - 完整部署（推荐首次使用）"
    echo "  quick       - 快速部署（跳过本地构建）"
    echo ""
    echo "示例:"
    echo "  $0 deploy     # 完整部署流程"
    echo "  $0 quick      # 快速部署（已有构建）"
    echo "  $0 logs       # 查看服务器日志"
}

# 主入口
case "$1" in
    test)       check_dependencies; test_ssh ;;
    build)      check_dependencies; build_local ;;
    sync)       check_dependencies; sync_files ;;
    install)    install_deps ;;
    env)        setup_env ;;
    pm2)        deploy_pm2 ;;
    docker)     deploy_docker ;;
    health)     health_check ;;
    logs)       logs ;;
    status)     status ;;
    rollback)   rollback ;;
    deploy)     deploy ;;
    quick)      quick_deploy ;;
    *)          help ;;
esac