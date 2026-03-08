#!/bin/bash
# 记忆文件上传脚本
# 每台机器运行此脚本上传自己的记忆文件到 GitHub

set -e

# 配置
BOT_NAME="bot6"
REPO_URL="https://github.com/songzuo/botmem"
TOKEN="${GITHUB_TOKEN:-}"  # 从环境变量获取，或留空用于公开仓库
WORKSPACE="/root/.openclaw/workspace"
TEMP_DIR="/tmp/botmem-upload-$(date +%s)"
COMMIT_MSG="Update bot6 memory files - $(date '+%Y-%m-%d %H:%M:%S')"

echo "🚀 开始上传 bot6 记忆文件..."

# 1. 克隆仓库（只克隆最新版本，不下载历史）
echo "📦 克隆仓库..."
cd /tmp
rm -rf botmem
git clone --depth 1 https://${TOKEN}@github.com/songzuo/botmem.git 2>&1 | grep -v "^remote:" || true
cd botmem

# 2. 创建 bot6 目录（如果不存在）
mkdir -p "$BOT_NAME"
cd "$BOT_NAME"

# 3. 创建子目录结构
mkdir -p memory
mkdir -p docs
mkdir -p sessions

# 4. 复制记忆文件（MEMORY.md 和 memory/ 目录）
echo "📝 复制记忆文件..."
if [ -f "$WORKSPACE/MEMORY.md" ]; then
  cp "$WORKSPACE/MEMORY.md" .
  echo "✅ MEMORY.md 已复制"
fi

if [ -d "$WORKSPACE/memory" ]; then
  cp -r "$WORKSPACE/memory/"* memory/ 2>/dev/null || true
  echo "✅ memory/ 目录已复制"
fi

# 5. 复制核心配置文件
echo "📋 复制核心文件..."
for file in AGENTS.md SOUL.md IDENTITY.md USER.md README HEARTBEAT.md TOOLS.md; do
  if [ -f "$WORKSPACE/$file" ]; then
    cp "$WORKSPACE/$file" .
    echo "✅ $file 已复制"
  fi
done

# 6. 复制会话文件（如果存在）
if [ -f "$WORKSPACE/sessions.json" ]; then
  cp "$WORKSPACE/sessions.json" sessions/
  echo "✅ sessions.json 已复制"
fi

# 7. 复制文档（如果存在）
if [ -d "$WORKSPACE/docs" ]; then
  cp -r "$WORKSPACE/docs/"* docs/ 2>/dev/null || true
  echo "✅ docs/ 目录已复制"
fi

# 8. 清理敏感信息（移除 token、密码、API keys）
echo "🔒 清理敏感信息..."
find . -type f \( -name "*.md" -o -name "*.json" -o -name "*.ts" -o -name "*.js" \) -exec sed -i \
  -e 's/sk-[A-Za-z0-9_-]*/sk-REDACTED/g' \
  -e 's/ghp_[A-Za-z0-9]*/ghp-REDACTED/g' \
  -e 's/ge20993344\$ZZ/PASSWORD-REDACTED/g' \
  -e 's/p9YWnENBDXuNST6QQxHsPy1GtO2AXn9I/API-KEY-REDACTED/g' \
  {} \; 2>/dev/null || true

# 9. 创建 README（如果不存在）
if [ ! -f "README.md" ]; then
  cat > README.md << EOF
# Bot6 记忆文件

这是 OpenClaw bot6 的记忆和工作空间文件。

## 更新时间
$(date '+%Y-%m-%d %H:%M:%S')

## 目录结构
- MEMORY.md - 长期记忆
- memory/ - 每日记忆文件
- AGENTS.md - 代理配置
- SOUL.md - 核心身份
- IDENTITY.md - 身份标识
- USER.md - 用户信息
- HEARTBEAT.md - 心跳任务
- TOOLS.md - 工具配置
- docs/ - 文档
- sessions/ - 会话记录

## 自动上传
此目录由自动化脚本每4小时上传一次。
EOF
fi

# 10. 提交更改
echo "💾 提交更改..."
cd /tmp/botmem
git config user.name "bot6"
git config user.email "bot6@openclaw.ai"

# 检查是否有更改
if git diff --quiet && git diff --staged --quiet; then
  echo "ℹ️ 没有新的更改需要提交"
else
  git add "$BOT_NAME/"
  git commit -m "$COMMIT_MSG" 2>&1 | head -10
  echo "✅ 更改已提交"
  
  # 11. 推送到 GitHub
  echo "🌐 推送到 GitHub..."
  git push origin main 2>&1 | grep -v "^remote:" | head -10
  echo "✅ 上传完成！"
fi

# 12. 清理临时文件
cd /tmp
rm -rf botmem

echo "🎉 bot6 记忆文件上传完成！"
echo "📍 仓库地址: https://github.com/songzuo/botmem/tree/main/$BOT_NAME"
