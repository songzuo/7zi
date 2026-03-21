#!/bin/bash
# 版本工具脚本 - 基于 semver 和补零法

# 方案1: 补零法（快速，不依赖外部工具）
normalize_version() {
  local ver="$1"
  ver="${ver#v}"
  IFS='.' read -r -a parts <<< "$ver"
  while [ ${#parts[@]} -lt 3 ]; do parts+=("0"); done
  local normalized=""
  for p in "${parts[@]}"; do
    normalized+="$(printf "%03d" "$p")."
  done
  echo "${normalized%.}"
}

# 方案2: semver 比较（更可靠）
compare_versions() {
  local v1=$1
  local v2=$2
  local result=$(semver compare "$v1" "$v2" 2>/dev/null)
  echo "$result"
}

# 检查版本是否递增
is_version_newer() {
  local current=$1
  local minimum=$2
  local result=$(compare_versions "$current" "$minimum")
  if [[ "$result" == "1" ]]; then
    return 0  # current > minimum
  elif [[ "$result" == "0" ]]; then
    return 0  # equal
  else
    return 1  # current < minimum
  fi
}

# 主检查函数
check_dependencies() {
  echo "=== 依赖版本检查 ==="
  
  # Next.js
  NEXT_VER=$(grep '"next":' package.json | sed 's/.*"\^*\([0-9.]*\)".*/\1/')
  echo "📦 Next.js: $NEXT_VER"
  
  # next-intl
  NEXT_INTL_VER=$(grep '"next-intl":' package.json | sed 's/.*"\^*\([0-9.]*\)".*/\1/')
  echo "📦 next-intl: $NEXT_INTL_VER"
  
  # 兼容性检查
  echo ""
  echo "=== 兼容性检查 ==="
  
  # Next.js 16 需要 next-intl 4.x
  NEXT_MAJOR=$(echo $NEXT_VER | cut -d. -f1)
  if [[ "$NEXT_MAJOR" == "16" ]]; then
    NEXT_INTL_MAJOR=$(echo $NEXT_INTL_VER | cut -d. -f1)
    if [[ "$NEXT_INTL_MAJOR" != "4" ]]; then
      echo "❌ 警告: Next.js 16 推荐 next-intl 4.x，当前是 $NEXT_INTL_VER"
    else
      echo "✅ Next.js 16 + next-intl 4.x 兼容"
    fi
  fi
}

# 执行检查
check_dependencies
