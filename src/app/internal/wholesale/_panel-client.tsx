"use client";

import { useCallback, useEffect, useState } from "react";

type Account = { userNum: string; name: string; email: string; balance: number; freeze: number };
type Product = { pid: string; sku: string; name: string; image: string; price: string; categoryPath: string; hasVideo: boolean };
type Variant = { vid: string; sku: string; name: string; image: string; price: number | null; weightGrams: number | null; dims: string };
type FreightOption = { logisticName: string; price: number | null; aging: string; priceCny: number | null };
type Order = {
  orderId: string;
  orderNumber: string;
  status: string;
  amount: number | null;
  countryCode: string;
  province: string;
  city: string;
  address: string;
  customer: string;
  trackingNumber: string;
  createdAt: string;
};
type LogEntry = { at: string; action: string; detail: string; mode?: string; result?: string };

const STATUS_CN: Record<string, string> = {
  CREATED: "已创建",
  IN_CART: "已加购",
  UNPAID: "待支付",
  UNSHIPPED: "待发货",
  SHIPPED: "已发货",
  DELIVERED: "已妥投",
  CANCELLED: "已取消",
};

const PRESET_GH = {
  shippingCustomerName: "SZSPD Test",
  shippingPhone: "+233248009090",
  shippingCountryCode: "GH",
  shippingCountry: "Ghana",
  shippingProvince: "Ashanti",
  shippingCity: "Kumasi",
  shippingAddress: "Plot 36, Block P, Fawoode",
  shippingZip: "AD-021-7690",
  houseNumber: "36",
  email: "",
};

const PRESET_CN = {
  shippingCustomerName: "SZSPD Test",
  shippingPhone: "+8613319551131",
  shippingCountryCode: "CN",
  shippingCountry: "China",
  shippingProvince: "Hunan",
  shippingCity: "Changsha",
  shippingAddress: "Room 10020, Tiandu Tower, Kaifu Avenue, Kaifu District",
  shippingZip: "410005",
  houseNumber: "10020",
  email: "",
};

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
  if (!j.ok) throw new Error(j.error || "请求失败");
  return j;
}

