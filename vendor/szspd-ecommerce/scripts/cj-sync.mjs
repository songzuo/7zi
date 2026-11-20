#!/usr/bin/env node
/**
 * SZSPD Store — CJ Dropshipping 商品库自动同步
 *
 * 用法：
 *   node scripts/cj-sync.mjs --mode=auto    仅探测，有变化或超过 4 小时才做全量（cron 每小时跑这个）
 *   node scripts/cj-sync.mjs --mode=probe   只探测，不写入；有变化时退出码 10
 *   node scripts/cj-sync.mjs --mode=full    强制全量同步
 *   node scripts/cj-sync.mjs --mode=full --limit=5   只同步前 5 页（调试用）
 *   node scripts/cj-sync.mjs --mode=full --dry-run   只统计不落盘
 *
 * 设计要点：
 *   - CJ 接口 QPS 限制 1 次/秒 → 所有请求串行且间隔 >=1150ms，429 做指数退避
 *   - listV2 每页最多 100 条，全量约 60 页
 *   - 原子写入（先写 .tmp 再 rename），读取方永远不会看到半个文件
 *   - 防呆：新数据少于旧数据的 70%（且低于 1000 条）时拒绝覆盖，退出码 2
 *   - 每次成功同步前备份上一版到 data/backups/，保留最近 10 份
 *   - 状态写入 data/cj-sync-status.json，日志追加到 logs/cj-sync.log
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, statSync, openSync, closeSync, unlinkSync, appendFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const DATA_FILE = join(DATA_DIR, "cj-local-data.json");
const STATUS_FILE = join(DATA_DIR, "cj-sync-status.json");
const BACKUP_DIR = join(DATA_DIR, "backups");
const LOG_DIR = join(ROOT, "logs");
const LOG_FILE = join(LOG_DIR, "cj-sync.log");
const LOCK_FILE = join(DATA_DIR, ".cj-sync.lock");

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const CJ_API_KEY = process.env.CJ_API_KEY || "CJ5237017@api@c8d316f7cf414c5f8e5ddb37339ecaac";

const PAGE_SIZE = 100;          // listV2 上限
const MIN_INTERVAL_MS = 1150;   // QPS 1/s 留余量
const MAX_RETRY = 5;
const FETCH_TIMEOUT_MS = 30000;
const STALE_HOURS = 4;          // 超过该时长未全量 → 强制全量
const SAFETY_RATIO = 0.7;       // 新数据 / 旧数据 下限
const SAFETY_FLOOR = 1000;      // 绝对下限（条）
const MAX_VERIFY = 200;         // 单轮最多核验多少个"疑似下架"SKU
const KEEP_BACKUPS = 10;

const argv = process.argv.slice(2);
function arg(name, def) {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : def;
}
const MODE = arg("mode", "auto");
const LIMIT_PAGES = parseInt(arg("limit", "0"), 10) || 0;
const DRY_RUN = argv.includes("--dry-run");
const QUIET = argv.includes("--quiet");

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  if (!QUIET) console.log(line);
  try {
    if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, line + "\n");
    // 日志滚动：超过 4000 行截断保留后 2000 行
    if (statSync(LOG_FILE).size > 2_000_000) {
      const lines = readFileSync(LOG_FILE, "utf-8").split("\n");
      writeFileSync(LOG_FILE, lines.slice(-2000).join("\n"));
    }
  } catch {}
}

// ---------------------------------------------------------------------------
// 锁：防止 cron 与手动触发并发
// ---------------------------------------------------------------------------
function acquireLock() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    if (existsSync(LOCK_FILE)) {
      const age = Date.now() - statSync(LOCK_FILE).mtimeMs;
      if (age < 15 * 60 * 1000) {
        log(`SKIP 已有同步在运行中（锁 ${Math.round(age / 1000)}s）`);
        return false;
      }
      log("WARN 发现过期锁，强制接管");
    }
    closeSync(openSync(LOCK_FILE, "w"));
    return true;
  } catch {
    return true;
  }
}
function releaseLock() {
  try { if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE); } catch {}
}

// ---------------------------------------------------------------------------
// HTTP：串行 + 限速 + 退避
// ---------------------------------------------------------------------------
let lastRequestAt = 0;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pacedFetch(url, init) {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();

  let backoff = 3000;
  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      const body = await res.json().catch(() => ({}));
      if (res.status === 429 || body.code === 1600200) {
        log(`  ! 429 限流，退避 ${backoff}ms（第 ${attempt} 次）`);
        await sleep(backoff);
        backoff *= 2;
        continue;
      }
      if (body.code !== undefined && body.code !== 200) {
        throw new Error(`API 错误 code=${body.code} msg=${body.message || ""}`);
      }
      return body;
    } catch (e) {
      if (attempt === MAX_RETRY) throw e;
      log(`  ! 请求失败（${e.message}），${backoff}ms 后重试`);
      await sleep(backoff);
      backoff *= 2;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("重试次数用尽");
}

let token = null;
let tokenExpiry = 0;

async function getToken(force = false) {
  if (!force && token && Date.now() < tokenExpiry - 120_000) return token;
  const body = await pacedFetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: CJ_API_KEY }),
  });
  token = body.data.accessToken;
  tokenExpiry = new Date(body.data.accessTokenExpiryDate).getTime();
  return token;
}

async function cjGet(path) {
  const t = await getToken();
  try {
    return await pacedFetch(`${CJ_BASE}${path}`, {
      headers: { "CJ-Access-Token": t, "Content-Type": "application/json" },
    });
  } catch (e) {
    // token 可能失效，刷新一次再试
    if (String(e.message).includes("token") || String(e.message).includes("401")) {
      await getToken(true);
      return await pacedFetch(`${CJ_BASE}${path}`, {
        headers: { "CJ-Access-Token": token, "Content-Type": "application/json" },
      });
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// 归一化
// ---------------------------------------------------------------------------
function parsePrice(v) {
  const m = String(v ?? "").match(/[\d.]+/);
  return m ? parseFloat(m[0]) : NaN;
}
function dedupeName(name) {
  const s = String(name || "").trim();
  const half = Math.floor(s.length / 2);
  if (half > 5 && s.substring(0, half) === s.substring(half)) return s.substring(0, half).trim();
  return s;
}

function normalizeProductList(raw) {
  const out = [];
  for (const group of raw || []) {
    for (const p of group.productList || []) {
      const sku = String(p.sku || "").trim();
      const name = dedupeName(p.nameEn || p.productNameEn || "");
      const price = parsePrice(p.sellPrice);
      const image = String(p.bigImage || p.productImage || "").trim();
      if (!sku || !name || !image || !(price > 0)) continue;
      out.push({
        id: String(p.id),
        sku,
        name,
        price: String(price),
        image,
        hasVideo: p.isVedio === 1 || p.isVedio === true,
        categoryId: String(p.categoryId || ""),
      });
    }
  }
  return out;
}

function normalizeCategories(raw) {
  return (raw || [])
    .map((l1) => ({
      categoryFirstId: l1.categoryFirstId,
      categoryFirstName: l1.categoryFirstName,
      categoryFirstList: (l1.categoryFirstList || []).map((l2) => ({
        categorySecondId: l2.categorySecondId,
        categorySecondName: l2.categorySecondName,
        categorySecondList: (l2.categorySecondList || []).map((l3) => ({
          categoryId: l3.categoryId,
          categoryName: l3.categoryName,
        })),
      })),
    }))
    .filter((c) => c.categoryFirstId && c.categoryFirstName);
}

/** 分类 id → 完整路径 */
function buildPathMap(categories) {
  const map = new Map();
  for (const l1 of categories) {
    for (const l2 of l1.categoryFirstList) {
      for (const l3 of l2.categorySecondList) {
        map.set(l3.categoryId, `${l1.categoryFirstName} > ${l2.categorySecondName} > ${l3.categoryName}`);
      }
      map.set(l2.categorySecondId, `${l1.categoryFirstName} > ${l2.categorySecondName}`);
    }
    map.set(l1.categoryFirstId, l1.categoryFirstName);
  }
  return map;
}

