// src/lib/catalog-db.ts
// ============================================================================
// 商品目录查询层（SQLite · 面向百万级数据设计）
// ----------------------------------------------------------------------------
// 背景：
//   旧架构 = data/cj-local-data.json（全量加载进内存 → filter/slice），
//   8683 条就 3.2MB，百万级要 300MB+，Node 堆直接爆。
//
//   新架构 = data/cj-catalog.db（SQLite WAL 模式）：
//   · 列表页走 LIMIT/OFFSET 分页，每次只读 24 行
//   · 搜索走 FTS5 全文索引，毫秒级返回
//   · 分类过滤走 B-tree 索引，百万级亚秒级
//   · 单条详情按 SKU 主键查，O(1)
//
// 可见集（visible_products）：
//   目录库收"全量货源"（进货单，几十万到几百万），前台只展示"选品上架"的集合。
//   visible_products 表 = 前台可见 SKU 清单，由选品规则/人工编辑维护。
//   所有前台查询默认 JOIN visible_products，确保只返回已上架商品。
// ============================================================================
import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { retailLabelFromCost, type RetailLabel } from "./pricing";

const DATA_DIR = join(process.cwd(), "data");
const DB_FILE = process.env.CATALOG_DB_FILE || join(DATA_DIR, "cj-catalog.db");

// 确保 data 目录存在
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// 单例（better-sqlite3 是同步的，单例 + WAL 并发读安全）
// ---------------------------------------------------------------------------
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_FILE, { readonly: true, fileMustExist: true });
  _db.pragma("journal_mode = WAL");
  _db.pragma("cache_size = -20000"); // ~20MB 页缓存
  _db.pragma("mmap_size = 268435456"); // 256MB mmap
  _db.pragma("temp_store = memory");
  return _db;
}

/** 写模式实例（仅供内部工具/脚本用，前台只读） */
export function getWriterDb(): Database.Database {
  const db = new Database(DB_FILE, { fileMustExist: true });
  db.pragma("journal_mode = WAL");
  return db;
}

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------
export interface CatalogProduct {
  sku: string;
  pid: string;
  name: string;
  /** 零售价展示串，如 "8.99" 或 "5.99-8.99" */
  price: string;
  /** 成本价（美元），仅供内部审计 */
  costPrice: number;
  /** 零售价下界数字 */
  priceFrom: number;
  /** 是否为区间价 */
  priceIsRange: boolean;
  image: string;
  hasVideo: boolean;
  categoryId: string;
  categoryPath: string | null;
}

export interface CategoryNode {
  id: string;
  name: string;
  level: 1 | 2 | 3;
  parentId: string | null;
  productCount: number;
  children?: CategoryNode[];
}

export interface SearchOptions {
  q?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  sort?: "relevance" | "name" | "price_asc" | "price_desc";
  /** 是否只查可见集（默认 true） */
  visibleOnly?: boolean;
}

export interface SearchResult {
  items: CatalogProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query?: string;
  categoryId?: string;
  categoryName?: string;
  sort: string;
}

// ---------------------------------------------------------------------------
// 行 → 商品对象（统一做成本→零售价换算）
// ---------------------------------------------------------------------------
function rowToProduct(row: any): CatalogProduct {
  const label: RetailLabel = retailLabelFromCost(String(row.price));
  return {
    sku: row.sku,
    pid: row.pid || "",
    name: row.name,
    price: label.label,
    costPrice: row.price,
    priceFrom: label.from,
    priceIsRange: label.isRange,
    image: row.image,
    hasVideo: !!row.hasVideo,
    categoryId: row.categoryId || "",
    categoryPath: row.categoryPath || null,
  };
}

// ---------------------------------------------------------------------------
// 分类范围解析：给定任意分类 id，返回其下所有叶子分类 id
//   · 叶子分类（level 3）→ [自身]
//   · 二级分类 → 其下所有三级
//   · 一级分类 → 其下所有三级
// ---------------------------------------------------------------------------
function getLeafCategoryIds(categoryId: string): string[] {
  if (!categoryId) return [];
  const db = getDb();

  // 先看是不是叶子（leaves 表存的全是叶子）
  const leaf = db.prepare("SELECT leafId FROM leaves WHERE leafId = ?").get(categoryId);
  if (leaf) return [categoryId];

  // 不是叶子：按 l1Name/l2Name 路径找子叶子
  // 方案：先查这个 id 在 leaves 里作为 l1 或 l2 的情况
  const asL2 = db.prepare("SELECT leafId FROM leaves WHERE l2Name = (SELECT l2Name FROM leaves WHERE leafId = ? LIMIT 1)").all(categoryId);
  if (asL2 && asL2.length > 0) {
    // categoryId 其实是个 l2 的 id —— 但我们没有 l2 id 字段，只有名字
    // 换个思路：用 categoryPath 模糊匹配
  }

  // 简化方案：直接从 products 表按 categoryId 查（目录库的 products 有 categoryId）
  // 对于父级分类，我们用 categoryPath 的前缀匹配
  const pathRow = db.prepare("SELECT categoryPath FROM products WHERE categoryId = ? LIMIT 1").get(categoryId);
  if (pathRow && pathRow.categoryPath) {
    // 有路径 → 用路径前缀找同路径下的所有叶子
    const path = pathRow.categoryPath;
    const parts = path.split(" > ");
    if (parts.length === 1) {
      // 一级分类前缀
      const rows = db.prepare("SELECT DISTINCT categoryId FROM products WHERE categoryPath LIKE ?").all(parts[0] + " > %");
      return rows.map((r: any) => r.categoryId);
    } else if (parts.length === 2) {
      // 二级分类前缀
      const rows = db.prepare("SELECT DISTINCT categoryId FROM products WHERE categoryPath LIKE ?").all(parts[0] + " > " + parts[1] + " > %");
      return rows.map((r: any) => r.categoryId);
    }
  }

  // 找不到路径信息 → 就当单个分类处理
  return [categoryId];
}

