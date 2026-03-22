#!/bin/bash

# Docker 部署优化测试脚本
# 用于验证优化效果和检查配置

set -e

echo "=========================================="
echo "Docker 部署优化测试脚本"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_pass() {
    echo -e "${GREEN}✓ $1${NC}"
}

test_fail() {
    echo -e "${RED}✗ $1${NC}"
}

test_warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 进入项目目录
cd /root/.openclaw/workspace/7zi-project

# ============================================
# 测试 1: .dockerignore 文件
# ============================================
echo "1. 检查 .dockerignore 文件..."
if [ -f .dockerignore ]; then
    test_pass ".dockerignore 存在"

    # 检查关键排除项
    if grep -q "node_modules" .dockerignore; then
        test_pass "node_modules 已排除"
    else
        test_fail "node_modules 未排除"
    fi

    if grep -q ".git" .dockerignore; then
        test_pass ".git 已排除"
    else
        test_fail ".git 未排除"
    fi

    if grep -q "*.log" .dockerignore; then
        test_pass "*.log 已排除"
    else
        test_fail "*.log 未排除"
    fi

    # 估算构建上下文大小
    CONTEXT_SIZE=$(du -sh . 2>/dev/null | cut -f1 || echo "N/A")
    echo "   构建上下文大小: $CONTEXT_SIZE"
else
    test_fail ".dockerignore 不存在"
fi

echo ""

# ============================================
# 测试 2: Dockerfile.production
# ============================================
echo "2. 检查 Dockerfile.production..."
if [ -f Dockerfile.production ]; then
    test_pass "Dockerfile.production 存在"

    # 检查关键优化
    if grep -q "--mount=type=cache" Dockerfile.production; then
        test_pass "BuildKit 缓存挂载已配置"
    else
        test_warn "BuildKit 缓存挂载未配置（建议添加）"
    fi

    if grep -q "FROM node:22-alpine AS builder" Dockerfile.production; then
        test_pass "多阶段构建已配置"
    else
        test_fail "多阶段构建未配置"
    fi

    if grep -q "runner-alpine" Dockerfile.production; then
        test_pass "Alpine 生产镜像目标已定义"
    else
        test_warn "Alpine 生产镜像目标未定义"
    fi

    if grep -q "runner-distroless" Dockerfile.production; then
        test_pass "Distroless 生产镜像目标已定义"
    else
        test_warn "Distroless 生产镜像目标未定义"
    fi

    # 检查是否修复了依赖重复安装问题
    if grep -q "AS deps" Dockerfile.production && grep -q "AS builder" Dockerfile.production; then
        # 检查是否分离了 deps 和 builder 阶段
        if grep -A 10 "AS deps" Dockerfile.production | grep -q "RUN npm ci"; then
            if grep -A 10 "AS builder" Dockerfile.production | grep -q "RUN npm ci"; then
                test_warn "可能仍存在依赖重复安装（请检查）"
            else
                test_pass "依赖重复安装问题已修复"
            fi
        fi
    else
        test_pass "依赖安装阶段已优化（合并或单阶段）"
    fi
else
    test_fail "Dockerfile.production 不存在"
fi

echo ""

# ============================================
# 测试 3: Nginx 配置
# ============================================
echo "3. 检查 Nginx 配置..."
if [ -f 7zi-nginx.conf ]; then
    test_pass "7zi-nginx.conf 存在"

    # 检查后端代理端口
    if grep -q "proxy_pass http://7zi-frontend:3000" 7zi-nginx.conf; then
        test_pass "Nginx 代理已修复为容器端口 3000"
    else
        test_warn "Nginx 代理可能仍使用宿主机端口"
    fi

    # 检查是否还有旧的端口配置
    if grep -q "127.0.0.1:8318" 7zi-nginx.conf; then
        test_fail "Nginx 配置仍包含旧的端口 127.0.0.1:8318"
    else
        test_pass "Nginx 配置不包含旧端口"
    fi

    # 检查 gzip 压缩级别
    if grep -q "gzip_comp_level" 7zi-nginx.conf; then
        test_pass "gzip 压缩级别已配置"
    else
        test_warn "gzip 压缩级别未配置（建议添加）"
    fi
