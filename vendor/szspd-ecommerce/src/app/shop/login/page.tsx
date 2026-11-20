'use client';

// /shop/login —— 商城登录
//   Tab 1「No-password」：邮箱直接免密登录（该邮箱有订单即可，无需订单号；架构简化）
//   Tab 2「Password」：邮箱 + 密码 → 标准密码登录（已有密码账号）
// 安全：email-login 仅在邮箱存在订单时放行；有密码账号的邮箱强制走密码登录（防冒用）；
//       限流 + 我的订单不返回地址/电话等 PII。
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
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // ---- No-password：仅邮箱 → 免密登录（有订单即放行）----
  async function handleGuestLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      setStatus('error');
      setError('Please enter the email you used at checkout.');
      return;
    }
    setStatus('busy');
    setError('');
    try {
      const res = await fetch('/api/shop/auth/email-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
        setError(j?.error || 'Sign-in failed. Please check your email.');
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
            No password needed — enter the email you used at checkout and we&apos;ll sign you in.
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
                autoComplete="email"
              />
            </div>
            <button
              type="submit"
              disabled={status === 'busy'}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {status === 'busy' ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-center text-[11px] text-gray-400">
              Works with any email that has placed an order.
            </p>
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
                autoComplete="email"
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
                autoComplete="current-password"
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