// ---------------------------------------------------------------------------
// 分类树（从 leaves 表构建，带在售商品数）
// ---------------------------------------------------------------------------
export function getCategoryTree(): CategoryNode[] {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT l1Name, l2Name, leafId, leafName,
             (SELECT COUNT(*) FROM products p
              JOIN visible_products v ON v.sku = p.sku
              WHERE p.categoryId = leaves.leafId) as productCount
      FROM leaves
      ORDER BY l1Name, l2Name, leafName
    `).all();

    const l1Map = new Map<string, CategoryNode>();
    const l2Map = new Map<string, CategoryNode>();

    for (const row of rows as any[]) {
      // L1
      let l1 = l1Map.get(row.l1Name);
      if (!l1) {
        l1 = { id: `l1:${row.l1Name}`, name: row.l1Name, level: 1, parentId: null, productCount: 0, children: [] };
        l1Map.set(row.l1Name, l1);
      }

      // L2
      const l2Key = `${row.l1Name}/${row.l2Name}`;
      let l2 = l2Map.get(l2Key);
      if (!l2) {
        l2 = { id: `l2:${l2Key}`, name: row.l2Name, level: 2, parentId: l1.id, productCount: 0, children: [] };
        l2Map.set(l2Key, l2);
        (l1.children as CategoryNode[]).push(l2);
      }

      // L3 (leaf)
      const leaf: CategoryNode = {
        id: row.leafId,
        name: row.leafName,
        level: 3,
        parentId: l2.id,
        productCount: row.productCount || 0,
      };
      (l2.children as CategoryNode[]).push(leaf);
      l2.productCount += leaf.productCount;
      l1.productCount += leaf.productCount;
    }

    return Array.from(l1Map.values());
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 顶层分类（用于分类胶囊，带数量）
// ---------------------------------------------------------------------------
export function getTopCategories(limit = 20): Array<{ id: string; name: string; count: number }> {
  const tree = getCategoryTree();
  return tree
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, limit)
    .map((c) => ({ id: c.name, name: c.name, count: c.productCount }));
}

// ---------------------------------------------------------------------------
// 搜索/列表查询（核心）
// ---------------------------------------------------------------------------
export function searchCatalog(opts: SearchOptions = {}): SearchResult {
  const db = getDb();
  const page = Math.max(1, opts.page || 1);
  const limit = Math.min(200, Math.max(1, opts.limit || 24));
  const q = (opts.q || "").trim();
  const sort = opts.sort || (q ? "relevance" : "name");
  const visibleOnly = opts.visibleOnly !== false;

  const offset = (page - 1) * limit;

  // 分类范围收窄
  let catIds: string[] = [];
  let categoryName: string | undefined;
  if (opts.categoryId) {
    catIds = getLeafCategoryIds(opts.categoryId);
    // 尝试拿分类名
    const catRow = db.prepare("SELECT leafName as name FROM leaves WHERE leafId = ?").get(opts.categoryId);
    if (catRow) categoryName = (catRow as any).name;
  }

  const params: any[] = [];
  const conditions: string[] = [];
  const joinVisible = visibleOnly ? "JOIN visible_products v ON v.sku = p.sku" : "";

  if (catIds.length > 0) {
    const placeholders = catIds.map(() => "?").join(",");
    conditions.push(`p.categoryId IN (${placeholders})`);
    params.push(...catIds);
  }

  let totalQuery: string;
  let itemsQuery: string;
  let orderBy = "";

  if (q && q.length > 0) {
    // FTS5 全文搜索
    const ftsQuery = buildFtsQuery(q);
    conditions.push("p.sku IN (SELECT sku FROM products_fts WHERE products_fts MATCH ?)");
    params.push(ftsQuery);

    totalQuery = `
      SELECT COUNT(*) as c
      FROM products p
      ${joinVisible}
      WHERE ${conditions.join(" AND ")}
    `;

    if (sort === "price_asc") orderBy = "p.price ASC, p.name ASC";
    else if (sort === "price_desc") orderBy = "p.price DESC, p.name ASC";
    else if (sort === "name") orderBy = "p.name ASC";
    else orderBy = "bm25(products_fts) ASC, p.name ASC"; // relevance

    itemsQuery = `
      SELECT p.*
      FROM products p
      ${joinVisible}
      ${sort === "relevance" ? "JOIN products_fts f ON f.sku = p.sku" : ""}
      WHERE ${conditions.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
  } else {
    // 无搜索词：普通分页
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    totalQuery = `
      SELECT COUNT(*) as c
      FROM products p
      ${joinVisible}
      ${where}
    `;

    if (sort === "price_asc") orderBy = "p.price ASC, p.name ASC";
    else if (sort === "price_desc") orderBy = "p.price DESC, p.name ASC";
    else orderBy = "p.name ASC";

    itemsQuery = `
      SELECT p.*
      FROM products p
      ${joinVisible}
      ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;
  }

  try {
    const totalRow = db.prepare(totalQuery).get(...params) as any;
    const total = totalRow?.c || 0;
    const totalPages = Math.ceil(total / limit) || 1;
    const safePage = Math.min(page, totalPages);
    const realOffset = (safePage - 1) * limit;

    const rows = db.prepare(itemsQuery).all(...params, limit, realOffset);
    const items = (rows as any[]).map(rowToProduct);

    return {
      items,
      total,
      page: safePage,
      limit,
      totalPages,
      query: q || undefined,
      categoryId: opts.categoryId,
      categoryName,
      sort,
    };
  } catch (e) {
    // FTS 表不存在等降级情况 → 返回空结果
    console.warn("[catalog-db] searchCatalog fallback:", (e as Error).message);
    return { items: [], total: 0, page: 1, limit, totalPages: 1, sort };
  }
}

// ---------------------------------------------------------------------------
// FTS 查询词构建：多词 AND，支持前缀匹配
// ---------------------------------------------------------------------------
function buildFtsQuery(q: string): string {
  const tokens = q
    .toLowerCase()
    .replace(/[^\w\s\-'.]/g, " ")
    .split(/[\s\-]+/)
    .filter((s) => s.length > 0);

  if (tokens.length === 0) return "";
  // 每个 token 加 * 做前缀匹配，用 AND 连接
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"*`).join(" AND ");
}

