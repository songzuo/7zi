#!/bin/bash

# 磁盘空间监控脚本
# 当磁盘使用率超过 75% 时发出警告

THRESHOLD=75
MOUNT_POINT="/"

# 获取当前磁盘使用率
DISK_USAGE=$(df "$MOUNT_POINT" | awk 'NR==2 {gsub("%",""); print $5}')
FREE_SPACE=$(df -h "$MOUNT_POINT" | awk 'NR==2 {print $4}')

# 获取日期时间
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# 检查是否超过阈值
if [ "$DISK_USAGE" -gt "$THRESHOLD" ]; then
    echo "[$DATE] ⚠️  磁盘空间警告！"
    echo "📍 挂载点: $MOUNT_POINT"
    echo "📊 当前使用率: ${DISK_USAGE}%"
    echo "💾 剩余空间: $FREE_SPACE"
    echo "🚨 警告阈值: ${THRESHOLD}%"
    echo ""
    echo "建议操作："
    echo "  1. 清理 Docker: docker system prune -a --volumes -f"
    echo "  2. 清理日志: journalctl --vacuum-size=500M"
    echo "  3. 清理缓存: pnpm store prune && npm cache clean --force"
    echo "  4. 清理临时文件: rm -rf /tmp/*.tar.gz"
    echo ""
    echo "大文件检查 (Top 10):"
    du -ah / --exclude=/proc --exclude=/sys --exclude=/dev 2>/dev/null | sort -rh | head -10
    exit 1
else
    echo "[$DATE] ✅ 磁盘空间正常 - 使用率: ${DISK_USAGE}% (剩余: $FREE_SPACE)"
    exit 0
fi
