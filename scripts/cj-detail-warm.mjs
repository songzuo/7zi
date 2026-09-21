// scripts/cj-detail-warm.mjs
// ============================================================================
// 详情缓存预热（夜间跑，约 1 请求/秒，不抢前台配额）
// ----------------------------------------------------------------------------
// 为什么需要：
//   商品库里的价格是 CJ **列表接口的商品级** sellPrice，会与**变体级**价背离。
//   列表页/详情页/结算统一改用变体成本定价（见 lib/list-price.ts）后，
//   没被访问过的商品还只有商品级估算价。这个任务把**被用户真实访问过**的
//   商品详情（真实变体成本、描述、多图）预热进缓存 —— 之后：
//     · 列表价与详情价一致（不会再出现"列表 $8.99、详情 $14.49"）
//     · 回访商品页 SSR 直出，秒开（不再等上游）
//     · 结算报价零等待（变体成本已在本地）
// 数据源：cj-catalog.db 的 detail_requests（由 /api/cj/detail 在未命中缓存
//   拉取成功时记录）。只预热被访问过的 SKU，按热度(hits)优先 —— 不机械全量，
//   避免每夜烧光 CJ 点数（实测全量滚动预热每夜 ~15 万点，收割无点可用）。
//   无访问数据时跳过本次。
// 幂等：7 天内已缓存过的直接跳过；带锁文件防重入；带时间预算防跑过头。
// ============================================================================
import { readFileSync, writeFileSync, statSync, existsSync, unlinkSync, openSync, closeSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

const ROOT = "/root/7zi-project";
const APP = "http://127.0.0.1:3006";
const CACHE_DIR = join(ROOT, "data", "detail-cache");
const LOCK = join(ROOT, "data", ".detail-warm.lock");
const LOG = join(ROOT, "logs", "detail-warm.log");

/** 7 天内的缓存不重拉（详情新鲜期 14 天，这里更保守） */
const FRESH_MS = 7 * 24 * 3600 * 1000;
/** 单次运行时间预算：3 小时（够 9000 条，且不会跑进白天） */
const BUDGET_MS = Number(process.env.WARM_BUDGET_MS || 3 * 3600 * 1000);
/** 只处理前 N 条（调试用，0=全部） */
const LIMIT = Number(process.env.WARM_LIMIT || 0);

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  try {
    writeFileSync(LOG, line + "\n", { flag: "a" });
  } catch {}
  console.log(line);
}

function acquireLock() {
  if (existsSync(LOCK)) {
    const age = Date.now() - statSync(LOCK).mtimeMs;
    if (age < 4 * 3600 * 1000) return false; // 有活跃运行
    try {
      unlinkSync(LOCK); // 陈旧锁（上次崩了）→ 清掉
    } catch {}
  }
  try {
    writeFileSync(LOCK, String(process.pid));
    return true;
  } catch {
    return false;
  }
}

function releaseLock() {
  try {
    unlinkSync(LOCK);
  } catch {}
}

function cacheFile(sku) {
  const h = createHash("sha1").update(String(sku).toLowerCase()).digest("hex").slice(0, 20);
  return join(CACHE_DIR, `${h}.json`);
}

async function main() {
  if (!acquireLock()) {
    log("已有预热任务在跑，跳过本次");
    return;
  }

  const started = Date.now();
  let done = 0;
  let skipped = 0;
  let failed = 0;
  let notFound = 0;

  try {
    // 访问驱动：预热 30 天内被真实访问过的 SKU（按 hits 降序、最新访问优先）
    const db = new (await import("better-sqlite3")).default(join(ROOT, "data", "cj-catalog.db"), { readonly: true });
    const cutoff = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
    let skus = db
      .prepare("SELECT sku, hits, lastReqAt FROM detail_requests WHERE lastReqAt >= ? ORDER BY hits DESC, lastReqAt DESC LIMIT 30000")
      .all(cutoff)
      .map((r) => String(r.sku || "").trim())
      .filter(Boolean);
    db.close();
    if (skus.length === 0) {
      log("暂无被访问的 SKU（detail_requests 为空），跳过本次预热，省点");
      return;
    }
    if (LIMIT > 0) skus = skus.slice(0, LIMIT);
    log(`开始预热：访问驱动 SKU ${skus.length} 条，时间预算 ${(BUDGET_MS / 3600000).toFixed(1)} 小时`);

    for (const sku of skus) {
      if (Date.now() - started > BUDGET_MS) {
        log(`时间预算用尽，已处理 ${done + skipped + failed + notFound} 条，下一轮继续`);
        break;
      }
      const f = cacheFile(sku);
      if (existsSync(f)) {
        try {
          if (Date.now() - statSync(f).mtimeMs < FRESH_MS) {
            skipped++;
            continue;
          }
        } catch {}
      }
      try {
        // 走应用自身的接口：复用 1 QPS 串行队列、磁盘缓存与负缓存，
        // 不在本脚本里另发上游请求（否则两条链路叠加会超限）
        const r = await fetch(`${APP}/api/cj/detail?sku=${encodeURIComponent(sku)}`, { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (j.ok) done++;
        else if (r.status === 404) notFound++;
        else failed++;
      } catch {
        failed++;
      }
      const total = done + skipped + failed + notFound;
      if (total % 200 === 0) {
        log(`进度 ${total}/${skus.length}：新缓存 ${done}，跳过 ${skipped}，下架 ${notFound}，失败 ${failed}`);
      }
    }

    log(
      `预热结束：新缓存 ${done}，跳过（已新鲜）${skipped}，下架 ${notFound}，失败 ${failed}，` +
        `耗时 ${((Date.now() - started) / 60000).toFixed(1)} 分钟`
    );
  } catch (e) {
    log(`预热异常：${e?.message || e}`);
  } finally {
    releaseLock();
  }
}

main();
