#!/bin/bash
# 自动发布脚本 - 由 cron 调用

cd /root/7zi-project/7zi-frontend || exit 1

# 检查 git 状态
if ! git diff --quiet; then
  echo "有未提交更改，跳过"
  exit 0
fi

# 获取当前版本
VERSION=$(node -p "require('./package.json').version")
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "")

# 检查版本是否变化
if [ "$VERSION" = "$LAST_TAG" ]; then
  echo "版本无变化: $VERSION"
  exit 0
fi

echo "检测到新版本: $LAST_TAG → $VERSION"

# 运行测试
pnpm test:run || { echo "测试失败"; exit 1; }

# 构建
pnpm build || { echo "构建失败"; exit 1; }

# 调用发布脚本
cd /root/7zi-project
pnpm tsx scripts/publish.ts
