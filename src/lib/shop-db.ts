// src/lib/shop-db.ts
// ============================================================================
// 店铺订单持久层（SQLite）
// ----------------------------------------------------------------------------
// 历史问题：本文件原来用 `pg` 连接 127.0.0.1:5432 的 PostgreSQL，
// 但这台服务器上**根本没有运行 PostgreSQL**（3306 上跑的是别的项目的 MySQL，
// 5432 无监听、无进程）。也就是说下单接口此前每次调用都会抛
// ECONNREFUSED —— 订单功能实际上是坏的，从未真正落过库。
//
// 现改为 SQLite（better-sqlite3 已在依赖中，且项目已有 web-vitals.db 先例）：
//   · 零外部服务依赖，重启机器/容器都不影响
//   · 订单量级（每天几十到几百单）完全够用，WAL 模式并发读友好
//   · 数据文件 data/shop-orders.db，随项目备份即可
// ============================================================================
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
const DB_FILE = process.env.SHOP_DB_FILE || join(DATA_DIR, 'shop-orders.db');

/**
 * 「我方 → CJ」货款支付腿的状态机。
 *   none     尚未开始（多为刚建单，还没尝试付）
 *   paying   已有调用方原子占位、正在付款（防止并发重复扣款）
 *   awaiting 已建 CJ 单且拿到支付链接，等人工在 CJ 收银台点一下
 *   paid     已付清（唯一终态，DB 里一旦 paid 就绝不再发起支付）
 *   failed   付款失败，可重试
 */
export type CjPayState = 'none' | 'paying' | 'awaiting' | 'paid' | 'failed';

export interface ShopProduct {
  id: number;
  sku: string;
  name_en: string;
  name_cn: string;
  description_en: string;
  price: number;
  currency: string;
  category: string;
  images: string[];
  stock: number;
  status: string;
  created_at: string;
}

export interface ShopOrder {
  id: number;
  order_no: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: any;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  currency: string;
  country_code: string;
  logistic_name: string;
  payment_status: string;
  payment_provider: string;
  payment_ref: string;
  order_status: string;
  fulfill_status: string;
  cj_order_id: string;
  cj_order_number: string;
  cj_pay_url: string;
  cj_error: string;
  /** CJ 侧订单状态原文（如 "Shipped" / "In transit"），由定时任务同步 */
  cj_status: string;
  cj_status_at: string;
  /** CJ 发货单号（CJ 开头）—— payBalanceV2 与物流追踪都用它 */
  cj_shipment_order_id: string;
  /** CJ 支付单号（P 开头），建单时返回 */
  cj_pay_id: string;
  /** 货款支付腿状态：none / paying / awaiting / paid / failed */
  cj_pay_state: CjPayState;
  /** 实际用哪条腿付清的：balance（余额）/ page（CJ 收银台） */
  cj_pay_method: string;
  /** 实付给 CJ 的金额（美元），以 CJ 侧为准 */
  cj_pay_amount: number;
  cj_pay_at: string;
  cj_pay_error: string;
  created_at: string;
  updated_at: string;
}

export interface ShopOrderItem {
  id: number;
  order_id: number;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  /** 客户选中的规格：CJ 变体 id（19 位整数，字符串保存）。空串=未选规格，履约时回落到首个变体 */
  vid: string;
  /** 规格可读名，如 "Black / XL"，用于工单与核对 */
  variant_name: string;
  /**
   * 下单瞬间冻结的进货成本（美元/件）。
   * 为什么必须冻结：分账时要用「当时的成本」算毛利，而 CJ 的变体成本随时会变；
   * 事后按现价倒推会把历史订单的利润算错。
   */
  cost_usd: number;
}

// ---------------------------------------------------------------------------
// 连接（Next dev 热重载时复用同一实例）
// ---------------------------------------------------------------------------

const g = globalThis as unknown as { __szspdShopDb?: Database.Database };

