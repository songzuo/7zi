"use client";
// 内部通道 · 支付设置 + 分账台账
// ---------------------------------------------------------------------------
// 两件事：
//   1) 站长自助配置收款通道密钥（Paystack / Flutterwave），保存即生效，不用重启
//   2) 看每一笔订单被拆成的两条腿：付给 CJ 的成本腿 / 留存我方的利润腿
//
// 安全：服务端**只回掩码**（sk_l****3456），明文密钥永不出进程。
//       密码框留空 = 保持原值不变；点「清除」才会真的删掉。
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

type ProviderChoice = "auto" | "paystack" | "flutterwave" | "manual";

interface SecretInfo { set: boolean; preview: string }

interface PayConfigView {
  provider: ProviderChoice;
  resolved: string;
  currency: string;
  fxGhs: number | null;
  fxNgn: number | null;
  feePct: number;
  splitEnabled: boolean;
  profitRetainPct: number | null;
  minProfitUsd: number;
  updatedAt: string;
  updatedBy: string;
  secrets: Record<string, SecretInfo>;
  gatewaySplit: { paystack: boolean; flutterwave: boolean };
  file: { exists: boolean; parseable: boolean; file: string };
}

interface SettlementRow {
  id: number;
  order_no: string;
  gross_amount: number;
  goods_cost: number;
  cj_cost: number;
  gateway_fee: number;
  profit: number;
  cj_cost_source: string;
  provider: string;
  split_mode: string;
  leg_cj_status: string;
  leg_cj_method: string;
  leg_cj_ref: string;
  leg_profit_status: string;
  note: string;
  created_at: string;
}

interface Summary {
  orders: number;
  gross: number;
  cjCost: number;
  gatewayFee: number;
  profit: number;
  cjPaid: number;
  cjOutstanding: number;
  estimated: number;
  thinMarginOrders: number;
}

const CJ_LEG_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "待付 CJ", cls: "bg-zinc-100 text-zinc-600" },
  paid: { text: "已付 CJ", cls: "bg-emerald-50 text-emerald-700" },
  unpaid: { text: "欠 CJ 货款", cls: "bg-amber-100 text-amber-800" },
  failed: { text: "付款失败", cls: "bg-red-50 text-red-700" },
  skipped: { text: "未转 CJ", cls: "bg-zinc-100 text-zinc-500" },
};

const PROFIT_LEG_LABEL: Record<string, { text: string; cls: string }> = {
  retained: { text: "已留存", cls: "bg-emerald-50 text-emerald-700" },
  payout_pending: { text: "待提现", cls: "bg-amber-100 text-amber-800" },
  paid_out: { text: "已提现", cls: "bg-sky-50 text-sky-700" },
};

const SECRET_FIELDS: Array<{ key: string; label: string; hint: string; provider: string }> = [
  { key: "paystackSecretKey", label: "Paystack Secret Key", hint: "sk_live_… / sk_test_…（服务端调用，勿外泄）", provider: "paystack" },
  { key: "paystackPublicKey", label: "Paystack Public Key", hint: "pk_live_…（可选）", provider: "paystack" },
  { key: "paystackSecretHash", label: "Paystack Secret Hash", hint: "回调附加校验（可选，HMAC 验签已生效）", provider: "paystack" },
  { key: "flutterwaveSecretKey", label: "Flutterwave Secret Key", hint: "FLWSECK-…", provider: "flutterwave" },
  { key: "flutterwaveSecretHash", label: "Flutterwave Secret Hash", hint: "verif-hash，回调校验必需", provider: "flutterwave" },
];

