#!/bin/bash
# ============================================
# 7zi 集群部署脚本
# 支持一键部署到多台服务器
# ============================================

set -e

# ============================================
# 配置区
# ============================================

# 服务器配置
declare -A SERVERS=(
    # 负载均衡器 (已配置)
    ["lb-01"]="165.99.43.61|7zi.com|loadbalancer|root|'ge20993344\$ZZ'"

    # Web 服务器 (已配置 1 台)
    ["web-01"]="182.43.36.134|bot5.szspd.cn|web|root|'ge20993344\$ZZ'"

    # 新服务器 (待配置)
    # 格式: "IP|主机名|角色|用户|密码"
    # ["web-02"]="<IP>|7zi-web-02|web|root|'ge20993344\$ZZ'"
    # ["gw-01"]="<IP>|7zi-gw-01|gateway|root|'ge20993344\$ZZ'"
    # ["gw-02"]="<IP>|7zi-gw-02|gateway|root|'ge20993344\$ZZ'"
    # ["db-01"]="<IP>|7zi-db-01|database|root|'ge20993344\$ZZ'"
    # ["db-02"]="<IP>|7zi-db-02|database|root|'ge20993344\$ZZ'"
)

# 部署选项
SKIP_BUILD=${SKIP_BUILD:-false}
SKIP_DEPS=${SKIP_DEPS:-false}
VERBOSE=${VERBOSE:-false}
DRY_RUN=${DRY_RUN:-false}

# 项目配置
PROJECT_PATH="/root/.openclaw/workspace"
LOCAL_BUILD_PATH="${PROJECT_PATH}/.next"
REMOTE_DEPLOY_PATH="/opt/7zi"
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
log_debug() { [ "$VERBOSE" = true ] && echo -e "${CYAN}[DEBUG]${NC} $1"; }
log_section() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# 检查依赖
check_dependencies() {
    log_step "检查本地依赖..."

    local missing=()

    for cmd in sshpass rsync docker; do
        if ! command -v $cmd &> /dev/null; then
            missing+=($cmd)
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        log_error "缺少依赖: ${missing[*]}"
        echo "请运行: apt install ${missing[*]}"
        exit 1
    fi

    log_info "✓ 所有依赖已安装"
}

# 解析服务器配置
parse_server_config() {
    local server_id="$1"
    local config="${SERVERS[$server_id]}"

    if [ -z "$config" ]; then
        log_error "服务器配置不存在: $server_id"
        exit 1
    fi

    # 分割配置: IP|HOSTNAME|ROLE|USER|PASSWORD
    IFS='|' read -r SERVER_IP SERVER_HOSTNAME SERVER_ROLE SERVER_USER SERVER_PASSWORD <<< "$config"

    export SERVER_IP
    export SERVER_HOSTNAME
    export SERVER_ROLE
    export SERVER_USER
    export SERVER_PASSWORD
    export SERVER_ID=$server_id

    log_debug "服务器: $SERVER_ID | IP: $SERVER_IP | 角色: $SERVER_ROLE"
}

# SSH 命令执行
ssh_exec() {
    local server_id="$1"
    local command="$2"

    parse_server_config "$server_id"

    if [ "$DRY_RUN" = true ]; then
        echo "[DRY-RUN] SSH $SERVER_USER@$SERVER_IP: $command"
        return 0
    fi

    sshpass -p "$SERVER_PASSWORD" ssh -o StrictHostKeyChecking=no \
        "$SERVER_USER@$SERVER_IP" "$command"
}

# SCP 文件传输
scp_transfer() {
    local server_id="$1"
    local src="$2"
    local dest="$3"

    parse_server_config "$server_id"

    if [ "$DRY_RUN" = true ]; then
        echo "[DRY-RUN] SCP $src -> $SERVER_USER@$SERVER_IP:$dest"
        return 0
    fi

    sshpass -p "$SERVER_PASSWORD" scp -o StrictHostKeyChecking=no \
        "$src" "$SERVER_USER@$SERVER_IP:$dest"
}

