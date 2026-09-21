// SZSPD Store — 商品详情「访问时懒加载 + 缓存」数据层
//
// 设计要点：
//  1) 详情（描述 / 多图 / 规格 / 变体）体积大、变化慢，不适合在每小时全量同步里拉
//     （CJ 限流 1 QPS，6000 条 × 详情 = 不可能）。改为「谁被访问，才拉谁」。
//  2) 两级缓存：进程内 LRU（免费）+ 磁盘 data/detail-cache/<hash>.json（跨重启、跨进程）。
//  3) 上游严格 1 QPS：详情/库存请求全部走 `cj-channel` 的全局串行队列（cjCall），
//     与运费试算、下单共用同一把节流锁 —— 这样才不会出现"两条队列各自守规矩、
//     合起来超限"的 1600200。同一 SKU 并发只发一次（单飞，inflight map）。
//  4) 上游失败 / 商品下架写负缓存（6 小时），避免被爬虫或刷新打爆配额。
//  5) 描述是 CJ 提供的 HTML —— 走白名单清洗（去脚本/事件/危险协议）后才交给前端，
//     绝不用 dangerouslySetInnerHTML 渲染原始上游 HTML。
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync, unlinkSync, renameSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";
import Database from "better-sqlite3";
import { cjCall } from "./cj-channel";

const DATA_DIR = join(process.cwd(), "data");
const CACHE_DIR = join(DATA_DIR, "detail-cache");

/** 详情新鲜期：14 天内直接命中 */
export const DETAIL_FRESH_MS = 14 * 24 * 3600_000;
/** 过期但可用：命中即渲染，同时由前端后台静默刷新（stale-while-revalidate） */
export const DETAIL_STALE_MS = 120 * 24 * 3600_000;
/** 库存新鲜期：6 小时 */
export const STOCK_FRESH_MS = 6 * 3600_000;
/** 失败/下架负缓存：6 小时 */
const NEGATIVE_MS = 6 * 3600_000;
/** 磁盘缓存文件上限（超出后按 mtime 删最旧） */
const MAX_CACHE_FILES = 9000;

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface DetailVariant {
  vid: string;
  sku: string;
  /** 规格名，如 "Black / XL"，无规格时为空 */
  name: string;
  image: string | null;
  /** 上游单件成本价（美元） */
  price: number | null;
  weightGrams: number | null;
  /** "230 × 180 × 80 mm" */
  dims: string | null;
  barcode: string | null;
}

export interface DetailSpec {
  label: string;
  value: string;
}

export interface ProductDetailData {
  sku: string;
  pid: string;
  /** 清洗后的描述 HTML（白名单标签，无脚本/事件属性） */
  descriptionHtml: string;
  /** 描述里的纯文本，用于折叠判断与 SEO */
  descriptionText: string;
  images: string[];
  video: string | null;
  variants: DetailVariant[];
  /** 规格属性名的可读形式，如 ["Style"] */
  variantKeys: string[];
  specs: DetailSpec[];
  weightGrams: number | null;
  /** 上游标价（美元，字符串原样） */
  upstreamPrice: string | null;
  fetchedAt: string;
}

export interface DetailHit {
  detail: ProductDetailData;
  ageMs: number;
  /** true = 超过新鲜期但仍可用（应后台刷新） */
  stale: boolean;
}

export type DetailMissReason = "not_found" | "upstream_error" | "rate_limited";

export interface DetailResult {
  ok: boolean;
  detail?: ProductDetailData;
  cached?: boolean;
  stale?: boolean;
  reason?: DetailMissReason;
  message?: string;
}

// ---------------------------------------------------------------------------
// HTML 白名单清洗
// ---------------------------------------------------------------------------

