#!/bin/bash

# React Compiler 回滚脚本
# 用于快速禁用 React Compiler 并恢复构建

set -e

echo "========================================="
echo "React Compiler 快速回滚工具"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 备份配置文件
BACKUP_DIR=".backup/react-compiler"
BACKUP_FILE="$BACKUP_DIR/next.config.ts.backup-$(date +%Y%m%d-%H%M%S)"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 检查参数
ACTION=${1:-help}

case $ACTION in
  disable)
    echo -e "${YELLOW}🔧 禁用 React Compiler...${NC}"
    echo ""

    # 备份当前配置
    if [ -f "next.config.ts" ]; then
      echo -e "${BLUE}📦 备份当前配置...${NC}"
      cp "next.config.ts" "$BACKUP_FILE"
      echo -e "  ${GREEN}✅ 备份已保存到: $BACKUP_FILE${NC}"
      echo ""
    fi

    # 更新环境变量 (如果存在 .env 文件)
    if [ -f ".env" ]; then
      echo -e "${BLUE}🔧 更新 .env 文件...${NC}"
      sed -i.bak 's/^ENABLE_REACT_COMPILER=.*/ENABLE_REACT_COMPILER=false/' .env
      echo -e "  ${GREEN}✅ ENABLE_REACT_COMPILER 设置为 false${NC}"
      echo ""
    fi

    # 创建临时禁用配置
    echo -e "${BLUE}🔧 创建禁用配置...${NC}"
    cat > next.config.ts.disabled << 'EOF'
// React Compiler 已被禁用 (由回滚脚本生成)
// 原始配置已备份到: $BACKUP_FILE
// 恢复命令: ./scripts/rollback-react-compiler.sh restore

import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['avatars.githubusercontent.com', 'github'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    // ⚠️  React Compiler 已禁用
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
};

