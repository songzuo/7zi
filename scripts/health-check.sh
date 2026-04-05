#!/bin/bash

###############################################################################
# 7zi.com 生产环境健康检查脚本
# 版本: v1.140
# 作者: 🛡️ 系统管理员 子代理
# 日期: 2026-04-05
###############################################################################

# 注意: 不使用 'set -e' 以允许部分检查失败后继续执行其他检查
set -u
set -o pipefail

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="${WORKSPACE_DIR}/logs/health-check"
REPORT_FILE="${REPORT_DIR}/health-check-$(date +%Y%m%d-%H%M%S).log"
ALERT_THRESHOLD_DISK=90      # 磁盘使用率告警阈值 (%)
ALERT_THRESHOLD_MEMORY=90    # 内存使用率告警阈值 (%)
SERVER_IP="165.99.43.61"      # 7zi.com 服务器 IP
SERVER_URL="https://7zi.com"  # 网站URL

# 创建报告目录
mkdir -p "$REPORT_DIR"

# 初始化退出码和告警状态
EXIT_CODE=0
ALERTS=()
WARNINGS=()
CHECKS_PASSED=0
CHECKS_FAILED=0

###############################################################################
# 辅助函数
###############################################################################

log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$REPORT_FILE"
}

record_check() {
    local status="$1"
    local check_name="$2"
    local detail="${3:-}"

    if [ "$status" = "PASS" ]; then
        log "INFO" "✓ $check_name - $detail"
        ((CHECKS_PASSED++))
    elif [ "$status" = "FAIL" ]; then
        log "ERROR" "✗ $check_name - $detail"
        ALERTS+=("$check_name: $detail")
        ((CHECKS_FAILED++))
        EXIT_CODE=2
    elif [ "$status" = "WARN" ]; then
        log "WARN" "⚠ $check_name - $detail"
        WARNINGS+=("$check_name: $detail")
    fi
}

###############################################################################
# 检查 1: 网站可访问性
###############################################################################

check_website_access() {
    log "INFO" "=== 检查网站可访问性 ==="

    # 检查 HTTP 响应码
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$SERVER_URL" 2>&1 || echo "000")

    if [ "$http_code" = "200" ] || [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
        record_check "PASS" "网站HTTP响应" "HTTP $http_code"
    else
        record_check "FAIL" "网站HTTP响应" "HTTP $http_code (非正常响应)"
        return
    fi

    # 检查响应时间
    local response_time
    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "$SERVER_URL" 2>&1 || echo "999")
    response_time=$(echo "$response_time * 1000" | bc | awk '{printf "%.0f", $1}')

    if [ "$response_time" -lt 5000 ]; then
        record_check "PASS" "网站响应时间" "${response_time}ms"
    elif [ "$response_time" -lt 10000 ]; then
        record_check "WARN" "网站响应时间" "${response_time}ms (较慢)"
    else
        record_check "FAIL" "网站响应时间" "${response_time}ms (超慢)"
    fi

    # 检查 SSL 证书
    if command -v openssl &> /dev/null; then
        local cert_check
        cert_check=$(echo | openssl s_client -servername 7zi.com -connect 7zi.com:443 2>&1 | grep "Verify return code" | awk '{print $4}')
        if [ "$cert_check" = "0" ]; then
            record_check "PASS" "SSL证书" "有效"
        else
            record_check "FAIL" "SSL证书" "无效 (返回码: $cert_check)"
        fi
    fi
}

###############################################################################
# 检查 2: Nginx 服务状态
###############################################################################

