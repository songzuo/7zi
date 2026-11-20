// SZSPD — CJ 代发通道（内部测试用）
//
// 一条把「找货 → 试算运费 → 创建代发订单 → 跟进订单」串起来的服务端通道，
// 直接对接 CJ 官方 API v2.0。给 /internal/wholesale 内部测试页用，不面向顾客。
//
// 关键约定：
//  1) QPS 1/s —— 两道节流：进程内 Promise 链（Q.lastCallAt）+ **文件锁节拍器**
//     （data/.cj-pace.lock，跨模块实例/跨进程都有效，见下方 paceUpstream）。
//     实测教训：只有进程内链时，同一批请求的第二发会拿到 1600200。
//  2) 下单默认沙盒：isSandbox=1 走模拟支付，不扣真钱、不产生真实履约。
//     生产下单必须显式传 confirmReal=true（页面上还要手输确认词），默认绝不可能误触发。
//  3) Token 缓存 180 天，存在 globalThis，随进程失效，不落盘。
import { readFileSync, writeFileSync, existsSync, mkdirSync, openSync, closeSync, writeSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const API_KEY = process.env.CJ_API_KEY || "CJ5237017@api@c8d316f7cf414c5f8e5ddb37339ecaac";
const MIN_INTERVAL_MS = 1150;
/** 一般查询接口超时 */
const FETCH_TIMEOUT_MS = 20000;
/** 下单接口超时：实测 CJ createOrderV2 单次约需 20-30 秒，必须给足余量（nginx proxy_read_timeout = 120s） */
const ORDER_TIMEOUT_MS = 90_000;

const DATA_DIR = join(process.cwd(), "data");
const CHANNEL_LOG = join(DATA_DIR, "wholesale-channel-log.json");

// ---------------------------------------------------------------------------
// 跨进程节拍器（1 QPS 硬保证）
// ---------------------------------------------------------------------------
// 教训（2026-09-18 实测）：只靠进程内的 Promise 链做不到 1 QPS。
// 连续两次请求 /api/internal/wholesale?action=balance 时，第二次只用 0.21s
// 就直发了上游并拿到 1600200 —— 说明 Next 生产构建下同一批请求可能落在
// 不同的模块实例上，各持一份 lastCallAt，于是"各自守规矩、合起来超限"。
// 因此改为**文件锁 + 时间戳**做全局节拍：
//   抢到锁 → 读上次调用时间 → 补足 ≥1150ms 间隔 → 写回时间戳 → 放锁。
// 锁只在"预约时段"短暂持有（最多约 1.15 秒），不覆盖真实请求，
// 所以像 createOrderV2 那种 20~30 秒的长调用不会把其它调用堵死。
const PACE_LOCK = join(DATA_DIR, ".cj-pace.lock");
const PACE_STAMP = join(DATA_DIR, ".cj-pace.stamp");
/** 锁最长持有时间远超实际预约时长，超过就认为是崩溃遗留，可以抢占 */
const PACE_STALE_MS = 10_000;

async function paceUpstream(): Promise<void> {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
  for (let attempt = 0; attempt < 400; attempt++) {
    let fd: number | null = null;
    try {
      fd = openSync(PACE_LOCK, "wx");
    } catch (e: any) {
      if (e?.code !== "EEXIST") throw e;
      // 崩溃遗留的陈旧锁 → 抢占
      try {
        if (Date.now() - statSync(PACE_LOCK).mtimeMs > PACE_STALE_MS) unlinkSync(PACE_LOCK);
      } catch {}
      await sleep(40);
      continue;
    }
    try {
      let last = 0;
      try {
        last = statSync(PACE_STAMP).mtimeMs;
      } catch {
        last = 0;
      }
      const wait = MIN_INTERVAL_MS - (Date.now() - last);
      if (wait > 0) await sleep(wait);
      try {
        const w = openSync(PACE_STAMP, "w");
        writeSync(w, String(Date.now()));
        closeSync(w);
      } catch {}
      return;
    } finally {
      if (fd !== null) {
        try {
          closeSync(fd);
        } catch {}
      }
      try {
        unlinkSync(PACE_LOCK);
      } catch {}
    }
  }
  throw new Error("CJ 限速排队超时（>16s）");
}

// ---------------------------------------------------------------------------
// 全局串行队列（与 cj-detail.ts 共享同一把锁）
// ---------------------------------------------------------------------------

interface QueueState {
  lastCallAt: number;
  chain: Promise<unknown>;
  inflight: Map<string, Promise<unknown>>;
  stockInflight: Map<string, Promise<unknown>>;
  token: string | null;
  tokenExp: number;
}

const g = globalThis as unknown as { __szspdCjQueue?: QueueState };
const Q: QueueState = (g.__szspdCjQueue ??= {
  lastCallAt: 0,
  chain: Promise.resolve(),
  inflight: new Map(),
  stockInflight: new Map(),
  token: null,
  tokenExp: 0,
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function queueBusy(): number {
  return Q.inflight.size;
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function accessToken(): Promise<string> {
  if (Q.token && Date.now() < Q.tokenExp - 60_000) return Q.token;
  const j = await fetchJson(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: API_KEY }),
  });
  if (j.code !== 200 || !j.data?.accessToken) throw new Error(`CJ 鉴权失败 code=${j.code} ${j.message || ""}`);
  Q.token = j.data.accessToken as string;
  Q.tokenExp = new Date(j.data.accessTokenExpiryDate).getTime() || Date.now() + 180 * 24 * 3600_000;
  return Q.token!;
}

/** 所有上游调用串行 + 间隔 ≥1150ms，返回 {code,message,data} 原样结构 */
export async function cjCall(path: string, init?: RequestInit, timeoutMs?: number): Promise<any> {
  const token = await accessToken();
  const run = async () => {
    const wait = MIN_INTERVAL_MS - (Date.now() - Q.lastCallAt);
    if (wait > 0) await sleep(wait);
    Q.lastCallAt = Date.now();
    // 进程内节拍之后再过一道跨进程节拍器 —— 两道都要，缺一不可
    await paceUpstream();
    return fetchJson(
      `${CJ_BASE}${path}`,
      {
        ...init,
        headers: {
          "CJ-Access-Token": token,
          "Content-Type": "application/json",
          ...(init?.headers || {}),
        },
      },
      timeoutMs
    );
  };
  const p = Q.chain.then(run, run);
  Q.chain = p.then(
    () => undefined,
    () => undefined
  );
  return p;
}

/** 上游调用但要求业务成功，失败抛错 */
async function cjOk<T = any>(path: string, init?: RequestInit, timeoutMs?: number): Promise<T> {
  const j = await cjCall(path, init, timeoutMs);
  if (j.code !== 200) throw new Error(`CJ [${path}] code=${j.code} ${j.message || ""}`);
  return j.data as T;
}

// ---------------------------------------------------------------------------
// 通道操作日志（内部测试用，落盘便于回溯）
// ---------------------------------------------------------------------------

export interface ChannelLogEntry {
  at: string;
  action: string;
  detail: string;
  mode?: string;
  result?: string;
}

export function appendChannelLog(entry: Omit<ChannelLogEntry, "at">) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    let list: ChannelLogEntry[] = [];
    if (existsSync(CHANNEL_LOG)) {
      try {
        list = JSON.parse(readFileSync(CHANNEL_LOG, "utf-8"));
      } catch {
        list = [];
      }
    }
    list.push({ at: new Date().toISOString(), ...entry });
    if (list.length > 300) list = list.slice(-300);
    writeFileSync(CHANNEL_LOG, JSON.stringify(list, null, 1), "utf-8");
  } catch {}
}

