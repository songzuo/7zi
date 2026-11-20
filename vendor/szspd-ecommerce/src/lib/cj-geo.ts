/**
 * CJ 全球配送能力层
 * ------------------------------------------------------------------
 * 1) 全量国家/地区表（ISO 3166-1，对齐 CJ 附录3 国家代号）
 * 2) 运费试算：复用 cj-channel 的全局串行队列（天然限速 1 请求/秒）
 * 3) 两级磁盘缓存：vid 长期缓存 + 运费 12 小时缓存
 *
 * 为什么需要它：此前结算页把可选国家写死成 7 个（美英加澳德法日），
 * 结果非洲等地区根本下不了单。但 CJ 上游实际覆盖全部 250 个国家/地区
 * （实测 GH/NG/KE/ZA/TZ/UG/CM/SN/CI/EG/ET/RW 均有 4~7 条物流渠道）。
 * 所以限制出在我们这一侧，改成本模块后即可全球配送。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { cjCall } from "./cj-channel";
import { getBrand } from "@/config/brand";

const DATA_DIR = join(process.cwd(), "data");
const VID_CACHE_FILE = join(DATA_DIR, "cj-vid-cache.json");
const FREIGHT_CACHE_FILE = join(DATA_DIR, "cj-freight-cache.json");

/** 运费缓存有效期：12 小时（上游价格/渠道会变，但半天内基本稳定） */
const FREIGHT_TTL_MS = 12 * 60 * 60 * 1000;
/** 缓存条目上限，防止文件无限增长 */
const FREIGHT_CACHE_MAX = 8000;
const VID_CACHE_MAX = 8000;

// ---------------------------------------------------------------------------
// 国家 / 地区
// ---------------------------------------------------------------------------

export interface Country {
  /** ISO 3166-1 二字码，直接用于 CJ shippingCountryCode */
  code: string;
  /** 中文名 */
  zh: string;
  /** 英文名，用于 CJ shippingCountry 与界面展示 */
  en: string;
}

/** 首页/结算页置顶的常用目的地（按品牌档案：szspd 加纳/西非优先，7zi 全球主流优先） */
export function hotCountryCodes(): string[] {
  return getBrand().hotCountryCodes;
}

