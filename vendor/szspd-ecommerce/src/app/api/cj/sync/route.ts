import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

/**
 * POST /api/cj/sync?token=XXX
 * 手动触发一次全量同步（后台运行，立即返回）。
 * token 来源：环境变量 CJ_SYNC_TOKEN，或 data/cj-sync-token.txt。
 * 目的：让店主可以"随时更新"上游商品，而不必等定时任务。
 */
function expectedToken(): string | null {
  if (process.env.CJ_SYNC_TOKEN) return process.env.CJ_SYNC_TOKEN.trim();
  try {
    const f = join(process.cwd(), "data", "cj-sync-token.txt");
    if (existsSync(f)) return readFileSync(f, "utf-8").trim();
  } catch {}
  return null;
}

function locked(): boolean {
  try {
    const f = join(process.cwd(), "data", ".cj-sync.lock");
    if (!existsSync(f)) return false;
    const age = Date.now() - statSync(f).mtimeMs;
    return age < 15 * 60 * 1000;
  } catch {
    return false;
  }
}

async function handle(request: NextRequest) {
  const url = new URL(request.url);
  const token =
    url.searchParams.get("token") ||
    request.headers.get("x-sync-token") ||
    "";
  const expect = expectedToken();
  if (!expect) {
    return NextResponse.json(
      { success: false, error: "manual sync disabled (no token configured)" },
      { status: 403 }
    );
  }
  if (token !== expect) {
    return NextResponse.json({ success: false, error: "invalid token" }, { status: 401 });
  }
  if (locked()) {
    return NextResponse.json({ success: false, error: "a sync is already running" }, { status: 409 });
  }

  const script = join(process.cwd(), "scripts", "cj-sync.mjs");
  if (!existsSync(script)) {
    return NextResponse.json({ success: false, error: "sync script missing" }, { status: 500 });
  }

  const child = spawn(process.execPath, [script, "--mode=full"], {
    cwd: process.cwd(),
    detached: true,
    stdio: "ignore",
    env: { ...process.env },
  });
  child.unref();

  return NextResponse.json({
    success: true,
    started: true,
    pid: child.pid,
    message: "Full sync started in background. Check /api/cj/sync-status in ~3 minutes.",
  });
}

export async function POST(request: NextRequest) {
  return handle(request);
}
export async function GET(request: NextRequest) {
  return handle(request);
}
