#!/bin/bash
set -e

# ==========================================
# CI/CD 状态检查脚本
# 验证所有配置是否正确
# ==========================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check_count=0
pass_count=0
fail_count=0

log_check() {
    ((check_count++))
    echo -e "${BLUE}[${check_count}]${NC} $1"
}

log_pass() {
    ((pass_count++))
    echo -e "${GREEN}  ✓${NC} $1"
}

log_fail() {
    ((fail_count++))
    echo -e "${RED}  ✗${NC} $1"
}

log_info() {
    echo -e "${YELLOW}  ℹ${NC} $1"
}

echo ""
echo "=========================================="
echo "  CI/CD 配置检查"
echo "=========================================="
echo ""

# 1. 检查 GitHub Actions workflow 文件
log_check "检查 GitHub Actions workflow 文件"

if [ -f ".github/workflows/ci-cd.yml" ]; then
    log_pass "ci-cd.yml 存在"
else
    log_fail "ci-cd.yml 不存在"
fi

if [ -f ".github/workflows/tests.yml" ]; then
    log_pass "tests.yml 存在"
else
    log_fail "tests.yml 不存在"
fi

if [ -f ".github/workflows/deploy.yml" ]; then
    log_pass "deploy.yml 存在（旧配置）"
else
    log_info "deploy.yml 不存在"
fi

# 2. 检查 workflow 语法
log_check "验证 workflow 语法"

for file in .github/workflows/*.yml; do
    if [ -f "$file" ]; then
        # 检查 YAML 语法（需要 yq 或 python）
        if command -v python3 &> /dev/null; then
            if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
                log_pass "$(basename $file) YAML 语法正确"
            else
                log_fail "$(basename $file) YAML 语法错误"
            fi
        else
            log_info "跳过 $(basename $file) 语法检查（需要 python3）"
        fi
    fi
done

# 3. 检查 Docker 配置
log_check "检查 Docker 配置"

if [ -f "deploy-scripts/docker/Dockerfile.production" ]; then
    log_pass "Dockerfile.production 存在"
else
    log_fail "Dockerfile.production 不存在"
fi

if [ -f "deploy-scripts/docker/docker-compose.prod.yml" ]; then
    log_pass "docker-compose.prod.yml 存在"
else
    log_fail "docker-compose.prod.yml 不存在"
fi

if [ -f "deploy-scripts/docker/nginx/nginx.conf" ]; then
    log_pass "nginx.conf 存在"
else
    log_fail "nginx.conf 不存在"
fi

# 4. 检查文档
log_check "检查文档"

if [ -f ".github/SECRETS.md" ]; then
    log_pass "SECRETS.md 存在"
else
    log_fail "SECRETS.md 不存在"
fi

if [ -f "deploy-scripts/docker/README.md" ]; then
    log_pass "docker/README.md 存在"
else
    log_fail "docker/README.md 不存在"
fi

# 5. 检查应用配置
log_check "检查应用配置"

if [ -f "app/package.json" ]; then
    if grep -q '"test"' app/package.json; then
        log_pass "package.json 包含 test 脚本"
    else
        log_fail "package.json 缺少 test 脚本"
    fi
    
    if grep -q '"build"' app/package.json; then
        log_pass "package.json 包含 build 脚本"
    else
        log_fail "package.json 缺少 build 脚本"
    fi
else
    log_fail "app/package.json 不存在"
fi

if [ -f "app/vitest.config.ts" ]; then
    log_pass "vitest.config.ts 存在"
else
    log_info "vitest.config.ts 不存在（可能使用其他测试框架）"
fi

# 6. 检查测试文件
log_check "检查测试文件"

if [ -d "app/__tests__" ]; then
    test_count=$(find app/__tests__ -name "*.test.*" -o -name "*.spec.*" | wc -l)
    if [ "$test_count" -gt 0 ]; then
        log_pass "找到 $test_count 个测试文件"
    else
        log_info "测试目录存在但无测试文件"
    fi
else
    log_info "__tests__ 目录不存在"
fi

# 7. 检查 SSH 密钥（如果存在）
log_check "检查 SSH 配置"

if [ -f "$HOME/.ssh/id_ed25519" ]; then
    log_pass "SSH 私钥存在"
else
    log_info "SSH 私钥不存在（需要在 CI 中配置）"
fi

# 8. 检查 Git 配置
log_check "检查 Git 配置"

if [ -d ".git" ]; then
    log_pass "Git 仓库存在"
    
    if command -v git &> /dev/null; then
        branch=$(git branch --show-current 2>/dev/null || echo "unknown")
        log_info "当前分支：$branch"
    fi
else
    log_fail "不是 Git 仓库"
fi

# 总结
echo ""
echo "=========================================="
echo "  检查结果"
echo "=========================================="
echo -e "  总检查数：${check_count}"
echo -e "  ${GREEN}通过：${pass_count}${NC}"
echo -e "  ${RED}失败：${fail_count}${NC}"
echo ""

if [ $fail_count -eq 0 ]; then
    echo -e "${GREEN}✅ 所有检查通过！${NC}"
    echo ""
    echo "下一步："
    echo "1. 在 GitHub 配置 Secrets（参考 .github/SECRETS.md）"
    echo "2. 推送代码到 GitHub"
    echo "3. 在 GitHub Actions 中查看构建状态"
    exit 0
else
    echo -e "${RED}❌ 存在失败项，请修复后重试${NC}"
    exit 1
fi
