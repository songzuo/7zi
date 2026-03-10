#!/bin/bash
# ============================================
# 7zi 健康检查和监控脚本
# ============================================

# 配置
APP_NAME="7zi"
HEALTH_URL="http://localhost:3000/api/health"
DETAILED_HEALTH_URL="http://localhost:3000/api/health/detailed"
LOG_FILE="/var/log/7zi/health-check.log"
ALERT_THRESHOLD=3  # 连续失败次数阈值
STATE_FILE="/var/lib/7zi/health-state.json"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 日志函数
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 初始化状态文件
init_state() {
  mkdir -p "$(dirname "$STATE_FILE")"
  if [ ! -f "$STATE_FILE" ]; then
    echo '{"consecutive_failures": 0, "last_check": null, "last_success": null, "alerts_sent": 0}' > "$STATE_FILE"
  fi
}

# 读取状态
read_state() {
  cat "$STATE_FILE" 2>/dev/null || echo '{"consecutive_failures": 0}'
}

# 更新状态
update_state() {
  local failures="$1"
  local last_check="$2"
  local last_success="$3"
  local alerts_sent="${4:-0}"
  
  cat > "$STATE_FILE" << EOF
{
  "consecutive_failures": $failures,
  "last_check": "$last_check",
  "last_success": "$last_success",
  "alerts_sent": $alerts_sent
}
EOF
}

# 基础健康检查
check_basic_health() {
  local response
  local status_code
  local timestamp=$(date -Iseconds)
  
  response=$(curl -sf -w "\n%{http_code}" "$HEALTH_URL" 2>/dev/null)
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n -1)
  
  if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}✓${NC} 健康检查通过 (HTTP $status_code)"
    log "健康检查通过 - $body"
    return 0
  else
    echo -e "${RED}✗${NC} 健康检查失败 (HTTP $status_code)"
    log "健康检查失败 - HTTP $status_code"
    return 1
  fi
}

# 详细健康检查
check_detailed_health() {
  local response
  local status_code
  
  echo -e "\n${YELLOW}详细健康报告:${NC}"
  echo "===================="
  
  response=$(curl -sf "$DETAILED_HEALTH_URL" 2>/dev/null)
  
  if [ $? -eq 0 ]; then
    # 使用 jq 解析 JSON（如果可用）
    if command -v jq >/dev/null 2>&1; then
      echo "$response" | jq -r '
        "状态: \(.status)",
        "版本: \(.version)",
        "运行时间: \(.uptime) 秒",
        "环境: \(.environment)",
        "",
        "系统资源:",
        "  内存使用: \(.system.memory.usagePercent)%",
        "  CPU 核心: \(.system.cpu.cores)",
        "  负载: \(.system.cpu.loadAverage | join(\", \"))",
        "",
        "服务状态:",
        "  数据库: \(.services.database.status)",
        "  Redis: \(.services.redis.status)",
        "  邮件服务: \(.services.email.resend.status)",
        "",
        "安全配置:",
        "  JWT: \(if .configuration.security.jwtConfigured then \"已配置\" else \"未配置\" end)",
        "  CSRF: \(if .configuration.security.csrfConfigured then \"已配置\" else \"未配置\" end)"
      '
    else
      echo "$response"
    fi
    return 0
  else
    echo -e "${RED}无法获取详细健康报告${NC}"
    return 1
  fi
}

# PM2 进程检查
check_pm2_status() {
  if ! command -v pm2 >/dev/null 2>&1; then
    echo -e "${YELLOW}PM2 未安装${NC}"
    return 0
  fi
  
  echo -e "\n${YELLOW}PM2 进程状态:${NC}"
  echo "===================="
  
  if pm2 list | grep -q "$APP_NAME"; then
    pm2 list | grep -E "name|$APP_NAME"
    
    # 检查是否在线
    local status
    status=$(pm2 jlist 2>/dev/null | grep -o "\"name\":\"$APP_NAME\"[^}]*\"pm2_env\":{[^}]*\"status\":\"[^\"]*\"" | grep -o 'status":"[^"]*' | cut -d'"' -f3)
    
    if [ "$status" = "online" ]; then
      echo -e "${GREEN}✓${NC} 应用运行正常"
      return 0
    else
      echo -e "${RED}✗${NC} 应用状态异常: $status"
      return 1
    fi
  else
    echo -e "${RED}✗${NC} 未找到 $APP_NAME 进程"
    return 1
  fi
}

