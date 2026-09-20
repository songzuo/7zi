// SZSPD Store — 商品目录共享数据层
// 职责：加载 data/cj-local-data.json（带 mtime 缓存）、分类树归一化、
//       多词搜索与相关性排序、按分类（含父级）过滤、同步状态读取。
// 同时被 Server Component（/shop 页面）与 API Route 复用。
import { readFileSync, statSync } from "fs";
import { join } from "path";
import { retailLabelFromCost } from "./pricing";

export interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  /** 零售价展示串（已按 pricing.ts 的加价规则换算），如 "8.99" 或 "5.99-8.99" */
  price: string;
  /** 上游成本价原串，仅供内部审计与毛利核对，绝不直接展示给顾客 */
  costPrice?: string;
  /** 零售价下界数字（排序与"起价"用） */
  priceFrom?: number;
  /** 是否为区间价（多规格且各规格成本不同） */
  priceIsRange?: boolean;
  image: string;
  hasVideo: boolean;
  categoryId: string;
  categoryPath?: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  level: 1 | 2 | 3;
  parentId?: string;
  children?: CategoryNode[];
}

export interface SyncStatus {
  lastSyncAt?: string;
  lastSyncMode?: string;
  lastSyncDurationMs?: number;
  lastSyncOk?: boolean;
  lastError?: string;
  productCount?: number;
  sourceTotal?: number;
  added?: number;
  removed?: number;
  retained?: number;
  priceChanged?: number;
  lastProbeAt?: string;
  nextScheduledHint?: string;
  history?: Array<Record<string, unknown>>;
}

export interface Catalog {
  products: CatalogProduct[];
  /** 归一化后的三级分类树（顶层为 level 1） */
  categories: CategoryNode[];
  /** 任意分类 id → 该节点（含自身）下所有叶子分类 id */
  scopeIds: Map<string, string[]>;
  /** 分类 id → 分类节点 */
  nodeById: Map<string, CategoryNode>;
  /** 分类 id → 完整路径，如 "Women's Clothing > Accessories > Scarves & Wraps" */
  pathById: Map<string, string>;
  productCount: number;
  filterVersion: string;
  lastSyncAt?: string;
  loadedAt: number;
}

const DATA_FILE = join(process.cwd(), "data", "cj-local-data.json");
const STATUS_FILE = join(process.cwd(), "data", "cj-sync-status.json");

interface RawCategory {
  categoryFirstId?: string;
  categoryFirstName?: string;
  categoryFirstList?: RawCategory[];
  categorySecondId?: string;
  categorySecondName?: string;
  categorySecondList?: RawCategory[];
  categoryId?: string;
  categoryName?: string;
  id?: string;
  name?: string;
  subcategories?: RawCategory[];
}

/**
 * 归一化分类树：兼容 CJ 原生嵌套格式与旧版 {id,name,subcategories} 格式。
 */
function normalizeCategories(raw: RawCategory[] | undefined): CategoryNode[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((l1) => {
      const id = l1.categoryFirstId || l1.id || "";
      const name = l1.categoryFirstName || l1.name || "";
      if (!id || !name) return null;
      const l2raw = l1.categoryFirstList || l1.subcategories || [];
      return {
        id,
        name,
        level: 1 as const,
        children: (l2raw || [])
          .map((l2) => {
            const id2 = l2.categorySecondId || l2.id || "";
            const name2 = l2.categorySecondName || l2.name || "";
            if (!id2 || !name2) return null;
            const l3raw = l2.categorySecondList || l2.subcategories || [];
            return {
              id: id2,
              name: name2,
              level: 2 as const,
              parentId: id,
              children: (l3raw || [])
                .map((l3) => {
                  const id3 = l3.categoryId || l3.id || "";
                  const name3 = l3.categoryName || l3.name || "";
                  if (!id3 || !name3) return null;
                  return {
                    id: id3,
                    name: name3,
                    level: 3 as const,
                    parentId: id2,
                  } as CategoryNode;
                })
                .filter(Boolean) as CategoryNode[],
            } as CategoryNode;
          })
          .filter(Boolean) as CategoryNode[],
      } as CategoryNode;
    })
    .filter(Boolean) as CategoryNode[];
}

