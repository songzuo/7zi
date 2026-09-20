'use client';

// /shop/login —— 商城登录
//   Tab 1「No-password」：邮箱 + 最近订单号 → 免密登录/一键升级（guest 用户专用）
//   Tab 2「Password」：邮箱 + 密码 → 标准密码登录（已有密码账号）
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Mode = 'guest' | 'password';
type Status = 'idle' | 'busy' | 'error' | 'need-password';

export default function ShopLoginPage() {
  const router = useRouter();
  const [next, setNext] = useState('/shop/orders');
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const n = p.get('next');
      if (n && n.startsWith('/')) setNext(n);
    } catch {}
  }, []);

  const [mode, setMode] = useState<Mode>('guest');
  const [email, setEmail] = useState('');
  const [orderNo, setOrderNo] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  // ---- 找回订单号 ----
  const [showLookup, setShowLookup] = useState(false);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lookupOrders, setLookupOrders] = useState<Array<{ order_no: string; created_at: string; total_amount: number; currency: string }>>([]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const em = lookupEmail.trim().toLowerCase();
    if (!em) return;
    setLookupBusy(true);
    setLookupError('');
    setLookupOrders([]);
    try {
      const res = await fetch(`/api/shop/orders/lookup?email=${encodeURIComponent(em)}`, { cache: 'no-store' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        setLookupError(j?.error || 'Lookup failed. Please try again.');
      } else {
        setLookupOrders(j.orders || []);
        if ((j.orders || []).length === 0) setLookupError('No orders found for this email.');
      }
    } catch {
      setLookupError('Network error, please try again.');
    } finally {
      setLookupBusy(false);
    }
  }

  async function handleGuestLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !orderNo) {
      setStatus('error');
      setError('Please enter both your email and the order number from your last checkout.');
      return;
    }
    setStatus('busy');
    setError('');
    try {
      const res = await fetch('/api/shop/checkout/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, order_no: orderNo }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        if (j?.code === 'PASSWORD_ACCOUNT_EXISTS') {
          setMode('password');
          setStatus('need-password');
          setInfo('This email already has a password account. Sign in with your password below.');
          return;
        }
        setStatus('error');
        setError(j?.error || 'Sign-in failed. Please check your email and order number.');
        return;
      }
      setStatus('idle');
      router.replace(next);
      router.refresh();
    } catch {
      setStatus('error');
      setError('Network error, please try again.');
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setStatus('error');
      setError('Please enter your email and password.');
      return;
    }
    setStatus('busy');
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        setStatus('error');
        setError(j?.error?.message || j?.error || 'Wrong email or password.');
        return;
      }
      setStatus('idle');
      router.replace(next);
      router.refresh();
    } catch {
      setStatus('error');
      setError('Network error, please try again.');
    }
  }

  const inputCls =
    'w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300';

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-zinc-200">
        <h1 className="text-xl font-bold text-gray-900 text-center">Welcome back</h1>
        <p className="mt-1 text-center text-xs text-gray-500">
          Sign in to view your orders with live tracking
        </p>

        {/* Tab 切换 */}
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-zinc-100 p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => { setMode('guest'); setError(''); setInfo(''); }}
            className={`rounded-lg py-2 transition-colors ${mode === 'guest' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            No-password
          </button>
          <button
            type="button"
            onClick={() => { setMode('password'); setError(''); setInfo(''); }}
            className={`rounded-lg py-2 transition-colors ${mode === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Password
          </button>
        </div>

        {/* 提示条 */}
        {mode === 'guest' && status !== 'need-password' ? (
          <p className="mt-4 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
            No password needed — sign in with the email and order number from your last purchase.
          </p>
        ) : null}
        {info ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{info}</p>
        ) : null}
        {status === 'error' ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        ) : null}

        {mode === 'guest' ? (
          <form onSubmit={handleGuestLogin} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Order number</label>
              <input
                required
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                className={inputCls}
                placeholder="e.g. SZ20260920XXXX"
              />
              <div className="mt-1 text-right">
                <button
                  type="button"
                  onClick={() => { setShowLookup(v => !v); setLookupError(''); setLookupOrders([]); }}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  {showLookup ? 'Hide' : 'Forgot your order number?'}
                </button>
              </div>
            </div>

            {showLookup && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                <p className="mb-2 text-xs text-gray-600">
                  Enter your email and we&apos;ll show your recent order numbers — pick one to fill the field above.
                </p>
                <form onSubmit={handleLookup} className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    className={inputCls}
                    placeholder="you@example.com"
                  />
                  <button
                    type="submit"
                    disabled={lookupBusy}
                    className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {lookupBusy ? '…' : 'Find'}
                  </button>
                </form>
                {lookupError && <p className="mt-2 text-xs text-red-600">{lookupError}</p>}
                {lookupOrders.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {lookupOrders.map((o) => (
                      <li key={o.order_no}>
                        <button
                          type="button"
                          onClick={() => {
                            setOrderNo(o.order_no);
                            setShowLookup(false);
                            setLookupOrders([]);
                          }}
                          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-left text-xs transition-colors hover:border-indigo-300 hover:bg-indigo-50"
                        >
                          <span className="font-mono font-semibold text-gray-800">{o.order_no}</span>
                          <span className="float-right text-gray-500">
                            {new Date(o.created_at).toLocaleDateString()} · {Number(o.total_amount || 0).toFixed(2)} {o.currency || 'USD'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <button
              type="submit"
              disabled={status === 'busy'}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {status === 'busy' ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordLogin} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'busy'}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {status === 'busy' ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        <div className="mt-6 border-t border-zinc-100 pt-4 text-center">
          <p className="text-xs text-gray-500">
            Just shopping?{' '}
            <Link href="/shop" className="text-indigo-600 hover:underline">
              Continue as guest
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