// ---------------------------------------------------------------------------
// 单条商品查询（按 SKU）
// ---------------------------------------------------------------------------
export function getProductBySku(sku: string): CatalogProduct | null {
  const db = getDb();
  try {
    const row = db.prepare(`
      SELECT p.*
      FROM products p
      JOIN visible_products v ON v.sku = p.sku
      WHERE p.sku = ?
    `).get(sku);
    return row ? rowToProduct(row) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// 相关商品（同分类下的其他商品）
// ---------------------------------------------------------------------------
export function getRelatedProducts(sku: string, limit = 4): CatalogProduct[] {
  const db = getDb();
  try {
    const rows = db.prepare(`
      SELECT p.*
      FROM products p
      JOIN visible_products v ON v.sku = p.sku
      WHERE p.categoryId = (SELECT categoryId FROM products WHERE sku = ?)
        AND p.sku != ?
      ORDER BY p.name ASC
      LIMIT ?
    `).all(sku, sku, limit);
    return (rows as any[]).map(rowToProduct);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 状态：可见集数量、库内总量
// ---------------------------------------------------------------------------
export function getCatalogStats(): { totalProducts: number; visibleProducts: number; lastSyncAt: string | null } {
  const db = getDb();
  try {
    const total = (db.prepare("SELECT COUNT(*) c FROM products").get() as any).c;
    let visible = 0;
    try {
      visible = (db.prepare("SELECT COUNT(*) c FROM visible_products").get() as any).c;
    } catch { /* visible 表可能不存在 */ }

    let lastSyncAt: string | null = null;
    try {
      const row = db.prepare("SELECT value FROM meta WHERE key = 'lastSyncAt'").get() as any;
      lastSyncAt = row?.value || null;
    } catch { /* meta 可能没有 */ }

    return { totalProducts: total, visibleProducts: visible, lastSyncAt };
  } catch {
    return { totalProducts: 0, visibleProducts: 0, lastSyncAt: null };
  }
}

// ---------------------------------------------------------------------------
// 检查目录库是否可用（有数据 + 有可见集表）
// ---------------------------------------------------------------------------
export function isCatalogReady(): boolean {
  try {
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) c FROM products").get() as any;
    return row?.c > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 高亮匹配片段（与旧 cj-data.ts 兼容，供前端 <mark> 渲染）
// ---------------------------------------------------------------------------
export function highlightSegments(text: string, q?: string): Array<{ t: string; hit: boolean }> {
  const src = String(text ?? "");
  if (!q || !q.trim()) return [{ t: src, hit: false }];
  const tokens = q
    .toLowerCase()
    .replace(/[^\w\s\-'.]/g, " ")
    .split(/[\s\-]+/)
    .filter((s) => s.length > 1);
  if (tokens.length === 0) return [{ t: src, hit: false }];
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const out: Array<{ t: string; hit: boolean }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    if (m.index > last) out.push({ t: src.slice(last, m.index), hit: false });
    out.push({ t: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ t: src.slice(last), hit: false });
  return out.length ? out : [{ t: src, hit: false }];
}
