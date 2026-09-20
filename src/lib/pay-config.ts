// src/lib/pay-config.ts
// ============================================================================
// 支付配置中心（运行时，站长自助配置）
// ----------------------------------------------------------------------------
// 为什么需要它：
//   原来密钥只能写 .env.local —— 改一次要 SSH 上服务器、改文件、重启进程。
//   密钥是**站长自己的商业凭证**，必须让站长在后台自己填、自己换，不需要
//   任何运维介入，也不应该出现在代码仓库里。
//
// 生效优先级：**配置文件 > 环境变量 > 默认值**
//   · 配置文件 data/pay-config.json（0600，只 root 可读）
//   · 环境变量（向后兼容，之前写在 .env.local 的配置继续有效）
//   · 默认值（provider=auto，未配密钥时自动降级 manual 人工收款，业务不中断）
//
// 读取：loadPayConfig() —— 同步 + mtime 缓存，热路径不重复解析文件。
// 写入：savePayConfig() —— 原子替换（临时文件 + rename），失败不会写坏旧配置。
//
// 安全铁律：
//   · 对外（管理面板、日志、接口返回）**只给掩码**，永远不回传明文密钥。
//   · 明文密钥只在进程内使用，绝不进入任何响应体。
// ============================================================================
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  statSync,
  renameSync,
  chmodSync,
  unlinkSync,
} from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const CONFIG_FILE = process.env.PAY_CONFIG_FILE || join(DATA_DIR, "pay-config.json");

export type PayProviderName = "paystack" | "flutterwave" | "manual";
/** auto = 按「谁配了密钥就用谁」自动挑 */
export type PayProviderChoice = PayProviderName | "auto";

export interface PayConfig {
  v: number;
  /** 通道选择：auto 时按 paystack → flutterwave → manual 优先级自动挑 */
  provider: PayProviderChoice;
  /** 收款币种（Paystack 必须用本地货币，如 GHS/NGN；Flutterwave 可 USD） */
  currency: string;
  fxGhs: number | null;
  fxNgn: number | null;

  paystackSecretKey: string;
  paystackPublicKey: string;
  paystackSecretHash: string;
  /** Paystack 分账代码（Split）：一笔收款在网关侧自动分给子账户 */
  paystackSplitCode: string;

  flutterwaveSecretKey: string;
  flutterwaveSecretHash: string;
  /** Flutterwave 分账：JSON 数组 [{"id":123,"ratio":0.2}] */
  flutterwaveSubaccounts: string;

  /** 网关费率（%），仅用于利润台账估算，不影响实际收款 */
  feePct: number;
  /** 是否启用分账台账（默认开） */
  splitEnabled: boolean;
  /**
   * 利润留存比例（0~1）。null = 按「收款额 - 至CJ成本」全额留存。
   * 设了它就按收款额的比例留存，其余全部作为至 CJ 的成本腿。
   */
  profitRetainPct: number | null;
  /** 最低留存利润（美元）：低于它就告警，说明这单可能白干 */
  minProfitUsd: number;

  updatedAt: string;
  updatedBy: string;
}

function num(v: unknown, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : dflt;
}
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function str(v: unknown): string {
  return String(v ?? "").trim();
}

/** 环境变量兜底（向后兼容老的 .env.local 配置） */
function fromEnv(): PayConfig {
  return {
    v: 1,
    provider: (str(process.env.PAY_PROVIDER) as PayProviderChoice) || "auto",
    currency: (str(process.env.PAY_CURRENCY) || "USD").toUpperCase(),
    fxGhs: numOrNull(process.env.PAY_FX_GHS),
    fxNgn: numOrNull(process.env.PAY_FX_NGN),
    paystackSecretKey: str(process.env.PAYSTACK_SECRET_KEY),
    paystackPublicKey: str(process.env.PAYSTACK_PUBLIC_KEY),
    paystackSecretHash: str(process.env.PAYSTACK_SECRET_HASH),
    paystackSplitCode: str(process.env.PAYSTACK_SPLIT_CODE),
    flutterwaveSecretKey: str(process.env.FLUTTERWAVE_SECRET_KEY),
    flutterwaveSecretHash: str(process.env.FLUTTERWAVE_SECRET_HASH),
    flutterwaveSubaccounts: str(process.env.FLUTTERWAVE_SUBACCOUNTS),
    feePct: num(process.env.PAY_FEE_PCT, 1.95),
    splitEnabled: str(process.env.SPLIT_ENABLED) !== "0",
    profitRetainPct: numOrNull(process.env.PROFIT_RETAIN_PCT),
    minProfitUsd: num(process.env.MIN_PROFIT_USD, 0.5),
    updatedAt: "",
    updatedBy: "env",
  };
}