check_nginx() {
    log "INFO" "=== 检查 Nginx 服务状态 ==="

    if ! sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "systemctl is-active nginx" &>/dev/null; then
        record_check "FAIL" "Nginx服务" "无法连接或未运行"
        return
    fi

    local nginx_status
    nginx_status=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "systemctl is-active nginx" 2>&1)

    if [ "$nginx_status" = "active" ]; then
        record_check "PASS" "Nginx服务" "运行中"
    else
        record_check "FAIL" "Nginx服务" "状态: $nginx_status"
        return
    fi

    # 检查 Nginx 配置
    local nginx_config
    nginx_config=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "nginx -t 2>&1" | grep -c "successful")

    if [ "$nginx_config" -gt 0 ]; then
        record_check "PASS" "Nginx配置" "有效"
    else
        record_check "FAIL" "Nginx配置" "无效"
    fi

    # 检查 Nginx 进程数
    local nginx_processes
    nginx_processes=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "ps aux | grep 'nginx: master' | grep -v grep | wc -l" 2>&1)

    if [ "$nginx_processes" -gt 0 ]; then
        record_check "PASS" "Nginx进程" "$nginx_processes 个主进程"
    else
        record_check "FAIL" "Nginx进程" "未找到主进程"
    fi
}

###############################################################################
# 检查 3: PM2 进程状态
###############################################################################

check_pm2() {
    log "INFO" "=== 检查 PM2 进程状态 ==="

    if ! command -v pm2 &> /dev/null; then
        record_check "WARN" "PM2检查" "本地未安装 PM2，跳过检查"
        return
    fi

    # 检查远程服务器上的 PM2
    local pm2_list
    pm2_list=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "pm2 list 2>&1" || echo "")

    if [ -z "$pm2_list" ]; then
        record_check "FAIL" "PM2" "无法获取进程列表"
        return
    fi

    # 检查 PM2 进程数
    local pm2_count
    pm2_count=$(echo "$pm2_list" | grep -c "online" || echo "0")

    if [ "$pm2_count" -gt 0 ]; then
        record_check "PASS" "PM2进程" "$pm2_count 个在线进程"
    else
        record_check "FAIL" "PM2进程" "无在线进程"
        return
    fi

    # 检查是否有异常状态
    local pm2_errors
    pm2_errors=$(echo "$pm2_list" | grep -c "errored" || echo "0")

    if [ "$pm2_errors" -eq 0 ]; then
        record_check "PASS" "PM2状态" "所有进程正常"
    else
        record_check "FAIL" "PM2状态" "$pm2_errors 个进程错误"
    fi

    # 检查进程重启次数
    local pm2_restarts
    pm2_restarts=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "pm2 jlist 2>/dev/null | jq -r '[.[].pm2_env.restart_time] | add' 2>/dev/null" || echo "0")

    if [ "$pm2_restarts" -lt 10 ]; then
        record_check "PASS" "PM2重启" "总重启次数: $pm2_restarts"
    else
        record_check "WARN" "PM2重启" "重启次数较高: $pm2_restarts"
    fi
}

###############################################################################
# 检查 4: Docker 容器状态
###############################################################################

check_docker() {
    log "INFO" "=== 检查 Docker 容器状态 ==="

    # 检查 Docker 是否运行
    if ! sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "docker ps &>/dev/null"; then
        record_check "WARN" "Docker" "Docker 未运行或未安装"
        return
    fi

    # 检查运行的容器数
    local docker_running
    docker_running=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "docker ps -q | wc -l" 2>&1)

    if [ "$docker_running" -gt 0 ]; then
        record_check "PASS" "Docker容器" "$docker_running 个运行中"
    else
        record_check "INFO" "Docker容器" "无运行中容器"
    fi

    # 检查是否有异常退出的容器
    local docker_exited
    docker_exited=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "docker ps -a --filter 'status=exited' -q | wc -l" 2>&1)

    if [ "$docker_exited" -eq 0 ]; then
        record_check "PASS" "Docker状态" "无异常退出容器"
    else
        record_check "WARN" "Docker状态" "$docker_exited 个容器异常退出"
    fi

    # 检查 Docker 磁盘使用
    local docker_disk_usage
    docker_disk_usage=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "docker system df --format '{{.Size}}' 2>&1 | head -1" || echo "")

    if [ -n "$docker_disk_usage" ]; then
        record_check "INFO" "Docker磁盘" "使用量: $docker_disk_usage"
    fi
}

###############################################################################
# 检查 5: 磁盘空间
###############################################################################