# Docker 容器检查
check_docker_status() {
  if ! command -v docker >/dev/null 2>&1; then
    echo -e "${YELLOW}Docker 未安装${NC}"
    return 0
  fi
  
  echo -e "\n${YELLOW}Docker 容器状态:${NC}"
  echo "===================="
  
  local containers
  containers=$(docker ps -a --filter "name=$APP_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}")
  
  if [ -n "$containers" ]; then
    echo "$containers"
    
    # 检查容器健康状态
    if echo "$containers" | grep -q "(healthy)"; then
      echo -e "${GREEN}✓${NC} 容器健康"
      return 0
    elif echo "$containers" | grep -q "Up"; then
      echo -e "${YELLOW}⚠${NC} 容器运行中但未显示健康状态"
      return 0
    else
      echo -e "${RED}✗${NC} 容器状态异常"
      return 1
    fi
  else
    echo -e "${YELLOW}未找到相关容器${NC}"
    return 0
  fi
}

# 系统资源检查
check_system_resources() {
  echo -e "\n${YELLOW}系统资源:${NC}"
  echo "===================="
  
  # 内存
  local mem_total mem_used mem_free mem_percent
  if [ -f /proc/meminfo ]; then
    mem_total=$(awk '/MemTotal/ {printf "%.0f", $2/1024}' /proc/meminfo)
    mem_available=$(awk '/MemAvailable/ {printf "%.0f", $2/1024}' /proc/meminfo 2>/dev/null || awk '/MemFree/ {printf "%.0f", $2/1024}' /proc/meminfo)
    mem_used=$((mem_total - mem_available))
    mem_percent=$((mem_used * 100 / mem_total))
    
    echo "内存: ${mem_used}MB / ${mem_total}MB (${mem_percent}%)"
    
    if [ "$mem_percent" -gt 90 ]; then
      echo -e "${RED}✗ 内存使用率过高${NC}"
    elif [ "$mem_percent" -gt 80 ]; then
      echo -e "${YELLOW}⚠ 内存使用率较高${NC}"
    else
      echo -e "${GREEN}✓ 内存使用正常${NC}"
    fi
  fi
  
  # CPU 负载
  local load_avg
  load_avg=$(awk '{print $1, $2, $3}' /proc/loadavg 2>/dev/null || uptime | awk -F'load average:' '{print $2}')
  echo "负载: $load_avg"
  
  # 磁盘
  echo ""
  df -h / | awk 'NR==1 || /^\// {print}'
  
  local disk_percent
  disk_percent=$(df / | awk 'NR==2 {gsub(/%/,""); print $5}')
  
  if [ "$disk_percent" -gt 90 ]; then
    echo -e "${RED}✗ 磁盘空间不足${NC}"
  elif [ "$disk_percent" -gt 80 ]; then
    echo -e "${YELLOW}⚠ 磁盘空间紧张${NC}"
  else
    echo -e "${GREEN}✓ 磁盘空间充足${NC}"
  fi
}

# 网络检查
check_network() {
  echo -e "\n${YELLOW}网络检查:${NC}"
  echo "===================="
  
  # 检查端口
  local port=3000
  if command -v ss >/dev/null 2>&1; then
    if ss -tln | grep -q ":$port "; then
      echo -e "${GREEN}✓${NC} 端口 $port 正在监听"
    else
      echo -e "${RED}✗${NC} 端口 $port 未监听"
    fi
  fi
  
  # 检查外部连接
  if curl -sf --connect-timeout 5 "https://api.github.com/zen" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} 外部网络连接正常"
  else
    echo -e "${YELLOW}⚠${NC} 外部网络连接异常"
  fi
}

# 发送告警
send_alert() {
  local message="$1"
  local severity="$2"
  
  log "发送告警: [$severity] $message"
  
  # Slack 告警
  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    local color="warning"
    [ "$severity" = "critical" ] && color="danger"
    [ "$severity" = "info" ] && color="good"
    
    curl -sf -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-type: application/json' \
      -d "{
        \"attachments\": [{
          \"color\": \"$color\",
          \"title\": \"7zi 健康告警\",
          \"text\": \"$message\",
          \"fields\": [
            {\"title\": \"严重程度\", \"value\": \"$severity\", \"short\": true},
            {\"title\": \"时间\", \"value\": \"$(date -Iseconds)\", \"short\": true}
          ]
        }]
      }" || true
  fi
  
  # Email 告警
  if [ -n "$ALERT_EMAIL_RECIPIENTS" ] && command -v sendmail >/dev/null 2>&1; then
    echo "Subject: [7zi] 健康告警 - $severity

