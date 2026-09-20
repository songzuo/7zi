#!/bin/bash
# ============================================================================
# 店铺履约定时任务（szspd.cn）
# ----------------------------------------------------------------------------
# 每 10 分钟跑一次，把「客户已付款、但货款还没付给 CJ」的订单自动补齐：
#   1) auto-pay-pending —— 还没转 CJ 的建单（payType=1，拿到支付链接），
#                          已建过 CJ 单的**绝不重复建单**，直接续付款。
#   2) cj-pay-sync      —— 核验货款到底付上没有（覆盖三种收敛场景）：
#                          · 站长在 CJ 收银台网页上付完了 → 自动标记已付清
#                          · CJ 余额刚充值到账 → 自动扣款
#                          · 上次付款失败 → 重试
# 每 30 分钟顺带同步一次 CJ 侧物流状态，写回 cj_status 供内部通道查看。
#
# 为什么需要它：客户付款成功的那一刻若 CJ 余额不足（或还没配支付网关），
# 货款腿会停在「待付货款」。有了这个任务，站长无论是**给 CJ 充值**还是
# **点支付链接在 CJ 收银台付款**，都不需要再回系统点任何按钮 —— 下一轮自动收敛。
# ============================================================================
set -u

APP_DIR=/root/7zi-project
PORT=3006
TOKEN_FILE="$APP_DIR/data/wholesale-token.txt"
LOG="$APP_DIR/logs/shop-fulfill.log"

mkdir -p "$APP_DIR/logs"
[ -f "$TOKEN_FILE" ] || { echo "$(date '+%F %T') 缺少口令文件，跳过" >> "$LOG"; exit 0; }
TOKEN=$(tr -d '\r\n' < "$TOKEN_FILE")
[ -n "$TOKEN" ] || exit 0

log_size=$(stat -c%s "$LOG" 2>/dev/null || echo 0)
if [ "$log_size" -gt 2000000 ]; then
  tail -n 1500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

post() {
  curl -s -m 180 -X POST "http://127.0.0.1:$PORT/api/internal/wholesale" \
    -H 'Content-Type: application/json' \
    -H "Cookie: szspd_ws_gate=$TOKEN" \
    -d "$1"
}

STAMP=$(date '+%F %T')

# ---- 1) 补单 + 补付货款（每轮）----
PAY_RESULT=$(post '{"action":"auto-pay-pending","limit":20}')
echo "[$STAMP] auto-pay-pending $PAY_RESULT" >> "$LOG"

# ---- 2) 核验货款支付腿（每轮，会跳过已付清的单，无谓调用很少）----
SYNC_PAY=$(post '{"action":"cj-pay-sync","limit":20}')
echo "[$STAMP] cj-pay-sync $SYNC_PAY" >> "$LOG"

# ---- 3) 同步 CJ 物流状态（每 30 分钟）----
MIN=$((10#$(date +%M)))
if [ $((MIN % 30)) -lt 10 ]; then
  SYNC_RESULT=$(post '{"action":"cj-status-sync","limit":10}')
  echo "[$STAMP] cj-status-sync $SYNC_RESULT" >> "$LOG"
fi

# ---- 4) 余额快照（留痕，便于事后追因）----
BAL=$(curl -s -m 60 "http://127.0.0.1:$PORT/api/internal/wholesale?action=balance" \
      -H "Cookie: szspd_ws_gate=$TOKEN")
echo "[$STAMP] balance $BAL" >> "$LOG" 2>/dev/null

exit 0
