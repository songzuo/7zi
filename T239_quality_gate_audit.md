# T239 — 7zi.com 前端仓库只读质量门禁体检报告

**执行者**：🛡️ 系统管理员 子代理
**仓库**：`/root/.openclaw/workspace`（7zi-frontend v1.14.2，Next.js 16 / React 19）
**时间**：2026-10-29 05:14–05:35 (GMT+8)
**Node / TS**：v22.22.1 / TypeScript 5.9.3 / pnpm 10.32.1 / npm 10.x
**纪律遵守**：所有命令带 `timeout`；未执行任何 `git add/commit/push`；未修改任何源码文件、lint/tsconfig/vitest 配置；未触碰 HEARTBEAT.md / state/tasks.json / memory/* / MEMORY.md / DEV_TASKS_*.md。收工前已确认自己起的进程全部退出（`ps` 中残留的 vitest 进程属并行任务 T238，非本任务启动，未清理）。

---

## 1. TypeScript 类型检查

命令：`timeout 900 npx tsc --noEmit -p tsconfig.json`

```
EXIT=0
输出行数：0
```

**结果：0 个类型错误**（全仓库类型检查完全通过，无 error 文件，因此无 Top 10 错误文件列表）。

改动后复跑仍为 `EXIT=0 / 0 行`。

---

## 2. ESLint

命令：`timeout 900 npx eslint . --ext .ts,.tsx --format json`

汇总：

| 项 | 数值 |
|---|---|
| error 总数 | **0** |
| warning 总数 | **137** |
| 有问题的文件数 | 46 |
| `src/` 目录内的问题 | **0 条（0 文件）** |

Top 10 文件（按 error 降序，其次 warning 降序；全部 error=0，按 warning 排）：

| # | 文件 | error | warning |
|---|---|---|---|
| 1 | db-optimization-patches/patch-1-backup-api-optimized.ts | 0 | 8 |
| 2 | analyze-dependencies.js | 0 | 7 |
| 3 | cleanup-code.js | 0 | 6 |
| 4 | server/websocket-server.js | 0 | 6 |
| 5 | fix-test-imports.js | 0 | 5 |
| 6 | fix-unused-imports.js | 0 | 5 |
| 7 | fix-unused-vars.js | 0 | 5 |
| 8 | performance-benchmark.ts | 0 | 5 |
| 9 | analyze-unused-code.js | 0 | 4 |
| 10 | audit-exports.ts | 0 | 4 |

Top 规则分布（全仓库）：
- `@typescript-eslint/no-require-imports`：**81**
- `@typescript-eslint/no-unused-vars`：**56**

**判读**：业务源码 `src/` 零告警；137 条 warning 全部集中在仓库根目录的一次性运维/修复脚本（`fix-*.js`、`analyze-*.js`、`audit-*.js`）、基准测试脚本与 `db-optimization-patches/` 备份补丁目录，属于「一次性工具脚本」而非生产代码，不阻断构建与发布。

---

## 3. npm audit 依赖安全

命令：`timeout 300 npm audit --json`（改动前基线）

```
metadata.vulnerabilities: { info:0, low:4, moderate:6, high:2, critical:0, total:12 }
dependencies: prod 918 / dev 394 / optional 42 / peer 29 / total 1372
```

### Critical / High 明细（改动前）

| 包 | 严重度 | 直接依赖 | 引入路径 | fixAvailable |
|---|---|---|---|---|
| **body-parser** | high | 否（间接，express 5.3.0 → body-parser 2.3.0） | GHSA-27r3-jxmh-p828 压缩请求体尾部字节 DoS | **true（补丁级 2.4.0）** |
| **serialize-javascript** | high | 否（间接，terser-webpack-plugin → serialize-javascript 7.1.2） | GHSA-5c6j-r48x-rmvq (RCE via RegExp.flags / toISOString)、GHSA-qj8w-gfj5-8c6v (CPU DoS)、GHSA-m5mm-p8h7-m29v (XSS) | npm 报 false；上游已有 7.1.3 / 7.1.4 补丁版可 override |

### 其余漏洞（low/moderate，改动前 10 项）

| 包 | 严重度 | 直接 | 说明 | fix |
|---|---|---|---|---|
| fast-uri | moderate | 是 | URI scheme 欺骗 / 相对引用路径等价 / host 混淆 / scheme 注入（4 条 GHSA） | **4.2.3 补丁级可修** |
| bull | moderate | 是 | 经 uuid 传递 | 需降级到 1.1.3（**主版本回退，禁止**） |
| exceljs | moderate | 是 | 经 uuid 传递 | npm 报 true，但实为 4.x 主版本升级（**禁止**） |
| uuid | moderate | 否 | uuid <11.1.1 缺 buffer 边界检查 | 需 bull 1.1.3（**主版本，禁止**） |
| @rollup/plugin-terser | moderate | 否 | 经 serialize-javascript | 随 serialize-javascript 修复 |
| workbox-build | moderate | 否 | 经 @rollup/plugin-node-resolve / terser | 无修复 |
| @ducanh2912/next-pwa | low | 是 | 经 workbox-* | 无修复 |
| workbox-webpack-plugin | low | 否 | 经 workbox-build | npm 报 true（workbox 7.3.x 主版本，**禁止**） |
| @rollup/plugin-node-resolve | low | 否 | 经 deepmerge | 无修复 |
| deepmerge | low | 否 | mergeObject() 原型污染 | 间接 |

---

## 4. 系统资源与孤儿进程

```
$ df -h /
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1       145G  109G   36G  76% /

$ free -m
               total        used        free      shared  buff/cache   available
Mem:             7941        2405        1586           0        4247        5535
Swap:            4095        1175        2920

$ ps aux | grep -E 'vitest|tsc|next' | grep -v grep
root  2710963 ... next-server (v16.3.8)          # 生产 next-server，非本任务进程
root  3822382 ... vitest run src/lib ...          # 并行任务 T238 启动，非本任务进程
root  3826849 ... vitest ... connection-pool.test.ts # 并行任务 T238 启动
```

**判读**：磁盘 76%（36G 可用），内存 available 5.1–5.5G / 7.9G，Swap 已用 1.2G——**健康但需留意**，Swap 偏高说明此前有过内存峰值（vitest 并行）。本任务自身（tsc/eslint/npm/pnpm）全部正常退出，无孤儿进程残留。

---

## 5. package.json 改动（本次唯一写操作）

### 改动清单（`git diff package.json`）

```diff
 devDependencies:
-    "fast-uri": "4.2.2",
+    "fast-uri": "4.2.3",

 pnpm.overrides:
-    "serialize-javascript": ">=7.0.5",
+    "serialize-javascript": ">=7.1.4",
-    "fast-uri": ">=3.1.8",
+    "fast-uri": ">=4.2.3",
-    "braces@>=3.0.0": ">=3.0.5",
+    "braces@>=3.0.0": ">=3.0.3",
+    "body-parser": ">=2.4.0",
+    "micromatch@>=0.2.0": ">=4.0.8",   (位置调整)

+  "overrides": {                       # 新增 npm 原生 overrides 块
+    "body-parser": ">=2.4.0",
+    "serialize-javascript": ">=7.1.4",
+    "fast-uri": "4.2.3"
+  }
```

### 每项改动理由

| 改动 | 理由 | 是否主版本升级 |
|---|---|---|
| `fast-uri` 4.2.2 → **4.2.3** | 修复 4 条 moderate 漏洞（GHSA-4v9q-2w9m-mv8c 等：URI scheme 欺骗、相对引用路径等价、host 混淆、scheme 注入）。audit 明确给出 `isSemVerMajor: false` | 否，补丁级 |
| `pnpm.overrides.serialize-javascript` ≥7.0.5 → **≥7.1.4** | 修复 3 条 high（XSS + RCE + CPU DoS）。上游 7.1.3/7.1.4 为补丁版；因该包是 terser-webpack-plugin/workbox 的间接依赖，无法直接声明，只能 override | 否，补丁级 |
| `pnpm.overrides.body-parser` **新增 ≥2.4.0** | 修复 GHSA-27r3-jxmh-p828（压缩请求体尾部字节 DoS，high）。express 5.3.0 声明 `body-parser ^2.2.1`，2.4.0 落在同一 semver 范围内，无需改 express | 否，补丁级 |
| `pnpm.overrides.fast-uri` ≥3.1.8 → **≥4.2.3** | 与 devDependency 对齐，确保 pnpm 解析树全部 ≥4.2.3 | 否 |
| `pnpm.overrides.braces@>=3.0.0` ≥3.0.5 → **≥3.0.3** | **必要修正**：npm 上 `braces` 最新版为 **3.0.3**，不存在 3.0.5。原 override `>=3.0.5` 会让 `pnpm install --lockfile-only` 直接失败（`ERR_PNPM_NO_MATCHING_VERSION`）。下调到实际存在的 3.0.3 解除锁文件生成阻塞，且不改变已解析版本 | 否 |
| 新增 npm 原生 `overrides` 块 | 仓库同时维护 `package-lock.json`（npm）与 `pnpm-lock.yaml`（pnpm）。npm 侧 `npm audit` 走的是 package-lock，原有 `pnpm.overrides` 对 npm 完全无效。补上 npm 原生 overrides 才能让 npm 侧 audit 同步收敛 | 否 |

### lockfile 变更

- `package-lock.json`：1373 → 1369 条包记录（**净减 4**，无新增包）
  - 移除：`node_modules/ajv/node_modules/fast-uri`、`node_modules/randombytes`、`node_modules/workbox-build/node_modules/serialize-javascript`、`node_modules/workbox-webpack-plugin/node_modules/serialize-javascript`（去重后不再需要嵌套副本）
  - 升级：`body-parser` 2.3.0→2.4.0、`fast-uri` 4.2.2→4.2.3、`serialize-javascript` 7.0.5→7.1.4
  - **包体积无暴涨**：删除 4 个包、新增 0 个包，仅补丁级 in-place 升级
- `pnpm-lock.yaml`：2305 → 2319 条记录（+14，来自 override 后重新解析引入 jsonwebtoken / jwa / jws / buffer-equal-constant-time / ecdsa-sig-formatter 等传递依赖，均为既有间接链展开）

执行命令：
```
timeout 600 npm install --package-lock-only --ignore-scripts   # EXIT=0
timeout 600 pnpm install --lockfile-only                         # EXIT=0
```
（未执行 `npm install` 拉实体包；node_modules 未变，磁盘零增长。）

### 改动后复检

```
npm audit  → { info:0, low:5, moderate:3, high:0, critical:0, total:8 }
              @ducanh2912/next-pwa low / @rollup/plugin-node-resolve low
              bull moderate / exceljs moderate / uuid moderate
              deepmerge low / workbox-build low / workbox-webpack-plugin low
pnpm audit → { low:1 }  仅剩 deepmerge low
tsc --noEmit → EXIT=0（0 错误）
```

**High 漏洞：2 → 0。Critical：0 → 0。** npm 侧剩余 8 条全部为 low/moderate 且修复均需主版本变更（bull 1.1.3 / exceljs 4.x / workbox 7.3.x），按纪律**未执行**。

---

## 6. Top 问题清单与修复优先级

| P | 问题 | 等级 | 位置 | 建议 | 本次是否处理 |
|---|---|---|---|---|---|
| P0 | `serialize-javascript` 7.1.2 RCE/XSS/CPU-DoS（GHSA-5c6j-r48x-rmvq、GHSA-m5mm-p8h7-m29v、GHSA-qj8w-gfj5-8c6v） | High | terser-webpack-plugin → workbox → next-pwa（构建期） | override 至 ≥7.1.4 | ✅ 已修 |
| P0 | `body-parser` 2.3.0 压缩体尾部字节 DoS（GHSA-27r3-jxmh-p828） | High | express 5.3.0（@modelcontextprotocol/sdk、exceljs） | override 至 ≥2.4.0 | ✅ 已修 |
| P1 | `fast-uri` 4.2.2 四条 URI 解析漏洞 | Moderate | 直接依赖（dev） | 升级至 4.2.3 | ✅ 已修 |
| P1 | `braces` override `>=3.0.5` 指向不存在的版本，**阻塞 `pnpm install --lockfile-only`** | 阻断级（工具链） | package.json pnpm.overrides | 改为 `>=3.0.3` | ✅ 已修 |
| P1 | 仓库存在 `package-lock.json` 与 `pnpm-lock.yaml` 双锁文件，且 npm 侧无 `overrides`，导致两条工具链安全状态长期不一致 | 配置一致性 | package.json | 补 npm 原生 `overrides`（本次已补）；后续应明确单一包管理器 | ✅ 部分修 |
| P2 | `uuid` <11.1.1 buffer 边界检查缺失 | Moderate | bull / exceljs → uuid | 需 bull 1.1.3 或 exceljs 4.x（**主版本，禁止自动升**），需人工评估 bull API 兼容性后单独处理 | ❌ 未做（越界） |
| P2 | `bull` 本身被 npm 标为 moderate，且 audit 建议"降级"到 1.1.3 | Moderate | 直接依赖 | 建议评估 bull v4 → v5+ 或替换为 BullMQ；不要采纳 npm 的降级建议 | ❌ 未做（越界） |
| P3 | `exceljs` 4.x 主版本升级 | Moderate | 直接依赖 | 4.x 有 API 破坏性变更，需单独排期验证 | ❌ 未做（越界） |
| P3 | `deepmerge` 原型污染 | Low | @rollup/plugin-node-resolve → deepmerge | 随 workbox 生态更新自然消除；如需立刻消除可 override 至 4.3.1（当前已解析 4.3.1，pnpm 仍报 low 属 advisory 误报范围） | ❌ 未做 |
| P3 | `workbox-build` / `workbox-webpack-plugin` 链上 moderate/low | Moderate/Low | @ducanh2912/next-pwa | 仅能通过 next-pwa 主版本升级消除，需评估 PWA 构建影响 | ❌ 未做 |
| P4 | ESLint 137 warning 全部集中在根目录一次性脚本（`fix-*.js` / `analyze-*.js` / `audit-*.js`）、`server/` 调试脚本、`db-optimization-patches/` 备份补丁 | Low | 仓库根 | 建议：① 将这些脚本移入 `scripts/` 并在 .eslintignore 排除；② 或批量加 `/* eslint-disable @typescript-eslint/no-require-imports */`。**不影响 `src/`（src 零告警）** | ❌ 未做（属他人文件） |
| P4 | 根目录堆积一次性脚本与备份目录，污染 lint/构建扫描面 | 低 | 仓库根 | 归档到 `scripts/` 或 `.archive-ready/` | ❌ 未做 |
| P4 | Swap 已用 1.2G，内存峰值明显 | 低 | 主机 | vitest 并行需限制 worker；CI 建议 `--maxWorkers` 显式约束 | ❌ 未做（信息项） |

---

## 7. 结论

**Partial（部分通过）**

- ✅ **TypeScript 类型门禁：通过**（0 错误）
- ✅ **ESLint error 门禁：通过**（0 error；`src/` 0 告警；137 warning 全在根目录一次性脚本，不阻断）
- ✅ **依赖安全 high/critical：已清零**（2 high → 0 high，0 critical），全部为补丁级升级，无主版本变更，无新增实体包，体积零增长
- ✅ **资源状态：健康**（磁盘 76% / 36G 可用，内存 available 5.5G，无本任务遗留孤儿进程）
- ⚠️ **仍有 8 条 low/moderate 未清零**（bull/exceljs/uuid/workbox 链），其修复均需主版本变更，按任务纪律明确禁止，留待人工排期
- ⚠️ **仓库仍存在双 lockfile 隐患**：本次已通过 npm 原生 `overrides` 抹平安全差异，但根因（npm + pnpm 并存）未解决，建议尽快收敛为单一包管理器

**放行建议**：可以放行本次门禁。高危项已修复且经复检确认；剩余项均为低危/中危且需破坏性升级，不应在本轮质量门禁内处理。
