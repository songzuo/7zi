#!/bin/sh
# ============================================
# 7zi-frontend 健康检查脚本
# Docker 容器健康检查使用
# ============================================

# 健康检查端点
HEALTH_URL="http://localhost:3000/health"

# 超时时间（秒）
TIMEOUT=5

# 执行健康检查
curl -f -s -o /dev/null --max-time "$TIMEOUT" "$HEALTH_URL" || exit 1
