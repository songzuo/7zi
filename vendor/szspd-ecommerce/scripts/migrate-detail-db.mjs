// scripts/migrate-detail-db.mjs
// 一次性迁移：把旧磁盘详情缓存（data/detail-cache/*.json，kind=detail）
// 导入 product_details 表（永久），迁移完成后可删磁盘详情文件。
// 用法：node scripts/migrate-detail-db.mjs [--clean]
import { readFileSync, readdirSync, statSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const ROOT = "/root/7zi-project";
const CACHE_DIR = join(ROOT, "data", "detail-cache");
const DB_PATH = join(ROOT, "data", "cj-catalog.db");
const CLEAN = process.argv.includes("--clean");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`CREATE TABLE IF NOT EXISTS product_details (
  sku TEXT PRIMARY KEY,
  pid TEXT,
  description_html TEXT,
  description_text TEXT,
  images TEXT,
  video TEXT,
  variants TEXT,
  variant_keys TEXT,
  specs TEXT,
  weight_grams INTEGER,
  upstream_price TEXT,
  fetched_at INTEGER,
  updated_at TEXT
)`);

const upsert = db.prepare(`INSERT INTO product_details
  (sku, pid, description_html, description_text, images, video, variants,
   variant_keys, specs, weight_grams, upstream_price, fetched_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(sku) DO UPDATE SET
    pid = excluded.pid,
    description_html = excluded.description_html,
    description_text = excluded.description_text,
    images = excluded.images,
    video = excluded.video,
    variants = excluded.variants,
    variant_keys = excluded.variant_keys,
    specs = excluded.specs,
    weight_grams = excluded.weight_grams,
    upstream_price = excluded.upstream_price,
    fetched_at = excluded.fetched_at,
    updated_at = excluded.updated_at`);

let migrated = 0;
let skipped = 0;
let removed = 0;

if (!existsSync(CACHE_DIR)) {
  console.log("缓存目录不存在，无迁移");
  process.exit(0);
}

const files = readdirSync(CACHE_DIR).filter((f) => f.endsWith(".json"));
console.log(`共 ${files.length} 个磁盘缓存文件`);

for (const f of files) {
  let env;
  try {
    env = JSON.parse(readFileSync(join(CACHE_DIR, f), "utf-8"));
  } catch {
    skipped++;
    continue;
  }
  if (env?.kind !== "detail" || !env?.data) {
    skipped++;
    continue;
  }
  const d = env.data;
  const fetchedAtMs =
    typeof d?.fetchedAt === "number"
      ? d.fetchedAt
      : typeof d?.fetchedAt === "string"
        ? new Date(d.fetchedAt).getTime()
        : env.fetchedAt || Date.now();
  try {
    upsert.run(
      String(d.sku || ""),
      String(d.pid || ""),
      String(d.descriptionHtml || ""),
      String(d.descriptionText || ""),
      JSON.stringify(d.images || []),
      d.video || null,
      JSON.stringify(d.variants || []),
      JSON.stringify(d.variantKeys || []),
      JSON.stringify(d.specs || []),
      d.weightGrams ?? null,
      d.upstreamPrice || null,
      fetchedAtMs,
      new Date().toISOString()
    );
    migrated++;
    if (CLEAN) {
      try { unlinkSync(join(CACHE_DIR, f)); removed++; } catch {}
    }
  } catch (e) {
    skipped++;
  }
}

const total = db.prepare("SELECT COUNT(*) AS c FROM product_details").get().c;
console.log(`迁移完成：导入 ${migrated} 条，跳过 ${skipped}，清理磁盘文件 ${removed}；product_details 总数 ${total}`);
db.close();