/** 格式：二字码|中文名|英文名 */
const RAW_COUNTRIES = `AD|安道尔|Andorra
AE|阿联酋|United Arab Emirates
AF|阿富汗|Afghanistan
AG|安提瓜和巴布达|Antigua and Barbuda
AI|安圭拉|Anguilla
AL|阿尔巴尼亚|Albania
AM|亚美尼亚|Armenia
AO|安哥拉|Angola
AQ|南极洲|Antarctica
AR|阿根廷|Argentina
AS|美属萨摩亚|American Samoa
AT|奥地利|Austria
AU|澳大利亚|Australia
AW|阿鲁巴|Aruba
AX|奥兰群岛|Aland Islands
AZ|阿塞拜疆|Azerbaijan
BA|波黑|Bosnia and Herzegovina
BB|巴巴多斯|Barbados
BD|孟加拉国|Bangladesh
BE|比利时|Belgium
BF|布基纳法索|Burkina Faso
BG|保加利亚|Bulgaria
BH|巴林|Bahrain
BI|布隆迪|Burundi
BJ|贝宁|Benin
BL|圣巴泰勒米岛|Saint Barthelemy
BM|百慕大|Bermuda
BN|文莱|Brunei Darussalam
BO|玻利维亚|Bolivia
BQ|荷兰加勒比区|Bonaire, Sint Eustatius and Saba
BR|巴西|Brazil
BS|巴哈马|Bahamas
BT|不丹|Bhutan
BV|布韦岛|Bouvet Island
BW|博茨瓦纳|Botswana
BY|白俄罗斯|Belarus
BZ|伯利兹|Belize
CA|加拿大|Canada
CC|科科斯群岛|Cocos (Keeling) Islands
CD|刚果（金）|Congo, Democratic Republic of the
CF|中非|Central African Republic
CG|刚果（布）|Congo
CH|瑞士|Switzerland
CI|科特迪瓦|Cote d'Ivoire
CK|库克群岛|Cook Islands
CL|智利|Chile
CM|喀麦隆|Cameroon
CN|中国|China
CO|哥伦比亚|Colombia
CR|哥斯达黎加|Costa Rica
CU|古巴|Cuba
CV|佛得角|Cabo Verde
CW|库拉索|Curacao
CX|圣诞岛|Christmas Island
CY|塞浦路斯|Cyprus
CZ|捷克|Czechia
DE|德国|Germany
DJ|吉布提|Djibouti
DK|丹麦|Denmark
DM|多米尼克|Dominica
DO|多米尼加|Dominican Republic
DZ|阿尔及利亚|Algeria
EC|厄瓜多尔|Ecuador
EE|爱沙尼亚|Estonia
EG|埃及|Egypt
EH|西撒哈拉|Western Sahara
ER|厄立特里亚|Eritrea
ES|西班牙|Spain
ET|埃塞俄比亚|Ethiopia
FI|芬兰|Finland
FJ|斐济群岛|Fiji
FK|福克兰群岛|Falkland Islands
FM|密克罗尼西亚联邦|Micronesia
FO|法罗群岛|Faroe Islands
FR|法国|France
GA|加蓬|Gabon
GB|英国|United Kingdom
GD|格林纳达|Grenada
GE|格鲁吉亚|Georgia
GF|法属圭亚那|French Guiana
GG|根西岛|Guernsey
GH|加纳|Ghana
GI|直布罗陀|Gibraltar
GL|格陵兰|Greenland
GM|冈比亚|Gambia
GN|几内亚|Guinea
GP|瓜德罗普|Guadeloupe
GQ|赤道几内亚|Equatorial Guinea
GR|希腊|Greece
GS|南乔治亚岛|South Georgia and the South Sandwich Islands
GT|危地马拉|Guatemala
GU|关岛|Guam
GW|几内亚比绍|Guinea-Bissau
GY|圭亚那|Guyana
HK|中国香港|Hong Kong, China
HM|赫德岛|Heard Island and McDonald Islands
HN|洪都拉斯|Honduras
HR|克罗地亚|Croatia
HT|海地|Haiti
HU|匈牙利|Hungary
ID|印度尼西亚|Indonesia
IE|爱尔兰|Ireland
IL|以色列|Israel
IM|马恩岛|Isle of Man
IN|印度|India
IO|英属印度洋领地|British Indian Ocean Territory
IQ|伊拉克|Iraq
IR|伊朗|Iran
IS|冰岛|Iceland
IT|意大利|Italy
JE|泽西岛|Jersey
JM|牙买加|Jamaica
JO|约旦|Jordan
JP|日本|Japan
KE|肯尼亚|Kenya
KG|吉尔吉斯斯坦|Kyrgyzstan
KH|柬埔寨|Cambodia
KI|基里巴斯|Kiribati
KM|科摩罗|Comoros
KN|圣基茨和尼维斯|Saint Kitts and Nevis
KP|朝鲜|Korea, Democratic People's Republic of
KR|韩国|Korea, Republic of
KW|科威特|Kuwait
KY|开曼群岛|Cayman Islands
KZ|哈萨克斯坦|Kazakhstan
LA|老挝|Lao People's Democratic Republic
LB|黎巴嫩|Lebanon
LC|圣卢西亚|Saint Lucia
LI|列支敦士登|Liechtenstein
LK|斯里兰卡|Sri Lanka
LR|利比里亚|Liberia
LS|莱索托|Lesotho
LT|立陶宛|Lithuania
LU|卢森堡|Luxembourg
LV|拉脱维亚|Latvia
LY|利比亚|Libya
MA|摩洛哥|Morocco
MC|摩纳哥|Monaco
MD|摩尔多瓦|Moldova
ME|黑山|Montenegro
MF|法属圣马丁|Saint Martin (French part)
MG|马达加斯加|Madagascar
MH|马绍尔群岛|Marshall Islands
MK|北马其顿|North Macedonia
ML|马里|Mali
MM|缅甸|Myanmar
MN|蒙古国|Mongolia
MO|中国澳门|Macao, China
MP|北马里亚纳群岛|Northern Mariana Islands
MQ|马提尼克|Martinique
MR|毛里塔尼亚|Mauritania
MS|蒙塞拉特岛|Montserrat
MT|马耳他|Malta
MU|毛里求斯|Mauritius
MV|马尔代夫|Maldives
MW|马拉维|Malawi
MX|墨西哥|Mexico
MY|马来西亚|Malaysia
MZ|莫桑比克|Mozambique
NA|纳米比亚|Namibia
NC|新喀里多尼亚|New Caledonia
NE|尼日尔|Niger
NF|诺福克岛|Norfolk Island
NG|尼日利亚|Nigeria
NI|尼加拉瓜|Nicaragua
NL|荷兰|Netherlands
NO|挪威|Norway
NP|尼泊尔|Nepal
NR|瑙鲁|Nauru
NU|纽埃|Niue
NZ|新西兰|New Zealand
OM|阿曼|Oman
PA|巴拿马|Panama
PE|秘鲁|Peru
PF|法属波利尼西亚|French Polynesia
PG|巴布亚新几内亚|Papua New Guinea
PH|菲律宾|Philippines
PK|巴基斯坦|Pakistan
PL|波兰|Poland
PM|圣皮埃尔和密克隆|Saint Pierre and Miquelon
PN|皮特凯恩群岛|Pitcairn
PR|波多黎各|Puerto Rico
PS|巴勒斯坦|Palestine, State of
PT|葡萄牙|Portugal
PW|帕劳|Palau
PY|巴拉圭|Paraguay
QA|卡塔尔|Qatar
RE|留尼汪|Reunion
RO|罗马尼亚|Romania
RS|塞尔维亚|Serbia
RU|俄罗斯|Russian Federation
RW|卢旺达|Rwanda
SA|沙特阿拉伯|Saudi Arabia
SB|所罗门群岛|Solomon Islands
SC|塞舌尔|Seychelles
SD|苏丹|Sudan
SE|瑞典|Sweden
SG|新加坡|Singapore
SH|圣赫勒拿|Saint Helena, Ascension and Tristan da Cunha
SI|斯洛文尼亚|Slovenia
SJ|斯瓦尔巴群岛|Svalbard and Jan Mayen
SK|斯洛伐克|Slovakia
SL|塞拉利昂|Sierra Leone
SM|圣马力诺|San Marino
SN|塞内加尔|Senegal
SO|索马里|Somalia
SR|苏里南|Suriname
SS|南苏丹|South Sudan
ST|圣多美和普林西比|Sao Tome and Principe
SV|萨尔瓦多|El Salvador
SX|圣马丁岛|Sint Maarten (Dutch part)
SY|叙利亚|Syrian Arab Republic
SZ|斯威士兰|Eswatini
TC|特克斯和凯科斯群岛|Turks and Caicos Islands
TD|乍得|Chad
TF|法属南部领地|French Southern Territories
TG|多哥|Togo
TH|泰国|Thailand
TJ|塔吉克斯坦|Tajikistan
TK|托克劳|Tokelau
TL|东帝汶|Timor-Leste
TM|土库曼斯坦|Turkmenistan
TN|突尼斯|Tunisia
TO|汤加|Tonga
TR|土耳其|Turkiye
TT|特立尼达和多巴哥|Trinidad and Tobago
TV|图瓦卢|Tuvalu
TW|中国台湾|Taiwan, China
TZ|坦桑尼亚|Tanzania
UA|乌克兰|Ukraine
UG|乌干达|Uganda
UM|美国本土外小岛屿|United States Minor Outlying Islands
US|美国|United States
UY|乌拉圭|Uruguay
UZ|乌兹别克斯坦|Uzbekistan
VA|梵蒂冈|Holy See
VC|圣文森特和格林纳丁斯|Saint Vincent and the Grenadines
VE|委内瑞拉|Venezuela
VG|英属维尔京群岛|Virgin Islands, British
VI|美属维尔京群岛|Virgin Islands, U.S.
VN|越南|Viet Nam
VU|瓦努阿图|Vanuatu
WF|瓦利斯和富图纳|Wallis and Futuna
WS|萨摩亚|Samoa
YE|也门|Yemen
YK|科索沃|The Republic of Kosovo
YT|马约特|Mayotte
ZA|南非|South Africa
ZM|赞比亚|Zambia
ZW|津巴布韦|Zimbabwe`;

