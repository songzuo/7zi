#!/bin/bash

# ============================================
# 7zi-frontend 零停机部署脚本
# 版本: 2.0 - 蓝绿部署策略
# ============================================

set -e

# ============================================
# 配置
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_HOST="7zi.com"
SERVER_IP="165.99.43.61"
SERVER_USER="root"
SERVER_PASS='ge20993344$ZZ'
DEPLOY_PATH="/opt/7zi-frontend"
BACKUP_PATH="/opt/backups/7zi-frontend"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================
# 日志函数
# ============================================
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }
log_deploy() { echo -e "${CYAN}[DEPLOY]${NC} $1"; }

# ============================================
# SSH 命令封装
# ============================================
ssh_cmd() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=30 "$SERVER_USER@$SERVER_HOST" "$1"
}

scp_cmd() {
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no "$1" "$SERVER_USER@$SERVER_HOST:$2"
}

# ============================================
# 获取当前活跃的部署槽
# ============================================
get_active_slot() {
    local slot=$(ssh_cmd "docker ps --filter 'name=7zi-frontend-blue' --filter 'status=running' -q | head -1")
    if [ -n "$slot" ]; then
        echo "blue"
    else
        echo "green"
    fi
}

# ============================================
# 健康检查
# ============================================
health_check() {
    local container=$1
    local max_attempts=15
    local attempt=1
    
    log_step "健康检查: $container"
    
    while [ $attempt -le $max_attempts ]; do
        if ssh_cmd "docker exec $container node -e \"require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"" 2>/dev/null; then
            log_info "✅ $container 健康检查通过"
            return 0
        fi
        
        echo "  尝试 $attempt/$max_attempts..."
        sleep 3
        attempt=$((attempt + 1))
    done
    
    log_error "❌ $container 健康检查失败"
    return 1
}

