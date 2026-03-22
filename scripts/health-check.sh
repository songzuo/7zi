#!/bin/bash
# ============================================
# 7zi 健康检查脚本
# 检查集群中所有服务的健康状态
# ============================================

set -e

# ============================================
# 配置
# ============================================

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 超时配置
TIMEOUT=10

# 服务端点
declare -A ENDPOINTS=(
    # Web 服务器
    ["web-01"]="182.43.36.134:3000"
    # ["web-02"]="<IP>:3000"

    # API 网关
    # ["gw-01"]="<IP>:3000"
    # ["gw-02"]="<IP>:3000"

    # 负载均衡器
    ["lb-01"]="165.99.43.61:8080"
)

# ============================================
# 工具函数
# ============================================

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# HTTP 健康检查
http_check() {
    local name="$1"
    local endpoint="$2"
    local path="${3:-/api/health}"
    local expected_status="${4:-200}"

    log_step "检查 $name ($endpoint$path)..."

    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
        "http://${endpoint}${path}" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_status" ]; then
        log_info "✓ $name - 正常 (HTTP $response)"
        return 0
    else
        log_error "✗ $name - 异常 (HTTP $response)"
        return 1
    fi
}

# HTTPS 健康检查
https_check() {
    local name="$1"
    local endpoint="$2"
    local path="${3:-/api/health}"
    local expected_status="${4:-200}"

    log_step "检查 $name ($endpoint$path)..."

    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT \
        --insecure "https://${endpoint}${path}" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_status" ]; then
        log_info "✓ $name - 正常 (HTTPS $response)"
        return 0
    else
        log_error "✗ $name - 异常 (HTTPS $response)"
        return 1
    fi
}

# TCP 端口检查
port_check() {
    local name="$1"
    local host="$2"
    local port="$3"

    log_step "检查 $name ($host:$port)..."

    if timeout $TIMEOUT bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
        log_info "✓ $name - 端口开放"
        return 0
    else
        log_error "✗ $name - 端口关闭"
        return 1
    fi
}

# Docker 容器检查
docker_check() {
    local name="$1"
    local container="$2"

    log_step "检查 Docker 容器: $container..."

    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        local status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null)
        log_info "✓ $container - 运行中 ($status)"
        return 0
    else
        log_error "✗ $container - 未运行"
        return 1
    fi
}

# 系统资源检查
system_check() {
    local name="$1"

    log_step "检查系统资源: $name"

    # CPU 使用率
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)

    # 内存使用率
    local mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100}')

    # 磁盘使用率
    local disk_usage=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')

    echo "  CPU: ${cpu_usage}%"
    echo "  内存: ${mem_usage}%"
    echo "  磁盘: ${disk_usage}%"

    # 警告阈值
    if (( $(echo "$mem_usage > 90" | bc -l) )); then
        log_warn "内存使用率过高: ${mem_usage}%"
    fi

    if [ "$disk_usage" -gt 85 ]; then
        log_warn "磁盘使用率过高: ${disk_usage}%"
    fi

    return 0
}

# 数据库检查
database_check() {
    local db_path="$1"

    log_step "检查数据库: $db_path"

    if [ ! -f "$db_path" ]; then
        log_error "数据库文件不存在"
        return 1
    fi

    # 检查数据库完整性
    local integrity=$(sqlite3 "$db_path" "PRAGMA integrity_check;" 2>/dev/null | head -1)

    if [ "$integrity" = "ok" ]; then
        log_info "✓ 数据库完整性检查通过"

        # 数据库大小
        local db_size=$(du -h "$db_path" | cut -f1)
        echo "  大小: $db_size"

        # 表数量
        local table_count=$(sqlite3 "$db_path" "SELECT COUNT(*) FROM sqlite_master WHERE type='table';" 2>/dev/null || echo "0")
        echo "  表数量: $table_count"

        return 0
    else
        log_error "✗ 数据库完整性检查失败"
        return 1
    fi
}

# 生成报告
generate_report() {
    local total="$1"
    local passed="$2"
    local failed="$3"

    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  健康检查报告${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "  总计: $total"
    echo -e "  通过: ${GREEN}$passed${NC}"
    echo -e "  失败: ${RED}$failed${NC}"
    echo -e "  成功率: $((passed * 100 / total))%"
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

    if [ "$failed" -gt 0 ]; then
        return 1
    else
        return 0
    fi
}

# 主函数
main() {
    local total=0
    local passed=0
    local failed=0

    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║           7zi 集群健康检查                                   ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # 检查 Web 服务器
    log_step "========== Web 服务器 =========="
    for server in "${!ENDPOINTS[@]}"; do
        if [[ $server == web-* ]]; then
            ((total++))
            if http_check "$server" "${ENDPOINTS[$server]}"; then
                ((passed++))
            else
                ((failed++))
            fi
        fi
    done
    echo ""

    # 检查负载均衡器
    log_step "========== 负载均衡器 =========="
    for server in "${!ENDPOINTS[@]}"; do
        if [[ $server == lb-* ]]; then
            ((total++))
            if http_check "$server" "${ENDPOINTS[$server]}" "/stats" "200"; then
                ((passed++))
            else
                ((failed++))
            fi
        fi
    done
    echo ""

    # 检查本地 Docker 容器
    log_step "========== Docker 容器 =========="
    ((total++))
    if docker_check "7zi-frontend" "7zi-frontend"; then
        ((passed++))
    else
        ((failed++))
    fi
    echo ""

    # 检查数据库
    log_step "========== 数据库 =========="
    ((total++))
    if database_check "/root/.openclaw/workspace/data/db.sqlite"; then
        ((passed++))
    else
        ((failed++))
    fi
    echo ""

    # 系统资源
    log_step "========== 系统资源 =========="
    system_check "本机"
    echo ""

    # 生成报告
    generate_report $total $passed $failed

    return $?
}

# 执行主函数
main