else
    test_fail "7zi-nginx.conf 不存在"
fi

echo ""

# ============================================
# 测试 4: docker-compose.optimized.yml
# ============================================
echo "4. 检查 docker-compose.optimized.yml..."
if [ -f docker-compose.optimized.yml ]; then
    test_pass "docker-compose.optimized.yml 存在"

    # 检查是否使用优化的 Dockerfile
    if grep -q "dockerfile: Dockerfile.production" docker-compose.optimized.yml; then
        test_pass "使用 Dockerfile.production"
    else
        test_warn "未使用 Dockerfile.production"
    fi

    # 检查构建目标
    if grep -q "target: runner-alpine" docker-compose.optimized.yml; then
        test_pass "构建目标设置为 runner-alpine"
    else
        test_warn "构建目标未设置（建议设置）"
    fi

    # 检查 Nginx 配置映射
    if grep -q "7zi-nginx.conf:/etc/nginx/conf.d/default.conf" docker-compose.optimized.yml; then
        test_pass "Nginx 配置映射正确"
    else
        test_warn "Nginx 配置映射路径可能需要调整"
    fi
else
    test_warn "docker-compose.optimized.yml 不存在（可选）"
fi

echo ""

# ============================================
# 测试 5: Docker 环境检查
# ============================================
echo "5. 检查 Docker 环境..."
if command -v docker &> /dev/null; then
    test_pass "Docker 已安装"

    # 检查 Docker 版本
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    echo "   Docker 版本: $DOCKER_VERSION"

    # 检查 Docker 是否运行
    if docker info &> /dev/null; then
        test_pass "Docker 服务正在运行"

        # 检查容器状态
        RUNNING_CONTAINERS=$(docker ps --format "{{.Names}}" | grep -c "7zi" || echo "0")
        echo "   运行中的 7zi 容器: $RUNNING_CONTAINERS"
    else
        test_fail "Docker 服务未运行"
    fi
else
    test_fail "Docker 未安装"
fi

echo ""

# ============================================
# 测试 6: BuildKit 支持
# ============================================
echo "6. 检查 BuildKit 支持..."
if [ -f ~/.docker/config.json ]; then
    if grep -q "buildkit.*true" ~/.docker/config.json; then
        test_pass "BuildKit 已启用"
    else
        test_warn "BuildKit 未在配置中启用（可使用 DOCKER_BUILDKIT=1）"
    fi
else
    test_warn "~/.docker/config.json 不存在（可使用 DOCKER_BUILDKIT=1）"
fi

echo ""

# ============================================
# 测试 7: 构建测试（可选）
# ============================================
echo "7. 构建测试（可选）..."
read -p "是否执行构建测试？这可能需要几分钟时间 (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   开始构建镜像（仅测试，不保存）..."
    if DOCKER_BUILDKIT=1 docker build --target runner-alpine -f Dockerfile.production --no-cache . > /tmp/build-test.log 2>&1; then
        test_pass "构建成功"
        BUILD_TIME=$(grep -oP "Elapsed time: \K[0-9.]+" /tmp/build-test.log || echo "N/A")
        echo "   构建时间: $BUILD_TIME"
    else
        test_fail "构建失败，请检查日志: /tmp/build-test.log"
    fi
else
    echo "   跳过构建测试"
fi

echo ""

# ============================================
# 总结
# ============================================
echo "=========================================="
echo "测试完成"
echo "=========================================="
echo ""
echo "建议："
echo "1. 如果所有测试通过，可以开始部署："
echo "   DOCKER_BUILDKIT=1 docker-compose -f docker-compose.optimized.yml up -d"
echo ""
echo "2. 如果发现错误，请修复后再部署"
echo ""
echo "3. 详细的实施报告请查看："
echo "   DOCKER_OPTIMIZATION_IMPLEMENTATION.md"
echo ""
