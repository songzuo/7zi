#!/bin/bash
# Vercel 部署脚本

set -e

echo "🚀 开始 Vercel 部署..."

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安装，请先运行：npm install -g vercel"
    exit 1
fi

# 检查登录状态
if ! vercel whoami &> /dev/null; then
    echo "⚠️  未登录 Vercel，请先运行：vercel login"
    exit 1
fi

echo "✅ Vercel 已登录：$(vercel whoami)"

# 部署
echo "📦 正在部署..."
vercel --prod

echo "✅ 部署完成!"
