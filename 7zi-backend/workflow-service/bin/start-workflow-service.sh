#!/bin/bash
#
# Start Workflow Service
# Usage: ./bin/start-workflow-service.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"

cd "$SERVICE_DIR"

# Load environment if .env exists
if [ -f .env ]; then
    echo "Loading environment from .env..."
    set -a
    source .env
    set +a
fi

# Default port
PORT="${PORT:-3001}"

echo "Starting Workflow Service..."
echo "  Port: $PORT"
echo "  Node environment: ${NODE_ENV:-development}"
echo "  Log level: ${LOG_LEVEL:-info}"

exec node src/index.js
