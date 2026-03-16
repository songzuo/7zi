#!/bin/bash
# GitHub 记忆文件自动上传脚本
# 机器名称: bot
# 仓库: https://github.com/songzuo/botmem

MACHINE_NAME="bot"
GITHUB_TOKEN="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"
REPO="https://songzuo:${GITHUB_TOKEN}@github.com/songzuo/botmem.git"
WORKSPACE="/root/.openclaw/workspace"
TEMP_DIR="/tmp/botmem_upload"

# 记忆文件目录
MEMORY_DIR="${WORKSPACE}/memory"
MEMORY_FILE="${WORKSPACE}/MEMORY.md"

# 常规文件列表
STATIC_FILES=(
    "AGENTS.md"
    "SOUL.md"
    "IDENTITY.md"
    "USER.md"
    "HEARTBEAT.md"
    "TOOLS.md"
)

echo "========== $(date) 开始上传记忆文件 =========="

# 清理并创建临时目录
rm -rf "${TEMP_DIR}"
mkdir -p "${TEMP_DIR}/static"
mkdir -p "${TEMP_DIR}/memory"

# 复制常规文件
for file in "${STATIC_FILES[@]}"; do
    if [ -f "${WORKSPACE}/${file}" ]; then
        cp "${WORKSPACE}/${file}" "${TEMP_DIR}/static/"
        echo "已复制: ${file}"
    fi
done

# 复制记忆文件（如果存在）
if [ -f "${MEMORY_FILE}" ]; then
    cp "${MEMORY_FILE}" "${TEMP_DIR}/memory/"
    echo "已复制: MEMORY.md"
fi

if [ -d "${MEMORY_DIR}" ]; then
    cp -r "${MEMORY_DIR}"/* "${TEMP_DIR}/memory/" 2>/dev/null
    echo "已复制: memory/ 目录"
fi

# 添加机器标识文件
echo "Machine: ${MACHINE_NAME}" > "${TEMP_DIR}/machine_info.txt"
echo "Last upload: $(date -Iseconds)" >> "${TEMP_DIR}/machine_info.txt"

# 初始化git仓库
cd "${TEMP_DIR}"
git init
git config user.email "cluster@openclaw.ai"
git config user.name "OpenClaw Cluster"

# 添加所有文件
git add .

# 提交
git commit -m "Upload from ${MACHINE_NAME} - $(date)"

# 推送到GitHub
git remote add origin ${REPO} 2>/dev/null || git remote set-url origin ${REPO}
git branch -M main
git push -u origin main --force

echo "========== $(date) 上传完成 =========="
