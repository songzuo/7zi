#!/bin/bash
# ============================================
# SSL 证书自动续期脚本
# SSL Certificate Auto-Renewal Script
# ============================================
# 用途：自动检查并续期 SSL 证书
# 支持：Let's Encrypt (acme.sh), 手动证书, Cloudflare Origin CA
# 调度：建议每日凌晨 2:00 执行
# 用法：./ssl-renew.sh [dry-run|force|install-cron]
# ============================================

set -euo pipefail

# ------------------------------------
# 配置
# ------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
LOG_FILE="${LOG_DIR:-/var/log}/ssl-renew.log"
LOG_ROTATE_CONF="/etc/logrotate.d/ssl-renew"
SSL_DIR="/etc/letsencrypt/live/7zi.com"
CERT_FILE="$SSL_DIR/fullchain.pem"
KEY_FILE="$SSL_DIR/privkey.pem"
WEBROOT="/var/www/7zi-frontend"
NGINX_CONF="/etc/nginx/conf.d/7zi-ssl.conf"
HEALTH_CHECK_URL="https://7zi.com/api/health"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-admin@7zi.com}"
DRY_RUN=false
FORCE_RENEW=false

# Let's Encrypt 配置
LE_API="https://acme-v02.api.letsencrypt.org/directory"
STAGING_API="https://acme-staging-v02.api.letsencrypt.org/directory"
USE_STAGING=false

# Cloudflare API (用于 DNS 验证)
CF_API_TOKEN="${CF_API_TOKEN:-}"
CF_API_EMAIL="${CF_API_EMAIL:-}"

# ------------------------------------
# 颜色输出
# ------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
    local level="$1"
    shift
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*"
    echo -e "$msg" | tee -a "$LOG_FILE"
}

log_info()  { log "INFO" "${BLUE}$*${NC}"; }
log_ok()    { log "OK"   "${GREEN}$*${NC}"; }
log_warn()  { log "WARN" "${YELLOW}$*${NC}"; }
log_error() { log "ERROR" "${RED}$*${NC}"; }
log_debug() { [[ "${DEBUG:-0}" == "1" ]] && log "DEBUG" "${CYAN}$*${NC}"; }

# ------------------------------------
# 帮助信息
# ------------------------------------
show_help() {
    cat << EOF
SSL 证书自动续期脚本

用法: $0 [选项]

选项:
    dry-run      测试模式 - 检查证书状态但不续期
    force        强制续期 - 忽略证书有效期检查
    install-cron 安装 cron 定时任务
    check        仅检查证书状态
    status       显示证书详细信息
    help         显示此帮助信息

环境变量:
    LOG_DIR          日志目录 (默认: /var/log)
    NOTIFY_EMAIL     通知邮箱
    CF_API_TOKEN     Cloudflare API Token (DNS 验证)
    USE_STAGING      使用 Staging API (测试模式)

示例:
    $0 dry-run                    # 测试模式
    $0 force                      # 强制续期
    $0 install-cron              # 安装定时任务
    $0 check                      # 检查证书状态
EOF
}

# ------------------------------------
# 依赖检查
# ------------------------------------
check_dependencies() {
    log_info "检查依赖..."

    local missing=()

    # 基础命令
    for cmd in curl openssl date logger; do
        command -v "$cmd" >/dev/null 2>&1 || missing+=("$cmd")
    done

    # 可选但推荐
    command -v logrotate >/dev/null 2>&1 || log_warn "logrotate 未安装"
    command -v systemctl >/dev/null 2>&1 || log_warn "systemctl 未安装"

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "缺少必要依赖: ${missing[*]}"
        return 1
    fi

    log_ok "依赖检查通过"
}

# ------------------------------------
# 初始化
# ------------------------------------
init() {
    # 创建日志目录
    local log_dir="$(dirname "$LOG_FILE")"
    mkdir -p "$log_dir" 2>/dev/null || sudo mkdir -p "$log_dir"
    touch "$LOG_FILE" 2>/dev/null || sudo touch "$LOG_FILE"
    chmod 644 "$LOG_FILE" 2>/dev/null || sudo chmod 644 "$LOG_FILE"
}

