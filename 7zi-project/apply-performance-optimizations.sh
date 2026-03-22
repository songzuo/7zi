#!/bin/bash

# 7zi-Frontend 性能优化应用脚本
# 用于一键应用所有性能优化配置

set -e

echo "=== 7zi-Frontend 性能优化应用脚本 ==="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目目录
PROJECT_DIR="/root/.openclaw/workspace/7zi-project"
cd "$PROJECT_DIR"

# 1. 备份当前配置
echo -e "${BLUE}1. 备份当前配置...${NC}"
if [ -f "next.config.ts" ] && [ ! -f "next.config.backup.ts" ]; then
    cp next.config.ts next.config.backup.ts
    echo -e "${GREEN}✓ 已备份 next.config.ts${NC}"
else
    echo -e "${YELLOW}⚠ next.config.backup.ts 已存在，跳过备份${NC}"
fi

if [ -f "src/middleware.ts" ] && [ ! -f "src/middleware.backup.ts" ]; then
    cp src/middleware.ts src/middleware.backup.ts
    echo -e "${GREEN}✓ 已备份 src/middleware.ts${NC}"
else
    echo -e "${YELLOW}⚠ src/middleware.backup.ts 已存在，跳过备份${NC}"
fi

echo ""

# 2. 应用优化配置
echo -e "${BLUE}2. 应用优化配置...${NC}"

if [ -f "next.config.optimized.ts" ]; then
    cp next.config.optimized.ts next.config.ts
    echo -e "${GREEN}✓ 已应用优化的 next.config.ts${NC}"
else
    echo -e "${RED}✗ 未找到 next.config.optimized.ts${NC}"
    exit 1
fi

# Middleware 优化（可选）
read -p "是否应用优化的 middleware？(y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ -f "src/middleware-optimized.ts" ]; then
        cp src/middleware-optimized.ts src/middleware.ts
        echo -e "${GREEN}✓ 已应用优化的 src/middleware.ts${NC}"
    else
        echo -e "${YELLOW}⚠ 未找到 src/middleware-optimized.ts${NC}"
    fi
fi

echo ""

# 3. 清理构建缓存
echo -e "${BLUE}3. 清理构建缓存...${NC}"
if [ -d ".next" ]; then
    rm -rf .next
    echo -e "${GREEN}✓ 已清理 .next 目录${NC}"
else
    echo -e "${YELLOW}⚠ .next 目录不存在${NC}"
fi

echo ""

# 4. 重新构建
echo -e "${BLUE}4. 重新构建项目...${NC}"
npm run build

echo ""

# 5. 运行性能对比测试
echo -e "${BLUE}5. 运行性能对比测试...${NC}"
if [ -f "performance-comparison-test.js" ]; then
    node performance-comparison-test.js
else
    echo -e "${YELLOW}⚠ 未找到 performance-comparison-test.js${NC}"
fi

echo ""
echo -e "${GREEN}=== 优化应用完成 ===${NC}"
echo ""
echo -e "${YELLOW}下一步操作:${NC}"
echo "1. 启动生产服务器: npm start"
echo "2. 使用 Lighthouse 验证性能: lighthouse http://localhost:3000 --view"
echo "3. 查看 Chrome DevTools Performance 面板"
echo ""
echo -e "${BLUE}备份文件:${NC}"
echo "  - next.config.backup.ts"
echo "  - src/middleware.backup.ts"
echo ""
echo -e "${YELLOW}如需回滚，执行:${NC}"
echo "  cp next.config.backup.ts next.config.ts"
echo "  cp src/middleware.backup.ts src/middleware.ts"
echo ""
