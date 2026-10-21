# 7zi 环球旅行平台 — SEO 审计报告

**审计日期:** 2026-10-21  
**审计范围:** 7zi-frontend (Next.js 16 项目)  
**整体评分:** 4.5 / 10

---

## 一、当前状态评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 元标签配置 | 4/10 | 基础存在但内容泛化，首页无法 export metadata |
| 结构化数据 | 3/10 | 仅 WebSite schema，缺少 Organization/Product/Breadcrumb |
| Sitemap | 5/10 | 基本可用但包含 demo 页面，域名不一致 |
| Robots.txt | 6/10 | 正常，域名与 sitemap URL 匹配 |
| Open Graph | 4/10 | 有配置但图片路径可能失效，OG 标签不完整 |
| Twitter Card | 4/10 | 有配置但仅首页/少数页面 |
| 页面性能 | 7/10 | Next.js 16 + bundle 优化很好，图片格式先进 |
| 内链结构 | 3/10 | footer 多处使用 `href="#"` 死链 |
| 国际化 SEO | 2/10 | 有 i18n 结构但未实现 hreflang 标签 |
| 技术 SEO | 6/10 | 安全头完备，poweredByHeader 已关闭 |

---

## 二、问题清单（按优先级）

### 🔴 P0 — 关键问题（立即修复）

#### 1. 首页无法 export metadata
- **文件:** `src/app/page.tsx`
- **问题:** 组件声明为 `'use client'`，无法 export metadata
- **影响:** 首页依赖 `layout.tsx` 的泛化 title/description，搜索引擎无法获取准确页面描述
- **修复:** 将首页改为 Server Component，或创建 `src/app/page.metadata.ts`

#### 2. 元描述泛化、内容与产品不符
- **文件:** `src/app/layout.tsx`
- **当前:** `description: 'Next.js 最佳实践演示项目 - 智能体协作平台'`
- **问题:** 描述的是"演示项目"而非"环球旅行平台"，与实际产品定位严重不符
- **影响:** 搜索结果展示无效，用户无法了解产品价值

#### 3. Sitemap 域名不一致
- **文件:** `src/app/sitemap.ts`
- **问题:** 部分 URL 使用 `7zi.studio` 而非 `7zi.com`
- **示例:**
  - knowledge-lattice: `https://7zi.studio/knowledge-lattice`
  - pricing: `https://7zi.studio/pricing`
  - design-system: `https://7zi.studio/design-system`
- **修复:** 统一使用 `process.env.NEXT_PUBLIC_SITE_URL || 'https://7zi.com'`

#### 4. Sitemap 包含不应索引的 demo 页面
- **问题:** 以下页面不应出现在 sitemap 中:
  - `/notification-demo`
  - `/mobile-optimization-demo` (两个版本)
  - `/rich-text-editor-demo`
  - `/collaboration-cursor-demo`
  - `/feedback`
  - `/admin/*` 页面
- **影响:** 搜索引擎索引无效页面，分散权重

---

### 🟠 P1 — 高优先级

#### 5. JSON-LD 结构化数据过于简陋
- **文件:** `src/app/layout.tsx`
- **当前:** 仅包含 WebSite + SearchAction schema
- **建议增加:**
  ```json
  {
    "@type": "Organization",
    "name": "7zi",
    "url": "https://7zi.com",
    "logo": "https://7zi.com/icons/icon-512x512.png",
    "sameAs": ["https://twitter.com/7zi", "https://github.com/7zi"]
  }
  ```
- 考虑添加: `Product` (如果有明确产品), `BreadcrumbList`, `FAQPage`

#### 6. Open Graph 图片路径问题
- **问题:** `og-image.jpg`, `twitter-image.jpg` 使用相对路径，生产环境可能无法访问
- **建议:** 使用绝对 URL `https://7zi.com/images/og-image.jpg`

#### 7. Footer 内链使用 `href="#"`
- **文件:** `src/app/page.tsx` (LandingPage)
- **问题:** footer 链接全部为 `#`，既无 SEO 价值又有可用性问题
- **示例:** "功能介绍", "定价方案", "关于我们" 等链接
- **修复:** 创建 `src/app/[locale]/about/page.tsx` 等实际页面

#### 8. 缺少 canonical URL
- **文件:** 根 `layout.tsx` metadata
- **建议:** 添加 `alternates: { canonical: 'https://7zi.com' }`

---

### 🟡 P2 — 中优先级

#### 9. 缺少国际化 hreflang 标签
- **问题:** 有 i18n 结构 (`/zh/*`, `/en/*`) 但没有 hreflang 实现
- **建议:** 在 layout.tsx 的 metadata 中添加 alternates.languages

#### 10. Twitter Card 配置不完整
- **问题:** 仅首页和少数页面有 twitter 标签
- **建议:** 统一所有页面的 twitter.card 配置

#### 11. keywords 标签过时
- **当前:** `['Next.js', 'Image Optimization', 'WebP', 'AVIF', 'Performance']`
- **建议:** 更新为与"环球旅行平台"相关关键词

#### 12. viewport meta 标签重复
- **文件:** `src/app/layout.tsx`
- **问题:** 同时 export 了 `viewport` 常量又在 `<head>` 里写了 `<meta name="viewport">`
- **修复:** 删除手动添加的 meta viewport 标签

