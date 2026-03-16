#!/bin/bash
# sync-from-slave.sh - 从节点同步脚本
# 部署位置：bot, bot2 (从同步节点)
# 功能：从 bot3 或 bot4 通过 SSH 获取最新数据，更新本机 memory/ 目录

set -e

# ==================== 配置区 ====================

# 同步节点配置 (主备)
PRIMARY_SYNC_NODE="bot3.szspd.cn"
BACKUP_SYNC_NODE="bot4.szspd.cn"

# 目录配置
WORK_DIR="/tmp/botmem-slave-sync"
MEMORY_DIR="/root/.openclaw/workspace/memory"
BACKUP_DIR="/root/.openclaw/workspace/memory.backup"
LOG_FILE="/var/log/botmem-slave-sync.log"

# SSH 配置
SSH_TIMEOUT=30
SSH_OPTS="-o ConnectTimeout=$SSH_TIMEOUT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o PasswordAuthentication=yes"
SSH_PASS="ge2099334\$ZZ"

# 当前主机
CURRENT_HOST=$(hostname -f 2>/dev/null || hostname)
MACHINE_NAME=${CURRENT_HOST%%.*}

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

# 检查与同步节点的连接
check_sync_node() {
    local node="$1"
    log_info "检查与 $node 的连接..."
    
    if sshpass -p "$SSH_PASS" ssh $SSH_OPTS root@$node "echo 'connected'" 2>&1; then
        log_info "✅ 与 $node 连接成功"
        return 0
    else
        log_warn "❌ 与 $node 连接失败"
        return 1
    fi
}

# 选择可用的同步节点
select_sync_node() {
    log_info "选择可用的同步节点..."
    
    # 尝试主节点
    if check_sync_node "$PRIMARY_SYNC_NODE"; then
        echo "$PRIMARY_SYNC_NODE"
        return 0
    fi
    
    # 尝试备用节点
    if check_sync_node "$BACKUP_SYNC_NODE"; then
        echo "$BACKUP_SYNC_NODE"
        return 0
    fi
    
    log_error "❌ 所有同步节点都不可用"
    return 1
}

# 备份现有数据
backup_local_data() {
    log_info "备份现有数据..."
    
    if [ -d "$MEMORY_DIR" ]; then
        rm -rf "$BACKUP_DIR"
        cp -r "$MEMORY_DIR" "$BACKUP_DIR"
        log_info "✅ 备份完成：$BACKUP_DIR"
    else
        log_warn "MEMORY_DIR 不存在，跳过备份"
        # 创建空目录
        mkdir -p "$MEMORY_DIR"
    fi
}

# 从同步节点获取数据
sync_from_node() {
    local sync_node="$1"
    log_info "从 $sync_node 同步数据..."
    
    # 清理工作目录
    rm -rf "$WORK_DIR"
    mkdir -p "$WORK_DIR"
    
    # 通过 SSH + tar 传输数据
    log_info "下载 botmem 数据..."
    
    # 先检查远程目录是否存在
    if ! sshpass -p "$SSH_PASS" ssh $SSH_OPTS root@$sync_node "test -d /tmp/botmem-sync/botmem && echo 'exists'"; then
        log_error "远程目录 /tmp/botmem-sync/botmem 不存在"
        return 1
    fi
    
    # 使用 tar 传输
    sshpass -p "$SSH_PASS" ssh $SSH_OPTS root@$sync_node \
        "tar czf - -C /tmp/botmem-sync/botmem ." 2>/dev/null | \
        tar xzf - -C "$WORK_DIR" 2>&1
    
    local tar_result=$?
    
    if [ $tar_result -eq 0 ] && [ -d "$WORK_DIR" ]; then
        log_info "✅ 数据下载完成"
        ls -la "$WORK_DIR" | tee -a "$LOG_FILE"
        return 0
    else
        log_error "❌ 数据下载失败 (exit code: $tar_result)"
        return 1
    fi
}

