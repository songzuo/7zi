#!/bin/bash
# 启动 WebSocket 服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

# 加载环境变量
if [ -f "$BACKEND_DIR/.env" ]; then
    export $(cat "$BACKEND_DIR/.env" | grep -v '^#' | xargs)
fi

# 默认端口
export PORT="${PORT:-3002}"

echo "🚀 Starting WebSocket server on port $PORT..."

node websocket/websocket-server.js
