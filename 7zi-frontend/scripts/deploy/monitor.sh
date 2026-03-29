#!/bin/bash
# ============================================
# 部署监控仪表板 - Deployment Monitor
# ============================================
# 用途：实时监控部署状态、系统健康、性能指标
# 用法：./scripts/deploy/monitor.sh
# ============================================

set -euo pipefail

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# 清屏并移动光标
clear
tput cup 0 0

# 等待键
wait_for_key() {
    read -n 1 -s -r -p ""
}

# 获取容器状态
get_container_status() {
    local name=$1
    if docker ps --format '{{.Names}}' | grep -q "^${name}$"; then
        echo -e "${GREEN}🟢 Running${NC}"
    elif docker ps -a --format '{{.Names}}' | grep -q "^${name}$"; then
        echo -e "${YELLOW}🟡 Stopped${NC}"
    else
        echo -e "${RED}🔴 Not Found${NC}"
    fi
}

# 获取健康检查状态
get_health_status() {
    local url=$1
    local max_time=3
    local status_code
    local response_time

    status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $max_time "$url" 2>/dev/null || echo "000")
    response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time $max_time "$url" 2>/dev/null || echo "0")

    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✓ ${response_time}s${NC}"
    else
        echo -e "${RED}✗ ${status_code}${NC}"
    fi
}

# 获取系统资源
get_system_resources() {
    local cpu_usage
    local mem_usage
    local disk_usage

    cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    mem_usage=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

    echo "CPU: ${cpu_usage}% | Mem: ${mem_usage}% | Disk: ${disk_usage}%"
}

# 主仪表板函数
dashboard() {
    while true; do
        clear
        echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
        echo -e "${BOLD}${CYAN}                    🚀 7zi 部署监控仪表板${NC}"
        echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
        echo ""
        echo -e "${BOLD}${BLUE}📊 系统状态${NC}"
        echo -e "   $(get_system_resources)"
        echo ""

        echo -e "${BOLD}${BLUE}🐳 容器状态${NC}"
        echo -e "   Blue:  $(get_container_status 7zi-frontend-blue)"
        echo -e "   Green: $(get_container_status 7zi-frontend-green)"
        echo -e "   Nginx: $(get_container_status nginx)"
        echo ""

        echo -e "${BOLD}${BLUE}🔍 健康检查${NC}"
        echo -e "   Blue:  $(get_health_status http://localhost:3000/api/health)"
        echo -e "   Green: $(get_health_status http://localhost:3001/api/health)"
        echo -e "   Prod:  $(get_health_status https://7zi.com/api/health)"
        echo ""

        echo -e "${BOLD}${BLUE}📈 网络流量${NC}"
        local traffic
        traffic=$(ss -s | awk '/TCP:/ {print $2}')
        echo -e "   Connections: ${traffic}"
        echo ""

        echo -e "${BOLD}${BLUE}📝 最近的部署${NC}"
        echo -e "   $(git -C /root/7zi-frontend log -1 --format='%h - %s (%ar)' 2>/dev/null || echo 'N/A')"
        echo ""

        echo -e "${BOLD}${BLUE}⏱️ 系统负载${NC}"
        uptime | awk -F'load average:' '{print $2}' | awk '{print "   " $1 " " $2 " " $3}'
        echo ""

        echo -e "${BOLD}${BLUE}💾 存储使用${NC}"
        df -h / | awk 'NR==2 {printf "   Used: %s / %s (%s)\n", $3, $2, $5}'
        echo ""

        echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"
        echo -e "${BOLD}按 ${YELLOW}Ctrl+C${NC} 退出 | 按 ${YELLOW}r${NC} 刷新 | 按 ${YELLOW}d${NC} 查看详细日志 | 按 ${YELLOW}s${NC} 查看系统状态${NC}"
        echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════════════════${NC}"

        # 等待用户输入
        read -n 1 -t 5 -s key || key=""

        case $key in
            r)
                # 刷新（继续循环）
                ;;
            d)
                # 查看详细日志
                echo ""
                echo -e "${BOLD}${BLUE}📋 容器日志 (最近 20 行)${NC}"
                docker logs --tail 20 7zi-frontend-blue 2>/dev/null || echo "Blue container not running"
                echo ""
                echo -e "${YELLOW}按任意键继续...${NC}"
                read -n 1 -s
                ;;
            s)
                # 查看系统状态
                echo ""
                echo -e "${BOLD}${BLUE}📊 详细系统状态${NC}"
                echo ""
                echo "CPU:"
                top -bn1 | grep "Cpu(s)"
                echo ""
                echo "Memory:"
                free -h
                echo ""
                echo "Disk:"
                df -h
                echo ""
                echo "Network:"
                netstat -tuln | grep LISTEN | head -10
                echo ""
                echo -e "${YELLOW}按任意键继续...${NC}"
                read -n 1 -s
                ;;
        esac
    done
}

# 运行仪表板
trap 'clear; echo -e "${GREEN}监控仪表板已退出${NC}"; exit 0' INT
dashboard
