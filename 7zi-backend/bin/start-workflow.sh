#!/bin/bash
# 启动工作流引擎服务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

# 加载环境变量
if [ -f "$BACKEND_DIR/.env" ]; then
    export $(cat "$BACKEND_DIR/.env" | grep -v '^#' | xargs)
fi

# Workflow 端口
export PORT="${WF_PORT:-3011}"

echo "🚀 Starting Workflow Engine on port $PORT..."

node workflow-engine/server.js
