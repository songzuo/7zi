// src/lib/cj-tracking.ts
// ============================================================================
// CJ 物流状态同步：为「我的订单」提供真实物流信息（状态 + 运单号 + 轨迹链接）
// ----------------------------------------------------------------------------
// 物流状态唯一可信来源是 CJ 订单详情接口（channelOrderDetail），本模块负责：
//   1) 冷却控制：同一订单 10 分钟内不重复打 CJ（避免订单页每次刷新都打上游）
//   2) 真实刷新：超冷却后调 CJ getOrderDetail → 解析 orderStatus / 运单号 → 写回本地
//   3) 批量同步：订单列表页一次最多刷新 syncLimit 单，其余返回缓存
// CJ 上游 1 QPS 由 cj-channel 的 paceUpstream（文件锁节拍器）统一保证。
// ============================================================================
import { getOrderByNo, updateOrderCjTracking, type ShopOrder } from './shop-db';
import { channelOrderDetail } from './cj-channel';

/** 单笔订单 CJ 状态冷却时间（毫秒）：10 分钟内不重复打上游 */
const SYNC_COOLDOWN_MS = 10 * 60 * 1000;

export interface CjSyncResult {
  ok: boolean;
  /** 是否真的调了 CJ（false = 冷却内返回缓存） */
  refreshed: boolean;
  orderNo: string;
  status?: string;
  statusLabel?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  error?: string;
}

function parseDetail(d: any): { status: string; trackingNumber: string; trackingUrl: string } {
  const status = String(d?.orderStatus || d?.status || '').toUpperCase();
  const trackingNumber = String(d?.trackNumber || d?.trackingNumber || d?.trackCode || '').trim();
  const trackingUrl = String(d?.trackingUrl || d?.trackLink || '').trim();
  return { status, trackingNumber, trackingUrl };
}

function lastSyncMs(order: ShopOrder): number {
  const at = order.cj_status_at || '';
  const t = Date.parse(at);
  return Number.isFinite(t) ? t : 0;
}

/**
 * 同步单个订单的 CJ 物流状态（冷却内直接返回本地缓存）
 */
export async function syncOrderCjStatus(
  order: ShopOrder,
  force = false
): Promise<CjSyncResult> {
  const orderNo = order.order_no;
  const cjOrderId = String(order.cj_order_id || '').trim();

  if (!cjOrderId) {
    return { ok: true, refreshed: false, orderNo, status: order.cj_status || '' };
  }

  // 冷却：距上次同步不足 10 分钟，直接返回本地状态
  if (!force && Date.now() - lastSyncMs(order) < SYNC_COOLDOWN_MS) {
    return {
      ok: true,
      refreshed: false,
      orderNo,
      status: order.cj_status || '',
      trackingNumber: order.cj_tracking_number || '',
      trackingUrl: order.cj_tracking_url || '',
    };
  }

  try {
    const detail = await channelOrderDetail(cjOrderId);
    if (!detail || detail.errorCode || detail.result === false) {
      return {
        ok: false,
        refreshed: true,
        orderNo,
        error: String(detail?.errorMessage || detail?.message || 'CJ 订单详情查询失败'),
      };
    }
    const data = detail.data || detail.result || detail;
    const { status, trackingNumber, trackingUrl } = parseDetail(data);

    await updateOrderCjTracking(orderNo, {
      status,
      trackingNumber,
      trackingUrl,
    });

    return {
      ok: true,
      refreshed: true,
      orderNo,
      status,
      trackingNumber,
      trackingUrl,
    };
  } catch (e: any) {
    return {
      ok: false,
      refreshed: true,
      orderNo,
      error: e?.message || String(e),
    };
  }
}

/**
 * 批量同步：按顺序逐个刷，最多刷 syncLimit 单（每单有 10 分钟冷却，重复请求不耗上游额度）
 */
export async function syncOrdersCjStatus(
  orders: ShopOrder[],
  syncLimit = 5
): Promise<CjSyncResult[]> {
  const results: CjSyncResult[] = [];
  let synced = 0;
  for (const order of orders) {
    const force = synced === 0; // 第一单（用户主动查看的最新单）强制刷新
    const r = await syncOrderCjStatus(order, force);
    if (r.refreshed) synced += 1;
    results.push(r);
    if (synced >= syncLimit) break;
  }
  return results;
}