check_disk() {
    log "INFO" "=== 检查磁盘空间 ==="

    # 获取根分区使用率
    local disk_usage
    disk_usage=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "df -h / | awk 'NR==2 {print \$5}' | tr -d '%'" 2>&1)

    if [ -z "$disk_usage" ]; then
        record_check "FAIL" "磁盘检查" "无法获取磁盘使用率"
        return
    fi

    if [ "$disk_usage" -lt "$ALERT_THRESHOLD_DISK" ]; then
        record_check "PASS" "磁盘空间" "使用率: ${disk_usage}%"
    elif [ "$disk_usage" -lt 95 ]; then
        record_check "WARN" "磁盘空间" "使用率: ${disk_usage}% (接近告警阈值)"
    else
        record_check "FAIL" "磁盘空间" "使用率: ${disk_usage}% (严重告警)"
    fi

    # 获取 inode 使用情况
    local inode_usage
    inode_usage=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "df -i / | awk 'NR==2 {print \$5}' | tr -d '%'" 2>&1)

    if [ -n "$inode_usage" ] && [ "$inode_usage" -lt 90 ]; then
        record_check "PASS" "Inode空间" "使用率: ${inode_usage}%"
    elif [ -n "$inode_usage" ]; then
        record_check "WARN" "Inode空间" "使用率: ${inode_usage}% (较高)"
    fi
}

###############################################################################
# 检查 6: 内存使用
###############################################################################

check_memory() {
    log "INFO" "=== 检查内存使用 ==="

    # 获取内存使用率
    local mem_total
    local mem_available
    local mem_usage_percent

    mem_info=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "free | awk 'NR==2 {print \$2,\$7}'" 2>&1)

    if [ -z "$mem_info" ]; then
        record_check "FAIL" "内存检查" "无法获取内存信息"
        return
    fi

    mem_total=$(echo $mem_info | awk '{print $1}')
    mem_available=$(echo $mem_info | awk '{print $2}')
    mem_usage_percent=$(echo "scale=1; ($mem_total - $mem_available) * 100 / $mem_total" | bc | awk '{printf "%.0f", $1}')

    if [ "$mem_usage_percent" -lt "$ALERT_THRESHOLD_MEMORY" ]; then
        record_check "PASS" "内存使用" "使用率: ${mem_usage_percent}%"
    elif [ "$mem_usage_percent" -lt 95 ]; then
        record_check "WARN" "内存使用" "使用率: ${mem_usage_percent}% (接近告警阈值)"
    else
        record_check "FAIL" "内存使用" "使用率: ${mem_usage_percent}% (严重告警)"
    fi

    # 检查 Swap 使用
    local swap_usage
    swap_usage=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "free | awk 'NR==3 {print \$3,\$2}' | awk '{if(\$2!=0) print (\$1*100/\$2); else print 0}'" 2>&1)

    if [ -n "$swap_usage" ]; then
        swap_usage_percent=$(echo "$swap_usage" | awk '{printf "%.0f", $1}')
        if [ "$swap_usage_percent" -lt 50 ]; then
            record_check "PASS" "Swap使用" "使用率: ${swap_usage_percent}%"
        elif [ "$swap_usage_percent" -lt 80 ]; then
            record_check "WARN" "Swap使用" "使用率: ${swap_usage_percent}% (较高)"
        else
            record_check "FAIL" "Swap使用" "使用率: ${swap_usage_percent}% (严重告警)"
        fi
    fi
}

###############################################################################
# 检查 7: 系统负载
###############################################################################

