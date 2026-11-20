// src/app/api/analytics/funnel/route.ts
// 会话级漏斗事件埋点（批量）：
//   POST /api/analytics/funnel
//   { sessionId: string, events: [{ type, orderId?, amount? }] }
//   type: visit | checkout | payment_start | payment_success | payment_fail
// 落库 cj-catalog.db 的 funnel_events（会话级，含订单号与金额，供转化漏斗分析）
import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["visit", "checkout", "payment_start", "payment_success", "payment_fail"]);

let _db: Database.Database | null = null;
function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(join(process.cwd(), "data", "cj-catalog.db"), { fileMustExist: true });
  _db.pragma("journal_mode = WAL");
  _db.pragma("synchronous = NORMAL");
  _db.exec(`CREATE TABLE IF NOT EXISTS funnel_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    type TEXT NOT NULL,
    session_id TEXT,
    order_id TEXT,
    amount REAL
  )`);
  _db.prepare("CREATE INDEX IF NOT EXISTS idx_funnel_type_ts ON funnel_events (type, ts)").run();
  return _db;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId = String(body?.sessionId || "").slice(0, 64);
    const events = Array.isArray(body?.events) ? body.events : [];
    if (events.length === 0) {
      return NextResponse.json({ ok: false, error: "events 为空" }, { status: 400 });
    }
    if (events.length > 100) {
      return NextResponse.json({ ok: false, error: "单次最多 100 条" }, { status: 400 });
    }

    const db = getDb();
    const now = new Date().toISOString();
    const insert = db.prepare(
      "INSERT INTO funnel_events (ts, type, session_id, order_id, amount) VALUES (?, ?, ?, ?, ?)"
    );
    let accepted = 0;
    db.transaction((rows: { type: string; orderId?: string; amount?: number }[]) => {
      for (const e of rows) {
        const type = String(e?.type || "").trim();
        if (!TYPES.has(type)) continue;
        const amount = Number(e?.amount);
        insert.run(
          now,
          type,
          sessionId || null,
          String(e?.orderId || "").slice(0, 64) || null,
          Number.isFinite(amount) ? amount : null
        );
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
