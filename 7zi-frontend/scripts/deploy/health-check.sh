#!/bin/bash
# ============================================
# 健康检查定时任务脚本
# Health Check Cron Job Script
# ============================================
# 用途：定时检查服务健康状态和 SSL 证书
# 调度：每 5 分钟执行一次
# 用法：./health-check.sh [notify|verbose]
# ============================================

set -euo pipefail

# ------------------------------------
# 配置
# ------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
LOG_FILE="${LOG_DIR:-/var/log}/health-check.log"
SSL_SCRIPT="$SCRIPT_DIR/ssl-renew.sh"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-https://7zi.com/api/health}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-admin@7zi.com}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
VERBOSE=false
NOTIFY=false

# 健康检查超时 (秒)
TIMEOUT=10

# 重试次数
MAX_RETRIES=3
RETRY_DELAY=5

# ------------------------------------
# 颜色输出
# ------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$1] $2" | tee -a "$LOG_FILE"
}
log_info()  { log "INFO" "${BLUE}$*${NC}"; }
log_ok()    { log "OK"   "${GREEN}$*${NC}"; }
log_warn()  { log "WARN" "${YELLOW}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }

# ------------------------------------
# 初始化
# ------------------------------------
init() {
    mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || sudo mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE" 2>/dev/null || sudo touch "$LOG_FILE"
}

# ------------------------------------
# 发送通知
# ------------------------------------
send_alert() {
    local subject="$1"
    local message="$2"
    local severity="${3:-warning}"  # info, warning, error

    # 邮件通知
    if [[ -n "$NOTIFY_EMAIL" ]] && [[ "$NOTIFY" == "true" ]]; then
        echo "$message" | mail -s "[7zi-health] $severity: $subject" "$NOTIFY_EMAIL" 2>/dev/null || true
    fi

    # Slack 通知
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="warning"
        [[ "$severity" == "error" ]] && color="danger"
        [[ "$severity" == "info" ]] && color="good"

        curl -s -X POST "$SLACK_WEBHOOK" -H 'Content-type: application/json' \
            --data "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"title\": \"$subject\",
                    \"text\": \"$message\",
                    \"footer\": \"7zi Health Check\",
                    \"ts\": $(date +%s)
                }]
            }" >/dev/null 2>&1 || true
    fi

    # Telegram 通知
    if [[ -n "$TELEGRAM_BOT_TOKEN" ]] && [[ -n "$TELEGRAM_CHAT_ID" ]]; then
        local emoji="⚠️"
        [[ "$severity" == "error" ]] && emoji="🚨"
        [[ "$severity" == "info" ]] && emoji="✅"

        curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
            -d "chat_id=$TELEGRAM_CHAT_ID" \
            -d "text=${emoji} *$subject*%0A$message" \
            -d "parse_mode=Markdown" >/dev/null 2>&1 || true
    fi
}

# ------------------------------------
# HTTP 健康检查
# ------------------------------------
check_http() {
    local url="$1"
    local name="${2:-HTTP}"

    log_info "检查 $name: $url"

    local attempt=1
    while [[ $attempt -le $MAX_RETRIES ]]; do
        local start_time=$(date +%s%3N)
        local http_code
        local response_time

        # 获取 HTTP 状态码和响应时间
        if command -v curl >/dev/null 2>&1; then
            http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$TIMEOUT" "$url" 2>/dev/null || echo "000")
            response_time=$(( $(date +%s%3N) - start_time ))
        else
            http_code=$(wget -q -O /dev/null --timeout="$TIMEOUT" --server-response "$url" 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}' || echo "000")
            response_time=0
        fi

        if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
            log_ok "$name 检查通过 (${http_code}, ${response_time}ms)"
            return 0
        fi

        log_warn "$name 检查失败 (尝试 $attempt/$MAX_RETRIES): HTTP $http_code"
        
        if [[ $attempt -lt $MAX_RETRIES ]]; then
            sleep "$RETRY_DELAY"
        fi
        ((attempt++))
    done

    log_error "$name 检查失败: HTTP $http_code"
    return 1
}

