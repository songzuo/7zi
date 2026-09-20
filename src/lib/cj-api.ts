// CJ Dropshipping API v2 Client
// Server-side only

const CJ_BASE = "https://developers.cjdropshipping.com/api2.0/v1";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const CACHE_DIR = "/tmp/cj-cache";
const CJ_TIMEOUT_MS = 8000;

function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = CJ_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fileCacheGet(key: string): Promise<string | null> {
  try {
    const path = join(CACHE_DIR, key);
    if (!existsSync(path)) return null;
    const data = await readFile(path, "utf-8");
    const entry = JSON.parse(data);
    // Cache valid for 1 hour
    if (Date.now() - entry.ts < 3600_000) return entry.val;
    return null;
  } catch { return null; }
}

async function fileCacheSet(key: string, val: string): Promise<void> {
  try {
    if (!existsSync(CACHE_DIR)) await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(join(CACHE_DIR, key), JSON.stringify({ ts: Date.now(), val }), "utf-8");
  } catch {}
}

let cachedToken: string | null = null;
let tokenExpiry = 0;

interface TokenResponse {
  code: number;
  data?: {
    accessToken: string;
    accessTokenExpiryDate: string;
  };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry - 60_000) return cachedToken;

  const apiKey = "CJ5237017@api@c8d316f7cf414c5f8e5ddb37339ecaac";

  const res = await fetchWithTimeout(`${CJ_BASE}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
    cache: "no-store",
  });

  const data: TokenResponse = await res.json();
  if (data.code !== 200 || !data.data) {
    throw new Error(`CJ auth failed: code=${data.code}`);
  }

  cachedToken = data.data.accessToken;
  tokenExpiry = new Date(data.data.accessTokenExpiryDate).getTime();
  return cachedToken;
}

async function cjFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getAccessToken();
  const res = await fetchWithTimeout(`${CJ_BASE}${path}`, {
    ...options,
    headers: {
      "CJ-Access-Token": token,
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    cache: "no-store",
  });
  const json = await res.json();
  if (json.code !== 200) {
    throw new Error(`CJ API error [${path}]: ${json.message || json.code}`);
  }
  return json.data;
}

export interface CJCategory {
  categoryId: string;
  categoryName: string;
}

export interface CJCategoryL2 {
  categorySecondId: string;
  categorySecondName: string;
  categorySecondList: CJCategory[];
}

export interface CJCategoryL1 {
  categoryFirstId: string;
  categoryFirstName: string;
  categoryFirstList: CJCategoryL2[];
}

export interface CJProductListItem {
  id: string;
  nameEn: string;
  sku: string;
  bigImage: string;
  sellPrice: string;
  warehouseInventoryNum: number;
  categoryId: string;
  autStatus: string;
  isVedio?: number;
}

export interface CJVariant {
  vid: string;
  variantNameEn: string;
  variantSku: string;
  variantImage: string;
  variantWeight: number;
  variantSellPrice: number;
  variantSugSellPrice: number;
  variantLength: number;
  variantWidth: number;
  variantHeight: number;
}

export interface CJProductDetail {
  pid: string;
  productNameEn: string;
  productSku: string;
  bigImage: string;
  productImageSet: string[];
  sellPrice: string;
  categoryId: string;
  categoryName: string;
  description: string;
  productWeight: string;
  productType: string;
  variants: CJVariant[];
  productKeyEn?: string;
}

export interface CJProductListResponse {
  pageSize: number;
  pageNumber: number;
  totalRecords: number;
  totalPages: number;
  content: { productList: CJProductListItem[] }[];
}

export async function getCategories(): Promise<CJCategoryL1[]> {
  return cjFetch<CJCategoryL1[]>("/product/getCategory");
}

export async function listProducts(params: {
  page?: number;
  size?: number;
  keyword?: string;
  categoryId?: string;
} = {}): Promise<CJProductListResponse> {
  const sp = new URLSearchParams();
  sp.set("page", String(params.page || 1));
  sp.set("size", String(params.size || 20));
  if (params.keyword) sp.set("keyWord", params.keyword);
  if (params.categoryId) sp.set("categoryId", params.categoryId);
  return cjFetch<CJProductListResponse>(`/product/listV2?${sp}`);
}

export async function getProductDetail(pid: string): Promise<CJProductDetail> {
  return cjFetch<CJProductDetail>(`/product/query?pid=${encodeURIComponent(pid)}`);
}

export async function searchProductBySku(sku: string): Promise<CJProductListItem | null> {
  const data = await listProducts({ keyword: sku, size: 5 });
  for (const group of data.content) {
    const found = group.productList.find(p => p.sku === sku);
    if (found) return found;
  }
  return null;
}

export interface FlatCategory {
  id: string;
  name: string;
  parent?: string;
}

export function flattenCategories(cats: CJCategoryL1[]): FlatCategory[] {
  const flat: FlatCategory[] = [];
  for (const l1 of cats) {
    flat.push({ id: l1.categoryFirstId, name: l1.categoryFirstName });
    for (const l2 of l1.categoryFirstList) {
      flat.push({ id: l2.categorySecondId, name: l2.categorySecondName, parent: l1.categoryFirstName });
      for (const l3 of l2.categorySecondList) {
        flat.push({ id: l3.categoryId, name: l3.categoryName, parent: l2.categorySecondName });
      }
    }
  }
  return flat;
}

// Alias for backward compatibility
export async function getProductList(page = 1, size = 20): Promise<CJProductListResponse> {
  return listProducts({ page, size });
}
