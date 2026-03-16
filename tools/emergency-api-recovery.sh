#!/bin/bash
# 紧急API故障恢复脚本 - 直接处理API端点切换

# 配置
API_BACKUP_ENDPOINTS=(
    "volcengine/doubao-seed-code"
    "volcengine-2/doubao-seed-code"
    "siliconflow/deepseek-ai/DeepSeek-V3.2"
    "newcli-aws/claude-opus-4-6"
    "qiniu/qwen-turbo"
    "grok/grok-beta"
)

LOG_FILE="/root/.openclaw/workspace/tools/logs/emergency-recovery.log"

# 记录函数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# 检查当前API状态
check_api_status() {
    log "检查当前API状态..."
    
    # 获取当前模型
    current_model=$(openclaw models status --plain 2>/dev/null)
    log "当前API端点: $current_model"
    
    # 测试API调用
    test_result=$(openclaw models list 2>&1)
    if [ $? -eq 0 ]; then
        log "✅ API状态正常"
        return 0
    else
        log "❌ API状态异常: $test_result"
        return 1
    fi
}

# 切换到下一个可用的API端点
switch_api_endpoint() {
    current_model=$(openclaw models status --plain 2>/dev/null)
    
    log "尝试切换API端点..."
    
    for endpoint in "${API_BACKUP_ENDPOINTS[@]}"; do
        if [ "$endpoint" != "$current_model" ]; then
            log "尝试切换到: $endpoint"
            
            # 执行切换
            switch_result=$(openclaw models set "$endpoint" 2>&1)
            
            if [ $? -eq 0 ]; then
                log "✅ API端点切换成功: $endpoint"
                
                # 验证切换
                verify_result=$(openclaw models status --plain 2>/dev/null)
                if [ "$verify_result" = "$endpoint" ]; then
                    log "✅ 切换验证成功"
                    return 0
                fi
            else
                log "❌ 切换失败: $switch_result"
            fi
        fi
    done
    
    log "❌ 所有API端点切换尝试失败"
    return 1
}

# 紧急恢复主函数
emergency_recovery() {
    log "=== 启动紧急API故障恢复 ==="
    
    # 检查API状态
    check_api_status
    api_status=$?
    
    if [ $api_status -eq 0 ]; then
        log "API状态正常，无需恢复"
        return 0
    fi
    
    # 尝试切换API端点
    switch_api_endpoint
    switch_status=$?
    
    if [ $switch_status -eq 0 ]; then
        log "=== 紧急API故障恢复完成 ==="
        return 0
    else
        log "=== 紧急API故障恢复失败 ==="
        return 1
    fi
}

# 自动检测和恢复
auto_detect_and_recover() {
    log "=== 启动自动检测和恢复 ==="
    
    # 检查是否有API错误
    api_errors=$(grep -r "server_busy\|rate.*limit\|quota.*exceeded\|insufficient.*quota" \
        /root/.openclaw/agents/main/sessions/*.jsonl 2>/dev/null | head -5)
    
    if [ -n "$api_errors" ]; then
        log "检测到API错误"
        echo "$api_errors" | head -3 | while IFS= read -r line; do
            log "错误: $line"
        done
        
        # 执行恢复
        emergency_recovery
    else
        log "未检测到API错误"
    fi
}

# 持续监控模式
continuous_monitoring() {
    log "=== 启动持续监控模式 ==="
    log "监控间隔: 60秒"
    
    while true; do
        auto_detect_and_recover
        sleep 60
    done
}

# 主函数
main() {
    # 确保日志目录存在
    mkdir -p "$(dirname "$LOG_FILE")"
    
    case "${1:-help}" in
        check)
            check_api_status
            ;;
        switch)
            switch_api_endpoint
            ;;
        recover)
            emergency_recovery
            ;;
        auto)
            auto_detect_and_recover
            ;;
        monitor)
            continuous_monitoring
            ;;
        help|*)
            echo "紧急API故障恢复脚本"
            echo "使用方法:"
            echo "  $0 check       - 检查API状态"
            echo "  $0 switch      - 切换API端点"
            echo "  $0 recover     - 执行紧急恢复"
            echo "  $0 auto        - 自动检测并恢复"
            echo "  $0 monitor     - 持续监控模式"
            ;;
    esac
}

# 执行主函数
main "$@"