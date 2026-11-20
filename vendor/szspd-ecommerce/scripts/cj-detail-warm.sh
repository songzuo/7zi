#!/bin/bash
# 详情缓存预热包装脚本（cron 用）
# 作用：夜间把全量商品详情/变体价预热进本地缓存，让列表价与详情价一致、商品页秒开。
# 约定：凌晨 02:30 启动，自带 3 小时时间预算与锁文件，不会与前台抢配额（共用 1 QPS 队列）。
set -u
cd /root/7zi-project || exit 0
export NODE_ENV=production
/usr/bin/node scripts/cj-detail-warm.mjs >> /root/7zi-project/logs/detail-warm.log 2>&1
