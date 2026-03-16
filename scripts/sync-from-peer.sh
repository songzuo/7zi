#!/bin/bash
# sync-from-peer.sh - GitHub 同步优化脚本 (从节点版本)
# 部署位置：bot, bot2, bot4, bot5, bot6 (从节点)
# 功能：从同步节点获取最新数据，不直接访问 GitHub

set -e

# ==================== 配置区 ====================

# 同步节点配置
SYNC_NODES=(
    "bot3.szspd.cn"
    "bot7.szspd.cn"
)
PRIMARY_SYNC_NODE="bot3.szspd.cn"
BACKUP_SYNC_NODE="bot7.szspd.cn"

# 目录配置
WORK_DIR="/tmp/botmem-sync"
MEMORY_DIR="/root/.openclaw/workspace/memory"
BACKUP_DIR="/root/.openclaw/workspace/memory.backup"
LOG_FILE="/var/log/botmem-sync-from-peer.log"

# SSH 配置
SSH_TIMEOUT=10
SSH_PASS="ge2099334\$ZZ"
SSH_OPTS="-o ConnectTimeout=$SSH_TIMEOUT -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

# 当前主机
CURRENT_HOST=$(hostname -f 2>/dev/null || hostname)

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
    
    if sshpass -p "$SSH_PASS" ssh $SSH_OPTS root@$node "echo 'connected'" 2>/dev/null; then
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
    
    # 尝试列表中的所有节点
    for node in "${SYNC_NODES[@]}"; do
        if check_sync_node "$node"; then
            echo "$node"
            return 0
        fi
    done
    
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
    fi
}

# 从同步节点获取数据
sync_from_node() {
    local sync_node="$1"
    log_info "从 $sync_node 同步数据..."
    
    # 清理工作目录
    rm -rf "$WORK_DIR"
    mkdir -p "$WORK_DIR"
    
    # 通过 SSH + tar 传输数据（使用 sshpass）
    # 从同步节点获取 botmem 目录
    sshpass -p "$SSH_PASS" ssh $SSH_OPTS root@$sync_node \
        "tar czf - -C /tmp/botmem-sync/botmem . 2>/dev/null" | \
        tar xzf - -C "$WORK_DIR" 2>&1 | tee -a "$LOG_FILE"
    
    if [ $? -eq 0 ]; then
        log_info "✅ 数据下载完成"
        return 0
    else
        log_error "❌ 数据下载失败"
        return 1
    fi
}

# 替代方法：通过 rsync 同步
sync_via_rsync() {
    local sync_node="$1"
    log_info "尝试通过 rsync 从 $sync_node 同步..."
    
    # 清理工作目录
    rm -rf "$WORK_DIR"
    mkdir -p "$WORK_DIR"
    
    # 使用 rsync (如果可用)
    if command -v rsync &> /dev/null; then
        rsync -avz -e "sshpass -p '$SSH_PASS' ssh $SSH_OPTS" \
            root@$sync_node:/tmp/botmem-sync/botmem/ "$WORK_DIR/" \
            2>&1 | tee -a "$LOG_FILE"
        
        if [ $? -eq 0 ]; then
            log_info "✅ rsync 同步完成"
            return 0
        fi
    fi
    
    log_warn "rsync 不可用或失败"
    return 1
}