function db(): Database.Database {
  if (g.__szspdShopDb) return g.__szspdShopDb;
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const conn = new Database(DB_FILE);
  conn.pragma('journal_mode = WAL');
  conn.pragma('busy_timeout = 5000');

  conn.exec(`
    CREATE TABLE IF NOT EXISTS shop_products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name_en TEXT NOT NULL,
      name_cn TEXT,
      description_en TEXT,
      price REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      category TEXT,
      images TEXT DEFAULT '[]',
      stock INTEGER DEFAULT 999,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shop_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT DEFAULT '',
      user_id TEXT DEFAULT '',           -- 归属用户（guest 升级注册后关联；'' = 纯访客）
      shipping_address TEXT DEFAULT '{}',
      subtotal REAL DEFAULT 0,
      shipping_fee REAL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      country_code TEXT DEFAULT '',
      logistic_name TEXT DEFAULT '',
      payment_status TEXT DEFAULT 'pending',
      payment_provider TEXT DEFAULT '',
      payment_ref TEXT DEFAULT '',
      order_status TEXT DEFAULT 'new',
      fulfill_status TEXT DEFAULT 'pending',
      cj_order_id TEXT DEFAULT '',
      cj_order_number TEXT DEFAULT '',
      cj_pay_url TEXT DEFAULT '',
      cj_error TEXT DEFAULT '',
      cj_status TEXT DEFAULT '',
      cj_status_at TEXT DEFAULT '',
      cj_shipment_order_id TEXT DEFAULT '',
      cj_pay_id TEXT DEFAULT '',
      cj_pay_state TEXT DEFAULT 'none',
      cj_pay_method TEXT DEFAULT '',
      cj_pay_amount REAL DEFAULT 0,
      cj_pay_at TEXT DEFAULT '',
      cj_pay_error TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS shop_order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      sku TEXT DEFAULT '',
      name TEXT DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      vid TEXT DEFAULT '',
      variant_name TEXT DEFAULT '',
      cost_usd REAL DEFAULT 0
    );

    -- 分账台账：把客户的「一次收款」拆成两条腿
    --   leg C 成本腿 = 应付 CJ（进货成本 × 数量 + 运费），走 CJ 余额/支付链接
    --   leg P 利润腿 = 收款额 - 成本腿 - 网关费，留存进我方账户
    CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT UNIQUE NOT NULL,
      currency TEXT DEFAULT 'USD',
      gross_amount REAL NOT NULL DEFAULT 0,
      goods_cost REAL NOT NULL DEFAULT 0,
      shipping_cost REAL NOT NULL DEFAULT 0,
      cj_cost REAL NOT NULL DEFAULT 0,
      gateway_fee REAL NOT NULL DEFAULT 0,
      profit REAL NOT NULL DEFAULT 0,
      cj_cost_source TEXT DEFAULT 'estimate',
      provider TEXT DEFAULT '',
      provider_ref TEXT DEFAULT '',
      split_mode TEXT DEFAULT 'ledger',
      leg_cj_status TEXT DEFAULT 'pending',
      leg_cj_method TEXT DEFAULT '',
      leg_cj_ref TEXT DEFAULT '',
      leg_cj_at TEXT DEFAULT '',
      leg_profit_status TEXT DEFAULT 'retained',
      leg_profit_ref TEXT DEFAULT '',
      leg_profit_at TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_shop_orders_no ON shop_orders(order_no);
    CREATE INDEX IF NOT EXISTS idx_shop_orders_email ON shop_orders(customer_email);
    CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON shop_orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(payment_status, fulfill_status);
    CREATE INDEX IF NOT EXISTS idx_shop_order_items_order ON shop_order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_settlements_created ON settlements(created_at);
    CREATE INDEX IF NOT EXISTS idx_settlements_legs ON settlements(leg_cj_status, leg_profit_status);
  `);

  // 兼容早期 pg 版本留下的表结构（若从别处拷贝了库文件，自动补齐缺失列）
  const cols = new Set(
    (conn.prepare('PRAGMA table_info(shop_orders)').all() as any[]).map((r) => r.name)
  );
  const additive: [string, string][] = [
    ['customer_phone', "TEXT DEFAULT ''"],
    ['user_id', "TEXT DEFAULT ''"],
    ['subtotal', 'REAL DEFAULT 0'],
    ['shipping_fee', 'REAL DEFAULT 0'],
    ['country_code', "TEXT DEFAULT ''"],
    ['logistic_name', "TEXT DEFAULT ''"],
    ['payment_provider', "TEXT DEFAULT ''"],
    ['payment_ref', "TEXT DEFAULT ''"],
    ['fulfill_status', "TEXT DEFAULT 'pending'"],
    ['cj_order_id', "TEXT DEFAULT ''"],
    ['cj_order_number', "TEXT DEFAULT ''"],
    ['cj_pay_url', "TEXT DEFAULT ''"],
    ['cj_error', "TEXT DEFAULT ''"],
    ['cj_status', "TEXT DEFAULT ''"],
    ['cj_status_at', "TEXT DEFAULT ''"],
    // 「我方 → CJ」货款支付腿（见 lib/cj-pay.ts）
    // 说明：CJ 只有 getBalance / payBalance / payBalanceV2 三个支付接口，
    // 没有任何接口能为「已存在的订单」补发支付链接 —— 所以 cjPayUrl 必须在
    // 建单那一刻（payType=1）就抓下来落库，过后补不了。
    ['cj_shipment_order_id', "TEXT DEFAULT ''"],
    ['cj_pay_id', "TEXT DEFAULT ''"],
    ['cj_pay_state', "TEXT DEFAULT 'none'"],
    ['cj_pay_method', "TEXT DEFAULT ''"],
    ['cj_pay_amount', 'REAL DEFAULT 0'],
    ['cj_pay_at', "TEXT DEFAULT ''"],
    ['cj_pay_error', "TEXT DEFAULT ''"],
  ];
  for (const [name, def] of additive) {
    if (!cols.has(name)) {
      try {
        conn.exec(`ALTER TABLE shop_orders ADD COLUMN ${name} ${def}`);
      } catch {
        /* 列已存在则忽略 */
      }
    }
  }

  // shop_order_items 早期只有 sku/quantity/unit_price，补上规格字段
  const itemCols = new Set(
    (conn.prepare('PRAGMA table_info(shop_order_items)').all() as any[]).map((r) => r.name)
  );
  for (const [name, def] of [
    ['vid', "TEXT DEFAULT ''"],
    ['variant_name', "TEXT DEFAULT ''"],
    ['cost_usd', 'REAL DEFAULT 0'],
  ] as [string, string][]) {
    if (!itemCols.has(name)) {
      try {
        conn.exec(`ALTER TABLE shop_order_items ADD COLUMN ${name} ${def}`);
      } catch {
        /* 列已存在则忽略 */
      }
    }
  }

  g.__szspdShopDb = conn;
  return conn;
}

