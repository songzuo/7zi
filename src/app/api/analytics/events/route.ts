// src/app/api/analytics/events/route.ts
// 商城用户行为埋点（批量）：
//   POST /api/analytics/events
//   { events: [{ sku: string, type: "detail" | "impression" | "cart" }] }
//   聚合写入 data/cj-catalog.db 的 sku_events 表（upsert views+1），
//   供访问驱动预热（warm 按真实访问热度）与真实商品热度分析使用。
import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["detail", "impression", "cart", "order"]);

let _db: Database.Database | null = null;
function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(join(process.cwd(), "data", "cj-catalog.db"), { fileMustExist: true });
  _db.pragma("journal_mode = WAL");
  _db.pragma("synchronous = NORMAL");
  _db.exec(`CREATE TABLE IF NOT EXISTS sku_events (
    sku TEXT NOT NULL,
    type TEXT NOT NULL,
    views INTEGER DEFAULT 1,
    firstAt TEXT,
    lastAt TEXT,
    PRIMARY KEY (sku, type)
  )`);
  _db.prepare("CREATE INDEX IF NOT EXISTS idx_sku_events_type_last ON sku_events (type, lastAt)").run();
  return _db;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const events = Array.isArray(body?.events) ? body.events : [];
    if (events.length === 0) {
      return NextResponse.json({ ok: false, error: "events 为空" }, { status: 400 });
    }
    if (events.length > 500) {
      return NextResponse.json({ ok: false, error: "单次最多 500 条" }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();
    const upsert = db.prepare(
      `INSERT INTO sku_events (sku, type, views, firstAt, lastAt) VALUES (?, ?, 1, ?, ?)
       ON CONFLICT(sku, type) DO UPDATE SET views = views + 1, lastAt = excluded.lastAt`
    );
    let accepted = 0;
    db.transaction((rows: { sku: string; type: string }[]) => {
      for (const e of rows) {
        const sku = String(e?.sku || "").trim().slice(0, 64);
        const type = String(e?.type || "").trim();
        if (!sku || !TYPES.has(type)) continue;
        upsert.run(sku, type, now, now);
        accepted++;
      }
    })(events);

    return NextResponse.json({ ok: true, accepted });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "internal error" },
      { status: 500 }
    );
  }
}