export function readChannelLog(): ChannelLogEntry[] {
  try {
    if (!existsSync(CHANNEL_LOG)) return [];
    return (JSON.parse(readFileSync(CHANNEL_LOG, "utf-8")) as ChannelLogEntry[]).slice(-100).reverse();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 归一化
// ---------------------------------------------------------------------------

function s(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}
function n(v: unknown): number | null {
  const x = typeof v === "number" ? v : parseFloat(s(v));
  return Number.isFinite(x) ? x : null;
}
function httpsUrl(u: unknown): string {
  const v = s(u).trim();
  if (!/^https?:\/\//i.test(v)) return "";
  return v.replace(/^http:/, "https:");
}

export interface ChannelProduct {
  pid: string;
  sku: string;
  name: string;
  image: string;
  price: string;
  categoryPath: string;
  hasVideo: boolean;
}

export interface ChannelVariant {
  vid: string;
  sku: string;
  name: string;
  image: string;
  price: number | null;
  weightGrams: number | null;
  dims: string;
}

export interface ChannelFreightOption {
  logisticName: string;
  price: number | null;
  currency: string;
  aging: string;
  priceCny: number | null;
  tip: string;
}

export interface ChannelOrder {
  orderId: string;
  orderNumber: string;
  cjOrderId: string;
  status: string;
  amount: number | null;
  countryCode: string;
  country: string;
  province: string;
  city: string;
  address: string;
  customer: string;
  phone: string;
  trackingNumber: string;
  trackingUrl: string;
  /** 上游给出的付货款链接（payType=1 时存在） */
  payUrl: string;
  weightGrams: number | null;
  createdAt: string;
  isSandbox: boolean;
  raw?: unknown;
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  CREATED: "已创建",
  IN_CART: "已加购",
  UNPAID: "待支付",
  UNSHIPPED: "待发货",
  SHIPPED: "已发货",
  DELIVERED: "已妥投",
  CANCELLED: "已取消",
};

export function orderStatusLabel(code: string): string {
  return ORDER_STATUS_LABEL[s(code).toUpperCase()] || s(code) || "-";
}

function normalizeListItem(p: any): ChannelProduct {
  return {
    pid: s(p?.id || p?.pid),
    sku: s(p?.sku || p?.productSku),
    name: s(p?.nameEn || p?.productNameEn || p?.productName),
    image: httpsUrl(p?.bigImage || p?.productImage),
    price: s(p?.sellPrice || p?.nowPrice || p?.discountPrice),
    categoryPath: [s(p?.oneCategoryName), s(p?.twoCategoryName), s(p?.threeCategoryName)].filter(Boolean).join(" > "),
    hasVideo: !!(p?.isVideo || p?.isVedio || (p?.videoList && String(p.videoList).length > 2)),
  };
}

function normalizeVariantRow(v: any): ChannelVariant {
  const l = n(v?.variantLength);
  const w = n(v?.variantWidth);
  const h = n(v?.variantHeight);
  return {
    vid: s(v?.vid),
    sku: s(v?.variantSku),
    name: s(v?.variantKey || v?.variantNameEn || v?.variantName),
    image: httpsUrl(v?.variantImage),
    price: n(v?.variantSellPrice),
    weightGrams: n(v?.variantWeight),
    dims: l || w || h ? `${l ?? "-"} × ${w ?? "-"} × ${h ?? "-"} mm` : "",
  };
}

function normalizeOrderRow(o: any): ChannelOrder {
  return {
    // 沙盒接口（simulatePay / updateStatus / updateTrackNumber）要求传的是「CJ 订单号」，
    // 在订单列表里对应 cjOrderId（SD 开头），不是列表的 orderId 字段 —— 这里优先取它。
    orderId: s(o?.cjOrderId || o?.orderId),
    orderNumber: s(o?.orderNum || o?.orderNumber),
    cjOrderId: s(o?.cjOrderId),
    status: s(o?.orderStatus),
    amount: n(o?.orderAmount),
    countryCode: s(o?.shippingCountryCode),
    country: s(o?.shippingCountry),
    province: s(o?.shippingProvince),
    city: s(o?.shippingCity),
    address: s(o?.shippingAddress),
    customer: s(o?.shippingCustomerName),
    phone: s(o?.shippingPhone),
    trackingNumber: s(o?.trackNumber || o?.trackingNumber),
    trackingUrl: s(o?.trackingUrl),
    payUrl: httpsUrl(o?.cjPayUrl || o?.payUrl),
    weightGrams: n(o?.orderWeight),
    createdAt: s(o?.createDate || o?.createdAt || o?.storeCreateDate),
    isSandbox: !!(o?.isSandbox && Number(o.isSandbox) === 1),
  };
}

// ---------------------------------------------------------------------------
// 通道能力
// ---------------------------------------------------------------------------

export interface ChannelAccount {
  userNum: string;
  name: string;
  email: string;
  balance: number;
  freeze: number;
  balanceRaw: unknown;
}

export async function channelAccount(): Promise<ChannelAccount> {
  const setting = await cjOk<any>("/setting/get");
  let balance = 0;
  let freeze = 0;
  let balanceRaw: unknown = null;
  try {
    await sleep(0); // 队列已保证间隔
    const b = await cjOk<any>("/shopping/pay/getBalance");
    balanceRaw = b;
    balance = n(b?.amount) ?? 0;
    freeze = n(b?.freezeAmount) ?? 0;
  } catch {}
  return {
    userNum: s(setting?.userNum),
    name: s(setting?.openName),
    email: s(setting?.openEmail),
    balance,
    freeze,
    balanceRaw,
  };
}

export async function channelSearch(keyword: string, page = 1, size = 20): Promise<{ items: ChannelProduct[]; total: number }> {
  const sp = new URLSearchParams({ page: String(page), size: String(Math.min(100, Math.max(1, size))) });
  if (keyword.trim()) sp.set("keyWord", keyword.trim()); // 必须驼峰，小写 keyword 会被忽略
  const data = await cjOk<any>(`/product/listV2?${sp}`);
  const items: ChannelProduct[] = [];
  for (const group of data?.content || []) {
    for (const p of group?.productList || []) items.push(normalizeListItem(p));
  }
  return { items, total: n(data?.totalRecords) ?? items.length };
}

/** 按 SKU / PID 取商品详情（含描述、多图、变体） */
export async function channelProduct(pidOrSku: string): Promise<{
  pid: string;
  sku: string;
  name: string;
  description: string;
  images: string[];
  variants: ChannelVariant[];
  weightGrams: number | null;
  sellPrice: string;
}> {
  const key = pidOrSku.trim();
  if (!key) throw new Error("SKU/PID 不能为空");
  const isPid = /^[0-9a-fA-F-]{30,40}$/.test(key);
  const q = isPid ? `pid=${encodeURIComponent(key)}` : `productSku=${encodeURIComponent(key)}`;
  const d = await cjOk<any>(`/product/query?${q}`);
  const images: string[] = [];
  const seen = new Set<string>();
  for (const raw of [...(Array.isArray(d?.productImageSet) ? d.productImageSet : []), d?.bigImage]) {
    const u = httpsUrl(raw);
    if (u && !seen.has(u)) {
      seen.add(u);
      images.push(u);
    }
  }
  return {
    pid: s(d?.pid),
    sku: s(d?.productSku),
    name: s(d?.productNameEn || d?.productName),
    description: s(d?.description),
    images: images.slice(0, 24),
    variants: (Array.isArray(d?.variants) ? d.variants : []).map(normalizeVariantRow).filter((v: ChannelVariant) => v.vid || v.sku),
    weightGrams: n(d?.productWeight),
    sellPrice: s(d?.sellPrice),
  };
}

export async function channelVariants(sku: string): Promise<ChannelVariant[]> {
  const d = await cjOk<any>(`/product/variant/query?productSku=${encodeURIComponent(sku)}`);
  const rows = Array.isArray(d) ? d : [];
  return rows.map(normalizeVariantRow).filter((v) => v.vid || v.sku);
}

export async function channelFreight(input: {
  vid?: string;
  /** 变体 SKU（不是商品 SKU）。CJ 运费试算只认 vid / variantSku */
  variantSku?: string;
  quantity?: number;
  startCountryCode?: string;
  endCountryCode: string;
}): Promise<ChannelFreightOption[]> {
  const body: Record<string, unknown> = {
    startCountryCode: input.startCountryCode || "CN",
    endCountryCode: input.endCountryCode,
    products: [{ quantity: Math.max(1, input.quantity || 1) }],
  };
  const p0 = (body.products as any[])[0];
  if (input.vid) p0.vid = input.vid;
  else if (input.variantSku) p0.variantSku = input.variantSku;
  if (!p0.vid && !p0.variantSku) {
    throw new Error("需要 vid 或 variantSku —— CJ 的运费试算不接受商品级 SKU，请先选定变体");
  }
  const data = await cjOk<any>("/logistic/freightCalculate", { method: "POST", body: JSON.stringify(body) });
  const rows = Array.isArray(data) ? data : [];
  return rows
    .map((x: any) => ({
      logisticName: s(x?.logisticName),
      price: n(x?.logisticPrice),
      currency: "USD",
      aging: s(x?.logisticAging),
      priceCny: n(x?.logisticPriceCn),
      tip: s(x?.tip || x?.message || x?.error),
    }))
    .filter((x: ChannelFreightOption) => x.logisticName && !x.tip);
}

export interface CreateOrderInput {
  /** 我们的订单号，必须唯一 */
  orderNumber?: string;
  vid?: string;
  sku?: string;
  quantity: number;
  /** 多商品下单：优先于 vid/sku/quantity（一个订单可含多个变体） */
  lines?: { vid?: string; sku?: string; quantity: number }[];
  logisticName: string;
  fromCountryCode?: string;
  shippingCustomerName: string;
  shippingPhone?: string;
  shippingCountryCode: string;
  shippingCountry: string;
  shippingProvince: string;
  shippingCity: string;
  shippingAddress: string;
  shippingAddress2?: string;
  shippingZip?: string;
  houseNumber?: string;
  email?: string;
  remark?: string;
  /** true = 真实订单（会走真实扣费/履约），未显式传则一律沙盒 */
  sandbox?: boolean;
  payType?: number;
}

/**
 * 按「我方订单号」回查。
 * 注意：CJ 的 order/list 并不支持 orderNumber 过滤（实测传了也返回全量），
 * 而且列表是按时间升序返回、新单往往落在最后 —— 所以要翻最后一页找。
 */
export async function findOrderByNumber(orderNumber: string): Promise<ChannelOrder | null> {
  if (!orderNumber) return null;
  try {
    const first = await channelListOrders(1, 50);
    const hit = first.items.find((o) => o.orderNumber === orderNumber);
    if (hit) return hit;
    const pages = Math.max(1, Math.ceil(first.total / 50));
    for (const p of [pages, pages - 1]) {
      if (p <= 1) continue;
      const r = await channelListOrders(p, 50);
      const found = r.items.find((o) => o.orderNumber === orderNumber);
      if (found) return found;
    }
  } catch {}
  return null;
}

function looksLikeTimeout(e: unknown): boolean {
  const msg = e instanceof Error ? `${e.name} ${e.message}` : String(e);
  return /abort|timeout|timed out|ETIMEDOUT|ECONNRESET|socket hang up|fetch failed/i.test(msg);
}

export interface CreateOrderResult {
  ok: true;
  sandbox: boolean;
  orderNumber: string;
  /** createOrderV2 返回的订单号（SD 开头）—— payBalance / getOrderDetail 用这个 */
  orderId: string;
  /** 发货单号（CJ 开头）—— payBalanceV2 与物流追踪用这个；payType=3 时为 null */
  shipmentOrderId: string;
  productAmount: number | null;
  postageAmount: number | null;
  totalAmount: number;
  /** true = 首次请求超时，但回查确认上游其实已建单成功 */
  recovered?: boolean;
  /** payType=1 时上游返回的支付链接（生产环境才有；沙盒为 null） */
  cjPayUrl: string | null;
  /** 上游支付单号 */
  payId: string | null;
  raw?: unknown;
}

export async function channelCreateOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const sandbox = input.sandbox !== false; // 默认沙盒
  const orderNumber =
    (input.orderNumber && input.orderNumber.trim()) ||
    `SZSPD-${sandbox ? "SBX" : "REAL"}-${Date.now()}`;
  const body: Record<string, unknown> = {
    orderNumber,
    shippingZip: input.shippingZip || "",
    shippingCountryCode: input.shippingCountryCode,
    shippingCountry: input.shippingCountry,
    shippingProvince: input.shippingProvince,
    shippingCity: input.shippingCity,
    shippingCounty: "",
    shippingPhone: input.shippingPhone || "",
    shippingCustomerName: input.shippingCustomerName,
    shippingAddress: input.shippingAddress,
    shippingAddress2: input.shippingAddress2 || "",
    houseNumber: input.houseNumber || "",
    email: input.email || "",
    remark: input.remark || (sandbox ? "SZSPD internal channel sandbox test" : ""),
    consigneeID: "",
    // payType=1（页面支付）+ isSandbox=1：CJ 会自动走假支付流程，订单创建后即为已支付 UNSHIPPED(300)，
    // 可直接进入状态流转（300→400→500→600→700）与写运单号。
    // 若传 payType=3（仅建单不发起支付），订单会停在 CREATED(100)，无法模拟支付或流转 —— 实测确认。
    payType: input.payType ?? 1,
    isSandbox: sandbox ? 1 : 0,
    logisticName: input.logisticName,
    fromCountryCode: input.fromCountryCode || "CN",
    products:
      input.lines && input.lines.length > 0
        ? input.lines.map((l) => ({
            quantity: Math.max(1, Number(l.quantity) || 1),
            ...(l.vid ? { vid: String(l.vid) } : {}),
            ...(l.sku ? { sku: l.sku } : {}),
          }))
        : [
            {
              quantity: Math.max(1, input.quantity || 1),
              ...(input.vid ? { vid: input.vid } : {}),
              ...(input.sku ? { sku: input.sku } : {}),
            },
          ],
  };
  const mode = sandbox ? "sandbox" : "PRODUCTION";
  const qtyDesc = input.lines?.length
    ? `${input.lines.length} 项 / 共 ${input.lines.reduce((s, l) => s + (Number(l.quantity) || 1), 0)} 件`
    : `${input.quantity} 件`;
  try {
    const data = await cjOk<any>(
      "/shopping/order/createOrderV2",
      { method: "POST", body: JSON.stringify(body) },
      ORDER_TIMEOUT_MS
    );
    appendChannelLog({
      action: "create-order",
      mode,
      detail: `${orderNumber} · ${input.shippingCountryCode} · ${input.logisticName} · ${qtyDesc}`,
      result: `ok orderId=${s(data?.orderId)} 货款 ${s(data?.productAmount)} 运费 ${s(data?.postageAmount)}`,
    });
    return {
      ok: true,
      sandbox,
      orderNumber,
      orderId: s(data?.orderId),
      productAmount: n(data?.productAmount),
      postageAmount: n(data?.postageAmount),
      totalAmount: (n(data?.productAmount) ?? 0) + (n(data?.postageAmount) ?? 0),
      // payType=1 且非沙盒时，上游给出 cjPayUrl —— 这是「我方 → CJ」的付货款页面
      cjPayUrl: httpsUrl(data?.cjPayUrl) || null,
      payId: s(data?.payId) || null,
      raw: data,
    };
  } catch (e) {
    // 下单是最慢的接口（实测 20-30s）。若超时/连接中断，上游很可能已经建单成功，
    // 此时**绝不能**直接报失败让用户重试（会重复下单）—— 先按我方单号回查确认。
    if (looksLikeTimeout(e)) {
      const found = await findOrderByNumber(orderNumber);
      if (found) {
        appendChannelLog({
          action: "create-order",
          mode,
          detail: `${orderNumber} · 首次请求超时，回查确认上游已建单`,
          result: `recovered orderId=${found.orderId} 金额 ${found.amount}`,
        });
        return {
          ok: true,
          sandbox,
          orderNumber,
          orderId: found.orderId,
          shipmentOrderId: "",
          productAmount: null,
          postageAmount: null,
          totalAmount: found.amount ?? 0,
          recovered: true,
          cjPayUrl: found.payUrl || null,
          payId: null,
        };
      }
      appendChannelLog({
        action: "create-order",
        mode,
        detail: `${orderNumber} · 超时且回查未找到`,
        result: "timeout-unconfirmed",
      });
      throw new Error(
        `上游下单超时（超过 ${ORDER_TIMEOUT_MS / 1000}s），且按单号 ${orderNumber} 回查订单列表未找到。` +
          `订单可能在 CJ 后台处理中，请先到订单列表人工确认，再决定是否重试（重试请沿用同一单号）。`
      );
    }
    appendChannelLog({ action: "create-order", mode, detail: orderNumber, result: `fail ${(e as Error).message}` });
    throw e;
  }
}

export async function channelListOrders(page = 1, size = 10): Promise<{ items: ChannelOrder[]; total: number }> {
  const data = await cjOk<any>(`/shopping/order/list?pageNum=${page}&pageSize=${Math.min(50, Math.max(1, size))}`);
  return {
    items: (data?.list || []).map(normalizeOrderRow),
    total: n(data?.total) ?? 0,
  };
}

/** 沙盒专用：模拟支付 / 推进状态 / 写运单号（orderId 必须是 CJ 订单号） */
export async function channelSandbox(action: "pay" | "status" | "track", orderId: string, value?: string) {
  const path =
    action === "pay"
      ? "/shopping/sandbox/simulatePay"
      : action === "status"
        ? "/shopping/sandbox/updateStatus"
        : "/shopping/sandbox/updateTrackNumber";

  let body: Record<string, unknown>;
  if (action === "pay") {
    body = { orderId };
  } else if (action === "status") {
    // 文档参数名是 targetStatus（integer），只接受 400/500/600/700，且只能顺序流转
    const target = Number(value);
    if (![400, 500, 600, 700].includes(target)) {
      throw new Error("targetStatus 只能是 400 / 500 / 600 / 700，且必须按 300→400→500→600→700 顺序推进");
    }
    body = { orderId, targetStatus: target };
  } else {
    body = { orderId, trackNumber: value };
  }

  const data = await cjOk<any>(path, { method: "POST", body: JSON.stringify(body) });
  appendChannelLog({ action: `sandbox-${action}`, mode: "sandbox", detail: `${orderId} ${value || ""}`, result: "ok" });
  return data;
}

export async function channelOrderDetail(orderId: string) {
  return cjOk<any>(`/shopping/order/getOrderDetail?orderId=${encodeURIComponent(orderId)}`);
}

/**
 * 订单确认（PATCH）。
 * 关键用途：**救活 payType=3 建出来的空壳单**。
 *   payType=3 只建单、不生成发货单，订单停在 CREATED 且事后无法支付
 *   （实测 payBalance 报 1603100 Order not found）。
 *   调用 confirmOrder 后订单会流转到 UNPAID 并补出发货单，重新变为可支付
 *   （实测：同一单号的 payBalance 从 1603100 变成 1604000 Balance is insufficient，
 *   即已走到余额校验这一步 —— 说明订单确实被救活了）。
 */
export async function channelConfirmOrder(orderId: string) {
  if (!orderId) throw new Error("orderId 不能为空");
  const data = await cjOk<any>("/shopping/order/confirmOrder", {
    method: "PATCH",
    body: JSON.stringify({ orderId }),
  });
  appendChannelLog({ action: "confirm-order", mode: "order", detail: orderId, result: "ok" });
  return data;
}

/** 从订单详情里判定「这笔 CJ 订单到底付没付」—— 唯一可信来源，别用本地状态猜 */
export function detailPaid(d: any): { paid: boolean; status: string; amount: number; paymentDate: string } {
  const status = s(d?.orderStatus).toUpperCase();
  const paymentDate = s(d?.paymentDate);
  const amount = n(d?.orderAmount) ?? 0;
  // CJ 实际为这些状态时钱已到账；UNPAID / CREATED / IN_CART 都算未付。
  const PAID_STATUS = new Set(["UNSHIPPED", "SHIPPED", "DELIVERED", "PART_SHIPPED"]);
  return { paid: !!paymentDate || PAID_STATUS.has(status), status, amount, paymentDate };
}

// ---------------------------------------------------------------------------
// 付款给 CJ（「我方 → 上游」这一层）
// ---------------------------------------------------------------------------
// 商业链路是两层，别混淆：
//   ① 终端客户 → 我们：由 szspd.cn 自己的收银台负责（见 pay-gateway.ts），CJ 不参与
//   ② 我们 → CJ：用 CJ 的支付能力付货款，即本节的余额支付 / 支付链接
// 余额充足时可全自动（payType=2 建单即扣），余额不足则用 payType=1 取链接人工付。

/** 账户余额（美元） */
export async function channelBalance(): Promise<{ amount: number; freeze: number; noWithdrawal: number; raw: unknown }> {
  const b = await cjOk<any>("/shopping/pay/getBalance");
  return {
    amount: n(b?.amount) ?? 0,
    freeze: n(b?.freezeAmount) ?? 0,
    noWithdrawal: n(b?.noWithdrawalAmount) ?? 0,
    raw: b,
  };
}

/**
 * 用账户余额支付一笔订单（适用于状态为 UNPAID 的订单）。
 * @param orderId CJ 订单号
 */
export async function channelPayBalance(orderId: string) {
  if (!orderId) throw new Error("orderId 不能为空");
  const data = await cjOk<any>("/shopping/pay/payBalance", {
    method: "POST",
    body: JSON.stringify({ orderId }),
  });
  appendChannelLog({ action: "pay-balance", mode: "balance", detail: orderId, result: "ok" });
  return data;
}

/**
 * 余额支付 V2（按发货单号 shipmentOrderId，用于母单/合并发货场景）。
 * 实测：传 CJ 开头的发货单号能被正确识别（余额不足时报 1604000，
 * 而不是找不到单的 1603100），所以这是核对通过的那条路径。
 * payId 可选，不传由上游自动生成。
 */
export async function channelPayBalanceV2(shipmentOrderId: string, payId?: string) {
  if (!shipmentOrderId) throw new Error("shipmentOrderId 不能为空");
  const data = await cjOk<any>("/shopping/pay/payBalanceV2", {
    method: "POST",
    body: JSON.stringify(payId ? { shipmentOrderId, payId } : { shipmentOrderId }),
  });
  appendChannelLog({ action: "pay-balance-v2", mode: "balance", detail: shipmentOrderId, result: "ok" });
  return data;
}

/**
 * 余额是否够付这笔单（用于决定「自动扣款」还是「走人工」，避免下单卡死）
 * 返回所需金额 = 货款 + 运费 - 已支付。
 */
export async function canPayFromBalance(needUsd: number): Promise<{ enough: boolean; balance: number; need: number }> {
  const bal = await channelBalance();
  return { enough: bal.amount >= needUsd, balance: bal.amount, need: needUsd };
}

/** 通道自检：把每一步都试一遍（只读 + 沙盒），返回逐步结果 */
export async function channelSelfTest(sku = "CJJT1355346", toCountry = "GH") {
  const steps: Array<{ step: string; ok: boolean; detail: string }> = [];
  const push = (step: string, ok: boolean, detail: string) => steps.push({ step, ok, detail });

  let account: ChannelAccount | null = null;
  try {
    account = await channelAccount();
    push("账号 / 余额", true, `${account.userNum} ${account.name} · 余额 $${account.balance}`);
  } catch (e: any) {
    push("账号 / 余额", false, e.message);
  }

  let variants: ChannelVariant[] = [];
  try {
    variants = await channelVariants(sku);
    push("变体查询", variants.length > 0, `${sku} → ${variants.length} 个变体`);
  } catch (e: any) {
    push("变体查询", false, e.message);
  }

  let freight: ChannelFreightOption[] = [];
  if (variants[0]?.vid) {
    try {
      freight = await channelFreight({ vid: variants[0].vid, quantity: 1, endCountryCode: toCountry });
      push("运费试算", freight.length > 0, `→ ${toCountry} 共 ${freight.length} 条渠道，最低 $${freight[0]?.price}`);
    } catch (e: any) {
      push("运费试算", false, e.message);
    }
  }

  try {
    const created = await channelCreateOrder({
      vid: variants[0]?.vid,
      sku: variants[0]?.vid ? undefined : sku,
      quantity: 1,
      logisticName: freight[0]?.logisticName || "CJPacket Eub",
      shippingCustomerName: "SZSPD Self Test",
      shippingPhone: "+233248009090",
      shippingCountryCode: toCountry,
      shippingCountry: toCountry === "GH" ? "Ghana" : toCountry,
      shippingProvince: "Ashanti",
      shippingCity: "Kumasi",
      shippingAddress: "Plot 36, Block P, Fawoode",
      shippingZip: "AD-021-7690",
      sandbox: true,
    });
    push("沙盒下单", true, `${created.orderId} · 货款 $${created.productAmount} + 运费 $${created.postageAmount} = $${created.totalAmount}`);
  } catch (e: any) {
    push("沙盒下单", false, e.message);
  }

  try {
    const list = await channelListOrders(1, 5);
    push("订单列表", true, `共 ${list.total} 单`);
  } catch (e: any) {
    push("订单列表", false, e.message);
  }

  return { steps, account };
}

/** 访问口令的 cookie 名（内部测试页的闸门） */
export const WS_COOKIE = "szspd_ws_gate";

/** 访问口令（存在 data/wholesale-token.txt；不存在则生成） */
export function channelAccessToken(): string {
  const file = join(DATA_DIR, "wholesale-token.txt");
  try {
    if (existsSync(file)) {
      const t = readFileSync(file, "utf-8").trim();
      if (t) return t;
    }
  } catch {}
  const t = createHash("sha256").update(`${Date.now()}-${Math.random()}`).digest("hex").slice(0, 16);
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(file, t, "utf-8");
  } catch {}
  return t;
}