check_load() {
    log "INFO" "=== 检查系统负载 ==="

    local load_info
    load_info=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "uptime | awk -F'load average:' '{print \$2}'" 2>&1 | xargs)

    if [ -z "$load_info" ]; then
        record_check "FAIL" "系统负载" "无法获取负载信息"
        return
    fi

    local load_1min
    local load_5min
    local load_15min
    local cpu_cores

    load_1min=$(echo $load_info | awk '{print $1}' | cut -d',' -f1)
    load_5min=$(echo $load_info | awk '{print $2}' | cut -d',' -f1)
    load_15min=$(echo $load_info | awk '{print $3}')
    cpu_cores=$(sshpass -p 'ge20993344$ZZ' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@${SERVER_IP} "nproc" 2>&1)

    load_1min_int=$(echo "$load_1min" | awk '{printf "%.0f", $1}')

    if [ "$load_1min_int" -lt "$cpu_cores" ]; then
        record_check "PASS" "系统负载" "1min: $load_1min, 5min: $load_5min, 15min: $load_15min (CPU数: $cpu_cores)"
    elif [ "$load_1min_int" -lt "$((cpu_cores * 2))" ]; then
        record_check "WARN" "系统负载" "1min: $load_1min, 5min: $load_5min, 15min: $load_15min (较高, CPU数: $cpu_cores)"
    else
        record_check "FAIL" "系统负载" "1min: $load_1min, 5min: $load_5min, 15min: $load_15min (严重, CPU数: $cpu_cores)"
    fi
}

###############################################################################
# 生成汇总报告
###############################################################################

generate_summary() {
    log "INFO" "=== 健康检查汇总 ==="

    local total_checks=$((CHECKS_PASSED + CHECKS_FAILED))

    echo "" | tee -a "$REPORT_FILE"
    echo "========================================" | tee -a "$REPORT_FILE"
    echo "健康检查结果汇总" | tee -a "$REPORT_FILE"
    echo "========================================" | tee -a "$REPORT_FILE"
    echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$REPORT_FILE"
    echo "服务器: 7zi.com (${SERVER_IP})" | tee -a "$REPORT_FILE"
    echo "----------------------------------------" | tee -a "$REPORT_FILE"
    echo "总检查项: $total_checks" | tee -a "$REPORT_FILE"
    echo "✓ 通过: $CHECKS_PASSED" | tee -a "$REPORT_FILE"
    echo "✗ 失败: $CHECKS_FAILED" | tee -a "$REPORT_FILE"
    echo "⚠ 警告: ${#WARNINGS[@]}" | tee -a "$REPORT_FILE"
    echo "----------------------------------------" | tee -a "$REPORT_FILE"

    # 输出告警
    if [ ${#ALERTS[@]} -gt 0 ]; then
        echo "🚨 严重告警:" | tee -a "$REPORT_FILE"
        for alert in "${ALERTS[@]}"; do
            echo "   - $alert" | tee -a "$REPORT_FILE"
        done
        echo "" | tee -a "$REPORT_FILE"
    fi

    # 输出警告
    if [ ${#WARNINGS[@]} -gt 0 ]; then
        echo "⚠️  警告信息:" | tee -a "$REPORT_FILE"
        for warning in "${WARNINGS[@]}"; do
            echo "   - $warning" | tee -a "$REPORT_FILE"
        done
        echo "" | tee -a "$REPORT_FILE"
    fi

    # 系统状态
    if [ $CHECKS_FAILED -eq 0 ] && [ ${#WARNINGS[@]} -eq 0 ]; then
        echo "🟢 系统状态: 健康" | tee -a "$REPORT_FILE"
    elif [ $CHECKS_FAILED -eq 0 ]; then
        echo "🟡 系统状态: 需要关注" | tee -a "$REPORT_FILE"
        EXIT_CODE=1
    else
        echo "🔴 系统状态: 异常" | tee -a "$REPORT_FILE"
    fi

    echo "========================================" | tee -a "$REPORT_FILE"
    echo "详细日志: $REPORT_FILE" | tee -a "$REPORT_FILE"
    echo "========================================" | tee -a "$REPORT_FILE"

    # 返回退出码
    if [ $CHECKS_FAILED -gt 0 ]; then
        exit 2
    elif [ ${#WARNINGS[@]} -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

###############################################################################
# 主函数
###############################################################################

main() {
    log "INFO" "=== 开始 7zi.com 健康检查 ==="

    # 执行所有检查
    check_website_access
    check_nginx
    check_pm2
    check_docker
    check_disk
    check_memory
    check_load

    # 生成汇总报告
    generate_summary
}

# 执行主函数
main