function Card({ n, title, hint, children }: { n: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex items-baseline gap-2">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-zinc-900 text-[11px] font-bold text-white">{n}</span>
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {hint && <span className="text-[11px] text-zinc-400">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <label className={wide ? "col-span-2 block" : "block"}>
      <span className="mb-0.5 block text-[11px] text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-xs text-zinc-900 outline-none focus:border-indigo-500"
      />
    </label>
  );
}

export default function Panel() {
  const [account, setAccount] = useState<Account | null>(null);
  const [mode, setMode] = useState<"sandbox" | "production">("sandbox");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [picked, setPicked] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [vid, setVid] = useState("");

  const [toCountry, setToCountry] = useState("GH");
  const [qty, setQty] = useState("1");
  const [freight, setFreight] = useState<FreightOption[]>([]);
  const [logistic, setLogistic] = useState("");

  const [form, setForm] = useState({ ...PRESET_GH });
  const [confirmWord, setConfirmWord] = useState("");
  // 一次下单意图复用一个单号：上游下单要 20-30 秒，超时重试时靠单号幂等，避免重复建单
  const [orderNumber, setOrderNumber] = useState("");
  const [created, setCreated] = useState<{
    orderId: string;
    orderNumber: string;
    productAmount: number | null;
    postageAmount: number | null;
    totalAmount: number;
    sandbox: boolean;
    recovered?: boolean;
  } | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [selftest, setSelftest] = useState<Array<{ step: string; ok: boolean; detail: string }> | null>(null);

  const setF = (k: string) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const toast = (kind: "ok" | "err", text: string) => setMsg({ kind, text });

  const loadAccount = useCallback(async () => {
    try {
      const j = await apiGet({ action: "account" });
      setAccount(j.account);
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const j = await apiGet({ action: "orders", size: 10 });
      setOrders(j.items);
    } catch {}
  }, []);

  const loadLog = useCallback(async () => {
    try {
      const j = await apiGet({ action: "log" });
      setLog(j.log);
    } catch {}
  }, []);

  useEffect(() => {
    void loadAccount();
    void loadOrders();
    void loadLog();
  }, [loadAccount, loadOrders, loadLog]);

  // 选品 → 拉变体
  async function pickProduct(p: Product) {
    setPicked(p);
    setVariants([]);
    setVid("");
    setFreight([]);
    setLogistic("");
    setCreated(null);
    setOrderNumber("");
    setBusy("variants");
    try {
      const j = await apiGet({ action: "variants", sku: p.sku });
      setVariants(j.variants);
      if (j.variants[0]) setVid(j.variants[0].vid);
      if (!j.variants.length) toast("err", "该商品没有可用变体");
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function doSearch() {
    setBusy("search");
    setMsg(null);
    try {
      const j = await apiGet({ action: "search", q, size: 24 });
      setResults(j.items);
      if (!j.items.length) toast("err", "没有找到商品");
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function doFreight() {
    if (!vid) {
      toast("err", "请先选定商品规格 —— CJ 的运费按变体（vid）试算");
      return;
    }
    setBusy("freight");
    setCreated(null);
    try {
      const j = await apiGet({ action: "freight", vid, qty, to: toCountry });
      setFreight(j.options);
      if (j.options[0]) setLogistic(j.options[0].logisticName);
      if (!j.options.length) toast("err", "没有可用物流渠道");
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function doCreate() {
    if (!logistic) {
      toast("err", "请先选物流渠道");
      return;
    }
    if (!vid && !picked) {
      toast("err", "请先选商品");
      return;
    }
    const real = mode === "production";
    if (real && confirmWord.trim().toUpperCase() !== "REAL") {
      toast("err", "生产模式需要输入确认词 REAL");
      return;
    }
    if (real && !confirm(`确认创建【真实订单】？\n\n这将走真实扣费与履约，余额 $${account?.balance ?? 0}。\n商品：${picked?.name?.slice(0, 50)}`)) return;

    setBusy("create");
    setMsg(null);
    // 复用未完成的单号：超时重试不会在 CJ 侧产生第二张单
    let num = orderNumber;
    if (!num) {
      num = `SZSPD-${real ? "REAL" : "SBX"}-${Date.now()}`;
      setOrderNumber(num);
    }
    try {
      const j = await apiPost({
        action: "create-order",
        orderNumber: num,
        vid,
        sku: vid ? undefined : picked?.sku,
        quantity: Number(qty) || 1,
        logisticName: logistic,
        sandbox: !real,
        confirmReal: real ? true : undefined,
        confirmWord: real ? confirmWord : undefined,
        ...form,
      });
      setCreated(j);
      setOrderNumber("");
      toast(
        "ok",
        j.recovered
          ? "首次请求超时，已回查确认上游实际建单成功（订单未重复创建）"
          : real
            ? "真实订单已创建"
            : "沙盒订单已创建（模拟支付，未扣款）"
      );
      void loadOrders();
      void loadLog();
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function doSandbox(order: Order, sub: "pay" | "status" | "track", value?: string) {
    setBusy(`sbx-${order.orderId}`);
    try {
      await apiPost({ action: "sandbox", sub, orderId: order.orderId, value });
      toast("ok", "沙盒操作完成");
      void loadOrders();
      void loadLog();
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function doSelftest() {
    setBusy("selftest");
    setMsg(null);
    setSelftest(null);
    try {
      const j = await apiPost({ action: "selftest", sku: "CJJT1355346", to: toCountry });
      setSelftest(j.steps);
      void loadOrders();
      void loadLog();
      void loadAccount();
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  const real = mode === "production";

  return (
    <div className="min-h-screen bg-zinc-100 pb-16">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="inline-flex h-6 items-center rounded bg-gradient-to-r from-red-600 via-yellow-500 to-green-600 px-2 text-xs font-black tracking-widest text-white">
            SZ
          </span>
          <div className="mr-auto">
            <h1 className="text-sm font-bold text-zinc-900">CJ 代发通道 · 内部测试</h1>
            <p className="text-[11px] text-zinc-400">
              CJ API v2.0 · 未对外开放 · 不在任何导航中 · {account ? `${account.userNum} / ${account.name}` : "读取账号中…"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">余额</span>
            <span className="rounded bg-zinc-900 px-2 py-1 text-xs font-bold text-white">${account ? account.balance.toFixed(2) : "—"}</span>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-zinc-300 text-xs">
            <button
              onClick={() => setMode("sandbox")}
              className={`px-3 py-1.5 font-medium ${!real ? "bg-emerald-600 text-white" : "bg-white text-zinc-600"}`}
            >
              沙盒
            </button>
            <button
              onClick={() => setMode("production")}
              className={`px-3 py-1.5 font-medium ${real ? "bg-red-600 text-white" : "bg-white text-zinc-600"}`}
            >
              生产
            </button>
          </div>
          <button
            onClick={doSelftest}
            disabled={!!busy}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
          >
            {busy === "selftest" ? "自检中…" : "一键自检通道"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-3 px-4 py-4">
        {/* 模式警示 */}
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs ${
            real ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {real ? (
            <>
              <b>生产模式</b>：创建的订单会走<b>真实扣费与真实履约</b>。当前账号余额 ${account?.balance.toFixed(2) ?? "0.00"}
              {account && account.balance <= 0 && "（余额为 0，真实下单会失败，需先充值）"}。创建前需输入确认词 <code className="rounded bg-red-100 px-1">REAL</code>。
            </>
          ) : (
            <>
              <b>沙盒模式</b>：走 CJ 官方模拟支付流程，<b>不扣真钱、不产生真实物流或履约</b>，可自由测试下单、支付、状态流转。
            </>
          )}
        </div>

        {msg && (
          <div
            className={`rounded-xl border px-4 py-2.5 text-xs ${
              msg.kind === "ok" ? "border-emerald-200 bg-white text-emerald-700" : "border-red-200 bg-white text-red-700"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* 自检结果 */}
        {selftest && (
          <Card n="✓" title="通道自检结果" hint="全部走真实接口，下单为沙盒">
            <ul className="space-y-1">
              {selftest.map((s) => (
                <li key={s.step} className="flex items-start gap-2 text-xs">
                  <span className={s.ok ? "text-emerald-600" : "text-red-600"}>{s.ok ? "✓" : "✕"}</span>
                  <span className="font-medium text-zinc-700">{s.step}</span>
                  <span className="text-zinc-500">{s.detail}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          {/* ① 找货 */}
          <Card n="1" title="找货" hint="关键词或 SKU，走 CJ 商品库">
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="如 wireless earbuds / CJJT1355346"
                className="flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500"
              />
              <button
                onClick={doSearch}
                disabled={!!busy}
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
              >
                {busy === "search" ? "搜索中…" : "搜索"}
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-zinc-100 p-1">
                {results.map((p) => (
                  <button
                    key={p.pid || p.sku}
                    onClick={() => pickProduct(p)}
                    className={`flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-zinc-50 ${
                      picked?.pid === p.pid ? "bg-indigo-50 ring-1 ring-indigo-300" : ""
                    }`}
                  >
                    {p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-zinc-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-zinc-800">{p.name || "(无名称)"}</p>
                      <p className="truncate text-[11px] text-zinc-400">
                        {p.sku} · ${p.price} {p.categoryPath ? `· ${p.categoryPath}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* ② 规格 */}
          <Card n="2" title="选规格（变体）" hint={picked ? picked.sku : "先在左侧选商品"}>
            {variants.length === 0 ? (
              <p className="text-xs text-zinc-400">{busy === "variants" ? "读取变体…" : "尚无变体数据"}</p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {variants.map((v) => (
                  <button
                    key={v.vid}
                    onClick={() => {
                      setVid(v.vid);
                      setFreight([]);
                      setLogistic("");
                      setCreated(null);
                      setOrderNumber("");
                    }}
                    className={`flex w-full items-center gap-2 rounded-md border p-1.5 text-left text-xs ${
                      vid === v.vid ? "border-indigo-400 bg-indigo-50" : "border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    {v.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.image} alt="" className="h-8 w-8 rounded object-cover" loading="lazy" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-zinc-100" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-zinc-800">{v.name || "默认规格"}</p>
                      <p className="truncate text-[11px] text-zinc-400">
                        {v.sku} {v.weightGrams ? `· ${v.weightGrams}g` : ""} {v.dims ? `· ${v.dims}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold text-indigo-600">${v.price ?? "-"}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ③ 运费 */}
        <Card n="3" title="试算运费" hint="真实向上游询价，按目的国返回渠道与价格">
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-0.5 block text-[11px] text-zinc-500">目的国（二字码）</span>
              <input
                value={toCountry}
                onChange={(e) => setToCountry(e.target.value.toUpperCase())}
                className="w-24 rounded-md border border-zinc-300 px-2 py-1.5 text-xs uppercase outline-none focus:border-indigo-500"
              />
            </label>
            <label className="block">
              <span className="mb-0.5 block text-[11px] text-zinc-500">数量</span>
              <input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-20 rounded-md border border-zinc-300 px-2 py-1.5 text-xs outline-none focus:border-indigo-500"
              />
            </label>
            <button
              onClick={doFreight}
              disabled={!!busy}
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
            >
              {busy === "freight" ? "试算中…" : "试算运费"}
            </button>
          </div>

          {freight.length > 0 && (
            <div className="mt-3 space-y-1">
              {freight.map((f) => (
                <button
                  key={f.logisticName}
                  onClick={() => setLogistic(f.logisticName)}
                  className={`flex w-full items-center gap-3 rounded-md border px-2.5 py-1.5 text-left text-xs ${
                    logistic === f.logisticName ? "border-indigo-400 bg-indigo-50" : "border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <span className="font-medium text-zinc-800">{f.logisticName}</span>
                  <span className="text-zinc-500">{f.aging} 天</span>
                  <span className="ml-auto font-bold text-indigo-600">${f.price}</span>
                  {f.priceCny ? <span className="text-[11px] text-zinc-400">¥{f.priceCny}</span> : null}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* ④ 收件人 */}
        <Card n="4" title="收件人" hint="下单必填项">
          <div className="mb-2 flex gap-2">
            <button onClick={() => setForm({ ...PRESET_GH })} className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50">
              预填加纳（库马西）
            </button>
            <button onClick={() => setForm({ ...PRESET_CN })} className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50">
              预填中国（长沙）
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Field label="收件人姓名" value={form.shippingCustomerName} onChange={setF("shippingCustomerName")} />
            <Field label="电话" value={form.shippingPhone} onChange={setF("shippingPhone")} />
            <Field label="国家二字码" value={form.shippingCountryCode} onChange={setF("shippingCountryCode")} />
            <Field label="国家" value={form.shippingCountry} onChange={setF("shippingCountry")} />
            <Field label="省/州" value={form.shippingProvince} onChange={setF("shippingProvince")} />
            <Field label="城市" value={form.shippingCity} onChange={setF("shippingCity")} />
            <Field label="邮编" value={form.shippingZip} onChange={setF("shippingZip")} />
            <Field label="门牌号" value={form.houseNumber} onChange={setF("houseNumber")} />
            <Field label="地址" value={form.shippingAddress} onChange={setF("shippingAddress")} wide />
            <Field label="邮箱（选填）" value={form.email} onChange={setF("email")} wide />
          </div>
        </Card>

        {/* ⑤ 下单 */}
        <Card n="5" title="创建代发订单" hint={real ? "生产模式：真实扣费" : "沙盒模式：模拟支付"}>
          <div className="mb-3 grid gap-1 text-xs text-zinc-600 sm:grid-cols-2">
            <p>商品：<span className="font-medium text-zinc-800">{picked?.name?.slice(0, 60) || "—"}</span></p>
            <p>变体：<span className="font-medium text-zinc-800">{variants.find((v) => v.vid === vid)?.name || "默认"}</span></p>
            <p>物流：<span className="font-medium text-zinc-800">{logistic || "—"}</span></p>
            <p>
              预计：<span className="font-medium text-zinc-800">
                {(() => {
                  const unit = variants.find((v) => v.vid === vid)?.price ?? 0;
                  const ship = freight.find((f) => f.logisticName === logistic)?.price ?? 0;
                  return `$${unit} × ${qty} + $${ship} = $${(unit * (Number(qty) || 1) + ship).toFixed(2)}`;
                })()}
              </span>
            </p>
          </div>

          {real && (
            <div className="mb-3">
              <label className="block">
                <span className="mb-0.5 block text-[11px] text-red-600">输入 REAL 以确认真实下单</span>
                <input
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  className="w-40 rounded-md border border-red-300 px-2 py-1.5 text-xs outline-none focus:border-red-500"
                  placeholder="REAL"
                />
              </label>
            </div>
          )}

          <button
            onClick={doCreate}
            disabled={!!busy}
            className={`rounded-lg px-4 py-2 text-xs font-medium text-white disabled:opacity-40 ${
              real ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {busy === "create"
              ? "提交中…（上游下单实测 20-30 秒，请勿重复点击）"
              : real
                ? "创建真实订单"
                : "创建沙盒订单"}
          </button>

          {orderNumber && (
            <p className="mt-2 text-[11px] text-amber-700">
              本次单号 <code className="rounded bg-amber-100 px-1">{orderNumber}</code>
              　重试会沿用同一单号，不会再建一张单。
            </p>
          )}

          {created && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <p className="font-bold">
                {created.sandbox ? "沙盒订单已创建" : "真实订单已创建"}
                {created.recovered ? "（首次请求超时，已回查确认上游实际建单成功）" : ""}
              </p>
              <p>
                CJ 订单号：<code className="rounded bg-white px-1">{created.orderId || "-"}</code>
              </p>
              <p>我方单号：{created.orderNumber}</p>
              <p>
                {created.productAmount !== null && created.postageAmount !== null ? (
                  <>
                    货款 ${created.productAmount} + 运费 ${created.postageAmount} = <b>${created.totalAmount}</b>
                  </>
                ) : (
                  <>
                    订单金额 <b>${created.totalAmount}</b>
                  </>
                )}
              </p>
            </div>
          )}
        </Card>

        {/* ⑥ 订单 */}
        <Card n="6" title="订单列表" hint="最近的 CJ 订单；沙盒单可模拟支付与状态流转">
          <div className="mb-2 flex gap-2">
            <button onClick={loadOrders} className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50">
              刷新
            </button>
          </div>
          {orders.length === 0 ? (
            <p className="text-xs text-zinc-400">暂无订单</p>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <div key={o.orderId} className="rounded-lg border border-zinc-200 p-2.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <code className="rounded bg-zinc-100 px-1 text-[11px]">{o.orderId}</code>
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] text-blue-700">
                      {STATUS_CN[o.status] || o.status}
                    </span>
                    <span className="text-zinc-500">{o.orderNumber}</span>
                    <span className="ml-auto font-bold text-zinc-800">${o.amount ?? "-"}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    {o.customer} · {o.phone} · {o.address} · {o.city} {o.province} {o.countryCode}
                  </p>
                  {o.trackingNumber && <p className="mt-0.5 text-[11px] text-zinc-500">运单号：{o.trackingNumber}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => doSandbox(o, "pay")}
                      disabled={!!busy}
                      title="仅对 UNPAID（待支付）订单有效。沙盒订单创建后通常已是 UNSHIPPED(300) 已支付状态，此时可直接推进状态。"
                      className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      模拟支付
                    </button>
                    <button
                      onClick={() => {
                        const tn = `SZTEST${Date.now().toString().slice(-8)}`;
                        void doSandbox(o, "track", tn);
                      }}
                      disabled={!!busy}
                      title="运单号必须在订单关闭(700)之前写，所以放在状态推进前面"
                      className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      写运单号
                    </button>
                    {["400", "500", "600", "700"].map((st) => (
                      <button
                        key={st}
                        onClick={() => doSandbox(o, "status", st)}
                        disabled={!!busy}
                        title={st === "700" ? "关闭订单：之后不能再改运单号" : "必须按 300→400→500→600→700 顺序推进"}
                        className="rounded border border-zinc-300 px-2 py-0.5 text-[11px] text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                      >
                        → {st}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 日志 */}
        <Card n="≡" title="通道操作日志" hint="只记录本通道发起的写操作">
          <div className="mb-2">
            <button onClick={loadLog} className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-600 hover:bg-zinc-50">
              刷新
            </button>
          </div>
          {log.length === 0 ? (
            <p className="text-xs text-zinc-400">暂无记录</p>
          ) : (
            <ul className="space-y-1">
              {log.map((l, i) => (
                <li key={`${l.at}-${i}`} className="flex flex-wrap items-baseline gap-2 text-[11px]">
                  <span className="text-zinc-400">{new Date(l.at).toLocaleString("zh-CN")}</span>
                  <span className={l.mode === "PRODUCTION" ? "font-bold text-red-600" : "font-medium text-emerald-700"}>
                    {l.action}
                  </span>
                  <span className="text-zinc-600">{l.detail}</span>
                  {l.result && <span className="text-zinc-400">{l.result}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <p className="pt-2 text-center text-[11px] text-zinc-400">
          本页为内部测试通道 · 未链接到任何导航 · noindex · 口令保护 · CJ 上游 QPS 1/s，所有请求经全站串行队列
        </p>
      </div>
    </div>
  );
}
