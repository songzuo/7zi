# PWA 问题跟踪 - 2026-04-08

**创建日期:** 2026-04-08  
**最后更新:** 2026-04-08  
**状态:** 进行中

---

## 问题列表

### 🔴 P0 - 严重问题

#### 1. CSS 变量 `/` 语法错误

| 属性 | 值 |
|------|-----|
| **问题** | lightningcss 不接受 CSS 变量中的 `/` 字符 |
| **影响** | 5 个 CSS 警告，但构建仍成功 |
| **位置** | Tailwind arbitrary values 在 JSX 中的使用 |
| **状态** | ⚠️ 未修复 |

**问题详情:**
```
dark:bg-[var(--color-blue-900/30)]
dark:bg-[var(--color-green-900/30)]
dark:bg-[var(--color-red-900/10)]
dark:bg-[var(--color-red-900/30)]
dark:bg-[var(--color-yellow-900/30)]
```

**修复方案:**
```tsx
// 方案A: 在 globals.css 中预定义
--color-red-900-10: rgba(127, 29, 29, 0.1);
// 使用 var(--color-red-900-10)

// 方案B: 使用 Tailwind 原生 opacity
className="dark:bg-red-900/10"
```

---

#### 2. Service Worker TypeScript 语法 (已修复 ✅)

| 属性 | 值 |
|------|-----|
| **问题** | public/sw.js 包含 TypeScript 接口定义 |
| **影响** | 浏览器环境可能无法识别 |
| **文件** | public/sw.js |
| **状态** | ✅ 已修复 (2026-04-08) |

**修复内容:**
- 移除 `interface ExtendableEvent`
- 移除 `interface FetchEvent`  
- 移除 `interface ExtendableMessageEvent`
- 修复 `install` 事件监听器类型注解

---

### 🟡 P1 - 中等问题

#### 3. manifest 重复配置

| 属性 | 值 |
|------|-----|
| **问题** | public/manifest.json 和 src/app/manifest.ts 同时存在 |
| **影响** | 可能导致配置冲突 |
| **文件** | public/manifest.json, src/app/manifest.ts |
| **状态** | ⚠️ 待处理 |

**建议:** Next.js 15+ 应优先使用 `src/app/manifest.ts`，移除 `public/manifest.json`

---

#### 4. Viewport maximumScale 问题

| 属性 | 值 |
|------|-----|
| **问题** | maximumScale: 1.0 禁止用户缩放 |
| **影响** | Accessibility 问题，违反 WCAG |
| **文件** | src/app/viewport.tsx |
| **状态** | ⚠️ 待处理 |

**修复方案:**
```tsx
// 将
maximumScale: 1.0,
// 改为
userScalable: true,
// 或删除 maximumScale 字段
```

---

### 🟢 P2 - 优化建议

#### 5. 最大 Chunk 过大

| 属性 | 值 |
|------|-----|
| **问题** | 0~75ovgc1 chunk 达 1.1MB |
| **影响** | 首屏加载性能 |
| **状态** | 🔍 待分析 |

**建议:** 使用 `@next/bundle-analyzer` 分析来源

---

#### 6. ServiceWorkerRegistration 挂载位置

| 属性 | 值 |
|------|-----|
| **问题** | 仅在 [locale]/layout.tsx 挂载 |
| **影响** | 非 locale 路由可能无法注册 SW |
| **文件** | src/app/[locale]/layout.tsx |
| **状态** | ⚠️ 待验证 |

---

## 修复记录

| 日期 | 问题 | 修复内容 |
|------|------|----------|
| 2026-04-08 | SW TypeScript 语法 | 移除接口定义，修复类型注解 |

---

## 相关文件路径

```
/workspace/
├── public/
│   ├── manifest.json          # 重复配置
│   └── sw.js                  # ✅ 已修复 TypeScript 问题
├── src/
│   ├── app/
│   │   ├── viewport.tsx       # maximumScale 问题
│   │   └── manifest.ts        # Next.js manifest
│   └── components/
│       ├── ServiceWorkerRegistration.tsx
│       └── mobile/
│           ├── SwipeContainer.tsx
│           └── TaskCardMobile.tsx
└── docs/
    └── PWA_ISSUES_20260408.md # 本文档
```
