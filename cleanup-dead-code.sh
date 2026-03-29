#!/bin/bash

# 死代码清理脚本
# 执行前请先查看报告：DEAD_CODE_CLEANUP_20260329.md

set -e

echo "=== 死代码清理脚本 ==="
echo ""
echo "⚠️  警告：此脚本将删除文件，请确保已阅读分析报告！"
echo ""
read -p "确认执行清理？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "已取消清理"
  exit 0
fi

# 备份目录
BACKUP_DIR=".backup_removed_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📦 创建备份目录: $BACKUP_DIR"
echo ""

# 第一阶段：删除明确未使用的工具和辅助模块
echo "=== 第一阶段：删除未使用的工具模块 ==="

phase1_files=(
  "src/lib/db/nplus1-detector.ts"
  "src/lib/db/slow-query-logger.ts"
  "src/lib/db/performance-logger.ts"
  "src/lib/db/index-analyzer.ts"
  "src/lib/timing.ts"
  "src/lib/theme-script-inline.ts"
  "src/lib/lcp-optimization.ts"
  "src/lib/csv-export.ts"
  "src/lib/theme-enhanced.ts"
  "src/lib/date-i18n.ts"
  "src/lib/server-init.ts"
)

for file in "${phase1_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  移动: $file"
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    mv "$file" "$BACKUP_DIR/$file"
  fi
done

echo ""

# 第二阶段：删除未集成的功能模块
echo "=== 第二阶段：删除未集成的功能模块 ==="

phase2_files=(
  "src/lib/rate-limit/event-logger.ts"
  "src/lib/rate-limit/memory-store.ts"
  "src/lib/rate-limit/token-bucket.ts"
  "src/lib/rate-limit/sliding-window.ts"
  "src/lib/rate-limit/config.ts"
  "src/lib/rate-limit/storage-factory.ts"
  "src/lib/realtime/useWebSocket.ts"
  "src/lib/realtime/notification-hooks.ts"
  "src/lib/realtime/retry-manager.ts"
  "src/lib/realtime/notification-service.ts"
)

for file in "${phase2_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  移动: $file"
    mkdir -p "$BACKUP_DIR/$(dirname "$file")"
    mv "$file" "$BACKUP_DIR/$file"
  fi
done

echo ""
echo "✅ 清理完成！"
echo ""
echo "📊 统计:"
echo "  - 已移动文件: $(find "$BACKUP_DIR" -type f | wc -l)"
echo "  - 备份位置: $BACKUP_DIR"
echo ""
echo "💡 提示：如果一切正常，可以删除备份目录："
echo "   rm -rf $BACKUP_DIR"
echo ""
echo "⚠️  如果出现问题，可以从备份恢复："
echo "   cp -r $BACKUP_DIR/* ./"