# 合并数据到本地
merge_to_local() {
    log_info "合并数据到本地..."
    
    local source_dir="$WORK_DIR/$MACHINE_NAME"
    
    log_info "查找源目录: $source_dir"
    ls -la "$WORK_DIR/" | tee -a "$LOG_FILE"
    
    if [ -d "$source_dir" ]; then
        # 确保本地目录存在
        mkdir -p "$MEMORY_DIR"
        
        # 复制数据 (保留时间戳)
        log_info "从 $source_dir 复制到 $MEMORY_DIR"
        cp -rv "$source_dir"/* "$MEMORY_DIR/" 2>&1 | tee -a "$LOG_FILE" || true
        
        log_info "✅ 数据合并完成"
        return 0
    else
        log_warn "未找到本机数据目录：$source_dir"
        
        # 尝试从 memory 子目录复制
        if [ -d "$WORK_DIR/memory" ]; then
            cp -rv "$WORK_DIR/memory"/* "$MEMORY_DIR/" 2>&1 | tee -a "$LOG_FILE" || true
            log_info "✅ 从备用目录合并完成"
            return 0
        fi
        
        # 列出所有可用目录
        log_info "工作目录内容:"
        find "$WORK_DIR" -type d | tee -a "$LOG_FILE"
        
        log_error "❌ 无法找到可合并的数据"
        return 1
    fi
}

# 验证数据完整性
verify_data() {
    log_info "验证数据完整性..."
    
    local file_count=$(find "$MEMORY_DIR" -type f -name "*.md" 2>/dev/null | wc -l)
    
    if [ "$file_count" -gt 0 ]; then
        log_info "✅ 验证通过：找到 $file_count 个 markdown 文件"
        return 0
    else
        log_warn "⚠️  验证警告：未找到 markdown 文件"
        return 1
    fi
}

# 清理
cleanup() {
    log_info "清理临时文件..."
    rm -rf "$WORK_DIR"
}

# 回滚
rollback() {
    log_info "执行回滚..."
    
    if [ -d "$BACKUP_DIR" ]; then
        rm -rf "$MEMORY_DIR"
        mv "$BACKUP_DIR" "$MEMORY_DIR"
        log_info "✅ 回滚完成"
    else
        log_warn "⚠️  无备份可回滚"
    fi
}

# 主同步流程
main_sync() {
    log_info "🚀 开始同步流程 (从节点模式)"
    log_info "当前主机：$CURRENT_HOST"
    log_info "机器名：$MACHINE_NAME"
    
    # 选择同步节点
    local selected_node
    selected_node=$(select_sync_node)
    if [ -z "$selected_node" ]; then
        log_error "无法选择同步节点，使用旧数据"
        return 1
    fi
    log_info "使用同步节点：$selected_node"
    
    # 备份现有数据
    backup_local_data
    
    # 从同步节点获取数据
    if ! sync_from_node "$selected_node"; then
        log_error "同步失败"
        rollback
        return 1
    fi
    
    # 合并数据
    if ! merge_to_local; then
        log_error "数据合并失败"
        rollback
        return 1
    fi
    
    # 验证数据
    if ! verify_data; then
        log_warn "数据验证失败"
    fi
    
    # 清理
    cleanup
    
    log_info "✅ 同步流程完成"
    return 0
}

# 显示帮助
show_help() {
    cat << EOF
用法：$0 [选项]

选项:
  --health      仅执行健康检查
  --rollback    回滚到备份数据
  --help        显示帮助信息
  (无参数)      执行完整同步流程

部署位置：从节点 (bot, bot2)
EOF
}

# ==================== 主程序 ====================

main() {
    # 确保日志目录存在
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    case "${1:-}" in
        --health)
            # 简单健康检查
            if check_sync_node "$PRIMARY_SYNC_NODE" || check_sync_node "$BACKUP_SYNC_NODE"; then
                log_info "✅ 健康检查通过"
                exit 0
            else
                log_error "❌ 健康检查失败"
                exit 1
            fi
            ;;
        --rollback)
            rollback
            ;;
        --help|-h)
            show_help
            ;;
        "")
            main_sync
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
