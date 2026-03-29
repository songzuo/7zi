#!/bin/bash
# ============================================
# 部署性能基准测试 - Deployment Benchmark
# ============================================
# 用途：测试部署性能，对比优化前后效果
# 用法：./scripts/deploy/benchmark.sh
# ============================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 测试函数
run_test() {
    local test_name="$1"
    local test_cmd="$2"

    log_info "Running: ${test_name}..."
    local start_time=$(date +%s)
    local start_ns=$(date +%s%N)

    if eval "$test_cmd" > /dev/null 2>&1; then
        local end_time=$(date +%s)
        local end_ns=$(date +%s%N)
        local duration=$((end_ns - start_ns))
        local duration_sec=$(echo "scale=3; $duration / 1000000000" | bc)

        echo -e "  ${GREEN}✓${NC} ${test_name}: ${duration_sec}s"
        return 0
    else
        echo -e "  ${RED}✗${NC} ${test_name}: Failed"
        return 1
    fi
}

# 结果存储
TOTAL_TESTS=0
PASSED_TESTS=0
RESULTS=()

# 主测试流程
main() {
    clear
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}                    📊 部署性能基准测试${NC}"
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo ""

    # 系统信息
    echo -e "${BOLD}${BLUE}系统信息${NC}"
    echo "  OS: $(uname -s) $(uname -r)"
    echo "  CPU: $(nproc) cores"
    echo "  Memory: $(free -h | awk 'NR==2 {print $2}')"
    echo "  Docker: $(docker --version | awk '{print $3}')"
    echo "  Node: $(node --version)"
    echo ""

    # 网络测试
    echo -e "${BOLD}${BLUE}网络性能${NC}"

    # 1. 健康检查响应时间
    run_test "Health Check Response" "curl -f -s http://localhost:3000/api/health"

    # 2. 页面加载时间
    run_test "Page Load Time" "curl -f -s https://7zi.com > /dev/null"

    # 3. API 响应时间
    run_test "API Response Time" "curl -f -s https://7zi.com/api/config > /dev/null"

    echo ""

    # 容器性能
    echo -e "${BOLD}${BLUE}容器性能${NC}"

    # 4. 容器启动时间
    run_test "Container Start Time" "docker start 7zi-frontend-blue 2>/dev/null || docker restart 7zi-frontend-blue"

    # 5. 容器停止时间
    run_test "Container Stop Time" "docker stop 7zi-frontend-blue 2>/dev/null || true"

    # 6. 容器日志查询
    run_test "Container Log Query" "docker logs --tail 50 7zi-frontend-blue 2>/dev/null || true"

    echo ""

    # 磁盘性能
    echo -e "${BOLD}${BLUE}磁盘性能${NC}"

    # 7. 磁盘读取速度
    log_info "Disk Read Speed..."
    local read_speed=$(dd if=/dev/zero of=/tmp/test_file bs=1M count=100 2>&1 | grep copied | awk '{print $NF}')
    echo "  ✓ Disk Read: ${read_speed}"
    rm -f /tmp/test_file

    # 8. 磁盘写入速度
    log_info "Disk Write Speed..."
    local write_speed=$(dd if=/dev/zero of=/tmp/test_file bs=1M count=100 2>&1 | grep copied | awk '{print $NF}')
    echo "  ✓ Disk Write: ${write_speed}"
    rm -f /tmp/test_file

    echo ""

    # 资源使用
    echo -e "${BOLD}${BLUE}资源使用${NC}"

    # 9. 内存使用
    local mem_usage=$(free | awk 'NR==2 {printf "%.1f", $3/$2 * 100}')
    echo "  Memory Usage: ${mem_usage}%"

    # 10. CPU 使用
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo "  CPU Usage: ${cpu_usage}%"

    # 11. 磁盘使用
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}')
    echo "  Disk Usage: ${disk_usage}"

    echo ""

    # Docker 镜像性能
    echo -e "${BOLD}${BLUE}Docker 镜像性能${NC}"

    # 12. 镜像列表
    log_info "Docker Images..."
    local image_count=$(docker images | wc -l)
    echo "  ✓ Image Count: $((image_count - 1))"

    # 13. 镜像大小
    log_info "Docker Image Sizes..."
    docker images | grep 7zi-frontend | head -3 | awk '{printf "  ✓ %s: %s\n", $1, $7}' || echo "  ✓ No 7zi-frontend images found"

    echo ""

    # Nginx 性能
    echo -e "${BOLD}${BLUE}Nginx 性能${NC}"

    # 14. Nginx 配置测试
    run_test "Nginx Config Test" "nginx -t"

    # 15. Nginx 重载时间
    run_test "Nginx Reload Time" "systemctl reload nginx"

    echo ""

    # 总结
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}                        📋 测试总结${NC}"
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "测试完成时间: $(date)"
    echo ""

    # 生成报告
    echo -e "${BOLD}${BLUE}建议${NC}"
    echo ""

    # 内存检查
    if (( $(echo "$mem_usage > 80" | bc -l) )); then
        echo -e "  ${YELLOW}⚠️  内存使用率较高 (${mem_usage}%)，建议清理不必要的进程${NC}"
    fi

    # 磁盘检查
    if (( $(echo "${disk_usage//%/} > 80" | bc -l) )); then
        echo -e "  ${YELLOW}⚠️  磁盘使用率较高 (${disk_usage})，建议清理 Docker 镜像${NC}"
    fi

    # 容器检查
    if ! docker ps | grep -q "7zi-frontend-blue"; then
        echo -e "  ${RED}✗ Blue 容器未运行，请检查部署状态${NC}"
    fi

    if ! docker ps | grep -q "7zi-frontend-green"; then
        echo -e "  ${YELLOW}⚠️  Green 容器未运行，蓝绿部署可能未完全配置${NC}"
    fi

    echo ""
    echo -e "${GREEN}✓ 基准测试完成！${NC}"
}

# 运行主流程
main
