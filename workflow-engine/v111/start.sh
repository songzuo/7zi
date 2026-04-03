#!/bin/bash

# OpenClaw Workflow Engine v1.11.0 - Quick Start Script

set -e

echo "🚀 Starting OpenClaw Workflow Engine v1.11.0..."
echo ""

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# 检查 Redis 连接
echo "Checking Redis connection..."
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        echo "✅ Redis is running"
    else
        echo "⚠️  Redis is not running. Starting Redis with Docker..."
        docker run -d -p 6379:6379 redis:7-alpine
        sleep 3
    fi
else
    echo "⚠️  redis-cli not found. Assuming Redis is running..."
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
fi

# 构建项目
if [ ! -d "dist" ]; then
    echo ""
    echo "🔨 Building project..."
    npm run build
    echo "✅ Build complete"
fi

# 启动服务
echo ""
echo "🌟 Starting server..."
echo ""

npm start
