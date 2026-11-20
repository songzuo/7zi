// src/app/api/cj/stock/route.ts
// 变体库存（二级懒加载）：GET ?sku=XXX[&vids=a,b,c]
// 详情渲染完再静默拉一次，用来禁掉缺货规格。6 小时缓存，避免被刷新打爆配额。
import { NextRequest, NextResponse } from "next/server";
import { getStock, readCachedStock, readCachedDetail } from "@/lib/cj-detail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const sku = (sp.get("sku") || "").trim();
  if (!sku) return NextResponse.json({ ok: false, error: "sku 必填" }, { status: 400 });

  const cached = readCachedStock(sku);
  if (cached) {
    return NextResponse.json({ ok: true, stock: cached.stock, cached: true, fetchedAt: cached.fetchedAt });
  }

  // vids 优先取请求参数；没给就从详情缓存里拿全部变体
  let vids = (sp.get("vids") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (vids.length === 0) {
    const hit = readCachedDetail(sku);
    vids = (hit?.detail.variants || []).map((v) => String(v.vid)).filter(Boolean);
  }
  if (vids.length === 0) {
    return NextResponse.json({ ok: true, stock: {}, cached: false, note: "没有可查的变体" });
  }

  try {
    const s = await getStock(sku, vids);
    return NextResponse.json({ ok: true, stock: s.stock, cached: !!s.cached });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), stock: {} },
      { status: 502 }
    );
  }
}
