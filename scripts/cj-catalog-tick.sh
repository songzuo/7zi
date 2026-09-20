#!/bin/bash
# ============================================================================
# CJ 目录收割定时任务（szspd.cn）
# ----------------------------------------------------------------------------
# 每 10 分钟跑一次 cj-catalog.mjs auto 模式：
#   · 首轮未完 → harvest 续收（按叶子翻页，断点续传，点数感知）
#   · 首轮已完 → refresh 增量巡检 + publish 回写可见集
#
# 点数纪律（脚本内已内置，cron 只管定时触发）：
#   · 保底 4000 点（留给结账/运费/详情等运维调用）
#   · 单轮最多 60 页（≈3000 点，约 35 分钟回填量）
#   · 点数不足 → 落盘检查点、exit 0（干净退出，下轮继续）
#
# 日志：logs/cj-catalog.log（脚本内自己轮转）
# 状态：data/cj-catalog-status.json
# ============================================================================
set -u

APP_DIR=/root/7zi-project
LOG="$APP_DIR/logs/cj-catalog.log"

mkdir -p "$APP_DIR/logs"

cd "$APP_DIR" || exit 1

# 直接调用 node 跑 cj-catalog.mjs auto 模式
# 脚本自己管锁、管日志、管点数、管断点
/usr/bin/node scripts/cj-catalog.mjs --mode=auto --quiet

exit 0