# ------------------------------------
# 获取证书信息
# ------------------------------------
get_cert_info() {
    local cert="$1"
    [[ ! -f "$cert" ]] && return 1

    # 提取证书信息
    local subject issuer serial not_before not_after days_left

    subject=$(openssl x509 -in "$cert" -noout -subject 2>/dev/null | sed 's/subject=//')
    issuer=$(openssl x509 -in "$cert" -noout -issuer 2>/dev/null | sed 's/issuer=//')
    serial=$(openssl x509 -in "$cert" -noout -serial 2>/dev/null | sed 's/serial=//')
    not_before=$(openssl x509 -in "$cert" -noout -startdate 2>/dev/null | sed 's/notBefore=//')
    not_after=$(openssl x509 -in "$cert" -noout -enddate 2>/dev/null | sed 's/notAfter=//')

    # 计算剩余天数
    local expire_timestamp=$(date -d "$not_after" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y" "$not_after" +%s 2>/dev/null)
    local now_timestamp=$(date +%s)
    days_left=$(( (expire_timestamp - now_timestamp) / 86400 ))

    echo "$subject|$issuer|$serial|$not_before|$not_after|$days_left"
}

# ------------------------------------
# 检查证书状态
# ------------------------------------
check_cert_status() {
    log_info "检查 SSL 证书状态..."

    if [[ ! -f "$CERT_FILE" ]]; then
        log_error "证书文件不存在: $CERT_FILE"
        return 1
    fi

    local cert_info
    cert_info=$(get_cert_info "$CERT_FILE")

    if [[ -z "$cert_info" ]]; then
        log_error "无法读取证书信息"
        return 1
    fi

    IFS='|' read -r subject issuer serial not_before not_after days_left <<< "$cert_info"

    echo ""
    echo "========================================"
    echo "        SSL 证书状态报告"
    echo "========================================"
    echo "域名:          ${subject#*CN=}"
    echo "颁发者:        ${issuer#*CN=}"
    echo "序列号:        $serial"
    echo "生效时间:      $not_before"
    echo "到期时间:      $not_after"
    echo "剩余天数:      $days_left 天"
    echo "========================================"
    echo ""

    if [[ $days_left -le 0 ]]; then
        log_error "证书已过期!"
        return 2
    elif [[ $days_left -le 7 ]]; then
        log_warn "证书即将在 $days_left 天后过期!"
        return 3
    elif [[ $days_left -le 30 ]]; then
        log_warn "证书将在 $days_left 天后过期"
        return 4
    else
        log_ok "证书状态正常"
        return 0
    fi
}

# ------------------------------------
# 续期证书 (Let's Encrypt - HTTP 验证)
# ------------------------------------
renew_http_challenge() {
    local domain="$1"
    local webroot="${2:-$WEBROOT}"

    log_info "使用 HTTP-01 挑战续期证书 (域名: $domain)..."

    # 检查 acme.sh
    if command -v acme.sh >/dev/null 2>&1; then
        log_info "使用 acme.sh 续期..."
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY-RUN] acme.sh --renew -d $domain --force"
            return 0
        fi

        acme.sh --renew -d "$domain" --force \
            --webroot "$webroot" \
            --log "$LOG_FILE" \
            || { log_error "acme.sh 续期失败"; return 1; }

    # 使用 certbot
    elif command -v certbot >/dev/null 2>&1; then
        log_info "使用 certbot 续期..."
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY-RUN] certbot renew --webroot -w $webroot -d $domain"
            return 0
        fi

        certbot renew --webroot -w "$webroot" -d "$domain" \
            --post-hook "systemctl reload nginx" \
            || { log_error "certbot 续期失败"; return 1; }

    else
        log_error "未找到 acme.sh 或 certbot"
        return 1
    fi

    return 0
}