# ============================================
# 零停机部署（蓝绿部署）
# ============================================
zero_downtime_deploy() {
    log_deploy "🚀 开始零停机部署..."
    
    # 1. 检查本地环境
    log_step "检查本地环境..."
    if ! command -v sshpass &> /dev/null; then
        log_error "sshpass 未安装"
        exit 1
    fi
    log_info "本地环境检查通过"
    
    # 2. 检查服务器连接
    log_step "检查服务器连接..."
    if ! ssh_cmd "echo '连接成功'" &> /dev/null; then
        log_error "无法连接到服务器"
        exit 1
    fi
    log_info "服务器连接正常"
    
    # 3. 同步代码
    log_step "同步代码到服务器..."
    rsync -avz --delete \
        --exclude '.git' \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude 'coverage' \
        --exclude '*.log' \
        --exclude '.env.local' \
        -e "sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no" \
        "$SCRIPT_DIR/" "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"
    log_info "代码同步完成"
    
    # 4. 确定当前活跃槽和目标槽
    CURRENT_SLOT=$(get_active_slot)
    if [ "$CURRENT_SLOT" = "blue" ]; then
        TARGET_SLOT="green"
    else
        TARGET_SLOT="blue"
    fi
    
    log_deploy "当前活跃: $CURRENT_SLOT → 目标部署: $TARGET_SLOT"
    
    # 5. 创建备份
    log_step "创建备份..."
    BACKUP_DIR="$BACKUP_PATH/$(date +%Y%m%d-%H%M%S)"
    ssh_cmd "mkdir -p $BACKUP_DIR && cp -r $DEPLOY_PATH/.next $BACKUP_DIR/ 2>/dev/null || true"
    log_info "备份已创建: $BACKUP_DIR"
    
    # 6. 构建新版本镜像
    log_step "构建 $TARGET_SLOT 镜像..."
    ssh_cmd "
        cd $DEPLOY_PATH
        docker-compose -f docker-compose.zero-downtime.yml build 7zi-frontend-$TARGET_SLOT --no-cache
    "
    log_info "镜像构建完成"
    
    # 7. 启动新版本容器
    log_step "启动 $TARGET_SLOT 容器..."
    if [ "$TARGET_SLOT" = "green" ]; then
        ssh_cmd "
            cd $DEPLOY_PATH
            docker-compose -f docker-compose.zero-downtime.yml --profile green up -d 7zi-frontend-green
        "
    else
        ssh_cmd "
            cd $DEPLOY_PATH
            docker-compose -f docker-compose.zero-downtime.yml up -d 7zi-frontend-blue
        "
    fi
    
    # 8. 等待新容器启动
    log_step "等待 $TARGET_SLOT 容器就绪..."
    sleep 10
    
    # 9. 健康检查新容器
    CONTAINER_NAME="7zi-frontend-$TARGET_SLOT"
    if ! health_check "$CONTAINER_NAME"; then
        log_error "新版本健康检查失败，回滚..."
        ssh_cmd "docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"
        exit 1
    fi
    
    # 10. 切换流量到新版本
    log_step "切换流量到 $TARGET_SLOT..."
    ssh_cmd "
        cd $DEPLOY_PATH
        
        # 更新 upstream 配置
        cat > nginx/conf.d/upstream.conf << 'UPSTREAM'
upstream frontend_backend {
    server 7zi-frontend-$TARGET_SLOT:3000;
    keepalive 32;
}
UPSTREAM
        
        # 平滑重载 nginx
        docker exec 7zi-nginx nginx -s reload
    "
    log_info "流量已切换到 $TARGET_SLOT"
    
    # 11. 等待流量稳定
    log_step "等待流量稳定..."
    sleep 5
    
    # 12. 停止旧版本容器
    log_step "停止旧版本 $CURRENT_SLOT..."
    ssh_cmd "
        cd $DEPLOY_PATH
        docker-compose -f docker-compose.zero-downtime.yml stop 7zi-frontend-$CURRENT_SLOT 2>/dev/null || true
        docker-compose -f docker-compose.zero-downtime.yml rm -f 7zi-frontend-$CURRENT_SLOT 2>/dev/null || true
    "
    log_info "旧版本已停止"
    
    # 13. 清理旧镜像
    log_step "清理旧资源..."
    ssh_cmd "
        docker image prune -f
        # 保留最近 5 个备份
        ls -dt $BACKUP_PATH/* 2>/dev/null | tail -n +6 | xargs -r rm -rf
    "
    log_info "清理完成"
    
    # 14. 最终验证
    log_step "最终验证..."
    if ssh_cmd "curl -sf https://7zi.com/api/health > /dev/null 2>&1"; then
        log_info "✅ 部署成功！"
    else
        log_warn "⚠️  部署完成但外部访问验证失败，请检查"
    fi
    
    # 15. 显示状态
    echo ""
    log_deploy "🎉 零停机部署完成！"
    echo ""
    echo "  当前活跃: $TARGET_SLOT"
    echo "  访问地址: https://7zi.com"
    echo ""
    ssh_cmd "cd $DEPLOY_PATH && docker-compose -f docker-compose.zero-downtime.yml ps"
}

# ============================================
# 快速部署（滚动更新）
# ============================================
rolling_deploy() {
    log_deploy "⚡ 开始滚动更新部署..."
    
    check_local
    check_server
    
    log_step "同步代码..."
    rsync -avz --delete \
        --exclude '.git' \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude 'coverage' \
        -e "sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no" \
        "$SCRIPT_DIR/" "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"
    
    log_step "重建并重启服务..."
    ssh_cmd "
        cd $DEPLOY_PATH
        
        # 使用 docker-compose 的滚动更新功能
        docker-compose -f docker-compose.zero-downtime.yml up -d \
            --build \
            --force-recreate \
            --no-deps \
            7zi-frontend-\$(docker ps --filter 'name=7zi-frontend' --format '{{.Names}}' | head -1 | sed 's/7zi-frontend-//')
        
        sleep 15
        
        # 健康检查
        for i in {1..10}; do
            if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
                echo '✅ 滚动更新成功'
                exit 0
            fi
            sleep 3
        done
        
        echo '❌ 健康检查失败'
        exit 1
    "
    
    log_info "滚动更新完成"
}

# ============================================
# 回滚
# ============================================
rollback() {
    log_warn "⚠️  开始回滚..."
    
    CURRENT_SLOT=$(get_active_slot)
    if [ "$CURRENT_SLOT" = "blue" ]; then
        TARGET_SLOT="green"
    else
        TARGET_SLOT="blue"
    fi
    
    log_step "检查 $TARGET_SLOT 容器状态..."
    
    # 检查目标槽是否有可用容器
    if ! ssh_cmd "docker ps -a --filter 'name=7zi-frontend-$TARGET_SLOT' -q | head -1" | grep -q .; then
        log_error "没有可回滚的版本"
        exit 1
    fi
    
    log_step "切换到 $TARGET_SLOT..."
    ssh_cmd "
        cd $DEPLOY_PATH
        
        # 启动目标容器
        docker-compose -f docker-compose.zero-downtime.yml up -d 7zi-frontend-$TARGET_SLOT
        
        sleep 10
        
        # 更新 upstream
        cat > nginx/conf.d/upstream.conf << 'UPSTREAM'
upstream frontend_backend {
    server 7zi-frontend-$TARGET_SLOT:3000;
    keepalive 32;
}
UPSTREAM
        
        # 重载 nginx
        docker exec 7zi-nginx nginx -s reload
        
        # 停止当前容器
        docker-compose -f docker-compose.zero-downtime.yml stop 7zi-frontend-$CURRENT_SLOT
    "
    
    if health_check "7zi-frontend-$TARGET_SLOT"; then
        log_info "✅ 回滚成功！当前活跃: $TARGET_SLOT"
    else
        log_error "❌ 回滚失败"
        exit 1
    fi
}

# ============================================
# 查看状态
# ============================================
status() {
    log_step "服务状态..."
    ssh_cmd "
        cd $DEPLOY_PATH
        echo '=== Docker 容器状态 ==='
        docker-compose -f docker-compose.zero-downtime.yml ps
        echo ''
        echo '=== 健康检查 ==='
        curl -s http://localhost:3000/api/health | jq . 2>/dev/null || curl -s http://localhost:3000/api/health
        echo ''
        echo '=== Nginx 状态 ==='
        docker exec 7zi-nginx nginx -t 2>&1
    "
}

# ============================================
# 查看日志
# ============================================
logs() {
    local service=${1:-7zi-frontend-blue}
    ssh_cmd "cd $DEPLOY_PATH && docker-compose -f docker-compose.zero-downtime.yml logs -f --tail=100 $service"
}

# ============================================
# 检查函数
# ============================================
check_local() {
    log_step "检查本地环境..."
    command -v sshpass &> /dev/null || { log_error "需要 sshpass"; exit 1; }
    command -v rsync &> /dev/null || { log_error "需要 rsync"; exit 1; }
    log_info "本地环境正常"
}

check_server() {
    log_step "检查服务器连接..."
    ssh_cmd "echo '连接正常'" &> /dev/null || { log_error "服务器连接失败"; exit 1; }
    log_info "服务器连接正常"
}

# ============================================
# 帮助信息
# ============================================
help() {
    echo "用法: $0 <命令>"
    echo ""
    echo "部署命令:"
    echo "  deploy      - 零停机部署（蓝绿部署，推荐）"
    echo "  rolling     - 滚动更新部署"
    echo "  rollback    - 回滚到上一个版本"
    echo ""
    echo "管理命令:"
    echo "  status      - 查看服务状态"
    echo "  logs [svc]  - 查看日志（默认 blue）"
    echo "  health      - 健康检查"
    echo "  cleanup     - 清理旧资源"
    echo ""
    echo "示例:"
    echo "  $0 deploy           # 零停机部署"
    echo "  $0 logs 7zi-nginx   # 查看 nginx 日志"
    echo "  $0 rollback         # 回滚"
}

# ============================================
# 主入口
# ============================================
case "${1:-}" in
    deploy)
        zero_downtime_deploy
        ;;
    rolling)
        rolling_deploy
        ;;
    rollback)
        check_local && check_server && rollback
        ;;
    status)
        check_local && status
        ;;
    logs)
        check_local && logs "${2:-}"
        ;;
    health)
        check_local && ssh_cmd "curl -s http://localhost:3000/api/health | jq ."
        ;;
    cleanup)
        check_local && check_server && ssh_cmd "docker system prune -f && docker image prune -f"
        log_info "清理完成"
        ;;
    *)
        help
        exit 1
        ;;
esac
