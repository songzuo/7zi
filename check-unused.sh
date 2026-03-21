#!/bin/bash

# 查找并修复常见的未使用变量问题
cd /root/.openclaw/workspace/7zi-project

echo "Checking for specific files with unused variables..."

# 检查 src/lib/data-import-export.ts
if grep -q "exportData" src/lib/data-import-export.ts; then
    echo "Found exportData in src/lib/data-import-export.ts"
fi

# 检查 src/components 目录
find src/components -name "*.tsx" -o -name "*.ts" | while read file; do
    # 检查特定的未使用导入
    if grep -q "import.*NextResponse" "$file"; then
        if ! grep -q "NextResponse\." "$file" && ! grep -q "new NextResponse" "$file"; then
            echo "Potential unused NextResponse in: $file"
        fi
    fi
done
