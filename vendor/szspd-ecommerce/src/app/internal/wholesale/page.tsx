import type { Metadata } from "next";
import { cookies } from "next/headers";
import { WS_COOKIE, channelAccessToken } from "@/lib/cj-channel";
import Gate from "./_gate-client";
import Panel from "./_panel-client";
import ShopOrders from "./_shop-orders-client";
import PaySettings from "./_pay-settings-client";

export const dynamic = "force-dynamic";

// 内部测试页：明确要求搜索引擎不要收录，且站内没有任何入口链接指向它
export const metadata: Metadata = {
  title: "内部通道",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default async function WholesaleInternalPage() {
  const jar = await cookies();
  const token = jar.get(WS_COOKIE)?.value || "";
  const authed = !!token && token === channelAccessToken();
  return authed ? (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <ShopOrders />
      <PaySettings />
      <Panel />
    </div>
  ) : (
    <Gate />
  );
}
