// src/app/api/shop/checkout/quote/route.ts
// 结算报价：商品小计（服务端按变体成本定价）+ 目的国真实运费渠道
// ----------------------------------------------------------------------------
// 前端不参与任何金额计算，只传 sku + vid + qty。
// 定价与履约用同一个 vid：报价里的单价就是客户实付价，履约按同一 vid 发货，
// 两边不会出现"按 A 规格收钱、按 B 规格发货"的背离。
import { NextRequest, NextResponse } from "next/server";
import { quoteFreightMulti, countryByCode } from "@/lib/cj-geo";
import { priceLines } from "@/lib/shop-pricing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawItems: any[] = Array.isArray(body?.items) ? body.items : [];
    const code = String(body?.country || body?.countryCode || "").toUpperCase();

    if (rawItems.length === 0) {
      return NextResponse.json({ ok: false, error: "购物车为空" }, { status: 400 });
    }
    const country = countryByCode(code);
    if (!country) {
      return NextResponse.json({ ok: false, error: `请选择有效的配送国家（收到：${code || "空"}）` }, { status: 400 });
    }

    // ---- 1) 服务端定价（按变体成本，含加价规则）----
    const priced = await priceLines(
      rawItems.map((it) => ({
        sku: String(it?.sku || ""),
        vid: it?.vid ? String(it.vid) : undefined,
        qty: Number(it?.qty ?? it?.quantity) || 1,
      }))
    );

    if (priced.needsVariant?.length) {
      return NextResponse.json(
        {
          ok: false,
          error: `以下商品有多个规格，请先选择规格：${priced.needsVariant.join(", ")}`,
          code: "VARIANT_REQUIRED",
          needsVariant: priced.needsVariant,
        },
        { status: 422 }
      );
    }
    if (!priced.ok) {
      return NextResponse.json(
        { ok: false, error: `商品已下架或不在商品库中：${priced.missing.join(", ") || "未知"}` },
        { status: 422 }
      );
    }

    const items = priced.lines.map((l) => ({
      sku: l.sku,
      vid: l.vid,
      variantName: l.variantName,
      name: l.name,
      qty: l.qty,
      price: l.unitPrice,
      lineTotal: l.lineTotal,
      image: l.image,
      priceSource: l.priceSource,
    }));

    // ---- 2) 目的国真实运费（CJ 物流试算，按变体 vid 计费）----
    const quote = await quoteFreightMulti({
      to: code,
      lines: priced.lines.map((l) => ({ sku: l.sku, vid: l.vid, quantity: l.qty })),
    });

    return NextResponse.json({
      ok: true,
      country: { code: country.code, en: country.en, zh: country.zh },
      items,
      subtotal: priced.subtotal,
      totalQty: priced.totalQty,
      shipping: {
        ok: quote.ok,
        options: quote.options,
        error: quote.error || null,
        cached: quote.cached,
        quotedAt: quote.quotedAt,
      },
      missing: priced.missing.length ? priced.missing : undefined,
      degraded: priced.degraded.length ? priced.degraded : undefined,
      note: quote.ok
        ? `${country.zh} 共 ${quote.options.length} 条可用物流渠道，运费为上游实时试算价。`
        : `暂未取到 ${country.zh} 的物流渠道：${quote.error || "上游未返回"}`,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
