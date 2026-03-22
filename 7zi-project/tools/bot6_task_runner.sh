#!/bin/bash
# Bot6.szspd.cn 自主任务调度脚本
# 定期运行任务调度器，检查并执行待处理任务

set -e

# 配置
SCHEDULER_PATH="/root/.openclaw/workspace/tools/bot6_scheduler.py"
LOG_FILE="/root/.openclaw/workspace/logs/bot6_scheduler.log"
WORKSPACE="/root/.openclaw/workspace"

# 确保目录存在
mkdir -p "$WORKSPACE/logs"

# 执行任务调度
echo "============================================" >> "$LOG_FILE"
echo "$(date '+%Y-%m-%d %H:%M:%S') - 开始任务调度" >> "$LOG_FILE"

cd "$WORKSPACE"

# 检查任务调度器是否存在
if [ ! -f "$SCHEDULER_PATH" ]; then
    echo "❌ 错误：任务调度器文件不存在" >> "$LOG_FILE"
    exit 1
fi

# 检查 Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误：Python 3 未找到" >> "$LOG_FILE"
    exit 1
fi

# 执行任务调度
python3 "$SCHEDULER_PATH" dashboard >> "$LOG_FILE" 2>&1

# 检查是否有待执行的任务
NEXT_TASK=$(python3 "$SCHEDULER_PATH" next-task 2>&1)
if [ -n "$NEXT_TASK" ] && [ "$NEXT_TASK" != "📭 没有待执行的任务" ]; then
    echo "✅ 找到待执行任务：$NEXT_TASK" >> "$LOG_FILE"
    # 自动执行下一个任务
    echo "🚀 自动执行下一个任务..." >> "$LOG_FILE"
    python3 "$SCHEDULER_PATH" next-task >> "$LOG_FILE" 2>&1
else
    echo "📭 没有待执行的任务" >> "$LOG_FILE"
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') - 任务调度完成" >> "$LOG_FILE"

# 清理旧的日志（保留最近 7 天）
find "$WORKSPACE/logs" -name "*.log" -type f -mtime +7 -delete