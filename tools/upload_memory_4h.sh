#!/bin/bash
# 记忆文件上传脚本 - 每4小时运行一次
# 只操作自己的目录，不删除其他机器的文件

MACHINE_NAME="bot"
GITHUB_TOKEN="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"
REPO="https://songzuo:${GITHUB_TOKEN}@github.com/songzuo/botmem.git"
WORKSPACE="/root/.openclaw/workspace"
TEMP_DIR="/tmp/botmem_memory_${MACHINE_NAME}"
REPO_DIR="${TEMP_DIR}/repo"

MEMORY_FILE="${WORKSPACE}/MEMORY.md"
MEMORY_DIR="${WORKSPACE}/memory"

echo "$(date) ========== 开始上传记忆文件 =========="

# 清理临时目录
rm -rf "${TEMP_DIR}"
mkdir -p "${REPO_DIR}/memory"

# 克隆现有仓库（保留所有机器的文件）
cd "${TEMP_DIR}"
git clone ${REPO} repo 2>/dev/null || {
    # 如果仓库为空，创建新目录结构
    mkdir -p "${REPO_DIR}"
    cd "${REPO_DIR}"
    git init
    git config user.email "cluster@openclaw.ai"
    git config user.name "OpenClaw Cluster"
}

cd "${REPO_DIR}"

# 确保自己的目录存在
mkdir -p "${MACHINE_NAME}/memory"
mkdir -p "${MACHINE_NAME}/static"

# 复制自己的记忆文件到自己的目录
if [ -f "${MEMORY_FILE}" ]; then
    cp "${MEMORY_FILE}" "${MACHINE_NAME}/memory/"
fi

if [ -d "${MEMORY_DIR}" ] && [ "$(ls -A ${MEMORY_DIR} 2>/dev/null)" ]; then
    cp -r "${MEMORY_DIR}"/* "${MACHINE_NAME}/memory/" 2>/dev/null
fi

# 更新机器信息
echo "Machine: ${MACHINE_NAME}" > "${MACHINE_NAME}/machine_info.txt"
echo "Last memory upload: $(date -Iseconds)" >> "${MACHINE_NAME}/machine_info.txt"

# Git 提交（只提交自己的目录）
git add "${MACHINE_NAME}/"
git commit -m "Memory update from ${MACHINE_NAME} - $(date)" 2>/dev/null || {
    echo "$(date): 没有新变化需要提交"
    exit 0
}

# 推送到GitHub
git remote add origin ${REPO} 2>/dev/null || git remote set-url origin ${REPO}
git branch -M main
git push -u origin main --force

echo "$(date) ========== 记忆文件上传完成 =========="
