#!/bin/bash
# ============================================
# 7zi 生产环境部署脚本
# ============================================
set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
APP_NAME="7zi"
DEPLOY_DIR="/var/www/7zi"
BACKUP_DIR="/var/backups/7zi"
LOG_FILE="/var/log/7zi/deploy.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 日志函数
log() {
  echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() { log "${GREEN}✓ $1${NC}"; }
log_error() { log "${RED}✗ $1${NC}"; }
log_info() { log "${BLUE}ℹ $1${NC}"; }
log_warning() { log "${YELLOW}⚠ $1${NC}"; }

# 错误处理
error_exit() {
  log_error "$1"
  # 回滚逻辑
  if [ -d "$BACKUP_DIR/previous" ]; then
    log_info "正在回滚到上一版本..."
    rm -rf "$DEPLOY_DIR"
    mv "$BACKUP_DIR/previous" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    pm2 restart $APP_NAME || true
  fi
  exit 1
}

# 检查依赖
check_dependencies() {
  log_info "检查依赖..."
  
  local missing=()
  
  command -v node >/dev/null 2>&1 || missing+=("node")
  command -v npm >/dev/null 2>&1 || missing+=("npm")
  command -v pm2 >/dev/null 2>&1 || missing+=("pm2")
  command -v docker >/dev/null 2>&1 || missing+=("docker")
  
  if [ ${#missing[@]} -gt 0 ]; then
    error_exit "缺少依赖: ${missing[*]}"
  fi
  
  log_success "所有依赖已安装"
}

# 环境验证
validate_environment() {
  log_info "验证环境配置..."
  
  if [ ! -f ".env" ]; then
    error_exit ".env 文件不存在"
  fi
  
  # 检查必要的环境变量
  local required_vars=("JWT_SECRET" "CSRF_SECRET")
  local missing=()
  
  for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
      missing+=("$var")
    fi
  done
  
  if [ ${#missing[@]} -gt 0 ]; then
    error_exit "缺少必要的环境变量: ${missing[*]}"
  fi
  
  log_success "环境配置验证通过"
}

# 备份当前版本
backup_current() {
  log_info "备份当前版本..."
  
  mkdir -p "$BACKUP_DIR"
  
  if [ -d "$DEPLOY_DIR" ]; then
    # 删除旧的备份
    rm -rf "$BACKUP_DIR/previous"
    
    # 备份当前版本
    cp -r "$DEPLOY_DIR" "$BACKUP_DIR/previous"
    
    # 创建时间戳备份
    cp -r "$DEPLOY_DIR" "$BACKUP_DIR/backup_$TIMESTAMP"
    
    # 保留最近5个备份
    cd "$BACKUP_DIR"
    ls -t | grep backup_ | tail -n +6 | xargs rm -rf 2>/dev/null || true
    
    log_success "备份完成: backup_$TIMESTAMP"
  else
    log_info "首次部署，跳过备份"
  fi
}

# 构建 Docker 镜像
build_docker() {
  log_info "构建 Docker 镜像..."
  
  docker build -t "$APP_NAME:$TIMESTAMP" -t "$APP_NAME:latest" . || error_exit "Docker 构建失败"
  
  log_success "Docker 镜像构建完成"
}

# 部署 Docker Compose
deploy_docker() {
  log_info "部署 Docker Compose..."
  
  # 停止旧容器
  docker-compose -f docker-compose.prod.yml down || true
  
  # 启动新容器
  docker-compose -f docker-compose.prod.yml up -d --build
  
  # 等待健康检查
  log_info "等待服务启动..."
  sleep 30
  
  # 检查服务状态
  if docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    log_success "Docker 服务启动成功"
  else
    error_exit "Docker 服务启动失败"
  fi
}

# 部署 PM2
deploy_pm2() {
  log_info "部署 PM2..."
  
  # 安装依赖
  npm ci --legacy-peer-deps --production || error_exit "依赖安装失败"
  
  # 构建
  npm run build || error_exit "构建失败"
  
  # 使用 PM2 启动/重启
  if pm2 list | grep -q "$APP_NAME"; then
    pm2 reload ecosystem.config.js --update-env
    log_success "PM2 重载完成"
  else
    pm2 start ecosystem.config.js
    pm2 save
    log_success "PM2 启动完成"
  fi
}

# 健康检查
health_check() {
  log_info "执行健康检查..."
  
  local max_attempts=10
  local attempt=1
  local health_url="http://localhost:3000/api/health"
  
  while [ $attempt -le $max_attempts ]; do
    log_info "健康检查尝试 $attempt/$max_attempts"
    
    if curl -sf "$health_url" > /dev/null; then
      log_success "健康检查通过"
      return 0
    fi
    
    sleep 5
    ((attempt++))
  done
  
  error_exit "健康检查失败"
}

# 通知
send_notification() {
  local status="$1"
  local message="$2"
  
  # Slack 通知
  if [ -n "$SLACK_WEBHOOK_URL" ]; then
    local color="good"
    [ "$status" = "error" ] && color="danger"
    [ "$status" = "warning" ] && color="warning"
    
    curl -sf -X POST "$SLACK_WEBHOOK_URL" \
      -H 'Content-type: application/json' \
      -d "{
        \"attachments\": [{
          \"color\": \"$color\",
          \"title\": \"7zi 部署通知\",
          \"text\": \"$message\",
          \"footer\": \"部署脚本 v1.0\",
          \"ts\": $(date +%s)
        }]
      }" || true
  fi
  
  # Email 通知 (如果配置了 sendmail)
  if command -v sendmail >/dev/null 2>&1 && [ -n "$DEPLOY_EMAIL_RECIPIENTS" ]; then
    echo "Subject: [7zi] 部署通知 - $status

$message

时间: $(date '+%Y-%m-%d %H:%M:%S')
版本: $TIMESTAMP
" | sendmail "$DEPLOY_EMAIL_RECIPIENTS" || true
  fi
}

# 清理
cleanup() {
  log_info "清理旧的 Docker 镜像..."
  
  # 清理悬空镜像
  docker image prune -f || true
  
  # 清理旧的构建缓存
  docker builder prune -f --keep-storage 5GB || true
  
  log_success "清理完成"
}

# 显示部署信息
show_info() {
  log_info "部署信息:"
  echo "  应用名称: $APP_NAME"
  echo "  版本: $TIMESTAMP"
  echo "  部署目录: $DEPLOY_DIR"
  echo "  备份目录: $BACKUP_DIR"
  echo "  日志文件: $LOG_FILE"
  echo ""
  
  # 显示服务状态
  if command -v pm2 >/dev/null 2>&1; then
    pm2 list
  fi
  
  if command -v docker >/dev/null 2>&1; then
    docker ps --filter "name=$APP_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
  fi
}

# 主函数
main() {
  log "========== 7zi 生产环境部署开始 =========="
  
  # 创建日志目录
  mkdir -p "$(dirname "$LOG_FILE")"
  mkdir -p "$BACKUP_DIR"
  
  # 解析参数
  local deploy_method="pm2"
  local skip_health_check=false
  
  while [[ $# -gt 0 ]]; do
    case $1 in
      --docker)
        deploy_method="docker"
        shift
        ;;
      --pm2)
        deploy_method="pm2"
        shift
        ;;
      --skip-health-check)
        skip_health_check=true
        shift
        ;;
      --help)
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  --docker            使用 Docker 部署"
        echo "  --pm2               使用 PM2 部署 (默认)"
        echo "  --skip-health-check 跳过健康检查"
        echo "  --help              显示帮助信息"
        exit 0
        ;;
      *)
        error_exit "未知参数: $1"
        ;;
    esac
  done
  
  # 执行部署
  check_dependencies
  validate_environment
  backup_current
  
  if [ "$deploy_method" = "docker" ]; then
    build_docker
    deploy_docker
  else
    deploy_pm2
  fi
  
  if [ "$skip_health_check" = false ]; then
    health_check
  fi
  
  cleanup
  show_info
  
  log_success "部署完成!"
  log "========== 7zi 生产环境部署结束 =========="
  
  send_notification "success" "部署成功 - 版本 $TIMESTAMP"
}

# 运行
main "$@"