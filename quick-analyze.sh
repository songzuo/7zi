#!/bin/bash

echo "=== 死代码清理分析报告 ==="
echo ""
echo "生成时间: $(date)"
echo ""

# 查找所有导出的函数/变量
echo "## 1. 分析 src/lib 中的导出"
echo ""

for file in src/lib/*.ts src/lib/**/*.ts 2>/dev/null | grep -v "\.test\.ts$" | head -30; do
  if [ -f "$file" ]; then
    echo "检查文件: $file"
  fi
done

echo ""
echo "分析完成！"
