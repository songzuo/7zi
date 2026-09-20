#!/usr/bin/env node
/**
 * cj-catalog.mjs —— CJ 全目录收割/增量刷新/前台发布（点数感知 · 断点续传）
 *
 * 背景（2026-09-20 二次实测，权威）：
 *   - CJ 2026-07 起改点数计费：base 50,000/天 + 订单转换($1=100点)，UTC 00:00 重置，
 *     每分钟回填 total/1440。耗尽返回 16900500 / HTTP 429（响应体含 pointsInfo.remaining）。
 *   - 【双通道实测结论】
 *     V1 /product/list：每页 50 点但 size 最大 200（0.25 点/条 = V2 两倍效率）；total 是真实值
 *       （Home Office Storage 真实 244,124 条）；支持 createTimeFrom/To 双边界时间切片
 *       （yyy-MM-dd HH:mm:ss，实测 2026H1=18,642 / H2=11,309）；orderBy=createAt 默认降序；
 *       offset 硬上限 6000（"the max offset is 6000"）→ 大叶子必须时间游标切片；
 *       每天最大 1000 次（2024-09-30 文档）→ 单日 20 万条上限；QPS 1 次/秒。
 *     V2 /product/listV2：每页 50 点但 size 最大 100（0.5 点/条）；totalRecords 字段被 6000 封顶
 *       （显示值不真实）；page 上限 1000×100=10 万条 → 24 万大叶子仍收不全；可作 fallback。
 *     /product/query：GET 单 pid（10 点/次）；POST 批量返回 16900202 "not supported"——
 *       原"每批 20 pid 10 点"假设错误，8683 可见 SKU 逐个刷 ≈ 86,830 点 ≈ 全天点数，不可行。
 *   - 旧 cj-sync 每小时全量抓 6000 条再被防呆丢弃 = 纯烧点，已停用。
 *
 * 模式（默认 auto，两阶段收割架构 v2）：
 *   阶段 1（全量收割期，done<total）：
 *     probe      全量规模探测（V1 page=1，真实 total；578 叶 ≈ 28,900 点 ≈ 1/3 天）
 *     harvest    双通道：小叶子(≤6000) V1 直接翻页（0.25 点/条）；大叶子(>6000) V1 时间游标切片
 *                （每窗口 ≤6000，断点存 meta cursor:<leafId>）；同秒超量回退 V2 整叶。
 *                优先级 = 可见 SKU 多的叶子先收（前台自然恢复）→ 大叶子优先。
 *   阶段 2（增量刷新期，done==total）：
 *     refresh    V1 轮转巡检 200 条指纹（0.25 点/条），指纹变化才深抓；
 *                增量新商品走 createTimeFrom=游标（未来版本），可见 SKU 由收割覆盖。
 *     publish    从 SQLite 回写 data/cj-local-data.json（前台可见集合不变，只刷价格/图）
 *     curate     按规则自动选品上架
 *   status   打印状态摘要（含真实规模地图、进度估计、可见覆盖）
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

const argv = process.argv.slice(2);
const arg = (n, d) => { const h = argv.find(a => a.startsWith(`--${n}=`)); return h ? h.split("=").slice(1).join("=") : d; };
const MODE = arg("mode", "auto");
const DRY_RUN = argv.includes("--dry-run");
const QUIET = argv.includes("--quiet");

const PAGE_SIZE_V1 = 200;         // V1 /product/list 每页最大 200 条（50 点/页 = 0.25 点/条，V2 的两倍效率）
const PAGE_SIZE_V2 = 100;          // V2 /product/listV2 每页最大 100 条（50 点/页 = 0.5 点/条）
const V1_MAX_OFFSET = 6000;        // V1 offset 硬上限（实测 "the max offset is 6000"）→ 大叶子必须时间切片
const V1_DAY_LIMIT = 1000;         // V1 每天最大请求次数（2024-09-30 文档）→ 单日 20 万条上限
const V1_TIME_FMT = "yyyy-MM-dd HH:mm:ss";
const MIN_INTERVAL_MS = 1150;      // QPS 1/s 留余量（V1 实测 1 次/秒，现有间隔正好）
const MAX_RETRY = 4;
const FETCH_TIMEOUT_MS = 30000;
const POINTS_RESERVE = parseInt(arg("reserve", "4000"), 10);   // 保底点数（--reserve 可调，留给结账/详情等）
const MAX_PAGES_PER_RUN = parseInt(arg("pages", "60"), 10);    // 单轮页数上限（--pages 可调）
const MAX_PAGES_PER_LEAF = 1000;   // 单叶子翻页安全上限（listV2 page 上限 1000，6000 条 totalRecords 封顶只影响字段显示，不影响翻页）
const PROBE_LEAVES_PER_RUN = parseInt(arg("probe", "40"), 10); // 探测/巡检每轮叶子数
const MAX_VISIBLE_PER_RUN = parseInt(arg("visible", "600"), 10); // 可见 SKU 精确收割每轮上限（×10 点）
const VISIBLE_CURSOR_KEY = "visibleCursor";  // 精确收割游标（JSON 数组下标），断点续传
const LOCK_STALE_MS = 15 * 60 * 1000;

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

async function pacedFetch(url, init, capture = true) {
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
      if (capture) capturePoints(body);
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
  }, false);  // token 响应的 pointsInfo 陈旧（曾返回 remaining=0 污染 stopReason），不采信
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
      return await pacedFetch(`${CJ_BASE}${path}`, { headers: { "CJ-Access-Token": token, "Content-Type": "application/json" } }, true);
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
// CJ 数据库时间统一为 Asia/Shanghai（UTC+8）。服务器可能运行在任意时区（本机 UTC+2），
// 窗口字符串必须按上海时间生成，否则 createTimeFrom/To 字面匹配会偏移。
function toV1Time(ms) {
  const d = new Date(Number(ms));
  const p = (n) => String(n).padStart(2, "0");
  const sh = new Date(d.getTime() + (8 - -d.getTimezoneOffset() / 60) * 3600000);
  // 上面表达等价于：把本地时刻平移成上海时刻（本地偏移 = -getTimezoneOffset()/60）
  const h = d.getUTCHours() + 8;
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + Math.floor(h / 24), h % 24, d.getUTCMinutes(), d.getUTCSeconds()));
  return `${day.getUTCFullYear()}-${p(day.getUTCMonth() + 1)}-${p(day.getUTCDate())} ${p(day.getUTCHours())}:${p(day.getUTCMinutes())}:${p(day.getUTCSeconds())}`;
}
function toV1TimeFromDateStr(s) {
  // "yyyy-MM-dd HH:mm:ss"（上海时区字面）→ 绝对毫秒
  const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return NaN;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 8, +m[5], +m[6]);
}

// V1 /product/list 归一化（data.list[] 直接是商品数组，字段名与 V2 不同）
// V1 优势：size 200 / 0.25 点每条 / total 真实 / createTimeFrom-To 时间切片
function normalizeV1List(raw) {
  const out = [];
  for (const p of raw || []) {
    const sku = String(p.productSku || p.sku || "").trim();
    const name = dedupeName(p.productNameEn || p.nameEn || "");
    const price = parsePrice(p.sellPrice);
    const image = String(p.productImage || p.bigImage || "").trim();
    if (!sku || !name || !image || !(price > 0)) continue;
    out.push({
      id: String(p.pid || p.id || ""),
      sku, name, price: String(price), image,
      hasVideo: p.isVideo === 1 || p.isVideo === "1" ? 1 : 0,
      categoryId: String(p.categoryId || ""),
      createAt: Number(p.createTime) || 0,  // 毫秒时间戳（实测返回数字）
    });
  }
  return out;
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
  doneAt TEXT, lastProbeAt TEXT,
  cappedAt TEXT,
  visSkuCount INTEGER DEFAULT 0
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

// 老库迁移：leaves 表可能缺 cappedAt / visSkuCount 列
(function migrateLeaves() {
  const cols = db.prepare("PRAGMA table_info(leaves)").all().map(c => c.name);
  if (!cols.includes("cappedAt")) db.exec("ALTER TABLE leaves ADD COLUMN cappedAt TEXT");
  if (!cols.includes("visSkuCount")) db.exec("ALTER TABLE leaves ADD COLUMN visSkuCount INTEGER DEFAULT 0");
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

// V1 单窗口翻页收割（createTimeFrom/To 可空 = 全量窗口）
// fromPage 支持断点续传（slice meta 记录窗口边界与已收页数）
// 返回 { got, stop, lastCreateAt, reachedLimit, pages }
async function harvestV1Window(leafId, pathMap, budget, timeFrom, timeTo, fromPage = 1) {
  let page = fromPage, got = 0, maxCreateAt = 0, minCreateAt = Infinity;
  const q = [`categoryId=${encodeURIComponent(leafId)}`, `pageSize=${PAGE_SIZE_V1}`];
  if (timeFrom) q.push(`createTimeFrom=${encodeURIComponent(timeFrom)}`);
  if (timeTo) q.push(`createTimeTo=${encodeURIComponent(timeTo)}`);
  while (page <= Math.ceil(V1_MAX_OFFSET / PAGE_SIZE_V1)) {
    if (budget.pages >= MAX_PAGES_PER_RUN) {
      stopReason = stopReason || `page budget (${MAX_PAGES_PER_RUN})`;
      return { got, stop: "stop", maxCreateAt, minCreateAt: minCreateAt === Infinity ? 0 : minCreateAt, pages: page - 1 };
    }
    if (points.remaining !== null && points.remaining <= POINTS_RESERVE) {
      stopReason = stopReason || `points low (${points.remaining})`;
      return { got, stop: "stop", maxCreateAt, minCreateAt: minCreateAt === Infinity ? 0 : minCreateAt, pages: page - 1 };
    }
    const body = await cjGet(`/product/list?${q.join("&")}&pageNum=${page}`);
    if (body.pointsExhausted) return { got, stop: "stop", maxCreateAt, minCreateAt: minCreateAt === Infinity ? 0 : minCreateAt, pages: page - 1 };
    const items = normalizeV1List(body.data && body.data.list);
    if (items.length === 0) break;
    for (const it of items) {
      if (it.createAt > maxCreateAt) maxCreateAt = it.createAt;
      if (it.createAt > 0 && it.createAt < minCreateAt) minCreateAt = it.createAt;
    }
    upsertProducts(items, pathMap);
    got += items.length;
    db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page, leafId);
    budget.pages++;
    if (items.length < PAGE_SIZE_V1) break;  // 非满载 = 窗口真实边界
    page++;
  }
  return { got, stop: null, maxCreateAt, minCreateAt: minCreateAt === Infinity ? 0 : minCreateAt, pages: page - 1 };
}

// V2 fallback：大叶子/超限时用 listV2 翻页（page 上限 1000×100=10 万条，超限标记 cappedAt）
async function harvestV2Leaf(leafId, pathMap, budget) {
  let page = 1, got = 0, totalRecords = 0;
  while (page <= MAX_PAGES_PER_LEAF) {
    if (budget.pages >= MAX_PAGES_PER_RUN) {
      stopReason = stopReason || `page budget (${MAX_PAGES_PER_RUN})`;
      db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page - 1, leafId);
      return "stop";
    }
    if (points.remaining !== null && points.remaining <= POINTS_RESERVE) {
      stopReason = stopReason || `points low (${points.remaining})`;
      db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page - 1, leafId);
      return "stop";
    }
    const body = await cjGet(`/product/listV2?page=${page}&size=${PAGE_SIZE_V2}&categoryId=${encodeURIComponent(leafId)}`);
    if (body.pointsExhausted) { db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page - 1, leafId); return "stop"; }
    const items = normalizeProductList(body.data.content);
    if (page === 1) totalRecords = body.data.totalRecords || items.length;
    if (items.length === 0) break;
    upsertProducts(items, pathMap);
    got += items.length;
    db.prepare("UPDATE leaves SET totalRecords=?, pages=?, harvestedPages=? WHERE leafId=?")
      .run(totalRecords, page, page, leafId);
    budget.pages++;
    page++;
  }
  const finalPages = page - 1;
  const capped = finalPages >= MAX_PAGES_PER_LEAF;
  db.prepare("UPDATE leaves SET doneAt=?, harvestedPages=?, pages=?, fingerprint=NULL, cappedAt=? WHERE leafId=?")
    .run(nowIso(), finalPages, finalPages, capped ? nowIso() : null, leafId);
  log(`  ✓ 叶子完成 ${leafId} (V2): 实际 ${got} 条（totalRecords=${totalRecords}${capped ? "，达到 V2 页上限可能截断" : ""}）`);
  return "done";
}

// 双通道收割：V1 优先（0.25 点/条 + 真实 total + 时间切片），大叶子(>6000)游标切片，V2 兜底
async function harvestLeaf(leafId, pathMap, budget) {
  // 第一步：V1 page1 探测真实 total（V1 total 是真实值，V2 会封顶 6000）
  const probeBody = await cjGet(`/product/list?categoryId=${encodeURIComponent(leafId)}&pageNum=1&pageSize=${PAGE_SIZE_V1}`);
  if (probeBody.pointsExhausted) return "stop";
  const realTotal = (probeBody.data && probeBody.data.total) || 0;
  const firstItems = normalizeV1List(probeBody.data && probeBody.data.list);
  let maxCreateAt = 0;
  for (const it of firstItems) if (it.createAt > maxCreateAt) maxCreateAt = it.createAt;
  db.prepare("UPDATE leaves SET totalRecords=?, cappedAt=? WHERE leafId=?")
    .run(realTotal, realTotal > V1_MAX_OFFSET ? nowIso() : null, leafId);

  // 小叶子（≤6000）：直接 V1 翻页，第一页已拿到
  if (realTotal <= V1_MAX_OFFSET) {
    let got = 0, page = 1;
    const q = `categoryId=${encodeURIComponent(leafId)}&pageSize=${PAGE_SIZE_V1}`;
    // 第一页复用探测结果
    if (firstItems.length) {
      upsertProducts(firstItems, pathMap);
      got += firstItems.length;
      db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(1, leafId);
      budget.pages++;
    }
    page = 2;
    while (page <= Math.ceil(V1_MAX_OFFSET / PAGE_SIZE_V1)) {
      if (budget.pages >= MAX_PAGES_PER_RUN) {
        stopReason = stopReason || `page budget (${MAX_PAGES_PER_RUN})`;
        db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page - 1, leafId);
        return "stop";
      }
      if (points.remaining !== null && points.remaining <= POINTS_RESERVE) {
        stopReason = stopReason || `points low (${points.remaining})`;
        db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page - 1, leafId);
        return "stop";
      }
      const body = await cjGet(`/product/list?${q}&pageNum=${page}`);
      if (body.pointsExhausted) { db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page - 1, leafId); return "stop"; }
      const items = normalizeV1List(body.data && body.data.list);
      if (items.length === 0) break;
      upsertProducts(items, pathMap);
      got += items.length;
      for (const it of items) if (it.createAt > maxCreateAt) maxCreateAt = it.createAt;
      db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page, leafId);
      budget.pages++;
      if (items.length < PAGE_SIZE_V1) break;
      page++;
    }
    const finalPages = page - 1;
    db.prepare("UPDATE leaves SET doneAt=?, harvestedPages=?, pages=?, fingerprint=NULL, cappedAt=NULL WHERE leafId=?")
      .run(nowIso(), finalPages, finalPages, leafId);
    log(`  ✓ 叶子完成 ${leafId} (V1): 实际 ${got} 条（真实 total=${realTotal}）`);
    return "done";
  }

  // 大叶子（>6000）：V1 时间游标切片。窗口 [cursor, now]，每窗口 ≤6000 条。
  // orderBy 默认 createAt 降序（实测第一页 = 最新）→ 从最新往回切。
  log(`  ◎ 大叶子 ${leafId}: 真实 ${realTotal} 条 > 6000，启动时间游标切片（V1，0.25 点/条）`);
  const metaKey = `cursor:${leafId}`;
  const sliceKey = `slice:${leafId}`;
  let cursorStr = getMeta.get(metaKey)?.value || null;  // 已收割到的最大 createTime（"yyyy-MM-dd HH:mm:ss"）
  let gotAll = 0, cursorMs = cursorStr ? toV1TimeFromDateStr(cursorStr) : Date.now() + 86400000; // 初始 = 未来（含全部）
  if (isNaN(cursorMs)) cursorMs = Date.now() + 86400000;
  let rounds = 0;
  while (true) {
    if (stopReason) { db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(0, leafId); return "stop"; }
    if (points.remaining !== null && points.remaining <= POINTS_RESERVE) { stopReason = stopReason || "points low"; return "stop"; }
    // 窗口 [oldest, cursorMs]，oldest = 2000-01-01（覆盖全历史）
    const winFrom = "2000-01-01 00:00:00";
    const winTo = toV1Time(cursorMs);
    // 断点续传：上次未收完的窗口（slice meta 的 to 与当前 winTo 相同）
    let slice = null;
    try { slice = JSON.parse(getMeta.get(sliceKey)?.value || "null"); } catch {}
    if (slice && slice.to === winTo && slice.page > 0) {
      const sr = await harvestV1Window(leafId, pathMap, budget, winFrom, winTo, slice.page + 1);
      gotAll += sr.got;
      if (sr.stop) {
        setMeta.run(metaKey, toV1Time(cursorMs));
        setMeta.run(sliceKey, JSON.stringify({ to: winTo, page: slice.page + sr.pages }));
        return "stop";
      }
      // 窗口收完：清除 slice，推进游标到窗口内最小 createAt - 1ms
      setMeta.run(sliceKey, "null");
      cursorMs = (sr.minCreateAt || cursorMs) - 1;
      setMeta.run(metaKey, toV1Time(cursorMs));
      rounds++;
      if (cursorMs <= 0) break;
      continue;
    }
    const probeW = await cjGet(`/product/list?categoryId=${encodeURIComponent(leafId)}&pageNum=1&pageSize=${PAGE_SIZE_V1}&createTimeTo=${encodeURIComponent(winTo)}`);
    if (probeW.pointsExhausted) return "stop";
    const wTotal = (probeW.data && probeW.data.total) || 0;
    rounds++;
    if (wTotal === 0) break;  // 已到最早边界
    const wItems = normalizeV1List(probeW.data && probeW.data.list);
    if (wItems.length === 0) break;
    // 该窗口 ≤6000 → 整窗收割（首页复用）；>6000 → 收紧游标重试（游标向前推进）
    if (wTotal > V1_MAX_OFFSET) {
      // 窗口还是太大：游标前移到本窗口第 6000 条的时间（最新 6000 条先收）
      // 用 orderBy=createAt 降序，第 30 页最后一条 = 第 6000 条
      const tail = await cjGet(`/product/list?categoryId=${encodeURIComponent(leafId)}&pageNum=30&pageSize=${PAGE_SIZE_V1}&createTimeTo=${encodeURIComponent(winTo)}`);
      if (tail.pointsExhausted) return "stop";
      const tailItems = normalizeV1List(tail.data && tail.data.list);
      if (tailItems.length === 0) { break; }
      const times = tailItems.map(i => i.createAt || 0).filter(t => t > 0);
      const boundaryMs = Math.min(...times);
      const spanMs = Math.max(...times) - boundaryMs;
      // 同秒超量防护：第 6000 条与窗口最新时间差 < 1 秒 = 同一秒批量上架超 6000 条，
      // 时间游标会漏掉同秒剩余商品 → 回退 V2 整叶收割（0.5 点/条但完整），标记 cappedAt。
      if (spanMs < 1000 && wTotal > V1_MAX_OFFSET) {
        log(`  ! 大叶子 ${leafId} 检测到同秒批量上架超量（窗口 ${wTotal} 条跨 ${spanMs}ms），回退 V2 整叶收割`);
        const r2 = await harvestV2Leaf(leafId, pathMap, budget);
        if (r2 === "stop") { setMeta.run(metaKey, toV1Time(cursorMs)); return "stop"; }
        return "done";
      }
      // 先收 [boundaryMs, cursorMs] 这个 ≤6000 的窗口（第 1..30 页，最后一页即 boundaryMs 处）
      const r = await harvestV1Window(leafId, pathMap, budget, winFrom, winTo);
      gotAll += r.got;
      if (r.stop) {
        // 预算不足：记录窗口级断点（to + 已收页数），下轮从下页继续，不重复不遗漏
        // 同时持久化当前游标（= 未推进的 winTo），避免下次进入时时间戳漂移
        setMeta.run(metaKey, toV1Time(cursorMs));
        setMeta.run(sliceKey, JSON.stringify({ to: winTo, page: r.pages || 0 }));
        return "stop";
      }
      // 下一次从 boundaryMs 往前 1ms 继续（窗口内最小 createAt，v1 降序下 = 第 30 页尾）
      cursorMs = (r.minCreateAt || boundaryMs) - 1;
      setMeta.run(metaKey, toV1Time(cursorMs));
      setMeta.run(sliceKey, "null");
      continue;
    }
    // 窗口 ≤6000：整窗收割（复用探测首页）
    const wFromPage = (slice && slice.to === winTo && slice.page > 0) ? slice.page + 1 : 2;
    let page = wFromPage, winGot = (wFromPage === 2 ? wItems.length : 0);
    if (wFromPage === 2) {
      upsertProducts(wItems, pathMap);
      db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(1, leafId);
      budget.pages++;
    }
    while (page <= Math.ceil(V1_MAX_OFFSET / PAGE_SIZE_V1)) {
      if (budget.pages >= MAX_PAGES_PER_RUN) {
        stopReason = stopReason || `page budget (${MAX_PAGES_PER_RUN})`;
        setMeta.run(metaKey, toV1Time(cursorMs));
        setMeta.run(sliceKey, JSON.stringify({ to: winTo, page: page - 1 }));
        db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page - 1, leafId);
        return "stop";
      }
      if (points.remaining !== null && points.remaining <= POINTS_RESERVE) {
        stopReason = stopReason || "points low";
        setMeta.run(metaKey, toV1Time(cursorMs));
        setMeta.run(sliceKey, JSON.stringify({ to: winTo, page: page - 1 }));
        return "stop";
      }
      const b = await cjGet(`/product/list?categoryId=${encodeURIComponent(leafId)}&pageNum=${page}&pageSize=${PAGE_SIZE_V1}&createTimeFrom=${encodeURIComponent(winFrom)}&createTimeTo=${encodeURIComponent(winTo)}`);
      if (b.pointsExhausted) { setMeta.run(metaKey, toV1Time(cursorMs)); setMeta.run(sliceKey, JSON.stringify({ to: winTo, page: page - 1 })); return "stop"; }
      const more = normalizeV1List(b.data && b.data.list);
      if (more.length === 0) break;
      upsertProducts(more, pathMap);
      winGot += more.length;
      db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page, leafId);
      budget.pages++;
      if (more.length < PAGE_SIZE_V1) break;
      page++;
    }
    gotAll += winGot;
    // 推进游标：窗口内最小 createAt - 1ms
    const minMs = Math.min(...wItems.map(i => i.createAt || 0));
    cursorMs = minMs - 1;
    setMeta.run(metaKey, toV1Time(cursorMs));
    setMeta.run(sliceKey, "null");
    rounds++;
    if (cursorMs <= 0) break;
  }
  db.prepare("UPDATE leaves SET doneAt=?, harvestedPages=?, pages=?, fingerprint=NULL, cappedAt=NULL WHERE leafId=?")
    .run(nowIso(), 0, rounds, leafId);
  log(`  ✓ 大叶子完成 ${leafId} (V1 切片): 实际 ${gotAll} 条（真实 total=${realTotal}，共 ${rounds} 个窗口）`);
  return "done";
}

// =====================================================================
// 全站全量收割（发现真实可见 SKU 全集）——用户确认的主路径
//   遍历 V1 /product/list 全站（不带 categoryId，total=1,553,986 实测），
//   时间窗口自适应二分：起窗 [2019-01-01, now]，窗口 total>6000 二分（半年→季→月→旬→日），
//   ≤6000 则翻页收完（≤30 页）。V1 list 本身就是"有效 SKU 数据"（每条带 productSku、
//   saleStatus=3、非 test）——服务端已做"只返回有效 SKU"的筛选，入库即真实可见集。
//   断点续传：meta[fullSiteQueue] = 待处理窗口栈 JSON，每轮处理一批后持久化；
//   点数不足保存栈，下轮从栈顶续传。成本 ≈ 155万 × 0.25 点 ≈ 38.9万点 ≈ 4.4 天。
// =====================================================================
const FULL_SITE_QUEUE_KEY = "fullSiteQueue";   // 待处理窗口栈 JSON（[ [from,to], ... ]）
const FULL_SITE_START = "2019-01-01 00:00:00"; // 实测最早年份（2019=27,160 条）

/** 全站队列是否还有待处理窗口 */
function queuePending() {
  try { return JSON.parse(getMeta.get(FULL_SITE_QUEUE_KEY)?.value || "[]").length > 0; } catch { return false; }
}

