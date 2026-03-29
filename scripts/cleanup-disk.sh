#!/bin/bash

# ============================================
# 磁盘清理脚本
# 7zi 项目 - 生产环境维护工具
# ============================================
#
# 功能：
# - 清理 Docker 未使用资源
# - 清理系统日志文件
# - 清理包管理器缓存
# - 安全检查（不删除正在使用的数据）
#
# 使用方式:
#   chmod +x scripts/cleanup-disk.sh
#   ./scripts/cleanup-disk.sh [--dry-run] [--aggressive]
#
# 选项：
#   --dry-run      仅显示将要删除的内容，不实际删除
#   --aggressive   激进清理（包括旧日志和缓存）
#
# 作者: 🛡️ 系统管理员
# 创建日期: 2026-03-29
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
DRY_RUN=false
AGGRESSIVE=false
LOG_FILE="/var/log/cleanup-$(date +%Y%m%d-%H%M%S).log"
MIN_DISK_SPACE_GB=5  # 最小保留空间（GB）

# ============================================
# 工具函数
# ============================================

log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要 root 权限运行"
        exit 1
    fi
}

get_disk_usage() {
    df -BG / | awk 'NR==2 {print $5}' | tr -d '%'
}

get_available_space() {
    df -BG / | awk 'NR==2 {print $4}' | tr -d 'G'
}

confirm_action() {
    local message="$1"
    read -p "$(echo -e ${YELLOW}$message [y/N]: ${NC})" -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 1
    fi
    return 0
}

format_size() {
    local bytes=$1
    if [[ $bytes -ge 1073741824 ]]; then
        echo "$(echo "scale=2; $bytes/1073741824" | bc) GB"
    elif [[ $bytes -ge 1048576 ]]; then
        echo "$(echo "scale=2; $bytes/1048576" | bc) MB"
    elif [[ $bytes -ge 1024 ]]; then
        echo "$(echo "scale=2; $bytes/1024" | bc) KB"
    else
        echo "$bytes bytes"
    fi
}

# ============================================
# 安全检查
# ============================================

check_running_containers() {
    log_info "检查运行中的容器..."
    local running=$(docker ps -q | wc -l)
    if [[ $running -gt 0 ]]; then
        log_info "发现 $running 个运行中的容器"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        log_info "没有运行中的容器"
    fi
}

check_disk_space() {
    local available=$(get_available_space)
    local usage=$(get_disk_usage)
    
    log_info "当前磁盘使用率: ${usage}%"
    log_info "可用空间: ${available} GB"
    
    if [[ $available -lt $MIN_DISK_SPACE_GB ]]; then
        log_warning "警告：可用空间不足 ${MIN_DISK_SPACE_GB} GB"
        return 1
    fi
    return 0
}

# ============================================
# Docker 清理
# ============================================

cleanup_docker_images() {
    log_info "=== 清理 Docker 镜像 ==="
    
    # 显示将要删除的镜像
    local dangling=$(docker images -f "dangling=true" -q | wc -l)
    if [[ $dangling -gt 0 ]]; then
        log_info "发现 $dangling 个悬空镜像"
        if [[ $DRY_RUN == true ]]; then
            docker images -f "dangling=true"
        else
            docker image prune -f
            log_success "已删除 $dangling 个悬空镜像"
        fi
    else
        log_info "没有悬空镜像"
    fi
}

cleanup_docker_containers() {
    log_info "=== 清理已停止的容器 ==="
    
    local stopped=$(docker ps -f "status=exited" -q | wc -l)
    if [[ $stopped -gt 0 ]]; then
        log_info "发现 $stopped 个已停止的容器"
        if [[ $DRY_RUN == true ]]; then
            docker ps -f "status=exited"
        else
            docker container prune -f
            log_success "已删除 $stopped 个已停止的容器"
        fi
    else
        log_info "没有已停止的容器"
    fi
}