#### 13. 缺少 404 页面
- **建议:** 创建 `src/app/not-found.tsx` 并配置正确的 metadata

#### 14. 缺少专属 Error 页面
- **建议:** 创建 `src/app/error.tsx`

---

### 🟢 P3 — 优化建议

#### 15. 性能优化空间
- JSON-LD script 使用 `dangerouslySetInnerHTML` 可接受，但可考虑使用 Next.js 的 `<Script>` 组件
- 多个 `<script>` 标签建议使用 Next.js `<Script strategy="afterInteractive">`

#### 16. Sitemap lastModified 使用固定值
- **当前:** 所有页面 `lastModified: today`
- **建议:** 使用文件系统的真实修改时间或数据库记录

#### 17. 缺少 HTML lang 属性变体
- sitemap 中 alternates languages 写法可优化

---

## 三、3 个月 SEO 行动计划

### 📅 第一个月 — 基础修复（Week 1-4）

| Week | 任务 | 产出 |
|------|------|------|
| 1 | 修复首页 metadata export 问题 | 修改 page.tsx 为 server component 或创建 metadata 文件 |
| 1 | 更新根 layout 的 title/description | 描述改为"7zi 环球旅行平台 - AI 驱动的智能旅行规划与协作平台" |
| 1 | 统一 sitemap 域名为 7zi.com | 修改 sitemap.ts 中的硬编码域名 |
| 2 | 从 sitemap 移除 demo/demo 页面 | 保留真实业务页面 |
| 2 | 修复 footer 死链 (`href="#"` → 真实页面) | 创建对应页面或移除死链 |
| 2 | 添加 canonical URL | 在根 layout metadata 添加 alternates.canonical |
| 3 | 增强 JSON-LD schema | 添加 Organization + 业务相关 schema |
| 3 | 修复 Open Graph 图片 URL | 使用绝对路径 |
| 4 | 删除重复的 viewport meta | 清理 layout.tsx 手动添加的 meta viewport |
| 4 | 验证 robots.txt + sitemap.xml 可访问 | `curl https://7zi.com/robots.txt` |

**完成标准:** sitemap 索引正常，搜索结果标题/描述准确

---

### 📅 第二个月 — 结构化数据与体验（Week 5-8）

| Week | 任务 | 产出 |
|------|------|------|
| 5 | 添加 BreadcrumbList schema | 在关键页面（pricing, discover 等）添加面包屑结构化数据 |
| 5 | 添加 FAQPage schema | 如果有 FAQ 页面 |
| 6 | 创建 404.tsx 和 error.tsx | 自定义错误页面带 SEO 标签 |
| 6 | 优化图片 alt 属性 | 全站图片添加描述性 alt |
| 7 | 实现 hreflang 标签 | 在 layout 中添加 alternates.languages |
| 7 | 检查所有页面的 metadata | 确保所有业务页面有独立 title/description |
| 8 | 提交更新后的 sitemap 到 Google Search Console | 移除 demo 页面索引 |

**完成标准:** Google Search Console 无重大索引问题，结构化数据测试通过

---

### 📅 第三个月 — 国际化与监控（Week 9-12）

| Week | 任务 | 产出 |
|------|------|------|
| 9 | 分析竞争对手 SEO 策略 | 研究竞品关键词、外链策略 |
| 9 | 优化页面加载速度 (Core Web Vitals) | LCP < 2.5s, FID < 100ms, CLS < 0.1 |
| 10 | 添加多语言内容 sitemap | zh-hans, en 两个 sitemap 或一个包含 hreflang |
| 10 | 监控 Google Search Console | 覆盖率、排名、点击数据 |
| 11 | 建立外链策略 | 联系合作伙伴、高质量目录提交 |
| 11 | 优化 title 标签模板 | 检查所有页面 title 是否遵循 `template: '%s | 7zi'` |
| 12 | 提交最终 SEO 审计报告 | 评估改进效果，制定下一季度计划 |

**完成标准:** 搜索流量提升预期 20-30%，Core Web Vitals 全部达标

---

## 四、快速修复清单（1-2 天可完成）

```bash
# 1. 修复 sitemap 域名问题 - 修改 sitemap.ts
# 将所有硬编码的 "7zi.studio" 替换为使用 baseUrl 变量

# 2. 更新根 layout description - layout.tsx
# 将 'Next.js 最佳实践演示项目' 改为真实产品描述

# 3. 清理 sitemap - 移除 demo 页面
# 删除 notification-demo, rich-text-editor-demo 等条目

# 4. 添加 canonical URL 到 layout.tsx
alternates: { canonical: 'https://7zi.com' }

# 5. 修复 OG 图片路径
# 将 '/images/og-image.jpg' 改为 'https://7zi.com/images/og-image.jpg'

# 6. 删除重复的 viewport meta
# 删除 layout.tsx 中 <head> 里的 <meta name="viewport">
```

---

## 五、SEO 工具推荐

- **Google Search Console:** https://search.google.com/search-console
- **结构化数据测试:** https://search.google.com/test/rich-results
- **PageSpeed Insights:** https://pagespeed.web.dev/
- **Sitemap 验证:** https://www.xml-sitemaps.com/validate-xml-sitemap.html
- **Moz Local:** 检查本地 SEO 状态

---

*报告生成: 2026-10-21*
*下次审计计划: 2027-01-21*
