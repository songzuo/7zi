#!/bin/bash
# ============================================
# 监控指标收集脚本 - Metrics Collection
# ============================================
# 用途：收集部署后的性能指标和用户反馈
# 用法：./scripts/deploy/collect-metrics.sh [duration]
# ============================================

set -euo pipefail

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

log_metric() {
    echo -e "${PURPLE}[METRIC]${NC} $1"
}

# 配置
DURATION="${1:-300}"  # 默认收集 5 分钟
METRICS_DIR="/var/log/7zi-metrics"
CURRENT_DIR="${METRICS_DIR}/$(date +%Y%m%d-%H%M%S)"
NGINX_ACCESS_LOG="/var/log/nginx/7zi.access.log"
NGINX_ERROR_LOG="/var/log/nginx/error.log"
DOCKER_LOGS_DIR="/var/log/docker/7zi-frontend"

# 监控阈值
ALERT_THRESHOLD_ERROR_RATE=5
ALERT_THRESHOLD_RESPONSE_TIME=2000
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90

# 创建输出目录
mkdir -p "$CURRENT_DIR"

# 记录指标
record_metric() {
    local metric_name="$1"
    local metric_value="$2"
    local metric_file="$CURRENT_DIR/${metric_name}.json"

    echo "{
  \"name\": \"${metric_name}\",
  \"value\": ${metric_value},
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"unit\": \"ms\"
}" > "$metric_file"

    log_metric "${metric_name}: ${metric_value}"
}

