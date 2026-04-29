#!/bin/bash
# 同步常规文件到 botmem 仓库
# 用于 cron job: 每天同步常规文件到botmem

set -e

WORKSPACE="/root/.openclaw/workspace"
BOTMEM_DIR="$WORKSPACE/botmem"
LOG_FILE="$WORKSPACE/logs/sync-botmem.log"

# 创建日志目录
mkdir -p "$(dirname "$LOG_FILE")"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

FULL_MODE=false
if [ "$1" == "--full" ]; then
    FULL_MODE=true
fi

log "=========================================="
log "开始同步常规文件到 botmem"
log "模式: $([ "$FULL_MODE" == true ] && echo "完整同步" || echo "增量同步")"
log "=========================================="

cd "$BOTMEM_DIR"

# 检查 git 状态
if ! git status &>/dev/null; then
    log "错误: botmem 目录不是有效的 git 仓库"
    exit 1
fi

# 拉取最新
log "拉取最新变化..."
git fetch origin 2>/dev/null || true
git pull origin main --rebase 2>/dev/null || true

# 要同步的常规文件
FILES_TO_SYNC=(
    "AGENTS.md"
    "SOUL.md"
    "USER.md"
    "TOOLS.md"
    "IDENTITY.md"
    "MEMORY.md"
    "HEARTBEAT.md"
    "README.md"
    "CHANGELOG.md"
)

SYNCED_COUNT=0

for file in "${FILES_TO_SYNC[@]}"; do
    if [ -f "$WORKSPACE/$file" ]; then
        # 检查文件是否有变化
        if ! diff -q "$WORKSPACE/$file" "$BOTMEM_DIR/$file" &>/dev/null; then
            cp "$WORKSPACE/$file" "$BOTMEM_DIR/$file"
            log "已同步: $file"
            SYNCED_COUNT=$((SYNCED_COUNT + 1))
        fi
    fi
done

# 同步 memory 目录
if [ -d "$WORKSPACE/memory" ]; then
    log "同步 memory 目录..."
    rsync -av --delete "$WORKSPACE/memory/" "$BOTMEM_DIR/memory/" 2>/dev/null || {
        cp -r "$WORKSPACE/memory" "$BOTMEM_DIR/memory"
    }
    log "memory 目录已同步"
    SYNCED_COUNT=$((SYNCED_COUNT + 1))
fi

# 如果是完整模式，同步更多文件
if [ "$FULL_MODE" == true ]; then
    log "执行完整同步..."
    
    # 同步 scripts 目录（不包含敏感脚本）
    if [ -d "$WORKSPACE/scripts" ]; then
        for script in "$WORKSPACE/scripts"/*.sh; do
            if [ -f "$script" ]; then
                script_name=$(basename "$script")
                # 跳过敏感脚本
                if [[ "$script_name" != *"passwd"* ]] && [[ "$script_name" != *"secret"* ]] && [[ "$script_name" != *" credential"* ]]; then
                    cp "$script" "$BOTMEM_DIR/scripts/$script_name" 2>/dev/null || true
                fi
            fi
        done
        log "scripts 目录已同步"
    fi
    
    # 同步配置文件
    for config in "$WORKSPACE"/*.json "$WORKSPACE"/*.md; do
        if [ -f "$config" ]; then
            config_name=$(basename "$config")
            # 跳过敏感配置
            if [[ "$config_name" != *".env"* ]] && [[ "$config_name" != *"secret"* ]]; then
                cp "$config" "$BOTMEM_DIR/$config_name" 2>/dev/null || true
            fi
        fi
    done
fi

# 提交并推送
cd "$BOTMEM_DIR"
git add -A

if git diff --staged --quiet; then
    log "没有变化需要提交"
else
    COMMIT_MSG="sync: $(date '+%Y-%m-%d %H:%M') - 同步常规文件"
    if git commit -m "$COMMIT_MSG"; then
        log "已提交: $COMMIT_MSG"
    fi
    
    if git push origin main 2>/dev/null; then
        log "已推送到 GitHub"
    else
        log "推送失败，将在下一次同步时重试"
    fi
fi

log "=========================================="
log "同步完成！已同步 $SYNCED_COUNT 个项目"
log "=========================================="
