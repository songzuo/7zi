#!/bin/bash

# 组件使用情况分析脚本

echo "=== 组件使用情况分析 ==="
echo ""

# 1. 列出所有组件文件
echo "1. 扫描所有组件文件..."
ALL_COMPONENTS=$(find src/components -type f \( -name "*.tsx" -o -name "*.ts" \) -not -path "*/__tests__/*" -not -path "*/node_modules/*" | sort)
COMPONENT_COUNT=$(echo "$ALL_COMPONENTS" | wc -l)
echo "   找到 $COMPONENT_COUNT 个组件文件"
echo ""

# 2. 分析每个组件的使用情况
echo "2. 分析组件引用情况..."
echo ""

# 创建临时文件记录结果
UNUSED_FILE="/tmp/unused_components.txt"
REFERENCED_FILE="/tmp/referenced_components.txt"
EMPTY_FILE="/tmp/empty_components.txt"
COMMENTED_FILE="/tmp/commented_code.txt"

> "$UNUSED_FILE"
> "$REFERENCED_FILE"
> "$EMPTY_FILE"
> "$COMMENTED_FILE"

while IFS= read -r component; do
  # 获取组件名（不含路径和扩展名）
  filename=$(basename "$component")
  component_name="${filename%.*}"

  # 获取相对路径
  rel_path=${component#src/components/}

  # 转换为可能的导入路径
  import_path1="${rel_path%.tsx}"
  import_path2="${rel_path%.ts}"
  import_path3="@/components/${import_path1}"

  # 搜索引用（排除组件自身和测试文件）
  ref_count=$(grep -r "from.*${import_path1}" src \
    --include="*.tsx" --include="*.ts" \
    --exclude-dir=__tests__ \
    --exclude-dir=node_modules \
    --exclude=".next" | grep -v "$component" | wc -l)

  if [ "$ref_count" -eq 0 ]; then
    # 检查是否是index文件（index文件通过目录名引用）
    if [[ "$filename" != "index.ts" && "$filename" != "index.tsx" ]]; then
      echo "$component" >> "$UNUSED_FILE"
    fi
  else
    echo "$component ($ref_count refs)" >> "$REFERENCED_FILE"
  fi

  # 检查空文件或只有console.log的文件
  line_count=$(wc -l < "$component")
  content=$(cat "$component")
  if [ "$line_count" -lt 5 ]; then
    # 检查是否是有效的组件文件
    if [[ ! "$content" =~ (export|import|interface|type|const) ]]; then
      echo "$component (可能为空)" >> "$EMPTY_FILE"
    fi
  fi

  # 检查是否有大量注释掉的代码（超过20行注释）
  commented_lines=$(grep -c "^[[:space:]]*\/\/" "$component" 2>/dev/null || echo 0)
  if [ "$commented_lines" -gt 20 ]; then
    echo "$component ($commented_lines commented lines)" >> "$COMMENTED_FILE"
  fi

done <<< "$ALL_COMPONENTS"

# 3. 输出结果
echo "=== 未被引用的组件 ==="
UNUSED_COUNT=$(wc -l < "$UNUSED_FILE" 2>/dev/null || echo 0)
if [ "$UNUSED_COUNT" -gt 0 ]; then
  cat "$UNUSED_FILE"
else
  echo "  未发现未被引用的组件"
fi
echo "   总计: $UNUSED_COUNT 个"
echo ""

echo "=== 可能为空的文件 ==="
if [ -s "$EMPTY_FILE" ]; then
  cat "$EMPTY_FILE"
else
  echo "  未发现明显为空的文件"
fi
echo ""

echo "=== 包含大量注释代码的文件 ==="
if [ -s "$COMMENTED_FILE" ]; then
  cat "$COMMENTED_FILE"
else
  echo "  未发现包含大量注释代码的文件"
fi
echo ""

echo "分析完成！详细结果保存在 /tmp/ 目录下"
