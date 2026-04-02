#!/bin/bash
# ============================================
# v1.7.0 部署验证脚本
# ============================================
# 功能: 验证 v1.7.0 部署是否成功
# 用法: ./verify-deployment-v170.sh [version]
# ============================================

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION="${1:-v1.7.0}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMEOUT=30

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}=========================================="
echo -e "v1.7.0 部署验证"
echo -e "版本: $VERSION"
echo -e "URL: $BASE_URL"
echo -e "==========================================${NC}"
echo ""

# 测试结果
TESTS_PASSED=0
TESTS_FAILED=0
declare -a FAILURES

run_test() {
    local test_name="$1"
    local test_cmd="$2"
    
    echo -n "测试: $test_name ... "
    
    if eval "$test_cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 通过${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        ((TESTS_FAILED++))
        FAILURES+=("$test_name")
        return 1
    fi
}

run_test_verbose() {
    local test_name="$1"
    local test_cmd="$2"
    
    echo -e "${BLUE}测试: $test_name${NC}"
    
    if OUTPUT=$(eval "$test_cmd" 2>&1); then
        echo -e "${GREEN}✓ 通过${NC}"
        ((TESTS_PASSED++))
        if [[ -n "$OUTPUT" ]]; then
            echo "$OUTPUT" | sed 's/^/  /'
        fi
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        ((TESTS_FAILED++))
        FAILURES+=("$test_name")
        if [[ -n "$OUTPUT" ]]; then
            echo "$OUTPUT" | sed 's/^/  /'
        fi
        return 1
    fi
    echo ""
}

# ============================================
# 1. 基础连通性测试
# ============================================
echo -e "${CYAN}=== 基础连通性测试 ===${NC}"

run_test "应用服务可达" "curl -sf -o /dev/null ${BASE_URL}/api/health"
run_test "首页可访问" "curl -sf -o /dev/null ${BASE_URL}/"
run_test "静态资源可访问" "curl -sf -o /dev/null ${BASE_URL}/favicon.ico"

echo ""

# ============================================
# 2. API 端点测试
# ============================================
echo -e "${CYAN}=== API 端点测试 ===${NC}"

run_test "健康检查端点" "curl -sf ${BASE_URL}/api/health"
run_test "版本端点" "curl -sf ${BASE_URL}/api/version"

echo ""

# ============================================
# 3. 版本验证
# ============================================
echo -e "${CYAN}=== 版本验证 ===${NC}"

run_test_verbose "检查版本号" "
    VERSION_RESPONSE=\$(curl -sf ${BASE_URL}/api/version 2>/dev/null || echo '{}')
    echo \"响应: \$VERSION_RESPONSE\"
    echo \"\$VERSION_RESPONSE\" | grep -q '\"version\"'
"

echo ""

# ============================================
# 4. v1.7.0 特有功能测试
# ============================================
echo -e "${CYAN}=== v1.7.0 特有功能测试 ===${NC}"

