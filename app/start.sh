#!/bin/bash

# AI 团队看板 - 快速启动脚本

set -e

echo "🤖 AI 团队看板 - 安装和启动"
echo "================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js"
    echo "请先安装 Node.js 18+: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本：$(node -v)"

# 进入 app 目录
cd "$(dirname "$0")"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

# 检查环境变量
if [ ! -f .env.local ]; then
    echo ""
    echo "⚠️  未找到 .env.local 文件"
    echo "正在从 .env.example 创建..."
    cp .env.example .env.local
    echo ""
    echo "📝 请编辑 .env.local 并配置："
    echo "   - NEXT_PUBLIC_GITHUB_OWNER"
    echo "   - NEXT_PUBLIC_GITHUB_REPO"
    echo "   - NEXT_PUBLIC_GITHUB_TOKEN (可选)"
    echo ""
    read -p "按回车继续启动（使用默认配置）..."
fi

# 启动开发服务器
echo ""
echo "🚀 启动开发服务器..."
echo "访问地址：http://localhost:3000"
echo "看板地址：http://localhost:3000/dashboard"
echo ""

npm run dev
