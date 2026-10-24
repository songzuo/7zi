#!/bin/bash

# ============================================
# 7zi-frontend 统一部署脚本
# 版本: 3.0 - 增强版
# 特性:
# - 多环境支持 (dev/staging/production)
# - 健全的回滚机制（保留最近 3 个版本）
# - 健康检查自动化（失败自动回滚）
# - 环境变量验证
# - 零停机部署（蓝绿策略）
# ============================================

set -e

# ============================================
# 配置
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="7zi-frontend"

# 服务器配置
SERVER_HOST="7zi.com"
SERVER_IP="198.44.179.155"
SERVER_USER="root"
SERVER_PASS="${SSH_PASSWORD:-}"

# 路径配置
DEPLOY_PATH="/opt/7zi-frontend"
BACKUP_PATH="/opt/backups/7zi-frontend"
HISTORY_FILE="/opt/backups/7zi-frontend/deploy-history.json"

# 环境配置（默认）
ENVIRONMENT="${ENVIRONMENT:-production}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# ============================================
# 日志函数
# ============================================
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_deploy() {
    echo -e "${CYAN}[DEPLOY]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_rollback() {
    echo -e "${MAGENTA}[ROLLBACK]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

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
# 环境相关函数
# ============================================
get_compose_file() {
    case "$ENVIRONMENT" in
        dev)
            echo "docker-compose.dev.yml"
            ;;
        staging)
            echo "docker-compose.staging.yml"
            ;;
        production)
            echo "docker-compose.zero-downtime.yml"
            ;;
        *)
            log_error "未知环境: $ENVIRONMENT"
            exit 1
            ;;
    esac
}

get_env_file() {
    case "$ENVIRONMENT" in
        dev)
            echo ".env.development"
            ;;
        staging)
            echo ".env.staging"
            ;;
        production)
            echo ".env.production"
            ;;
    esac
}

validate_environment() {
    log_step "验证环境配置: $ENVIRONMENT"

    local required_vars=(
        "ENVIRONMENT"
        "SERVER_HOST"
    )

    case "$ENVIRONMENT" in
        dev)
            required_vars+=("NEXT_PUBLIC_GA_ID")
            ;;
        staging)
            required_vars+=("NEXT_PUBLIC_GA_ID")
            ;;
        production)
            required_vars+=("NEXT_PUBLIC_GA_ID" "NEXT_PUBLIC_UMAMI_ID")
            ;;
    esac

    for var in "${required_vars[@]}"; do
        if ! ssh_cmd "grep -q '^${var}=' $DEPLOY_PATH/$(get_env_file) 2>/dev/null"; then
            log_warn "环境变量 $ENVIRONMENT 未在 $(get_env_file) 中定义"
        fi
    done

    log_info "环境验证通过"
}

# ============================================
# 版本管理
# ============================================
generate_version() {
    date '+v%Y%m%d-%H%M%S'
}

record_deployment() {
    local version=$1
    local status=$2
    local message=$3

    ssh_cmd "
        mkdir -p $BACKUP_PATH
        if [ ! -f $HISTORY_FILE ]; then
            echo '[]' > $HISTORY_FILE
        fi
        jq --arg v '$version' --arg s '$status' --arg m '$message' --arg d '$(date -Iseconds)' \
           '. + [{version: \$v, status: \$s, message: \$m, date: \$d}]' $HISTORY_FILE > /tmp/history.json
        mv /tmp/history.json $HISTORY_FILE
    " 2>/dev/null || true
}

get_deployment_history() {
    ssh_cmd "cat $HISTORY_FILE 2>/dev/null || echo '[]'" | jq '.'
}

list_backups() {
    ssh_cmd "
        if [ -d $BACKUP_PATH ]; then
            ls -1t $BACKUP_PATH/ 2>/dev/null | grep -v '.json' | head -10 || echo 'No backups found'
        else
            echo 'Backup directory not found'
        fi
    "
}

