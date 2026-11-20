"use client";

// 商城行为埋点客户端工具（轻量、节流、静默失败）
// 类型：detail（详情页访问）/ impression（列表曝光）/ cart（加购）
const QUEUE: { sku: string; type: string }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastFlush = 0;

function flush() {
  timer = null;
  if (QUEUE.length === 0) return;
  const batch = QUEUE.splice(0, QUEUE.length);
  fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: batch }),
    keepalive: true,
  }).catch(() => {});
}

/** 上报一条行为；节流合并：最多 1.5s 一次批量，页面卸载前尽力 keepalive 发送 */
export function trackEvent(sku: string, type: "detail" | "impression" | "cart") {
  if (!sku) return;
  QUEUE.push({ sku, type });
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
