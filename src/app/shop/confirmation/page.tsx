"use client";
// 支付回跳后的确认页
// ---------------------------------------------------------------------------
// 网关支付完成后会跳回 /shop/confirmation?order=SZ-xxxx。
// 这里做三件事：
//   1) 拉取订单真实状态（**收款是否到账由服务端说**，不靠前端假设）
//   2) 收款到账前自动轮询几次 —— 网关回调通常比跳转晚几秒到几十秒
//   3) 明确告诉客户下一步（已收到款 / 处理中 / 需要联系我们）
//
// 查询需要「单号 + 下单邮箱」一对（防枚举），邮箱从下单时写入的 localStorage 取。
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  variant_name?: string;
}

interface OrderView {
  order_no: string;
  customer_name: string;
  country_code: string;
  currency: string;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  logistic_name: string;
  payment_status: string;
  order_status: string;
  fulfill_status: string;
  created_at: string;
  items?: OrderItem[];
}

interface LastOrder {
  order_no: string;
  email: string;
  total?: number;
  mode?: string;
  provider?: string;
  at?: number;
}

export default function ConfirmationPage() {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [state, setState] = useState<'loading' | 'waiting' | 'paid' | 'notfound' | 'noorder'>('loading');
  const [tries, setTries] = useState(0);

  const load = useCallback(async (): Promise<boolean> => {
    let last: LastOrder | null = null;
    try {
      last = JSON.parse(localStorage.getItem('szspd_last_order') || 'null');
    } catch {
      last = null;
    }
    const qs = new URLSearchParams(window.location.search);
    const orderNo = qs.get('order') || qs.get('reference') || last?.order_no || '';
    const email = last?.email || '';

    if (!orderNo || !email) {
      setState('noorder');
      return true; // 不再轮询
    }
    try {
      const r = await fetch(
        `/api/shop/orders?order_no=${encodeURIComponent(orderNo)}&email=${encodeURIComponent(email)}`,
        { cache: 'no-store' }
      );
      if (r.status === 404) {
        setState('notfound');
        return true;
      }
      const j = await r.json();
      if (!j?.success) {
        setState('notfound');
        return true;
      }
      const o: OrderView = j.order;
      setOrder(o);
      if (o.payment_status === 'paid') {
        setState('paid');
        return true;
      }
      setState('waiting');
      return false;
    } catch {
      setState('waiting');
      return false;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    let n = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (!alive) return;
      const done = await load();
      n += 1;
      setTries(n);
      // 收款到账前轮询：最多 20 次，间隔从 2s 递增到 6s（约 1.5 分钟）
      if (!done && n < 20 && alive) {
        timer = setTimeout(tick, n < 5 ? 2000 : 6000);
      }
    };
    void tick();
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  const money = (v: number) => `$${(Number(v) || 0).toFixed(2)}`;

  const headline =
    state === 'paid'
      ? { icon: '✅', title: 'Payment received', tone: 'text-emerald-700' }
      : state === 'waiting'
        ? { icon: '⏳', title: 'Confirming your payment…', tone: 'text-amber-700' }
        : state === 'notfound'
          ? { icon: '🔎', title: 'Order not found', tone: 'text-zinc-800' }
          : state === 'noorder'
            ? { icon: '🎉', title: 'Order placed', tone: 'text-zinc-900' }
            : { icon: '⏳', title: 'Loading your order…', tone: 'text-zinc-500' };

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="text-center">
        <div className="mb-4 text-5xl">{headline.icon}</div>
        <h1 className={`mb-2 text-2xl font-bold ${headline.tone}`}>{headline.title}</h1>

        {state === 'paid' && (
          <p className="text-sm text-zinc-600">
            Thank you — we have received your payment and your order is now being prepared.
          </p>
        )}
        {state === 'waiting' && (
          <p className="text-sm text-zinc-600">
            Your bank or mobile money provider is still confirming this transaction. This page updates
            automatically — please keep it open for a moment.
            {tries > 0 && <span className="ml-1 text-zinc-400">(checked {tries}×)</span>}
          </p>
        )}
        {state === 'notfound' && (
          <p className="text-sm text-zinc-600">
            We could not match this order number with the email used at checkout. Please contact us on
            WhatsApp <b>+233 248 009 090</b> or WeChat <b>+86 133 1955 1131</b> and we will locate it.
          </p>
        )}
        {state === 'noorder' && (
          <p className="text-sm text-zinc-600">
            Thank you for your order. If you paid by mobile money or bank transfer, send us the receipt on
            WhatsApp <b>+233 248 009 090</b> and we will confirm and ship within 24h.
          </p>
        )}
      </div>

      {order && (
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 text-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-900">{order.order_no}</span>
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                order.payment_status === 'paid'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {order.payment_status === 'paid' ? 'Paid' : 'Awaiting payment'}
            </span>
            {order.payment_status === 'paid' && order.fulfill_status === 'submitted' && (
              <span className="rounded bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
                Preparing shipment
              </span>
            )}
          </div>

          <table className="w-full text-[12px]">
            <tbody>
              {(order.items || []).map((it) => (
                <tr key={`${it.sku}-${it.variant_name || ''}`} className="border-b border-zinc-100">
                  <td className="py-1.5 text-zinc-800">
                    {it.name}
                    {it.variant_name ? <span className="text-zinc-500"> · {it.variant_name}</span> : null}
                  </td>
                  <td className="py-1.5 text-right text-zinc-500">×{it.quantity}</td>
                  <td className="py-1.5 text-right text-zinc-800">{money(it.unit_price * it.quantity)}</td>
                </tr>
              ))}
              <tr>
                <td className="py-1.5 text-zinc-500" colSpan={2}>
                  Shipping {order.logistic_name ? `(${order.logistic_name})` : ''}
                </td>
                <td className="py-1.5 text-right text-zinc-800">{money(order.shipping_fee)}</td>
              </tr>
              <tr>
                <td className="py-2 font-semibold text-zinc-900" colSpan={2}>
                  Total
                </td>
                <td className="py-2 text-right font-semibold text-zinc-900">{money(order.total_amount)}</td>
              </tr>
            </tbody>
          </table>

          <p className="mt-3 text-[11px] text-zinc-400">
            Placed {order.created_at} · Shipping to {order.country_code || '—'}
          </p>
        </div>
      )}

      <div className="mt-8 space-y-3">
        <Link
          href="/shop"
          className="block rounded-xl bg-indigo-600 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
