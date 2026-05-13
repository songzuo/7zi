# SEO 审计报告 - 2026-05-12

> 审计范围: `/root/.openclaw/workspace/src/app` (Next.js App Router 前端)
> 日期: 2026-05-12

---

## 1. Meta 标签检查

### ✅ `app/layout.tsx` — 根布局

| 标签类型 | 状态 | 备注 |
|----------|------|------|
| `title` (default + template) | ✅ | `7zi Studio - AI 驱动的创新数字工作室`，模板 `%s \| 7zi Studio` |
| `description` | ✅ | 完整描述 |
| `keywords` | ✅ | 9 个关键词 |
| `authors` | ✅ | |
| `creator` / `publisher` | ✅ | |
| `robots` | ✅ | index/follow + googleBot 配置 |
| `openGraph` (og:*) | ✅ | type=website, locale, url, siteName, title, description, images |
| `twitter:*` | ✅ | card=summary_large_image, title, description, images, creator, site |
| `icons` | ✅ | favicon.ico, shortcut, apple-touch-icon.png |
| `manifest` | ✅ | /manifest.json |
| `appleWebApp` | ✅ | |
| `other` (PWA tags) | ✅ | apple-mobile-web-app-*, theme-color, msapplication-* |
| `alternates.canonical` | ✅ | `https://7zi.studio` |
| `metadataBase` | ✅ | |
| JSON-LD Schema | ✅ | Organization schema with contactPoint, sameAs |

### ✅ `app/[locale]/layout.tsx` — 多语言布局

| 标签类型 | 状态 | 备注 |
|----------|------|------|
| `title` (dynamic from seo config) | ✅ | 使用 locale 对应的 seo.title |
| `description` | ✅ | seo.description |
| `keywords` | ✅ | seo.keywords |
| `openGraph` | ✅ | locale-aware og:locale, dynamic title/description |
| `twitter:*` | ✅ | |
| `alternates.canonical` | ✅ | `${baseUrl}/${locale}` (locale-aware) |
| `icons` / `manifest` | ✅ | |

### ⚠️ 潜在问题

- `[locale]/layout.tsx` 依赖 `seo` 配置对象（如 `seo.title`、`seo.description`），需确认每个 locale 都有对应的 SEO 配置，若配置缺失会导致 meta 标签为空。

---

## 2. Sitemap.xml

### ✅ 存在性

- 静态文件: `/root/.openclaw/workspace/public/sitemap.xml`
- 动态生成: `/root/.openclaw/workspace/src/app/sitemap.ts`

### ⚠️ 严重问题

**问题 A: URL 错误回退**
```ts
// src/app/sitemap.ts
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com'
// ❌ 生产环境 .env 未设置时会 fallback 到 7zi.com 而不是 7zi.studio
```

`public/sitemap.xml` 使用 `https://7zi.studio`，但 sitemap.ts 使用环境变量，未设置时回退到 `7zi.com`。

**问题 B: sitemap 内容严重不完整**

sitemap.ts 只包含以下页面：
- `/` (首页)
- `/image-optimization-demo`, `/notification-demo`, `/design-system`, `/feedback`, `/i18n-demo`, `/dark-mode-demo`, `/websocket-status-demo`, `/monitoring-example`
- `/knowledge-lattice` (仅多语言版本)

**缺失的重要页面:**
- ❌ `/zh`, `/en` (首页多语言版本)
- ❌ `/zh/about`, `/en/about`
- ❌ `/zh/portfolio`, `/en/portfolio`
- ❌ `/zh/blog`, `/en/blog`
- ❌ `/zh/contact`, `/en/contact`
- ❌ `/zh/team`, `/en/team`
- ❌ `/zh/tasks`, `/en/tasks`
- ❌ `/zh/pricing`, `/en/pricing`
- ❌ `/zh/dashboard`, `/en/dashboard`
- ❌ `/zh/settings`, `/en/settings`
- ❌ `/zh/agent-dashboard`, `/en/agent-dashboard`
- ❌ `/zh/performance`, `/en/performance`

---

## 3. Robots.txt