# Multi-Agent 状态端点
run_test "Multi-Agent 状态端点" "
    HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' ${BASE_URL}/api/agents/status)
    [[ \"\$HTTP_CODE\" == \"200\" ]] || [[ \"\$HTTP_CODE\" == \"401\" ]]
"

# 任务队列端点
run_test "任务队列端点" "
    HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' ${BASE_URL}/api/agents/queue)
    [[ \"\$HTTP_CODE\" == \"200\" ]] || [[ \"\$HTTP_CODE\" == \"401\" ]]
"

# Agent 注册端点
run_test "Agent 注册端点" "
    HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' -X POST ${BASE_URL}/api/agents/register -H 'Content-Type: application/json' -d '{}')
    [[ \"\$HTTP_CODE\" == \"200\" ]] || [[ \"\$HTTP_CODE\" == \"400\" ]] || [[ \"\$HTTP_CODE\" == \"401\" ]]
"

# 心跳端点
run_test "心跳端点" "
    HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' -X POST ${BASE_URL}/api/agents/heartbeat -H 'Content-Type: application/json' -d '{}')
    [[ \"\$HTTP_CODE\" == \"200\" ]] || [[ \"\$HTTP_CODE\" == \"400\" ]] || [[ \"\$HTTP_CODE\" == \"401\" ]]
"

echo ""

# ============================================
# 5. 性能测试
# ============================================
echo -e "${CYAN}=== 性能测试 ===${NC}"

run_test_verbose "首页响应时间 < 1s" "
    START=\$(date +%s%N)
    curl -sf -o /dev/null ${BASE_URL}/
    END=\$(date +%s%N)
    ELAPSED_MS=\$(( (END - START) / 1000000 ))
    echo \"响应时间: \${ELAPSED_MS}ms\"
    [[ \$ELAPSED_MS -lt 1000 ]]
"

run_test_verbose "API 响应时间 < 500ms" "
    START=\$(date +%s%N)
    curl -sf -o /dev/null ${BASE_URL}/api/health
    END=\$(date +%s%N)
    ELAPSED_MS=\$(( (END - START) / 1000000 ))
    echo \"响应时间: \${ELAPSED_MS}ms\"
    [[ \$ELAPSED_MS -lt 500 ]]
"

echo ""

# ============================================
# 6. 安全测试
# ============================================
echo -e "${CYAN}=== 安全测试 ===${NC}"

run_test "安全响应头 - X-Frame-Options" "
    curl -sf -I ${BASE_URL}/ | grep -qi 'x-frame-options'
"

run_test "安全响应头 - X-Content-Type-Options" "
    curl -sf -I ${BASE_URL}/ | grep -qi 'x-content-type-options'
"

run_test "安全响应头 - X-XSS-Protection" "
    curl -sf -I ${BASE_URL}/ | grep -qi 'x-xss-protection'
"

echo ""

# ============================================
# 7. 容器健康测试
# ============================================
echo -e "${CYAN}=== 容器健康测试 ===${NC}"

run_test "应用容器运行" "docker ps --format '{{.Names}}' | grep -q 'ai-team-dashboard'"
run_test "Redis 容器运行" "docker ps --format '{{.Names}}' | grep -q 'redis'"
run_test "Nginx 容器运行" "docker ps --format '{{.Names}}' | grep -q 'nginx'"

# 检查容器健康状态
run_test_verbose "应用容器健康" "
    docker inspect --format='{{.State.Health.Status}}' ai-team-dashboard-v170 2>/dev/null || echo 'N/A'
"

echo ""

# ============================================
# 8. Redis 连接测试
# ============================================
echo -e "${CYAN}=== Redis 连接测试 ===${NC}"

run_test_verbose "Redis PING" "
    docker exec 7zi-redis-v170 redis-cli -a '${REDIS_PASSWORD:-7zi-redis-password}' ping 2>/dev/null
"

run_test_verbose "Redis 信息" "
    docker exec 7zi-redis-v170 redis-cli -a '${REDIS_PASSWORD:-7zi-redis-password}' info server 2>/dev/null | head -5
"

echo ""

# ============================================
# 9. 日志检查
# ============================================
echo -e "${CYAN}=== 日志检查 ===${NC}"

run_test_verbose "应用最近日志 (无错误)" "
    docker logs --tail 10 ai-team-dashboard-v170 2>&1 | grep -c 'error' || echo '0 errors'
"

echo ""

# ============================================
# 10. 端到端测试 (可选)
# ============================================
if command -v playwright &> /dev/null; then
    echo -e "${CYAN}=== 端到端测试 ===${NC}"
    
    run_test "E2E: 首页加载" "playwright test e2e/home.spec.ts --project=chromium"
    
    echo ""
fi

# ============================================
# 汇总
# ============================================
echo -e "${CYAN}=========================================="
echo -e "测试汇总"
echo -e "==========================================${NC}"
echo -e "通过: ${GREEN}${TESTS_PASSED}${NC}"
echo -e "失败: ${RED}${TESTS_FAILED}${NC}"
echo ""

if [[ ${#FAILURES[@]} -gt 0 ]]; then
    echo -e "${RED}失败的测试:${NC}"
    for failure in "${FAILURES[@]}"; do
        echo -e "  - $failure"
    done
    echo ""
fi

# 生成报告
REPORT_FILE="/tmp/deploy-verify-${VERSION}-$(date +%Y%m%d_%H%M%S).json"
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "version": "$VERSION",
  "baseUrl": "$BASE_URL",
  "summary": {
    "passed": $TESTS_PASSED,
    "failed": $TESTS_FAILED,
    "total": $((TESTS_PASSED + TESTS_FAILED))
  },
  "failures": $(printf '%s\n' "${FAILURES[@]}" | jq -R . | jq -s .)
}
EOF

echo -e "${BLUE}报告已保存: $REPORT_FILE${NC}"
echo ""

# 退出码
if [[ "$TESTS_FAILED" -gt 0 ]]; then
    echo -e "${RED}部署验证失败!${NC}"
    exit 1
else
    echo -e "${GREEN}部署验证成功! ✓${NC}"
    exit 0
fi
