// src/app/api/cj/countries/route.ts
// 全球配送目的地列表（对齐 CJ 附录3 国家代号）
// 说明：此前结算页把国家写死成 7 个，导致非洲等地区无法下单。
//       CJ 上游实际覆盖 250 个国家/地区，这里把完整清单交给前端。
import { NextResponse } from "next/server";
import { countriesForSelect, COUNTRIES } from "@/lib/cj-geo";

export const dynamic = "force-static";
export const revalidate = 86400;

export async function GET() {
  const { hot, all } = countriesForSelect();
  return NextResponse.json(
    { ok: true, total: COUNTRIES.length, hot, all },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } }
  );
}
