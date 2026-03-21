#!/bin/bash
# 版本检查脚本 - 基于您提供的方案

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

check_version() {
  local current=$1
  local minimum=$2
  local cur_norm=$(normalize_version "$current")
  local min_norm=$(normalize_version "$minimum")
  
  if [[ "$cur_norm" < "$min_norm" ]]; then
    echo "❌ 版本回退: $current < $minimum"
    return 1
  fi
  echo "✅ 版本正常: $current"
  return 0
}

# 检查 Node.js 版本
NODE_VERSION=$(node -v | sed 's/v//')
MIN_NODE="20.0.0"
check_version "$NODE_VERSION" "$MIN_NODE"

# 检查 package.json 中的 next 版本
NEXT_VERSION=$(grep '"next":' package.json | sed 's/.*"\^*\([0-9.]*\)".*/\1/')
echo "📦 Next.js 版本: $NEXT_VERSION"

# 检查 next-intl 版本
NEXT_INTL_VERSION=$(grep '"next-intl":' package.json | sed 's/.*"\^*\([0-9.]*\)".*/\1/')
echo "📦 next-intl 版本: $NEXT_INTL_VERSION"