# 测试服务器连接
test_connection() {
    local server_id="$1"

    log_step "测试服务器连接: $server_id"

    parse_server_config "$server_id"

    if ssh_exec "$server_id" "echo '连接成功'" &> /dev/null; then
        local hostname=$(ssh_exec "$server_id" "hostname")
        local uptime=$(ssh_exec "$server_id" "uptime -p")
        log_info "✓ $server_id ($SERVER_IP) - $hostname - $uptime"
        return 0
    else
        log_error "✗ $server_id ($SERVER_IP) - 连接失败"
        return 1
    fi
}

# 安装基础环境
install_base_env() {
    local server_id="$1"

    log_step "安装基础环境: $server_id"

    ssh_exec "$server_id" "
        # 更新系统
        apt update -qq

        # 安装基础工具
        apt install -y -qq curl wget git sshpass rsync htop

        # 安装 Docker
        if ! command -v docker &> /dev/null; then
            echo '安装 Docker...'
            curl -fsSL https://get.docker.com | sh
            systemctl enable docker
            systemctl start docker
        fi

        # 安装 Docker Compose
        if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
            echo '安装 Docker Compose...'
            curl -L 'https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-\$(uname -s)-\$(uname -m)' -o /usr/local/bin/docker-compose
            chmod +x /usr/local/bin/docker-compose
        fi

        # 创建部署目录
        mkdir -p $REMOTE_DEPLOY_PATH
        mkdir -p $BACKUP_PATH

        # 设置时区
        timedatectl set-timezone Asia/Shanghai

        echo '基础环境安装完成'
    "

    log_info "✓ 基础环境安装完成: $server_id"
}

# 部署 Web 服务器 (Next.js)
deploy_web_server() {
    local server_id="$1"

    log_step "部署 Web 服务器: $server_id"

    parse_server_config "$server_id"

    cd "$PROJECT_PATH"

    # 同步代码
    log_info "同步代码到 $server_id..."
    sshpass -p "$SERVER_PASSWORD" rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude '.git' \
        --exclude '*.log' \
        --exclude 'coverage' \
        --exclude 'test-results' \
        -e "ssh -o StrictHostKeyChecking=no" \
        ./ "$SERVER_USER@$SERVER_IP:$REMOTE_DEPLOY_PATH/"

    # 在服务器上构建
    log_info "在服务器上构建应用..."
    ssh_exec "$server_id" "
        cd $REMOTE_DEPLOY_PATH

        # 安装依赖
        npm ci --legacy-peer-deps

        # 构建
        NODE_ENV=production npm run build

        # 停止旧容器
        docker-compose down 2>/dev/null || true

        # 启动新容器
        docker-compose -f docker-compose.prod.yml up -d

        echo '等待服务启动...'
        sleep 10

        # 检查状态
        docker-compose -f docker-compose.prod.yml ps
    "

    log_info "✓ Web 服务器部署完成: $server_id"
}

# 部署负载均衡器 (HAProxy)
deploy_load_balancer() {
    local server_id="$1"

    log_step "部署负载均衡器: $server_id"

    cd "$PROJECT_PATH"

    # 复制 HAProxy 配置
    if [ -f "configs/haproxy.cfg" ]; then
        scp_transfer "$server_id" "configs/haproxy.cfg" "/etc/haproxy/haproxy.cfg"
    else
        log_warn "HAProxy 配置不存在，跳过"
        return 0
    fi

    # 安装和配置 HAProxy
    ssh_exec "$server_id" "
        # 安装 HAProxy
        apt install -y haproxy

        # 启用 HAProxy
        systemctl enable haproxy
        systemctl restart haproxy

        # 检查状态
        systemctl status haproxy --no-pager -l
    "

    log_info "✓ 负载均衡器部署完成: $server_id"
}

