#!/bin/bash

# API Performance Monitoring Test Script
# API 性能监控测试脚本
#
# 用途：测试 API 性能监控功能
# 使用方法：./test-api-performance.sh [base_url]
# 示例：./test-api-performance.sh http://localhost:3000

set -e

# 配置
BASE_URL="${1:-http://localhost:3000}"
API_PERFORMANCE="$BASE_URL/api/performance/report"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    local color=$1
    shift
    echo -e "${color}$*${NC}"
}

# 测试 API 端点
test_api_endpoint() {
    local endpoint=$1
    local method=$2
    local data=$3
    local description=$4

    print_message "${YELLOW}" "测试: $description"
    print_message "${NC}" "  端点: $method $endpoint"

    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        print_message "${GREEN}" "  ✓ 成功 (HTTP $http_code)"
        echo "$body" | head -c 200
        echo "..."
    else
        print_message "${RED}" "  ✗ 失败 (HTTP $http_code)"
        echo "$body"
    fi
    echo
}

# 获取性能报告
get_performance_report() {
    print_message "${YELLOW}" "获取性能报告..."
    response=$(curl -s "$API_PERFORMANCE")

    # 提取关键指标
    total_requests=$(echo "$response" | grep -o '"totalRequests":[0-9]*' | cut -d':' -f2)
    avg_duration=$(echo "$response" | grep -o '"averageDuration":[0-9.]*' | cut -d':' -f2)
    slow_requests=$(echo "$response" | grep -o '"slowRequests":[0-9]*' | cut -d':' -f2)

    print_message "${NC}" "  总请求数: $total_requests"
    print_message "${NC}" "  平均响应时间: ${avg_duration}ms"
    print_message "${NC}" "  慢请求数 (>500ms): $slow_requests"
    echo
}

# 获取慢请求列表
get_slow_requests() {
    print_message "${YELLOW}" "获取慢请求列表..."
    response=$(curl -s "$API_PERFORMANCE?action=slow")

    # 提取慢请求数量
    count=$(echo "$response" | grep -o '"count":[0-9]*' | cut -d':' -f2)
    threshold=$(echo "$response" | grep -o '"threshold":[0-9]*' | cut -d':' -f2)

    print_message "${NC}" "  慢请求数量: $count"
    print_message "${NC}" "  阈值: ${threshold}ms"
    echo
}

# 清除性能数据
clear_performance_data() {
    print_message "${YELLOW}" "清除性能数据..."
    response=$(curl -s -X DELETE "$API_PERFORMANCE")
    echo "$response"
    echo
}

# 主测试流程
main() {
    print_message "${GREEN}" "=========================================="
    print_message "${GREEN}" "API 性能监控测试"
    print_message "${GREEN}" "=========================================="
    print_message "${NC}" "基础 URL: $BASE_URL"
    echo

    # 测试 1: 快速响应 API
    test_api_endpoint \
        "$BASE_URL/api/example/performance" \
        "GET" \
        "" \
        "快速响应 API"

    # 测试 2: 慢响应 API（800ms）
    test_api_endpoint \
        "$BASE_URL/api/example/performance" \
        "POST" \
        '{"delay": 800}' \
        "慢响应 API (800ms)"

    # 测试 3: 批量处理 API
    test_api_endpoint \
        "$BASE_URL/api/example/performance" \
        "POST" \
        '{"count": 20}' \
        "批量处理 API (20 项)"

    # 测试 4: 错误响应 API
    test_api_endpoint \
        "$BASE_URL/api/example/performance" \
        "POST" \
        '{"error": true}' \
        "错误响应 API"

    # 获取性能报告
    print_message "${GREEN}" "=========================================="
    print_message "${GREEN}" "性能报告"
    print_message "${GREEN}" "=========================================="
    echo
    get_performance_report

    # 获取慢请求列表
    get_slow_requests

    print_message "${GREEN}" "=========================================="
    print_message "${GREEN}" "测试完成"
    print_message "${GREEN}" "=========================================="
    print_message "${NC}" ""
    print_message "${NC}" "提示："
    print_message "${NC}" "  - 查看完整性能报告: curl $API_PERFORMANCE"
    print_message "${NC}" "  - 查看慢请求列表: curl $API_PERFORMANCE?action=slow"
    print_message "${NC}" "  - 清除性能数据: curl -X DELETE $API_PERFORMANCE"
}

# 执行主流程
main
