import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { join } from "path";
import { WS_COOKIE, channelAccessToken } from "@/lib/cj-channel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 与 /internal/wholesale 同一道闸门：无口令一律 401，不吐任何业务数据 */
function denied() {
  return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
}

// 分析库（与 catalog 分开，避免单例冲突）
let _adb: Database.Database | null = null;
function analyticsDb(): Database.Database {
  if (_adb) return _adb;
  const dbPath = join(process.cwd(), "data", "cj-catalog.db");
  _adb = new Database(dbPath, { readonly: true, fileMustExist: false });
  _adb.pragma("journal_mode = WAL");
  return _adb;
}

function safeQuery<T>(fn: () => T, fallback: T): T {
  try { return fn(); } catch { return fallback; }
}

// ---------------------------------------------------------------------------
// 1. CJ API 点数消耗与收割进度（从 meta 表读取）
// ---------------------------------------------------------------------------
function getHarvestMeta() {
  return safeQuery(() => {
    const db = analyticsDb();
    const meta = db.prepare("SELECT key, value FROM meta").all() as { key: string; value: string }[];
    const map = new Map(meta.map((r) => [r.key, r.value]));
    return {
      lastSyncAt: map.get("lastSyncAt") || null,
      lastSyncOk: map.get("lastSyncOk") === "true",
      lastError: map.get("lastError") || null,
      pointsUsed: Number(map.get("pointsUsed") || "0"),
      pointsRemaining: map.get("pointsRemaining") ? Number(map.get("pointsRemaining")) : null,
      harvestCursor: map.get("fullSiteCursor") || map.get("incrCursor") || null,
      mode: map.get("lastMode") || "unknown",
      totalProducts: safeQuery(() => {
        const r = db.prepare("SELECT COUNT(*) c FROM products").get() as { c: number };
        return r.c;
      }, 0),
      visibleProducts: safeQuery(() => {
        const r = db.prepare("SELECT COUNT(*) c FROM visible_products").get() as { c: number };
        return r.c;
      }, 0),
    };
  }, { lastSyncAt: null, lastSyncOk: false, lastError: null, pointsUsed: 0, pointsRemaining: null, harvestCursor: null, mode: "unknown", totalProducts: 0, visibleProducts: 0 });
}

// ---------------------------------------------------------------------------
// 2. 订单漏斗（funnel_events 转化率）
// ---------------------------------------------------------------------------
function getFunnelStats() {
  return safeQuery(() => {
    const db = analyticsDb();
    const rows = db.prepare(`
      SELECT type, COUNT(*) cnt
      FROM funnel_events
      WHERE ts >= datetime('now', '-7 days')
      GROUP BY type
    `).all() as { type: string; cnt: number }[];
    const map = new Map(rows.map((r) => [r.type, r.cnt]));
    const visit = map.get("visit") || 0;
    const checkout = map.get("checkout") || 0;
    const paymentStart = map.get("payment_start") || 0;
    const paymentSuccess = map.get("payment_success") || 0;
    const paymentFail = map.get("payment_fail") || 0;
    return {
      visit,
      checkout,
      paymentStart,
      paymentSuccess,
      paymentFail,
      conversion: visit > 0 ? {
        visitToCheckout: Math.round((checkout / visit) * 1000) / 10,
        checkoutToPayment: checkout > 0 ? Math.round((paymentStart / checkout) * 1000) / 10 : 0,
        paymentToSuccess: paymentStart > 0 ? Math.round((paymentSuccess / paymentStart) * 1000) / 10 : 0,
        visitToSuccess: Math.round((paymentSuccess / visit) * 1000) / 10,
      } : null,
    };
  }, { visit: 0, checkout: 0, paymentStart: 0, paymentSuccess: 0, paymentFail: 0, conversion: null });
}

// ---------------------------------------------------------------------------
// 3. 商品分类分布（按 L1 聚合在售 SKU 数）
// ---------------------------------------------------------------------------
function getCategoryDistribution() {
  return safeQuery(() => {
    const db = analyticsDb();
    const rows = db.prepare(`
      SELECT
        l.l1Name AS name,
        COUNT(DISTINCT p.sku) AS skuCount
      FROM leaves l
      JOIN products p ON p.categoryId = l.leafId
      JOIN visible_products v ON v.sku = p.sku
      GROUP BY l.l1Name
      ORDER BY skuCount DESC
    `).all() as { name: string; skuCount: number }[];
    return rows;
  }, []);
}

// ---------------------------------------------------------------------------
// 4. 成本单 / 毛利审计（按 SKU 定价来源、成本区间）
// ---------------------------------------------------------------------------
function getCostAudit() {
  return safeQuery(() => {
    const db = analyticsDb();
    const total = db.prepare(`SELECT COUNT(*) c FROM visible_products`).get() as { c: number };
    // 按价格区间分布（这里 price 是零售价，成本区间需反推；简单展示价格带分布）
    const bands = db.prepare(`
      SELECT
        CASE
          WHEN price < 5 THEN '< $5'
          WHEN price < 10 THEN '$5–$10'
          WHEN price < 20 THEN '$10–$20'
          WHEN price < 50 THEN '$20–$50'
          ELSE '$50+'
        END band,
        COUNT(*) cnt,
        AVG(price) avgPrice,
        MIN(price) minPrice,
        MAX(price) maxPrice
      FROM products p
      JOIN visible_products v ON v.sku = p.sku
      WHERE price > 0
      GROUP BY band
      ORDER BY minPrice
    `).all() as { band: string; cnt: number; avgPrice: number; minPrice: number; maxPrice: number }[];
    return { totalProducts: total.c, bands };
  }, { totalProducts: 0, bands: [] });
}

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(WS_COOKIE)?.value || "";
  if (!cookie || cookie !== channelAccessToken()) return denied();

  try {
    const harvest = getHarvestMeta();
    const funnel = getFunnelStats();
    const categories = getCategoryDistribution();
    const cost = getCostAudit();

    return NextResponse.json({
      success: true,
      data: { harvest, funnel, categories, cost },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "dashboard query failed" },
      { status: 500 }
    );
  }
}
