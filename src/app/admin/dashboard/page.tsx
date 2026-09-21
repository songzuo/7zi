import type { Metadata } from "next";
import { cookies } from "next/headers";
import { WS_COOKIE, channelAccessToken } from "@/lib/cj-channel";
import Gate from "@/app/internal/wholesale/_gate-client";
import DashboardClient from "./_dashboard-client";

// 看板数据实时取库，且必须按请求校验口令 —— 不可静态化
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SZSPD Admin Dashboard",
  robots: { index: false, follow: false },
};

/**
 * 内部数据看板（站长自用）
 *
 * 与 /internal/wholesale 同一道闸门：cookie `szspd_ws_gate` 必须等于
 * data/wholesale-token.txt 的内容。未通过一律只渲染口令表单，不吐任何业务数据。
 */
export default async function AdminDashboardPage() {
  const jar = await cookies();
  const token = jar.get(WS_COOKIE)?.value || "";
  const authed = !!token && token === channelAccessToken();

  if (!authed) {
    return (
      <Gate
        title="内部数据看板"
        hint="此页为站长内部数据看板（收割进度 / 订单漏斗 / 价格带），未对外开放，也不在任何导航中。请输入内部通道口令。"
      />
    );
  }

  return <DashboardClient />;
}
