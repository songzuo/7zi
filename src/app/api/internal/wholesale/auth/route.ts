import { NextRequest, NextResponse } from "next/server";
import { channelAccessToken, WS_COOKIE } from "@/lib/cj-channel";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 查询当前浏览器是否已通过口令闸门 */
export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(WS_COOKIE)?.value || "";
  const expected = channelAccessToken();
  return NextResponse.json({ authed: !!cookie && cookie === expected });
}

/** 提交口令，换取 30 天有效的访问 cookie */
export async function POST(req: NextRequest) {
  let body: { token?: string } = {};
  try {
    body = await req.json();
  } catch {}
  const input = String(body?.token || "").trim();
  const expected = channelAccessToken();
  if (!input || input !== expected) {
    return NextResponse.json({ ok: false, error: "口令不正确" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(WS_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