export const COUNTRIES: Country[] = RAW_COUNTRIES.split("\n").map((line) => {
  const [code, zh, en] = line.split("|");
  return { code, zh, en };
});

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

export function countryByCode(code: string): Country | undefined {
  return COUNTRY_BY_CODE.get((code || "").toUpperCase());
}

/** 结算页用：常用国家置顶 + 全量按英文名排序 */
export function countriesForSelect(): { hot: Country[]; all: Country[] } {
  const hotList = hotCountryCodes();
  const hotSet = new Set(hotList);
  return {
    hot: hotList.map((c) => COUNTRY_BY_CODE.get(c)).filter(Boolean) as Country[],
    all: COUNTRIES.filter((c) => !hotSet.has(c.code)).slice().sort((a, b) => a.en.localeCompare(b.en)),
  };
}

// ---------------------------------------------------------------------------
// 磁盘缓存（带进程内内存层，避免每次请求都读盘）
// ---------------------------------------------------------------------------

const g = globalThis as unknown as {
  __szspdGeoMem?: { vid: Record<string, string>; freight: Record<string, FreightCacheRow> };
};

function mem() {
  if (!g.__szspdGeoMem) g.__szspdGeoMem = { vid: {}, freight: {} };
  return g.__szspdGeoMem;
}

