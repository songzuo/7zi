"use client";

import { useState } from "react";

export default function Gate() {
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/internal/wholesale/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (!j.ok) {
        setErr(j.error || "口令不正确");
        setBusy(false);
        return;
      }
      location.reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <span className="inline-flex h-6 items-center rounded bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 px-2 text-xs font-black tracking-widest text-white">
            SZ
          </span>
          <span className="text-sm font-semibold text-zinc-900">内部通道</span>
        </div>
        <p className="mb-6 text-xs leading-relaxed text-zinc-500">
          此页面为内部测试用的 CJ 代发通道，未对外开放，也不在任何导航中。请输入访问口令。
        </p>
        <label className="mb-1 block text-xs font-medium text-zinc-600">访问口令</label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoFocus
          className="mb-4 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-indigo-500"
          placeholder="粘贴口令"
        />
        {err && <p className="mb-3 text-xs text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={busy || !token}
          className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
        >
          {busy ? "校验中…" : "进入通道"}
        </button>
        <p className="mt-4 text-[11px] leading-relaxed text-zinc-400">
          口令存在服务器 <code className="rounded bg-zinc-100 px-1">data/wholesale-token.txt</code>，可随时更换（改文件即时生效）。
        </p>
      </form>
    </div>
  );
}