function buildIndexes(categories: CategoryNode[]) {
  const scopeIds = new Map<string, string[]>();
  const nodeById = new Map<string, CategoryNode>();
  const pathById = new Map<string, string>();

  for (const l1 of categories) {
    nodeById.set(l1.id, l1);
    pathById.set(l1.id, l1.name);
    const all: string[] = [];
    for (const l2 of l1.children || []) {
      nodeById.set(l2.id, l2);
      pathById.set(l2.id, `${l1.name} > ${l2.name}`);
      const l2all: string[] = [];
      for (const l3 of l2.children || []) {
        nodeById.set(l3.id, l3);
        pathById.set(l3.id, `${l1.name} > ${l2.name} > ${l3.name}`);
        l2all.push(l3.id);
      }
      if (l2all.length === 0) l2all.push(l2.id);
      scopeIds.set(l2.id, l2all);
      all.push(...l2all);
    }
    if (all.length === 0) all.push(l1.id);
    // 先写子级，再写顶层（避免顶层覆盖子级）
    scopeIds.set(l1.id, all);
  }
  return { scopeIds, nodeById, pathById };
}

let cache: { mtimeMs: number; catalog: Catalog } | null = null;

export function loadCatalog(): Catalog {
  let mtimeMs = 0;
  try {
    mtimeMs = statSync(DATA_FILE).mtimeMs;
  } catch {
    mtimeMs = 0;
  }
  if (cache && cache.mtimeMs === mtimeMs) return cache.catalog;

  let raw: any = { products: [], categories: [] };
  try {
    raw = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch {
    raw = { products: [], categories: [] };
  }

  const categories = normalizeCategories(raw.categories);
  const { scopeIds, nodeById, pathById } = buildIndexes(categories);
  const products: CatalogProduct[] = (raw.products || []).map((p: any) => {
    // 商品库里存的是 CJ 供货成本价；这里统一换算成我方零售价。
    // 注意：这是「商品级」成本，商品级与变体级可能背离 —— 结算与履约会按
    // 具体变体成本再核一次（见 lib/shop-pricing.ts 与 cj-fulfill 的成本闸门）。
    const label = retailLabelFromCost(p.price);
    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      price: label.label,
      costPrice: p.price === undefined || p.price === null ? undefined : String(p.price),
      priceFrom: label.from,
      priceIsRange: label.isRange,
      image: p.image,
      hasVideo: !!p.hasVideo,
      categoryId: p.categoryId,
      categoryPath: p.categoryPath || pathById.get(p.categoryId),
    };
  });

  const catalog: Catalog = {
    products,
    categories,
    scopeIds,
    nodeById,
    pathById,
    productCount: products.length,
    filterVersion: raw.filterVersion || "unknown",
    lastSyncAt: raw.lastSyncAt,
    loadedAt: Date.now(),
  };
  cache = { mtimeMs, catalog };
  return catalog;
}

