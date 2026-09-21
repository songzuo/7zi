'use client';

// /shop/orders —— 我的订单（登录态查看，含 CJ 物流状态）
import { useEffect, useState } from 'react';
import { useCurrency } from '@/lib/shop-currency';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OrderItemView {
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  variant_name?: string;
}

interface CjView {
  order_id: string;
  status: string;
  status_label: string;
  tracking_number: string;
  tracking_url: string;
  status_at: string;
}

interface OrderView {
  order_no: string;
  created_at: string;
  currency: string;
  total_amount: number;
  payment_status: string;
  order_status: string;
  fulfill_status: string;
  logistic_name: string;
  items: OrderItemView[];
  cj: CjView;
}

// 商城订单状态 → 徽章样式
function orderBadge(status: string): { label: string; cls: string } {
  const s = (status || '').toLowerCase();
  if (s === 'paid' || s === 'delivered') return { label: status, cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
  if (s === 'new') return { label: 'New', cls: 'bg-blue-100 text-blue-800 border-blue-200' };
  if (s === 'cancelled' || s === 'failed') return { label: status, cls: 'bg-red-100 text-red-700 border-red-200' };
  if (s === 'shipped' || s === 'processing') return { label: status, cls: 'bg-amber-100 text-amber-800 border-amber-200' };
  return { label: status || '—', cls: 'bg-zinc-100 text-zinc-600 border-zinc-200' };
}

function fmtDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'guest' | 'empty' | 'ready' | 'error'>('loading');
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [error, setError] = useState('');
  const { fmt } = useCurrency();

  async function load() {
    setState('loading');
    try {
      const res = await fetch('/api/shop/orders?mine=1', { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (res.status === 401 || j?.code === 'UNAUTHORIZED') {
        setState('guest');
        return;
      }
      if (!res.ok || !j?.success) {
        setState('error');
        setError(j?.error || '加载失败，请稍后重试');
        return;
      }
      const list: OrderView[] = j.orders || [];
      setOrders(list);
      setState(list.length ? 'ready' : 'empty');
    } catch {
      setState('error');
      setError('网络异常，请稍后重试');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- 未登录 ----------------
  if (state === 'guest') {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl">🔐</div>
        <h1 className="text-xl font-bold text-gray-900">Sign in to view your orders</h1>
        <p className="mt-2 text-sm text-gray-500">
          Use the email from your last checkout — no password needed. Your order history and tracking will show here.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/shop/login?next=/shop/orders"
            className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Sign in / Create account
          </Link>
          <Link
            href="/shop"
            className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  // ---------------- 加载中 ----------------
  if (state === 'loading') {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center text-sm text-gray-500">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
        Loading your orders…
      </div>
    );
  }

  // ---------------- 错误 ----------------
  if (state === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => load()}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // ---------------- 空 ----------------
  if (state === 'empty') {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-5xl mb-4">📦</div>
        <h1 className="text-xl font-bold text-gray-900">No orders yet</h1>
        <p className="mt-2 text-sm text-gray-500">Once you place an order, it will appear here with live tracking.</p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  // ---------------- 订单列表 ----------------
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-xs text-gray-500 mt-1">{orders.length} order(s) · live CJ tracking included</p>
        </div>
        <button
          onClick={() => load()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-4">
        {orders.map((o) => {
          const badge = orderBadge(o.order_status);
          return (
            <div key={o.order_no} className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
              {/* 头部：订单号 + 日期 + 金额 */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3">
                <div>
                  <span className="font-mono text-sm font-semibold text-gray-900">{o.order_no}</span>
                  <span className="ml-3 text-xs text-gray-400">{fmtDate(o.created_at)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                    {badge.label}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {fmt(Number(o.total_amount || 0))}
                  </span>
                </div>
              </div>

              {/* 商品明细 */}
              <div className="px-5 py-3">
                {o.items.map((it, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 py-1 text-sm">
                    <div className="min-w-0">
                      <span className="text-gray-800">{it.name}</span>
                      {it.variant_name ? (
                        <span className="ml-2 text-xs text-gray-400">{it.variant_name}</span>
                      ) : null}
                      <span className="ml-2 font-mono text-xs text-gray-400">{it.sku}</span>
                    </div>
                    <div className="shrink-0 text-gray-600">
                      {it.quantity} × {fmt(Number(it.unit_price || 0))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 物流状态（CJ 提供） */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-2xl bg-zinc-50 px-5 py-3 text-xs">
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                  <span className="font-semibold text-gray-800">
                    {o.cj?.status_label || 'Awaiting fulfilment'}
                  </span>
                  {o.logistic_name ? <span className="text-gray-400">· {o.logistic_name}</span> : null}
                </div>
                <div className="flex items-center gap-3">
                  {o.cj?.tracking_number ? (
                    o.cj.tracking_url ? (
                      <a
                        href={o.cj.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-indigo-600 hover:underline"
                      >
                        Track: {o.cj.tracking_number}
                      </a>
                    ) : (
                      <span className="font-mono text-gray-500">No. {o.cj.tracking_number}</span>
                    )
                  ) : (
                    <span className="text-gray-400">Tracking number will appear once shipped</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Tracked logistics data is provided by CJ Dropshipping and refreshed automatically.
      </p>
    </div>
  );
}
