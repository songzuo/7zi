# npm 依赖优化报告

**日期**: 2026-10-20  
**项目**: 7zi-frontend v1.14.2  
**分析工具**: npm audit, depcheck, grep 源码导入分析

---

## 📊 当前依赖概况

| 分类 | 数量 |
|------|------|
| dependencies | 38 |
| devDependencies | 27 |
| 总漏洞数 | 21 (2 low, 1 moderate, 18 high) |

---

## 🚨 1. 安全漏洞 (21个，需优先处理)

### 高危漏洞

| 漏洞包 | Severity | 传播路径 | 修复方案 |
|--------|----------|----------|----------|
| **serialize-javascript** | high | `workbox-webpack-plugin → rollup-plugin-terser → terser-webpack-plugin` | pnpm overrides 已覆盖（`>=7.0.5`），但需验证实际安装版本 |
| **braces** | high | `jest-message-util → micromatch → braces` | `npm audit fix --force` 会降级 @jest/globals，建议手动升级 |
| **redis** (v3.x) | high | `bull → redis` | **删除 `redis` 包**，项目已使用 `ioredis` |
| **glob** (10.2.0-10.4.5) | high | `@next/eslint-plugin-next → glob` | 升级 `eslint-config-next` |
| **fast-csv** | moderate | `exceljs → fast-csv` | 升级 `exceljs` 到最新 |
| **tmp** | high | `exceljs → tmp` | 升级 `exceljs` 到最新 |

### 修复命令（需谨慎测试）

```bash
# 1. 升级 exceljs（修复 fast-csv 和 tmp 漏洞）
pnpm up exceljs

# 2. 升级 eslint-config-next（修复 glob 漏洞）
pnpm up eslint-config-next

# 3. 确认 serialize-javascript 版本覆盖
pnpm why serialize-javascript

# 4. 删除废弃的 redis v3
pnpm rm redis
```

---

## 🔴 2. 依赖放置错误（应移至 devDependencies）

以下包仅在测试代码中使用，不应进入生产 bundle：

| 包名 | 当前分类 | 建议分类 | 使用场景 |
|------|----------|----------|----------|
| `@jest/globals` | dependencies ❌ | devDependencies | 仅测试文件导入 |
| `@testing-library/jest-dom` | dependencies ❌ | devDependencies | 测试 setup 文件 |
| `@types/lodash` | dependencies ❌ | devDependencies | 仅类型定义，开发用 |

**修复**:
```bash
pnpm mv @jest/globals devDependencies
pnpm mv @testing-library/jest-dom devDependencies
pnpm mv @types/lodash devDependencies
```

---

## 🟡 3. 重复依赖（建议合并）

### 3.1 lodash 双版本

| 包 | 用途 | 建议 |
|----|------|------|
| `lodash` (CJS) | 广泛使用 | 删除，使用 lodash-es |
| `lodash-es` (ESM) | ✅ 8处引用，支持 tree-shaking | 保留 |

**操作**: `pnpm rm lodash`，然后全局替换 `import _ from 'lodash'` → `import { xxx } from 'lodash-es'`

### 3.2 dompurify 双版本

| 包 | 用途 | 建议 |
|----|------|------|
| `dompurify` | 仅 pdf-exporter.ts 使用 | 删除 |
| `isomorphic-dompurify` | 2处使用（input-sanitization） | 保留 |

**操作**: `pnpm rm dompurify`

### 3.3 redis 旧版 vs ioredis

| 包 | 用途 | 建议 |
|----|------|------|
| `redis` v3.x (旧) | 仅被 bull 依赖，有安全漏洞 | 删除 |
| `ioredis` | ✅ 4处使用，Redis 客户端 | 保留 |

**操作**: `pnpm rm redis`，验证 bull 是否仍正常工作（bull 4.x+ 已支持 ioredis）

---

## 🟢 4. 依赖分类优化建议