// ---------------------------------------------------------------------------
// 读取 / 写入
// ---------------------------------------------------------------------------
function readExisting() {
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return { products: [], categories: [] };
  }
}

function writeAtomic(file, content) {
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, content);
  renameSync(tmp, file);
}

function backupExisting() {
  if (!existsSync(DATA_FILE)) return;
  try {
    if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const dest = join(BACKUP_DIR, `cj-local-data-${ts}.json`);
    writeFileSync(dest, readFileSync(DATA_FILE));
    const files = readdirSync(BACKUP_DIR).filter((f) => f.startsWith("cj-local-data-")).sort();
    for (const f of files.slice(0, Math.max(0, files.length - KEEP_BACKUPS))) {
      try { unlinkSync(join(BACKUP_DIR, f)); } catch {}
    }
  } catch (e) {
    log(`WARN 备份失败：${e.message}`);
  }
}

function readStatus() {
  try { return JSON.parse(readFileSync(STATUS_FILE, "utf-8")); } catch { return {}; }
}
function writeStatus(patch) {
  const cur = readStatus();
  const next = { ...cur, ...patch };
  if (patch.historyEntry) {
    const hist = Array.isArray(cur.history) ? cur.history : [];
    hist.unshift(patch.historyEntry);
    next.history = hist.slice(0, 20);
    delete next.historyEntry;
  }
  writeAtomic(STATUS_FILE, JSON.stringify(next, null, 2));
}

