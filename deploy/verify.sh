#!/bin/bash

# ============================================
# OpenClaw v1.11.0 部署验证脚本
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "${BLUE}[TEST $TOTAL_TESTS]${NC} $test_name"
    
    if eval "$test_command" &> /dev/null; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "  ${GREEN}✓ PASS${NC}"
        return 0
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "  ${RED}✗ FAIL${NC}"
        return 1
    fi
}

echo "========================================"
echo " OpenClaw v1.11.0 部署验证"
echo "========================================"
echo ""

# ============================================
# 文件结构检查
# ============================================
echo "1. 检查文件结构..."

run_test "Docker 目录存在" "[ -d deploy/docker ]"
run_test "Dockerfile 存在" "[ -f deploy/docker/Dockerfile ]"
run_test "docker-compose.dev.yml 存在" "[ -f deploy/docker/docker-compose.dev.yml ]"
run_test "docker-compose.prod.yml 存在" "[ -f deploy/docker/docker-compose.prod.yml ]"
run_test "nginx.conf 存在" "[ -f deploy/docker/nginx.conf ]"
run_test ".dockerignore 存在" "[ -f deploy/docker/.dockerignore ]"

run_test "Kubernetes 目录存在" "[ -d deploy/kubernetes ]"
run_test "deployment.yaml 存在" "[ -f deploy/kubernetes/deployment.yaml ]"
run_test "service.yaml 存在" "[ -f deploy/kubernetes/service.yaml ]"
run_test "ingress.yaml 存在" "[ -f deploy/kubernetes/ingress.yaml ]"
run_test "configmap.yaml 存在" "[ -f deploy/kubernetes/configmap.yaml ]"
run_test "hpa.yaml 存在" "[ -f deploy/kubernetes/hpa.yaml ]"

run_test "Helm Chart 目录存在" "[ -d deploy/helm/openclaw ]"
run_test "Chart.yaml 存在" "[ -f deploy/helm/openclaw/Chart.yaml ]"
run_test "values.yaml 存在" "[ -f deploy/helm/openclaw/values.yaml ]"
run_test "templates 目录存在" "[ -d deploy/helm/openclaw/templates ]"

run_test "GitHub Workflows 目录存在" "[ -d deploy/github/workflows ]"
run_test "ci.yml 存在" "[ -f deploy/github/workflows/ci.yml ]"

run_test "README.md 存在" "[ -f deploy/README.md ]"
run_test ".env.example 存在" "[ -f deploy/.env.example ]"
run_test "deploy.sh 存在" "[ -f deploy/deploy.sh ]"

echo ""

# ============================================
# Dockerfile 验证
# ============================================
echo "2. 验证 Dockerfile..."

run_test "Dockerfile 包含多阶段构建" "grep -q 'FROM.*AS' deploy/docker/Dockerfile"
run_test "Dockerfile 包含非 root 用户" "grep -q 'adduser' deploy/docker/Dockerfile"
run_test "Dockerfile 包含健康检查" "grep -q 'HEALTHCHECK' deploy/docker/Dockerfile"
run_test "Dockerfile 包含多架构支持" "grep -q 'BUILDPLATFORM' deploy/docker/Dockerfile"

echo ""

# ============================================
# Kubernetes YAML 验证
# ============================================
echo "3. 验证 Kubernetes 配置..."

# 检查是否有 kubectl
if command -v kubectl &> /dev/null; then
    run_test "deployment.yaml 语法正确" "kubectl apply --dry-run=client -f deploy/kubernetes/deployment.yaml"
    run_test "service.yaml 语法正确" "kubectl apply --dry-run=client -f deploy/kubernetes/service.yaml"
    run_test "ingress.yaml 语法正确" "kubectl apply --dry-run=client -f deploy/kubernetes/ingress.yaml"
    run_test "configmap.yaml 语法正确" "kubectl apply --dry-run=client -f deploy/kubernetes/configmap.yaml"
    run_test "hpa.yaml 语法正确" "kubectl apply --dry-run=client -f deploy/kubernetes/hpa.yaml"
else
    echo -e "${YELLOW}警告: kubectl 未安装，跳过 Kubernetes YAML 验证${NC}"
fi

echo ""

# ============================================
# Helm Chart 验证
# ============================================
echo "4. 验证 Helm Chart..."

# 检查是否有 helm
if command -v helm &> /dev/null; then
    run_test "Helm Chart 语法正确" "helm lint deploy/helm/openclaw"
    run_test "Helm Chart 可以渲染模板" "helm template openclaw deploy/helm/openclaw > /dev/null"
else
    echo -e "${YELLOW}警告: helm 未安装，跳过 Helm Chart 验证${NC}"
fi

echo ""

# ============================================
# Docker Compose 验证
# ============================================
echo "5. 验证 Docker Compose..."

# 检查是否有 docker-compose
if command -v docker-compose &> /dev/null; then
    run_test "docker-compose.dev.yml 语法正确" "docker-compose -f deploy/docker/docker-compose.dev.yml config > /dev/null"
    run_test "docker-compose.prod.yml 语法正确" "docker-compose -f deploy/docker/docker-compose.prod.yml config > /dev/null"
else
    echo -e "${YELLOW}警告: docker-compose 未安装，跳过 Docker Compose 验证${NC}"
fi

echo ""

# ============================================
# 环境变量验证
# ============================================
echo "6. 验证环境变量配置..."

run_test ".env.example 包含数据库配置" "grep -q 'POSTGRES_' deploy/.env.example"
run_test ".env.example 包含 Redis 配置" "grep -q 'REDIS_' deploy/.env.example"
run_test ".env.example 包含安全配置" "grep -q 'JWT_SECRET' deploy/.env.example"
run_test ".env.example 包含监控配置" "grep -q 'SENTRY_DSN' deploy/.env.example"

echo ""

# ============================================
# 安全检查
# ============================================
echo "7. 安全检查..."

run_test "Dockerfile 不使用 root 用户" "grep -q 'USER nextjs' deploy/docker/Dockerfile"
run_test "Kubernetes 使用非 root 用户" "grep -q 'runAsNonRoot: true' deploy/kubernetes/deployment.yaml"
run_test "Kubernetes 有资源限制" "grep -q 'resources:' deploy/kubernetes/deployment.yaml"
run_test "Kubernetes 有健康检查" "grep -q 'livenessProbe:' deploy/kubernetes/deployment.yaml"
run_test "NetworkPolicy 已配置" "grep -q 'NetworkPolicy' deploy/kubernetes/configmap.yaml"
run_test "Ingress 启用 TLS" "grep -q 'tls:' deploy/kubernetes/ingress.yaml"

echo ""

# ============================================
# 总结
# ============================================
echo "========================================"
echo " 验证总结"
echo "========================================"
echo ""
echo -e "总测试数: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}"
    echo ""
    echo "部署套件已准备就绪，可以使用以下命令部署："
    echo ""
    echo "  # Docker Compose 部署"
    echo "  ./deploy/deploy.sh docker"
    echo ""
    echo "  # Kubernetes 部署"
    echo "  ./deploy/deploy.sh kubernetes"
    echo ""
    echo "  # Helm 部署"
    echo "  ./deploy/deploy.sh helm"
    echo ""
    exit 0
else
    echo -e "${RED}✗ 有 $FAILED_TESTS 个测试失败${NC}"
    echo ""
    exit 1
fi