/** 读取同步状态（不依赖商品库文件） */
export function loadSyncStatus(): SyncStatus {
  try {
    return JSON.parse(readFileSync(STATUS_FILE, "utf-8"));
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// 搜索
// ---------------------------------------------------------------------------

export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^\w\s\-'.]/g, " ")
    .split(/[\s\-]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 相关性打分：任一 token 命中即入选；完整词命中 > 词前缀命中 > 词内子串。
 * 全部 token 命中额外加权，并且完整词命中越多权重越高。SKU 命中优先级最高。
 */
function scoreProduct(p: CatalogProduct, tokens: string[], fullQuery: string): number {
  const name = (p.name || "").toLowerCase();
  const sku = (p.sku || "").toLowerCase();
  const words = name.split(/[^a-z0-9]+/).filter(Boolean);
  let score = 0;
  let matched = 0;
  let exactWords = 0;

  for (const t of tokens) {
    let hit = 0;
    if (sku === t) hit = 130;
    else if (sku.startsWith(t)) hit = 95;
    else if (sku.includes(t)) hit = 65;
    else if (words.includes(t)) {
      hit = 85;
      exactWords++;
    } else if (words.some((w) => w.startsWith(t))) hit = 55;
    else if (name.includes(t)) hit = 30;

    if (hit > 0) {
      matched++;
      score += hit;
    }
  }
  if (matched === 0) return 0;

  // 全部 token 命中：强加权；完整词命中越多越靠前
  if (matched === tokens.length) score += 80 + exactWords * 15;
  // 完整查询串直接出现在名称中
  if (fullQuery.length > 3 && name.includes(fullQuery)) score += 70;
  // 轻微偏好有图片的商品
  if (p.image) score += 3;
  return score;
}

export interface SearchOptions {
  q?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  sort?: "relevance" | "name" | "price_asc" | "price_desc";
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

/** 先按分类范围收窄，再按搜索词打分排序，最后分页。 */
export function searchCatalog(catalog: Catalog, opts: SearchOptions = {}): SearchResult {
  const page = Math.max(1, opts.page || 1);
  const limit = Math.min(200, Math.max(1, opts.limit || 24));

  let pool = catalog.products;
  if (opts.categoryId) {
    const scope = catalog.scopeIds.get(opts.categoryId);
    if (scope && scope.length > 0) {
      const set = new Set(scope);
      pool = pool.filter((p) => set.has(p.categoryId));
    } else {
      pool = pool.filter((p) => p.categoryId === opts.categoryId);
    }
  }

  const q = (opts.q || "").trim();
  const sort = opts.sort || (q ? "relevance" : "name");

  let items: CatalogProduct[];
  const scores = new Map<CatalogProduct, number>();

  if (q) {
    const tokens = tokenize(q);
    const full = q.toLowerCase();
    const scored: Array<{ p: CatalogProduct; s: number }> = [];
    for (const p of pool) {
      const s = scoreProduct(p, tokens, full);
      if (s > 0) scored.push({ p, s });
    }
    scored.sort((a, b) => b.s - a.s || a.p.name.length - b.p.name.length);
    items = scored.map((x) => x.p);
    for (const x of scored) scores.set(x.p, x.s);
  } else {
    items = pool.slice();
  }

  // 排序
  const priceOf = (p: CatalogProduct) => {
    if (typeof p.priceFrom === "number" && p.priceFrom > 0) return p.priceFrom;
    const v = parseFloat(parsePrice(p.price));
    return Number.isNaN(v) ? Number.POSITIVE_INFINITY : v;
  };
  if (sort === "price_asc") {
    items = items.slice().sort((a, b) => priceOf(a) - priceOf(b) || (a.name || "").localeCompare(b.name || ""));
  } else if (sort === "price_desc") {
    items = items.slice().sort((a, b) => priceOf(b) - priceOf(a) || (a.name || "").localeCompare(b.name || ""));
  } else if (sort === "name" || !q) {
    items = items.slice().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }
  // sort === "relevance" 且已有 q：保持打分顺序

  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;

  return {
    items: items.slice(start, start + limit),
    total,
    page: safePage,
    limit,
    totalPages,
    query: q || undefined,
    categoryId: opts.categoryId,
    categoryName: opts.categoryId ? catalog.nodeById.get(opts.categoryId)?.name : undefined,
    sort,
  };
}

/** 把匹配词包成片段 —— 由组件渲染 <mark>（不注入 HTML，避免 XSS） */
export function highlightSegments(text: string, q?: string): Array<{ t: string; hit: boolean }> {
  const src = String(text ?? "");
  if (!q || !q.trim()) return [{ t: src, hit: false }];
  const tokens = tokenize(q).filter((t) => t.length > 1);
  if (tokens.length === 0) return [{ t: src, hit: false }];
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const out: Array<{ t: string; hit: boolean }> = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m[0].length === 0) {
      re.lastIndex++;
      continue;
    }
    if (m.index > last) out.push({ t: src.slice(last, m.index), hit: false });
    out.push({ t: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ t: src.slice(last), hit: false });
  return out.length ? out : [{ t: src, hit: false }];
}

/** 统计每个顶层分类下的在售商品数（用于分类胶囊上的数量角标） */
export function categoryCounts(catalog: Catalog): Map<string, number> {
  const leafToTop = new Map<string, string>();
  for (const l1 of catalog.categories) {
    for (const id of catalog.scopeIds.get(l1.id) || []) leafToTop.set(id, l1.id);
  }
  const counts = new Map<string, number>();
  for (const p of catalog.products) {
    const top = leafToTop.get(p.categoryId);
    if (top) counts.set(top, (counts.get(top) || 0) + 1);
  }
  return counts;
}

/** 相对时间：给"最后更新于 X 前"用 */
export function timeAgo(iso?: string): string {
  if (!iso) return "从未";
  const t = new Date(iso).getTime();
  if (!t || Number.isNaN(t)) return "未知";
  const diff = Date.now() - t;
  if (diff < 0) return "刚刚";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  return `${day} 天前`;
}

export function parsePrice(raw: string): string {
  const m = String(raw ?? "").match(/[\d.]+/);
  return m ? m[0] : String(raw ?? "");
}

/**
 * 展示用价格串：多规格且价格不一时显示 "From $5.99"，否则 "$8.99"。
 * 价格本身已在 loadCatalog 里换算成零售价。
 */
export function priceDisplay(p: { price: string; priceIsRange?: boolean }): string {
  const v = parsePrice(p.price);
  if (!v) return "—";
  return p.priceIsRange ? `From $${v}` : `$${v}`;
}

/** CJ 列表接口偶尔返回 "NameName" 这种首尾重复的名称，做一次去重 */
export function dedupeName(name: string): string {
  const s = String(name || "");
  const half = Math.floor(s.length / 2);
  if (half > 5 && s.substring(0, half) === s.substring(half)) {
    return s.substring(0, half).trim();
  }
  return s;
}

export { DATA_FILE as CATALOG_FILE, STATUS_FILE as SYNC_STATUS_FILE };
