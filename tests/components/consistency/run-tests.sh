#!/bin/bash
# 组件一致性测试运行脚本

set -e

echo "🧪 运行组件一致性测试..."
echo ""

# 进入项目目录
cd "$(dirname "$0")/../../../"

# 运行一致性测试
echo "📊 运行测试套件："
echo "  1. ButtonVariantConsistency - 按钮变体一致性"
echo "  2. StyleUtilsConsistency - 样式工具一致性"
echo "  3. StateManagementConsistency - 状态管理一致性"
echo "  4. ComponentDeduplication - 组件去重一致性"
echo ""

npm test -- tests/components/consistency --run 2>&1

# 检查测试结果
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 所有一致性测试通过！"
    echo ""
    echo "📈 覆盖率报告："
    npm run test:coverage -- tests/components/consistency --run 2>&1 | grep -A 20 "Coverage report"
else
    echo ""
    echo "❌ 部分测试失败，请检查错误信息"
    exit 1
fi