export default withNextIntl(nextConfig);
EOF

    # 备份原始配置并替换
    if [ -f "next.config.ts" ]; then
      cp "next.config.ts" "next.config.ts.backup-$(date +%Y%m%d-%H%M%S)"
      cp "next.config.ts.disabled" "next.config.ts"
      echo -e "  ${GREEN}✅ 配置已更新${NC}"
    fi

    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ React Compiler 已禁用${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "下一步操作:"
    echo -e "  1. 清理构建缓存: ${YELLOW}rm -rf .next${NC}"
    echo -e "  2. 重新构建: ${YELLOW}npm run build${NC}"
    echo -e "  3. 恢复编译器: ${YELLOW}./scripts/rollback-react-compiler.sh restore${NC}"
    echo ""
    ;;

  restore)
    echo -e "${YELLOW}🔧 恢复 React Compiler...${NC}"
    echo ""

    # 查找最新的备份
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/next.config.ts.backup-* 2>/dev/null | head -1)

    if [ -z "$LATEST_BACKUP" ]; then
      echo -e "${RED}❌ 未找到备份文件${NC}"
      echo -e "${YELLOW}⚠️  请手动恢复 next.config.ts${NC}"
      exit 1
    fi

    echo -e "${BLUE}📦 从备份恢复配置...${NC}"
    echo -e "  备份文件: $LATEST_BACKUP"
    cp "$LATEST_BACKUP" "next.config.ts"
    echo -e "  ${GREEN}✅ 配置已恢复${NC}"
    echo ""

    # 恢复环境变量
    if [ -f ".env.bak" ]; then
      echo -e "${BLUE}🔧 恢复 .env 文件...${NC}"
      mv ".env.bak" ".env"
      echo -e "  ${GREEN}✅ .env 已恢复${NC}"
      echo ""
    fi

    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✅ React Compiler 已恢复${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo -e "下一步操作:"
    echo -e "  1. 清理构建缓存: ${YELLOW}rm -rf .next${NC}"
    echo -e "  2. 重新构建: ${YELLOW}npm run build${NC}"
    echo ""
    ;;

  list)
    echo -e "${BLUE}📋 可用备份列表:${NC}"
    echo ""

    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR)" ]; then
      echo -e "${YELLOW}⚠️  没有找到备份文件${NC}"
      exit 0
    fi

    ls -lh "$BACKUP_DIR"/next.config.ts.backup-* 2>/dev/null || echo "没有备份文件"
    echo ""
    ;;

  clean)
    echo -e "${YELLOW}🧹 清理旧备份...${NC}"
    echo ""

    if [ -d "$BACKUP_DIR" ]; then
      backup_count=$(ls -1 "$BACKUP_DIR" | wc -l)
      echo -e "${BLUE}找到 $backup_count 个备份文件${NC}"
      read -p "确认删除所有备份? (y/N): " confirm

      if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm -rf "$BACKUP_DIR"
        echo -e "${GREEN}✅ 备份已清理${NC}"
      else
        echo -e "${YELLOW}⚠️  操作已取消${NC}"
      fi
    else
      echo -e "${YELLOW}⚠️  没有找到备份目录${NC}"
    fi
    echo ""
    ;;

  build)
    echo -e "${BLUE}🔨 测试构建...${NC}"
    echo ""

    # 清理缓存
    echo -e "${YELLOW}🧹 清理构建缓存...${NC}"
    rm -rf .next
    echo -e "  ${GREEN}✅ 缓存已清理${NC}"
    echo ""

    # 构建测试
    echo -e "${YELLOW}🔨 执行构建...${NC}"
    if npm run build; then
      echo ""
      echo -e "${GREEN}=========================================${NC}"
      echo -e "${GREEN}✅ 构建成功！${NC}"
      echo -e "${GREEN}=========================================${NC}"
    else
      echo ""
      echo -e "${RED}=========================================${NC}"
      echo -e "${RED}❌ 构建失败！${NC}"
      echo -e "${RED}=========================================${NC}"
      exit 1
    fi
    ;;

  status)
    echo -e "${BLUE}📊 React Compiler 状态:${NC}"
    echo ""

    # 检查环境变量
    echo -e "${YELLOW}环境变量:${NC}"
    if [ -f ".env" ]; then
      rc_enabled=$(grep "^ENABLE_REACT_COMPILER=" .env | cut -d'=' -f2)
      rc_mode=$(grep "^REACT_COMPILER_MODE=" .env | cut -d'=' -f2)
      echo "  ENABLE_REACT_COMPILER: ${BLUE}$rc_enabled${NC}"
      echo "  REACT_COMPILER_MODE: ${BLUE}$rc_mode${NC}"
    else
      echo "  ${YELLOW}⚠️  .env 文件不存在${NC}"
    fi
    echo ""

    # 检查配置文件
    echo -e "${YELLOW}配置文件:${NC}"
    if grep -q "reactCompiler:" next.config.ts 2>/dev/null; then
      echo "  状态: ${GREEN}已启用${NC}"
    else
      echo "  状态: ${YELLOW}已禁用${NC}"
    fi
    echo ""

    # 检查备份
    echo -e "${YELLOW}备份:${NC}"
    backup_count=$(ls -1 "$BACKUP_DIR"/next.config.ts.backup-* 2>/dev/null | wc -l)
    echo "  备份数量: ${BLUE}$backup_count${NC}"
    if [ "$backup_count" -gt 0 ]; then
      latest=$(ls -t "$BACKUP_DIR"/next.config.ts.backup-* 2>/dev/null | head -1)
      echo "  最新备份: ${BLUE}$latest${NC}"
    fi
    echo ""
    ;;

  help|--help|-h)
    echo "React Compiler 快速回滚工具"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  disable    禁用 React Compiler（创建备份并更新配置）"
    echo "  restore    恢复 React Compiler（从最新备份恢复）"
    echo "  list       列出所有备份文件"
    echo "  clean      清理所有备份文件"
    echo "  build      清理缓存并执行构建测试"
    echo "  status     显示 React Compiler 当前状态"
    echo "  help       显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 disable    # 禁用编译器"
    echo "  $0 restore    # 恢复编译器"
    echo "  $0 status     # 查看状态"
    echo ""
    ;;

  *)
    echo -e "${RED}❌ 未知命令: $ACTION${NC}"
    echo ""
    echo "使用 $0 help 查看帮助"
    exit 1
    ;;
esac
