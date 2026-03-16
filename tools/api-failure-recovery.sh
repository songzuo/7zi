#!/bin/bash
# API端点限流故障响应机制 - 自动切换脚本
# 用于与任务调度器集成，实现自动故障响应

# 设置执行路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PYTHON_SCRIPT="$SCRIPT_DIR/api-failure-recovery.py"
CONFIG_PATH="/root/.openclaw/openclaw.json"

# 检查Python脚本是否存在
if [ ! -f "$PYTHON_SCRIPT" ]; then
    echo "❌ Python脚本不存在: $PYTHON_SCRIPT"
    exit 1
fi

# 检查配置文件是否存在
if [ ! -f "$CONFIG_PATH" ]; then
    echo "❌ 配置文件不存在: $CONFIG_PATH"
    exit 1
fi

# 检查是否有正在运行的恢复进程
PID_FILE="/tmp/api-failure-recovery.pid"
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE" 2>/dev/null)
    if [ -n "$PID" ] && kill -0 $PID 2>/dev/null; then
        echo "⚠️  恢复进程正在运行 (PID: $PID)"
        exit 0
    else
        echo "清理无效的PID文件"
        rm -f "$PID_FILE"
    fi
fi

# 记录脚本执行信息
echo "PID: $$" > "$PID_FILE"

# 执行时间戳
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
LOG_FILE="$SCRIPT_DIR/logs/api-failure-recovery.log"

# 确保日志目录存在
mkdir -p "$(dirname "$LOG_FILE")"

# 输出执行信息
echo "=== $TIMESTAMP - API故障响应机制启动 ===" >> "$LOG_FILE"
echo "脚本路径: $PYTHON_SCRIPT" >> "$LOG_FILE"
echo "配置路径: $CONFIG_PATH" >> "$LOG_FILE"

# 检查是否有需要处理的限流错误
# 首先检查OpenClaw的日志文件是否存在限流模式
LOG_PATTERNS=("server_busy" "rate.*limit" "quota.*exceeded" "insufficient.*quota" "429.*too.*many.*requests")
LOG_LOCATIONS=("/root/.openclaw/agents/main/sessions/*.jsonl" "/root/.openclaw/agents/main/evomap*.log" "/tmp/evomap-auto.log" "/tmp/evolver*.log")

DETECTED_ERROR=""

for pattern in "${LOG_PATTERNS[@]}"; do
    for log_loc in "${LOG_LOCATIONS[@]}"; do
        if ls $log_loc 2>/dev/null; then
            if grep -q -i "$pattern" $log_loc 2>/dev/null; then
                DETECTED_ERROR="$pattern"
                echo "✅ 检测到限流错误模式: $DETECTED_ERROR" >> "$LOG_FILE"
                echo "   来源: $log_loc" >> "$LOG_FILE"
                break 2
            fi
        fi
    done
done

if [ -z "$DETECTED_ERROR" ]; then
    echo "❌ 未检测到限流错误模式" >> "$LOG_FILE"
    echo "=== $TIMESTAMP - API故障响应机制结束 ===" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 0
fi

# 执行API故障响应机制
echo "开始处理限流错误: $DETECTED_ERROR" >> "$LOG_FILE"

# 执行Python恢复脚本
if command -v python3 &>/dev/null; then
    echo "使用python3执行恢复脚本" >> "$LOG_FILE"
    if python3 "$PYTHON_SCRIPT" --auto-recovery --error "$DETECTED_ERROR" >> "$LOG_FILE" 2>&1; then
        echo "✅ 恢复脚本执行成功" >> "$LOG_FILE"
        
        # 更新任务调度器状态
        if command -v python3 &>/dev/null; then
            if [ -f "/root/.openclaw/workspace/tools/task_scheduler.py" ]; then
                echo "更新任务调度器状态" >> "$LOG_FILE"
                python3 "/root/.openclaw/workspace/tools/task_scheduler.py" complete model-failure-recovery "API故障响应机制已成功处理 $DETECTED_ERROR 错误，自动切换到下一个可用的API端点" 2>> "$LOG_FILE"
            fi
        fi
        
    else
        echo "❌ 恢复脚本执行失败" >> "$LOG_FILE"
        
        # 更新任务调度器状态
        if command -v python3 &>/dev/null; then
            if [ -f "/root/.openclaw/workspace/tools/task_scheduler.py" ]; then
                python3 "/root/.openclaw/workspace/tools/task_scheduler.py" suspend model-failure-recovery "API故障响应机制执行失败，需要手动检查" 2>> "$LOG_FILE"
            fi
        fi
    fi
else
    echo "❌ 未找到python3命令" >> "$LOG_FILE"
    
    # 更新任务调度器状态
    if command -v python3 &>/dev/null; then
        if [ -f "/root/.openclaw/workspace/tools/task_scheduler.py" ]; then
            python3 "/root/.openclaw/workspace/tools/task_scheduler.py" suspend model-failure-recovery "未找到python3命令，无法执行API故障响应机制" 2>> "$LOG_FILE"
        fi
    fi
fi

# 清理
echo "=== $TIMESTAMP - API故障响应机制结束 ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
rm -f "$PID_FILE"

exit 0