// ---------------------------------------------------------------------------
// 指纹（用于探测变化）
// ---------------------------------------------------------------------------
function fingerprint(list) {
  const h = createHash("sha1");
  for (const p of list) h.update(`${p.sku}:${p.price};`);
  return h.digest("hex").slice(0, 16);
}

/** 向上游确认单个 SKU 是否仍然存在（用于下架核验，避免分页抖动误删） */
async function skuExistsUpstream(sku) {
  try {
    const body = await cjGet(`/product/listV2?page=1&size=5&keyWord=${encodeURIComponent(sku)}`);
    for (const group of body.data.content || []) {
      for (const p of group.productList || []) {
        if (String(p.sku) === sku) return true;
      }
    }
    return false;
  } catch (e) {
    log(`  ! 核验 ${sku} 失败（${e.message}），保守保留`);
    return true;
  }
}

// ---------------------------------------------------------------------------
// 全量同步
// ---------------------------------------------------------------------------
async function fullSync() {
  const startedAt = Date.now();
  log(`=== 全量同步开始（limit=${LIMIT_PAGES || "全部"}页） ===`);

  const catBody = await cjGet("/product/getCategory");
  const categories = normalizeCategories(catBody.data);
  log(`分类：L1 ${categories.length} 个`);

  const first = await cjGet(`/product/listV2?page=1&size=${PAGE_SIZE}`);
  const totalRecords = first.data.totalRecords || 0;
  const totalPages = Math.min(
    Math.ceil(totalRecords / PAGE_SIZE) || 1,
    LIMIT_PAGES || Number.POSITIVE_INFINITY
  );
  log(`上游商品总数 ${totalRecords}，共 ${totalPages} 页待抓取`);

  const products = [];
  const seen = new Set();
  const pushAll = (list) => {
    for (const p of list) {
      const key = p.sku || p.id;
      if (seen.has(key)) continue;
      seen.add(key);
      products.push(p);
    }
  };
  pushAll(normalizeProductList(first.data.content));

  for (let page = 2; page <= totalPages; page++) {
    const body = await cjGet(`/product/listV2?page=${page}&size=${PAGE_SIZE}`);
    pushAll(normalizeProductList(body.data.content));
    if (page % 10 === 0 || page === totalPages) {
      log(`  进度 ${page}/${totalPages} 页，累计有效商品 ${products.length}`);
    }
  }

  const pathMap = buildPathMap(categories);
  for (const p of products) {
    const path = pathMap.get(p.categoryId);
    if (path) p.categoryPath = path;
  }

  // 防呆
  const existing = readExisting();
  const oldCount = (existing.products || []).length;
  const floor = Math.max(SAFETY_FLOOR, Math.floor(oldCount * SAFETY_RATIO));
  if (!DRY_RUN && products.length < floor) {
    const msg = `防呆拦截：本次仅取到 ${products.length} 条，低于安全下限 ${floor}（旧库 ${oldCount} 条），已放弃覆盖`;
    log(`ERROR ${msg}`);
    writeStatus({
      lastSyncOk: false,
      lastError: msg,
      lastAttemptAt: new Date().toISOString(),
      historyEntry: { at: new Date().toISOString(), ok: false, mode: "full", error: msg },
    });
    return 2;
  }

  // 差分统计
  const oldMap = new Map((existing.products || []).map((p) => [p.sku, p]));
  let added = 0, priceChanged = 0;
  for (const p of products) {
    const o = oldMap.get(p.sku);
    if (!o) added++;
    else if (String(o.price) !== String(p.price)) priceChanged++;
  }

  // 下架核验：本轮没抓到的 SKU 先单独向上游确认一次。
  // 上游列表顺序在抓取的 4 分钟内可能微调，直接删会造成商品页随机 404；
  // 核验后仍存在的（漏抓）就地保留，确认消失的才真正下架。
  const missing = [...oldMap.keys()].filter((sku) => !seen.has(sku));
  let removed = 0;
  let retained = 0;
  const goneList = [];
  if (missing.length > 0) {
    const cap = Math.min(missing.length, MAX_VERIFY);
    if (missing.length > MAX_VERIFY) {
      log(`WARN 待核验 ${missing.length} 个 SKU，超过上限 ${MAX_VERIFY}，多出的部分保守保留`);
    }
    log(`本轮未抓到的 SKU ${missing.length} 个，开始逐个核验…`);
    for (let i = 0; i < cap; i++) {
      const sku = missing[i];
      const exists = await skuExistsUpstream(sku);
      const old = oldMap.get(sku);
      if (exists) {
        if (old) products.push({ ...old, stale: true });
        retained++;
      } else {
        goneList.push(sku);
        removed++;
      }
      if ((i + 1) % 25 === 0) log(`  核验进度 ${i + 1}/${cap}`);
    }
    for (let i = cap; i < missing.length; i++) {
      const old = oldMap.get(missing[i]);
      if (old) {
        products.push({ ...old, stale: true });
        retained++;
      }
    }
    if (retained) log(`核验保留 ${retained} 条（上游仍存在，本轮漏抓，下轮会重新抓到）`);
    if (removed) log(`确认下架 ${removed} 条：${goneList.slice(0, 10).join(", ")}${removed > 10 ? " …" : ""}`);
  }

  const durationMs = Date.now() - startedAt;
  const nowIso = new Date().toISOString();
  log(`同步完成：${products.length} 条有效商品（新增 ${added} / 确认下架 ${removed} / 核验保留 ${retained} / 改价 ${priceChanged}），耗时 ${(durationMs / 1000).toFixed(1)}s`);

  if (DRY_RUN) {
    log("DRY-RUN：未写入文件");
    return 0;
  }

  backupExisting();
  const payload = {
    filterVersion: "v7-auto-sync",
    totalProducts: totalRecords,
    productCount: products.length,
    staleCount: retained,
    lastSyncAt: nowIso,
    syncMode: "full",
    products,
    categories,
    filterDate: nowIso.slice(0, 10),
  };
  writeAtomic(DATA_FILE, JSON.stringify(payload));
  log(`已写入 ${DATA_FILE}`);

  const fp = fingerprint(products.slice(0, 100));
  writeStatus({
    lastSyncAt: nowIso,
    lastSyncMode: "full",
    lastSyncDurationMs: durationMs,
    lastSyncOk: true,
    lastError: null,
    productCount: products.length,
    sourceTotal: totalRecords,
    added, removed, priceChanged,
    retained,
    categoryL1Count: categories.length,
    probeFingerprint: fp,
    probeTotal: totalRecords,
    lastProbeAt: nowIso,
    stalenessHoursLimit: STALE_HOURS,
    historyEntry: {
      at: nowIso, ok: true, mode: "full", durationMs,
      productCount: products.length, added, removed, priceChanged, retained,
    },
  });
  return 0;
}