export function shopDbFile(): string {
  return DB_FILE;
}

/**
 * 暴露底层连接，供同一张库里的其他表（如 settlements 分账台账）复用。
 * 复用同一个连接很重要：SQLite 多连接写会互相锁，且 WAL 下也更省。
 */
export function getShopDb(): Database.Database {
  return db();
}

// ---------------------------------------------------------------------------
// 商品（历史接口，保留兼容；店铺展示现走 cj-data 商品库）
// ---------------------------------------------------------------------------

function parseImages(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  try {
    const v = JSON.parse(String(raw || '[]'));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function normalizeProduct(row: any): ShopProduct {
  return { ...row, images: parseImages(row?.images) } as ShopProduct;
}

export async function getProducts(
  opts: { category?: string | null; limit?: number; offset?: number; status?: string } = {}
): Promise<ShopProduct[]> {
  const { category, limit = 20, offset = 0, status = 'active' } = opts;
  const conn = db();
  const rows = category
    ? conn
        .prepare(
          `SELECT * FROM shop_products WHERE status=? AND category=? ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .all(status, category, limit, offset)
    : conn
        .prepare(`SELECT * FROM shop_products WHERE status=? ORDER BY created_at DESC LIMIT ? OFFSET ?`)
        .all(status, limit, offset);
  return (rows as any[]).map(normalizeProduct);
}

export async function getProductBySku(sku: string): Promise<ShopProduct | null> {
  const row = db().prepare('SELECT * FROM shop_products WHERE sku=?').get(sku);
  return row ? normalizeProduct(row) : null;
}

export async function getProductCount(opts: { category?: string | null; status?: string } = {}) {
  const { category, status = 'active' } = opts;
  const conn = db();
  const row = category
    ? conn.prepare('SELECT COUNT(*) AS c FROM shop_products WHERE status=? AND category=?').get(status, category)
    : conn.prepare('SELECT COUNT(*) AS c FROM shop_products WHERE status=?').get(status);
  return Number((row as any)?.c || 0);
}

export async function createProduct(data: {
  sku: string;
  name_en: string;
  name_cn?: string;
  description_en?: string;
  price: number;
  currency?: string;
  category?: string;
  images?: string[];
  stock?: number;
  status?: string;
}) {
  const conn = db();
  conn
    .prepare(
      `INSERT INTO shop_products (sku,name_en,name_cn,description_en,price,currency,category,images,stock,status)
       VALUES (?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(sku) DO UPDATE SET
         name_en=excluded.name_en, name_cn=excluded.name_cn,
         description_en=excluded.description_en, price=excluded.price,
         category=excluded.category, images=excluded.images,
         stock=excluded.stock, status=excluded.status, updated_at=datetime('now')`
    )
    .run(
      data.sku,
      data.name_en,
      data.name_cn || null,
      data.description_en || null,
      data.price,
      data.currency || 'USD',
      data.category || 'General',
      JSON.stringify(data.images || []),
      data.stock ?? 999,
      data.status || 'active'
    );
  return getProductBySku(data.sku);
}

// ---------------------------------------------------------------------------
// 订单
// ---------------------------------------------------------------------------

/** 生成订单号：SZ-<日期>-<随机>，便于人工核对 */
export function makeOrderNo(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `SZ-${ymd}-${rand}`;
}

export interface CreateOrderInput {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address: Record<string, string>;
  subtotal?: number;
  shipping_fee?: number;
  total_amount: number;
  country_code?: string;
  logistic_name?: string;
  payment_provider?: string;
  items: {
    sku: string;
    name?: string;
    quantity: number;
    unit_price: number;
    product_id?: number | string;
    /** 客户选中的变体 id（字符串，19 位整数不能转 Number） */
    vid?: string;
    /** 规格可读名，如 "Black / XL" */
    variant_name?: string;
    /** 下单瞬间冻结的进货成本（美元/件），分账算毛利用 */
    cost_usd?: number;
  }[];
  /** 允许指定单号（幂等重试用） */
  order_no?: string;
  user_id?: string; // guest 升级注册后新订单自动归属
}

export async function createOrder(data: CreateOrderInput): Promise<{ order: ShopOrder; order_no: string }> {
  const conn = db();
  const order_no = data.order_no || makeOrderNo();

  const tx = conn.transaction(() => {
    const info = conn
      .prepare(
        `INSERT INTO shop_orders
           (order_no,customer_name,customer_email,customer_phone,user_id,shipping_address,
            subtotal,shipping_fee,total_amount,currency,country_code,logistic_name,
            payment_status,payment_provider,order_status,fulfill_status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        order_no,
        data.customer_name,
        data.customer_email,
        data.customer_phone || '',
        data.user_id || '',
        JSON.stringify(data.shipping_address || {}),
        data.subtotal ?? 0,
        data.shipping_fee ?? 0,
        data.total_amount,
        'USD',
        data.country_code || '',
        data.logistic_name || '',
        'pending',
        data.payment_provider || '',
        'new',
        'pending'
      );
    const orderId = Number(info.lastInsertRowid);
    const stmt = conn.prepare(
      'INSERT INTO shop_order_items (order_id,sku,name,quantity,unit_price,vid,variant_name,cost_usd) VALUES (?,?,?,?,?,?,?,?)'
    );
    for (const it of data.items || []) {
      stmt.run(
        orderId,
        String(it.sku || ''),
        String(it.name || ''),
        Number(it.quantity) || 1,
        Number(it.unit_price) || 0,
        String(it.vid || ''),
        String(it.variant_name || ''),
        Number(it.cost_usd) || 0
      );
    }
    return orderId;
  });

  const orderId = tx();
  const order = await getOrderById(orderId);
  if (!order) throw new Error('订单写入后读取失败');
  return { order, order_no };
}

export async function getOrderById(id: number): Promise<ShopOrder | null> {
  const row = db().prepare('SELECT * FROM shop_orders WHERE id=?').get(id) as any;
  return row ? normalizeOrder(row) : null;
}

export async function getOrderByNo(orderNo: string): Promise<ShopOrder | null> {
  const row = db().prepare('SELECT * FROM shop_orders WHERE order_no=?').get(orderNo) as any;
  return row ? normalizeOrder(row) : null;
}

/**
 * 查某邮箱的全部订单（guest 升级注册时用于：验证确实下过单 + 关联历史订单）
 */
export function getOrdersByEmail(email: string): ShopOrder[] {
  const rows = db()
    .prepare('SELECT * FROM shop_orders WHERE LOWER(customer_email)=LOWER(?) ORDER BY id')
    .all(String(email || '').trim()) as any[];
  return rows.map(normalizeOrder);
}

/**
 * 把某邮箱下所有未归属订单关联到用户（幂等：已归属的不动）
 * @returns 本次新关联的订单数
 */
export function attachOrdersToUser(email: string, userId: string): number {
  if (!email || !userId) return 0;
  const info = db()
    .prepare("UPDATE shop_orders SET user_id=? WHERE LOWER(customer_email)=LOWER(?) AND (user_id='' OR user_id IS NULL)")
    .run(userId, String(email).trim());
  return Number(info.changes || 0);
}

/**
 * 校验订单号 + 邮箱是否匹配（guest 升级的双因子验证：知道订单号 + 邮箱）
 */
export function verifyOrderOwnership(orderNo: string, email: string): boolean {
  const row = db()
    .prepare('SELECT 1 FROM shop_orders WHERE order_no=? AND LOWER(customer_email)=LOWER(?)')
    .get(String(orderNo || '').trim(), String(email || '').trim());
  return !!row;
}


export async function getOrderItems(orderId: number): Promise<ShopOrderItem[]> {
  return db().prepare('SELECT * FROM shop_order_items WHERE order_id=?').all(orderId) as ShopOrderItem[];
}

export async function listOrders(limit = 50, offset = 0): Promise<(ShopOrder & { items: ShopOrderItem[] })[]> {
  const rows = db()
    .prepare('SELECT * FROM shop_orders ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as any[];
  const itemStmt = db().prepare('SELECT * FROM shop_order_items WHERE order_id=?');
  return rows.map((r) => ({ ...normalizeOrder(r), items: itemStmt.all(r.id) as ShopOrderItem[] }));
}

function normalizeOrder(row: any): ShopOrder {
  let addr: any = row?.shipping_address;
  if (typeof addr === 'string') {
    try {
      addr = JSON.parse(addr);
    } catch {
      addr = {};
    }
  }
  return { ...row, shipping_address: addr || {} } as ShopOrder;
}

/** 标记订单已收款（人工确认或网关回调都走这里） */
export async function markOrderPaid(orderNo: string, patch: {
  provider?: string;
  ref?: string;
  order_status?: string;
} = {}): Promise<ShopOrder | null> {
  db()
    .prepare(
      `UPDATE shop_orders
         SET payment_status='paid',
             payment_provider=COALESCE(NULLIF(?,''), payment_provider),
             payment_ref=COALESCE(NULLIF(?,''), payment_ref),
             order_status=?,
             updated_at=datetime('now')
       WHERE order_no=?`
    )
    .run(patch.provider || '', patch.ref || '', patch.order_status || 'processing', orderNo);
  return getOrderByNo(orderNo);
}

/** 更新履约（转发 CJ）结果 */
export async function updateOrderFulfillment(
  orderNo: string,
  patch: {
    fulfill_status?: string;
    cj_order_id?: string;
    cj_order_number?: string;
    cj_pay_url?: string;
    cj_error?: string;
    cj_shipment_order_id?: string;
    cj_pay_id?: string;
  }
) {
  db()
    .prepare(
      `UPDATE shop_orders SET
         fulfill_status=COALESCE(NULLIF(?,''), fulfill_status),
         cj_order_id=COALESCE(NULLIF(?,''), cj_order_id),
         cj_order_number=COALESCE(NULLIF(?,''), cj_order_number),
         cj_pay_url=COALESCE(NULLIF(?,''), cj_pay_url),
         cj_shipment_order_id=COALESCE(NULLIF(?,''), cj_shipment_order_id),
         cj_pay_id=COALESCE(NULLIF(?,''), cj_pay_id),
         cj_error=?,
         updated_at=datetime('now')
       WHERE order_no=?`
    )
    .run(
      patch.fulfill_status || '',
      patch.cj_order_id || '',
      patch.cj_order_number || '',
      patch.cj_pay_url || '',
      patch.cj_shipment_order_id || '',
      patch.cj_pay_id || '',
      patch.cj_error || '',
      orderNo
    );
  return getOrderByNo(orderNo);
}

/** 兼容旧接口：按支付流水号标记已付款 */
export async function updateOrderPayment(order_no: string, payment_intent_id: string) {
  return markOrderPaid(order_no, { ref: payment_intent_id });
}

export function shopOrderStats() {
  const conn = db();
  const total = Number((conn.prepare('SELECT COUNT(*) AS c FROM shop_orders').get() as any)?.c || 0);
  const paid = Number(
    (conn.prepare("SELECT COUNT(*) AS c FROM shop_orders WHERE payment_status='paid'").get() as any)?.c || 0
  );
  const pendingFulfill = Number(
    (conn.prepare("SELECT COUNT(*) AS c FROM shop_orders WHERE fulfill_status='pending'").get() as any)?.c || 0
  );
  return { total, paid, pendingFulfill };
}

/** 记录 CJ 侧订单状态（定时任务同步用），不覆盖我方履约状态 */
export async function updateOrderCjStatus(orderNo: string, status: string): Promise<ShopOrder | null> {
  db()
    .prepare(
      `UPDATE shop_orders SET cj_status=?, cj_status_at=datetime('now'), updated_at=datetime('now') WHERE order_no=?`
    )
    .run(String(status || ''), orderNo);
  return getOrderByNo(orderNo);
}

/**
 * 找出「该向 CJ 付货款」的订单：
 *   · 已收款（payment_status='paid'）
 *   · 且还没走到已提交（fulfill_status ≠ 'submitted'）
 * 覆盖三种情况：还没转单（pending/failed）、已转单但余额不足没付上（awaiting-payment）。
 * 定时任务拿它做自动补付，收款后无需人工介入。
 */
// ---------------------------------------------------------------------------
// CJ 货款支付腿（「我方 → CJ」）
// ---------------------------------------------------------------------------
// 铁律：同一笔订单只能付一次。付款前必须先原子占位（claim）成功，再发支付请求；
// 并发回调 / 重复点击 / 定时任务重入都靠这一步保证不会重复扣款。
// 注意 SQLite 的 UPDATE ... WHERE 是原子的，用 changes 计数即可判定谁抢到了。

/**
 * 原子占位：只有 changes>0 的调用方才有权发起支付。
 * 已在 paid 状态的订单永远抢不到 → 从数据库层面杜绝重复付款。
 *
 * 自愈规则：paying 通常只持续几秒（一次扣款调用）。若占位超过 15 分钟还没结束，
 * 说明发起付款的那个进程已经死了（重启/被 kill），此时允许重新抢占，
 * 否则这一单会被永久锁死，只能靠人工点「解除占位」。
 * 15 分钟远大于任何一次真实扣款耗时，所以不会放过并发重复付款。
 */
export function claimCjPayment(orderNo: string): boolean {
  const r = db()
    .prepare(
      `UPDATE shop_orders SET
         cj_pay_state='paying', cj_pay_at=datetime('now'), updated_at=datetime('now')
       WHERE order_no=?
         AND (
           cj_pay_state IN ('','none','failed','awaiting')
           OR (cj_pay_state='paying' AND cj_pay_at < datetime('now','-15 minutes'))
         )`
    )
    .run(String(orderNo || ''));
  return r.changes > 0;
}

/** 更新货款支付腿状态（不动其他字段） */
export function updateCjPay(
  orderNo: string,
  patch: {
    state?: CjPayState;
    method?: string;
    amount?: number;
    shipmentOrderId?: string;
    payId?: string;
    payUrl?: string;
    error?: string;
  }
) {
  db()
    .prepare(
      `UPDATE shop_orders SET
         cj_pay_state=COALESCE(NULLIF(?,''), cj_pay_state),
         cj_pay_method=COALESCE(NULLIF(?,''), cj_pay_method),
         cj_pay_amount=CASE WHEN ?>0 THEN ? ELSE cj_pay_amount END,
         cj_shipment_order_id=COALESCE(NULLIF(?,''), cj_shipment_order_id),
         cj_pay_id=COALESCE(NULLIF(?,''), cj_pay_id),
         cj_pay_url=COALESCE(NULLIF(?,''), cj_pay_url),
         cj_pay_error=?,
         updated_at=datetime('now')
       WHERE order_no=?`
    )
    .run(
      patch.state || '',
      patch.method || '',
      Number(patch.amount) || 0,
      Number(patch.amount) || 0,
      patch.shipmentOrderId || '',
      patch.payId || '',
      patch.payUrl || '',
      patch.error || '',
      String(orderNo || '')
    );
  return getOrderByNo(orderNo);
}

/** 标记货款已付清（终态）。同时把履约推进到 submitted，表示 CJ 已接单待发。 */
export function markCjPaid(
  orderNo: string,
  info: { method: string; amount?: number; shipmentOrderId?: string; payId?: string }
) {
  db()
    .prepare(
      `UPDATE shop_orders SET
         cj_pay_state='paid',
         cj_pay_method=?,
         cj_pay_amount=CASE WHEN ?>0 THEN ? ELSE cj_pay_amount END,
         cj_shipment_order_id=COALESCE(NULLIF(?,''), cj_shipment_order_id),
         cj_pay_id=COALESCE(NULLIF(?,''), cj_pay_id),
         cj_pay_at=COALESCE(NULLIF(cj_pay_at,''), datetime('now')),
         cj_pay_error='',
         fulfill_status='submitted',
         updated_at=datetime('now')
       WHERE order_no=?`
    )
    .run(
      String(info.method || ''),
      Number(info.amount) || 0,
      Number(info.amount) || 0,
      info.shipmentOrderId || '',
      info.payId || '',
      String(orderNo || '')
    );
  return getOrderByNo(orderNo);
}

/**
 * 需要核验/补付货款的订单：客户已付款、已建 CJ 单、但货款还没付清。
 * 定时任务用它兜底（网页支付完成、余额充值到账、上次失败重试都靠它收敛）。
 */
export async function ordersAwaitingCjPaySync(limit = 20): Promise<ShopOrder[]> {
  return db()
    .prepare(
      `SELECT * FROM shop_orders
        WHERE payment_status='paid'
          AND cj_order_id <> ''
          AND cj_pay_state <> 'paid'
        ORDER BY id ASC LIMIT ?`
    )
    .all(Math.max(1, Math.min(200, limit)))
    .map((r) => normalizeOrder(r));
}

export async function ordersAwaitingCjPayment(limit = 20): Promise<ShopOrder[]> {
  return db()
    .prepare(
      `SELECT * FROM shop_orders
        WHERE payment_status='paid' AND fulfill_status <> 'submitted'
        ORDER BY id ASC LIMIT ?`
    )
    .all(Math.max(1, Math.min(200, limit)))
    .map((r) => normalizeOrder(r));
}

/** 已提交 CJ、可以跟踪物流状态的订单（最久没同步的排在前面，避免只刷同一批） */
export async function ordersTrackable(limit = 20): Promise<ShopOrder[]> {
  return db()
    .prepare(
      `SELECT * FROM shop_orders
        WHERE cj_order_id <> '' AND fulfill_status='submitted'
        ORDER BY (cj_status_at = '') DESC, cj_status_at ASC, id ASC LIMIT ?`
    )
    .all(Math.max(1, Math.min(200, limit)))
    .map((r) => normalizeOrder(r));
}