const ALLOWED: PayProviderChoice[] = ["auto", "paystack", "flutterwave", "manual"];

/** 规整外部输入，保证落盘数据永远合法 */
function normalize(input: Partial<PayConfig>, base: PayConfig): PayConfig {
  const prov = str(input.provider) as PayProviderChoice;
  const pct = input.profitRetainPct;
  return {
    v: 1,
    provider: ALLOWED.includes(prov) ? prov : base.provider,
    currency: (str(input.currency) || base.currency).toUpperCase(),
    fxGhs: input.fxGhs === undefined ? base.fxGhs : numOrNull(input.fxGhs),
    fxNgn: input.fxNgn === undefined ? base.fxNgn : numOrNull(input.fxNgn),
    paystackSecretKey: input.paystackSecretKey === undefined ? base.paystackSecretKey : str(input.paystackSecretKey),
    paystackPublicKey: input.paystackPublicKey === undefined ? base.paystackPublicKey : str(input.paystackPublicKey),
    paystackSecretHash: input.paystackSecretHash === undefined ? base.paystackSecretHash : str(input.paystackSecretHash),
    paystackSplitCode: input.paystackSplitCode === undefined ? base.paystackSplitCode : str(input.paystackSplitCode),
    flutterwaveSecretKey:
      input.flutterwaveSecretKey === undefined ? base.flutterwaveSecretKey : str(input.flutterwaveSecretKey),
    flutterwaveSecretHash:
      input.flutterwaveSecretHash === undefined ? base.flutterwaveSecretHash : str(input.flutterwaveSecretHash),
    flutterwaveSubaccounts:
      input.flutterwaveSubaccounts === undefined ? base.flutterwaveSubaccounts : str(input.flutterwaveSubaccounts),
    feePct: input.feePct === undefined ? base.feePct : Math.max(0, Math.min(20, num(input.feePct, base.feePct))),
    splitEnabled: input.splitEnabled === undefined ? base.splitEnabled : !!input.splitEnabled,
    profitRetainPct:
      pct === undefined
        ? base.profitRetainPct
        : pct === null || String(pct).trim() === ""
          ? null
          : Math.max(0, Math.min(1, num(pct, 0))),
    minProfitUsd:
      input.minProfitUsd === undefined ? base.minProfitUsd : Math.max(0, num(input.minProfitUsd, base.minProfitUsd)),
    updatedAt: base.updatedAt,
    updatedBy: base.updatedBy,
  };
}

/** 只有非空字段才覆盖环境变量 —— 空串视为"没配"，避免把 env 里的配置抹掉 */
function overlayEnv(env: PayConfig, file: Partial<PayConfig>): PayConfig {
  const out: PayConfig = { ...env };
  for (const k of Object.keys(env) as (keyof PayConfig)[]) {
    const v = (file as any)[k];
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue; // 空串不覆盖
    (out as any)[k] = v;
  }
  if (file.updatedAt) out.updatedAt = file.updatedAt;
  if (file.updatedBy) out.updatedBy = file.updatedBy;
  return out;
}

// ---------------------------------------------------------------------------
// 读取（mtime 缓存）
// ---------------------------------------------------------------------------

let cache: { mtimeMs: number; cfg: PayConfig } | null = null;

function fileMtime(): number {
  try {
    return statSync(CONFIG_FILE).mtimeMs;
  } catch {
    return -1; // 文件不存在
  }
}

