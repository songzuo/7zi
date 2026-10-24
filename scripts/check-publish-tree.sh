#!/usr/bin/env bash
# 发布树校验脚本 — 检查改动是否落在实际发布的前端树
#
# 背景: 仓库里有两棵前端树。
#   根 src/              (v1.14.2) ← 实际发布 (Dockerfile COPY . . + deploy.sh rsync)
#   7zi-frontend/src/    (v1.14.1) ← 旧副本, 不发布
# 代理经常把修复改在旧树上, 提交后线上毫无变化。
#
# 用法:
#   ./scripts/check-publish-tree.sh            # 检查工作区改动
#   ./scripts/check-publish-tree.sh --staged   # 检查已暂存改动
#   ./scripts/check-publish-tree.sh --sha <sha> # 检查某个 commit
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

MODE="${1:-worktree}"
SHA="${2:-}"

case "$MODE" in
  --sha)
    if [ -z "$SHA" ]; then echo "用法: $0 --sha <commit>"; exit 2; fi
    FILES=$(git show --name-only --format='' "$SHA" | sed '/^$/d')
    LABEL="commit $SHA"
    ;;
  --staged)
    FILES=$(git diff --cached --name-only | sed '/^$/d')
    LABEL="staged"
    ;;
  *)
    FILES=$(git status --porcelain | awk '{ $1=""; sub(/^ +/,""); print }' | sed '/^$/d')
    LABEL="worktree"
    ;;
esac

[ -z "$FILES" ] && { echo "✅ [$LABEL] 无文件改动"; exit 0; }

echo "=== [$LABEL] 改动文件 (共 $(echo "$FILES" | wc -l) 个) ==="

# 1) 旧副本树里的改动 —— 线上不生效
STALE=$(echo "$FILES" | grep '^7zi-frontend/' || true)
if [ -n "$STALE" ]; then
  echo ""
  echo "❌ 改到了旧副本树 7zi-frontend/ —— 这些改动【不会发布到线上】:"
  echo "$STALE" | sed 's/^/     /'
fi

# 2) commit 是否真的含源码文件
SRC_COUNT=$(echo "$FILES" | grep -cE '\.(ts|tsx|js|jsx)$' || true)
EMPTY_COMMIT=0
if [ "$MODE" = "--sha" ] && [ "$SRC_COUNT" -eq 0 ]; then
  echo ""
  echo "❌ 该 commit【没有任何源码文件】—— commit message 可能在说谎"
  echo "   (常见原因: 改动写在了旧副本树, 或被 revert 丢弃)"
  EMPTY_COMMIT=1
fi

# 3) 目标文件是否真的存在于发布树
echo ""
echo "--- 发布树存在性检查 ---"
MISSING=0
while IFS= read -r f; do
  case "$f" in
    src/*) ;;
    *) continue ;;
  esac
  if [ ! -f "$f" ]; then
    echo "   ⚠️  $f (被删除或改在别处)"
    MISSING=$((MISSING+1))
  fi
done <<< "$FILES"
[ "$MISSING" -eq 0 ] && echo "   ✅ 所有 src/ 路径均存在于发布树"

# 4) 结论
echo ""
if [ -n "$STALE" ]; then
  echo "🔴 结论: 不通过 —— 存在旧副本树改动, 线上不会生效。"
  exit 1
fi
if [ "$EMPTY_COMMIT" -eq 1 ]; then
  echo "🔴 结论: 不通过 —— commit 不含任何源码文件。"
  exit 1
fi
echo "🟢 结论: 通过 —— 改动均在发布树内。"
exit 0
