#!/bin/bash
# ============================================
# 部署验证脚本 - Deployment Verification
# ============================================
# 用途：验证部署是否成功，包括健康检查、冒烟测试等
# 用法：./scripts/deploy/verify-deploy.sh [environment]
# ============================================

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 配置
ENVIRONMENT="${1:-production}"
BASE_URL="https://7zi.com"
HEALTH_ENDPOINT="/api/health"
TIMEOUT=30
RETRY_COUNT=6
RETRY_DELAY=5

# 统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 执行测试
run_test() {
    local test_name="$1"
    local test_command="$2"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    log_info "Running: ${test_name}..."

    if eval "$test_command"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log_success "✓ ${test_name}"
        return 0
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log_error "✗ ${test_name}"
        return 1
    fi
}

# 1. 健康检查测试
test_health_check() {
    local attempt=1

    while [ $attempt -le $RETRY_COUNT ]; do
        if curl -f -s "${BASE_URL}${HEALTH_ENDPOINT}" > /dev/null 2>&1; then
            return 0
        fi

        log_info "Health check attempt ${attempt}/${RETRY_COUNT} failed. Retrying..."
        sleep $RETRY_DELAY
        ((attempt++))
    done

    return 1
}

# 2. 页面可访问性测试
test_page_accessibility() {
    local endpoints=(
        "/"
        "/about"
        "/contact"
        "/api/config"
    )

    for endpoint in "${endpoints[@]}"; do
        if ! curl -f -s -o /dev/null -w "%{http_code}" "${BASE_URL}${endpoint}" | grep -q "200\|301\|302"; then
            log_error "Failed to access ${BASE_URL}${endpoint}"
            return 1
        fi
    done

    return 0
}

# 3. SSL 证书测试
test_ssl_certificate() {
    local cert_info
    cert_info=$(echo | openssl s_client -servername 7zi.com -connect 7zi.com:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

    if [ -z "$cert_info" ]; then
        return 1
    fi

    # 检查证书是否过期
    local expiry_date
    expiry_date=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
    local expiry_epoch=$(date -d "$expiry_date" +%s 2>/dev/null || echo 0)
    local current_epoch=$(date +%s)
    local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))

    if [ $days_until_expiry -lt 7 ]; then
        log_warning "SSL certificate expires in ${days_until_expiry} days"
        return 1
    fi

    return 0
}

# 4. 响应时间测试
test_response_time() {
    local max_time=5  # 5秒
    local response_time
    response_time=$(curl -o /dev/null -s -w '%{time_total}\n' "${BASE_URL}")

    if (( $(echo "$response_time > $max_time" | bc -l) )); then
        log_error "Response time too high: ${response_time}s (max: ${max_time}s)"
        return 1
    fi

    return 0
}

# 5. Docker 容器状态测试
test_docker_containers() {
    local expected_containers=(
        "7zi-frontend-blue"
        "7zi-frontend-green"
        "nginx"
    )

    for container in "${expected_containers[@]}"; do
        if ! docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            log_warning "Container ${container} is not running"
            return 1
        fi
    done

    return 0
}

# 6. 磁盘空间测试
test_disk_space() {
    local min_space=10  # 10%
    local disk_usage
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ $disk_usage -gt $((100 - min_space)) ]; then
        log_warning "Disk space low: ${disk_usage}% used"
        return 1
    fi

    return 0
}

# 7. 内存使用测试
test_memory_usage() {
    local max_usage=90  # 90%
    local mem_usage
    mem_usage=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')

    if [ $mem_usage -gt $max_usage ]; then
        log_warning "Memory usage high: ${mem_usage}%"
        return 1
    fi

    return 0
}

# 8. Nginx 配置测试
test_nginx_config() {
    if ! nginx -t 2>&1 | grep -q "successful\|syntax is ok"; then
        return 1
    fi

    return 0
}

# 9. 进程测试
test_running_processes() {
    local required_processes=(
        "node"
        "nginx"
    )

    for process in "${required_processes[@]}"; do
        if ! pgrep -x "$process" > /dev/null; then
            log_warning "Process ${process} is not running"
            return 1
        fi
    done

    return 0
}

# 10. 日志错误检查
test_log_errors() {
    local log_file="/var/log/nginx/error.log"
    local time_window="5 minutes ago"

    if [ ! -f "$log_file" ]; then
        return 0
    fi

    local error_count
    error_count=$(journalctl --since "$time_window" -u nginx | grep -c "error" || echo 0)

    if [ $error_count -gt 0 ]; then
        log_warning "Found ${error_count} errors in logs"
        return 1
    fi

    return 0
}

# 主流程
main() {
    log_info "========================================"
    log_info "  Deployment Verification"
    log_info "========================================"
    log_info "Environment: ${ENVIRONMENT}"
    log_info "Base URL: ${BASE_URL}"
    log_info ""

    # 运行所有测试
    run_test "Health Check" "test_health_check"
    run_test "Page Accessibility" "test_page_accessibility"
    run_test "SSL Certificate" "test_ssl_certificate"
    run_test "Response Time" "test_response_time"
    run_test "Docker Containers" "test_docker_containers"
    run_test "Disk Space" "test_disk_space"
    run_test "Memory Usage" "test_memory_usage"
    run_test "Nginx Configuration" "test_nginx_config"
    run_test "Running Processes" "test_running_processes"
    run_test "Log Errors" "test_log_errors"

    # 总结
    log_info ""
    log_info "========================================"
    log_info "  Test Summary"
    log_info "========================================"
    log_info "Total Tests: ${TOTAL_TESTS}"
    log_success "Passed: ${PASSED_TESTS}"
    if [ $FAILED_TESTS -gt 0 ]; then
        log_error "Failed: ${FAILED_TESTS}"
    else
        log_info "Failed: ${FAILED_TESTS}"
    fi
    log_info "========================================"

    if [ $FAILED_TESTS -eq 0 ]; then
        log_success "All tests passed! ✓"
        exit 0
    else
        log_error "Some tests failed! ✗"
        exit 1
    fi
}

# 运行主流程
main "$@"