# 合并数据到本地
merge_to_local() {
    log_info "合并数据到本地..."
    
    local machine_name=${CURRENT_HOST%%.*}
    local source_dir="$WORK_DIR/$machine_name"
    
    if [ -d "$source_dir" ]; then
        # 确保本地目录存在
        mkdir -p "$MEMORY_DIR"
        
        # 复制数据 (保留时间戳)
        cp -rv "$source_dir"/* "$MEMORY_DIR/" 2>&1 | tee -a "$LOG_FILE" || true
        
        log_info "✅ 数据合并完成"
        return 0
    else
        log_warn "未找到本机数据目录：$source_dir"
        
        # 尝试从根目录复制所有文件
        if [ -d "$WORK_DIR/memory" ]; then
            cp -rv "$WORK_DIR/memory"/* "$MEMORY_DIR/" 2>&1 | tee -a "$LOG_FILE" || true
            log_info "✅ 从备用目录合并完成"
            return 0
        fi
        
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

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查 SSH
    if ! command -v ssh &> /dev/null; then
        log_error "SSH 客户端未安装"
        return 1
    fi
    
    # 检查至少一个同步节点可达（使用 sshpass）
    local node_found=false
    for node in "${SYNC_NODES[@]}"; do
        if sshpass -p "$SSH_PASS" ssh $SSH_OPTS root@$node "echo test" &>/dev/null; then
            node_found=true
            break
        fi
    done
    
    if [ "$node_found" = false ]; then
        log_error "所有同步节点都不可达"
        return 1
    fi
    
    log_info "✅ 健康检查通过"
    return 0
}

# 主同步流程
main_sync() {
    log_info "🚀 开始同步流程 (从节点模式)"
    log_info "当前主机：$CURRENT_HOST"
    
    # 健康检查
    if ! health_check; then
        log_error "健康检查失败，使用旧数据"
        return 1
    fi
    
    # 选择同步节点
    local selected_node
    selected_node=$(select_sync_node)
    if [ -z "$selected_node" ]; then
        log_error "无法选择同步节点"
        return 1
    fi
    log_info "使用同步节点：$selected_node"
    
    # 备份现有数据
    backup_local_data
    
    # 从同步节点获取数据
    if ! sync_from_node "$selected_node"; then
        log_warn "主同步方法失败，尝试 rsync..."
        if ! sync_via_rsync "$selected_node"; then
            log_error "所有同步方法都失败"
            rollback
            return 1
        fi
    fi
    
    # 合并数据
    if ! merge_to_local; then
        log_error "数据合并失败"
        rollback
        return 1
    fi
    
    # 验证数据
    if ! verify_data; then
        log_warn "数据验证失败，考虑回滚"
        # 不立即回滚，让用户决定
    fi
    
    # 清理
    cleanup
    
    log_info "✅ 同步流程完成"
    return 0
}

# Dry-run 模式
dry_run() {
    log_info "🔍 预览模式 (不执行实际操作)"
    log_info "当前主机：$CURRENT_HOST"
    log_info "角色：从节点"
    log_info ""
    log_info "将执行的操作:"
    log_info "  1. 检查与同步节点的连接"
    log_info "  2. 选择可用的同步节点"
    log_info "  3. 备份现有数据"
    log_info "  4. 从同步节点获取数据"
    log_info "  5. 合并到本地 memory 目录"
    log_info "  6. 验证数据完整性"
    log_info ""
    log_info "同步节点列表:"
    for node in "${SYNC_NODES[@]}"; do
        log_info "  - $node"
    done
}

# 显示帮助
show_help() {
    cat << EOF
用法：$0 [选项]

选项:
  --dry-run     预览模式，不执行实际操作
  --health      仅执行健康检查
  --rollback    回滚到备份数据
  --help        显示帮助信息
  --triggered   被触发执行 (从同步节点通知)
  (无参数)      执行完整同步流程

示例:
  $0                    # 执行完整同步
  $0 --dry-run          # 预览模式
  $0 --health           # 健康检查
  $0 --rollback         # 回滚

部署位置：从节点 (bot, bot2, bot4, bot5, bot6)
EOF
}

# ==================== 主程序 ====================

main() {
    # 确保日志目录存在
    mkdir -p "$(dirname "$LOG_FILE")"
    touch "$LOG_FILE"
    
    case "${1:-}" in
        --dry-run)
            dry_run
            ;;
        --health)
            health_check
            ;;
        --rollback)
            rollback
            ;;
        --help|-h)
            show_help
            ;;
        --triggered)
            # 被同步节点触发执行
            log_info "被同步节点触发执行..."
            main_sync
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