export default function PaySettings() {
  const [cfg, setCfg] = useState<PayConfigView | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [provider, setProvider] = useState<any>(null);
  const [rows, setRows] = useState<SettlementRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err" | "warn"; text: string } | null>(null);
  const [open, setOpen] = useState(false);

  // 待提交的表单值（密钥框留空 = 不变）
  const [form, setForm] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [nonSecret, setNonSecret] = useState({
    provider: "auto" as ProviderChoice,
    currency: "USD",
    fxGhs: "",
    fxNgn: "",
    feePct: "1.95",
    splitEnabled: true,
    profitRetainPct: "",
    minProfitUsd: "0.50",
  });

  const toast = (kind: "ok" | "err" | "warn", text: string) => setMsg({ kind, text });

  const loadConfig = useCallback(async () => {
    const j = await apiGet({ action: "pay-config" });
    const c: PayConfigView = j.config;
    setCfg(c);
    setIssues(j.issues || []);
    setProvider(j.provider || null);
    setNonSecret({
      provider: c.provider,
      currency: c.currency,
      fxGhs: c.fxGhs == null ? "" : String(c.fxGhs),
      fxNgn: c.fxNgn == null ? "" : String(c.fxNgn),
      feePct: String(c.feePct),
      splitEnabled: c.splitEnabled,
      profitRetainPct: c.profitRetainPct == null ? "" : String(c.profitRetainPct),
      minProfitUsd: String(c.minProfitUsd),
    });
    setForm({});
    setTouched({});
  }, []);

  const loadSettlements = useCallback(async () => {
    const j = await apiGet({ action: "settlements", size: 50 });
    setRows(j.rows || []);
    setSummary(j.summary || null);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await loadConfig();
        await loadSettlements();
      } catch (e) {
        toast("err", e instanceof Error ? e.message : String(e));
      }
    })();
  }, [loadConfig, loadSettlements]);

  async function save() {
    setBusy("save");
    try {
      const patch: Record<string, unknown> = {
        provider: nonSecret.provider,
        currency: nonSecret.currency,
        fxGhs: nonSecret.fxGhs === "" ? null : Number(nonSecret.fxGhs),
        fxNgn: nonSecret.fxNgn === "" ? null : Number(nonSecret.fxNgn),
        feePct: Number(nonSecret.feePct),
        splitEnabled: nonSecret.splitEnabled,
        profitRetainPct: nonSecret.profitRetainPct === "" ? null : Number(nonSecret.profitRetainPct),
        minProfitUsd: Number(nonSecret.minProfitUsd),
      };
      // 只提交用户真正动过的密钥字段（留空=保持不变）
      for (const f of SECRET_FIELDS) {
        if (touched[f.key]) patch[f.key] = form[f.key] ?? "";
      }
      if (touched.flutterwaveSubaccounts) patch.flutterwaveSubaccounts = form.flutterwaveSubaccounts ?? "";
      if (touched.paystackSplitCode) patch.paystackSplitCode = form.paystackSplitCode ?? "";

      const j = await apiPost({ action: "pay-config-save", patch, by: "admin-panel" });
      setCfg(j.config);
      setIssues(j.issues || []);
      setProvider(j.provider || null);
      setForm({});
      setTouched({});
      toast("ok", j.message || "已保存");
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function legAction(orderNo: string, patch: Record<string, unknown>) {
    setBusy(orderNo);
    try {
      await apiPost({ action: "settlement-leg", orderNo, ...patch });
      await loadSettlements();
      toast("ok", `${orderNo} 已更新`);
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function recompute(orderNo: string) {
    setBusy(orderNo);
    try {
      await apiPost({ action: "settlement-recompute", orderNo });
      await loadSettlements();
      toast("ok", `${orderNo} 已按当前成本重算`);
    } catch (e) {
      toast("err", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  const money = (v: number) => `$${(Number(v) || 0).toFixed(2)}`;
  const activeProvider = provider?.active || cfg?.resolved || "-";

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-bold text-zinc-900">支付设置 · 分账台账</h2>
        <span
          className={`rounded px-2 py-0.5 text-[11px] font-medium ${
            activeProvider === "manual" ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          收款通道：{activeProvider}
        </span>
        {cfg?.gatewaySplit?.paystack || cfg?.gatewaySplit?.flutterwave ? (
          <span className="rounded bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
            网关侧自动分账已启用
          </span>
        ) : (
          <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">分账方式：我方台账</span>
        )}
        <span className="flex-1" />
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50"
        >
          {open ? "收起密钥配置" : "配置收款密钥"}
        </button>
        <button
          onClick={() => void loadSettlements()}
          className="rounded-md border border-zinc-300 px-2 py-1 text-[11px] text-zinc-700 hover:bg-zinc-50"
        >
          刷新台账
        </button>
      </div>

      {msg && (
        <div
          className={`mb-3 rounded-md border p-2 text-[11px] leading-relaxed ${
            msg.kind === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : msg.kind === "warn"
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-red-300 bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">
        客户只付<b>一次</b>，钱进我方账户后系统自动拆成两条腿：<b>成本腿</b>（本单应付 CJ）走 CJ 余额/支付链接把货发出去，
        <b>利润腿</b>（收款 − 成本 − 网关费）留存我方。密钥由站长在这里自助配置，保存即生效、无需重启进程。
      </p>

      {issues.length > 0 && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-900">
          <div className="mb-1 font-medium">配置提醒</div>
          <ul className="list-disc pl-4">
            {issues.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {open && cfg && (
        <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-[11px] text-zinc-600">
              收款通道
              <select
                value={nonSecret.provider}
                onChange={(e) => setNonSecret({ ...nonSecret, provider: e.target.value as ProviderChoice })}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900"
              >
                <option value="auto">自动（谁配了密钥就用谁）</option>
                <option value="paystack">Paystack（加纳/尼日利亚）</option>
                <option value="flutterwave">Flutterwave（泛非/国际卡）</option>
                <option value="manual">manual（只给人工收款指引）</option>
              </select>
            </label>
            <label className="text-[11px] text-zinc-600">
              收款币种
              <input
                value={nonSecret.currency}
                onChange={(e) => setNonSecret({ ...nonSecret, currency: e.target.value.toUpperCase() })}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900"
                placeholder="GHS / NGN / USD"
              />
            </label>
            <label className="text-[11px] text-zinc-600">
              网关费率 %（仅用于利润估算）
              <input
                value={nonSecret.feePct}
                onChange={(e) => setNonSecret({ ...nonSecret, feePct: e.target.value })}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900"
              />
            </label>
            <label className="text-[11px] text-zinc-600">
              USD → GHS 汇率
              <input
                value={nonSecret.fxGhs}
                onChange={(e) => setNonSecret({ ...nonSecret, fxGhs: e.target.value })}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900"
                placeholder="如 15.5"
              />
            </label>
            <label className="text-[11px] text-zinc-600">
              USD → NGN 汇率
              <input
                value={nonSecret.fxNgn}
                onChange={(e) => setNonSecret({ ...nonSecret, fxNgn: e.target.value })}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900"
                placeholder="如 1600"
              />
            </label>
            <label className="text-[11px] text-zinc-600">
              最低留存利润 $（低于它台账标红）
              <input
                value={nonSecret.minProfitUsd}
                onChange={(e) => setNonSecret({ ...nonSecret, minProfitUsd: e.target.value })}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900"
              />
            </label>
            <label className="text-[11px] text-zinc-600">
              利润留存比例（留空=成本优先，剩余全留存）
              <input
                value={nonSecret.profitRetainPct}
                onChange={(e) => setNonSecret({ ...nonSecret, profitRetainPct: e.target.value })}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900"
                placeholder="如 0.25 表示留 25%"
              />
            </label>
            <label className="flex items-end gap-2 text-[11px] text-zinc-600">
              <input
                type="checkbox"
                checked={nonSecret.splitEnabled}
                onChange={(e) => setNonSecret({ ...nonSecret, splitEnabled: e.target.checked })}
              />
              启用分账
            </label>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {SECRET_FIELDS.map((f) => {
              const info = cfg.secrets[f.key];
              return (
                <label key={f.key} className="text-[11px] text-zinc-600">
                  <span className="flex items-center gap-2">
                    {f.label}
                    {info?.set ? (
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                        已配置 {info.preview}
                      </span>
                    ) : (
                      <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-600">未配置</span>
                    )}
                  </span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={form[f.key] ?? ""}
                    onChange={(e) => {
                      setForm({ ...form, [f.key]: e.target.value });
                      setTouched({ ...touched, [f.key]: true });
                    }}
                    placeholder={info?.set ? "留空 = 保持不变" : "粘贴密钥"}
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900"
                  />
                  <span className="mt-0.5 block text-[10px] text-zinc-400">{f.hint}</span>
                </label>
              );
            })}

            <label className="text-[11px] text-zinc-600">
              <span className="flex items-center gap-2">
                Paystack 分账代码 split_code
                {cfg.gatewaySplit.paystack && (
                  <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">已配置</span>
                )}
              </span>
              <input
                value={form.paystackSplitCode ?? ""}
                onChange={(e) => {
                  setForm({ ...form, paystackSplitCode: e.target.value });
                  setTouched({ ...touched, paystackSplitCode: true });
                }}
                placeholder="PSP_xxx（配了利润在网关就自动分好）"
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900"
              />
            </label>

            <label className="text-[11px] text-zinc-600">
              <span className="flex items-center gap-2">
                Flutterwave 子账户 subaccounts
                {cfg.gatewaySplit.flutterwave && (
                  <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">已配置</span>
                )}
              </span>
              <input
                value={form.flutterwaveSubaccounts ?? ""}
                onChange={(e) => {
                  setForm({ ...form, flutterwaveSubaccounts: e.target.value });
                  setTouched({ ...touched, flutterwaveSubaccounts: true });
                }}
                placeholder='[{"id":"12345","ratio":0.25}]'
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-[12px] text-zinc-900"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => void save()}
              disabled={busy === "save"}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
            >
              {busy === "save" ? "保存中…" : "保存并生效"}
            </button>
            <span className="text-[10px] text-zinc-400">
              {cfg.updatedAt ? `上次更新 ${cfg.updatedAt}（${cfg.updatedBy}）` : "尚未保存过配置（当前走环境变量）"}
            </span>
            {!cfg.file.parseable && (
              <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] text-red-700">配置文件解析失败，已回退环境变量</span>
            )}
          </div>
        </div>
      )}

      {summary && (
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          {[
            { label: "收款合计", value: money(summary.gross), cls: "text-zinc-900" },
            { label: "付 CJ（成本腿）", value: money(summary.cjCost), cls: "text-zinc-900" },
            { label: "欠 CJ 未付", value: money(summary.cjOutstanding), cls: summary.cjOutstanding > 0 ? "text-amber-700" : "text-zinc-900" },
            { label: "留存利润（已扣网关费）", value: money(summary.profit), cls: summary.profit >= 0 ? "text-emerald-700" : "text-red-700" },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-2">
              <div className="text-[10px] text-zinc-500">{c.label}</div>
              <div className={`text-[15px] font-semibold ${c.cls}`}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {summary && (summary.estimated > 0 || summary.thinMarginOrders > 0) && (
        <p className="mb-2 text-[11px] text-amber-800">
          {summary.estimated > 0 && `${summary.estimated} 笔成本为估算口径（下单时上游没取到进价），建议点「重算」校正。`}
          {summary.thinMarginOrders > 0 && ` ${summary.thinMarginOrders} 笔利润低于阈值，注意是否白干。`}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-[11px]">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500">
              <th className="py-1.5">订单号</th>
              <th className="py-1.5">收款</th>
              <th className="py-1.5">付 CJ</th>
              <th className="py-1.5">留存利润</th>
              <th className="py-1.5">成本腿</th>
              <th className="py-1.5">利润腿</th>
              <th className="py-1.5">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-3 text-center text-zinc-400">
                  暂无分账记录（客户通过线上支付成功后会自动生成）
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const cj = CJ_LEG_LABEL[r.leg_cj_status] || { text: r.leg_cj_status, cls: "bg-zinc-100 text-zinc-600" };
              const pf = PROFIT_LEG_LABEL[r.leg_profit_status] || { text: r.leg_profit_status, cls: "bg-zinc-100 text-zinc-600" };
              return (
                <tr key={r.id} className="border-b border-zinc-100 align-top">
                  <td className="py-1.5">
                    <div className="font-medium text-zinc-900">{r.order_no}</div>
                    <div className="text-[10px] text-zinc-400">
                      {r.created_at} · {r.provider || "-"} · {r.split_mode}
                    </div>
                  </td>
                  <td className="py-1.5 text-zinc-800">{money(r.gross_amount)}</td>
                  <td className="py-1.5 text-zinc-800">
                    {money(r.cj_cost)}
                    {r.cj_cost_source === "estimate" && <span className="ml-1 text-[10px] text-amber-700">估算</span>}
                  </td>
                  <td className={`py-1.5 font-medium ${r.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {money(r.profit)}
                  </td>
                  <td className="py-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${cj.cls}`}>{cj.text}</span>
                    {r.leg_cj_method && <div className="text-[10px] text-zinc-400">{r.leg_cj_method}</div>}
                  </td>
                  <td className="py-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${pf.cls}`}>{pf.text}</span>
                  </td>
                  <td className="py-1.5">
                    <div className="flex flex-wrap gap-1">
                      {r.leg_cj_status !== "paid" && (
                        <button
                          onClick={() => void legAction(r.order_no, { legCjStatus: "paid", legCjMethod: "manual" })}
                          disabled={!!busy}
                          className="rounded border border-emerald-300 px-1.5 py-0.5 text-[10px] text-emerald-800 hover:bg-emerald-50 disabled:opacity-40"
                        >
                          标记已付 CJ
                        </button>
                      )}
                      {r.leg_profit_status !== "paid_out" && (
                        <button
                          onClick={() => void legAction(r.order_no, { legProfitStatus: "paid_out" })}
                          disabled={!!busy}
                          className="rounded border border-sky-300 px-1.5 py-0.5 text-[10px] text-sky-800 hover:bg-sky-50 disabled:opacity-40"
                        >
                          标记已提现
                        </button>
                      )}
                      <button
                        onClick={() => void recompute(r.order_no)}
                        disabled={!!busy}
                        className="rounded border border-zinc-300 px-1.5 py-0.5 text-[10px] text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                      >
                        重算
                      </button>
                    </div>
                    {r.note && <div className="mt-0.5 text-[10px] text-amber-800">{r.note}</div>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
