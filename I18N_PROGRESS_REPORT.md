# 7zi 项目 i18n 国际化进度报告

**报告时间:** 2026-03-25  
**分析目录:** `/root/.openclaw/workspace/7zi-project-new/`

---

## 📊 概览

| 项目 | 状态 |
|------|------|
| i18n 框架 | ✅ `next-intl` v4.8.3 |
| 配置方式 | App Router + locale-based routing |
| 路由策略 | `localePrefix: 'always'` (URL 始终显示语言前缀) |
| 默认语言 | `zh` (中文) |
| 已配置语言 | 6 种: `zh`, `en`, `ja`, `ko`, `fr`, `de` |

---

## 🌍 支持的语言

| 语言 | 代码 | 翻译文件 | 完成度 |
|------|------|----------|--------|
| 中文 | `zh` | ✅ zh.json | 100% (503 keys) |
| 英语 | `en` | ✅ en.json | 100% (503 keys) |
| 日语 | `ja` | ❌ **不存在** | 0% |
| 韩语 | `ko` | ❌ **不存在** | 0% |
| 法语 | `fr` | ❌ **不存在** | 0% |
| 德语 | `de` | ❌ **不存在** | 0% |

**翻译文件位置:** `src/i18n/messages/`

---

## 📁 命名空间 (Namespaces)

共 **22 个** 顶级命名空间，均已实现:

| Namespace | 说明 |
|-----------|------|
| `about` | 关于页面 |
| `blog` | 博客页面 |
| `common` | 通用文本 |
| `contact` | 联系页面 |
| `dashboard` | 控制台页面 |
| `email` | 邮件模板 |
| `errors` | 错误消息 |
| `footer` | 页脚 |
| `home` | 首页 |
| `loading` | 加载状态 |
| `memory` | 记忆系统 |
| `mobileMenu` | 移动端菜单 |
| `nav` | 导航栏 |
| `notifications` | 通知消息 |
| `portfolio` | 作品案例 |
| `settings` | 设置页面 |
| `subagents` | 子代理相关 |
| `tasks` | 任务相关 |
| `team` | 团队页面 |
| `time` | 时间格式化 |
| `ui` | UI 组件 |
| `validation` | 表单验证 |

---

## ✅ 翻译完成度分析

### 已完成
- **中文 (zh):** 503 个翻译 key，22 个命名空间
- **英文 (en):** 503 个翻译 key，22 个命名空间
- **zh 与 en 100% 同步** — 所有 key 均一一对应

### 未完成 (严重)
| 语言 | 缺失翻译文件 | 影响 |
|------|-------------|------|
| 日语 `ja` | ❌ | 虽然配置了路由，但访问 `/ja/...` 会报错 |
| 韩语 `ko` | ❌ | 同上 |
| 法语 `fr` | ❌ | 同上 |
| 德语 `de` | ❌ | 同上 |

---

## ⚠️ 问题与缺失

### 1. 🚨 关键问题：缺少 4 种语言的翻译文件
虽然 `src/i18n/config.ts` 配置了 6 种语言，但 `src/i18n/messages/` 目录下只有 `zh.json` 和 `en.json`。

访问 `/ja/`, `/ko/`, `/fr/`, `/de/` 路径会导致运行时错误。

### 2. ⚙️ pathnames 配置不完整
`src/i18n/config.ts` 的 `pathnames` 只配置了:
- `/`, `/about`, `/team`, `/contact`, `/blog`, `/dashboard`

**缺失:** `/portfolio` 等其他路由的 pathnames 配置

### 3. 🔧 缺少语言切换组件
未找到独立的 Locale Switcher 组件。需要在 UI 中添加语言切换器供用户使用。

---

## 💡 i18n 优化建议

### 高优先级 (必须修复)

1. **创建 ja, ko, fr, de 翻译文件**
   ```bash
   # 建议：复制 zh.json 作为基础模板
   cp src/i18n/messages/zh.json src/i18n/messages/ja.json
   cp src/i18n/messages/zh.json src/i18n/messages/ko.json
   cp src/i18n/messages/zh.json src/i18n/messages/fr.json
   cp src/i18n/messages/zh.json src/i18n/messages/de.json
   ```
   然后使用 AI 翻译工具批量翻译。

2. **完善 pathnames 配置**
   在 `src/i18n/config.ts` 的 `pathnames` 中添加所有路由。

### 中优先级 (建议实现)

3. **创建语言切换组件 (LocaleSwitcher)**
   - 位置建议: `src/components/LocaleSwitcher.tsx`
   - 支持下拉菜单切换语言
   - 切换后保持当前页面，仅变更语言

4. **添加 `i18n.ts` 统一导出文件**
   ```typescript
   // src/i18n/index.ts
   export { useTranslations, useLocale } from './client';
   export { getServerTranslations, formatDate, formatNumber } from './utils';
   export { routing, Link, redirect, usePathname, useRouter } from './routing';
   ```

5. **添加类型安全的翻译 hook**
   ```typescript
   // src/i18n/types.ts
   export type Messages = typeof import('./messages/zh');
   export type Namespace = keyof Messages;
   ```

### 低优先级 (可选优化)

6. **添加缺失路由到 middleware**
   确保 middleware 正确处理所有 6 种语言的路由。

7. **考虑 RTL 语言支持**
   如果未来需要阿拉伯语、希伯来语等 RTL 语言，需要额外配置。

8. **翻译质量审核**
   当前 en.json 为机翻，建议人工审核关键页面（首页、团队页）的翻译质量。

---

## 📈 翻译统计

| 语言 | Key 数量 | 文件大小 | 完成度 |
|------|----------|----------|--------|
| zh.json | 503 | 24.8 KB | 100% |
| en.json | 503 | 26.0 KB | 100% |
| ja.json | 0 | - | **0%** |
| ko.json | 0 | - | **0%** |
| fr.json | 0 | - | **0%** |
| de.json | 0 | - | **0%** |

**整体进度: 2/6 语言完成 = 33.3%**

---

## 📋 行动清单

- [ ] **P0:** 为 ja/ko/fr/de 创建翻译文件（或至少创建空文件避免 404）
- [ ] **P0:** 完善 `pathnames` 配置添加所有路由
- [ ] **P1:** 创建 LocaleSwitcher 语言切换组件
- [ ] **P1:** 在 Footer 或 Nav 中集成语言切换器
- [ ] **P2:** 使用 AI 批量翻译 4 种新语言
- [ ] **P2:** 人工审核关键页面英文翻译质量

---

*报告生成时间: 2026-03-25 01:20 GMT+1*