const ALLOWED_TAGS = new Set([
  "p", "br", "b", "strong", "i", "em", "u", "s", "strike", "del", "ins", "sub", "sup", "small",
  "ul", "ol", "li", "dl", "dt", "dd", "div", "span", "font", "center",
  "h1", "h2", "h3", "h4", "h5", "h6", "hr", "blockquote", "pre", "code",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
  "img", "a", "figure", "figcaption",
]);

const DROP_WITH_CONTENT = [
  "script", "style", "iframe", "object", "embed", "form", "button", "select", "textarea",
  "noscript", "template", "svg", "math", "link", "meta", "base", "applet", "frame", "frameset",
  "input", "audio", "video", "canvas",
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 只放行 http/https 绝对地址与站内相对路径，杜绝 javascript:/data:/vbscript: */
function safeUrl(raw: string): string | null {
  const v = String(raw || "").trim().replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s/g, "");
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^\/\//.test(v)) return "https:" + v;
  if (/^\/[^/]/.test(v)) return v;
  return null;
}

function buildSafeAttrs(tag: string, attrs: string): string {
  const out: string[] = [];
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/g;
  let m: RegExpExecArray | null;
  let hasSrc = false;
  while ((m = re.exec(attrs)) !== null) {
    const name = m[1].toLowerCase();
    const val = m[3] ?? m[4] ?? m[5] ?? "";
    if (name.startsWith("on")) continue; // 事件属性一律丢弃
    if (tag === "img") {
      if (!hasSrc && (name === "src" || name === "data-src" || name === "data-original" || name === "data-lazy-src")) {
        const u = safeUrl(val);
        if (u) {
          out.push(`src="${escapeAttr(u)}"`);
          hasSrc = true;
        }
      } else if (name === "alt") {
        out.push(`alt="${escapeAttr(val).slice(0, 200)}"`);
      }
      continue;
    }
    if (tag === "a" && name === "href") {
      const u = safeUrl(val);
      if (u) out.push(`href="${escapeAttr(u)}"`);
      continue;
    }
    // 其余属性（class / id / style / width …）一律丢弃，避免上游样式污染版面
  }
  if (tag === "img") out.push('loading="lazy"', 'referrerpolicy="no-referrer"');
  if (tag === "a") out.push('target="_blank"', 'rel="noopener noreferrer nofollow"');
  return out.join(" ");
}

/** CJ 描述 HTML → 白名单安全 HTML */
export function sanitizeHtml(raw: string): string {
  if (!raw) return "";
  let s = String(raw);
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  s = s.replace(/<![^>]*>/g, "");
  for (const tag of DROP_WITH_CONTENT) {
    s = s.replace(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi"), "");
    s = s.replace(new RegExp(`<\\/?${tag}\\b[^>]*\\/?>`, "gi"), "");
  }
  s = s.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g, (full, slash: string, name: string, attrs: string) => {
    const tag = name.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return escapeHtml(full); // 非白名单标签降级为纯文本，不丢内容
    if (slash) return `</${tag}>`;
    const keep = buildSafeAttrs(tag, attrs || "");
    return keep ? `<${tag} ${keep}>` : `<${tag}>`;
  });
  return s.trim();
}

