#!/bin/bash
# 7zi Monitoring Health Check Script
# Version: 1.9.1
# Updated: 2026-04-03

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 结果变量
PASSED=0
FAILED=0
WARNINGS=0

# 检查函数
check_service() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}
    
    echo -n "检查 $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_code" ] || [ "$response" = "200" ]; then
        echo -e "${GREEN}✓${NC} (HTTP $response)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} (HTTP $response)"
        ((FAILED++))
        return 1
    fi
}

check_endpoint() {
    local name=$1
    local url=$2
    
    echo -n "检查 $name... "
    
    if curl -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((FAILED++))
        return 1
    fi
}

check_container() {
    local name=$1
    
    echo -n "检查容器 $name... "
    
    status=$(docker inspect -f '{{.State.Status}}' "$name" 2>/dev/null || echo "not_found")
    
    if [ "$status" = "running" ]; then
        echo -e "${GREEN}✓${NC} (running)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} ($status)"
        ((FAILED++))
        return 1
    fi
}

check_metric() {
    local name=$1
    local query=$2
    local threshold=$3
    
    echo -n "检查指标 $name... "
    
    result=$(curl -s "http://localhost:9090/api/v1/query?query=$query" 2>/dev/null | jq -r '.data.result[0].value[1] // "N/A"')
    
    if [ "$result" = "N/A" ] || [ -z "$result" ]; then
        echo -e "${YELLOW}!${NC} (无数据)"
        ((WARNINGS++))
        return 0
    fi
    
    if (( $(echo "$result > $threshold" | bc -l) )); then
        echo -e "${RED}✗${NC} (值: $result, 阈值: $threshold)"
        ((FAILED++))
        return 1
    else
        echo -e "${GREEN}✓${NC} (值: $result)"
        ((PASSED++))
        return 0
    fi
}

echo "========================================"
echo "  7zi 监控系统健康检查"
echo "  版本: 1.9.1"
echo "========================================"
echo ""

# 检查容器状态
echo -e "${BLUE}[容器状态检查]${NC}"
check_container "7zi-prometheus"
check_container "7zi-grafana"
check_container "7zi-alertmanager"
check_container "7zi-loki"
check_container "7zi-promtail"
check_container "7zi-node-exporter"
check_container "7zi-cadvisor"
check_container "7zi-pushgateway"
echo ""

# 检查服务端点
echo -e "${BLUE}[服务端点检查]${NC}"
check_endpoint "Prometheus健康" "http://localhost:9090/-/healthy"
check_endpoint "Prometheus就绪" "http://localhost:9090/-/ready"
check_endpoint "Grafana健康" "http://localhost:3001/api/health"
check_endpoint "AlertManager健康" "http://localhost:9093/-/healthy"
check_endpoint "Loki就绪" "http://localhost:3100/ready"
check_endpoint "Node Exporter" "http://localhost:9100/metrics"
check_endpoint "cAdvisor" "http://localhost:8080/metrics"
check_endpoint "Pushgateway" "http://localhost:9091/-/healthy"
echo ""

# 检查 Prometheus 目标
echo -e "${BLUE}[Prometheus 目标状态]${NC}"
targets=$(curl -s "http://localhost:9090/api/v1/targets" 2>/dev/null)
total=$(echo "$targets" | jq '.data.activeTargets | length')
up=$(echo "$targets" | jq '[.data.activeTargets[] | select(.health == "up")] | length')

echo -n "目标状态... "
if [ "$up" = "$total" ] && [ "$total" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} ($up/$total 目标正常)"
    ((PASSED++))
else
    echo -e "${YELLOW}!${NC} ($up/$total 目标正常)"
    ((WARNINGS++))
fi
echo ""

# 检查系统指标
echo -e "${BLUE}[系统指标检查]${NC}"
check_metric "CPU使用率" "100-(avg(irate(node_cpu_seconds_total{mode=\"idle\"}[5m]))*100)" "80"
check_metric "内存使用率" "(1-(node_memory_MemAvailable_bytes/node_memory_MemTotal_bytes))*100" "80"
check_metric "磁盘使用率" "(1-(node_filesystem_avail_bytes{mountpoint=\"/\"}/node_filesystem_size_bytes{mountpoint=\"/\"}))*100" "80"
echo ""

# 检查告警规则
echo -e "${BLUE}[告警规则检查]${NC}"
rules=$(curl -s "http://localhost:9090/api/v1/rules" 2>/dev/null)
rule_groups=$(echo "$rules" | jq '.data.groups | length')
active_alerts=$(echo "$rules" | jq '[.data.groups[].rules[] | select(.state == "firing")] | length')

echo -n "告警规则... "
if [ "$rule_groups" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} ($rule_groups 个规则组)"
    ((PASSED++))
else
    echo -e "${RED}✗${NC} (无规则组)"
    ((FAILED++))
fi

echo -n "活动告警... "
if [ "$active_alerts" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} (无活动告警)"
    ((PASSED++))
else
    echo -e "${YELLOW}!${NC} ($active_alerts 个活动告警)"
    ((WARNINGS++))
fi
echo ""

# 检查数据源
echo -e "${BLUE}[Grafana 数据源检查]${NC}"
datasources=$(curl -s "http://admin:7zi_monitor_2026@localhost:3001/api/datasources" 2>/dev/null)
prometheus_ds=$(echo "$datasources" | jq -r '.[] | select(.type == "prometheus") | .name' 2>/dev/null)
loki_ds=$(echo "$datasources" | jq -r '.[] | select(.type == "loki") | .name' 2>/dev/null)

echo -n "Prometheus 数据源... "
if [ -n "$prometheus_ds" ]; then
    echo -e "${GREEN}✓${NC} ($prometheus_ds)"
    ((PASSED++))
else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
fi

echo -n "Loki 数据源... "
if [ -n "$loki_ds" ]; then
    echo -e "${GREEN}✓${NC} ($loki_ds)"
    ((PASSED++))
else
    echo -e "${YELLOW}!${NC}"
    ((WARNINGS++))
fi
echo ""

# 汇总结果
echo "========================================"
echo "  健康检查结果"
echo "========================================"
echo -e "通过: ${GREEN}$PASSED${NC}"
echo -e "失败: ${RED}$FAILED${NC}"
echo -e "警告: ${YELLOW}$WARNINGS${NC}"
echo ""

# 返回码
if [ "$FAILED" -gt 0 ]; then
    echo -e "${RED}监控状态异常，请检查失败项${NC}"
    exit 1
elif [ "$WARNINGS" -gt 0 ]; then
    echo -e "${YELLOW}监控状态良好，但有警告项${NC}"
    exit 0
else
    echo -e "${GREEN}监控状态正常${NC}"
    exit 0
fi