# ------------------------------------
# SSL 证书检查
# ------------------------------------
check_ssl() {
    log_info "检查 SSL 证书..."

    # 调用 ssl-renew.sh 的 check 功能
    if [[ -x "$SSL_SCRIPT" ]]; then
        local cert_output
        cert_output=$("$SSL_SCRIPT" check 2>&1)
        local cert_status=$?

        echo "$cert_output" | tee -a "$LOG_FILE"

        if [[ $cert_status -eq 0 ]]; then
            log_ok "SSL 证书状态正常"
            return 0
        elif [[ $cert_status -eq 2 ]]; then
            log_error "SSL 证书已过期!"
            send_alert "SSL 证书已过期" "SSL 证书已过期，需要立即续期!" "error"
            return 2
        elif [[ $cert_status -eq 3 ]]; then
            log_warn "SSL 证书即将过期"
            send_alert "SSL 证书即将过期" "SSL 证书将在 7 天内过期" "warning"
            return 3
        else
            log_warn "SSL 证书状态异常"
            return $cert_status
        fi
    else
        log_warn "SSL 检查脚本不可用，尝试手动检查..."
        
        local cert_file="/etc/letsencrypt/live/7zi.com/fullchain.pem"
        if [[ -f "$cert_file" ]]; then
            local expire_date=$(openssl x509 -in "$cert_file" -noout -enddate 2>/dev/null | cut -d= -f2)
            local expire_ts=$(date -d "$expire_date" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y" "$expire_date" +%s 2>/dev/null)
            local now_ts=$(date +%s)
            local days_left=$(( (expire_ts - now_ts) / 86400 ))

            if [[ $days_left -le 0 ]]; then
                log_error "SSL 证书已过期!"
                send_alert "SSL 证书已过期" "SSL 证书已过期，需要立即续期!" "error"
                return 2
            elif [[ $days_left -le 7 ]]; then
                log_warn "SSL 证书将在 $days_left 天后过期"
                send_alert "SSL 证书即将过期" "SSL 证书将在 $days_left 天后过期" "warning"
                return 3
            else
                log_ok "SSL 证书有效期: $days_left 天"
                return 0
            fi
        else
            log_warn "SSL 证书文件未找到"
            return 1
        fi
    fi
}

# ------------------------------------
# DNS 解析检查
# ------------------------------------
check_dns() {
    local domain="${1:-7zi.com}"
    log_info "检查 DNS 解析: $domain"

    local ip
    ip=$(dig +short "$domain" 2>/dev/null | tail -1 || \
         host "$domain" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | tail -1 || \
         getent hosts "$domain" 2>/dev/null | awk '{print $1}' | tail -1)

    if [[ -n "$ip" ]]; then
        log_ok "DNS 解析正常: $domain -> $ip"
        return 0
    else
        log_error "DNS 解析失败: $domain"
        return 1
    fi
}

# ------------------------------------
# Nginx 进程检查
# ------------------------------------
check_nginx() {
    log_info "检查 Nginx 进程..."

    if pgrep -x nginx >/dev/null 2>&1; then
        log_ok "Nginx 进程运行中"
        return 0
    else
        log_error "Nginx 进程未运行"
        send_alert "Nginx 服务中断" "Nginx 进程未运行，需要检查!" "error"
        return 1
    fi
}

# ------------------------------------
# 端口检查
# ------------------------------------
check_port() {
    local port="${1:-443}"
    local name="${2:-HTTPS}"
    log_info "检查端口 $name ($port)..."

    if command -v ss >/dev/null 2>&1; then
        if ss -tlnp 2>/dev/null | grep -q ":$port "; then
            log_ok "端口 $port 监听正常"
            return 0
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            log_ok "端口 $port 监听正常"
            return 0
        fi
    fi

    log_error "端口 $port 未监听"
    return 1
}

# ------------------------------------
# 主健康检查
# ------------------------------------
do_health_check() {
    local failed=0
    local total=0

    echo ""
    echo "========================================"
    echo "  健康检查报告 - $(date '+%Y-%m-%d %H:%M:%S')"
    echo "========================================"

    # 1. HTTP 健康检查
    ((total++))
    check_http "$HEALTH_CHECK_URL" "API 健康检查" || ((failed++))

    # 2. HTTPS 健康检查
    ((total++))
    check_http "https://7zi.com/" "主站 HTTPS" || ((failed++))

    # 3. SSL 证书检查
    ((total++))
    check_ssl || ((failed++))

    # 4. Nginx 进程检查
    ((total++))
    check_nginx || ((failed++))

    # 5. 端口检查
    ((total++))
    check_port 443 "HTTPS" || ((failed++))

    # 6. DNS 检查
    ((total++))
    check_dns "7zi.com" || ((failed++))

    echo "========================================"
    echo "检查完成: $((total - failed))/$total 通过"
    echo "========================================"
    echo ""

    if [[ $failed -gt 0 ]]; then
        log_error "健康检查失败: $failed/$total"
        return 1
    else
        log_ok "所有检查通过"
        return 0
    fi
}

# ------------------------------------
# 安装 Cron 任务
# ------------------------------------
install_cron() {
    log_info "安装健康检查 Cron 任务..."

    # 每 5 分钟执行一次
    local cron_entry="*/5 * * * * root /bin/bash $SCRIPT_DIR/health-check.sh >> $LOG_FILE 2>&1"

    sudo tee "/etc/cron.d/health-check" > /dev/null << EOF
# 健康检查定时任务
# 每 5 分钟检查一次服务健康状态
*/5 * * * * root /bin/bash $SCRIPT_DIR/health-check.sh >> $LOG_FILE 2>&1

# 每小时发送一次详细报告 (如果 NOTIFY=true)
# 0 * * * * root NOTIFY=true /bin/bash $SCRIPT_DIR/health-check.sh >> $LOG_FILE 2>&1
EOF

    sudo chmod 644 "/etc/cron.d/health-check"
    log_ok "健康检查 Cron 任务已安装 (每 5 分钟执行)"
}

# ------------------------------------
# 显示帮助
# ------------------------------------
show_help() {
    cat << EOF
健康检查脚本

用法: $0 [选项]

选项:
    check       执行健康检查 (默认)
    install     安装 Cron 定时任务
    notify      执行检查并发送通知
    verbose     详细输出模式
    help        显示帮助

环境变量:
    LOG_DIR              日志目录
    HEALTH_CHECK_URL     健康检查 URL
    NOTIFY_EMAIL         通知邮箱
    SLACK_WEBHOOK        Slack Webhook URL
    TELEGRAM_BOT_TOKEN   Telegram Bot Token
    TELEGRAM_CHAT_ID     Telegram Chat ID

示例:
    $0 check                    # 执行检查
    $0 install                  # 安装定时任务
    NOTIFY=true $0 notify       # 发送通知
EOF
}

# ------------------------------------
# 主函数
# ------------------------------------
main() {
    init

    local command="check"
    [[ $# -gt 0 ]] && command="$1" && shift || true

    case "$command" in
        check)
            do_health_check
            ;;
        install)
            install_cron
            ;;
        notify)
            NOTIFY=true
            do_health_check
            ;;
        verbose|-v)
            VERBOSE=true
            do_health_check
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            return 1
            ;;
    esac
}

# 直接运行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
