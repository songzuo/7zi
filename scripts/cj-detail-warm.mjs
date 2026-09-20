// scripts/cj-detail-warm.mjs
// ============================================================================
// 详情缓存预热（夜间跑，约 1 请求/秒，不抢前台配额）
// ----------------------------------------------------------------------------
// 为什么需要：
//   商品库里的价格是 CJ **列表接口的商品级** sellPrice，会与**变体级**价背离。
//   列表页/详情页/结算统一改用变体成本定价（见 lib/list-price.ts）后，
//   没被访问过的商品还只有商品级估算价。这个任务把整个商品库逐条走一遍，
//   把真实变体成本、描述、多图写进详情缓存 —— 之后：
//     · 列表价与详情价一致（不会再出现"列表 $8.99、详情 $14.49"）
//     · 商品页 SSR 直出，秒开（不再等上游）
//     · 结算报价零等待（变体成本已在本地）
// 成本：8683 条约 2.8 小时（受 CJ 1 QPS 硬限），所以放在凌晨跑。
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
    const raw = JSON.parse(readFileSync(join(ROOT, "data", "cj-local-data.json"), "utf-8"));
    let skus = (raw.products || []).map((p) => String(p.sku || "").trim()).filter(Boolean);
    if (LIMIT > 0) skus = skus.slice(0, LIMIT);
    log(`开始预热：商品 ${skus.length} 条，时间预算 ${(BUDGET_MS / 3600000).toFixed(1)} 小时`);

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
