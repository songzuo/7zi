#!/bin/bash
# 测试优化验证脚本

set -e

echo "=========================================="
echo "🔍 测试优化配置验证"
echo "=========================================="
echo ""

# 检查配置文件
echo "1️⃣  检查配置文件..."
config_files=(
  "vitest.config.optimized.ts"
  "vitest.config.fast.ts"
  "vitest.config.normal.ts"
  "vitest.config.slow.ts"
)

for file in "${config_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file 存在"
  else
    echo "  ✗ $file 缺失"
    exit 1
  fi
done
echo ""

# 检查脚本文件
echo "2️⃣  检查脚本文件..."
script_files=(
  "scripts/analyze-test-complexity.js"
  "scripts/run-test-groups.js"
  "scripts/test-performance-benchmark.js"
)

for file in "${script_files[@]}"; do
  if [ -f "$file" ] && [ -x "$file" ]; then
    echo "  ✓ $file 存在且可执行"
  else
    echo "  ✗ $file 缺失或不可执行"
    exit 1
  fi
done
echo ""

# 检查文档文件
echo "3️⃣  检查文档文件..."
doc_files=(
  "TEST_OPTIMIZATION_SUMMARY.md"
  "TEST_OPTIMIZATION_REPORT.md"
  "TEST_OPTIMIZATION_QUICKSTART.md"
  "TEST_OPTIMIZATION_NPM_SCRIPTS.md"
)

for file in "${doc_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✓ $file 存在"
  else
    echo "  ✗ $file 缺失"
    exit 1
  fi
done
echo ""

# 检查数据文件
echo "4️⃣  检查分析数据..."
if [ -f "test-complexity-analysis.json" ]; then
  total=$(cat test-complexity-analysis.json | jq -r '.total')
  high=$(cat test-complexity-analysis.json | jq -r '.groups.high | length')
  medium=$(cat test-complexity-analysis.json | jq -r '.groups.medium | length')
  low=$(cat test-complexity-analysis.json | jq -r '.groups.low | length')

  echo "  ✓ 分析数据存在"
  echo "    - 总测试文件: $total"
  echo "    - 高复杂度: $high"
  echo "    - 中等复杂度: $medium"
  echo "    - 低复杂度: $low"
else
  echo "  ✗ test-complexity-analysis.json 缺失"
  exit 1
fi
echo ""

# 测试分组脚本
echo "5️⃣  测试分组脚本..."
if output=$(node scripts/run-test-groups.js list 2>&1); then
  if echo "$output" | grep -q "fast"; then
    echo "  ✓ 分组脚本工作正常"
  else
    echo "  ✗ 分组脚本输出异常"
    echo "  输出: $output"
    exit 1
  fi
else
  echo "  ✗ 分组脚本执行失败"
  exit 1
fi
echo ""

# 检查 vitest 安装
echo "6️⃣  检查 vitest..."
if npx vitest --version > /dev/null 2>&1; then
  version=$(npx vitest --version 2>/dev/null)
  echo "  ✓ Vitest 已安装 ($version)"
else
  echo "  ✗ Vitest 未安装或不可用"
  exit 1
fi
echo ""

# 检查备份
echo "7️⃣  检查配置备份..."
if [ ! -f "vitest.config.ts.backup" ]; then
  echo "  ⚠  建议创建备份: cp vitest.config.ts vitest.config.ts.backup"
fi
echo ""

echo "=========================================="
echo "✅ 验证完成！所有检查通过"
echo "=========================================="
echo ""
echo "🚀 快速开始："
echo ""
echo "  选项 1: 应用并行优化"
echo "    cp vitest.config.optimized.ts vitest.config.ts"
echo "    npm run test"
echo ""
echo "  选项 2: 运行分组测试"
echo "    node scripts/run-test-groups.js fast    # 快速测试"
echo "    node scripts/run-test-groups.js normal  # 常规测试"
echo "    node scripts/run-test-groups.js all     # 完整测试"
echo ""
echo "  选项 3: 性能基准测试"
echo "    node scripts/test-performance-benchmark.js"
echo ""
echo "📚 查看文档："
echo "  - TEST_OPTIMIZATION_SUMMARY.md     # 执行摘要"
echo "  - TEST_OPTIMIZATION_QUICKSTART.md   # 快速开始"
echo "  - TEST_OPTIMIZATION_REPORT.md      # 完整报告"
echo ""