/** 增量刷新游标 key：全量完成后记录开始时刻，之后只拉该时刻之后新增的商品 */
const INCR_CURSOR_KEY = "incrCursor";
const FULL_SITE_WINDOW_MAX = 6000;             // 窗口条数上限（V1 offset 硬上限，30 页收完）

/** 窗口二分：total>6000 → 按时间中点切成两半（含 [from,mid],[mid,to]，mid 去重毫秒） */
function splitWindow(fromStr, toStr) {
  const fromMs = toV1TimeFromDateStr(fromStr), toMs = toV1TimeFromDateStr(toStr);
  if (isNaN(fromMs) || isNaN(toMs)) return null;
  const mid = Math.floor((fromMs + toMs) / 2);
  if (mid <= fromMs || mid >= toMs) return null; // 1ms 内无法再分
  const midStr = toV1Time(mid);
  return [[fromStr, midStr], [midStr, toStr]];
}

/**
 * 全站全量收割一轮。返回 {got, done, queueLen}；点数/预算不足时持久化队列并停。
 * 窗口处理：弹栈顶 → 探测 total → >6000 二分入栈（前窗后窗压栈）→ ≤6000 翻页收完。
 * 断点粒度：窗口级（页内断点由窗口重收覆盖，窗口 ≤6000 重收成本可控）。
 */