# ------------------------------------
# 续期证书 (Let's Encrypt - DNS 验证)
# ------------------------------------
renew_dns_challenge() {
    local domain="$1"

    log_info "使用 DNS-01 挑战续期证书 (域名: $domain)..."

    if [[ -z "$CF_API_TOKEN" ]]; then
        log_error "Cloudflare API Token 未设置 (CF_API_TOKEN)"
        return 1
    fi

    # 检查 acme.sh
    if command -v acme.sh >/dev/null 2>&1; then
        log_info "使用 acme.sh DNS API 模式续期..."
        if [[ "$DRY_RUN" == "true" ]]; then
            log_info "[DRY-RUN] acme.sh --renew -d $domain --dns dns_cf --force"
            return 0
        fi

        export CF_Token="$CF_API_TOKEN"
        export CF_AccountEmail="$CF_API_EMAIL"

        acme.sh --renew -d "$domain" --dns dns_cf --force \
            --log "$LOG_FILE" \
            || { log_error "acme.sh DNS 续期失败"; return 1; }
    else
        log_error "acme.sh 未安装，无法使用 DNS 验证"
        return 1
    fi

    return 0
}

# ------------------------------------
# 安装证书到 Nginx
# ------------------------------------
install_cert() {
    local domain="$1"
    local cert_dir="${SSL_DIR:-/etc/letsencrypt/live/$domain}"
    local cert_file="$cert_dir/fullchain.pem"
    local key_file="$cert_dir/privkey.pem"

    log_info "安装证书到 Nginx..."

    if [[ ! -f "$cert_file" ]] || [[ ! -f "$key_file" ]]; then
        log_error "证书文件不存在: $cert_file 或 $key_file"
        return 1
    fi

    # 复制证书
    sudo cp "$cert_file" "/etc/ssl/certs/7zi-com.crt"
    sudo cp "$key_file" "/etc/ssl/private/7zi-com.key"

    # 设置权限
    sudo chmod 644 /etc/ssl/certs/7zi-com.crt
    sudo chmod 600 /etc/ssl/private/7zi-com.key

    # 重新加载 Nginx
    if command -v systemctl >/dev/null 2>&1; then
        sudo systemctl reload nginx
    elif command -v nginx >/dev/null 2>&1; then
        sudo nginx -s reload
    fi

    log_ok "证书安装完成"
}

# ------------------------------------
# 主续期流程
# ------------------------------------
do_renew() {
    local domain="${1:-7zi.com}"
    local renewal_method="${2:-http}"  # http or dns

    log_info "=========================================="
    log_info "开始 SSL 证书续期流程"
    log_info "域名: $domain"
    log_info "验证方式: $renewal_method"
    log_info "=========================================="

    # 检查证书状态
    check_cert_status
    local status=$?

    # 如果证书还有效且不是强制续期，则跳过
    if [[ $status -eq 0 ]] && [[ "$FORCE_RENEW" != "true" ]]; then
        log_ok "证书仍在有效期内，无需续期"
        return 0
    fi

    # 执行续期
    local renew_result=0
    if [[ "$renewal_method" == "dns" ]]; then
        renew_dns_challenge "$domain" || renew_result=$?
    else
        renew_http_challenge "$domain" || renew_result=$?
    fi

    if [[ $renew_result -ne 0 ]]; then
        log_error "证书续期失败"
        return $renew_result
    fi

    # 安装证书
    install_cert "$domain"

    # 验证新证书
    log_info "验证新证书..."
    sleep 2
    if curl -sf --connect-timeout 10 "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
        log_ok "证书验证通过 - 网站正常响应"
    else
        log_warn "健康检查未通过，但证书可能已成功安装"
    fi

    log_ok "SSL 证书续期完成!"
    return 0
}