# ============================================
# 健康检查
# ============================================
# 部署拓扑（2026-10-24 核实，见 T90_DEPLOY_HEALTHCHECK_FIX.md）：
#   - 应用进程在容器内监听 3000（Dockerfile: ENV PORT=3000 / EXPOSE 3000），
#     但 3000 **不是宿主机的对外服务端口**：生产源站实测
#     `curl http://127.0.0.1:3000/api/health` -> 000（连接被拒）。
#   - 对外入口是 nginx（80/443）反代到应用：生产 `/api/health` ->
#     `proxy_pass http://127.0.0.1:3001`（next-server）；
#     docker 拓扑下 nginx upstream 为 7zi-frontend-<slot>:3000。
#   - Cloudflare/WAF 会拦截默认 curl UA（首页返回 403），健康检查必须带浏览器 UA。
#
# 因此健康检查按三层判定：
#   1) 容器处于 running
#   2) 容器内自检：docker exec <容器> 访问 127.0.0.1:3000/api/health
#      —— 这是判定"待发布槽位是否真的可用"的权威依据
#   3) 公开入口探测（nginx / 域名 /api/health）—— 判定用户可见链路
#      默认只告警（蓝绿切换前新槽位尚未挂到 upstream，硬失败会误判）；
#      传 "strict" 时作为硬失败条件（用于流量已切换后的回滚校验）。

HEALTH_INTERNAL_PORT="${HEALTH_INTERNAL_PORT:-3000}"
HEALTH_PUBLIC_URLS="${HEALTH_PUBLIC_URLS:-http://127.0.0.1/api/health https://7zi.com/api/health}"
HEALTH_BROWSER_UA="${HEALTH_BROWSER_UA:-Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36}"

# 远程 HTTP 探测：URL 返回 200 视为通过
remote_http_ok() {
    local url=$1
    local code
    code=$(ssh_cmd "curl -s -o /dev/null -w '%{http_code}' -L --max-time 15 -A '$HEALTH_BROWSER_UA' -H 'Host: 7zi.com' '$url'" 2>/dev/null | tr -d '\r\n' || true)
    [ "$code" = "200" ]
}

# 容器内 HTTP 探测：直接命中容器里的应用端口
container_http_ok() {
    local container=$1
    local port=$2
    # 用精确容器 ID 执行，避免 name 前缀匹配到多个容器时 docker exec 失败
    local cid
    cid=$(ssh_cmd "docker ps --filter 'name=$container' --filter 'status=running' --format '{{.ID}}' | head -1" 2>/dev/null | tr -d '\r\n')
    [ -z "$cid" ] && return 1
    ssh_cmd "docker exec $cid node -e \"require('http').get('http://127.0.0.1:$port/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))\"" >/dev/null 2>&1
}

health_check() {
    local target=$1
    local mode=${2:-}
    local max_attempts=15
    local attempt=1

    log_step "健康检查: $target"

    # 无容器名时退化为纯公开入口巡检
    local check_container=1
    if [ -z "$target" ] || [ "$target" = "null" ]; then
        check_container=0
        target="公开入口"
    fi

    while [ $attempt -le $max_attempts ]; do
        if [ $check_container -eq 1 ]; then
            # 1. 检查容器状态
            if ! ssh_cmd "docker ps --filter 'name=$target' --filter 'status=running' -q | grep -q ."; then
                echo "  尝试 $attempt/$max_attempts - 容器未运行"
                sleep 3
                attempt=$((attempt + 1))
                continue
            fi

            # 2. 容器内自检（3000 是容器内部端口，必须在容器内访问）
            if container_http_ok "$target" "$HEALTH_INTERNAL_PORT"; then
                log_info "✅ $target 容器内健康检查通过 (127.0.0.1:$HEALTH_INTERNAL_PORT/api/health)"
            else
                echo "  尝试 $attempt/$max_attempts - 容器内 API 健康检查失败"
                sleep 3
                attempt=$((attempt + 1))
                continue
            fi
        fi

        # 3. 公开入口检查（nginx 反代 / 域名）
        local public_ok=0
        local url
        for url in $HEALTH_PUBLIC_URLS; do
            if remote_http_ok "$url"; then
                log_info "✅ 公开入口健康检查通过: $url"
                public_ok=1
                break
            fi
        done

        if [ $public_ok -eq 1 ]; then
            return 0
        fi

        if [ "$mode" = "strict" ]; then
            echo "  尝试 $attempt/$max_attempts - 公开入口健康检查失败 (strict)"
            sleep 3
            attempt=$((attempt + 1))
            continue
        fi

        log_warn "⚠️  公开入口健康检查未通过（容器内检查已通过），继续放行"
        return 0
    done

    log_error "❌ $target 健康检查失败"
    return 1
}

check_service_status() {
    log_step "检查服务状态..."

    ssh_cmd "
        echo '=== 容器状态 ==='
        docker ps --filter 'name=7zi' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
        echo ''
        echo '=== 容器资源使用 ==='
        docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' \$(docker ps --filter 'name=7zi' -q)
        echo ''
        echo '=== 最近日志 ==='
        docker logs --tail=20 \$(docker ps --filter 'name=7zi-frontend' --format '{{.Names}}' | head -1)
    "
}

