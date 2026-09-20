#!/usr/bin/env node
/**
 * cj-catalog.mjs —— CJ 全目录收割/增量刷新/前台发布（点数感知 · 断点续传）
 *
 * 背景（2026-09-19）：
 *   - CJ 2026-07 起改点数计费：base 50,000/天 + 订单转换($1=100点)，UTC 00:00 重置，
 *     每分钟回填 total/1440。listV2 每页 50 点；/product/query 每批 10 点。
 *     耗尽返回 16900500 / HTTP 429（响应体含 pointsInfo.remaining）。
 *   - listV2 无过滤封顶 6000 条（60 页×100）；按叶子 categoryId 翻页可突破
 *     （实测 Women's Clothing 单 L1 就有 129,260 条）。
 *   - 旧 cj-sync 每小时全量抓 6000 条再被防呆丢弃 = 纯烧点，已停用。
 *
 * 模式（默认 auto）：
 *   auto     首轮未完 → harvest 续收；首轮已完 → refresh 增量
 *   harvest  按叶子类目翻页收割全部商品进 SQLite（可跨天断点续传）
 *   refresh  轮转巡检叶子指纹（每叶子 1 页 50 点），指纹变了的叶子才整叶深抓；
 *            另用批量 /product/query 刷新前台可见 SKU（每批 20 个 pid 仅 10 点）
 *   publish  从 SQLite 回写 data/cj-local-data.json（前台可见集合不变，只刷价格/图）
 *   status   打印状态摘要
 *
 * 设计约束：
 *   - 只增改不删（收割期间绝不删数据）；下架判定延后到"整轮完成"后由 stale 统计呈现
 *   - 点数不足 → 落盘检查点、exit 0（不是失败），下次 cron 继续
 *   - 每轮最多 MAX_PAGES_PER_RUN 页，避免与 fulfill-tick 抢点数
 *   - 日志 logs/cj-catalog.log，状态 data/cj-catalog-status.json
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, statSync, appendFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import Database from "better-sqlite3";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const CATALOG_DB = join(DATA_DIR, "cj-catalog.db");
const STATUS_FILE = join(DATA_DIR, "cj-catalog-status.json");
const LEGACY_STATUS = join(DATA_DIR, "cj-sync-status.json");
const DATA_FILE = join(DATA_DIR, "cj-local-data.json");
const LOG_FILE = join(ROOT, "logs", "cj-catalog.log");
const LOCK_FILE = join(DATA_DIR, ".cj-catalog.lock");

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const CJ_API_KEY = process.env.CJ_API_KEY || "CJ5237017@api@c8d316f7cf414c5f8e5ddb37339ecaac";

const PAGE_SIZE = 100;
const MIN_INTERVAL_MS = 1150;      // QPS 1/s 留余量
const MAX_RETRY = 4;
const FETCH_TIMEOUT_MS = 30000;
const POINTS_RESERVE = 4000;       // 留给结账运费/详情等运维调用的保底点数
const MAX_PAGES_PER_RUN = 60;      // 单轮页数上限（60×50=3000 点 ≈ 35 分钟回填量）
const PROBE_LEAVES_PER_RUN = 40;   // refresh 模式每轮流转巡检的叶子数
const PID_BATCH = 20;              // /product/query 每批 pid 数（10 点/批）
const LOCK_STALE_MS = 15 * 60 * 1000;

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h ? h.split("=").slice(1).join("=") : d; };
const MODE = arg("mode", "auto");
const DRY_RUN = argv.includes("--dry-run");
const QUIET = argv.includes("--quiet");

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  if (!QUIET) console.log(line);
  try {
    if (!existsSync(join(ROOT, "logs"))) mkdirSync(join(ROOT, "logs"), { recursive: true });
    appendFileSync(LOG_FILE, line + "\n");
    if (statSync(LOG_FILE).size > 2_000_000) {
      const lines = readFileSync(LOG_FILE, "utf-8").split("\n");
      writeFileSync(LOG_FILE, lines.slice(-2000).join("\n"));
    }
  } catch {}
}

function writeAtomic(file, content) {
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, content);
  renameSync(tmp, file);
}

// ---------------------------------------------------------------------------
// 锁
// ---------------------------------------------------------------------------
function acquireLock() {
  try {
    if (existsSync(LOCK_FILE)) {
      const age = Date.now() - statSync(LOCK_FILE).mtimeMs;
      if (age < LOCK_STALE_MS) { log(`SKIP 已有实例在运行（锁 ${Math.round(age / 1000)}s）`); return false; }
      log("WARN 发现过期锁，强制接管");
    }
    openSync(LOCK_FILE, "w");
    return true;
  } catch { return true; }
}
function releaseLock() { try { if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE); } catch {} }

// ---------------------------------------------------------------------------
// HTTP：串行 + 限速 + 退避 + 点数记账
// ---------------------------------------------------------------------------
let lastRequestAt = 0;
let token = null;
let points = { usedToday: null, remaining: null, total: null };
let stopReason = null;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function capturePoints(body) {
  const pi = body && body.pointsInfo;
  if (pi && typeof pi.remaining === "number") {
    points = { usedToday: pi.usedToday ?? points.usedToday, remaining: pi.remaining, total: pi.total ?? points.total };
    if (pi.remaining <= POINTS_RESERVE && !stopReason) stopReason = `points low (${pi.remaining} <= ${POINTS_RESERVE})`;
  }
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
      capturePoints(body);
      // 点数耗尽：不重试、不算失败，落检查点退出
      if (res.status === 429 && String(body.message || "").includes("Insufficient API points")) {
        stopReason = stopReason || "points exhausted";
        return { pointsExhausted: true };
      }
      if (res.status === 429 || body.code === 1600200) {
        log(`  ! 429 限流，退避 ${backoff}ms（第 ${attempt} 次）`);
        await sleep(backoff); backoff *= 2; continue;
      }
      if (body.code !== undefined && body.code !== 200) {
        throw new Error(`API 错误 code=${body.code} msg=${body.message || ""}`);
      }
      return body;
    } catch (e) {
      if (attempt === MAX_RETRY) throw e;
      log(`  ! 请求失败（${e.message}），${backoff}ms 后重试`);
      await sleep(backoff); backoff *= 2;
    } finally { clearTimeout(timer); }
  }
  throw new Error("重试次数用尽");
}

async function getToken(force = false) {
  if (token && !force) return token;
  const body = await pacedFetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: CJ_API_KEY }),
  });
  token = body.data.accessToken;
  return token;
}

async function cjGet(path) {
  const t = await getToken();
  try {
    return await pacedFetch(`${CJ_BASE}${path}`, { headers: { "CJ-Access-Token": t, "Content-Type": "application/json" } });
  } catch (e) {
    if (String(e.message).includes("token") || String(e.message).includes("401")) {
      await getToken(true);
      return await pacedFetch(`${CJ_BASE}${path}`, { headers: { "CJ-Access-Token": token, "Content-Type": "application/json" } });
    }
    throw e;
  }
}

async function cjPost(path, payload) {
  const t = await getToken();
  return await pacedFetch(`${CJ_BASE}${path}`, {
    method: "POST",
    headers: { "CJ-Access-Token": t, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------------
// 归一化（与旧 cj-sync 口径一致）
// ---------------------------------------------------------------------------
function parsePrice(v) { const m = String(v ?? "").match(/[\d.]+/); return m ? parseFloat(m[0]) : NaN; }
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
        id: String(p.id), sku, name, price: String(price), image,
        hasVideo: p.isVedio === 1 || p.isVedio === true ? 1 : 0,
        categoryId: String(p.categoryId || ""),
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// DB
// ---------------------------------------------------------------------------
const db = new Database(CATALOG_DB);
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS products (
  sku TEXT PRIMARY KEY,
  pid TEXT, name TEXT, price REAL, image TEXT, hasVideo INTEGER DEFAULT 0,
  categoryId TEXT, categoryPath TEXT,
  firstSeenAt TEXT, lastSeenAt TEXT
);
CREATE INDEX IF NOT EXISTS idx_products_cat ON products(categoryId);
CREATE INDEX IF NOT EXISTS idx_products_seen ON products(lastSeenAt);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE TABLE IF NOT EXISTS leaves (
  leafId TEXT PRIMARY KEY,
  leafName TEXT, l2Name TEXT, l1Name TEXT,
  totalRecords INTEGER, pages INTEGER,
  fingerprint TEXT,
  harvestedPages INTEGER DEFAULT 0,
  doneAt TEXT, lastProbeAt TEXT
);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
-- 前台可见集：选品上架清单（curated front-end catalog）
CREATE TABLE IF NOT EXISTS visible_products (
  sku TEXT PRIMARY KEY,
  sortOrder INTEGER DEFAULT 0,
  addedAt TEXT,
  source TEXT  -- manual | auto | legacy-json
);
CREATE INDEX IF NOT EXISTS idx_visible_sort ON visible_products(sortOrder);
-- FTS5 全文搜索索引（百万级数据毫秒级搜索）
CREATE VIRTUAL TABLE IF NOT EXISTS products_fts USING fts5(
  sku UNINDEXED, name,
  content='products', content_rowid='rowid',
  tokenize='unicode61'
);
-- FTS 同步触发器
CREATE TRIGGER IF NOT EXISTS products_ai AFTER INSERT ON products BEGIN
  INSERT INTO products_fts(rowid, sku, name) VALUES (new.rowid, new.sku, new.name);
END;
CREATE TRIGGER IF NOT EXISTS products_ad AFTER DELETE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, sku, name) VALUES ('delete', old.rowid, old.sku, old.name);
END;
CREATE TRIGGER IF NOT EXISTS products_au AFTER UPDATE ON products BEGIN
  INSERT INTO products_fts(products_fts, rowid, sku, name) VALUES ('delete', old.rowid, old.sku, old.name);
  INSERT INTO products_fts(rowid, sku, name) VALUES (new.rowid, new.sku, new.name);
END;
`);

// 如果 FTS 是空的（首次建表），做一次全量回填
(function rebuildFtsIfEmpty() {
  const ftsCount = db.prepare("SELECT COUNT(*) c FROM products_fts").get().c;
  const prodCount = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  if (prodCount > 0 && ftsCount === 0) {
    log(`FTS 索引为空，首次重建（${prodCount} 条）…`);
    db.exec("INSERT INTO products_fts(products_fts) VALUES ('rebuild')");
    log("FTS 索引重建完成");
  }
})();

const insProduct = db.prepare(`
INSERT INTO products (sku, pid, name, price, image, hasVideo, categoryId, categoryPath, firstSeenAt, lastSeenAt)
VALUES (@sku, @pid, @name, @price, @image, @hasVideo, @categoryId, @categoryPath, @now, @now)
ON CONFLICT(sku) DO UPDATE SET
  pid=excluded.pid, name=excluded.name, price=excluded.price, image=excluded.image,
  hasVideo=excluded.hasVideo, categoryId=excluded.categoryId, categoryPath=excluded.categoryPath,
  lastSeenAt=excluded.lastSeenAt
`);
const insProductNoPath = db.prepare(`
INSERT INTO products (sku, pid, name, price, image, hasVideo, categoryId, categoryPath, firstSeenAt, lastSeenAt)
VALUES (@sku, @pid, @name, @price, @image, @hasVideo, @categoryId, @categoryPath, @now, @now)
ON CONFLICT(sku) DO UPDATE SET
  name=excluded.name, price=excluded.price, image=excluded.image, hasVideo=excluded.hasVideo, lastSeenAt=excluded.lastSeenAt
`);
const getMeta = db.prepare("SELECT value FROM meta WHERE key=?");
const setMeta = db.prepare("INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value");
const upLeaf = db.prepare(`INSERT INTO leaves(leafId,leafName,l2Name,l1Name) VALUES(?,?,?,?)
  ON CONFLICT(leafId) DO UPDATE SET leafName=excluded.leafName, l2Name=excluded.l2Name, l1Name=excluded.l1Name`);

function nowIso() { return new Date().toISOString(); }

// ---------------------------------------------------------------------------
// 状态
// ---------------------------------------------------------------------------
function readStatus() { try { return JSON.parse(readFileSync(STATUS_FILE, "utf-8")); } catch { return {}; } }
function writeStatus(patch) {
  const cur = readStatus();
  const next = { ...cur, ...patch, points };
  writeAtomic(STATUS_FILE, JSON.stringify(next, null, 2));
  // 同步关键信息到旧状态文件，让内部面板不至于显示"死"数据
  try {
    const legacy = JSON.parse(readFileSync(LEGACY_STATUS, "utf-8"));
    writeAtomic(LEGACY_STATUS, JSON.stringify({
      ...legacy,
      lastSyncAt: patch.lastSyncAt || legacy.lastSyncAt,
      lastSyncOk: patch.lastSyncOk !== undefined ? patch.lastSyncOk : legacy.lastSyncOk,
      lastError: patch.lastError !== undefined ? patch.lastError : legacy.lastError,
      catalogHarvest: {
        dbProducts: patch.dbProducts, passComplete: patch.passComplete,
        note: "已切换为 cj-catalog.mjs 点数感知收割（data/cj-catalog.db）",
      },
    }, null, 2));
  } catch {}
}

// ---------------------------------------------------------------------------
// harvest：按叶子整叶收割（批量 100/页 · 断点续传 · 点数感知）
// ---------------------------------------------------------------------------
async function fetchCategoryTree() {
  const body = await cjGet("/product/getCategory");
  const tree = (body.data || []).map(l1 => ({
    id: l1.categoryFirstId, name: l1.categoryFirstName,
    l2s: (l1.categoryFirstList || []).map(l2 => ({
      id: l2.categorySecondId, name: l2.categorySecondName,
      leaves: (l2.categorySecondList || []).map(l3 => ({ id: l3.categoryId, name: l3.categoryName })),
    })),
  })).filter(c => c.id && c.name);
  return tree;
}

function upsertProducts(items, pathMap) {
  const now = nowIso();
  const tx = db.transaction((rows) => {
    for (const p of rows) {
      const row = {
        sku: p.sku, pid: p.id, name: p.name, price: parseFloat(p.price),
        image: p.image, hasVideo: p.hasVideo, categoryId: p.categoryId,
        categoryPath: pathMap.get(p.categoryId) || null, now,
      };
      if (row.categoryPath) insProduct.run(row); else insProductNoPath.run(row);
    }
  });
  tx(items);
}

function fingerprint(list) {
  const h = createHash("sha1");
  for (const p of list) h.update(`${p.sku}:${p.price};`);
  return h.digest("hex").slice(0, 16);
}

async function harvestLeaf(leafId, pathMap, budget) {
  // 第 1 页同时拿 totalRecords
  const first = await cjGet(`/product/listV2?page=1&size=${PAGE_SIZE}&categoryId=${encodeURIComponent(leafId)}`);
  if (first.pointsExhausted) return "stop";
  const totalRecords = first.data.totalRecords || 0;
  const totalPages = Math.ceil(totalRecords / PAGE_SIZE) || 1;
  db.prepare("UPDATE leaves SET totalRecords=?, pages=? WHERE leafId=?").run(totalRecords, totalPages, leafId);

  let page = 1, got = 0;
  while (page <= totalPages) {
    const items = page === 1 ? normalizeProductList(first.data.content) : null;
    if (page > 1) {
      const body = await cjGet(`/product/listV2?page=${page}&size=${PAGE_SIZE}&categoryId=${encodeURIComponent(leafId)}`);
      if (body.pointsExhausted) { db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page - 1, leafId); return "stop"; }
      const more = normalizeProductList(body.data.content);
      upsertProducts(more, pathMap);
      got += more.length;
    } else if (items) {
      upsertProducts(items, pathMap);
      got += items.length;
    }
    db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page, leafId);
    budget.pages++;
    if (budget.pages >= MAX_PAGES_PER_RUN) {
      db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page, leafId);
      stopReason = stopReason || `page budget (${MAX_PAGES_PER_RUN})`;
      return "stop";
    }
    if (points.remaining !== null && points.remaining <= POINTS_RESERVE) {
      stopReason = stopReason || `points low (${points.remaining})`;
      return "stop";
    }
    page++;
  }
  db.prepare("UPDATE leaves SET doneAt=?, harvestedPages=?, fingerprint=NULL WHERE leafId=?").run(nowIso(), totalPages, leafId);
  log(`  ✓ 叶子完成 ${leafId}: ${totalRecords} 条（本轮 ${got} 条新抓/更新）`);
  return "done";
}

async function harvest() {
  const passKey = "passStartedAt";
  const passStartedAt = getMeta.get(passKey)?.value || null;
  const tree = await fetchCategoryTree();

  // 注册叶子 + 路径表（getCategory 不计费，注册是纯本地写库——先做完再看点数）
  const pathMap = new Map();
  let leafCount = 0;
  for (const l1 of tree) for (const l2 of l1.l2s) for (const leaf of l2.leaves) {
    upLeaf.run(leaf.id, leaf.name, l2.name, l1.name);
    pathMap.set(leaf.id, `${l1.name} > ${l2.name} > ${leaf.name}`);
    leafCount++;
  }
  if (!passStartedAt) setMeta.run(passKey, nowIso());
  // 注意：getCategory（免费接口）返回的 pointsInfo 可能不准确/陈旧，
  // 所以这里不根据 stopReason 提前退出——真正的点数以 product/listV2 返回的为准。
  // 第一页商品调用会拿到准确点数，不够的话 harvestLeaf 内部会干净退出。
  stopReason = null;

  const pending = db.prepare(`
    SELECT leafId FROM leaves WHERE doneAt IS NULL ORDER BY leafId
  `).all();
  log(`harvest：叶子共 ${leafCount}，待完成 ${pending.length}，本轮页预算 ${MAX_PAGES_PER_RUN}`);

  const budget = { pages: 0 };
  for (const { leafId } of pending) {
    if (stopReason) break;
    const r = await harvestLeaf(leafId, pathMap, budget);
    if (r === "stop") break;
  }

  const done = db.prepare("SELECT COUNT(*) c FROM leaves WHERE doneAt IS NOT NULL").get().c;
  const total = db.prepare("SELECT COUNT(*) c FROM leaves").get().c;
  const dbCount = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  if (done === total && total > 0 && !stopReason) {
    // 整轮完成：统计陈旧商品（本轮没见到的 = 疑似下架）
    const passStart = getMeta.get(passKey)?.value;
    const stale = db.prepare("SELECT COUNT(*) c FROM products WHERE lastSeenAt < ?").get(passStart).c;
    log(`=== 整轮收割完成：库内 ${dbCount} 条，其中陈旧(疑似下架) ${stale} 条（保留不删，publish 时过滤） ===`);
    setMeta.run("passCompleteAt", nowIso());
    setMeta.run("staleCount", String(stale));
  }
  writeStatus({
    lastSyncAt: nowIso(), lastSyncOk: true, lastError: null,
    dbProducts: dbCount, passComplete: done === total && total > 0,
    leavesDone: done, leavesTotal: total, mode: "harvest", stopReason,
  });
}

// ---------------------------------------------------------------------------
// refresh：整轮完成后只更新变化的数据
//   ① 轮转巡检叶子指纹（每叶 1 页 50 点，变了才整叶深抓）
//   ② 批量 /product/query 刷新前台可见 SKU（每批 20 pid 仅 10 点）
// ---------------------------------------------------------------------------
async function refreshVisibleBatch(visibleSkus) {
  // pids 来自 product.id（pid），不是 sku —— 从库里查
  let refreshed = 0, missing = 0, checked = 0;
  const pids = [];
  for (const sku of visibleSkus) {
    const row = db.prepare("SELECT pid FROM products WHERE sku=?").get(sku);
    if (row && row.pid) pids.push(row.pid); else missing++;
  }
  for (let i = 0; i < pids.length; i += PID_BATCH) {
    if (stopReason) break;
    if (points.remaining !== null && points.remaining <= POINTS_RESERVE) { stopReason = stopReason || "points low"; break; }
    const batch = pids.slice(i, i + PID_BATCH);
    try {
      // CJ v2.0: POST /product/query {pids: "id1,id2"}（每批最多 20，10 点）
      const body = await cjPost("/product/query", { pids: batch.join(",") });
      if (body.pointsExhausted) break;
      const list = body.data || [];
      const now = nowIso();
      const tx = db.transaction(() => {
        for (const p of list) {
          const sku = String(p.sku || p.variants?.[0]?.sku || "").trim();
          const price = parsePrice(p.sellPrice ?? p.variants?.[0]?.sellPrice);
          if (!sku || !(price > 0)) continue;
          db.prepare("UPDATE products SET price=?, lastSeenAt=? WHERE sku=?").run(String(price), now, sku);
          refreshed++;
        }
      });
      tx();
      checked++;
    } catch (e) {
      log(`  ! 批量刷新失败（${e.message}），跳过该批`);
    }
  }
  return { refreshed, missing, batches: checked };
}

async function refresh() {
  const total = db.prepare("SELECT COUNT(*) c FROM leaves").get().c;
  const done = db.prepare("SELECT COUNT(*) c FROM leaves WHERE doneAt IS NOT NULL").get().c;
  if (done < total) { log(`refresh 跳过：首轮未完成（${done}/${total}）`); await harvest(); return; }

  const tree = await fetchCategoryTree();
  // 同 harvest：getCategory 返回的点数可能不准，清零后让真实 API 调用决定
  stopReason = null;
  const pathMap = new Map();
  for (const l1 of tree) for (const l2 of l1.l2s) for (const leaf of l2.leaves) {
    pathMap.set(leaf.id, `${l1.name} > ${l2.name} > ${leaf.name}`);
    upLeaf.run(leaf.id, leaf.name, l2.name, l1.name);
  }

  // ① 轮转巡检：每轮取 lastProbeAt 最旧的 N 个叶子
  const probeList = db.prepare(`
    SELECT leafId, leafName, fingerprint, pages FROM leaves ORDER BY lastProbeAt IS NOT NULL, lastProbeAt ASC LIMIT ?
  `).all(PROBE_LEAVES_PER_RUN);
  let changedLeaves = 0, probed = 0;
  for (const leaf of probeList) {
    if (stopReason) break;
    if (points.remaining !== null && points.remaining <= POINTS_RESERVE) { stopReason = stopReason || "points low"; break; }
    try {
      const body = await cjGet(`/product/listV2?page=1&size=${PAGE_SIZE}&categoryId=${encodeURIComponent(leaf.leafId)}`);
      if (body.pointsExhausted) break;
      const items = normalizeProductList(body.data.content);
      const fp = fingerprint(items);
      probed++;
      db.prepare("UPDATE leaves SET lastProbeAt=?, totalRecords=COALESCE(?,totalRecords) WHERE leafId=?")
        .run(nowIso(), body.data.totalRecords || null, leaf.leafId);
      if (fp !== leaf.fingerprint) {
        // 指纹变了：整叶深抓（页 1 的数据已经拿到，直接入库，再补后续页）
        changedLeaves++;
        upsertProducts(items, pathMap);
        db.prepare("UPDATE leaves SET fingerprint=?, harvestedPages=1, doneAt=NULL WHERE leafId=?").run(fp, leaf.leafId);
        const totalPages = Math.ceil((body.data.totalRecords || PAGE_SIZE) / PAGE_SIZE) || 1;
        for (let page = 2; page <= totalPages; page++) {
          if (stopReason) break;
          const b = await cjGet(`/product/listV2?page=${page}&size=${PAGE_SIZE}&categoryId=${encodeURIComponent(leaf.leafId)}`);
          if (b.pointsExhausted) break;
          upsertProducts(normalizeProductList(b.data.content), pathMap);
          db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page, leaf.leafId);
        }
        if (!stopReason) db.prepare("UPDATE leaves SET doneAt=?, harvestedPages=? WHERE leafId=?").run(nowIso(), totalPages, leaf.leafId);
        log(`  ↻ 叶子变化 ${leaf.leafName}（${leaf.leafId}）→ 已重抓`);
      }
    } catch (e) {
      log(`  ! 巡检叶子 ${leaf.leafId} 失败：${e.message}`);
    }
  }

  // ② 批量刷新前台可见 SKU 的价格
  let visInfo = null;
  try {
    const cur = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
    const visibleSkus = (cur.products || []).map(p => p.sku);
    if (visibleSkus.length && !stopReason) {
      visInfo = await refreshVisibleBatch(visibleSkus);
      if (visInfo) log(`  批量刷新可见 SKU：${visInfo.refreshed} 条更新 / ${visInfo.batches} 批 / 库缺 ${visInfo.missing}`);
    }
  } catch (e) { log(`  ! 读取前台 JSON 失败：${e.message}`); }

  const dbCount = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  writeStatus({
    lastSyncAt: nowIso(), lastSyncOk: true, lastError: null,
    dbProducts: dbCount, mode: "refresh", stopReason,
    refresh: { probed, changedLeaves, visibleBatch: visInfo },
  });
  log(`refresh：巡检 ${probed} 叶，变化 ${changedLeaves}，${stopReason ? "中断=" + stopReason : "本轮完整"}`);
}

// ---------------------------------------------------------------------------
// publish：从目录库回写前台 JSON（可见集合不变，价格/图刷新；缺行回退旧值）
// ---------------------------------------------------------------------------
async function publish() {
  const cur = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  const pathMap = new Map();
  try {
    const body = await cjGet("/product/getCategory");
    for (const l1 of (body.data || [])) {
      pathMap.set(l1.categoryFirstId, l1.categoryFirstName);
      for (const l2 of (l1.categoryFirstList || [])) {
        pathMap.set(l2.categorySecondId, `${l1.categoryFirstName} > ${l2.categorySecondName}`);
        for (const l3 of (l2.categorySecondList || [])) {
          pathMap.set(l3.categoryId, `${l1.categoryFirstName} > ${l2.categorySecondName} > ${l3.categoryName}`);
        }
      }
    }
  } catch (e) { log(`publish：分类树获取失败（${e.message}），沿用旧路径`); }

  const getRow = db.prepare("SELECT * FROM products WHERE sku=?");
  let updated = 0, kept = 0, missing = 0;
  const products = (cur.products || []).map(p => {
    const row = getRow.get(p.sku);
    if (!row) { missing++; return p; }
    if (!(row.price > 0) || !row.image) { kept++; return p; }
    if (String(row.price) !== String(p.price) || row.image !== p.image) updated++;
    return {
      ...p,
      name: row.name || p.name,
      price: String(row.price),
      image: row.image || p.image,
      hasVideo: !!row.hasVideo,
      categoryPath: pathMap.get(row.categoryId) || row.categoryPath || p.categoryPath,
    };
  });
  const staleCutoff = getMeta.get("passCompleteAt")?.value;
  let out = products;
  if (staleCutoff) {
    // 只有"整轮完成后"才按 lastSeen 过滤下架（首轮收割期间绝不删）
    const seen = db.prepare("SELECT lastSeenAt FROM products WHERE sku=?");
    out = products.filter(p => {
      const r = seen.get(p.sku);
      return !r || r.lastSeenAt >= staleCutoff;
    });
  }
  const next = {
    ...cur,
    products: out,
    lastSyncAt: nowIso(),
    catalogSource: "cj-catalog.db",
  };
  if (!DRY_RUN) writeAtomic(DATA_FILE, JSON.stringify(next));
  log(`publish：前台 ${out.length} 条（更新 ${updated}，库缺回退 ${missing}，剔除陈旧 ${products.length - out.length}）`);

  // 同步更新 visible_products 表（供新 SQLite 查询层用）
  if (!DRY_RUN) syncVisibleFromJson(out);
  log(`publish：visible_products 表已同步（${out.length} 条）`);

  writeStatus({ lastPublishAt: nowIso(), publishUpdated: updated, publishCount: out.length });
}

// ---------------------------------------------------------------------------
// syncVisibleFromJson：把 JSON 可见集同步到 visible_products 表
// ---------------------------------------------------------------------------
function syncVisibleFromJson(products) {
  const now = nowIso();
  const tx = db.transaction(() => {
    db.exec("DELETE FROM visible_products");
    const ins = db.prepare("INSERT INTO visible_products(sku, sortOrder, addedAt, source) VALUES (?, ?, ?, 'legacy-json')");
    for (let i = 0; i < products.length; i++) {
      ins.run(products[i].sku, i, now);
    }
  });
  tx();
}

// ---------------------------------------------------------------------------
// import-visible：从现有 JSON 导入可见集到 SQLite visible_products 表
//   用于首次迁移——把旧的 cj-local-data.json 里的 SKU 清单导入为可见集
// ---------------------------------------------------------------------------
function importVisible() {
  if (!existsSync(DATA_FILE)) { log("import-visible：JSON 文件不存在"); return; }
  const cur = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  const skus = (cur.products || []).map(p => p.sku).filter(Boolean);
  if (skus.length === 0) { log("import-visible：JSON 中无商品"); return; }
  if (!DRY_RUN) syncVisibleFromJson(cur.products || []);
  const visCount = db.prepare("SELECT COUNT(*) c FROM visible_products").get().c;
  log(`import-visible：导入 ${skus.length} 条，visible_products 表现有 ${visCount} 条`);
  writeStatus({ lastVisibleImportAt: nowIso(), visibleCount: visCount });
}

// ---------------------------------------------------------------------------
// curate：自动选品上架（从目录库按规则选品到可见集）
//   规则（可通过 --rule= 参数选择）：
//     top-by-category  每个叶子分类取 top N（按价格/新品等）
//     price-range      价格在 [min,max] 区间内的商品
//     new-arrivals     最近 N 天内数据有变化的商品（按 lastSeenAt）
//     all              全部上架（慎用！百万级会把前台撑爆）
//   默认 top-by-category，每类 50 个，轻量起步
// ---------------------------------------------------------------------------
async function curate(forceRule, forceDays) {
  const rule = forceRule || arg("rule", "top-by-category");
  const perLeaf = parseInt(arg("per-leaf", "50"), 10);
  const minPrice = parseFloat(arg("min-price", "0.5"));
  const maxPrice = parseFloat(arg("max-price", "50"));
  const days = forceDays || parseInt(arg("days", "30"), 10);

  const total = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  if (total === 0) { log("curate：目录库为空，先跑 harvest"); return; }

  let selected = [];
  if (rule === "all") {
    // 全部上架（慎用！）
    selected = db.prepare("SELECT sku FROM products WHERE price > 0 AND image != ''").all().map(r => r.sku);
  } else if (rule === "price-range") {
    selected = db.prepare(`
      SELECT sku FROM products
      WHERE price >= ? AND price <= ? AND image != ''
      ORDER BY name ASC
    `).all(minPrice, maxPrice).map(r => r.sku);
  } else if (rule === "new-arrivals") {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    selected = db.prepare(`
      SELECT sku FROM products
      WHERE lastSeenAt >= ? AND price > 0 AND image != ''
      ORDER BY lastSeenAt DESC
    `).all(cutoff).map(r => r.sku);
  } else {
    // top-by-category：每个叶子分类取 top N
    const leaves = db.prepare("SELECT leafId FROM leaves ORDER BY leafId").all();
    const getTop = db.prepare(`
      SELECT sku FROM products
      WHERE categoryId = ? AND price > 0 AND image != ''
      ORDER BY hasVideo DESC, name ASC
      LIMIT ?
    `);
    for (const { leafId } of leaves) {
      const rows = getTop.all(leafId, perLeaf);
      for (const r of rows) selected.push(r.sku);
    }
  }

  // 去重
  const unique = [...new Set(selected)];

  if (DRY_RUN) {
    log(`curate dry-run：规则=${rule}，将上架 ${unique.length} 条`);
    return;
  }

  // 写入 visible_products
  const now = nowIso();
  const tx = db.transaction(() => {
    db.exec("DELETE FROM visible_products");
    const ins = db.prepare("INSERT INTO visible_products(sku, sortOrder, addedAt, source) VALUES (?, ?, ?, ?)");
    for (let i = 0; i < unique.length; i++) {
      ins.run(unique[i], i, now, `auto:${rule}`);
    }
  });
  tx();

  log(`curate：规则=${rule}，上架 ${unique.length} 条（目录库共 ${total} 条）`);
  writeStatus({ lastCurateAt: nowIso(), curateRule: rule, visibleCount: unique.length });

  // 同步回写 JSON（让旧路径也能用上新选品）
  try {
    const cur = existsSync(DATA_FILE) ? JSON.parse(readFileSync(DATA_FILE, "utf-8")) : { products: [] };
    const getRow = db.prepare("SELECT * FROM products WHERE sku=?");
    const newProducts = unique.map(sku => {
      const row = getRow.get(sku);
      return row ? {
        id: row.pid || sku, sku: row.sku, name: row.name,
        price: String(row.price), image: row.image,
        hasVideo: !!row.hasVideo, categoryId: row.categoryId,
        categoryPath: row.categoryPath,
      } : null;
    }).filter(Boolean);
    writeAtomic(DATA_FILE, JSON.stringify({ ...cur, products: newProducts, lastSyncAt: now, catalogSource: "cj-catalog.db" }));
    log(`curate：JSON 已回写（${newProducts.length} 条）`);
  } catch (e) { log(`curate：JSON 回写失败（${e.message}）`); }
}

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------
function status() {
  const s = readStatus();
  const done = db.prepare("SELECT COUNT(*) c FROM leaves WHERE doneAt IS NOT NULL").get().c;
  const total = db.prepare("SELECT COUNT(*) c FROM leaves").get().c;
  const dbCount = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  let visCount = 0;
  try { visCount = db.prepare("SELECT COUNT(*) c FROM visible_products").get().c; } catch {}
  const byL1 = db.prepare(`
    SELECT l1Name, COUNT(*) c FROM leaves GROUP BY l1Name ORDER BY c DESC LIMIT 20
  `).all();
  console.log(JSON.stringify({ dbProducts: dbCount, visibleProducts: visCount, leavesDone: done, leavesTotal: total, points, ...s, byL1 }, null, 2));
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  if (!acquireLock()) return 0;
  try {
    const t0 = Date.now();
    log(`=== cj-catalog ${MODE} 开始 ===`);
    if (MODE === "status") { status(); return 0; }
    if (MODE === "harvest") await harvest();
    else if (MODE === "refresh") await refresh();
    else if (MODE === "publish") await publish();
    else if (MODE === "import-visible") { importVisible(); return 0; }
    else if (MODE === "curate") { await curate(); return 0; }
    else {
      // auto：首轮未完 → harvest；完成 → refresh + publish（有变化才发布）
      const done = db.prepare("SELECT COUNT(*) c FROM leaves WHERE doneAt IS NOT NULL").get().c;
      const total = db.prepare("SELECT COUNT(*) c FROM leaves").get().c;
      if (total === 0 || done < total) await harvest();
      else {
        const before = readStatus().dbProducts || 0;
        await refresh();
        if (!stopReason || stopReason.startsWith("page budget")) await publish();
        // 增量巡检后自动按 new-arrivals 更新可见集（最近 30 天有变化的商品）
        if (!stopReason || stopReason.startsWith("page budget")) {
          try { await curate("new-arrivals", 30); } catch (e) { log(`auto curate 失败：${e.message}`); }
        }
      }
    }
    log(`=== cj-catalog 结束（${((Date.now() - t0) / 1000).toFixed(0)}s，点数 used=${points.usedToday} remaining=${points.remaining}，stop=${stopReason || "无"}） ===`);
    return 0;
  } catch (e) {
    log(`FATAL ${e.stack || e.message}`);
    writeStatus({ lastSyncOk: false, lastError: e.message, lastSyncAt: nowIso() });
    return 1;
  } finally {
    releaseLock();
  }
}

process.exit(await main());
