#!/bin/bash
# 任务：清理未使用的 exports 和 dead code

WORKSPACE="/root/.openclaw/workspace"
cd "$WORKSPACE"

echo "=== 1. 分析 exports 目录 ==="
echo "exports 目录数量: $(ls exports/ | wc -l)"
echo "总大小: $(du -sh exports/ | cut -f1)"

echo ""
echo "=== 2. 查找未使用的 lib 文件 ==="
# 找出 src/lib 下所有 ts 文件
find src/lib -name "*.ts" ! -name "*.test.ts" ! -name "*.spec.ts" -type f 2>/dev/null | head -30 > /tmp/lib_files.txt
echo "lib 文件数量: $(wc -l < /tmp/lib_files.txt)"

echo ""
echo "=== 3. 查找可能的 dead code ==="
# 检查是否有空或几乎为空的函数
for f in $(find src/lib -name "*.ts" ! -name "*.test.ts" -type f 2>/dev/null | head -10); do
  lines=$(wc -l < "$f")
  if [ "$lines" -lt 10 ]; then
    echo "小文件 ($lines lines): $f"
  fi
done

echo ""
echo "=== 4. 检查 console.log 语句 ==="
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" -c 2>/dev/null | grep -v ":0$" | sort -t: -k2 -rn | head -10

echo ""
echo "=== 5. 检查 TODO/FIXME ==="
grep -r "TODO\|FIXME\|XXX" src/ --include="*.ts" --include="*.tsx" -n 2>/dev/null | head -20