$message

时间: $(date '+%Y-%m-%d %H:%M:%S')
主机: $(hostname)
" | sendmail "$ALERT_EMAIL_RECIPIENTS" || true
  fi
}

# 主检查逻辑
main_check() {
  local timestamp=$(date -Iseconds)
  local state=$(read_state)
  local failures=$(echo "$state" | grep -o '"consecutive_failures": [0-9]*' | cut -d' ' -f2)
  local alerts_sent=$(echo "$state" | grep -o '"alerts_sent": [0-9]*' | cut -d' ' -f2)
  
  init_state
  
  echo -e "${YELLOW}====================================${NC}"
  echo -e "${YELLOW}7zi 健康检查${NC}"
  echo -e "${YELLOW}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
  echo -e "${YELLOW}====================================${NC}"
  
  # 执行各项检查
  local all_passed=true
  
  check_basic_health || all_passed=false
  check_pm2_status
  check_docker_status
  check_system_resources
  check_network
  
  if [ "$1" = "--detailed" ] || [ "$1" = "-d" ]; then
    check_detailed_health
  fi
  
  # 更新状态
  if $all_passed; then
    update_state 0 "$timestamp" "$timestamp" "$alerts_sent"
    
    if [ "$failures" -gt 0 ]; then
      echo -e "\n${GREEN}✓ 服务已恢复正常${NC}"
      send_alert "服务已恢复正常 - 之前连续失败 $failures 次" "info"
    fi
  else
    local new_failures=$((failures + 1))
    update_state "$new_failures" "$timestamp" "" "$alerts_sent"
    
    echo -e "\n${RED}✗ 健康检查失败 (连续 $new_failures 次)${NC}"
    
    # 达到阈值发送告警
    if [ "$new_failures" -ge "$ALERT_THRESHOLD" ]; then
      send_alert "服务健康检查连续失败 $new_failures 次，请立即处理！" "critical"
      # 更新告警计数
      update_state "$new_failures" "$timestamp" "" "$((alerts_sent + 1))"
    fi
    
    return 1
  fi
  
  echo -e "\n${YELLOW}====================================${NC}"
}

# 显示帮助
show_help() {
  echo "用法: $0 [选项]"
  echo ""
  echo "选项:"
  echo "  -d, --detailed    显示详细健康报告"
  echo "  -h, --help        显示帮助信息"
  echo "  -w, --watch       持续监控模式"
  echo "  -c, --cron        Cron 模式 (静默，仅记录日志)"
  echo ""
  echo "环境变量:"
  echo "  SLACK_WEBHOOK_URL      Slack Webhook URL"
  echo "  ALERT_EMAIL_RECIPIENTS 告警邮件接收者"
  echo "  ALERT_THRESHOLD        告警阈值 (默认: 3)"
}

# 持续监控模式
watch_mode() {
  local interval=${HEALTH_CHECK_INTERVAL:-60}
  echo "持续监控模式 (间隔: ${interval}秒)"
  echo "按 Ctrl+C 退出"
  echo ""
  
  while true; do
    clear
    main_check --detailed
    sleep "$interval"
  done
}

# Cron 模式
cron_mode() {
  init_state
  
  if ! check_basic_health > /dev/null 2>&1; then
    local state=$(read_state)
    local failures=$(echo "$state" | grep -o '"consecutive_failures": [0-9]*' | cut -d' ' -f2)
    
    if [ "$failures" -ge "$ALERT_THRESHOLD" ]; then
      send_alert "健康检查失败 (连续 $failures 次)" "critical"
    fi
    
    exit 1
  fi
  
  exit 0
}

# 主入口
case "$1" in
  -h|--help)
    show_help
    ;;
  -w|--watch)
    watch_mode
    ;;
  -c|--cron)
    cron_mode
    ;;
  *)
    main_check "$@"
    ;;
esac