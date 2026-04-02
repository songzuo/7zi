#!/bin/bash
# ============================================
# v1.7.0 回滚脚本
# ============================================
# 功能: 回滚到指定版本
# 用法: ./rollback-v170.sh [target-version] [--force]
# ============================================

set -e

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_VERSION="${1:-v1.6.0}"
FORCE=false

# 解析参数
for arg in "$@"; do
    case $arg in
        --force|-f)
            FORCE=true
            shift
            ;;
    esac
done

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

echo -e "${CYAN}=========================================="
echo -e "v1.7.0 回滚脚本"
echo -e "目标版本: $TARGET_VERSION"
echo -e "强制模式: $FORCE"
echo -e "==========================================${NC}"
echo ""

# 当前版本
CURRENT_VERSION=$(docker images 7zi-frontend --format "{{.Tag}}" | head -1)
log_info "当前版本: $CURRENT_VERSION"
log_info "目标版本: $TARGET_VERSION"
echo ""

# 确认回滚
if [[ "$FORCE" != "true" ]]; then
    read -p "确认回滚到 $TARGET_VERSION? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "回滚已取消"
        exit 0
    fi
fi

# ============================================
# 步骤 1: 创建当前状态备份
# ============================================
log_step "步骤 1/6: 创建当前状态备份..."

BACKUP_DIR="/var/backups/7zi/pre-rollback-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 备份 Redis 数据
log_info "备份 Redis 数据..."
docker exec 7zi-redis-v170 redis-cli -a "${REDIS_PASSWORD:-7zi-redis-password}" BGSAVE 2>/dev/null || true
docker cp 7zi-redis-v170:/data/dump.rdb "$BACKUP_DIR/redis-dump.rdb" 2>/dev/null || true

# 备份容器配置
log_info "备份容器配置..."
docker inspect ai-team-dashboard-v170 > "$BACKUP_DIR/app-inspect.json" 2>/dev/null || true

# 备份环境变量
log_info "备份环境变量..."
docker exec ai-team-dashboard-v170 env > "$BACKUP_DIR/app-env.txt" 2>/dev/null || true

log_success "备份完成: $BACKUP_DIR"
echo ""

# ============================================
# 步骤 2: 检查目标版本镜像
# ============================================
log_step "步骤 2/6: 检查目标版本镜像..."

if docker images 7zi-frontend:$TARGET_VERSION --format "{{.ID}}" | grep -q .; then
    log_success "镜像已存在: 7zi-frontend:$TARGET_VERSION"
else
    log_warn "镜像不存在: 7zi-frontend:$TARGET_VERSION"
    
    # 尝试从 Git 构建镜像
    if [[ -d ".git" ]]; then
        log_info "尝试从 Git 构建..."
        git checkout "$TARGET_VERSION" 2>/dev/null || git checkout "tags/$TARGET_VERSION" 2>/dev/null || {
            log_error "无法找到版本: $TARGET_VERSION"
            exit 1
        }
        
        # 构建镜像
        pnpm install --frozen-lockfile
        pnpm build
        docker build -t 7zi-frontend:$TARGET_VERSION -f deploy-scripts/docker/Dockerfile.production .
        
        # 切换回主分支
        git checkout -
    else
        log_error "无法获取目标版本镜像"
        exit 1
    fi
fi
echo ""

# ============================================
# 步骤 3: 停止当前服务
# ============================================
log_step "步骤 3/6: 停止当前服务..."

log_info "停止应用容器..."
docker stop ai-team-dashboard-v170 2>/dev/null || true

log_info "停止 Nginx 容器..."
docker stop 7zi-nginx-v170 2>/dev/null || true

log_success "服务已停止"
echo ""

# ============================================
# 步骤 4: 更新镜像标签
# ============================================
log_step "步骤 4/6: 更新镜像标签..."

log_info "设置目标版本为 latest..."
docker tag 7zi-frontend:$TARGET_VERSION 7zi-frontend:latest

log_success "镜像标签已更新"
echo ""

# ============================================
# 步骤 5: 启动目标版本
# ============================================
log_step "步骤 5/6: 启动目标版本..."

# 使用目标版本的 docker-compose 配置
COMPOSE_FILE="$SCRIPT_DIR/../docker/docker-compose.prod.yml"

if [[ -f "$SCRIPT_DIR/../docker/docker-compose.$TARGET_VERSION.yml" ]]; then
    COMPOSE_FILE="$SCRIPT_DIR/../docker/docker-compose.$TARGET_VERSION.yml"
    log_info "使用配置: $COMPOSE_FILE"
fi

docker-compose -f "$COMPOSE_FILE" up -d

log_info "等待服务启动..."
sleep 10

log_success "服务已启动"
echo ""

# ============================================
# 步骤 6: 验证回滚
# ============================================
log_step "步骤 6/6: 验证回滚..."

# 检查容器状态
if docker ps --format "{{.Names}}" | grep -q "ai-team-dashboard"; then
    log_success "应用容器运行中"
else
    log_error "应用容器未运行"
    exit 1
fi

# 检查健康状态
HEALTH=$(docker inspect --format='{{.State.Health.Status}}' ai-team-dashboard-v170 2>/dev/null || echo "unknown")
if [[ "$HEALTH" == "healthy" ]]; then
    log_success "应用容器健康状态: $HEALTH"
else
    log_warn "应用容器健康状态: $HEALTH"
fi

# 检查 HTTP 响应
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
    log_success "健康检查端点返回 200"
else
    log_error "健康检查端点返回 $HTTP_CODE"
fi

# 检查版本
VERSION_RESPONSE=$(curl -s http://localhost:3000/api/version 2>/dev/null || echo "{}")
log_info "版本信息: $VERSION_RESPONSE"

echo ""

# ============================================
# 汇总
# ============================================
echo -e "${CYAN}=========================================="
echo -e "回滚汇总"
echo -e "==========================================${NC}"
log_info "原始版本: $CURRENT_VERSION"
log_info "目标版本: $TARGET_VERSION"
log_info "备份位置: $BACKUP_DIR"
echo ""

if [[ "$HTTP_CODE" == "200" ]]; then
    echo -e "${GREEN}✓ 回滚成功!${NC}"
    echo ""
    log_info "验证命令:"
    echo "  curl http://localhost:3000/api/health"
    echo "  docker logs ai-team-dashboard-v170 --tail 100"
    echo ""
    exit 0
else
    echo -e "${RED}✗ 回滚可能失败，请检查日志${NC}"
    echo ""
    log_info "调试命令:"
    echo "  docker logs ai-team-dashboard-v170 --tail 100"
    echo "  docker-compose -f $COMPOSE_FILE logs"
    echo ""
    exit 1
fi
