#!/bin/bash
# 环境变量验证脚本
# 用法：./scripts/validate-env.sh

set -e

echo "🔍 验证环境配置..."
echo ""

ERRORS=0
WARNINGS=0

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查函数
check_var() {
    local var_name=$1
    local var_value=${!var_name}
    local required=$2
    
    if [ -z "$var_value" ] || [[ "$var_value" == *"your_"* ]] || [[ "$var_value" == *"xxx"* ]]; then
        if [ "$required" == "required" ]; then
            echo -e "${RED}❌ [必需] $var_name 未配置${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠️  [可选] $var_name 未配置${NC}"
            ((WARNINGS++))
        fi
        return 1
    else
        echo -e "${GREEN}✅ $var_name 已配置${NC}"
        return 0
    fi
}

# 加载 .env 文件
if [ -f .env ]; then
    set -a
    source .env
    set +a
    echo -e "${GREEN}📄 已加载 .env 文件${NC}"
else
    echo -e "${RED}❌ .env 文件不存在${NC}"
    exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "必需配置检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_var "NODE_ENV" "required"
check_var "NEXT_PUBLIC_APP_URL" "required"
check_var "NEXT_PUBLIC_SITE_URL" "required"
check_var "NEXT_PUBLIC_EMAILJS_PUBLIC_KEY" "required"
check_var "NEXT_PUBLIC_EMAILJS_SERVICE_ID" "required"
check_var "NEXT_PUBLIC_EMAILJS_TEMPLATE_ID" "required"
check_var "RESEND_API_KEY" "required"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "可选配置检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_var "SLACK_WEBHOOK_URL" "optional"
check_var "ALERT_EMAIL_RECIPIENTS" "optional"
check_var "NEXT_PUBLIC_GA_ID" "optional"
check_var "NEXT_PUBLIC_UMAMI_URL" "optional"
check_var "REDIS_URL" "optional"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "验证结果"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ 发现 $ERRORS 个错误${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  发现 $WARNINGS 个可选配置未设置${NC}"
    echo -e "${GREEN}✅ 必需配置全部完成，可以启动开发服务器${NC}"
    exit 0
else
    echo -e "${GREEN}✅ 所有配置已完成！${NC}"
    exit 0
fi