# ============================================
# 备份和恢复
# ============================================
create_backup() {
    local version=$1
    local backup_dir="$BACKUP_PATH/$version"

    log_step "创建备份: $backup_dir"

    ssh_cmd "
        mkdir -p $backup_dir

        # 备份构建产物
        if [ -d $DEPLOY_PATH/.next ]; then
            cp -r $DEPLOY_PATH/.next $backup_dir/
        fi

        # 备份环境变量
        if [ -f $DEPLOY_PATH/$(get_env_file) ]; then
            cp $DEPLOY_PATH/$(get_env_file) $backup_dir/
        fi

        # 备份 Docker 镜像（导出）
        docker images --format '{{.Repository}}:{{.Tag}}' | grep '7zi-frontend' | \
            while read img; do
                if [ -n \"\$img\" ]; then
                    docker save \"\$img\" > $backup_dir/\$(echo \"\$img\" | tr '/' '-').tar 2>/dev/null || true
                fi
            done

        # 记录备份信息
        echo '{\"version\": \"$version\", \"date\": \"$(date -Iseconds)\", \"environment\": \"$ENVIRONMENT\"}' > $backup_dir/backup-info.json
    "

    log_info "备份完成: $backup_dir"
}

cleanup_old_backups() {
    log_step "清理旧备份（保留最近 3 个）..."

    ssh_cmd "
        if [ -d $BACKUP_PATH ]; then
            # 保留最近 3 个备份
            ls -1dt $BACKUP_PATH/v* 2>/dev/null | tail -n +4 | xargs -r rm -rf
        fi
    "

    log_info "清理完成，保留版本:"
    list_backups
}

# ============================================
# 部署函数
# ============================================
check_prerequisites() {
    log_step "检查前置条件..."

    # 本地依赖
    if ! command -v sshpass &> /dev/null; then
        log_error "sshpass 未安装"
        exit 1
    fi

    if ! command -v rsync &> /dev/null; then
        log_error "rsync 未安装"
        exit 1
    fi

    # 服务器连接
    if ! ssh_cmd "echo '连接正常'" &> /dev/null; then
        log_error "服务器连接失败"
        exit 1
    fi

    # Docker 环境
    if ! ssh_cmd "docker --version &> /dev/null"; then
        log_error "服务器 Docker 未安装"
        exit 1
    fi

    log_info "前置条件检查通过"
}

sync_code() {
    log_step "同步代码到服务器..."

    local compose_file=$(get_compose_file)

    rsync -avz --delete \
        --exclude '.git' \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude 'coverage' \
        --exclude '*.log' \
        --exclude '.env.local' \
        --exclude '.env.development' \
        --exclude '.env.staging' \
        --exclude '.env.production' \
        -e "sshpass -p '$SERVER_PASS' ssh -o StrictHostKeyChecking=no" \
        "$SCRIPT_DIR/" "$SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/"

    log_info "代码同步完成"
}

deploy_zero_downtime() {
    log_deploy "🚀 开始零停机部署..."

    local version=$(generate_version)
    local compose_file=$(get_compose_file)

    log_info "部署版本: $version"
    log_info "目标环境: $ENVIRONMENT"

    # 1. 检查前置条件
    check_prerequisites

    # 2. 验证环境
    validate_environment

    # 3. 同步代码
    sync_code

    # 4. 创建备份
    create_backup "$version"

    # 5. 确定蓝绿槽位
    CURRENT_SLOT=$(ssh_cmd "docker ps --filter 'name=7zi-frontend-blue' --filter 'status=running' -q | head -1")
    if [ -n "$CURRENT_SLOT" ]; then
        CURRENT="blue"
        TARGET="green"
    else
        CURRENT="green"
        TARGET="blue"
    fi

    log_deploy "蓝绿部署: $CURRENT → $TARGET"

    # 6. 构建新版本
    log_step "构建 $TARGET 槽位镜像..."
    ssh_cmd "
        cd $DEPLOY_PATH
        docker-compose -f $compose_file build 7zi-frontend-$TARGET --no-cache
    "

    # 7. 启动新版本
    log_step "启动 $TARGET 容器..."
    if [ "$TARGET" = "green" ]; then
        ssh_cmd "cd $DEPLOY_PATH && docker-compose -f $compose_file --profile green up -d 7zi-frontend-green"
    else
        ssh_cmd "cd $DEPLOY_PATH && docker-compose -f $compose_file up -d 7zi-frontend-blue"
    fi

    # 8. 健康检查
    if ! health_check "7zi-frontend-$TARGET"; then
        log_error "新版本健康检查失败，准备回滚..."
        rollback_to_slot "$CURRENT" "$version"
        exit 1
    fi

    # 9. 切换流量
    log_step "切换流量到 $TARGET..."
    ssh_cmd "
        cd $DEPLOY_PATH
        cat > nginx/conf.d/upstream.conf << 'UPSTREAM'
upstream frontend_backend {
    server 7zi-frontend-$TARGET:3000;
    keepalive 32;
}
UPSTREAM
        docker exec 7zi-nginx nginx -s reload
    "

    # 10. 停止旧版本
    log_step "停止旧版本 $CURRENT..."
    ssh_cmd "
        cd $DEPLOY_PATH
        docker-compose -f $compose_file stop 7zi-frontend-$CURRENT 2>/dev/null || true
        docker-compose -f $compose_file rm -f 7zi-frontend-$CURRENT 2>/dev/null || true
    "

    # 11. 清理旧备份
    cleanup_old_backups

    # 12. 最终验证
    log_step "最终验证..."
    if remote_http_ok "https://7zi.com/api/health"; then
        log_info "✅ 外部访问验证通过"
    else
        log_warn "⚠️  外部访问验证失败，请检查"
    fi

    # 13. 记录部署
    record_deployment "$version" "success" "零停机部署到 $ENVIRONMENT 环境"

    # 14. 显示状态
    echo ""
    log_deploy "🎉 部署完成！"
    echo ""
    echo "  版本: $version"
    echo "  环境: $ENVIRONMENT"
    echo "  活跃槽位: $TARGET"
    echo "  访问地址: https://7zi.com"
    echo ""

    check_service_status
}

# ============================================
# 回滚函数
# ============================================
rollback_to_slot() {
    local target_slot=$1
    local version=$2

    log_rollback "⚠️  回滚到槽位: $target_slot"

    local compose_file=$(get_compose_file)

    ssh_cmd "
        cd $DEPLOY_PATH

        # 启动目标槽位
        docker-compose -f $compose_file up -d 7zi-frontend-$target_slot

        # 等待启动
        sleep 10

        # 切换流量
        cat > nginx/conf.d/upstream.conf << 'UPSTREAM'
upstream frontend_backend {
    server 7zi-frontend-$target_slot:3000;
    keepalive 32;
}
UPSTREAM
        docker exec 7zi-nginx nginx -s reload

        # 停止失败版本
        docker-compose -f $compose_file stop 7zi-frontend-\$(docker ps --filter 'name=7zi-frontend' --format '{{.Names}}' | grep -v $target_slot | head -1) 2>/dev/null || true
    "

    if health_check "7zi-frontend-$target_slot" "strict"; then
        log_rollback "✅ 回滚成功！当前活跃: $target_slot"
        record_deployment "$version" "rolled_back" "回滚到 $target_slot"
    else
        log_error "❌ 回滚失败！需要手动介入"
        record_deployment "$version" "rollback_failed" "回滚失败"
        exit 1
    fi
}

rollback_to_version() {
    local version=$1

    log_rollback "⚠️  回滚到版本: $version"

    local backup_dir="$BACKUP_PATH/$version"

    if ! ssh_cmd "test -d $backup_dir"; then
        log_error "备份不存在: $backup_dir"
        exit 1
    fi

    log_step "恢复备份: $backup_dir"

    local compose_file=$(get_compose_file)

    # 1. 停止当前服务
    ssh_cmd "cd $DEPLOY_PATH && docker-compose -f $compose_file down 2>/dev/null || true"

    # 2. 恢复构建产物
    ssh_cmd "cp -r $backup_dir/.next $DEPLOY_PATH/ 2>/dev/null || true"

    # 3. 恢复环境变量
    ssh_cmd "cp $backup_dir/$(get_env_file) $DEPLOY_PATH/ 2>/dev/null || true"

    # 4. 重新构建和启动
    ssh_cmd "
        cd $DEPLOY_PATH
        docker-compose -f $compose_file build --no-cache
        docker-compose -f $compose_file up -d
    "

    # 5. 健康检查
    if health_check "7zi-frontend"; then
        log_rollback "✅ 回滚成功！"
        record_deployment "$version" "success" "回滚到版本 $version"
    else
        log_error "❌ 回滚失败！需要手动介入"
        record_deployment "$version" "rollback_failed" "版本回滚失败"
        exit 1
    fi
}

quick_rollback() {
    log_rollback "⚠️  快速回滚（蓝绿槽位切换）..."

    CURRENT_SLOT=$(ssh_cmd "docker ps --filter 'name=7zi-frontend-blue' --filter 'status=running' -q | head -1")
    if [ -n "$CURRENT_SLOT" ]; then
        CURRENT="blue"
        TARGET="green"
    else
        CURRENT="green"
        TARGET="blue"
    fi

    rollback_to_slot "$TARGET" "quick-rollback-$(date +%Y%m%d-%H%M%S)"
}

# ============================================
# 状态和日志
# ============================================
show_status() {
    log_step "服务状态..."
    echo ""

    ssh_cmd "
        echo '📦 部署信息'
        echo '==============='
        echo \"环境: $ENVIRONMENT\"
        echo \"部署路径: $DEPLOY_PATH\"
        echo \"备份路径: $BACKUP_PATH\"
        echo ''

        echo '🐳 容器状态'
        echo '==============='
        docker ps --filter 'name=7zi' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
        echo ''

        echo '💾 备份列表'
        echo '==============='
        ls -1dt $BACKUP_PATH/v* 2>/dev/null | head -10 || echo 'No backups'
        echo ''

        echo '📊 资源使用'
        echo '==============='
        docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' \$(docker ps --filter 'name=7zi' -q)
    "
}

show_logs() {
    local service=${1:-}
    local lines=${2:-100}

    if [ -z "$service" ]; then
        service=$(ssh_cmd "docker ps --filter 'name=7zi-frontend' --format '{{.Names}}' | head -1")
    fi

    log_info "查看日志: $service (最近 $lines 行)"
    ssh_cmd "docker logs --tail=$lines -f $service"
}

# ============================================
# 清理
# ============================================
cleanup() {
    log_step "清理旧资源..."

    ssh_cmd "
        # 清理未使用的镜像
        docker image prune -f

        # 清理未使用的容器
        docker container prune -f

        # 清理未使用的卷
        docker volume prune -f

        # 清理构建缓存
        docker builder prune -f
    "

    cleanup_old_backups

    log_info "清理完成"
}

# ============================================
# 帮助
# ============================================
help() {
    cat << 'EOF'
用法: ENVIRONMENT=<env> ./deploy.sh <命令> [选项]

环境变量:
  ENVIRONMENT   部署环境: dev | staging | production (默认: production)

命令:
  deploy              - 零停机部署（推荐）
  rollback [version]  - 回滚到指定版本（不指定则快速回滚）
  rollback-quick      - 快速回滚（蓝绿槽位切换）
  status              - 查看服务状态
  logs [service] [n]  - 查看日志（默认: 当前服务，100 行）
  health              - 执行健康检查
  backups             - 列出所有备份
  history             - 查看部署历史
  cleanup             - 清理旧资源
  check               - 检查环境和依赖

示例:
  # 生产环境部署
  ./deploy.sh deploy

  # Staging 环境部署
  ENVIRONMENT=staging ./deploy.sh deploy

  # 回滚到指定版本
  ./deploy.sh rollback v20250122-143022

  # 快速回滚
  ./deploy.sh rollback-quick

  # 查看日志
  ./deploy.sh logs

  # 查看 nginx 日志
  ./deploy.sh logs 7zi-nginx 200

EOF
}

# ============================================
# 主入口
# ============================================
case "${1:-}" in
    deploy)
        deploy_zero_downtime
        ;;
    rollback)
        check_prerequisites
        if [ -n "${2:-}" ]; then
            rollback_to_version "$2"
        else
            quick_rollback
        fi
        ;;
    rollback-quick)
        check_prerequisites
        quick_rollback
        ;;
    status)
        check_prerequisites
        show_status
        ;;
    logs)
        check_prerequisites
        show_logs "${2:-}" "${3:-100}"
        ;;
    health)
        check_prerequisites
        # 注意：此处位于 case 分支（非函数体内），不能用 local
        service=$(ssh_cmd "docker ps --filter 'name=7zi-frontend' --format '{{.Names}}' | head -1")
        health_check "$service" "strict"
        ;;
    backups)
        check_prerequisites
        echo "📦 可用备份:"
        list_backups
        ;;
    history)
        check_prerequisites
        echo "📜 部署历史:"
        get_deployment_history
        ;;
    cleanup)
        check_prerequisites
        cleanup
        ;;
    check)
        check_prerequisites
        validate_environment
        log_info "✅ 所有检查通过"
        ;;
    *)
        help
        exit 1
        ;;
esac
