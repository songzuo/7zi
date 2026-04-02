#!/bin/bash
# ============================================
# v1.7.0 健康检查脚本
# ============================================
# 功能: 检查所有服务的健康状态
# 用法: ./health-check-v170.sh [--verbose] [--json]
# ============================================

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERBOSE=false
JSON_OUTPUT=false

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --json|-j)
            JSON_OUTPUT=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# 结果收集
declare -A RESULTS
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 日志函数
log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "$1"
    fi
}

check_pass() {
    ((TOTAL_CHECKS++))
    ((PASSED_CHECKS++))
    RESULTS["$1"]="PASS"
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    ((TOTAL_CHECKS++))
    ((FAILED_CHECKS++))
    RESULTS["$1"]="FAIL: $2"
    echo -e "${RED}✗${NC} $1 - $2"
}

check_warn() {
    ((TOTAL_CHECKS++))
    RESULTS["$1"]="WARN: $2"
    echo -e "${YELLOW}!${NC} $1 - $2"
}

# ============================================
# 1. 容器状态检查
# ============================================
echo -e "${CYAN}=== 容器状态检查 ===${NC}"

# 检查应用容器
if docker ps --format '{{.Names}}' | grep -q "ai-team-dashboard-v170"; then
    check_pass "应用容器运行中"
    
    # 检查容器健康状态
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' ai-team-dashboard-v170 2>/dev/null || echo "unknown")
    if [[ "$HEALTH" == "healthy" ]]; then
        check_pass "应用容器健康状态: $HEALTH"
    else
        check_warn "应用容器健康状态: $HEALTH"
    fi
else
    check_fail "应用容器未运行" "容器不存在或已停止"
fi

# 检查 Redis 容器
if docker ps --format '{{.Names}}' | grep -q "7zi-redis"; then
    check_pass "Redis 容器运行中"
else
    check_fail "Redis 容器未运行"
fi

# 检查 Nginx 容器
if docker ps --format '{{.Names}}' | grep -q "7zi-nginx"; then
    check_pass "Nginx 容器运行中"
else
    check_fail "Nginx 容器未运行"
fi

# 检查告警服务容器
if docker ps --format '{{.Names}}' | grep -q "7zi-alert-service"; then
    check_pass "告警服务容器运行中"
else
    check_warn "告警服务容器未运行 (可选服务)"
fi

echo ""

# ============================================
# 2. 服务端口检查
# ============================================
echo -e "${CYAN}=== 服务端口检查 ===${NC}"

# 检查应用端口
if nc -z localhost 3000 2>/dev/null; then
    check_pass "应用端口 3000 可访问"
else
    check_fail "应用端口 3000 不可访问"
fi

# 检查 Redis 端口
if nc -z localhost 6379 2>/dev/null; then
    check_pass "Redis 端口 6379 可访问"
else
    check_fail "Redis 端口 6379 不可访问"
fi

# 检查 HTTP 端口
if nc -z localhost 80 2>/dev/null; then
    check_pass "HTTP 端口 80 可访问"
else
    check_fail "HTTP 端口 80 不可访问"
fi

echo ""

# ============================================
# 3. HTTP 健康检查
# ============================================
echo -e "${CYAN}=== HTTP 健康检查 ===${NC}"

# 检查应用健康端点
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
    check_pass "应用健康端点返回 200"
else
    check_fail "应用健康端点返回 $HTTP_CODE"
fi

# 检查首页
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
    check_pass "首页返回 200"
else
    check_fail "首页返回 $HTTP_CODE"
fi

# 检查 Nginx 代理
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
    check_pass "Nginx 健康检查返回 200"
else
    check_warn "Nginx 健康检查返回 $HTTP_CODE"
fi

echo ""

# ============================================
# 4. Redis 连接检查
# ============================================
echo -e "${CYAN}=== Redis 连接检查 ===${NC}"

# 检查 Redis PING
REDIS_PING=$(docker exec 7zi-redis-v170 redis-cli -a "${REDIS_PASSWORD:-7zi-redis-password}" ping 2>/dev/null | tr -d '\r')
if [[ "$REDIS_PING" == "PONG" ]]; then
    check_pass "Redis PING 成功"
else
    check_fail "Redis PING 失败"
fi

# 检查 Redis 内存使用
REDIS_MEM=$(docker exec 7zi-redis-v170 redis-cli -a "${REDIS_PASSWORD:-7zi-redis-password}" info memory 2>/dev/null | grep used_memory_human | cut -d: -f2 | tr -d '\r')
log "Redis 内存使用: $REDIS_MEM"
check_pass "Redis 内存使用: $REDIS_MEM"

# 检查 Redis 连接数
REDIS_CLIENTS=$(docker exec 7zi-redis-v170 redis-cli -a "${REDIS_PASSWORD:-7zi-redis-password}" client list 2>/dev/null | wc -l)
log "Redis 连接数: $REDIS_CLIENTS"
check_pass "Redis 连接数: $REDIS_CLIENTS"

echo ""

