"use client";
// src/app/shop/checkout/page.tsx
// 结算页：全球 250 个国家/地区可选 + 目的国实时运费试算 + 真实收银台
// 金额一律以服务端返回为准（前端不参与定价）。
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useCurrency } from '@/lib/shop-currency';
import Link from 'next/link';
import { trackFunnel } from '../_funnel';

interface CartItem {
  id: number | string;
  sku: string;
  vid?: string;
  variantName?: string;
  name: string;
  price: number;
  qty: number;
  img: string;
}
interface Country { code: string; zh: string; en: string }
interface FreightOption {
  logisticName: string; price: number; agingLabel: string;
  recommended: boolean; cheapest: boolean; fastest: boolean;
}
interface QuoteItem {
  sku: string; vid?: string | null; variantName?: string | null; name: string;
  qty: number; price: number; lineTotal: number; image: string;
}
interface Quote {
  ok: boolean;
  items: QuoteItem[];
  subtotal: number;
  totalQty: number;
  shipping: { ok: boolean; options: FreightOption[]; error: string | null; cached: boolean };
  note: string;
}
interface PayResult {
  provider: string;
  mode: 'redirect' | 'manual';
  url?: string;
  reference: string;
  amountUsd: number;
  charge?: { currency: string; amount: number };
  instructions?: { title: string; lines: string[]; whatsapp: string; wechat: string };
  error?: string;
}