# 部署 OpenClaw Gateway
deploy_gateway() {
    local server_id="$1"

    log_step "部署 API 网关: $server_id"

    cd "$PROJECT_PATH"

    # 同步 Gateway 代码
    log_info "同步 Gateway 代码..."
    sshpass -p "$SERVER_PASSWORD" rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude '.next' \
        --exclude 'test-results' \
        -e "ssh -o StrictHostKeyChecking=no" \
        ./ "$SERVER_USER@$SERVER_IP:$REMOTE_DEPLOY_PATH/"

    # 启动 OpenClaw Gateway
    ssh_exec "$server_id" "
        cd $REMOTE_DEPLOY_PATH

        # 安装 OpenClaw (如果未安装)
        if ! command -v openclaw &> /dev/null; then
            npm install -g @openclaw/cli
        fi

        # 初始化 Gateway
        openclaw gateway init

        # 启动 Gateway
        openclaw gateway start
    "

    log_info "✓ API 网关部署完成: $server_id"
}

# 部署数据库 (SQLite + Litestream)
deploy_database() {
    local server_id="$1"
    local is_master="${2:-false}"

    log_step "部署数据库: $server_id (${is_master:+主库|从库})"

    ssh_exec "$server_id" "
        # 安装 Litestream
        wget -q https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-linux-amd64
        chmod +x litestream
        mv litestream /usr/local/bin/

        # 创建数据目录
        mkdir -p /opt/7zi/data
        mkdir -p /opt/7zi/backups

        # 配置 Litestream
        cat > /etc/litestream.yml << 'EOF'
dbs:
  - path: /opt/7zi/data/db.sqlite
    replicas:
      - url: s3://7zi-backup/db.sqlite
        retention: 72h
        interval: 1s
EOF
    "

    if [ "$is_master" = true ]; then
        log_info "配置主数据库..."
    else
        log_info "配置从数据库 (只读副本)..."
    fi

    log_info "✓ 数据库部署完成: $server_id"
}

# 健康检查
health_check() {
    local server_id="$1"

    log_step "健康检查: $server_id"

    parse_server_config "$server_id"

    case "$SERVER_ROLE" in
        web)
            ssh_exec "$server_id" "curl -sf http://localhost:3000/api/health" && \
                log_info "✓ Web 服务正常" || \
                log_error "✗ Web 服务异常"
            ;;
        loadbalancer)
            ssh_exec "$server_id" "curl -sf http://localhost:8080/stats" && \
                log_info "✓ 负载均衡器正常" || \
                log_error "✗ 负载均衡器异常"
            ;;
        gateway)
            ssh_exec "$server_id" "curl -sf http://localhost:3000/health" && \
                log_info "✓ API 网关正常" || \
                log_error "✗ API 网关异常"
            ;;
        database)
            ssh_exec "$server_id" "ls -lh /opt/7zi/data/db.sqlite" && \
                log_info "✓ 数据库正常" || \
                log_error "✗ 数据库异常"
            ;;
        *)
            log_warn "未知角色: $SERVER_ROLE"
            ;;
    esac
}