### 应保留在 dependencies（运行时必需）

| 包 | 原因 |
|----|------|
| `next`, `react`, `react-dom` | 核心框架 |
| `better-sqlite3` | 数据库运行时 |
| `ioredis` | Redis 客户端 |
| `sharp` | 图片处理 |
| `socket.io` + `socket.io-client` | WebSocket 通信 |
| `zod` | 运行时验证 |
| `jose` | JWT 处理 |
| `uuid` | ID 生成 |
| `bull` | 任务队列 |
| `hono` | API 框架 |
| `@sentry/nextjs` | 错误监控 |
| `recharts`, `lucide-react`, `@xyflow/react` | UI 组件 |
| `three`, `@react-three/fiber`, `@react-three/drei` | 3D 组件 |
| `exceljs`, `jspdf`, `jszip` | 导出功能 |
| `fuse.js` | 搜索 |
| `web-vitals` | 性能监控 |

### 正确放在 devDependencies

- TypeScript 类型包应随框架走（如 `@types/react`, `@types/node`）
- 测试框架（vitest, @playwright/test, msw, jsdom）
- 构建工具（vite, @vitejs/plugin-react）
- 代码质量（eslint, prettier）

---

## 📋 5. 清理计划（按优先级）

### P0 - 紧急（安全）

```bash
# 删除 redis v3（有漏洞）
pnpm rm redis

# 升级关键包
pnpm up exceljs
pnpm up eslint-config-next
pnpm up @ducanh2912/next-pwa
```

### P1 - 重要（正确性）

```bash
# 移动测试依赖到 devDependencies
pnpm mv @jest/globals devDependencies
pnpm mv @testing-library/jest-dom devDependencies
pnpm mv @types/lodash devDependencies

# 删除重复依赖
pnpm rm lodash        # 保留 lodash-es
pnpm rm dompurify     # 保留 isomorphic-dompurify
pnpm rm redis         # 保留 ioredis
```

### P2 - 优化（可选）

```bash
# 验证 pnpm overrides 是否完整覆盖漏洞
pnpm why serialize-javascript
pnpm why braces
pnpm why fast-csv

# 检查是否有未使用的 devDependencies
pnpm depcheck
```

---

## 📦 6. 建议更新后的 package.json 片段

```json
{
  "dependencies": {
    "better-sqlite3": "^12.11.1",
    "bull": "^1.1.3",
    "commander": "^14.0.3",
    "exceljs": "^4.4.0",
    "fuse.js": "^7.5.0",
    "handlebars": "^4.7.10",
    "hono": "^4.13.13",
    "html2canvas": "^1.4.1",
    "ioredis": "^5.11.1",
    "isomorphic-dompurify": "^3.19.0",
    "jose": "^6.2.12",
    "jspdf": "^4.2.1",
    "jszip": "^3.10.2",
    "lodash-es": "^4.18.1",
    "lru-cache": "^11.5.3",
    "lucide-react": "^1.59.0",
    "next": "^16.4.2",
    "recharts": "^3.10.1",
    "socket.io": "^4.8.4",
    "socket.io-client": "^4.8.4",
    "zod": "^4.6.7",
    "zustand": "^5.0.15"
    // ... 其他必需依赖
  },
  "devDependencies": {
    "@jest/globals": "^30.5.2",
    "@testing-library/jest-dom": "^6.9.1",
    "@types/lodash": "^4.17.26",
    "@types/react": "^19.3.0",
    "vitest": "^4.1.12",
    "@playwright/test": "^1.64.1",
    // ... 其他开发依赖
  }
}
```

---

## ✅ 7. 验证步骤

优化后必须执行：

```bash
# 1. 安全验证
npm audit

# 2. 功能验证
npm run build
npm run test:run

# 3. 依赖检查
npm run dep:check
```

---

**报告生成时间**: 2026-10-20 23:38 GMT+2
**分析者**: Executor (子代理)
