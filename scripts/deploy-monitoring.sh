#!/bin/bash
# ============================================
# 监控栈部署脚本
# 7zi-frontend Monitoring Stack
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_DIR="${SCRIPT_DIR}/monitoring"

echo "🔍 7zi-frontend 监控栈部署脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker 未安装${NC}"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose 未安装${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Docker 和 Docker Compose 已安装${NC}"
}

# 检查环境变量
check_env() {
    if [ ! -f "${MONITORING_DIR}/.env" ]; then
        echo -e "${YELLOW}⚠️  环境变量文件不存在${NC}"
        echo "正在从模板创建..."
        cp "${MONITORING_DIR}/.env.example" "${MONITORING_DIR}/.env"
        echo -e "${YELLOW}⚠️  请编辑 ${MONITORING_DIR}/.env 填入实际配置${NC}"
        echo ""
        read -p "是否继续？(y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        echo -e "${GREEN}✅ 环境变量文件存在${NC}"
    fi
}

# 创建必要目录
create_directories() {
    echo "📁 创建必要目录..."
    
    mkdir -p "${MONITORING_DIR}/prometheus/rules"
    mkdir -p "${MONITORING_DIR}/alertmanager/templates"
    mkdir -p "${MONITORING_DIR}/grafana/datasources"
    mkdir -p "${MONITORING_DIR}/grafana/dashboards"
    mkdir -p "${MONITORING_DIR}/blackbox"
    
    echo -e "${GREEN}✅ 目录创建完成${NC}"
}

# 启动监控栈
start_monitoring() {
    echo ""
    echo "🚀 启动监控栈..."
    echo ""
    
    cd "${MONITORING_DIR}"
    
    # 使用 docker compose 或 docker-compose
    if docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi
    
    echo ""
    echo -e "${GREEN}✅ 监控栈启动完成${NC}"
}

# 检查服务状态
check_status() {
    echo ""
    echo "📊 检查服务状态..."
    echo ""
    
    cd "${MONITORING_DIR}"
    
    if docker compose version &> /dev/null; then
        docker compose ps
    else
        docker-compose ps
    fi
    
    echo ""
    echo "🌐 服务访问地址:"
    echo "   Prometheus:   http://localhost:9090"
    echo "   Grafana:      http://localhost:3001"
    echo "   Alertmanager: http://localhost:9093"
    echo "   Node Exporter: http://localhost:9100"
    echo "   cAdvisor:     http://localhost:8080"
    echo ""
}

# 健康检查
health_check() {
    echo "🏥 执行健康检查..."
    echo ""
    
    # Prometheus
    if curl -s http://localhost:9090/-/healthy > /dev/null; then
        echo -e "${GREEN}✅ Prometheus: 健康${NC}"
    else
        echo -e "${RED}❌ Prometheus: 不健康${NC}"
    fi
    
    # Grafana
    if curl -s http://localhost:3001/api/health > /dev/null; then
        echo -e "${GREEN}✅ Grafana: 健康${NC}"
    else
        echo -e "${RED}❌ Grafana: 不健康${NC}"
    fi
    
    # Alertmanager
    if curl -s http://localhost:9093/-/healthy > /dev/null; then
        echo -e "${GREEN}✅ Alertmanager: 健康${NC}"
    else
        echo -e "${RED}❌ Alertmanager: 不健康${NC}"
    fi
    
    echo ""
}

# 显示使用说明
show_usage() {
    echo "📖 使用说明:"
    echo ""
    echo "  1. 配置环境变量:"
    echo "     cd monitoring && cp .env.example .env"
    echo "     # 编辑 .env 填入实际值"
    echo ""
    echo "  2. 启动监控栈:"
    echo "     ./scripts/deploy-monitoring.sh"
    echo ""
    echo "  3. 查看日志:"
    echo "     docker-compose logs -f prometheus"
    echo ""
    echo "  4. 停止监控栈:"
    echo "     docker-compose down"
    echo ""
    echo "  5. 重启监控栈:"
    echo "     docker-compose restart"
    echo ""
}

# 主函数
main() {
    check_docker
    check_env
    create_directories
    start_monitoring
    sleep 5
    check_status
    health_check
    show_usage
    
    echo ""
    echo -e "${GREEN}🎉 部署完成！${NC}"
}

# 执行主函数
main