# 收集 Nginx 访问日志指标
collect_nginx_metrics() {
    log_info "Collecting Nginx metrics..."

    # 提取最近 10 分钟的日志
    local recent_logs=$(journalctl -u nginx --since "10 minutes ago" | grep "7zi.com" || echo "")

    if [ -z "$recent_logs" ]; then
        log_warning "No recent Nginx logs found"
        return
    fi

    # 统计总请求数
    local total_requests=$(echo "$recent_logs" | wc -l)
    record_metric "nginx_total_requests" "$total_requests"

    # 统计错误率（4xx 和 5xx）
    local error_requests=$(echo "$recent_logs" | grep -E '" [45][0-9]{2} ' | wc -l)
    local error_rate=0
    if [ "$total_requests" -gt 0 ]; then
        error_rate=$(echo "scale=2; ($error_requests / $total_requests) * 100" | bc)
    fi
    record_metric "nginx_error_rate" "$error_rate"

    # 检查是否超过阈值
    if (( $(echo "$error_rate > $ALERT_THRESHOLD_ERROR_RATE" | bc -l 2>/dev/null || echo 0) )); then
        log_warning "⚠️  Error rate (${error_rate}%) exceeds threshold (${ALERT_THRESHOLD_ERROR_RATE}%)"
    fi

    # 统计响应时间
    local response_times=$(echo "$recent_logs" | grep -oE 'response_time=[0-9.]+' | sed 's/response_time=//' | grep -E '^[0-9.]+$' || echo "0")
    local avg_response_time=$(echo "$response_times" | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
    record_metric "nginx_avg_response_time" "$avg_response_time"

    # 检查响应时间阈值
    if (( $(echo "$avg_response_time > $ALERT_THRESHOLD_RESPONSE_TIME" | bc -l 2>/dev/null || echo 0) )); then
        log_warning "⚠️  Response time (${avg_response_time}ms) exceeds threshold (${ALERT_THRESHOLD_RESPONSE_TIME}ms)"
    fi

    # 统计状态码分布
    echo "$recent_logs" | grep -oE '" [0-9]{3} ' | sort | uniq -c | sort -rn > "$CURRENT_DIR/nginx_status_codes.txt"

    # 统计最频繁的 URL
    echo "$recent_logs" | grep -oE '"[A-Z]+ [^"]+' | sort | uniq -c | sort -rn | head -20 > "$CURRENT_DIR/nginx_top_urls.txt"

    log_success "Nginx metrics collected"
}

# 收集 Docker 容器指标
collect_docker_metrics() {
    log_info "Collecting Docker metrics..."

    local container_name="7zi-frontend"

    # 检查容器是否运行
    if ! docker ps | grep -q "${container_name}"; then
        log_error "Container ${container_name} not running"
        return
    fi

    # CPU 使用率
    local cpu_usage=$(docker stats --no-stream --format "{{.CPUPerc}}" "${container_name}" | sed 's/%//')
    record_metric "docker_cpu_usage" "$cpu_usage"

    if (( $(echo "$cpu_usage > $ALERT_THRESHOLD_CPU" | bc -l 2>/dev/null || echo 0) )); then
        log_warning "⚠️  CPU usage (${cpu_usage}%) exceeds threshold (${ALERT_THRESHOLD_CPU}%)"
    fi

    # 内存使用率
    local mem_usage=$(docker stats --no-stream --format "{{.MemPerc}}" "${container_name}" | sed 's/%//')
    record_metric "docker_memory_usage" "$mem_usage"

    if (( $(echo "$mem_usage > $ALERT_THRESHOLD_MEMORY" | bc -l 2>/dev/null || echo 0) )); then
        log_warning "⚠️  Memory usage (${mem_usage}%) exceeds threshold (${ALERT_THRESHOLD_MEMORY}%)"
    fi

    # 网络流量
    local net_rx=$(docker stats --no-stream --format "{{.NetIO}}" "${container_name}" | awk '{print $1}' | sed 's/KB//')
    local net_tx=$(docker stats --no-stream --format "{{.NetIO}}" "${container_name}" | awk '{print $3}' | sed 's/KB//')
    record_metric "docker_network_rx" "$net_rx"
    record_metric "docker_network_tx" "$net_tx"

    # 磁盘使用率
    local disk_usage=$(df -h /var/lib/docker | tail -1 | awk '{print $5}' | sed 's/%//')
    record_metric "disk_usage" "$disk_usage"

    if [ "$disk_usage" -gt "$ALERT_THRESHOLD_DISK" ]; then
        log_warning "⚠️  Disk usage (${disk_usage}%) exceeds threshold (${ALERT_THRESHOLD_DISK}%)"
    fi

    # 容器日志（最近 100 行）
    docker logs --tail 100 "${container_name}" > "$CURRENT_DIR/docker_container.log"

    log_success "Docker metrics collected"
}

# 收集应用性能指标
collect_app_metrics() {
    log_info "Collecting application metrics..."

    # 调用应用指标接口
    local metrics_url="http://localhost:3000/api/metrics"

    if curl -f -s "$metrics_url" > "$CURRENT_DIR/app_metrics.json" 2>/dev/null; then
        log_success "Application metrics collected"

        # 提取关键指标
        local request_count=$(jq -r '.request_count // 0' "$CURRENT_DIR/app_metrics.json")
        local avg_response_time=$(jq -r '.avg_response_time // 0' "$CURRENT_DIR/app_metrics.json")
        local error_count=$(jq -r '.error_count // 0' "$CURRENT_DIR/app_metrics.json")

        record_metric "app_request_count" "$request_count"
        record_metric "app_avg_response_time" "$avg_response_time"
        record_metric "app_error_count" "$error_count"
    else
        log_warning "Failed to fetch application metrics"
    fi

    # 调用健康检查接口
    local health_url="http://localhost:3000/api/health"

    if curl -f -s "$health_url" > "$CURRENT_DIR/app_health.json" 2>/dev/null; then
        log_success "Health check passed"

        # 提取健康指标
        local uptime=$(jq -r '.uptime // 0' "$CURRENT_DIR/app_health.json")
        local version=$(jq -r '.version // "unknown"' "$CURRENT_DIR/app_health.json")

        record_metric "app_uptime" "$uptime"

        echo "Version: $version" > "$CURRENT_DIR/app_version.txt"
    else
        log_error "Health check failed!"
    fi
}

# 收集系统指标
collect_system_metrics() {
    log_info "Collecting system metrics..."

    # CPU 总体使用率
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    record_metric "system_cpu_usage" "$cpu_usage"

    # 内存使用率
    local mem_usage=$(free | grep Mem | awk '{printf "%.2f", ($3/$2) * 100}')
    record_metric "system_memory_usage" "$mem_usage"

    # 系统负载
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}')
    record_metric "system_load_avg" "$load_avg"

    # 网络连接数
    local connections=$(netstat -an | grep :3000 | grep ESTABLISHED | wc -l)
    record_metric "network_connections" "$connections"

    log_success "System metrics collected"
}

# 持续监控
continuous_monitoring() {
    log_info "Starting continuous monitoring for ${DURATION} seconds..."

    local end_time=$(($(date +%s) + DURATION))
    local interval=10  # 每 10 秒收集一次

    while [ $(date +%s) -lt $end_time ]; do
        local timestamp=$(date +%s)
        local metrics_file="$CURRENT_DIR/metrics_timeline.csv"

        # 创建 CSV 文件头（第一次）
        if [ ! -f "$metrics_file" ]; then
            echo "timestamp,cpu_usage,mem_usage,requests,errors,avg_response_time" > "$metrics_file"
        fi

        # 收集当前指标
        local cpu=$(docker stats --no-stream --format "{{.CPUPerc}}" 7zi-frontend 2>/dev/null | sed 's/%//' || echo "0")
        local mem=$(docker stats --no-stream --format "{{.MemPerc}}" 7zi-frontend 2>/dev/null | sed 's/%//' || echo "0")

        # 从 Nginx 日志获取请求和错误数
        local requests=$(journalctl -u nginx --since "1 second ago" | grep -c "7zi.com" || echo "0")
        local errors=$(journalctl -u nginx --since "1 second ago" | grep "7zi.com" | grep -cE '" [45][0-9]{2} ' || echo "0")
        local avg_response=0

        # 写入 CSV
        echo "${timestamp},${cpu},${mem},${requests},${errors},${avg_response}" >> "$metrics_file"

        log_info "Collected metrics at $(date +%H:%M:%S): CPU=${cpu}%, MEM=${mem}%, REQ=${requests}, ERR=${errors}"

        sleep $interval
    done

    log_success "Continuous monitoring completed"
}

