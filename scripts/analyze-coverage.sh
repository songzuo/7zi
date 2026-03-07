#!/bin/bash

echo "=== 分析 7zi-frontend 测试覆盖率 ==="
echo ""

# 获取所有源文件
echo "1. 统计源文件数量（排除测试文件）:"
find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/test/*" ! -name "*.test.ts" ! -name "*.test.tsx" | wc -l

echo ""
echo "2. 统计测试文件数量:"
find src -name "*.test.ts" -o -name "*.test.tsx" | wc -l

echo ""
echo "3. 关键模块测试覆盖情况:"

# 检查核心模块
echo "   - src/hooks:"
for hook in src/hooks/*.ts; do
    if [ -f "$hook" ]; then
        test_file="${hook%.*}.test.ts"
        if [ -f "$test_file" ]; then
            echo "     ✓ $(basename $hook) - 已测试"
        else
            echo "     ✗ $(basename $hook) - 缺少测试"
        fi
    fi
done

echo ""
echo "   - src/components:"
for comp in src/components/*.tsx; do
    if [ -f "$comp" ]; then
        base=$(basename "$comp" .tsx)
        test_file="src/test/components/${base}.test.tsx"
        if [ -f "$test_file" ]; then
            echo "     ✓ $(basename $comp) - 已测试"
        elif [ -f "src/components/${base}.test.tsx" ]; then
            echo "     ✓ $(basename $comp) - 已测试"
        else
            echo "     ✗ $(basename $comp) - 缺少测试"
        fi
    fi
done

echo ""
echo "4. 缺少测试的关键文件列表:"
echo "   (列出所有未测试的 .ts/.tsx 文件)"
find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/test/*" ! -name "*.test.ts" ! -name "*.test.tsx" | while read file; do
    base=$(basename "$file" | sed 's/\.[^.]*$//')
    if ! find src -name "${base}.test.ts" -o -name "${base}.test.tsx" | grep -q .; then
        echo "   - $file"
    fi
done | head -30
