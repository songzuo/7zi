// src/app/api/cj/freight/route.ts
// 目的国运费试算（真实物流渠道 + 真实价格 + 时效）
// GET  ?sku=CJxxx&qty=1&to=GH            单商品
// POST { lines: [{sku, qty}], to: "GH" } 多商品合并试算（推荐，CJ 按整包重量计价）
import { NextRequest, NextResponse } from "next/server";
import { quoteFreight, quoteFreightMulti } from "@/lib/cj-geo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const sku = sp.get("sku") || "";
  const to = sp.get("to") || sp.get("country") || "";
  const qty = Number(sp.get("qty") || 1);

  if (!sku || !to) {
    return NextResponse.json({ ok: false, error: "缺少 sku 或 to（国家二字码）" }, { status: 400 });
  }

  try {
    const quote = await quoteFreight({ sku, quantity: qty, to });
    return NextResponse.json(quote, { status: quote.ok ? 200 : 422 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lines = Array.isArray(body?.lines) ? body.lines : [];
    const to = String(body?.to || body?.country || "");
    if (lines.length === 0 || !to) {
      return NextResponse.json({ ok: false, error: "缺少 lines 或 to" }, { status: 400 });
    }
    const quote = await quoteFreightMulti({
      to,
      lines: lines.map((l: any) => ({ sku: String(l?.sku || ""), vid: l?.vid, quantity: Number(l?.qty ?? l?.quantity ?? 1) })),
    });
    return NextResponse.json(quote, { status: quote.ok ? 200 : 422 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
