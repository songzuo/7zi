#!/bin/bash

# ============================================
# 环境变量检查脚本
# ============================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_env() {
    local file=$1
    local required_vars=(
        "NODE_ENV"
        "PORT"
    )
    
    local optional_vars=(
        "NEXT_PUBLIC_GA_ID"
        "NEXT_PUBLIC_UMAMI_ID"
        "NEXT_PUBLIC_UMAMI_URL"
        "RESEND_API_KEY"
        "CONTACT_EMAIL"
        "FROM_EMAIL"
        "NEXT_PUBLIC_SENTRY_DSN"
        "SENTRY_AUTH_TOKEN"
    )
    
    echo -e "${YELLOW}检查环境变量: $file${NC}"
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}✗ 文件不存在: $file${NC}"
        return 1
    fi
    
    # 检查必需变量
    echo ""
    echo "必需变量:"
    local missing_required=0
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" "$file" && [ -n "$(grep "^${var}=" "$file" | cut -d'=' -f2)" ]; then
            echo -e "${GREEN}✓${NC} $var"
        else
            echo -e "${RED}✗${NC} $var (缺失)"
            missing_required=1
        fi
    done
    
    # 检查可选变量
    echo ""
    echo "可选变量:"
    for var in "${optional_vars[@]}"; do
        if grep -q "^${var}=" "$file" && [ -n "$(grep "^${var}=" "$file" | cut -d'=' -f2)" ]; then
            echo -e "${GREEN}✓${NC} $var"
        else
            echo -e "${YELLOW}-${NC} $var (未配置)"
        fi
    done
    
    if [ $missing_required -eq 1 ]; then
        echo ""
        echo -e "${RED}缺少必需的环境变量！${NC}"
        return 1
    fi
    
    echo ""
    echo -e "${GREEN}环境变量检查通过${NC}"
    return 0
}

# 检查本地
if [ -f ".env.local" ]; then
    echo "========== 本地环境 =========="
    check_env ".env.local"
fi

# 检查生产
if [ -f ".env.production" ]; then
    echo ""
    echo "========== 生产环境 =========="
    check_env ".env.production"
fi

# 检查示例
if [ -f ".env.production.example" ]; then
    echo ""
    echo "========== 生产环境示例（供参考） =========="
    echo "复制 .env.production.example 为 .env.production 并填入实际值"
fi