function readFileCfg(): Partial<PayConfig> {
  try {
    if (!existsSync(CONFIG_FILE)) return {};
    const j = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
    return j && typeof j === "object" ? (j as Partial<PayConfig>) : {};
  } catch {
    // 配置坏了不能拖垮收款：退回环境变量，并让面板显示"配置文件解析失败"
    return {};
  }
}

/** 生效配置（配置文件 > 环境变量 > 默认值）。同步、带 mtime 缓存。 */
export function loadPayConfig(): PayConfig {
  const m = fileMtime();
  if (cache && cache.mtimeMs === m) return cache.cfg;
  const cfg = overlayEnv(fromEnv(), readFileCfg());
  cache = { mtimeMs: m, cfg };
  return cfg;
}

/** 写入后必须清缓存，否则同进程内读到旧值 */
export function invalidatePayConfigCache(): void {
  cache = null;
}

/** 配置文件是否存在 / 是否可解析（面板告警用） */
export function payConfigFileState(): { exists: boolean; parseable: boolean; file: string } {
  const exists = existsSync(CONFIG_FILE);
  let parseable = true;
  if (exists) {
    try {
      const raw = readFileSync(CONFIG_FILE, "utf8");
      JSON.parse(raw);
    } catch {
      parseable = false;
    }
  }
  return { exists, parseable, file: CONFIG_FILE };
}

// ---------------------------------------------------------------------------
// 写入（原子 + 0600）
// ---------------------------------------------------------------------------

export function savePayConfig(patch: Partial<PayConfig>, by = "admin"): PayConfig {
  const current = loadPayConfig();
  const next = normalize(patch, current);
  next.updatedAt = new Date().toISOString();
  next.updatedBy = by;

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${CONFIG_FILE}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, JSON.stringify(next, null, 2), { encoding: "utf8", mode: 0o600 });
  // 先落盘再改权限，避免 umask 干扰
  try {
    chmodSync(tmp, 0o600);
  } catch {
    /* 某些文件系统不支持，忽略 */
  }
  renameSync(tmp, CONFIG_FILE); // 原子替换
  invalidatePayConfigCache();
  return next;
}

/** 清空某个密钥（面板"删除密钥"用） */
export function clearPaySecret(field: keyof PayConfig, by = "admin"): PayConfig {
  return savePayConfig({ [field]: "" } as Partial<PayConfig>, by);
}

// ---------------------------------------------------------------------------
// 掩码输出（绝不回传明文）
// ---------------------------------------------------------------------------

/** sk_live_abcdef123456 → sk_l****3456 */
export function maskSecret(s: string): string {
  const v = str(s);
  if (!v) return "";
  if (v.length <= 8) return "****";
  return `${v.slice(0, 4)}****${v.slice(-4)}`;
}

export interface PayConfigPublic {
  provider: PayProviderChoice;
  /** 实际生效的通道（把 auto 解析成具体值） */
  resolved: PayProviderName;
  currency: string;
  fxGhs: number | null;
  fxNgn: number | null;
  feePct: number;
  splitEnabled: boolean;
  profitRetainPct: number | null;
  minProfitUsd: number;
  updatedAt: string;
  updatedBy: string;
  /** 密钥是否已配置 + 掩码预览（无明文） */
  secrets: Record<string, { set: boolean; preview: string }>;
  /** 网关侧分账是否已配（配了就不需要系统再手工分账） */
  gatewaySplit: { paystack: boolean; flutterwave: boolean };
  file: { exists: boolean; parseable: boolean; file: string };
}

export function payConfigPublic(): PayConfigPublic {
  const c = loadPayConfig();
  const st = payConfigFileState();
  const mk = (v: string) => ({ set: !!v, preview: maskSecret(v) });
  return {
    provider: c.provider,
    resolved: resolveProvider(c),
    currency: c.currency,
    fxGhs: c.fxGhs,
    fxNgn: c.fxNgn,
    feePct: c.feePct,
    splitEnabled: c.splitEnabled,
    profitRetainPct: c.profitRetainPct,
    minProfitUsd: c.minProfitUsd,
    updatedAt: c.updatedAt,
    updatedBy: c.updatedBy,
    secrets: {
      paystackSecretKey: mk(c.paystackSecretKey),
      paystackPublicKey: mk(c.paystackPublicKey),
      // secret hash 是回调用共享密钥，同样按密文对待
      paystackSecretHash: mk(c.paystackSecretHash),
      flutterwaveSecretKey: mk(c.flutterwaveSecretKey),
      flutterwaveSecretHash: mk(c.flutterwaveSecretHash),
    },
    gatewaySplit: {
      paystack: !!c.paystackSplitCode,
      flutterwave: !!parseFlutterwaveSubaccounts(c.flutterwaveSubaccounts).length,
    },
    file: st,
  };
}

