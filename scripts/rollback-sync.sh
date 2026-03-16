#!/bin/bash
# rollback-sync.sh - GitHub 同步优化回滚脚本
# 部署位置：所有 7 台机器
# 功能：回滚到优化前的同步配置

set -e

# ==================== 配置区 ====================

BACKUP_DIR="/root/.openclaw/cron/backup"
CRON_BACKUP_PREFIX="crontab.backup"
SYNC_SCRIPT_BACKUP="claw-mesh-sync.sh.backup"
LOG_FILE="/var/log/botmem-sync-rollback.log"

# 原有同步脚本内容 (用于重建)
ORIGINAL_SYNC_SCRIPT='#!/bin/bash
# claw-mesh-sync.sh - 原始 GitHub 同步脚本
# 此脚本由回滚过程重建

set -e

GIT_TOKEN="${GIT_TOKEN:-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}"
REPO="https://${GIT_TOKEN}@github.com/songzuo/botmem.git"
WORK_DIR="/tmp/botmem-sync"

log() {
    echo "[$(date "+%Y-%m-%d %H:%M:%S")] $1"
}

cleanup() {
    rm -rf "$WORK_DIR"
}

main() {
    log "开始同步..."
    cleanup
    mkdir -p "$WORK_DIR"
    cd "$WORK_DIR"
    
    if [ -d "botmem/.git" ]; then
        cd botmem
        git fetch origin && git pull origin main --rebase
    else
        git clone "$REPO" botmem
    fi
    
    machine_name=$(hostname)
    mkdir -p "botmem/$machine_name"
    cp -r /root/.openclaw/workspace/memory/* "botmem/$machine_name/" 2>/dev/null || true
    
    cd botmem
    git add -A
    if ! git diff --staged --quiet; then
        git commit -m "$machine_name: 同步 $(date "+%Y-%m-%d %H:%M")"
        git push origin main
        log "✅ 同步完成"
    else
        log "ℹ️  无变化，跳过提交"
    fi
    
    cleanup
    log "✅ 流程完成"
}

main "$@"
'

# ==================== 函数定义 ====================

log() {
    local level="$1"
    shift
    local msg="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $msg" | tee -a "$LOG_FILE"
}

log_info() { log "INFO" "$@"; }
log_warn() { log "WARN" "$@"; }
log_error() { log "ERROR" "$@"; }

# 检查备份是否存在
check_backup() {
    log_info "检查备份文件..."
    
    local cron_backup="$BACKUP_DIR/${CRON_BACKUP_PREFIX}.$(hostname)"
    local script_backup="$BACKUP_DIR/$SYNC_SCRIPT_BACKUP"
    
    if [ -f "$cron_backup" ]; then
        log_info "✅ 找到 cron 备份：$cron_backup"
        return 0
    else
        log_warn "❌ 未找到 cron 备份"
        return 1
    fi
}

# 恢复 cron 配置
restore_cron() {
    log_info "恢复 cron 配置..."
    
    local cron_backup="$BACKUP_DIR/${CRON_BACKUP_PREFIX}.$(hostname)"
    
    if [ -f "$cron_backup" ]; then
        crontab "$cron_backup"
        log_info "✅ cron 配置已恢复"
        log_info "当前 cron 配置:"
        crontab -l | grep -E "sync|mesh" || true
        return 0
    else
        log_error "❌ cron 备份不存在"
        return 1
    fi
}

# 恢复原有同步脚本
restore_sync_script() {
    log_info "恢复原有同步脚本..."
    
    local script_backup="$BACKUP_DIR/$SYNC_SCRIPT_BACKUP"
    local script_target="/root/.openclaw/cron/claw-mesh-sync.sh"
    
    # 尝试从备份恢复
    if [ -f "$script_backup" ]; then
        cp "$script_backup" "$script_target"
        chmod +x "$script_target"
        log_info "✅ 从备份恢复同步脚本"
        return 0
    fi
    
    # 如果没有备份，重建原始脚本
    log_warn "未找到脚本备份，重建原始脚本..."
    mkdir -p "$(dirname "$script_target")"
    echo "$ORIGINAL_SYNC_SCRIPT" > "$script_target"
    chmod +x "$script_target"
    log_info "✅ 重建同步脚本"
    return 0
}

# 删除优化脚本
remove_optimized_scripts() {
    log_info "删除优化脚本..."
    
    local scripts=(
        "/root/.openclaw/workspace/scripts/sync-optimized.sh"
        "/root/.openclaw/workspace/scripts/sync-from-peer.sh"
        "/root/.openclaw/workspace/temp/optimization-scripts/sync-optimized.sh"
        "/root/.openclaw/workspace/temp/optimization-scripts/sync-from-peer.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [ -f "$script" ]; then
            rm -f "$script"
            log_info "已删除：$script"
        fi
    done
}

# 重启相关服务
restart_services() {
    log_info "重启相关服务..."
    
    # 尝试重启 claw-mesh 服务
    if systemctl is-active --quiet claw-mesh 2>/dev/null; then
        systemctl restart claw-mesh
        log_info "✅ claw-mesh 服务已重启"
    else
        log_warn "claw-mesh 服务未运行或不存在"
    fi
    
    # 重启 crond
    if systemctl is-active --quiet crond 2>/dev/null; then
        systemctl restart crond
        log_info "✅ crond 服务已重启"
    elif systemctl is-active --quiet cron 2>/dev/null; then
        systemctl restart cron
        log_info "✅ cron 服务已重启"
    fi
}

# 验证回滚
verify_rollback() {
    log_info "验证回滚..."
    
    local success=true
    
    # 检查 cron 配置
    if crontab -l 2>/dev/null | grep -q "claw-mesh-sync.sh"; then
        log_info "✅ cron 配置包含 claw-mesh-sync.sh"
    else
        log_warn "⚠️  cron 配置可能不完整"
        success=false
    fi
    
    # 检查同步脚本
    if [ -x "/root/.openclaw/cron/claw-mesh-sync.sh" ]; then
        log_info "✅ 同步脚本存在且可执行"
    else
        log_warn "⚠️  同步脚本可能不存在"
        success=false
    fi
    
    # 检查优化脚本是否已删除
    if [ ! -f "/root/.openclaw/workspace/scripts/sync-optimized.sh" ]; then
        log_info "✅ 优化脚本已删除"
    else
        log_warn "⚠️  优化脚本可能仍然存在"
    fi
    
    if [ "$success" = true ]; then
        log_info "✅ 回滚验证通过"
        return 0
    else
        log_warn "⚠️  回滚验证部分失败，请手动检查"
        return 1
    fi
}

# 显示回滚前状态
show_current_state() {
    log_info "=== 当前状态 ==="
    
    log_info "当前 cron 配置:"
    crontab -l 2>/dev/null | grep -E "sync|mesh" || log_info "(无相关配置)"
    
    log_info ""
    log_info "同步脚本状态:"
    ls -la /root/.openclaw/cron/claw-mesh-sync.sh 2>/dev/null || log_info "(不存在)"
    
    log_info ""
    log_info "备份文件:"
    ls -la "$BACKUP_DIR"/ 2>/dev/null || log_info "(无备份)"
}

# 显示帮助
show_help() {
    cat << EOF
用法：$0 [选项]

选项:
  --dry-run     预览回滚操作，不执行实际更改
  --state       显示当前状态
  --verify      仅验证回滚状态
  --help        显示帮助信息
  (无参数)      执行完整回滚

警告：回滚将恢复优化前的同步配置，所有机器将重新
      独立同步到 GitHub，API 调用将恢复到每天 42 次。

示例:
  $0              # 执行完整回滚
  $0 --dry-run    # 预览回滚
  $0 --state      # 显示当前状态
EOF
}

# Dry-run 模式
dry_run() {
    log_info "🔍 预览回滚操作 (不执行实际更改)"
    log_info ""
    log_info "将执行的操作:"
    log_info "  1. 从 $BACKUP_DIR 恢复 cron 配置"
    log_info "  2. 恢复原有 claw-mesh-sync.sh 脚本"
    log_info "  3. 删除优化脚本 (sync-optimized.sh, sync-from-peer.sh)"
    log_info "  4. 重启相关服务 (claw-mesh, cron)"
    log_info "  5. 验证回滚状态"
    log_info ""
    log_info "回滚后状态:"
    log_info "  - 所有 7 台机器独立同步到 GitHub"
    log_info "  - GitHub API 调用：42 次/天"
    log_info "  - 同步频率：每 4 小时"
}

# ==================== 主程序 ====================

main() {
    # 确保目录存在
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    case "${1:-}" in
        --dry-run)
            dry_run
            ;;
        --state)
            show_current_state
            ;;
        --verify)
            verify_rollback
            ;;
        --help|-h)
            show_help
            ;;
        "")
            log_info "🚀 开始回滚流程"
            show_current_state
            log_info ""
            
            # 执行回滚步骤
            restore_cron || log_warn "cron 恢复失败，继续..."
            restore_sync_script || log_warn "脚本恢复失败，继续..."
            remove_optimized_scripts
            restart_services
            
            log_info ""
            verify_rollback
            
            log_info ""
            log_info "✅ 回滚流程完成"
            log_info "请运行 '$0 --verify' 验证回滚状态"
            ;;
        *)
            log_error "未知选项：$1"
            show_help
            exit 1
            ;;
    esac
}

# 执行
main "$@"