/** 安全 HTML → 纯文本（去标签 + 解实体 + 压空白） */
export function htmlToText(html: string): string {
  return String(html || "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// 上游调用：直接复用 cj-channel 的全局串行队列
// ---------------------------------------------------------------------------
// 重要：CJ 账号级硬限 1 QPS。如果本模块自带一条队列，就会和 cj-channel 的队列
// 并行发请求 —— 两条队列各自"守规矩"，合起来照样超限报 1600200。
// 所以这里不再自己管 token / 节流，全部走 cjCall（它负责 token 缓存 + 1.15s 串行）。
// 本模块只保留「同一 SKU 并发只发一次」的单飞表。

interface QueueState {
  inflight: Map<string, Promise<DetailResult>>;
  stockInflight: Map<string, Promise<Record<string, StockInfo>>>;
}

const g = globalThis as unknown as { __szspdDetailSingle?: QueueState };
const Q: QueueState = (g.__szspdDetailSingle ??= {
  inflight: new Map(),
  stockInflight: new Map(),
});

// ---------------------------------------------------------------------------
// 磁盘缓存
// ---------------------------------------------------------------------------

function ensureDir() {
  try {
    if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  } catch {}
}

function cachePath(sku: string): string {
  const h = createHash("sha1").update(String(sku).toLowerCase()).digest("hex").slice(0, 20);
  return join(CACHE_DIR, `${h}.json`);
}

interface CacheEnvelope<T> {
  v: 1;
  sku: string;
  kind: "detail" | "stock" | "negative";
  fetchedAt: number;
  error?: { reason: DetailMissReason; message: string };
  data?: T;
}

function readEnvelope(sku: string): CacheEnvelope<any> | null {
  try {
    const p = cachePath(sku);
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf-8")) as CacheEnvelope<any>;
  } catch {
    return null;
  }
}

function writeEnvelope(sku: string, env: CacheEnvelope<any>) {
  try {
    ensureDir();
    const p = cachePath(sku);
    const tmp = `${p}.tmp${process.pid}`;
    writeFileSync(tmp, JSON.stringify(env), "utf-8");
    renameSync(tmp, p); // 原子替换，避免读到半个文件
  } catch {}
}

/** 缓存文件数超限时，按 mtime 删最旧的一批 */
function pruneCache() {
  try {
    ensureDir();
    const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
    if (files.length <= MAX_CACHE_FILES) return;
    const withTime = files
      .map((f) => {
        try {
          return { f, t: statSync(join(CACHE_DIR, f)).mtimeMs };
        } catch {
          return { f, t: 0 };
        }
      })
      .sort((a, b) => a.t - b.t);
    const drop = withTime.slice(0, files.length - MAX_CACHE_FILES);
    for (const d of drop) {
      try {
        unlinkSync(join(CACHE_DIR, d.f));
      } catch {}
    }
  } catch {}
}

let memHits = 0;
let memMisses = 0;

// ---------------------------------------------------------------------------
// 上游数据归一化
// ---------------------------------------------------------------------------

function toStr(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

/** CJ 有些字段是 `["Metal"]` / "Metal" / 数组三种形态，统一成字符串数组 */
function parseMaybeJsonList(raw: unknown): string[] {
  if (raw === null || raw === undefined) return [];
  if (Array.isArray(raw)) return raw.map((x) => toStr(x).trim()).filter(Boolean);
  const s = toStr(raw).trim();
  if (!s) return [];
  if (s.startsWith("[")) {
    try {
      const a = JSON.parse(s);
      if (Array.isArray(a)) return a.map((x) => toStr(x).trim()).filter(Boolean);
    } catch {}
  }
  return [s];
}

function dedupeUrls(list: unknown[], limit = 24): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const u = toStr(raw).trim();
    if (!u || !/^https?:\/\//i.test(u)) continue;
    const key = u.replace(/^http:/, "https:");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
    if (out.length >= limit) break;
  }
  return out;
}

function numOrNull(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(toStr(v));
  return Number.isFinite(n) ? n : null;
}

export function normalizeVariant(raw: any): DetailVariant {
  const nameParts = [toStr(raw?.variantKey), toStr(raw?.variantNameEn), toStr(raw?.variantName)]
    .map((s) => s.trim())
    .filter(Boolean);
  const name = nameParts[0] || "";
  const l = numOrNull(raw?.variantLength);
  const w = numOrNull(raw?.variantWidth);
  const h = numOrNull(raw?.variantHeight);
  const dims = l || w || h ? `${l ?? "-"} × ${w ?? "-"} × ${h ?? "-"} mm` : null;
  return {
    vid: toStr(raw?.vid),
    sku: toStr(raw?.variantSku),
    name,
    image: /^https?:\/\//i.test(toStr(raw?.variantImage)) ? toStr(raw.variantImage).replace(/^http:/, "https:") : null,
    price: numOrNull(raw?.variantSellPrice),
    weightGrams: numOrNull(raw?.variantWeight),
    dims,
    barcode: toStr(raw?.barcode) || null,
  };
}

/** 上游详情 JSON → 我们内部的 ProductDetailData */
export function normalizeDetail(sku: string, d: any): ProductDetailData {
  const html = sanitizeHtml(toStr(d?.description));
  const text = htmlToText(html);

  const images = dedupeUrls(
    [
      ...(Array.isArray(d?.productImageSet) ? d.productImageSet : []),
      ...(Array.isArray(d?.productImage) ? d.productImage : []),
      d?.bigImage,
    ],
    24
  );

  const variants = (Array.isArray(d?.variants) ? d.variants : [])
    .map(normalizeVariant)
    .filter((v: DetailVariant) => v.vid || v.sku);

  // 规格表
  const specs: DetailSpec[] = [];
  const material = parseMaybeJsonList(d?.materialNameEn).join(", ");
  if (material) specs.push({ label: "Material", value: material });
  const packing = parseMaybeJsonList(d?.packingNameEn).join(", ");
  if (packing) specs.push({ label: "Packaging", value: packing });
  const weight = numOrNull(d?.productWeight);
  if (weight) specs.push({ label: "Weight", value: weight >= 1000 ? `${(weight / 1000).toFixed(2)} kg` : `${weight} g` });
  const packWeight = numOrNull(d?.packingWeight);
  if (packWeight && packWeight !== weight)
    specs.push({ label: "Shipping weight", value: packWeight >= 1000 ? `${(packWeight / 1000).toFixed(2)} kg` : `${packWeight} g` });
  const materialKey = parseMaybeJsonList(d?.materialNameSet).join(", ");
  if (materialKey && materialKey !== material) specs.push({ label: "材质", value: materialKey });
  if (variants.length > 1) specs.push({ label: "Options", value: `${variants.length} available` });

  const variantKeys = Array.from(
    new Set([...parseMaybeJsonList(d?.productKeyEnSet), ...parseMaybeJsonList(d?.productKeySet)])
  );

  const videoRaw = toStr(d?.productVideo).trim();

  return {
    sku,
    pid: toStr(d?.pid),
    descriptionHtml: html,
    descriptionText: text,
    images,
    video: /^https?:\/\//i.test(videoRaw) ? videoRaw.replace(/^http:/, "https:") : null,
    variants,
    variantKeys,
    specs,
    weightGrams: weight,
    upstreamPrice: toStr(d?.sellPrice) || null,
    fetchedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// 读缓存（同步，给 Server Component 用）
// ---------------------------------------------------------------------------

const memCache = new Map<string, { mtimeMs: number; hit: DetailHit }>();
const MEM_MAX = 400;

/**
 * 同步读详情缓存。命中新鲜或过期数据都返回（stale 标记），供 SSR 直出。
 * 完全没缓存 → null，由前端懒加载。
 */
export function readCachedDetail(sku: string): DetailHit | null {
  if (!sku) return null;
  const p = cachePath(sku);
  let mtimeMs = 0;
  try {
    mtimeMs = statSync(p).mtimeMs;
  } catch {
    return null;
  }
  const cachedMem = memCache.get(sku);
  if (cachedMem && cachedMem.mtimeMs === mtimeMs) {
    memHits++;
    return cachedMem.hit;
  }

  const env = readEnvelope(sku);
  if (!env || env.kind !== "detail" || !env.data) return null;
  const ageMs = Date.now() - env.fetchedAt;
  if (ageMs > DETAIL_STALE_MS) return null; // 太旧，当作未命中

  const hit: DetailHit = { detail: env.data as ProductDetailData, ageMs, stale: ageMs > DETAIL_FRESH_MS };
  if (memCache.size >= MEM_MAX) {
    const firstKey = memCache.keys().next().value;
    if (firstKey !== undefined) memCache.delete(firstKey);
  }
  memCache.set(sku, { mtimeMs, hit });
  memMisses++;
  return hit;
}

/** 同步读负缓存（用来快速回绝已下架商品） */
export function readNegative(sku: string): { reason: DetailMissReason; message: string } | null {
  const env = readEnvelope(sku);
  if (!env || env.kind !== "negative") return null;
  if (Date.now() - env.fetchedAt > NEGATIVE_MS) return null;
  return { reason: env.error?.reason || "upstream_error", message: env.error?.message || "" };
}

// ---------------------------------------------------------------------------
// 拉取（异步，给 API Route 用）
// ---------------------------------------------------------------------------

async function fetchDetailOnce(sku: string): Promise<DetailResult> {
  try {
    const j = await cjCall(`/product/query?productSku=${encodeURIComponent(sku)}`);

    if (j.code === 1602001) {
      const env: CacheEnvelope<never> = {
        v: 1,
        sku,
        kind: "negative",
        fetchedAt: Date.now(),
        error: { reason: "not_found", message: j.message || "Product not found" },
      };
      writeEnvelope(sku, env);
      return { ok: false, reason: "not_found", message: j.message || "Product not found" };
    }
    if (j.code === 1600200) {
      return { ok: false, reason: "rate_limited", message: j.message || "QPS limit" };
    }
    if (j.code !== 200 || !j.data) {
      return { ok: false, reason: "upstream_error", message: `${j.code} ${j.message || ""}`.trim() };
    }

    const detail = normalizeDetail(sku, j.data);
    writeEnvelope(sku, { v: 1, sku, kind: "detail", fetchedAt: Date.now(), data: detail });
    pruneCache();
    return { ok: true, detail, cached: false, stale: false };
  } catch (e: any) {
    return { ok: false, reason: "upstream_error", message: e?.message || String(e) };
  }
}

/**
 * 取详情：新鲜缓存直接返回；过期缓存立即返回并触发后台刷新；无缓存则排队拉取。
 * 同一 SKU 的并发请求共享同一个上游调用（单飞）。
 */
export async function getDetail(sku: string, opts: { force?: boolean; allowStale?: boolean } = {}): Promise<DetailResult> {
  if (!sku) return { ok: false, reason: "upstream_error", message: "sku required" };

  if (!opts.force) {
    const hit = readCachedDetail(sku);
    if (hit) {
      if (hit.stale && opts.allowStale !== false) {
        // stale-while-revalidate：先给旧的，后台补新的
        if (!Q.inflight.has(sku)) void getDetail(sku, { force: true }).catch(() => {});
      }
      return { ok: true, detail: hit.detail, cached: true, stale: hit.stale };
    }
    if (opts.allowStale !== false) {
      const neg = readNegative(sku);
      if (neg) return { ok: false, reason: neg.reason, message: neg.message };
    }
  }

  const existing = Q.inflight.get(sku);
  if (existing) return existing;

  const p = fetchDetailOnce(sku).finally(() => {
    Q.inflight.delete(sku);
  });
  Q.inflight.set(sku, p);
  return p;
}

// ---------------------------------------------------------------------------
// 库存（二级懒加载，前端看到详情后再静默拉）
// ---------------------------------------------------------------------------

export interface StockInfo {
  qty: number;
  area: string;
}

interface StockEnvelopeData {
  fetchedAt: number;
  stock: Record<string, StockInfo>;
}

function stockCachePath(sku: string): string {
  const h = createHash("sha1").update("stock:" + String(sku).toLowerCase()).digest("hex").slice(0, 20);
  return join(CACHE_DIR, `s_${h}.json`);
}

export function readCachedStock(sku: string): StockEnvelopeData | null {
  try {
    const p = stockCachePath(sku);
    if (!existsSync(p)) return null;
    const env = JSON.parse(readFileSync(p, "utf-8")) as CacheEnvelope<StockEnvelopeData>;
    if (env.kind !== "stock" || !env.data) return null;
    if (Date.now() - env.fetchedAt > STOCK_FRESH_MS) return null;
    return env.data;
  } catch {
    return null;
  }
}

/** 批量查库存：上游只支持按 vid 单个查，串行队列自动限速 */
export async function getStock(sku: string, vids: string[]): Promise<{ ok: boolean; stock: Record<string, StockInfo>; cached?: boolean }> {
  const key = String(sku).toLowerCase();
  const cached = readCachedStock(sku);
  if (cached) return { ok: true, stock: cached.stock, cached: true };

  const ids = (Array.isArray(vids) ? vids : []).filter(Boolean).slice(0, 12);
  if (ids.length === 0) return { ok: true, stock: {} };

  const existing = Q.stockInflight.get(key);
  if (existing) return { ok: true, stock: await existing };

  const task = (async () => {
    const stock: Record<string, StockInfo> = {};
    for (const vid of ids) {
      try {
        const j = await cjCall(`/product/stock/queryByVid?vid=${encodeURIComponent(vid)}`);
        if (j.code === 200 && Array.isArray(j.data) && j.data.length > 0) {
          const best = j.data.reduce((a: any, b: any) =>
            (numOrNull(b?.totalInventoryNum) || 0) > (numOrNull(a?.totalInventoryNum) || 0) ? b : a
          );
          stock[vid] = {
            qty: Math.round(numOrNull(best?.totalInventoryNum) || 0),
            area: toStr(best?.areaEn) || "",
          };
        }
      } catch {
        // 单条失败不影响其它
      }
    }
    try {
      ensureDir();
      const p = stockCachePath(sku);
      const tmp = `${p}.tmp${process.pid}`;
      writeFileSync(tmp, JSON.stringify({ v: 1, sku, kind: "stock", fetchedAt: Date.now(), data: { fetchedAt: Date.now(), stock } }), "utf-8");
      renameSync(tmp, p);
    } catch {}
    return stock;
  })().finally(() => {
    Q.stockInflight.delete(key);
  });

  Q.stockInflight.set(key, task);
  return { ok: true, stock: await task };
}

/** 缓存统计（诊断用） */
/**
 * 记录某 SKU 被真实访问（访问驱动预热的数据源）：
 * 只在 /api/cj/detail 上游拉取成功（未命中缓存）时调用。
 */
export function recordDetailRequest(sku: string) {
  try {
    const db = new Database(join(process.cwd(), "data", "cj-catalog.db"), { fileMustExist: true });
    db.pragma("journal_mode = WAL");
    db.exec(`CREATE TABLE IF NOT EXISTS detail_requests (
      sku TEXT PRIMARY KEY,
      hits INTEGER DEFAULT 1,
      lastReqAt TEXT
    )`);
    db.prepare(
      `INSERT INTO detail_requests (sku, hits, lastReqAt) VALUES (?, 1, ?)
       ON CONFLICT(sku) DO UPDATE SET hits = hits + 1, lastReqAt = excluded.lastReqAt`
    ).run(sku, new Date().toISOString());
    db.close();
  } catch {}
}

export function detailCacheStats() {
  let files = 0;
  let bytes = 0;
  try {
    ensureDir();
    for (const f of readdirSync(CACHE_DIR)) {
      if (!f.endsWith(".json")) continue;
      files++;
      try {
        bytes += statSync(join(CACHE_DIR, f)).size;
      } catch {}
    }
  } catch {}
  return {
    files,
    bytes,
    memEntries: memCache.size,
    inflight: Q.inflight.size,
    stockInflight: Q.stockInflight.size,
    memHits,
    memReads: memMisses,
  };
}
