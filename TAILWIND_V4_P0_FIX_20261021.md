# P0 修复：Tailwind v4 工具类未生成（7zi-frontend）

> 发现日期: 2026-10-21 | 严重级别: **P0（构建级静默失效）**
> 影响项目: `7zi-frontend`（workspace 内新项目，尚未部署到 `/opt/frontend`）

---

## 1. 现象

`next build` 成功（exit 0），但产物 CSS **只有 19 KB / 149 条规则**，
且**不含任何 Tailwind 工具类**。

实测（修复前，已构建产物 `.next/static/chunks/31aj1ikj2crxm.css`）：

| 检查项 | 结果 |
|---|---|
| CSS 体积 | 19,907 字节 |
| `.flex` | **0** |
| `.bg-white` | **0** |
| `.text-gray-500` | **0** |
| `.sr-only` | **0** |
| `--tw-*` 变量 | **0** |

而 HTML 中实际使用了大量工具类，例如：

```html
class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
       focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2
       focus:text-white focus:font-semibold focus:shadow-lg focus:outline-none"
```

代码库统计（`src/components` + `src/app`）：

| 工具类 | 使用次数 |
|---|---|
| `text-gray-*` | 2047 |
| `flex` | 1228 |
| `bg-gray-*` | 855 |
| `text-sm` | 774 |
| `text-white` | 355 |
| `grid` | 267 |
| `bg-white` | 253 |

**结论：整站样式完全失效（unstyled），但构建不报错 —— 最危险的一类静默失败。**

---

## 2. 根因

项目已升级到 **Tailwind CSS v4**（`tailwindcss@4.2.2` + `@tailwindcss/postcss@4.2.2`），
但 `src/app/globals.css` 仍沿用 v3 时代的写法：**从不 import Tailwind 入口**。

```css
/* 修复前 —— 没有任何 Tailwind 入口 */
@import '../styles/tokens.css';
@import '../lib/theme/theme.css';
```

### Tailwind v3 → v4 的两个关键断裂点

| 维度 | v3 | v4 | 本项目断裂点 |
|---|---|---|---|
| 入口指令 | `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` | 缺失 → **不生成任何工具类** |
| 暗色策略 | `darkMode: 'class'`（JS 配置） | 需 CSS `@custom-variant dark (&:where(.dark, .dark *))` | 缺失 → 暗色失效 |

另外 v4 默认走 `prefers-color-scheme` 媒体查询，而项目 `ThemeContext.tsx` 用
`root.classList.toggle('dark', isDark)` 手动切换 class —— 二者策略不一致，
即使修好入口，暗色模式在手动切换时仍不生效。

### 为什么 v3 时代能工作

`git log -S'@tailwind base'` 证实：`7zi-frontend` 的 `globals.css` **历史上从未出现过**
`@tailwind` 或 `tailwindcss` 字样（最早的 commit `abd25ae3d` 起就是 0 次匹配）。
说明 `7zi-frontend` 是从 `7zi-project` 拆分出来的副本，拆分时 `globals.css` 被重写
（`7zi-project` 版本首行是 `@import 'tailwindcss';`），**Tailwind 入口在拆分时丢失**。

---

## 3. 修复内容

文件：`7zi-frontend/src/app/globals.css`

```css
/* Tailwind v4：必须显式 @import 才会生成工具类（无 @tailwind base 指令） */
@import 'tailwindcss';
/* 复用 v3 风格配置：content 扫描路径 + 主题扩展 */
@config '../../tailwind.config.js';
/* v4 中 darkMode: 'class' 需用 @custom-variant 声明 */
@custom-variant dark (&:where(.dark, .dark *));
```

三行各自的作用：

1. `@import 'tailwindcss'` —— v4 入口，激活工具类生成。
2. `@config '../../tailwind.config.js'` —— 复用仓库根的 v3 格式配置，提供
   `primary/gray/success/warning/error/info` 色板 → CSS 变量映射、
   `radius/shadow/transitionDuration` 扩展、safe-area 间距（`pt-safe-top`）、
   `shimmer/fadeIn/scaleIn` 关键帧。**路径必须是 `../../`**（相对 `src/app/`）。
