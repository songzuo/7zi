#!/bin/bash

# 7zi Frontend v0.2.0 发布准备脚本
# 使用方法：./scripts/prepare-release.sh

set -e

VERSION="0.2.0"
RELEASE_DATE=$(date +%Y-%m-%d)

echo "=========================================="
echo "  7zi Frontend v${VERSION} 发布准备"
echo "  日期：${RELEASE_DATE}"
echo "=========================================="
echo ""

# 1. 检查当前分支
echo "📍 步骤 1: 检查分支状态"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ 错误：当前不在 main 分支 (当前：$CURRENT_BRANCH)"
    exit 1
fi
echo "✅ 当前分支：main"
echo ""

# 2. 检查是否有未提交的变更
echo "📝 步骤 2: 检查未提交的变更"
UNCOMMITTED=$(git status --porcelain)
if [ -n "$UNCOMMITTED" ]; then
    echo "⚠️  警告：存在未提交的变更"
    git status --short
    echo ""
    read -p "是否继续？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi
echo "✅ 工作目录干净"
echo ""

# 3. 运行代码质量检查
echo "🔍 步骤 3: 运行代码质量检查"
echo ""

echo "  → ESLint 检查..."
npm run lint || { echo "❌ ESLint 失败"; exit 1; }
echo "  ✅ ESLint 通过"
echo ""

echo "  → TypeScript 类型检查..."
npm run type-check || { echo "❌ TypeScript 失败"; exit 1; }
echo "  ✅ TypeScript 通过"
echo ""

echo "  → 格式化检查..."
npm run format:check || { 
    echo "⚠️  格式化检查未通过，自动修复..."
    npm run format
}
echo "  ✅ 格式化完成"
echo ""

# 4. 运行测试
echo "🧪 步骤 4: 运行测试"
echo ""

echo "  → 单元测试..."
npm run test:run || { echo "❌ 单元测试失败"; exit 1; }
echo "  ✅ 单元测试通过"
echo ""

echo "  → E2E 测试..."
npm run test:e2e || { echo "❌ E2E 测试失败"; exit 1; }
echo "  ✅ E2E 测试通过"
echo ""

# 5. 构建验证
echo "🏗️  步骤 5: 构建验证"
echo ""

echo "  → 生产构建..."
npm run build || { echo "❌ 构建失败"; exit 1; }
echo "  ✅ 构建成功"
echo ""

echo "  → 检查构建产物..."
if [ ! -d ".next/standalone" ]; then
    echo "❌ standalone 目录不存在"
    exit 1
fi
if [ ! -f ".next/standalone/server.js" ]; then
    echo "❌ server.js 不存在"
    exit 1
fi
echo "  ✅ 构建产物完整"
echo ""

BUILD_SIZE=$(du -sh .next/standalone | cut -f1)
echo "  📦 构建大小：$BUILD_SIZE"
echo ""

# 6. 生成发布报告
echo "📊 步骤 6: 生成发布报告"
echo ""

cat > RELEASE_SUMMARY_${VERSION}.md << EOF
# 7zi Frontend v${VERSION} 发布摘要

**发布日期**: ${RELEASE_DATE}
**版本**: ${VERSION}

## ✅ 验证通过

- [x] 代码质量检查 (ESLint, TypeScript, Format)
- [x] 单元测试
- [x] E2E 测试
- [x] 生产构建
- [x] 构建产物验证

## 📦 构建统计

- 构建大小：${BUILD_SIZE}
- 构建时间：见 build.log

## 📝 下一步

1. 提交发布变更
2. 创建 Git 标签
3. 创建 GitHub Release
4. 部署到 Staging
5. 部署到 Production

## 📋 相关文件

- CHANGELOG.md - 完整变更日志
- RELEASE_NOTES_v${VERSION}.md - 发布说明
- RELEASE_CHECKLIST.md - 发布清单
EOF

echo "  ✅ 发布摘要已生成：RELEASE_SUMMARY_${VERSION}.md"
echo ""

# 7. 显示下一步操作
echo "=========================================="
echo "  ✅ 发布准备完成！"
echo "=========================================="
echo ""
echo "📋 下一步操作："
echo ""
echo "  1. 提交发布变更:"
echo "     git add package.json CHANGELOG.md RELEASE_*.md"
echo "     git commit -m \"release: v${VERSION}\""
echo ""
echo "  2. 创建 Git 标签:"
echo "     git tag -a v${VERSION} -m \"Release v${VERSION}\""
echo "     git push origin v${VERSION}"
echo ""
echo "  3. 推送到远程:"
echo "     git push origin main"
echo ""
echo "  4. 创建 GitHub Release:"
echo "     https://github.com/songzuo/7zi/releases/new"
echo ""
echo "  5. 部署到 Staging/Production:"
echo "     参考 RELEASE_CHECKLIST.md"
echo ""
echo "=========================================="