### ✅ 存在性

- 静态文件: `/root/.openclaw/workspace/public/robots.txt`
- 动态生成: `/root/.openclaw/workspace/src/app/robots.ts`

### ✅ 内容质量

- `User-agent: * Allow: /`
- 正确禁止 `/api/`, `/admin/`, `/_next/`, `/test-*`, `/demo-*` 等目录
- 包含 `Sitemap: https://7zi.studio/sitemap.xml`
- 支持 Googlebot, Googlebot-Image, Googlebot-Mobile, Bingbot, Baiduspider
- 有 Crawl-delay 配置

### ⚠️ 注意

`public/robots.txt` 是静态文件，与 `src/app/robots.ts` (动态生成) 可能存在不同步风险。

---

## 4. Canonical URL

### ✅ 根布局 (`app/layout.tsx`)

```ts
alternates: {
  canonical: baseUrl, // https://7zi.studio
},
```

### ✅ 多语言布局 (`app/[locale]/layout.tsx`)

```ts
alternates: {
  canonical: `${baseUrl}/${locale}`,
},
```

每个 locale 页面都有独立的 canonical URL，符合国际 SEO 最佳实践。

---

## 5. H1 标签

### ✅ 检查结果 — 所有关键页面都有唯一的 H1

| 页面 | H1 数量 |
|------|---------|
| `[locale]/page.tsx` (首页) | 1 ✅ |
| `[locale]/about/page.tsx` | 1 ✅ |
| `[locale]/portfolio/page.tsx` | 1 ✅ |
| `[locale]/blog/page.tsx` | 1 ✅ |
| `[locale]/contact/page.tsx` | 1 ✅ |

> 注：其他动态页面建议逐一验证，但已检查的 5 个核心页面均通过。

---

## 6. 图片 Alt 文本

### ✅ 检查结果

**原生 `<img>` 标签:**
- `tasks/page.tsx` 中的 GitHub 头像 `<img>` 有 `alt={issue.assignee.login}` ✅

**Next.js `<Image>` 组件:**
- `portfolio/[slug]/page.tsx`: 主图 `alt={title}` ✅，截图 `alt={`${title} screenshot ${index + 1}`}` ✅
- `portfolio/components/ProjectCard.tsx`: `alt={title}` ✅

### ⚠️ 建议改进

- 截图 alt 文本（如 "project title screenshot 1"）可以更描述性，例如包含截图内容关键词
- 建议添加更多非装饰性 Image 的 alt 文本审计覆盖

---

## 总结

| 检查项 | 状态 | 优先级 |
|--------|------|---------|
| Meta 标签 (title/description/keywords/og/twitter) | ✅ 完善 | — |
| Sitemap.xml 存在性 | ✅ | — |
| Sitemap.xml URL 正确性 | ❌ 回退到错误域名 | **P0** |
| Sitemap.xml 内容完整性 | ❌ 缺少 15+ 重要页面 | **P0** |
| Robots.txt 存在性 | ✅ | — |
| Robots.txt 内容 | ✅ | — |
| Canonical URL | ✅ | — |
| H1 唯一性 | ✅ | — |
| 图片 Alt 文本 | ✅ | — |

---

## 建议修复

### P0: Sitemap 修复

1. 确认 `.env.production` 设置了 `NEXT_PUBLIC_SITE_URL=https://7zi.studio`
2. 扩充 `src/app/sitemap.ts` 添加所有主要 locale 页面：

```ts
const localePages = [
  '',           // home (with locale prefix)
  '/about',
  '/portfolio',
  '/blog',
  '/contact',
  '/team',
  '/tasks',
  '/pricing',
  '/dashboard',
  '/settings',
  '/agent-dashboard',
  '/performance',
  '/knowledge-lattice',
]
```

### P1: robots.txt 同步

- 确保 `public/robots.txt` 与 `src/app/robots.ts` 保持一致，或完全依赖动态生成（删除静态文件）。

### P2: SEO 内容监控

- 在 CI 中添加自动化 SEO 检查，验证 sitemap 包含所有重要页面。