async function harvestFullSite() {
  stopReason = null;
  points = { usedToday: null, remaining: null, total: null }; // 点数以业务 API 响应为准
  const startedAt = toV1Time(Date.now());
  // 全量完成时：增量游标 = 本轮开始时刻（全量已覆盖 [2019, startedAt]，之后新增走增量）
  // 恢复窗口栈
  let queue = [];
  try { queue = JSON.parse(getMeta.get(FULL_SITE_QUEUE_KEY)?.value || "[]"); } catch {}
  if (!Array.isArray(queue) || queue.length === 0) {
    // 已有全量完成标记（增量游标存在）→ 不重建，避免手动触发死循环重跑
    if (getMeta.get(INCR_CURSOR_KEY)?.value) {
      log(`fullsite：全量已完成（增量游标=${getMeta.get(INCR_CURSOR_KEY)?.value}），如需重跑请清 meta fullSiteQueue`);
      return { got: 0, done: 0, queueLen: 0 };
    }
    queue = [[FULL_SITE_START, toV1Time(Date.now() + 86400000)]];
  }
  const pathMap = await buildPathMapFromTree();
  let got = 0, doneWindows = 0, rounds = 0;
  const budget = { pages: 0 };

  while (queue.length > 0) {
    if (stopReason) break;
    if (budget.pages >= MAX_PAGES_PER_RUN) { stopReason = stopReason || `page budget (${MAX_PAGES_PER_RUN})`; break; }
    if (points.remaining !== null && points.remaining <= POINTS_RESERVE) { stopReason = stopReason || `points low (${points.remaining})`; break; }

    const [winFrom, winTo] = queue[queue.length - 1];
    // 探测窗口规模（50 点）
    const probeBody = await cjGet(`/product/list?pageNum=1&pageSize=${PAGE_SIZE_V1}&createTimeFrom=${encodeURIComponent(winFrom)}&createTimeTo=${encodeURIComponent(winTo)}`);
    if (probeBody.pointsExhausted) break;
    const wTotal = (probeBody.data && probeBody.data.total) || 0;
    const wItems = normalizeV1List(probeBody.data && probeBody.data.list);
    rounds++;
    if (wTotal === 0 || wItems.length === 0) { queue.pop(); setMeta.run(FULL_SITE_QUEUE_KEY, JSON.stringify(queue)); doneWindows++; continue; }

    if (wTotal > FULL_SITE_WINDOW_MAX) {
      // 窗口太大 → 二分（前后窗压栈，先收后面的）
      const parts = splitWindow(winFrom, winTo);
      if (!parts) {
        // 1ms 内仍超 6000：极端同秒批量，回退 V2 全站翻页（page 上限 1000×100=10 万）
        log(`  ! 窗口 ${winFrom}~${winTo} 同秒超量 ${wTotal} 条，回退 V2 翻页`);
        queue.pop();
        const r = await harvestV2FullSiteWindow(winFrom, winTo, pathMap, budget);
        got += r.got;
        if (r.stop) { setMeta.run(FULL_SITE_QUEUE_KEY, JSON.stringify(queue)); return { got, done: doneWindows, queueLen: queue.length }; }
        doneWindows++;
        setMeta.run(FULL_SITE_QUEUE_KEY, JSON.stringify(queue));
        continue;
      }
      queue.pop();
      queue.push(parts[1], parts[0]); // 先收后半（更新的数据优先）
      setMeta.run(FULL_SITE_QUEUE_KEY, JSON.stringify(queue));
      continue;
    }

    // 窗口 ≤6000：整窗翻页收完（复用探测首页）
    queue.pop();
    let page = 2, winGot = wItems.length;
    upsertProducts(wItems, pathMap);
    budget.pages++;
    const qBase = `pageSize=${PAGE_SIZE_V1}&createTimeFrom=${encodeURIComponent(winFrom)}&createTimeTo=${encodeURIComponent(winTo)}`;
    while (page <= Math.ceil(FULL_SITE_WINDOW_MAX / PAGE_SIZE_V1)) {
      if (budget.pages >= MAX_PAGES_PER_RUN) { stopReason = stopReason || `page budget (${MAX_PAGES_PER_RUN})`; break; }
      if (points.remaining !== null && points.remaining <= POINTS_RESERVE) { stopReason = stopReason || `points low (${points.remaining})`; break; }
      const b = await cjGet(`/product/list?${qBase}&pageNum=${page}`);
      if (b.pointsExhausted) break;
      const more = normalizeV1List(b.data && b.data.list);
      if (more.length === 0) break;
      upsertProducts(more, pathMap);
      winGot += more.length;
      budget.pages++;
      if (more.length < PAGE_SIZE_V1) break;
      page++;
    }
    got += winGot;
    doneWindows++;
    setMeta.run(FULL_SITE_QUEUE_KEY, JSON.stringify(queue));
    if (rounds % 20 === 0) log(`  ↻ 全站收割窗口 ${doneWindows} 个，累计 +${got} 条（剩余窗口 ${queue.length}）`);
  }

  setMeta.run(FULL_SITE_QUEUE_KEY, JSON.stringify(queue));
  const doneAll = queue.length === 0 && !stopReason;
  if (doneAll) setMeta.run(INCR_CURSOR_KEY, startedAt);
  const dbCount = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  log(`fullsite：本轮收割 ${got} 条，完成窗口 ${doneWindows} 个，剩余 ${queue.length} 个${doneAll ? "（全量完成！增量游标=" + startedAt + "）" : ""}，库内共 ${dbCount} 条`);
  writeStatus({
    lastSyncAt: nowIso(), lastSyncOk: true, lastError: null,
    mode: "fullsite", stopReason,
    fullSite: { got, doneWindows, queueLen: queue.length, doneAll, dbProducts: dbCount },
  });
  return { got, done: doneWindows, queueLen: queue.length };
}

