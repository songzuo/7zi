#!/bin/bash
# botmem 上传脚本 - bot6 机器
# 用途: 定时上传记忆文件到 GitHub botmem 仓库
# 规则: 只操作 bot6 目录，不删除，不覆盖其他机器
# 用法: 
#   sync-botmem.sh          # 同步记忆文件 (高频)
#   sync-botmem.sh --full   # 同步所有文件 (低频)
#   sync-botmem.sh --dry-run # 只检查不推送

set -e

# Dry-run 模式
DRY_RUN=false
if [ "$1" = "--dry-run" ]; then
    DRY_RUN=true
    echo "[DRY-RUN] 模式: 只检查不推送"
fi

# 配置 - 使用环境变量存储敏感信息
BOTMEM_REPO="https://${GITHUB_TOKEN}@github.com/songzuo/botmem.git"
MACHINE_NAME="bot6"
WORKSPACE="/root/.openclaw/workspace"
TEMP_DIR="/tmp/botmem-sync"
LOG_FILE="$WORKSPACE/memory/botmem-sync.log"

# 检查环境变量
if [ -z "$GITHUB_TOKEN" ]; then
    echo "错误: GITHUB_TOKEN 环境变量未设置"
    exit 1
fi

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 同步函数
sync_file() {
    local src="$1"
    local dest="$2"
    if [ -f "$src" ]; then
        # 去除敏感信息
        sed -e 's/REDACTED[A-Za-z0-9]*/REDACTED/g' \
            -e 's/RESEND_API_KEY=.*/RESEND_API_KEY=xxx/g' \
            -e 's/SLACK_WEBHOOK_URL=.*/SLACK_WEBHOOK_URL=xxx/g' \
            "$src" > "$dest" 2>/dev/null || cp "$src" "$dest"
        log "  同步: $(basename $src)"
    fi
}

sync_dir() {
    local src="$1"
    local dest="$2"
    if [ -d "$src" ]; then
        mkdir -p "$dest"
        cp -r "$src"/* "$dest/" 2>/dev/null || true
        log "  同步目录: $(basename $src)"
    fi
}

# 清理临时目录
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

log "=== 开始同步 botmem 仓库 ==="

# 克隆仓库
cd "$TEMP_DIR"
git clone "$BOTMEM_REPO" . 2>&1 | while read line; do log "  $line"; done

# 确保 bot6 目录存在
mkdir -p "$MACHINE_NAME"

# 同步记忆文件 (高频 - 每4小时)
log "同步记忆文件 (MEMORY.md, memory/)..."
sync_file "$WORKSPACE/MEMORY.md" "$MACHINE_NAME/MEMORY.md"
sync_dir "$WORKSPACE/memory" "$MACHINE_NAME/memory"

# 同步常规文件 (低频 - 每天) - 仅在 --full 模式下
if [ "$1" = "--full" ]; then
    log "同步常规文件..."
    for file in AGENTS.md SOUL.md IDENTITY.md USER.md README.md HEARTBEAT.md TOOLS.md; do
        sync_file "$WORKSPACE/$file" "$MACHINE_NAME/$file"
    done
    
    # 同步文档目录
    sync_dir "$WORKSPACE/docs" "$MACHINE_NAME/docs"
    
    # 同步技能目录 (如果有)
    if [ -d "/root/.openclaw/skills" ]; then
        sync_dir "/root/.openclaw/skills" "$MACHINE_NAME/skills"
    fi
fi

# 检查是否有更改
if [ -z "$(git status --porcelain)" ]; then
    log "没有更改需要提交"
else
    if [ "$DRY_RUN" = true ]; then
        log "[DRY-RUN] 检测到以下更改将被提交:"
        git status --short
    else
        # 提交并推送
        git add .
        git commit -m "bot6: 同步记忆文件 $(date '+%Y-%m-%d %H:%M')" || true
        git push origin main 2>&1 | while read line; do log "  $line"; done
        log "✅ 推送完成"
    fi
fi

# 清理
cd /
rm -rf "$TEMP_DIR"

log "=== 同步完成 ==="