cleanup_docker_volumes() {
    log_info "=== 清理未使用的卷 ==="
    
    # 安全检查：列出将要删除的卷
    local unused_volumes=$(docker volume ls -q --filter "dangling=true" | wc -l)
    
    if [[ $unused_volumes -gt 0 ]]; then
        log_info "发现 $unused_volumes 个未使用的卷"
        docker volume ls --filter "dangling=true"
        
        if [[ $DRY_RUN == true ]]; then
            log_info "[DRY-RUN] 将删除以上卷"
        else
            # 不自动删除卷，需要确认
            if confirm_action "是否删除这些未使用的卷？"; then
                docker volume prune -f
                log_success "已删除未使用的卷"
            else
                log_info "跳过卷删除"
            fi
        fi
    else
        log_info "没有未使用的卷"
    fi
}

cleanup_docker_build_cache() {
    log_info "=== 清理 Docker 构建缓存 ==="
    
    if [[ $AGGRESSIVE == true ]]; then
        if [[ $DRY_RUN == true ]]; then
            log_info "[DRY-RUN] 将清理所有构建缓存"
        else
            docker builder prune -a -f
            log_success "已清理所有构建缓存"
        fi
    else
        if [[ $DRY_RUN == true ]]; then
            log_info "[DRY-RUN] 将清理过期的构建缓存"
        else
            docker builder prune -f
            log_success "已清理过期的构建缓存"
        fi
    fi
}

cleanup_docker_system() {
    log_info "=== Docker 系统清理 ==="
    
    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Docker 系统清理预览："
        docker system df
    else
        if [[ $AGGRESSIVE == true ]]; then
            log_warning "激进模式：将删除所有未使用的资源"
            if confirm_action "确认进行激进清理？"; then
                docker system prune -a -f --volumes
                log_success "已完成激进系统清理"
            else
                docker system prune -f
                log_success "已完成标准系统清理"
            fi
        else
            docker system prune -f
            log_success "已完成标准系统清理"
        fi
    fi
}

# ============================================
# 日志清理
# ============================================

cleanup_system_logs() {
    log_info "=== 清理系统日志 ==="
    
    local log_dirs=(
        "/var/log/nginx"
        "/var/log/docker"
        "/opt/7zi-frontend/logs"
    )
    
    for dir in "${log_dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            local old_logs=$(find "$dir" -name "*.log.*" -o -name "*.gz" | wc -l)
            if [[ $old_logs -gt 0 ]]; then
                log_info "在 $dir 发现 $old_logs 个旧日志文件"
                if [[ $DRY_RUN == true ]]; then
                    find "$dir" -name "*.log.*" -ls
                    find "$dir" -name "*.gz" -ls
                else
                    find "$dir" -name "*.log.*" -mtime +7 -delete
                    find "$dir" -name "*.gz" -mtime +14 -delete
                    log_success "已清理 $dir 中的旧日志"
                fi
            fi
        fi
    done
}

cleanup_journal_logs() {
    log_info "=== 清理 systemd journal 日志 ==="
    
    if command -v journalctl &> /dev/null; then
        local journal_size=$(journalctl --disk-usage | awk '{print $1}')
        log_info "当前 journal 日志大小: $journal_size"
        
        if [[ $DRY_RUN == true ]]; then
            log_info "[DRY-RUN] 将清理超过 7 天的 journal 日志"
        else
            journalctl --vacuum-time=7d
            log_success "已清理旧 journal 日志"
        fi
    fi
}

cleanup_docker_logs() {
    log_info "=== 清理 Docker 容器日志 ==="
    
    local containers=$(docker ps -aq)
    for container in $containers; do
        local name=$(docker inspect --format='{{.Name}}' "$container" | sed 's/^///')
        local log_file="/var/lib/docker/containers/$container/$container-json.log"
        
        if [[ -f "$log_file" ]]; then
            local size=$(stat -c%s "$log_file" 2>/dev/null || echo "0")
            if [[ $size -gt 10485760 ]]; then  # > 10MB
                log_info "容器 $name 日志大小: $(format_size $size)"
                if [[ $DRY_RUN == true ]]; then
                    log_info "[DRY-RUN] 将截断日志"
                else
                    truncate -s 0 "$log_file"
                    log_success "已截断容器 $name 的日志"
                fi
            fi
        fi
    done
}

# ============================================
# 包管理器清理
# ============================================