/** V2 全站窗口兜底（同秒超量时整窗翻页，page 上限 1000） */
async function harvestV2FullSiteWindow(winFrom, winTo, pathMap, budget) {
  let page = 1, got = 0;
  while (page <= 1000) {
    if (budget.pages >= MAX_PAGES_PER_RUN) { stopReason = stopReason || `page budget (${MAX_PAGES_PER_RUN})`; break; }
    if (points.remaining !== null && points.remaining <= POINTS_RESERVE) { stopReason = stopReason || `points low (${points.remaining})`; break; }
    let q = `page=${page}&size=${PAGE_SIZE_V2}`;
    if (winFrom) q += `&createTimeFrom=${encodeURIComponent(winFrom)}`;
    if (winTo) q += `&createTimeTo=${encodeURIComponent(winTo)}`;
    const body = await cjGet(`/product/listV2?${q}`);
    if (body.pointsExhausted) break;
    const items = normalizeProductList(body.data && body.data.content);
    if (items.length === 0) break;
    upsertProducts(items, pathMap);
    got += items.length;
    budget.pages++;
    if (items.length < PAGE_SIZE_V2) break;
    page++;
  }
  return { got, stop: stopReason };
}

/** 从分类树构建 pathMap（getCategory 免费） */
async function buildPathMapFromTree() {
  const tree = await fetchCategoryTree();
  const pathMap = new Map();
  for (const l1 of tree) for (const l2 of l1.l2s) for (const leaf of l2.leaves) {
    pathMap.set(leaf.id, `${l1.name} > ${l2.name} > ${leaf.name}`);
  }
  return pathMap;
}

