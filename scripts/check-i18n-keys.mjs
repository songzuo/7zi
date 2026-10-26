#!/usr/bin/env node
/**
 * i18n key 静态审计 —— 把组件真实要的 key 和 catalog 真有的 key 对一遍。
 *
 * 为什么需要它：
 *   `src/components/Navigation.tsx` 里是 useTranslations('nav') 要 nav.siteNameShort
 *   / nav.mobileMenu.open / nav.subagents …，而 catalog 里这些 key 全在别处
 *   （common.siteNameShort、mobileMenu.*、顶层 tasks|subagents|memory）。
 *   单元测试完全没抓到，因为 `Navigation.test.tsx` 自己把 useTranslations
 *   **mock 掉了**，硬编码返回所有 key —— 于是测试绿、生产 SSR 抛
 *   MISSING_MESSAGE 崩页、Lighthouse 报 NO_FCP。
 *
 * 用法：
 *   node scripts/check-i18n-keys.mjs            # CI 用：只报「新增」缺失，退出码非 0
 *   node scripts/check-i18n-keys.mjs --all      # 本地看全量缺失（不判失败）
 *   node scripts/check-i18n-keys.mjs --update   # 把当前缺失写成基线
 *
 * 基线（.github/i18n-missing-baseline.json）里已有的历史缺失不算失败 ——
 * 那些是 dashboard / rooms / multimodal 那一批尚未补的，属既有技术债；
 * 一旦有人**新增**缺失 key，CI 立刻红。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MESSAGES = join(ROOT, 'src', 'i18n', 'messages');
const BASELINE = join(ROOT, '.github', 'i18n-missing-baseline.json');
const LANGS = ['de', 'en', 'es', 'fr', 'ja', 'ko', 'zh'];
const BASE = 'en';

const argv = process.argv.slice(2);
const SHOW_ALL = argv.includes('--all');
const UPDATE = argv.includes('--update');

/** 递归收集 src 下的 .ts/.tsx（排除测试与 message 目录）。 */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '__tests__') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) {
      if (/\.(test|spec)\.(ts|tsx)$/.test(name)) continue;
      out.push(p);
    }
  }
  return out;
}

function load(lang) {
  return JSON.parse(readFileSync(join(MESSAGES, `${lang}.json`), 'utf8'));
}

function has(obj, dotted) {
  let cur = obj;
  for (const part of dotted.split('.')) {
    if (cur === null || typeof cur !== 'object' || !(part in cur)) return false;
    cur = cur[part];
  }
  return typeof cur !== 'object' || cur === null;
}

const NS_BARE = /(?:useTranslations|getTranslations)\s*\(\s*['"]([A-Za-z0-9_.-]*)['"]/g;
const NS_KV = /namespace\s*:\s*['"]([A-Za-z0-9_.-]*)['"]/g;
const T_KEY = /\bt\s*\(\s*['"]([^'"\\$`{]+)['"]/g;

function collect(file) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes('useTranslations') && !text.includes('getTranslations')) return null;
  const nss = [...text.matchAll(NS_BARE)].map((m) => m[1]);
  if (nss.length === 0) nss.push(...[...text.matchAll(NS_KV)].map((m) => m[1]));
  if (nss.length === 0) nss.push('');
  const keys = [...text.matchAll(T_KEY)].map((m) => m[1]);
  if (keys.length === 0) return null;
  return { nss: [...new Set(nss)], keys: [...new Set(keys)] };
}

const rel = (p) => relative(ROOT, p).split(sep).join('/');

function main() {
  const base = load(BASE);
  const bullets = walk(join(ROOT, 'src'));
  const missing = [];
  let calls = 0;

  for (const file of bullets) {
    const info = collect(file);
    if (!info) continue;
    for (const key of info.keys) {
      calls += 1;
      const hit = info.nss.some((ns) => has(base, ns ? `${ns}.${key}` : key));
      if (!hit) missing.push({ file: rel(file), nss: info.nss, key });
    }
  }

  const lines = missing.map((m) => `${m.file}|${m.key}`);
  const old = (() => {
    try {
      return new Set(JSON.parse(readFileSync(BASELINE, 'utf8')).entries ?? []);
    } catch {
      return new Set();
    }
  })();

  if (UPDATE) {
    const payload = {
      _comment:
        'scripts/check-i18n-keys.mjs 的基线：这里列出的 i18n 缺失是既有的，' +
        'CI 只对「不在基线里的新增缺失」报错。补完一批就 --update 一次把基线缩下去。',
      generatedAt: new Date().toISOString(),
      count: lines.sort().length,
      entries: lines,
    };
    writeFileSync(BASELINE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`baseline written: ${lines.length} entries -> ${rel(BASELINE)}`);
    return 0;
  }

  const fresh = lines.filter((l) => !old.has(l));
  const stale = [...old].filter((l) => !lines.includes(l));

  console.log(`扫到 ${calls} 处 t('…') 字面量调用，en.json 里缺失 ${missing.length} 处`);

  if (SHOW_ALL) {
    for (const m of missing) {
      console.log(`   ${m.file}  ns=${m.nss.join('|') || '(root)'}  ${m.key}`);
    }
  }

  if (stale.length) {
    console.log(`\n基线里有 ${stale.length} 条已经不再缺失（可以 --update 缩基线）：`);
    for (const s of stale.slice(0, 20)) console.log(`   ${s}`);
  }

  if (fresh.length === 0) {
    console.log('\n没有新增缺失 key。');
    return 0;
  }

  console.error(`\n!! 新增 ${fresh.length} 处缺失 key（不在基线里）：`);
  for (const m of missing.filter((x) => fresh.includes(`${x.file}|${x.key}`))) {
    console.error(`   ${m.file}  ns=${m.nss.join('|') || '(root)'}  缺 ${m.key}`);
  }
  console.error(
    '\n这些 key 在真实 SSR 里会让 use-intl 抛 MISSING_MESSAGE，整页崩成 NO_FCP。' +
      '\n补 key，或在确认属既有技术债后 `node scripts/check-i18n-keys.mjs --update`。',
  );
  return 1;
}

process.exit(main());
