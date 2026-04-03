#!/bin/bash
# 7zi Monitoring Stack Deployment Script
# Version: 1.9.1
# Updated: 2026-04-03

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
MONITORING_DIR="/root/.openclaw/workspace/monitoring"
COMPOSE_FILE="$MONITORING_DIR/docker-compose.yml"
ENV_FILE="$MONITORING_DIR/.env"

# 打印函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 创建环境文件
create_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        log_info "创建环境配置文件..."
        cat > "$ENV_FILE" << EOF
# AlertManager 配置
SMTP_PASSWORD=your_smtp_password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
TELEGRAM_CRITICAL_CHAT_ID=your_critical_chat_id
EOF
        log_warning "请编辑 $ENV_FILE 配置告警通知渠道"
    else
        log_info "环境配置文件已存在"
    fi
}

# 创建必要目录
create_directories() {
    log_info "创建必要目录..."
    
    mkdir -p /var/log/7zi
    mkdir -p /var/log/nginx
    mkdir -p /root/.openclaw/logs
    
    log_success "目录创建完成"
}

# 拉取镜像
pull_images() {
    log_info "拉取 Docker 镜像..."
    
    cd "$MONITORING_DIR"
    docker-compose -f "$COMPOSE_FILE" pull
    
    log_success "镜像拉取完成"
}

# 启动监控栈
start_monitoring() {
    log_info "启动监控栈..."
    
    cd "$MONITORING_DIR"
    docker-compose -f "$COMPOSE_FILE" up -d
    
    log_success "监控栈启动完成"
}

# 检查服务状态
check_status() {
    log_info "检查服务状态..."
    
    cd "$MONITORING_DIR"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log_info "服务访问地址:"
    echo "  Prometheus:     http://localhost:9090"
    echo "  Grafana:        http://localhost:3001 (admin/7zi_monitor_2026)"
    echo "  AlertManager:   http://localhost:9093"
    echo "  Loki:           http://localhost:3100"
    echo "  cAdvisor:       http://localhost:8080"
    echo "  Node Exporter:  http://localhost:9100"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务就绪..."
    
    # 等待 Prometheus
    for i in {1..30}; do
        if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
            log_success "Prometheus 就绪"
            break
        fi
        sleep 2
    done
    
    # 等待 Grafana
    for i in {1..30}; do
        if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
            log_success "Grafana 就绪"
            break
        fi
        sleep 2
    done
    
    # 等待 Loki
    for i in {1..30}; do
        if curl -s http://localhost:3100/ready > /dev/null 2>&1; then
            log_success "Loki 就绪"
            break
        fi
        sleep 2
    done
}

# 配置 Grafana 数据源
configure_grafana() {
    log_info "配置 Grafana..."
    
    # 等待 Grafana 完全启动
    sleep 10
    
    # 导入仪表盘
    log_info "仪表盘已自动配置"
}

# 主函数
main() {
    echo "========================================"
    echo "  7zi 监控栈部署脚本 v1.9.1"
    echo "========================================"
    echo ""
    
    check_dependencies
    create_env_file
    create_directories
    pull_images
    start_monitoring
    wait_for_services
    check_status
    
    echo ""
    log_success "部署完成！"
    echo ""
    echo "下一步操作:"
    echo "1. 编辑 $ENV_FILE 配置告警通知渠道"
    echo "2. 访问 Grafana: http://localhost:3001"
    echo "3. 配置应用程序指标导出"
    echo ""
}

# 参数处理
case "${1:-deploy}" in
    deploy)
        main
        ;;
    stop)
        log_info "停止监控栈..."
        cd "$MONITORING_DIR"
        docker-compose -f "$COMPOSE_FILE" down
        log_success "监控栈已停止"
        ;;
    restart)
        log_info "重启监控栈..."
        cd "$MONITORING_DIR"
        docker-compose -f "$COMPOSE_FILE" restart
        log_success "监控栈已重启"
        ;;
    status)
        check_status
        ;;
    logs)
        cd "$MONITORING_DIR"
        docker-compose -f "$COMPOSE_FILE" logs -f "${2:-}"
        ;;
    *)
        echo "用法: $0 {deploy|stop|restart|status|logs [service]}"
        exit 1
        ;;
esac
