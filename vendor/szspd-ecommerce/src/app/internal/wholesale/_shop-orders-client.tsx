"use client";
// 内部通道 · 店铺订单与货款支付面板
// 客户在 szspd.cn 下的单会落到这里：可以看到收款状态、一键确认收款（自动转 CJ）、
// 以及给 CJ 订单付货款（余额支付 / 支付链接）。
import { useCallback, useEffect, useState } from "react";

async function apiGet(params: Record<string, string | number>) {
  const sp = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const r = await fetch(`/api/internal/wholesale?${sp}`, { cache: "no-store" });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "请求失败");
  return j;
}

async function apiPost(body: Record<string, unknown>) {
  const r = await fetch("/api/internal/wholesale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (j.ok === false) throw new Error(j.error || "请求失败");
  return j;
}

interface ShopOrderItem { sku: string; name: string; quantity: number; unit_price: number; vid?: string; variant_name?: string }
interface ShopOrder {
  order_no: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  country_code: string;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  logistic_name: string;
  payment_status: string;
  payment_provider: string;
  fulfill_status: string;
  cj_order_id: string;
  cj_pay_url: string;
  cj_error: string;
  cj_status?: string;
  /** CJ 发货单号（CJ 开头），付款与物流追踪都用它 */
  cj_shipment_order_id?: string;
  cj_pay_id?: string;
  /** none / paying / awaiting / paid / failed */
  cj_pay_state?: string;
  /** balance = 余额扣款，page = CJ 收银台网页支付 */
  cj_pay_method?: string;
  cj_pay_amount?: number;
  cj_pay_at?: string;
  cj_pay_error?: string;
  created_at: string;
  items?: ShopOrderItem[];
}

const PAY_LABEL: Record<string, string> = {
  pending: "待收款",
  paid: "已收款",
  failed: "收款失败",
};
const FULFILL_LABEL: Record<string, string> = {
  pending: "未转单",
  awaiting_payment: "待付货款",
  "awaiting-payment": "待付货款",
  submitted: "已付款·待发货",
  failed: "转单失败",
};
// 「我方 → CJ」货款支付腿的展示名
const CJ_PAY_LABEL: Record<string, string> = {
  none: "未付货款",
  paying: "付款处理中",
  awaiting: "待付货款",
  paid: "货款已付清",
  failed: "付款失败",
};
const CJ_PAY_TONE: Record<string, string> = {
  none: "bg-zinc-100 text-zinc-600",
  paying: "bg-sky-100 text-sky-800",
  awaiting: "bg-amber-100 text-amber-800",
  paid: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-700",
};
const CJ_PAY_METHOD_LABEL: Record<string, string> = {
  balance: "CJ 余额扣款",
  page: "CJ 收银台支付",
};

export default function ShopOrders() {
  const [balance, setBalance] = useState<{ amount: number; freeze: number } | null>(null);
  const [mode, setMode] = useState<string>("");
  const [sandbox, setSandbox] = useState(false);
  const [lowBalanceUsd, setLowBalanceUsd] = useState(50);
  const [pricing, setPricing] = useState("");
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "warn"; text: string } | null>(null);

  const toast = (kind: "ok" | "err" | "warn", text: string) => setMsg({ kind, text });

  const loadBalance = useCallback(async () => {
    try {
      const j = await apiGet({ action: "balance" });
      setBalance(j.balance);
      setMode(j.mode);
      setSandbox(!!j.sandbox);
      if (j.lowBalanceUsd) setLowBalanceUsd(Number(j.lowBalanceUsd));
      if (j.pricing) setPricing(String(j.pricing));
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    }
  }, []);

  const loadShopOrders = useCallback(async () => {
    try {
      const j = await apiGet({ action: "shop-orders", size: 30 });
      setOrders(j.orders || []);
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void loadBalance();
    void loadShopOrders();
  }, [loadBalance, loadShopOrders]);

  async function doMarkPaid(o: ShopOrder) {
    setBusy(`paid-${o.order_no}`);
    try {
      const j = await apiPost({ action: "mark-paid", orderNo: o.order_no, provider: "manual" });
      const f = j.fulfill;
      toast(
        f && f.status === "skipped" ? "warn" : "ok",
        f?.message ? `已标记收款；${f.message}` : "已标记收款"
      );
      await loadShopOrders();
      await loadBalance();
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function doFulfill(o: ShopOrder) {
    setBusy(`ff-${o.order_no}`);
    try {
      const j = await apiPost({ action: "fulfill", orderNo: o.order_no });
      // status="skipped" 表示请求处理成功但没有实际转单（例如尚未收款），
      // 这种必须用 warn 而不是 ok，否则会被误读成「已发货」。
      const kind: "ok" | "err" | "warn" = !j.ok
        ? "err"
        : j.status === "skipped"
          ? "warn"
          : "ok";
      toast(kind, j.message || (j.ok ? "已提交 CJ" : j.error || "转单失败"));
      await loadShopOrders();
      await loadBalance();
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function doFulfillPending() {
    setBusy("pending");
    try {
      const j = await apiPost({ action: "fulfill-pending" });
      toast("ok", `扫描 ${j.scanned} 单，待补单 ${j.pending} 单，已处理 ${(j.results || []).length} 单`);
      await loadShopOrders();
      await loadBalance();
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  /**
   * 一键付清 CJ 货款。幂等：已付清的单再点也只会得到「未重复付款」。
   *   rail=auto    余额够就自动扣；不够自动降级为给支付链接
   *   rail=page    不动余额，直接给 CJ 收银台链接，由人工在页面上付
   *   rail=balance 只允许余额扣款，余额不够就明确报错
   */
  async function doPayCj(o: ShopOrder, rail: "auto" | "page" | "balance" = "auto") {
    if (!o.cj_order_id) {
      toast("err", "该订单还没有 CJ 订单号，请先转单");
      return;
    }
    setBusy(`pay-${o.order_no}`);
    try {
      const j = await apiPost({ action: "pay-cj", orderNo: o.order_no, rail });
      // awaiting-page 是「需要人工去 CJ 付款」，不是失败，但必须用 warn 让它显眼
      const kind: "ok" | "err" | "warn" = !j.ok ? "err" : j.outcome === "awaiting-page" ? "warn" : "ok";
      toast(kind, j.message || (j.ok ? "已处理" : j.error || "付款失败"));
      await loadShopOrders();
      await loadBalance();
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  /** 只读核验：直接问 CJ 这笔订单到底付了没（不写任何东西，可放心点） */
  async function doVerifyPay(o: ShopOrder) {
    setBusy(`verify-${o.order_no}`);
    try {
      const j = await apiGet({ action: "cj-pay-status", orderNo: o.order_no });
      const amt = Number(j.amountUsd || 0).toFixed(2);
      toast(
        j.paid ? "ok" : "warn",
        `CJ 侧状态 ${j.cjStatus || "未知"}：` +
          (j.paid ? `已付款（${j.paymentDate || "时间未知"}），应付 $${amt}` : `尚未付款，应付 $${amt}`) +
          `；本地记录「${CJ_PAY_LABEL[j.localState] || j.localState}」。`
      );
      await loadShopOrders();
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  /** 解除付款占位：付款请求卡死时把订单放回可重试状态（已付清的单不允许解锁） */
  async function doRelease(o: ShopOrder) {
    setBusy(`rel-${o.order_no}`);
    try {
      await apiPost({ action: "cj-pay-release", orderNo: o.order_no, note: "面板人工解除占位" });
      toast("warn", "已解除付款占位，可重新发起付款。");
      await loadShopOrders();
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  /**
   * 自动补付：与服务器定时任务走同一套逻辑 —— 扫「客户已付款但货款未付给 CJ」的单，
   *   · 还没转 CJ 的 → 建单（payType=1，拿到支付链接）
   *   · 已建 CJ 单的 → 绝不再建单，直接续付款
   *   · 网页支付已完成的 → 核验后自动标记为已付清
   * 定时任务每 10 分钟自动跑一次，这里给一个手动触发的入口。
   */
  async function doAutoPayPending() {
    setBusy("autopay");
    try {
      const j = await apiPost({ action: "auto-pay-pending", limit: 20 });
      const rows: Array<Record<string, unknown>> = j.results || [];
      const notDone = rows.filter((r) => r.status === "awaiting-payment" || r.status === "failed");
      const text =
        `扫描 ${j.scanned} 单 · 已付清 ${j.paid} 单` +
        (Number(j.awaiting) ? ` · 待人工付 ${j.awaiting} 单` : "") +
        (Number(j.failed) ? ` · 失败 ${j.failed} 单` : "") +
        (notDone.length ? `：` + notDone.map((r) => `${r.orderNo}(${r.status})`).join("、") : "");
      toast(notDone.length ? "warn" : "ok", text);
      await loadShopOrders();
      await loadBalance();
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  const totalPending = orders.filter((o) => o.fulfill_status !== "submitted" && o.payment_status === "paid").length;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-bold text-zinc-900">店铺订单 · 代发履约</h2>
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">
          履约模式：{mode || "-"}
        </span>
        {sandbox && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            沙盒模式（不产生真实订单与扣费）
          </span>
        )}
        {balance && (
          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            CJ 余额 ${balance.amount.toFixed(2)}
            {balance.freeze > 0 ? ` · 冻结 $${balance.freeze.toFixed(2)}` : ""}
          </span>
        )}
        <span className="flex-1" />
        <button
          onClick={() => void doAutoPayPending()}
          disabled={!!busy}
          className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
        >
          {busy === "autopay" ? "补付中…" : "自动补付货款"}
        </button>
        <button
          onClick={() => void doFulfillPending()}
          disabled={!!busy}
          className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          {busy === "pending" ? "补单中…" : `批量补单（${totalPending}）`}
        </button>
        <button
          onClick={() => { void loadShopOrders(); void loadBalance(); }}
          disabled={!!busy}
          className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          刷新
        </button>
      </div>

      <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">
        客户在店铺下单 → 收款成功后自动转 CJ 代发单，并**一次性付清货款**（
        <code className="rounded bg-zinc-100 px-1">CJ_FULFILL_MODE=auto</code>）。
        付货款有两条腿，系统自动选：
        <b>余额扣款</b>（余额够时全自动、无人值守）或
        <b>CJ 收银台支付</b>（余额不够时给出建单时抓到的支付链接，点一下用信用卡/PayPal 付清）。
        服务器定时任务每 10 分钟核验一次并补付，网页付完后会自动推进订单。
        {pricing ? ` 定价规则：${pricing}。` : ""}
      </p>

      {balance && balance.amount < lowBalanceUsd && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-900">
          ⚠️ CJ 账户余额仅 <b>${balance.amount.toFixed(2)}</b>，低于警戒线 ${lowBalanceUsd.toFixed(2)}。
          余额一旦小于本单应付额，系统就<b>不再尝试余额扣款</b>，改为给出建单时抓到的 CJ 收银台支付链接——
          需要你点一下链接，用信用卡 / PayPal 把货款付掉，订单才会进入发货流程。
          想恢复「客户付款后全自动发货」，到 CJ 后台给账户充值即可（充值只能由主人在 CJ 后台操作，系统无法代充）。
        </div>
      )}

      {msg && (
        <div
          className={`mb-3 rounded-md p-2 text-[11px] ${
            msg.kind === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : msg.kind === "warn"
                ? "bg-amber-50 text-amber-800"
                : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {orders.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 p-4 text-center text-[11px] text-zinc-400">
          还没有店铺订单。客户在 https://szspd.cn/shop 下单后会出现在这里。
        </p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div key={o.order_no} className="rounded-lg border border-zinc-200 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-zinc-900">{o.order_no}</span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">{o.country_code}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${o.payment_status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                  {PAY_LABEL[o.payment_status] || o.payment_status}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] ${o.fulfill_status === "submitted" ? "bg-indigo-100 text-indigo-800" : o.fulfill_status === "failed" ? "bg-red-100 text-red-700" : "bg-zinc-100 text-zinc-600"}`}>
                  {FULFILL_LABEL[o.fulfill_status] || o.fulfill_status}
                </span>
                {o.cj_status && (
                  <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-800">CJ 物流：{o.cj_status}</span>
                )}
                {o.cj_order_id && (
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${CJ_PAY_TONE[o.cj_pay_state || "none"] || "bg-zinc-100 text-zinc-600"}`}>
                    {CJ_PAY_LABEL[o.cj_pay_state || "none"] || o.cj_pay_state}
                    {o.cj_pay_method ? ` · ${CJ_PAY_METHOD_LABEL[o.cj_pay_method] || o.cj_pay_method}` : ""}
                    {Number(o.cj_pay_amount) > 0 ? ` $${Number(o.cj_pay_amount).toFixed(2)}` : ""}
                  </span>
                )}
                <span className="flex-1" />
                <span className="text-xs font-bold text-zinc-900">
                  ${Number(o.total_amount).toFixed(2)}
                  <span className="ml-1 text-[10px] font-normal text-zinc-400">
                    (货 ${Number(o.subtotal).toFixed(2)} + 运 ${Number(o.shipping_fee).toFixed(2)})
                  </span>
                </span>
              </div>

              <div className="mt-1.5 text-[11px] text-zinc-600">
                {o.customer_name} · {o.customer_email}
                {o.customer_phone ? ` · ${o.customer_phone}` : ""}
                {o.logistic_name ? ` · ${o.logistic_name}` : ""}
                <span className="ml-2 text-zinc-400">{o.created_at}</span>
              </div>

              {o.items && o.items.length > 0 && (
                <div className="mt-1 text-[11px] text-zinc-500">
                  {o.items
                    .map((it) => `${it.sku}${it.variant_name ? ` (${it.variant_name})` : ""} ×${it.quantity}`)
                    .join(" · ")}
                </div>
              )}

              {o.cj_error && (
                <div className="mt-1 rounded bg-red-50 px-2 py-1 text-[10px] text-red-700">{o.cj_error}</div>
              )}

              {o.cj_pay_error && o.cj_pay_state !== "paid" && (
                <div className="mt-1 rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-800">{o.cj_pay_error}</div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => void doMarkPaid(o)}
                  disabled={!!busy || o.payment_status === "paid"}
                  className="rounded border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
                >
                  {busy === `paid-${o.order_no}` ? "处理中…" : "标记收款"}
                </button>
                <button
                  onClick={() => void doFulfill(o)}
                  disabled={!!busy || o.fulfill_status === "submitted"}
                  className="rounded border border-indigo-300 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-800 hover:bg-indigo-100 disabled:opacity-40"
                >
                  {busy === `ff-${o.order_no}` ? "转单中…" : "转 CJ 代发"}
                </button>

                {o.cj_order_id && (
                  <>
                    <span className="font-mono text-[10px] text-zinc-500">
                      {o.cj_order_id}
                      {o.cj_shipment_order_id ? ` / ${o.cj_shipment_order_id}` : ""}
                    </span>

                    {o.cj_pay_state === "paid" ? (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                        ✓ 货款已付清{o.cj_pay_at ? ` · ${o.cj_pay_at}` : ""}
                      </span>
                    ) : (
                      <>
                        {/* 主按钮：一次点击把成本付清（余额够自动扣，不够自动给链接） */}
                        <button
                          onClick={() => void doPayCj(o, "auto")}
                          disabled={!!busy}
                          className="rounded border border-emerald-400 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
                        >
                          {busy === `pay-${o.order_no}` ? "付款中…" : "一键付清货款"}
                        </button>
                        <button
                          onClick={() => void doPayCj(o, "page")}
                          disabled={!!busy || !o.cj_pay_url}
                          title={o.cj_pay_url ? "不走余额，直接给 CJ 收银台链接" : "该单没有支付链接（早期 payType=3 建单，CJ 无法补发）"}
                          className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-40"
                        >
                          只用收银台
                        </button>
                      </>
                    )}

                    {o.cj_pay_url && o.cj_pay_state !== "paid" && (
                      <a
                        href={o.cj_pay_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-amber-400 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 hover:bg-amber-200"
                      >
                        → 去 CJ 支付页付款
                      </a>
                    )}

                    <button
                      onClick={() => void doVerifyPay(o)}
                      disabled={!!busy}
                      className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      {busy === `verify-${o.order_no}` ? "核验中…" : "核验付款状态"}
                    </button>

                    {o.cj_pay_state === "paying" && (
                      <button
                        onClick={() => void doRelease(o)}
                        disabled={!!busy}
                        className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                      >
                        {busy === `rel-${o.order_no}` ? "解锁中…" : "解除占位"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
