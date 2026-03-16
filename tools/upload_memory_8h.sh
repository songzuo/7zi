#!/bin/bash
# 记忆文件上传脚本 - 每8小时运行一次
# 安全上传：先pull再push，不覆盖其他机器的文件

MACHINE_NAME="bot"
GITHUB_TOKEN="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"
REPO="https://songzuo:${GITHUB_TOKEN}@github.com/songzuo/botmem.git"
WORKSPACE="/root/.openclaw/workspace"
TEMP_DIR="/tmp/botmem_memory_${MACHINE_NAME}"

MEMORY_FILE="${WORKSPACE}/MEMORY.md"
MEMORY_DIR="${WORKSPACE}/memory"

LOG_FILE="/tmp/memory_upload.log"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') $1" | tee -a "$LOG_FILE"
}

log "========== 开始上传记忆文件 =========="

# 清理临时目录
rm -rf "${TEMP_DIR}"
mkdir -p "${TEMP_DIR}"

cd "${TEMP_DIR}"

# 克隆现有仓库（保留所有机器的文件）
log "克隆仓库..."
git clone ${REPO} repo 2>&1 | tee -a "$LOG_FILE"
cd repo

git config user.email "cluster@openclaw.ai"
git config user.name "OpenClaw Cluster"

# 确保自己的目录存在
mkdir -p "${MACHINE_NAME}/memory"
mkdir -p "${MACHINE_NAME}/static"

# 复制自己的记忆文件到自己的目录
if [ -f "${MEMORY_FILE}" ]; then
    cp "${MEMORY_FILE}" "${MACHINE_NAME}/memory/"
    log "已复制: MEMORY.md"
fi

if [ -d "${MEMORY_DIR}" ] && [ "$(ls -A ${MEMORY_DIR} 2>/dev/null)" ]; then
    cp -r "${MEMORY_DIR}"/* "${MACHINE_NAME}/memory/" 2>/dev/null
    log "已复制: memory/ 目录"
fi

# 更新机器信息
echo "Machine: ${MACHINE_NAME}" > "${MACHINE_NAME}/machine_info.txt"
echo "Last memory upload: $(date -Iseconds)" >> "${MACHINE_NAME}/machine_info.txt"

# Git 提交（只提交自己的目录）
git add "${MACHINE_NAME}/"
git status

if git diff --cached --quiet; then
    log "没有新变化需要提交"
    exit 0
fi

git commit -m "Memory update from ${MACHINE_NAME} - $(date '+%Y-%m-%d %H:%M')" 2>&1 | tee -a "$LOG_FILE"

# 拉取最新变更（可能有其他机器推送了）
log "拉取最新变更..."
git pull --rebase origin main 2>&1 | tee -a "$LOG_FILE"

# 推送到GitHub（不使用force）
log "推送到GitHub..."
git push origin main 2>&1 | tee -a "$LOG_FILE"

log "========== 记忆文件上传完成 =========="