// ---------------------------------------------------------------------------
// 通道解析
// ---------------------------------------------------------------------------

/** auto 的解析顺序：Paystack（加纳/尼日利亚本地通道，费率低）→ Flutterwave（泛非/国际卡）→ manual */
export function resolveProvider(c: PayConfig = loadPayConfig()): PayProviderName {
  if (c.provider !== "auto") return c.provider;
  if (c.paystackSecretKey) return "paystack";
  if (c.flutterwaveSecretKey) return "flutterwave";
  return "manual";
}

export function parseFlutterwaveSubaccounts(raw: string): Array<{ id: string; ratio: number }> {
  try {
    const j = JSON.parse(raw || "[]");
    if (!Array.isArray(j)) return [];
    return j
      .map((x: any) => ({ id: str(x?.id), ratio: num(x?.ratio, 0) }))
      .filter((x) => x.id && x.ratio > 0);
  } catch {
    return [];
  }
}

/** 配置自检：给出人话级别的可读问题清单，面板直接展示 */
export function payConfigIssues(): string[] {
  const c = loadPayConfig();
  const st = payConfigFileState();
  const out: string[] = [];
  if (!st.parseable) out.push("配置文件 data/pay-config.json 解析失败，当前已回退到环境变量，请重新保存配置。");
  const p = resolveProvider(c);
  if (p === "paystack") {
    if (!c.paystackSecretKey.startsWith("sk_")) out.push("Paystack 密钥应以 sk_test_ / sk_live_ 开头。");
    if (c.currency === "USD" && !c.fxGhs && !c.fxNgn) {
      out.push("选择 Paystack 但收款币种是 USD：请把币种改为 GHS/NGN，或填好对应汇率。");
    }
    if (c.currency === "GHS" && !c.fxGhs) out.push("未配置 USD→GHS 汇率（fxGhs），Paystack 无法以 GHS 收款。");
    if (c.currency === "NGN" && !c.fxNgn) out.push("未配置 USD→NGN 汇率（fxNgn），Paystack 无法以 NGN 收款。");
    if (!c.paystackSecretHash) out.push("未配置 Paystack Secret Hash：回调仍会验签（HMAC），但建议在网关后台设置后一并填入。");
  }
  if (p === "flutterwave") {
    if (!c.flutterwaveSecretKey) out.push("未配置 Flutterwave 密钥。");
    if (!c.flutterwaveSecretHash) out.push("未配置 Flutterwave Secret Hash（verif-hash）—— 缺少它将无法校验回调，回调会被拒收。");
    const rate =
      c.currency === "USD" ? 1 : c.currency === "GHS" ? c.fxGhs : c.currency === "NGN" ? c.fxNgn : null;
    if (!rate) out.push(`收款币种 ${c.currency} 未配置汇率。`);
  }
  if (p === "manual") {
    out.push("当前无可用在线支付通道，客户看到的是人工收款指引（MoMo / 银行 / WhatsApp）。");
  }
  if (c.splitEnabled && c.profitRetainPct !== null && c.profitRetainPct > 0.9) {
    out.push(`利润留存比例 ${(c.profitRetainPct * 100).toFixed(0)}% 偏高，可能导致付 CJ 的钱不够，请确认。`);
  }
  return out;
}

/** 供清理：删除配置文件（面板"恢复为环境变量配置"） */
export function removePayConfigFile(): void {
  try {
    if (existsSync(CONFIG_FILE)) unlinkSync(CONFIG_FILE);
  } catch {
    /* 忽略 */
  }
  invalidatePayConfigCache();
}
