"use client";

// 会话级漏斗埋点（访问 → 结算 → 发起支付 → 支付结果）
// 与 sku_events（商品级热度）互补：funnel_events 回答"转化率"，sku_events 回答"哪些商品热"。
const SID_KEY = "szspd_sid";
const QUEUE: { type: string; orderId?: string; amount?: number }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastFlush = 0;

function getSessionId(): string {
  try {
    let sid = localStorage.getItem(SID_KEY);
    if (!sid) {
      sid =
        "s_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 10);
      localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return "s_" + Date.now().toString(36);
  }
}

function flush() {
  timer = null;
  if (QUEUE.length === 0) return;
  const batch = QUEUE.splice(0, QUEUE.length);
  fetch("/api/analytics/funnel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: getSessionId(), events: batch }),
    keepalive: true,
  }).catch(() => {});
}

/** 上报漏斗事件（节流批量，页面卸载前 keepalive 尽力发送） */
export function trackFunnel(
  type: "visit" | "checkout" | "payment_start" | "payment_success" | "payment_fail",
  opts?: { orderId?: string; amount?: number }
) {
  QUEUE.push({ type, orderId: opts?.orderId, amount: opts?.amount });
  const now = Date.now();
  if (timer) return;
  if (now - lastFlush >= 1500) {
    lastFlush = now;
    flush();
  } else {
    timer = setTimeout(() => {
      lastFlush = Date.now();
      flush();
    }, 1500 - (now - lastFlush));
  }
}
