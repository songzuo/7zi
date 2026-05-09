# 依赖升级规划

> 项目：7zi-frontend | 版本：v1.14.1 | 规划日期：2026-05-08
> 技术栈：Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI

---

## 当前依赖状态

### 生产依赖 (dependencies)

| 包名 | 当前版本 | Wanted | Latest | 类型 |
|------|----------|--------|--------|------|
| next | ^16.2.4 | 16.2.6 | 16.2.6 | 框架 |
| react | ^19.2.5 | 19.2.6 | 19.2.6 | 框架 |
| react-dom | ^19.2.5 | 19.2.6 | 19.2.6 | 框架 |
| @next/third-parties | ^16.2.4 | 16.2.6 | 16.2.6 | Next.js 官方 |
| zustand | ^5.0.12 | 5.0.13 | 5.0.13 | 状态管理 |
| zod | ^3.25.76 | 3.25.76 | 4.4.3 | 校验 (⚠️ Major) |
| recharts | ^3.8.1 | 3.8.1 | - | 图表 |
| @tiptap/* (全部) | ^2.27.2 | 2.27.2 | 3.22.5 | 富文本 (⚠️ Major) |
| three | ^0.183.2 | 0.183.2 | 0.184.0 | 3D |
| socket.io-client | ^4.8.3 | 4.8.3 | - | WebSocket |
| i18next | ^26.0.4 | 26.0.10 | 26.0.10 | i18n |
| react-i18next | ^17.0.2 | 17.0.7 | 17.0.7 | i18n |
| next-i18next | ^16.0.5 | 16.0.5 | - | i18n |
| lucide-react | ^1.8.0 | 1.14.0 | 1.14.0 | 图标 |
| tailwind-merge | ^3.5.0 | 3.5.0 | - | CSS 工具 |
| clsx | ^2.1.1 | 2.1.1 | - | CSS 工具 |
| date-fns | ^3.6.0 | 3.6.0 | 4.1.0 | 日期 (⚠️ Major) |
| exceljs | ^4.4.0 | 4.4.0 | - | Excel |
| qrcode | ^1.5.4 | 1.5.4 | - | 二维码 |
| nodemailer | ^8.0.5 | 8.0.7 | 8.0.7 | 邮件 |
| jose | ^6.2.2 | 6.2.3 | 6.2.3 | JWT |
| web-push | ^3.6.7 | 3.6.7 | - | 推送 |
| web-vitals | ^5.2.0 | 5.2.0 | - | 性能监控 |
| @ducanh2912/next-pwa | ^10.2.9 | 10.2.9 | - | PWA |
| better-sqlite3 | ^12.8.0 | 12.9.0 | 12.9.0 | 数据库 |
| @xenova/transformers | ^2.0.1 | 2.0.1 | - | ML/AI |
| undici | ^7.24.7 | 7.25.0 | 8.2.0 | HTTP (⚠️ Major) |
| lowlight | ^3.3.0 | 3.3.0 | - | 语法高亮 |
| reactflow | ^11.11.4 | 11.11.4 | - | 流程图 |
| uuid | ^14.0.0 | 14.0.0 | - | UUID |
| workbox-window | ^7.4.0 | 7.4.1 | 7.4.1 | Service Worker |
| zundo | ^2.3.0 | 2.3.0 | - | Zustand 中间件 |
| i18next-browser-languagedetector | ^8.2.1 | 8.2.1 | - | 语言检测 |
| idb | ^8.0.3 | 8.0.3 | - | IndexedDB |
| autoprefixer | ^10.4.27 | 10.5.0 | 10.5.0 | PostCSS |
| postcss | ^8.5.10 | 8.5.14 | 8.5.14 | PostCSS |

### 开发依赖 (devDependencies)

| 包名 | 当前版本 | Wanted | Latest | 类型 |
|------|----------|--------|--------|------|
| storybook | ^10.3.5 | 10.3.6 | 10.3.6 | 文档/组件 |
| @storybook/* (全部) | ^10.3.5 | 10.3.6 | 10.3.6 | Storybook 套件 |
| @chromatic-com/storybook | ^5.1.1 | 5.1.2 | 5.1.2 | Chromatic |
| @testing-library/react | ^14.3.1 | 14.3.1 | 16.3.2 | 测试 (⚠️ Major) |
| @testing-library/user-event | ^14.6.1 | 14.6.1 | - | 测试 |
| @vitest/browser-playwright | ^4.1.4 | 4.1.5 | 4.1.5 | 测试 |
| @vitest/coverage-v8 | ^4.1.4 | 4.1.5 | 4.1.5 | 测试 |
| vitest | ^4.1.4 | 4.1.5 | 4.1.5 | 测试 |
| @vitejs/plugin-react | ^4.7.0 | 4.7.0 | 6.0.1 | 构建 (⚠️ Major) |
| @types/node | ^20.19.39 | 20.19.40 | 25.6.2 | 类型 |
| @types/react | ^19.2.14 | 19.2.14 | 19.2.14 | 类型 |
| @types/react-dom | ^19.2.3 | 19.2.3 | 19.2.3 | 类型 |
| typescript | ^5.9.3 | 5.9.3 | 6.0.3 | 语言 (⚠️ Major) |
| vite | ^8.0.8 | 8.0.11 | 8.0.11 | 构建 |
| @tailwindcss/postcss | ^4.2.2 | 4.2.4 | 4.2.4 | Tailwind |
| playwright | ^1.59.1 | 1.59.1 | - | E2E |
| @playwright/test | ^1.59.1 | 1.59.1 | - | E2E |
| msw | ^2.13.2 | 2.14.5 | 2.14.5 | Mock |
| jsdom | ^24.1.3 | 24.1.3 | 29.1.1 | Mock (⚠️ Major) |
| @faker-js/faker | ^8.4.1 | 8.4.1 | 10.4.0 | Mock (⚠️ Major) |
| fake-indexeddb | ^6.2.5 | 6.2.5 | - | Mock |
| @types/jsdom | ^28.0.1 | 28.0.1 | - | 类型 |
| @types/qrcode | ^1.5.6 | 1.5.6 | - | 类型 |
| @types/web-push | ^3.6.4 | 3.6.4 | - | 类型 |
| babel-plugin-react-compiler | ^1.0.0 | 1.0.0 | - | Babel |
| eslint-plugin-storybook | ^10.3.5 | 10.3.6 | 10.3.6 | ESLint |
| jscpd | ^4.0.9 | 4.0.9 | - | 代码重复检测 |

---

## 可升级依赖（按优先级排列）

### 🟢 安全升级（Patch/Minor，小风险）

| 优先级 | 包 | 当前 → 目标 | 说明 |
|--------|----|------------|------|
| P0 | react, react-dom | 19.2.5 → 19.2.6 | React 官方 patch |
| P0 | next | 16.2.4 → 16.2.6 | Next.js 官方 patch |
| P0 | @next/third-parties | 16.2.4 → 16.2.6 | 随 Next.js 同步 |
| P0 | workbox-window | 7.4.0 → 7.4.1 | Service Worker patch |
| P1 | zustand | 5.0.12 → 5.0.13 | Patch |
| P1 | lucide-react | 1.8.0 → 1.14.0 | 图标库升级，中文社区常用，需 UI 测试 |
| P1 | nodemailer | 8.0.5 → 8.0.7 | Patch |
| P1 | better-sqlite3 | 12.8.0 → 12.9.0 | Native 模块，编译后测试 |
| P1 | @faker-js/faker | 8.4.1 → 10.4.0 | Mock 数据，大版本跳跃需检查 API |
| P1 | msw | 2.13.2 → 2.14.5 | Mock Service Worker |
| P1 | vite | 8.0.8 → 8.0.11 | Vite 构建工具 |
| P1 | @vitest/* (全部) | 4.1.4 → 4.1.5 | 测试框架 |
| P1 | @tailwindcss/postcss | 4.2.2 → 4.2.4 | Tailwind |
| P1 | i18next | 26.0.4 → 26.0.10 | i18n 核心 |
| P1 | react-i18next | 17.0.2 → 17.0.7 | i18n React 绑定 |
| P1 | undici | 7.24.7 → 7.25.0 | HTTP 客户端（minor） |
| P2 | @types/node | 20.19.39 → 20.19.40 | 类型定义 |
| P2 | @storybook/* (全部) | 10.3.5 → 10.3.6 | Storybook 套件 |
| P2 | eslint-plugin-storybook | 10.3.5 → 10.3.6 | ESLint 插件 |
| P2 | autoprefixer | 10.4.27 → 10.5.0 | PostCSS 插件 |
| P2 | postcss | 8.5.10 → 8.5.14 | CSS 处理 |
| P2 | jose | 6.2.2 → 6.2.3 | JWT 库 |
| P2 | storybook | 10.3.5 → 10.3.6 | Storybook 核心 |
| P2 | @chromatic-com/storybook | 5.1.1 → 5.1.2 | Chromatic 集成 |

### 🟡 需谨慎升级（Major Version，存在 Breaking Changes）

| 包 | 当前 → 目标 | 风险 | 说明 |
|----|------------|------|------|
| **@tiptap/* (全部)** | 2.27.2 → 3.22.5 | 🔴 高 | Tiptap 3.x 有大量 Breaking Changes，包括 API 重构、Extension 注册方式变化、ProseMirror 底层升级。**建议单独项目测试后再升级。** |
| **date-fns** | 3.6.0 → 4.1.0 | 🟡 中 | date-fns 4.x 有 Breaking Changes（主要是 Tree Shaking 策略和 ESM 输出结构变化）。建议先在 dev 环境测试。 |
| **@testing-library/react** | 14.3.1 → 16.3.2 | 🟡 中 | React 18→19 支持相关的重大变更，Act API 可能不同。需同步升级 `@testing-library/user-event`。 |
| **@vitejs/plugin-react** | 4.7.0 → 6.0.1 | 🟡 中 | Vite React 插件 5→6 变化，包括 Babel 配置方式调整、JSX Transform 重构。需参考官方迁移指南。 |
| **zod** | 3.25.76 → 4.4.3 | 🟡 中 | Zod 4.x 处于 stable，Breaking Changes 包括 import 路径变化、一些 API 调整。**建议确认项目对 zod 的依赖深度。** |
| **typescript** | 5.9.3 → 6.0.3 | 🟡 中 | TypeScript 6.x 有一些新特性和破坏性变更，建议等 6.1 稳定版。 |
| **undici** | 7.25.0 → 8.2.0 | 🔴 高 | Undici 8.x 是 major 版本跳升（7→8），有较多底层 API 变化。 |
| **jsdom** | 24.1.3 → 29.1.1 | 🟡 中 | JSDOM 24→29 跨了 5 个 major 版本，包含 Node.js 兼容性和 DOM API 变更。**测试框架依赖，需全面回归测试。** |

### ⚫ 建议暂不升级

| 包 | 当前 → 目标 | 原因 |
|----|------------|------|
| next-i18next | 16.0.5 → latest | next-i18next 已停止维护，项目中 i18next + react-i18next 已够用，替换风险大 |
| @xenova/transformers | 2.0.1 → latest | AI/ML 库，版本稳定性优先 |

---

## 升级顺序建议

### 第一阶段：安全 Patch 升级（可一次性执行）

```bash
# 框架核心 — React + Next.js patch
npm upgrade react react-dom @next/third-parties next

# 状态管理 & 核心库
npm upgrade zustand workbox-window nodemailer better-sqlite3

# i18n 生态
npm upgrade i18next react-i18next jose

# 构建 & 开发工具
npm upgrade vite @vitest/browser-playwright @vitest/coverage-v8 vitest
npm upgrade @tailwindcss/postcss autoprefixer postcss

# Storybook 生态
npm upgrade storybook @storybook/addon-a11y @storybook/addon-docs \
  @storybook/addon-onboarding @storybook/addon-vitest @storybook/nextjs-vite \
  @chromatic-com/storybook eslint-plugin-storybook

# 工具库
npm upgrade lucide-react msw undici

# 类型定义
npm upgrade @types/node
```

### 第二阶段：独立 Extension 升级（单独测试）

**升级 Tiptap（如果项目使用了富文本编辑器）：**

```bash
# 一次性升级所有 tiptap 包到 2.27.2 latest patch（保持 2.x）
npm upgrade @tiptap/react @tiptap/core @tiptap/starter-kit \
  @tiptap/extension-blockquote @tiptap/extension-bold \
  @tiptap/extension-bullet-list @tiptap/extension-code-block \
  @tiptap/extension-code-block-lowlight @tiptap/extension-heading \
  @tiptap/extension-horizontal-rule @tiptap/extension-image \
  @tiptap/extension-italic @tiptap/extension-link \
  @tiptap/extension-list-item @tiptap/extension-ordered-list \
  @tiptap/extension-placeholder @tiptap/extension-strike \
  @tiptap/extension-text @tiptap/extension-text-align \
  @tiptap/extension-text-style @tiptap/extension-underline
```

> ⚠️ **Tiptap 2→3 升级**是重大工程，如需升级到 3.x：
> 1. 先在 dev 环境单独测试
> 2. 检查 [Tiptap 官方 Migration Guide](https://tiptap.dev/docs/migration)
> 3. 重点关注 Extension 重命名和 API 变化

### 第三阶段：Major 版本升级（按风险分级）

#### 3.1 低风险 major（快速）

```bash
# date-fns 3→4：主要影响日期格式化函数，搜索项目使用方式
npm upgrade date-fns
# 升级后运行：npm run typecheck && npm run test
```

#### 3.2 中风险 major（需测试）

```bash
# @vitejs/plugin-react 4→6：需检查 vite.config.ts 中的插件配置
# 升级后检查：babel 配置文件、jsxImportSource 设置
npm upgrade @vitejs/plugin-react
```

```bash
# @testing-library/react 14→16：
# 需同步升级 user-event，可能涉及 act() 调用变化
npm upgrade @testing-library/react @testing-library/user-event
```

#### 3.3 高风险 major（谨慎，择机执行）

```bash
# zod 3→4：确认项目所有 zod schema、import 路径
# 建议：先在 dev 分支单独测试
npm upgrade zod
```

```bash
# undici 7→8：检查所有 API 调用方式
# 建议：先确认项目对 undici 的直接依赖程度
npm upgrade undici
```

```bash
# jsdom 24→29：测试框架强依赖，跨 5 个 major 版本
# 必须全量测试通过后才能合入
npm upgrade jsdom
```

---

## 风险评估

### 🔴 高风险

1. **@tiptap/* (2→3)**
   - Tiptap 3.x 重写了 Extension 系统，API 全面重构
   - 项目大量使用 Tiptap 扩展，一旦升级失败影响编辑器功能
   - **建议：保持 2.27.x，不追最新 3.x，除非有迫切需求**

2. **undici (7→8)**
   - 项目中通过 `@xenova/transformers` 间接使用 undici
   - Major 版本跳跃风险大
   - **建议：暂不升级，undici 7.x 足够稳定**

### 🟡 中风险

3. **@testing-library/react (14→16)**
   - React 19 支持带来的测试 API 变化
   - Act flushSync API 变化可能导致部分测试失败
   - **建议：先升级 patch，再升级 major，分步骤验证**

4. **@vitejs/plugin-react (4→6)**
   - Vite 5→6 插件生态有较大变化
   - **建议：参考 Vite 官方迁移指南，先在 dev 环境验证**

5. **date-fns (3→4)**
   - ESM 输出结构变化，可能影响 Tree Shaking
   - 旧项目使用方式兼容性较好，但新版本有性能优化
   - **建议：测试 typecheck 通过即可认为兼容**

6. **zod (3→4)**
   - 项目大量使用 zod 进行表单校验和类型推断
   - Zod 4.x import 路径变化 (`zod` → `zod` 本身变化不大，但部分子模块路径变化)
   - **建议：先用 `npm run typecheck` 验证，schema 变更不多**

7. **typescript (5→6)**
   - TypeScript 6.0.3 才刚发布
   - **建议：等待 6.1.x 稳定版，3 个月后再考虑**

### 🟢 低风险

8. **react/react-dom (19.2.5→19.2.6)**：仅 patch，直接升级
9. **next (16.2.4→16.2.6)**：官方 patch，Next.js 16 已稳定
10. **zustand (5.0.12→5.0.13)**：patch 版本，Zustand 5.x 已稳定

---

## 执行命令汇总

### 推荐一次性执行（安全范围）

```bash
cd /root/.openclaw/workspace/7zi-frontend

# 第一阶段完整命令
npm upgrade \
  react react-dom next @next/third-parties \
  zustand workbox-window nodemailer better-sqlite3 \
  i18next react-i18next jose \
  vite @vitest/browser-playwright @vitest/coverage-v8 vitest \
  @tailwindcss/postcss autoprefixer postcss \
  storybook @storybook/addon-a11y @storybook/addon-docs \
  @storybook/addon-onboarding @storybook/addon-vitest @storybook/nextjs-vite \
  @chromatic-com/storybook eslint-plugin-storybook \
  lucide-react msw undici \
  @types/node \
  @tiptap/react @tiptap/core @tiptap/starter-kit \
  @tiptap/extension-blockquote @tiptap/extension-bold \
  @tiptap/extension-bullet-list @tiptap/extension-code-block \
  @tiptap/extension-code-block-lowlight @tiptap/extension-heading \
  @tiptap/extension-horizontal-rule @tiptap/extension-image \
  @tiptap/extension-italic @tiptap/extension-link \
  @tiptap/extension-list-item @tiptap/extension-ordered-list \
  @tiptap/extension-placeholder @tiptap/extension-strike \
  @tiptap/extension-text @tiptap/extension-text-align \
  @tiptap/extension-text-style @tiptap/extension-underline
```

### 升级后验证

```bash
# 1. 类型检查
npm run typecheck

# 2. 单元测试
npm run test

# 3. Storybook 构建（如使用）
npm run build-storybook

# 4. E2E 测试（可选，如时间允许）
npm run test:e2e
```

---

## 总结

- **总计可升级包**：50+ 个
- **安全升级（可直接执行）**：约 35 个 patch/minor 版本
- **Major 版本需单独测试**：7 个（tiptap、date-fns、testing-library、vitejs/plugin-react、zod、typescript、undici、jsdom）
- **建议保持现状**：next-i18next（已停止维护）
- **预期升级时间**：第一阶段 30 分钟，第二阶段（tiptap）需额外 2-4 小时测试

> ⚠️ **重要提醒**：执行任何升级前，请确保代码已提交。大型升级建议在独立分支进行。