# ============================================
# 5. v1.7.0 特有功能检查
# ============================================
echo -e "${CYAN}=== v1.7.0 功能检查 ===${NC}"

# 检查 Multi-Agent 协作端点
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/agents/status 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "401" ]]; then
    check_pass "Multi-Agent 端点可访问 ($HTTP_CODE)"
else
    check_warn "Multi-Agent 端点返回 $HTTP_CODE"
fi

# 检查任务队列端点
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/agents/queue 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "401" ]]; then
    check_pass "任务队列端点可访问 ($HTTP_CODE)"
else
    check_warn "任务队列端点返回 $HTTP_CODE"
fi

# 检查告警配置
if [[ -n "$ALERT_EMAIL_ENABLED" ]] || [[ -n "$ALERT_SLACK_ENABLED" ]]; then
    check_pass "告警服务已配置"
else
    check_warn "告警服务未配置"
fi

echo ""

# ============================================
# 6. 资源使用检查
# ============================================
echo -e "${CYAN}=== 资源使用检查 ===${NC}"

# 应用容器资源使用
APP_CPU=$(docker stats --no-stream --format "{{.CPUPerc}}" ai-team-dashboard-v170 2>/dev/null || echo "N/A")
APP_MEM=$(docker stats --no-stream --format "{{.MemUsage}}" ai-team-dashboard-v170 2>/dev/null || echo "N/A")
log "应用 CPU: $APP_CPU, 内存: $APP_MEM"
check_pass "应用资源使用: CPU $APP_CPU, 内存 $APP_MEM"

# Redis 资源使用
REDIS_CPU=$(docker stats --no-stream --format "{{.CPUPerc}}" 7zi-redis-v170 2>/dev/null || echo "N/A")
REDIS_MEM=$(docker stats --no-stream --format "{{.MemUsage}}" 7zi-redis-v170 2>/dev/null || echo "N/A")
log "Redis CPU: $REDIS_CPU, 内存: $REDIS_MEM"
check_pass "Redis 资源使用: CPU $REDIS_CPU, 内存 $REDIS_MEM"

# 检查磁盘空间
DISK_USAGE=$(df -h /var/lib/docker 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%')
if [[ "$DISK_USAGE" -lt 80 ]]; then
    check_pass "磁盘使用率: ${DISK_USAGE}%"
elif [[ "$DISK_USAGE" -lt 90 ]]; then
    check_warn "磁盘使用率: ${DISK_USAGE}%"
else
    check_fail "磁盘使用率: ${DISK_USAGE}%" "磁盘空间不足"
fi

echo ""

# ============================================
# 7. 日志错误检查
# ============================================
echo -e "${CYAN}=== 日志错误检查 ===${NC}"

# 检查最近的应用错误日志
ERROR_COUNT=$(docker logs --tail 100 ai-team-dashboard-v170 2>&1 | grep -i "error\|exception\|fail" | wc -l || echo "0")
if [[ "$ERROR_COUNT" -lt 5 ]]; then
    check_pass "应用错误日志数: $ERROR_COUNT (最近 100 行)"
elif [[ "$ERROR_COUNT" -lt 20 ]]; then
    check_warn "应用错误日志数: $ERROR_COUNT (最近 100 行)"
else
    check_fail "应用错误日志数: $ERROR_COUNT (最近 100 行)" "错误过多"
fi

# 检查 Redis 错误
REDIS_ERRORS=$(docker logs --tail 50 7zi-redis-v170 2>&1 | grep -i "error\|fail" | wc -l || echo "0")
if [[ "$REDIS_ERRORS" -eq 0 ]]; then
    check_pass "Redis 无错误日志"
else
    check_warn "Redis 错误日志数: $REDIS_ERRORS"
fi

echo ""

# ============================================
# 汇总
# ============================================
echo -e "${CYAN}=== 检查汇总 ===${NC}"
echo -e "总检查项: $TOTAL_CHECKS"
echo -e "${GREEN}通过: $PASSED_CHECKS${NC}"
echo -e "${RED}失败: $FAILED_CHECKS${NC}"
echo -e "${YELLOW}警告: $((TOTAL_CHECKS - PASSED_CHECKS - FAILED_CHECKS))${NC}"
echo ""

# JSON 输出
if [[ "$JSON_OUTPUT" == "true" ]]; then
    echo "{"
    echo "  \"timestamp\": \"$(date -Iseconds)\","
    echo "  \"total\": $TOTAL_CHECKS,"
    echo "  \"passed\": $PASSED_CHECKS,"
    echo "  \"failed\": $FAILED_CHECKS,"
    echo "  \"warnings\": $((TOTAL_CHECKS - PASSED_CHECKS - FAILED_CHECKS)),"
    echo "  \"results\": {"
    first=true
    for key in "${!RESULTS[@]}"; do
        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo ","
        fi
        echo -n "    \"$key\": \"${RESULTS[$key]}\""
    done
    echo ""
    echo "  }"
    echo "}"
fi

# 退出码
if [[ "$FAILED_CHECKS" -gt 0 ]]; then
    exit 1
else
    exit 0
fi