# 显示状态
show_status() {
    log_section "集群状态"

    for server_id in "${!SERVERS[@]}"; do
        parse_server_config "$server_id"

        echo -e "${CYAN}[$server_id]${NC} $SERVER_HOSTNAME ($SERVER_IP) - $SERVER_ROLE"

        ssh_exec "$server_id" "
            echo '  系统版本: '\$(cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"')
            echo '  运行时间: '\$(uptime -p)
            echo '  磁盘使用: '\$(df -h / | tail -1 | awk '{print \$5}')
            echo '  内存使用: '\$(free -h | grep Mem | awk '{print \$3 / \$2 * 100\"%\"}')
            echo '  Docker: '\$(docker --version 2>/dev/null || echo '未安装')
            echo ''
        "
    done
}

# 完整部署
full_deploy() {
    log_section "开始集群部署"

    check_dependencies

    # 检查所有服务器连接
    log_section "检查服务器连接"
    local failed=0
    for server_id in "${!SERVERS[@]}"; do
        test_connection "$server_id" || ((failed++))
    done

    if [ $failed -gt 0 ]; then
        log_error "$failed 台服务器连接失败，请检查配置"
        exit 1
    fi

    # 安装基础环境
    log_section "安装基础环境"
    for server_id in "${!SERVERS[@]}"; do
        install_base_env "$server_id"
    done

    # 按角色部署
    log_section "部署负载均衡器"
    for server_id in "${!SERVERS[@]}"; do
        parse_server_config "$server_id"
        if [ "$SERVER_ROLE" = "loadbalancer" ]; then
            deploy_load_balancer "$server_id"
        fi
    done

    log_section "部署 Web 服务器"
    for server_id in "${!SERVERS[@]}"; do
        parse_server_config "$server_id"
        if [ "$SERVER_ROLE" = "web" ]; then
            deploy_web_server "$server_id"
        fi
    done

    log_section "部署 API 网关"
    for server_id in "${!SERVERS[@]}"; do
        parse_server_config "$server_id"
        if [ "$SERVER_ROLE" = "gateway" ]; then
            deploy_gateway "$server_id"
        fi
    done

    log_section "部署数据库"
    local db_count=0
    for server_id in "${!SERVERS[@]}"; do
        parse_server_config "$server_id"
        if [ "$SERVER_ROLE" = "database" ]; then
            deploy_database "$server_id" $((db_count++ == 0))
        fi
    done

    # 健康检查
    log_section "健康检查"
    for server_id in "${!SERVERS[@]}"; do
        health_check "$server_id"
    done

    log_section "部署完成"
    log_info "所有服务已部署完成"
    echo ""
    echo "集群信息:"
    echo "  负载均衡器: http://7zi.com"
    echo "  管理命令:"
    echo "    $0 status   - 查看集群状态"
    echo "    $0 health   - 执行健康检查"
    echo "    $0 logs     - 查看日志"
}

# 快速部署 (仅更新代码)
quick_deploy() {
    log_info "快速部署模式 - 仅同步代码并重启"

    for server_id in "${!SERVERS[@]}"; do
        parse_server_config "$server_id"

        case "$SERVER_ROLE" in
            web)
                log_step "更新 Web 服务器: $server_id"
                ssh_exec "$server_id" "cd $REMOTE_DEPLOY_PATH && docker-compose restart"
                ;;
            gateway)
                log_step "更新 API 网关: $server_id"
                ssh_exec "$server_id" "openclaw gateway restart"
                ;;
            *)
                log_debug "跳过 $server_id (不需要重启)"
                ;;
        esac
    done

    log_info "✓ 快速部署完成"
}

# 帮助信息
show_help() {
    cat << EOF
7zi 集群部署脚本

用法: $0 <命令> [选项]

命令:
  deploy      - 完整部署到所有服务器
  quick       - 快速部署 (仅重启服务)
  status      - 查看集群状态
  health      - 执行健康检查
  test        - 测试服务器连接
  help        - 显示此帮助信息

选项:
  --skip-build    跳过本地构建
  --skip-deps     跳过依赖安装
  --verbose       显示详细输出
  --dry-run       模拟运行 (不实际执行)

示例:
  $0 deploy              # 完整部署
  $0 quick               # 快速部署
  $0 status --verbose    # 查看详细状态

环境变量:
  SKIP_BUILD=true        # 跳过构建
  SKIP_DEPS=true         # 跳过依赖安装
  VERBOSE=true           # 详细模式
  DRY_RUN=true           # 模拟运行

EOF
}

# ============================================
# 主入口
# ============================================

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        deploy|quick|status|health|test|help)
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
case "${COMMAND:-}" in
    deploy)
        full_deploy
        ;;
    quick)
        quick_deploy
        ;;
    status)
        show_status
        ;;
    health)
        for server_id in "${!SERVERS[@]}"; do
            health_check "$server_id"
        done
        ;;
    test)
        for server_id in "${!SERVERS[@]}"; do
            test_connection "$server_id"
        done
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