function readJsonFile<T>(file: string, fallback: T): T {
  try {
    if (!existsSync(file)) return fallback;
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJsonFile(file: string, data: unknown) {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(file, JSON.stringify(data));
  } catch {
    /* 缓存写失败不影响主流程 */
  }
}

/** 修剪缓存，保留最近写入的 N 条 */
function prune<T extends Record<string, any>>(obj: T, max: number): T {
  const keys = Object.keys(obj);
  if (keys.length <= max) return obj;
  keys
    .sort((a, b) => (obj[a]?.at || 0) - (obj[b]?.at || 0))
    .slice(0, keys.length - max)
    .forEach((k) => delete obj[k]);
  return obj;
}

// ---------------------------------------------------------------------------
// vid 解析（运费试算必须用变体 id / 变体 SKU，商品级 SKU 不被接受）
// ---------------------------------------------------------------------------

/**
 * vid 缓存版本号。
 * v1 曾把 vid 转成 Number，导致 19 位整数精度丢失（1460967096681893888 → 1460967096681894000），
 * 上游会直接报 "Variant not found"。读到非当前版本的缓存一律丢弃重取。
 */
const VID_CACHE_VERSION = 3;

interface VidsCache {
  /** price = CJ 对该变体的供货价（美元），用于成本闸门；老条目没有该字段会被重取 */
  [sku: string]: { vid: string; price?: number; at: number; v?: number };
}

export interface VariantInfo {
  /** 变体 id，19 位整数，必须保持字符串，转 Number 会丢精度 */
  vid: string;
  /** CJ 对该变体的供货价（美元）—— 我方实际进货成本 */
  price: number;
}

/** 变体供货价的内存缓存，和磁盘缓存配合使用 */
const vPriceMem = new Map<string, number>();

/**
 * 取商品首个变体的 vid 与供货价，并长期缓存（两者都基本不变）。
 *
 * 为什么要把价格一起带回来：解析 vid 本来就要请求 /product/query，响应里
 * 已经含 variantSellPrice，顺便缓存下来是零成本的（CJ 限 1 QPS，省一次调用很关键）。
 * 成本闸门依赖这个价格来判断一笔订单会不会亏本。
 *
 * vid 全程以字符串传递，绝不转 Number：19 位整数超出 double 精度，
 * 转完会变成 ...4000 这种末位错值，上游直接报 "Variant not found"。
 */
export async function resolveVariantInfo(sku: string): Promise<VariantInfo | null> {
  const key = (sku || "").trim().toUpperCase();
  if (!key) return null;

  const m = mem();
  if (m.vid[key]) {
    const p = vPriceMem.get(key);
    if (p !== undefined) return { vid: String(m.vid[key]), price: p };
  }

  const disk = readJsonFile<VidsCache>(VID_CACHE_FILE, {});
  const row = disk[key];
  if (row?.vid && row.v === VID_CACHE_VERSION) {
    const vid = String(row.vid);
    const price = Number(row.price);
    if (Number.isFinite(price)) {
      m.vid[key] = vid;
      vPriceMem.set(key, price);
      return { vid, price };
    }
  }

  const j = await cjCall(`/product/query?productSku=${encodeURIComponent(key)}`);
  if (j.code !== 200) return null;
  const variants = j.data?.variants || [];
  const raw = variants[0]?.vid;
  const vid = raw === undefined || raw === null ? "" : String(raw).trim();
  if (!vid) return null;
  const price = Number(variants[0]?.variantSellPrice);

  disk[key] = {
    vid,
    price: Number.isFinite(price) ? price : undefined,
    at: Date.now(),
    v: VID_CACHE_VERSION,
  };
  m.vid[key] = vid;
  if (Number.isFinite(price)) vPriceMem.set(key, price);
  writeJsonFile(VID_CACHE_FILE, prune(disk, VID_CACHE_MAX));
  return { vid, price };
}

/** 只要 vid 的老接口，内部复用 resolveVariantInfo（顺带把价格也缓存了） */
export async function resolveVid(sku: string): Promise<string | null> {
  const info = await resolveVariantInfo(sku);
  return info ? info.vid : null;
}


// ---------------------------------------------------------------------------
// 运费试算
// ---------------------------------------------------------------------------

export interface FreightOption {
  logisticName: string;
  /** 美元运费（含税费合计） */
  price: number;
  /** 人民币运费 */
  priceCny: number | null;
  /** 时效，如 "12-50" 表示 12~50 天 */
  aging: string;
  agingLabel: string;
  taxesFee: number;
  clearanceFee: number;
  /** 是否为最便宜渠道 */
  cheapest: boolean;
  /** 是否为最快渠道 */
  fastest: boolean;
  /** 是否推荐（价格与时效综合） */
  recommended: boolean;
}

export interface FreightLine {
  sku: string;
  /** 变体 id —— 必须保持字符串！CJ 的 vid 是 19 位整数，用 Number 会丢精度
   *  （1460967096681893888 → 1460967096681894000），上游会返回 Variant not found */
  vid?: string | null;
  quantity?: number;
}

export interface FreightQuote {
  ok: boolean;
  code: string;
  countryName: string;
  lines: { sku: string; vid: string; quantity: number }[];
  quantity: number;
  options: FreightOption[];
  error?: string;
  cached: boolean;
  quotedAt: string;
}

interface FreightCacheRow {
  at: number;
  payload: FreightQuote;
}

function agingBounds(aging: string): number {
  const m = String(aging || "").match(/(\d+)\s*-\s*(\d+)/);
  if (m) return Number(m[1]) + Number(m[2]) / 100; // 以"最快天数"为主，微调次要
  const single = String(aging || "").match(/(\d+)/);
  return single ? Number(single[1]) : 9999;
}

function ageLabel(aging: string): string {
  const m = String(aging || "").match(/(\d+)\s*-\s*(\d+)/);
  if (m) return `${m[1]}~${m[2]} 天`;
  return aging ? `${aging} 天` : "时效未知";
}

/**
 * 目的国运费试算（带缓存）
 * @param sku 商品 SKU（会自动解析出首个变体 vid）
 * @param quantity 数量
 * @param to 目的地二字码，如 GH
 */
export async function quoteFreight(input: {
  sku: string;
  vid?: string | null;
  quantity?: number;
  to: string;
}): Promise<FreightQuote> {
  return quoteFreightMulti({ lines: [{ sku: input.sku, vid: input.vid, quantity: input.quantity }], to: input.to });
}

/**
 * 多商品合并试算 —— CJ 会按整包总重量计价，所以整车一起算比逐件相加更准，
 * 也省接口配额（一次请求搞定整车，而不是每个商品一次）。
 */
export async function quoteFreightMulti(input: { lines: FreightLine[]; to: string }): Promise<FreightQuote> {
  const code = (input.to || "").toUpperCase();
  const country = countryByCode(code);
  const now = new Date().toISOString();

  if (!country) {
    return {
      ok: false, code, countryName: code, lines: [], quantity: 0, options: [],
      error: `未知国家代码：${code}`, cached: false, quotedAt: now,
    };
  }

  const wanted = (input.lines || []).filter((l) => (l.sku || "").trim());
  if (wanted.length === 0) {
    return {
      ok: false, code, countryName: country.en, lines: [], quantity: 0, options: [],
      error: "购物车为空", cached: false, quotedAt: now,
    };
  }

  // 逐个解析 vid（已缓存过的几乎零成本；冷启动每个约 1.2 秒）
  const resolved: { sku: string; vid: string; quantity: number }[] = [];
  const failed: string[] = [];
  for (const l of wanted) {
    const vidIn = l.vid === undefined || l.vid === null ? "" : String(l.vid).trim();
    const vid = vidIn || (await resolveVid(l.sku));
    if (!vid) {
      failed.push(l.sku);
      continue;
    }
    resolved.push({ sku: (l.sku || "").trim().toUpperCase(), vid, quantity: Math.max(1, Math.min(999, Number(l.quantity) || 1)) });
  }

  if (resolved.length === 0) {
    return {
      ok: false, code, countryName: country.en, lines: [], quantity: 0, options: [],
      error: `无法解析商品变体（可能已下架）：${failed.join(", ")}`, cached: false, quotedAt: now,
    };
  }

  // 同一 vid 合并数量（同商品加两次）
  const merged = new Map<string, { sku: string; vid: string; quantity: number }>();
  for (const r of resolved) {
    const prev = merged.get(r.vid);
    if (prev) prev.quantity += r.quantity;
    else merged.set(r.vid, { ...r });
  }
  const finalLines = [...merged.values()];
  const totalQty = finalLines.reduce((s, l) => s + l.quantity, 0);

  const cacheKey = `${finalLines.map((l) => `${l.vid}x${l.quantity}`).sort().join(",")}|${code}`;
  const m = mem();

  const disk = readJsonFile<Record<string, FreightCacheRow>>(FREIGHT_CACHE_FILE, {});
  const hit = m.freight[cacheKey] || disk[cacheKey];
  if (hit && Date.now() - hit.at < FREIGHT_TTL_MS) {
    m.freight[cacheKey] = hit;
    return { ...hit.payload, cached: true };
  }

  const base = { code, countryName: country.en, lines: finalLines, quantity: totalQty };

  const j = await cjCall("/logistic/freightCalculate", {
    method: "POST",
    body: JSON.stringify({
      startCountryCode: "CN",
      endCountryCode: code,
      products: finalLines.map((l) => ({ vid: l.vid, quantity: l.quantity })),
    }),
  });

  if (j.code !== 200) {
    return {
      ...base, ok: false, options: [],
      error: j.message || `上游返回 code=${j.code}`, cached: false, quotedAt: now,
    };
  }

  const rows: any[] = Array.isArray(j.data) ? j.data : j.data?.options || [];
  const cleaned = rows
    .filter((r) => r && (r.logisticName || r.totalPostageFee != null))
    .map((r) => ({
      name: String(r.logisticName || "").trim(),
      price: Number(r.totalPostageFee ?? r.logisticPrice ?? 0),
      priceCny: r.logisticPriceCn != null ? Number(r.logisticPriceCn) : null,
      aging: String(r.logisticAging || ""),
      taxesFee: Number(r.taxesFee || 0),
      clearanceFee: Number(r.clearanceOperationFee || 0),
      // 有 error/tip 的渠道说明当前不可用，剔除
      err: String(r?.error || "").trim(),
    }))
    .filter((r) => r.name && r.price > 0 && !r.err);

  // 同名渠道去重，保留最低价
  const byName = new Map<string, (typeof cleaned)[number]>();
  for (const r of cleaned) {
    const prev = byName.get(r.name);
    if (!prev || r.price < prev.price) byName.set(r.name, r);
  }
  const uniq = [...byName.values()].sort((a, b) => a.price - b.price || agingBounds(a.aging) - agingBounds(b.aging));

  if (uniq.length === 0) {
    return {
      ...base, ok: false, options: [],
      error: "该目的地暂无可用的物流渠道", cached: false, quotedAt: now,
    };
  }

  const cheapestPrice = uniq[0].price;
  const fastestAging = Math.min(...uniq.map((r) => agingBounds(r.aging)));
  // 综合推荐：价格权重 60% + 时效权重 40%（归一化打分，越低越好）
  const scored = uniq.map((r) => {
    const pScore = r.price / (cheapestPrice || 1);
    const tScore = agingBounds(r.aging) / (fastestAging || 1);
    return { r, score: pScore * 0.6 + tScore * 0.4 };
  });
  const bestName = scored.slice().sort((a, b) => a.score - b.score)[0]?.r.name;

  const options: FreightOption[] = uniq.map((r) => ({
    logisticName: r.name,
    price: Math.round(r.price * 100) / 100,
    priceCny: r.priceCny,
    aging: r.aging,
    agingLabel: ageLabel(r.aging),
    taxesFee: r.taxesFee,
    clearanceFee: r.clearanceFee,
    cheapest: r.name === uniq[0].name,
    fastest: agingBounds(r.aging) === fastestAging,
    recommended: r.name === bestName,
  }));

  const payload: FreightQuote = { ...base, ok: true, options, cached: false, quotedAt: now };

  const row: FreightCacheRow = { at: Date.now(), payload };
  disk[cacheKey] = row;
  m.freight[cacheKey] = row;
  writeJsonFile(FREIGHT_CACHE_FILE, prune(disk, FREIGHT_CACHE_MAX));

  return payload;
}