const WHATSAPP = 'https://wa.me/233248009090';

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    trackFunnel("checkout"); // 进入结算页
  }, []);

  const [countries, setCountries] = useState<{ hot: Country[]; all: Country[] }>({ hot: [], all: [] });
  const [countryQuery, setCountryQuery] = useState('');

  const [form, setForm] = useState({
    name: '', email: '', phone: '',
    address: '', address2: '', city: '', province: '', zip: '', countryCode: 'GH',
  });

  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [logistic, setLogistic] = useState('');

  const [busy, setBusy] = useState(false);
  const { fmt } = useCurrency();
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState<{ order_no: string; total: number; pay: PayResult } | null>(null);
  // guest 升级注册状态：idle | busy | done | exists | error
  const [upgrade, setUpgrade] = useState<{ status: string; msg?: string; linked?: number }>({ status: 'idle' });

  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem('cart') || '[]')); } catch { setCart([]); }
    setMounted(true);

    // ---- 默认目的国：用户偏好（localStorage） > IP 自动判断 > GH ----
    let pref: string | null = null;
    try { pref = localStorage.getItem('szspd_country'); } catch {}
    if (pref && /^[A-Z]{2}$/.test(pref)) {
      setForm((f) => ({ ...f, countryCode: pref }));
      return;
    }
    // 与货币同一套 IP 判断（/api/shop/currency 返回 ipCountry）
    fetch('/api/shop/currency', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        const cc = String(j?.ipCountry || '').toUpperCase();
        if (/^[A-Z]{2}$/.test(cc)) setForm((f) => ({ ...f, countryCode: cc }));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/cj/countries')
      .then((r) => r.json())
      .then((j) => { if (j?.ok) setCountries({ hot: j.hot || [], all: j.all || [] }); })
      .catch(() => {});
  }, []);

  const allCountries = useMemo(() => [...countries.hot, ...countries.all], [countries]);

  const searchResults = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return null;
    return allCountries
      .filter((c) => c.en.toLowerCase().includes(q) || c.zh.includes(countryQuery.trim()) || c.code.toLowerCase() === q)
      .slice(0, 80);
  }, [countryQuery, allCountries]);

  const selectedCountry = useMemo(
    () => allCountries.find((c) => c.code === form.countryCode),
    [allCountries, form.countryCode]
  );

  // ---- 目的国 / 购物车变化 → 服务端试算运费 ----
  const fetchQuote = useCallback(async (code: string) => {
    if (!code || cart.length === 0) { setQuote(null); return; }
    setQuoteLoading(true);
    setQuoteError('');
    try {
      const res = await fetch('/api/shop/checkout/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country: code,
          // vid 必须一起传：运费按变体试算，价格也按变体成本算
          items: cart.map((i) => ({ sku: i.sku, vid: i.vid || undefined, qty: i.qty })),
        }),
      });
      const j = await res.json();
      if (!j?.ok) {
        setQuote(null);
        setQuoteError(j?.error || '运费试算失败');
        return;
      }
      setQuote(j);
      const opts: FreightOption[] = j?.shipping?.options || [];
      if (!j.shipping?.ok) {
        setQuoteError(j.shipping?.error || '该目的地暂无可用物流渠道');
        setLogistic('');
      } else {
        const best = opts.find((o) => o.recommended) || opts[0];
        setLogistic((prev) => (opts.some((o) => o.logisticName === prev) ? prev : best?.logisticName || ''));
      }
    } catch (e) {
      setQuoteError(e instanceof Error ? e.message : String(e));
    } finally {
      setQuoteLoading(false);
    }
  }, [cart]);

  useEffect(() => {
    if (!mounted || cart.length === 0) return;
    const t = setTimeout(() => { void fetchQuote(form.countryCode); }, 350);
    return () => clearTimeout(t);
  }, [form.countryCode, cart, mounted, fetchQuote]);

  const shippingOption = useMemo(
    () => quote?.shipping?.options?.find((o) => o.logisticName === logistic) || null,
    [quote, logistic]
  );
  const subtotal = quote?.subtotal ?? cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shippingFee = shippingOption?.price ?? 0;
  const total = Math.round((subtotal + shippingFee) * 100) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (cart.length === 0) return;
    if (!quote?.shipping?.ok) {
      setError('请先选择配送国家并等待运费试算成功。');
      return;
    }
    if (!shippingOption) {
      setError('请选择物流方式。');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          shipping_address: {
            address: form.address, address2: form.address2, city: form.city,
            province: form.province, zip: form.zip,
            country: selectedCountry?.en || '', countryCode: form.countryCode,
          },
          items: cart.map((i) => ({ sku: i.sku, vid: i.vid || undefined, qty: i.qty })),
          logisticName: shippingOption.logisticName,
        }),
      });
      const j = await res.json();
      if (!j?.success) {
        setError(j?.error || '下单失败，请稍后再试。');
        return;
      }
      const pay: PayResult = j.payment || { provider: 'manual', mode: 'manual', reference: j.order_no, amountUsd: j.order?.total_amount || total };
      // 漏斗：发起支付（订单已创建，进入支付环节）
      trackFunnel("payment_start", {
        orderId: String(j.order_no || ""),
        amount: Number(j.order?.total_amount ?? total) || undefined,
      });
      localStorage.removeItem('cart');
      setCart([]);
      // 记下本单，供支付回跳后的确认页自查状态。
      // 不存价格等敏感信息，只存单号 + 下单邮箱（邮箱是查询订单的第二因子，
      // 服务端只认「单号 + 下单邮箱」这一对，缺一不可）。
      try {
        localStorage.setItem(
          'szspd_last_order',
          JSON.stringify({
            order_no: j.order_no,
            email: form.email,
            total: j.order?.total_amount ?? total,
            mode: pay.mode,
            provider: pay.provider,
            at: Date.now(),
          })
        );
      } catch {
        /* 隐私模式下写不了，不影响下单 */
      }
      if (pay.mode === 'redirect' && pay.url) {
        window.location.href = pay.url;
        return;
      }
      setPlaced({ order_no: j.order_no, total: j.order?.total_amount || total, pay });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  // ---------------- guest 一键升级注册（首次下单后，可用订单信息建号并登录） ----------------
  async function handleUpgrade() {
    if (!placed) return;
    setUpgrade({ status: 'busy' });
    try {
      const res = await fetch('/api/shop/checkout/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, order_no: placed.order_no, name: form.name }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.success) {
        setUpgrade({ status: j?.code === 'PASSWORD_ACCOUNT_EXISTS' ? 'exists' : 'error', msg: j?.error || '升级失败，请稍后再试' });
        return;
      }
      setUpgrade({ status: 'done', msg: j.created ? '账号已创建并登录' : '已登录', linked: j.linkedOrders ?? 0 });
    } catch {
      setUpgrade({ status: 'error', msg: '网络异常，请稍后再试' });
    }
  }

  if (!mounted) return null;

  // ---------------- 下单成功，等待付款 ----------------
  if (placed) {
    const ins = placed.pay.instructions;
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow p-6 sm:p-8">
          <div className="text-4xl mb-3">🧾</div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Order placed</h1>
          <p className="text-gray-600 mt-2 text-sm">
            Your order <b className="text-gray-900">{placed.order_no}</b> is reserved. Total
            <b className="text-gray-900"> {fmt(placed.total)}</b>.
          </p>

          {placed.pay.mode === 'manual' ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900 text-sm">{ins?.title || 'Payment instructions'}</p>
              <ul className="mt-2 space-y-1 text-[13px] text-amber-900">
                {(ins?.lines || []).map((l, i) => <li key={i}>• {l}</li>)}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <a href={WHATSAPP} target="_blank" rel="noreferrer"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                  Pay via WhatsApp {ins?.whatsapp || '+233 248 009 090'}
                </a>
                <a href="/shop" className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                  Continue shopping
                </a>
              </div>
              <p className="mt-3 text-[11px] text-amber-700">
                Online card / Mobile Money checkout will appear here automatically once the payment gateway keys are configured.
              </p>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Redirecting to the secure payment page…
            </div>
          )}

          {/* ---------------- Guest 一键升级注册 ---------------- */}
          <div className="mt-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5">
            {upgrade.status === 'idle' && (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Create your account in one tap</h2>
                    <p className="text-xs text-gray-600 mt-1">
                      Use your order info (<b>{form.email}</b>) to create an account — no password needed.
                      You'll be able to track this and future orders, and checkout faster next time.
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={handleUpgrade}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
                    Create account &amp; login
                  </button>
                  <button type="button"
                    onClick={() => setUpgrade({ status: 'skipped' })}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    Skip — continue as guest
                  </button>
                </div>
              </>
            )}

            {upgrade.status === 'busy' && (
              <p className="text-sm text-indigo-700">Creating your account…</p>
            )}

            {upgrade.status === 'done' && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <p className="font-semibold">{upgrade.msg}</p>
                <p className="mt-1 text-xs">
                  {upgrade.linked && upgrade.linked > 0
                    ? `${upgrade.linked} past order(s) linked to your account.`
                    : 'You can now track orders and check out faster.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/shop" className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                    Continue shopping
                  </Link>
                </div>
              </div>
            )}

            {upgrade.status === 'exists' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">This email already has an account</p>
                <p className="mt-1 text-xs">{upgrade.msg || 'Please sign in with your password to view your orders.'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/login" className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700">
                    Sign in with password
                  </Link>
                  <button type="button"
                    onClick={() => setUpgrade({ status: 'skipped' })}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    Continue as guest
                  </button>
                </div>
              </div>
            )}

            {upgrade.status === 'error' && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <p>{upgrade.msg}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={handleUpgrade}
                    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">
                    Retry
                  </button>
                  <button type="button"
                    onClick={() => setUpgrade({ status: 'skipped' })}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                    Skip
                  </button>
                </div>
              </div>
            )}

            {upgrade.status === 'skipped' && (
              <p className="text-xs text-gray-500">
                No problem — you can still shop as a guest anytime. This option will appear again after your next order.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🛒</div>
        <p className="text-gray-500 text-lg mb-4">Your cart is empty</p>
        <Link href="/shop" className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors">Shop Now</Link>
      </div>
    );
  }

  const options = quote?.shipping?.options || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Checkout</h1>
        <p className="text-xs text-gray-500 mb-6">We ship worldwide — 250+ countries and regions.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 联系人 */}
          <div className="bg-white rounded-xl shadow p-5 sm:p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Full Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Phone / WhatsApp *</label>
                <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+233 248 009 090"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
            </div>
          </div>

          {/* 收货地址 */}
          <div className="bg-white rounded-xl shadow p-5 sm:p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Shipping Address</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Country / Region *</label>
                <input value={countryQuery} onChange={(e) => setCountryQuery(e.target.value)}
                  placeholder="Search country… (e.g. Ghana, Nigeria, Kenya)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 mb-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <select
                  value={form.countryCode}
                  onChange={(e) => {
                    const cc = e.target.value;
                    setForm({ ...form, countryCode: cc });
                    try { localStorage.setItem('szspd_country', cc); } catch {}
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {searchResults ? (
                    <>
                      <option value="">— {searchResults.length} result(s) —</option>
                      {searchResults.map((c) => (
                        <option key={c.code} value={c.code}>{c.en} · {c.zh} ({c.code})</option>
                      ))}
                    </>
                  ) : (
                    <>
                      <optgroup label="Popular destinations">
                        {countries.hot.map((c) => <option key={c.code} value={c.code}>{c.en} · {c.zh} ({c.code})</option>)}
                      </optgroup>
                      <optgroup label={`All countries & regions (${countries.all.length})`}>
                        {countries.all.map((c) => <option key={c.code} value={c.code}>{c.en} · {c.zh} ({c.code})</option>)}
                      </optgroup>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Street Address *</label>
                <input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Apartment, suite, landmark (optional)</label>
                <input value={form.address2} onChange={(e) => setForm({ ...form, address2: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Region / State</label>
                  <input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}
                    placeholder="Ashanti"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">City *</label>
                  <input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">ZIP / Postcode</label>
                  <input value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
            </div>
          </div>

          {/* 物流方式 */}
          <div className="bg-white rounded-xl shadow p-5 sm:p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Delivery Method</h2>
            <p className="text-[11px] text-gray-500 mb-4">
              Live rates from our global fulfilment network to {selectedCountry?.en || '—'}.
            </p>

            {quoteLoading && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                Calculating shipping to {selectedCountry?.en || '…'}…
              </div>
            )}

            {!quoteLoading && quoteError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {quoteError}
                <div className="mt-2">
                  <a href={WHATSAPP} target="_blank" rel="noreferrer" className="text-emerald-700 underline font-medium">
                    Ask us on WhatsApp
                  </a>
                </div>
              </div>
            )}

            {!quoteLoading && !quoteError && options.length > 0 && (
              <div className="space-y-2">
                {options.map((o) => (
                  <label key={o.logisticName}
                    className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                      logistic === o.logisticName ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                    <input type="radio" name="logistic" className="mt-1" checked={logistic === o.logisticName}
                      onChange={() => setLogistic(o.logisticName)} />
                    <span className="flex-1 min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{o.logisticName}</span>
                        {o.recommended && <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Recommended</span>}
                        {o.cheapest && <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">Lowest price</span>}
                        {o.fastest && <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">Fastest</span>}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-500">Estimated delivery {o.agingLabel}</span>
                    </span>
                    <span className="text-sm font-bold text-gray-900">{fmt(Number(o.price))}</span>
                  </label>
                ))}
                {quote?.shipping?.cached && (
                  <p className="text-[11px] text-gray-400">Live carrier rates (cached up to 12 hours).</p>
                )}
              </div>
            )}
          </div>

          {/* 支付 */}
          <div className="bg-white rounded-xl shadow p-5 sm:p-6">
            <h2 className="font-semibold text-gray-800 mb-3">Payment</h2>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-medium text-gray-900">Pay securely at checkout</p>
              <p className="mt-1 text-xs text-gray-600">
                Card (Visa / Mastercard), Mobile Money (MTN MoMo, Telecel, AT Money), bank transfer or
                WhatsApp / WeChat arrangement — whatever suits your market.
              </p>
              <p className="mt-2 text-[11px] text-gray-500">
                🔒 Your order is recorded first, then you are taken to the payment step. We never charge before you confirm.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <button type="submit" disabled={busy || !shippingOption}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {busy ? 'Processing…' : `Place Order — ${fmt(total)}`}
          </button>
        </form>
      </div>

      {/* 订单摘要 */}
      <div>
        <div className="bg-white rounded-xl shadow p-5 sm:p-6 lg:sticky lg:top-24">
          <h2 className="font-semibold text-gray-800 mb-4">Order Summary</h2>
          <div className="space-y-3 mb-4">
            {(quote?.items || []).length > 0
              ? quote!.items.map((item) => (
                  <div key={item.sku} className="flex items-center gap-3">
                    {item.image ? <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-lg" /> : <div className="w-12 h-12 rounded-lg bg-gray-100" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      {item.variantName && (
                        <p className="text-[11px] text-gray-500">Option: {item.variantName}</p>
                      )}
                      <p className="text-xs text-gray-500">x{item.qty}</p>
                    </div>
                    <span className="text-sm font-bold">{fmt(item.lineTotal)}</span>
                  </div>
                ))
              : cart.map((item) => (
                  <div key={String(item.id)} className="flex items-center gap-3">
                    {item.img ? <img src={item.img} alt={item.name} className="w-12 h-12 object-cover rounded-lg" /> : <div className="w-12 h-12 rounded-lg bg-gray-100" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      {item.variantName && (
                        <p className="text-[11px] text-gray-500">Option: {item.variantName}</p>
                      )}
                      <p className="text-xs text-gray-500">x{item.qty}</p>
                    </div>
                    <span className="text-sm font-bold">{fmt(item.price * item.qty)}</span>
                  </div>
                ))}
          </div>
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span><span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Shipping{shippingOption ? ` · ${shippingOption.logisticName}` : ''}</span>
              <span>{quoteLoading ? '…' : shippingOption ? fmt(shippingFee) : '—'}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total</span><span className="text-indigo-600">{fmt(total)}</span>
            </div>
            {shippingOption && (
              <p className="text-[11px] text-gray-500">Estimated delivery {shippingOption.agingLabel} · {selectedCountry?.en}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