# 生成报告
generate_report() {
    log_info "Generating metrics report..."

    local report_file="$CURRENT_DIR/metrics_report.txt"

    cat > "$report_file" << EOF
========================================
7zi 部署监控报告
========================================

时间范围: $(date +%Y-%m-%d\ %H:%M:%S) 至 $(date -d "@$(($(date +%s) - DURATION))" +%Y-%m-%d\ %H:%M:%S)
监控时长: ${DURATION} 秒

----------------------------------------
指标摘要
----------------------------------------

EOF

    # 读取 JSON 指标并添加到报告
    for metric_file in "$CURRENT_DIR"/*.json; do
        if [ -f "$metric_file" ]; then
            local name=$(jq -r '.name' "$metric_file")
            local value=$(jq -r '.value' "$metric_file")
            local unit=$(jq -r '.unit' "$metric_file")

            echo "$name: $value $unit" >> "$report_file"
        fi
    done

    cat >> "$report_file" << EOF

----------------------------------------
警告检查
----------------------------------------

EOF

    # 检查是否超过阈值
    local error_rate=$(jq -r '.value // 0' "$CURRENT_DIR/nginx_error_rate.json" 2>/dev/null || echo "0")
    local avg_response=$(jq -r '.value // 0' "$CURRENT_DIR/nginx_avg_response_time.json" 2>/dev/null || echo "0")
    local cpu=$(jq -r '.value // 0' "$CURRENT_DIR/docker_cpu_usage.json" 2>/dev/null || echo "0")
    local mem=$(jq -r '.value // 0' "$CURRENT_DIR/docker_memory_usage.json" 2>/dev/null || echo "0")

    if (( $(echo "$error_rate > $ALERT_THRESHOLD_ERROR_RATE" | bc -l 2>/dev/null || echo 0) )); then
        echo "⚠️  错误率 (${error_rate}%) 超过阈值 (${ALERT_THRESHOLD_ERROR_RATE}%)" >> "$report_file"
    fi

    if (( $(echo "$avg_response > $ALERT_THRESHOLD_RESPONSE_TIME" | bc -l 2>/dev/null || echo 0) )); then
        echo "⚠️  响应时间 (${avg_response}ms) 超过阈值 (${ALERT_THRESHOLD_RESPONSE_TIME}ms)" >> "$report_file"
    fi

    if (( $(echo "$cpu > $ALERT_THRESHOLD_CPU" | bc -l 2>/dev/null || echo 0) )); then
        echo "⚠️  CPU 使用率 (${cpu}%) 超过阈值 (${ALERT_THRESHOLD_CPU}%)" >> "$report_file"
    fi

    if (( $(echo "$mem > $ALERT_THRESHOLD_MEMORY" | bc -l 2>/dev/null || echo 0) )); then
        echo "⚠️  内存使用率 (${mem}%) 超过阈值 (${ALERT_THRESHOLD_MEMORY}%)" >> "$report_file"
    fi

    if ! grep -q "⚠️" "$report_file"; then
        echo "✅ 所有指标正常" >> "$report_file"
    fi

    cat >> "$report_file" << EOF

----------------------------------------
数据文件
----------------------------------------

EOF

    ls -lh "$CURRENT_DIR" >> "$report_file"

    log_success "Report generated: $report_file"
    cat "$report_file"
}

# 主流程
main() {
    log_info "========================================"
    log_info "  Metrics Collection Script"
    log_info "========================================"
    log_info "Duration: ${DURATION} seconds"
    log_info "Output: $CURRENT_DIR"
    log_info ""

    # 创建输出目录
    mkdir -p "$CURRENT_DIR"

    # 收集各指标
    collect_nginx_metrics
    collect_docker_metrics
    collect_app_metrics
    collect_system_metrics

    # 持续监控
    if [ "$DURATION" -gt 60 ]; then
        continuous_monitoring
    fi

    # 生成报告
    generate_report

    # 总结
    log_info ""
    log_success "========================================"
    log_success "  Metrics Collection Completed!"
    log_success "========================================"
    log_success "Output: $CURRENT_DIR"
    log_success "Duration: ${DURATION} seconds"
    log_success "========================================"
}

# 运行主流程
main "$@"
