import { NextResponse } from "next/server";
import { loadCatalog, loadSyncStatus, timeAgo } from "@/lib/cj-data";

export const dynamic = "force-dynamic";

/**
 * GET /api/cj/sync-status
 * 商品库同步状态：最后同步时间、商品数、上游总数、最近若干次同步记录。
 * 供运维/监控查看"上游一键代发数据是否新鲜"。
 */
export async function GET() {
  try {
    const catalog = loadCatalog();
    const status = loadSyncStatus();

    const ageMs = status.lastSyncAt ? Date.now() - new Date(status.lastSyncAt).getTime() : null;

    return NextResponse.json({
      success: true,
      catalog: {
        productCount: catalog.productCount,
        categoryL1Count: catalog.categories.length,
        filterVersion: catalog.filterVersion,
      },
      sync: {
        lastSyncAt: status.lastSyncAt || catalog.lastSyncAt || null,
        ageMinutes: ageMs === null ? null : Math.round(ageMs / 60000),
        humanAge: timeAgo(status.lastSyncAt || catalog.lastSyncAt),
        mode: status.lastSyncMode || null,
        ok: status.lastSyncOk ?? null,
        error: status.lastError || null,
        durationMs: status.lastSyncDurationMs ?? null,
        sourceTotal: status.sourceTotal ?? null,
        added: status.added ?? null,
        removed: status.removed ?? null,
        retained: status.retained ?? null,
        priceChanged: status.priceChanged ?? null,
        lastProbeAt: status.lastProbeAt || null,
        stalenessHoursLimit: status.stalenessHoursLimit ?? null,
      },
      history: status.history || [],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || "status failed" }, { status: 500 });
  }
}