// ---------------------------------------------------------------------------
// probe：全量规模探测（一次性 · 摸清真实数据地图）
//   对每个叶子取 page=1（50 点/叶），记录 totalRecords 与是否触及 6000 封顶，
//   得到全目录真实规模分布，用于：① 收割优先级排序 ② 全量天数预估 ③ 是否需分片
//   578 叶 ≈ 28,900 点 ≈ 约 1/3 天点数，分轮（每轮 PROBE_LEAVES_PER_RUN 叶）跑完
// ---------------------------------------------------------------------------
async function probe() {
  const tree = await fetchCategoryTree();
  const pathMap = new Map();
  let leafCount = 0;
  for (const l1 of tree) for (const l2 of l1.l2s) for (const leaf of l2.leaves) {
    upLeaf.run(leaf.id, leaf.name, l2.name, l1.name);
    pathMap.set(leaf.id, `${l1.name} > ${l2.name} > ${leaf.name}`);
    leafCount++;
  }
  stopReason = null;

  // 探测顺序：尚未探测的叶子优先（lastProbeAt IS NULL 排最前），其次可见 SKU 多的
  const probeList = db.prepare(`
    SELECT leafId, leafName, visSkuCount, totalRecords, lastProbeAt
    FROM leaves
    ORDER BY (lastProbeAt IS NOT NULL) ASC, visSkuCount DESC, leafId
    LIMIT ?
  `).all(PROBE_LEAVES_PER_RUN);

  let probed = 0, capped = 0, visProbed = 0;
  for (const leaf of probeList) {
    if (stopReason) break;
    if (points.remaining !== null && points.remaining <= POINTS_RESERVE) { stopReason = stopReason || "points low"; break; }
    try {
      // V1 探测：total 是真实值（V2 会封顶 6000），顺便验证可收割性
      const body = await cjGet(`/product/list?categoryId=${encodeURIComponent(leaf.leafId)}&pageNum=1&pageSize=${PAGE_SIZE_V1}`);
      if (body.pointsExhausted) break;
      const items = normalizeV1List(body.data && body.data.list);
      const tr = (body.data && body.data.total) || 0;
      const isCapped = tr > V1_MAX_OFFSET;  // 真实值超 6000 = 需要时间切片
      db.prepare("UPDATE leaves SET totalRecords=?, lastProbeAt=?, cappedAt=? WHERE leafId=?")
        .run(tr, nowIso(), isCapped ? nowIso() : null, leaf.leafId);
      if (leaf.visSkuCount > 0) visProbed++;
      if (isCapped) capped++;
      probed++;
    } catch (e) {
      log(`  ! 探测叶子 ${leaf.leafId} 失败：${e.message}`);
    }
  }

  const total = db.prepare("SELECT COUNT(*) c FROM leaves").get().c;
  const probedAll = db.prepare("SELECT COUNT(*) c FROM leaves WHERE lastProbeAt IS NOT NULL").get().c;
  const sum = db.prepare("SELECT COALESCE(SUM(totalRecords),0) s FROM leaves").get().s;
  const cappedAll = db.prepare("SELECT COUNT(*) c FROM leaves WHERE cappedAt IS NOT NULL").get().c;
  log(`probe：本轮探测 ${probed} 叶（可见叶 ${visProbed}，封顶疑似 ${capped}）；累计 ${probedAll}/${total}，规模合计 ${sum} 条，封顶疑似 ${cappedAll} 叶`);
  log(`probe：可见 SKU 集中叶子已探测：${db.prepare("SELECT COUNT(*) c FROM leaves WHERE visSkuCount>0 AND lastProbeAt IS NOT NULL").get().c}/${db.prepare("SELECT COUNT(*) c FROM leaves WHERE visSkuCount>0").get().c}`);
  writeStatus({
    lastSyncAt: nowIso(), lastSyncOk: true, lastError: null,
    mode: "probe", stopReason,
    probe: { thisRound: probed, probedAll, leavesTotal: total, sumRecords: sum, cappedLeaves: cappedAll },
  });
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

  // 优先级 = 可见叶子优先（按可见密度：可见数/真实规模，先恢复前台）
  //          → 非可见叶子按规模降序（大叶长尾切片）。
  // 理由：Home Office(24万条) 收 1200 页才覆盖 2879 可见 SKU（密度 1.2%），
  //       而 Rings(≤6000 条) 几分钟收完覆盖 560 可见 SKU（密度 9.3%）——先收密度高的。
  const pending = db.prepare(`
    SELECT leafId, leafName, visSkuCount FROM leaves WHERE doneAt IS NULL
    ORDER BY
      (visSkuCount > 0) DESC,
      CASE WHEN COALESCE(totalRecords,0) > 0 THEN visSkuCount * 1.0 / totalRecords ELSE 1 END DESC,
      visSkuCount DESC,
      COALESCE(totalRecords,0) DESC,
      leafId
  `).all();
  log(`harvest：叶子共 ${leafCount}，待完成 ${pending.length}，本轮页预算 ${MAX_PAGES_PER_RUN}`);
  log(`harvest：收割优先级 = 可见密度优先（可见SKU数/真实规模）→ 可见多的 → 大叶子（前 5：${pending.slice(0,5).map(l=>`${l.leafName}(${l.visSkuCount}可见)`).join(", ") || "无"}）`);

  const budget = { pages: 0 };
  for (const { leafId } of pending) {
    if (stopReason) break;
    const r = await harvestLeaf(leafId, pathMap, budget);
    if (r === "stop") break;
  }

  const done = db.prepare("SELECT COUNT(*) c FROM leaves WHERE doneAt IS NOT NULL").get().c;
  const total = db.prepare("SELECT COUNT(*) c FROM leaves").get().c;
  const dbCount = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  // 全量规模估计：已完成叶子的实际收割量 + 未完成叶子的 totalRecords 合计（探测值，可能被 6000 封顶低估）
  // 进度估算：已完成叶子的实际入库数（从 products 按已完成 leaf 统计，V1/V2 页大小不同不依赖 harvestedPages）
  const harvestStat = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM products p WHERE p.categoryId IN (SELECT leafId FROM leaves WHERE doneAt IS NOT NULL)) AS doneRows,
      COALESCE(SUM(CASE WHEN doneAt IS NULL THEN totalRecords END), 0) AS pendingRecords
    FROM leaves
  `).get();
  const estTotal = harvestStat.doneRows + harvestStat.pendingRecords;
  const estDonePct = estTotal > 0 ? Math.round((harvestStat.doneRows / estTotal) * 1000) / 10 : 0;
  log(`harvest：进度 ≈ ${harvestStat.doneRows} / ${estTotal} 条（${estDonePct}%），已收 ${dbCount} 条`);
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
    est: { doneRows: harvestStat.doneRows, estTotal, estDonePct },
  });
}

// ---------------------------------------------------------------------------
// refresh：整轮完成后只更新变化的数据
//   ① 轮转巡检叶子指纹（每叶 1 页 50 点，变了才整叶深抓）
//   ② 批量 /product/query 刷新前台可见 SKU（每批 20 pid 仅 10 点）
// ---------------------------------------------------------------------------
// visible-refresh 独立模式：不依赖收割完成，直接从旧 JSON 拿 pid 刷新并 upsert 入库。
// 前置条件：import-visible 已把可见 SKU 与 categoryId 映射进库（旧 JSON 里带 pid/id）。
// =====================================================================
// 可见 SKU 精确收割（主路径，用户确认的策略）
//   只收割 visible_products 里的真实可见 SKU：GET /product/query?pid=xxx，
//   10 点/个（实测），8,683 SKU ≈ 86,830 点 ≈ 1 天点数。
//   全量叶子收割降级为可选（--mode=harvest），auto 默认不跑全量。
//   断点：meta[visibleCursor] = JSON 数组下标；新 SKU 上架后再次运行即增量。
// =====================================================================
async function refreshVisibleFromJson() {
  if (!existsSync(DATA_FILE)) { log("visible-refresh：JSON 文件不存在"); return null; }
  const cur = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  const prods = (cur.products || []).filter(p => p.sku && (p.id || p.pid));
  if (prods.length === 0) { log("visible-refresh：JSON 中无带 pid 的可见 SKU"); return null; }
  const totalVisible = prods.length;

  // 断点续传：从上次下标继续；若 JSON 变了（新 SKU 上架）从头扫新增
  let cursor = parseInt(getMeta.get(VISIBLE_CURSOR_KEY)?.value || "0", 10);
  if (!(cursor >= 0) || cursor > totalVisible) cursor = 0;
  if (cursor === totalVisible) { log(`visible-refresh：已全部收割过（${totalVisible}），本轮扫描新增`); cursor = 0; }
  const budget = Math.min(MAX_VISIBLE_PER_RUN, totalVisible - cursor);

  let refreshed = 0, updated = 0, inserted = 0, missing = 0, offShelf = 0, checked = 0;
  const now = nowIso();
  const tx = db.transaction((list) => {
    for (const p of list) {
      const sku = String(p.sku || "").trim();
      const pid = String(p.id || p.pid || "");
      const name = dedupeName(p.nameEn || p.productNameEn || "");
      const price = parsePrice(p.sellPrice ?? p.variants?.[0]?.sellPrice);
      const image = String(p.bigImage || p.productImage || "").trim();
      const categoryId = String(p.categoryId || "");
      const exist = db.prepare("SELECT sku FROM products WHERE sku=?").get(sku);
      db.prepare(`
        INSERT INTO products (sku, pid, name, price, image, hasVideo, categoryId, categoryPath, firstSeenAt, lastSeenAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
        ON CONFLICT(sku) DO UPDATE SET
          pid=excluded.pid, name=excluded.name, price=excluded.price, image=excluded.image,
          hasVideo=excluded.hasVideo, categoryId=excluded.categoryId, lastSeenAt=excluded.lastSeenAt
      `).run(sku, pid, name, price, image, 0, categoryId, now, now);
      if (exist) updated++; else inserted++;
      refreshed++;
    }
  });

  let cursorNow = cursor;
  const pathMap = new Map();
  for (let i = cursor; i < cursor + budget; i++) {
    if (stopReason) break;
    if (points.remaining !== null && points.remaining <= POINTS_RESERVE) { stopReason = stopReason || "points low"; break; }
    const p = prods[i];
    const pid = String(p.id || p.pid || "");
    if (!pid) { missing++; cursorNow = i + 1; continue; }
    try {
      const body = await cjGet(`/product/query?pid=${encodeURIComponent(pid)}`);
      if (body.pointsExhausted) { setMeta.run(VISIBLE_CURSOR_KEY, String(i)); break; }
      checked++;
      if (body.code === 200 && body.data) {
        const d = body.data;
        const sku = String(d.productSku || d.sku || p.sku || "").trim();
        const name = dedupeName(d.productNameEn || d.nameEn || p.nameEn || "");
        const price = parsePrice(d.sellPrice ?? p.sellPrice);
        const image = String(d.bigImage || d.productImage || p.bigImage || "").trim();
        const categoryId = String(d.categoryId || p.categoryId || "");
        const status = String(d.status || "");
        if (status === "3") {
          const exist = db.prepare("SELECT sku FROM products WHERE sku=?").get(sku);
          db.prepare(`
            INSERT INTO products (sku, pid, name, price, image, hasVideo, categoryId, categoryPath, firstSeenAt, lastSeenAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
            ON CONFLICT(sku) DO UPDATE SET
              pid=excluded.pid, name=excluded.name, price=excluded.price, image=excluded.image,
              hasVideo=excluded.hasVideo, categoryId=excluded.categoryId, lastSeenAt=excluded.lastSeenAt
          `).run(sku, pid, name, price, image, 0, categoryId, now, now);
          if (exist) updated++; else inserted++;
          refreshed++;
        } else {
          offShelf++;
        }
      } else {
        offShelf++;
      }
    } catch (e) {
      log(`  ! visible-refresh 查询 pid=${pid} 失败（${e.message}），跳过`);
    }
    cursorNow = i + 1;
    if ((i + 1 - cursor) % 50 === 0) setMeta.run(VISIBLE_CURSOR_KEY, String(i + 1));
  }
  setMeta.run(VISIBLE_CURSOR_KEY, String(cursorNow));

  const info = { refreshed, updated, inserted, missing, offShelf, checked, cursor: cursorNow, totalVisible };
  log(`visible-refresh：精确收割 ${info.refreshed} 条（更新 ${updated} / 新增 ${inserted} / 下架 ${offShelf} / 缺pid ${missing}），游标 ${cursor}→${cursorNow}/${totalVisible}`);
  writeStatus({
    lastSyncAt: nowIso(), lastSyncOk: true, lastError: null,
    mode: "visible-refresh", stopReason, visibleRefresh: info,
  });
  return info;
}

// POST /product/query 批量刷新已被实测证伪（16900202 POST not supported），
// 逐 pid GET（10 点/次）成本不可行 → 本函数废弃，可见 SKU 由收割覆盖。

// =====================================================================
// 增量刷新（阶段2）：全量完成后，只拉增量游标之后新增的商品。
//   增量窗口 [cursor, now]，窗口 >6000 时二分（复用窗口逻辑），≤6000 翻页收完。
//   实测 09-19 一天 880 条 → 每天增量约 1-3 页 ≈ 50-150 点，成本极低。
//   同时检测下架：V1 list 只返回在售，消失的商品标记 stale。
// =====================================================================
async function harvestIncremental() {
  stopReason = null;
  let cursor = getMeta.get(INCR_CURSOR_KEY)?.value || null;
  if (!cursor) { log(`incremental：无增量游标（全量未完成？），跳过`); return null; }
  // 窗口 [cursor, now+1天]
  const winTo = toV1Time(Date.now() + 86400000);
  let queue = [[cursor, winTo]];
  const pathMap = await buildPathMapFromTree();
  let got = 0, doneWindows = 0;
  const budget = { pages: 0 };

  while (queue.length > 0) {
    if (stopReason) break;
    if (budget.pages >= MAX_PAGES_PER_RUN) { stopReason = stopReason || `page budget (${MAX_PAGES_PER_RUN})`; break; }
    if (points.remaining !== null && points.remaining <= POINTS_RESERVE) { stopReason = stopReason || `points low (${points.remaining})`; break; }
    const [winFrom, wTo] = queue[queue.length - 1];
    const probeBody = await cjGet(`/product/list?pageNum=1&pageSize=${PAGE_SIZE_V1}&createTimeFrom=${encodeURIComponent(winFrom)}&createTimeTo=${encodeURIComponent(wTo)}`);
    if (probeBody.pointsExhausted) break;
    const wTotal = (probeBody.data && probeBody.data.total) || 0;
    const wItems = normalizeV1List(probeBody.data && probeBody.data.list);
    if (wTotal === 0 || wItems.length === 0) { queue.pop(); doneWindows++; continue; }
    if (wTotal > FULL_SITE_WINDOW_MAX) {
      const parts = splitWindow(winFrom, wTo);
      if (!parts) {
        log(`  ! 增量窗口 ${winFrom}~${wTo} 同秒超量 ${wTotal}，回退 V2`);
        queue.pop();
        const r = await harvestV2FullSiteWindow(winFrom, wTo, pathMap, budget);
        got += r.got;
        if (r.stop) return { got, doneWindows, cursor };
        doneWindows++;
        continue;
      }
      queue.pop();
      queue.push(parts[1], parts[0]);
      continue;
    }
    queue.pop();
    let page = 2, winGot = wItems.length;
    upsertProducts(wItems, pathMap);
    budget.pages++;
    const qBase = `pageSize=${PAGE_SIZE_V1}&createTimeFrom=${encodeURIComponent(winFrom)}&createTimeTo=${encodeURIComponent(wTo)}`;
    while (page <= Math.ceil(FULL_SITE_WINDOW_MAX / PAGE_SIZE_V1)) {
      if (budget.pages >= MAX_PAGES_PER_RUN) { stopReason = stopReason || `page budget (${MAX_PAGES_PER_RUN})`; break; }
      if (points.remaining !== null && points.remaining <= POINTS_RESERVE) { stopReason = stopReason || `points low (${points.remaining})`; break; }
      const b = await cjGet(`/product/list?${qBase}&pageNum=${page}`);
      if (b.pointsExhausted) break;
      const more = normalizeV1List(b.data && b.data.list);
      if (more.length === 0) break;
      upsertProducts(more, pathMap);
      winGot += more.length;
      budget.pages++;
      if (more.length < PAGE_SIZE_V1) break;
      page++;
    }
    got += winGot;
    doneWindows++;
    if (doneWindows % 10 === 0) log(`  ↻ 增量窗口 ${doneWindows} 个，+${got} 条`);
  }

  if (!stopReason) setMeta.run(INCR_CURSOR_KEY, winTo);
  log(`incremental：本轮 +${got} 条（窗口 ${doneWindows}），游标 ${cursor} → ${getMeta.get(INCR_CURSOR_KEY)?.value}${stopReason ? "，中断=" + stopReason : ""}`);
  return { got, doneWindows, cursor };
}

async function refresh() {
  // ============ 阶段2 主路径：全站增量刷新（新增商品 + 下架检测） ============
  // 全量完成后，游标之前的新增商品用 V1 时间切片增量拉取；成本极低（每天几百条）。
  let incrInfo = null;
  try { incrInfo = await harvestIncremental(); } catch (e) { log(`  ! 全站增量刷新失败：${e.message}`); }
  if (stopReason && !stopReason.startsWith("page budget")) {
    writeStatus({ lastSyncAt: nowIso(), lastSyncOk: true, lastError: null, mode: "refresh", stopReason, incrInfo });
    log(`refresh：增量阶段中断（${stopReason}），跳过叶子巡检`);
    return;
  }

  const total = db.prepare("SELECT COUNT(*) c FROM leaves").get().c;
  const done = db.prepare("SELECT COUNT(*) c FROM leaves WHERE doneAt IS NOT NULL").get().c;
  if (done < total) { log(`refresh 跳过叶子巡检：叶子首轮未完成（${done}/${total}），增量已完成`); return; }

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
  const budget = { pages: 0 };
  for (const leaf of probeList) {
    if (stopReason) break;
    if (points.remaining !== null && points.remaining <= POINTS_RESERVE) { stopReason = stopReason || "points low"; break; }
    try {
      // V1 巡检：200 条指纹（比 V2 100 条覆盖更全，点数相同 50 点/页），total 真实
      const body = await cjGet(`/product/list?categoryId=${encodeURIComponent(leaf.leafId)}&pageNum=1&pageSize=${PAGE_SIZE_V1}`);
      if (body.pointsExhausted) break;
      const items = normalizeV1List(body.data && body.data.list);
      const fp = fingerprint(items);
      probed++;
      db.prepare("UPDATE leaves SET lastProbeAt=?, totalRecords=COALESCE(?,totalRecords) WHERE leafId=?")
        .run(nowIso(), (body.data && body.data.total) || null, leaf.leafId);
      if (fp !== leaf.fingerprint) {
        // 指纹变了：整叶深抓（页 1 的数据已经拿到，直接入库，再补后续页）
        // 注意：totalRecords 会被 6000 封顶，不能用于算总页数 → 翻到空页为止
        changedLeaves++;
        upsertProducts(items, pathMap);
        db.prepare("UPDATE leaves SET fingerprint=?, harvestedPages=1, doneAt=NULL WHERE leafId=?").run(fp, leaf.leafId);
        // 深抓：若已知叶子 >6000 走 harvestLeaf 整叶切片，否则 V1 翻页到空页
        const leafRow = db.prepare("SELECT totalRecords t FROM leaves WHERE leafId=?").get(leaf.leafId);
        if ((leaf.pages || 0) >= Math.ceil(V1_MAX_OFFSET / PAGE_SIZE_V1) || (leafRow?.t || 0) > V1_MAX_OFFSET) {
          const sub = { pages: budget.pages };
          const r = await harvestLeaf(leaf.leafId, pathMap, sub);
          budget.pages = sub.pages;
          if (r === "stop") { stopReason = stopReason || "leaf budget"; break; }
          const hRow = db.prepare("SELECT harvestedPages h FROM leaves WHERE leafId=?").get(leaf.leafId);
          got = (hRow?.h || 0) * PAGE_SIZE_V1;
          if (!stopReason) db.prepare("UPDATE leaves SET doneAt=?, harvestedPages=? WHERE leafId=?").run(nowIso(), hRow?.h || 0, leaf.leafId);
        } else {
          let page = 2, got2 = items.length;
          while (page <= Math.ceil(V1_MAX_OFFSET / PAGE_SIZE_V1)) {
            if (stopReason) break;
            if (points.remaining !== null && points.remaining <= POINTS_RESERVE) { stopReason = stopReason || "points low"; break; }
            const b = await cjGet(`/product/list?categoryId=${encodeURIComponent(leaf.leafId)}&pageNum=${page}&pageSize=${PAGE_SIZE_V1}`);
            if (b.pointsExhausted) break;
            const more = normalizeV1List(b.data && b.data.list);
            if (more.length === 0) break;
            upsertProducts(more, pathMap);
            got2 += more.length;
            db.prepare("UPDATE leaves SET harvestedPages=? WHERE leafId=?").run(page, leaf.leafId);
            page++;
          }
          got = got2;
          if (!stopReason) db.prepare("UPDATE leaves SET doneAt=?, harvestedPages=? WHERE leafId=?").run(nowIso(), page - 1, leaf.leafId);
        }
        log(`  ↻ 叶子变化 ${leaf.leafName}（${leaf.leafId}）→ 已重抓 ${got} 条`);
      }
    } catch (e) {
      log(`  ! 巡检叶子 ${leaf.leafId} 失败：${e.message}`);
    }
  }

  // ② 可见 SKU 增量收割：GET query 单 pid 10 点/个（实测），
  //    增量巡检期只补收新上架/未在库的可见 SKU（游标续传，新 SKU 自动覆盖）
  let visInfo = null;
  if (!stopReason) {
    try { visInfo = await refreshVisibleFromJson(); } catch (e) { log(`  ! 可见 SKU 增量收割失败：${e.message}`); }
  } else {
    const visInDb = db.prepare("SELECT COUNT(*) c FROM visible_products v WHERE EXISTS (SELECT 1 FROM products p WHERE p.sku=v.sku)").get().c;
    visInfo = { visibleInDb: visInDb };
  }

  const dbCount = db.prepare("SELECT COUNT(*) c FROM products").get().c;
  writeStatus({
    lastSyncAt: nowIso(), lastSyncOk: true, lastError: null,
    dbProducts: dbCount, mode: "refresh", stopReason,
    refresh: { probed, changedLeaves, visibleBatch: visInfo, incrInfo },
  });
  log(`refresh：增量 +${incrInfo?.got || 0} 条，巡检 ${probed} 叶，变化 ${changedLeaves}，${stopReason ? "中断=" + stopReason : "本轮完整"}`);
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
  const prods = (cur.products || []).filter(p => p.sku);
  if (prods.length === 0) { log("import-visible：JSON 中无商品"); return; }
  if (!DRY_RUN) syncVisibleFromJson(prods);
  // 统计每个叶子的可见 SKU 数（按旧 JSON 的 categoryId 归类到 leaves 表），供收割优先级排序
  const byCat = {};
  for (const p of prods) {
    const c = String(p.categoryId || "");
    if (c) byCat[c] = (byCat[c] || 0) + 1;
  }
  const tx = db.transaction(() => {
    const upd = db.prepare("UPDATE leaves SET visSkuCount=? WHERE leafId=?");
    for (const [cat, n] of Object.entries(byCat)) upd.run(n, cat);
  });
  tx();
  const visCount = db.prepare("SELECT COUNT(*) c FROM visible_products").get().c;
  const leafCount = db.prepare("SELECT COUNT(*) c FROM leaves WHERE visSkuCount>0").get().c;
  log(`import-visible：导入 ${prods.length} 条，visible_products 表现有 ${visCount} 条，覆盖 ${leafCount} 个叶子`);
  writeStatus({ lastVisibleImportAt: nowIso(), visibleCount: visCount, visibleLeafCount: leafCount });
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
  const probeStat = db.prepare(`
    SELECT
      COUNT(*) leaves,
      COUNT(lastProbeAt) probed,
      COUNT(cappedAt) capped,
      COALESCE(SUM(totalRecords),0) sumRecords,
      (SELECT COUNT(*) FROM products p WHERE p.categoryId IN (SELECT leafId FROM leaves WHERE doneAt IS NOT NULL)) doneRows
    FROM leaves
  `).get();
  const est = s.est || {};
  const visInDb = db.prepare(`
    SELECT COUNT(*) c FROM visible_products v WHERE EXISTS (SELECT 1 FROM products p WHERE p.sku=v.sku)
  `).get().c;
  const byL1 = db.prepare(`
    SELECT l1Name, COUNT(*) c, COALESCE(SUM(totalRecords),0) rec FROM leaves GROUP BY l1Name ORDER BY rec DESC LIMIT 20
  `).all();
  const topLeaves = db.prepare(`
    SELECT leafName, l1Name, totalRecords, visSkuCount, doneAt, cappedAt
    FROM leaves WHERE visSkuCount>0 OR totalRecords IS NOT NULL
    ORDER BY visSkuCount DESC, COALESCE(totalRecords,0) DESC LIMIT 15
  `).all();
  console.log(JSON.stringify({
    dbProducts: dbCount, visibleProducts: visCount,
    leavesDone: done, leavesTotal: total,
    probe: { probed: probeStat.probed, capped: probeStat.capped, sumRecords: probeStat.sumRecords },
    est,
    visibleInDb: visInDb,
    points, ...s, byL1, topLeaves,
  }, null, 2));
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
    if (MODE === "fullsite") { await harvestFullSite(); return 0; }
    if (MODE === "harvest") await harvest();
    else if (MODE === "probe") await probe();
    else if (MODE === "refresh") await refresh();
    else if (MODE === "visible-refresh") { await refreshVisibleFromJson(); return 0; }
    else if (MODE === "publish") await publish();
    else if (MODE === "import-visible") { importVisible(); return 0; }
    else if (MODE === "curate") { await curate(); return 0; }
    else {
      // auto：两阶段收割架构
      //   阶段 1（全量收割期）：先 probe 建立规模地图（未探测的叶子先探测），
      //     然后 harvest 按"可见 SKU 优先 → 大叶子优先"整叶翻页（翻到空页，6000 不截断），
      //     期间每轮顺带做一次可见 SKU 刷新（前台数据保活，不依赖收割完成）。
      //   阶段 2（增量刷新期）：首轮全部 done → refresh 巡检 + publish + curate。
      const done = db.prepare("SELECT COUNT(*) c FROM leaves WHERE doneAt IS NOT NULL").get().c;
      const total = db.prepare("SELECT COUNT(*) c FROM leaves").get().c;
      const probedAll = db.prepare("SELECT COUNT(*) c FROM leaves WHERE lastProbeAt IS NOT NULL").get().c;
      const pending = queuePending() ? JSON.parse(getMeta.get(FULL_SITE_QUEUE_KEY)?.value || "[]").length : 0;
      if (pending > 0) {
        // ============ 阶段1（主路径，用户确认策略）：全站全量收割 ============
        // 遍历 V1 list 全站（155万条，时间窗口二分），入库全部有效 SKU——
        // 一次性知道真实可见全集（不再是旧快照 8,683）。队列完成前持续跑；
        // 完成后自动转阶段2（增量刷新）。点数是唯一节奏约束（每 10 分钟一轮）。
        log(`auto：全站全量收割阶段（剩余窗口 ${pending}，库内 ${db.prepare("SELECT COUNT(*) c FROM products").get().c} 条）`);
        try { await harvestFullSite(); } catch (e) { log(`auto fullsite 失败：${e.message}`); }
      }
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
