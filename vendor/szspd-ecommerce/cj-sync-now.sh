#!/bin/bash
# 手动触发一次 CJ 目录收割/刷新（szspd Store）
# 用法： bash /root/cj-sync-now.sh [harvest|refresh|publish|status|curate]
# 默认 auto 模式
cd /root/7zi-project || exit 1

MODE=${1:-auto}
exec /usr/bin/node scripts/cj-catalog.mjs --mode="$MODE"