cleanup_apt_cache() {
    log_info "=== 清理 APT 缓存 ==="
    
    if command -v apt-get &> /dev/null; then
        if [[ $DRY_RUN == true ]]; then
            local cache_size=$(du -sh /var/cache/apt/archives 2>/dev/null | cut -f1)
            log_info "[DRY-RUN] APT 缓存大小: $cache_size"
        else
            apt-get clean
            apt-get autoremove -y
            log_success "已清理 APT 缓存"
        fi
    fi
}

cleanup_npm_cache() {
    log_info "=== 清理 NPM 缓存 ==="
    
    if command -v npm &> /dev/null; then
        if [[ $DRY_RUN == true ]]; then
            local cache_size=$(du -sh ~/.npm 2>/dev/null | cut -f1)
            log_info "[DRY-RUN] NPM 缓存大小: $cache_size"
        else
            npm cache clean --force
            log_success "已清理 NPM 缓存"
        fi
    fi
}

# ============================================
# 临时文件清理
# ============================================

cleanup_tmp_files() {
    log_info "=== 清理临时文件 ==="
    
    local tmp_dirs=(
        "/tmp/*"
        "/var/tmp/*"
    )
    
    for pattern in "${tmp_dirs[@]}"; do
        local old_files=$(find $pattern -mtime +7 2>/dev/null | wc -l)
        if [[ $old_files -gt 0 ]]; then
            log_info "发现 $old_files 个超过 7 天的临时文件"
            if [[ $DRY_RUN == true ]]; then
                find $pattern -mtime +7 -ls 2>/dev/null
            else
                find $pattern -mtime +7 -delete 2>/dev/null
                log_success "已清理旧临时文件"
            fi
        fi
    done
}

# ============================================
# 主程序
# ============================================

show_summary() {
    log_info ""
    log_info "========== 清理摘要 =========="
    
    local usage_before=$DISK_USAGE_BEFORE
    local usage_after=$(get_disk_usage)
    local available_before=$AVAILABLE_BEFORE
    local available_after=$(get_available_space)
    
    log_info "清理前磁盘使用率: ${usage_before}%"
    log_info "清理后磁盘使用率: ${usage_after}%"
    log_info "清理前可用空间: ${available_before} GB"
    log_info "清理后可用空间: ${available_after} GB"
    log_info "释放空间: $((available_after - available_before)) GB"
    
    log_info ""
    log_info "日志文件: $LOG_FILE"
}

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                log_info "DRY-RUN 模式：仅显示将要删除的内容"
                shift
                ;;
            --aggressive)
                AGGRESSIVE=true
                log_warning "激进模式：将删除更多内容"
                shift
                ;;
            -h|--help)
                echo "使用方式: $0 [--dry-run] [--aggressive]"
                echo ""
                echo "选项："
                echo "  --dry-run      仅显示将要删除的内容，不实际删除"
                echo "  --aggressive   激进清理（包括旧日志和缓存）"
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                exit 1
                ;;
        esac
    done
}

main() {
    # 初始化日志
    echo "开始磁盘清理: $(date)" > "$LOG_FILE"
    
    # 解析参数
    parse_args "$@"
    
    # 检查权限
    check_root
    
    # 记录清理前状态
    DISK_USAGE_BEFORE=$(get_disk_usage)
    AVAILABLE_BEFORE=$(get_available_space)
    
    log_info "========== 磁盘清理开始 =========="
    log_info "日期: $(date)"
    log_info "模式: $([ "$DRY_RUN" == true ] && echo "DRY-RUN" || echo "执行")"
    
    # 安全检查
    check_disk_space
    check_running_containers
    
    # Docker 清理
    cleanup_docker_images
    cleanup_docker_containers
    cleanup_docker_build_cache
    cleanup_docker_volumes
    
    if [[ $AGGRESSIVE == true ]]; then
        cleanup_docker_system
    fi
    
    # 日志清理
    cleanup_system_logs
    cleanup_journal_logs
    cleanup_docker_logs
    
    # 包管理器清理
    if [[ $AGGRESSIVE == true ]]; then
        cleanup_apt_cache
        cleanup_npm_cache
    fi
    
    # 临时文件清理
    if [[ $AGGRESSIVE == true ]]; then
        cleanup_tmp_files
    fi
    
    # 显示摘要
    show_summary
    
    log_success "磁盘清理完成！"
}

# 执行主程序
main "$@"
