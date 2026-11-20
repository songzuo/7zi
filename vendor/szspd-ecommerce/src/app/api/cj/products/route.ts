import { NextRequest, NextResponse } from "next/server";
import {
  searchCatalog,
  isCatalogReady,
  getCatalogStats,
  type SearchOptions,
} from "@/lib/catalog-db";
import {
  loadCatalog,
  loadSyncStatus,
  searchCatalog as searchCatalogJson,
  type SearchOptions as SearchOptionsJson,
} from "@/lib/cj-data";

export const dynamic = "force-dynamic";

/**
 * GET /api/cj/products
 * 参数：
 *   q / search     搜索词（名称或 SKU，支持多词，空格分词，全部命中最优先）
 *   categoryId     分类 id（支持顶层/二级，自动展开到其下所有叶子分类）
 *   categoryName   顶层分类名（兼容旧调用）
 *   page, limit    分页
 *   sort           relevance | name | price_asc | price_desc
 *
 * 优先走 SQLite FTS5（百万级毫秒级），不可用时降级到 JSON 全量扫描。
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));
    const q = (searchParams.get("q") || searchParams.get("search") || "").trim() || undefined;
    const sortRaw = searchParams.get("sort") || "";
    const VALID_SORTS: ReadonlyArray<string> = ["relevance", "name", "price_asc", "price_desc"];
    const sort = VALID_SORTS.includes(sortRaw) ? (sortRaw as SearchOptions["sort"]) : undefined;

    let categoryId = searchParams.get("categoryId") || undefined;
    const categoryName = searchParams.get("categoryName");

    let result: ReturnType<typeof searchCatalog> | null = null;
    let source = "json";
    let filterVersion = "unknown";
    let syncedAt: string | null = null;
    let categoryNameResult: string | undefined;

    if (isCatalogReady()) {
      try {
        // SQLite 路径
        let catId = categoryId;

        // 兼容旧的 categoryName 调用（SQLite 里按名查分类）
        if (!catId && categoryName) {
          // 从 leaves 表按 l1Name 匹配
          const { getTopCategories } = await import("@/lib/catalog-db");
          const cats = getTopCategories(100);
          const hit = cats.find(
            (c) => c.name.toLowerCase() === categoryName.toLowerCase()
          );
          if (hit) catId = hit.id;
        }

        result = searchCatalog({
          page,
          limit,
          q,
          categoryId: catId,
          sort,
        });
        source = "sqlite";

        const stats = getCatalogStats();
        syncedAt = stats.lastSyncAt;
        filterVersion = "sqlite-fts5";
        categoryNameResult = result.categoryName;
      } catch (e) {
        console.warn("[api/cj/products] SQLite 查询失败，降级到 JSON:", e);
        result = null;
      }
    }

    if (!result) {
      // ⚠️ 目录库可用时绝不回落 JSON：解析 111MB 快照 = 一次常驻 +450MB。
      //    库可用却走到这里 = SQLite 查询异常，宁可返回空列表，也不要把内存打上去。
      let dbOk = false;
      try {
        dbOk = isCatalogReady();
      } catch {
        dbOk = false;
      }
      if (dbOk) {
        return NextResponse.json({
          success: true,
          data: {
            list: [],
            total: 0,
            page,
            limit,
            totalPages: 1,
            query: q || null,
            categoryId: categoryId || null,
            categoryName: categoryName || null,
            sort: sort || "relevance",
          },
          _source: "sqlite-empty",
          _filterVersion: "sqlite-fts5",
          _syncedAt: null,
        });
      }

      // 降级：旧 JSON 路径（只在目录库不可用时）
      const catalog = loadCatalog();
      const status = loadSyncStatus();

      let catId = categoryId;
      if (!catId && categoryName) {
        const hit = catalog.categories.find(
          (c) => c.name.toLowerCase() === categoryName.toLowerCase()
        );
        if (hit) catId = hit.id;
      }

      const jsonResult = searchCatalogJson(catalog, {
        q,
        categoryId: catId,
        sort: sort as SearchOptionsJson["sort"],
        page,
        limit,
      });

      return NextResponse.json({
        success: true,
        data: {
          list: jsonResult.items,
          total: jsonResult.total,
          page: jsonResult.page,
          limit: jsonResult.limit,
          totalPages: jsonResult.totalPages,
          query: jsonResult.query || null,
          categoryId: jsonResult.categoryId || null,
          categoryName: jsonResult.categoryName || null,
          sort: jsonResult.sort,
        },
        _source: "local-json",
        _filterVersion: catalog.filterVersion,
        _syncedAt: status.lastSyncAt || catalog.lastSyncAt || null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        list: result.items,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        query: result.query || null,
        categoryId: result.categoryId || null,
        categoryName: categoryNameResult || null,
        sort: result.sort,
      },
      _source: source,
      _filterVersion: filterVersion,
      _syncedAt: syncedAt,
    });
  } catch (error: any) {
    console.error("Products API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load products" },
      { status: 500 }
    );
  }
}
