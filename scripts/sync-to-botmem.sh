#!/bin/bash
# 同步记忆文件到 botmem 仓库
# 使用环境变量 GITHUB_TOKEN，不要硬编码

set -e

WORKSPACE="/root/.openclaw/workspace"
BOTMEM_DIR="$WORKSPACE/botmem"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"

cd "$WORKSPACE"

# 检查 token 是否设置
if [ -z "$GITHUB_TOKEN" ]; then
    echo "错误: GITHUB_TOKEN 环境变量未设置"
    echo "请设置: export GITHUB_TOKEN=your_token"
    exit 1
fi

# 克隆或更新 botmem 仓库
if [ ! -d "botmem" ]; then
    git clone https://x-access-token:$GITHUB_TOKEN@github.com/songzuo/botmem.git botmem
else
    cd botmem && git pull origin main && cd ..
fi

# 同步 memory 目录
if [ -d "$WORKSPACE/memory" ]; then
    cp -r $WORKSPACE/memory/* $BOTMEM_DIR/ 2>/dev/null || true
fi

# 提交并推送
cd $BOTMEM_DIR
git add -A
git commit -m "Sync from 7zi workspace - $(date)" || echo "Nothing to commit"
git push origin main

echo "同步完成"