# ------------------------------------
# 安装 Cron 任务
# ------------------------------------
install_cron() {
    log_info "安装 SSL 续期 Cron 任务..."

    local cron_entry="0 2 * * * root /bin/bash $SCRIPT_DIR/ssl-renew.sh >> $LOG_FILE 2>&1"
    local cron_file="/etc/cron.d/ssl-renew"

    # 创建 cron 配置
    sudo tee "$cron_file" > /dev/null << EOF
# SSL 证书自动续期
# 每天凌晨 2:00 执行
$cron_entry

# 每周一凌晨 3:00 执行强制检查
0 3 * * 1 root /bin/bash $SCRIPT_DIR/ssl-renew.sh force >> $LOG_FILE 2>&1
EOF

    sudo chmod 644 "$cron_file"

    log_ok "Cron 任务已安装:"
    echo "  - 每日 02:00 自动续期检查"
    echo "  - 每周一 03:00 强制续期检查"
}

# ------------------------------------
# 安装 Logrotate
# ------------------------------------
install_logrotate() {
    log_info "安装 Logrotate 配置..."

    local conf_file="$SCRIPT_DIR/logrotate.conf"

    sudo tee "/etc/logrotate.d/ssl-renew" > /dev/null << EOF
$LOG_FILE {
    daily                 # 每日轮转
    missingok             # 忽略文件不存在
    rotate 14             # 保留 14 天
    compress              # 压缩旧日志
    delaycompress         # 延迟压缩
    notifempty            # 空文件不轮转
    create 0644 root root  # 新建文件权限
    sharedscripts         # 多个文件用同一组 postrotate
    postrotate
        # 重新打开日志文件
        [ -f /var/run/nginx.pid ] && kill -USR1 \$(cat /var/run/nginx.pid) 2>/dev/null || true
    endscript
}
EOF

    sudo chmod 644 "/etc/logrotate.d/ssl-renew"
    log_ok "Logrotate 配置已安装"
}

# ------------------------------------
# 健康检查
# ------------------------------------
health_check() {
    log_info "执行健康检查..."

    # 1. 检查网站响应
    if curl -sf --connect-timeout 10 "$HEALTH_CHECK_URL" >/dev/null 2>&1; then
        log_ok "API 健康检查通过"
    else
        log_error "API 健康检查失败"
        return 1
    fi

    # 2. 检查证书有效性
    check_cert_status
    local cert_status=$?

    # 3. 检查证书与网站匹配
    if [[ -f "$CERT_FILE" ]]; then
        local cert_domain=$(openssl x509 -in "$CERT_FILE" -noout -subject 2>/dev/null | grep -o 'CN=[^/]*' | cut -d= -f2)
        if [[ "$cert_domain" == *"7zi"* ]] || [[ "$cert_domain" == *"${HEALTH_CHECK_URL#https://}"* ]]; then
            log_ok "证书域名匹配"
        else
            log_warn "证书域名可能不匹配: $cert_domain"
        fi
    fi

    return $cert_status
}

# ------------------------------------
# 发送通知
# ------------------------------------
send_notification() {
    local subject="$1"
    local message="$2"

    if [[ -n "$NOTIFY_EMAIL" ]]; then
        echo "$message" | mail -s "[7zi] $subject" "$NOTIFY_EMAIL" 2>/dev/null || \
        log_warn "邮件通知发送失败"
    fi
}

# ------------------------------------
# 主函数
# ------------------------------------
main() {
    init
    check_dependencies

    local command="${1:-check}"
    shift || true

    case "$command" in
        dry-run)
            DRY_RUN=true
            log_info "[DRY-RUN 模式]"
            do_renew "$@"
            ;;
        force)
            FORCE_RENEW=true
            do_renew "$@"
            ;;
        install-cron)
            install_cron
            install_logrotate
            log_ok "定时任务安装完成"
            ;;
        check)
            check_cert_status
            ;;
        status)
            check_cert_status
            health_check
            ;;
        health|healthcheck)
            health_check
            ;;
        install-logrotate)
            install_logrotate
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