// ---------------------------------------------------------------------------
// 探测（轻量）
// ---------------------------------------------------------------------------
async function probe() {
  const startedAt = Date.now();
  const status = readStatus();

  const first = await cjGet(`/product/listV2?page=1&size=${PAGE_SIZE}`);
  const total = first.data.totalRecords || 0;
  const sample = normalizeProductList(first.data.content);
  const fp = fingerprint(sample);

  // 顺带取中段一页，提高改价检出率
  let midFp = "";
  const midPage = Math.max(2, Math.floor(total / PAGE_SIZE / 2));
  try {
    const mid = await cjGet(`/product/listV2?page=${midPage}&size=${PAGE_SIZE}`);
    midFp = fingerprint(normalizeProductList(mid.data.content));
  } catch (e) {
    log(`  (中段页探测跳过：${e.message})`);
  }

  const totalChanged = status.probeTotal !== undefined && status.probeTotal !== total;
  const fpChanged = status.probeFingerprint && status.probeFingerprint !== fp;
  const midChanged = status.probeMidFingerprint && midFp && status.probeMidFingerprint !== midFp;
  const lastFull = status.lastSyncAt ? new Date(status.lastSyncAt).getTime() : 0;
  const staleMs = Date.now() - lastFull;
  const stale = !lastFull || staleMs > STALE_HOURS * 3600 * 1000;

  const reasons = [];
  if (totalChanged) reasons.push(`总数 ${status.probeTotal}→${total}`);
  if (fpChanged) reasons.push("首页商品/价格变化");
  if (midChanged) reasons.push("中段商品/价格变化");
  if (stale) reasons.push(`距上次全量 ${(staleMs / 3600000).toFixed(1)}h`);

  writeStatus({
    lastProbeAt: new Date().toISOString(),
    probeTotal: total,
    probeFingerprint: fp,
    probeMidFingerprint: midFp || status.probeMidFingerprint || "",
    probeDurationMs: Date.now() - startedAt,
  });

  if (reasons.length === 0) {
    log(`探测完成：无变化（上游 ${total} 条）`);
    return { changed: false, topTotal: total };
  }
  log(`探测完成：需要全量同步 → ${reasons.join(" / ")}`);
  return { changed: true, topTotal: total, reasons };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  if (!acquireLock()) return 0;
  try {
    if (MODE === "probe") {
      const r = await probe();
      return r.changed ? 10 : 0;
    }
    if (MODE === "auto") {
      const r = await probe();
      if (!r.changed) return 0;
      return await fullSync();
    }
    if (MODE === "full") {
      return await fullSync();
    }
    log(`未知 mode=${MODE}`);
    return 1;
  } catch (e) {
    const msg = `${MODE} 失败：${e.message}`;
    log(`ERROR ${msg}`);
    writeStatus({
      lastSyncOk: false,
      lastError: msg,
      lastAttemptAt: new Date().toISOString(),
      historyEntry: { at: new Date().toISOString(), ok: false, mode: MODE, error: e.message },
    });
    return 1;
  } finally {
    releaseLock();
  }
}

main().then((code) => process.exit(code));
