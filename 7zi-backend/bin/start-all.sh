#!/bin/bash
# 同时启动 WebSocket 和工作流引擎

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

# 加载环境变量
if [ -f "$BACKEND_DIR/.env" ]; then
    export $(cat "$BACKEND_DIR/.env" | grep -v '^#' | xargs)
fi

echo "🚀 Starting all backend services..."

# 使用 concurrently 并行启动
if command -v npx &> /dev/null; then
    npx concurrently \
        "node websocket/websocket-server.js" \
        "node workflow-engine/server.js"
else
    echo "Error: npx not found. Please install Node.js and npm."
    exit 1
fi