3. `@custom-variant dark (&:where(.dark, .dark *))` —— 让 `dark:` 前缀走 class 策略，
   与 `ThemeContext` 的 `classList.toggle('dark')` 对齐。

---

## 4. 验证结果

### 4.1 独立 PostCSS 验证

对 `globals.css` 直接跑 `@tailwindcss/postcss` 插件：

| 变体 | 产物大小 | `.flex` | `.bg-white` | `.text-gray-500` | dark 策略 |
|---|---|---|---|---|---|
| 修复前 | 21,606 | 0 | 0 | 0 | — |
| 仅 `@import` | 194,924 | ✅ | ✅ | ✅ | ❌ 媒体查询 |
| `@import` + `@config` | 187,806 | ✅ | ✅ | ✅ | ❌ 媒体查询 |
| `@import` + `@config` + `@custom-variant` | **193,925** | ✅ | ✅ | ✅ | ✅ class 策略 |

补充确认：
- `.pt-safe-top`（来自 JS 配置的 spacing 扩展）→ **仅在带 `@config` 时生成** ✅
- `bg-primary-500` → 正确解析为 `var(--color-primary-500)` ✅
- 修复后**不再出现** `@media (prefers-color-scheme: dark)` 包裹的 `dark:` 规则 ✅
- `tokens.css` / `theme.css` 的 CSS 变量（`--color-primary-500`、`--radius-md`、
  `--shadow-md`、`--theme-mode`）全部保留 ✅

### 4.2 真实 `next build` 验证

```
$ npx next build        → exit 0，成功产出全部路由
```

产物 CSS：

| 指标 | 修复前 | 修复后 |
|---|---|---|
| CSS 体积 | 19,907 | **141,121** |
| `.flex` | 0 | ✅ |
| `.bg-white` | 0 | ✅ |
| `.text-gray-500` | 0 | ✅ |
| `.grid` | 0 | ✅ |
| `.rounded-lg` | 0 | ✅ |
| class 策略 dark | — | ✅ |
| `prefers-color-scheme` dark | — | 0（已消除）|

### 4.3 扫描路径覆盖验证

`tailwind.config.js` 的 `content` 只声明 `src/pages` / `src/components` / `src/app`，
但实际有 **34 个 `.tsx` 文件位于 `src/features` / `src/lib` / `src/shared`**。

验证：`bg-zinc-800` 仅在 `src/features/monitoring/components/*.tsx` 中使用
（完全在 content glob 之外），**修复后已成功进入产物 CSS** ✅
（v4 自动内容检测补齐了 v3 `content` 配置未覆盖的目录）。

---

## 5. 遗留观察（不影响本次修复，供后续跟进）

1. **在线站点 `7zi-project` 存在同类暗色问题**：其 `globals.css` 有 `@import 'tailwindcss'`
   （工具类正常），但**没有 `@custom-variant dark`**，且**没有 `tailwind.config.js`**。
   产物中 69,671 字节（约 28%）的 `dark:` 规则被包在
   `@media (prefers-color-scheme: dark)` 内。而 `preferencesStore.ts` 通过
   `root.classList.add/remove('dark')` 手动切换 → **手动切换主题时，
   `dark:text-zinc-*`（1017 处）、`dark:bg-zinc-*`（562 处）等不会响应**。
   建议补 `@custom-variant dark (&:where(.dark, .dark *));`。
2. **改动冲突风险**：本次修复期间并行子代理曾对 `7zi-frontend` 执行
   `git checkout -- .`（历史上已发生 2 次）。修复已确认落盘于
   `src/app/globals.css`，但**尚未提交**。收尾前请统一
   `git add` + `git commit` 固化。
3. **`@config` 路径脆弱**：若 `globals.css` 被移动位置，`../../tailwind.config.js`
   需同步调整，否则 spacing/keyframes 扩展会静默丢失。
4. **未做视觉回归**：本次仅验证 CSS 产物结构，**未做浏览器截图对比**。
   工具类从 0 变为全量后，页面外观会显著变化（原为无样式裸 HTML），
   建议上线前人工过一遍关键页面。
